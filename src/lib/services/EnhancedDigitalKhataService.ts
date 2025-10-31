import RealtimeFirestoreSyncService, { 
  ConnectionState, 
  SalesEventCallback, 
  SalesAggregateCallback 
} from './RealtimeFirestoreSyncService';
import RealtimeAggregationService, { AggregationPeriod } from './RealtimeAggregationService';
import { ISalesEvent } from '../models/SalesEvent';
import { ISalesAggregate } from '../models/SalesAggregate';

// Dashboard data structure
export interface DashboardData {
  currentSales: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  recentEvents: ISalesEvent[];
  aggregates: {
    daily: ISalesAggregate[];
    weekly: ISalesAggregate[];
    monthly: ISalesAggregate[];
    yearly: ISalesAggregate[];
  };
  connectionState: ConnectionState;
  lastUpdated: Date;
}

// Dashboard subscription callback
export type DashboardCallback = (data: DashboardData) => void;

/**
 * Enhanced DigitalKhata service that integrates real-time sync and aggregation
 * Provides a unified interface for the enhanced financial tracking system
 */
export class EnhancedDigitalKhataService {
  private static instance: EnhancedDigitalKhataService;
  private syncService: RealtimeFirestoreSyncService;
  private aggregationService: RealtimeAggregationService;
  private dashboardSubscriptions: Map<string, {
    artisanId: string;
    callback: DashboardCallback;
    listeners: string[];
  }> = new Map();

  private constructor() {
    this.syncService = RealtimeFirestoreSyncService.getInstance();
    this.aggregationService = RealtimeAggregationService.getInstance();
  }

  static getInstance(): EnhancedDigitalKhataService {
    if (!EnhancedDigitalKhataService.instance) {
      EnhancedDigitalKhataService.instance = new EnhancedDigitalKhataService();
    }
    return EnhancedDigitalKhataService.instance;
  }

  /**
   * Subscribe to real-time dashboard updates for an artisan
   */
  subscribeToDashboard(artisanId: string, callback: DashboardCallback): string {
    const subscriptionId = `dashboard_${artisanId}_${Date.now()}`;
    
    // Store subscription with simplified approach
    this.dashboardSubscriptions.set(subscriptionId, {
      artisanId,
      callback,
      listeners: []
    });

    // Initial data load
    this.loadInitialDashboardData(subscriptionId);

    // Set up periodic refresh every 30 seconds for real-time feel
    const refreshInterval = setInterval(async () => {
      try {
        const dashboardData = await this.getDashboardData(artisanId);
        callback(dashboardData);
      } catch (error) {
        console.error('Error refreshing dashboard data:', error);
      }
    }, 30000);

    // Store the interval for cleanup
    this.dashboardSubscriptions.get(subscriptionId)!.listeners = [refreshInterval as any];

    // Subscription created successfully
    return subscriptionId;
  }

  /**
   * Unsubscribe from dashboard updates
   */
  unsubscribeFromDashboard(subscriptionId: string): void {
    const subscription = this.dashboardSubscriptions.get(subscriptionId);
    if (!subscription) return;

    // Clear intervals
    subscription.listeners.forEach(interval => {
      if (interval && typeof interval === 'number') {
        clearInterval(interval);
      }
    });

    this.dashboardSubscriptions.delete(subscriptionId);
    // Unsubscribed successfully
  }

  /**
   * Process a new sales event (sync to Firestore and update aggregates)
   * Note: Disabled since we're using pre-populated Firestore data
   */
  async processSalesEvent(event: ISalesEvent): Promise<void> {
    try {
      console.log(`📝 Sales event received (not syncing - using existing Firestore data): ${event.id}`);
      // Sync disabled - using existing Firestore data
      // await this.syncService.syncSalesEvent(event);
      // await this.aggregationService.processSalesEvent(event);
    } catch (error) {
      console.error('Error processing sales event:', error);
      throw error;
    }
  }

