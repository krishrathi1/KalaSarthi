import { Timestamp } from 'firebase/firestore';
import { FirestoreService, COLLECTIONS } from '../firestore';
import { ISalesEvent } from '../models/SalesEvent';
import { ISalesAggregate } from '../models/SalesAggregate';
import RealtimeFirestoreSyncService from './RealtimeFirestoreSyncService';

// Aggregation period types
export type AggregationPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Aggregation configuration
interface AggregationConfig {
  enableRealTimeUpdates: boolean;
  batchSize: number;
  updateInterval: number; // milliseconds
  retentionDays: number;
}

// Period calculation result
interface PeriodInfo {
  key: string;
  start: Date;
  end: Date;
}

// Aggregation metrics
interface AggregationMetrics {
  totalRevenue: number;
  netRevenue: number;
  totalOrders: number;
  totalQuantity: number;
  averageOrderValue: number;
  uniqueProducts: Set<string>;
  channelBreakdown: {
    web: number;
    mobile: number;
    marketplace: number;
    direct: number;
    social: number;
  };
  topProducts: Map<string, {
    productId: string;
    productName: string;
    revenue: number;
    units: number;
  }>;
}

// Pending aggregation update
interface PendingUpdate {
  artisanId: string;
  productId?: string;
  period: AggregationPeriod;
  periodKey: string;
  event: ISalesEvent;
  timestamp: Date;
}

/**
 * Real-time aggregation service for sales data
 * Handles efficient aggregation calculations and real-time updates
 */
export class RealtimeAggregationService {
  private static instance: RealtimeAggregationService;
  private config: AggregationConfig = {
    enableRealTimeUpdates: true,
    batchSize: 50,
    updateInterval: 5000, // 5 seconds
    retentionDays: 365
  };
  private pendingUpdates: Map<string, PendingUpdate[]> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private syncService: RealtimeFirestoreSyncService;

  private constructor() {
    this.syncService = RealtimeFirestoreSyncService.getInstance();
    this.startUpdateTimer();
  }

  static getInstance(): RealtimeAggregationService {
    if (!RealtimeAggregationService.instance) {
      RealtimeAggregationService.instance = new RealtimeAggregationService();
    }
    return RealtimeAggregationService.instance;
  }

  /**
   * Process a sales event and update aggregates in real-time
   */
  async processSalesEvent(event: ISalesEvent): Promise<void> {
    try {
      if (!this.config.enableRealTimeUpdates) {
        return;
      }

      // Generate aggregation updates for all periods
      const updates = this.generateAggregationUpdates(event);

      // Add to pending updates for batch processing
      for (const update of updates) {
        const key = this.getAggregationKey(update);
        
        if (!this.pendingUpdates.has(key)) {
          this.pendingUpdates.set(key, []);
        }
        
        this.pendingUpdates.get(key)!.push(update);
      }

      console.log(`📊 Queued ${updates.length} aggregation updates for event ${event.orderId}`);

    } catch (error) {
      console.error('Error processing sales event for aggregation:', error);
      throw error;
    }
  }

  /**
   * Update sales aggregates in real-time for a specific period
   */
  async updateAggregatesForPeriod(
    artisanId: string,
    period: AggregationPeriod,
    periodKey: string,
    events: ISalesEvent[]
  ): Promise<void> {
    try {
      // Calculate aggregation metrics
      const metrics = this.calculateMetrics(events);

      // Get period information
      const periodInfo = this.getPeriodInfo(new Date(), period);

      // Create or update artisan-level aggregate
      await this.upsertAggregate({
        artisanId,
        period,
        periodKey,
        periodStart: periodInfo.start,
        periodEnd: periodInfo.end,
        metrics,
        level: 'artisan'
      });

      // Create or update product-level aggregates
      const productGroups = this.groupEventsByProduct(events);
      
      for (const [productId, productEvents] of productGroups.entries()) {
        const productMetrics = this.calculateMetrics(productEvents);
        
        await this.upsertAggregate({
          artisanId,
          productId,
          period,
          periodKey,
          periodStart: periodInfo.start,
          periodEnd: periodInfo.end,
          metrics: productMetrics,
          level: 'product'
        });
      }

      console.log(`✅ Updated aggregates for artisan ${artisanId} (${period}: ${periodKey})`);

    } catch (error) {
      console.error('Error updating aggregates for period:', error);
      throw error;
    }
  }

