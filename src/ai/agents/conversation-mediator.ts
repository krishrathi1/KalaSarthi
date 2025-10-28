import { z } from 'zod';
import { genAIService } from '../core/genai-service';
import { agentOrchestrator, AIAgent } from '../core/agent-orchestrator';
import { agentMemoryManager } from '../core/agent-memory';
import { aiMonitoringService } from '../core/monitoring';

// Translation request schema
const TranslationRequest = z.object({
  text: z.string().min(1, 'Text is required'),
  sourceLanguage: z.string().min(2, 'Source language is required'),
  targetLanguage: z.string().min(2, 'Target language is required'),
  context: z.object({
    conversationType: z.enum(['business', 'casual', 'technical', 'cultural']).optional(),
    culturalContext: z.string().optional(),
    previousMessages: z.array(z.any()).optional(),
    userProfiles: z.object({
      sender: z.any().optional(),
      receiver: z.any().optional()
    }).optional()
  }).optional()
});

// Translation response schema
const TranslationResponse = z.object({
  translatedText: z.string(),
  originalText: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  confidence: z.number().min(0).max(1),
  alternativeTranslations: z.array(z.string()).optional(),
  culturalNotes: z.array(z.string()).optional(),
  translationMetadata: z.object({
    service: z.string(),
    model: z.string(),
    processingTime: z.number(),
    culturalAdaptations: z.array(z.string()).optional(),
    formalityLevel: z.enum(['formal', 'informal', 'neutral']).optional()
  })
});

// Cultural adaptation request schema
const CulturalAdaptationRequest = z.object({
  message: z.string(),
  senderCulture: z.string(),
  receiverCulture: z.string(),
  context: z.object({
    businessContext: z.boolean().optional(),
    traditionalCrafts: z.boolean().optional(),
    negotiation: z.boolean().optional(),
    relationship: z.enum(['first_contact', 'ongoing', 'established']).optional()
  }).optional()
});

// Cultural adaptation response schema
const CulturalAdaptationResponse = z.object({
  adaptedMessage: z.string(),
  culturalNotes: z.array(z.string()),
  sensitivityWarnings: z.array(z.string()).optional(),
  suggestedTone: z.enum(['formal', 'respectful', 'friendly', 'professional']),
  culturalContext: z.string(),
  adaptationReasons: z.array(z.string())
});

export type TranslationRequest = z.infer<typeof TranslationRequest>;
export type TranslationResponse = z.infer<typeof TranslationResponse>;
export type CulturalAdaptationRequest = z.infer<typeof CulturalAdaptationRequest>;
export type CulturalAdaptationResponse = z.infer<typeof CulturalAdaptationResponse>;

/**
 * Conversation Mediator Agent
 * Handles cross-language communication with cultural sensitivity
 */
export class ConversationMediatorAgent {
  private agentId = 'conversation-mediator';
  
  constructor() {
    // Register this agent with the orchestrator
    const agentConfig: AIAgent = {
      id: this.agentId,
      name: 'Conversation Mediator',
      description: 'Facilitates cross-language communication with cultural sensitivity for artisan-buyer interactions',
      capabilities: ['translation', 'cultural-adaptation', 'conversation-mediation', 'context-awareness'],
      status: 'active',
      priority: 8,
      lastActivity: new Date()
    };
    
    agentOrchestrator.registerAgent(agentConfig);
  }

  /**
   * Translate text with cultural context awareness
   */
  async translateMessage(request: TranslationRequest): Promise<TranslationResponse> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedRequest = TranslationRequest.parse(request);
      
      // Build translation prompt with cultural context
      const translationPrompt = this.buildTranslationPrompt(validatedRequest);
      
      // Generate translation using GenAI
      const translation = await genAIService.generateStructured(
        translationPrompt,
        TranslationResponse,
        {
          sourceText: validatedRequest.text,
          sourceLanguage: validatedRequest.sourceLanguage,
          targetLanguage: validatedRequest.targetLanguage,
          context: validatedRequest.context
        },
        'pro' // Use advanced model for accurate translation
      );
      
