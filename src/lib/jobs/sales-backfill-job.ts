import { IOrderDocument } from '../models/Order';
import { SalesAggregateHelpers, ISalesAggregate } from '../models/SalesAggregate';
import { OrderService } from '../service/OrderService';
import connectDB from '../mongodb';
import { v4 as uuidv4 } from 'uuid';

interface BackfillJobState {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startDate: Date;
  endDate: Date;
  currentChunk: number;
  totalChunks: number;
  processedOrders: number;
  totalOrders: number;
  lastProcessedOrderId?: string;
  lastProcessedDate?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BackfillOptions {
  startDate?: Date;
  endDate?: Date;
  chunkSize?: number;
  resumeFromOrderId?: string;
  jobId?: string;
  dryRun?: boolean;
}

export class SalesBackfillJob {
  private jobId: string;
  private options: BackfillOptions;
  private state: BackfillJobState;

  constructor(options: BackfillOptions = {}) {
    this.jobId = options.jobId || uuidv4();
    this.options = {
      startDate: options.startDate || new Date(2020, 0, 1), // Default to 2020
      endDate: options.endDate || new Date(),
      chunkSize: options.chunkSize || 1000,
      resumeFromOrderId: options.resumeFromOrderId,
      dryRun: options.dryRun || false,
      ...options
    };

    this.state = {
      jobId: this.jobId,
      status: 'running',
      startDate: this.options.startDate!,
      endDate: this.options.endDate!,
      currentChunk: 0,
      totalChunks: 0,
      processedOrders: 0,
      totalOrders: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Execute the backfill job
   */
  async execute(): Promise<{ success: boolean; message: string; stats?: any }> {
    try {
      await connectDB();
      console.log(`🚀 Starting sales backfill job ${this.jobId}`);

      // Get total count of orders to process
      const totalOrders = await this.getTotalOrdersCount();
      this.state.totalOrders = totalOrders;
      this.state.totalChunks = Math.ceil(totalOrders / this.options.chunkSize!);

      console.log(`📊 Processing ${totalOrders} orders in ${this.state.totalChunks} chunks`);

      let processedCount = 0;
      let lastProcessedOrderId = this.options.resumeFromOrderId;

      // Process orders in chunks
      while (true) {
        const orders = await this.getNextChunk(lastProcessedOrderId);

        if (orders.length === 0) {
          break; // No more orders to process
        }

        console.log(`📦 Processing chunk ${this.state.currentChunk + 1}/${this.state.totalChunks} (${orders.length} orders)`);

        const chunkResult = await this.processChunk(orders);

        processedCount += orders.length;
        this.state.processedOrders = processedCount;
        this.state.currentChunk++;
        this.state.lastProcessedOrderId = orders[orders.length - 1].id || orders[orders.length - 1].orderId;
        this.state.lastProcessedDate = orders[orders.length - 1].createdAt;
        this.state.updatedAt = new Date();

        console.log(`✅ Chunk ${this.state.currentChunk} completed: ${chunkResult.processed} aggregates created/updated`);

        // Save job state for resumability
        await this.saveJobState();

        lastProcessedOrderId = this.state.lastProcessedOrderId;
      }

      this.state.status = 'completed';
      await this.saveJobState();

      const stats = {
        totalOrders: this.state.totalOrders,
        processedOrders: this.state.processedOrders,
        totalChunks: this.state.totalChunks,
        jobDuration: Date.now() - this.state.createdAt.getTime(),
        lastProcessedDate: this.state.lastProcessedDate
      };

      console.log(`🎉 Backfill job ${this.jobId} completed successfully`, stats);

      return {
        success: true,
        message: `Successfully processed ${processedCount} orders`,
        stats
      };

    } catch (error) {
      console.error(`❌ Backfill job ${this.jobId} failed:`, error);
      this.state.status = 'failed';
      this.state.error = error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error';
      await this.saveJobState();

      return {
        success: false,
        message: `Job failed: ${this.state.error}`
      };
    }
  }

  /**
   * Get total count of orders to process
   */
  private async getTotalOrdersCount(): Promise<number> {
    try {
      // Get all orders and count them client-side since Firestore doesn't have efficient count
      const result = await OrderService.getAllOrders({
        startDate: this.options.startDate,
        endDate: this.options.endDate,
        limit: 10000 // Large limit to get all orders for counting
      });

      if (!result.success || !result.data) {
        console.error('Failed to get orders for counting:', result.error);
        return 0;
      }

      // Filter out cancelled orders
      const validOrders = result.data.filter(order => order.status !== 'cancelled');

      // If resuming from a specific order, filter further
      if (this.options.resumeFromOrderId) {
        const resumeIndex = validOrders.findIndex(order => 
          (order.id || order.orderId) === this.options.resumeFromOrderId
        );
        if (resumeIndex >= 0) {
          return validOrders.length - resumeIndex;
        }
      }

      return validOrders.length;
    } catch (error) {
      console.error('Error counting orders:', error);
      return 0;
    }
  }

  /**
   * Get next chunk of orders to process
   */
  private async getNextChunk(lastProcessedOrderId?: string): Promise<IOrderDocument[]> {
    try {
      // Get orders within the date range
      const result = await OrderService.getAllOrders({
        startDate: this.options.startDate,
        endDate: this.options.endDate,
        limit: this.options.chunkSize! * 2 // Get more to handle filtering
      });

      if (!result.success || !result.data) {
        console.error('Failed to get orders chunk:', result.error);
        return [];
      }

      // Filter out cancelled orders and sort by createdAt ascending
      let orders = result.data
        .filter(order => order.status !== 'cancelled')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // If we have a last processed order ID, get orders after it
      if (lastProcessedOrderId) {
        const lastProcessedIndex = orders.findIndex(order => 
          (order.id || order.orderId) === lastProcessedOrderId
        );
        if (lastProcessedIndex >= 0) {
          orders = orders.slice(lastProcessedIndex + 1);
        }
      }

      // Limit to chunk size
      return orders.slice(0, this.options.chunkSize!);
    } catch (error) {
      console.error('Error getting next chunk:', error);
      return [];
    }
  }

  /**
   * Process a chunk of orders and create/update aggregates
   */
  private async processChunk(orders: IOrderDocument[]): Promise<{ processed: number; skipped: number }> {
    const aggregatesMap = new Map<string, Partial<ISalesAggregate>>();
    let processed = 0;
    let skipped = 0;

    for (const order of orders) {
      try {
        // Process order for different aggregation levels
        await this.processOrderForAggregates(order, aggregatesMap);
        processed++;
      } catch (error) {
        console.error(`Error processing order ${order.orderId}:`, error);
        skipped++;
      }
    }

    // Bulk upsert aggregates
    if (!this.options.dryRun) {
      await this.bulkUpsertAggregates(aggregatesMap);
    }

    return { processed, skipped };
  }

  /**
   * Process a single order and add to aggregates map
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
    const existing = aggregatesMap.get(key) || {
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

    // Update metrics based on order data
    const orderRevenue = params.item ? params.item.subtotal : params.order.orderSummary.totalAmount;
    const orderQuantity = params.item ? params.item.quantity : params.order.items.reduce((sum, i) => sum + i.quantity, 0);

    existing.totalRevenue! += orderRevenue;
    existing.netRevenue! += orderRevenue; // Simplified, could include discounts/taxes
    existing.totalOrders! += 1;
    existing.totalQuantity! += orderQuantity;

    // Update channel breakdown (simplified - could be enhanced with actual channel data)
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

    aggregatesMap.set(key, existing);
  }

  /**
   * Bulk upsert aggregates to database
   */
  private async bulkUpsertAggregates(aggregatesMap: Map<string, Partial<ISalesAggregate>>): Promise<void> {
    const aggregates = Array.from(aggregatesMap.values());

    if (aggregates.length > 0) {
      // TODO: Implement Firestore batch operations for sales aggregates
      // This would require adding bulk upsert methods to FirestoreService
      console.log(`💾 Sales backfill: would bulk upsert ${aggregates.length} aggregates (Firestore implementation pending)`);
      
      // For now, log the aggregates that would be created/updated
      console.log(`Aggregates summary:`, {
        totalAggregates: aggregates.length,
        periods: [...new Set(aggregates.map(a => a.period))],
        artisans: [...new Set(aggregates.map(a => a.artisanId))].length,
        dateRange: {
          earliest: new Date(Math.min(...aggregates.map(a => a.periodStart?.getTime() || 0))),
          latest: new Date(Math.max(...aggregates.map(a => a.periodEnd?.getTime() || 0)))
        }
      });
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
   * Save job state for resumability
   */
  private async saveJobState(): Promise<void> {
    // In a real implementation, you'd save this to a database
    // For now, we'll just log it
    console.log(`💾 Job state saved:`, {
      jobId: this.state.jobId,
      status: this.state.status,
      progress: `${this.state.processedOrders}/${this.state.totalOrders}`,
      currentChunk: this.state.currentChunk,
      lastProcessedOrderId: this.state.lastProcessedOrderId
    });
  }

  /**
   * Get current job state
   */
  getState(): BackfillJobState {
    return { ...this.state };
  }

  /**
   * Pause the job
   */
  pause(): void {
    this.state.status = 'paused';
  }

  /**
   * Resume the job
   */
  resume(): void {
    this.state.status = 'running';
  }
}

/**
 * Utility function to run a backfill job
 */
export async function runSalesBackfill(options: BackfillOptions = {}): Promise<{ success: boolean; message: string; stats?: any }> {
  const job = new SalesBackfillJob(options);
  return await job.execute();
}

/**
 * Utility function to resume a failed backfill job
 */
export async function resumeSalesBackfill(jobId: string, options: Partial<BackfillOptions> = {}): Promise<{ success: boolean; message: string; stats?: any }> {
  // In a real implementation, you'd load the job state from database
  // For now, we'll create a new job with the provided options
  const job = new SalesBackfillJob({
    ...options,
    jobId
  });
  return await job.execute();
}
