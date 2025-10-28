import { z } from 'zod';
import { genAIService } from '../core/genai-service';
import { agentOrchestrator, AIAgent } from '../core/agent-orchestrator';
import { agentMemoryManager } from '../core/agent-memory';
import { aiMonitoringService } from '../core/monitoring';
import { BuyerConnectOrder } from '../../lib/models';

// Order creation request schema
const OrderCreationRequest = z.object({
  buyerId: z.string(),
  artisanId: z.string(),
  chatSessionId: z.string(),
  requirements: z.object({
    description: z.string(),
    category: z.string(),
    specifications: z.record(z.any()),
    customizations: z.array(z.string()),
    quantity: z.number().default(1),
    preferredMaterials: z.array(z.string()).optional(),
    sizeRequirements: z.string().optional(),
    colorPreferences: z.array(z.string()).optional()
  }),
  timeline: z.object({
    preferredDeadline: z.string().optional(),
    flexibility: z.enum(['strict', 'flexible', 'negotiable']).default('flexible')
  }),
  budget: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string().default('INR')
  })
});

// Order analysis response schema
const OrderAnalysisResponse = z.object({
  feasibilityScore: z.number().min(0).max(1),
  estimatedPrice: z.object({
    basePrice: z.number(),
    customizationCharges: z.number(),
    materialCosts: z.number(),
    laborCosts: z.number(),
    totalPrice: z.number(),
    currency: z.string()
  }),
  timeline: z.object({
    estimatedDuration: z.number(),
    milestones: z.array(z.object({
      milestone: z.string(),
      estimatedDate: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed', 'delayed'])
    }))
  }),
  riskAssessment: z.object({
    overallRisk: z.enum(['low', 'medium', 'high']),
    factors: z.array(z.object({
      factor: z.string(),
      risk: z.enum(['low', 'medium', 'high']),
      mitigation: z.string()
    }))
  }),
  recommendations: z.array(z.string()),
  negotiationSuggestions: z.array(z.object({
    aspect: z.string(),
    suggestion: z.string(),
    impact: z.enum(['low', 'medium', 'high'])
  }))
});

export type OrderCreationRequest = z.infer<typeof OrderCreationRequest>;
export type OrderAnalysisResponse = z.infer<typeof OrderAnalysisResponse>;

/**
 * Order Orchestrator Agent
 * Handles intelligent order creation, analysis, and negotiation
 */
export class OrderOrchestratorAgent {
  private agentId = 'order-orchestrator';

  constructor() {
    const agentConfig: AIAgent = {
      id: this.agentId,
      name: 'Order Orchestrator',
      description: 'Manages intelligent order creation, analysis, and negotiation processes',
      capabilities: ['order-analysis', 'pricing-estimation', 'timeline-prediction', 'risk-assessment'],
      status: 'active',
      priority: 9,
      lastActivity: new Date()
    };
    agentOrchestrator.registerAgent(agentConfig);
  }

