import {
    ArtisanProfile,
    EnhancedChatMessage,
    ConversationContext,
    validateArtisanProfile,
    validateEnhancedChatMessage,
    validateConversationContext,
    ArtisanProfileSchema,
    EnhancedChatMessageSchema,
    ConversationContextSchema,
} from '../enhanced-artisan-buddy';

import {
    calculateProfileCompleteness,
    transformToArtisanProfile,
    createConversationContext,
    createChatMessage,
    generateProfileId,
    generateConversationId,
    generateMessageId,
} from '../../utils/profile-utils';

describe('Enhanced Artisan Buddy Types', () => {
    describe('ArtisanProfile', () => {
        const validProfileData = {
            id: 'test-profile-1',
            userId: 'user-123',
            personalInfo: {
                name: 'John Artisan',
                location: 'Mumbai, India',
                languages: ['Hindi', 'English'],
                experience: 5,
            },
            skills: {
                primary: ['Pottery', 'Ceramics'],
                secondary: ['Painting'],
                certifications: ['Master Craftsman'],
            },
            products: {
                categories: ['Home Decor', 'Kitchenware'],
                specialties: ['Traditional Pottery'],
                priceRange: {
                    min: 100,
                    max: 5000,
                    currency: 'INR',
                },
            },
            preferences: {
                communicationStyle: 'casual' as const,
                responseLength: 'detailed' as const,
                topics: ['pottery techniques', 'market trends'],
            },
            businessInfo: {
                businessType: 'Individual Artisan',
                targetMarket: ['Local', 'Online'],
                challenges: ['Marketing', 'Pricing'],
                goals: ['Expand online presence', 'Increase sales'],
            },
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                completeness: 85,
            },
        };

        it('should validate a complete artisan profile', () => {
            const result = validateArtisanProfile(validProfileData);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.personalInfo.name).toBe('John Artisan');
        });

        it('should reject invalid profile data', () => {
            const invalidData = {
                ...validProfileData,
                personalInfo: {
                    ...validProfileData.personalInfo,
                    name: '', // Invalid: empty name
                },
            };

            const result = validateArtisanProfile(invalidData);
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });

        it('should calculate profile completeness correctly', () => {
            const completeness = calculateProfileCompleteness(validProfileData);
            expect(completeness).toBeGreaterThan(0);
            expect(completeness).toBeLessThanOrEqual(100);
        });

        it('should transform raw data to valid profile', () => {
            const rawData = {
                userId: 'user-456',
                personalInfo: {
                    name: 'Jane Artisan',
                    location: 'Delhi, India',
                    languages: ['Hindi'],
                },
                skills: {
                    primary: ['Weaving'],
                },
                products: {
                    categories: ['Textiles'],
                    priceRange: { min: 200, max: 2000 },
                },
                businessInfo: {
                    businessType: 'Small Business',
                    targetMarket: ['Local'],
                },
            };

            const profile = transformToArtisanProfile(rawData);
            expect(profile.personalInfo.name).toBe('Jane Artisan');
            expect(profile.metadata.completeness).toBeGreaterThan(0);
        });
    });

    describe('EnhancedChatMessage', () => {
        it('should validate a valid chat message', () => {
            const messageData = {
                id: 'msg-123',
                content: 'Hello, how can I help you today?',
                sender: 'assistant' as const,
                timestamp: new Date(),
            };

            const result = validateEnhancedChatMessage(messageData);
            expect(result.success).toBe(true);
            expect(result.data?.content).toBe('Hello, how can I help you today?');
        });

        it('should create a chat message with utility function', () => {
            const message = createChatMessage('Test message', 'user');
            expect(message.content).toBe('Test message');
            expect(message.sender).toBe('user');
            expect(message.id).toBeDefined();
            expect(message.timestamp).toBeInstanceOf(Date);
        });

        it('should reject invalid message data', () => {
            const invalidData = {
                id: 'msg-123',
                content: '', // Invalid: empty content
                sender: 'assistant',
                timestamp: new Date(),
            };

            const result = validateEnhancedChatMessage(invalidData);
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });
    });

    describe('ConversationContext', () => {
        it('should validate a valid conversation context', () => {
            const contextData = {
                conversationId: 'conv-123',
                userId: 'user-456',
                entities: {},
                conversationHistory: [],
                sessionMetadata: {
                    startTime: new Date(),
                    lastActivity: new Date(),
                    messageCount: 0,
                    voiceEnabled: false,
                },
            };

            const result = validateConversationContext(contextData);
            expect(result.success).toBe(true);
            expect(result.data?.conversationId).toBe('conv-123');
        });

        it('should create conversation context with utility function', () => {
            const context = createConversationContext('conv-456', 'user-789');
            expect(context.conversationId).toBe('conv-456');
            expect(context.userId).toBe('user-789');
            expect(context.conversationHistory).toEqual([]);
            expect(context.sessionMetadata.messageCount).toBe(0);
        });
    });

    describe('ID Generation', () => {
        it('should generate unique profile IDs', () => {
            const id1 = generateProfileId();
            const id2 = generateProfileId();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^profile_/);
        });

        it('should generate unique conversation IDs', () => {
            const id1 = generateConversationId();
            const id2 = generateConversationId();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^conv_/);
        });

        it('should generate unique message IDs', () => {
            const id1 = generateMessageId();
            const id2 = generateMessageId();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^msg_/);
        });
    });

    describe('Schema Validation', () => {
        it('should validate with Zod schemas directly', () => {
            const validMessage = {
                id: 'test-msg',
                content: 'Test content',
                sender: 'user' as const,
                timestamp: new Date(),
            };

            expect(() => EnhancedChatMessageSchema.parse(validMessage)).not.toThrow();
        });

        it('should throw on invalid schema data', () => {
            const invalidMessage = {
                id: '',
                content: 'Test content',
                sender: 'invalid-sender',
                timestamp: new Date(),
            };

            expect(() => EnhancedChatMessageSchema.parse(invalidMessage)).toThrow();
        });
    });
});