/**
 * Unit Tests for VectorStoreService
 * Tests embedding generation, search functionality, and profile CRUD operations
 */

import { VectorStoreService } from '../../lib/service/VectorStoreService';
import { ArtisanProfile } from '../../lib/database/vector-schema';

// Mock dependencies
jest.mock('@google/generative-ai');
jest.mock('../../lib/service/SemanticSearchService');
jest.mock('../../lib/database/vector-connection-pool');
jest.mock('../../lib/service/EmbeddingService');
jest.mock('../../lib/config/vector-store-config');

// Mock profile data for testing
const mockArtisanProfile: ArtisanProfile = {
    id: 'test-artisan-1',
    userId: 'user-123',
    personalInfo: {
        name: 'Rajesh Kumar',
        location: 'Jaipur, Rajasthan',
        languages: ['Hindi', 'English'],
        experience: 15
    },
    skills: {
        primary: ['pottery', 'ceramics', 'traditional crafts'],
        secondary: ['painting', 'sculpture'],
        certifications: ['Master Craftsman Certificate']
    },
    products: {
        categories: ['home decor', 'kitchenware', 'art pieces'],
        specialties: ['blue pottery', 'terracotta'],
        priceRange: {
            min: 500,
            max: 5000,
            currency: 'INR'
        }
    },
    preferences: {
        communicationStyle: 'casual',
        responseLength: 'detailed',
        topics: ['traditional techniques', 'modern designs']
    },
    businessInfo: {
        businessType: 'handicrafts',
        targetMarket: ['tourists', 'collectors', 'interior designers'],
        challenges: ['marketing', 'online presence'],
        goals: ['expand business', 'teach apprentices']
    },
    metadata: {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        completeness: 85,
        embedding: [0.1, 0.2, 0.3]
    }
};

