import { SalesEvent, ISalesEvent } from '../models/SalesEvent';
import { IOrderDocument } from '../models/Order';
import { IProductDocument } from '../models/Product';

export interface SalesEventData {
  orderId: string;
  productId: string;
  artisanId: string;
  userId?: string;
  eventType: 'order_created' | 'order_paid' | 'order_fulfilled' | 'order_canceled' | 'order_returned';
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  discount?: number;
  tax?: number;
  commission?: number;
  productName: string;
  productCategory: string;
  productSubcategory?: string;
  channel: 'web' | 'mobile' | 'marketplace' | 'direct' | 'social';
  platform?: string;
  region?: string;
  city?: string;
  customerSegment?: 'new' | 'returning' | 'premium';
  seasonality?: 'festival' | 'wedding' | 'regular';
  currency?: string;
}

export class SalesEventService {
  private static instance: SalesEventService;

  static getInstance(): SalesEventService {
    if (!SalesEventService.instance) {
      SalesEventService.instance = new SalesEventService();
    }
    return SalesEventService.instance;
  }

  /**
   * Emit a sales event from order data
   */
  async emitSalesEvent(eventData: SalesEventData): Promise<void> {
    try {
      const netRevenue = eventData.totalAmount - (eventData.discount || 0) - (eventData.tax || 0) - (eventData.commission || 0);
      
      const salesEvent = new SalesEvent({
        orderId: eventData.orderId,
        productId: eventData.productId,
        artisanId: eventData.artisanId,
        userId: eventData.userId,
        eventType: eventData.eventType,
        eventTimestamp: new Date(),
        quantity: eventData.quantity,
        unitPrice: eventData.unitPrice,
        totalAmount: eventData.totalAmount,
        discount: eventData.discount || 0,
        tax: eventData.tax || 0,
        commission: eventData.commission || 0,
        netRevenue,
        productName: eventData.productName,
        productCategory: eventData.productCategory,
        productSubcategory: eventData.productSubcategory,
        channel: eventData.channel,
        platform: eventData.platform,
        region: eventData.region,
        city: eventData.city,
        customerSegment: eventData.customerSegment,
        seasonality: eventData.seasonality,
        currency: eventData.currency || 'INR',
        version: 1
      });

      await salesEvent.save();
      console.log(`Sales event emitted: ${eventData.eventType} for order ${eventData.orderId}`);
      
    } catch (error) {
      console.error('Error emitting sales event:', error);
      // Don't throw error to avoid breaking order processing
    }
  }

  /**
   * Emit sales events for order creation
   */
  async emitOrderCreatedEvents(order: IOrderDocument): Promise<void> {
    try {
      for (const item of order.items) {
        await this.emitSalesEvent({
          orderId: order.orderId,
          productId: item.productId,
          artisanId: item.artisanId,
          userId: order.userId,
          eventType: 'order_created',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.subtotal,
          discount: this.calculateItemDiscount(item, order),
          tax: this.calculateItemTax(item, order),
          commission: this.calculateItemCommission(item, order),
          productName: item.productSnapshot.name,
          productCategory: item.productSnapshot.category,
          channel: this.detectChannel(order),
          customerSegment: await this.detectCustomerSegment(order.userId),
          seasonality: this.detectSeasonality(),
          currency: 'INR'
        });
      }
    } catch (error) {
      console.error('Error emitting order created events:', error);
    }
  }

  /**
   * Emit sales events for order payment
   */
  async emitOrderPaidEvents(order: IOrderDocument): Promise<void> {
    try {
      for (const item of order.items) {
        await this.emitSalesEvent({
          orderId: order.orderId,
          productId: item.productId,
          artisanId: item.artisanId,
          userId: order.userId,
          eventType: 'order_paid',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.subtotal,
          discount: this.calculateItemDiscount(item, order),
          tax: this.calculateItemTax(item, order),
          commission: this.calculateItemCommission(item, order),
          productName: item.productSnapshot.name,
          productCategory: item.productSnapshot.category,
          channel: this.detectChannel(order),
          customerSegment: await this.detectCustomerSegment(order.userId),
          seasonality: this.detectSeasonality(),
          currency: 'INR'
        });
      }
    } catch (error) {
      console.error('Error emitting order paid events:', error);
    }
  }

  /**
   * Emit sales events for order fulfillment
   */
  async emitOrderFulfilledEvents(order: IOrderDocument): Promise<void> {
    try {
      for (const item of order.items) {
        await this.emitSalesEvent({
          orderId: order.orderId,
          productId: item.productId,
          artisanId: item.artisanId,
          userId: order.userId,
          eventType: 'order_fulfilled',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.subtotal,
          discount: this.calculateItemDiscount(item, order),
          tax: this.calculateItemTax(item, order),
          commission: this.calculateItemCommission(item, order),
          productName: item.productSnapshot.name,
          productCategory: item.productSnapshot.category,
          channel: this.detectChannel(order),
          customerSegment: await this.detectCustomerSegment(order.userId),
          seasonality: this.detectSeasonality(),
          currency: 'INR'
        });
      }
    } catch (error) {
      console.error('Error emitting order fulfilled events:', error);
    }
  }

