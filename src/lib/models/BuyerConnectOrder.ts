import mongoose, { Document, Model, Schema } from "mongoose";

// Order status type
export type OrderStatus = 
    | 'pending_artisan_approval'
    | 'approved'
    | 'design_phase'
    | 'design_approved'
    | 'in_production'
    | 'quality_check'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled'
    | 'disputed';

// Design collaboration interface
export interface IDesignCollaboration {
    designRequests: Array<{
        requestId: string;
        timestamp: Date;
        requirements: string;
        aiGeneratedDesigns: Array<{
            designId: string;
            imageUrl: string;
            style: string;
            colors: string[];
            aiMetadata: {
                prompt: string;
                model: string;
                confidence: number;
                generationTime: number;
            };
        }>;
        buyerFeedback?: string;
        artisanResponse?: string;
    }>;
    approvedDesign?: {
        designId: string;
        approvalDate: Date;
        buyerFeedback: string;
        finalImageUrl: string;
        specifications: Record<string, any>;
    };
    revisionHistory: Array<{
        revisionId: string;
        timestamp: Date;
        changes: string[];
        reason: string;
        requestedBy: 'buyer' | 'artisan';
        status: 'pending' | 'approved' | 'rejected';
    }>;
    aiSuggestions: Array<{
        suggestion: string;
        reasoning: string;
        confidence: number;
        timestamp: Date;
        applied: boolean;
    }>;
}

// Pricing details interface
export interface IPricingDetails {
    basePrice: number;
    customizationCharges: number;
    materialCosts: number;
    laborCosts: number;
    shippingCosts: number;
    taxes: number;
    totalPrice: number;
    currency: string;
    negotiationHistory: Array<{
        timestamp: Date;
        proposedBy: 'buyer' | 'artisan';
        amount: number;
        reason?: string;
        status: 'pending' | 'accepted' | 'rejected' | 'countered';
    }>;
    paymentTerms: {
        advancePercentage: number;
        milestones: Array<{
            milestone: string;
            percentage: number;
            dueDate?: Date;
            completed: boolean;
        }>;
    };
    aiPriceAnalysis: {
        marketPrice: { min: number; max: number };
        fairnessScore: number; // 0-1 scale
        priceJustification: string;
        competitorComparison: Array<{
            source: string;
            price: number;
            quality: string;
        }>;
    };
}

// Order timeline interface
export interface IOrderTimeline {
    estimatedDuration: number; // in days
    milestones: Array<{
        milestone: string;
        estimatedDate: Date;
        actualDate?: Date;
        status: 'pending' | 'in_progress' | 'completed' | 'delayed';
        notes?: string;
    }>;
    aiPredictions: {
        completionProbability: number;
        riskFactors: Array<{
            factor: string;
            impact: 'low' | 'medium' | 'high';
            mitigation: string;
        }>;
        recommendedActions: Array<{
            action: string;
            priority: 'low' | 'medium' | 'high';
            deadline?: Date;
        }>;
    };
}

// Cultural context interface
export interface ICulturalContext {
    craftTradition: string;
    techniques: Array<{
        name: string;
        description: string;
        difficulty: 'beginner' | 'intermediate' | 'expert';
        culturalSignificance: string;
    }>;
    culturalSignificance: string;
    authenticityCertificate?: {
        certificateId: string;
        issuer: string;
        dateIssued: Date;
        verificationUrl?: string;
        blockchainHash?: string;
    };
    educationalContent: Array<{
        type: 'text' | 'image' | 'video';
        title: string;
        content: string;
        url?: string;
    }>;
    aiCulturalAnalysis: {
        authenticityScore: number;
        culturalAccuracy: number;
        educationalValue: number;
        recommendations: string[];
    };
}

