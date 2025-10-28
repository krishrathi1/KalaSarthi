import mongoose, { Document, Model, Schema } from "mongoose";

// Chat message interface
export interface IChatMessage {
    id: string;
    senderId: string;
    receiverId: string;
    originalText: string;
    originalLanguage: string;
    translatedText?: string;
    targetLanguage?: string;
    messageType: 'text' | 'image' | 'design' | 'order_update' | 'voice' | 'file';
    timestamp: Date;
    attachments?: Array<{
        type: 'image' | 'file' | 'design';
        url: string;
        filename?: string;
        size?: number;
        metadata?: Record<string, any>;
    }>;
    translationMetadata?: {
        confidence: number;
        service: string;
        alternativeTranslations?: string[];
        culturalContext?: string;
    };
    aiAnalysis?: {
        sentiment: 'positive' | 'negative' | 'neutral';
        intent: string;
        confidence: number;
        keyTopics: string[];
        urgency: 'low' | 'medium' | 'high';
    };
    status: 'sent' | 'delivered' | 'read' | 'failed';
    editHistory?: Array<{
        originalText: string;
        editedAt: Date;
        reason?: string;
    }>;
}

// Chat session interface
export interface IChatSession {
    sessionId: string;
    participants: {
        buyerId: string;
        artisanId: string;
        buyerLanguage: string;
        artisanLanguage: string;
    };
    orderId?: string;
    status: 'active' | 'archived' | 'order_created' | 'blocked';
    settings: {
        translationEnabled: boolean;
        notificationsEnabled: boolean;
        aiAssistanceEnabled: boolean;
        culturalContextEnabled: boolean;
    };
    messages: IChatMessage[];
    aiContext: {
        conversationSummary?: string;
        keyDecisions: Array<{
            decision: string;
            timestamp: Date;
            confidence: number;
        }>;
        culturalNotes: string[];
        recommendedActions: Array<{
            action: string;
            reason: string;
            priority: 'low' | 'medium' | 'high';
        }>;
        negotiationStatus?: {
            stage: 'initial' | 'discussing' | 'negotiating' | 'finalizing' | 'agreed';
            priceRange?: { min: number; max: number };
            timeline?: string;
            customRequirements?: string[];
        };
    };
    metadata: {
        createdAt: Date;
        lastActivity: Date;
        messageCount: number;
        translationCount: number;
        averageResponseTime: number;
        satisfactionScore?: number;
    };
}

// Chat document interface
export interface IChatDocument extends IChatSession, Document {}

// Chat schema
const chatMessageSchema = new Schema({
    id: { type: String, required: true },
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    originalText: { type: String, required: true },
    originalLanguage: { type: String, required: true },
    translatedText: String,
    targetLanguage: String,
    messageType: {
        type: String,
        enum: ['text', 'image', 'design', 'order_update', 'voice', 'file'],
        default: 'text'
    },
    timestamp: { type: Date, default: Date.now },
    attachments: [{
        type: { type: String, enum: ['image', 'file', 'design'] },
        url: String,
        filename: String,
        size: Number,
        metadata: Schema.Types.Mixed
    }],
    translationMetadata: {
        confidence: { type: Number, min: 0, max: 1 },
        service: String,
        alternativeTranslations: [String],
        culturalContext: String
    },
    aiAnalysis: {
        sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
        intent: String,
        confidence: { type: Number, min: 0, max: 1 },
        keyTopics: [String],
        urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'low' }
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'failed'],
        default: 'sent'
    },
    editHistory: [{
        originalText: String,
        editedAt: Date,
        reason: String
    }]
});

const chatSchema = new Schema<IChatDocument>(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true,
        },
        participants: {
            buyerId: { type: String, required: true },
            artisanId: { type: String, required: true },
            buyerLanguage: { type: String, default: 'en' },
            artisanLanguage: { type: String, default: 'en' }
        },
        orderId: String,
        status: {
            type: String,
            enum: ['active', 'archived', 'order_created', 'blocked'],
            default: 'active'
        },
        settings: {
            translationEnabled: { type: Boolean, default: true },
            notificationsEnabled: { type: Boolean, default: true },
            aiAssistanceEnabled: { type: Boolean, default: true },
            culturalContextEnabled: { type: Boolean, default: true }
        },
        messages: [chatMessageSchema],
        aiContext: {
            conversationSummary: String,
            keyDecisions: [{
                decision: String,
                timestamp: Date,
                confidence: { type: Number, min: 0, max: 1 }
            }],
            culturalNotes: [String],
            recommendedActions: [{
                action: String,
                reason: String,
                priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
            }],
            negotiationStatus: {
                stage: {
                    type: String,
                    enum: ['initial', 'discussing', 'negotiating', 'finalizing', 'agreed'],
                    default: 'initial'
                },
                priceRange: {
                    min: Number,
                    max: Number
                },
                timeline: String,
                customRequirements: [String]
            }
        },
        metadata: {
            createdAt: { type: Date, default: Date.now },
            lastActivity: { type: Date, default: Date.now },
            messageCount: { type: Number, default: 0 },
            translationCount: { type: Number, default: 0 },
            averageResponseTime: { type: Number, default: 0 },
            satisfactionScore: { type: Number, min: 0, max: 5 }
        }
    },
    {
        timestamps: true,
    }
);

// Create indexes for efficient queries
chatSchema.index({ sessionId: 1 });
chatSchema.index({ 'participants.buyerId': 1 });
chatSchema.index({ 'participants.artisanId': 1 });
chatSchema.index({ orderId: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ 'metadata.lastActivity': -1 });
chatSchema.index({ 'aiContext.negotiationStatus.stage': 1 });

// Compound indexes
chatSchema.index({ 
    'participants.buyerId': 1, 
    'metadata.lastActivity': -1 
});
chatSchema.index({ 
    'participants.artisanId': 1, 
    status: 1,
    'metadata.lastActivity': -1 
});

// Text search for messages
chatSchema.index({
    'messages.originalText': 'text',
    'messages.translatedText': 'text',
    'aiContext.conversationSummary': 'text'
});

// Chat model
const Chat: Model<IChatDocument> =
    mongoose.models.Chat || mongoose.model<IChatDocument>("Chat", chatSchema);

export default Chat;