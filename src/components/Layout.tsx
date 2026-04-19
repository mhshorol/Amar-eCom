import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  CreditCard, 
  Settings, 
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  UserPlus,
  CheckCircle2,
  Activity,
  ClipboardList,
  Quote,
  PanelLeftClose,
  PanelLeftOpen,
  Calculator,
  BarChart3,
  RotateCcw,
  Mail,
  Check,
  Circle,
  Download,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { db, auth, signOut, collection, query, where, orderBy, onSnapshot, limit } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserPermissions } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { markNotificationAsRead } from '../services/notificationService';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
}

const navItems: { 
  name: string; 
  path: string; 
  icon: any; 
  permission: keyof UserPermissions;
  subItems?: { name: string; path: string; permission: keyof UserPermissions }[]
}[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard' },
  { name: 'Reports', path: '/reports', icon: BarChart3, permission: 'dashboard' },
  { name: 'POS', path: '/pos', icon: Calculator, permission: 'pos' },
  { 
    name: 'Orders', 
    path: '/orders', 
    icon: ShoppingCart, 
    permission: 'orders',
    subItems: [
      { name: 'Order List', path: '/orders', permission: 'orders' },
      { name: 'New Order', path: '/orders/new', permission: 'orders' },
      { name: 'Returns', path: '/returns', permission: 'orders' },
    ]
  },
  { 
    name: 'Inventory', 
    path: '/inventory', 
    icon: Package, 
    permission: 'inventory',
    subItems: [
      { name: 'Product List', path: '/inventory', permission: 'inventory' },
      { name: 'Add Product', path: '/inventory/new', permission: 'inventory' },
    ]
  },
  { name: 'CRM', path: '/crm', icon: Users, permission: 'crm' },
  { name: 'Suppliers', path: '/suppliers', icon: UserPlus, permission: 'suppliers' },
  { name: 'Logistics', path: '/logistics', icon: Truck, permission: 'logistics' },
  { name: 'Tasks', path: '/tasks', icon: ClipboardList, permission: 'tasks' },
  { name: 'Finance', path: '/finance', icon: CreditCard, permission: 'finance' },
  { name: 'HR', path: '/hr', icon: Users, permission: 'hr' },
  { name: 'Team', path: '/team', icon: UserPlus, permission: 'team' },
  { name: 'Settings', path: '/settings', icon: Settings, permission: 'settings' },
];

