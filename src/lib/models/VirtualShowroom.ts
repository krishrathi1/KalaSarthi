import mongoose, { Document, Model, Schema } from "mongoose";

// AR hotspot interface
export interface IARHotspot {
    id: string;
    position: { x: number; y: number; z?: number };
    type: 'info' | 'product' | 'technique' | 'cultural' | 'interactive';
    title: string;
    description: string;
    content: {
        text?: string;
        imageUrl?: string;
        videoUrl?: string;
        audioUrl?: string;
        productId?: string;
    };
    aiGenerated: boolean;
    interactionCount: number;
    lastUpdated: Date;
}

// Showroom image interface
export interface IShowroomImage {
    id: string;
    url: string;
    type: '360' | 'standard' | 'ar_marker' | 'panoramic';
    caption: string;
    metadata: {
        resolution: string;
        fileSize: number;
        captureDate: Date;
        cameraSettings?: Record<string, any>;
        location?: string;
    };
    hotspots?: IARHotspot[];
    aiAnalysis: {
        qualityScore: number;
        compositionScore: number;
        lightingScore: number;
        suggestions: string[];
        detectedObjects: Array<{
            object: string;
            confidence: number;
            boundingBox?: { x: number; y: number; width: number; height: number };
        }>;
    };
    viewCount: number;
    engagementMetrics: {
        averageViewTime: number;
        interactionRate: number;
        shareCount: number;
    };
}

// Process video interface
export interface IProcessVideo {
    id: string;
    title: string;
    description: string;
    url: string;
    thumbnailUrl: string;
    duration: number; // in seconds
    technique: string;
    difficulty: 'beginner' | 'intermediate' | 'expert';
    culturalContext: string;
    aiTranscription?: {
        transcript: string;
        language: string;
        confidence: number;
        keyMoments: Array<{
            timestamp: number;
            description: string;
            importance: 'low' | 'medium' | 'high';
        }>;
    };
    aiAnalysis: {
        educationalValue: number;
        technicalAccuracy: number;
        culturalAuthenticity: number;
        engagementPrediction: number;
        suggestedImprovements: string[];
    };
    viewMetrics: {
        totalViews: number;
        averageWatchTime: number;
        completionRate: number;
        likeCount: number;
        shareCount: number;
    };
    translations?: Array<{
        language: string;
        subtitleUrl: string;
        audioUrl?: string;
        confidence: number;
    }>;
}

// Virtual showroom interface
export interface IVirtualShowroom {
    artisanId: string;
    showroomId: string;
    title: string;
    description: string;
    virtualTourUrl?: string;
    arPreviewEnabled: boolean;
    featuredProducts: string[]; // Product IDs
    workspaceImages: IShowroomImage[];
    processVideos: IProcessVideo[];
    culturalStory: string;
    aiContent: {
        generatedDescription: string;
        culturalNarrative: string;
        technicalExplanations: Array<{
            technique: string;
            explanation: string;
            difficulty: string;
            culturalSignificance: string;
        }>;
        recommendedTour: Array<{
            step: number;
            title: string;
            description: string;
            mediaType: 'image' | 'video' | '360' | 'ar';
            mediaId: string;
            duration: number; // suggested viewing time in seconds
        }>;
        personalizedContent: Array<{
            visitorType: 'buyer' | 'tourist' | 'student' | 'collector';
            customDescription: string;
            highlightedFeatures: string[];
            recommendedPath: string[];
        }>;
    };
    interactiveElements: Array<{
        id: string;
        type: 'quiz' | 'comparison' | 'customizer' | 'ar_try_on';
        title: string;
        description: string;
        configuration: Record<string, any>;
        aiGenerated: boolean;
        engagementScore: number;
    }>;
    analytics: {
        totalVisitors: number;
        uniqueVisitors: number;
        averageSessionDuration: number;
        bounceRate: number;
        conversionRate: number; // visitors who contacted artisan
        popularSections: Array<{
            section: string;
            viewCount: number;
            averageTime: number;
        }>;
        visitorDemographics: {
            countries: Record<string, number>;
            languages: Record<string, number>;
            deviceTypes: Record<string, number>;
        };
        aiInsights: {
            engagementPrediction: number;
            improvementSuggestions: Array<{
                area: string;
                suggestion: string;
                priority: 'low' | 'medium' | 'high';
                estimatedImpact: number;
            }>;
            contentGaps: string[];
            optimizationOpportunities: string[];
        };
    };
    accessibility: {
        screenReaderSupport: boolean;
        keyboardNavigation: boolean;
        highContrastMode: boolean;
        audioDescriptions: boolean;
        multiLanguageSupport: string[];
        aiAccessibilityScore: number;
    };
    seoOptimization: {
        metaTitle: string;
        metaDescription: string;
        keywords: string[];
        structuredData: Record<string, any>;
        aiSeoScore: number;
        recommendations: string[];
    };
    lastUpdated: Date;
    isPublished: boolean;
    moderationStatus: 'pending' | 'approved' | 'rejected' | 'needs_review';
    aiModerationFlags?: Array<{
        flag: string;
        confidence: number;
        reason: string;
        severity: 'low' | 'medium' | 'high';
    }>;
}

