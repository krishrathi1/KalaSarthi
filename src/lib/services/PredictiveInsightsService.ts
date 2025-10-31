import { ISalesEvent } from '../models/SalesEvent';
import { ISalesAggregate } from '../models/SalesAggregate';
import RealtimeFirestoreSyncService from './RealtimeFirestoreSyncService';
import RealtimeAggregationService from './RealtimeAggregationService';

// Prediction types
export interface RevenueForecast {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  horizon: number; // number of periods to forecast
  predictions: Array<{
    date: Date;
    predictedRevenue: number;
    confidence: number;
    upperBound: number;
    lowerBound: number;
  }>;
  accuracy: number;
  factors: string[];
}

export interface TrendAnalysis {
  trend: 'upward' | 'downward' | 'stable' | 'volatile';
  strength: number; // 0-1
  duration: number; // days
  confidence: number;
  description: string;
  factors: string[];
}

export interface SeasonalPattern {
  pattern: 'weekly' | 'monthly' | 'seasonal' | 'none';
  strength: number;
  peakPeriods: string[];
  lowPeriods: string[];
  recommendations: string[];
}

export interface PredictiveInsights {
  revenueForecast: RevenueForecast;
  trendAnalysis: TrendAnalysis;
  seasonalPatterns: SeasonalPattern;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    impact: string;
    mitigation: string;
  }>;
  opportunities: Array<{
    opportunity: string;
    potential: number;
    timeframe: string;
    actions: string[];
  }>;
  recommendations: Array<{
    category: 'revenue' | 'operations' | 'marketing' | 'inventory';
    priority: 'low' | 'medium' | 'high';
    recommendation: string;
    expectedImpact: string;
    timeline: string;
  }>;
  lastUpdated: Date;
  dataQuality: number; // 0-1
}

/**
 * Predictive Insights Service that uses real-time Firestore data
 * to generate forecasts, trend analysis, and business recommendations
 */
export class PredictiveInsightsService {
  private static instance: PredictiveInsightsService;
  private syncService: RealtimeFirestoreSyncService;
  private aggregationService: RealtimeAggregationService;

  private constructor() {
    this.syncService = RealtimeFirestoreSyncService.getInstance();
    this.aggregationService = RealtimeAggregationService.getInstance();
  }

  static getInstance(): PredictiveInsightsService {
    if (!PredictiveInsightsService.instance) {
      PredictiveInsightsService.instance = new PredictiveInsightsService();
    }
    return PredictiveInsightsService.instance;
  }

  /**
   * Generate comprehensive predictive insights
   */
  async generatePredictiveInsights(artisanId: string): Promise<PredictiveInsights> {
    try {
      // Get real-time data
      const recentEvents = this.syncService.getCachedSalesEvents(artisanId);
      const aggregates = await this.aggregationService.getDashboardAggregates(artisanId);

      // Generate individual insights
      const revenueForecast = await this.generateRevenueForecast(recentEvents, aggregates);
      const trendAnalysis = this.analyzeTrends(recentEvents, aggregates);
      const seasonalPatterns = this.analyzeSeasonalPatterns(recentEvents, aggregates);
      const riskFactors = this.identifyRiskFactors(recentEvents, aggregates);
      const opportunities = this.identifyOpportunities(recentEvents, aggregates);
      const recommendations = this.generateRecommendations(recentEvents, aggregates, trendAnalysis);

      // Calculate data quality
      const dataQuality = this.calculateDataQuality(recentEvents, aggregates);

      return {
        revenueForecast,
        trendAnalysis,
        seasonalPatterns,
        riskFactors,
        opportunities,
        recommendations,
        lastUpdated: new Date(),
        dataQuality
      };

    } catch (error) {
      console.error('Error generating predictive insights:', error);
      throw error;
    }
  }

