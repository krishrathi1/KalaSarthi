import { requirementAnalyzerAgent } from '@/ai/agents/requirement-analyzer';

// Mock the dependencies
jest.mock('@/ai/core/genai-service');
jest.mock('@/ai/core/agent-orchestrator');
jest.mock('@/ai/core/agent-memory');
jest.mock('@/ai/core/monitoring');

describe('RequirementAnalyzerAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeRequirements', () => {
    it('should analyze basic requirements successfully', async () => {
      const mockInput = {
        userInput: 'I need wooden doors for my hotel with traditional Indian carvings',
        userId: 'test-user-1',
        sessionId: 'test-session-1'
      };

      // Mock the genAI service response
      const mockAnalysis = {
        extractedRequirements: {
          keyFeatures: ['wooden doors', 'traditional Indian carvings', 'hotel use'],
          constraints: ['commercial grade', 'durable'],
          preferences: ['authentic design', 'quality craftsmanship'],
          confidence: 0.85
        },
        processedText: 'wooden doors with traditional Indian carvings for hotel',
        extractedKeywords: ['wooden', 'doors', 'traditional', 'Indian', 'carvings', 'hotel'],
        categories: ['woodwork', 'carving', 'traditional'],
        aiAnalysis: {
          intent: 'purchase_request',
          sentiment: 'positive',
          urgency: 'medium',
          complexity: 'moderate',
          culturalContext: 'traditional Indian craftsmanship'
        },
        suggestedFilters: {
          specializations: ['woodwork', 'carving'],
          priceRange: { min: 5000, max: 50000 }
        },
        followUpQuestions: [
          'What size doors do you need?',
          'Do you have specific carving patterns in mind?'
        ],
        confidence: 0.85
      };

      // Mock genAI service
      const { genAIService } = require('@/ai/core/genai-service');
      genAIService.generateStructured.mockResolvedValue(mockAnalysis);

      const result = await requirementAnalyzerAgent.analyzeRequirements(mockInput);

      expect(result).toEqual(mockAnalysis);
      expect(genAIService.generateStructured).toHaveBeenCalledWith(
        expect.stringContaining('wooden doors for my hotel with traditional Indian carvings'),
        expect.any(Object),
        expect.any(Object),
        'pro'
      );
    });

    it('should handle invalid input gracefully', async () => {
      const invalidInput = {
        userInput: '',
        userId: 'test-user-1',
        sessionId: 'test-session-1'
      };

      await expect(requirementAnalyzerAgent.analyzeRequirements(invalidInput))
        .rejects.toThrow('Requirement analysis failed');
    });

    it('should include context in analysis', async () => {
      const inputWithContext = {
        userInput: 'I need pottery for my restaurant',
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        context: {
          userProfile: { preferences: ['traditional'] },
          priceRange: { min: 1000, max: 10000 }
        }
      };

      const { genAIService } = require('@/ai/core/genai-service');
      genAIService.generateStructured.mockResolvedValue({
        extractedRequirements: { keyFeatures: [], constraints: [], preferences: [], confidence: 0.8 },
        processedText: 'pottery for restaurant',
        extractedKeywords: ['pottery', 'restaurant'],
        categories: ['pottery'],
        aiAnalysis: { intent: 'purchase', sentiment: 'neutral', urgency: 'low', complexity: 'simple' },
        suggestedFilters: {},
        followUpQuestions: [],
        confidence: 0.8
      });

      await requirementAnalyzerAgent.analyzeRequirements(inputWithContext);

      expect(genAIService.generateStructured).toHaveBeenCalledWith(
        expect.stringContaining('pottery for my restaurant'),
        expect.any(Object),
        expect.objectContaining({
          userProfile: { preferences: ['traditional'] }
        }),
        'pro'
      );
    });
  });

  describe('refineRequirements', () => {
    it('should refine requirements based on feedback', async () => {
      const originalAnalysis = {
        extractedRequirements: { keyFeatures: ['pottery'], constraints: [], preferences: [], confidence: 0.7 },
        processedText: 'pottery',
        extractedKeywords: ['pottery'],
        categories: ['pottery'],
        aiAnalysis: { intent: 'purchase', sentiment: 'neutral', urgency: 'low', complexity: 'simple' },
        suggestedFilters: {},
        followUpQuestions: [],
        confidence: 0.7
      };

      const refinedAnalysis = {
        ...originalAnalysis,
        extractedRequirements: {
          keyFeatures: ['terracotta pottery', 'decorative'],
          constraints: ['food safe'],
          preferences: ['traditional style'],
          confidence: 0.9
        },
        confidence: 0.9
      };

      const { genAIService } = require('@/ai/core/genai-service');
      genAIService.generateStructured.mockResolvedValue(refinedAnalysis);

      const result = await requirementAnalyzerAgent.refineRequirements(
        originalAnalysis,
        'I specifically need terracotta pottery that is food safe and decorative',
        'test-user-1',
        'test-session-1'
      );

      expect(result.confidence).toBeGreaterThan(originalAnalysis.confidence);
      expect(result.extractedRequirements.keyFeatures).toContain('terracotta pottery');
    });
  });
});