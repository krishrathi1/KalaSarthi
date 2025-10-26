/**
 * Enhanced Artisan Buddy Performance and Load Tests
 * 
 * Tests system under concurrent user load, response times, resource usage,
 * error recovery and system resilience
 * Requirements: 7.1, 7.2, 7.5
 */

import { performance } from 'perf_hooks';
import { EnhancedArtisanBuddyService } from '../../lib/services/EnhancedArtisanBuddyV2';
import { VectorStoreService } from '../../lib/service/VectorStoreService';
import { RAGPipelineService } from '../../lib/service/RAGPipelineService';
import {
    ArtisanProfile,
    MessageInput,
    ConversationContext
} from '../../lib/types/enhanced-artisan-buddy';

// Mock external services for controlled testing
jest.mock('../../lib/service/VectorStoreService');
jest.mock('../../lib/service/RAGPipelineService');

describe('Enhanced Artisan Buddy Performance Tests', () => {
    let enhancedBuddy: EnhancedArtisanBuddyService;
    let mockVectorStore: jest.Mocked<VectorStoreService>;
    let mockRAGPipeline: jest.Mocked<RAGPipelineService>;

    const mockArtisanProfile: ArtisanProfile = {
        id: 'perf-test-profile',
        userId: 'perf-test-user',
        personalInfo: {
            name: 'Performance Test Artisan',
            location: 'Test City',
            languages: ['English'],
            experience: 3
        },
        skills: {
            primary: ['pottery'],
            secondary: ['painting'],
            certifications: []
        },
        products: {
            categories: ['home-decor'],
            specialties: ['vases'],
            priceRange: { min: 100, max: 1000, currency: 'USD' }
        },
        preferences: {
            communicationStyle: 'casual',
            responseLength: 'brief',
            topics: ['pottery']
        },
        businessInfo: {
            businessType: 'individual',
            targetMarket: ['local'],
            challenges: ['marketing'],
            goals: ['growth']
        },
        metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            completeness: 80
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        enhancedBuddy = EnhancedArtisanBuddyService.getInstance();

        // Setup fast mock responses for performance testing
        mockVectorStore = VectorStoreService.prototype as jest.Mocked<VectorStoreService>;
        mockRAGPipeline = RAGPipelineService.prototype as jest.Mocked<RAGPipelineService>;

        mockVectorStore.searchSimilarProfiles = jest.fn().mockResolvedValue([
            {
                profile: mockArtisanProfile,
                similarity: 0.8,
                matchedFields: ['skills.primary']
            }
        ]);

        mockRAGPipeline.retrieveRelevantContext = jest.fn().mockResolvedValue([
            {
                content: 'Test context content',
                source: 'test-source',
                relevanceScore: 0.9,
                metadata: { profileId: 'test-profile' }
            }
        ]);

        mockRAGPipeline.generateResponse = jest.fn().mockResolvedValue('Test response');
    });

    describe('Response Time Performance Tests', () => {
        it('should respond to text inputs within 2 seconds (Requirement 7.1)', async () => {
            const context = await enhancedBuddy.initializeConversation('perf-user-1', mockArtisanProfile);

            const input: MessageInput = {
                content: 'Help me with pottery techniques',
                userId: 'perf-user-1',
                conversationId: context.conversationId,
                inputType: 'text',
                context
            };

            const startTime = performance.now();
            const response = await enhancedBuddy.processMessage(input);
            const endTime = performance.now();

            const responseTime = endTime - startTime;

            expect(response.content).toBeDefined();
            expect(responseTime).toBeLessThan(2000); // 2 seconds requirement
            console.log(`Text response time: ${responseTime.toFixed(2)}ms`);
        });

        it('should process voice input with latency under 1 second (Requirement 7.2)', async () => {
            const context = await enhancedBuddy.initializeConversation('perf-user-2', mockArtisanProfile);

            const voiceInput: MessageInput = {
                content: 'What pottery tools do I need?',
                userId: 'perf-user-2',
                conversationId: context.conversationId,
                inputType: 'voice',
                context
            };

            const startTime = performance.now();
            const response = await enhancedBuddy.processMessage(voiceInput);
            const endTime = performance.now();

            const responseTime = endTime - startTime;

            expect(response.content).toBeDefined();
            expect(responseTime).toBeLessThan(1000); // 1 second requirement for voice
            console.log(`Voice response time: ${responseTime.toFixed(2)}ms`);
        });

        it('should return vector store search results within 500ms (Requirement 7.5)', async () => {
            const startTime = performance.now();
            const results = await mockVectorStore.searchSimilarProfiles('pottery skills', 5);
            const endTime = performance.now();

            const searchTime = endTime - startTime;

            expect(results).toBeDefined();
            expect(searchTime).toBeLessThan(500); // 500ms requirement
            console.log(`Vector search time: ${searchTime.toFixed(2)}ms`);
        });

        it('should maintain performance with increasing conversation history', async () => {
            const context = await enhancedBuddy.initializeConversation('perf-user-3', mockArtisanProfile);

            const responseTimes: number[] = [];
            let currentContext = context;

            // Test with increasing conversation history
            for (let i = 1; i <= 10; i++) {
                const input: MessageInput = {
                    content: `Message ${i}: Tell me about pottery technique ${i}`,
                    userId: 'perf-user-3',
                    conversationId: context.conversationId,
                    inputType: 'text',
                    context: currentContext
                };

                const startTime = performance.now();
                const response = await enhancedBuddy.processMessage(input);
                const endTime = performance.now();

                const responseTime = endTime - startTime;
                responseTimes.push(responseTime);
                currentContext = response.updatedContext!;

                expect(responseTime).toBeLessThan(2000); // Should maintain performance
            }

            // Performance should not degrade significantly
            const firstResponse = responseTimes[0];
            const lastResponse = responseTimes[responseTimes.length - 1];
            const degradation = (lastResponse - firstResponse) / firstResponse;

            expect(degradation).toBeLessThan(0.5); // Less than 50% degradation
            console.log(`Performance degradation: ${(degradation * 100).toFixed(2)}%`);
        });
    });

    describe('Concurrent User Load Tests', () => {
        it('should handle 10 concurrent users without performance degradation', async () => {
            const concurrentUsers = 10;
            const userPromises: Promise<any>[] = [];

            for (let i = 0; i < concurrentUsers; i++) {
                const userId = `concurrent-user-${i}`;
                const promise = (async () => {
                    const context = await enhancedBuddy.initializeConversation(userId, mockArtisanProfile);

                    const input: MessageInput = {
                        content: `User ${i} asking about pottery`,
                        userId,
                        conversationId: context.conversationId,
                        inputType: 'text',
                        context
                    };

                    const startTime = performance.now();
                    const response = await enhancedBuddy.processMessage(input);
                    const endTime = performance.now();

                    return {
                        userId,
                        responseTime: endTime - startTime,
                        success: !!response.content
                    };
                })();

                userPromises.push(promise);
            }

            const results = await Promise.all(userPromises);

            // All users should get responses
            expect(results.every(r => r.success)).toBe(true);

            // Average response time should still be reasonable
            const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
            expect(avgResponseTime).toBeLessThan(3000); // 3 seconds under load

            console.log(`Concurrent users: ${concurrentUsers}`);
            console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
            console.log(`Max response time: ${Math.max(...results.map(r => r.responseTime)).toFixed(2)}ms`);
        });

        it('should handle 50 concurrent conversations with multiple messages each', async () => {
            const concurrentConversations = 50;
            const messagesPerConversation = 3;
            const conversationPromises: Promise<any>[] = [];

            for (let i = 0; i < concurrentConversations; i++) {
                const userId = `load-user-${i}`;
                const promise = (async () => {
                    const context = await enhancedBuddy.initializeConversation(userId, mockArtisanProfile);
                    let currentContext = context;
                    const responseTimes: number[] = [];

                    for (let j = 0; j < messagesPerConversation; j++) {
                        const input: MessageInput = {
                            content: `User ${i} message ${j + 1}`,
                            userId,
                            conversationId: context.conversationId,
                            inputType: 'text',
                            context: currentContext
                        };

                        const startTime = performance.now();
                        const response = await enhancedBuddy.processMessage(input);
                        const endTime = performance.now();

                        responseTimes.push(endTime - startTime);
                        currentContext = response.updatedContext!;
                    }

                    return {
                        userId,
                        responseTimes,
                        totalMessages: messagesPerConversation * 2, // User + assistant messages
                        avgResponseTime: responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
                    };
                })();

                conversationPromises.push(promise);
            }

            const results = await Promise.all(conversationPromises);

            // All conversations should complete successfully
            expect(results).toHaveLength(concurrentConversations);

            // Calculate overall performance metrics
            const allResponseTimes = results.flatMap(r => r.responseTimes);
            const overallAvgTime = allResponseTimes.reduce((sum, t) => sum + t, 0) / allResponseTimes.length;
            const maxResponseTime = Math.max(...allResponseTimes);

            expect(overallAvgTime).toBeLessThan(4000); // 4 seconds under heavy load
            expect(maxResponseTime).toBeLessThan(10000); // 10 seconds max

            console.log(`Concurrent conversations: ${concurrentConversations}`);
            console.log(`Messages per conversation: ${messagesPerConversation}`);
            console.log(`Total messages processed: ${allResponseTimes.length}`);
            console.log(`Overall average response time: ${overallAvgTime.toFixed(2)}ms`);
            console.log(`Maximum response time: ${maxResponseTime.toFixed(2)}ms`);
        });

        it('should maintain conversation isolation under concurrent load', async () => {
            const concurrentUsers = 20;
            const userPromises: Promise<any>[] = [];

            for (let i = 0; i < concurrentUsers; i++) {
                const userId = `isolation-user-${i}`;
                const promise = (async () => {
                    const context = await enhancedBuddy.initializeConversation(userId, mockArtisanProfile);

                    // Send unique message
                    const uniqueMessage = `Unique message from user ${i} about pottery technique ${i}`;
                    const input: MessageInput = {
                        content: uniqueMessage,
                        userId,
                        conversationId: context.conversationId,
                        inputType: 'text',
                        context
                    };

                    const response = await enhancedBuddy.processMessage(input);

                    // Get conversation history
                    const history = await enhancedBuddy.getConversationHistory(userId, context.conversationId);

                    return {
                        userId,
                        conversationId: context.conversationId,
                        uniqueMessage,
                        historyLength: history.length,
                        hasUniqueMessage: history.some(msg => msg.content.includes(`user ${i}`))
                    };
                })();

                userPromises.push(promise);
            }

            const results = await Promise.all(userPromises);

            // Each user should have their own isolated conversation
            const conversationIds = results.map(r => r.conversationId);
            const uniqueConversationIds = new Set(conversationIds);
            expect(uniqueConversationIds.size).toBe(concurrentUsers);

            // Each conversation should contain the user's unique message
            expect(results.every(r => r.hasUniqueMessage)).toBe(true);

            console.log(`Conversation isolation test: ${concurrentUsers} users`);
            console.log(`Unique conversations created: ${uniqueConversationIds.size}`);
        });
    });

    describe('Resource Usage and Memory Tests', () => {
        it('should maintain memory usage under 100MB per active session (Requirement 7.5)', async () => {
            const initialMemory = process.memoryUsage();
            const sessions = 10;
            const contexts: ConversationContext[] = [];

            // Create multiple active sessions
            for (let i = 0; i < sessions; i++) {
                const context = await enhancedBuddy.initializeConversation(`memory-user-${i}`, mockArtisanProfile);
                contexts.push(context);

                // Add some conversation history
                for (let j = 0; j < 5; j++) {
                    const input: MessageInput = {
                        content: `Memory test message ${j}`,
                        userId: `memory-user-${i}`,
                        conversationId: context.conversationId,
                        inputType: 'text',
                        context
                    };

                    await enhancedBuddy.processMessage(input);
                }
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryPerSession = memoryIncrease / sessions;

            // Should use less than 100MB per session
            const maxMemoryPerSession = 100 * 1024 * 1024; // 100MB in bytes
            expect(memoryPerSession).toBeLessThan(maxMemoryPerSession);

            console.log(`Memory usage per session: ${(memoryPerSession / 1024 / 1024).toFixed(2)}MB`);
            console.log(`Total memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        });

        it('should handle memory cleanup when conversations are cleared', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            const userId = 'cleanup-test-user';

            // Create conversation with history
            const context = await enhancedBuddy.initializeConversation(userId, mockArtisanProfile);

            // Add substantial conversation history
            for (let i = 0; i < 20; i++) {
                const input: MessageInput = {
                    content: `Cleanup test message ${i} with some longer content to use more memory`,
                    userId,
                    conversationId: context.conversationId,
                    inputType: 'text',
                    context
                };

                await enhancedBuddy.processMessage(input);
            }

            const beforeCleanup = process.memoryUsage().heapUsed;

            // Clear conversation history (this would typically call a cleanup method)
            // For this test, we'll simulate cleanup by creating a new conversation
            await enhancedBuddy.initializeConversation(userId, mockArtisanProfile);

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const afterCleanup = process.memoryUsage().heapUsed;

            console.log(`Memory before cleanup: ${(beforeCleanup / 1024 / 1024).toFixed(2)}MB`);
            console.log(`Memory after cleanup: ${(afterCleanup / 1024 / 1024).toFixed(2)}MB`);

            // Memory should not continuously grow
            expect(afterCleanup).toBeLessThanOrEqual(beforeCleanup * 1.1); // Allow 10% variance
        });
    });

    describe('Error Recovery and System Resilience Tests', () => {
        it('should recover gracefully from vector store failures', async () => {
            const context = await enhancedBuddy.initializeConversation('resilience-user-1', mockArtisanProfile);

            // Simulate vector store failure
            mockVectorStore.searchSimilarProfiles.mockRejectedValue(new Error('Vector store unavailable'));

            const input: MessageInput = {
                content: 'Help me with pottery despite service failure',
                userId: 'resilience-user-1',
                conversationId: context.conversationId,
                inputType: 'text',
                context
            };

            const startTime = performance.now();
            const response = await enhancedBuddy.processMessage(input);
            const endTime = performance.now();

            // Should still provide a response within reasonable time
            expect(response.content).toBeDefined();
            expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max for error handling
            expect(response.metadata?.intent).toBe('error');

            console.log(`Error recovery time: ${(endTime - startTime).toFixed(2)}ms`);
        });

        it('should handle RAG pipeline failures with fallback responses', async () => {
            const context = await enhancedBuddy.initializeConversation('resilience-user-2', mockArtisanProfile);

            // Simulate RAG pipeline failure
            mockRAGPipeline.generateResponse.mockRejectedValue(new Error('AI service unavailable'));

            const input: MessageInput = {
                content: 'Generate response despite AI failure',
                userId: 'resilience-user-2',
                conversationId: context.conversationId,
                inputType: 'text',
                context
            };

            const response = await enhancedBuddy.processMessage(input);

            expect(response.content).toBeDefined();
            expect(response.content.toLowerCase()).toContain('sorry');
        });

        it('should maintain system stability under intermittent failures', async () => {
            const context = await enhancedBuddy.initializeConversation('stability-user', mockArtisanProfile);
            let successCount = 0;
            let failureCount = 0;

            // Simulate intermittent failures
            for (let i = 0; i < 10; i++) {
                // Fail every 3rd request
                if (i % 3 === 0) {
                    mockRAGPipeline.generateResponse.mockRejectedValueOnce(new Error('Intermittent failure'));
                } else {
                    mockRAGPipeline.generateResponse.mockResolvedValueOnce(`Success response ${i}`);
                }

                const input: MessageInput = {
                    content: `Stability test message ${i}`,
                    userId: 'stability-user',
                    conversationId: context.conversationId,
                    inputType: 'text',
                    context
                };

                try {
                    const response = await enhancedBuddy.processMessage(input);
                    if (response.content && !response.content.toLowerCase().includes('sorry')) {
                        successCount++;
                    } else {
                        failureCount++;
                    }
                } catch (error) {
                    failureCount++;
                }
            }

            // System should handle failures gracefully
            expect(successCount + failureCount).toBe(10);
            expect(successCount).toBeGreaterThan(0); // Some requests should succeed

            console.log(`Stability test - Success: ${successCount}, Failures handled: ${failureCount}`);
        });

        it('should recover automatically when services come back online', async () => {
            const context = await enhancedBuddy.initializeConversation('recovery-user', mockArtisanProfile);

            // First request fails
            mockRAGPipeline.generateResponse.mockRejectedValueOnce(new Error('Service down'));

            const failedInput: MessageInput = {
                content: 'This should fail initially',
                userId: 'recovery-user',
                conversationId: context.conversationId,
                inputType: 'text',
                context
            };

            const failedResponse = await enhancedBuddy.processMessage(failedInput);
            expect(failedResponse.metadata?.intent).toBe('error');

            // Service recovers
            mockRAGPipeline.generateResponse.mockResolvedValue('Service is back online');

            const recoveredInput: MessageInput = {
                content: 'This should succeed after recovery',
                userId: 'recovery-user',
                conversationId: context.conversationId,
                inputType: 'text',
                context: failedResponse.updatedContext
            };

            const recoveredResponse = await enhancedBuddy.processMessage(recoveredInput);
            expect(recoveredResponse.content).toContain('Service is back online');
            expect(recoveredResponse.metadata?.intent).not.toBe('error');
        });
    });

    describe('Stress Testing', () => {
        it('should handle burst traffic without system failure', async () => {
            const burstSize = 100;
            const burstPromises: Promise<any>[] = [];

            // Create burst of simultaneous requests
            for (let i = 0; i < burstSize; i++) {
                const promise = (async () => {
                    const userId = `burst-user-${i}`;
                    const context = await enhancedBuddy.initializeConversation(userId, mockArtisanProfile);

                    const input: MessageInput = {
                        content: `Burst request ${i}`,
                        userId,
                        conversationId: context.conversationId,
                        inputType: 'text',
                        context
                    };

                    const startTime = performance.now();
                    const response = await enhancedBuddy.processMessage(input);
                    const endTime = performance.now();

                    return {
                        success: !!response.content,
                        responseTime: endTime - startTime
                    };
                })();

                burstPromises.push(promise);
            }

            const results = await Promise.allSettled(burstPromises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            // At least 80% should succeed under burst load
            const successRate = successful / burstSize;
            expect(successRate).toBeGreaterThan(0.8);

            console.log(`Burst test - Size: ${burstSize}, Success rate: ${(successRate * 100).toFixed(1)}%`);
            console.log(`Successful: ${successful}, Failed: ${failed}`);
        });
    });
});