  /**
   * Get current dashboard data for an artisan
   */
  async getDashboardData(artisanId: string): Promise<DashboardData> {
    try {
      // Get recent sales events from API (increased limit to get more data)
      const recentEvents = await this.fetchSalesEvents(artisanId, 50);

      // Generate simple aggregates from recent events
      const aggregates = this.generateSimpleAggregates(recentEvents);

      // Calculate current sales
      const now = new Date();
      const today = this.getDatePeriod(now, 'daily');
      const thisWeek = this.getDatePeriod(now, 'weekly');
      const thisMonth = this.getDatePeriod(now, 'monthly');
      const thisYear = this.getDatePeriod(now, 'yearly');

      const currentSales = {
        today: this.calculateSalesForPeriod(recentEvents, today.start, today.end),
        thisWeek: this.calculateSalesForPeriod(recentEvents, thisWeek.start, thisWeek.end),
        thisMonth: this.calculateSalesForPeriod(recentEvents, thisMonth.start, thisMonth.end),
        thisYear: this.calculateSalesForPeriod(recentEvents, thisYear.start, thisYear.end)
      };

      return {
        currentSales,
        recentEvents: recentEvents.slice(0, 20), // Show top 20 recent events
        aggregates,
        connectionState: 'online', // Simplified connection state
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    return this.syncService.onConnectionStateChange(callback);
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    syncService: any;
    aggregationService: any;
    dashboardSubscriptions: number;
  } {
    return {
      syncService: {
        connectionState: this.syncService.getConnectionState(),
        cachedEvents: this.syncService.getCachedSalesEvents('').length,
        cachedAggregates: this.syncService.getCachedAggregates('').length
      },
      aggregationService: this.aggregationService.getStats(),
      dashboardSubscriptions: this.dashboardSubscriptions.size
    };
  }

  /**
   * Handle sales events update for a dashboard subscription
   */
  private async handleSalesEventsUpdate(subscriptionId: string, events: ISalesEvent[]): Promise<void> {
    const subscription = this.dashboardSubscriptions.get(subscriptionId);
    if (!subscription) return;

    try {
      // Get updated dashboard data
      const dashboardData = await this.getDashboardData(subscription.artisanId);
      
      // Update recent events
      dashboardData.recentEvents = events.slice(0, 10);
      
      // Call the callback
      subscription.callback(dashboardData);
    } catch (error) {
      console.error('Error handling sales events update:', error);
    }
  }

  /**
   * Handle aggregate update for a dashboard subscription
   */
  private async handleAggregateUpdate(subscriptionId: string, aggregate: ISalesAggregate): Promise<void> {
    const subscription = this.dashboardSubscriptions.get(subscriptionId);
    if (!subscription) return;

    try {
      // Get updated dashboard data
      const dashboardData = await this.getDashboardData(subscription.artisanId);
      
      // Call the callback
      subscription.callback(dashboardData);
    } catch (error) {
      console.error('Error handling aggregate update:', error);
    }
  }

  /**
   * Load initial dashboard data for a subscription
   */
  private async loadInitialDashboardData(subscriptionId: string): Promise<void> {
    const subscription = this.dashboardSubscriptions.get(subscriptionId);
    if (!subscription) return;

    try {
      const dashboardData = await this.getDashboardData(subscription.artisanId);
      subscription.callback(dashboardData);
    } catch (error) {
      console.error('Error loading initial dashboard data:', error);
    }
  }

  /**
   * Get date period information
   */
  private getDatePeriod(date: Date, period: AggregationPeriod): { start: Date; end: Date } {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    switch (period) {
      case 'daily':
        return {
          start: new Date(year, month, day, 0, 0, 0, 0),
          end: new Date(year, month, day, 23, 59, 59, 999)
        };

      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return { start: weekStart, end: weekEnd };

      case 'monthly':
        return {
          start: new Date(year, month, 1, 0, 0, 0, 0),
          end: new Date(year, month + 1, 0, 23, 59, 59, 999)
        };

      case 'yearly':
        return {
          start: new Date(year, 0, 1, 0, 0, 0, 0),
          end: new Date(year, 11, 31, 23, 59, 59, 999)
        };
    }
  }

  /**
   * Calculate sales for a specific period
   */
  private calculateSalesForPeriod(events: ISalesEvent[], startDate: Date, endDate: Date): number {
    return events
      .filter(event => 
        event.eventTimestamp >= startDate && 
        event.eventTimestamp <= endDate &&
        (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled')
      )
      .reduce((total, event) => total + event.totalAmount, 0);
  }



  /**
   * Generate simple aggregates from sales events
   */
  private generateSimpleAggregates(events: ISalesEvent[]) {
    const now = new Date();
    const dailyAggregates: ISalesAggregate[] = [];
    const weeklyAggregates: ISalesAggregate[] = [];
    const monthlyAggregates: ISalesAggregate[] = [];
    
    // Group events by day for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.eventTimestamp);
        return eventDate.toISOString().split('T')[0] === dateKey;
      });
      
      if (dayEvents.length > 0) {
        const totalRevenue = dayEvents.reduce((sum, event) => sum + event.totalAmount, 0);
        const totalQuantity = dayEvents.reduce((sum, event) => sum + event.quantity, 0);
        
        dailyAggregates.push({
          id: `daily_${dateKey}`,
          artisanId: events[0]?.artisanId || 'dev_bulchandani_001',
          period: 'daily',
          periodKey: dateKey,
          periodStart: new Date(date.setHours(0, 0, 0, 0)),
          periodEnd: new Date(date.setHours(23, 59, 59, 999)),
          totalRevenue,
          totalOrders: dayEvents.length,
          totalQuantity,
          uniqueCustomers: new Set(dayEvents.map(e => e.buyerId)).size,
          uniqueProducts: new Set(dayEvents.map(e => e.productId)).size,
          averageOrderValue: totalRevenue / dayEvents.length,
          netRevenue: totalRevenue, // Simplified
          lastUpdated: now,
          watermark: now,
          createdAt: now,
          updatedAt: now
        });
      }
    }
    
    return {
      daily: dailyAggregates,
      weekly: weeklyAggregates,
      monthly: monthlyAggregates,
      yearly: []
    };
  }

