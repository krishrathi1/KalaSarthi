/**
 * Unit Tests for RAGPipelineService
 * Tests query processing, context retrieval, and AI response generation
 */

import { RAGPipelineService } from '../../lib/service/RAGPipelineService';
import { VectorStoreService } from '../../lib/service/VectorStoreService';
import {
    ArtisanProfile,
    RetrievalResult,
    ConversationContext
} from '../../lib/types/enhanced-artisan-buddy';

// Mock dependencies
jest.mock('@google/generative-ai');
jest.mock('../../lib/service/VectorStoreService');

// Mock data for testing
const mockArtisanProfile: ArtisanProfile = {
    id: 'test-artisan-1',
    userId: 'user-123',
    personalInfo: {
        name: 'Priya Sharma',
        location: 'Udaipur, Rajasthan',
        languages: ['Hindi', 'English'],
        experience: 12
    },
    skills: {
        primary: ['textile weaving', 'block printing', 'embroidery'],
        secondary: ['natural dyeing', 'pattern design'],
        certifications: ['Traditional Textile Arts Certificate']
    },
    products: {
        categories: ['clothing', 'home textiles', 'accessories'],
        specialties: ['bandhani', 'leheriya', 'mirror work'],
        priceRange: {
            min: 800,
            max: 8000,
            currency: 'INR'
        }
    },
    preferences: {
        communicationStyle: 'casual',
        responseLength: 'detailed',
        topics: ['traditional techniques', 'sustainable practices']
    },
    businessInfo: {
        businessType: 'textile crafts',
        targetMarket: ['fashion designers', 'boutiques', 'export'],
        challenges: ['competition', 'raw material costs'],
        goals: ['scale production', 'preserve traditions']
    },
    metadata: {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        completeness: 90
    }
};

const mockRetrievalResult: RetrievalResult = {
    content: `Artisan: Priya Sharma from Udaipur, Rajasthan
Experience: 12 years
Skills: textile weaving, block printing, embroidery
Products: clothing, home textiles, accessories`,
    source: 'artisan_profile:test-artisan-1',
    relevanceScore: 0.85,
    metadata: mockArtisanProfile.metadata
};

const mockConversationContext: ConversationContext = {
    conversationId: 'conv-123',
    userId: 'user-456',
    entities: {},
    profileContext: mockArtisanProfile,
    conversationHistory: [],
    sessionMetadata: {
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 1,
        voiceEnabled: false
    }
};

