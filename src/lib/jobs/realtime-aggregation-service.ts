import Order, { IOrderDocument } from '../models/Order';
import { SalesAggregate, ISalesAggregate } from '../models/SalesAggregate';
import connectDB from '../mongodb';
import { SalesEventService } from '../service/SalesEventService';

interface WatermarkState {
  lastProcessedOrderId: string;
  lastProcessedTimestamp: Date;
  processedCount: number;
  lastUpdated: Date;
}

interface AggregationJob {
  id: string;
  status: 'running' | 'stopped' | 'error';
  watermark: WatermarkState;
  config: {
    batchSize: number;
    pollInterval: number;
    maxRetries: number;
  };
}

export class RealtimeAggregationService {
  private job: AggregationJob;
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(jobId: string = 'default-realtime-agg') {
    this.job = {
      id: jobId,
      status: 'stopped',
      watermark: {
        lastProcessedOrderId: '',
        lastProcessedTimestamp: new Date(0),
        processedCount: 0,
        lastUpdated: new Date()
      },
      config: {
        batchSize: 100,
        pollInterval: 30000, // 30 seconds
        maxRetries: 3
      }
    };
  }

  /**
   * Start the real-time aggregation service
   */
  async start(): Promise<void> {
    if (this.job.status === 'running') {
      console.log('⚠️ Realtime aggregation service is already running');
      return;
    }

    console.log('🚀 Starting real-time aggregation service...');
    await connectDB();

    // Load existing watermark state
    await this.loadWatermarkState();

    this.job.status = 'running';

    // Start polling for new orders
    this.intervalId = setInterval(() => {
      this.processNewOrders();
    }, this.job.config.pollInterval);

    console.log(`✅ Realtime aggregation service started. Polling every ${this.job.config.pollInterval}ms`);
  }

  /**
   * Stop the real-time aggregation service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.job.status = 'stopped';
    console.log('🛑 Realtime aggregation service stopped');
  }

  /**
   * Process new orders since last watermark
   */
  private async processNewOrders(): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    this.isProcessing = true;