// Virtual showroom document interface
export interface IVirtualShowroomDocument extends IVirtualShowroom, Document {}

// AR hotspot schema
const arHotspotSchema = new Schema({
    id: { type: String, required: true },
    position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        z: Number
    },
    type: {
        type: String,
        enum: ['info', 'product', 'technique', 'cultural', 'interactive'],
        required: true
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    content: {
        text: String,
        imageUrl: String,
        videoUrl: String,
        audioUrl: String,
        productId: String
    },
    aiGenerated: { type: Boolean, default: false },
    interactionCount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});

// Showroom image schema
const showroomImageSchema = new Schema({
    id: { type: String, required: true },
    url: { type: String, required: true },
    type: {
        type: String,
        enum: ['360', 'standard', 'ar_marker', 'panoramic'],
        required: true
    },
    caption: { type: String, required: true },
    metadata: {
        resolution: String,
        fileSize: Number,
        captureDate: Date,
        cameraSettings: Schema.Types.Mixed,
        location: String
    },
    hotspots: [arHotspotSchema],
    aiAnalysis: {
        qualityScore: { type: Number, min: 0, max: 1 },
        compositionScore: { type: Number, min: 0, max: 1 },
        lightingScore: { type: Number, min: 0, max: 1 },
        suggestions: [String],
        detectedObjects: [{
            object: String,
            confidence: Number,
            boundingBox: {
                x: Number,
                y: Number,
                width: Number,
                height: Number
            }
        }]
    },
    viewCount: { type: Number, default: 0 },
    engagementMetrics: {
        averageViewTime: { type: Number, default: 0 },
        interactionRate: { type: Number, default: 0 },
        shareCount: { type: Number, default: 0 }
    }
});

// Process video schema
const processVideoSchema = new Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    url: { type: String, required: true },
    thumbnailUrl: String,
    duration: { type: Number, required: true },
    technique: { type: String, required: true },
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'expert'],
        required: true
    },
    culturalContext: String,
    aiTranscription: {
        transcript: String,
        language: String,
        confidence: Number,
        keyMoments: [{
            timestamp: Number,
            description: String,
            importance: { type: String, enum: ['low', 'medium', 'high'] }
        }]
    },
    aiAnalysis: {
        educationalValue: Number,
        technicalAccuracy: Number,
        culturalAuthenticity: Number,
        engagementPrediction: Number,
        suggestedImprovements: [String]
    },
    viewMetrics: {
        totalViews: { type: Number, default: 0 },
        averageWatchTime: { type: Number, default: 0 },
        completionRate: { type: Number, default: 0 },
        likeCount: { type: Number, default: 0 },
        shareCount: { type: Number, default: 0 }
    },
    translations: [{
        language: String,
        subtitleUrl: String,
        audioUrl: String,
        confidence: Number
    }]
});

