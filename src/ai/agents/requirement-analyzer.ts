import { z } from 'zod';
import { genAIService } from '../core/genai-service';
import { agentOrchestrator, AIAgent } from '../core/agent-orchestrator';
import { agentMemoryManager } from '../core/agent-memory';
import { aiMonitoringService } from '../core/monitoring';

// Requirement analysis input schema
const RequirementAnalysisInput = z.object({
  userInput: z.string().min(1, 'User input is required'),
  userId: z.string(),
  sessionId: z.string(),
  context: z.object({
    userProfile: z.any().optional(),
    previousSearches: z.array(z.any()).optional(),
    culturalPreferences: z.array(z.string()).optional(),
    priceRange: z.object({
      min: z.number(),
      max: z.number()
    }).optional()
  }).optional()
});

// Requirement analysis output schema
const RequirementAnalysisOutput = z.object({
  extractedRequirements: z.object({
    keyFeatures: z.array(z.string()),
    constraints: z.array(z.string()),
    preferences: z.array(z.string()),
    confidence: z.number().min(0).max(1)
  }),
  processedText: z.string(),
  extractedKeywords: z.array(z.string()),
  categories: z.array(z.string()),
  aiAnalysis: z.object({
    intent: z.string(),
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    urgency: z.enum(['low', 'medium', 'high']),
    complexity: z.enum(['simple', 'moderate', 'complex']),
    culturalContext: z.string().optional(),
    priceIndications: z.object({
      budget: z.enum(['low', 'medium', 'high']),
      range: z.object({
        min: z.number(),
        max: z.number()
      }).optional()
    }).optional(),
    timelineIndications: z.object({
      urgency: z.enum(['flexible', 'moderate', 'urgent']),
      estimatedDuration: z.string().optional()
    }).optional()
  }),
  suggestedFilters: z.object({
    priceRange: z.object({
      min: z.number(),
      max: z.number()
    }).optional(),
    location: z.string().optional(),
    specializations: z.array(z.string()).optional(),
    availability: z.string().optional(),
    rating: z.number().optional()
  }),
  followUpQuestions: z.array(z.string()),
  confidence: z.number().min(0).max(1)
});

export type RequirementAnalysisInput = z.infer<typeof RequirementAnalysisInput>;
export type RequirementAnalysisOutput = z.infer<typeof RequirementAnalysisOutput>;

/**
 * Generative AI Requirement Analysis Agent
 * Analyzes buyer requirements using advanced NLP and contextual understanding
 */
export class RequirementAnalyzerAgent {
  private agentId = 'requirement-analyzer';
  
  constructor() {
    // Register this agent with the orchestrator
    const agentConfig: AIAgent = {
      id: this.agentId,
      name: 'Requirement Analyzer',
      description: 'Analyzes buyer requirements and extracts key information using GenAI',
      capabilities: ['requirement-analysis', 'nlp', 'intent-detection', 'context-understanding'],
      status: 'active',
      priority: 9,
      lastActivity: new Date()
    };
    
    agentOrchestrator.registerAgent(agentConfig);
  }

  /**
   * Analyze buyer requirements using GenAI
   */
  async analyzeRequirements(input: RequirementAnalysisInput): Promise<RequirementAnalysisOutput> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedInput = RequirementAnalysisInput.parse(input);
      
      // Get relevant context from memory
      const memoryContext = agentMemoryManager.getRelevantContext(
        validatedInput.userId,
        validatedInput.sessionId,
        'requirement-analysis',
        5
      );
      
      // Build comprehensive prompt for requirement analysis
      const analysisPrompt = this.buildAnalysisPrompt(validatedInput, memoryContext);
      
      // Generate structured analysis using GenAI
      const analysis = await genAIService.generateStructured(
        analysisPrompt,
        RequirementAnalysisOutput,
        {
          userProfile: validatedInput.context?.userProfile,
          memoryContext,
          analysisType: 'requirement-extraction'
        },
        'pro' // Use more powerful model for complex analysis
      );
      
      // Store analysis in memory for future reference
      await this.storeAnalysisInMemory(validatedInput, analysis);
      
