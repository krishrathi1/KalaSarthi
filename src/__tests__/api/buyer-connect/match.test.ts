import { POST } from '@/app/api/buyer-connect/match/route';
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/ai/agents/matching-orchestrator');
jest.mock('@/ai/core/monitoring');
jest.mock('@/lib/mongodb');

describe('/api/buyer-connect/match', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should handle valid matching request', async () => {
      const mockMatchingResult = {
        matches: [
          {
            artisanId: 'artisan-1',
            artisanProfile: {
              name: 'John Potter',
              artisticProfession: 'Pottery',
              specializations: ['ceramic', 'traditional']
            },
            confidenceScore: 0.85,
            matchReasons: ['Specializes in pottery', 'Available now'],
            estimatedPrice: { min: 2000, max: 5000, currency: 'INR' },
            estimatedTimeline: '2-3 weeks'
          }
        ],
        totalMatches: 1,
        searchMetadata: {
          extractedKeywords: ['pottery', 'ceramic'],
          categories: ['pottery'],
          confidenceThreshold: 0.3,
          searchTime: 1500,
          aiAnalysisTime: 800,
          timestamp: new Date().toISOString()
        },
        requirementAnalysis: {
          extractedRequirements: { keyFeatures: ['pottery'], confidence: 0.8 }
        },
        alternativeRecommendations: [],
        marketInsights: {
          averagePricing: { min: 1500, max: 6000 },
          demandLevel: 'medium',
          availabilityTrend: 'stable',
          seasonalFactors: []
        },
        improvementSuggestions: []
      };

      const { matchingOrchestratorAgent } = require('@/ai/agents/matching-orchestrator');
      matchingOrchestratorAgent.executeMatching.mockResolvedValue(mockMatchingResult);

      const request = new NextRequest('http://localhost:3000/api/buyer-connect/match', {
        method: 'POST',
        body: JSON.stringify({
          buyerId: 'buyer-1',
          userInput: 'I need pottery for my restaurant',
          sessionId: 'session-1',
          filters: { priceRange: { min: 1000, max: 10000 } },
          preferences: { maxResults: 10, sortBy: 'confidence' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.matches).toHaveLength(1);
      expect(data.data.matches[0].artisanProfile.name).toBe('John Potter');
      expect(data.data.totalMatches).toBe(1);
    });

    it('should handle missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/buyer-connect/match', {
        method: 'POST',
        body: JSON.stringify({
          buyerId: 'buyer-1',
          // Missing userInput and sessionId
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });

    it('should handle matching orchestrator errors', async () => {
      const { matchingOrchestratorAgent } = require('@/ai/agents/matching-orchestrator');
      matchingOrchestratorAgent.executeMatching.mockRejectedValue(
        new Error('Matching service unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/buyer-connect/match', {
        method: 'POST',
        body: JSON.stringify({
          buyerId: 'buyer-1',
          userInput: 'I need pottery',
          sessionId: 'session-1'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to find artisan matches');
    });

    it('should log matching requests', async () => {
      const mockMatchingResult = {
        matches: [],
        totalMatches: 0,
        searchMetadata: { extractedKeywords: [], categories: [], searchTime: 100 },
        requirementAnalysis: {},
        alternativeRecommendations: [],
        marketInsights: { averagePricing: { min: 0, max: 0 }, demandLevel: 'low' },
        improvementSuggestions: []
      };

      const { matchingOrchestratorAgent } = require('@/ai/agents/matching-orchestrator');
      const { aiMonitoringService } = require('@/ai/core/monitoring');
      
      matchingOrchestratorAgent.executeMatching.mockResolvedValue(mockMatchingResult);

      const request = new NextRequest('http://localhost:3000/api/buyer-connect/match', {
        method: 'POST',
        body: JSON.stringify({
          buyerId: 'buyer-1',
          userInput: 'test query',
          sessionId: 'session-1'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      await POST(request);

      expect(aiMonitoringService.logEvent).toHaveBeenCalledWith({
        type: 'genai_call',
        userId: 'buyer-1',
        sessionId: 'session-1',
        data: expect.objectContaining({
          operation: 'buyer-artisan-matching',
          inputLength: 10
        }),
        success: true
      });
    });
  });
});