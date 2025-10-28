/**
 * Deal Finalization Detector
 * Detects when negotiations have reached completion based on conversation analysis
 */

import { SentimentAnalyzer, ConversationContext, DealIndicator } from './SentimentAnalyzer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface DealDetectionRequest {
  conversationHistory: Array<{
    text: string;
    senderId: string;
    timestamp: Date;
    sentiment?: string;
    intent?: string;
  }>;
  sessionId: string;
  participants: Array<{
    id: string;
    role: 'buyer' | 'artisan';
  }>;
}

export interface DealDetectionResult {
  isDealComplete: boolean;
  confidence: number;
  completionStage: 'initial' | 'negotiating' | 'near_completion' | 'completed';
  dealElements: {
    priceAgreed: boolean;
    designApproved: boolean;
    timelineConfirmed: boolean;
    deliveryArranged: boolean;
  };
  nextSteps: string[];
  riskFactors: string[];
  recommendedAction: 'continue_conversation' | 'prompt_order_form' | 'confirm_details' | 'wait_for_response';
}

export class DealFinalizationDetector {
  private static instance: DealFinalizationDetector;
  private sentimentAnalyzer: SentimentAnalyzer;
  
  // Deal completion patterns in multiple languages
  private completionPatterns = new Map([
    ['agreement', {
      en: ['agreed', 'deal', 'yes', 'okay', 'fine', 'accept', 'confirm', 'go ahead', 'proceed'],
      hi: ['सहमत', 'ठीक है', 'हाँ', 'स्वीकार', 'मंजूर', 'आगे बढ़ें', 'कन्फर्म']
    }],
    ['price_confirmation', {
      en: ['price is fine', 'ok with price', 'agreed on price', 'price accepted'],
      hi: ['कीमत ठीक है', 'दाम मंजूर', 'कीमत स्वीकार']
    }],
    ['order_intent', {
      en: ['want to order', 'place order', 'buy this', 'purchase', 'order now'],
      hi: ['ऑर्डर करना चाहते', 'खरीदना है', 'ऑर्डर दें']
    }],
    ['timeline_acceptance', {
      en: ['time is fine', 'delivery ok', 'timeline works', 'date confirmed'],
      hi: ['समय ठीक है', 'डिलीवरी ठीक', 'तारीख मंजूर']
    }]
  ]);
  
  static getInstance(): DealFinalizationDetector {
    if (!DealFinalizationDetector.instance) {
      DealFinalizationDetector.instance = new DealFinalizationDetector();
    }
    return DealFinalizationDetector.instance;
  }
  
  constructor() {
    this.sentimentAnalyzer = SentimentAnalyzer.getInstance();
  } 
 async detectDealCompletion(request: DealDetectionRequest): Promise<DealDetectionResult> {
    try {
      // Analyze recent conversation for deal indicators
      const recentMessages = request.conversationHistory.slice(-10);
      
      // Get AI-powered analysis
      const aiAnalysis = await this.performAIAnalysis(recentMessages);
      
      // Perform rule-based analysis
      const ruleBasedAnalysis = this.performRuleBasedAnalysis(recentMessages);
      
      // Combine analyses
      const result = this.combineAnalyses(aiAnalysis, ruleBasedAnalysis, request);
      
      return result;
      
    } catch (error) {
      console.error('Deal detection error:', error);
      
      // Fallback to rule-based analysis
      return this.performRuleBasedAnalysis(request.conversationHistory.slice(-10));
    }
  }
  
  private async performAIAnalysis(messages: DealDetectionRequest['conversationHistory']): Promise<Partial<DealDetectionResult>> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const conversationText = messages.map(m => 
      `${m.senderId}: "${m.text}"`
    ).join('\n');
    
