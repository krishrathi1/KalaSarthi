import { z } from 'zod';
import { genAIService } from '../core/genai-service';
import { agentOrchestrator, AIAgent } from '../core/agent-orchestrator';
import { aiMonitoringService } from '../core/monitoring';

// Design generation request schema
const DesignGenerationRequest = z.object({
  orderId: z.string(),
  buyerId: z.string(),
  artisanId: z.string(),
  requirements: z.object({
    description: z.string(),
    style: z.string().optional(),
    colors: z.array(z.string()).optional(),
    materials: z.array(z.string()).optional(),
    dimensions: z.string().optional(),
    culturalElements: z.array(z.string()).optional()
  }),
  designPreferences: z.object({
    traditional: z.boolean().default(true),
    modern: z.boolean().default(false),
    fusion: z.boolean().default(false),
    minimalist: z.boolean().default(false)
  }),
  context: z.object({
    craftTradition: z.string(),
    culturalSignificance: z.string().optional(),
    intendedUse: z.string().optional()
  })
});

// Design generation response schema
const DesignGenerationResponse = z.object({
  designConcepts: z.array(z.object({
    conceptId: z.string(),
    title: z.string(),
    description: z.string(),
    style: z.string(),
    colors: z.array(z.string()),
    materials: z.array(z.string()),
    techniques: z.array(z.string()),
    culturalElements: z.array(z.string()),
    estimatedComplexity: z.enum(['simple', 'moderate', 'complex']),
    estimatedTime: z.number(),
    aiPrompt: z.string(),
    confidence: z.number().min(0).max(1)
  })),
  recommendations: z.array(z.string()),
  culturalNotes: z.array(z.string()),
  technicalConsiderations: z.array(z.string())
});

// Design feedback analysis schema
const DesignFeedbackAnalysis = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  specificFeedback: z.array(z.object({
    aspect: z.string(),
    feedback: z.string(),
    actionRequired: z.boolean(),
    priority: z.enum(['low', 'medium', 'high'])
  })),
  suggestedRevisions: z.array(z.object({
    revision: z.string(),
    reasoning: z.string(),
    impact: z.enum(['minor', 'moderate', 'major'])
  })),
  approvalProbability: z.number().min(0).max(1),
  nextSteps: z.array(z.string())
});

export type DesignGenerationRequest = z.infer<typeof DesignGenerationRequest>;
export type DesignGenerationResponse = z.infer<typeof DesignGenerationResponse>;
export type DesignFeedbackAnalysis = z.infer<typeof DesignFeedbackAnalysis>;

/**
 * Design Collaborator Agent
 * Facilitates AI-enhanced design collaboration between buyers and artisans
 */
export class DesignCollaboratorAgent {
  private agentId = 'design-collaborator';

  constructor() {
    const agentConfig: AIAgent = {
      id: this.agentId,
      name: 'Design Collaborator',
      description: 'Facilitates AI-enhanced design collaboration and generation for traditional crafts',
      capabilities: ['design-generation', 'feedback-analysis', 'cultural-adaptation', 'revision-management'],
      status: 'active',
      priority: 8,
      lastActivity: new Date()
    };

    agentOrchestrator.registerAgent(agentConfig);
  }

