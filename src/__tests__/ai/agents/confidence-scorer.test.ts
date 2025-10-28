import { confidenceScorerAgent } from '@/ai/agents/confidence-scorer';

// Mock the dependencies
jest.mock('@/ai/core/genai-service');
jest.mock('@/ai/core/agent-orchestrator');
jest.mock('@/ai/core/agent-memory');
jest.mock('@/ai/core/monitoring');
jest.mock('@/ai/core/vector-store');

describe('ConfidenceScorerAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateConfidenceScore', () => {
    it('should generate confidence score for artisan match', async () => {
      const mockInput = {
        buyerRequirements: {
          extractedRequirements: {
            keyFeatures: ['wooden furniture', 'traditional design'],
            categories: ['woodwork'],
            aiAnalysis: { complexity: 'moderate' }
          }
        },
        artisanProfile: {
          id: 'artisan-1',
          name: 'John Carpenter',
          artisticProfession: 'Wood Carving',
          specializations: ['furniture', 'traditional'],
          skillTags: [{ skill: 'carving', proficiency: 0.9, verified: true }],
          aiMetrics: { matchSuccessRate: 0.85, customerSatisfactionScore: 4.5 },
          availabilityStatus: 'available',
          responseTimeAverage: 30
        },
        contextData: {
          userId: 'buyer-1',
          sessionId: 'session-1'
        }
      };

      const mockConfidenceScore = {
        overallConfidenceScore: 0.87,
        detailedScoring: {
          skillMatch: {
            score: 0.9,
            reasoning: 'Excellent match for woodwork and traditional design',
            matchedSkills: ['woodwork', 'traditional design'],
            missingSkills: []
          },
          culturalAlignment: {
            score: 0.85,
            reasoning: 'Good cultural understanding of traditional techniques',
            culturalFactors: ['traditional craftsmanship'],
            authenticityScore: 0.9
          },
          availabilityScore: {
            score: 0.95,
            reasoning: 'Available with quick response time',
            timelineCompatibility: true,
            workloadAssessment: 'light'
          },
          priceCompatibility: {
            score: 0.8,
            reasoning: 'Pricing within expected range',
            estimatedPriceRange: { min: 5000, max: 15000 },
            budgetAlignment: 'good'
          },
          qualityPrediction: {
            score: 0.88,
            reasoning: 'High quality expected based on past performance',
            qualityIndicators: ['verified skills', 'high ratings'],
            riskFactors: []
          },
          communicationFit: {
            score: 0.85,
            reasoning: 'Good communication expected',
            languageCompatibility: true,
            responseTimeExpectation: 'fast'
          }
        },
        matchReasons: [
          'Specializes in woodwork and traditional design',
          'High skill proficiency in relevant areas',
          'Available with quick response time'
        ],
        potentialConcerns: [],
        recommendedActions: [
          { action: 'Contact artisan to discuss project details', priority: 'high', reasoning: 'Good match probability' }
        ],
        alternativeRecommendations: [],
        confidenceFactors: [
          { factor: 'skill_match', weight: 0.25, score: 0.9, explanation: 'Strong skill alignment' },
          { factor: 'availability', weight: 0.15, score: 0.95, explanation: 'Available and responsive' }
        ]
      };

      const { genAIService } = require('@/ai/core/genai-service');
      genAIService.generateStructured.mockResolvedValue(mockConfidenceScore);

      const result = await confidenceScorerAgent.generateConfidenceScore(mockInput);

      expect(result.overallConfidenceScore).toBeGreaterThan(0.8);
      expect(result.detailedScoring.skillMatch.score).toBeGreaterThan(0.8);
      expect(result.matchReasons).toContain('Specializes in woodwork and traditional design');
    });

    it('should handle low confidence matches', async () => {
      const mockInput = {
        buyerRequirements: {
          extractedRequirements: {
            keyFeatures: ['modern electronics'],
            categories: ['electronics'],
            aiAnalysis: { complexity: 'high' }
          }
        },
        artisanProfile: {
          id: 'artisan-2',
          name: 'Traditional Potter',
          artisticProfession: 'Pottery',
          specializations: ['clay', 'traditional'],
          skillTags: [{ skill: 'pottery', proficiency: 0.9, verified: true }],
          aiMetrics: { matchSuccessRate: 0.7, customerSatisfactionScore: 4.0 },
          availabilityStatus: 'busy'
        },
        contextData: {
          userId: 'buyer-1',
          sessionId: 'session-1'
        }
      };

      const mockLowConfidenceScore = {
        overallConfidenceScore: 0.25,
        detailedScoring: {
          skillMatch: {
            score: 0.1,
            reasoning: 'Poor skill match - electronics vs pottery',
            matchedSkills: [],
            missingSkills: ['electronics', 'modern technology']
          },
          culturalAlignment: { score: 0.3, reasoning: 'Different domains', culturalFactors: [], authenticityScore: 0.5 },
          availabilityScore: { score: 0.4, reasoning: 'Currently busy', timelineCompatibility: false, workloadAssessment: 'heavy' },
          priceCompatibility: { score: 0.5, reasoning: 'Uncertain pricing', estimatedPriceRange: { min: 0, max: 0 }, budgetAlignment: 'unknown' },
          qualityPrediction: { score: 0.3, reasoning: 'Quality uncertain for this domain', qualityIndicators: [], riskFactors: ['domain mismatch'] },
          communicationFit: { score: 0.6, reasoning: 'Basic communication possible', languageCompatibility: true, responseTimeExpectation: 'slow' }
        },
        matchReasons: [],
        potentialConcerns: ['Skill mismatch', 'Domain incompatibility'],
        recommendedActions: [
          { action: 'Look for electronics specialists', priority: 'high', reasoning: 'Better skill match needed' }
        ],
        alternativeRecommendations: ['Search for technology artisans'],
        confidenceFactors: [
          { factor: 'skill_mismatch', weight: 0.4, score: 0.1, explanation: 'Major skill domain mismatch' }
        ]
      };

      const { genAIService } = require('@/ai/core/genai-service');
      genAIService.generateStructured.mockResolvedValue(mockLowConfidenceScore);

      const result = await confidenceScorerAgent.generateConfidenceScore(mockInput);

      expect(result.overallConfidenceScore).toBeLessThan(0.5);
      expect(result.potentialConcerns).toContain('Skill mismatch');
      expect(result.alternativeRecommendations).toContain('Search for technology artisans');
    });
  });

  describe('batchScoreArtisans', () => {
    it('should score multiple artisans efficiently', async () => {
      const buyerRequirements = {
        extractedRequirements: { keyFeatures: ['pottery'], categories: ['pottery'] }
      };

      const artisanProfiles = [
        { id: 'artisan-1', name: 'Potter 1', artisticProfession: 'Pottery' },
        { id: 'artisan-2', name: 'Potter 2', artisticProfession: 'Pottery' }
      ];

      const contextData = { userId: 'buyer-1', sessionId: 'session-1' };

      const mockScores = [
        { overallConfidenceScore: 0.85, detailedScoring: {}, matchReasons: [], potentialConcerns: [], recommendedActions: [], alternativeRecommendations: [], confidenceFactors: [] },
        { overallConfidenceScore: 0.75, detailedScoring: {}, matchReasons: [], potentialConcerns: [], recommendedActions: [], alternativeRecommendations: [], confidenceFactors: [] }
      ];

      const { genAIService } = require('@/ai/core/genai-service');
      genAIService.generateStructured
        .mockResolvedValueOnce(mockScores[0])
        .mockResolvedValueOnce(mockScores[1]);

      const results = await confidenceScorerAgent.batchScoreArtisans(
        buyerRequirements,
        artisanProfiles,
        contextData
      );

      expect(results).toHaveLength(2);
      expect(results[0].overallConfidenceScore).toBe(0.85);
      expect(results[1].overallConfidenceScore).toBe(0.75);
    });
  });
});