// Virtual showroom schema
const virtualShowroomSchema = new Schema<IVirtualShowroomDocument>(
    {
        artisanId: { type: String, required: true, unique: true },
        showroomId: { type: String, required: true, unique: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        virtualTourUrl: String,
        arPreviewEnabled: { type: Boolean, default: false },
        featuredProducts: [String],
        workspaceImages: [showroomImageSchema],
        processVideos: [processVideoSchema],
        culturalStory: String,
        aiContent: {
            generatedDescription: String,
            culturalNarrative: String,
            technicalExplanations: [{
                technique: String,
                explanation: String,
                difficulty: String,
                culturalSignificance: String
            }],
            recommendedTour: [{
                step: Number,
                title: String,
                description: String,
                mediaType: { type: String, enum: ['image', 'video', '360', 'ar'] },
                mediaId: String,
                duration: Number
            }],
            personalizedContent: [{
                visitorType: { type: String, enum: ['buyer', 'tourist', 'student', 'collector'] },
                customDescription: String,
                highlightedFeatures: [String],
                recommendedPath: [String]
            }]
        },
        interactiveElements: [{
            id: String,
            type: { type: String, enum: ['quiz', 'comparison', 'customizer', 'ar_try_on'] },
            title: String,
            description: String,
            configuration: Schema.Types.Mixed,
            aiGenerated: { type: Boolean, default: false },
            engagementScore: { type: Number, default: 0 }
        }],
        analytics: {
            totalVisitors: { type: Number, default: 0 },
            uniqueVisitors: { type: Number, default: 0 },
            averageSessionDuration: { type: Number, default: 0 },
            bounceRate: { type: Number, default: 0 },
            conversionRate: { type: Number, default: 0 },
            popularSections: [{
                section: String,
                viewCount: Number,
                averageTime: Number
            }],
            visitorDemographics: {
                countries: Schema.Types.Mixed,
                languages: Schema.Types.Mixed,
                deviceTypes: Schema.Types.Mixed
            },
            aiInsights: {
                engagementPrediction: Number,
                improvementSuggestions: [{
                    area: String,
                    suggestion: String,
                    priority: { type: String, enum: ['low', 'medium', 'high'] },
                    estimatedImpact: Number
                }],
                contentGaps: [String],
                optimizationOpportunities: [String]
            }
        },
        accessibility: {
            screenReaderSupport: { type: Boolean, default: false },
            keyboardNavigation: { type: Boolean, default: false },
            highContrastMode: { type: Boolean, default: false },
            audioDescriptions: { type: Boolean, default: false },
            multiLanguageSupport: [String],
            aiAccessibilityScore: { type: Number, default: 0 }
        },
        seoOptimization: {
            metaTitle: String,
            metaDescription: String,
            keywords: [String],
            structuredData: Schema.Types.Mixed,
            aiSeoScore: { type: Number, default: 0 },
            recommendations: [String]
        },
        lastUpdated: { type: Date, default: Date.now },
        isPublished: { type: Boolean, default: false },
        moderationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'needs_review'],
            default: 'pending'
        },
        aiModerationFlags: [{
            flag: String,
            confidence: Number,
            reason: String,
            severity: { type: String, enum: ['low', 'medium', 'high'] }
        }]
    },
    {
        timestamps: true,
    }
);

// Create indexes for efficient queries
virtualShowroomSchema.index({ artisanId: 1 });
virtualShowroomSchema.index({ showroomId: 1 });
virtualShowroomSchema.index({ isPublished: 1 });
virtualShowroomSchema.index({ moderationStatus: 1 });
virtualShowroomSchema.index({ 'analytics.conversionRate': -1 });
virtualShowroomSchema.index({ 'analytics.totalVisitors': -1 });
virtualShowroomSchema.index({ lastUpdated: -1 });

// Compound indexes
virtualShowroomSchema.index({ 
    isPublished: 1, 
    moderationStatus: 1,
    'analytics.conversionRate': -1 
});

// Text search
virtualShowroomSchema.index({
    title: 'text',
    description: 'text',
    culturalStory: 'text',
    'aiContent.generatedDescription': 'text'
});

// Virtual showroom model
const VirtualShowroom: Model<IVirtualShowroomDocument> =
    mongoose.models.VirtualShowroom || mongoose.model<IVirtualShowroomDocument>("VirtualShowroom", virtualShowroomSchema);

export default VirtualShowroom;