  /**
   * Emit sales events for order cancellation
   */
  async emitOrderCanceledEvents(order: IOrderDocument): Promise<void> {
    try {
      for (const item of order.items) {
        await this.emitSalesEvent({
          orderId: order.orderId,
          productId: item.productId,
          artisanId: item.artisanId,
          userId: order.userId,
          eventType: 'order_canceled',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.subtotal,
          discount: this.calculateItemDiscount(item, order),
          tax: this.calculateItemTax(item, order),
          commission: this.calculateItemCommission(item, order),
          productName: item.productSnapshot.name,
          productCategory: item.productSnapshot.category,
          channel: this.detectChannel(order),
          customerSegment: await this.detectCustomerSegment(order.userId),
          seasonality: this.detectSeasonality(),
          currency: 'INR'
        });
      }
    } catch (error) {
      console.error('Error emitting order canceled events:', error);
    }
  }

  /**
   * Calculate item-level discount proportionally
   */
  private calculateItemDiscount(item: any, order: IOrderDocument): number {
    if (!order.orderSummary.discount || order.orderSummary.discount === 0) {
      return 0;
    }
    
    const itemRatio = item.subtotal / order.orderSummary.subtotal;
    return Math.round((order.orderSummary.discount * itemRatio) * 100) / 100;
  }

  /**
   * Calculate item-level tax proportionally
   */
  private calculateItemTax(item: any, order: IOrderDocument): number {
    if (!order.orderSummary.tax || order.orderSummary.tax === 0) {
      return 0;
    }
    
    const itemRatio = item.subtotal / order.orderSummary.subtotal;
    return Math.round((order.orderSummary.tax * itemRatio) * 100) / 100;
  }

  /**
   * Calculate item-level commission (simplified - 5% of item subtotal)
   */
  private calculateItemCommission(item: any, order: IOrderDocument): number {
    const commissionRate = 0.05; // 5% commission
    return Math.round((item.subtotal * commissionRate) * 100) / 100;
  }

  /**
   * Detect channel from order context (simplified)
   */
  private detectChannel(order: IOrderDocument): 'web' | 'mobile' | 'marketplace' | 'direct' | 'social' {
    // In a real implementation, this would check user agent, referrer, etc.
    // For now, default to 'web'
    return 'web';
  }

  /**
   * Detect customer segment (simplified)
   */
  private async detectCustomerSegment(userId: string): Promise<'new' | 'returning' | 'premium'> {
    try {
      // In a real implementation, this would check user's order history
      // For now, return 'returning' as default
      return 'returning';
    } catch (error) {
      return 'returning';
    }
  }

  /**
   * Detect seasonality based on current date
   */
  private detectSeasonality(): 'festival' | 'wedding' | 'regular' {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    
    // Festival season: October-December (Diwali, Christmas)
    if (month >= 10 && month <= 12) {
      return 'festival';
    }
    
    // Wedding season: November-February
    if (month >= 11 || month <= 2) {
      return 'wedding';
    }
    
    return 'regular';
  }

  /**
   * Bulk emit events for historical orders (for backfill)
   */
  async bulkEmitEventsFromOrders(orders: IOrderDocument[]): Promise<{
    processed: number;
    errors: number;
  }> {
    let processed = 0;
    let errors = 0;

    for (const order of orders) {
      try {
        // Emit events based on order status
        await this.emitOrderCreatedEvents(order);
        
        if (order.paymentStatus === 'paid') {
          await this.emitOrderPaidEvents(order);
        }
        
        if (order.status === 'delivered') {
          await this.emitOrderFulfilledEvents(order);
        }
        
        if (order.status === 'cancelled') {
          await this.emitOrderCanceledEvents(order);
        }
        
        processed++;
      } catch (error) {
        console.error(`Error processing order ${order.orderId}:`, error);
        errors++;
      }
    }

    return { processed, errors };
  }

  /**
   * Get sales events for a specific order
   */
  async getOrderEvents(orderId: string): Promise<ISalesEvent[]> {
    try {
      return await SalesEvent.find({ orderId }).sort({ eventTimestamp: 1 }).exec();
    } catch (error) {
      console.error('Error fetching order events:', error);
      return [];
    }
  }

  /**
   * Get sales events for a specific artisan
   */
  async getArtisanEvents(
    artisanId: string, 
    startDate?: Date, 
    endDate?: Date,
    eventTypes?: string[]
  ): Promise<ISalesEvent[]> {
    try {
      const query: any = { artisanId };
      
      if (startDate || endDate) {
        query.eventTimestamp = {};
        if (startDate) query.eventTimestamp.$gte = startDate;
        if (endDate) query.eventTimestamp.$lte = endDate;
      }
      
      if (eventTypes && eventTypes.length > 0) {
        query.eventType = { $in: eventTypes };
      }
      
      return await SalesEvent.find(query).sort({ eventTimestamp: -1 }).exec();
    } catch (error) {
      console.error('Error fetching artisan events:', error);
      return [];
    }
  }
}

export default SalesEventService;