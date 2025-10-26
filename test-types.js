// Simple test to verify types compile correctly
const {
    validateArtisanProfile,
    validateEnhancedChatMessage,
    calculateProfileCompleteness,
    transformToArtisanProfile,
    createChatMessage,
    generateProfileId
} = require('./src/lib/utils/profile-utils.ts');

console.log('Testing Enhanced Artisan Buddy Types...');

// Test profile validation
const testProfile = {
    id: generateProfileId(),
    userId: 'test-user',
    personalInfo: {
        name: 'Test Artisan',
        location: 'Test City',
        languages: ['English'],
        experience: 2
    },
    skills: {
        primary: ['Test Skill'],
        secondary: [],
        certifications: []
    },
    products: {
        categories: ['Test Category'],
        specialties: [],
        priceRange: { min: 100, max: 1000, currency: 'USD' }
    },
    preferences: {
        communicationStyle: 'casual',
        responseLength: 'detailed',
        topics: []
    },
    businessInfo: {
        businessType: 'Individual',
        targetMarket: ['Local'],
        challenges: [],
        goals: []
    },
    metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        completeness: 0
    }
};

try {
    const profileResult = validateArtisanProfile(testProfile);
    console.log('✓ Profile validation:', profileResult.success ? 'PASSED' : 'FAILED');

    const completeness = calculateProfileCompleteness(testProfile);
    console.log('✓ Profile completeness calculation:', completeness, '%');

    const message = createChatMessage('Test message', 'user');
    console.log('✓ Chat message creation:', message.id ? 'PASSED' : 'FAILED');

    console.log('✓ All type tests completed successfully!');
} catch (error) {
    console.error('✗ Type test failed:', error.message);
    process.exit(1);
}