export default function Layout({ children, user }: LayoutProps) {
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Orders']);
  const quickActionRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const unreadCount = notifications.filter(n => !n.readBy.includes(user?.uid)).length;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch notifications where recipients includes current user
    const q = query(
      collection(db, 'notifications'),
      where('recipients', 'array-contains', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionRef.current && !quickActionRef.current.contains(event.target as Node)) {
        setIsQuickActionOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (location.pathname === '/pos') {
      setIsSidebarMinimized(true);
    } else {
      setIsSidebarMinimized(false);
    }
  }, [location.pathname]);

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => 
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans selection:bg-[#00AEEF]/30">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col ${isSidebarMinimized ? 'w-20' : 'w-64'} bg-white border-r border-[#f1f2f4] shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30 no-print transition-all duration-300 relative group/sidebar`}>
        <div className={`p-6 flex transition-all duration-300 ${isSidebarMinimized ? 'flex-col items-center gap-6' : 'items-center justify-between gap-4'}`}>
          {/* Sidebar Toggle - Top when minimized, right of logo when maximized */}
          <button 
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            className={`p-2 hover:bg-gray-100 text-gray-500 hover:text-[#00AEEF] rounded-xl transition-all active:scale-95 ${isSidebarMinimized ? 'order-1' : 'order-2'}`}
            title={isSidebarMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
          >
            {isSidebarMinimized ? <PanelLeftOpen size={22} strokeWidth={2.5} /> : <PanelLeftClose size={22} strokeWidth={2.5} />}
          </button>

          <div className={`flex items-center gap-4 ${isSidebarMinimized ? 'order-2 flex-col' : 'order-1 animate-in fade-in slide-in-from-left-2 duration-300'}`}>
            <div className={`w-12 h-12 bg-gradient-to-tr from-[#00AEEF] to-[#0186b8] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#00AEEF]/20 rotate-3 hover:rotate-0 transition-transform duration-300 flex-shrink-0`}>
              <ShoppingCart size={24} strokeWidth={2.5} />
            </div>
            {!isSidebarMinimized && (
              <div className="flex-1">
                <h1 className="text-xl font-black tracking-tight text-[#141414] leading-tight flex flex-col">
                  Amar 
                  <span className="text-[#00AEEF]">Supply</span>
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Enterprise</p>
                </div>
              </div>
            )}
          </div>
        </div>


        
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
          {showInstallBtn && !isSidebarMinimized && (
            <button
              onClick={handleInstallClick}
              className="w-full relative overflow-hidden group mb-6 px-4 py-4 bg-gradient-to-br from-green-600 to-green-700 text-white rounded-2xl hover:shadow-lg transition-all border border-green-500/20"
            >
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-12 h-12 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Download size={20} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black leading-tight">Install App</p>
                  <p className="text-[10px] font-bold text-white/70">Mobile Experience</p>
                </div>
              </div>
            </button>
          )}

          <div className={`pb-4 ${!isSidebarMinimized ? 'border-b border-gray-50' : ''} mb-4`}>
            {!isSidebarMinimized && <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 animate-in fade-in duration-300">Main View</p>}
            {filteredNavItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isSidebarMinimized ? item.name : ''}
                  className={`flex items-center ${isSidebarMinimized ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-2xl transition-all duration-300 group mb-1 ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#00AEEF] to-[#0186b8] text-white shadow-xl shadow-[#00AEEF]/20 font-bold scale-[1.02]' 
                      : 'text-gray-500 hover:text-[#00AEEF] hover:bg-[#00AEEF]/5'
                  }`}
                >
                  <div className={`flex items-center ${isSidebarMinimized ? '' : 'gap-3'}`}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#00AEEF]'} />
                    {!isSidebarMinimized && <span className="text-sm truncate">{item.name}</span>}
                  </div>
                </Link>
              );
            })}
          </div>

          <div>
            {!isSidebarMinimized && <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 animate-in fade-in duration-300">Operations</p>}
            {filteredNavItems.slice(3).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.subItems?.some(sub => location.pathname === sub.path));
              const isExpanded = expandedItems.includes(item.name);
              
              if (item.subItems && !isSidebarMinimized) {
                return (
                  <div key={item.name} className="space-y-1 mb-1">
                    <button
                      onClick={() => toggleExpand(item.name)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group ${
                        isActive 
                          ? 'bg-[#00AEEF]/5 text-[#00AEEF] font-bold' 
                          : 'text-gray-500 hover:text-[#00AEEF] hover:bg-[#00AEEF]/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#00AEEF]' : 'text-gray-400 group-hover:text-[#00AEEF]'} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <ChevronDown size={14} className={`transition-all duration-300 ${isExpanded ? 'rotate-180 text-[#00AEEF]' : 'text-gray-400'}`} />
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-6 space-y-1 border-l border-gray-100 pl-3 py-1">
                        {item.subItems.filter(sub => hasPermission(sub.permission)).map(sub => {
                          const isSubActive = location.pathname === sub.path;
                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              className={`block px-4 py-2.5 rounded-xl text-xs transition-all duration-200 ${
                                isSubActive 
                                  ? 'bg-[#00AEEF] text-white font-black shadow-lg shadow-[#00AEEF]/10' 
                                  : 'text-gray-500 hover:text-[#00AEEF] hover:bg-[#00AEEF]/5 font-medium'
                              }`}
                            >
                              {sub.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isSidebarMinimized ? item.name : ''}
                  className={`flex items-center ${isSidebarMinimized ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-2xl transition-all duration-300 group mb-1 ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#00AEEF] to-[#0186b8] text-white shadow-xl shadow-[#00AEEF]/20 font-bold scale-[1.02]' 
                      : 'text-gray-500 hover:text-[#00AEEF] hover:bg-[#00AEEF]/5'
                  }`}
                >
                  <div className={`flex items-center ${isSidebarMinimized ? '' : 'gap-3'}`}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#00AEEF]'} />
                    {!isSidebarMinimized && <span className="text-sm truncate">{item.name}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className={`p-4 border-t border-gray-50 mt-auto`}>
          <div className={`${isSidebarMinimized ? 'flex justify-center' : 'p-3 bg-gray-50 rounded-2xl flex items-center justify-between'} transition-all`}>
            <button 
              onClick={handleLogout}
              className={`flex items-center ${isSidebarMinimized ? 'justify-center' : 'gap-3'} text-gray-500 hover:text-red-600 transition-colors w-full`}
            >
              <div className={`${isSidebarMinimized ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-red-600 transition-all`}>
                <LogOut size={16} />
              </div>
              {!isSidebarMinimized && <span className="text-xs font-black uppercase tracking-wider animate-in fade-in duration-300">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 sm:h-24 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between gap-6 px-6 sm:px-10 sticky top-0 z-20 no-print transition-all duration-300">
          <div className="flex items-center gap-4 sm:gap-8 flex-1 min-w-0">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-3 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-2xl shrink-0 transition-all border border-gray-100 shadow-sm"
            >
              <Menu size={22} />
            </button>
            
            <div className="relative max-w-lg w-full hidden md:block group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-gray-400 group-focus-within:text-[#00AEEF] transition-colors" size={20} />
              </div>
              <input 
                type="text"
                placeholder="Search across all modules..."
                className="w-full pl-12 pr-4 py-3 bg-gray-100/50 border border-transparent rounded-2xl text-[13px] font-medium focus:bg-white focus:border-[#00AEEF]/20 focus:ring-4 focus:ring-[#00AEEF]/5 outline-none transition-all placeholder:text-gray-400"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-white text-[10px] font-black text-gray-400 shadow-sm">⌘</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-white text-[10px] font-black text-gray-400 shadow-sm">K</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* POS Button */}
            {hasPermission('pos') && (
              <Link 
                to="/pos" 
                className="flex items-center gap-2 px-5 py-3 bg-[#00AEEF] hover:bg-[#0095cc] rounded-2xl text-[13px] font-black text-white transition-all shadow-xl shadow-[#00AEEF]/20 shrink-0 group scale-100 hover:scale-105 active:scale-95"
              >
                <Calculator size={18} strokeWidth={2.5} />
                <span className="hidden lg:inline">Quick POS</span>
              </Link>
            )}

            {/* Quick Actions */}
            <div className="relative shrink-0 hidden sm:block" ref={quickActionRef}>
              <button 
                onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[13px] font-black transition-all border ${isQuickActionOpen ? 'bg-[#00AEEF]/5 text-[#00AEEF] border-[#00AEEF]/10' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-transparent'}`}
              >
                <Plus size={18} strokeWidth={2.5} />
                <span className="hidden lg:inline">New Action</span>
                <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-300 ${isQuickActionOpen ? 'rotate-180' : ''}`} />
              </button>

              {isQuickActionOpen && (
                <div className="absolute right-0 mt-4 w-60 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-2 mb-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Create New</p>
                  </div>
                  {hasPermission('orders') && (
                    <Link 
                      to="/orders/new" 
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#00AEEF]/5 rounded-xl text-[13px] font-bold text-gray-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#00AEEF] group-hover:bg-[#00AEEF] group-hover:text-white transition-all">
                        <ShoppingCart size={16} strokeWidth={2.5} />
                      </div>
                      Order
                    </Link>
                  )}
                  {hasPermission('tasks') && (
                    <Link 
                      to="/tasks"
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#00AEEF]/5 rounded-xl text-[13px] font-bold text-gray-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
                        <ClipboardList size={16} strokeWidth={2.5} />
                      </div>
                      Task
                    </Link>
                  )}
                  {hasPermission('inventory') && (
                    <Link 
                      to="/inventory/new"
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#00AEEF]/5 rounded-xl text-[13px] font-bold text-gray-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Package size={16} strokeWidth={2.5} />
                      </div>
                      Product
                    </Link>
                  )}
                  <div className="my-2 border-t border-gray-50" />
                  {hasPermission('crm') && (
                    <Link 
                      to="/crm"
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#00AEEF]/5 rounded-xl text-[13px] font-bold text-gray-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
                        <UserPlus size={16} strokeWidth={2.5} />
                      </div>
                      Customer
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button className="relative p-2.5 text-gray-400 hover:bg-gray-50 hover:text-[#00AEEF] rounded-xl transition-all pointer">
                <Search className="md:hidden" size={22} />
              </button>
              
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`relative p-2.5 rounded-xl transition-all border border-transparent ${isNotificationsOpen ? 'bg-[#00AEEF]/5 text-[#00AEEF] border-[#00AEEF]/10' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <Bell size={22} className={unreadCount > 0 ? 'fill-[#FF5A5F]/10' : ''} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#FF5A5F] rounded-full border-2 border-white ring-4 ring-[#FF5A5F]/20 animate-pulse"></span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-4 w-80 sm:w-[420px] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-lg uppercase tracking-tight">Activity</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Real-time updates</p>
                      </div>
                      <button className="text-xs font-bold text-[#00AEEF] hover:underline px-3 py-1 bg-[#00AEEF]/5 rounded-full transition-all">Mark all read</button>
                    </div>
                    <div className="max-h-[480px] overflow-y-auto no-scrollbar">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                          {notifications.map((notification) => {
                            const isRead = notification.readBy.includes(user?.uid);
                            return (
                              <div 
                                key={notification.id} 
                                className={`px-6 py-5 transition-all hover:bg-gray-50/80 cursor-pointer relative ${!isRead ? 'bg-blue-50/20' : ''}`}
                                onClick={() => {
                                  if (!isRead && user?.uid) {
                                    markNotificationAsRead(notification.id, user.uid);
                                  }
                                  setIsNotificationsOpen(false);
                                }}
                              >
                                <div className="flex gap-4">
                                  <div className="flex-shrink-0">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${!isRead ? 'bg-[#00AEEF] text-white shadow-lg shadow-[#00AEEF]/20' : 'bg-gray-100 text-gray-400'}`}>
                                      <Bell size={18} />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                      <p className={`text-[13px] leading-tight ${!isRead ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                                        {notification.title}
                                      </p>
                                      <span className="text-[10px] font-black text-gray-400 whitespace-nowrap ml-2">
                                        {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt.seconds * 1000)) : 'now'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{notification.message}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-20 text-center text-gray-500">
                          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Bell size={32} className="text-gray-200" />
                          </div>
                          <p className="font-extrabold text-gray-900 uppercase tracking-tight">Stay calm</p>
                          <p className="text-xs mt-1 text-gray-400">No notifications to show right now</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="h-8 w-px bg-gray-100 hidden sm:block mx-1" />

            <div className="flex items-center gap-3 cursor-pointer group p-1.5 hover:bg-gray-50 rounded-2xl transition-all pr-4">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-[#00AEEF] overflow-hidden shadow-xl shadow-[#00AEEF]/10 border-2 border-white group-hover:scale-110 transition-transform duration-300">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00AEEF] to-[#0186b8] text-white font-black text-lg">
                      {(user?.name?.[0] || user?.displayName?.[0] || 'J')}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-black text-gray-900 leading-tight truncate max-w-[120px]">
                  {user?.name || user?.displayName || 'User'}
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-[#00AEEF] uppercase tracking-widest">Admin</span>
                  <ChevronDown size={12} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex justify-end no-print animate-in fade-in duration-300">
          <div className="w-80 bg-white h-full px-6 py-8 shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-[#00AEEF] to-[#0186b8] rounded-xl flex items-center justify-center text-white shadow-lg">
                  <ShoppingCart size={20} strokeWidth={2.5} />
                </div>
                <h1 className="text-xl font-black text-[#141414]">Amar <span className="text-[#00AEEF]">Supply</span></h1>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="p-2.5 bg-gray-50 text-gray-500 hover:text-gray-900 rounded-xl transition-all"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <nav className="space-y-2">
              {showInstallBtn && (
                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center gap-4 px-5 py-5 mb-6 bg-gradient-to-br from-green-600 to-green-700 text-white rounded-2xl shadow-xl shadow-green-600/20"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Download size={20} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm">Install Mobile App</p>
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Get Full Access</p>
                  </div>
                </button>
              )}

              <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Navigation</p>
              
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.subItems?.some(sub => location.pathname === sub.path));
                const isExpanded = expandedItems.includes(item.name);

                if (item.subItems) {
                  return (
                    <div key={item.name} className="space-y-1 mb-2">
                      <button
                        onClick={() => toggleExpand(item.name)}
                        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${
                          isActive ? 'bg-[#00AEEF]/5 text-[#00AEEF] font-bold' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Icon size={20} strokeWidth={2.5} />
                          <span className="font-bold">{item.name}</span>
                        </div>
                        <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#00AEEF]' : ''}`} />
                      </button>
                      {isExpanded && (
                        <div className="ml-8 space-y-1 border-l border-gray-100 pl-4 py-1">
                          {item.subItems.filter(sub => hasPermission(sub.permission)).map(sub => {
                            const isSubActive = location.pathname === sub.path;
                            return (
                              <Link
                                key={sub.path}
                                to={sub.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl text-[13px] transition-all font-bold ${
                                  isSubActive ? 'bg-[#00AEEF] text-white shadow-lg shadow-[#00AEEF]/10' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {sub.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all mb-1 ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#00AEEF] to-[#0186b8] text-white shadow-xl shadow-[#00AEEF]/20 font-bold' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="font-bold">{item.name}</span>
                  </Link>
                );
              })}
              
              <div className="pt-6 mt-6 border-t border-gray-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-5 py-4 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all font-black text-[13px] uppercase tracking-wider"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
