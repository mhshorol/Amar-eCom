import React, { useState, useEffect } from 'react';
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
  Area
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
  ChevronDown
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
      
      // Fetch total counts
      const customersSnap = await getDocs(collection(db, 'customers'));
      const productsSnap = await getDocs(collection(db, 'products'));

      setStats(prev => ({
        ...prev,
        totalSales,
        totalOrders: orders.length,
        totalCustomers: customersSnap.size,
        totalProducts: productsSnap.size,
        salesGrowth: 12.5, // Mock growth
        ordersGrowth: 8.2   // Mock growth
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
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6">
        {/* Title and Top Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight shrink-0">Reports & Analytics</h2>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar w-full xl:w-auto">
            {activeTab === 'performance' && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shrink-0">
                <Users size={16} className="text-gray-400" />
                <select 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="text-[13px] font-semibold outline-none bg-transparent"
                >
                  <option value="All">All Roles</option>
                  <option value="Sales">Sales</option>
                  <option value="Support">Support</option>
                  <option value="Operations">Operations</option>
                  <option value="Delivery">Delivery</option>
                </select>
              </div>
            )}
            
            {activeTab === 'inventory' && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors shrink-0">
                <RefreshCw size={14} className="text-gray-400" />
                <select 
                  value={valuationMethod}
                  onChange={(e) => setValuationMethod(e.target.value as ValuationMethod)}
                  className="text-[13px] font-semibold text-gray-800 outline-none bg-transparent appearance-none pr-1 cursor-pointer"
                >
                  <option value="WAC">Weighted Avg Cost</option>
                  <option value="FIFO">FIFO (First-In-First-Out)</option>
                </select>
                <ChevronDown size={14} className="text-gray-400 pointer-events-none ml-1" />
              </div>
            )}
            
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer shrink-0">
              <Calendar size={14} className="text-gray-400" />
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="text-[13px] font-semibold text-gray-800 outline-none bg-transparent appearance-none pr-1 cursor-pointer"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
              <ChevronDown size={14} className="text-gray-400 pointer-events-none ml-1" />
            </div>
            
            <button 
              onClick={generatePDF}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#141414] text-white rounded-full text-[13px] font-semibold hover:bg-black transition-colors shadow-sm cursor-pointer shrink-0"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar w-full">
            <button 
              onClick={() => setActiveTab('sales')}
              className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shrink-0 ${activeTab === 'sales' ? 'bg-[#141414] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              Sales Analytics
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shrink-0 ${activeTab === 'inventory' ? 'bg-[#141414] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              Inventory Valuation
            </button>
            <button 
              onClick={() => setActiveTab('performance')}
              className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shrink-0 ${activeTab === 'performance' ? 'bg-[#141414] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              Employee Performance
            </button>
        </div>
      </div>

      <div id="report-content" className="space-y-6">
        {activeTab === 'sales' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sales Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                    <DollarSign size={24} />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                    <TrendingUp size={16} />
                    {stats.salesGrowth}%
                  </div>
                </div>
                <div className="mt-8">
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Sales</p>
                  <h3 className="text-[32px] leading-none font-bold text-[#141414]">৳{(stats.totalSales || 0).toLocaleString()}</h3>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-orange-50 text-orange-500">
                    <ShoppingCart size={24} />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                    <TrendingUp size={16} />
                    {stats.ordersGrowth}%
                  </div>
                </div>
                <div className="mt-8">
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Orders</p>
                  <h3 className="text-[32px] leading-none font-bold text-[#141414]">{stats.totalOrders}</h3>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-green-50 text-green-600">
                    <Users size={24} />
                  </div>
                </div>
                <div className="mt-8">
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Customers</p>
                  <h3 className="text-[32px] leading-none font-bold text-[#141414]">{stats.totalCustomers}</h3>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                    <Package size={24} />
                  </div>
                </div>
                <div className="mt-8">
                  <p className="text-sm font-medium text-gray-500 mb-1">Active Products</p>
                  <h3 className="text-[32px] leading-none font-bold text-[#141414]">{stats.totalProducts}</h3>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Trend */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold text-gray-900">Sales Trend</h4>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                      <span className="text-gray-500">Sales</span>
                    </div>
                  </div>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: 'none', 
                          borderRadius: '8px', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorSales)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Selling Products */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-6">Top Selling Products</h4>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        width={100}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: 'none', 
                          borderRadius: '8px', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }}
                      />
                      <Bar dataKey="sales" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-6">Sales by Category</h4>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`৳${(value || 0).toLocaleString()}`, 'Sales']}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: 'none', 
                          borderRadius: '8px', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Order Source Distribution */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-6">Orders by Source</h4>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        width={100}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value: number) => [value, 'Orders']}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: 'none', 
                          borderRadius: '8px', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Forecasting */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Sparkles style={{ color: '#9333ea' }} size={20} />
                    <h4 className="font-bold text-gray-900">AI Sales Forecast</h4>
                  </div>
                  <button 
                    onClick={getAIForecast}
                    disabled={isForecasting}
                    className="text-xs font-bold hover:underline flex items-center gap-1"
                    style={{ color: '#9333ea' }}
                  >
                    {isForecasting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Generate Forecast
                  </button>
                </div>
                
                <div className="flex-1 rounded-xl p-4 border border-purple-100 overflow-y-auto max-h-64" style={{ backgroundColor: '#faf5ff' }}>
                  {forecasting ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: '#374151' }}>
                        {forecasting}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                      <div className="p-3 rounded-full" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Unlock AI Insights</p>
                        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Generate a forecast based on your recent sales data.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'inventory' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Inventory Valuation Header Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Total Inventory Value</p>
                <h3 className="text-2xl font-black text-gray-900">৳{(stats.inventoryValue || 0).toLocaleString()}</h3>
                <p className="text-xs text-gray-500 mt-1">Based on {valuationMethod} method</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">COGS (Last {dateRange}d)</p>
                <h3 className="text-2xl font-black text-gray-900">৳{(cogs || 0).toLocaleString()}</h3>
                <p className="text-xs text-gray-500 mt-1">Cost of goods sold</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">Est. Gross Profit</p>
                <h3 className="text-2xl font-black text-gray-900">৳{(stats.totalSales - (cogs || 0)).toLocaleString()}</h3>
                <p className="text-xs text-gray-500 mt-1">Margin: {stats.totalSales > 0 ? Math.round(((stats.totalSales - (cogs || 0)) / stats.totalSales) * 100) : 0}%</p>
              </div>
            </div>

            {/* Valuation Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900">Closing Stock Report</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase">Product / SKU</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase text-right">Qty on Hand</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase text-right">Unit Cost (Avg)</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {valuationData?.products && Object.entries(valuationData.products).map(([id, p]: any) => (
                      <tr key={id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">{p.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{p.sku}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{p.quantity}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-600 text-right">৳{(Math.round((p.value || 0) / (p.quantity || 1))).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600 text-right">৳{(p.value || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dead Stock Report */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingDown className="text-red-500" size={18} />
                  <h4 className="font-bold text-gray-900">Slow Moving Stock</h4>
                </div>
                <div className="space-y-4">
                  {deadStock.length > 0 ? deadStock.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 border border-red-100/50">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{p.name}</p>
                        <p className="text-[10px] text-gray-500">No sales in last {dateRange} days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-red-600">{p.stockLevel} units</p>
                        <p className="text-[9px] text-gray-400">Value: ৳{((p.stockLevel || 0) * (p.costPrice || 0)).toLocaleString()}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500 text-center py-8 italic">No dead stock found for this period.</p>
                  )}
                </div>
              </div>

              {/* Stock Ledger Excerpt */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <RefreshCw className="text-blue-500" size={18} />
                  <h4 className="font-bold text-gray-900">Recent Stock Movements</h4>
                </div>
                <div className="space-y-3">
                  {stockLedger.map((log: any, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          log.type === 'purchase' ? 'bg-green-100 text-green-600' : 
                          log.type === 'sale' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {log.type === 'purchase' ? <Plus size={14} /> : log.type === 'sale' ? <ShoppingCart size={14} /> : <RefreshCw size={14} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{log.type.toUpperCase()}</p>
                          <p className="text-[10px] text-gray-500">{format(log.timestamp?.toDate() || new Date(), 'MMM dd, HH:mm')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {log.quantity > 0 ? '+' : ''}{log.quantity}
                        </p>
                        <p className="text-[9px] text-gray-400">Ref: {log.referenceId?.slice(-8)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Performance Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                 <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-1">Top KPI Score</p>
                 <h3 className="text-2xl font-black text-gray-900">{performanceData.length > 0 ? Math.max(...performanceData.map(d => d.kpiScore)) : 0}</h3>
                 <p className="text-xs text-gray-500 mt-1">Best performing individual</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                 <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Avg. Team Score</p>
                 <h3 className="text-2xl font-black text-gray-900">
                   {performanceData.length > 0 ? Math.round(performanceData.reduce((s, d) => s + d.kpiScore, 0) / performanceData.length) : 0}
                 </h3>
                 <p className="text-xs text-gray-500 mt-1">Overall team productivity</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                 <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">Targets Met</p>
                 <h3 className="text-2xl font-black text-gray-900">{performanceData.filter(d => d.kpiScore >= 80).length}</h3>
                 <p className="text-xs text-gray-500 mt-1">Employees with KPI &gt; 80</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                 <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Need Improvement</p>
                 <h3 className="text-2xl font-black text-gray-900">{performanceData.filter(d => d.kpiScore < 60).length}</h3>
                 <p className="text-xs text-gray-500 mt-1">Employees with KPI &lt; 60</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Team Comparison Chart */}
               <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-2">
                 <h4 className="font-bold text-gray-900 mb-6">Team KPI Ranking</h4>
                 <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...performanceData].sort((a, b) => b.kpiScore - a.kpiScore)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="employeeName" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: 'none', 
                            borderRadius: '8px', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                          }}
                        />
                        <Bar dataKey="kpiScore" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={40}>
                           {performanceData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.kpiScore >= 80 ? '#10b981' : entry.kpiScore >= 60 ? '#f59e0b' : '#ef4444'} />
                           ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
               </div>

               {/* Performance Leaderboard */}
               <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                 <h4 className="font-bold text-gray-900 mb-6">Top Performers</h4>
                 <div className="space-y-4">
                    {[...performanceData].sort((a, b) => b.kpiScore - a.kpiScore).slice(0, 5).map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-50 bg-gray-50/30">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                             {idx + 1}
                           </div>
                           <div>
                             <p className="text-xs font-bold text-gray-900">{p.employeeName}</p>
                             <p className="text-[10px] text-gray-500">{p.role}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="flex items-center gap-1">
                             <Sparkles size={10} className="text-yellow-500" />
                             <span className="text-xs font-black text-gray-900">{p.kpiScore}</span>
                           </div>
                           <p className="text-[9px] text-green-600 font-bold uppercase tracking-tighter">Excellent</p>
                        </div>
                      </div>
                    ))}
                 </div>
                 <button className="w-full mt-6 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                   View All Rankings
                 </button>
               </div>
            </div>

            {/* Individual Metrics Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900">Employee Metric Detailed View</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase">Primary Metrics</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase text-center">Score</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {performanceData.map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                           <p className="text-sm font-bold text-gray-900">{p.employeeName}</p>
                           <p className="text-[10px] text-gray-400">ID: {p.employeeId}</p>
                        </td>
                        <td className="px-6 py-4">
                           <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600">{p.role}</span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex gap-4">
                              {p.role === 'Sales' && (
                                <>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-400">Orders</span>
                                    <span className="text-xs font-bold text-gray-700">{p.metrics.ordersHandled}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-400">Revenue</span>
                                    <span className="text-xs font-bold text-gray-700">৳{p.metrics.revenueGenerated?.toLocaleString()}</span>
                                  </div>
                                </>
                              )}
                              {p.role === 'Support' && (
                                <>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-400">Response</span>
                                    <span className="text-xs font-bold text-gray-700">{p.metrics.responseTime}m</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-400">CSAT</span>
                                    <span className="text-xs font-bold text-gray-700">{p.metrics.customerSatisfaction}★</span>
                                  </div>
                                </>
                              )}
                              {p.role === 'Delivery' && (
                                <>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-400">Success</span>
                                    <span className="text-xs font-bold text-gray-700">{p.metrics.successRate}%</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-400">Returns</span>
                                    <span className="text-xs font-bold text-gray-700">{p.metrics.returnRatio}%</span>
                                  </div>
                                </>
                              )}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="flex items-center justify-center gap-2">
                             <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                               <div className="h-full bg-indigo-500" style={{ width: `${p.kpiScore}%` }}></div>
                             </div>
                             <span className="text-xs font-black text-gray-900">{p.kpiScore}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                             p.kpiScore >= 80 ? 'bg-green-100 text-green-700' :
                             p.kpiScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                           }`}>
                             {p.kpiScore >= 80 ? 'Elite' : p.kpiScore >= 60 ? 'Stable' : 'At Risk'}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
