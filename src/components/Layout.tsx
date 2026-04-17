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
  Plus,
  FileText,
  UserPlus,
  CheckCircle2,
  Activity,
  ClipboardList,
  Quote,
  Calculator,
  BarChart3,
  RotateCcw,
  Mail,
  Check,
  Circle
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
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Orders']);
  const quickActionRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.readBy.includes(user?.uid)).length;

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
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm z-30 no-print">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00AEEF] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#00AEEF]/20">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#141414]">Amar Supply</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#00AEEF] font-bold">Enterprise</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.subItems?.some(sub => location.pathname === sub.path));
            const isExpanded = expandedItems.includes(item.name);
            
            if (item.subItems) {
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive 
                        ? 'bg-[#00AEEF]/5 text-[#00AEEF] font-medium' 
                        : 'text-gray-500 hover:text-[#00AEEF] hover:bg-[#00AEEF]/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={isActive ? 'text-[#00AEEF]' : 'text-gray-400 group-hover:text-[#00AEEF]'} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-9 space-y-1 border-l-2 border-gray-50 pl-2">
                      {item.subItems.filter(sub => hasPermission(sub.permission)).map(sub => {
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            className={`block px-4 py-2 rounded-lg text-xs transition-all ${
                              isSubActive 
                                ? 'bg-[#00AEEF] text-white font-bold shadow-md shadow-[#00AEEF]/10' 
                                : 'text-gray-500 hover:text-[#00AEEF] hover:bg-[#00AEEF]/5'
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
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#00AEEF] text-white shadow-lg shadow-[#00AEEF]/20 font-medium' 
                    : 'text-gray-500 hover:text-[#00AEEF] hover:bg-[#00AEEF]/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#00AEEF]'} />
                  <span className="text-sm">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-50">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
          >
            <LogOut size={18} className="text-gray-400 group-hover:text-red-600" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 sm:h-20 bg-white border-b border-gray-100 flex items-center justify-between gap-4 px-4 sm:px-8 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg shrink-0"
            >
              <Menu size={20} className="sm:w-6 sm:h-6" />
            </button>
            
            <div className="relative max-w-md w-full hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search anything..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* POS Button */}
            {hasPermission('pos') && (
              <Link 
                to="/pos" 
                className="flex items-center gap-2 px-4 py-2.5 bg-[#00AEEF] hover:bg-[#0095cc] rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-[#00AEEF]/20 shrink-0"
              >
                <Calculator size={18} />
                <span className="hidden sm:inline">POS</span>
              </Link>
            )}

            {/* Quick Actions */}
            <div className="relative shrink-0" ref={quickActionRef}>
              <button 
                onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-bold text-gray-700 transition-all"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Quick Action</span>
                <ChevronDown size={14} className={`transition-transform ${isQuickActionOpen ? 'rotate-180' : ''}`} />
              </button>

              {isQuickActionOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50">
                  {hasPermission('orders') && (
                    <Link 
                      to="/orders/new" 
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors"
                    >
                      <ShoppingCart size={16} className="text-[#00AEEF]" /> New Order
                    </Link>
                  )}
                  {hasPermission('tasks') && (
                    <Link 
                      to="/tasks"
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors"
                    >
                      <ClipboardList size={16} className="text-[#00AEEF]" /> Create Task
                    </Link>
                  )}
                  {hasPermission('inventory') && (
                    <Link 
                      to="/inventory/new"
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors"
                    >
                      <Package size={16} className="text-[#00AEEF]" /> Add Product
                    </Link>
                  )}
                  {hasPermission('crm') && (
                    <Link 
                      to="/crm"
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors"
                    >
                      <UserPlus size={16} className="text-[#00AEEF]" /> Add Customer
                    </Link>
                  )}
                  {hasPermission('suppliers') && (
                    <Link 
                      to="/suppliers"
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors"
                    >
                      <UserPlus size={16} className="text-[#00AEEF]" /> Add Supplier
                    </Link>
                  )}
                  {hasPermission('orders') && (
                    <Link 
                      to="/orders/new"
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors"
                    >
                      <FileText size={16} className="text-[#00AEEF]" /> Create Invoice
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-5 pl-2">
              <button className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors hidden sm:flex">
                <Mail size={20} className="fill-gray-400" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF5A5F] rounded-full border-2 border-white hidden"></span>
              </button>

              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Bell size={20} className="fill-gray-400" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#FF5A5F] rounded-full border-2 border-white"></span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-bold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                         <span className="bg-[#00AEEF]/10 text-[#00AEEF] text-xs font-bold px-2 py-0.5 rounded-full">
                           {unreadCount} new
                         </span>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                          {notifications.map((notification) => {
                            const isRead = notification.readBy.includes(user?.uid);
                            return (
                              <div 
                                key={notification.id} 
                                className={`p-4 transition-colors hover:bg-gray-50 cursor-pointer ${!isRead ? 'bg-blue-50/30' : ''}`}
                                onClick={() => {
                                  if (!isRead && user?.uid) {
                                    markNotificationAsRead(notification.id, user.uid);
                                  }
                                  setIsNotificationsOpen(false);
                                }}
                              >
                                <div className="flex gap-3">
                                  <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!isRead ? 'bg-[#00AEEF]' : 'bg-transparent'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${!isRead ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                                      {notification.title}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
                                    <p className="text-xs text-gray-400 mt-2 font-medium">
                                      {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt.seconds * 1000), { addSuffix: true }) : 'Just now'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <Bell size={32} className="mx-auto text-gray-300 mb-3" />
                          <p className="font-medium text-gray-900">All caught up!</p>
                          <p className="text-sm mt-1">No new notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="w-[42px] h-[42px] rounded-full bg-purple-500 overflow-hidden shadow-sm flex-shrink-0 border border-transparent group-hover:border-gray-200 transition-colors">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#00AEEF] text-white font-bold text-lg">
                      {(user?.name?.[0] || user?.displayName?.[0] || 'J')}
                    </div>
                  )}
                </div>
                <ChevronDown size={20} className="text-gray-800" strokeWidth={2.5} />
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
        <div className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex justify-end no-print">
          <div className="w-72 bg-white h-full p-6 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-xl font-bold text-[#00AEEF]">Amar Supply</h1>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <nav className="space-y-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.subItems?.some(sub => location.pathname === sub.path));
                const isExpanded = expandedItems.includes(item.name);

                if (item.subItems) {
                  return (
                    <div key={item.name} className="space-y-1">
                      <button
                        onClick={() => toggleExpand(item.name)}
                        className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all ${
                          isActive ? 'bg-[#00AEEF]/5 text-[#00AEEF]' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Icon size={20} />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isExpanded && (
                        <div className="ml-10 space-y-1">
                          {item.subItems.filter(sub => hasPermission(sub.permission)).map(sub => {
                            const isSubActive = location.pathname === sub.path;
                            return (
                              <Link
                                key={sub.path}
                                to={sub.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl text-sm transition-all ${
                                  isSubActive ? 'bg-[#00AEEF] text-white' : 'text-gray-500 hover:bg-gray-50'
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
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${
                      isActive ? 'bg-[#00AEEF] text-white' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