// Buyer Connect Order interface
export interface IBuyerConnectOrder {
    buyerId: string;
    artisanId: string;
    chatSessionId: string;
    requirements: {
        description: string;
        category: string;
        specifications: Record<string, any>;
        customizations: string[];
        quantity: number;
        preferredMaterials?: string[];
        sizeRequirements?: string;
        colorPreferences?: string[];
        aiExtractedRequirements: {
            keyFeatures: string[];
            constraints: string[];
            preferences: string[];
            confidence: number;
        };
    };
    status: OrderStatus;
    timeline: IOrderTimeline;
    designCollaboration: IDesignCollaboration;
    pricing: IPricingDetails;
    culturalContext: ICulturalContext;
    aiInsights: {
        successProbability: number;
        qualityPrediction: number;
        customerSatisfactionPrediction: number;
        recommendedImprovements: Array<{
            area: string;
            suggestion: string;
            impact: 'low' | 'medium' | 'high';
        }>;
        riskAssessment: {
            overallRisk: 'low' | 'medium' | 'high';
            factors: Array<{
                factor: string;
                risk: 'low' | 'medium' | 'high';
                mitigation: string;
            }>;
        };
    };
    communication: {
        lastMessageAt?: Date;
        responseTimeAverage: number;
        communicationQuality: number; // 0-1 scale
        languageBarriers: boolean;
        translationAccuracy?: number;
    };
    qualityAssurance: {
        checkpoints: Array<{
            checkpoint: string;
            scheduledDate: Date;
            completedDate?: Date;
            status: 'pending' | 'passed' | 'failed' | 'needs_attention';
            notes?: string;
            images?: string[];
        }>;
        finalQualityScore?: number;
        customerApproval?: {
            approved: boolean;
            feedback: string;
            rating: number;
            timestamp: Date;
        };
    };
    shipping: {
        method?: string;
        trackingNumber?: string;
        estimatedDelivery?: Date;
        actualDelivery?: Date;
        shippingStatus?: 'preparing' | 'shipped' | 'in_transit' | 'delivered' | 'returned';
    };
    feedback: {
        buyerRating?: number;
        buyerReview?: string;
        artisanRating?: number;
        artisanReview?: string;
        platformRating?: number;
        improvementSuggestions?: string[];
    };
}

// Order document interface
export interface IBuyerConnectOrderDocument extends IBuyerConnectOrder, Document {}

// Order schema
const designCollaborationSchema = new Schema({
    designRequests: [{
        requestId: String,
        timestamp: Date,
        requirements: String,
        aiGeneratedDesigns: [{
            designId: String,
            imageUrl: String,
            style: String,
            colors: [String],
            aiMetadata: {
                prompt: String,
                model: String,
                confidence: Number,
                generationTime: Number
            }
        }],
        buyerFeedback: String,
        artisanResponse: String
    }],
    approvedDesign: {
        designId: String,
        approvalDate: Date,
        buyerFeedback: String,
        finalImageUrl: String,
        specifications: Schema.Types.Mixed
    },
    revisionHistory: [{
        revisionId: String,
        timestamp: Date,
        changes: [String],
        reason: String,
        requestedBy: { type: String, enum: ['buyer', 'artisan'] },
        status: { type: String, enum: ['pending', 'approved', 'rejected'] }
    }],
    aiSuggestions: [{
        suggestion: String,
        reasoning: String,
        confidence: Number,
        timestamp: Date,
        applied: Boolean
    }]
});

const pricingDetailsSchema = new Schema({
    basePrice: { type: Number, required: true },
    customizationCharges: { type: Number, default: 0 },
    materialCosts: { type: Number, default: 0 },
    laborCosts: { type: Number, default: 0 },
    shippingCosts: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    negotiationHistory: [{
        timestamp: Date,
        proposedBy: { type: String, enum: ['buyer', 'artisan'] },
        amount: Number,
        reason: String,
        status: { type: String, enum: ['pending', 'accepted', 'rejected', 'countered'] }
    }],
    paymentTerms: {
        advancePercentage: { type: Number, default: 30 },
        milestones: [{
            milestone: String,
            percentage: Number,
            dueDate: Date,
            completed: { type: Boolean, default: false }
        }]
    },
    aiPriceAnalysis: {
        marketPrice: {
            min: Number,
            max: Number
        },
        fairnessScore: Number,
        priceJustification: String,
        competitorComparison: [{
            source: String,
            price: Number,
            quality: String
        }]
    }
});

const orderTimelineSchema = new Schema({
    estimatedDuration: Number,
    milestones: [{
        milestone: String,
        estimatedDate: Date,
        actualDate: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'delayed'] },
        notes: String
    }],
    aiPredictions: {
        completionProbability: Number,
        riskFactors: [{
            factor: String,
            impact: { type: String, enum: ['low', 'medium', 'high'] },
            mitigation: String
        }],
        recommendedActions: [{
            action: String,
            priority: { type: String, enum: ['low', 'medium', 'high'] },
            deadline: Date
        }]
    }
});

const culturalContextSchema = new Schema({
    craftTradition: String,
    techniques: [{
        name: String,
        description: String,
        difficulty: { type: String, enum: ['beginner', 'intermediate', 'expert'] },
        culturalSignificance: String
    }],
    culturalSignificance: String,
    authenticityCertificate: {
        certificateId: String,
        issuer: String,
        dateIssued: Date,
        verificationUrl: String,
        blockchainHash: String
    },
    educationalContent: [{
        type: { type: String, enum: ['text', 'image', 'video'] },
        title: String,
        content: String,
        url: String
    }],
    aiCulturalAnalysis: {
        authenticityScore: Number,
        culturalAccuracy: Number,
        educationalValue: Number,
        recommendations: [String]
    }
});

