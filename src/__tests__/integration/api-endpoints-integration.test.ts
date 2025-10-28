/**
 * Integration Tests for API Endpoints
 * Tests API response formats, error handling, and fallback mechanisms
 */

// Mock external dependencies
jest.mock('@/lib/services/GoogleGenerativeAIService');
jest.mock('@/lib/services/OptimizedArtisanRetrievalService');
jest.mock('@/lib/services/IntelligentMatchingOrchestrator');
jest.mock('@/lib/services/FallbackMatchingService');
jest.mock('@/lib/services/SimpleProfessionMatcher');
jest.mock('@/lib/firestore');

describe('API Endpoints Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console mocks
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Intelligent Match API Response Format', () => {
    it('should return properly structured response for successful matching', async () => {
      // Mock SimpleProfessionMatcher
      const { SimpleProfessionMatcher } = require('@/lib/services/SimpleProfessionMatcher');
      const mockMatcher = {
        detectProfession: jest.fn().mockReturnValue({
          profession: 'woodworking',
          confidence: 0.8,
          matchedKeywords: ['wooden', 'doors']
        })
      };
      SimpleProfessionMatcher.getInstance.mockReturnValue(mockMatcher);

      // Mock OptimizedArtisanRetrievalService
      const { OptimizedArtisanRetrievalService } = require('@/lib/services/OptimizedArtisanRetrievalService');
      const mockRetrievalService = {
        retrieveArtisans: jest.fn().mockResolvedValue({
          artisans: [
            {
              uid: 'artisan-1',
              name: 'Master Carpenter',
              artisticProfession: 'woodworking',
              description: 'Expert in wooden furniture',
              artisanConnectProfile: {
                performanceMetrics: {
                  customerSatisfaction: 4.8,
                  completionRate: 0.95,
                  totalOrders: 150
                }
              }
            }
          ],
          metrics: { cacheHit: false, queryTime: 120 }
        })
      };
      OptimizedArtisanRetrievalService.getInstance.mockReturnValue(mockRetrievalService);

      // Import and test the API function directly
      const { POST } = require('@/app/api/intelligent-match/route');
      
      // Create a mock request
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          query: 'wooden doors for hotel',
          maxResults: 20
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      // Validate response structure
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('matches');
      expect(data.data).toHaveProperty('totalFound');
      expect(data.data).toHaveProperty('processingTime');
      expect(data.data).toHaveProperty('queryAnalysis');
      expect(data.data).toHaveProperty('systemHealth');
      expect(data.data).toHaveProperty('searchId');
      expect(data.data).toHaveProperty('searchMethod', 'intelligent');

      // Validate match structure
      const match = data.data.matches[0];
      expect(match).toHaveProperty('artisan');
      expect(match).toHaveProperty('relevanceScore');
      expect(match).toHaveProperty('explanation');
      expect(match).toHaveProperty('rank');
      expect(match.artisan).toHaveProperty('uid');
      expect(match.artisan).toHaveProperty('name');
      expect(match.explanation).toHaveProperty('primaryReason');
      expect(match.explanation).toHaveProperty('detailedReasons');
      expect(match.explanation).toHaveProperty('matchedKeywords');
      expect(match.explanation).toHaveProperty('confidenceLevel');

      // Validate query analysis
      expect(data.data.queryAnalysis).toHaveProperty('detectedProfession', 'woodworking');
      expect(data.data.queryAnalysis).toHaveProperty('confidence', 0.8);
    });

    it('should handle no artisans found scenario', async () => {
      // Mock profession detection
      const { SimpleProfessionMatcher } = require('@/lib/services/SimpleProfessionMatcher');
      const mockMatcher = {
        detectProfession: jest.fn().mockReturnValue({
          profession: 'glassblowing',
          confidence: 0.8,
          matchedKeywords: ['glass']
        })
      };
      SimpleProfessionMatcher.getInstance.mockReturnValue(mockMatcher);

      // Mock retrieval service returning no artisans
      const { OptimizedArtisanRetrievalService } = require('@/lib/services/OptimizedArtisanRetrievalService');
      const mockRetrievalService = {
        retrieveArtisans: jest.fn().mockResolvedValue({
          artisans: [],
          metrics: { cacheHit: false, queryTime: 100 }
        })
      };
      OptimizedArtisanRetrievalService.getInstance.mockReturnValue(mockRetrievalService);

      const { POST } = require('@/app/api/intelligent-match/route');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          query: 'glass vase making',
          maxResults: 20
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NO_ARTISANS_AVAILABLE');
      expect(data.error.message).toContain('No artisans found');
    });

    it('should handle AI service enhancement when confidence is low', async () => {
      // Mock SimpleProfessionMatcher with low confidence
      const { SimpleProfessionMatcher } = require('@/lib/services/SimpleProfessionMatcher');
      const mockMatcher = {
        detectProfession: jest.fn().mockReturnValue({
          profession: 'unknown',
          confidence: 0.3,
          matchedKeywords: ['silver']
        })
      };
      SimpleProfessionMatcher.getInstance.mockReturnValue(mockMatcher);

      // Mock GoogleGenerativeAIService
      const { GoogleGenerativeAIService } = require('@/lib/services/GoogleGenerativeAIService');
      const mockAIService = {
        extractRequirements: jest.fn().mockResolvedValue({
          products: ['earrings'],
          materials: ['silver'],
          techniques: ['oxidizing']
        }),
        detectProfessions: jest.fn().mockResolvedValue({
          primaryProfession: 'jewelry',
          confidence: 0.9,
          reasoning: 'Silver earrings indicate jewelry making'
        })
      };
      GoogleGenerativeAIService.getInstance.mockReturnValue(mockAIService);

      // Mock artisan retrieval
      const { OptimizedArtisanRetrievalService } = require('@/lib/services/OptimizedArtisanRetrievalService');
      const mockRetrievalService = {
        retrieveArtisans: jest.fn().mockResolvedValue({
          artisans: [
            {
              uid: 'jeweler-1',
              name: 'Silver Specialist',
              artisticProfession: 'jewelry',
              artisanConnectProfile: {
                performanceMetrics: {
                  customerSatisfaction: 4.9,
                  completionRate: 0.98,
                  totalOrders: 200
                }
              }
            }
          ],
          metrics: { cacheHit: false, queryTime: 150 }
        })
      };
      OptimizedArtisanRetrievalService.getInstance.mockReturnValue(mockRetrievalService);

      const { POST } = require('@/app/api/intelligent-match/route');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          query: 'silver oxidizing earrings',
          maxResults: 10
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.queryAnalysis.detectedProfession).toBe('jewelry');
      expect(data.data.queryAnalysis.confidence).toBe(0.9);
      expect(mockAIService.extractRequirements).toHaveBeenCalledWith('silver oxidizing earrings');
      expect(mockAIService.detectProfessions).toHaveBeenCalled();
    });

    it('should handle AI service failures gracefully', async () => {
      // Mock SimpleProfessionMatcher with low confidence
      const { SimpleProfessionMatcher } = require('@/lib/services/SimpleProfessionMatcher');
      const mockMatcher = {
        detectProfession: jest.fn().mockReturnValue({
          profession: 'unknown',
          confidence: 0.4,
          matchedKeywords: ['complex']
        })
      };
      SimpleProfessionMatcher.getInstance.mockReturnValue(mockMatcher);

      // Mock GoogleGenerativeAIService to throw error
      const { GoogleGenerativeAIService } = require('@/lib/services/GoogleGenerativeAIService');
      const mockAIService = {
        extractRequirements: jest.fn().mockRejectedValue(new Error('AI service unavailable')),
        detectProfessions: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
      };
      GoogleGenerativeAIService.getInstance.mockReturnValue(mockAIService);

      // Mock retrieval service
      const { OptimizedArtisanRetrievalService } = require('@/lib/services/OptimizedArtisanRetrievalService');
      const mockRetrievalService = {
        retrieveArtisans: jest.fn().mockResolvedValue({
          artisans: [
            {
              uid: 'artisan-1',
              name: 'General Artisan',
              artisticProfession: 'mixed',
              artisanConnectProfile: {
                performanceMetrics: {
                  customerSatisfaction: 4.0,
                  completionRate: 0.85,
                  totalOrders: 50
                }
              }
            }
          ],
          metrics: { cacheHit: false, queryTime: 120 }
        })
      };
      OptimizedArtisanRetrievalService.getInstance.mockReturnValue(mockRetrievalService);

      const { POST } = require('@/app/api/intelligent-match/route');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          query: 'complex artistic requirements',
          maxResults: 10
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.queryAnalysis.detectedProfession).toBe('unknown'); // Falls back to simple detection
      expect(data.data.queryAnalysis.confidence).toBe(0.4);
    });
  });

  describe('Search Artisans API Response Format', () => {
    it('should return proper response structure for simple search', async () => {
      // Mock FirestoreService
      const { FirestoreService } = require('@/lib/firestore');
      FirestoreService.query.mockResolvedValue([
        {
          uid: 'artisan-1',
          name: 'Wood Carver',
          artisticProfession: 'woodworking',
          description: 'Expert in wood carving',
          artisanConnectProfile: {
            availabilityStatus: 'available',
            matchingData: {
              skills: ['carving'],
              materials: ['wood'],
              techniques: ['hand carving']
            }
          }
        }
      ]);

      const { POST } = require('@/app/api/search-artisans/route');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          query: 'wooden furniture carving',
          useIntelligentMatching: false,
          maxResults: 10
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('matches');
      expect(data.data).toHaveProperty('totalFound');
      expect(data.data).toHaveProperty('processingTime');
      expect(data.data).toHaveProperty('queryAnalysis');
      expect(data.data).toHaveProperty('searchType', 'simple');
      
      // Validate match structure
      const match = data.data.matches[0];
      expect(match).toHaveProperty('artisan');
      expect(match).toHaveProperty('relevanceScore');
      expect(match).toHaveProperty('matchReasons');
      expect(match).toHaveProperty('rank');
      expect(match).toHaveProperty('professionMatch');
      expect(match).toHaveProperty('materialMatch');
      expect(match).toHaveProperty('techniqueMatch');
    });

    it('should return 400 for missing query parameter', async () => {
      const { POST } = require('@/app/api/search-artisans/route');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          maxResults: 10
          // Missing query
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query is required');
    });

    it('should handle intelligent matching with healthy AI service', async () => {
      // Mock IntelligentMatchingOrchestrator
      const { IntelligentMatchingOrchestrator } = require('@/lib/services/IntelligentMatchingOrchestrator');
      const mockOrchestrator = {
        getSystemStatus: jest.fn().mockResolvedValue({
          aiService: { healthy: true, responseTime: 150 }
        }),
        findMatchingArtisans: jest.fn().mockResolvedValue({
          matches: [],
          enhancedMatches: [
            {
              artisan: {
                uid: 'potter-1',
                name: 'Clay Master',
                artisticProfession: 'pottery'
              },
              relevanceScore: 0.92,
              rank: 1,
              professionMatch: true,
              materialMatch: true,
              techniqueMatch: false,
              explanation: {
                detailedReasons: ['Expert in clay work']
              },
              userFriendlyExplanation: 'Perfect match for pottery work'
            }
          ],
          totalFound: 1,
          confidence: 0.88,
          queryAnalysis: {
            professionMapping: {
              professions: [{ name: 'pottery', confidence: 0.9 }]
            },
            extractedRequirements: {
              techniques: ['molding'],
              materials: ['clay'],
              products: ['pots']
            },
            detectedIntent: { action: 'buy' },
            contextualFactors: { endUse: 'kitchen' }
          },
          systemHealth: {
            aiServiceHealthy: true,
            fallbackUsed: false
          },
          analytics: {
            processingTime: 250
          }
        })
      };
      IntelligentMatchingOrchestrator.getInstance.mockReturnValue(mockOrchestrator);

      // Mock OptimizedArtisanRetrievalService
      const { OptimizedArtisanRetrievalService } = require('@/lib/services/OptimizedArtisanRetrievalService');
      const mockRetrievalService = {
        retrieveArtisans: jest.fn().mockResolvedValue({
          artisans: [
            {
              uid: 'potter-1',
              name: 'Clay Master',
              artisticProfession: 'pottery'
            }
          ],
          metrics: { cacheHit: false, queryTime: 100 }
        })
      };
      OptimizedArtisanRetrievalService.getInstance.mockReturnValue(mockRetrievalService);

      const { POST } = require('@/app/api/search-artisans/route');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          query: 'clay pots for kitchen',
          useIntelligentMatching: true,
          enableExplanations: true,
          maxResults: 20
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.matches).toHaveLength(1);
      expect(data.data.matches[0].artisan.name).toBe('Clay Master');
      expect(data.data.matches[0].relevanceScore).toBe(0.92);
      expect(data.data.matches[0].qualityLevel).toBe('high');
      expect(data.data.matches[0].explanation).toBe('Perfect match for pottery work');
      expect(data.data.queryAnalysis.detectedProfession).toBe('pottery');
      expect(data.data.searchType).toBe('intelligent');
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle service initialization failures', async () => {
      // Mock SimpleProfessionMatcher to throw error
      const { SimpleProfessionMatcher } = require('@/lib/services/SimpleProfessionMatcher');
      SimpleProfessionMatcher.getInstance.mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      const { POST } = require('@/app/api/intelligent-match/route');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          query: 'test query',
          maxResults: 10
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('Internal server error');
    });

    it('should handle database connection failures in search API', async () => {
      // Mock all services to fail
      const { IntelligentMatchingOrchestrator } = require('@/lib/services/IntelligentMatchingOrchestrator');
      IntelligentMatchingOrchestrator.getInstance.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const { FirestoreService } = require('@/lib/firestore');
      FirestoreService.query.mockRejectedValue(new Error('Database connection failed'));

      const { POST } = require('@/app/api/search-artisans/route');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          query: 'test query'
        })
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SEARCH_FAILED');
      expect(data.error.message).toBe('Search failed');
    });
  });

  describe('Health Check Endpoints', () => {
    it('should return healthy status when services are available', async () => {
      // Mock IntelligentMatchingOrchestrator
      const { IntelligentMatchingOrchestrator } = require('@/lib/services/IntelligentMatchingOrchestrator');
      const mockOrchestrator = {
        getSystemStatus: jest.fn().mockResolvedValue({
          aiService: { healthy: true, responseTime: 120 },
          cacheService: { healthy: true, hitRate: 0.8 },
          databaseService: { healthy: true, responseTime: 40 }
        })
      };
      IntelligentMatchingOrchestrator.getInstance.mockReturnValue(mockOrchestrator);

      const { GET } = require('@/app/api/search-artisans/route');
      
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.service).toContain('Enhanced Artisan Search with Intelligent Matching');
      expect(data.capabilities.intelligentMatching).toBe(true);
      expect(data.capabilities.fallbackMatching).toBe(true);
      expect(data.systemHealth).toBeDefined();
    });

    it('should return basic mode status when intelligent services fail', async () => {
      // Mock IntelligentMatchingOrchestrator to throw error
      const { IntelligentMatchingOrchestrator } = require('@/lib/services/IntelligentMatchingOrchestrator');
      IntelligentMatchingOrchestrator.getInstance.mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      const { GET } = require('@/app/api/search-artisans/route');
      
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.service).toContain('Enhanced Artisan Search (Basic Mode)');
      expect(data.capabilities.intelligentMatching).toBe(false);
      expect(data.error).toContain('Intelligent matching services unavailable');
    });
  });
});