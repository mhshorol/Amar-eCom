import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import cors from 'cors';
import { CourierFactory, CourierOrderData } from './src/lib/courierAdapters';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8'));

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;
let activeDbId: string | null = null;

async function getDb() {
  if (db) return db;
  
  const adminApp = admin.app();
  const dbId = firebaseConfig.firestoreDatabaseId;
  const projectId = firebaseConfig.projectId;
  
  if (dbId) {
    try {
      console.log(`Attempting to connect to named database: ${dbId} in project: ${projectId}`);
      const namedDb = getFirestore(adminApp, dbId);
      // Verify connection with a simple read
      await namedDb.collection('health_check').limit(1).get();
      db = namedDb;
      activeDbId = dbId;
      console.log(`Successfully connected to database: ${dbId}`);
      return db;
    } catch (e: any) {
      console.error(`Connection to database ${dbId} failed: ${e.message}`);
      if (e.code === 5 || e.message?.includes('NOT_FOUND') || e.message?.includes('not found')) {
        console.error(`Database ${dbId} NOT FOUND. Falling back to (default).`);
      }
    }
  }
  
  console.log(`Connecting to (default) database in project: ${projectId}`);
  db = getFirestore(adminApp);
  activeDbId = '(default)';
  return db;
}

async function startServer() {
  try {
    process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
    
    if (admin.apps.length === 0) {
      console.log('Initializing Firebase Admin with project ID:', firebaseConfig.projectId);
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
    }
    
    // Initial DB connection
    await getDb();
    
    if (db) {
      try {
        await db.collection('health_check').doc('startup').set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          message: 'Server started'
        }, { merge: true });
        console.log(`Successfully verified Firestore connection to ${activeDbId} and wrote startup log`);
      } catch (e: any) {
        console.error(`Initial Firestore verification failed for ${activeDbId}:`, e.message);
        // If it failed and we were using a named DB, clear it so next request tries fallback
        if (activeDbId !== '(default)') {
          db = null;
          activeDbId = null;
        }
      }
    }
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
  }

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Test route
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
  });

  // Health check
  app.get('/api/health', async (req, res) => {
    const dbStatus = db ? 'Initialized' : 'Not Initialized';
    let connectionStatus = 'Unknown';
    let error = null;
    
    if (db) {
      try {
        await db.collection('health_check').limit(1).get();
        connectionStatus = 'Connected';
      } catch (e: any) {
        connectionStatus = 'Failed';
        error = e.message;
      }
    }
    
    res.json({ 
      status: 'ok', 
      firebase: {
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
        dbStatus,
        connectionStatus,
        error
      }
    });
  });

  // WooCommerce API Proxy
  app.get('/api/woocommerce/orders', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
      }
      const companySettings = await database.collection('settings').doc('company').get();
      const settings = companySettings.data();

      if (!settings?.wooUrl || !settings?.wooConsumerKey || !settings?.wooConsumerSecret) {
        return res.status(400).json({ error: 'WooCommerce settings not configured' });
      }

      const { wooUrl, wooConsumerKey, wooConsumerSecret } = settings;
      const { page = 1, per_page = 10, status, search } = req.query;

      const response = await axios.get(`${wooUrl}/wp-json/wc/v3/orders`, {
        params: {
          consumer_key: wooConsumerKey,
          consumer_secret: wooConsumerSecret,
          page,
          per_page,
          status,
          search
        }
      });

      res.json({
        orders: response.data,
        totalPages: response.headers['x-wp-totalpages'],
        totalOrders: response.headers['x-wp-total']
      });
    } catch (error: any) {
      console.error('WooCommerce API Error:', error.message);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  app.get('/api/woocommerce/products', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const companySettings = await database.collection('settings').doc('company').get();
      const settings = companySettings.data();

      if (!settings?.wooUrl || !settings?.wooConsumerKey || !settings?.wooConsumerSecret) {
        return res.status(400).json({ error: 'WooCommerce settings not configured' });
      }

      const { wooUrl, wooConsumerKey, wooConsumerSecret } = settings;
      const { page = 1, per_page = 20, search } = req.query;

      const response = await axios.get(`${wooUrl}/wp-json/wc/v3/products`, {
        params: {
          consumer_key: wooConsumerKey,
          consumer_secret: wooConsumerSecret,
          page,
          per_page,
          search
        }
      });

      res.json({
        products: response.data,
        totalPages: response.headers['x-wp-totalpages'],
        totalProducts: response.headers['x-wp-total']
      });
    } catch (error: any) {
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  // Webhook endpoint for WooCommerce
  app.post('/api/webhooks/woocommerce/order-updated', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const order = req.body;
      console.log('WooCommerce Webhook received for order:', order.id);

      // Log the webhook
      await database.collection('woocommerce_logs').add({
        type: 'webhook',
        orderId: order.id.toString(),
        status: order.status,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).send('Webhook processed');
    } catch (error: any) {
      console.error('Webhook Error:', error.message);
      res.status(500).send('Webhook error');
    }
  });

  // Courier Integration Endpoints
  app.get('/api/couriers/configs', async (req, res) => {
    console.log('GET /api/couriers/configs hit');
    try {
      const database = await getDb();
      if (!database) {
        console.error('Firebase Admin not initialized');
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
      }
      
      let snapshot;
      try {
        snapshot = await database.collection('courier_configs').get();
      } catch (e: any) {
        // If we get a NOT_FOUND error here, it means the database instance we have is invalid
        console.error(`Fetch failed on ${activeDbId}. Code: ${e.code}, Message: ${e.message}`);
        if (e.code === 5 || e.message?.includes('NOT_FOUND')) {
          console.error(`Database ${activeDbId} not found during fetch, attempting fallback to (default)`);
          db = getFirestore(admin.app());
          activeDbId = '(default)';
          try {
            snapshot = await db.collection('courier_configs').get();
          } catch (fallbackErr: any) {
            console.error(`Fallback to (default) also failed. Code: ${fallbackErr.code}, Message: ${fallbackErr.message}`);
            throw fallbackErr;
          }
        } else {
          throw e;
        }
      }

      const configs: any = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        // Mask sensitive data in logs
        const maskedData = { ...data, apiKey: '***', secretKey: '***', clientSecret: '***', password: '***' };
        console.log(`Found config for ${doc.id}:`, maskedData);
        configs[doc.id] = data;
      });
      
      console.log(`Returning all courier configs from ${activeDbId}`);
      res.json(configs);
    } catch (error: any) {
      console.error(`Error fetching courier configs (DB: ${activeDbId || 'Unknown'}):`, error);
      res.status(500).json({ error: `Firestore Error (DB: ${activeDbId || 'Unknown'}): ${error.message}` });
    }
  });

  app.post('/api/couriers/configs/:courier', async (req, res) => {
    console.log(`POST /api/couriers/configs/${req.params.courier} hit`);
    try {
      const database = await getDb();
      if (!database) {
        console.error('Firebase Admin not initialized');
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
      }
      const { courier } = req.params;
      const config = req.body;
      console.log(`Saving config for ${courier}:`, { ...config, apiKey: '***', secretKey: '***', clientSecret: '***', password: '***' });
      
      try {
        await database.collection('courier_configs').doc(courier.toLowerCase()).set({
          ...config,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (e: any) {
        if (e.code === 5 || e.message?.includes('NOT_FOUND')) {
          console.error(`Database ${activeDbId} not found during save, attempting fallback to (default)`);
          db = getFirestore(admin.app());
          activeDbId = '(default)';
          await db.collection('courier_configs').doc(courier.toLowerCase()).set({
            ...config,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } else {
          throw e;
        }
      }
      
      console.log(`Successfully saved config for ${courier} to ${activeDbId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error saving config for ${req.params.courier} (DB: ${activeDbId || 'Unknown'}):`, error);
      res.status(500).json({ error: `Firestore Error (DB: ${activeDbId || 'Unknown'}): ${error.message}` });
    }
  });

  app.post('/api/couriers/order', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier, orderData } = req.body;

      // Get courier config
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      if (!configDoc.exists || !configDoc.data()?.isActive) {
        return res.status(400).json({ error: `Courier ${courier} is not active or configured.` });
      }

      const config = configDoc.data();
      const adapter = CourierFactory.getAdapter(courier, config);
      
      const result = await adapter.createOrder(orderData);

      // Log the request
      await database.collection('courier_logs').add({
        courier,
        orderId: orderData.invoice,
        request: orderData,
        response: result,
        status: 'success',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json(result);
    } catch (error: any) {
      console.error('Courier Order Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/couriers/send-order/:courier', async (req, res) => {
    console.log(`POST /api/couriers/send-order/${req.params.courier} hit`);
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier } = req.params;
      const orderData = req.body;

      // Get courier config
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      if (!configDoc.exists || !configDoc.data()?.isActive) {
        return res.status(400).json({ error: `Courier ${courier} is not active or configured.` });
      }

      const config = configDoc.data();
      const adapter = CourierFactory.getAdapter(courier, config);
      
      // Map Logistics.tsx fields to CourierOrderData if necessary
      // Logistics.tsx sends: invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note, district, area, weight
      const mappedData: CourierOrderData = {
        customer_name: orderData.recipient_name,
        customer_phone: orderData.recipient_phone,
        customer_address: orderData.recipient_address,
        amount: orderData.cod_amount,
        cod_amount: orderData.cod_amount,
        note: orderData.note,
        weight: orderData.weight,
        invoice: orderData.invoice
      };

      const result = await adapter.createOrder(mappedData);

      // Log the request
      await database.collection('courier_logs').add({
        courier,
        orderId: orderData.invoice,
        request: orderData,
        response: result,
        status: 'success',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json(result);
    } catch (error: any) {
      console.error(`Courier Send Order Error (${req.params.courier}):`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/couriers/balance/:courier', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier } = req.params;
      
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      if (!configDoc.exists || !configDoc.data()?.isActive) {
        return res.status(400).json({ error: `Courier ${courier} is not active or configured.` });
      }

      const config = configDoc.data();
      const adapter = CourierFactory.getAdapter(courier, config);
      
      if (adapter.getBalance) {
        const result = await adapter.getBalance();
        res.json(result);
      } else {
        res.status(400).json({ error: `Balance check not supported for ${courier}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/couriers/cities/:courier', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier } = req.params;
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      if (!configDoc.exists || !configDoc.data()?.isActive) {
        return res.status(400).json({ error: `Courier ${courier} is not active.` });
      }
      const adapter = CourierFactory.getAdapter(courier, configDoc.data());
      const result = await adapter.getCities();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/couriers/zones/:courier/:cityId', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier, cityId } = req.params;
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      const adapter = CourierFactory.getAdapter(courier, configDoc.data());
      const result = await adapter.getZones(cityId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/couriers/areas/:courier/:zoneId', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier, zoneId } = req.params;
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      const adapter = CourierFactory.getAdapter(courier, configDoc.data());
      if ((adapter as any).getAreas) {
        const result = await (adapter as any).getAreas(zoneId);
        res.json(result);
      } else {
        res.status(400).json({ error: 'Areas not supported for this courier' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/couriers/check-fraud/:phone', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) {
        console.error('Fraud Check: Firebase Admin not initialized');
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
      }
      
      const { phone } = req.params;
      console.log(`Fraud check requested for: ${phone}`);

      let snapshot;
      try {
        // Find first active courier with checkFraud capability
        snapshot = await database.collection('courier_configs').where('isActive', '==', true).get();
      } catch (dbError: any) {
        console.error('Fraud Check DB Error:', dbError.message);
        // If the collection or database is not found, treat it as no active couriers
        if (dbError.code === 5 || dbError.message?.includes('NOT_FOUND')) {
          return res.json({ 
            message: 'No active courier found (collection or database missing)',
            data: { total_delivered: 0, total_cancelled: 0, courier: 'None' }
          });
        }
        throw dbError;
      }
      
      if (!snapshot || snapshot.empty) {
        console.log('No active couriers found in DB');
        return res.json({ 
          message: 'No active courier found',
          data: { total_delivered: 0, total_cancelled: 0, courier: 'None' }
        });
      }

      for (const doc of snapshot.docs) {
        const config = doc.data();
        const courierName = doc.id;
        console.log(`Checking fraud with courier: ${courierName}`);
        
        try {
          const adapter = CourierFactory.getAdapter(courierName, config);

          if (adapter.checkFraud) {
            const result = await adapter.checkFraud(phone);
            console.log(`Fraud check result from ${courierName}:`, result);
            return res.json({
              courier: courierName,
              data: result
            });
          }
        } catch (adapterError: any) {
          console.error(`Error with adapter ${courierName}:`, adapterError.message);
          // Continue to next courier if one fails
        }
      }

      res.status(400).json({ error: 'No active courier supports fraud check' });
    } catch (error: any) {
      console.error('Fraud Check Final Error:', error.message);
      res.status(500).json({ 
        error: error.message,
        data: { total_delivered: 0, total_cancelled: 0, courier: 'Error' }
      });
    }
  });

  // 404 for API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting server in DEVELOPMENT mode');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting server in PRODUCTION mode');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