  /**
   * Calculate daily aggregates for an artisan
   */
  async calculateDailyAggregates(artisanId: string, date: Date): Promise<ISalesAggregate[]> {
    const periodInfo = this.getPeriodInfo(date, 'daily');
    
    // Get sales events for the day
    const events = await this.getSalesEventsForPeriod(artisanId, periodInfo.start, periodInfo.end);
    
    if (events.length === 0) {
      return [];
    }

    const aggregates: ISalesAggregate[] = [];

    // Calculate artisan-level aggregate
    const artisanMetrics = this.calculateMetrics(events);
    const artisanAggregate = this.createAggregateDocument({
      artisanId,
      period: 'daily',
      periodKey: periodInfo.key,
      periodStart: periodInfo.start,
      periodEnd: periodInfo.end,
      metrics: artisanMetrics,
      level: 'artisan'
    });
    
    aggregates.push(artisanAggregate);

    // Calculate product-level aggregates
    const productGroups = this.groupEventsByProduct(events);
    
    for (const [productId, productEvents] of productGroups.entries()) {
      const productMetrics = this.calculateMetrics(productEvents);
      const productAggregate = this.createAggregateDocument({
        artisanId,
        productId,
        period: 'daily',
        periodKey: periodInfo.key,
        periodStart: periodInfo.start,
        periodEnd: periodInfo.end,
        metrics: productMetrics,
        level: 'product'
      });
      
      aggregates.push(productAggregate);
    }

    return aggregates;
  }

  /**
   * Calculate weekly aggregates for an artisan
   */
  async calculateWeeklyAggregates(artisanId: string, date: Date): Promise<ISalesAggregate[]> {
    const periodInfo = this.getPeriodInfo(date, 'weekly');
    
    // Get sales events for the week
    const events = await this.getSalesEventsForPeriod(artisanId, periodInfo.start, periodInfo.end);
    
    if (events.length === 0) {
      return [];
    }

    const aggregates: ISalesAggregate[] = [];

    // Calculate artisan-level aggregate
    const artisanMetrics = this.calculateMetrics(events);
    const artisanAggregate = this.createAggregateDocument({
      artisanId,
      period: 'weekly',
      periodKey: periodInfo.key,
      periodStart: periodInfo.start,
      periodEnd: periodInfo.end,
      metrics: artisanMetrics,
      level: 'artisan'
    });
    
    aggregates.push(artisanAggregate);

    // Calculate product-level aggregates
    const productGroups = this.groupEventsByProduct(events);
    
    for (const [productId, productEvents] of productGroups.entries()) {
      const productMetrics = this.calculateMetrics(productEvents);
      const productAggregate = this.createAggregateDocument({
        artisanId,
        productId,
        period: 'weekly',
        periodKey: periodInfo.key,
        periodStart: periodInfo.start,
        periodEnd: periodInfo.end,
        metrics: productMetrics,
        level: 'product'
      });
      
      aggregates.push(productAggregate);
    }

    return aggregates;
  }

