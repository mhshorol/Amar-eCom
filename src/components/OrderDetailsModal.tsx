import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  Truck, 
  History,
  ShoppingBag,
  Image as ImageIcon,
  Printer
} from 'lucide-react';
import { db, collection, query, where, getDocs, orderBy } from '../firebase';
import { openPrintWindow } from '../utils/printHelper';
import { useSettings } from '../contexts/SettingsContext';

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
  products: any[];
  variants: any[];
  currencySymbol: string;
  onPrintInvoice?: (order: any) => void;
  onSendToCourier?: (order: any) => void;
}

export default function OrderDetailsModal({ 
  order, 
  onClose, 
  products, 
  variants, 
  currencySymbol,
  onPrintInvoice,
  onSendToCourier
}: OrderDetailsModalProps) {
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handlePrint = () => {
    const el = document.querySelector('.print-content');
    if (el) {
      openPrintWindow(el.outerHTML, `Order_${order.orderNumber || order.id.slice(0, 8)}`);
    } else {
      window.print();
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!order.customerPhone) return;
      setLoadingHistory(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('customerPhone', '==', order.customerPhone),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setCustomerHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching customer history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [order.customerPhone]);

  const getProductImage = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.image || product?.images?.[0] || null;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-orange-50 text-orange-600 border-orange-100',
      'confirmed': 'bg-blue-50 text-blue-600 border-blue-100',
      'processing': 'bg-indigo-50 text-indigo-600 border-indigo-100',
      'shipped': 'bg-purple-50 text-purple-600 border-purple-100',
      'delivered': 'bg-green-50 text-green-600 border-green-100',
      'cancelled': 'bg-red-50 text-red-600 border-red-100',
      'returned': 'bg-gray-50 text-gray-600 border-gray-100',
    };
    return colors[status] || 'bg-gray-50 text-gray-600 border-gray-100';
  };

  const calculatedSubtotal = order.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
  const displaySubtotal = order.subtotal || calculatedSubtotal;
  const displayDeliveryCharge = order.deliveryCharge || 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 sm:p-6 no-print">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0.5cm;
          }
        }
      `}} />
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 print-content">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-gray-900">Order Details</h3>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              #{order.orderNumber || order.id.slice(0, 8)} • {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm border border-transparent hover:border-gray-200 no-print"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Order Items & Summary */}
            <div className="lg:col-span-2 space-y-8">
              {/* Items List */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Package size={18} className="text-[#00AEEF]" />
                  <h4 className="font-bold text-gray-900">Order Items</h4>
                </div>
                <div className="space-y-3">
                  {order.items?.map((item: any, idx: number) => {
                    const productImage = getProductImage(item.productId);
                    return (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-[#00AEEF]/30 transition-colors group">
                        <div className="w-16 h-16 rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100">
                          {productImage ? (
                            <img 
                              src={productImage} 
                              alt={item.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <ImageIcon size={24} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-bold text-gray-900 truncate">{item.name}</h5>
                          <p className="text-[10px] text-gray-500 mt-0.5">{item.variant || 'Standard'}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-600">Qty: <span className="font-bold">{item.quantity}</span></span>
                            <span className="text-xs text-gray-600">Price: <span className="font-bold">{currencySymbol}{item.price.toLocaleString()}</span></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#00AEEF]">
                            {currencySymbol}{(item.quantity * item.price).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Order Summary Table */}
              <section className="bg-gray-50 rounded-2xl p-6 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">{currencySymbol}{displaySubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Charge</span>
                  <span className="font-medium">+{currencySymbol}{displayDeliveryCharge.toLocaleString()}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount</span>
                    <span className="font-medium">-{currencySymbol}{(order.discount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total Amount</span>
                  <span className="text-xl font-bold text-[#00AEEF]">{currencySymbol}{(order.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 pt-1">
                  <span>Paid Amount</span>
                  <span>{currencySymbol}{(order.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-orange-600">
                  <span>Due Amount</span>
                  <span>{currencySymbol}{(order.dueAmount || 0).toLocaleString()}</span>
                </div>
              </section>
            </div>

            {/* Right Column: Customer & History */}
            <div className="space-y-8">
              {/* Customer Info */}
              <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <User size={18} className="text-[#00AEEF]" />
                  <h4 className="font-bold text-gray-900">Customer Info</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <User size={14} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Name</p>
                      <p className="text-sm font-bold text-gray-900">{order.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Phone size={14} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Phone</p>
                      <p className="text-sm font-bold text-gray-900">{order.customerPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <MapPin size={14} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Address</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{order.customerAddress}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Order History */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-[#00AEEF]" />
                    <h4 className="font-bold text-gray-900">Order History</h4>
                  </div>
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {customerHistory.length} Orders
                  </span>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                  {loadingHistory ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-[#00AEEF] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : customerHistory.length <= 1 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <ShoppingBag size={24} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400">No other orders found</p>
                    </div>
                  ) : (
                    customerHistory.filter(h => h.id !== order.id).map((h, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">#{h.orderNumber || h.id.slice(0, 8)}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${getStatusColor(h.status)}`}>
                            {h.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-end">
                          <p className="text-[10px] text-gray-500">
                            {h.createdAt?.toDate ? h.createdAt.toDate().toLocaleDateString() : new Date(h.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs font-bold text-gray-900">{currencySymbol}{h.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 no-print">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-white transition-all border border-transparent hover:border-gray-200"
          >
            Close
          </button>
          
          {onSendToCourier && !['shipped', 'delivered', 'cancelled', 'returned'].includes(order.status) && (
            <button 
              onClick={() => onSendToCourier(order)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/10"
            >
              <Truck size={16} />
              Send to Courier
            </button>
          )}

          {onPrintInvoice && (
            <button 
              onClick={() => onPrintInvoice(order)}
              className="px-6 py-2.5 bg-[#00AEEF] text-white rounded-xl text-sm font-bold hover:bg-[#0096ce] transition-all flex items-center gap-2 shadow-lg shadow-[#00AEEF]/10"
            >
              <Printer size={16} />
              Print Invoice
            </button>
          )}

          <button 
            className="px-6 py-2.5 bg-[#141414] text-white rounded-xl text-sm font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-black/10"
            onClick={() => handlePrint()}
          >
            <Printer size={16} />
            Print Details
          </button>
        </div>
      </div>
    </div>
  );
}
