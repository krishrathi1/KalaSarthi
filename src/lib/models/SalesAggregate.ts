import { Schema, model, models, Document } from 'mongoose';

export interface ISalesAggregate extends Document {
  // Aggregation identifiers
  artisanId: string;
  productId?: string; // null for artisan-level aggregates
  productCategory?: string;
  channel?: string;
  
  // Time period
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  periodStart: Date;
  periodEnd: Date;
  periodKey: string; // e.g., '2024-01-15', '2024-W03', '2024-01', '2024'
  
  // Financial metrics
  totalRevenue: number;
  netRevenue: number;
  totalOrders: number;
  totalQuantity: number;
  averageOrderValue: number;
  
  // Product metrics
  uniqueProducts: number;
  topSellingProduct?: string;
  topSellingProductRevenue?: number;
  
  // Channel breakdown
  channelBreakdown: {
    web: number;
    mobile: number;
    marketplace: number;
    direct: number;
    social: number;
  };
  
  // Growth metrics (compared to previous period)
  revenueGrowth?: number; // percentage
  orderGrowth?: number; // percentage
  aovGrowth?: number; // percentage
  
  // Customer metrics
  newCustomers?: number;
  returningCustomers?: number;
  customerRetentionRate?: number;
  
  // Performance indicators
  conversionRate?: number;
  returnRate?: number;
  averageMargin?: number;
  
  // Seasonal and contextual data
  seasonality?: string;
  festivalImpact?: boolean;
  marketingCampaigns?: string[];
  
  // Data quality and processing
  dataCompleteness: number; // percentage of expected data points
  lastUpdated: Date;
  processingVersion: string;
  watermark: Date; // for exactly-once processing
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const SalesAggregateSchema = new Schema<ISalesAggregate>({
  // Aggregation identifiers
  artisanId: { 
    type: String, 
    required: true, 
    index: true 
  },
  productId: { 
    type: String, 
    index: true 
  },
  productCategory: { 
    type: String, 
    index: true 
  },
  channel: { 
    type: String, 
    enum: ['web', 'mobile', 'marketplace', 'direct', 'social'],
    index: true 
  },
  
  // Time period
  period: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    index: true
  },
  periodStart: { 
    type: Date, 
    required: true, 
    index: true 
  },
  periodEnd: { 
    type: Date, 
    required: true, 
    index: true 
  },
  periodKey: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  // Financial metrics
  totalRevenue: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  netRevenue: { 
    type: Number, 
    required: true 
  },
  totalOrders: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  totalQuantity: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  averageOrderValue: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  
  // Product metrics
  uniqueProducts: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  topSellingProduct: { 
    type: String 
  },
  topSellingProductRevenue: { 
    type: Number, 
    min: 0 
  },
  
  // Channel breakdown
  channelBreakdown: {
    web: { type: Number, default: 0, min: 0 },
    mobile: { type: Number, default: 0, min: 0 },
    marketplace: { type: Number, default: 0, min: 0 },
    direct: { type: Number, default: 0, min: 0 },
    social: { type: Number, default: 0, min: 0 }
  },
  
  // Growth metrics
  revenueGrowth: { 
    type: Number 
  },
  orderGrowth: { 
    type: Number 
  },
  aovGrowth: { 
    type: Number 
  },
  
  // Customer metrics
  newCustomers: { 
    type: Number, 
    min: 0 
  },
  returningCustomers: { 
    type: Number, 
    min: 0 
  },
  customerRetentionRate: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  
  // Performance indicators
  conversionRate: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  returnRate: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  averageMargin: { 
    type: Number 
  },
  
  // Seasonal and contextual data
  seasonality: { 
    type: String, 
    enum: ['festival', 'wedding', 'regular'] 
  },
  festivalImpact: { 
    type: Boolean, 
    default: false 
  },
  marketingCampaigns: [{ 
    type: String 
  }],
  
  // Data quality and processing
  dataCompleteness: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100, 
    default: 100 
  },
  lastUpdated: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  processingVersion: { 
    type: String, 
    required: true, 
    default: '1.0' 
  },
  watermark: { 
    type: Date, 
    required: true, 
    index: true 
  }
}, {
  timestamps: true,
  collection: 'sales_aggregates'
});

