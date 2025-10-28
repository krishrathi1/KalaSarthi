import mongoose, { Document, Model, Schema } from "mongoose";

// AI agent interaction interface
export interface IAIAgentInteraction {
    interactionId: string;
    agentId: string;
    userId: string;
    sessionId: string;
    interactionType: 'task_execution' | 'conversation' | 'recommendation' | 'analysis' | 'workflow_step';
    input: {
        type: 'text' | 'structured' | 'multimodal';
        content: any;
        metadata?: Record<string, any>;
    };
    output: {
        type: 'text' | 'structured' | 'multimodal';
        content: any;
        confidence?: number;
        alternatives?: any[];
        metadata?: Record<string, any>;
    };
    processing: {
        startTime: Date;
        endTime: Date;
        duration: number; // in milliseconds
        modelUsed: string;
        tokensUsed?: number;
        computeUnits?: number;
        steps: Array<{
            step: string;
            duration: number;
            success: boolean;
            error?: string;
        }>;
    };
    context: {
        conversationHistory?: any[];
        userProfile?: any;
        sessionContext?: any;
        environmentData?: any;
    };
    feedback: {
        userRating?: number; // 1-5 scale
        userFeedback?: string;
        systemRating?: number; // automated quality assessment
        improvementSuggestions?: string[];
        flagged?: boolean;
        flagReason?: string;
    };
    learningData: {
        successfulOutcome: boolean;
        userSatisfaction?: number;
        taskCompleted: boolean;
        followUpActions?: string[];
        knowledgeGained?: string[];
        patternIdentified?: string[];
    };
    privacy: {
        dataRetentionDays: number;
        anonymized: boolean;
        consentGiven: boolean;
        dataUsagePermissions: string[];
    };
    aiMetrics: {
        accuracyScore?: number;
        relevanceScore?: number;
        creativityScore?: number;
        helpfulnessScore?: number;
        culturalSensitivityScore?: number;
        biasDetectionScore?: number;
    };
}

// AI agent interaction document interface
export interface IAIAgentInteractionDocument extends IAIAgentInteraction, Document {}

// AI agent interaction schema
const aiAgentInteractionSchema = new Schema<IAIAgentInteractionDocument>(
    {
        interactionId: { type: String, required: true, unique: true },
        agentId: { type: String, required: true },
        userId: { type: String, required: true },
        sessionId: { type: String, required: true },
        interactionType: {
            type: String,
            enum: ['task_execution', 'conversation', 'recommendation', 'analysis', 'workflow_step'],
            required: true
        },
        input: {
            type: { type: String, enum: ['text', 'structured', 'multimodal'], required: true },
            content: { type: Schema.Types.Mixed, required: true },
            metadata: Schema.Types.Mixed
        },
        output: {
            type: { type: String, enum: ['text', 'structured', 'multimodal'], required: true },
            content: { type: Schema.Types.Mixed, required: true },
            confidence: { type: Number, min: 0, max: 1 },
            alternatives: [Schema.Types.Mixed],
            metadata: Schema.Types.Mixed
        },
        processing: {
            startTime: { type: Date, required: true },
            endTime: { type: Date, required: true },
            duration: { type: Number, required: true },
            modelUsed: { type: String, required: true },
            tokensUsed: Number,
            computeUnits: Number,
            steps: [{
                step: String,
                duration: Number,
                success: Boolean,
                error: String
            }]
        },
        context: {
            conversationHistory: [Schema.Types.Mixed],
            userProfile: Schema.Types.Mixed,
            sessionContext: Schema.Types.Mixed,
            environmentData: Schema.Types.Mixed
        },
        feedback: {
            userRating: { type: Number, min: 1, max: 5 },
            userFeedback: String,
            systemRating: { type: Number, min: 1, max: 5 },
            improvementSuggestions: [String],
            flagged: { type: Boolean, default: false },
            flagReason: String
        },
        learningData: {
            successfulOutcome: { type: Boolean, required: true },
            userSatisfaction: { type: Number, min: 1, max: 5 },
            taskCompleted: { type: Boolean, required: true },
            followUpActions: [String],
            knowledgeGained: [String],
            patternIdentified: [String]
        },
        privacy: {
            dataRetentionDays: { type: Number, default: 90 },
            anonymized: { type: Boolean, default: false },
            consentGiven: { type: Boolean, required: true },
            dataUsagePermissions: [String]
        },
        aiMetrics: {
            accuracyScore: { type: Number, min: 0, max: 1 },
            relevanceScore: { type: Number, min: 0, max: 1 },
            creativityScore: { type: Number, min: 0, max: 1 },
            helpfulnessScore: { type: Number, min: 0, max: 1 },
            culturalSensitivityScore: { type: Number, min: 0, max: 1 },
            biasDetectionScore: { type: Number, min: 0, max: 1 }
        }
    },
    {
        timestamps: true,
    }
);

// Create indexes for efficient queries
aiAgentInteractionSchema.index({ interactionId: 1 });
aiAgentInteractionSchema.index({ agentId: 1 });
aiAgentInteractionSchema.index({ userId: 1 });
aiAgentInteractionSchema.index({ sessionId: 1 });
aiAgentInteractionSchema.index({ interactionType: 1 });
aiAgentInteractionSchema.index({ 'processing.startTime': -1 });
aiAgentInteractionSchema.index({ 'learningData.successfulOutcome': 1 });
aiAgentInteractionSchema.index({ 'feedback.userRating': -1 });

// Compound indexes for analytics
aiAgentInteractionSchema.index({ 
    agentId: 1, 
    'processing.startTime': -1 
});
aiAgentInteractionSchema.index({ 
    userId: 1, 
    interactionType: 1,
    'processing.startTime': -1 
});
aiAgentInteractionSchema.index({
    'learningData.successfulOutcome': 1,
    'feedback.userRating': -1,
    'processing.duration': 1
});

// TTL index for automatic data cleanup based on retention policy
aiAgentInteractionSchema.index(
    { createdAt: 1 },
    { 
        expireAfterSeconds: 0, // Will be calculated based on privacy.dataRetentionDays
        partialFilterExpression: { 'privacy.anonymized': false }
    }
);

// AI agent interaction model
const AIAgentInteraction: Model<IAIAgentInteractionDocument> =
    mongoose.models.AIAgentInteraction || mongoose.model<IAIAgentInteractionDocument>("AIAgentInteraction", aiAgentInteractionSchema);

export default AIAgentInteraction;