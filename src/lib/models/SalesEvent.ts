export interface ISalesEvent {
  // Core identifiers
  orderId: string;
  productId: string;
  artisanId: string;
  userId?: string;
  
  // Event metadata
  eventType: 'order_created' | 'order_paid' | 'order_fulfilled' | 'order_canceled' | 'order_returned';
  eventTimestamp: Date;
  
  // Financial data
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  discount: number;
  tax: number;
  commission: number;
  netRevenue: number; // totalAmount - discount - tax - commission
  
  // Product metadata
  productName: string;
  productCategory: string;
  productSubcategory?: string;
  
  // Channel and location
  channel: 'web' | 'mobile' | 'marketplace' | 'direct' | 'social';
  platform?: string; // 'flipkart', 'amazon', 'meesho', etc.
  region?: string;
  city?: string;
  
  // Customer metadata (anonymized)
  customerSegment?: 'new' | 'returning' | 'premium';
  customerAcquisitionChannel?: string;
  
  // Additional context
  currency: string;
  exchangeRate?: number; // for multi-currency support
  seasonality?: string; // 'festival', 'wedding', 'regular'
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number; // for event versioning
}

// Sales Event document interface (includes Firestore document ID)
export interface ISalesEventDocument extends ISalesEvent {
  id?: string;
}

// No model export needed for Firestore - use FirestoreService instead
export default ISalesEvent;

/* Firestore structure notes:
const SalesEventSchema = {
  // Core identifiers
  orderId: { 
    type: String, 
    required: true, 
    index: true 
  },
  productId: { 
    type: String, 
    required: true, 
    index: true 
  },
  artisanId: { 
    type: String, 
    required: true, 
    index: true 
  },
  userId: { 
    type: String, 
    index: true 
  },
  
  // Event metadata
  eventType: {
    type: String,
    required: true,
    enum: ['order_created', 'order_paid', 'order_fulfilled', 'order_canceled', 'order_returned'],
    index: true
  },
  eventTimestamp: { 
    type: Date, 
    required: true, 
    index: true 
  },
  
  // Financial data
  quantity: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  unitPrice: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  totalAmount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  discount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  tax: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  commission: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  netRevenue: { 
    type: Number, 
    required: true 
  },
  
  // Product metadata
  productName: { 
    type: String, 
    required: true 
  },
  productCategory: { 
    type: String, 
    required: true, 
    index: true 
  },
  productSubcategory: { 
    type: String, 
    index: true 
  },
  
  // Channel and location
  channel: {
    type: String,
    required: true,
    enum: ['web', 'mobile', 'marketplace', 'direct', 'social'],
    index: true
  },
  platform: { 
    type: String, 
    index: true 
  },
  region: { 
    type: String, 
    index: true 
  },
  city: { 
    type: String, 
    index: true 
  },
  
  // Customer metadata
  customerSegment: {
    type: String,
    enum: ['new', 'returning', 'premium'],
    index: true
  },
  customerAcquisitionChannel: { 
    type: String, 
    index: true 
  },
  
  // Additional context
  currency: { 
    type: String, 
    required: true, 
    default: 'INR' 
  },
  exchangeRate: { 
    type: Number, 
    default: 1 
  },
  seasonality: { 
    type: String, 
    enum: ['festival', 'wedding', 'regular'], 
    index: true 
  },
  
  // Metadata
  version: { 
    type: Number, 
    default: 1 
  }
}, {
  timestamps: true,
  collection: 'sales_events'
});

// Compound indexes for efficient querying
SalesEventSchema.index({ artisanId: 1, eventTimestamp: -1 });
SalesEventSchema.index({ productId: 1, eventTimestamp: -1 });
SalesEventSchema.index({ eventType: 1, eventTimestamp: -1 });
SalesEventSchema.index({ channel: 1, eventTimestamp: -1 });
SalesEventSchema.index({ productCategory: 1, eventTimestamp: -1 });

// Time-series index for aggregation queries
SalesEventSchema.index({ 
  eventTimestamp: -1, 
  artisanId: 1, 
  eventType: 1 
});

// Pre-save middleware to calculate net revenue
SalesEventSchema.pre('save', function(next) {
  this.netRevenue = this.totalAmount - this.discount - this.tax - this.commission;
  next();
});

// Static methods for common queries
SalesEventSchema.statics.findByArtisan = function(artisanId: string, startDate?: Date, endDate?: Date) {
  const query: any = { artisanId };
  
  if (startDate || endDate) {
    query.eventTimestamp = {};
    if (startDate) query.eventTimestamp.$gte = startDate;
    if (endDate) query.eventTimestamp.$lte = endDate;
  }
  
  return this.find(query).sort({ eventTimestamp: -1 });
};

SalesEventSchema.statics.findByProduct = function(productId: string, startDate?: Date, endDate?: Date) {
  const query: any = { productId };
  
  if (startDate || endDate) {
    query.eventTimestamp = {};
    if (startDate) query.eventTimestamp.$gte = startDate;
    if (endDate) query.eventTimestamp.$lte = endDate;
  }
  
  return this.find(query).sort({ eventTimestamp: -1 });
};

SalesEventSchema.statics.aggregateByPeriod = function(
  artisanId: string, 
  period: 'day' | 'week' | 'month' | 'year',
  startDate: Date,
  endDate: Date
) {
  const groupBy: any = {
    artisanId: '$artisanId'
  };
  
  switch (period) {
    case 'day':
      groupBy.date = { $dateToString: { format: '%Y-%m-%d', date: '$eventTimestamp' } };
      break;
    case 'week':
      groupBy.date = { $dateToString: { format: '%Y-W%U', date: '$eventTimestamp' } };
      break;
    case 'month':
      groupBy.date = { $dateToString: { format: '%Y-%m', date: '$eventTimestamp' } };
      break;
    case 'year':
      groupBy.date = { $dateToString: { format: '%Y', date: '$eventTimestamp' } };
      break;
  }
  
  return this.aggregate([
    {
      $match: {
        artisanId,
        eventTimestamp: { $gte: startDate, $lte: endDate },
        eventType: { $in: ['order_paid', 'order_fulfilled'] }
      }
    },
    {
      $group: {
        _id: groupBy,
        totalRevenue: { $sum: '$netRevenue' },
        totalOrders: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        averageOrderValue: { $avg: '$totalAmount' },
        uniqueProducts: { $addToSet: '$productId' }
      }
    },
    {
      $addFields: {
        uniqueProductCount: { $size: '$uniqueProducts' }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
};

}
// Firestore indexes should be created in Firebase Console:
// - artisanId, eventTimestamp (composite, descending)
// - productId, eventTimestamp (composite, descending)
// - eventType, eventTimestamp (composite, descending)
// - channel, eventTimestamp (composite, descending)
// - productCategory, eventTimestamp (composite, descending)
// - eventTimestamp, artisanId, eventType (composite)
*/

// Helper functions for Firestore operations
export const SalesEventHelpers = {
  findByArtisan: async (artisanId: string, startDate?: Date, endDate?: Date) => {
    // Implementation will be in the service layer
    return [];
  },

  findByProduct: async (productId: string, startDate?: Date, endDate?: Date) => {
    // Implementation will be in the service layer
    return [];
  },

  aggregateByPeriod: async (
    artisanId: string, 
    period: 'day' | 'week' | 'month' | 'year',
    startDate: Date,
    endDate: Date
  ) => {
    // Implementation will be in the service layer
    return [];
  }
};
