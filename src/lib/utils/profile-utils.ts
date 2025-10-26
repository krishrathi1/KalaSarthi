import {
    ArtisanProfile,
    ConversationContext,
    EnhancedChatMessage,
    ProfileMetadata,
    ArtisanProfileSchema,
    ConversationContextSchema,
    EnhancedChatMessageSchema
} from '../types/enhanced-artisan-buddy';

// ============================================================================
// Profile Data Transformation Utilities
// ============================================================================

/**
 * Calculates the completeness percentage of an artisan profile
 */
export function calculateProfileCompleteness(profile: Partial<ArtisanProfile>): number {
    const requiredFields = [
        'personalInfo.name',
        'personalInfo.location',
        'personalInfo.languages',
        'skills.primary',
        'products.categories',
        'products.priceRange',
        'businessInfo.businessType',
        'businessInfo.targetMarket',
    ];

    const optionalFields = [
        'personalInfo.experience',
        'skills.secondary',
        'skills.certifications',
        'products.specialties',
        'preferences.communicationStyle',
        'preferences.responseLength',
        'preferences.topics',
        'businessInfo.challenges',
        'businessInfo.goals',
    ];

    let completedRequired = 0;
    let completedOptional = 0;

    // Check required fields
    requiredFields.forEach(field => {
        const value = getNestedValue(profile, field);
        if (value !== undefined && value !== null && value !== '' &&
            (!Array.isArray(value) || value.length > 0)) {
            completedRequired++;
        }
    });

    // Check optional fields
    optionalFields.forEach(field => {
        const value = getNestedValue(profile, field);
        if (value !== undefined && value !== null && value !== '' &&
            (!Array.isArray(value) || value.length > 0)) {
            completedOptional++;
        }
    });

    // Required fields are worth 70%, optional fields are worth 30%
    const requiredPercentage = (completedRequired / requiredFields.length) * 70;
    const optionalPercentage = (completedOptional / optionalFields.length) * 30;

    return Math.round(requiredPercentage + optionalPercentage);
}

/**
 * Helper function to get nested object values using dot notation
 */
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Transforms raw profile data into a validated ArtisanProfile
 */
export function transformToArtisanProfile(rawData: any): ArtisanProfile {
    // Set default values for missing fields
    const transformedData = {
        id: rawData.id || generateProfileId(),
        userId: rawData.userId || '',
        personalInfo: {
            name: rawData.personalInfo?.name || '',
            location: rawData.personalInfo?.location || '',
            languages: rawData.personalInfo?.languages || [],
            experience: rawData.personalInfo?.experience || 0,
        },
        skills: {
            primary: rawData.skills?.primary || [],
            secondary: rawData.skills?.secondary || [],
            certifications: rawData.skills?.certifications || [],
        },
        products: {
            categories: rawData.products?.categories || [],
            specialties: rawData.products?.specialties || [],
            priceRange: {
                min: rawData.products?.priceRange?.min || 0,
                max: rawData.products?.priceRange?.max || 0,
                currency: rawData.products?.priceRange?.currency || 'USD',
            },
        },
        preferences: {
            communicationStyle: rawData.preferences?.communicationStyle || 'casual',
            responseLength: rawData.preferences?.responseLength || 'detailed',
            topics: rawData.preferences?.topics || [],
        },
        businessInfo: {
            businessType: rawData.businessInfo?.businessType || '',
            targetMarket: rawData.businessInfo?.targetMarket || [],
            challenges: rawData.businessInfo?.challenges || [],
            goals: rawData.businessInfo?.goals || [],
        },
        metadata: {
            createdAt: rawData.metadata?.createdAt || new Date(),
            updatedAt: new Date(),
            completeness: 0, // Will be calculated below
            embedding: rawData.metadata?.embedding,
        },
    };

    // Calculate completeness
    transformedData.metadata.completeness = calculateProfileCompleteness(transformedData);

    // Validate the transformed data
    return ArtisanProfileSchema.parse(transformedData);
}

/**
 * Updates an existing profile with new data while preserving metadata
 */
export function updateArtisanProfile(
    existingProfile: ArtisanProfile,
    updates: Partial<ArtisanProfile>
): ArtisanProfile {
    const updatedProfile = {
        ...existingProfile,
        ...updates,
        metadata: {
            ...existingProfile.metadata,
            ...updates.metadata,
            updatedAt: new Date(),
        },
    };

    // Recalculate completeness
    updatedProfile.metadata.completeness = calculateProfileCompleteness(updatedProfile);

    return ArtisanProfileSchema.parse(updatedProfile);
}

/**
 * Extracts searchable text from an artisan profile for embedding generation
 */
export function extractProfileText(profile: ArtisanProfile): string {
    const textParts = [
        profile.personalInfo.name,
        profile.personalInfo.location,
        profile.personalInfo.languages.join(', '),
        `${profile.personalInfo.experience} years experience`,
        profile.skills.primary.join(', '),
        profile.skills.secondary.join(', '),
        profile.skills.certifications.join(', '),
        profile.products.categories.join(', '),
        profile.products.specialties.join(', '),
        profile.businessInfo.businessType,
        profile.businessInfo.targetMarket.join(', '),
        profile.businessInfo.challenges.join(', '),
        profile.businessInfo.goals.join(', '),
        profile.preferences.topics.join(', '),
    ];

    return textParts.filter(text => text && text.trim()).join(' ');
}

