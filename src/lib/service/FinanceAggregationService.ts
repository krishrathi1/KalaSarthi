import { SalesEvent, ISalesEvent } from '../models/SalesEvent';
import { SalesAggregate, ISalesAggregate } from '../models/SalesAggregate';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, subDays, subWeeks, subMonths, subYears } from 'date-fns';

export interface AggregationOptions {
  artisanId: string;
  startDate: Date;
  endDate: Date;
  periods: ('daily' | 'weekly' | 'monthly' | 'yearly')[];
  forceRecalculate?: boolean;
  batchSize?: number;
}

export interface AggregationResult {
  success: boolean;
  processedPeriods: number;
  errors: string[];
  processingTime: number;
  watermark: Date;
}

export class FinanceAggregationService {
  private static instance: FinanceAggregationService;
  private processingVersion = '1.0';
  private defaultBatchSize = 100;

  static getInstance(): FinanceAggregationService {
    if (!FinanceAggregationService.instance) {
      FinanceAggregationService.instance = new FinanceAggregationService();
    }
    return FinanceAggregationService.instance;
  }

  /**
   * Main aggregation orchestrator
   */
  async aggregateFinancialData(options: AggregationOptions): Promise<AggregationResult> {
    const startTime = Date.now();
    const result: AggregationResult = {
      success: true,
      processedPeriods: 0,
      errors: [],
      processingTime: 0,
      watermark: new Date()
    };

    try {
      console.log(`Starting financial aggregation for artisan ${options.artisanId}`);
      
      for (const period of options.periods) {
        try {
          const periodResult = await this.aggregatePeriod(
            options.artisanId,
            period,
            options.startDate,
            options.endDate,
            options.forceRecalculate || false,
            options.batchSize || this.defaultBatchSize
          );
          
          result.processedPeriods += periodResult.processedCount;
          
          if (periodResult.errors.length > 0) {
            result.errors.push(...periodResult.errors);
          }
          
        } catch (error) {
          const errorMsg = `Failed to aggregate ${period} data: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }

      // Calculate growth metrics after all periods are processed
      if (result.errors.length === 0) {
        await this.calculateGrowthMetrics(options.artisanId, options.periods);
      }

      result.success = result.errors.length === 0;
      result.processingTime = Date.now() - startTime;
      result.watermark = new Date();

      console.log(`Aggregation completed in ${result.processingTime}ms. Processed ${result.processedPeriods} periods with ${result.errors.length} errors.`);
      
    } catch (error) {
      result.success = false;
      result.errors.push(`Aggregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.processingTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Aggregate data for a specific period
   */
  private async aggregatePeriod(
    artisanId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date,
    endDate: Date,
    forceRecalculate: boolean,
    batchSize: number
  ): Promise<{ processedCount: number; errors: string[] }> {
    const periods = this.generatePeriods(period, startDate, endDate);
    const errors: string[] = [];
    let processedCount = 0;

    for (const periodInfo of periods) {
      try {
        // Check if aggregate already exists and is up to date
        if (!forceRecalculate) {
          const existing = await SalesAggregate.findOne({
            artisanId,
            period,
            periodKey: periodInfo.key,
            productId: null, // Artisan-level aggregate
            channel: null
          });

          if (existing && existing.watermark >= periodInfo.end) {
            continue; // Skip if already processed and up to date
          }
        }

        // Aggregate artisan-level data
        await this.createArtisanAggregate(artisanId, period, periodInfo);
        
        // Aggregate product-level data
        await this.createProductAggregates(artisanId, period, periodInfo);
        
        // Aggregate channel-level data
        await this.createChannelAggregates(artisanId, period, periodInfo);

        processedCount++;
        
      } catch (error) {
        const errorMsg = `Failed to process ${period} period ${periodInfo.key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return { processedCount, errors };
  }

  /**
   * Create artisan-level aggregate
   */
  private async createArtisanAggregate(
    artisanId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    periodInfo: { start: Date; end: Date; key: string }
  ): Promise<void> {
    const events = await SalesEvent.find({
      artisanId,
      eventTimestamp: { $gte: periodInfo.start, $lte: periodInfo.end },
      eventType: { $in: ['order_paid', 'order_fulfilled'] }
    });

    if (events.length === 0) {
      return; // No data for this period
    }

    const aggregate = this.calculateAggregateMetrics(events, {
      artisanId,
      period,
      periodStart: periodInfo.start,
      periodEnd: periodInfo.end,
      periodKey: periodInfo.key,
      watermark: new Date(),
      processingVersion: this.processingVersion
    });

    await (SalesAggregate as any).upsertAggregate(aggregate);
  }

  /**
   * Create product-level aggregates
   */
  private async createProductAggregates(
    artisanId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    periodInfo: { start: Date; end: Date; key: string }
  ): Promise<void> {
    const productIds = await SalesEvent.distinct('productId', {
      artisanId,
      eventTimestamp: { $gte: periodInfo.start, $lte: periodInfo.end },
      eventType: { $in: ['order_paid', 'order_fulfilled'] }
    });

    for (const productId of productIds) {
      const events = await SalesEvent.find({
        artisanId,
        productId,
        eventTimestamp: { $gte: periodInfo.start, $lte: periodInfo.end },
        eventType: { $in: ['order_paid', 'order_fulfilled'] }
      });

      if (events.length > 0) {
        const aggregate = this.calculateAggregateMetrics(events, {
          artisanId,
          productId,
          productCategory: events[0].productCategory,
          period,
          periodStart: periodInfo.start,
          periodEnd: periodInfo.end,
          periodKey: periodInfo.key,
          watermark: new Date(),
          processingVersion: this.processingVersion
        });

        await (SalesAggregate as any).upsertAggregate(aggregate);
      }
    }
  }

  /**
   * Create channel-level aggregates
   */
  private async createChannelAggregates(
    artisanId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    periodInfo: { start: Date; end: Date; key: string }
  ): Promise<void> {
    const channels = await SalesEvent.distinct('channel', {
      artisanId,
      eventTimestamp: { $gte: periodInfo.start, $lte: periodInfo.end },
      eventType: { $in: ['order_paid', 'order_fulfilled'] }
    });

    for (const channel of channels) {
      const events = await SalesEvent.find({
        artisanId,
        channel,
        eventTimestamp: { $gte: periodInfo.start, $lte: periodInfo.end },
        eventType: { $in: ['order_paid', 'order_fulfilled'] }
      });

      if (events.length > 0) {
        const aggregate = this.calculateAggregateMetrics(events, {
          artisanId,
          channel,
          period,
          periodStart: periodInfo.start,
          periodEnd: periodInfo.end,
          periodKey: periodInfo.key,
          watermark: new Date(),
          processingVersion: this.processingVersion
        });

        await (SalesAggregate as any).upsertAggregate(aggregate);
      }
    }
  }

  /**
   * Calculate aggregate metrics from events
   */
  private calculateAggregateMetrics(
    events: ISalesEvent[],
    baseAggregate: Partial<ISalesAggregate>
  ): Partial<ISalesAggregate> {
    const totalRevenue = events.reduce((sum, event) => sum + event.totalAmount, 0);
    const netRevenue = events.reduce((sum, event) => sum + event.netRevenue, 0);
    const totalOrders = events.length;
    const totalQuantity = events.reduce((sum, event) => sum + event.quantity, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Unique products
    const uniqueProducts = new Set(events.map(event => event.productId)).size;
    
    // Top selling product
    const productRevenue = events.reduce((acc, event) => {
      acc[event.productId] = (acc[event.productId] || 0) + event.totalAmount;
      return acc;
    }, {} as Record<string, number>);
    
    const topSellingProduct = Object.entries(productRevenue)
      .sort(([, a], [, b]) => b - a)[0];
    
    // Channel breakdown
    const channelBreakdown = {
      web: 0,
      mobile: 0,
      marketplace: 0,
      direct: 0,
      social: 0
    };
    
    events.forEach(event => {
      if (channelBreakdown.hasOwnProperty(event.channel)) {
        channelBreakdown[event.channel as keyof typeof channelBreakdown] += event.totalAmount;
      }
    });

    // Customer metrics
    const uniqueCustomers = new Set(events.map(event => event.userId).filter(Boolean)).size;
    
    // Performance indicators
    const returnEvents = events.filter(event => event.eventType === 'order_returned');
    const returnRate = totalOrders > 0 ? (returnEvents.length / totalOrders) * 100 : 0;
    
    return {
      ...baseAggregate,
      totalRevenue,
      netRevenue,
      totalOrders,
      totalQuantity,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      uniqueProducts,
      topSellingProduct: topSellingProduct?.[0],
      topSellingProductRevenue: topSellingProduct?.[1],
      channelBreakdown,
      newCustomers: uniqueCustomers, // Simplified - would need more complex logic for actual new vs returning
      returnRate: Math.round(returnRate * 100) / 100,
      dataCompleteness: 100, // Assume complete data for now
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate growth metrics by comparing with previous periods
   */
  private async calculateGrowthMetrics(
    artisanId: string,
    periods: ('daily' | 'weekly' | 'monthly' | 'yearly')[]
  ): Promise<void> {
    for (const period of periods) {
      const aggregates = await SalesAggregate.find({
        artisanId,
        period,
        productId: null, // Only artisan-level aggregates
        channel: null
      }).sort({ periodStart: -1 }).limit(10);

      for (let i = 0; i < aggregates.length - 1; i++) {
        const current = aggregates[i];
        const previous = aggregates[i + 1];
        
        const growth = (SalesAggregate as any).calculateGrowth(current, previous);
        
        await SalesAggregate.findByIdAndUpdate(current._id, {
          revenueGrowth: growth.revenueGrowth,
          orderGrowth: growth.orderGrowth,
          aovGrowth: growth.aovGrowth
        });
      }
    }
  }

  /**
   * Generate period ranges for aggregation
   */
  private generatePeriods(
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date,
    endDate: Date
  ): { start: Date; end: Date; key: string }[] {
    const periods: { start: Date; end: Date; key: string }[] = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      let periodStart: Date;
      let periodEnd: Date;
      let key: string;

      switch (period) {
        case 'daily':
          periodStart = startOfDay(current);
          periodEnd = endOfDay(current);
          key = format(current, 'yyyy-MM-dd');
          current = new Date(current.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
          break;
          
        case 'weekly':
          periodStart = startOfWeek(current, { weekStartsOn: 1 }); // Monday start
          periodEnd = endOfWeek(current, { weekStartsOn: 1 });
          key = format(current, 'yyyy-\'W\'ww');
          current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000); // Add 1 week
          break;
          
        case 'monthly':
          periodStart = startOfMonth(current);
          periodEnd = endOfMonth(current);
          key = format(current, 'yyyy-MM');
          current = new Date(current.getFullYear(), current.getMonth() + 1, 1); // Next month
          break;
          
        case 'yearly':
          periodStart = startOfYear(current);
          periodEnd = endOfYear(current);
          key = format(current, 'yyyy');
          current = new Date(current.getFullYear() + 1, 0, 1); // Next year
          break;
      }

      if (periodStart <= endDate) {
        periods.push({ start: periodStart, end: periodEnd, key });
      }
    }

    return periods;
  }

  /**
   * Backfill historical data from existing orders
   */
  async backfillHistoricalData(
    artisanId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AggregationResult> {
    const actualStartDate = startDate || subYears(new Date(), 2); // Default to 2 years back
    const actualEndDate = endDate || new Date();

    console.log(`Starting historical backfill for artisan ${artisanId} from ${actualStartDate} to ${actualEndDate}`);

    // First, ensure we have SalesEvents for all orders
    await this.generateSalesEventsFromOrders(artisanId, actualStartDate, actualEndDate);

    // Then run aggregation
    return this.aggregateFinancialData({
      artisanId,
      startDate: actualStartDate,
      endDate: actualEndDate,
      periods: ['daily', 'weekly', 'monthly', 'yearly'],
      forceRecalculate: true,
      batchSize: 50
    });
  }

  /**
   * Generate SalesEvents from existing Order data
   */
  private async generateSalesEventsFromOrders(
    artisanId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    // This would integrate with the existing Order model
    // For now, this is a placeholder that would need to be implemented
    // based on the actual Order schema structure
    
    console.log(`Generating SalesEvents from orders for artisan ${artisanId}`);
    
    // TODO: Implement order-to-sales-event conversion
    // This would query the Order collection and create corresponding SalesEvents
    // Example:
    // const orders = await Order.find({
    //   artisanId,
    //   createdAt: { $gte: startDate, $lte: endDate }
    // });
    // 
    // for (const order of orders) {
    //   await this.createSalesEventFromOrder(order);
    // }
  }

  /**
   * Get aggregation status for an artisan
   */
  async getAggregationStatus(artisanId: string): Promise<{
    lastUpdated: Date | null;
    periodsAvailable: string[];
    dataCompleteness: number;
    oldestData: Date | null;
    newestData: Date | null;
  }> {
    const aggregates = await SalesAggregate.find({ artisanId })
      .sort({ lastUpdated: -1, periodStart: -1 });

    if (aggregates.length === 0) {
      return {
        lastUpdated: null,
        periodsAvailable: [],
        dataCompleteness: 0,
        oldestData: null,
        newestData: null
      };
    }

    const lastUpdated = aggregates[0].lastUpdated;
    const periodsAvailable = [...new Set(aggregates.map(a => a.period))];
    const dataCompleteness = aggregates.reduce((sum, a) => sum + a.dataCompleteness, 0) / aggregates.length;
    const oldestData = aggregates[aggregates.length - 1].periodStart;
    const newestData = aggregates[0].periodEnd;

    return {
      lastUpdated,
      periodsAvailable,
      dataCompleteness: Math.round(dataCompleteness * 100) / 100,
      oldestData,
      newestData
    };
  }
}

export default FinanceAggregationService;
