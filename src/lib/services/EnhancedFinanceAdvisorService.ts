import { ISalesEvent } from '../models/SalesEvent';
import { ISalesAggregate } from '../models/SalesAggregate';
import RealtimeFirestoreSyncService from './RealtimeFirestoreSyncService';
import RealtimeAggregationService from './RealtimeAggregationService';
import { consultFinanceAdvisor, ConsultFinanceAdvisorInput, ConsultFinanceAdvisorOutput } from '../../ai/flows/finance-advisor-agent';

// Enhanced advisor input with real-time data context
export interface EnhancedFinanceAdvisorInput extends ConsultFinanceAdvisorInput {
  includeRealtimeData?: boolean;
  realtimeContext?: {
    recentEvents?: ISalesEvent[];
    currentAggregates?: {
      daily: ISalesAggregate[];
      weekly: ISalesAggregate[];
      monthly: ISalesAggregate[];
    };
    connectionState?: 'online' | 'offline' | 'reconnecting';
  };
}

// Enhanced advisor output with real-time insights
export interface EnhancedFinanceAdvisorOutput extends ConsultFinanceAdvisorOutput {
  realtimeInsights?: {
    liveMetrics: {
      currentRevenue: number;
      todayOrders: number;
      recentTrends: string[];
    };
    marketConditions: string[];
    urgentRecommendations: string[];
    dataFreshness: {
      lastUpdated: Date;
      isLive: boolean;
      cacheStatus: string;
    };
  };
}

/**
 * Enhanced Finance Advisor Service that integrates real-time Firestore data
 * with AI-powered financial insights and recommendations
 */
export class EnhancedFinanceAdvisorService {
  private static instance: EnhancedFinanceAdvisorService;
  private syncService: RealtimeFirestoreSyncService;
  private aggregationService: RealtimeAggregationService;

  private constructor() {
    this.syncService = RealtimeFirestoreSyncService.getInstance();
    this.aggregationService = RealtimeAggregationService.getInstance();
  }

  static getInstance(): EnhancedFinanceAdvisorService {
    if (!EnhancedFinanceAdvisorService.instance) {
      EnhancedFinanceAdvisorService.instance = new EnhancedFinanceAdvisorService();
    }
    return EnhancedFinanceAdvisorService.instance;
  }

  /**
   * Enhanced consultation with real-time Firestore data
   */
  async consultWithRealtimeData(input: EnhancedFinanceAdvisorInput): Promise<EnhancedFinanceAdvisorOutput> {
    try {
      // Get real-time data if requested
      let realtimeContext = input.realtimeContext;
      
      if (input.includeRealtimeData && input.context?.artisanId) {
        realtimeContext = await this.gatherRealtimeContext(input.context.artisanId);
      }

      // Enhance the query with real-time context
      const enhancedQuery = this.enhanceQueryWithRealtimeData(input.query, realtimeContext);

      // Call the original advisor with enhanced context
      const baseResponse = await consultFinanceAdvisor({
        ...input,
        query: enhancedQuery
      });

      // Generate real-time insights
      const realtimeInsights = realtimeContext ? 
        await this.generateRealtimeInsights(realtimeContext, input.context?.artisanId) : 
        undefined;

      // Enhance recommendations with real-time data
      const enhancedRecommendations = this.enhanceRecommendationsWithRealtimeData(
        baseResponse.recommendations,
        realtimeContext
      );

      return {
        ...baseResponse,
        recommendations: enhancedRecommendations,
        realtimeInsights
      };

    } catch (error) {
      console.error('Error in enhanced finance advisor consultation:', error);
      
      // Fallback to basic advisor
      const fallbackResponse = await consultFinanceAdvisor(input);
      return {
        ...fallbackResponse,
        realtimeInsights: {
          liveMetrics: {
            currentRevenue: 0,
            todayOrders: 0,
            recentTrends: ['Unable to fetch real-time data']
          },
          marketConditions: ['Real-time data unavailable'],
          urgentRecommendations: ['Check data connection and try again'],
          dataFreshness: {
            lastUpdated: new Date(),
            isLive: false,
            cacheStatus: 'error'
          }
        }
      };
    }
  }

