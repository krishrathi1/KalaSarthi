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
    
    // Set up listeners for sales events and aggregates
    const salesEventsListener = this.syncService.subscribeToSalesEvents(
      artisanId,
      (events) => this.handleSalesEventsUpdate(subscriptionId, events),
      { limit: 50 }
    );

    const dailyAggregatesListener = this.syncService.subscribeToSalesAggregates(
      artisanId,
      'daily',
      (aggregate) => this.handleAggregateUpdate(subscriptionId, aggregate),
      { limit: 30 }
    );

    const weeklyAggregatesListener = this.syncService.subscribeToSalesAggregates(
      artisanId,
      'weekly',
      (aggregate) => this.handleAggregateUpdate(subscriptionId, aggregate),
      { limit: 12 }
    );

    const monthlyAggregatesListener = this.syncService.subscribeToSalesAggregates(
      artisanId,
      'monthly',
      (aggregate) => this.handleAggregateUpdate(subscriptionId, aggregate),
      { limit: 12 }
    );

    // Store subscription
    this.dashboardSubscriptions.set(subscriptionId, {
      artisanId,
      callback,
      listeners: [
        salesEventsListener,
        dailyAggregatesListener,
        weeklyAggregatesListener,
        monthlyAggregatesListener
      ]
    });

    // Initial data load
    this.loadInitialDashboardData(subscriptionId);

    console.log(`📊 Subscribed to dashboard updates for artisan ${artisanId} (${subscriptionId})`);
    return subscriptionId;
  }

  /**
   * Unsubscribe from dashboard updates
   */
  unsubscribeFromDashboard(subscriptionId: string): void {
    const subscription = this.dashboardSubscriptions.get(subscriptionId);
    if (!subscription) return;

    // Unsubscribe from all listeners
    subscription.listeners.forEach(listenerId => {
      this.syncService.unsubscribe(listenerId);
    });

    this.dashboardSubscriptions.delete(subscriptionId);
    console.log(`🔇 Unsubscribed from dashboard updates: ${subscriptionId}`);
  }

  /**
   * Process a new sales event (sync to Firestore and update aggregates)
   */
  async processSalesEvent(event: ISalesEvent): Promise<void> {
    try {
      // Sync to Firestore
      await this.syncService.syncSalesEvent(event);

      // Update aggregates
      await this.aggregationService.processSalesEvent(event);

      console.log(`✅ Processed sales event: ${event.orderId}`);
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
      // Get recent sales events
      const recentEvents = this.syncService.getCachedSalesEvents(artisanId)
        .slice(0, 10);

      // Get aggregates
      const aggregates = await this.aggregationService.getDashboardAggregates(artisanId);

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
        recentEvents,
        aggregates,
        connectionState: this.syncService.getConnectionState(),
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