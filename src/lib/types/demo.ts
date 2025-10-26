// Demonstration of Enhanced Artisan Buddy Types
import {
    ArtisanProfile,
    EnhancedChatMessage,
    ConversationContext,
    validateArtisanProfile,
    validateEnhancedChatMessage,
    ArtisanProfileSchema,
} from './enhanced-artisan-buddy';

import {
    calculateProfileCompleteness,
    transformToArtisanProfile,
    createConversationContext,
    createChatMessage,
    generateProfileId,
    generateConversationId,
} from '../utils/profile-utils';

// Example: Creating and validating an artisan profile
export function demoArtisanProfile() {
    const profileData = {
        id: generateProfileId(),
        userId: 'demo-user-123',
        personalInfo: {
            name: 'Rajesh Kumar',
            location: 'Jaipur, Rajasthan',
            languages: ['Hindi', 'English', 'Rajasthani'],
            experience: 15,
        },
        skills: {
            primary: ['Blue Pottery', 'Traditional Ceramics'],
            secondary: ['Painting', 'Glazing'],
            certifications: ['Master Craftsman Certificate', 'Heritage Arts Award'],
        },
        products: {
            categories: ['Home Decor', 'Kitchenware', 'Art Pieces'],
            specialties: ['Jaipur Blue Pottery', 'Traditional Designs'],
            priceRange: {
                min: 500,
                max: 25000,
                currency: 'INR',
            },
        },
        preferences: {
            communicationStyle: 'casual' as const,
            responseLength: 'detailed' as const,
            topics: ['pottery techniques', 'traditional arts', 'market expansion'],
        },
        businessInfo: {
            businessType: 'Family Business',
            targetMarket: ['Tourists', 'Online Customers', 'Local Markets'],
            challenges: ['Digital Marketing', 'International Shipping', 'Competition'],
            goals: ['Expand to international markets', 'Teach pottery classes', 'Preserve traditional techniques'],
        },
        metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            completeness: 0, // Will be calculated
        },
    };

    // Validate the profile
    const validation = validateArtisanProfile(profileData);
    if (!validation.success) {
        throw new Error('Profile validation failed');
    }

    // Calculate completeness
    const completeness = calculateProfileCompleteness(profileData);
    profileData.metadata.completeness = completeness;

    return validation.data!;
}

// Example: Creating a conversation with messages
export function demoConversation() {
    const conversationId = generateConversationId();
    const userId = 'demo-user-123';

    // Create conversation context
    const context = createConversationContext(conversationId, userId);

    // Create some messages
    const userMessage = createChatMessage(
        'Hello, I need help with pricing my pottery products for the online market.',
        'user'
    );

    const assistantMessage = createChatMessage(
        'I\'d be happy to help you with pricing your pottery! Based on your profile, I can see you specialize in Jaipur Blue Pottery. Let me provide some market insights and pricing strategies.',
        'assistant',
        undefined,
        {
            confidence: 0.95,
            intent: 'pricing_help',
            entities: { product_type: 'pottery', market: 'online' },
        }
    );

    return {
        context,
        messages: [userMessage, assistantMessage],
    };
}

// Example: Transforming raw data to structured profile
export function demoDataTransformation() {
    const rawUserData = {
        userId: 'new-user-456',
        name: 'Priya Sharma',
        location: 'Udaipur',
        skills: ['Miniature Painting', 'Traditional Art'],
        products: ['Paintings', 'Decorative Items'],
        experience: '8 years',
        businessType: 'Individual Artist',
    };

    // Transform to structured profile
    const transformedData = {
        userId: rawUserData.userId,
        personalInfo: {
            name: rawUserData.name,
            location: rawUserData.location,
            languages: ['Hindi', 'English'], // Default
            experience: parseInt(rawUserData.experience) || 0,
        },
        skills: {
            primary: rawUserData.skills,
            secondary: [],
            certifications: [],
        },
        products: {
            categories: rawUserData.products,
            specialties: [],
            priceRange: { min: 0, max: 0, currency: 'INR' },
        },
        businessInfo: {
            businessType: rawUserData.businessType,
            targetMarket: ['Local'],
            challenges: [],
            goals: [],
        },
    };

    return transformToArtisanProfile(transformedData);
}

// Example usage and validation
export function runDemo() {
    console.log('=== Enhanced Artisan Buddy Types Demo ===\n');

    try {
        // Demo 1: Complete artisan profile
        console.log('1. Creating and validating artisan profile...');
        const profile = demoArtisanProfile();
        console.log(`   ✓ Profile created for: ${profile.personalInfo.name}`);
        console.log(`   ✓ Completeness: ${profile.metadata.completeness}%`);
        console.log(`   ✓ Primary skills: ${profile.skills.primary.join(', ')}\n`);

        // Demo 2: Conversation with messages
        console.log('2. Creating conversation context...');
        const conversation = demoConversation();
        console.log(`   ✓ Conversation ID: ${conversation.context.conversationId}`);
        console.log(`   ✓ Messages created: ${conversation.messages.length}`);
        console.log(`   ✓ Last message: "${conversation.messages[1].content.substring(0, 50)}..."\n`);

        // Demo 3: Data transformation
        console.log('3. Transforming raw data to structured profile...');
        const transformedProfile = demoDataTransformation();
        console.log(`   ✓ Transformed profile for: ${transformedProfile.personalInfo.name}`);
        console.log(`   ✓ Auto-calculated completeness: ${transformedProfile.metadata.completeness}%\n`);

        console.log('✅ All demos completed successfully!');
        return true;
    } catch (error) {
        console.error('❌ Demo failed:', error);
        return false;
    }
}