  /**
   * Get real-time financial insights for dashboard
   */
  async getRealtimeFinancialInsights(artisanId: string): Promise<{
    insights: string[];
    recommendations: string[];
    alerts: string[];
    opportunities: string[];
  }> {
    try {
      const realtimeContext = await this.gatherRealtimeContext(artisanId);
      
      const insights = this.analyzeRealtimePatterns(realtimeContext);
      const recommendations = this.generateActionableRecommendations(realtimeContext);
      const alerts = this.detectFinancialAlerts(realtimeContext);
      const opportunities = this.identifyGrowthOpportunities(realtimeContext);

      return {
        insights,
        recommendations,
        alerts,
        opportunities
      };

    } catch (error) {
      console.error('Error generating real-time insights:', error);
      return {
        insights: ['Unable to analyze current data'],
        recommendations: ['Check your data connection'],
        alerts: ['Real-time monitoring unavailable'],
        opportunities: ['Data analysis temporarily unavailable']
      };
    }
  }

  /**
   * Analyze sales performance with real-time data
   */
  async analyzeSalesPerformance(artisanId: string, timeframe: 'today' | 'week' | 'month'): Promise<{
    performance: 'excellent' | 'good' | 'average' | 'poor';
    keyMetrics: {
      revenue: number;
      growth: number;
      orders: number;
      averageOrderValue: number;
    };
    insights: string[];
    recommendations: string[];
  }> {
    try {
      const realtimeContext = await this.gatherRealtimeContext(artisanId);
      
      if (!realtimeContext?.currentAggregates) {
        throw new Error('No aggregate data available');
      }

      const aggregates = realtimeContext.currentAggregates;
      let currentData: ISalesAggregate | undefined;
      let previousData: ISalesAggregate | undefined;

      switch (timeframe) {
        case 'today':
          currentData = aggregates.daily[0];
          previousData = aggregates.daily[1];
          break;
        case 'week':
          currentData = aggregates.weekly[0];
          previousData = aggregates.weekly[1];
          break;
        case 'month':
          currentData = aggregates.monthly[0];
          previousData = aggregates.monthly[1];
          break;
      }

      if (!currentData) {
        throw new Error(`No ${timeframe} data available`);
      }

      const revenue = currentData.totalRevenue;
      const growth = previousData ? 
        ((revenue - previousData.totalRevenue) / previousData.totalRevenue) * 100 : 0;
      const orders = currentData.totalOrders;
      const averageOrderValue = currentData.averageOrderValue;

      // Determine performance level
      let performance: 'excellent' | 'good' | 'average' | 'poor';
      if (growth > 20 && revenue > 50000) performance = 'excellent';
      else if (growth > 10 && revenue > 25000) performance = 'good';
      else if (growth > 0 && revenue > 10000) performance = 'average';
      else performance = 'poor';

      // Generate insights
      const insights = [
        `${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} revenue: ₹${revenue.toLocaleString()}`,
        `Growth rate: ${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`,
        `Total orders: ${orders}`,
        `Average order value: ₹${averageOrderValue.toFixed(0)}`
      ];

      // Generate recommendations
      const recommendations = this.generatePerformanceRecommendations(performance, {
        revenue,
        growth,
        orders,
        averageOrderValue
      });

      return {
        performance,
        keyMetrics: { revenue, growth, orders, averageOrderValue },
        insights,
        recommendations
      };

    } catch (error) {
      console.error('Error analyzing sales performance:', error);
      return {
        performance: 'average',
        keyMetrics: { revenue: 0, growth: 0, orders: 0, averageOrderValue: 0 },
        insights: ['Unable to analyze performance with current data'],
        recommendations: ['Ensure data is being tracked properly']
      };
    }
  }

