import mongoose, { Document, Model, Schema } from "mongoose";

// ==================== INTERFACES ====================

export interface IRequirementAnalysis {
  originalText: string;
  extractedCriteria: {
    productType: string[];
    materials: string[];
    style: string[];
    techniques: string[];
    priceRange?: { min: number; max: number };
    timeline?: string;
    customRequirements: string[];
  };
  confidence: number;
  processingTime: number;
  timestamp: Date;
}

export interface ILocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address?: {
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  accuracy: number;
  source: 'gps' | 'network' | 'manual';
  timestamp: Date;
}

export interface IRelevanceScore {
  overall: number; // 0-1 score
  breakdown: {
    skillMatch: number;
    portfolioMatch: number;
    experienceMatch: number;
    specialtyMatch: number;
    ratingBonus: number;
    locationBonus: number;
  };
  matchReasons: string[];
  confidence: number;
}

export interface IInteractionEvent {
  buyerId: string;
  artisanId: string;
  searchQuery: string;
  relevanceScore: number;
  action: 'viewed' | 'contacted' | 'hired' | 'skipped';
  timestamp: Date;
  sessionId: string;
  locationData?: ILocationData;
}

export interface IMatchResult {
  artisanId: string;
  buyerId: string;
  searchQuery: string;
  relevanceScore: IRelevanceScore;
  locationData: {
    distance: number;
    category: 'Local' | 'Regional' | 'National';
    deliveryFeasible: boolean;
  };
  finalRank: number;
  matchExplanation: string[];
  timestamp: Date;
}

