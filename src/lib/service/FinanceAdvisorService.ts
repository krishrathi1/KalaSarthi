import { SalesAggregate } from '../models/SalesAggregate';
import connectDB from '../mongodb';

interface TimeSeriesData {
  date: string;
  revenue: number;
  orders: number;
  units: number;
  averageOrderValue: number;
  margin?: number;
}

interface ProductPerformance {
  productId: string;
  productName: string;
  revenue: number;
  units: number;
  growth: number;
  margin: number;
  rank: number;
}

interface ForecastResult {
  predictedRevenue: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
  trend: 'up' | 'down' | 'stable';
}

interface AnomalyResult {
  date: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
}

interface DiscountSimulation {
  originalRevenue: number;
  discountedRevenue: number;
  revenueImpact: number;
  marginImpact: number;
  volumeIncrease: number;
  recommendation: string;
}

export class FinanceAdvisorService {
  static async fetchTimeSeries(params: {
    artisanId?: string;
    productId?: string;
    timeRange: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate?: Date;
    endDate?: Date;
  }): Promise<TimeSeriesData[]> {
    try {
      await connectDB();

      const { artisanId, productId, timeRange, startDate, endDate } = params;

      // Build query
      const query: any = {
        period: timeRange,
      };

      if (artisanId) query.artisanId = artisanId;
      if (productId) query.productId = productId;
      if (startDate || endDate) {
        query.periodStart = {};
        if (startDate) query.periodStart.$gte = startDate;
        if (endDate) query.periodStart.$lte = endDate;
      }

      const aggregates = await SalesAggregate.find(query)
        .sort({ periodStart: 1 })
        .lean();

      return aggregates.map(agg => ({
        date: agg.periodKey,
        revenue: agg.totalRevenue,
        orders: agg.totalOrders,
        units: agg.totalQuantity,
        averageOrderValue: agg.averageOrderValue,
      }));

    } catch (error) {
      console.error('Error fetching time series:', error);
      return [];
    }
  }

  static async getTopProducts(params: {
    category?: string;
    timeRange: 'week' | 'month' | 'quarter' | 'year';
    limit?: number;
    sortBy: 'revenue' | 'units' | 'growth' | 'margin';
  }): Promise<ProductPerformance[]> {
    try {
      await connectDB();

      const { category, timeRange, limit = 10, sortBy } = params;

      // Convert timeRange to period type
      const periodMap = {
        week: 'weekly',
        month: 'monthly',
        quarter: 'monthly', // Approximate
        year: 'yearly'
      };

      const period = periodMap[timeRange];

      // Simple query instead of aggregation
      const query: any = {
        period,
        productId: { $exists: true, $ne: null }
      };

      if (category) {
        query.productCategory = category;
      }

      const sortOptions: any = {};
      if (sortBy === 'revenue') sortOptions.totalRevenue = -1;
      if (sortBy === 'units') sortOptions.totalQuantity = -1;
      if (sortBy === 'margin') sortOptions.averageMargin = -1;

      const results = await SalesAggregate.find(query)
        .sort(sortOptions)
        .limit(limit)
        .lean();

      return results.map((result, index) => ({
        productId: result.productId!,
        productName: `Product ${result.productId}`, // Would need to join with Product model
        revenue: result.totalRevenue,
        units: result.totalQuantity,
        growth: 0, // Would need historical comparison
        margin: result.averageMargin || 0,
        rank: index + 1
      }));

    } catch (error) {
      console.error('Error getting top products:', error);
      return [];
    }
  }

  static async getBottomProducts(params: {
    category?: string;
    timeRange: 'week' | 'month' | 'quarter' | 'year';
    limit?: number;
    minRevenue?: number;
  }): Promise<ProductPerformance[]> {
    try {
      await connectDB();

      const { category, timeRange, limit = 10, minRevenue = 0 } = params;

      const periodMap = {
        week: 'weekly',
        month: 'monthly',
        quarter: 'monthly',
        year: 'yearly'
      };

      const period = periodMap[timeRange];

      const query: any = {
        period,
        totalRevenue: { $gte: minRevenue },
        productId: { $exists: true, $ne: null }
      };

      if (category) {
        query.productCategory = category;
      }

      const results = await SalesAggregate.find(query)
        .sort({ totalRevenue: 1 }) // Sort by lowest revenue
        .limit(limit)
        .lean();

      return results.map((result, index) => ({
        productId: result.productId!,
        productName: `Product ${result.productId}`,
        revenue: result.totalRevenue,
        units: result.totalQuantity,
        growth: 0,
        margin: result.averageMargin || 0,
        rank: index + 1
      }));

    } catch (error) {
      console.error('Error getting bottom products:', error);
      return [];
    }
  }

