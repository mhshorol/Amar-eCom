import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  ExternalLink,
  Navigation,
  BarChart2,
  Loader2,
  X,
  Trash2,
  Edit,
  RefreshCw,
  Zap,
  Save,
  ChevronDown,
  Settings2
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  doc,
  getDoc,
  query, 
  orderBy, 
  getDocs,
  limit,
  where,
  serverTimestamp,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import ConfirmModal from './ConfirmModal';
import CourierReconciliation from './CourierReconciliation';

interface Delivery {
  id: string;
  orderId: string;
  orderNumber?: number;
  courier: string;
  status: string;
  location: string;
  eta: string;
  createdAt: any;
  uid: string;
  trackingCode?: string;
}

interface Courier {
  id: string;
  name: string;
  active: boolean;
  orders: number;
  success: string;
  uid: string;
}

export default function Logistics() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [courierConfigs, setCourierConfigs] = useState<Record<string, any>>({});
  const [courierLogs, setCourierLogs] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'shipments' | 'pending' | 'couriers' | 'logs' | 'reconciliation'>('shipments');
  const [orderMap, setOrderMap] = useState<Record<string, number>>({});
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);

  useEffect(() => {
    const fetchMissingOrderNumbers = async () => {
      const missingIds = Array.from(new Set(
        deliveries
          .filter(d => !d.orderNumber && !d.orderId.startsWith('woo_') && !orderMap[d.orderId])
          .map(d => d.orderId)
      ));
      
      if (missingIds.length === 0) return;

      const newMap = { ...orderMap };
      try {
        // Firestore 'in' query has a limit of 10
        for (let i = 0; i < missingIds.length; i += 10) {
          const chunk = missingIds.slice(i, i + 10);
          const q = query(collection(db, 'orders'), where('__name__', 'in', chunk));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            if (doc.data().orderNumber) {
              newMap[doc.id] = doc.data().orderNumber;
            } else {
              newMap[doc.id] = -1; // -1 indicates marked but not found
            }
          });
        }
        setOrderMap(newMap);
      } catch (error) {
        console.error("Error fetching order numbers:", error);
      }
    };
    
    fetchMissingOrderNumbers();
  }, [deliveries]);
  const [selectedPendingOrders, setSelectedPendingOrders] = useState<string[]>([]);

  useEffect(() => {
    const fetchCourierData = async () => {
      try {
        const response = await fetch('/api/couriers/configs');
        if (response.ok) {
          const data = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
          setCourierConfigs(data);
        }

        // Fetch logs if on logs tab
        if (activeSubTab === 'logs') {
          try {
            const logsSnap = await getDocs(query(collection(db, 'courier_logs'), limit(50)));
            setCourierLogs(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          } catch (logError) {
            console.error("Error fetching courier logs:", logError);
            toast.error("Failed to fetch courier logs. Check permissions.");
          }
        }
      } catch (error) {
        console.error("Error in fetchCourierData:", error);
      }
    };
    fetchCourierData();
  }, [activeSubTab]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [courierForm, setCourierForm] = useState({
    name: '',
    active: true,
  });
  const [deliveryForm, setDeliveryForm] = useState({
    orderId: '',
    courier: '',
    status: 'in_transit',
    location: '',
    eta: '2-3 Days',
    city_id: '',
    zone_id: '',
    area_id: '',
  });

  const [cities, setCities] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    if (isDeliveryModalOpen && (deliveryForm.courier === 'Pathao' || deliveryForm.courier === 'Carrybee')) {
      fetchCities(deliveryForm.courier);
    }
  }, [isDeliveryModalOpen, deliveryForm.courier]);

  const fetchCities = async (courier: string) => {
    setLoadingLocations(true);
    try {
      const response = await fetch(`/api/couriers/cities/${courier.toLowerCase()}`);
      if (response.ok) {
        const data = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        // Pathao returns { data: [...] }, Carrybee returns { data: { cities: [...] } }
        const cityList = data.data?.cities || data.data || [];
        setCities(cityList);
      } else {
        const errData = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        console.error(`Error fetching ${courier} cities:`, errData.error);
      }
    } catch (error: any) {
      console.error(`Error fetching ${courier} cities:`, error.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchZones = async (cityId: string) => {
    setLoadingLocations(true);
    setZones([]);
    setAreas([]);
    const courier = deliveryForm.courier.toLowerCase();
    try {
      const response = await fetch(`/api/couriers/zones/${courier}/${cityId}`);
      if (response.ok) {
        const data = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        const zoneList = data.data?.zones || data.data || [];
        setZones(zoneList);
      } else {
        const errData = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        console.error(`Error fetching ${courier} zones:`, errData.error);
      }
    } catch (error: any) {
      console.error(`Error fetching ${courier} zones:`, error.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchAreas = async (zoneId: string) => {
    setLoadingLocations(true);
    setAreas([]);
    const courier = deliveryForm.courier.toLowerCase();
    // Carrybee needs cityId too, but our API proxy handles it if we pass it or if the adapter knows it.
    // Actually, the Carrybee adapter's getAreas(zoneId, cityId) needs both.
    // Let's check how the server route is defined.
    // app.get('/api/couriers/areas/:courier/:zoneId', ...)
    
    try {
      const url = courier === 'carrybee' 
        ? `/api/couriers/areas/${courier}/${zoneId}?cityId=${deliveryForm.city_id}`
        : `/api/couriers/areas/${courier}/${zoneId}`;
        
      const response = await fetch(url);
      if (response.ok) {
        const data = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        const areaList = data.data?.areas || data.data || [];
        setAreas(areaList);
      } else {
        const errData = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        console.error(`Error fetching ${courier} areas:`, errData.error);
      }
    } catch (error: any) {
      console.error(`Error fetching ${courier} areas:`, error.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const qDeliveries = query(collection(db, 'deliveries'), orderBy('createdAt', 'desc'));
    const qCouriers = query(collection(db, 'couriers'), orderBy('name', 'asc'));
    
    const unsubscribeDeliveries = onSnapshot(qDeliveries, (snapshot) => {
      const deliveryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Delivery[];
      setDeliveries(deliveryData);
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'deliveries');
      }
      setLoading(false);
    });

    const unsubscribeCouriers = onSnapshot(qCouriers, (snapshot) => {
      const courierData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Courier[];
      setCouriers(courierData);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'couriers');
      }
    });

    // Fetch pending orders for the new tab
    const qPending = query(
      collection(db, 'orders'), 
      where('status', 'in', ['confirmed', 'processing']),
      orderBy('createdAt', 'desc')
    );
    const unsubscribePending = onSnapshot(qPending, (snapshot) => {
      const pendingData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any)).filter(o => !o.trackingNumber); // Only those without tracking
      setPendingOrders(pendingData);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    });

    return () => {
      unsubscribeDeliveries();
      unsubscribeCouriers();
      unsubscribePending();
    };
  }, [user]);

  const handleBulkBook = async () => {
    const activeCouriers = Object.entries(courierConfigs)
      .filter(([_, config]: [string, any]) => config.isActive)
      .map(([name]) => name);

    if (activeCouriers.length === 0) {
      toast.error("No active couriers found. Please configure couriers first.");
      return;
    }

    const courierToUse = activeCouriers[0]; // Default to first active courier
    
    setConfirmConfig({
      isOpen: true,
      title: 'Bulk Book Orders',
      message: `Are you sure you want to book ${selectedPendingOrders.length} orders with ${courierToUse.toUpperCase()}?`,
      onConfirm: async () => {
        let successCount = 0;
        let failCount = 0;

        for (const orderId of selectedPendingOrders) {
          const order = pendingOrders.find(o => o.id === orderId);
          if (!order) continue;

          try {
            const response = await fetch(`/api/couriers/send-order/${courierToUse}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoice: order.orderNumber || order.id.slice(0, 8),
                recipient_name: order.customerName,
                recipient_phone: order.customerPhone.replace(/\D/g, '').slice(-11),
                recipient_address: order.customerAddress,
                cod_amount: order.dueAmount || 0,
                note: order.notes || '',
                district: order.district || '',
                area: order.area || '',
                weight: 0.5,
                recipient_city: order.pathao_city_id,
                recipient_zone: order.pathao_zone_id,
                recipient_area: order.pathao_area_id,
              })
            });

            if (response.ok) {
              const result = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
              if (result.success) {
                // Update order in Firestore
                await updateDoc(doc(db, 'orders', order.id), {
                  courierName: courierToUse,
                  trackingNumber: result.tracking_code || result.consignment_id || '',
                  status: 'shipped',
                  logs: [
                    ...(order.logs || []),
                    {
                      user: auth.currentUser?.email,
                      action: 'Sent to Courier (Bulk)',
                      timestamp: Timestamp.now(),
                      details: `Sent to ${courierToUse} via Logistics Bulk Book`
                    }
                  ]
                });

                // Add to deliveries
                await addDoc(collection(db, 'deliveries'), {
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  courier: courierToUse,
                  status: 'In Transit',
                  location: 'Pending Pickup',
                  eta: '2-3 Days',
                  trackingCode: result.tracking_code || result.consignment_id || '',
                  uid: auth.currentUser!.uid,
                  createdAt: serverTimestamp()
                });

                successCount++;
              } else {
                failCount++;
              }
            } else {
              failCount++;
            }
          } catch (error) {
            console.error(`Error booking order ${orderId}:`, error);
            failCount++;
          }
        }

        toast.success(`Bulk booking complete: ${successCount} success, ${failCount} failed.`);
        setSelectedPendingOrders([]);
      }
    });
  };

  const handleSyncStatus = async (delivery: Delivery) => {
    if (!delivery.courier || !delivery.id) return;

    toast.loading(`Syncing status with ${delivery.courier}...`, { id: 'sync-status' });
    try {
      const response = await fetch(`/api/couriers/track/${delivery.courier.toLowerCase()}/${delivery.trackingCode || delivery.id}`);
      const data = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
      
      if (response.ok) {
        // Map courier-specific status to our app status
        let rawStatus = data.delivery_status || data.status;
        
        const statusMap: Record<string, string> = {
          'pending': 'pending_pickup',
          'delivered': 'delivered',
          'cancelled': 'cancelled',
          'in_transit': 'in_transit',
          'hold': 'hold',
          'return': 'returned',
          'delivered_approval_pending': 'delivered'
        };

        const newStatus = statusMap[rawStatus] || rawStatus;
        
        await updateDoc(doc(db, 'deliveries', delivery.id), {
          status: newStatus,
          updatedAt: serverTimestamp()
        });

        // Also update the order status if needed
        if (delivery.orderId) {
          const orderRef = doc(db, 'orders', delivery.orderId);
          const orderSnap = await getDoc(orderRef);
          if (orderSnap.exists()) {
            const orderStatusMap: Record<string, string> = {
              'delivered': 'delivered',
              'cancelled': 'cancelled',
              'in_transit': 'shipped'
            };
            if (orderStatusMap[rawStatus]) {
              await updateDoc(orderRef, { status: orderStatusMap[rawStatus] });
            }
          }
        }

        toast.success(`Status updated: ${newStatus}`, { id: 'sync-status' });
      } else {
        throw new Error(data.error || 'Failed to sync status');
      }
    } catch (error: any) {
      console.error('Sync status error:', error);
      toast.error('Failed to sync status.', { id: 'sync-status' });
    }
  };

  const handleOpenAddCourierModal = () => {
    setEditingCourier(null);
    setCourierForm({ name: '', active: true });
    setIsModalOpen(true);
  };

  const handleOpenEditCourierModal = (courier: Courier) => {
    setEditingCourier(courier);
    setCourierForm({ name: courier.name, active: courier.active });
    setIsModalOpen(true);
  };

  const handleCourierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...courierForm,
        updatedAt: serverTimestamp()
      };

      if (editingCourier) {
        await updateDoc(doc(db, 'couriers', editingCourier.id), data);
      } else {
        await addDoc(collection(db, 'couriers'), {
          ...data,
          orders: 0,
          success: '100%',
          createdAt: serverTimestamp(),
          uid: auth.currentUser.uid
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingCourier ? OperationType.UPDATE : OperationType.CREATE, 'couriers');
    }
  };

  const handleOpenAddDeliveryModal = () => {
    setEditingDelivery(null);
    setDeliveryForm({
      orderId: '',
      courier: couriers[0]?.name || '',
      status: 'in_transit',
      location: '',
      eta: '2-3 Days',
      city_id: '',
      zone_id: '',
      area_id: '',
    });
    setCities([]);
    setZones([]);
    setAreas([]);
    setIsDeliveryModalOpen(true);
  };

  const handleOpenEditDeliveryModal = (delivery: Delivery) => {
    setEditingDelivery(delivery);
    setDeliveryForm({
      orderId: delivery.orderId,
      courier: delivery.courier,
      status: delivery.status,
      location: delivery.location,
      eta: delivery.eta,
      city_id: (delivery as any).city_id || '',
      zone_id: (delivery as any).zone_id || '',
      area_id: (delivery as any).area_id || '',
    });
    setIsDeliveryModalOpen(true);
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...deliveryForm,
        updatedAt: serverTimestamp()
      };

      if (editingDelivery) {
        await updateDoc(doc(db, 'deliveries', editingDelivery.id), data);
      } else {
        await addDoc(collection(db, 'deliveries'), {
          ...data,
          createdAt: serverTimestamp(),
          uid: auth.currentUser.uid
        });
      }
      setIsDeliveryModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingDelivery ? OperationType.UPDATE : OperationType.CREATE, 'deliveries');
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Shipment',
      message: 'Are you sure you want to delete this delivery? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'deliveries', id));
          toast.success('Delivery deleted');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `deliveries/${id}`);
        }
      }
    });
  };

  const handleDeleteCourier = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Courier',
      message: 'Are you sure you want to delete this courier? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'couriers', id));
          toast.success('Courier deleted');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `couriers/${id}`);
        }
      }
    });
  };

  const handleSaveConfigs = async () => {
    setIsSaving(true);
    try {
      // Save each courier config to backend
      for (const [courier, config] of Object.entries(courierConfigs)) {
        const response = await fetch(`/api/couriers/configs/${courier}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        if (!response.ok) {
          const errorData = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
          throw new Error(errorData.error || `Failed to save ${courier} config`);
        }
      }
      toast.success('Courier configs saved successfully!');
    } catch (error: any) {
      console.error('Error saving configs:', error);
      toast.error('Failed to save courier configurations: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (deliveries.length === 0) {
      toast.error('No deliveries to export');
      return;
    }

    const headers = ['ID', 'Order ID', 'Courier', 'Status', 'Location', 'ETA', 'Created At'];
    const csvRows = [headers.join(',')];

    deliveries.forEach(delivery => {
      const mappedOrderId = delivery.orderId.startsWith('woo_') ? delivery.orderId : 
            ((delivery.orderNumber ?? orderMap[delivery.orderId]) && (delivery.orderNumber ?? orderMap[delivery.orderId]) !== -1
               ? `#${delivery.orderNumber ?? orderMap[delivery.orderId]}` 
               : delivery.orderId);

      const row = [
        delivery.id,
        mappedOrderId || '',
        delivery.courier || '',
        delivery.status || '',
        `"${delivery.location || ''}"`,
        delivery.eta || '',
        delivery.createdAt?.toDate ? delivery.createdAt.toDate().toLocaleString() : (delivery.createdAt?.seconds ? new Date(delivery.createdAt.seconds * 1000).toLocaleString() : 'N/A')
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `deliveries_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Deliveries exported successfully');
  };

  const filteredDeliveries = useMemo(() => deliveries.filter(delivery => {
    const mappedOrderNum = delivery.orderNumber ?? orderMap[delivery.orderId] ?? '';
    const searchableOrderNum = String(mappedOrderNum).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return delivery.id.toLowerCase().includes(searchLower) ||
    delivery.orderId.toLowerCase().includes(searchLower) ||
    searchableOrderNum.includes(searchLower) ||
    delivery.courier.toLowerCase().includes(searchLower) ||
    delivery.location.toLowerCase().includes(searchLower);
  }), [deliveries, orderMap, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6">
        {/* Title and Top Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="shrink-0">
            <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Logistics & Delivery</h2>
            <p className="text-sm text-gray-500 mt-1">Track shipments, manage courier partners, and optimize routes.</p>
          </div>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar w-full xl:w-auto">
            <button 
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-[13px] font-semibold hover:bg-gray-50 transition-colors shrink-0"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button 
              onClick={handleOpenAddDeliveryModal}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#141414] text-white rounded-full text-[13px] font-semibold hover:bg-black transition-colors shadow-sm cursor-pointer shrink-0"
            >
              <Plus size={16} />
              Add Shipment
            </button>
            <button 
              onClick={handleOpenAddCourierModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-[13px] font-semibold hover:bg-gray-50 transition-colors shrink-0"
            >
              <Plus size={16} />
              Connect Courier
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar w-full">
          <button 
            onClick={() => setActiveSubTab('shipments')}
            className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shrink-0 ${activeSubTab === 'shipments' ? 'bg-[#141414] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Shipments
          </button>
          <button 
            onClick={() => setActiveSubTab('pending')}
            className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shrink-0 flex items-center gap-2 ${activeSubTab === 'pending' ? 'bg-[#141414] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Pending Ready-to-Ship
            {pendingOrders.length > 0 && (
              <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${activeSubTab === 'pending' ? 'bg-white/20 text-white' : 'bg-[#00AEEF] text-white'}`}>
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('couriers')}
            className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shrink-0 ${activeSubTab === 'couriers' ? 'bg-[#141414] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Courier Partners
          </button>
          <button 
            onClick={() => setActiveSubTab('reconciliation')}
            className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shrink-0 ${activeSubTab === 'reconciliation' ? 'bg-[#141414] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            Charge Reconciliation
          </button>
          <button 
            onClick={() => setActiveSubTab('logs')}
            className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shrink-0 ${activeSubTab === 'logs' ? 'bg-[#141414] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            API Logs
          </button>
        </div>
      </div>

       {activeSubTab === 'reconciliation' && (
         <div className="animate-in fade-in duration-300">
            <CourierReconciliation />
         </div>
       )}

       {activeSubTab === 'couriers' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Available Integrations</h3>
              <p className="text-sm text-gray-500 mt-1">Connect and configure your delivery partners</p>
            </div>
            <button 
              onClick={handleSaveConfigs}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save Configurations'}
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Steadfast */}
            <div className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${expandedConfig === 'steadfast' ? 'border-gray-800 shadow-md ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer bg-white group select-none"
                onClick={() => setExpandedConfig(expandedConfig === 'steadfast' ? null : 'steadfast')}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center ring-4 ring-gray-50 overflow-hidden shrink-0 p-1">
                    <img 
                      src="/assets/couriers/steadfast.jpg" 
                      alt="Steadfast Courier" 
                      className="w-full h-full object-contain mix-blend-multiply" 
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://ui-avatars.com/api/?name=Steadfast&background=0052CC&color=fff&size=128&rounded=true' }} 
                    />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Steadfast Courier</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Automated delivery for Bangladesh</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {courierConfigs.steadfast?.isActive ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-green-200/50">Connected</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-gray-200">Disconnected</span>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedConfig === 'steadfast' ? 'bg-gray-100' : 'group-hover:bg-gray-50'}`}>
                    <ChevronDown size={18} className={`text-gray-500 transition-transform duration-300 ${expandedConfig === 'steadfast' ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {expandedConfig === 'steadfast' && (
                <div className="px-6 pb-6 pt-2 bg-[#FDFDFD] border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-5 px-1 pt-3">
                    <h5 className="text-sm font-bold text-gray-700">API Configuration</h5>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500">Enable Integration</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCourierConfigs(prev => ({ ...prev, steadfast: { ...prev.steadfast, isActive: !prev.steadfast?.isActive } }))}}
                        className={`w-11 h-6 rounded-full transition-colors relative shadow-inner overflow-hidden ${courierConfigs.steadfast?.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${courierConfigs.steadfast?.isActive ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">API Key</label>
                      <input 
                        type="text" 
                        value={courierConfigs.steadfast?.apiKey || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, steadfast: { ...prev.steadfast, apiKey: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter API Key"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Secret Key</label>
                      <input 
                        type="password" 
                        value={courierConfigs.steadfast?.secretKey || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, steadfast: { ...prev.steadfast, secretKey: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Secret Key"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pathao */}
            <div className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${expandedConfig === 'pathao' ? 'border-gray-800 shadow-md ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer bg-white group select-none"
                onClick={() => setExpandedConfig(expandedConfig === 'pathao' ? null : 'pathao')}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center ring-4 ring-gray-50 overflow-hidden shrink-0 p-1">
                    <img 
                      src="/assets/couriers/pathao.jpg" 
                      alt="Pathao Courier" 
                      className="w-full h-full object-contain mix-blend-multiply" 
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://ui-avatars.com/api/?name=Pathao&background=FF5A00&color=fff&size=128&rounded=true' }} 
                    />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 group-hover:text-orange-500 transition-colors">Pathao Courier</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Fast and reliable delivery service</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {courierConfigs.pathao?.isActive ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-green-200/50">Connected</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-gray-200">Disconnected</span>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedConfig === 'pathao' ? 'bg-gray-100' : 'group-hover:bg-gray-50'}`}>
                    <ChevronDown size={18} className={`text-gray-500 transition-transform duration-300 ${expandedConfig === 'pathao' ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {expandedConfig === 'pathao' && (
                <div className="px-6 pb-6 pt-2 bg-[#FDFDFD] border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-5 px-1 pt-3">
                    <h5 className="text-sm font-bold text-gray-700">API Configuration</h5>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group/sandbox">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={courierConfigs.pathao?.isSandbox || false}
                            onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, isSandbox: e.target.checked } }))}
                          />
                          <div className="w-4 h-4 border-2 border-gray-300 rounded peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-colors"></div>
                          <svg className="absolute w-4 h-4 text-white p-0.5 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 group-hover/sandbox:text-gray-800 uppercase tracking-widest transition-colors">Sandbox Mode</span>
                      </label>
                      <div className="h-4 w-px bg-gray-200"></div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500">Enable Integration</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, isActive: !prev.pathao?.isActive } }))}}
                          className={`w-11 h-6 rounded-full transition-colors relative shadow-inner overflow-hidden ${courierConfigs.pathao?.isActive ? 'bg-orange-500' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${courierConfigs.pathao?.isActive ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client ID</label>
                      <input 
                        type="text" 
                        value={courierConfigs.pathao?.clientId || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, clientId: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Client ID"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client Secret</label>
                      <input 
                        type="password" 
                        value={courierConfigs.pathao?.clientSecret || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, clientSecret: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Client Secret"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Email (Username)</label>
                      <input 
                        type="text" 
                        value={courierConfigs.pathao?.username || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, username: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                      <input 
                        type="password" 
                        value={courierConfigs.pathao?.password || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, password: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Password"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Store ID</label>
                      <input 
                        type="text" 
                        value={courierConfigs.pathao?.storeId || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, storeId: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Pathao Store ID"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RedX */}
            <div className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${expandedConfig === 'redx' ? 'border-gray-800 shadow-md ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer bg-white group select-none"
                onClick={() => setExpandedConfig(expandedConfig === 'redx' ? null : 'redx')}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center ring-4 ring-gray-50 overflow-hidden shrink-0 p-1">
                    <img 
                      src="/assets/couriers/redx.png" 
                      alt="RedX Courier" 
                      className="w-full h-full object-contain mix-blend-multiply" 
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://ui-avatars.com/api/?name=RedX&background=E50914&color=fff&size=128&rounded=true' }} 
                    />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors">RedX</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Logistics for modern businesses</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {courierConfigs.redx?.isActive ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-green-200/50">Connected</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-gray-200">Disconnected</span>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedConfig === 'redx' ? 'bg-gray-100' : 'group-hover:bg-gray-50'}`}>
                    <ChevronDown size={18} className={`text-gray-500 transition-transform duration-300 ${expandedConfig === 'redx' ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {expandedConfig === 'redx' && (
                <div className="px-6 pb-6 pt-2 bg-[#FDFDFD] border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-5 px-1 pt-3">
                    <h5 className="text-sm font-bold text-gray-700">API Configuration</h5>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500">Enable Integration</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCourierConfigs(prev => ({ ...prev, redx: { ...prev.redx, isActive: !prev.redx?.isActive } }))}}
                        className={`w-11 h-6 rounded-full transition-colors relative shadow-inner overflow-hidden ${courierConfigs.redx?.isActive ? 'bg-red-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${courierConfigs.redx?.isActive ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 px-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">API Key</label>
                    <input 
                      type="text" 
                      value={courierConfigs.redx?.apiKey || ''} 
                      onChange={e => setCourierConfigs(prev => ({ ...prev, redx: { ...prev.redx, apiKey: e.target.value } }))}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all shadow-sm" 
                      placeholder="Enter API Key"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Carrybee */}
            <div className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${expandedConfig === 'carrybee' ? 'border-gray-800 shadow-md ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer bg-white group select-none"
                onClick={() => setExpandedConfig(expandedConfig === 'carrybee' ? null : 'carrybee')}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center ring-4 ring-gray-50 overflow-hidden shrink-0 p-1">
                    <img 
                      src="/assets/couriers/carrybee.png" 
                      alt="Carrybee Courier" 
                      className="w-full h-full object-contain mix-blend-multiply" 
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://ui-avatars.com/api/?name=Carrybee&background=FFC107&color=fff&size=128&rounded=true' }} 
                    />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 group-hover:text-yellow-600 transition-colors">Carrybee</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Fast and secure delivery</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {courierConfigs.carrybee?.isActive ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-green-200/50">Connected</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-gray-200">Disconnected</span>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedConfig === 'carrybee' ? 'bg-gray-100' : 'group-hover:bg-gray-50'}`}>
                    <ChevronDown size={18} className={`text-gray-500 transition-transform duration-300 ${expandedConfig === 'carrybee' ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {expandedConfig === 'carrybee' && (
                <div className="px-6 pb-6 pt-2 bg-[#FDFDFD] border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-5 px-1 pt-3">
                    <h5 className="text-sm font-bold text-gray-700">API Configuration</h5>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group/sandbox">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={courierConfigs.carrybee?.isSandbox || false}
                            onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, isSandbox: e.target.checked } }))}
                          />
                          <div className="w-4 h-4 border-2 border-gray-300 rounded peer-checked:bg-yellow-500 peer-checked:border-yellow-500 transition-colors"></div>
                          <svg className="absolute w-4 h-4 text-white p-0.5 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 group-hover/sandbox:text-gray-800 uppercase tracking-widest transition-colors">Sandbox Mode</span>
                      </label>
                      <div className="h-4 w-px bg-gray-200"></div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500">Enable Integration</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, isActive: !prev.carrybee?.isActive } }))}}
                          className={`w-11 h-6 rounded-full transition-colors relative shadow-inner overflow-hidden ${courierConfigs.carrybee?.isActive ? 'bg-yellow-500' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${courierConfigs.carrybee?.isActive ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client ID</label>
                      <input 
                        type="text" 
                        value={courierConfigs.carrybee?.clientId || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, clientId: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Client ID"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client Secret</label>
                      <input 
                        type="password" 
                        value={courierConfigs.carrybee?.clientSecret || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, clientSecret: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Client Secret"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Client Context</label>
                      <input 
                        type="text" 
                        value={courierConfigs.carrybee?.clientContext || ''} 
                        onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, clientContext: e.target.value } }))}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all shadow-sm" 
                        placeholder="Enter Client Context"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Paperfly */}
            <div className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${expandedConfig === 'paperfly' ? 'border-gray-800 shadow-md ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer bg-white group select-none"
                onClick={() => setExpandedConfig(expandedConfig === 'paperfly' ? null : 'paperfly')}
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center ring-4 ring-gray-50 overflow-hidden shrink-0 p-1">
                    <img 
                      src="/assets/couriers/paperfly.jpg" 
                      alt="Paperfly Courier" 
                      className="w-full h-full object-contain mix-blend-multiply" 
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://ui-avatars.com/api/?name=Paperfly&background=3F51B5&color=fff&size=128&rounded=true' }} 
                    />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Paperfly</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Smart logistics for smart businesses</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {courierConfigs.paperfly?.isActive ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-green-200/50">Connected</span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-gray-200">Disconnected</span>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedConfig === 'paperfly' ? 'bg-gray-100' : 'group-hover:bg-gray-50'}`}>
                    <ChevronDown size={18} className={`text-gray-500 transition-transform duration-300 ${expandedConfig === 'paperfly' ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {expandedConfig === 'paperfly' && (
                <div className="px-6 pb-6 pt-2 bg-[#FDFDFD] border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-5 px-1 pt-3">
                    <h5 className="text-sm font-bold text-gray-700">API Configuration</h5>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500">Enable Integration</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCourierConfigs(prev => ({ ...prev, paperfly: { ...prev.paperfly, isActive: !prev.paperfly?.isActive } }))}}
                        className={`w-11 h-6 rounded-full transition-colors relative shadow-inner overflow-hidden ${courierConfigs.paperfly?.isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${courierConfigs.paperfly?.isActive ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 px-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">API Key</label>
                    <input 
                      type="text" 
                      value={courierConfigs.paperfly?.apiKey || ''} 
                      onChange={e => setCourierConfigs(prev => ({ ...prev, paperfly: { ...prev.paperfly, apiKey: e.target.value } }))}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm" 
                      placeholder="Enter API Key"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
            
          {/* OTHER CUSTOM COURIERS HEADER */}
          <div className="pt-8 mb-4 border-t border-gray-100 mt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Manual Couriers</h3>
                <p className="text-sm text-gray-500 mt-1">Manage couriers that are not directly integrated via API</p>
              </div>
              <button 
                onClick={handleOpenAddCourierModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus size={16} /> Add Custom Courier
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {couriers.filter(c => !['steadfast', 'pathao', 'redx', 'carrybee', 'paperfly'].includes(c.name.toLowerCase())).map((courier) => (
              <div key={courier.id} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative group">
                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenEditCourierModal(courier)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCourier(courier.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700 font-bold shadow-inner border-b-2">
                    <Truck size={20} className="text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm leading-tight">{courier.name}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={`w-2 h-2 rounded-full ${courier.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`}></div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">{courier.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Total</p>
                    <p className="text-xl font-bold text-gray-900">{courier.orders || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Success</p>
                    <p className="text-sm font-bold text-green-600 mt-2">{courier.success || '100%'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
            <h4 className="text-sm font-bold text-gray-900">Courier API Logs</h4>
            <button 
              onClick={() => setActiveSubTab('logs')}
              className="p-1 hover:bg-gray-200 rounded-md transition-all"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px] whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Courier</th>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {courierLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-900 uppercase">{log.courier}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600">#{log.orderId}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => console.log(log)}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        View JSON
                      </button>
                    </td>
                  </tr>
                ))}
                {courierLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#f3f4f6] shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-[#00AEEF] rounded-xl">
                <Truck size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#141414]">Pending Shipments</h3>
                <p className="text-xs text-gray-500">Orders ready to be sent to courier partners.</p>
              </div>
            </div>
            {selectedPendingOrders.length > 0 && (
              <button 
                onClick={handleBulkBook}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#00AEEF] text-white rounded-xl text-sm font-bold hover:bg-[#0095cc] transition-all shadow-lg"
              >
                <Zap size={16} />
                Bulk Book ({selectedPendingOrders.length})
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#f3f4f6] shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#f9fafb] bg-[#f9fafb]/50">
                  <th className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-[#d1d5db]"
                      checked={selectedPendingOrders.length === pendingOrders.length && pendingOrders.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedPendingOrders(pendingOrders.map(o => o.id));
                        else setSelectedPendingOrders([]);
                      }}
                    />
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Order</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f9fafb]">
                {pendingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                      No pending shipments found.
                    </td>
                  </tr>
                ) : (
                  pendingOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#f9fafb]/50 transition-colors group">
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-[#d1d5db]"
                          checked={selectedPendingOrders.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedPendingOrders([...selectedPendingOrders, order.id]);
                            else setSelectedPendingOrders(selectedPendingOrders.filter(id => id !== order.id));
                          }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[#141414]">#{order.orderNumber || order.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-[#9ca3af]">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[#141414]">{order.customerName}</span>
                          <span className="text-[10px] text-[#9ca3af]">{order.customerPhone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-[#6b7280] line-clamp-1 max-w-[200px]">{order.customerAddress}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-[#141414]">
                        {settings?.currencySymbol || '৳'}{(order.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'shipments' && (
        <>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Tracking ID, Order ID, Courier..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select className="flex-1 md:flex-none px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm outline-none focus:bg-white focus:border-gray-200">
            <option>All Statuses</option>
            <option>In Transit</option>
            <option>Delivered</option>
            <option>Pending Pickup</option>
            <option>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="px-6 py-4 font-semibold">Tracking info</th>
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Courier</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">ETA / Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-gray-400" size={24} />
                      <span className="text-sm text-gray-500">Loading deliveries...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Truck className="text-gray-300" size={48} />
                      <span className="text-sm text-gray-500">No deliveries found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-mono font-bold text-[#141414]">{delivery.trackingCode || delivery.id}</span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                          <Truck size={10} />
                          Standard Delivery
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-gray-600">
                        {delivery.orderId.startsWith('woo_') ? delivery.orderId : 
                           ((delivery.orderNumber ?? orderMap[delivery.orderId]) && (delivery.orderNumber ?? orderMap[delivery.orderId]) !== -1
                              ? `#${delivery.orderNumber ?? orderMap[delivery.orderId]}` 
                              : delivery.orderId)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-[#141414]">{delivery.courier}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <MapPin size={12} className="text-gray-400" />
                        {delivery.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          {delivery.status?.toLowerCase() === 'delivered' ? (
                            <CheckCircle2 size={14} className="text-green-500" />
                          ) : delivery.status?.toLowerCase() === 'cancelled' ? (
                            <AlertCircle size={14} className="text-red-500" />
                          ) : (
                            <Clock size={14} className="text-blue-500" />
                          )}
                          <span className={`text-[10px] font-bold ${
                            delivery.status?.toLowerCase() === 'delivered' ? 'text-green-600' :
                            delivery.status?.toLowerCase() === 'cancelled' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {delivery.status.replace(/_/g, ' ').charAt(0).toUpperCase() + delivery.status.replace(/_/g, ' ').slice(1)}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">{delivery.eta}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1 transition-opacity">
                          {delivery.id && (
                            <>
                              <button 
                                onClick={() => handleSyncStatus(delivery)}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-all" 
                                title="Sync Status"
                              >
                                <RefreshCw size={16} />
                              </button>
                              {delivery.courier?.toLowerCase() === 'steadfast' && (
                                <a 
                                  href={`https://steadfast.com.bd/t/${delivery.trackingCode || delivery.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all flex items-center justify-center" 
                                  title="Live Tracking"
                                >
                                  <Navigation size={16} />
                                </a>
                              )}
                              {delivery.courier?.toLowerCase() === 'pathao' && (
                                <a 
                                  href={`https://pathao.com/courier/tracking/${delivery.trackingCode || delivery.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all flex items-center justify-center" 
                                  title="Live Tracking"
                                >
                                  <Navigation size={16} />
                                </a>
                              )}
                            </>
                          )}
                          <button 
                            onClick={() => handleOpenEditDeliveryModal(delivery)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" 
                            title="Edit Shipment"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDelivery(delivery.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" 
                            title="Delete Shipment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
    )}

      {/* Add/Edit Courier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#141414]">
                {editingCourier ? 'Edit Courier' : 'Connect New Courier'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCourierSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Courier Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                  placeholder="e.g. Pathao, RedX"
                  value={courierForm.name}
                  onChange={(e) => setCourierForm({...courierForm, name: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="active"
                  className="w-4 h-4 rounded border-gray-300 text-[#141414] focus:ring-[#141414]"
                  checked={courierForm.active}
                  onChange={(e) => setCourierForm({...courierForm, active: e.target.checked})}
                />
                <label htmlFor="active" className="text-sm text-gray-600">Active and available for deliveries</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
                >
                  {editingCourier ? 'Save Changes' : 'Connect Courier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Delivery Modal */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#141414]">
                {editingDelivery ? 'Edit Shipment' : 'Add New Shipment'}
              </h3>
              <button 
                onClick={() => setIsDeliveryModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDeliverySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="ORD-..."
                    value={deliveryForm.orderId}
                    onChange={(e) => setDeliveryForm({...deliveryForm, orderId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Courier</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={deliveryForm.courier}
                    onChange={(e) => setDeliveryForm({...deliveryForm, courier: e.target.value})}
                  >
                    <option value="">Select Courier</option>
                    {Object.entries(courierConfigs)
                      .filter(([_, config]: [string, any]) => config.isActive)
                      .map(([name]) => (
                        <option key={name} value={name.charAt(0).toUpperCase() + name.slice(1)}>
                          {name.charAt(0).toUpperCase() + name.slice(1)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={deliveryForm.status}
                    onChange={(e) => setDeliveryForm({...deliveryForm, status: e.target.value})}
                  >
                    <option value="pending_pickup">Pending Pickup</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">ETA</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="e.g. 2-3 Days"
                    value={deliveryForm.eta}
                    onChange={(e) => setDeliveryForm({...deliveryForm, eta: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Location / Hub</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                  placeholder="e.g. Dhaka Hub"
                  value={deliveryForm.location}
                  onChange={(e) => setDeliveryForm({...deliveryForm, location: e.target.value})}
                />
              </div>

              {(deliveryForm.courier === 'Pathao' || deliveryForm.courier === 'Carrybee') && (
                <div className="space-y-4 pt-2 border-t border-gray-50">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${deliveryForm.courier === 'Pathao' ? 'text-orange-500' : 'text-yellow-600'}`}>
                    {deliveryForm.courier} Location Details
                  </p>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">City</label>
                      <select
                        required={deliveryForm.courier === 'Pathao' || deliveryForm.courier === 'Carrybee'}
                        className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                        value={deliveryForm.city_id}
                        onChange={(e) => {
                          setDeliveryForm({...deliveryForm, city_id: e.target.value, zone_id: '', area_id: ''});
                          if (e.target.value) fetchZones(e.target.value);
                        }}
                      >
                        <option value="">Select City</option>
                        {cities.map(city => (
                          <option key={city.city_id || city.id} value={city.city_id || city.id}>{city.city_name || city.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Zone</label>
                        <select
                          required={deliveryForm.courier === 'Pathao' || deliveryForm.courier === 'Carrybee'}
                          disabled={!deliveryForm.city_id || loadingLocations}
                          className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all disabled:opacity-50"
                          value={deliveryForm.zone_id}
                          onChange={(e) => {
                            setDeliveryForm({...deliveryForm, zone_id: e.target.value, area_id: ''});
                            if (e.target.value) fetchAreas(e.target.value);
                          }}
                        >
                          <option value="">Select Zone</option>
                          {zones.map(zone => (
                            <option key={zone.zone_id || zone.id} value={zone.zone_id || zone.id}>{zone.zone_name || zone.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Area</label>
                        <select
                          required={deliveryForm.courier === 'Pathao' || deliveryForm.courier === 'Carrybee'}
                          disabled={!deliveryForm.zone_id || loadingLocations}
                          className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all disabled:opacity-50"
                          value={deliveryForm.area_id}
                          onChange={(e) => setDeliveryForm({...deliveryForm, area_id: e.target.value})}
                        >
                          <option value="">Select Area</option>
                          {areas.map(area => (
                            <option key={area.area_id || area.id} value={area.area_id || area.id}>{area.area_name || area.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
                >
                  {editingDelivery ? 'Save Changes' : 'Add Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
