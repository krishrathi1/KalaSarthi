/**
 * Digital Khata Integration Service for Artisan Buddy
 * 
 * Integrates with Digital Khata (Enhanced Finance Tracking System) to provide:
 * - Sales metrics and analytics
 * - Financial insights
 * - Inventory status checking
 * - Sales trend analysis
 * 
 * Requirements: 1.3, 7.1, 7.2, 7.3, 7.4
 */

import EnhancedDigitalKhataService, { DashboardData } from '../EnhancedDigitalKhataService';
import { firestoreRepository } from './FirestoreRepository';

// ============================================================================
// INTERFACES
// ============================================================================

export interface FinancialInsights {
  salesPerformance: {
    currentMonth: number;
    previousMonth: number;
    growthRate: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  revenueAnalysis: {
    totalRevenue: number;
    averageOrderValue: number;
    topProducts: Array<{
      productId: string;
      productName: string;
      revenue: number;
      salesCount: number;
    }>;
  };
  profitability: {
    estimatedProfit: number;
    profitMargin: number;
    recommendations: string[];
  };
  cashFlow: {
    inflow: number;
    outflow: number;
    netCashFlow: number;
    status: 'healthy' | 'warning' | 'critical';
  };
}

export interface InventoryInsights {
  overview: {
    totalProducts: number;
    activeProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: number;
  };
  alerts: Array<{
    type: 'low_stock' | 'out_of_stock' | 'overstock';
    productId: string;
    productName: string;
    currentStock: number;
    recommendedAction: string;
  }>;
  recommendations: string[];
}

export interface SalesTrendAnalysis {
  period: 'week' | 'month' | 'year';
  trends: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
  insights: {
    bestPerformingDay: string;
    worstPerformingDay: string;
    averageDailySales: number;
    peakSalesTime: string;
    seasonalPattern: string;
  };
  predictions: {
    nextWeekSales: number;
    nextMonthSales: number;
    confidence: number;
  };
}

export interface FinancialSummary {
  period: 'today' | 'week' | 'month' | 'year';
  sales: {
    count: number;
    revenue: number;
    averageValue: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    salesCount: number;
    revenue: number;
  }>;
  recentTransactions: Array<{
    orderId: string;
    amount: number;
    date: Date;
    status: string;
  }>;
}

// ============================================================================
// DIGITAL KHATA INTEGRATION SERVICE
// ============================================================================

export class DigitalKhataIntegration {
  private static instance: DigitalKhataIntegration;
  private khataService: EnhancedDigitalKhataService;

  private constructor() {
    this.khataService = EnhancedDigitalKhataService.getInstance();
  }

  public static getInstance(): DigitalKhataIntegration {
    if (!DigitalKhataIntegration.instance) {
      DigitalKhataIntegration.instance = new DigitalKhataIntegration();
    }
    return DigitalKhataIntegration.instance;
  }

  // ============================================================================
  // SALES METRICS AND ANALYTICS (Requirement 7.1)
  // ============================================================================

  /**
   * Get comprehensive sales metrics for an artisan
   */
  async getSalesMetrics(artisanId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<FinancialSummary> {
    try {
      // Get sales metrics from Firestore repository
      const salesMetrics = await firestoreRepository.getSalesMetrics(artisanId, period);

      // Get dashboard data for recent transactions
      const dashboardData = await this.khataService.getDashboardData(artisanId);

      return {
        period,
        sales: {
          count: salesMetrics.totalSales,
          revenue: salesMetrics.totalRevenue,
          averageValue: salesMetrics.averageOrderValue,
        },
        topProducts: salesMetrics.topProducts,
        recentTransactions: dashboardData.recentEvents.slice(0, 10).map(event => ({
          orderId: event.orderId,
          amount: event.totalAmount,
          date: event.eventTimestamp,
          status: event.eventType,
        })),
      };
    } catch (error) {
      console.error('Error fetching sales metrics:', error);
      throw new Error('Failed to fetch sales metrics');
    }
  }

  /**
   * Get current sales performance summary
   */
  async getCurrentSalesPerformance(artisanId: string): Promise<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  }> {
    try {
      const dashboardData = await this.khataService.getDashboardData(artisanId);
      return dashboardData.currentSales;
    } catch (error) {
      console.error('Error fetching current sales performance:', error);
      throw new Error('Failed to fetch current sales performance');
    }
  }