  static async forecastRevenue(params: {
    artisanId?: string;
    productId?: string;
    horizon: 'week' | 'month' | 'quarter';
    confidence?: number;
  }): Promise<ForecastResult> {
    try {
      await connectDB();

      const { artisanId, productId, horizon, confidence = 0.95 } = params;

      // Get historical data for forecasting
      const historicalData = await this.fetchTimeSeries({
        artisanId,
        productId,
        timeRange: 'daily',
        endDate: new Date()
      });

      if (historicalData.length < 7) {
        return {
          predictedRevenue: 0,
          confidence: 0,
          upperBound: 0,
          lowerBound: 0,
          trend: 'stable'
        };
      }

      // Simple moving average forecast (could be enhanced with more sophisticated models)
      const recentData = historicalData.slice(-7);
      const averageRevenue = recentData.reduce((sum, item) => sum + item.revenue, 0) / recentData.length;

      // Calculate trend
      const firstHalf = recentData.slice(0, 3);
      const secondHalf = recentData.slice(-3);
      const firstAvg = firstHalf.reduce((sum, item) => sum + item.revenue, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, item) => sum + item.revenue, 0) / secondHalf.length;

      const trend = secondAvg > firstAvg * 1.05 ? 'up' : secondAvg < firstAvg * 0.95 ? 'down' : 'stable';

      // Calculate confidence intervals
      const variance = recentData.reduce((sum, item) => sum + Math.pow(item.revenue - averageRevenue, 2), 0) / recentData.length;
      const stdDev = Math.sqrt(variance);
      const zScore = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;

      const margin = zScore * stdDev / Math.sqrt(recentData.length);

      return {
        predictedRevenue: averageRevenue,
        confidence,
        upperBound: averageRevenue + margin,
        lowerBound: Math.max(0, averageRevenue - margin),
        trend
      };

    } catch (error) {
      console.error('Error forecasting revenue:', error);
      return {
        predictedRevenue: 0,
        confidence: 0,
        upperBound: 0,
        lowerBound: 0,
        trend: 'stable'
      };
    }
  }

  static async detectAnomalies(params: {
    artisanId?: string;
    metric: 'revenue' | 'units' | 'orders' | 'margin';
    timeRange: 'week' | 'month' | 'quarter';
    threshold?: number;
  }): Promise<AnomalyResult[]> {
    try {
      await connectDB();

      const { artisanId, metric, timeRange, threshold = 2.0 } = params;

      // Get data for anomaly detection
      const data = await this.fetchTimeSeries({
        artisanId,
        timeRange: 'daily',
        endDate: new Date()
      });

      if (data.length < 14) {
        return [];
      }

      const anomalies: AnomalyResult[] = [];
      const values = data.map(item => item[metric]);

      // Calculate rolling mean and standard deviation
      for (let i = 7; i < values.length; i++) {
        const window = values.slice(i - 7, i);
        const validWindow = window.filter((val): val is number => typeof val === 'number');
        const mean = validWindow.reduce((sum, val) => (sum ?? 0) + (val ?? 0), 0) / (validWindow.length || 1);
        const validWindowForVariance = window.filter((val): val is number => typeof val === 'number');
        const variance = validWindowForVariance.reduce((sum, val) => (sum ?? 0) + Math.pow((val ?? 0) - mean, 2), 0) / (validWindowForVariance.length || 1);
        const stdDev = Math.sqrt(variance);

        const currentValue = values[i];
        if (typeof currentValue === 'number') {
          const zScore = Math.abs(currentValue - mean) / stdDev;

          if (zScore > threshold) {
            anomalies.push({
              date: data[i].date,
              value: currentValue,
              expectedValue: mean,
              deviation: ((currentValue - mean) / mean) * 100,
              severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low'
            });
          }
        }
      }

      return anomalies;

    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return [];
    }
  }

  static async simulateDiscount(params: {
    productId: string;
    discountPercent: number;
    expectedVolumeIncrease: number;
    timeRange: 'week' | 'month' | 'quarter';
  }): Promise<DiscountSimulation> {
    try {
      await connectDB();

      const { productId, discountPercent, expectedVolumeIncrease, timeRange } = params;

      // Get current product performance
      const currentData = await SalesAggregate.findOne({
        productId,
        period: timeRange === 'week' ? 'weekly' : timeRange === 'month' ? 'monthly' : 'yearly'
      }).lean();

      if (!currentData) {
        return {
          originalRevenue: 0,
          discountedRevenue: 0,
          revenueImpact: 0,
          marginImpact: 0,
          volumeIncrease: 0,
          recommendation: 'No historical data available for simulation'
        };
      }

      // Handle case where currentData might be an array
      const data = Array.isArray(currentData) ? currentData[0] : currentData;
      const originalRevenue = data?.totalRevenue ?? 0;
      const originalUnits = data?.totalQuantity ?? 0;
      const originalMargin = data?.averageMargin ?? 0.2; // Default 20% margin

      // Calculate discounted price impact
      const discountFactor = 1 - (discountPercent / 100);
      const volumeIncreaseFactor = 1 + (expectedVolumeIncrease / 100);

      const newUnits = originalUnits * volumeIncreaseFactor;
      const discountedRevenue = (originalRevenue / originalUnits) * discountFactor * newUnits;

      // Calculate margin impact (assuming cost remains the same)
      const originalProfit = originalRevenue * originalMargin;
      const discountedProfit = discountedRevenue * (originalMargin * discountFactor); // Margin also affected by discount

      const revenueImpact = ((discountedRevenue - originalRevenue) / originalRevenue) * 100;
      const marginImpact = ((discountedProfit - originalProfit) / originalProfit) * 100;

      let recommendation = '';
      if (revenueImpact > 0 && marginImpact > -20) {
        recommendation = `Recommended: ${discountPercent}% discount could increase revenue by ${revenueImpact.toFixed(1)}% with ${marginImpact.toFixed(1)}% margin impact`;
      } else if (revenueImpact > 0 && marginImpact < -20) {
        recommendation = `Caution: Revenue increase of ${revenueImpact.toFixed(1)}% comes with significant margin reduction of ${Math.abs(marginImpact).toFixed(1)}%`;
      } else {
        recommendation = `Not recommended: Expected volume increase may not compensate for discount`;
      }

      return {
        originalRevenue,
        discountedRevenue,
        revenueImpact,
        marginImpact,
        volumeIncrease: expectedVolumeIncrease,
        recommendation
      };

    } catch (error) {
      console.error('Error simulating discount:', error);
      return {
        originalRevenue: 0,
        discountedRevenue: 0,
        revenueImpact: 0,
        marginImpact: 0,
        volumeIncrease: 0,
        recommendation: 'Error occurred during simulation'
      };
    }
  }

  static async getSalesSummary(params: {
    artisanId?: string;
    timeRange: 'week' | 'month' | 'quarter' | 'year';
    includeComparisons?: boolean;
    includeProjections?: boolean;
  }): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalUnits: number;
    averageOrderValue: number;
    averageMargin: number;
    topProduct: string;
    period: string;
    previousPeriodComparison?: any;
    projection?: any;
  }> {
    try {
      await connectDB();

      const { artisanId, timeRange, includeComparisons = true, includeProjections = false } = params;

      const periodMap = {
        week: 'weekly',
        month: 'monthly',
        quarter: 'monthly',
        year: 'yearly'
      };

      const period = periodMap[timeRange];

      // Get current period data
      const currentQuery: any = { period };
      if (artisanId) currentQuery.artisanId = artisanId;

      const currentData = await SalesAggregate.find(currentQuery).lean();

      const summary = {
        totalRevenue: currentData.reduce((sum, agg) => sum + agg.totalRevenue, 0),
        totalOrders: currentData.reduce((sum, agg) => sum + agg.totalOrders, 0),
        totalUnits: currentData.reduce((sum, agg) => sum + agg.totalQuantity, 0),
        averageOrderValue: 0,
        averageMargin: 0,
        topProduct: '',
        period
      };

      if (summary.totalOrders > 0) {
        summary.averageOrderValue = summary.totalRevenue / summary.totalOrders;
      }

      if (currentData.length > 0) {
        summary.averageMargin = currentData.reduce((sum, agg) => sum + (agg.averageMargin || 0), 0) / currentData.length;
      }

      // Add comparisons if requested
      if (includeComparisons) {
        // This would require fetching previous period data
        (summary as any).previousPeriodComparison = {
          revenueGrowth: 0,
          orderGrowth: 0,
          marginChange: 0
        };
      }

      // Add projections if requested
      if (includeProjections) {
        const forecast = await this.forecastRevenue({
          artisanId,
          horizon: timeRange as any,
          confidence: 0.95
        });
        (summary as any).projection = forecast;
      }

      return summary;

    } catch (error) {
      console.error('Error getting sales summary:', error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalUnits: 0,
        averageOrderValue: 0,
        averageMargin: 0,
        topProduct: '',
        period: 'unknown'
      };
    }
  }
}