// Compound indexes for efficient querying
SalesAggregateSchema.index({ 
  artisanId: 1, 
  period: 1, 
  periodStart: -1 
});

SalesAggregateSchema.index({ 
  artisanId: 1, 
  productId: 1, 
  period: 1, 
  periodStart: -1 
});

SalesAggregateSchema.index({ 
  artisanId: 1, 
  channel: 1, 
  period: 1, 
  periodStart: -1 
});

// Unique constraint to prevent duplicate aggregates
SalesAggregateSchema.index({ 
  artisanId: 1, 
  productId: 1, 
  channel: 1, 
  period: 1, 
  periodKey: 1 
}, { unique: true });

// Time-series index for range queries
SalesAggregateSchema.index({ 
  periodStart: -1, 
  periodEnd: -1 
});

// Static methods for common queries
SalesAggregateSchema.statics.findTimeSeries = function(
  artisanId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  startDate: Date,
  endDate: Date,
  options?: {
    productId?: string;
    channel?: string;
    productCategory?: string;
  }
) {
  const query: any = {
    artisanId,
    period,
    periodStart: { $gte: startDate },
    periodEnd: { $lte: endDate }
  };
  
  if (options?.productId) query.productId = options.productId;
  if (options?.channel) query.channel = options.channel;
  if (options?.productCategory) query.productCategory = options.productCategory;
  
  return this.find(query).sort({ periodStart: 1 });
};

SalesAggregateSchema.statics.findLatest = function(
  artisanId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  limit: number = 10
) {
  return this.find({ artisanId, period })
    .sort({ periodStart: -1 })
    .limit(limit);
};

SalesAggregateSchema.statics.calculateGrowth = function(
  current: ISalesAggregate,
  previous: ISalesAggregate
) {
  const revenueGrowth = previous.totalRevenue > 0 
    ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100
    : 0;
    
  const orderGrowth = previous.totalOrders > 0
    ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100
    : 0;
    
  const aovGrowth = previous.averageOrderValue > 0
    ? ((current.averageOrderValue - previous.averageOrderValue) / previous.averageOrderValue) * 100
    : 0;
    
  return {
    revenueGrowth: Math.round(revenueGrowth * 100) / 100,
    orderGrowth: Math.round(orderGrowth * 100) / 100,
    aovGrowth: Math.round(aovGrowth * 100) / 100
  };
};

SalesAggregateSchema.statics.getTopPerformers = function(
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  startDate: Date,
  endDate: Date,
  metric: 'totalRevenue' | 'totalOrders' | 'averageOrderValue' = 'totalRevenue',
  limit: number = 10
) {
  return this.aggregate([
    {
      $match: {
        period,
        periodStart: { $gte: startDate },
        periodEnd: { $lte: endDate },
        productId: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: {
          artisanId: '$artisanId',
          productId: '$productId'
        },
        totalMetric: { $sum: `$${metric}` },
        totalRevenue: { $sum: '$totalRevenue' },
        totalOrders: { $sum: '$totalOrders' },
        averageOrderValue: { $avg: '$averageOrderValue' }
      }
    },
    {
      $sort: { totalMetric: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

SalesAggregateSchema.statics.upsertAggregate = async function(aggregateData: Partial<ISalesAggregate>) {
  const query = {
    artisanId: aggregateData.artisanId,
    productId: aggregateData.productId || null,
    channel: aggregateData.channel || null,
    period: aggregateData.period,
    periodKey: aggregateData.periodKey
  };
  
  return this.findOneAndUpdate(
    query,
    { 
      ...aggregateData, 
      lastUpdated: new Date() 
    },
    { 
      upsert: true, 
      new: true, 
      setDefaultsOnInsert: true 
    }
  );
};

export const SalesAggregate = models.SalesAggregate || model<ISalesAggregate>('SalesAggregate', SalesAggregateSchema);
