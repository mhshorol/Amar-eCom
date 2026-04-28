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
  Printer,
  Zap,
  Box,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hash,
  Activity,
  ArrowRight,
  Loader2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string, color: string, ring: string, icon: any }> = {
      'pending': { label: 'Pending', color: 'bg-amber-500', ring: 'ring-amber-100', icon: Clock },
      'confirmed': { label: 'Confirmed', color: 'bg-[#0066FF]', ring: 'ring-cyan-100', icon: CheckCircle2 },
      'processing': { label: 'Processing', color: 'bg-[#0066FF]', ring: 'ring-blue-100', icon: Zap },
      'shipped': { label: 'Shipped', color: 'bg-indigo-600', ring: 'ring-indigo-100', icon: Truck },
      'delivered': { label: 'Delivered', color: 'bg-emerald-500', ring: 'ring-emerald-100', icon: Package },
      'cancelled': { label: 'Cancelled', color: 'bg-red-500', ring: 'ring-red-100', icon: X },
      'returned': { label: 'Returned', color: 'bg-slate-500', ring: 'ring-slate-100', icon: History },
    };
    return configs[status.toLowerCase()] || { label: status, color: 'bg-gray-400', ring: 'ring-gray-100', icon: AlertCircle };
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  const handlePrintInvoice = () => {
    if (onPrintInvoice) {
      onPrintInvoice(order);
    }
  };

  const calculation = {
    subtotal: order.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0,
    delivery: order.deliveryCharge || 0,
    discount: order.discount || 0,
    total: order.totalAmount || 0,
    paid: order.paidAmount || 0,
    due: order.dueAmount || 0
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-2 sm:p-4 no-print overflow-hidden"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="bg-white w-full max-w-5xl max-h-[96vh] rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative border border-gray-100"
        >
          {/* Compact Header */}
          <div className="h-16 sm:h-20 border-b border-gray-100 flex items-center justify-between px-4 sm:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className={`w-10 h-10 rounded-xl ${statusConfig.color} flex items-center justify-center text-white shadow-sm shadow-black/10`}>
                <StatusIcon size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-lg font-bold text-[#141414] truncate">#{order.orderNumber || order.id.slice(0, 8)}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                  Placed on {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90 border border-gray-100"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x lg:divide-gray-100">
              
              {/* Main Content Area */}
              <div className="lg:col-span-8 p-4 sm:p-8 space-y-8">
                
                {/* Horizontal Status Track - Optimized */}
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 overflow-x-auto no-scrollbar">
                  <div className="flex items-center justify-between min-w-[500px] px-2">
                    {['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map((s, idx, arr) => {
                      const isPastOrCurrent = arr.indexOf(order.status.toLowerCase()) >= idx;
                      const isCurrent = order.status.toLowerCase() === s;
                      return (
                        <React.Fragment key={s}>
                          <div className="flex flex-col items-center gap-2 relative">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                              isCurrent ? `${statusConfig.color} scale-110 shadow-lg text-white ring-4 ${statusConfig.ring}` : 
                              isPastOrCurrent ? 'bg-[#141414] text-white' : 'bg-white text-gray-200 border border-gray-100'
                            }`}>
                              {isPastOrCurrent && !isCurrent ? <CheckCircle2 size={14} strokeWidth={3} /> : (
                                idx === 0 ? <Clock size={14} /> :
                                idx === 1 ? <User size={14} /> :
                                idx === 2 ? <Zap size={14} /> :
                                idx === 3 ? <Truck size={14} /> :
                                <Package size={14} />
                              )}
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${isPastOrCurrent ? 'text-[#141414]' : 'text-gray-300'}`}>
                              {s}
                            </span>
                          </div>
                          {idx < arr.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 rounded-full ${isPastOrCurrent && arr.indexOf(order.status.toLowerCase()) > idx ? 'bg-[#141414]' : 'bg-gray-200'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Manifest Items - Lean Design */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order Items</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-500">
                      {order.items?.length || 0} Products
                    </span>
                  </div>
                  
                  <div className="divide-y divide-gray-50">
                    {order.items?.map((item: any, idx: number) => {
                      const productImage = getProductImage(item.productId);
                      return (
                        <div key={idx} className="flex items-center gap-4 py-4 hover:bg-gray-50/50 px-2 rounded-xl transition-colors">
                          <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                            {productImage ? (
                              <img src={productImage} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300"><Box size={24} /></div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-bold text-[#141414] truncate">{item.name}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              {item.variant && <span className="text-[9px] font-bold bg-[#0066FF]/10 text-[#0066FF] px-1.5 py-0.5 rounded">{item.variant}</span>}
                              <span className="text-[10px] font-medium text-gray-400 tracking-tight">Quantity: {item.quantity}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold text-[#141414]">
                              {currencySymbol}{(item.quantity * item.price).toLocaleString()}
                            </p>
                            <p className="text-[9px] font-medium text-gray-400">@{currencySymbol}{item.price}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Logistics Bar - Compact */}
                <div className="bg-[#141414] p-6 rounded-2xl flex items-center justify-between gap-4 text-white">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <Truck size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Logistic Method</p>
                        <h4 className="text-sm font-bold">{order.courierName || 'Standard Shipping'}</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Shipping Fee</p>
                      <span className="text-lg font-bold">{currencySymbol}{calculation.delivery.toLocaleString()}</span>
                    </div>
                </div>
              </div>

              {/* Sidebar Area - Condensed Info */}
              <div className="lg:col-span-4 bg-gray-50/30 p-4 sm:p-8 space-y-10">
                
                {/* Customer Identity */}
                <div className="space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0066FF] flex items-center gap-2">
                     <User size={12} strokeWidth={3} /> Customer Details
                   </h4>
                   <div className="space-y-4">
                      <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Full Name</p>
                          <p className="text-sm font-bold text-[#141414]">{order.customerName}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
                          <Phone size={16} />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Phone Number</p>
                          <p className="text-sm font-bold text-[#141414]">{order.customerPhone}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
                          <MapPin size={16} />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Delivery Address</p>
                          <p className="text-[11px] font-medium text-gray-600 leading-normal">{order.customerAddress}</p>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Financial Summary - Lean */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                   <div className="flex justify-between items-center text-[11px] font-bold text-gray-400">
                     <span>Subtotal</span>
                     <span className="text-[#141414]">{currencySymbol}{calculation.subtotal.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center text-[11px] font-bold text-gray-400">
                     <span>Shipping</span>
                     <span className="text-[#141414]">{currencySymbol}{calculation.delivery.toLocaleString()}</span>
                   </div>
                   {calculation.discount > 0 && (
                     <div className="flex justify-between items-center text-[11px] font-bold text-emerald-600">
                       <span>Discount</span>
                       <span>-{currencySymbol}{calculation.discount.toLocaleString()}</span>
                     </div>
                   )}
                   <div className="h-px bg-gray-50" />
                   <div className="flex justify-between items-center pt-1">
                     <span className="text-xs font-black text-[#141414] uppercase">Order Total</span>
                     <span className="text-lg font-black text-[#0066FF]">{currencySymbol}{calculation.total.toLocaleString()}</span>
                   </div>
                   
                   <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                     <div>
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Due Amount</p>
                       <p className={`text-xl font-black ${calculation.due > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                         {currencySymbol}{calculation.due.toLocaleString()}
                       </p>
                     </div>
                     <div className="text-right">
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Paid</p>
                       <p className="text-xs font-bold text-gray-700">{currencySymbol}{calculation.paid.toLocaleString()}</p>
                     </div>
                   </div>
                </div>

                {/* Compact History Record */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between px-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <History size={12} /> Recent History
                      </h4>
                      <span className="text-[9px] font-bold text-gray-400">{customerHistory.length} Total</span>
                   </div>
                   <div className="space-y-3 max-h-[200px] overflow-y-auto no-scrollbar">
                      {loadingHistory ? (
                        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-gray-200" size={20} /></div>
                      ) : customerHistory.length <= 1 ? (
                        <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">No other records</p>
                        </div>
                      ) : (
                        customerHistory.filter(h => h.id !== order.id).slice(0, 3).map((h, idx) => (
                           <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                              <div>
                                 <p className="text-[10px] font-bold text-[#141414]">#{h.orderNumber || h.id.slice(0, 8)}</p>
                                 <p className="text-[9px] font-medium text-gray-400">
                                   {(() => {
                                     if (!h.createdAt) return 'Date unknown';
                                     const d = h.createdAt?.toDate ? h.createdAt.toDate() : new Date(h.createdAt);
                                     return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleDateString();
                                   })()}
                                 </p>
                              </div>
                              <span className="text-xs font-bold text-[#141414]">{currencySymbol}{h.totalAmount.toLocaleString()}</span>
                           </div>
                        ))
                      )}
                   </div>
                </div>

              </div>
            </div>
          </div>

          {/* Action Footer - Sticky */}
          <div className="px-4 sm:px-8 py-4 sm:py-6 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 sticky bottom-0">
            <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar">
               <button 
                className="flex items-center gap-2.5 text-gray-500 hover:text-gray-900 transition-all whitespace-nowrap group"
                onClick={() => window.print()}
               >
                 <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-gray-100 group-hover:border-gray-200 transition-all">
                   <Printer size={15} />
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-wider">Print Label</span>
               </button>
               {onPrintInvoice && (
                <button 
                  className="flex items-center gap-2.5 text-[#0066FF] hover:text-[#0052CC] transition-all whitespace-nowrap group"
                  onClick={handlePrintInvoice}
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 transition-all">
                    <FileText size={15} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">A5 Invoice</span>
                </button>
               )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
               <button 
                onClick={onClose}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 border border-gray-100 hover:bg-gray-50 transition-all"
               >
                 Close
               </button>
               {onSendToCourier && !['shipped', 'delivered', 'cancelled', 'returned'].includes(order.status) && (
                <button 
                  onClick={() => onSendToCourier(order)}
                  className="flex-1 sm:flex-none px-8 py-3 bg-[#0066FF] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0052CC] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Truck size={15} strokeWidth={3} />
                  Ship Order
                </button>
               )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
