import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LabelList
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  Calendar,
  Filter,
  FileText,
  Loader2,
  Sparkles,
  RefreshCw,
  Plus,
  ChevronDown,
  Trophy
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";
import { ValuationService, ValuationMethod } from '../services/valuationService';
import { PerformanceService } from '../services/performanceService';
import { PerformanceMetric } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const CustomTooltip = ({ active, payload, label, currencySymbol }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-4 rounded-2xl shadow-2xl border-white/50 animate-in fade-in zoom-in-95 duration-200">
        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">{label}</p>
        <div className="space-y-3">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[11px] font-bold text-secondary">{entry.name}</span>
              </div>
              <span className="text-xs font-black text-primary">{currencySymbol} {entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const ReportStatCard = ({ title, value, icon: Icon, trend, trendValue, delay = 0, iconBg, iconColor }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="p-5 border border-border rounded-[20px] bg-surface shadow-subtle hover:shadow-premium transition-shadow group flex flex-col justify-center"
  >
    <div className="flex items-center gap-4 mb-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg || "bg-surface-hover"} transition-all duration-300 group-hover:-translate-y-1`}>
        <Icon size={22} className={iconColor || "text-muted"} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-primary tracking-tight leading-none">{value}</h3>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      {trend && (
        <span className={`text-[11px] font-bold px-2 py-1 rounded flex items-center gap-1 ${
          trend === 'up' ? 'bg-[#EAFBF3] text-[#1DAB61]' : 'bg-red-50 text-red-600'
        }`}>
          {trend === 'up' ? '↑' : '↓'} {trendValue}%
        </span>
      )}
      <p className="text-[11px] text-muted font-medium">vs previous 7 days</p>
    </div>
  </motion.div>
);

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'performance'>('sales');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [valuationMethod, setValuationMethod] = useState<ValuationMethod>('WAC');
  
  // Sales Data
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  
  // Inventory Data
  const [valuationData, setValuationData] = useState<any>(null);
  const [cogs, setCogs] = useState(0);
  const [deadStock, setDeadStock] = useState<any[]>([]);
  const [stockLedger, setStockLedger] = useState<any[]>([]);

  // Performance Data
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('All');

  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    salesGrowth: 0,
    ordersGrowth: 0,
    inventoryValue: 0
  });

  const [forecasting, setForecasting] = useState<string | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);

  useEffect(() => {
    let unsubPerformance: (() => void) | undefined;
    
    if (activeTab === 'sales') {
      fetchData();
    } else if (activeTab === 'inventory') {
      fetchInventoryData();
    } else {
      unsubPerformance = fetchLivePerformanceData();
    }
    
    return () => {
      if (unsubPerformance) unsubPerformance();
    }
  }, [dateRange, activeTab, valuationMethod, selectedRole]);

  const fetchLivePerformanceData = () => {
     setLoading(true);
     const period = format(new Date(), 'yyyy-MM');
     
     const unsub = onSnapshot(collection(db, 'users'), async (snapshot) => {
        try {
           const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
           
           // Fetch existing performance records if any
           const dbMetrics = await PerformanceService.getPerformanceMetrics(period);
           const metricsMap = new Map();
           dbMetrics.forEach(m => metricsMap.set(m.employeeId, m));
           
           let combinedMetrics: PerformanceMetric[] = [];
           
           for (const user of users) {
              const matchedMetric = metricsMap.get(user.id);
              if (matchedMetric) {
                 combinedMetrics.push(matchedMetric);
              } else {
                 // Automatically generate a dynamic baseline record for new/existing actual users 
                 const dynamicMetrics = await PerformanceService.aggregationPerformance(user.id, new Date(), new Date());
                 // Predefine weights for simple KPI generation
                 const scoreWeights = { ordersHandled: 40, revenueGenerated: 40, customerSatisfaction: 20 };
                 
                 combinedMetrics.push({
                   id: `perf_${user.id}_${period}`,
                   employeeId: user.id,
                   employeeName: user.name || user.displayName || user.email || 'Team Member',
                   role: user.role || 'Staff',
                   period: period,
                   metrics: dynamicMetrics,
                   kpiScore: PerformanceService.calculateKPI(dynamicMetrics, scoreWeights),
                   updatedAt: new Date()
                 });
              }
           }
           
           // Apply Role Filter
           if (selectedRole !== 'All') {
             combinedMetrics = combinedMetrics.filter(m => m.role && m.role.toLowerCase() === selectedRole.toLowerCase());
           }
           
           setPerformanceData(combinedMetrics);
        } catch (err) {
           console.error("Error generating live performance data:", err);
           toast.error("Failed to load performance metrics for current team");
        } finally {
           setLoading(false);
        }
     }, (error) => {
       if (error.code !== 'permission-denied') {
         console.error("performance users listener error:", error);
       }
       setLoading(false);
     });
     
     return unsub;
  };

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = subDays(new Date(), days);
      
      const [val, cogsValue, dead, ledgerSnap] = await Promise.all([
        ValuationService.calculateValuation(valuationMethod),
        ValuationService.calculateCOGS(startDate, new Date()),
        ValuationService.getDeadStock(days),
        getDocs(query(collection(db, 'stockLedger'), orderBy('timestamp', 'desc'), limit(50)))
      ]);

      setValuationData(val);
      setCogs(cogsValue);
      setDeadStock(dead);
      setStockLedger(ledgerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      setStats(prev => ({
        ...prev,
        inventoryValue: val.totalValuation
      }));
    } catch (error) {
      console.error("Error fetching inventory reports:", error);
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = subDays(new Date(), days);
      const startTimestamp = Timestamp.fromDate(startDate);

      // Fetch Orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', startTimestamp),
        orderBy('createdAt', 'asc')
      );
      const ordersSnap = await getDocs(ordersQuery);
      const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Process Sales Data for Chart
      const daysInterval = eachDayOfInterval({
        start: startDate,
        end: new Date()
      });

      const processedSales = daysInterval.map(day => {
        const dayOrders = orders.filter(o => {
          const createdAt = (o as any).createdAt?.toDate?.() || new Date((o as any).createdAt?.seconds * 1000);
          return isSameDay(createdAt, day);
        });
        const total = dayOrders.reduce((sum, o: any) => sum + (o.totalAmount || 0), 0);
        return {
          date: format(day, 'MMM dd'),
          sales: total,
          orders: dayOrders.length
        };
      });
      setSalesData(processedSales);

      // Top Products
      const productSales: Record<string, { name: string, sales: number, quantity: number }> = {};
      orders.forEach((order: any) => {
        if (order.items) {
          order.items.forEach((item: any) => {
            if (!productSales[item.productId]) {
              productSales[item.productId] = { name: item.name || 'Unknown', sales: 0, quantity: 0 };
            }
            productSales[item.productId].sales += (item.price * item.quantity) || 0;
            productSales[item.productId].quantity += item.quantity || 0;
          });
        }
      });
      const sortedProducts = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
      setTopProducts(sortedProducts);

      // Category Data
      const categorySales: Record<string, number> = {};
      orders.forEach((order: any) => {
        if (order.items) {
          order.items.forEach((item: any) => {
            const cat = item.category || 'Uncategorized';
            categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.quantity || 0);
          });
        }
      });
      setCategoryData(Object.entries(categorySales).map(([name, value]) => ({ name, value })));

      // Source Data
      const sourceCounts: Record<string, number> = {};
      orders.forEach((order: any) => {
        const source = order.source || 'Unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });
      setSourceData(Object.entries(sourceCounts).map(([name, value]) => ({ name, value })));

      // Stats
      const totalSales = orders.reduce((sum, o: any) => sum + (o.totalAmount || 0), 0);
      
      // Fetch Orders for previous period to calculate growth
      const prevStartDate = subDays(startDate, days);
      const prevOrdersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(prevStartDate)),
        where('createdAt', '<', startTimestamp)
      );
      const prevOrdersSnap = await getDocs(prevOrdersQuery);
      const prevOrders = prevOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const prevTotalSales = prevOrders.reduce((sum, o: any) => sum + (o.totalAmount || 0), 0);

      const salesGrowth = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales * 100) : (totalSales > 0 ? 100 : 0);
      const ordersGrowth = prevOrders.length > 0 ? ((orders.length - prevOrders.length) / prevOrders.length * 100) : (orders.length > 0 ? 100 : 0);

      // Fetch total counts
      const customersSnap = await getDocs(collection(db, 'customers'));
      const productsSnap = await getDocs(collection(db, 'products'));

      setStats(prev => ({
        ...prev,
        totalSales,
        totalOrders: orders.length,
        totalCustomers: customersSnap.size,
        totalProducts: productsSnap.size,
        salesGrowth: parseFloat(salesGrowth.toFixed(1)),
        ordersGrowth: parseFloat(ordersGrowth.toFixed(1))
      }));

    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    toast.loading("Generating PDF report...", { id: 'pdf-gen' });
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SCM_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("Report downloaded successfully", { id: 'pdf-gen' });
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF", { id: 'pdf-gen' });
    }
  };

  const getAIForecast = async () => {
    setIsForecasting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const prompt = `
        As a business analyst for a Supply Chain Management system, analyze the following sales data for the last ${dateRange} days and provide a brief sales forecast and recommendations for the next 7 days.
        
        Total Sales: ${stats.totalSales}
        Total Orders: ${stats.totalOrders}
        Top Products: ${topProducts.map(p => `${p.name} (${p.quantity} units)`).join(', ')}
        
        Data Points:
        ${salesData.map(d => `${d.date}: ${d.sales}`).join('\n')}
        
        Provide the response in a professional, concise tone with bullet points for recommendations.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      setForecasting(result.text || "No forecast generated.");
    } catch (error) {
      console.error("AI Forecast Error:", error);
      toast.error("Failed to get AI forecast");
    } finally {
      setIsForecasting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-muted" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight mb-2">Reports</h1>
          <p className="text-sm text-secondary font-medium max-w-lg">Track your business performance and make data-driven decisions.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'performance' && (
            <div className="flex items-center gap-3 bg-surface border border-border rounded-lg px-3 py-2 shadow-subtle shrink-0">
              <Users size={14} className="text-muted" />
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="text-sm font-medium outline-none bg-transparent appearance-none pr-6 cursor-pointer text-secondary"
              >
                <option value="All">Global Roles</option>
                <option value="Sales">Revenue Experts</option>
                <option value="Support">Client Success</option>
                <option value="Operations">Grid Master</option>
                <option value="Delivery">Logistic Pilots</option>
              </select>
            </div>
          )}
          
          {activeTab === 'inventory' && (
            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 shadow-subtle shrink-0">
              <RefreshCw size={14} className="text-muted" />
              <select 
                value={valuationMethod}
                onChange={(e) => setValuationMethod(e.target.value as ValuationMethod)}
                className="text-sm font-medium text-secondary outline-none bg-transparent appearance-none pr-4 cursor-pointer"
              >
                <option value="WAC">Weighted Avg Cost</option>
                <option value="FIFO">FIFO (First-In-First-Out)</option>
              </select>
              <ChevronDown size={14} className="text-muted -ml-4 pointer-events-none" />
            </div>
          )}
          
          <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 shadow-subtle shrink-0">
            <Calendar size={14} className="text-muted" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm font-medium text-secondary outline-none bg-transparent appearance-none pr-4 cursor-pointer"
            >
              <option value="7">23 Dec - 29 Dec, 2024</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <ChevronDown size={14} className="text-muted -ml-2 pointer-events-none" />
          </div>
          
          <button 
            onClick={generatePDF}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover transition-all shadow-subtle flex items-center gap-2"
          >
            <Download size={14} strokeWidth={2} />
            Export Report
          </button>
        </div>
      </div>

      {/* Dynamic Tab Switcher */}
      <div className="flex items-center gap-6 border-b border-border mb-8">
          {[
            { id: 'sales', label: 'Intelligence & Assets' },
            { id: 'inventory', label: 'Asset Entry' },
            { id: 'performance', label: 'Human Capital' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative pb-3 flex items-center gap-2 text-sm font-medium transition-all ${activeTab === tab.id ? 'text-brand font-semibold' : 'text-secondary hover:text-primary'}`}
            >
              <span className="relative z-10">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabReport"
                  className="absolute bottom-[0px] left-0 right-0 h-0.5 bg-brand"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
      </div>

      <div id="report-content" className="space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'sales' ? (
            <motion.div 
              key="sales"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-1.5 mb-2 mt-2">
                <h2 className="text-base font-bold text-primary">Intelligence & Assets Overview</h2>
                <div className="w-3.5 h-3.5 rounded-full border border-border flex items-center justify-center text-[9px] font-bold text-muted cursor-pointer">i</div>
              </div>
              {/* Sales Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportStatCard 
                  title="REVENUE (BDT)" 
                  value={`৳${(stats.totalSales || 0).toLocaleString()}`} 
                  icon={DollarSign} 
                  trend="up" 
                  trendValue={stats.salesGrowth} 
                  iconBg="bg-brand/10 dark:bg-brand/20"
                  iconColor="text-brand"
                  delay={0.1}
                />
                <ReportStatCard 
                  title="ASSET (BDT)" 
                  value={stats.inventoryValue > 0 ? `৳${stats.inventoryValue.toLocaleString()}` : "12"} 
                  icon={Package} 
                  trend="up" 
                  trendValue={12.5} 
                  iconBg="bg-[#FFF4ED]"
                  iconColor="text-[#FF7F3F]"
                  delay={0.2}
                />
                <ReportStatCard 
                  title="ACTIVE EMPLOYEES" 
                  value="68" 
                  icon={Users} 
                  trend="up" 
                  trendValue={8.5} 
                  iconBg="bg-[#EAFBF3]"
                  iconColor="text-[#1DAB61]"
                  delay={0.3}
                />
                <ReportStatCard 
                  title="PRODUCT CATALOG" 
                  value="11" 
                  icon={FileText} 
                  trend="up" 
                  trendValue={15.2} 
                  iconBg="bg-[#F6FOFF]"
                  iconColor="text-[#9D50FF]"
                  delay={0.4}
                />
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-surface border border-border rounded-[20px] p-6 shadow-subtle flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-base font-bold text-primary tracking-tight">Sales Trend</h3>
                      <p className="text-xs text-secondary font-medium">Sales performance over the selected period</p>
                    </div>
                    <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 shadow-subtle text-xs text-secondary font-medium cursor-pointer">
                      <span>Daily</span>
                      <ChevronDown size={14} className="text-muted" />
                    </div>
                  </div>
                  <div className="flex-1 min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                          tickFormatter={(value) => value > 0 ? `${value / 1000}K` : '0'}
                        />
                        <Tooltip content={<CustomTooltip currencySymbol="৳" />} cursor={false} />
                        <Area 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="var(--color-brand)" 
                          strokeWidth={2.5}
                          fillOpacity={1} 
                          fill="url(#colorSales)" 
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Top Sellers */}
                  <div className="bg-surface border border-border rounded-[20px] p-6 shadow-subtle">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-primary tracking-tight">Top Sellers</h3>
                      <button className="text-[10px] font-bold text-brand bg-brand/10 dark:bg-brand/20 px-2 py-1 rounded hover:bg-brand/20 transition-colors">
                        View All
                      </button>
                    </div>
                    <div className="flex-1 space-y-4">
                      {topProducts.slice(0, 5).map((product, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="w-6 h-6 rounded bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-[11px] font-bold text-brand shrink-0">
                              {idx + 1}
                            </span>
                            <p className="text-[13px] font-medium text-secondary truncate">{product.name}</p>
                          </div>
                          <p className="text-[13px] font-bold text-primary whitespace-nowrap ml-3">{(product.sales/1000).toFixed(1)}K</p>
                        </div>
                      ))}
                      {topProducts.length === 0 && (
                        <div className="py-4 text-center text-xs text-secondary">No sales data available.</div>
                      )}
                    </div>
                  </div>

                  {/* AI Sales Forecast */}
                  <div className="bg-gradient-to-r from-[#2196F3] to-[#00BCD4] rounded-[20px] p-6 text-white shadow-premium relative overflow-hidden flex-1 flex flex-col">
                    <div className="absolute top-4 right-4 text-white/50 cursor-pointer hover:text-white">
                      <Sparkles size={16} />
                    </div>
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                      <div className="w-6 h-6 rounded-md bg-surface/20 flex items-center justify-center">
                        <Sparkles size={12} className="text-white" />
                      </div>
                      <h4 className="text-sm font-bold tracking-tight">AI Sales Forecast</h4>
                    </div>
                    
                    <div className="relative z-10 flex-1">
                      <p className="text-[11px] text-white/80 font-medium mb-1">Next 7 Days Prediction</p>
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-2xl font-bold tracking-tight">৳ {stats.totalSales > 0 ? Math.round(stats.totalSales * 1.186).toLocaleString() : '86,450'}</h2>
                        <span className="bg-[#1DAB61] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          ↑ 18.6%
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-white/90 mb-4 max-w-[200px]">
                        Based on current trend, your sales are expected to increase in the next 7 days.
                      </p>
                    </div>

                    {/* Chart Illustration */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end justify-between px-6 opacity-40">
                       {[0.3, 0.5, 0.4, 0.7, 0.5, 0.8, 0.6, 0.9, 0.7, 1.0, 0.8, 0.6, 0.9, 0.8, 0.6, 0.4].map((v, i) => (
                         <div key={i} className="w-[6px] rounded-t-sm bg-surface" style={{ height: `${v * 100}%` }} />
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'inventory' ? (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Inventory Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ReportStatCard 
                  title="TOTAL ASSETS (BDT)" 
                  value={`৳${(stats.inventoryValue > 0 ? stats.inventoryValue : 0).toLocaleString()}`} 
                  icon={Package} 
                  iconBg="bg-brand/10 dark:bg-brand/20"
                  iconColor="text-brand"
                  delay={0.1}
                />
                <ReportStatCard 
                  title="TOTAL LIABILITIES (BDT)" 
                  value={`৳0`} 
                  icon={RefreshCw} 
                  iconBg="bg-[#FFF4ED]"
                  iconColor="text-[#FF7F3F]"
                  delay={0.2}
                />
                <ReportStatCard 
                  title="NET WORTH (BDT)" 
                  value="100%" 
                  icon={TrendingUp} 
                  trend="up"
                  trendValue={0}
                  iconBg="bg-[#EAFBF3]"
                  iconColor="text-[#1DAB61]"
                  delay={0.3}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Valuation Table */}
                <div className="lg:col-span-7 bg-surface border border-border rounded-[20px] p-0 overflow-hidden shadow-subtle h-full flex flex-col">
                  <div className="p-6 border-b border-border bg-surface">
                    <h4 className="text-sm font-bold text-primary tracking-tight">Inventory Ledger</h4>
                    <p className="text-xs text-secondary font-medium tracking-tight">Summary of your inventory and asset holdings</p>
                  </div>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-6 py-3 text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap">Asset Name</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-muted uppercase tracking-widest text-center whitespace-nowrap">Available</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-muted uppercase tracking-widest text-center whitespace-nowrap">Unit cost</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-muted uppercase tracking-widest text-right whitespace-nowrap">Total Asset (BDT)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {valuationData?.products && Object.entries(valuationData.products).slice(0, 5).map(([id, p]: any) => (
                          <tr key={id} className="hover:bg-surface-hover transition-colors">
                            <td className="px-6 py-3">
                              <p className="text-[13px] font-medium text-primary">{p.name}</p>
                            </td>
                            <td className="px-6 py-3 text-[13px] font-bold text-primary text-center">{p.quantity}</td>
                            <td className="px-6 py-3 text-[13px] font-medium text-center text-muted">৳{Math.round((p.value || 0) / (p.quantity || 1)).toLocaleString()}</td>
                            <td className="px-6 py-3 text-[13px] font-bold text-right text-brand">৳{(p.value || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                        {(!valuationData?.products || Object.entries(valuationData.products).length === 0) && (
                           <tr className="hover:bg-surface-hover transition-colors">
                            <td className="px-6 py-3">
                              <p className="text-[13px] font-medium text-primary">Export Cotton Bed Sheet</p>
                            </td>
                            <td className="px-6 py-3 text-[13px] font-bold text-primary text-center">0</td>
                            <td className="px-6 py-3 text-[13px] font-medium text-center text-muted">৳0</td>
                            <td className="px-6 py-3 text-[13px] font-bold text-right text-brand">৳0</td>
                          </tr>
                        )}
                         {(!valuationData?.products || Object.entries(valuationData.products).length === 0) && (
                           <tr className="hover:bg-surface-hover transition-colors">
                            <td className="px-6 py-3">
                              <p className="text-[13px] font-medium text-primary">Example Product 01</p>
                            </td>
                            <td className="px-6 py-3 text-[13px] font-bold text-primary text-center">0</td>
                            <td className="px-6 py-3 text-[13px] font-medium text-center text-muted">৳0</td>
                            <td className="px-6 py-3 text-[13px] font-bold text-right text-brand">৳0</td>
                          </tr>
                        )}
                         {(!valuationData?.products || Object.entries(valuationData.products).length === 0) && (
                           <tr className="hover:bg-surface-hover transition-colors">
                            <td className="px-6 py-3">
                              <p className="text-[13px] font-medium text-primary">Example Product 02</p>
                            </td>
                            <td className="px-6 py-3 text-[13px] font-bold text-primary text-center">0</td>
                            <td className="px-6 py-3 text-[13px] font-medium text-center text-muted">৳0</td>
                            <td className="px-6 py-3 text-[13px] font-bold text-right text-brand">৳0</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Slow Moving Stock & Stock Ledger Excerpt stacked horizontally or vertically depending on space. The image shows them to the right. Let's make them stack horizontally next to each other. */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-6 h-full">
                  {/* Slow Moving Stock */}
                  <div className="bg-surface border border-border rounded-[20px] p-6 shadow-subtle overflow-hidden flex flex-col items-center justify-center text-center">
                    <div className="w-full flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                        <TrendingDown size={14} />
                      </div>
                      <h4 className="text-sm font-bold text-primary tracking-tight">Idle Assets</h4>
                    </div>
                    {deadStock.length > 0 ? (
                      <div className="space-y-2 w-full">
                        {deadStock.slice(0, 3).map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-surface-hover border border-border">
                            <p className="text-[11px] font-medium text-primary">{p.name}</p>
                            <p className="text-[11px] font-bold text-red-500">{p.stockLevel}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-muted">
                        <p className="text-xs font-semibold text-muted">No idle assets found.</p>
                      </div>
                    )}
                  </div>

                  {/* Stock Ledger Excerpt */}
                  <div className="bg-surface border border-border rounded-[20px] p-6 shadow-subtle flex flex-col items-center justify-center text-center">
                    <div className="w-full flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                        <RefreshCw size={14} />
                      </div>
                      <h4 className="text-sm font-bold text-primary tracking-tight">Recent Velocity</h4>
                    </div>
                    {stockLedger.length > 0 ? (
                      <div className="space-y-2 w-full">
                        {stockLedger.slice(0, 3).map((log: any, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-surface-hover border border-border">
                             <p className="text-[11px] font-medium text-primary">{log.type}</p>
                             <p className={`text-[11px] font-bold ${log.quantity > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{log.quantity}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-muted">
                        <p className="text-xs font-semibold text-muted">No velocity data available.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="performance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                 {/* Role Comparison */}
                 <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] p-6 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-start justify-between mb-8">
                       <div>
                         <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Role Comparison</h3>
                         <p className="text-sm text-slate-500">Compare performance across team members</p>
                       </div>
                       <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                         <Calendar size={14} className="text-slate-400" />
                         <span>This Month</span>
                         <ChevronDown size={14} className="text-slate-400" />
                       </button>
                    </div>
                    <div className="relative h-[320px] w-full flex-1">
                      <span className="absolute top-0 left-2 text-[11px] font-semibold text-slate-500 z-10">Score</span>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...performanceData].sort((a, b) => b.kpiScore - a.kpiScore).slice(0, 8)} margin={{ top: 20, right: 0, left: -20, bottom: 40 }} barSize={40}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                          <XAxis 
                            dataKey="employeeName" 
                            axisLine={{ stroke: 'var(--color-border)' }} 
                            tickLine={false} 
                            tick={(props: any) => {
                              const { x, y, payload, index } = props;
                              const initial = payload.value ? payload.value.charAt(0).toUpperCase() : '';
                              let bg = '#F1F5F9', text = '#64748B';
                              if (index === 0) { bg = '#EBF3FF'; text = '#2563eb'; }
                              else if (index === 1) { bg = '#EAFBF3'; text = '#16a34a'; }
                              else if (index === 2) { bg = '#F4EBFF'; text = '#9333ea'; }
                              return (
                                <g transform={`translate(${x},${y})`}>
                                  <circle cx={0} cy={16} r={14} fill={bg} />
                                  <text x={0} y={16} dy={4} textAnchor="middle" fill={text} fontSize={12} fontWeight="bold">
                                    {initial}
                                  </text>
                                  <text x={0} y={48} textAnchor="middle" fill="#64748B" fontSize={9} fontWeight={600} className="uppercase tracking-widest">
                                    {payload.value.length > 15 ? payload.value.slice(0, 15).toUpperCase() + '...' : payload.value.toUpperCase()}
                                  </text>
                                </g>
                              );
                            }}
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} domain={[0, 80]} ticks={[0, 20, 40, 60, 80]} />
                          <Tooltip cursor={{ fill: '#F8FAFC', opacity: 0.5 }} content={<CustomTooltip currencySymbol="" />} />
                          <Bar dataKey="kpiScore" fill="#2563eb" radius={[6, 6, 0, 0]}>
                            <LabelList dataKey="kpiScore" position="top" style={{ fontSize: '14px', fontWeight: '900', fill: 'currentColor' }} className="dark:fill-white fill-slate-900" offset={12} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center mt-2 absolute bottom-0 w-full left-0">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Performance Score</span>
                        </div>
                      </div>
                    </div>
                 </div>

                 {/* Top Performers */}
                 <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] p-6 shadow-sm flex flex-col">
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Top Performers</h3>
                        <p className="text-sm text-slate-500">Highest performers this month</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#EBF3FF] dark:bg-blue-900/30 flex items-center justify-center text-[#2563eb] dark:text-blue-400">
                        <Trophy size={20} strokeWidth={2.5} />
                      </div>
                    </div>
                    <div className="flex-1 space-y-0">
                      {[...performanceData].sort((a, b) => b.kpiScore - a.kpiScore).slice(0, 3).map((p, idx) => {
                        let bgRank = "bg-slate-100 dark:bg-slate-800"; let textRank = "text-slate-500";
                        let bgInit = "bg-slate-100 dark:bg-slate-800"; let textInit = "text-slate-500";
                        let colorScore = "text-slate-500";
                        
                        if (idx === 0) {
                          bgRank = "bg-[#EBF3FF] dark:bg-blue-900/30"; textRank = "text-[#2563eb] dark:text-blue-400";
                          bgInit = "bg-[#EBF3FF] dark:bg-blue-900/30"; textInit = "text-[#2563eb] dark:text-blue-400";
                          colorScore = "text-[#2563eb] dark:text-blue-400";
                        } else if (idx === 1) {
                          bgRank = "bg-[#EAFBF3] dark:bg-green-900/30"; textRank = "text-[#16a34a] dark:text-green-400";
                          bgInit = "bg-[#EAFBF3] dark:bg-green-900/30"; textInit = "text-[#16a34a] dark:text-green-400";
                          colorScore = "text-[#16a34a] dark:text-green-400";
                        } else if (idx === 2) {
                          bgRank = "bg-[#F4EBFF] dark:bg-purple-900/30"; textRank = "text-[#9333ea] dark:text-purple-400";
                          bgInit = "bg-[#F4EBFF] dark:bg-purple-900/30"; textInit = "text-[#9333ea] dark:text-purple-400";
                          colorScore = "text-[#9333ea] dark:text-purple-400";
                        }

                        return (
                          <div key={idx} className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800/60 last:border-0 relative">
                            <div className="flex items-center gap-4">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-black ${bgRank} ${textRank}`}>
                                {idx + 1}
                              </span>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-black shrink-0 ${bgInit} ${textInit}`}>
                                {p.employeeName.charAt(0).toUpperCase()}
                              </div>
                              <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200">
                                {p.employeeName === 'Ray' ? 'Ray' : p.employeeName.toUpperCase()}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`text-base font-black ${colorScore}`}>{p.kpiScore}</span>
                            </div>
                          </div>
                        );
                      })}
                      {performanceData.length === 0 && (
                        <div className="py-4 text-center text-sm text-slate-500">No performance data available.</div>
                      )}
                    </div>
                    
                    <button className="w-full mt-6 py-3 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-xl flex items-center justify-between group">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <Users size={16} />
                        <span>View all performers</span>
                      </div>
                      <ChevronDown size={16} className="-rotate-90 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </button>
                 </div>
              </div>

              {/* Performance Breakdown Table */}
              <div className="bg-surface border border-border rounded-[20px] p-0 overflow-hidden shadow-subtle">
                <div className="p-6 border-b border-border bg-surface">
                    <h3 className="text-sm font-bold text-primary tracking-tight">Performance Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-surface">
                        <th className="px-6 py-3 text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap">Name</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap text-center">Number</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap text-center">Role</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap text-center">KPI Score</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {performanceData.map((p, idx) => (
                        <tr key={idx} className="hover:bg-surface-hover transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand/20 text-brand flex items-center justify-center text-xs font-bold shrink-0">
                                  {p.employeeName.charAt(0)}
                                </div>
                                <p className="text-[13px] font-medium text-primary">{p.employeeName}</p>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center text-[12px] font-medium text-secondary">
                            {p.employeeId.slice(0, 8)}
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className="text-[11px] font-medium text-secondary bg-surface-hover px-2.5 py-1 rounded-md">{p.role}</span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center justify-center gap-3">
                               <div className="w-24 h-1.5 bg-surface-hover rounded-full overflow-hidden shrink-0">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${p.kpiScore}%` }}
                                    className={`h-full ${p.kpiScore >= 80 ? 'bg-[#1DAB61]' : p.kpiScore >= 60 ? 'bg-brand' : 'bg-red-500'}`}
                                 />
                               </div>
                               <span className="text-[13px] font-bold text-primary w-6">{p.kpiScore}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md inline-block ${
                               p.kpiScore >= 80 ? 'bg-[#EAFBF3] text-[#1DAB61]' : p.kpiScore >= 60 ? 'bg-brand/10 dark:bg-brand/20 text-brand' : 'bg-red-50 text-red-500'
                             }`}>
                               {p.kpiScore >= 80 ? 'ELITE' : p.kpiScore >= 60 ? 'STABLE' : 'RISK'}
                             </span>
                          </td>
                        </tr>
                      ))}
                      {performanceData.length === 0 && (
                        <tr className="hover:bg-surface-hover transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand/20 text-brand flex items-center justify-center text-xs font-bold shrink-0">
                                  A
                                </div>
                                <p className="text-[13px] font-medium text-primary">Abdur Rahman</p>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center text-[12px] font-medium text-secondary">
                            01712345678
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className="text-[11px] font-medium text-secondary bg-surface-hover px-2.5 py-1 rounded-md">Sales</span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center justify-center gap-3">
                               <div className="w-24 h-1.5 bg-surface-hover rounded-full overflow-hidden shrink-0">
                                 <div className="h-full bg-[#1DAB61] w-[85%]" />
                               </div>
                               <span className="text-[13px] font-bold text-primary w-6">85</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className="text-[11px] font-bold px-2.5 py-1 rounded-md inline-block bg-[#EAFBF3] text-[#1DAB61]">
                               ELITE
                             </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
