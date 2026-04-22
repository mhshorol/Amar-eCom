import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { PurchaseBatch, StockLedger, Product, ProductVariant } from '../types';

export type ValuationMethod = 'FIFO' | 'LIFO' | 'WAC';

export class ValuationService {
  /**
   * Records a stock movement in the ledger and updates valuation batches
   */
  static async recordMovement(movement: Omit<StockLedger, 'id' | 'timestamp'>) {
    const batch = writeBatch(db);
    
    // 1. Create Ledger Entry
    const ledgerRef = doc(collection(db, 'stockLedger'));
    batch.set(ledgerRef, {
      ...movement,
      timestamp: serverTimestamp()
    });

    // 2. Update Batches for FIFO/LIFO if it's a purchase
    if (movement.type === 'purchase') {
      const batchRef = doc(collection(db, 'purchaseBatches'));
      batch.set(batchRef, {
        productId: movement.productId,
        variantId: movement.variantId || null,
        quantity: movement.quantity,
        originalQuantity: movement.quantity,
        unitCost: movement.unitCost,
        warehouseId: movement.warehouseId,
        purchaseDate: serverTimestamp()
      });
    }

    await batch.commit();
  }

  /**
   * Calculates current inventory valuation using specified method
   */
  static async calculateValuation(method: ValuationMethod = 'WAC', filters?: { warehouseId?: string, category?: string }) {
    // 1. Fetch all products and variants
    const productsSnap = await getDocs(collection(db, 'products'));
    const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

    // 2. Fetch all active purchase batches
    const batchesQuery = query(
      collection(db, 'purchaseBatches'),
      where('quantity', '>', 0),
      orderBy('purchaseDate', 'asc')
    );
    const batchesSnap = await getDocs(batchesQuery);
    const batches = batchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseBatch));

    let totalValuation = 0;
    const productValuation: Record<string, { quantity: number, value: number, name: string, sku: string }> = {};

    products.forEach(p => {
      const pBatches = batches.filter(b => b.productId === p.id);
      let quantity = 0;
      let value = 0;

      if (method === 'WAC') {
        const totalQty = pBatches.reduce((sum, b) => sum + b.quantity, 0);
        const totalCost = pBatches.reduce((sum, b) => sum + (b.quantity * b.unitCost), 0);
        quantity = totalQty;
        value = totalCost;
      } else if (method === 'FIFO') {
        // FIFO/LIFO logic usually applies during sales to calculate COGS, 
        // but for total valuation of REMAINING stock, it's just the sum of remaining batches
        quantity = pBatches.reduce((sum, b) => sum + b.quantity, 0);
        value = pBatches.reduce((sum, b) => sum + (b.quantity * b.unitCost), 0);
      }

      productValuation[p.id] = {
        quantity,
        value,
        name: p.name,
        sku: p.sku
      };
      totalValuation += value;
    });

    return {
      totalValuation,
      products: productValuation
    };
  }

  /**
   * Calculates COGS for a given period
   */
  static async calculateCOGS(startDate: Date, endDate: Date) {
    const ledgerQuery = query(
      collection(db, 'stockLedger'),
      where('type', '==', 'sale'),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate))
    );
    const ledgerSnap = await getDocs(ledgerQuery);
    const entries = ledgerSnap.docs.map(d => d.data() as StockLedger);

    return entries.reduce((sum, entry) => sum + (Math.abs(entry.quantity) * entry.unitCost), 0);
  }

  /**
   * Identifies slow moving stock (no sales in X days)
   */
  static async getDeadStock(days: number = 90) {
    const thresholdDate = subDays(new Date(), days);
    
    // Fetch all products
    const productsSnap = await getDocs(collection(db, 'products'));
    const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

    // Fetch recent sales for each product
    const deadStock = [];
    for (const p of products) {
      const salesQuery = query(
        collection(db, 'stockLedger'),
        where('productId', '==', p.id),
        where('type', '==', 'sale'),
        where('timestamp', '>=', Timestamp.fromDate(thresholdDate)),
        limit(1)
      );
      const salesSnap = await getDocs(salesQuery);
      if (salesSnap.empty && p.stockLevel > 0) {
        deadStock.push(p);
      }
    }
    return deadStock;
  }
}

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}