describe('RAGPipelineService', () => {
    let ragPipelineService: RAGPipelineService;
    let mockVectorStoreService: jest.Mocked<VectorStoreService>;
    let mockGenAI: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset the singleton instance
        (RAGPipelineService as any).instance = undefined;

        // Setup Gemini AI mock
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        mockGenAI = {
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => 'Based on the artisan profiles I found, I can help you connect with skilled textile artisans in Rajasthan who specialize in traditional weaving and block printing techniques.'
                    }
                })
            })
        };
        GoogleGenerativeAI.mockImplementation(() => mockGenAI);

        // Setup VectorStoreService mock
        mockVectorStoreService = {
            initialize: jest.fn().mockResolvedValue(undefined),
            searchSimilarProfiles: jest.fn().mockResolvedValue([{
                profile: mockArtisanProfile,
                similarity: 0.85,
                matchedFields: ['skills.primary', 'personalInfo.location']
            }]),
            storeProfile: jest.fn().mockResolvedValue('test-artisan-1'),
            updateProfile: jest.fn().mockResolvedValue(undefined),
            deleteProfile: jest.fn().mockResolvedValue(undefined),
            getHealthStatus: jest.fn().mockResolvedValue({
                healthy: true,
                stats: { totalProfiles: 5 }
            })
        } as any;

        (VectorStoreService.getInstance as jest.Mock).mockReturnValue(mockVectorStoreService);

        // Get fresh instance for each test
        ragPipelineService = RAGPipelineService.getInstance();
    });

    describe('Query Processing and Analysis', () => {
        it('should process query and detect profile search intent', async () => {
            const query = 'Find artisans who make traditional textiles in Rajasthan';
            const analysis = await ragPipelineService.processQuery(query, 'user-123');

            expect(analysis.intent).toBe('profile_search');
            expect(analysis.queryType).toBe('profile_search');
            expect(analysis.confidence).toBeGreaterThan(0.5);
            expect(analysis.keywords).toContain('artisans');
            expect(analysis.keywords).toContain('traditional');
            expect(analysis.keywords).toContain('textiles');
        });

        it('should process query and detect skill inquiry intent', async () => {
            const query = 'How to learn block printing techniques?';
            const analysis = await ragPipelineService.processQuery(query);

            expect(analysis.intent).toBe('skill_inquiry');
            expect(analysis.queryType).toBe('skill_inquiry');
            expect(analysis.keywords).toContain('learn');
            expect(analysis.keywords).toContain('block');
            expect(analysis.keywords).toContain('printing');
        });

        it('should process query and detect product question intent', async () => {
            const query = 'What is the price range for handwoven sarees?';
            const analysis = await ragPipelineService.processQuery(query);

            expect(analysis.intent).toBe('product_question');
            expect(analysis.queryType).toBe('product_question');
            expect(analysis.keywords).toContain('price');
            expect(analysis.keywords).toContain('handwoven');
        });

        it('should extract location entities from query', async () => {
            const query = 'Find pottery artisans in Jaipur';
            const analysis = await ragPipelineService.processQuery(query);

            expect(analysis.entities.location).toBe('Jaipur');
        });

        it('should extract skill entities from query', async () => {
            const query = 'Looking for experts in pottery and ceramics';
            const analysis = await ragPipelineService.processQuery(query);

            expect(analysis.entities.skills).toContain('pottery');
            expect(analysis.entities.skills).toContain('ceramics');
        });

        it('should extract price range entities from query', async () => {
            const query = 'Products between $100 to $500';
            const analysis = await ragPipelineService.processQuery(query);

            expect(analysis.entities.priceRange).toEqual({
                min: 100,
                max: 500
            });
        });

        it('should handle query processing errors gracefully', async () => {
            const analysis = await ragPipelineService.processQuery('');

            expect(analysis.intent).toBe('general_help');
            expect(analysis.confidence).toBeLessThan(0.5);
        });
    });

    describe('Context Retrieval and Ranking', () => {
        it('should retrieve relevant context for profile search query', async () => {
            const query = 'Find textile artisans in Rajasthan';
            const results = await ragPipelineService.retrieveRelevantContext(query, 'user-123');

            expect(results).toHaveLength(1);
            expect(results[0].source).toBe('artisan_profile:test-artisan-1');
            expect(results[0].relevanceScore).toBeGreaterThan(0.7);
            expect(results[0].content).toContain('Priya Sharma');
            expect(results[0].content).toContain('Udaipur, Rajasthan');
        });

        it('should apply relevance filtering', async () => {
            // Mock low relevance results
            mockVectorStoreService.searchSimilarProfiles.mockResolvedValueOnce([{
                profile: mockArtisanProfile,
                similarity: 0.3, // Low similarity
                matchedFields: []
            }]);

            const results = await ragPipelineService.retrieveRelevantContext(
                'test query',
                'user-123',
                { minRelevanceScore: 0.7 }
            );

            expect(results).toHaveLength(0); // Should be filtered out
        });

        it('should apply permission-based filtering', async () => {
            const results = await ragPipelineService.retrieveRelevantContext(
                'test query',
                'test-artisan-1', // Same user as profile
                { filterByPermissions: true }
            );

            // Should filter out user's own profile
            expect(results).toHaveLength(0);
        });

        it('should limit results based on maxResults option', async () => {
            await ragPipelineService.retrieveRelevantContext(
                'test query',
                'user-123',
                { maxResults: 2 }
            );

            expect(mockVectorStoreService.searchSimilarProfiles).toHaveBeenCalledWith(
                expect.any(String),
                2
            );
        });

        it('should handle vector store errors gracefully', async () => {
            mockVectorStoreService.searchSimilarProfiles.mockRejectedValueOnce(new Error('Vector store unavailable'));

            const results = await ragPipelineService.retrieveRelevantContext('test query', 'user-123');

            expect(results).toEqual([]);
        });
    });

    describe('AI Response Generation', () => {
        it('should generate response with retrieved context', async () => {
            const query = 'Tell me about textile artisans in Rajasthan';
            const context = [mockRetrievalResult];

            const response = await ragPipelineService.generateResponse(query, context, mockConversationContext);

            expect(response.content).toContain('artisan profiles');
            expect(response.sources).toEqual(context);
            expect(response.confidence).toBeGreaterThan(0.5);
            expect(response.metadata.intent).toBeDefined();
            expect(response.metadata.source).toBe('assistant');
        });

        it('should generate response without context', async () => {
            const query = 'General help with artisan business';
            const context: RetrievalResult[] = [];

            const response = await ragPipelineService.generateResponse(query, context);

            expect(response.content).toBeDefined();
            expect(response.sources).toEqual([]);
            expect(response.confidence).toBeLessThan(0.8); // Lower confidence without context
        });

        it('should include source attribution when context is available', async () => {
            const query = 'Tell me about textile techniques';
            const context = [mockRetrievalResult];

            const response = await ragPipelineService.generateResponse(query, context);

            expect(response.content).toContain('artisan profile');
        });

        it('should handle AI generation errors with fallback', async () => {
            mockGenAI.getGenerativeModel().generateContent.mockRejectedValueOnce(new Error('AI service down'));

            const query = 'Test query';
            const context = [mockRetrievalResult];

            const response = await ragPipelineService.generateResponse(query, context);

            expect(response.content).toContain('apologize');
            expect(response.confidence).toBe(0.3);
            expect(response.metadata.intent).toBe('error_fallback');
        });

        it('should apply user preferences for response length', async () => {
            const contextWithBriefPreference = {
                ...mockConversationContext,
                profileContext: {
                    ...mockArtisanProfile,
                    preferences: {
                        ...mockArtisanProfile.preferences,
                        responseLength: 'brief' as const
                    }
                }
            };

            const response = await ragPipelineService.generateResponse(
                'Tell me about textiles',
                [mockRetrievalResult],
                contextWithBriefPreference
            );

            // Brief responses should be shorter
            expect(response.content.length).toBeLessThan(500);
        });
    });

    describe('Knowledge Base Management', () => {
        it('should update knowledge base with new profile', async () => {
            await ragPipelineService.initialize();
            await ragPipelineService.updateKnowledgeBase(mockArtisanProfile);

            expect(mockVectorStoreService.storeProfile).toHaveBeenCalledWith(mockArtisanProfile);
        });

        it('should handle knowledge base update errors', async () => {
            await ragPipelineService.initialize();
            mockVectorStoreService.storeProfile.mockRejectedValueOnce(new Error('Storage failed'));

            await expect(ragPipelineService.updateKnowledgeBase(mockArtisanProfile))
                .rejects.toThrow('Storage failed');
        });
    });

    describe('Similar Artisan Search', () => {
        it('should search for similar artisans by criteria', async () => {
            await ragPipelineService.initialize();
            const criteria = {
                skills: ['weaving', 'dyeing'],
                location: 'Rajasthan',
                experienceRange: { min: 5, max: 15 }
            };

            const results = await ragPipelineService.searchSimilarArtisans(criteria, 3);

            expect(results).toHaveLength(1);
            expect(results[0].content).toContain('Priya Sharma');
            expect(mockVectorStoreService.searchSimilarProfiles).toHaveBeenCalledWith(
                expect.stringContaining('skills:weaving dyeing'),
                3
            );
        });

        it('should filter by experience range', async () => {
            const criteria = {
                experienceRange: { min: 20, max: 30 } // Outside mock profile range
            };

            const results = await ragPipelineService.searchSimilarArtisans(criteria);

            expect(results).toHaveLength(0); // Should be filtered out
        });

        it('should handle search errors gracefully', async () => {
            await ragPipelineService.initialize();
            mockVectorStoreService.searchSimilarProfiles.mockRejectedValueOnce(new Error('Search failed'));

            const results = await ragPipelineService.searchSimilarArtisans({ skills: ['pottery'] });

            expect(results).toEqual([]);
        });
    });

    describe('Service Health and Initialization', () => {
        it('should return healthy status when all services are operational', async () => {
            await ragPipelineService.initialize();
            const health = await ragPipelineService.getHealthStatus();

            expect(health.healthy).toBe(true);
            expect(health.details.initialized).toBe(true);
            expect(health.details.vectorStore.healthy).toBe(true);
        });

        it('should return unhealthy status when vector store fails', async () => {
            mockVectorStoreService.getHealthStatus.mockResolvedValueOnce({
                healthy: false,
                stats: { error: 'Vector store down' }
            });

            const health = await ragPipelineService.getHealthStatus();

            expect(health.healthy).toBe(false);
        });

        it('should initialize service dependencies', async () => {
            // Reset initialization state
            (ragPipelineService as any).isInitialized = false;

            await ragPipelineService.initialize();

            expect(mockVectorStoreService.initialize).toHaveBeenCalled();
        });

        it('should handle initialization errors', async () => {
            // Reset initialization state
            (ragPipelineService as any).isInitialized = false;
            mockVectorStoreService.initialize.mockRejectedValueOnce(new Error('Init failed'));

            await expect(ragPipelineService.initialize()).rejects.toThrow('Init failed');
        });
    });

    describe('Profile Context Retrieval', () => {
        it('should get context for specific profile IDs', async () => {
            const profileIds = ['test-artisan-1'];
            const results = await ragPipelineService.getProfileContext(profileIds);

            expect(results).toHaveLength(1);
            expect(results[0].source).toBe('artisan_profile:test-artisan-1');
            expect(results[0].relevanceScore).toBe(1.0);
        });

        it('should handle missing profiles gracefully', async () => {
            await ragPipelineService.initialize();
            mockVectorStoreService.searchSimilarProfiles.mockResolvedValueOnce([]);

            const results = await ragPipelineService.getProfileContext(['nonexistent-id']);

            expect(results).toHaveLength(0);
        });
    });
});