const buyerConnectOrderSchema = new Schema<IBuyerConnectOrderDocument>(
    {
        buyerId: { type: String, required: true },
        artisanId: { type: String, required: true },
        chatSessionId: { type: String, required: true },
        requirements: {
            description: { type: String, required: true },
            category: { type: String, required: true },
            specifications: Schema.Types.Mixed,
            customizations: [String],
            quantity: { type: Number, default: 1 },
            preferredMaterials: [String],
            sizeRequirements: String,
            colorPreferences: [String],
            aiExtractedRequirements: {
                keyFeatures: [String],
                constraints: [String],
                preferences: [String],
                confidence: Number
            }
        },
        status: {
            type: String,
            enum: [
                'pending_artisan_approval',
                'approved',
                'design_phase',
                'design_approved',
                'in_production',
                'quality_check',
                'shipped',
                'delivered',
                'completed',
                'cancelled',
                'disputed'
            ],
            default: 'pending_artisan_approval'
        },
        timeline: orderTimelineSchema,
        designCollaboration: designCollaborationSchema,
        pricing: pricingDetailsSchema,
        culturalContext: culturalContextSchema,
        aiInsights: {
            successProbability: Number,
            qualityPrediction: Number,
            customerSatisfactionPrediction: Number,
            recommendedImprovements: [{
                area: String,
                suggestion: String,
                impact: { type: String, enum: ['low', 'medium', 'high'] }
            }],
            riskAssessment: {
                overallRisk: { type: String, enum: ['low', 'medium', 'high'] },
                factors: [{
                    factor: String,
                    risk: { type: String, enum: ['low', 'medium', 'high'] },
                    mitigation: String
                }]
            }
        },
        communication: {
            lastMessageAt: Date,
            responseTimeAverage: { type: Number, default: 0 },
            communicationQuality: { type: Number, default: 0 },
            languageBarriers: { type: Boolean, default: false },
            translationAccuracy: Number
        },
        qualityAssurance: {
            checkpoints: [{
                checkpoint: String,
                scheduledDate: Date,
                completedDate: Date,
                status: { type: String, enum: ['pending', 'passed', 'failed', 'needs_attention'] },
                notes: String,
                images: [String]
            }],
            finalQualityScore: Number,
            customerApproval: {
                approved: Boolean,
                feedback: String,
                rating: Number,
                timestamp: Date
            }
        },
        shipping: {
            method: String,
            trackingNumber: String,
            estimatedDelivery: Date,
            actualDelivery: Date,
            shippingStatus: {
                type: String,
                enum: ['preparing', 'shipped', 'in_transit', 'delivered', 'returned']
            }
        },
        feedback: {
            buyerRating: { type: Number, min: 1, max: 5 },
            buyerReview: String,
            artisanRating: { type: Number, min: 1, max: 5 },
            artisanReview: String,
            platformRating: { type: Number, min: 1, max: 5 },
            improvementSuggestions: [String]
        }
    },
    {
        timestamps: true,
    }
);

// Create indexes for efficient queries
buyerConnectOrderSchema.index({ buyerId: 1 });
buyerConnectOrderSchema.index({ artisanId: 1 });
buyerConnectOrderSchema.index({ chatSessionId: 1 });
buyerConnectOrderSchema.index({ status: 1 });
buyerConnectOrderSchema.index({ 'requirements.category': 1 });
buyerConnectOrderSchema.index({ 'timeline.milestones.estimatedDate': 1 });
buyerConnectOrderSchema.index({ 'pricing.totalPrice': 1 });

// Compound indexes
buyerConnectOrderSchema.index({ 
    buyerId: 1, 
    status: 1,
    createdAt: -1 
});
buyerConnectOrderSchema.index({ 
    artisanId: 1, 
    status: 1,
    'timeline.milestones.estimatedDate': 1 
});
buyerConnectOrderSchema.index({
    'requirements.category': 1,
    status: 1,
    'pricing.totalPrice': 1
});

// Text search
buyerConnectOrderSchema.index({
    'requirements.description': 'text',
    'requirements.customizations': 'text',
    'culturalContext.craftTradition': 'text'
});

// Order model
const BuyerConnectOrder: Model<IBuyerConnectOrderDocument> =
    mongoose.models.BuyerConnectOrder || mongoose.model<IBuyerConnectOrderDocument>("BuyerConnectOrder", buyerConnectOrderSchema);

export default BuyerConnectOrder;