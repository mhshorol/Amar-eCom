import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy,
  limit,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { PerformanceMetric, KPIConfig, Employee, User } from '../types';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export class PerformanceService {
  /**
   * Fetches performance metrics for a specific period
   */
  static async getPerformanceMetrics(period: string) {
    const q = query(
      collection(db, 'performanceMetrics'),
      where('period', '==', period),
      orderBy('kpiScore', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PerformanceMetric));
  }

  /**
   * Calculates KPI Score based on metrics and weights
   */
  static calculateKPI(metrics: any, weights: Record<string, number>): number {
    let score = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([key, weight]) => {
      const value = metrics[key] || 0;
      // Normalize value to 0-100 scale based on some target (mock logic for now)
      // In production, each metric would have its own target/normalization logic
      const target = 100; 
      const normalizedValue = Math.min((value / target) * 100, 100);
      
      score += normalizedValue * (weight / 100);
      totalWeight += weight;
    });

    return Math.round(score);
  }

  /**
   * Fetches raw performance data (orders, attendance, etc.) to generate metrics
   * In a real app, this would be a complex aggregation or run via Cloud Functions
   */
  static async aggregationPerformance(employeeId: string, startDate: Date, endDate: Date) {
     // Fetch Orders handled by this user (if staff)
     // Fetch Deliveries handled by this user
     // Fetch Tasks completed
     // This is just a mock for the demo/UI
     return {
        ordersHandled: Math.floor(Math.random() * 200),
        revenueGenerated: Math.floor(Math.random() * 50000),
        conversionRate: Math.floor(Math.random() * 15) + 5,
        responseTime: Math.floor(Math.random() * 10) + 2,
        resolutionRate: Math.floor(Math.random() * 20) + 80,
        customerSatisfaction: (Math.random() * 1) + 4,
        successRate: Math.floor(Math.random() * 10) + 90,
        returnRatio: Math.floor(Math.random() * 5)
     };
  }
}