  /**
   * Gather real-time context from Firestore
   */
  private async gatherRealtimeContext(artisanId: string): Promise<NonNullable<EnhancedFinanceAdvisorInput['realtimeContext']>> {
    // Get recent events from cache
    const recentEvents = this.syncService.getCachedSalesEvents(artisanId).slice(0, 50);

    // Get current aggregates
    const currentAggregates = await this.aggregationService.getDashboardAggregates(artisanId);

    // Get connection state
    const connectionState = this.syncService.getConnectionState();

    return {
      recentEvents,
      currentAggregates,
      connectionState
    };
  }

  /**
   * Enhance query with real-time data context
   */
  private enhanceQueryWithRealtimeData(
    originalQuery: string, 
    realtimeContext?: NonNullable<EnhancedFinanceAdvisorInput['realtimeContext']>
  ): string {
    if (!realtimeContext) return originalQuery;

    const contextInfo = [];

    // Add recent sales context
    if (realtimeContext.recentEvents && realtimeContext.recentEvents.length > 0) {
      const recentRevenue = realtimeContext.recentEvents
        .filter(e => e.eventType === 'order_paid' || e.eventType === 'order_fulfilled')
        .reduce((sum, e) => sum + e.totalAmount, 0);
      
      contextInfo.push(`Recent sales activity: ₹${recentRevenue.toLocaleString()} from ${realtimeContext.recentEvents.length} events`);
    }

    // Add aggregate context
    if (realtimeContext.currentAggregates?.daily[0]) {
      const todayData = realtimeContext.currentAggregates.daily[0];
      contextInfo.push(`Today's performance: ₹${todayData.totalRevenue.toLocaleString()} revenue, ${todayData.totalOrders} orders`);
    }

    // Add connection status
    if (realtimeContext.connectionState) {
      contextInfo.push(`Data connection: ${realtimeContext.connectionState}`);
    }

    if (contextInfo.length === 0) return originalQuery;

    return `${originalQuery}\n\nCurrent business context:\n${contextInfo.join('\n')}`;
  }

  /**
   * Generate real-time insights
   */
  private async generateRealtimeInsights(
    realtimeContext: NonNullable<EnhancedFinanceAdvisorInput['realtimeContext']>,
    artisanId?: string
  ): Promise<NonNullable<EnhancedFinanceAdvisorOutput['realtimeInsights']>> {
    const currentRevenue = realtimeContext.recentEvents
      ?.filter(e => {
        const eventDate = new Date(e.eventTimestamp);
        const today = new Date();
        return eventDate.toDateString() === today.toDateString() &&
               (e.eventType === 'order_paid' || e.eventType === 'order_fulfilled');
      })
      .reduce((sum, e) => sum + e.totalAmount, 0) || 0;

    const todayOrders = realtimeContext.recentEvents
      ?.filter(e => {
        const eventDate = new Date(e.eventTimestamp);
        const today = new Date();
        return eventDate.toDateString() === today.toDateString() &&
               (e.eventType === 'order_paid' || e.eventType === 'order_fulfilled');
      }).length || 0;

    const recentTrends = this.analyzeRecentTrends(realtimeContext.recentEvents || []);
    const marketConditions = this.assessMarketConditions(realtimeContext);
    const urgentRecommendations = this.generateUrgentRecommendations(realtimeContext);

    return {
      liveMetrics: {
        currentRevenue,
        todayOrders,
        recentTrends
      },
      marketConditions,
      urgentRecommendations,
      dataFreshness: {
        lastUpdated: new Date(),
        isLive: realtimeContext.connectionState === 'online',
        cacheStatus: realtimeContext.connectionState || 'unknown'
      }
    };
  }

  /**
   * Enhance recommendations with real-time data
   */
  private enhanceRecommendationsWithRealtimeData(
    baseRecommendations: string[],
    realtimeContext?: NonNullable<EnhancedFinanceAdvisorInput['realtimeContext']>
  ): string[] {
    if (!realtimeContext) return baseRecommendations;

    const enhancedRecommendations = [...baseRecommendations];

    // Add real-time specific recommendations
    if (realtimeContext.connectionState === 'offline') {
      enhancedRecommendations.unshift('⚠️ You\'re currently offline. Recommendations are based on cached data.');
    }

    if (realtimeContext.recentEvents && realtimeContext.recentEvents.length > 0) {
      const recentProducts = new Set(realtimeContext.recentEvents.map(e => e.productName));
      if (recentProducts.size > 0) {
        enhancedRecommendations.push(`📈 Focus on promoting your active products: ${Array.from(recentProducts).slice(0, 3).join(', ')}`);
      }
    }

    return enhancedRecommendations;
  }