  /**
   * Generate revenue forecast using real-time data
   */
  async generateRevenueForecast(
    events: ISalesEvent[], 
    aggregates: { daily: ISalesAggregate[]; weekly: ISalesAggregate[]; monthly: ISalesAggregate[] }
  ): Promise<RevenueForecast> {
    // Use daily aggregates for short-term forecasting
    const dailyData = aggregates.daily.slice(0, 30); // Last 30 days
    
    if (dailyData.length < 7) {
      // Not enough data for reliable forecasting
      return {
        period: 'daily',
        horizon: 7,
        predictions: [],
        accuracy: 0.3,
        factors: ['Insufficient historical data for accurate forecasting']
      };
    }

    // Simple linear regression for trend
    const revenues = dailyData.map(d => d.totalRevenue).reverse();
    const trend = this.calculateLinearTrend(revenues);
    
    // Generate predictions for next 7 days
    const predictions = [];
    const baseRevenue = revenues[revenues.length - 1] || 0;
    
    for (let i = 1; i <= 7; i++) {
      const trendValue = baseRevenue + (trend.slope * i);
      const seasonalFactor = this.getSeasonalFactor(new Date(Date.now() + i * 24 * 60 * 60 * 1000));
      const predictedRevenue = Math.max(0, trendValue * seasonalFactor);
      
      // Calculate confidence based on data consistency
      const confidence = Math.max(0.4, Math.min(0.9, trend.r2));
      const variance = predictedRevenue * (1 - confidence) * 0.5;
      
      predictions.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        predictedRevenue: Math.round(predictedRevenue),
        confidence,
        upperBound: Math.round(predictedRevenue + variance),
        lowerBound: Math.round(Math.max(0, predictedRevenue - variance))
      });
    }

    const factors = [
      `Based on ${dailyData.length} days of historical data`,
      `Trend: ${trend.slope > 0 ? 'Growing' : trend.slope < 0 ? 'Declining' : 'Stable'}`,
      'Seasonal adjustments applied',
      'Real-time data integration'
    ];

    return {
      period: 'daily',
      horizon: 7,
      predictions,
      accuracy: trend.r2,
      factors
    };
  }

  /**
   * Analyze trends in real-time data
   */
  analyzeTrends(
    events: ISalesEvent[], 
    aggregates: { daily: ISalesAggregate[]; weekly: ISalesAggregate[]; monthly: ISalesAggregate[] }
  ): TrendAnalysis {
    const dailyData = aggregates.daily.slice(0, 14); // Last 2 weeks
    
    if (dailyData.length < 5) {
      return {
        trend: 'stable',
        strength: 0,
        duration: 0,
        confidence: 0.3,
        description: 'Insufficient data for trend analysis',
        factors: ['Need more historical data']
      };
    }

    const revenues = dailyData.map(d => d.totalRevenue).reverse();
    const trendData = this.calculateLinearTrend(revenues);
    
    // Determine trend direction and strength
    let trend: 'upward' | 'downward' | 'stable' | 'volatile';
    let strength = Math.abs(trendData.slope) / (revenues.reduce((a, b) => a + b, 0) / revenues.length);
    
    // Calculate volatility
    const volatility = this.calculateVolatility(revenues);
    
    if (volatility > 0.3) {
      trend = 'volatile';
      strength = volatility;
    } else if (trendData.slope > 0 && strength > 0.05) {
      trend = 'upward';
    } else if (trendData.slope < 0 && strength > 0.05) {
      trend = 'downward';
    } else {
      trend = 'stable';
    }

    // Generate description
    const descriptions = {
      upward: `Revenue is trending upward with ${(strength * 100).toFixed(1)}% daily growth rate`,
      downward: `Revenue is trending downward with ${(strength * 100).toFixed(1)}% daily decline rate`,
      stable: 'Revenue is relatively stable with minimal fluctuations',
      volatile: `Revenue shows high volatility with ${(volatility * 100).toFixed(1)}% variation`
    };

    const factors = [
      `Analysis based on ${dailyData.length} days of data`,
      `R-squared: ${trendData.r2.toFixed(3)}`,
      `Volatility: ${(volatility * 100).toFixed(1)}%`
    ];

    return {
      trend,
      strength: Math.min(1, strength),
      duration: dailyData.length,
      confidence: trendData.r2,
      description: descriptions[trend],
      factors
    };
  }

  /**
   * Analyze seasonal patterns
   */
  analyzeSeasonalPatterns(
    events: ISalesEvent[], 
    aggregates: { daily: ISalesAggregate[]; weekly: ISalesAggregate[]; monthly: ISalesAggregate[] }
  ): SeasonalPattern {
    // Analyze weekly patterns
    const weeklyPattern = this.analyzeWeeklyPattern(events);
    const monthlyPattern = this.analyzeMonthlyPattern(aggregates.monthly);
    
    // Determine dominant pattern
    let pattern: 'weekly' | 'monthly' | 'seasonal' | 'none' = 'none';
    let strength = 0;
    let peakPeriods: string[] = [];
    let lowPeriods: string[] = [];

    if (weeklyPattern.strength > monthlyPattern.strength && weeklyPattern.strength > 0.2) {
      pattern = 'weekly';
      strength = weeklyPattern.strength;
      peakPeriods = weeklyPattern.peakDays;
      lowPeriods = weeklyPattern.lowDays;
    } else if (monthlyPattern.strength > 0.2) {
      pattern = 'monthly';
      strength = monthlyPattern.strength;
      peakPeriods = monthlyPattern.peakMonths;
      lowPeriods = monthlyPattern.lowMonths;
    }

    // Generate recommendations
    const recommendations = this.generateSeasonalRecommendations(pattern, peakPeriods, lowPeriods);

    return {
      pattern,
      strength,
      peakPeriods,
      lowPeriods,
      recommendations
    };
  }

  /**
   * Identify risk factors
   */
  identifyRiskFactors(
    events: ISalesEvent[], 
    aggregates: { daily: ISalesAggregate[]; weekly: ISalesAggregate[]; monthly: ISalesAggregate[] }
  ): Array<{ factor: string; severity: 'low' | 'medium' | 'high'; impact: string; mitigation: string }> {
    const risks = [];

    // Check for declining trends
    const recentRevenues = aggregates.daily.slice(0, 7).map(d => d.totalRevenue);
    const olderRevenues = aggregates.daily.slice(7, 14).map(d => d.totalRevenue);
    
    if (recentRevenues.length > 0 && olderRevenues.length > 0) {
      const recentAvg = recentRevenues.reduce((a, b) => a + b, 0) / recentRevenues.length;
      const olderAvg = olderRevenues.reduce((a, b) => a + b, 0) / olderRevenues.length;
      
      if (recentAvg < olderAvg * 0.8) {
        risks.push({
          factor: 'Revenue Decline',
          severity: 'high' as const,
          impact: 'Significant drop in recent revenue compared to previous week',
          mitigation: 'Review marketing strategies and customer feedback'
        });
      }
    }

    // Check for high cancellation rates
    const canceledEvents = events.filter(e => e.eventType === 'order_canceled');
    const totalOrders = events.filter(e => e.eventType === 'order_created').length;
    
    if (totalOrders > 0 && canceledEvents.length / totalOrders > 0.15) {
      risks.push({
        factor: 'High Cancellation Rate',
        severity: 'medium' as const,
        impact: `${((canceledEvents.length / totalOrders) * 100).toFixed(1)}% of orders are being canceled`,
        mitigation: 'Investigate product quality and customer service issues'
      });
    }

    // Check for low order volume
    const recentOrders = aggregates.daily.slice(0, 7).reduce((sum, d) => sum + d.totalOrders, 0);
    if (recentOrders < 5) {
      risks.push({
        factor: 'Low Order Volume',
        severity: 'medium' as const,
        impact: 'Very few orders in recent days may indicate market issues',
        mitigation: 'Increase marketing efforts and review product positioning'
      });
    }

    // Check for data quality issues
    const connectionState = this.syncService.getConnectionState();
    if (connectionState === 'offline') {
      risks.push({
        factor: 'Data Connectivity Issues',
        severity: 'low' as const,
        impact: 'Real-time insights may be outdated',
        mitigation: 'Restore internet connection for accurate analysis'
      });
    }

    return risks;
  }

  /**
   * Identify growth opportunities
   */
  identifyOpportunities(
    events: ISalesEvent[], 
    aggregates: { daily: ISalesAggregate[]; weekly: ISalesAggregate[]; monthly: ISalesAggregate[] }
  ): Array<{ opportunity: string; potential: number; timeframe: string; actions: string[] }> {
    const opportunities = [];

    // Analyze product performance
    const productPerformance = new Map<string, { revenue: number; orders: number }>();
    events.forEach(event => {
      if (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled') {
        const existing = productPerformance.get(event.productId) || { revenue: 0, orders: 0 };
        existing.revenue += event.totalAmount;
        existing.orders += 1;
        productPerformance.set(event.productId, existing);
      }
    });

    // Identify top-performing products
    const topProducts = Array.from(productPerformance.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 3);

    if (topProducts.length > 0) {
      const topProduct = topProducts[0];
      opportunities.push({
        opportunity: 'Scale Top-Performing Product',
        potential: topProduct[1].revenue * 0.5, // 50% growth potential
        timeframe: '2-4 weeks',
        actions: [
          'Increase inventory for top-selling products',
          'Create targeted marketing campaigns',
          'Consider product variations or bundles'
        ]
      });
    }

    // Check for underutilized channels
    const channelPerformance = new Map<string, number>();
    events.forEach(event => {
      if (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled') {
        channelPerformance.set(event.channel, (channelPerformance.get(event.channel) || 0) + event.totalAmount);
      }
    });

    const totalRevenue = Array.from(channelPerformance.values()).reduce((a, b) => a + b, 0);
    const webRevenue = channelPerformance.get('web') || 0;
    
    if (webRevenue / totalRevenue < 0.7 && totalRevenue > 0) {
      opportunities.push({
        opportunity: 'Expand Online Presence',
        potential: webRevenue * 0.3, // 30% growth potential
        timeframe: '1-2 months',
        actions: [
          'Optimize website for conversions',
          'Implement SEO strategies',
          'Launch social media campaigns'
        ]
      });
    }

    // Seasonal opportunities
    const now = new Date();
    const month = now.getMonth() + 1;
    
    if (month >= 9 && month <= 11) { // Festival season approaching
      const currentMonthRevenue = aggregates.monthly[0]?.totalRevenue || 0;
      opportunities.push({
        opportunity: 'Festival Season Boost',
        potential: currentMonthRevenue * 0.4, // 40% seasonal boost
        timeframe: '2-3 months',
        actions: [
          'Create festival-themed products',
          'Launch seasonal marketing campaigns',
          'Offer special festival discounts'
        ]
      });
    }

    return opportunities;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(
    events: ISalesEvent[], 
    aggregates: { daily: ISalesAggregate[]; weekly: ISalesAggregate[]; monthly: ISalesAggregate[] },
    trendAnalysis: TrendAnalysis
  ): Array<{ category: 'revenue' | 'operations' | 'marketing' | 'inventory'; priority: 'low' | 'medium' | 'high'; recommendation: string; expectedImpact: string; timeline: string }> {
    const recommendations = [];

    // Revenue-based recommendations
    if (trendAnalysis.trend === 'downward') {
      recommendations.push({
        category: 'revenue' as const,
        priority: 'high' as const,
        recommendation: 'Implement revenue recovery strategy',
        expectedImpact: 'Reverse declining trend and stabilize revenue',
        timeline: '2-4 weeks'
      });
    } else if (trendAnalysis.trend === 'upward') {
      recommendations.push({
        category: 'revenue' as const,
        priority: 'medium' as const,
        recommendation: 'Scale successful strategies to maintain growth',
        expectedImpact: 'Sustain and accelerate current growth trajectory',
        timeline: '1-2 weeks'
      });
    }

    // Operations recommendations
    const avgOrderValue = aggregates.daily[0]?.averageOrderValue || 0;
    if (avgOrderValue < 2000) {
      recommendations.push({
        category: 'operations' as const,
        priority: 'medium' as const,
        recommendation: 'Implement upselling and cross-selling strategies',
        expectedImpact: 'Increase average order value by 15-25%',
        timeline: '2-3 weeks'
      });
    }

    // Marketing recommendations
    const recentOrders = aggregates.daily.slice(0, 7).reduce((sum, d) => sum + d.totalOrders, 0);
    if (recentOrders < 10) {
      recommendations.push({
        category: 'marketing' as const,
        priority: 'high' as const,
        recommendation: 'Launch targeted customer acquisition campaign',
        expectedImpact: 'Increase order volume by 30-50%',
        timeline: '1-3 weeks'
      });
    }

    // Inventory recommendations
    const uniqueProducts = aggregates.daily[0]?.uniqueProducts || 0;
    if (uniqueProducts < 5) {
      recommendations.push({
        category: 'inventory' as const,
        priority: 'medium' as const,
        recommendation: 'Expand product catalog with complementary items',
        expectedImpact: 'Increase customer choice and potential revenue',
        timeline: '3-6 weeks'
      });
    }

    return recommendations;
  }

  /**
   * Calculate linear trend from data points
   */
  private calculateLinearTrend(data: number[]): { slope: number; intercept: number; r2: number } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

    return { slope, intercept, r2: Math.max(0, r2) };
  }

  /**
   * Calculate volatility of data
   */
  private calculateVolatility(data: number[]): number {
    if (data.length < 2) return 0;

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? stdDev / mean : 0;
  }

  /**
   * Get seasonal factor for a given date
   */
  private getSeasonalFactor(date: Date): number {
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();

    // Festival season boost (Oct-Dec)
    let seasonalFactor = 1.0;
    if (month >= 10 && month <= 12) {
      seasonalFactor *= 1.2;
    }

    // Weekend factor
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      seasonalFactor *= 0.8;
    }

    return seasonalFactor;
  }

  /**
   * Analyze weekly patterns
   */
  private analyzeWeeklyPattern(events: ISalesEvent[]): { strength: number; peakDays: string[]; lowDays: string[] } {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayRevenue = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);

    events.forEach(event => {
      if (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled') {
        const dayOfWeek = new Date(event.eventTimestamp).getDay();
        dayRevenue[dayOfWeek] += event.totalAmount;
        dayCounts[dayOfWeek] += 1;
      }
    });

    // Calculate average revenue per day
    const avgRevenue = dayRevenue.map((revenue, i) => dayCounts[i] > 0 ? revenue / dayCounts[i] : 0);
    const overallAvg = avgRevenue.reduce((a, b) => a + b, 0) / 7;

    if (overallAvg === 0) {
      return { strength: 0, peakDays: [], lowDays: [] };
    }

    // Calculate strength as coefficient of variation
    const variance = avgRevenue.reduce((sum, value) => sum + Math.pow(value - overallAvg, 2), 0) / 7;
    const strength = Math.sqrt(variance) / overallAvg;

    // Identify peak and low days
    const peakDays = dayNames.filter((_, i) => avgRevenue[i] > overallAvg * 1.2);
    const lowDays = dayNames.filter((_, i) => avgRevenue[i] < overallAvg * 0.8);

    return { strength, peakDays, lowDays };
  }

  /**
   * Analyze monthly patterns
   */
  private analyzeMonthlyPattern(monthlyAggregates: ISalesAggregate[]): { strength: number; peakMonths: string[]; lowMonths: string[] } {
    if (monthlyAggregates.length < 3) {
      return { strength: 0, peakMonths: [], lowMonths: [] };
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenues = monthlyAggregates.map(m => m.totalRevenue);
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;

    if (avgRevenue === 0) {
      return { strength: 0, peakMonths: [], lowMonths: [] };
    }

    // Calculate strength
    const variance = revenues.reduce((sum, value) => sum + Math.pow(value - avgRevenue, 2), 0) / revenues.length;
    const strength = Math.sqrt(variance) / avgRevenue;

    // Identify peak and low months (simplified)
    const peakMonths = monthlyAggregates
      .filter(m => m.totalRevenue > avgRevenue * 1.2)
      .map(m => monthNames[new Date(m.periodStart).getMonth()]);

    const lowMonths = monthlyAggregates
      .filter(m => m.totalRevenue < avgRevenue * 0.8)
      .map(m => monthNames[new Date(m.periodStart).getMonth()]);

    return { strength, peakMonths, lowMonths };
  }

  /**
   * Generate seasonal recommendations
   */
  private generateSeasonalRecommendations(
    pattern: 'weekly' | 'monthly' | 'seasonal' | 'none',
    peakPeriods: string[],
    lowPeriods: string[]
  ): string[] {
    const recommendations = [];

    switch (pattern) {
      case 'weekly':
        if (peakPeriods.length > 0) {
          recommendations.push(`Focus marketing efforts on ${peakPeriods.join(', ')} when sales are typically higher`);
        }
        if (lowPeriods.length > 0) {
          recommendations.push(`Consider special promotions on ${lowPeriods.join(', ')} to boost slower days`);
        }
        break;
      case 'monthly':
        if (peakPeriods.length > 0) {
          recommendations.push(`Prepare inventory and marketing for peak months: ${peakPeriods.join(', ')}`);
        }
        if (lowPeriods.length > 0) {
          recommendations.push(`Plan promotional campaigns for slower months: ${lowPeriods.join(', ')}`);
        }
        break;
      case 'seasonal':
        recommendations.push('Develop seasonal marketing strategies to capitalize on predictable patterns');
        break;
      case 'none':
        recommendations.push('No clear seasonal patterns detected - focus on consistent marketing efforts');
        break;
    }

    return recommendations;
  }

  /**
   * Calculate data quality score
   */
  private calculateDataQuality(
    events: ISalesEvent[], 
    aggregates: { daily: ISalesAggregate[]; weekly: ISalesAggregate[]; monthly: ISalesAggregate[] }
  ): number {
    let score = 0;

    // Check data recency (30% of score)
    const latestEvent = events.length > 0 ? Math.max(...events.map(e => new Date(e.eventTimestamp).getTime())) : 0;
    const daysSinceLatest = (Date.now() - latestEvent) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceLatest / 7); // Full score if within 7 days
    score += recencyScore * 0.3;

    // Check data volume (30% of score)
    const volumeScore = Math.min(1, events.length / 50); // Full score at 50+ events
    score += volumeScore * 0.3;

    // Check data consistency (20% of score)
    const dailyDataPoints = aggregates.daily.length;
    const consistencyScore = Math.min(1, dailyDataPoints / 30); // Full score at 30+ days
    score += consistencyScore * 0.2;

    // Check connection state (20% of score)
    const connectionState = this.syncService.getConnectionState();
    const connectionScore = connectionState === 'online' ? 1 : connectionState === 'reconnecting' ? 0.5 : 0;
    score += connectionScore * 0.2;

    return Math.max(0, Math.min(1, score));
  }
}

export default PredictiveInsightsService;