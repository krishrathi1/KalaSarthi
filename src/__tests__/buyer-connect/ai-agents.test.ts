import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { requirementAnalyzerAgent } from '@/ai/agents/requirement-analyzer';
import { confidenceScorerAgent } from '@/ai/agents/confidence-scorer';
import { matchingOrchestratorAgent } from '@/ai/agents/matching-orchestrator';
import { conversationMediatorAgent } from '@/ai/agents/conversation-mediator';
import { initializeAIInfrastructure } from '@/ai/core';

describe('Buyer Connect AI Agents', () => {
  beforeAll(async () => {
    // Initialize AI infrastructure for testing
    await initializeAIInfrastructure();
  });

  describe('Requirement Analyzer Agent', () => {
    it('should analyze simple buyer requirements', async () => {
      const input = {
        userInput: 'I need pottery bowls for my restaurant',
        userId: 'test-buyer-1',
        sessionId: 'test-session-1'
      };

      const result = await requirementAnalyzerAgent.analyzeRequirements(input);

      expect(result).toBeDefined();
      expect(result.extractedRequirements).toBeDefined();
      expect(result.extractedRequirements.keyFeatures).toContain('bowls');
      expect(result.categories).toContain('pottery');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle complex requirements with customizations', async () => {
      const input = {
        userInput: 'I want handwoven silk sarees with traditional Banarasi patterns for my boutique, need 20 pieces in different colors, budget around 50000 rupees',
        userId: 'test-buyer-2',
        sessionId: 'test-session-2'
      };

      const result = await requirementAnalyzerAgent.analyzeRequirements(input);

      expect(result.extractedRequirements.keyFeatures).toEqual(
        expect.arrayContaining(['silk', 'sarees', 'Banarasi', 'patterns'])
      );
      expect(result.categories).toContain('textiles');
      expect(result.aiAnalysis.complexity).toBe('complex');
      expect(result.aiAnalysis.priceIndications?.range?.max).toBeCloseTo(50000, -3);
    });

    it('should generate relevant follow-up questions', async () => {
      const input = {
        userInput: 'I need some jewelry',
        userId: 'test-buyer-3',
        sessionId: 'test-session-3'
      };

      const result = await requirementAnalyzerAgent.analyzeRequirements(input);

      expect(result.followUpQuestions).toBeDefined();
      expect(result.followUpQuestions.length).toBeGreaterThan(0);
      expect(result.aiAnalysis.complexity).toBe('simple');
    });
  });

  describe('Confidence Scorer Agent', () => {
    it('should generate confidence scores with detailed reasoning', async () => {
      const input = {
        buyerRequirements: {
          extractedRequirements: {
            keyFeatures: ['pottery', 'bowls', 'restaurant'],
            constraints: ['food-safe', 'durable'],
            preferences: ['traditional', 'handmade']
          },
          categories: ['pottery'],
          aiAnalysis: {
            intent: 'business_purchase',
            complexity: 'moderate'
          }
        },
        artisanProfile: {
          id: 'artisan-1',
          name: 'Rajesh Kumar',
          artisticProfession: 'Pottery',
          specializations: ['pottery', 'ceramics', 'food-safe glazing'],
          aiMetrics: {
            customerSatisfactionScore: 4.6,
            completionRate: 0.92
          },
          availabilityStatus: 'available'
        },
        contextData: {
          userId: 'test-buyer-1',
          sessionId: 'test-session-1'
        }
      };

      const result = await confidenceScorerAgent.generateConfidenceScore(input);

      expect(result.overallConfidenceScore).toBeGreaterThan(0.7);
      expect(result.detailedScoring.skillMatch.score).toBeGreaterThan(0.8);
      expect(result.matchReasons).toBeDefined();
      expect(result.confidenceFactors).toBeDefined();
      expect(result.confidenceFactors.length).toBeGreaterThan(0);
    });

    it('should handle mismatched requirements', async () => {
      const input = {
        buyerRequirements: {
          extractedRequirements: {
            keyFeatures: ['software', 'development', 'app'],
            constraints: ['modern', 'digital'],
            preferences: ['technology']
          },
          categories: ['technology'],
          aiAnalysis: {
            intent: 'service_request',
            complexity: 'complex'
          }
        },
        artisanProfile: {
          id: 'artisan-2',
          name: 'Priya Sharma',
          artisticProfession: 'Textile Weaving',
          specializations: ['handloom', 'silk', 'traditional'],
          aiMetrics: {
            customerSatisfactionScore: 4.8,
            completionRate: 0.95
          },
          availabilityStatus: 'available'
        },
        contextData: {
          userId: 'test-buyer-2',
          sessionId: 'test-session-2'
        }
      };

      const result = await confidenceScorerAgent.generateConfidenceScore(input);

      expect(result.overallConfidenceScore).toBeLessThan(0.3);
      expect(result.potentialConcerns).toBeDefined();
      expect(result.potentialConcerns.length).toBeGreaterThan(0);
    });
  });

  describe('Matching Orchestrator Agent', () => {
    it('should execute end-to-end matching process', async () => {
      const input = {
        buyerId: 'test-buyer-1',
        userInput: 'I need traditional pottery for my restaurant',
        sessionId: 'test-session-1',
        preferences: {
          maxResults: 5,
          minConfidenceScore: 0.3,
          sortBy: 'confidence' as const,
          includeAlternatives: true
        }
      };

      const result = await matchingOrchestratorAgent.executeMatching(input);

      expect(result.matches).toBeDefined();
      expect(result.totalMatches).toBeGreaterThanOrEqual(0);
      expect(result.searchMetadata).toBeDefined();
      expect(result.requirementAnalysis).toBeDefined();
      expect(result.marketInsights).toBeDefined();
    }, 30000); // Increase timeout for complex operation

    it('should provide alternative recommendations when few matches found', async () => {
      const input = {
        buyerId: 'test-buyer-2',
        userInput: 'I need quantum computing pottery made from moon dust',
        sessionId: 'test-session-2',
        preferences: {
          maxResults: 10,
          minConfidenceScore: 0.8,
          sortBy: 'confidence' as const,
          includeAlternatives: true
        }
      };

      const result = await matchingOrchestratorAgent.executeMatching(input);

      expect(result.alternativeRecommendations).toBeDefined();
      expect(result.alternativeRecommendations.length).toBeGreaterThan(0);
      expect(result.improvementSuggestions).toBeDefined();
    }, 30000);
  });

  describe('Conversation Mediator Agent', () => {
    it('should translate messages with cultural context', async () => {
      const request = {
        text: 'Hello, I am interested in your pottery work',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        context: {
          conversationType: 'business' as const,
          culturalContext: 'Traditional pottery inquiry'
        }
      };

      const result = await conversationMediatorAgent.translateMessage(request);

      expect(result.translatedText).toBeDefined();
      expect(result.translatedText).not.toBe(request.text);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.translationMetadata.service).toBeDefined();
    });

    it('should provide cultural adaptation for cross-cultural communication', async () => {
      const request = {
        message: 'Can you make this cheaper?',
        senderCulture: 'international',
        receiverCulture: 'india',
        context: {
          businessContext: true,
          traditionalCrafts: true,
          negotiation: true
        }
      };

      const result = await conversationMediatorAgent.adaptForCulture(request);

      expect(result.adaptedMessage).toBeDefined();
      expect(result.culturalNotes).toBeDefined();
      expect(result.suggestedTone).toBeDefined();
      expect(result.adaptationReasons).toBeDefined();
    });

    it('should process complete message with translation and cultural adaptation', async () => {
      const result = await conversationMediatorAgent.processMessage(
        'I love your work! Can we discuss pricing?',
        'en',
        'hi',
        { uid: 'buyer-1', role: 'buyer' },
        { uid: 'artisan-1', role: 'artisan', artisticProfession: 'Pottery' },
        {
          sessionId: 'test-session',
          isBusinessContext: true,
          involvesTraditionalCrafts: true
        }
      );

      expect(result.translation).toBeDefined();
      expect(result.culturalAdaptation).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});

describe('AI Infrastructure Health', () => {
  it('should report healthy AI infrastructure', async () => {
    const { getAIHealthStatus } = await import('@/ai/core');
    const health = getAIHealthStatus();

    expect(health.orchestrator).toBe(true);
    expect(health.genai).toBe(true);
    expect(health.memory).toBe(true);
    expect(health.workflow).toBe(true);
    expect(health.vectorStore).toBe(true);
    expect(health.stats.activeAgents).toBeGreaterThan(0);
  });
});