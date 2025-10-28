/**
 * Sentiment Analyzer Service
 * Provides real-time sentiment analysis, intent classification, and conversation intelligence
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface SentimentAnalysisRequest {
  text: string;
  language: string;
  context?: ConversationContext;
}

export interface ConversationContext {
  sessionId: string;
  participants: Array<{
    id: string;
    role: 'buyer' | 'artisan';
    language: string;
  }>;
  messageHistory: Array<{
    text: string;
    sentiment: string;
    timestamp: Date;
  }>;
  artisanSpecialization?: string;
}

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 to 1
  intent: string;
  intentConfidence: number;
  keyTopics: string[];
  urgency: 'low' | 'medium' | 'high';
  dealIndicators?: DealIndicator[];
  emotionalTone: string;
  confidence: number;
}

export interface DealIndicator {
  type: 'price_agreement' | 'timeline_agreement' | 'design_approval' | 'order_confirmation' | 'negotiation_progress';
  confidence: number;
  evidence: string[];
  stage: 'initial' | 'negotiating' | 'near_completion' | 'completed';
}

export class SentimentAnalyzer {
  private static instance: SentimentAnalyzer;
  
  // Intent patterns for craft business conversations
  private intentPatterns = new Map([
    ['inquiry', [
      'what', 'how', 'can you', 'do you have', 'tell me about', 'show me',
      'क्या', 'कैसे', 'आप कर सकते', 'आपके पास है', 'बताएं', 'दिखाएं'
    ]],
    ['price_negotiation', [
      'price', 'cost', 'expensive', 'cheap', 'discount', 'budget', 'afford',
      'कीमत', 'लागत', 'महंगा', 'सस्ता', 'छूट', 'बजट', 'खर्च'
    ]],
    ['order_placement', [
      'order', 'buy', 'purchase', 'want to order', 'place order', 'confirm',
      'ऑर्डर', 'खरीदना', 'खरीदारी', 'ऑर्डर करना', 'पुष्टि'
    ]],
    ['timeline_discussion', [
      'when', 'time', 'delivery', 'ready', 'complete', 'deadline', 'urgent',
      'कब', 'समय', 'डिलीवरी', 'तैयार', 'पूरा', 'जल्दी'
    ]],
    ['design_feedback', [
      'like', 'love', 'beautiful', 'perfect', 'change', 'modify', 'different',
      'पसंद', 'सुंदर', 'बेहतरीन', 'बदलना', 'अलग'
    ]],
    ['complaint', [
      'problem', 'issue', 'wrong', 'not satisfied', 'disappointed', 'bad',
      'समस्या', 'गलत', 'संतुष्ट नहीं', 'निराश', 'खराब'
    ]],
    ['appreciation', [
      'thank', 'grateful', 'excellent', 'amazing', 'wonderful', 'great work',
      'धन्यवाद', 'आभारी', 'उत्कृष्ट', 'अद्भुत', 'शानदार'
    ]]
  ]);
  
  // Deal completion indicators
  private dealIndicators = new Map([
    ['price_agreement', [
      'agreed', 'accept', 'ok with price', 'fine', 'deal', 'yes to',
      'सहमत', 'स्वीकार', 'ठीक है', 'डील', 'हाँ'
    ]],
    ['timeline_agreement', [
      'ok with time', 'fine with delivery', 'agreed on date', 'confirmed',
      'समय ठीक है', 'डिलीवरी ठीक', 'तारीख मंजूर', 'पुष्टि'
    ]],
    ['design_approval', [
      'love the design', 'perfect', 'exactly what I wanted', 'approved',
      'डिज़ाइन पसंद', 'बिल्कुल सही', 'मंजूर'
    ]],
    ['order_confirmation', [
      'confirm order', 'place the order', 'go ahead', 'proceed',
      'ऑर्डर कन्फर्म', 'ऑर्डर करें', 'आगे बढ़ें'
    ]]
  ]);
  
  static getInstance(): SentimentAnalyzer {
    if (!SentimentAnalyzer.instance) {
      SentimentAnalyzer.instance = new SentimentAnalyzer();
    }
    return SentimentAnalyzer.instance;
  }
  
  async analyzeMessage(request: SentimentAnalysisRequest): Promise<SentimentAnalysisResult> {
    try {
      // Use Gemini AI for comprehensive analysis
      const geminiAnalysis = await this.performGeminiAnalysis(request);
      
      // Combine with rule-based analysis for craft-specific insights
      const ruleBasedAnalysis = this.performRuleBasedAnalysis(request);
      
      // Merge results
      const result = this.mergeAnalysisResults(geminiAnalysis, ruleBasedAnalysis, request);
      
      return result;
      
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      
      // Fallback to rule-based analysis
      return this.performRuleBasedAnalysis(request);
    }
  }
  
  private async performGeminiAnalysis(request: SentimentAnalysisRequest): Promise<Partial<SentimentAnalysisResult>> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const contextInfo = request.context ? `
    Context: This is a conversation between a ${request.context.participants.find(p => p.role === 'buyer')?.role || 'buyer'} and an ${request.context.participants.find(p => p.role === 'artisan')?.role || 'artisan'} specializing in ${request.context.artisanSpecialization || 'crafts'}.
    Recent conversation history: ${request.context.messageHistory.slice(-3).map(m => `"${m.text}" (${m.sentiment})`).join(', ')}
    ` : '';
    
    const prompt = `
    Analyze the following message for sentiment, intent, and business context:
    
    Message: "${request.text}"
    Language: ${request.language}
    ${contextInfo}
    
    Please provide analysis in the following JSON format:
    {
      "sentiment": "positive|negative|neutral",
      "sentimentScore": -1 to 1,
      "intent": "specific intent category",
      "intentConfidence": 0 to 1,
      "keyTopics": ["topic1", "topic2"],
      "urgency": "low|medium|high",
      "emotionalTone": "description of emotional tone",
      "dealIndicators": [
        {
          "type": "price_agreement|timeline_agreement|design_approval|order_confirmation|negotiation_progress",
          "confidence": 0 to 1,
          "evidence": ["evidence1", "evidence2"],
          "stage": "initial|negotiating|near_completion|completed"
        }
      ]
    }
    
    Focus on:
    1. Business negotiation context
    2. Craft-specific terminology
    3. Cultural nuances in communication
    4. Deal progression indicators
    5. Emotional undertones affecting business decisions
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          ...analysis,
          confidence: 0.8 // High confidence for Gemini analysis
        };
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
    }
    
    return {};
  }
  
  private performRuleBasedAnalysis(request: SentimentAnalysisRequest): SentimentAnalysisResult {
    const text = request.text.toLowerCase();
    
    // Sentiment analysis
    const sentiment = this.analyzeSentiment(text, request.language);
    
    // Intent classification
    const intent = this.classifyIntent(text, request.language);
    
    // Topic extraction
    const keyTopics = this.extractTopics(text, request.language);
    
    // Urgency detection
    const urgency = this.detectUrgency(text, request.language);
    
    // Deal indicators
    const dealIndicators = this.detectDealIndicators(text, request.language, request.context);
    
    return {
      sentiment: sentiment.sentiment,
      sentimentScore: sentiment.score,
      intent: intent.intent,
      intentConfidence: intent.confidence,
      keyTopics,
      urgency,
      dealIndicators,
      emotionalTone: sentiment.tone,
      confidence: 0.6 // Lower confidence for rule-based analysis
    };
  }
  
  private analyzeSentiment(text: string, language: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number; tone: string } {
    // Positive indicators
    const positiveWords = language === 'hi' ? [
      'अच्छा', 'बेहतरीन', 'सुंदर', 'पसंद', 'खुश', 'धन्यवाद', 'शानदार', 'उत्कृष्ट'
    ] : [
      'good', 'great', 'excellent', 'beautiful', 'love', 'like', 'happy', 'thank', 'wonderful', 'amazing', 'perfect'
    ];
    
    // Negative indicators
    const negativeWords = language === 'hi' ? [
      'बुरा', 'गलत', 'समस्या', 'निराश', 'खराब', 'महंगा', 'देर'
    ] : [
      'bad', 'wrong', 'problem', 'issue', 'disappointed', 'terrible', 'expensive', 'late', 'poor', 'unsatisfied'
    ];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const word of positiveWords) {
      if (text.includes(word)) positiveCount++;
    }
    
    for (const word of negativeWords) {
      if (text.includes(word)) negativeCount++;
    }
    
    // Calculate sentiment
    const totalWords = text.split(' ').length;
    const positiveRatio = positiveCount / totalWords;
    const negativeRatio = negativeCount / totalWords;
    
    let sentiment: 'positive' | 'negative' | 'neutral';
    let score: number;
    let tone: string;
    
    if (positiveRatio > negativeRatio && positiveCount > 0) {
      sentiment = 'positive';
      score = Math.min(0.8, positiveRatio * 5);
      tone = positiveCount > 2 ? 'enthusiastic' : 'pleased';
    } else if (negativeRatio > positiveRatio && negativeCount > 0) {
      sentiment = 'negative';
      score = -Math.min(0.8, negativeRatio * 5);
      tone = negativeCount > 2 ? 'frustrated' : 'concerned';
    } else {
      sentiment = 'neutral';
      score = 0;
      tone = 'neutral';
    }
    
    return { sentiment, score, tone };
  }
  
  private classifyIntent(text: string, language: string): { intent: string; confidence: number } {
    let bestIntent = 'general';
    let bestScore = 0;
    
    for (const [intent, patterns] of this.intentPatterns.entries()) {
      let score = 0;
      for (const pattern of patterns) {
        if (text.includes(pattern.toLowerCase())) {
          score += 1;
        }
      }
      
      const confidence = score / patterns.length;
      if (confidence > bestScore) {
        bestScore = confidence;
        bestIntent = intent;
      }
    }
    
    return {
      intent: bestIntent,
      confidence: Math.min(0.9, bestScore * 2)
    };
  }
  
  private extractTopics(text: string, language: string): string[] {
    const craftTopics = language === 'hi' ? [
      'मिट्टी के बर्तन', 'लकड़ी का काम', 'आभूषण', 'कपड़े', 'हस्तशिल्प'
    ] : [
      'pottery', 'woodwork', 'jewelry', 'textiles', 'handicrafts', 'carving', 'weaving', 'embroidery'
    ];
    
    const businessTopics = language === 'hi' ? [
      'कीमत', 'डिलीवरी', 'ऑर्डर', 'डिज़ाइन', 'गुणवत्ता'
    ] : [
      'price', 'delivery', 'order', 'design', 'quality', 'timeline', 'payment', 'shipping'
    ];
    
    const topics: string[] = [];
    
    [...craftTopics, ...businessTopics].forEach(topic => {
      if (text.includes(topic.toLowerCase())) {
        topics.push(topic);
      }
    });
    
    return topics;
  }
  
  private detectUrgency(text: string, language: string): 'low' | 'medium' | 'high' {
    const urgentWords = language === 'hi' ? [
      'जल्दी', 'तुरंत', 'आज', 'कल', 'जरूरी'
    ] : [
      'urgent', 'asap', 'immediately', 'today', 'tomorrow', 'rush', 'quickly', 'fast'
    ];
    
    const urgentCount = urgentWords.filter(word => text.includes(word)).length;
    
    if (urgentCount >= 2) return 'high';
    if (urgentCount >= 1) return 'medium';
    return 'low';
  }
  
  private detectDealIndicators(text: string, language: string, context?: ConversationContext): DealIndicator[] {
    const indicators: DealIndicator[] = [];
    
    for (const [type, patterns] of this.dealIndicators.entries()) {
      const matches = patterns.filter(pattern => text.includes(pattern.toLowerCase()));
      
      if (matches.length > 0) {
        const confidence = Math.min(0.9, matches.length / patterns.length * 2);
        
        // Determine stage based on context and patterns
        let stage: DealIndicator['stage'] = 'initial';
        if (context && context.messageHistory.length > 5) {
          const recentPositiveSentiment = context.messageHistory
            .slice(-3)
            .filter(m => m.sentiment === 'positive').length;
          
          if (recentPositiveSentiment >= 2) {
            stage = type === 'order_confirmation' ? 'completed' : 'near_completion';
          } else if (recentPositiveSentiment >= 1) {
            stage = 'negotiating';
          }
        }
        
        indicators.push({
          type: type as DealIndicator['type'],
          confidence,
          evidence: matches,
          stage
        });
      }
    }
    
    return indicators;
  }
  
  private mergeAnalysisResults(
    geminiResult: Partial<SentimentAnalysisResult>,
    ruleBasedResult: SentimentAnalysisResult,
    request: SentimentAnalysisRequest
  ): SentimentAnalysisResult {
    // Merge results with preference for Gemini when available
    return {
      sentiment: geminiResult.sentiment || ruleBasedResult.sentiment,
      sentimentScore: geminiResult.sentimentScore ?? ruleBasedResult.sentimentScore,
      intent: geminiResult.intent || ruleBasedResult.intent,
      intentConfidence: geminiResult.intentConfidence ?? ruleBasedResult.intentConfidence,
      keyTopics: [...(geminiResult.keyTopics || []), ...ruleBasedResult.keyTopics].slice(0, 5),
      urgency: geminiResult.urgency || ruleBasedResult.urgency,
      dealIndicators: [...(geminiResult.dealIndicators || []), ...ruleBasedResult.dealIndicators],
      emotionalTone: geminiResult.emotionalTone || ruleBasedResult.emotionalTone,
      confidence: Math.max(geminiResult.confidence || 0, ruleBasedResult.confidence)
    };
  }
  
  /**
   * Analyze conversation progression over time
   */
  async analyzeConversationProgression(context: ConversationContext): Promise<{
    overallSentiment: 'improving' | 'declining' | 'stable';
    dealProbability: number;
    nextBestAction: string;
    riskFactors: string[];
  }> {
    const recentMessages = context.messageHistory.slice(-10);
    
    // Calculate sentiment trend
    const sentimentTrend = this.calculateSentimentTrend(recentMessages);
    
    // Calculate deal probability
    const dealProbability = this.calculateDealProbability(context);
    
    // Suggest next best action
    const nextBestAction = this.suggestNextAction(context, dealProbability);
    
    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(context);
    
    return {
      overallSentiment: sentimentTrend,
      dealProbability,
      nextBestAction,
      riskFactors
    };
  }
  
  private calculateSentimentTrend(messages: Array<{ sentiment: string; timestamp: Date }>): 'improving' | 'declining' | 'stable' {
    if (messages.length < 3) return 'stable';
    
    const recent = messages.slice(-3);
    const earlier = messages.slice(-6, -3);
    
    const recentPositive = recent.filter(m => m.sentiment === 'positive').length;
    const earlierPositive = earlier.filter(m => m.sentiment === 'positive').length;
    
    if (recentPositive > earlierPositive) return 'improving';
    if (recentPositive < earlierPositive) return 'declining';
    return 'stable';
  }
  
  private calculateDealProbability(context: ConversationContext): number {
    let probability = 0.3; // Base probability
    
    const recentMessages = context.messageHistory.slice(-5);
    
    // Positive sentiment increases probability
    const positiveSentiment = recentMessages.filter(m => m.sentiment === 'positive').length;
    probability += positiveSentiment * 0.15;
    
    // Negative sentiment decreases probability
    const negativeSentiment = recentMessages.filter(m => m.sentiment === 'negative').length;
    probability -= negativeSentiment * 0.1;
    
    // Long conversations indicate engagement
    if (context.messageHistory.length > 10) {
      probability += 0.1;
    }
    
    // Recent activity indicates interest
    const recentActivity = recentMessages.filter(m => 
      Date.now() - m.timestamp.getTime() < 3600000 // Last hour
    ).length;
    probability += recentActivity * 0.05;
    
    return Math.max(0, Math.min(1, probability));
  }
  
  private suggestNextAction(context: ConversationContext, dealProbability: number): string {
    if (dealProbability > 0.7) {
      return 'Consider asking for order confirmation or next steps';
    } else if (dealProbability > 0.5) {
      return 'Share more details about the product or process';
    } else if (dealProbability > 0.3) {
      return 'Address any concerns and build rapport';
    } else {
      return 'Focus on understanding customer needs better';
    }
  }
  
  private identifyRiskFactors(context: ConversationContext): string[] {
    const risks: string[] = [];
    const recentMessages = context.messageHistory.slice(-5);
    
    // Check for negative sentiment
    const negativeSentiment = recentMessages.filter(m => m.sentiment === 'negative').length;
    if (negativeSentiment >= 2) {
      risks.push('Multiple negative responses detected');
    }
    
    // Check for long gaps in conversation
    if (recentMessages.length > 0) {
      const lastMessage = recentMessages[recentMessages.length - 1];
      const timeSinceLastMessage = Date.now() - lastMessage.timestamp.getTime();
      if (timeSinceLastMessage > 24 * 60 * 60 * 1000) { // 24 hours
        risks.push('Long gap since last message');
      }
    }
    
    // Check for price-related concerns
    const priceComplaints = recentMessages.filter(m => 
      m.text.toLowerCase().includes('expensive') || 
      m.text.toLowerCase().includes('costly') ||
      m.text.toLowerCase().includes('महंगा')
    ).length;
    if (priceComplaints > 0) {
      risks.push('Price concerns expressed');
    }
    
    return risks;
  }
}