  // ============================================================================
  // FINANCIAL INSIGHTS (Requirement 7.2)
  // ============================================================================

  /**
   * Generate comprehensive financial insights
   */
  async getFinancialInsights(artisanId: string): Promise<FinancialInsights> {
    try {
      // Get current and previous month metrics
      const currentMonthMetrics = await firestoreRepository.getSalesMetrics(artisanId, 'month');
      const dashboardData = await this.khataService.getDashboardData(artisanId);

      // Calculate previous month sales
      const previousMonthSales = this.calculatePreviousMonthSales(dashboardData);

      // Calculate growth rate
      const growthRate = previousMonthSales > 0
        ? ((currentMonthMetrics.totalRevenue - previousMonthSales) / previousMonthSales) * 100
        : 0;

      // Determine trend
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (growthRate > 5) trend = 'increasing';
      else if (growthRate < -5) trend = 'decreasing';

      // Calculate profitability (assuming 30% average cost)
      const estimatedCost = currentMonthMetrics.totalRevenue * 0.7;
      const estimatedProfit = currentMonthMetrics.totalRevenue - estimatedCost;
      const profitMargin = (estimatedProfit / currentMonthMetrics.totalRevenue) * 100;

      // Generate recommendations
      const recommendations = this.generateFinancialRecommendations(
        currentMonthMetrics,
        growthRate,
        profitMargin
      );

      // Calculate cash flow (simplified)
      const inflow = currentMonthMetrics.totalRevenue;
      const outflow = estimatedCost;
      const netCashFlow = inflow - outflow;
      const cashFlowStatus = netCashFlow > 0 ? 'healthy' : netCashFlow > -10000 ? 'warning' : 'critical';

      return {
        salesPerformance: {
          currentMonth: currentMonthMetrics.totalRevenue,
          previousMonth: previousMonthSales,
          growthRate: Math.round(growthRate * 100) / 100,
          trend,
        },
        revenueAnalysis: {
          totalRevenue: currentMonthMetrics.totalRevenue,
          averageOrderValue: currentMonthMetrics.averageOrderValue,
          topProducts: currentMonthMetrics.topProducts,
        },
        profitability: {
          estimatedProfit: Math.round(estimatedProfit),
          profitMargin: Math.round(profitMargin * 100) / 100,
          recommendations,
        },
        cashFlow: {
          inflow,
          outflow,
          netCashFlow,
          status: cashFlowStatus,
        },
      };
    } catch (error) {
      console.error('Error generating financial insights:', error);
      throw new Error('Failed to generate financial insights');
    }
  }

  // ============================================================================
  // INVENTORY STATUS (Requirement 7.3)
  // ============================================================================

  /**
   * Get comprehensive inventory status and insights
   */
  async getInventoryInsights(artisanId: string): Promise<InventoryInsights> {
    try {
      const inventory = await firestoreRepository.getInventoryStatus(artisanId);
      const products = await firestoreRepository.getArtisanProducts(artisanId);

      // Generate alerts
      const alerts: InventoryInsights['alerts'] = [];

      // Low stock alerts
      inventory.lowStockProducts.forEach(item => {
        alerts.push({
          type: 'low_stock',
          productId: item.productId,
          productName: item.productName,
          currentStock: item.currentStock,
          recommendedAction: `Reorder ${item.productName}. Current stock: ${item.currentStock}, Reorder level: ${item.reorderLevel}`,
        });
      });

      // Out of stock alerts
      inventory.outOfStockProducts.forEach(productName => {
        const product = products.find(p => p.name === productName);
        if (product) {
          alerts.push({
            type: 'out_of_stock',
            productId: product.id,
            productName: product.name,
            currentStock: 0,
            recommendedAction: `Urgent: ${product.name} is out of stock. Restock immediately to avoid lost sales.`,
          });
        }
      });

      // Generate recommendations
      const recommendations = this.generateInventoryRecommendations(inventory, products);

      return {
        overview: {
          totalProducts: inventory.totalProducts,
          activeProducts: products.filter(p => p.status === 'active').length,
          lowStockCount: inventory.lowStockProducts.length,
          outOfStockCount: inventory.outOfStockProducts.length,
          totalValue: inventory.totalInventoryValue,
        },
        alerts,
        recommendations,
      };
    } catch (error) {
      console.error('Error fetching inventory insights:', error);
      throw new Error('Failed to fetch inventory insights');
    }
  }