// ============================================================================
// Conversation Context Utilities
// ============================================================================

/**
 * Creates a new conversation context with default values
 */
export function createConversationContext(
    conversationId: string,
    userId: string,
    profileContext?: ArtisanProfile
): ConversationContext {
    const context: ConversationContext = {
        conversationId,
        userId,
        entities: {},
        profileContext,
        conversationHistory: [],
        sessionMetadata: {
            startTime: new Date(),
            lastActivity: new Date(),
            messageCount: 0,
            voiceEnabled: false,
        },
    };

    return ConversationContextSchema.parse(context);
}

/**
 * Updates conversation context with a new message
 */
export function updateConversationContext(
    context: ConversationContext,
    message: EnhancedChatMessage,
    intent?: string,
    entities?: Record<string, any>
): ConversationContext {
    const updatedContext = {
        ...context,
        currentIntent: intent || context.currentIntent,
        entities: { ...context.entities, ...entities },
        conversationHistory: [...context.conversationHistory, message],
        sessionMetadata: {
            ...context.sessionMetadata,
            lastActivity: new Date(),
            messageCount: context.sessionMetadata.messageCount + 1,
        },
    };

    return ConversationContextSchema.parse(updatedContext);
}

/**
 * Trims conversation history to keep only recent messages
 */
export function trimConversationHistory(
    context: ConversationContext,
    maxMessages: number = 50
): ConversationContext {
    if (context.conversationHistory.length <= maxMessages) {
        return context;
    }

    const trimmedHistory = context.conversationHistory.slice(-maxMessages);

    return ConversationContextSchema.parse({
        ...context,
        conversationHistory: trimmedHistory,
    });
}

// ============================================================================
// Chat Message Utilities
// ============================================================================

/**
 * Creates a new chat message with validation
 */
export function createChatMessage(
    content: string,
    sender: 'user' | 'assistant',
    audioUrl?: string,
    metadata?: any
): EnhancedChatMessage {
    const message: EnhancedChatMessage = {
        id: generateMessageId(),
        content,
        sender,
        timestamp: new Date(),
        audioUrl,
        metadata,
    };

    return EnhancedChatMessageSchema.parse(message);
}

/**
 * Formats a chat message for display
 */
export function formatChatMessage(message: EnhancedChatMessage): string {
    const timestamp = message.timestamp.toLocaleTimeString();
    const sender = message.sender === 'user' ? 'You' : 'Assistant';
    return `[${timestamp}] ${sender}: ${message.content}`;
}

// ============================================================================
// ID Generation Utilities
// ============================================================================

/**
 * Generates a unique profile ID
 */
export function generateProfileId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique conversation ID
 */
export function generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique message ID
 */
export function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates and sanitizes profile input data
 */
export function sanitizeProfileData(data: any): Partial<ArtisanProfile> {
    // Remove any potentially harmful content
    const sanitized = JSON.parse(JSON.stringify(data));

    // Trim string values
    if (sanitized.personalInfo?.name) {
        sanitized.personalInfo.name = sanitized.personalInfo.name.trim();
    }
    if (sanitized.personalInfo?.location) {
        sanitized.personalInfo.location = sanitized.personalInfo.location.trim();
    }
    if (sanitized.businessInfo?.businessType) {
        sanitized.businessInfo.businessType = sanitized.businessInfo.businessType.trim();
    }

    // Ensure arrays are valid
    if (sanitized.personalInfo?.languages && !Array.isArray(sanitized.personalInfo.languages)) {
        sanitized.personalInfo.languages = [];
    }
    if (sanitized.skills?.primary && !Array.isArray(sanitized.skills.primary)) {
        sanitized.skills.primary = [];
    }

    return sanitized;
}

/**
 * Checks if a profile has minimum required data for functionality
 */
export function hasMinimumProfileData(profile: Partial<ArtisanProfile>): boolean {
    return !!(
        profile.personalInfo?.name &&
        profile.personalInfo?.location &&
        profile.skills?.primary?.length &&
        profile.products?.categories?.length &&
        profile.businessInfo?.businessType
    );
}

/**
 * Gets missing required fields from a profile
 */
export function getMissingRequiredFields(profile: Partial<ArtisanProfile>): string[] {
    const missing: string[] = [];

    if (!profile.personalInfo?.name) missing.push('Personal name');
    if (!profile.personalInfo?.location) missing.push('Location');
    if (!profile.personalInfo?.languages?.length) missing.push('Languages');
    if (!profile.skills?.primary?.length) missing.push('Primary skills');
    if (!profile.products?.categories?.length) missing.push('Product categories');
    if (!profile.businessInfo?.businessType) missing.push('Business type');
    if (!profile.businessInfo?.targetMarket?.length) missing.push('Target market');

    return missing;
}