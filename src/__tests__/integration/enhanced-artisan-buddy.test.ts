/**
 * Enhanced Artisan Buddy Integration Tests
 * 
 * Tests complete conversation flows, voice-to-voice cycles, and profile-aware responses
 * Requirements: 1.1, 2.1, 5.2
 */

import { NextRequest } from 'next/server';
import { EnhancedArtisanBuddyService } from '../../lib/services/EnhancedArtisanBuddyV2';
import { ConversationStateService } from '../../lib/service/ConversationStateService';
import { ResponseGenerationService } from '../../lib/service/ResponseGenerationService';
import { VectorStoreService } from '../../lib/service/VectorStoreService';
import { RAGPipelineService } from '../../lib/service/RAGPipelineService';
import {
    ArtisanProfile,
    MessageInput,
    ConversationContext,
    EnhancedChatMessage
} from '../../lib/types/enhanced-artisan-buddy';

// Mock external services for testing
jest.mock('../../lib/service/VectorStoreService');
jest.mock('../../lib/service/RAGPipelineService');

describe('Enhanced Artisan Buddy Integration Tests', () => {
    let enhancedBuddy: EnhancedArtisanBuddyService;
    let conversationService: ConversationStateService;
    let responseService: ResponseGenerationService;
    let mockVectorStore: jest.Mocked<VectorStoreService>;
    let mockRAGPipeline: jest.Mocked<RAGPipelineService>;

    const testUserId = 'test-user-123';
    const testConversationId = 'test-conversation-456';

    const mockArtisanProfile: ArtisanProfile = {
        id: 'profile-123',
        userId: testUserId,
        personalInfo: {
            name: 'Test Artisan',
            location: 'Mumbai, India',
            languages: ['English', 'Hindi'],
            experience: 5
        },
        skills: {
            primary: ['pottery', 'ceramics'],
            secondary: ['painting', 'glazing'],
            certifications: ['Traditional Pottery Certificate']
        },
        products: {
            categories: ['home-decor', 'kitchenware'],
            specialties: ['handmade bowls', 'decorative vases'],
            priceRange: { min: 500, max: 5000, currency: 'USD' }
        },
        preferences: {
            communicationStyle: 'casual',
            responseLength: 'detailed',
            topics: ['pottery techniques', 'market trends']
        },
        businessInfo: {
            businessType: 'individual',
            targetMarket: ['local customers', 'online buyers'],
            challenges: ['marketing', 'pricing'],
            goals: ['increase sales', 'expand product line']
        },
        metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            completeness: 85
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Get service instances
        enhancedBuddy = EnhancedArtisanBuddyService.getInstance();
        conversationService = ConversationStateService.getInstance();
        responseService = ResponseGenerationService.getInstance();

        // Setup mocks
        mockVectorStore = VectorStoreService.prototype as jest.Mocked<VectorStoreService>;
        mockRAGPipeline = RAGPipelineService.prototype as jest.Mocked<RAGPipelineService>;

        // Mock vector store responses
        mockVectorStore.searchSimilarProfiles = jest.fn().mockResolvedValue([
            {
                profile: mockArtisanProfile,
                similarity: 0.85,
                matchedFields: ['skills.primary', 'products.categories']
            }
        ]);

        // Mock RAG pipeline responses
        mockRAGPipeline.retrieveRelevantContext = jest.fn().mockResolvedValue([
            {
                content: 'Pottery techniques and market trends information',
                source: 'artisan-profile',
                relevanceScore: 0.9,
                metadata: { profileId: 'profile-123' }
            }
        ]);

        mockRAGPipeline.generateResponse = jest.fn().mockResolvedValue(
            'Based on your pottery expertise, I recommend focusing on seasonal designs for better market appeal.'
        );
    });

    describe('Complete Conversation Flows', () => {
        it('should handle complete text conversation flow with context persistence', async () => {
            // Initialize conversation
            const context = await enhancedBuddy.initializeConversation(testUserId, mockArtisanProfile);
            expect(context.userId).toBe(testUserId);
            expect(context.profileContext).toEqual(mockArtisanProfile);

            // First message - greeting
            const greetingInput: MessageInput = {
                content: 'Hello, I need help with my pottery business',
                userId: testUserId,
                conversationId: context.conversationId,
                inputType: 'text',
                context
            };

            const greetingResponse = await enhancedBuddy.processMessage(greetingInput);

            expect(greetingResponse.content).toBeDefined();
            expect(greetingResponse.metadata?.intent).toBe('greeting');
            expect(greetingResponse.updatedContext).toBeDefined();

            // Second message - specific query
            const queryInput: MessageInput = {
                content: 'What pottery techniques should I focus on for better sales?',
                userId: testUserId,
                conversationId: context.conversationId,
                inputType: 'text',
                context: greetingResponse.updatedContext
            };

            const queryResponse = await enhancedBuddy.processMessage(queryInput);

            expect(queryResponse.content).toBeDefined();
            expect(queryResponse.metadata?.confidence).toBeGreaterThan(0.5);
            expect(queryResponse.updatedContext?.conversationHistory.length).toBeGreaterThan(2);

            // Verify conversation history persistence
            const history = await enhancedBuddy.getConversationHistory(testUserId, context.conversationId);
            expect(history.length).toBeGreaterThanOrEqual(4); // 2 user messages + 2 assistant responses
        });

        it('should maintain conversation context across multiple turns', async () => {
            const context = await enhancedBuddy.initializeConversation(testUserId, mockArtisanProfile);

            const messages = [
                'I want to create new pottery products',
                'What materials should I use?',
                'How should I price them?',
                'Where can I sell them online?'
            ];

            let currentContext = context;

            for (const message of messages) {
                const input: MessageInput = {
                    content: message,
                    userId: testUserId,
                    conversationId: context.conversationId,
                    inputType: 'text',
                    context: currentContext
                };

                const response = await enhancedBuddy.processMessage(input);
                expect(response.content).toBeDefined();
                expect(response.updatedContext).toBeDefined();

                currentContext = response.updatedContext!;
            }

            // Verify final context has all messages
            expect(currentContext.conversationHistory.length).toBe(messages.length * 2); // Each message + response
            expect(currentContext.sessionMetadata.messageCount).toBe(messages.length);
        });
    });

    describe('Voice-to-Voice Conversation Cycles', () => {
        it('should handle voice input and generate voice-enabled responses', async () => {
            const context = await enhancedBuddy.initializeConversation(testUserId, mockArtisanProfile);

            const voiceInput: MessageInput = {
                content: 'Help me with pottery glazing techniques',
                userId: testUserId,
                conversationId: context.conversationId,
                inputType: 'voice',
                context
            };

            const response = await enhancedBuddy.processMessage(voiceInput);

            expect(response.content).toBeDefined();
            expect(response.updatedContext?.sessionMetadata.voiceEnabled).toBe(true);
            expect(response.metadata?.source).toBe('assistant');
        });

        it('should maintain voice session state across multiple voice interactions', async () => {
            const context = await enhancedBuddy.initializeConversation(testUserId, mockArtisanProfile);

            const voiceMessages = [
                'What are the best clay types for beginners?',
                'How do I prepare the clay properly?',
                'What tools do I need for pottery?'
            ];

            let currentContext = context;

            for (const message of voiceMessages) {
                const input: MessageInput = {
                    content: message,
                    userId: testUserId,
                    conversationId: context.conversationId,
                    inputType: 'voice',
                    context: currentContext
                };

                const response = await enhancedBuddy.processMessage(input);
                expect(response.updatedContext?.sessionMetadata.voiceEnabled).toBe(true);
                currentContext = response.updatedContext!;
            }

            expect(currentContext.sessionMetadata.voiceEnabled).toBe(true);
            expect(currentContext.conversationHistory.length).toBe(voiceMessages.length * 2);
        });

        it('should handle mixed text and voice inputs in same conversation', async () => {
            const context = await enhancedBuddy.initializeConversation(testUserId, mockArtisanProfile);

            const interactions = [
                { content: 'Hello', type: 'text' as const },
                { content: 'Tell me about pottery wheels', type: 'voice' as const },
                { content: 'What about electric vs manual wheels?', type: 'text' as const },
                { content: 'Which one would you recommend for me?', type: 'voice' as const }
            ];

            let currentContext = context;

            for (const interaction of interactions) {
                const input: MessageInput = {
                    content: interaction.content,
                    userId: testUserId,
                    conversationId: context.conversationId,
                    inputType: interaction.type,
                    context: currentContext
                };

                const response = await enhancedBuddy.processMessage(input);
                expect(response.content).toBeDefined();
                currentContext = response.updatedContext!;
            }

            // Voice should be enabled after voice interactions
            expect(currentContext.sessionMetadata.voiceEnabled).toBe(true);
            expect(currentContext.conversationHistory.length).toBe(interactions.length * 2);
        });
    });

    describe('Profile-Aware Response Generation', () => {
        it('should generate responses based on artisan profile context', async () => {
            const context = await enhancedBuddy.initializeConversation(testUserId, mockArtisanProfile);

            const profileSpecificInput: MessageInput = {
                content: 'What products should I focus on to increase my sales?',
                userId: testUserId,
                conversationId: context.conversationId,
                inputType: 'text',
                context
            };

            const response = await enhancedBuddy.processMessage(profileSpecificInput);

            expect(response.content).toBeDefined();
            expect(response.content.toLowerCase()).toContain('pottery');
            expect(mockRAGPipeline.retrieveRelevantContext).toHaveBeenCalledWith(
                expect.stringContaining('products'),
                testUserId
            );
        });

        it('should adapt responses based on user preferences', async () => {
            // Test with different communication styles
            const casualProfile = {
                ...mockArtisanProfile,
                preferences: {
                    ...mockArtisanProfile.preferences,
                    communicationStyle: 'casual' as const
                }
            };

            const context = await enhancedBuddy.initializeConversation(testUserId, casualProfile);

            const input: MessageInput = {
                content: 'How can I improve my pottery business?',
                userId: testUserId,
                conversationId: context.conversationId,
                inputType: 'text',
                context
            };

            const response = await enhancedBuddy.processMessage(input);

            expect(response.content).toBeDefined();
            expect(response.updatedContext?.profileContext?.preferences.communicationStyle).toBe('casual');
        });

        it('should handle users without complete profiles gracefully', async () => {
            const incompleteProfile: ArtisanProfile = {
                ...mockArtisanProfile,
                skills: { primary: ['basic crafts'], secondary: [], certifications: [] },
                products: { categories: ['general'], specialties: [], priceRange: { min: 100, max: 1000, currency: 'USD' } },
                metadata: { ...mockArtisanProfile.metadata, completeness: 20 }
            };

            const context = await enhancedBuddy.initializeConversation(testUserId, incompleteProfile);

            const input: MessageInput = {
                content: 'Help me with my business',
                userId: testUserId,
                conversationId: context.conversationId,
                inputType: 'text',
                context
            };

            const response = await enhancedBuddy.processMessage(input);

            expect(response.content).toBeDefined();
            expect(response.content.toLowerCase()).toContain('profile');
        });
    });

    describe('API Endpoint Integration', () => {
        it('should handle POST requests to enhanced-artisan-buddy endpoint', async () => {
            const request = new NextRequest('http://localhost:3000/api/enhanced-artisan-buddy', {
                method: 'POST',
                body: JSON.stringify({
                    message: 'Hello, I need help with pottery',
                    userId: testUserId,
                    enableVoice: false
                })
            });

            const { POST } = await import('../../app/api/enhanced-artisan-buddy/route');
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.response).toBeDefined();
            expect(data.timestamp).toBeDefined();
        });

        it('should handle GET requests for conversation history', async () => {
            const url = new URL(`http://localhost:3000/api/enhanced-artisan-buddy?userId=${testUserId}&action=history`);
            const request = new NextRequest(url);

            const { GET } = await import('../../app/api/enhanced-artisan-buddy/route');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.history).toBeDefined();
        });

        it('should handle DELETE requests for clearing conversation history', async () => {
            const url = new URL(`http://localhost:3000/api/enhanced-artisan-buddy?userId=${testUserId}&action=clear-history`);
            const request = new NextRequest(url, { method: 'DELETE' });

            const { DELETE } = await import('../../app/api/enhanced-artisan-buddy/route');
            const response = await DELETE(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toContain('cleared');
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should handle service failures gracefully', async () => {
            // Mock service failure
            mockRAGPipeline.retrieveRelevantContext.mockRejectedValue(new Error('Service unavailable'));

            const context = await enhancedBuddy.initializeConversation(testUserId, mockArtisanProfile);

            const input: MessageInput = {
                content: 'Help me with pottery techniques',
                userId: testUserId,
                conversationId: context.conversationId,
                inputType: 'text',
                context
            };

            const response = await enhancedBuddy.processMessage(input);

            expect(response.content).toBeDefined();
            expect(response.metadata?.intent).toBe('error');
        });

        it('should recover from temporary failures', async () => {
            const context = await enhancedBuddy.initializeConversation(testUserId, mockArtisanProfile);

            // First call fails
            mockRAGPipeline.generateResponse.mockRejectedValueOnce(new Error('Temporary failure'));

            const input: MessageInput = {
                content: 'What pottery techniques should I learn?',
                userId: testUserId,
                conversationId: context.conversationId,
                inputType: 'text',
                context
            };

            const response = await enhancedBuddy.processMessage(input);
            expect(response.content).toBeDefined();

            // Second call succeeds
            mockRAGPipeline.generateResponse.mockResolvedValue('Here are some pottery techniques...');

            const secondResponse = await enhancedBuddy.processMessage(input);
            expect(secondResponse.content).toBeDefined();
            expect(secondResponse.metadata?.intent).not.toBe('error');
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle multiple concurrent conversations', async () => {
            const userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
            const conversations = await Promise.all(
                userIds.map(userId => enhancedBuddy.initializeConversation(userId, mockArtisanProfile))
            );

            expect(conversations).toHaveLength(5);
            expect(new Set(conversations.map(c => c.conversationId))).toHaveProperty('size', 5);
        });

        it('should maintain performance with conversation history', async () => {
            const context = await enhancedBuddy.initializeConversation(testUserId, mockArtisanProfile);

            // Add many messages to test performance
            const messages = Array.from({ length: 20 }, (_, i) => `Message ${i + 1}`);

            let currentContext = context;
            const startTime = Date.now();

            for (const message of messages) {
                const input: MessageInput = {
                    content: message,
                    userId: testUserId,
                    conversationId: context.conversationId,
                    inputType: 'text',
                    context: currentContext
                };

                const response = await enhancedBuddy.processMessage(input);
                currentContext = response.updatedContext!;
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Should process all messages within reasonable time (adjust threshold as needed)
            expect(totalTime).toBeLessThan(10000); // 10 seconds for 20 messages
            expect(currentContext.conversationHistory.length).toBe(messages.length * 2);
        });
    });
});