      // Log successful translation
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'translation',
        'system', // No specific user for translation
        'system',
        duration,
        true,
        undefined,
        {
          sourceLanguage: validatedRequest.sourceLanguage,
          targetLanguage: validatedRequest.targetLanguage,
          confidence: translation.confidence,
          textLength: validatedRequest.text.length
        }
      );
      
      return translation;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error
      aiMonitoringService.logAgentTask(
        this.agentId,
        'translation',
        'system',
        'system',
        duration,
        false,
        errorMessage
      );
      
      throw new Error(`Translation failed: ${errorMessage}`);
    }
  }

  /**
   * Adapt message for cultural context
   */
  async adaptForCulture(request: CulturalAdaptationRequest): Promise<CulturalAdaptationResponse> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedRequest = CulturalAdaptationRequest.parse(request);
      
      // Build cultural adaptation prompt
      const adaptationPrompt = this.buildCulturalAdaptationPrompt(validatedRequest);
      
      // Generate cultural adaptation using GenAI
      const adaptation = await genAIService.generateStructured(
        adaptationPrompt,
        CulturalAdaptationResponse,
        {
          originalMessage: validatedRequest.message,
          senderCulture: validatedRequest.senderCulture,
          receiverCulture: validatedRequest.receiverCulture,
          context: validatedRequest.context
        },
        'pro'
      );
      
      // Log successful adaptation
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'cultural-adaptation',
        'system',
        'system',
        duration,
        true,
        undefined,
        {
          senderCulture: validatedRequest.senderCulture,
          receiverCulture: validatedRequest.receiverCulture,
          suggestedTone: adaptation.suggestedTone
        }
      );
      
      return adaptation;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error
      aiMonitoringService.logAgentTask(
        this.agentId,
        'cultural-adaptation',
        'system',
        'system',
        duration,
        false,
        errorMessage
      );
      
      throw new Error(`Cultural adaptation failed: ${errorMessage}`);
    }
  }

  /**
   * Comprehensive message processing with translation and cultural adaptation
   */
  async processMessage(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    senderProfile: any,
    receiverProfile: any,
    conversationContext?: any
  ): Promise<{
    translation: TranslationResponse;
    culturalAdaptation?: CulturalAdaptationResponse;
    recommendations: string[];
  }> {
    const startTime = Date.now();
    
    try {
      // Step 1: Translate the message
      const translation = await this.translateMessage({
        text,
        sourceLanguage,
        targetLanguage,
        context: {
          conversationType: this.determineConversationType(conversationContext),
          culturalContext: this.extractCulturalContext(senderProfile, receiverProfile),
          previousMessages: conversationContext?.recentMessages || [],
          userProfiles: {
            sender: senderProfile,
            receiver: receiverProfile
          }
        }
      });
      
      // Step 2: Apply cultural adaptation if needed
      let culturalAdaptation: CulturalAdaptationResponse | undefined;
      const senderCulture = this.extractCulture(senderProfile);
      const receiverCulture = this.extractCulture(receiverProfile);
      
      if (senderCulture !== receiverCulture) {
        culturalAdaptation = await this.adaptForCulture({
          message: translation.translatedText,
          senderCulture,
          receiverCulture,
          context: {
            businessContext: conversationContext?.isBusinessContext || false,
            traditionalCrafts: conversationContext?.involvesTraditionalCrafts || false,
            negotiation: conversationContext?.isNegotiation || false,
            relationship: conversationContext?.relationshipStage || 'first_contact'
          }
        });
      }
      
      // Step 3: Generate recommendations
      const recommendations = await this.generateCommunicationRecommendations(
        translation,
        culturalAdaptation,
        conversationContext
      );
      
      // Log successful processing
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'message-processing',
        senderProfile?.uid || 'unknown',
        conversationContext?.sessionId || 'unknown',
        duration,
        true,
        undefined,
        {
          hasTranslation: true,
          hasCulturalAdaptation: !!culturalAdaptation,
          recommendationCount: recommendations.length
        }
      );
      
      return {
        translation,
        culturalAdaptation,
        recommendations
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error
      aiMonitoringService.logAgentTask(
        this.agentId,
        'message-processing',
        senderProfile?.uid || 'unknown',
        conversationContext?.sessionId || 'unknown',
        duration,
        false,
        errorMessage
      );
      
      throw error;
    }
  }

  /**
   * Build translation prompt with cultural context
   */
  private buildTranslationPrompt(request: TranslationRequest): string {
    return `
You are an expert translator specializing in cross-cultural communication for traditional crafts and artisan businesses.
Your task is to provide accurate, culturally sensitive translations that preserve meaning and cultural nuances.

SOURCE TEXT: "${request.text}"
SOURCE LANGUAGE: ${request.sourceLanguage}
TARGET LANGUAGE: ${request.targetLanguage}

CONTEXT INFORMATION:
${request.context?.conversationType ? `Conversation Type: ${request.context.conversationType}` : ''}
${request.context?.culturalContext ? `Cultural Context: ${request.context.culturalContext}` : ''}
${request.context?.previousMessages?.length ? `Previous Messages: ${JSON.stringify(request.context.previousMessages.slice(-3))}` : ''}

TRANSLATION REQUIREMENTS:
1. Provide an accurate translation that preserves the original meaning
2. Adapt the tone and formality level appropriately for the target culture
3. Consider cultural sensitivities around traditional crafts and business communication
4. Provide alternative translations if the original has multiple valid interpretations
5. Include cultural notes if certain concepts don't translate directly
6. Maintain respect for traditional craftsmanship and cultural heritage
7. Use appropriate business terminology for artisan-buyer communications

SPECIAL CONSIDERATIONS:
- Traditional craft terms should be translated with cultural context
- Business negotiations should maintain appropriate formality
- Personal relationships should be respected in communication style
- Regional variations in language should be considered
- Technical craft terminology should be accurate and precise

Please provide a comprehensive translation with metadata about your translation choices.
    `.trim();
  }

  /**
   * Build cultural adaptation prompt
   */
  private buildCulturalAdaptationPrompt(request: CulturalAdaptationRequest): string {
    return `
You are a cultural communication expert specializing in cross-cultural business interactions in traditional crafts and artisan industries.
Your task is to adapt messages for cultural appropriateness and effectiveness.

ORIGINAL MESSAGE: "${request.message}"
SENDER CULTURE: ${request.senderCulture}
RECEIVER CULTURE: ${request.receiverCulture}

CONTEXT:
${request.context?.businessContext ? 'This is a business communication' : ''}
${request.context?.traditionalCrafts ? 'This involves traditional crafts and cultural heritage' : ''}
${request.context?.negotiation ? 'This is part of a business negotiation' : ''}
${request.context?.relationship ? `Relationship stage: ${request.context.relationship}` : ''}

CULTURAL ADAPTATION REQUIREMENTS:
1. Adapt the message tone and style for the receiver's cultural expectations
2. Consider cultural norms around business communication and hierarchy
3. Respect traditional craft heritage and cultural significance
4. Adjust formality levels appropriately
5. Include cultural context that helps understanding
6. Warn about potential cultural sensitivities
7. Suggest appropriate communication tone
8. Preserve the core message while making it culturally appropriate

CULTURAL CONSIDERATIONS:
- Business etiquette and communication styles
- Respect for traditional craftsmanship and heritage
- Appropriate levels of directness vs. indirect communication
- Cultural concepts of time, commitment, and relationships
- Religious and cultural sensitivities
- Regional business practices and expectations
- Generational differences in communication preferences

Please provide a culturally adapted version with detailed explanations of your adaptations.
    `.trim();
  }

  /**
   * Helper methods
   */
  private determineConversationType(context: any): 'business' | 'casual' | 'technical' | 'cultural' {
    if (context?.isBusinessContext) return 'business';
    if (context?.involvesTraditionalCrafts) return 'cultural';
    if (context?.isTechnical) return 'technical';
    return 'casual';
  }

  private extractCulturalContext(senderProfile: any, receiverProfile: any): string {
    const contexts = [];
    
    if (senderProfile?.buyerConnectProfile?.culturalInterests) {
      contexts.push(`Sender interests: ${senderProfile.buyerConnectProfile.culturalInterests.join(', ')}`);
    }
    
    if (receiverProfile?.artisanConnectProfile?.specializations) {
      contexts.push(`Artisan specializes in: ${receiverProfile.artisanConnectProfile.specializations.join(', ')}`);
    }
    
    return contexts.join('; ');
  }

  private extractCulture(profile: any): string {
    // Extract culture from user profile
    if (profile?.address?.country) {
      return profile.address.country;
    }
    
    if (profile?.buyerConnectProfile?.preferredLanguage) {
      return this.languageToCountry(profile.buyerConnectProfile.preferredLanguage);
    }
    
    return 'unknown';
  }

  private languageToCountry(language: string): string {
    const languageMap: Record<string, string> = {
      'en': 'international',
      'hi': 'india',
      'bn': 'bangladesh',
      'te': 'india',
      'ta': 'india',
      'mr': 'india',
      'gu': 'india',
      'kn': 'india',
      'ml': 'india',
      'pa': 'india',
      'or': 'india',
      'as': 'india'
    };
    
    return languageMap[language] || 'international';
  }

  private async generateCommunicationRecommendations(
    translation: TranslationResponse,
    culturalAdaptation?: CulturalAdaptationResponse,
    context?: any
  ): Promise<string[]> {
    const recommendations = [];
    
    // Translation quality recommendations
    if (translation.confidence < 0.8) {
      recommendations.push('Consider asking for clarification if the message seems unclear');
    }
    
    // Cultural recommendations
    if (culturalAdaptation) {
      if (culturalAdaptation.sensitivityWarnings && culturalAdaptation.sensitivityWarnings.length > 0) {
        recommendations.push('Be mindful of cultural sensitivities mentioned in the cultural notes');
      }
      
      if (culturalAdaptation.suggestedTone === 'formal') {
        recommendations.push('Maintain a formal and respectful tone in your response');
      }
    }
    
    // Context-based recommendations
    if (context?.isFirstContact) {
      recommendations.push('This appears to be a first contact - consider a warm, professional introduction');
    }
    
    if (context?.involvesTraditionalCrafts) {
      recommendations.push('Show appreciation for traditional craftsmanship and cultural heritage');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const conversationMediatorAgent = new ConversationMediatorAgent();