  /**
   * Calculate monthly aggregates for an artisan
   */
  async calculateMonthlyAggregates(artisanId: string, date: Date): Promise<ISalesAggregate[]> {
    const periodInfo = this.getPeriodInfo(date, 'monthly');
    
    // Get sales events for the month
    const events = await this.getSalesEventsForPeriod(artisanId, periodInfo.start, periodInfo.end);
    
    if (events.length === 0) {
      return [];
    }

    const aggregates: ISalesAggregate[] = [];

    // Calculate artisan-level aggregate
    const artisanMetrics = this.calculateMetrics(events);
    const artisanAggregate = this.createAggregateDocument({
      artisanId,
      period: 'monthly',
      periodKey: periodInfo.key,
      periodStart: periodInfo.start,
      periodEnd: periodInfo.end,
      metrics: artisanMetrics,
      level: 'artisan'
    });
    
    aggregates.push(artisanAggregate);

    // Calculate product-level aggregates
    const productGroups = this.groupEventsByProduct(events);
    
    for (const [productId, productEvents] of productGroups.entries()) {
      const productMetrics = this.calculateMetrics(productEvents);
      const productAggregate = this.createAggregateDocument({
        artisanId,
        productId,
        period: 'monthly',
        periodKey: periodInfo.key,
        periodStart: periodInfo.start,
        periodEnd: periodInfo.end,
        metrics: productMetrics,
        level: 'product'
      });
      
      aggregates.push(productAggregate);
    }

    return aggregates;
  }

  /**
   * Get aggregated data for dashboard display
   */
  async getDashboardAggregates(artisanId: string): Promise<{
    daily: ISalesAggregate[];
    weekly: ISalesAggregate[];
    monthly: ISalesAggregate[];
    yearly: ISalesAggregate[];
  }> {
    const now = new Date();
    
    const [daily, weekly, monthly, yearly] = await Promise.all([
      this.calculateDailyAggregates(artisanId, now),
      this.calculateWeeklyAggregates(artisanId, now),
      this.calculateMonthlyAggregates(artisanId, now),
      this.getYearlyAggregates(artisanId, now.getFullYear())
    ]);

    return { daily, weekly, monthly, yearly };
  }

  /**
   * Generate aggregation updates for a sales event
   */
  private generateAggregationUpdates(event: ISalesEvent): PendingUpdate[] {
    const updates: PendingUpdate[] = [];
    const periods: AggregationPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];

    for (const period of periods) {
      const periodInfo = this.getPeriodInfo(event.eventTimestamp, period);

      // Artisan-level update
      updates.push({
        artisanId: event.artisanId,
        period,
        periodKey: periodInfo.key,
        event,
        timestamp: new Date()
      });

      // Product-level update
      updates.push({
        artisanId: event.artisanId,
        productId: event.productId,
        period,
        periodKey: periodInfo.key,
        event,
        timestamp: new Date()
      });
    }

