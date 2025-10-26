import { z } from 'zod';

// ============================================================================
// Core Data Models for Enhanced Artisan Buddy
// ============================================================================

// Price Range Schema and Interface
export const PriceRangeSchema = z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default('USD'),
});

export type PriceRange = z.infer<typeof PriceRangeSchema>;

// Personal Information Schema and Interface
export const PersonalInfoSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    location: z.string().min(1, 'Location is required'),
    languages: z.array(z.string()).min(1, 'At least one language is required'),
    experience: z.number().min(0, 'Experience must be non-negative'),
});

export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;

// Skills Schema and Interface
export const SkillsSchema = z.object({
    primary: z.array(z.string()).min(1, 'At least one primary skill is required'),
    secondary: z.array(z.string()).default([]),
    certifications: z.array(z.string()).default([]),
});

export type Skills = z.infer<typeof SkillsSchema>;

// Products Schema and Interface
export const ProductsSchema = z.object({
    categories: z.array(z.string()).min(1, 'At least one product category is required'),
    specialties: z.array(z.string()).default([]),
    priceRange: PriceRangeSchema,
});

export type Products = z.infer<typeof ProductsSchema>;

// Preferences Schema and Interface
export const PreferencesSchema = z.object({
    communicationStyle: z.enum(['formal', 'casual', 'technical']).default('casual'),
    responseLength: z.enum(['brief', 'detailed', 'comprehensive']).default('detailed'),
    topics: z.array(z.string()).default([]),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

// Business Information Schema and Interface
export const BusinessInfoSchema = z.object({
    businessType: z.string().min(1, 'Business type is required'),
    targetMarket: z.array(z.string()).min(1, 'At least one target market is required'),
    challenges: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([]),
});

export type BusinessInfo = z.infer<typeof BusinessInfoSchema>;

// Profile Metadata Schema and Interface
export const ProfileMetadataSchema = z.object({
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
    completeness: z.number().min(0).max(100).default(0),
    embedding: z.array(z.number()).optional(),
});

export type ProfileMetadata = z.infer<typeof ProfileMetadataSchema>;

// Main Artisan Profile Schema and Interface
export const ArtisanProfileSchema = z.object({
    id: z.string().min(1, 'Profile ID is required'),
    userId: z.string().min(1, 'User ID is required'),
    personalInfo: PersonalInfoSchema,
    skills: SkillsSchema,
    products: ProductsSchema,
    preferences: PreferencesSchema,
    businessInfo: BusinessInfoSchema,
    metadata: ProfileMetadataSchema,
});

export type ArtisanProfile = z.infer<typeof ArtisanProfileSchema>;

// Message Metadata Schema and Interface
export const MessageMetadataSchema = z.object({
    confidence: z.number().min(0).max(1).optional(),
    intent: z.string().optional(),
    entities: z.record(z.any()).optional(),
    processingTime: z.number().optional(),
    source: z.enum(['user', 'assistant', 'system']).optional(),
});

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

// Enhanced Chat Message Schema and Interface
export const EnhancedChatMessageSchema = z.object({
    id: z.string().min(1, 'Message ID is required'),
    content: z.string().min(1, 'Message content is required'),
    sender: z.enum(['user', 'assistant']),
    timestamp: z.date().default(() => new Date()),
    audioUrl: z.string().url().optional(),
    metadata: MessageMetadataSchema.optional(),
});

export type EnhancedChatMessage = z.infer<typeof EnhancedChatMessageSchema>;

// Session Metadata Schema and Interface
export const SessionMetadataSchema = z.object({
    startTime: z.date().default(() => new Date()),
    lastActivity: z.date().default(() => new Date()),
    messageCount: z.number().min(0).default(0),
    voiceEnabled: z.boolean().default(false),
});

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;

// Conversation Context Schema and Interface
export const ConversationContextSchema = z.object({
    conversationId: z.string().min(1, 'Conversation ID is required'),
    userId: z.string().min(1, 'User ID is required'),
    currentIntent: z.string().optional(),
    entities: z.record(z.any()).default({}),
    profileContext: ArtisanProfileSchema.optional(),
    conversationHistory: z.array(EnhancedChatMessageSchema).default([]),
    sessionMetadata: SessionMetadataSchema,
});

export type ConversationContext = z.infer<typeof ConversationContextSchema>;

// ============================================================================
// Service Interface Types
// ============================================================================

// Message Input Schema and Interface
export const MessageInputSchema = z.object({
    content: z.string().min(1, 'Message content is required'),
    userId: z.string().min(1, 'User ID is required'),
    conversationId: z.string().min(1, 'Conversation ID is required'),
    inputType: z.enum(['text', 'voice']).default('text'),
    context: ConversationContextSchema.optional(),
});

export type MessageInput = z.infer<typeof MessageInputSchema>;

// Message Response Schema and Interface
export const MessageResponseSchema = z.object({
    content: z.string().min(1, 'Response content is required'),
    audioUrl: z.string().url().optional(),
    metadata: MessageMetadataSchema.optional(),
    updatedContext: ConversationContextSchema.optional(),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;

// Profile Match Schema and Interface
export const ProfileMatchSchema = z.object({
    profile: ArtisanProfileSchema,
    similarity: z.number().min(0).max(1),
    matchedFields: z.array(z.string()),
});

export type ProfileMatch = z.infer<typeof ProfileMatchSchema>;

// Retrieval Result Schema and Interface
export const RetrievalResultSchema = z.object({
    content: z.string().min(1, 'Content is required'),
    source: z.string().min(1, 'Source is required'),
    relevanceScore: z.number().min(0).max(1),
    metadata: ProfileMetadataSchema,
});

export type RetrievalResult = z.infer<typeof RetrievalResultSchema>;

// Error Response Schema and Interface
export const ErrorResponseSchema = z.object({
    error: z.object({
        code: z.string().min(1, 'Error code is required'),
        message: z.string().min(1, 'Error message is required'),
        details: z.any().optional(),
        fallbackAction: z.string().optional(),
    }),
    fallbackResponse: z.string().optional(),
    retryable: z.boolean().default(false),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates an artisan profile and returns validation result
 */
export function validateArtisanProfile(data: unknown): {
    success: boolean;
    data?: ArtisanProfile;
    errors?: z.ZodError;
} {
    try {
        const validatedData = ArtisanProfileSchema.parse(data);
        return { success: true, data: validatedData };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, errors: error };
        }
        throw error;
    }
}

/**
 * Validates an enhanced chat message and returns validation result
 */
export function validateEnhancedChatMessage(data: unknown): {
    success: boolean;
    data?: EnhancedChatMessage;
    errors?: z.ZodError;
} {
    try {
        const validatedData = EnhancedChatMessageSchema.parse(data);
        return { success: true, data: validatedData };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, errors: error };
        }
        throw error;
    }
}

/**
 * Validates conversation context and returns validation result
 */
export function validateConversationContext(data: unknown): {
    success: boolean;
    data?: ConversationContext;
    errors?: z.ZodError;
} {
    try {
        const validatedData = ConversationContextSchema.parse(data);
        return { success: true, data: validatedData };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, errors: error };
        }
        throw error;
    }
}

/**
 * Validates message input and returns validation result
 */
export function validateMessageInput(data: unknown): {
    success: boolean;
    data?: MessageInput;
    errors?: z.ZodError;
} {
    try {
        const validatedData = MessageInputSchema.parse(data);
        return { success: true, data: validatedData };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, errors: error };
        }
        throw error;
    }
}