/**
 * Response Generator Service Tests
 * 
 * Tests for the Response Generator service including context-aware generation,
 * caching, and optimization features.
 */

import { ResponseGenerator } from '@/lib/services/artisan-buddy/ResponseGenerator';
import { RAGPipelineService } from '@/lib/services/artisan-buddy/RAGPipelineService';
import { redisClient } from '@/lib/services/artisan-buddy/RedisClient';
import {
  ArtisanContext,
  Intent,
  Message,
  GeneratedResponse,
} from '@/lib/types/artisan-buddy';

// Mock dependencies
jest.mock('@/lib/services/artisan-buddy/RAGPipelineService', () => ({
  RAGPipelineService: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@/lib/services/artisan-buddy/ContextEngine', () => ({
  ContextEngine: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@/lib/services/artisan-buddy/RedisClient', () => ({
  redisClient: {
    getCachedJSON: jest.fn(),
    cacheJSON: jest.fn(),
  },
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('Generated follow-up question'),
        },
      }),
      generateContentStream: jest.fn(),
    }),
  })),
}));

describe('ResponseGenerator', () => {
  let responseGenerator: ResponseGenerator;
  let mockRAGPipeline: any;

  const mockArtisanContext: ArtisanContext = {
    profile: {
      id: 'artisan-1',
      name: 'Ravi Kumar',
      email: 'ravi@example.com',
      phone: '+91-9876543210',
      profession: 'Potter',
      specializations: ['Terracotta', 'Clay Pottery'],
      location: {
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
      },
      experience: 15,
      certifications: ['Master Craftsman'],
      languages: ['hi', 'en'],
      createdAt: new Date('2020-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    products: [
      {
        id: 'prod-1',
        artisanId: 'artisan-1',
        name: 'Terracotta Vase',
        description: 'Handmade terracotta vase',
        category: 'Home Decor',
        craftType: 'Pottery',
        materials: ['Clay', 'Natural Dyes'],
        price: 500,
        currency: 'INR',
        images: [],
        inventory: 10,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    salesMetrics: {
      totalSales: 50,
      totalRevenue: 25000,
      averageOrderValue: 500,
      topProducts: [],
      salesTrend: [],
      period: 'month',
    },
    inventory: {
      totalProducts: 1,
      lowStockProducts: [],
      outOfStockProducts: [],
      totalInventoryValue: 5000,
    },
    schemes: [],
    buyers: [],
    preferences: {
      language: 'en',
      responseLength: 'medium',
      communicationStyle: 'casual',
      notificationsEnabled: true,
      voiceEnabled: false,
      theme: 'light',
    },
  };

  const mockIntent: Intent = {
    type: 'query_products',
    confidence: 0.9,
    entities: [],
    parameters: {},
  };

  const mockHistory: Message[] = [
    {
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'user',
      content: 'Tell me about my products',
      language: 'en',
      timestamp: new Date(),
    },
  ];

  beforeEach(() => {
    // Setup mocks
    mockRAGPipeline = {
      generateWithContext: jest.fn().mockResolvedValue({
        response: 'You have 1 active product: Terracotta Vase priced at ₹500.',
        retrievedDocuments: [
          {
            id: 'doc-1',
            title: 'Pottery Techniques',
            content: 'Traditional pottery methods',
            category: 'craft_info',
            relevance: 0.85,
            sources: ['Knowledge Base'],
          },
        ],
        confidence: 0.9,
        reasoning: 'Response based on artisan profile and product data',
        sources: ['Knowledge Base'],
      }),
    };

    const mockContextEngine = {
      getInstance: jest.fn(),
    };

    // Mock RAGPipelineService.getInstance
    (RAGPipelineService.getInstance as jest.Mock).mockReturnValue(mockRAGPipeline);

    // Reset singleton instance
    (ResponseGenerator as any).instance = undefined;
    responseGenerator = ResponseGenerator.getInstance();

    (redisClient.getCachedJSON as jest.Mock).mockResolvedValue(null);
    (redisClient.cacheJSON as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateResponse', () => {
    it('should generate a response successfully', async () => {
      const request = {
        intent: mockIntent,
        context: mockArtisanContext,
        history: mockHistory,
        userMessage: 'Tell me about my products',
        language: 'en',
        sessionId: 'session-1',
      };

      const response = await responseGenerator.generateResponse(request);

      expect(response).toBeDefined();
      expect(response.text).toContain('Terracotta Vase');
      expect(response.language).toBe('en');
      expect(response.confidence).toBeGreaterThan(0);
      expect(mockRAGPipeline.generateWithContext).toHaveBeenCalled();
    });

    it('should include suggested actions', async () => {
      const request = {
        intent: mockIntent,
        context: mockArtisanContext,
        history: mockHistory,
        userMessage: 'Tell me about my products',
        language: 'en',
        sessionId: 'session-1',
      };

      const response = await responseGenerator.generateResponse(request, {
        includeActions: true,
      });

      expect(response.suggestedActions).toBeDefined();
      expect(response.suggestedActions.length).toBeGreaterThan(0);
      expect(response.suggestedActions[0]).toHaveProperty('type');
      expect(response.suggestedActions[0]).toHaveProperty('label');
    });

    it('should use cached response when available', async () => {
      const cachedResponse: GeneratedResponse = {
        text: 'Cached response',
        language: 'en',
        confidence: 0.9,
        sources: [],
        suggestedActions: [],
        followUpQuestions: [],
      };

      (redisClient.getCachedJSON as jest.Mock).mockResolvedValueOnce(cachedResponse);

      const request = {
        intent: mockIntent,
        context: mockArtisanContext,
        history: mockHistory,
        userMessage: 'Tell me about my products',
        language: 'en',
        sessionId: 'session-1',
      };

      const response = await responseGenerator.generateResponse(request);

      expect(response.text).toBe('Cached response');
      expect(mockRAGPipeline.generateWithContext).not.toHaveBeenCalled();
    });

    it('should return fallback response on error', async () => {
      mockRAGPipeline.generateWithContext = jest.fn().mockRejectedValue(
        new Error('RAG pipeline error')
      );

      const request = {
        intent: mockIntent,
        context: mockArtisanContext,
        history: mockHistory,
        userMessage: 'Tell me about my products',
        language: 'en',
        sessionId: 'session-1',
      };

      const response = await responseGenerator.generateResponse(request);

      expect(response).toBeDefined();
      expect(response.text).toContain('trouble processing');
      expect(response.confidence).toBeLessThan(1);
    });
  });

  describe('Context-Aware Generation', () => {
    it('should inject artisan context into response', async () => {
      const request = {
        intent: mockIntent,
        context: mockArtisanContext,
        history: [],
        userMessage: 'What is my profession?',
        language: 'en',
        sessionId: 'session-1',
      };

      await responseGenerator.generateResponse(request);

      const callArgs = mockRAGPipeline.generateWithContext.mock.calls[0][0];
      expect(callArgs.context).toBeDefined();
      expect(callArgs.context.profession).toBe('Potter');
    });

    it('should use conversation history for coherence', async () => {
      const request = {
        intent: mockIntent,
        context: mockArtisanContext,
        history: mockHistory,
        userMessage: 'Tell me more',
        language: 'en',
        sessionId: 'session-1',
      };

      await responseGenerator.generateResponse(request);

      const callArgs = mockRAGPipeline.generateWithContext.mock.calls[0][0];
      expect(callArgs.conversationHistory).toEqual(mockHistory);
    });

    it('should personalize based on preferences', async () => {
      const contextWithFormalStyle = {
        ...mockArtisanContext,
        preferences: {
          ...mockArtisanContext.preferences,
          communicationStyle: 'formal' as const,
          responseLength: 'short' as const,
        },
      };

      const request = {
        intent: mockIntent,
        context: contextWithFormalStyle,
        history: [],
        userMessage: 'Hello',
        language: 'en',
        sessionId: 'session-1',
      };

      const response = await responseGenerator.generateResponse(request);

      expect(response).toBeDefined();
      // Response should be formatted according to preferences
    });
  });

  describe('Response Caching', () => {
    it('should cache generated responses', async () => {
      const request = {
        intent: mockIntent,
        context: mockArtisanContext,
        history: mockHistory,
        userMessage: 'Tell me about my products',
        language: 'en',
        sessionId: 'session-1',
      };

      await responseGenerator.generateResponse(request, { useCache: true });

      expect(redisClient.cacheJSON).toHaveBeenCalled();
    });

    it('should not cache when useCache is false', async () => {
      const request = {
        intent: mockIntent,
        context: mockArtisanContext,
        history: mockHistory,
        userMessage: 'Tell me about my products',
        language: 'en',
        sessionId: 'session-1',
      };

      await responseGenerator.generateResponse(request, { useCache: false });

      expect(redisClient.cacheJSON).not.toHaveBeenCalled();
    });
  });

  describe('Response Quality Monitoring', () => {
    it('should track response metrics', async () => {
      const request = {
        intent: mockIntent,
        context: mockArtisanContext,
        history: mockHistory,
        userMessage: 'Tell me about my products',
        language: 'en',
        sessionId: 'session-1',
      };

      await responseGenerator.generateResponse(request);

      const metrics = responseGenerator.getResponseMetrics('session-1');
      expect(metrics).toBeDefined();
      expect(metrics?.totalResponses).toBe(1);
      expect(metrics?.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should update metrics for multiple responses', async () => {
      const request = {
        intent: mockIntent,
        context: mockArtisanContext,
        history: mockHistory,
        userMessage: 'Tell me about my products',
        language: 'en',
        sessionId: 'session-1',
      };

      await responseGenerator.generateResponse(request);
      await responseGenerator.generateResponse(request);

      const metrics = responseGenerator.getResponseMetrics('session-1');
      expect(metrics?.totalResponses).toBe(2);
    });
  });

  describe('Suggested Actions', () => {
    it('should generate actions for product queries', async () => {
      const request = {
        intent: { ...mockIntent, type: 'query_products' as const },
        context: mockArtisanContext,
        history: [],
        userMessage: 'Show my products',
        language: 'en',
        sessionId: 'session-1',
      };

      const response = await responseGenerator.generateResponse(request);

      expect(response.suggestedActions).toBeDefined();
      const hasProductAction = response.suggestedActions.some(
        action => action.route === '/inventory' || action.route === '/product-creator'
      );
      expect(hasProductAction).toBe(true);
    });

    it('should generate actions for sales queries', async () => {
      const request = {
        intent: { ...mockIntent, type: 'query_sales' as const },
        context: mockArtisanContext,
        history: [],
        userMessage: 'Show my sales',
        language: 'en',
        sessionId: 'session-1',
      };

      const response = await responseGenerator.generateResponse(request);

      const hasSalesAction = response.suggestedActions.some(
        action => action.route === '/finance/dashboard' || action.route === '/digital-khata'
      );
      expect(hasSalesAction).toBe(true);
    });
  });

  describe('Response Formatting', () => {
    it('should respect response length preferences', async () => {
      const longResponse = 'This is a very long response. '.repeat(50);
      mockRAGPipeline.generateWithContext = jest.fn().mockResolvedValue({
        response: longResponse,
        retrievedDocuments: [],
        confidence: 0.9,
        reasoning: 'Test',
        sources: [],
      });

      const contextWithShortPreference = {
        ...mockArtisanContext,
        preferences: {
          ...mockArtisanContext.preferences,
          responseLength: 'short' as const,
        },
      };

      const request = {
        intent: mockIntent,
        context: contextWithShortPreference,
        history: [],
        userMessage: 'Test',
        language: 'en',
        sessionId: 'session-1',
      };

      const response = await responseGenerator.generateResponse(request);

      expect(response.text.length).toBeLessThan(longResponse.length);
    });
  });
});