    try {
      // Get new orders since last watermark
      const newOrders = await this.getNewOrders();

      if (newOrders.length === 0) {
        return; // No new orders to process
      }

      console.log(`📦 Processing ${newOrders.length} new orders for aggregation`);

      // Process orders in batches
      const batches = this.chunkArray(newOrders, this.job.config.batchSize);

      for (const batch of batches) {
        await this.processOrderBatch(batch);
      }

      // Update watermark
      const lastOrder = newOrders[newOrders.length - 1];
      this.job.watermark.lastProcessedOrderId = lastOrder._id.toString();
      this.job.watermark.lastProcessedTimestamp = lastOrder.createdAt;
      this.job.watermark.processedCount += newOrders.length;
      this.job.watermark.lastUpdated = new Date();

      // Save watermark state
      await this.saveWatermarkState();

      console.log(`✅ Processed ${newOrders.length} orders. Watermark updated to ${this.job.watermark.lastProcessedOrderId}`);

    } catch (error) {
      console.error('❌ Error processing new orders:', error);
      this.job.status = 'error';
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get new orders since last watermark
   */
  private async getNewOrders(): Promise<IOrderDocument[]> {
    const query: any = {
      status: { $ne: 'cancelled' },
      createdAt: { $gt: this.job.watermark.lastProcessedTimestamp }
    };

    // If we have a last processed order ID, use it to avoid duplicates
    if (this.job.watermark.lastProcessedOrderId) {
      query._id = { $gt: this.job.watermark.lastProcessedOrderId };
    }

    return await Order.find(query)
      .sort({ createdAt: 1, _id: 1 })
      .limit(1000) // Safety limit
      .lean();
  }

  /**
   * Process a batch of orders
   */
  private async processOrderBatch(orders: IOrderDocument[]): Promise<void> {
    const aggregatesMap = new Map<string, Partial<ISalesAggregate>>();

    // Process each order
    for (const order of orders) {
      await this.processOrderForAggregates(order, aggregatesMap);
    }

    // Bulk upsert aggregates
    await this.bulkUpsertAggregates(aggregatesMap);

    // TODO: Emit aggregation events when SalesEventService supports it
    // try {
    //   const salesEventService = SalesEventService.getInstance();
    //   await salesEventService.emitAggregationUpdatedEvents(orders.length);
    // } catch (error) {
    //   console.error('Error emitting aggregation events:', error);
    // }
  }

  /**
   * Process a single order for all aggregation levels
   */
  private async processOrderForAggregates(
    order: IOrderDocument,
    aggregatesMap: Map<string, Partial<ISalesAggregate>>
  ): Promise<void> {
    const orderDate = order.createdAt;
    const periods = ['daily', 'weekly', 'monthly', 'yearly'] as const;

    for (const period of periods) {
      const periodInfo = this.getPeriodInfo(orderDate, period);

      // Process aggregates for each artisan in the order
      const artisanIds = [...new Set(order.items.map(item => item.artisanId))];

      for (const artisanId of artisanIds) {
        // Artisan-level aggregate
        await this.addToAggregate(aggregatesMap, {
          artisanId,
          period,
          periodKey: periodInfo.key,
          periodStart: periodInfo.start,
          periodEnd: periodInfo.end,
          order,
          level: 'artisan'
        });

        // Product-level aggregates
        const artisanItems = order.items.filter(item => item.artisanId === artisanId);
        for (const item of artisanItems) {
          await this.addToAggregate(aggregatesMap, {
            artisanId,
            productId: item.productId,
            period,
            periodKey: periodInfo.key,
            periodStart: periodInfo.start,
            periodEnd: periodInfo.end,
            order,
            item,
            level: 'product'
          });
        }
      }
    }
  }

  /**
   * Add order data to aggregate map
   */
  private async addToAggregate(
    aggregatesMap: Map<string, Partial<ISalesAggregate>>,
    params: {
      artisanId: string;
      productId?: string;
      period: 'daily' | 'weekly' | 'monthly' | 'yearly';
      periodKey: string;
      periodStart: Date;
      periodEnd: Date;
      order: IOrderDocument;
      item?: any;
      level: 'artisan' | 'product';
    }
  ): Promise<void> {
    const key = `${params.artisanId}-${params.productId || 'null'}-${params.period}-${params.periodKey}`;

    // Check if aggregate already exists in map
    let existing = aggregatesMap.get(key);

    if (!existing) {
      // Try to find existing aggregate in database
      const dbAggregate = await SalesAggregate.findOne({
        artisanId: params.artisanId,
        productId: params.productId || null,
        period: params.period,
        periodKey: params.periodKey
      }).lean();

      if (dbAggregate) {
        existing = dbAggregate as Partial<ISalesAggregate>;
      }

      if (!existing) {
        // Create new aggregate
        existing = {
          artisanId: params.artisanId,
          productId: params.productId,
          period: params.period,
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
          periodKey: params.periodKey,
          totalRevenue: 0,
          netRevenue: 0,
          totalOrders: 0,
          totalQuantity: 0,
          averageOrderValue: 0,
          uniqueProducts: 0,
          channelBreakdown: {
            web: 0,
            mobile: 0,
            marketplace: 0,
            direct: 0,
            social: 0
          },
          dataCompleteness: 100,
          processingVersion: '1.0',
          watermark: params.order.createdAt,
          lastUpdated: new Date()
        };
      }
    }

    // Update metrics based on order data
    const orderRevenue = params.item ? params.item.subtotal : params.order.orderSummary.totalAmount;
    const orderQuantity = params.item ? params.item.quantity : params.order.items.reduce((sum, i) => sum + i.quantity, 0);

    existing.totalRevenue! += orderRevenue;
    existing.netRevenue! += orderRevenue;
    existing.totalOrders! += 1;
    existing.totalQuantity! += orderQuantity;

    // Update channel breakdown
    existing.channelBreakdown!.web += orderRevenue;

    // Update unique products for artisan-level aggregates
    if (params.level === 'artisan') {
      const uniqueProductIds = new Set(params.order.items.map(i => i.productId));
      existing.uniqueProducts = Math.max(existing.uniqueProducts!, uniqueProductIds.size);
    }

    // Calculate average order value
    if (existing.totalOrders! > 0) {
      existing.averageOrderValue = existing.totalRevenue! / existing.totalOrders!;
    }

    // Update watermark
    if (params.order.createdAt > existing.watermark!) {
      existing.watermark = params.order.createdAt;
    }

    aggregatesMap.set(key, existing);
  }

  /**
   * Bulk upsert aggregates to database
   */
  private async bulkUpsertAggregates(aggregatesMap: Map<string, Partial<ISalesAggregate>>): Promise<void> {
    const bulkOps = [];

    for (const aggregate of aggregatesMap.values()) {
      bulkOps.push({
        updateOne: {
          filter: {
            artisanId: aggregate.artisanId,
            productId: aggregate.productId || null,
            period: aggregate.period,
            periodKey: aggregate.periodKey
          },
          update: {
            ...aggregate,
            lastUpdated: new Date()
          },
          upsert: true,
          setDefaultsOnInsert: true
        }
      });
    }

    if (bulkOps.length > 0) {
      const result = await SalesAggregate.bulkWrite(bulkOps, { ordered: false });
      console.log(`💾 Real-time aggregation: upserted ${result.upsertedCount} new and ${result.modifiedCount} existing aggregates`);
    }
  }

  /**
   * Get period information for a given date and period type
   */
  private getPeriodInfo(date: Date, period: 'daily' | 'weekly' | 'monthly' | 'yearly') {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const week = this.getWeekNumber(date);

    switch (period) {
      case 'daily':
        return {
          key: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          start: new Date(year, month, day),
          end: new Date(year, month, day, 23, 59, 59, 999)
        };

      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return {
          key: `${year}-W${String(week).padStart(2, '0')}`,
          start: weekStart,
          end: weekEnd
        };

      case 'monthly':
        return {
          key: `${year}-${String(month + 1).padStart(2, '0')}`,
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0, 23, 59, 59, 999)
        };

      case 'yearly':
        return {
          key: `${year}`,
          start: new Date(year, 0, 1),
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
   * Load watermark state from database
   */
  private async loadWatermarkState(): Promise<void> {
    // In a real implementation, you'd load this from a database collection
    // For now, we'll use a simple approach
    try {
      const latestAggregate = await SalesAggregate.findOne()
        .sort({ watermark: -1 })
        .lean() as ISalesAggregate | null;

      if (latestAggregate && latestAggregate.watermark) {
        this.job.watermark.lastProcessedTimestamp = latestAggregate.watermark;
        console.log(`📚 Loaded watermark from ${this.job.watermark.lastProcessedTimestamp}`);
      }
    } catch (error) {
      console.error('Error loading watermark state:', error);
    }
  }

  /**
   * Save watermark state to database
   */
  private async saveWatermarkState(): Promise<void> {
    // In a real implementation, you'd save this to a database collection
    // For now, we'll just log it
    console.log(`💾 Watermark saved: ${this.job.watermark.lastProcessedOrderId} at ${this.job.watermark.lastProcessedTimestamp}`);
  }

  /**
   * Utility function to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get current service status
   */
  getStatus() {
    return {
      id: this.job.id,
      status: this.job.status,
      watermark: this.job.watermark,
      config: this.job.config,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<AggregationJob['config']>) {
    this.job.config = { ...this.job.config, ...config };
    console.log('⚙️ Realtime aggregation service config updated:', this.job.config);
  }
}

// Singleton instance
let realtimeAggregationService: RealtimeAggregationService | null = null;

/**
 * Get the singleton instance of the realtime aggregation service
 */
export function getRealtimeAggregationService(): RealtimeAggregationService {
  if (!realtimeAggregationService) {
    realtimeAggregationService = new RealtimeAggregationService();
  }
  return realtimeAggregationService;
}

/**
 * Start the realtime aggregation service
 */
export async function startRealtimeAggregation(): Promise<void> {
  const service = getRealtimeAggregationService();
  await service.start();
}

/**
 * Stop the realtime aggregation service
 */
export function stopRealtimeAggregation(): void {
  if (realtimeAggregationService) {
    realtimeAggregationService.stop();
  }
}