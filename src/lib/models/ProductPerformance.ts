import mongoose, { Document, Model, Schema } from "mongoose";

// Product Performance interface for ranking and analytics
export interface IProductPerformance {
    performanceId: string;
    productId: string;
    productName: string;
    category: string;
    artisanId: string;
    artisanName: string;
    
    // Time period
    periodType: "daily" | "weekly" | "monthly" | "yearly";
    periodKey: string;
    startDate: Date;
    endDate: Date;
    
    // Core performance metrics
    revenue: number;
    units: number;
    orders: number;
    averageOrderValue: number;
    averageUnitPrice: number;
    
    // Financial metrics
    grossMargin: number; // Revenue - Cost
    marginPercentage: number; // (Revenue - Cost) / Revenue
    costOfGoods: number;
    
    // Sales velocity
    dailySalesVelocity: number; // Units per day
    weeklySalesVelocity: number; // Units per week
    monthlySalesVelocity: number; // Units per month
    
    // Customer metrics
    uniqueCustomers: number;
    repeatCustomers: number;
    customerLifetimeValue: number;
    
    // Quality metrics
    returnRate: number; // Returns / Units
    returnCount: number;
    averageRating: number;
    reviewCount: number;
    
    // Inventory metrics
    stockLevel: number;
    stockTurnover: number; // Units sold / Average stock
    daysOfInventory: number;
    
    // Channel performance
    webRevenue: number;
    mobileRevenue: number;
    marketplaceRevenue: number;
    directRevenue: number;
    
    // Competitive metrics
    marketShare: number; // Revenue / Total category revenue
    rankInCategory: number;
    rankOverall: number;
    
    // Trend indicators
    revenueGrowth: number; // % change from previous period
    unitGrowth: number;
    marginTrend: "improving" | "stable" | "declining";
    
    // Metadata
    lastUpdated: Date;
    dataQuality: {
        completeness: number;
        accuracy: number;
        freshness: number;
    };
    tags: string[];
}

// Product Performance document interface
export interface IProductPerformanceDocument extends IProductPerformance, Document {
    _id: mongoose.Types.ObjectId;
}

// Product Performance schema
const productPerformanceSchema = new Schema<IProductPerformanceDocument>(
    {
        performanceId: {
            type: String,
            required: true,
            unique: true,
        },
        productId: {
            type: String,
            required: true,
            index: true,
        },
        productName: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
            index: true,
        },
        artisanId: {
            type: String,
            required: true,
            index: true,
        },
        artisanName: {
            type: String,
            required: true,
        },
        
        // Time period
        periodType: {
            type: String,
            enum: ["daily", "weekly", "monthly", "yearly"],
            required: true,
            index: true,
        },
        periodKey: {
            type: String,
            required: true,
            index: true,
        },
        startDate: {
            type: Date,
            required: true,
            index: true,
        },
        endDate: {
            type: Date,
            required: true,
            index: true,
        },
        
        // Core performance metrics
        revenue: {
            type: Number,
            required: true,
            min: 0,
        },
        units: {
            type: Number,
            required: true,
            min: 0,
        },
        orders: {
            type: Number,
            required: true,
            min: 0,
        },
        averageOrderValue: {
            type: Number,
            required: true,
            min: 0,
        },
        averageUnitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        
        // Financial metrics
        grossMargin: {
            type: Number,
            required: true,
        },
        marginPercentage: {
            type: Number,
            min: -1,
            max: 1,
        },
        costOfGoods: {
            type: Number,
            required: true,
            min: 0,
        },
        
        // Sales velocity
        dailySalesVelocity: {
            type: Number,
            min: 0,
        },
        weeklySalesVelocity: {
            type: Number,
            min: 0,
        },
        monthlySalesVelocity: {
            type: Number,
            min: 0,
        },
        
        // Customer metrics
        uniqueCustomers: {
            type: Number,
            min: 0,
        },
        repeatCustomers: {
            type: Number,
            min: 0,
        },
        customerLifetimeValue: {
            type: Number,
            min: 0,
        },
        
        // Quality metrics
        returnRate: {
            type: Number,
            min: 0,
            max: 1,
        },
        returnCount: {
            type: Number,
            min: 0,
        },
        averageRating: {
            type: Number,
            min: 0,
            max: 5,
        },
        reviewCount: {
            type: Number,
            min: 0,
        },
        
        // Inventory metrics
        stockLevel: {
            type: Number,
            min: 0,
        },
        stockTurnover: {
            type: Number,
            min: 0,
        },
        daysOfInventory: {
            type: Number,
            min: 0,
        },
        
        // Channel performance
        webRevenue: {
            type: Number,
            min: 0,
        },
        mobileRevenue: {
            type: Number,
            min: 0,
        },
        marketplaceRevenue: {
            type: Number,
            min: 0,
        },
        directRevenue: {
            type: Number,
            min: 0,
        },
        
        // Competitive metrics
        marketShare: {
            type: Number,
            min: 0,
            max: 1,
        },
        rankInCategory: {
            type: Number,
            min: 1,
        },
        rankOverall: {
            type: Number,
            min: 1,
        },
        
        // Trend indicators
        revenueGrowth: {
            type: Number,
        },
        unitGrowth: {
            type: Number,
        },
        marginTrend: {
            type: String,
            enum: ["improving", "stable", "declining"],
        },
        
        // Metadata
        lastUpdated: {
            type: Date,
            required: true,
            default: Date.now,
        },
        dataQuality: {
            completeness: {
                type: Number,
                min: 0,
                max: 1,
                default: 1,
            },
            accuracy: {
                type: Number,
                min: 0,
                max: 1,
                default: 1,
            },
            freshness: {
                type: Number,
                min: 0,
                default: 0,
            },
        },
        tags: [String],
    },
    {
        timestamps: true,
    }
);