  /**
   * Analyze order feasibility and generate recommendations
   */
  async analyzeOrder(request: OrderCreationRequest): Promise<OrderAnalysisResponse> {
    const startTime = Date.now();
    try {
      const validatedRequest = OrderCreationRequest.parse(request);

      // Build comprehensive analysis prompt
      const analysisPrompt = this.buildOrderAnalysisPrompt(validatedRequest);

      // Generate order analysis using GenAI
      const analysis = await genAIService.generateStructured(
        analysisPrompt,
        OrderAnalysisResponse,
        {
          orderRequest: validatedRequest,
          analysisType: 'comprehensive-order-analysis'
        },
        'pro'
      );

      // Store analysis in memory
      await this.storeOrderAnalysis(validatedRequest, analysis);

      // Log successful analysis
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'order-analysis',
        validatedRequest.buyerId,
        validatedRequest.chatSessionId,
        duration,
        true,
        undefined,
        {
          feasibilityScore: analysis.feasibilityScore,
          estimatedPrice: analysis.estimatedPrice.totalPrice,
          overallRisk: analysis.riskAssessment.overallRisk
        }
      );

      return analysis;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      aiMonitoringService.logAgentTask(
        this.agentId,
        'order-analysis',
        request.buyerId,
        request.chatSessionId,
        duration,
        false,
        errorMessage
      );
      throw new Error(`Order analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Create optimized order with AI recommendations
   */
  async createOptimizedOrder(
    request: OrderCreationRequest,
    analysis: OrderAnalysisResponse
  ): Promise<string> {
    const startTime = Date.now();
    try {
      // Generate AI-extracted requirements
      const aiExtractedRequirements = await this.extractRequirements(request.requirements.description);

      // Create order document
      const order = new BuyerConnectOrder({
        buyerId: request.buyerId,
        artisanId: request.artisanId,
        chatSessionId: request.chatSessionId,
        requirements: {
          ...request.requirements,
          aiExtractedRequirements
        },
        status: 'pending_artisan_approval',
        timeline: {
          estimatedDuration: analysis.timeline.estimatedDuration,
          milestones: analysis.timeline.milestones.map(m => ({
            ...m,
            estimatedDate: new Date(m.estimatedDate)
          })),
          aiPredictions: {
            completionProbability: analysis.feasibilityScore,
            riskFactors: analysis.riskAssessment.factors,
            recommendedActions: analysis.recommendations.map(rec => ({
              action: rec,
              priority: 'medium' as const,
              deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }))
          }
        },
        pricing: {
          basePrice: analysis.estimatedPrice.basePrice,
          customizationCharges: analysis.estimatedPrice.customizationCharges,
          materialCosts: analysis.estimatedPrice.materialCosts,
          laborCosts: analysis.estimatedPrice.laborCosts,
          shippingCosts: 0,
          taxes: 0,
          totalPrice: analysis.estimatedPrice.totalPrice,
          currency: analysis.estimatedPrice.currency,
          negotiationHistory: [],
          paymentTerms: {
            advancePercentage: 30,
            milestones: [
              { milestone: 'Order Confirmation', percentage: 30, completed: false },
              { milestone: 'Design Approval', percentage: 30, completed: false },
              { milestone: 'Production Complete', percentage: 40, completed: false }
            ]
          },
          aiPriceAnalysis: {
            marketPrice: { min: analysis.estimatedPrice.totalPrice * 0.8, max: analysis.estimatedPrice.totalPrice * 1.2 },
            fairnessScore: 0.85,
            priceJustification: 'Price based on market analysis and artisan expertise',
            competitorComparison: []
          }
        },
        designCollaboration: {
          designRequests: [],
          revisionHistory: [],
          aiSuggestions: []
        },
        culturalContext: {
          craftTradition: request.requirements.category,
          techniques: [],
          culturalSignificance: 'Traditional handcrafted item with cultural heritage value',
          educationalContent: [],
          aiCulturalAnalysis: {
            authenticityScore: 0.9,
            culturalAccuracy: 0.85,
            educationalValue: 0.8,
            recommendations: ['Highlight traditional techniques', 'Emphasize cultural significance']
          }
        },
        aiInsights: {
          successProbability: analysis.feasibilityScore,
          qualityPrediction: 0.85,
          customerSatisfactionPrediction: 0.8,
          recommendedImprovements: analysis.negotiationSuggestions.map(s => ({
            area: s.aspect,
            suggestion: s.suggestion,
            impact: s.impact
          })),
          riskAssessment: analysis.riskAssessment
        },
        communication: {
          responseTimeAverage: 0,
          communicationQuality: 0,
          languageBarriers: false
        },
        qualityAssurance: {
          checkpoints: [
            {
              checkpoint: 'Design Review',
              scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              status: 'pending'
            },
            {
              checkpoint: 'Production Milestone',
              scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              status: 'pending'
            },
            {
              checkpoint: 'Final Quality Check',
              scheduledDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
              status: 'pending'
            }
          ]
        },
        shipping: {},
        feedback: {}
      });

      await order.save();

      // Log successful order creation
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'order-creation',
        request.buyerId,
        request.chatSessionId,
        duration,
        true,
        undefined,
        {
          orderId: (order._id as any).toString(),
          totalPrice: analysis.estimatedPrice.totalPrice
        }
      );

      return (order._id as any).toString();
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      aiMonitoringService.logAgentTask(
        this.agentId,
        'order-creation',
        request.buyerId,
        request.chatSessionId,
        duration,
        false,
        errorMessage
      );
      throw new Error(`Order creation failed: ${errorMessage}`);
    }
  }

  /**
   * Build order analysis prompt
   */
  private buildOrderAnalysisPrompt(request: OrderCreationRequest): string {
    return `
You are an expert order analyst specializing in traditional crafts and artisan products.
Analyze this order request and provide comprehensive feasibility assessment.

ORDER REQUEST:
${JSON.stringify(request, null, 2)}

ANALYSIS REQUIREMENTS:
1. Assess feasibility based on requirements complexity and artisan capabilities
2. Estimate accurate pricing including all cost components
3. Predict realistic timeline with key milestones (each milestone must have status: 'pending')
4. Identify potential risks and mitigation strategies
5. Provide optimization recommendations
6. Suggest negotiation points for better outcomes

PRICING CONSIDERATIONS:
- Traditional craft complexity and skill requirements
- Material costs and availability
- Labor time based on craftsmanship level
- Customization complexity
- Market rates for similar products
- Artisan experience and reputation

TIMELINE FACTORS:
- Design and approval phase
- Material procurement
- Production complexity
- Quality assurance
- Seasonal factors
- Artisan workload

RISK ASSESSMENT:
- Technical feasibility
- Timeline constraints
- Budget alignment
- Communication barriers
- Quality expectations
- Cultural authenticity requirements

Provide detailed, actionable analysis that helps both buyer and artisan succeed.
    `.trim();
  }

  /**
   * Extract AI requirements from description
   */
  private async extractRequirements(description: string): Promise<any> {
    try {
      const extractionPrompt = `
Extract structured requirements from this product description:
"${description}"

Identify:
1. Key features and specifications
2. Constraints and limitations
3. Preferences and nice-to-haves
4. Quality expectations
5. Cultural or traditional elements

Provide confidence scores for each extracted requirement.
      `;

      const schema = z.object({
        keyFeatures: z.array(z.string()),
        constraints: z.array(z.string()),
        preferences: z.array(z.string()),
        confidence: z.number().min(0).max(1)
      });

      return await genAIService.generateStructured(extractionPrompt, schema, { description });
    } catch (error) {
      console.warn('Failed to extract AI requirements:', error);
      return {
        keyFeatures: [],
        constraints: [],
        preferences: [],
        confidence: 0.5
      };
    }
  }

  /**
   * Store order analysis in memory
   */
  private async storeOrderAnalysis(
    request: OrderCreationRequest,
    analysis: OrderAnalysisResponse
  ): Promise<void> {
    try {
      agentMemoryManager.storeMemory({
        agentId: this.agentId,
        userId: request.buyerId,
        sessionId: request.chatSessionId,
        type: 'decision',
        content: {
          orderAnalysis: analysis,
          feasibilityScore: analysis.feasibilityScore,
          estimatedPrice: analysis.estimatedPrice.totalPrice,
          riskLevel: analysis.riskAssessment.overallRisk
        },
        importance: 0.9,
        tags: ['order-analysis', request.requirements.category, 'pricing']
      });
    } catch (error) {
      console.warn('Failed to store order analysis:', error);
    }
  }
}

// Export singleton instance
export const orderOrchestratorAgent = new OrderOrchestratorAgent();