    const prompt = `
    Analyze this conversation between a buyer and artisan to determine if a deal has been completed or is near completion:
    
    ${conversationText}
    
    Please analyze for:
    1. Agreement on price
    2. Design approval
    3. Timeline confirmation
    4. Order placement intent
    5. Overall deal completion likelihood
    
    Respond in JSON format:
    {
      "isDealComplete": boolean,
      "confidence": 0-1,
      "completionStage": "initial|negotiating|near_completion|completed",
      "dealElements": {
        "priceAgreed": boolean,
        "designApproved": boolean,
        "timelineConfirmed": boolean,
        "deliveryArranged": boolean
      },
      "nextSteps": ["step1", "step2"],
      "riskFactors": ["risk1", "risk2"],
      "recommendedAction": "continue_conversation|prompt_order_form|confirm_details|wait_for_response"
    }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI analysis:', parseError);
    }
    
    return {};
  }
  
  private performRuleBasedAnalysis(messages: DealDetectionRequest['conversationHistory']): DealDetectionResult {
    const dealElements = {
      priceAgreed: false,
      designApproved: false,
      timelineConfirmed: false,
      deliveryArranged: false
    };
    
    let agreementScore = 0;
    const recentMessages = messages.slice(-5);
    
    // Analyze each message for deal indicators
    for (const message of recentMessages) {
      const text = message.text.toLowerCase();
      
      // Check for agreement patterns
      for (const [category, patterns] of this.completionPatterns.entries()) {
        const enPatterns = patterns.en || [];
        const hiPatterns = patterns.hi || [];
        
        const hasMatch = [...enPatterns, ...hiPatterns].some(pattern => 
          text.includes(pattern.toLowerCase())
        );
        
        if (hasMatch) {
          agreementScore += 0.2;
          
          // Update specific deal elements
          switch (category) {
            case 'price_confirmation':
              dealElements.priceAgreed = true;
              break;
            case 'timeline_acceptance':
              dealElements.timelineConfirmed = true;
              break;
            case 'order_intent':
              dealElements.deliveryArranged = true;
              break;
          }
        }
      }
      
      // Check for design approval
      if (text.includes('design') && (text.includes('good') || text.includes('like') || text.includes('perfect'))) {
        dealElements.designApproved = true;
        agreementScore += 0.15;
      }
    }
    
    // Calculate completion stage and confidence
    const completedElements = Object.values(dealElements).filter(Boolean).length;
    const confidence = Math.min(0.95, agreementScore + (completedElements * 0.1));
    
    let completionStage: DealDetectionResult['completionStage'] = 'initial';
    let isDealComplete = false;
    
    if (completedElements >= 3 && confidence > 0.7) {
      completionStage = 'completed';
      isDealComplete = true;
    } else if (completedElements >= 2 && confidence > 0.5) {
      completionStage = 'near_completion';
    } else if (completedElements >= 1 || confidence > 0.3) {
      completionStage = 'negotiating';
    }
    
    // Generate next steps and recommendations
    const nextSteps = this.generateNextSteps(dealElements, completionStage);
    const riskFactors = this.identifyRiskFactors(messages);
    const recommendedAction = this.getRecommendedAction(completionStage, confidence);
    
    return {
      isDealComplete,
      confidence,
      completionStage,
      dealElements,
      nextSteps,
      riskFactors,
      recommendedAction
    };
  }
  
  private combineAnalyses(
    aiAnalysis: Partial<DealDetectionResult>,
    ruleBasedAnalysis: DealDetectionResult,
    request: DealDetectionRequest
  ): DealDetectionResult {
    // Prefer AI analysis when available, fall back to rule-based
    return {
      isDealComplete: aiAnalysis.isDealComplete ?? ruleBasedAnalysis.isDealComplete,
      confidence: Math.max(aiAnalysis.confidence || 0, ruleBasedAnalysis.confidence),
      completionStage: aiAnalysis.completionStage || ruleBasedAnalysis.completionStage,
      dealElements: aiAnalysis.dealElements || ruleBasedAnalysis.dealElements,
      nextSteps: aiAnalysis.nextSteps || ruleBasedAnalysis.nextSteps,
      riskFactors: aiAnalysis.riskFactors || ruleBasedAnalysis.riskFactors,
      recommendedAction: aiAnalysis.recommendedAction || ruleBasedAnalysis.recommendedAction
    };
  }
  
  private generateNextSteps(dealElements: DealDetectionResult['dealElements'], stage: string): string[] {
    const steps: string[] = [];
    
    if (!dealElements.priceAgreed) {
      steps.push('Confirm final pricing details');
    }
    
    if (!dealElements.designApproved) {
      steps.push('Get design approval from customer');
    }
    
    if (!dealElements.timelineConfirmed) {
      steps.push('Agree on delivery timeline');
    }
    
    if (!dealElements.deliveryArranged) {
      steps.push('Arrange delivery details');
    }
    
    if (stage === 'completed') {
      steps.push('Collect customer details for order processing');
      steps.push('Send order confirmation');
    }
    
    return steps;
  }
  
  private identifyRiskFactors(messages: DealDetectionRequest['conversationHistory']): string[] {
    const risks: string[] = [];
    const recentMessages = messages.slice(-5);
    
    // Check for hesitation patterns
    const hesitationWords = ['maybe', 'think about', 'not sure', 'expensive', 'costly', 'शायद', 'सोचना', 'महंगा'];
    const hasHesitation = recentMessages.some(m => 
      hesitationWords.some(word => m.text.toLowerCase().includes(word))
    );
    
    if (hasHesitation) {
      risks.push('Customer showing hesitation or price concerns');
    }
    
    // Check for long gaps in conversation
    if (messages.length >= 2) {
      const lastMessage = messages[messages.length - 1];
      const secondLastMessage = messages[messages.length - 2];
      const timeDiff = lastMessage.timestamp.getTime() - secondLastMessage.timestamp.getTime();
      
      if (timeDiff > 2 * 60 * 60 * 1000) { // 2 hours
        risks.push('Long gap in conversation - customer may be losing interest');
      }
    }
    
    // Check for competitor mentions
    const competitorWords = ['other', 'another', 'compare', 'cheaper', 'दूसरा', 'अन्य', 'तुलना'];
    const hasCompetitorMention = recentMessages.some(m =>
      competitorWords.some(word => m.text.toLowerCase().includes(word))
    );
    
    if (hasCompetitorMention) {
      risks.push('Customer may be comparing with competitors');
    }
    
    return risks;
  }
  
  private getRecommendedAction(stage: string, confidence: number): DealDetectionResult['recommendedAction'] {
    if (stage === 'completed' && confidence > 0.7) {
      return 'prompt_order_form';
    } else if (stage === 'near_completion' && confidence > 0.5) {
      return 'confirm_details';
    } else if (confidence > 0.3) {
      return 'continue_conversation';
    } else {
      return 'wait_for_response';
    }
  }
  
  /**
   * Get deal completion probability based on conversation patterns
   */
  getDealProbability(messages: DealDetectionRequest['conversationHistory']): number {
    if (messages.length === 0) return 0;
    
    const recentMessages = messages.slice(-10);
    let probability = 0.1; // Base probability
    
    // Positive sentiment increases probability
    const positiveSentiment = recentMessages.filter(m => 
      m.sentiment === 'positive'
    ).length;
    probability += positiveSentiment * 0.08;
    
    // Agreement words boost probability
    const agreementCount = recentMessages.filter(m => {
      const text = m.text.toLowerCase();
      return ['yes', 'ok', 'agreed', 'fine', 'हाँ', 'ठीक'].some(word => text.includes(word));
    }).length;
    probability += agreementCount * 0.1;
    
    // Long conversations indicate engagement
    if (messages.length > 15) {
      probability += 0.15;
    } else if (messages.length > 8) {
      probability += 0.1;
    }
    
    // Recent activity indicates active negotiation
    const recentActivity = recentMessages.filter(m => 
      Date.now() - m.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    ).length;
    probability += recentActivity * 0.05;
    
    return Math.max(0, Math.min(1, probability));
  }
  
  /**
   * Check if artisan should be prompted to show order form
   */
  shouldPromptOrderForm(detectionResult: DealDetectionResult): boolean {
    return detectionResult.isDealComplete && 
           detectionResult.confidence > 0.7 &&
           detectionResult.recommendedAction === 'prompt_order_form';
  }
}