// Create compound indexes for efficient querying
productPerformanceSchema.index({ periodType: 1, periodKey: 1 });
productPerformanceSchema.index({ productId: 1, periodType: 1, periodKey: 1 });
productPerformanceSchema.index({ category: 1, periodType: 1, periodKey: 1 });
productPerformanceSchema.index({ artisanId: 1, periodType: 1, periodKey: 1 });
productPerformanceSchema.index({ revenue: -1, periodType: 1, periodKey: 1 });
productPerformanceSchema.index({ rankInCategory: 1, category: 1, periodType: 1, periodKey: 1 });
productPerformanceSchema.index({ rankOverall: 1, periodType: 1, periodKey: 1 });

// Pre-save middleware to calculate derived metrics
productPerformanceSchema.pre('save', function(next) {
    // Calculate average order value
    if (this.orders > 0) {
        this.averageOrderValue = this.revenue / this.orders;
    }
    
    // Calculate average unit price
    if (this.units > 0) {
        this.averageUnitPrice = this.revenue / this.units;
    }
    
    // Calculate margin percentage
    if (this.revenue > 0) {
        this.marginPercentage = this.grossMargin / this.revenue;
    }
    
    // Calculate sales velocity
    const daysInPeriod = (this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysInPeriod > 0) {
        this.dailySalesVelocity = this.units / daysInPeriod;
        this.weeklySalesVelocity = this.units / (daysInPeriod / 7);
        this.monthlySalesVelocity = this.units / (daysInPeriod / 30);
    }
    
    // Calculate return rate
    if (this.units > 0) {
        this.returnRate = this.returnCount / this.units;
    }
    
    // Calculate stock turnover
    if (this.stockLevel > 0) {
        this.stockTurnover = this.units / this.stockLevel;
        this.daysOfInventory = this.stockLevel / this.dailySalesVelocity;
    }
    
    // Update data quality freshness
    this.dataQuality.freshness = (Date.now() - this.lastUpdated.getTime()) / (1000 * 60 * 60); // hours
    
    next();
});

// Static method to generate performance ID
productPerformanceSchema.statics.generatePerformanceId = function(
    productId: string,
    periodType: string,
    periodKey: string
): string {
    return `${productId}|${periodType}|${periodKey}`;
};

// Product Performance model
const ProductPerformance: Model<IProductPerformanceDocument> =
    mongoose.models.ProductPerformance || mongoose.model<IProductPerformanceDocument>("ProductPerformance", productPerformanceSchema);

export default ProductPerformance;