describe('VectorStoreService', () => {
    let vectorStoreService: VectorStoreService;
    let mockSemanticSearchService: any;
    let mockGenAI: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mocks
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        mockGenAI = {
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => 'Mocked AI response for artisan assistance'
                    }
                })
            })
        };
        GoogleGenerativeAI.mockImplementation(() => mockGenAI);

        const { SemanticSearchService } = require('../../lib/service/SemanticSearchService');
        mockSemanticSearchService = {
            initialize: jest.fn().mockResolvedValue(undefined),
            indexProfile: jest.fn().mockResolvedValue(undefined),
            searchProfiles: jest.fn().mockResolvedValue({
                results: [
                    {
                        profile: mockArtisanProfile,
                        similarity: 0.85,
                        matchedFields: ['skills.primary', 'personalInfo.location']
                    }
                ]
            }),
            removeProfile: jest.fn().mockResolvedValue(undefined),
            healthCheck: jest.fn().mockResolvedValue({
                healthy: true,
                details: { status: 'operational' }
            }),
            getStats: jest.fn().mockReturnValue({
                totalProfiles: 10,
                totalSearches: 50
            })
        };
        SemanticSearchService.getInstance = jest.fn().mockReturnValue(mockSemanticSearchService);

        const { VectorConnectionPool } = require('../../lib/database/vector-connection-pool');
        VectorConnectionPool.getInstance = jest.fn().mockReturnValue({});

        const { EmbeddingService } = require('../../lib/service/EmbeddingService');
        EmbeddingService.getInstance = jest.fn().mockReturnValue({});

        const { getVectorStoreConfig } = require('../../lib/config/vector-store-config');
        getVectorStoreConfig.mockReturnValue({
            provider: 'test',
            dimensions: 768
        });

        // Get fresh instance for each test
        vectorStoreService = VectorStoreService.getInstance();
    });

    describe('Embedding Generation', () => {
        it('should store profile and generate embeddings', async () => {
            const profileId = await vectorStoreService.storeProfile(mockArtisanProfile);

            expect(profileId).toBe(mockArtisanProfile.id);
            expect(mockSemanticSearchService.indexProfile).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockArtisanProfile.id,
                    personalInfo: mockArtisanProfile.personalInfo,
                    skills: mockArtisanProfile.skills
                })
            );
        });

        it('should handle profile validation during storage', async () => {
            const invalidProfile = {
                ...mockArtisanProfile,
                personalInfo: {
                    ...mockArtisanProfile.personalInfo,
                    name: '' // Invalid empty name
                }
            };

            await expect(vectorStoreService.storeProfile(invalidProfile as ArtisanProfile))
                .rejects.toThrow('Profile storage failed');
        });

        it('should calculate completeness for profiles without it', async () => {
            const profileWithoutCompleteness = {
                ...mockArtisanProfile,
                metadata: {
                    ...mockArtisanProfile.metadata,
                    completeness: 0
                }
            };

            await vectorStoreService.storeProfile(profileWithoutCompleteness as ArtisanProfile);

            expect(mockSemanticSearchService.indexProfile).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        completeness: expect.any(Number)
                    })
                })
            );
        });
    });

    describe('Search Functionality', () => {
        it('should search similar profiles with skill-based queries', async () => {
            const results = await vectorStoreService.searchSimilarProfiles('pottery ceramics', 5);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                profile: mockArtisanProfile,
                similarity: 0.85,
                matchedFields: ['skills.primary', 'personalInfo.location']
            });
            expect(mockSemanticSearchService.searchProfiles).toHaveBeenCalledWith({
                text: 'pottery ceramics',
                limit: 5,
                type: 'comprehensive'
            });
        });

        it('should search profiles by specific skills', async () => {
            const skills = ['pottery', 'ceramics'];
            const results = await vectorStoreService.searchBySkills(skills, 3);

            expect(results).toHaveLength(1);
            expect(mockSemanticSearchService.searchProfiles).toHaveBeenCalledWith({
                text: 'pottery ceramics',
                limit: 3,
                type: 'comprehensive'
            });
        });

        it('should search profiles by location', async () => {
            const location = 'Jaipur';
            const results = await vectorStoreService.searchByLocation(location, 5);

            expect(results).toHaveLength(1);
            expect(mockSemanticSearchService.searchProfiles).toHaveBeenCalledWith({
                text: 'Jaipur',
                limit: 5,
                type: 'comprehensive'
            });
        });

        it('should search profiles by products', async () => {
            const products = ['home decor', 'kitchenware'];
            const results = await vectorStoreService.searchByProducts(products, 4);

            expect(results).toHaveLength(1);
            expect(mockSemanticSearchService.searchProfiles).toHaveBeenCalledWith({
                text: 'home decor kitchenware',
                limit: 4,
                type: 'comprehensive'
            });
        });

        it('should handle search errors gracefully', async () => {
            mockSemanticSearchService.searchProfiles.mockRejectedValue(new Error('Search service unavailable'));

            const results = await vectorStoreService.searchSimilarProfiles('pottery', 5);

            expect(results).toEqual([]);
        });

        it('should return empty results for no matches', async () => {
            mockSemanticSearchService.searchProfiles.mockResolvedValue({ results: [] });

            const results = await vectorStoreService.searchSimilarProfiles('nonexistent skill', 5);

            expect(results).toEqual([]);
        });
    });

    describe('Profile CRUD Operations', () => {
        it('should store a new profile successfully', async () => {
            const profileId = await vectorStoreService.storeProfile(mockArtisanProfile);

            expect(profileId).toBe(mockArtisanProfile.id);
            expect(mockSemanticSearchService.indexProfile).toHaveBeenCalledTimes(1);
        });

        it('should update an existing profile', async () => {
            const updates: Partial<ArtisanProfile> = {
                id: 'test-artisan-1',
                personalInfo: {
                    ...mockArtisanProfile.personalInfo,
                    experience: 16 // Updated experience
                },
                skills: {
                    ...mockArtisanProfile.skills,
                    primary: ['pottery', 'ceramics', 'traditional crafts', 'modern art'] // Added skill
                }
            };

            await vectorStoreService.updateProfile('test-artisan-1', updates);

            expect(mockSemanticSearchService.indexProfile).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'test-artisan-1',
                    metadata: expect.objectContaining({
                        updatedAt: expect.any(Date)
                    })
                })
            );
        });

        it('should reject profile updates with mismatched IDs', async () => {
            const updates: Partial<ArtisanProfile> = {
                id: 'different-id',
                personalInfo: mockArtisanProfile.personalInfo
            };

            await expect(vectorStoreService.updateProfile('test-artisan-1', updates))
                .rejects.toThrow('Profile update failed');
        });

        it('should delete a profile successfully', async () => {
            await vectorStoreService.deleteProfile('test-artisan-1');

            expect(mockSemanticSearchService.removeProfile).toHaveBeenCalledWith('test-artisan-1');
        });

        it('should handle deletion errors', async () => {
            mockSemanticSearchService.removeProfile.mockRejectedValue(new Error('Profile not found'));

            await expect(vectorStoreService.deleteProfile('nonexistent-id'))
                .rejects.toThrow('Profile deletion failed');
        });
    });

    describe('Contextual Response Generation', () => {
        it('should generate contextual response without artisan ID', async () => {
            const response = await vectorStoreService.generateContextualResponse('How to improve pottery techniques?');

            expect(response).toBe('Mocked AI response for artisan assistance');
            expect(mockSemanticSearchService.searchProfiles).toHaveBeenCalledWith({
                text: 'How to improve pottery techniques?',
                limit: 3,
                type: 'comprehensive'
            });
        });

        it('should generate contextual response with artisan ID', async () => {
            // Mock search for specific artisan
            mockSemanticSearchService.searchProfiles
                .mockResolvedValueOnce({
                    results: [{
                        profile: mockArtisanProfile,
                        similarity: 1.0,
                        matchedFields: ['id']
                    }]
                })
                .mockResolvedValueOnce({
                    results: [{
                        profile: mockArtisanProfile,
                        similarity: 0.85,
                        matchedFields: ['skills.primary']
                    }]
                });

            const response = await vectorStoreService.generateContextualResponse(
                'What are the best clay types for pottery?',
                'test-artisan-1'
            );

            expect(response).toBe('Mocked AI response for artisan assistance');
            expect(mockSemanticSearchService.searchProfiles).toHaveBeenCalledTimes(2);
        });

        it('should handle AI generation errors gracefully', async () => {
            mockGenAI.getGenerativeModel().generateContent.mockRejectedValue(new Error('AI service unavailable'));

            const response = await vectorStoreService.generateContextualResponse('test query');

            expect(response).toContain('I apologize, but I encountered an error');
        });
    });

    describe('Service Health and Statistics', () => {
        it('should return healthy status when all services are operational', async () => {
            const health = await vectorStoreService.getHealthStatus();

            expect(health.healthy).toBe(true);
            expect(health.stats).toEqual({
                totalProfiles: 10,
                totalSearches: 50,
                searchService: { status: 'operational' },
                initialized: true
            });
        });

        it('should return unhealthy status when search service fails', async () => {
            mockSemanticSearchService.healthCheck.mockRejectedValue(new Error('Service down'));

            const health = await vectorStoreService.getHealthStatus();

            expect(health.healthy).toBe(false);
            expect(health.stats.error).toBe('Service down');
        });
    });

    describe('Service Initialization', () => {
        it('should initialize service only once', async () => {
            await vectorStoreService.initialize();
            await vectorStoreService.initialize(); // Second call should not reinitialize

            expect(mockSemanticSearchService.initialize).toHaveBeenCalledTimes(1);
        });

        it('should handle initialization errors', async () => {
            mockSemanticSearchService.initialize.mockRejectedValue(new Error('Initialization failed'));

            await expect(vectorStoreService.initialize()).rejects.toThrow('Initialization failed');
        });
    });
});