  /**
   * Generate design concepts based on requirements
   */
  async generateDesignConcepts(request: DesignGenerationRequest): Promise<DesignGenerationResponse> {
    const startTime = Date.now();
    try {
      const validatedRequest = DesignGenerationRequest.parse(request);

      // Build design generation prompt
      const designPrompt = this.buildDesignGenerationPrompt(validatedRequest);

      // Generate design concepts using GenAI
      const designResponse = await genAIService.generateStructured(
        designPrompt,
        DesignGenerationResponse,
        {
          requirements: validatedRequest.requirements,
          context: validatedRequest.context,
          designType: 'traditional-craft-design'
        },
        'pro'
      );

      // Enhance concepts with AI image generation prompts
      const enhancedConcepts = await this.enhanceConceptsWithImagePrompts(
        designResponse.designConcepts,
        validatedRequest.context
      );

      const finalResponse = {
        ...designResponse,
        designConcepts: enhancedConcepts
      };

      // Log successful design generation
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'design-generation',
        validatedRequest.buyerId,
        validatedRequest.orderId,
        duration,
        true,
        undefined,
        {
          conceptCount: finalResponse.designConcepts.length,
          craftTradition: validatedRequest.context.craftTradition
        }
      );

      return finalResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      aiMonitoringService.logAgentTask(
        this.agentId,
        'design-generation',
        request.buyerId,
        request.orderId,
        duration,
        false,
        errorMessage
      );
      throw new Error(`Design generation failed: ${errorMessage}`);
    }
  }

  /**
   * Analyze buyer feedback on designs
   */
  async analyzeFeedback(
    designId: string,
    feedback: string,
    buyerId: string,
    orderId: string
  ): Promise<DesignFeedbackAnalysis> {
    const startTime = Date.now();
    try {
      const feedbackPrompt = this.buildFeedbackAnalysisPrompt(feedback, designId);
      const analysis = await genAIService.generateStructured(
        feedbackPrompt,
        DesignFeedbackAnalysis,
        {
          feedback,
          designId,
          analysisType: 'design-feedback-analysis'
        },
        'pro'
      );

      // Log successful feedback analysis
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'feedback-analysis',
        buyerId,
        orderId,
        duration,
        true,
        undefined,
        {
          sentiment: analysis.sentiment,
          approvalProbability: analysis.approvalProbability,
          revisionCount: analysis.suggestedRevisions.length
        }
      );

      return analysis;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      aiMonitoringService.logAgentTask(
        this.agentId,
        'feedback-analysis',
        buyerId,
        orderId,
        duration,
        false,
        errorMessage
      );
      throw new Error(`Feedback analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Generate design revisions based on feedback
   */
  async generateRevisions(
    originalDesign: any,
    feedbackAnalysis: DesignFeedbackAnalysis,
    buyerId: string,
    orderId: string
  ): Promise<any[]> {
    const startTime = Date.now();
    try {
      const revisionPrompt = this.buildRevisionPrompt(originalDesign, feedbackAnalysis);
      const revisionSchema = z.object({
        revisions: z.array(z.object({
          revisionId: z.string(),
          title: z.string(),
          description: z.string(),
          changes: z.array(z.string()),
          reasoning: z.string(),
          aiPrompt: z.string(),
          confidence: z.number().min(0).max(1)
        }))
      });

      const revisions = await genAIService.generateStructured(
        revisionPrompt,
        revisionSchema,
        {
          originalDesign,
          feedbackAnalysis,
          revisionType: 'design-improvement'
        },
        'pro'
      );

      // Log successful revision generation
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'revision-generation',
        buyerId,
        orderId,
        duration,
        true,
        undefined,
        {
          revisionCount: revisions.revisions.length
        }
      );

      return revisions.revisions;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      aiMonitoringService.logAgentTask(
        this.agentId,
        'revision-generation',
        buyerId,
        orderId,
        duration,
        false,
        errorMessage
      );
      throw new Error(`Revision generation failed: ${errorMessage}`);
    }
  }

  /**
   * Build design generation prompt
   */
  private buildDesignGenerationPrompt(request: DesignGenerationRequest): string {
    return `
You are a master design consultant specializing in traditional crafts and cultural heritage.
Generate creative design concepts that honor traditional techniques while meeting modern needs.

DESIGN REQUIREMENTS:
${JSON.stringify(request.requirements, null, 2)}

DESIGN PREFERENCES:
${JSON.stringify(request.designPreferences, null, 2)}

CULTURAL CONTEXT:
${JSON.stringify(request.context, null, 2)}

DESIGN GENERATION GUIDELINES:
1. Honor traditional craft techniques and cultural significance
2. Balance authenticity with practical modern requirements
3. Consider material properties and artisan capabilities
4. Ensure designs are feasible within traditional methods
5. Incorporate cultural elements respectfully and meaningfully
6. Provide multiple concept variations for choice
7. Consider the intended use and user experience
8. Respect regional variations and traditional patterns

CONCEPT REQUIREMENTS:
- Generate 3-5 distinct design concepts
- Each concept should have unique approach and style
- Include detailed descriptions of techniques and materials
- Specify cultural elements and their significance
- Estimate complexity and production time
- Provide AI image generation prompts for visualization

CULTURAL SENSITIVITY:
- Ensure authentic representation of traditional elements
- Avoid cultural appropriation or misrepresentation
- Include educational context about techniques and significance
- Respect traditional color meanings and symbolism
- Consider seasonal and ceremonial appropriateness

Generate comprehensive design concepts that celebrate traditional craftsmanship while meeting contemporary needs.
    `.trim();
  }

  /**
   * Build feedback analysis prompt
   */
  private buildFeedbackAnalysisPrompt(feedback: string, designId: string): string {
    return `
Analyze this design feedback to understand buyer preferences and required changes.

BUYER FEEDBACK: "${feedback}"
DESIGN ID: ${designId}

ANALYSIS REQUIREMENTS:
1. Determine overall sentiment and satisfaction level
2. Identify specific aspects mentioned (colors, style, size, materials, etc.)
3. Categorize feedback as actionable changes vs. general comments
4. Assess urgency and priority of different feedback points
5. Suggest specific revisions to address concerns
6. Predict likelihood of approval with suggested changes
7. Recommend next steps for design collaboration

FEEDBACK CATEGORIES:
- Positive aspects to maintain
- Specific changes requested
- Concerns or dislikes to address
- Unclear or ambiguous feedback requiring clarification
- Cultural or traditional elements mentioned

REVISION PRIORITIES:
- Critical changes required for approval
- Important improvements for better satisfaction
- Nice-to-have enhancements
- Alternative approaches to consider

Provide actionable analysis that helps improve the design collaboration process.
    `.trim();
  }

  /**
   * Build revision prompt
   */
  private buildRevisionPrompt(originalDesign: any, feedbackAnalysis: DesignFeedbackAnalysis): string {
    return `
Generate design revisions based on buyer feedback analysis.

ORIGINAL DESIGN:
${JSON.stringify(originalDesign, null, 2)}

FEEDBACK ANALYSIS:
${JSON.stringify(feedbackAnalysis, null, 2)}

REVISION REQUIREMENTS:
1. Address all high-priority feedback points
2. Maintain positive aspects mentioned in feedback
3. Preserve cultural authenticity and traditional techniques
4. Ensure revisions are technically feasible
5. Provide clear reasoning for each change
6. Generate AI prompts for revised visualizations

REVISION GUIDELINES:
- Make targeted changes based on specific feedback
- Maintain overall design integrity and cultural significance
- Consider alternative approaches for ambiguous feedback
- Balance buyer preferences with traditional craft constraints
- Ensure revisions enhance rather than compromise the design

Generate 2-3 revision options that thoughtfully address the feedback while honoring traditional craftsmanship.
    `.trim();
  }

  /**
   * Enhance concepts with AI image generation prompts
   */
  private async enhanceConceptsWithImagePrompts(
    concepts: any[],
    context: any
  ): Promise<any[]> {
    return concepts.map(concept => ({
      ...concept,
      aiPrompt: this.generateImagePrompt(concept, context),
      conceptId: `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
  }

  /**
   * Generate AI image prompt for design concept
   */
  private generateImagePrompt(concept: any, context: any): string {
    return `
Create a detailed, high-quality image of ${concept.title}.
Style: ${concept.style}, traditional ${context.craftTradition}
Materials: ${concept.materials.join(', ')}
Colors: ${concept.colors.join(', ')}
Cultural elements: ${concept.culturalElements.join(', ')}
Techniques: ${concept.techniques.join(', ')}
Description: ${concept.description}
Lighting: natural, warm lighting that highlights craftsmanship
Composition: centered, detailed view showing traditional techniques
Quality: photorealistic, high detail, artisan craftsmanship
    `.trim();
  }
}

// Export singleton instance
export const designCollaboratorAgent = new DesignCollaboratorAgent();