      // Log successful analysis
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'requirement-analysis',
        validatedInput.userId,
        validatedInput.sessionId,
        duration,
        true,
        undefined,
        { confidence: analysis.confidence, categories: analysis.categories }
      );
      
      return analysis;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error
      aiMonitoringService.logAgentTask(
        this.agentId,
        'requirement-analysis',
        input.userId,
        input.sessionId,
        duration,
        false,
        errorMessage
      );
      
      throw new Error(`Requirement analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(input: RequirementAnalysisInput, memoryContext: any): string {
    const { userInput, context } = input;
    
    return `
You are an expert AI agent specializing in analyzing buyer requirements for traditional crafts and artisan products. 
Your task is to thoroughly analyze the user's input and extract detailed, actionable requirements.

USER INPUT: "${userInput}"

CONTEXT INFORMATION:
${context?.userProfile ? `User Profile: ${JSON.stringify(context.userProfile)}` : ''}
${context?.previousSearches ? `Previous Searches: ${JSON.stringify(context.previousSearches)}` : ''}
${context?.culturalPreferences ? `Cultural Interests: ${context.culturalPreferences.join(', ')}` : ''}
${context?.priceRange ? `Price Range: ₹${context.priceRange.min} - ₹${context.priceRange.max}` : ''}

MEMORY CONTEXT:
${memoryContext.preferences.length > 0 ? `User Preferences: ${JSON.stringify(memoryContext.preferences)}` : ''}
${memoryContext.conversations.length > 0 ? `Recent Conversations: ${JSON.stringify(memoryContext.conversations.slice(-2))}` : ''}

ANALYSIS REQUIREMENTS:
1. Extract key features, constraints, and preferences from the user input
2. Identify the product category and subcategories
3. Determine the user's intent, sentiment, and urgency level
4. Assess the complexity of the requirements
5. Identify cultural context and traditional craft elements
6. Extract price and timeline indications
7. Suggest appropriate filters for artisan matching
8. Generate follow-up questions to clarify ambiguous requirements
9. Provide a confidence score for the overall analysis

IMPORTANT GUIDELINES:
- Focus on traditional crafts, handmade products, and artisan specialties
- Consider cultural significance and authenticity
- Be sensitive to regional variations and traditional techniques
- Extract both explicit and implicit requirements
- Consider the business context (personal use, commercial, gifts, etc.)
- Identify any customization needs or special requirements
- Pay attention to quality indicators and craftsmanship preferences

Please provide a comprehensive analysis that will help match the buyer with the most suitable artisans.
    `.trim();
  }

  /**
   * Store analysis results in agent memory
   */
  private async storeAnalysisInMemory(
    input: RequirementAnalysisInput, 
    analysis: RequirementAnalysisOutput
  ): Promise<void> {
    try {
      // Store the analysis as context memory
      agentMemoryManager.storeContext(
        this.agentId,
        input.userId,
        input.sessionId,
        {
          currentGoal: 'find-artisan',
          activeTask: 'requirement-analysis',
          userState: 'searching',
          environment: {
            lastAnalysis: analysis,
            extractedRequirements: analysis.extractedRequirements,
            suggestedCategories: analysis.categories
          },
          constraints: analysis.extractedRequirements.constraints
        },
        0.8 // High importance for requirement analysis
      );
      
      // Store extracted preferences
      if (analysis.extractedRequirements.preferences.length > 0) {
        agentMemoryManager.storePreferences(
          this.agentId,
          input.userId,
          input.sessionId,
          {
            category: 'product-preferences',
            preferences: {
              features: analysis.extractedRequirements.keyFeatures,
              categories: analysis.categories,
              culturalContext: analysis.aiAnalysis.culturalContext,
              priceIndications: analysis.aiAnalysis.priceIndications,
              timelinePreferences: analysis.aiAnalysis.timelineIndications
            },
            confidence: analysis.confidence,
            lastUpdated: new Date(),
            source: 'inferred'
          },
          0.7
        );
      }
      
    } catch (error) {
      console.warn('Failed to store analysis in memory:', error);
      // Don't throw error for memory storage failure
    }
  }

  /**
   * Refine requirements based on user feedback
   */
  async refineRequirements(
    originalAnalysis: RequirementAnalysisOutput,
    userFeedback: string,
    userId: string,
    sessionId: string
  ): Promise<RequirementAnalysisOutput> {
    const startTime = Date.now();
    
    try {
      const refinementPrompt = `
Based on the original requirement analysis and user feedback, refine and improve the analysis.

ORIGINAL ANALYSIS:
${JSON.stringify(originalAnalysis, null, 2)}

USER FEEDBACK: "${userFeedback}"

Please provide an updated analysis that incorporates the user's feedback and corrections.
Focus on:
1. Correcting any misunderstood requirements
2. Adding newly mentioned preferences or constraints
3. Adjusting confidence scores based on clarifications
4. Updating categories and keywords if needed
5. Refining suggested filters and follow-up questions

Maintain the same output structure but with improved accuracy and relevance.
      `.trim();
      
      const refinedAnalysis = await genAIService.generateStructured(
        refinementPrompt,
        RequirementAnalysisOutput,
        { originalAnalysis, userFeedback },
        'pro'
      );
      
      // Update memory with refined analysis
      await this.storeAnalysisInMemory(
        { userInput: userFeedback, userId, sessionId },
        refinedAnalysis
      );
      
      // Log refinement
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'requirement-refinement',
        userId,
        sessionId,
        duration,
        true,
        undefined,
        { originalConfidence: originalAnalysis.confidence, refinedConfidence: refinedAnalysis.confidence }
      );
      
      return refinedAnalysis;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      aiMonitoringService.logAgentTask(
        this.agentId,
        'requirement-refinement',
        userId,
        sessionId,
        duration,
        false,
        errorMessage
      );
      
      throw new Error(`Requirement refinement failed: ${errorMessage}`);
    }
  }

  /**
   * Generate contextual follow-up questions
   */
  async generateFollowUpQuestions(
    analysis: RequirementAnalysisOutput,
    userId: string,
    sessionId: string
  ): Promise<string[]> {
    try {
      const questionPrompt = `
Based on this requirement analysis, generate 3-5 intelligent follow-up questions that would help clarify the buyer's needs and improve artisan matching.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Generate questions that:
1. Clarify ambiguous requirements
2. Explore cultural preferences and authenticity needs
3. Understand budget and timeline constraints
4. Identify customization requirements
5. Determine intended use and context

Make the questions conversational and helpful, not interrogative.
      `.trim();
      
      const response = await genAIService.generateText(questionPrompt, { analysis });
      
      // Extract questions from response (assuming they're in a list format)
      const questions = response
        .split('\n')
        .filter(line => line.trim().match(/^\d+\.|\-|\•/))
        .map(line => line.replace(/^\d+\.\s*|\-\s*|\•\s*/, '').trim())
        .filter(q => q.length > 0);
      
      return questions.slice(0, 5); // Limit to 5 questions
      
    } catch (error) {
      console.warn('Failed to generate follow-up questions:', error);
      return analysis.followUpQuestions || [];
    }
  }
}

// Export singleton instance
export const requirementAnalyzerAgent = new RequirementAnalyzerAgent();