    return updates;
  }

  /**
   * Calculate aggregation metrics from sales events
   */
  private calculateMetrics(events: ISalesEvent[]): AggregationMetrics {
    const metrics: AggregationMetrics = {
      totalRevenue: 0,
      netRevenue: 0,
      totalOrders: 0,
      totalQuantity: 0,
      averageOrderValue: 0,
      uniqueProducts: new Set(),
      channelBreakdown: {
        web: 0,
        mobile: 0,
        marketplace: 0,
        direct: 0,
        social: 0
      },
      topProducts: new Map()
    };

    // Filter only completed sales events
    const completedEvents = events.filter(event => 
      event.eventType === 'order_paid' || event.eventType === 'order_fulfilled'
    );

    for (const event of completedEvents) {
      // Basic metrics
      metrics.totalRevenue += event.totalAmount;
      metrics.netRevenue += event.netRevenue;
      metrics.totalOrders += 1;
      metrics.totalQuantity += event.quantity;

      // Unique products
      metrics.uniqueProducts.add(event.productId);

      // Channel breakdown
      if (metrics.channelBreakdown[event.channel] !== undefined) {
        metrics.channelBreakdown[event.channel] += event.totalAmount;
      }

      // Top products
      const productKey = event.productId;
      const existing = metrics.topProducts.get(productKey);
      
      if (existing) {
        existing.revenue += event.totalAmount;
        existing.units += event.quantity;
      } else {
        metrics.topProducts.set(productKey, {
          productId: event.productId,
          productName: event.productName,
          revenue: event.totalAmount,
          units: event.quantity
        });
      }
    }

    // Calculate average order value
    if (metrics.totalOrders > 0) {
      metrics.averageOrderValue = metrics.totalRevenue / metrics.totalOrders;
    }

    return metrics;
  }

  /**
   * Create aggregate document from metrics
   */
  private createAggregateDocument(params: {
    artisanId: string;
    productId?: string;
    period: AggregationPeriod;
    periodKey: string;
    periodStart: Date;
    periodEnd: Date;
    metrics: AggregationMetrics;
    level: 'artisan' | 'product';
  }): ISalesAggregate {
    const topProductsArray = Array.from(params.metrics.topProducts.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      artisanId: params.artisanId,
      productId: params.productId,
      period: params.period,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      periodKey: params.periodKey,
      totalRevenue: Math.round(params.metrics.totalRevenue * 100) / 100,
      netRevenue: Math.round(params.metrics.netRevenue * 100) / 100,
      totalOrders: params.metrics.totalOrders,
      totalQuantity: params.metrics.totalQuantity,
      averageOrderValue: Math.round(params.metrics.averageOrderValue * 100) / 100,
      uniqueProducts: params.metrics.uniqueProducts.size,
      topSellingProduct: topProductsArray[0]?.productId,
      topSellingProductRevenue: topProductsArray[0]?.revenue,
      channelBreakdown: params.metrics.channelBreakdown,
      dataCompleteness: 100,
      lastUpdated: new Date(),
      processingVersion: '1.0',
      watermark: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Upsert aggregate document to Firestore
   */
  private async upsertAggregate(params: {
    artisanId: string;
    productId?: string;
    period: AggregationPeriod;
    periodKey: string;
    periodStart: Date;
    periodEnd: Date;
    metrics: AggregationMetrics;
    level: 'artisan' | 'product';
  }): Promise<void> {
    const aggregate = this.createAggregateDocument(params);
    
    // Generate document ID for idempotency
    const docId = this.generateAggregateId(
      params.artisanId,
      params.productId,
      params.period,
      params.periodKey
    );

    // Convert dates to Firestore timestamps
    const firestoreAggregate = {
      ...aggregate,
      periodStart: Timestamp.fromDate(aggregate.periodStart),
      periodEnd: Timestamp.fromDate(aggregate.periodEnd),
      lastUpdated: Timestamp.fromDate(aggregate.lastUpdated),
      watermark: Timestamp.fromDate(aggregate.watermark),
      createdAt: Timestamp.fromDate(aggregate.createdAt),
      updatedAt: Timestamp.fromDate(aggregate.updatedAt)
    };

    await FirestoreService.set(COLLECTIONS.SALES_AGGREGATES, docId, firestoreAggregate, true);
  }

  /**
   * Get period information for a date and period type
   */
  private getPeriodInfo(date: Date, period: AggregationPeriod): PeriodInfo {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    switch (period) {
      case 'daily':
        return {
          key: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
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
        
        const weekNumber = this.getWeekNumber(date);
        
        return {
          key: `${year}-W${String(weekNumber).padStart(2, '0')}`,
          start: weekStart,
          end: weekEnd
        };

      case 'monthly':
        return {
          key: `${year}-${String(month + 1).padStart(2, '0')}`,
          start: new Date(year, month, 1, 0, 0, 0, 0),
          end: new Date(year, month + 1, 0, 23, 59, 59, 999)
        };

      case 'yearly':
        return {
          key: `${year}`,
          start: new Date(year, 0, 1, 0, 0, 0, 0),
          end: new Date(year, 11, 31, 23, 59, 59, 999)
        };
    }
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Group events by product
   */
  private groupEventsByProduct(events: ISalesEvent[]): Map<string, ISalesEvent[]> {
    const groups = new Map<string, ISalesEvent[]>();
    
    for (const event of events) {
      if (!groups.has(event.productId)) {
        groups.set(event.productId, []);
      }
      groups.get(event.productId)!.push(event);
    }
    
    return groups;
  }

  /**
   * Get sales events for a specific period
   */
  private async getSalesEventsForPeriod(
    artisanId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ISalesEvent[]> {
    // This would typically query Firestore, but for now we'll use the sync service cache
    const cachedEvents = this.syncService.getCachedSalesEvents(artisanId);
    
    return cachedEvents.filter(event => 
      event.eventTimestamp >= startDate && 
      event.eventTimestamp <= endDate
    );
  }

  /**
   * Get yearly aggregates
   */
  private async getYearlyAggregates(artisanId: string, year: number): Promise<ISalesAggregate[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    
    const events = await this.getSalesEventsForPeriod(artisanId, startDate, endDate);
    
    if (events.length === 0) {
      return [];
    }

    const aggregates: ISalesAggregate[] = [];
    const periodInfo = this.getPeriodInfo(new Date(year, 0, 1), 'yearly');

    // Calculate artisan-level aggregate
    const artisanMetrics = this.calculateMetrics(events);
    const artisanAggregate = this.createAggregateDocument({
      artisanId,
      period: 'yearly',
      periodKey: periodInfo.key,
      periodStart: periodInfo.start,
      periodEnd: periodInfo.end,
      metrics: artisanMetrics,
      level: 'artisan'
    });
    
    aggregates.push(artisanAggregate);

    return aggregates;
  }

  /**
   * Generate unique aggregate document ID
   */
  private generateAggregateId(
    artisanId: string,
    productId: string | undefined,
    period: AggregationPeriod,
    periodKey: string
  ): string {
    const productPart = productId ? `_${productId}` : '';
    return `${artisanId}${productPart}_${period}_${periodKey}`;
  }

  /**
   * Get aggregation key for pending updates
   */
  private getAggregationKey(update: PendingUpdate): string {
    return this.generateAggregateId(
      update.artisanId,
      update.productId,
      update.period,
      update.periodKey
    );
  }

  /**
   * Start the update timer for batch processing
   */
  private startUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.processPendingUpdates();
    }, this.config.updateInterval);
  }

  /**
   * Process pending aggregation updates in batches
   */
  private async processPendingUpdates(): Promise<void> {
    if (this.isProcessing || this.pendingUpdates.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const updatePromises: Promise<void>[] = [];
      const processedKeys: string[] = [];

      for (const [key, updates] of this.pendingUpdates.entries()) {
        if (updatePromises.length >= this.config.batchSize) {
          break;
        }

        // Group updates by artisan and period
        const groupedUpdates = this.groupUpdatesByArtisanAndPeriod(updates);
        
        for (const [groupKey, groupUpdates] of groupedUpdates.entries()) {
          const [artisanId, period, periodKey] = groupKey.split('_');
          const events = groupUpdates.map(u => u.event);
          
          updatePromises.push(
            this.updateAggregatesForPeriod(
              artisanId,
              period as AggregationPeriod,
              periodKey,
              events
            )
          );
        }

        processedKeys.push(key);
      }

      // Execute updates
      await Promise.allSettled(updatePromises);

      // Remove processed updates
      for (const key of processedKeys) {
        this.pendingUpdates.delete(key);
      }

      if (processedKeys.length > 0) {
        console.log(`✅ Processed ${processedKeys.length} aggregation update batches`);
      }

    } catch (error) {
      console.error('Error processing pending aggregation updates:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Group updates by artisan and period
   */
  private groupUpdatesByArtisanAndPeriod(updates: PendingUpdate[]): Map<string, PendingUpdate[]> {
    const groups = new Map<string, PendingUpdate[]>();
    
    for (const update of updates) {
      const key = `${update.artisanId}_${update.period}_${update.periodKey}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      
      groups.get(key)!.push(update);
    }
    
    return groups;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AggregationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart timer if interval changed
    if (newConfig.updateInterval) {
      this.startUpdateTimer();
    }
    
    console.log('⚙️ Aggregation service configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): AggregationConfig {
    return { ...this.config };
  }

  /**
   * Get service statistics
   */
  getStats(): {
    pendingUpdates: number;
    isProcessing: boolean;
    config: AggregationConfig;
  } {
    return {
      pendingUpdates: this.pendingUpdates.size,
      isProcessing: this.isProcessing,
      config: this.config
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.pendingUpdates.clear();
    this.isProcessing = false;

    console.log('🧹 RealtimeAggregationService destroyed');
  }
}

export default RealtimeAggregationService;