  /**
   * Analyze real-time patterns
   */
  private analyzeRealtimePatterns(realtimeContext: NonNullable<EnhancedFinanceAdvisorInput['realtimeContext']>): string[] {
    const insights: string[] = [];

    if (!realtimeContext.recentEvents || realtimeContext.recentEvents.length === 0) {
      insights.push('No recent sales activity detected');
      return insights;
    }

    // Analyze sales velocity
    const last24Hours = realtimeContext.recentEvents.filter(e => {
      const eventTime = new Date(e.eventTimestamp);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return eventTime > dayAgo;
    });

    if (last24Hours.length > 0) {
      insights.push(`${last24Hours.length} sales events in the last 24 hours`);
    }

    // Analyze product performance
    const productPerformance = new Map<string, number>();
    realtimeContext.recentEvents.forEach(event => {
      if (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled') {
        const current = productPerformance.get(event.productName) || 0;
        productPerformance.set(event.productName, current + event.totalAmount);
      }
    });

    if (productPerformance.size > 0) {
      const topProduct = Array.from(productPerformance.entries())
        .sort((a, b) => b[1] - a[1])[0];
      insights.push(`Top performing product: ${topProduct[0]} (₹${topProduct[1].toLocaleString()})`);
    }

    return insights;
  }

  /**
   * Generate actionable recommendations
   */
  private generateActionableRecommendations(realtimeContext: NonNullable<EnhancedFinanceAdvisorInput['realtimeContext']>): string[] {
    const recommendations: string[] = [];

    // Connection-based recommendations
    if (realtimeContext.connectionState === 'offline') {
      recommendations.push('Restore internet connection to get live insights');
    } else if (realtimeContext.connectionState === 'reconnecting') {
      recommendations.push('Data sync in progress - insights will update shortly');
    }

    // Activity-based recommendations
    if (!realtimeContext.recentEvents || realtimeContext.recentEvents.length === 0) {
      recommendations.push('No recent sales detected - consider marketing campaigns');
      recommendations.push('Review product listings and pricing strategy');
    } else {
      const todayEvents = realtimeContext.recentEvents.filter(e => {
        const eventDate = new Date(e.eventTimestamp);
        const today = new Date();
        return eventDate.toDateString() === today.toDateString();
      });

      if (todayEvents.length > 0) {
        recommendations.push('Great! You have sales activity today - maintain momentum');
      }
    }

    return recommendations;
  }

  /**
   * Detect financial alerts
   */
  private detectFinancialAlerts(realtimeContext: NonNullable<EnhancedFinanceAdvisorInput['realtimeContext']>): string[] {
    const alerts: string[] = [];

    // Check for data connectivity issues
    if (realtimeContext.connectionState === 'offline') {
      alerts.push('🔴 Real-time data sync is offline');
    }

    // Check for unusual patterns
    if (realtimeContext.recentEvents && realtimeContext.recentEvents.length > 0) {
      const canceledEvents = realtimeContext.recentEvents.filter(e => e.eventType === 'order_canceled');
      if (canceledEvents.length > realtimeContext.recentEvents.length * 0.2) {
        alerts.push('⚠️ High cancellation rate detected');
      }
    }

    return alerts;
  }

  /**
   * Identify growth opportunities
   */
  private identifyGrowthOpportunities(realtimeContext: NonNullable<EnhancedFinanceAdvisorInput['realtimeContext']>): string[] {
    const opportunities: string[] = [];

    if (realtimeContext.currentAggregates?.daily[0]) {
      const todayData = realtimeContext.currentAggregates.daily[0];
      
      if (todayData.averageOrderValue > 0) {
        opportunities.push(`Current AOV: ₹${todayData.averageOrderValue.toFixed(0)} - consider upselling strategies`);
      }

      if (todayData.uniqueProducts < 5) {
        opportunities.push('Limited product variety - expand your catalog for more sales');
      }
    }

    return opportunities;
  }