  // ============================================================================
  // SALES TREND ANALYSIS (Requirement 7.4)
  // ============================================================================

  /**
   * Analyze sales trends and generate predictions
   */
  async analyzeSalesTrends(artisanId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<SalesTrendAnalysis> {
    try {
      const salesMetrics = await firestoreRepository.getSalesMetrics(artisanId, period);

      // Analyze trends
      const trends = salesMetrics.salesTrend;

      // Find best and worst performing days
      let bestDay = trends[0];
      let worstDay = trends[0];
      let totalSales = 0;

      trends.forEach(trend => {
        if (trend.revenue > (bestDay?.revenue || 0)) bestDay = trend;
        if (trend.revenue < (worstDay?.revenue || Infinity)) worstDay = trend;
        totalSales += trend.sales;
      });

      const averageDailySales = trends.length > 0 ? totalSales / trends.length : 0;

      // Detect seasonal pattern
      const seasonalPattern = this.detectSeasonalPattern(trends);

      // Generate predictions using simple moving average
      const predictions = this.predictFutureSales(trends);

      return {
        period,
        trends,
        insights: {
          bestPerformingDay: bestDay?.date || 'N/A',
          worstPerformingDay: worstDay?.date || 'N/A',
          averageDailySales: Math.round(averageDailySales * 100) / 100,
          peakSalesTime: this.identifyPeakSalesTime(trends),
          seasonalPattern,
        },
        predictions,
      };
    } catch (error) {
      console.error('Error analyzing sales trends:', error);
      throw new Error('Failed to analyze sales trends');
    }
  }

  /**
   * Get quick financial summary for chatbot responses
   */
  async getQuickFinancialSummary(artisanId: string): Promise<string> {
    try {
      const currentSales = await this.getCurrentSalesPerformance(artisanId);
      const insights = await this.getFinancialInsights(artisanId);
      const inventory = await this.getInventoryInsights(artisanId);

      const summary = `
📊 Financial Summary:

💰 Sales Performance:
- Today: ₹${currentSales.today.toLocaleString('en-IN')}
- This Week: ₹${currentSales.thisWeek.toLocaleString('en-IN')}
- This Month: ₹${currentSales.thisMonth.toLocaleString('en-IN')}
- Growth: ${insights.salesPerformance.growthRate > 0 ? '+' : ''}${insights.salesPerformance.growthRate}% (${insights.salesPerformance.trend})

📦 Inventory Status:
- Total Products: ${inventory.overview.totalProducts}
- Low Stock: ${inventory.overview.lowStockCount} items
- Out of Stock: ${inventory.overview.outOfStockCount} items
- Inventory Value: ₹${inventory.overview.totalValue.toLocaleString('en-IN')}

💡 Top Insight: ${insights.profitability.recommendations[0] || 'Keep up the good work!'}
      `.trim();

      return summary;
    } catch (error) {
      console.error('Error generating quick financial summary:', error);
      return 'Unable to fetch financial summary at this time.';
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private calculatePreviousMonthSales(dashboardData: DashboardData): number {
    // Calculate previous month sales from aggregates
    const monthlyAggregates = dashboardData.aggregates.monthly;
    if (monthlyAggregates.length >= 2) {
      return monthlyAggregates[1].totalRevenue || 0;
    }
    return 0;
  }

  private generateFinancialRecommendations(
    metrics: any,
    growthRate: number,
    profitMargin: number
  ): string[] {
    const recommendations: string[] = [];

    if (growthRate < 0) {
      recommendations.push('Sales are declining. Consider running promotions or introducing new products.');
    } else if (growthRate > 20) {
      recommendations.push('Excellent growth! Consider expanding your product line to capitalize on momentum.');
    }

    if (profitMargin < 20) {
      recommendations.push('Profit margin is low. Review pricing strategy and reduce costs where possible.');
    } else if (profitMargin > 40) {
      recommendations.push('Strong profit margins! You have room to offer competitive pricing or invest in growth.');
    }

    if (metrics.totalSales < 10) {
      recommendations.push('Low sales volume. Focus on marketing and customer acquisition.');
    }

    if (metrics.topProducts.length > 0) {
      const topProduct = metrics.topProducts[0];
      recommendations.push(`Your best seller is ${topProduct.productName}. Consider creating similar products.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Your business is performing well. Keep maintaining quality and customer service.');
    }

    return recommendations;
  }

  private generateInventoryRecommendations(inventory: any, products: any[]): string[] {
    const recommendations: string[] = [];

    if (inventory.outOfStockProducts.length > 0) {
      recommendations.push(`Urgent: ${inventory.outOfStockProducts.length} products are out of stock. Restock immediately.`);
    }

    if (inventory.lowStockProducts.length > 0) {
      recommendations.push(`${inventory.lowStockProducts.length} products are running low. Plan reorders soon.`);
    }

    const inactiveProducts = products.filter(p => p.status === 'inactive').length;
    if (inactiveProducts > 0) {
      recommendations.push(`You have ${inactiveProducts} inactive products. Consider reactivating or removing them.`);
    }

    if (inventory.totalInventoryValue > 100000) {
      recommendations.push('High inventory value. Ensure products are moving to maintain cash flow.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Inventory levels are healthy. Continue monitoring stock levels regularly.');
    }

    return recommendations;
  }

  private detectSeasonalPattern(trends: any[]): string {
    if (trends.length < 7) {
      return 'Insufficient data for seasonal analysis';
    }

    // Simple pattern detection based on revenue variance
    const revenues = trends.map(t => t.revenue);
    const avg = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const variance = revenues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev / avg < 0.2) {
      return 'Stable sales pattern with minimal fluctuation';
    } else if (stdDev / avg < 0.5) {
      return 'Moderate fluctuation in sales';
    } else {
      return 'High variability - possible seasonal or event-driven sales';
    }
  }

  private identifyPeakSalesTime(trends: any[]): string {
    if (trends.length === 0) return 'N/A';

    // Group by day of week if we have enough data
    if (trends.length >= 7) {
      const dayRevenues: Record<string, number> = {};
      
      trends.forEach(trend => {
        const date = new Date(trend.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        dayRevenues[dayName] = (dayRevenues[dayName] || 0) + trend.revenue;
      });

      const peakDay = Object.entries(dayRevenues).reduce((a, b) => a[1] > b[1] ? a : b);
      return peakDay[0];
    }

    return 'Need more data to identify peak sales time';
  }

  private predictFutureSales(trends: any[]): {
    nextWeekSales: number;
    nextMonthSales: number;
    confidence: number;
  } {
    if (trends.length < 3) {
      return {
        nextWeekSales: 0,
        nextMonthSales: 0,
        confidence: 0,
      };
    }

    // Simple moving average for prediction
    const recentTrends = trends.slice(-7);
    const avgDailySales = recentTrends.reduce((sum, t) => sum + t.sales, 0) / recentTrends.length;
    const avgDailyRevenue = recentTrends.reduce((sum, t) => sum + t.revenue, 0) / recentTrends.length;

    // Calculate confidence based on data consistency
    const revenues = recentTrends.map(t => t.revenue);
    const avg = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const variance = revenues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(100, 100 - (stdDev / avg) * 100));

    return {
      nextWeekSales: Math.round(avgDailyRevenue * 7),
      nextMonthSales: Math.round(avgDailyRevenue * 30),
      confidence: Math.round(confidence),
    };
  }
}

export const digitalKhataIntegration = DigitalKhataIntegration.getInstance();
