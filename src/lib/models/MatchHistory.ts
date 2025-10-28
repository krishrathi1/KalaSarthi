import mongoose, { Document, Model, Schema } from "mongoose";

// Match result interface
export interface IMatchResult {
    artisanId: string;
    confidenceScore: number;
    matchReasons: string[];
    aiReasoning: {
        factors: Array<{
            factor: string;
            weight: number;
            score: number;
            explanation: string;
        }>;
        culturalAlignment: number;
        skillMatch: number;
        availabilityScore: number;
        priceCompatibility: number;
    };
    userInteraction: 'viewed' | 'contacted' | 'ordered' | 'ignored' | 'favorited';
    interactionTimestamp?: Date;
    feedbackScore?: number; // 1-5 rating from user
    feedbackText?: string;
}

// Search query interface
export interface ISearchQuery {
    originalText: string;
    processedText: string;
    extractedKeywords: string[];
    categories: string[];
    aiAnalysis: {
        intent: string;
        sentiment: string;
        urgency: 'low' | 'medium' | 'high';
        complexity: 'simple' | 'moderate' | 'complex';
        culturalContext?: string;
        priceIndications?: {
            budget: 'low' | 'medium' | 'high';
            range?: { min: number; max: number };
        };
        timelineIndications?: {
            urgency: 'flexible' | 'moderate' | 'urgent';
            estimatedDuration?: string;
        };
    };
    filters: {
        priceRange?: { min: number; max: number };
        location?: string;
        availability?: string;
        rating?: number;
        specializations?: string[];
    };
    embedding?: number[]; // Vector embedding for semantic search
}

// Match history interface
export interface IMatchHistory {
    buyerId: string;
    searchQuery: ISearchQuery;
    results: IMatchResult[];
    searchMetadata: {
        timestamp: Date;
        resultsCount: number;
        searchTime: number; // in milliseconds
        userLocation?: string;
        deviceType?: 'mobile' | 'desktop' | 'tablet';
        sessionId: string;
        aiModelVersion: string;
    };
    learningData: {
        successfulMatches: string[]; // artisan IDs that led to orders
        improvedRecommendations: boolean;
        userSatisfactionScore?: number;
        followUpActions: Array<{
            action: string;
            timestamp: Date;
            result: string;
        }>;
    };
    abTestingData?: {
        variant: string;
        experimentId: string;
        conversionRate?: number;
    };
}

// Match history document interface
export interface IMatchHistoryDocument extends IMatchHistory, Document {}

// Match history schema
const matchResultSchema = new Schema({
    artisanId: { type: String, required: true },
    confidenceScore: { type: Number, required: true, min: 0, max: 1 },
    matchReasons: [{ type: String }],
    aiReasoning: {
        factors: [{
            factor: String,
            weight: { type: Number, min: 0, max: 1 },
            score: { type: Number, min: 0, max: 1 },
            explanation: String
        }],
        culturalAlignment: { type: Number, min: 0, max: 1 },
        skillMatch: { type: Number, min: 0, max: 1 },
        availabilityScore: { type: Number, min: 0, max: 1 },
        priceCompatibility: { type: Number, min: 0, max: 1 }
    },
    userInteraction: {
        type: String,
        enum: ['viewed', 'contacted', 'ordered', 'ignored', 'favorited'],
        default: 'viewed'
    },
    interactionTimestamp: Date,
    feedbackScore: { type: Number, min: 1, max: 5 },
    feedbackText: String
});

const searchQuerySchema = new Schema({
    originalText: { type: String, required: true },
    processedText: String,
    extractedKeywords: [String],
    categories: [String],
    aiAnalysis: {
        intent: String,
        sentiment: String,
        urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        complexity: { type: String, enum: ['simple', 'moderate', 'complex'], default: 'moderate' },
        culturalContext: String,
        priceIndications: {
            budget: { type: String, enum: ['low', 'medium', 'high'] },
            range: {
                min: Number,
                max: Number
            }
        },
        timelineIndications: {
            urgency: { type: String, enum: ['flexible', 'moderate', 'urgent'], default: 'flexible' },
            estimatedDuration: String
        }
    },
    filters: {
        priceRange: {
            min: Number,
            max: Number
        },
        location: String,
        availability: String,
        rating: Number,
        specializations: [String]
    },
    embedding: [Number] // Vector embedding
});

const matchHistorySchema = new Schema<IMatchHistoryDocument>(
    {
        buyerId: {
            type: String,
            required: true,
        },
        searchQuery: searchQuerySchema,
        results: [matchResultSchema],
        searchMetadata: {
            timestamp: { type: Date, default: Date.now },
            resultsCount: { type: Number, required: true },
            searchTime: { type: Number, required: true },
            userLocation: String,
            deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet'] },
            sessionId: { type: String, required: true },
            aiModelVersion: { type: String, default: '1.0' }
        },
        learningData: {
            successfulMatches: [String],
            improvedRecommendations: { type: Boolean, default: false },
            userSatisfactionScore: { type: Number, min: 1, max: 5 },
            followUpActions: [{
                action: String,
                timestamp: Date,
                result: String
            }]
        },
        abTestingData: {
            variant: String,
            experimentId: String,
            conversionRate: Number
        }
    },
    {
        timestamps: true,
    }
);

// Create indexes for efficient queries
matchHistorySchema.index({ buyerId: 1 });
matchHistorySchema.index({ 'searchMetadata.timestamp': -1 });
matchHistorySchema.index({ 'results.artisanId': 1 });
matchHistorySchema.index({ 'results.userInteraction': 1 });
matchHistorySchema.index({ 'searchQuery.categories': 1 });
matchHistorySchema.index({ 'learningData.successfulMatches': 1 });

// Compound indexes for analytics
matchHistorySchema.index({ 
    buyerId: 1, 
    'searchMetadata.timestamp': -1 
});
matchHistorySchema.index({ 
    'results.artisanId': 1, 
    'results.userInteraction': 1,
    'searchMetadata.timestamp': -1 
});
matchHistorySchema.index({
    'searchQuery.aiAnalysis.intent': 1,
    'results.confidenceScore': -1
});

// Text search for queries
matchHistorySchema.index({
    'searchQuery.originalText': 'text',
    'searchQuery.extractedKeywords': 'text'
});

// Match history model
const MatchHistory: Model<IMatchHistoryDocument> =
    mongoose.models.MatchHistory || mongoose.model<IMatchHistoryDocument>("MatchHistory", matchHistorySchema);

export default MatchHistory;