  /**
   * Fetch sales events from API
   */
  private async fetchSalesEvents(artisanId: string, limit: number = 50): Promise<ISalesEvent[]> {
    try {
      const response = await fetch(`/api/sales-events?artisanId=${artisanId}&limit=${limit}`);
      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data)) {
        const events = result.data.map((event: any) => ({
          ...event,
          eventTimestamp: event.eventTimestamp?.seconds 
            ? new Date(event.eventTimestamp.seconds * 1000)
            : new Date(event.eventTimestamp),
          createdAt: event.createdAt?.seconds 
            ? new Date(event.createdAt.seconds * 1000)
            : new Date(event.createdAt),
          updatedAt: event.updatedAt?.seconds 
            ? new Date(event.updatedAt.seconds * 1000)
            : new Date(event.updatedAt)
        }));
        
        console.log(`✅ Fetched ${events.length} sales events for ${artisanId}`);
        return events;
      } else {
        console.warn('No sales events found or invalid response:', result);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching sales events:', error);
      return [];
    }
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    // Unsubscribe from all dashboard subscriptions
    Array.from(this.dashboardSubscriptions.keys()).forEach(subscriptionId => {
      this.unsubscribeFromDashboard(subscriptionId);
    });

    // Destroy services
    this.syncService.destroy();
    this.aggregationService.destroy();

    console.log('🧹 EnhancedDigitalKhataService destroyed');
  }
}

export default EnhancedDigitalKhataService;