export interface IBuyerInteractionHistory extends Document {
  buyerId: string;
  interactions: IInteractionEvent[];
  learningWeights: {
    skillMatchWeight: number;
    portfolioMatchWeight: number;
    locationWeight: number;
    ratingWeight: number;
    lastUpdated: Date;
  };
  searchPatterns: {
    commonKeywords: string[];
    preferredCategories: string[];
    typicalPriceRange: { min: number; max: number };
    preferredDistance: number;
  };
  successMetrics: {
    totalSearches: number;
    contactRate: number;
    hireRate: number;
    satisfactionScore: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IMatchAnalytics extends Document {
  date: Date;
  metrics: {
    totalSearches: number;
    averageResultsPerSearch: number;
    averageRelevanceScore: number;
    contactRate: number;
    locationFilterUsage: {
      '25km': number;
      '50km': number;
      '100km': number;
      '200km': number;
      'no_limit': number;
    };
  };
  performanceByCategory: {
    [category: string]: {
      searchCount: number;
      averageScore: number;
      successRate: number;
    };
  };
  algorithmVersion: string;
}

export interface IMatchHistory extends Document {
  buyerId: string;
  searchQuery: string;
  requirementAnalysis: IRequirementAnalysis;
  results: IMatchResult[];
  filters: {
    maxDistance?: number;
    minRelevanceScore: number;
    priceRange?: { min: number; max: number };
  };
  searchMetadata: {
    timestamp: Date;
    resultsCount: number;
    searchTime: number;
    userLocation?: ILocationData;
  };
}

// ==================== SCHEMAS ====================

const RequirementAnalysisSchema = new Schema({
  originalText: { type: String, required: true },
  extractedCriteria: {
    productType: [{ type: String }],
    materials: [{ type: String }],
    style: [{ type: String }],
    techniques: [{ type: String }],
    priceRange: {
      min: { type: Number },
      max: { type: Number }
    },
    timeline: { type: String },
    customRequirements: [{ type: String }]
  },
  confidence: { type: Number, min: 0, max: 1, required: true },
  processingTime: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

const LocationDataSchema = new Schema({
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  address: {
    city: { type: String },
    state: { type: String },
    country: { type: String },
    postalCode: { type: String }
  },
  accuracy: { type: Number, required: true },
  source: { 
    type: String, 
    enum: ['gps', 'network', 'manual'], 
    required: true 
  },
  timestamp: { type: Date, default: Date.now }
});

const RelevanceScoreSchema = new Schema({
  overall: { type: Number, min: 0, max: 1, required: true },
  breakdown: {
    skillMatch: { type: Number, min: 0, max: 1, default: 0 },
    portfolioMatch: { type: Number, min: 0, max: 1, default: 0 },
    experienceMatch: { type: Number, min: 0, max: 1, default: 0 },
    specialtyMatch: { type: Number, min: 0, max: 1, default: 0 },
    ratingBonus: { type: Number, min: 0, max: 1, default: 0 },
    locationBonus: { type: Number, min: 0, max: 1, default: 0 }
  },
  matchReasons: [{ type: String }],
  confidence: { type: Number, min: 0, max: 1, required: true }
});

const InteractionEventSchema = new Schema({
  buyerId: { type: String, required: true, index: true },
  artisanId: { type: String, required: true, index: true },
  searchQuery: { type: String, required: true },
  relevanceScore: { type: Number, min: 0, max: 1, required: true },
  action: { 
    type: String, 
    enum: ['viewed', 'contacted', 'hired', 'skipped'], 
    required: true 
  },
  timestamp: { type: Date, default: Date.now, index: true },
  sessionId: { type: String, required: true },
  locationData: LocationDataSchema
});

const MatchResultSchema = new Schema({
  artisanId: { type: String, required: true, index: true },
  buyerId: { type: String, required: true, index: true },
  searchQuery: { type: String, required: true },
  relevanceScore: RelevanceScoreSchema,
  locationData: {
    distance: { type: Number, required: true },
    category: { 
      type: String, 
      enum: ['Local', 'Regional', 'National'], 
      required: true 
    },
    deliveryFeasible: { type: Boolean, required: true }
  },
  finalRank: { type: Number, required: true },
  matchExplanation: [{ type: String }],
  timestamp: { type: Date, default: Date.now }
});

// Buyer Interaction History Schema
const buyerInteractionHistorySchema = new Schema<IBuyerInteractionHistory>({
  buyerId: { type: String, required: true, unique: true, index: true },
  interactions: [InteractionEventSchema],
  learningWeights: {
    skillMatchWeight: { type: Number, default: 0.3, min: 0, max: 1 },
    portfolioMatchWeight: { type: Number, default: 0.25, min: 0, max: 1 },
    locationWeight: { type: Number, default: 0.2, min: 0, max: 1 },
    ratingWeight: { type: Number, default: 0.25, min: 0, max: 1 },
    lastUpdated: { type: Date, default: Date.now }
  },
  searchPatterns: {
    commonKeywords: [{ type: String }],
    preferredCategories: [{ type: String }],
    typicalPriceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 100000 }
    },
    preferredDistance: { type: Number, default: 50 }
  },
  successMetrics: {
    totalSearches: { type: Number, default: 0 },
    contactRate: { type: Number, default: 0, min: 0, max: 1 },
    hireRate: { type: Number, default: 0, min: 0, max: 1 },
    satisfactionScore: { type: Number, default: 0, min: 0, max: 5 }
  }
}, {
  timestamps: true
});

// Match Analytics Schema
const matchAnalyticsSchema = new Schema<IMatchAnalytics>({
  date: { type: Date, required: true, index: true },
  metrics: {
    totalSearches: { type: Number, default: 0 },
    averageResultsPerSearch: { type: Number, default: 0 },
    averageRelevanceScore: { type: Number, default: 0 },
    contactRate: { type: Number, default: 0 },
    locationFilterUsage: {
      '25km': { type: Number, default: 0 },
      '50km': { type: Number, default: 0 },
      '100km': { type: Number, default: 0 },
      '200km': { type: Number, default: 0 },
      'no_limit': { type: Number, default: 0 }
    }
  },
  performanceByCategory: {
    type: Map,
    of: {
      searchCount: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 }
    }
  },
  algorithmVersion: { type: String, required: true }
});

// Match History Schema
const matchHistorySchema = new Schema<IMatchHistory>({
  buyerId: { type: String, required: true, index: true },
  searchQuery: { type: String, required: true },
  requirementAnalysis: RequirementAnalysisSchema,
  results: [MatchResultSchema],
  filters: {
    maxDistance: { type: Number },
    minRelevanceScore: { type: Number, default: 0.3 },
    priceRange: {
      min: { type: Number },
      max: { type: Number }
    }
  },
  searchMetadata: {
    timestamp: { type: Date, default: Date.now },
    resultsCount: { type: Number, required: true },
    searchTime: { type: Number, required: true },
    userLocation: LocationDataSchema
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================

// Buyer Interaction History Indexes
buyerInteractionHistorySchema.index({ buyerId: 1 });
buyerInteractionHistorySchema.index({ 'interactions.timestamp': -1 });
buyerInteractionHistorySchema.index({ 'interactions.action': 1 });
buyerInteractionHistorySchema.index({ 'successMetrics.contactRate': -1 });

// Match Analytics Indexes
matchAnalyticsSchema.index({ date: -1 });
matchAnalyticsSchema.index({ algorithmVersion: 1 });

// Match History Indexes
matchHistorySchema.index({ buyerId: 1, 'searchMetadata.timestamp': -1 });
matchHistorySchema.index({ 'requirementAnalysis.extractedCriteria.productType': 1 });
matchHistorySchema.index({ 'results.relevanceScore.overall': -1 });
matchHistorySchema.index({ 'searchMetadata.userLocation.coordinates': '2dsphere' });

// Text search indexes
buyerInteractionHistorySchema.index({
  'searchPatterns.commonKeywords': 'text',
  'searchPatterns.preferredCategories': 'text'
});

matchHistorySchema.index({
  searchQuery: 'text',
  'requirementAnalysis.extractedCriteria.productType': 'text',
  'requirementAnalysis.extractedCriteria.materials': 'text'
});

// ==================== MODELS ====================

export const BuyerInteractionHistory: Model<IBuyerInteractionHistory> = 
  mongoose.models.BuyerInteractionHistory || 
  mongoose.model<IBuyerInteractionHistory>("BuyerInteractionHistory", buyerInteractionHistorySchema);

export const MatchAnalytics: Model<IMatchAnalytics> = 
  mongoose.models.MatchAnalytics || 
  mongoose.model<IMatchAnalytics>("MatchAnalytics", matchAnalyticsSchema);

export const MatchHistory: Model<IMatchHistory> = 
  mongoose.models.MatchHistory || 
  mongoose.model<IMatchHistory>("MatchHistory", matchHistorySchema);

export default {
  BuyerInteractionHistory,
  MatchAnalytics,
  MatchHistory
};