  /**
   * Analyze recent trends
   */
  private analyzeRecentTrends(events: ISalesEvent[]): string[] {
    const trends: string[] = [];

    if (events.length === 0) {
      trends.push('No recent activity to analyze');
      return trends;
    }

    // Analyze time patterns
    const hourlyActivity = new Map<number, number>();
    events.forEach(event => {
      const hour = new Date(event.eventTimestamp).getHours();
      hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1);
    });

    const peakHour = Array.from(hourlyActivity.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (peakHour) {
      trends.push(`Peak activity at ${peakHour[0]}:00 with ${peakHour[1]} events`);
    }

    // Analyze channel performance
    const channelActivity = new Map<string, number>();
    events.forEach(event => {
      channelActivity.set(event.channel, (channelActivity.get(event.channel) || 0) + 1);
    });

    const topChannel = Array.from(channelActivity.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (topChannel) {
      trends.push(`${topChannel[0]} channel leading with ${topChannel[1]} events`);
    }

    return trends;
  }

  /**
   * Assess market conditions
   */
  private assessMarketConditions(realtimeContext: NonNullable<EnhancedFinanceAdvisorInput['realtimeContext']>): string[] {
    const conditions: string[] = [];

    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const hour = now.getHours();

    if (isWeekend) {
      conditions.push('Weekend period - typically lower B2B activity');
    }

    if (hour < 9 || hour > 18) {
      conditions.push('Outside business hours - limited customer activity expected');
    } else {
      conditions.push('Business hours - optimal time for customer engagement');
    }

    // Seasonal factors
    const month = now.getMonth() + 1;
    if (month >= 10 && month <= 12) {
      conditions.push('Festival season - increased demand expected');
    }

    return conditions;
  }

  /**
   * Generate urgent recommendations
   */
  private generateUrgentRecommendations(realtimeContext: NonNullable<EnhancedFinanceAdvisorInput['realtimeContext']>): string[] {
    const urgent: string[] = [];

    if (realtimeContext.connectionState === 'offline') {
      urgent.push('Restore data connection immediately to track sales');
    }

    // Check for recent high-value orders that might need attention
    if (realtimeContext.recentEvents) {
      const highValueOrders = realtimeContext.recentEvents.filter(e => 
        e.totalAmount > 50000 && 
        (e.eventType === 'order_created' || e.eventType === 'order_paid')
      );

      if (highValueOrders.length > 0) {
        urgent.push(`${highValueOrders.length} high-value orders need attention`);
      }
    }

    return urgent;
  }

  /**
   * Generate performance-based recommendations
   */
  private generatePerformanceRecommendations(
    performance: 'excellent' | 'good' | 'average' | 'poor',
    metrics: { revenue: number; growth: number; orders: number; averageOrderValue: number }
  ): string[] {
    const recommendations: string[] = [];

    switch (performance) {
      case 'excellent':
        recommendations.push('🎉 Outstanding performance! Consider scaling your successful strategies');
        recommendations.push('Explore new product lines or markets to maintain growth');
        break;
      case 'good':
        recommendations.push('👍 Good performance! Focus on optimizing conversion rates');
        recommendations.push('Consider increasing marketing spend on successful channels');
        break;
      case 'average':
        recommendations.push('📈 Room for improvement. Analyze top-performing products');
        recommendations.push('Review pricing strategy and customer feedback');
        break;
      case 'poor':
        recommendations.push('🔍 Performance needs attention. Review product-market fit');
        recommendations.push('Consider promotional campaigns or pricing adjustments');
        break;
    }

    // Specific metric-based recommendations
    if (metrics.averageOrderValue < 2000) {
      recommendations.push('💡 Low AOV detected - implement upselling strategies');
    }

    if (metrics.orders < 5) {
      recommendations.push('📢 Low order volume - increase marketing efforts');
    }

    return recommendations;
  }
}

export default EnhancedFinanceAdvisorService;