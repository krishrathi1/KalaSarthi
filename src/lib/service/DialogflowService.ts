// Optional import - will be loaded dynamically if available
let SessionsClient: any;
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VectorStoreService } from './VectorStoreService';

interface DialogflowCXConfig {
  projectId: string;
  location: string;
  agentId: string;
  languageCode: string;
}

interface DialogflowResponse {
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
  fulfillmentText: string;
  action: string;
  requiresVectorSearch?: boolean;
  contextualData?: any;
  sessionId?: string;
  responseId?: string;
}

interface ConversationContext {
  sessionId: string;
  parameters: Record<string, any>;
  currentPage?: string;
  followupIntents?: string[];
}

interface IntentMapping {
  [key: string]: {
    action: string;
    target?: string;
    parameters?: string[];
    requiresContext?: boolean;
  };
}

interface IntentPattern {
  patterns: string[];
  intent: string;
  confidence: number;
  parameters?: Record<string, any>;
}

export class DialogflowService {
  private static instance: DialogflowService;
  private sessionsClient: SessionsClient;
  private genAI: GoogleGenerativeAI;
  private vectorStore: VectorStoreService;
  private config: DialogflowCXConfig;
  private conversationContexts: Map<string, ConversationContext> = new Map();

  private intentMappings: IntentMapping = {
    'product_creation': {
      action: 'navigate',
      target: '/smart-product-creator',
      parameters: ['product_type', 'category']
    },
    'sales_inquiry': {
      action: 'navigate',
      target: '/finance/dashboard',
      parameters: ['time_period', 'metric_type']
    },
    'trend_analysis': {
      action: 'navigate',
      target: '/trend-spotter',
      parameters: ['category', 'time_range']
    },
    'buyer_matching': {
      action: 'navigate',
      target: '/matchmaking',
      parameters: ['product_type', 'location']
    },
    'profile_management': {
      action: 'navigate',
      target: '/profile',
      parameters: ['section']
    },
    'help_request': {
      action: 'help',
      parameters: ['topic']
    },
    'greeting': {
      action: 'greeting'
    },
    'artisan_info': {
      action: 'info',
      requiresContext: true,
      parameters: ['info_type']
    },
    'general_chat': {
      action: 'chat',
      requiresContext: true,
      parameters: ['topic']
    }
  };

  private intentPatterns: IntentPattern[] = [
    // Product creation patterns
    {
      patterns: ['create product', 'new product', 'make product', 'add product', 'product creation', 'design product'],
      intent: 'product_creation',
      confidence: 0.9
    },
    {
      patterns: ['naya product', 'product banana', 'product dalna', 'नया प्रोडक्ट', 'प्रोडक्ट बनाना'],
      intent: 'product_creation',
      confidence: 0.9
    },

    // Sales inquiry patterns
    {
      patterns: ['sales', 'revenue', 'earnings', 'money', 'profit', 'income', 'finance'],
      intent: 'sales_inquiry',
      confidence: 0.85
    },
    {
      patterns: ['सेल्स', 'कमाई', 'फाइनेंस', 'पैसा', 'लाभ'],
      intent: 'sales_inquiry',
      confidence: 0.85
    },

    // Trend analysis patterns
    {
      patterns: ['trend', 'trending', 'popular', 'fashion', 'style', 'design', 'latest'],
      intent: 'trend_analysis',
      confidence: 0.8
    },
    {
      patterns: ['ट्रेंड', 'लोकप्रिय', 'फैशन', 'डिज़ाइन', 'नवीनतम'],
      intent: 'trend_analysis',
      confidence: 0.8
    },

    // Buyer matching patterns
    {
      patterns: ['buyer', 'customer', 'match', 'connect', 'find buyer'],
      intent: 'buyer_matching',
      confidence: 0.85
    },
    {
      patterns: ['बायर', 'ग्राहक', 'कस्टमर', 'जुड़ना', 'मैच'],
      intent: 'buyer_matching',
      confidence: 0.85
    },

    // Greeting patterns
    {
      patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'namaste'],
      intent: 'greeting',
      confidence: 0.95
    },
    {
      patterns: ['नमस्ते', 'नमस्कार', 'हैलो', 'कैसे हो', 'कैसे हैं'],
      intent: 'greeting',
      confidence: 0.95
    },

    // Artisan info patterns
    {
      patterns: ['tell me about', 'who are you', 'your experience', 'your skills', 'your products'],
      intent: 'artisan_info',
      confidence: 0.8
    },
    {
      patterns: ['आपके बारे में', 'आपका अनुभव', 'आपके स्किल्स', 'आपके प्रोडक्ट्स'],
      intent: 'artisan_info',
      confidence: 0.8
    },

    // Help patterns
    {
      patterns: ['help', 'assistance', 'what can you do', 'features'],
      intent: 'help_request',
      confidence: 0.9
    },
    {
      patterns: ['मदद', 'सहायता', 'क्या कर सकते हो', 'फीचर्स'],
      intent: 'help_request',
      confidence: 0.9
    }
  ];

  private constructor() {
    // Disable Dialogflow CX for now - using fallback intent detection only
    console.warn('Dialogflow CX disabled, using fallback intent detection');
    this.sessionsClient = null;

    // Initialize configuration
    this.config = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0314311341',
      location: process.env.DIALOGFLOW_LOCATION || 'global',
      agentId: process.env.DIALOGFLOW_AGENT_ID || 'enhanced-artisan-buddy',
      languageCode: 'en'
    };

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.vectorStore = VectorStoreService.getInstance();
  }

  public static getInstance(): DialogflowService {
    if (!DialogflowService.instance) {
      DialogflowService.instance = new DialogflowService();
    }
    return DialogflowService.instance;
  }

  /**
   * Detect intent using Dialogflow CX
   */
  public async detectIntent(message: string, sessionId: string, language: string = 'en', artisanId?: string): Promise<DialogflowResponse> {
    try {
      // Try Dialogflow CX first
      const cxResponse = await this.detectIntentWithCX(message, sessionId, language);

      // If CX confidence is high enough, use it
      if (cxResponse.confidence >= 0.7) {
        // Enhance with vector search if needed
        if (this.intentMappings[cxResponse.intent]?.requiresContext) {
          return await this.enhanceWithVectorSearch(cxResponse, message, artisanId);
        }
        return cxResponse;
      }

      // Fallback to pattern-based and AI detection
      return await this.detectIntentFallback(message, language, artisanId);

    } catch (error) {
      console.error('Dialogflow CX error, falling back to pattern detection:', error);
      return await this.detectIntentFallback(message, language, artisanId);
    }
  }

  /**
   * Detect intent using Dialogflow CX
   */
  private async detectIntentWithCX(message: string, sessionId: string, languageCode: string = 'en'): Promise<DialogflowResponse> {
    if (!this.sessionsClient) {
      throw new Error('Dialogflow CX client not available');
    }
    
    const sessionPath = this.sessionsClient.projectLocationAgentSessionPath(
      this.config.projectId,
      this.config.location,
      this.config.agentId,
      sessionId
    );

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
        },
        languageCode: languageCode,
      },
    };

    const [response] = await this.sessionsClient.detectIntent(request);

    const queryResult = response.queryResult;
    const intent = queryResult?.intent?.displayName || 'unknown';
    const confidence = queryResult?.intentDetectionConfidence || 0;
    const parameters = this.extractParameters(queryResult?.parameters);
    const fulfillmentText = queryResult?.responseMessages?.[0]?.text?.text?.[0] || '';

    // Update conversation context
    this.updateConversationContext(sessionId, {
      sessionId,
      parameters,
      currentPage: queryResult?.currentPage?.displayName,
      followupIntents: queryResult?.intent?.displayName ? [queryResult.intent.displayName] : []
    });

    return {
      intent,
      confidence,
      parameters,
      fulfillmentText,
      action: this.intentMappings[intent]?.action || 'chat',
      sessionId,
      responseId: response.responseId,
      requiresVectorSearch: this.intentMappings[intent]?.requiresContext || false
    };
  }

  /**
   * Fallback intent detection using existing methods
   */
  private async detectIntentFallback(message: string, language: string, artisanId?: string): Promise<DialogflowResponse> {
    const lowerMessage = message.toLowerCase().trim();

    // First try pattern-based detection
    let response = await this.detectPatternBasedIntent(lowerMessage, language);

    // If no clear intent found, use AI-powered detection
    if (response.confidence < 0.7) {
      response = await this.detectAIBasedIntent(message, language, artisanId);
    }

    // If intent requires context, enhance with vector search
    if (this.intentMappings[response.intent]?.requiresContext) {
      response = await this.enhanceWithVectorSearch(response, message, artisanId);
    }

    return response;
  }

  /**
   * Extract parameters from Dialogflow CX response
   */
  private extractParameters(parameters: any): Record<string, any> {
    if (!parameters) return {};

    const extracted: Record<string, any> = {};

    // Convert Dialogflow CX parameter format to our format
    for (const [key, value] of Object.entries(parameters)) {
      if (value && typeof value === 'object' && 'stringValue' in value) {
        extracted[key] = (value as any).stringValue;
      } else if (value && typeof value === 'object' && 'numberValue' in value) {
        extracted[key] = (value as any).numberValue;
      } else if (value && typeof value === 'object' && 'boolValue' in value) {
        extracted[key] = (value as any).boolValue;
      } else {
        extracted[key] = value;
      }
    }

    return extracted;
  }

  /**
   * Update conversation context for multi-turn conversations
   */
  private updateConversationContext(sessionId: string, context: ConversationContext): void {
    this.conversationContexts.set(sessionId, context);
  }

  /**
   * Get conversation context for a session
   */
  public getConversationContext(sessionId: string): ConversationContext | undefined {
    return this.conversationContexts.get(sessionId);
  }

  /**
   * Clear conversation context for a session
   */
  public clearConversationContext(sessionId: string): void {
    this.conversationContexts.delete(sessionId);
  }

  /**
   * Handle follow-up intents and clarifying questions
   */
  public async handleFollowUpIntent(
    message: string,
    sessionId: string,
    previousIntent: string,
    language: string = 'en'
  ): Promise<DialogflowResponse> {
    const context = this.getConversationContext(sessionId);

    if (!context) {
      // No context available, treat as new intent
      return this.detectIntent(message, sessionId, language);
    }

    try {
      // Use Dialogflow CX with context
      const response = await this.detectIntentWithCX(message, sessionId, language);

      // Merge with previous context parameters
      response.parameters = { ...context.parameters, ...response.parameters };

      return response;
    } catch (error) {
      console.error('Follow-up intent detection error:', error);
      return this.detectIntentFallback(message, language);
    }
  }

  /**
   * Generate clarifying questions when intent is ambiguous
   */
  public generateClarifyingQuestion(intent: string, parameters: Record<string, any>, language: string = 'en'): string {
    const clarifyingQuestions = {
      'product_creation': {
        en: 'What type of product would you like to create? (e.g., jewelry, textiles, pottery)',
        hi: 'आप किस प्रकार का प्रोडक्ट बनाना चाहते हैं? (जैसे आभूषण, कपड़े, मिट्टी के बर्तन)'
      },
      'sales_inquiry': {
        en: 'Which sales metric would you like to see? (revenue, orders, or profit)',
        hi: 'आप कौन सा सेल्स मेट्रिक देखना चाहते हैं? (रेवेन्यू, ऑर्डर, या प्रॉफिट)'
      },
      'trend_analysis': {
        en: 'Which category trends are you interested in? (fashion, home decor, or seasonal)',
        hi: 'आप किस कैटेगरी के ट्रेंड्स में रुचि रखते हैं? (फैशन, होम डेकोर, या सीज़नल)'
      },
      'buyer_matching': {
        en: 'What type of buyers are you looking for? Please specify your product category.',
        hi: 'आप किस प्रकार के बायर्स की तलाश कर रहे हैं? कृपया अपनी प्रोडक्ट कैटेगरी बताएं।'
      }
    };

    const lang = language === 'hi' ? 'hi' : 'en';
    return clarifyingQuestions[intent as keyof typeof clarifyingQuestions]?.[lang] ||
      (lang === 'hi' ? 'कृपया अधिक जानकारी दें।' : 'Could you please provide more details?');
  }

  private async detectPatternBasedIntent(message: string, language: string): Promise<DialogflowResponse> {
    // Use existing pattern matching logic
    if (language === 'hi' || this.containsHindi(message)) {
      return this.detectHindiIntent(message);
    }
    return this.detectEnglishIntent(message);
  }

  private async detectAIBasedIntent(message: string, language: string, artisanId?: string): Promise<DialogflowResponse> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const intentList = Object.keys(this.intentMappings).join(', ');
      const prompt = `
        Analyze this user message and classify it into one of these intents: ${intentList}
        
        Message: "${message}"
        Language: ${language}
        
        Consider these intent definitions:
        - product_creation: User wants to create, add, or design new products
        - sales_inquiry: User asks about sales, revenue, earnings, financial data
        - trend_analysis: User wants to know about trends, popular items, fashion
        - buyer_matching: User wants to find or connect with buyers/customers
        - profile_management: User wants to manage their profile or account
        - help_request: User needs help or wants to know features
        - greeting: User is greeting or starting conversation
        - artisan_info: User asks about artisan details, experience, skills
        - general_chat: General conversation that doesn't fit other categories
        
        Respond in JSON format:
        {
          "intent": "detected_intent",
          "confidence": 0.8,
          "parameters": {"key": "value"},
          "reasoning": "why this intent was chosen"
        }
      `;

      const result = await model.generateContent(prompt);
      const aiResponse = JSON.parse(result.response.text());

      return {
        intent: aiResponse.intent || 'general_chat',
        confidence: aiResponse.confidence || 0.6,
        parameters: aiResponse.parameters || {},
        fulfillmentText: this.generateFulfillmentText(aiResponse.intent, language),
        action: this.intentMappings[aiResponse.intent]?.action || 'chat',
        requiresVectorSearch: this.intentMappings[aiResponse.intent]?.requiresContext || false
      };

    } catch (error) {
      console.error('AI intent detection error:', error);
      return {
        intent: 'general_chat',
        confidence: 0.5,
        parameters: {},
        fulfillmentText: language === 'hi'
          ? 'मैं आपकी बात समझने की कोशिश कर रहा हूं। कृपया और बताएं।'
          : 'I\'m trying to understand what you need. Could you please elaborate?',
        action: 'chat',
        requiresVectorSearch: true
      };
    }
  }

  private async enhanceWithVectorSearch(response: DialogflowResponse, message: string, artisanId?: string): Promise<DialogflowResponse> {
    try {
      // Search for relevant context
      const relevantDocs = await this.vectorStore.searchSimilarContent(message, 3);

      // Generate contextual response
      const contextualResponse = await this.vectorStore.generateContextualResponse(message, artisanId);

      return {
        ...response,
        fulfillmentText: contextualResponse,
        contextualData: relevantDocs,
        requiresVectorSearch: true
      };

    } catch (error) {
      console.error('Vector search enhancement error:', error);
      return response;
    }
  }

  private generateFulfillmentText(intent: string, language: string): string {
    const responses = {
      'product_creation': {
        en: 'I\'ll help you create a new product. Let me take you to the Smart Product Creator.',
        hi: 'मैं आपको नया प्रोडक्ट बनाने में मदद करूंगा। Smart Product Creator पर ले चलता हूं।'
      },
      'sales_inquiry': {
        en: 'Let me show you your sales and financial data. Opening Finance Dashboard.',
        hi: 'मैं आपकी सेल्स और वित्तीय डेटा दिखाता हूं। Finance Dashboard खोल रहा हूं।'
      },
      'trend_analysis': {
        en: 'I\'ll help you discover the latest trends. Taking you to Trend Spotter.',
        hi: 'मैं आपको नवीनतम ट्रेंड्स दिखाता हूं। Trend Spotter पर ले चलता हूं।'
      },
      'buyer_matching': {
        en: 'Let me help you connect with potential buyers. Opening Matchmaking.',
        hi: 'मैं आपको संभावित बायर्स से जोड़ता हूं। Matchmaking खोल रहा हूं।'
      },
      'greeting': {
        en: 'Hello! I\'m your Artisan Buddy. How can I help you today?',
        hi: 'नमस्ते! मैं आपका Artisan Buddy हूं। आज मैं आपकी कैसे मदद कर सकता हूं?'
      },
      'help_request': {
        en: 'I\'m here to help! I can assist with products, sales, trends, and connecting with buyers.',
        hi: 'मैं यहां मदद के लिए हूं! मैं प्रोडक्ट्स, सेल्स, ट्रेंड्स और बायर्स से जुड़ने में मदद कर सकता हूं।'
      },
      'general_chat': {
        en: 'I\'m here to chat and help with your craft business. What would you like to know?',
        hi: 'मैं यहां बात करने और आपके क्राफ्ट बिज़नेस में मदद के लिए हूं। आप क्या जानना चाहते हैं?'
      }
    };

    const lang = language === 'hi' ? 'hi' : 'en';
    return responses[intent as keyof typeof responses]?.[lang] || responses['general_chat'][lang];
  }

  private containsHindi(text: string): boolean {
    const hindiRegex = /[\u0900-\u097F]/;
    return hindiRegex.test(text);
  }

  private detectHindiIntent(message: string): DialogflowResponse {
    // Product creation patterns
    if (this.matchesPatterns(message, [
      'naya product', 'product dalna', 'product banana', 'product create',
      'नया प्रोडक्ट', 'प्रोडक्ट बनाना', 'प्रोडक्ट डालना', 'प्रोडक्ट क्रिएट',
      'product add', 'add product', 'create product'
    ])) {
      return {
        intent: 'product_creation',
        confidence: 0.9,
        parameters: { product_type: 'general' },
        fulfillmentText: 'मैं आपको नया प्रोडक्ट बनाने में मदद करूंगा। Smart Product Creator पर जा रहे हैं...',
        action: 'navigate'
      };
    }

    // Sales inquiry patterns
    if (this.matchesPatterns(message, [
      'sales', 'सेल्स', 'कमाई', 'earnings', 'revenue', 'revenue',
      'finance', 'फाइनेंस', 'money', 'पैसा', 'profit', 'लाभ'
    ])) {
      return {
        intent: 'sales_inquiry',
        confidence: 0.9,
        parameters: { metric_type: 'revenue' },
        fulfillmentText: 'मैं आपकी सेल्स और कमाई दिखाता हूं। Finance Dashboard पर जा रहे हैं...',
        action: 'navigate'
      };
    }

    // Trend analysis patterns
    if (this.matchesPatterns(message, [
      'trend', 'ट्रेंड', 'trending', 'लोकप्रिय', 'popular', 'fashion',
      'style', 'डिज़ाइन', 'design', 'latest', 'नवीनतम'
    ])) {
      return {
        intent: 'trend_analysis',
        confidence: 0.9,
        parameters: { category: 'general' },
        fulfillmentText: 'मैं आपको ट्रेंडिंग डिज़ाइन दिखाता हूं। Trend Spotter पर जा रहे हैं...',
        action: 'navigate'
      };
    }

    // Buyer matching patterns
    if (this.matchesPatterns(message, [
      'buyer', 'बायर', 'customer', 'ग्राहक', 'match', 'मैच',
      'connect', 'जुड़ना', 'buyer find', 'buyer search'
    ])) {
      return {
        intent: 'buyer_matching',
        confidence: 0.9,
        parameters: { product_type: 'general' },
        fulfillmentText: 'मैं आपको संभावित बायर्स से जोड़ता हूं। Matchmaking पर जा रहे हैं...',
        action: 'navigate'
      };
    }

    // Greeting patterns
    if (this.matchesPatterns(message, [
      'hello', 'hi', 'hey', 'namaste', 'नमस्ते', 'नमस्कार',
      'kaise ho', 'कैसे हो', 'kaise hai', 'कैसे हैं', 'aap kaise hain'
    ])) {
      return {
        intent: 'greeting',
        confidence: 0.95,
        parameters: {},
        fulfillmentText: 'नमस्ते! मैं आपका Artisan Buddy हूं। मैं आपकी क्राफ्ट बिज़नेस में मदद कर सकता हूं। आज आप क्या करना चाहते हैं?',
        action: 'greeting'
      };
    }

    // Help patterns
    if (this.matchesPatterns(message, [
      'help', 'मदद', 'assistance', 'सहायता', 'what can you do',
      'क्या कर सकते हो', 'features', 'फीचर्स'
    ])) {
      return {
        intent: 'help_request',
        confidence: 0.9,
        parameters: { topic: 'general' },
        fulfillmentText: 'मैं आपकी मदद कर सकता हूं:\n• नए प्रोडक्ट बनाने में\n• सेल्स ट्रैक करने में\n• ट्रेंड एनालिसिस में\n• बायर्स से जुड़ने में\n• बिज़नेस सलाह देने में',
        action: 'help'
      };
    }

    // Default fallback
    return {
      intent: 'unknown',
      confidence: 0.1,
      parameters: {},
      fulfillmentText: `मैं समझ गया कि आपने कहा: "${message}"। मैं आपका Artisan Buddy हूं और मैं आपकी क्राफ्ट बिज़नेस में मदद कर सकता हूं। आप क्या करना चाहते हैं?`,
      action: 'conversation'
    };
  }

  private detectEnglishIntent(message: string): DialogflowResponse {
    // Product creation patterns
    if (this.matchesPatterns(message, [
      'create product', 'new product', 'make product', 'add product',
      'product creation', 'design product', 'build product'
    ])) {
      return {
        intent: 'product_creation',
        confidence: 0.9,
        parameters: { product_type: 'general' },
        fulfillmentText: 'I\'ll help you create a new product. Taking you to Smart Product Creator...',
        action: 'navigate'
      };
    }

    // Sales inquiry patterns
    if (this.matchesPatterns(message, [
      'sales', 'revenue', 'earnings', 'money', 'profit', 'income',
      'finance', 'financial', 'budget', 'expenses'
    ])) {
      return {
        intent: 'sales_inquiry',
        confidence: 0.9,
        parameters: { metric_type: 'revenue' },
        fulfillmentText: 'I\'ll show you your sales and earnings. Taking you to Finance Dashboard...',
        action: 'navigate'
      };
    }

    // Trend analysis patterns
    if (this.matchesPatterns(message, [
      'trend', 'trending', 'popular', 'fashion', 'style', 'design',
      'latest', 'what\'s popular', 'market trend'
    ])) {
      return {
        intent: 'trend_analysis',
        confidence: 0.9,
        parameters: { category: 'general' },
        fulfillmentText: 'I\'ll help you discover trending designs. Taking you to Trend Spotter...',
        action: 'navigate'
      };
    }

    // Buyer matching patterns
    if (this.matchesPatterns(message, [
      'buyer', 'customer', 'match', 'connect', 'find buyer', 'buyer search'
    ])) {
      return {
        intent: 'buyer_matching',
        confidence: 0.9,
        parameters: { product_type: 'general' },
        fulfillmentText: 'I\'ll help you connect with potential buyers. Taking you to Matchmaking...',
        action: 'navigate'
      };
    }

    // Greeting patterns
    if (this.matchesPatterns(message, [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'how are you doing', 'what\'s up'
    ])) {
      return {
        intent: 'greeting',
        confidence: 0.95,
        parameters: {},
        fulfillmentText: 'Hello! I\'m your Artisan Buddy. I can help you with your craft business. What would you like to work on today?',
        action: 'greeting'
      };
    }

    // Help patterns
    if (this.matchesPatterns(message, [
      'help', 'assistance', 'what can you do', 'features', 'tell me about yourself'
    ])) {
      return {
        intent: 'help_request',
        confidence: 0.9,
        parameters: { topic: 'general' },
        fulfillmentText: 'I can help you with:\n• Creating new products\n• Tracking sales\n• Trend analysis\n• Connecting with buyers\n• Business advice',
        action: 'help'
      };
    }

    // Default fallback
    return {
      intent: 'unknown',
      confidence: 0.1,
      parameters: {},
      fulfillmentText: `I understand you said: "${message}". I'm your Artisan Buddy and I can help you with your craft business. What would you like to work on?`,
      action: 'conversation'
    };
  }

  private matchesPatterns(message: string, patterns: string[]): boolean {
    return patterns.some(pattern => message.includes(pattern.toLowerCase()));
  }

  /**
   * Get navigation target for intent
   */
  public getNavigationTarget(intent: string): string | null {
    const mapping = this.intentMappings[intent];
    return mapping?.target || null;
  }

  /**
   * Get action for intent
   */
  public getAction(intent: string): string | null {
    const mapping = this.intentMappings[intent];
    return mapping?.action || null;
  }

  /**
   * Advanced intent recognition with confidence scoring
   */
  public async recognizeIntentWithConfidence(
    message: string,
    sessionId: string,
    language: string = 'en'
  ): Promise<{
    intent: string;
    confidence: number;
    alternativeIntents: Array<{ intent: string; confidence: number }>;
    entities: Record<string, any>;
  }> {
    try {
      const sessionPath = this.sessionsClient.projectLocationAgentSessionPath(
        this.config.projectId,
        this.config.location,
        this.config.agentId,
        sessionId
      );

      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: message,
          },
          languageCode: language,
        },
        queryParams: {
          analyzeQueryTextSentiment: true,
        },
      };

      const [response] = await this.sessionsClient.detectIntent(request);
      const queryResult = response.queryResult;

      const primaryIntent = queryResult?.intent?.displayName || 'unknown';
      const primaryConfidence = queryResult?.intentDetectionConfidence || 0;

      // Extract alternative intents (if available)
      const alternativeIntents = queryResult?.match?.intent ?
        [{ intent: queryResult.match.intent.displayName || 'unknown', confidence: queryResult.match.confidence || 0 }] :
        [];

      // Extract entities from parameters
      const entities = this.extractEntitiesFromParameters(queryResult?.parameters);

      return {
        intent: primaryIntent,
        confidence: primaryConfidence,
        alternativeIntents,
        entities
      };

    } catch (error) {
      console.error('Intent recognition error:', error);

      // Fallback to pattern-based recognition
      const fallbackResponse = await this.detectPatternBasedIntent(message.toLowerCase(), language);

      return {
        intent: fallbackResponse.intent,
        confidence: fallbackResponse.confidence,
        alternativeIntents: [],
        entities: fallbackResponse.parameters
      };
    }
  }

  /**
   * Extract and map entities from Dialogflow parameters
   */
  private extractEntitiesFromParameters(parameters: any): Record<string, any> {
    if (!parameters) return {};

    const entities: Record<string, any> = {};

    // Define entity mappings for artisan-specific entities
    const entityMappings = {
      'product-type': ['product_type', 'productType'],
      'craft-category': ['craft_category', 'category'],
      'skill-level': ['skill_level', 'experience'],
      'location': ['location', 'city', 'region'],
      'time-period': ['time_period', 'duration'],
      'price-range': ['price_range', 'budget'],
      'material': ['material', 'materials'],
      'color': ['color', 'colors'],
      'size': ['size', 'dimensions'],
      'style': ['style', 'design_style']
    };

    // Extract entities based on mappings
    for (const [entityType, paramNames] of Object.entries(entityMappings)) {
      for (const paramName of paramNames) {
        if (parameters[paramName]) {
          entities[entityType] = this.extractParameterValue(parameters[paramName]);
          break;
        }
      }
    }

    // Extract any additional parameters not in mappings
    for (const [key, value] of Object.entries(parameters)) {
      if (!Object.values(entityMappings).flat().includes(key)) {
        entities[key] = this.extractParameterValue(value);
      }
    }

    return entities;
  }

  /**
   * Extract value from Dialogflow parameter object
   */
  private extractParameterValue(parameter: any): any {
    if (!parameter) return null;

    if (typeof parameter === 'string' || typeof parameter === 'number' || typeof parameter === 'boolean') {
      return parameter;
    }

    if (parameter.stringValue !== undefined) return parameter.stringValue;
    if (parameter.numberValue !== undefined) return parameter.numberValue;
    if (parameter.boolValue !== undefined) return parameter.boolValue;
    if (parameter.listValue) return parameter.listValue.values?.map((v: any) => this.extractParameterValue(v)) || [];
    if (parameter.structValue) {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(parameter.structValue.fields || {})) {
        result[key] = this.extractParameterValue(value);
      }
      return result;
    }

    return parameter;
  }

  /**
   * Enhanced entity extraction with context awareness
   */
  public async extractEntitiesWithContext(
    message: string,
    sessionId: string,
    previousEntities: Record<string, any> = {},
    language: string = 'en'
  ): Promise<Record<string, any>> {
    const recognition = await this.recognizeIntentWithConfidence(message, sessionId, language);

    // Merge with previous entities, giving priority to new ones
    const mergedEntities = { ...previousEntities, ...recognition.entities };

    // Apply context-specific entity resolution
    return this.resolveEntitiesWithContext(mergedEntities, recognition.intent, language);
  }

  /**
   * Resolve entities with context-specific logic
   */
  private resolveEntitiesWithContext(
    entities: Record<string, any>,
    intent: string,
    language: string
  ): Record<string, any> {
    const resolved = { ...entities };

    // Intent-specific entity resolution
    switch (intent) {
      case 'product_creation':
        // Ensure product type is specified
        if (!resolved['product-type'] && resolved['craft-category']) {
          resolved['product-type'] = resolved['craft-category'];
        }
        break;

      case 'sales_inquiry':
        // Default time period if not specified
        if (!resolved['time-period']) {
          resolved['time-period'] = 'current_month';
        }
        break;

      case 'trend_analysis':
        // Default category if not specified
        if (!resolved['craft-category']) {
          resolved['craft-category'] = 'general';
        }
        break;

      case 'buyer_matching':
        // Ensure location context
        if (!resolved['location']) {
          resolved['location'] = 'nearby';
        }
        break;
    }

    return resolved;
  }

  /**
   * Support for follow-up intents with parameter mapping
   */
  public async processFollowUpIntent(
    message: string,
    sessionId: string,
    previousIntent: string,
    previousParameters: Record<string, any>,
    language: string = 'en'
  ): Promise<DialogflowResponse> {
    // Get current recognition
    const recognition = await this.recognizeIntentWithConfidence(message, sessionId, language);

    // Determine if this is a follow-up or new intent
    const isFollowUp = recognition.confidence < 0.8 || this.isFollowUpPattern(message, previousIntent);

    if (isFollowUp) {
      // Treat as parameter completion for previous intent
      const mergedParameters = { ...previousParameters, ...recognition.entities };

      return {
        intent: previousIntent,
        confidence: 0.9, // High confidence for follow-up
        parameters: mergedParameters,
        fulfillmentText: this.generateParameterCompletionResponse(previousIntent, mergedParameters, language),
        action: this.intentMappings[previousIntent]?.action || 'chat',
        sessionId,
        requiresVectorSearch: this.intentMappings[previousIntent]?.requiresContext || false
      };
    } else {
      // New intent detected
      return {
        intent: recognition.intent,
        confidence: recognition.confidence,
        parameters: recognition.entities,
        fulfillmentText: this.generateFulfillmentText(recognition.intent, language),
        action: this.intentMappings[recognition.intent]?.action || 'chat',
        sessionId,
        requiresVectorSearch: this.intentMappings[recognition.intent]?.requiresContext || false
      };
    }
  }

  /**
   * Check if message is a follow-up pattern
   */
  private isFollowUpPattern(message: string, previousIntent: string): boolean {
    const followUpPatterns = {
      'product_creation': ['yes', 'no', 'jewelry', 'textile', 'pottery', 'wood', 'metal'],
      'sales_inquiry': ['revenue', 'orders', 'profit', 'this month', 'last month', 'yearly'],
      'trend_analysis': ['fashion', 'home', 'seasonal', 'popular', 'trending'],
      'buyer_matching': ['local', 'online', 'wholesale', 'retail', 'nearby']
    };

    const patterns = followUpPatterns[previousIntent as keyof typeof followUpPatterns] || [];
    const lowerMessage = message.toLowerCase();

    return patterns.some(pattern => lowerMessage.includes(pattern));
  }

  /**
   * Generate response for parameter completion
   */
  private generateParameterCompletionResponse(
    intent: string,
    parameters: Record<string, any>,
    language: string
  ): string {
    const responses = {
      'product_creation': {
        en: `Great! I'll help you create a ${parameters['product-type'] || 'new'} product. Let me take you to the Smart Product Creator.`,
        hi: `बहुत अच्छा! मैं आपको ${parameters['product-type'] || 'नया'} प्रोडक्ट बनाने में मदद करूंगा। Smart Product Creator पर ले चलता हूं।`
      },
      'sales_inquiry': {
        en: `I'll show you your ${parameters['time-period'] || 'current'} sales data. Opening Finance Dashboard.`,
        hi: `मैं आपका ${parameters['time-period'] || 'वर्तमान'} सेल्स डेटा दिखाता हूं। Finance Dashboard खोल रहा हूं।`
      },
      'trend_analysis': {
        en: `Perfect! I'll analyze ${parameters['craft-category'] || 'general'} trends for you. Taking you to Trend Spotter.`,
        hi: `बहुत बढ़िया! मैं आपके लिए ${parameters['craft-category'] || 'सामान्य'} ट्रेंड्स का विश्लेषण करूंगा। Trend Spotter पर ले चलता हूं।`
      }
    };

    const lang = language === 'hi' ? 'hi' : 'en';
    return responses[intent as keyof typeof responses]?.[lang] ||
      (lang === 'hi' ? 'समझ गया! आगे बढ़ते हैं।' : 'Got it! Let\'s proceed.');
  }

  /**
   * Multi-turn conversation handling with context persistence
   */
  public async handleMultiTurnConversation(
    message: string,
    sessionId: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>,
    language: string = 'en'
  ): Promise<DialogflowResponse> {
    const context = this.getConversationContext(sessionId);

    // Analyze conversation flow
    const flowState = this.analyzeConversationFlow(conversationHistory, context);

    // Handle based on flow state
    switch (flowState.state) {
      case 'awaiting_parameters':
        return this.handleParameterCollection(message, sessionId, flowState, language);

      case 'clarification_needed':
        return this.handleClarificationRequest(message, sessionId, flowState, language);

      case 'follow_up':
        return this.handleFollowUpIntent(message, sessionId, flowState.currentIntent!, language);

      case 'new_intent':
      default:
        return this.detectIntent(message, sessionId, language);
    }
  }

  /**
   * Analyze conversation flow to determine current state
   */
  private analyzeConversationFlow(
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>,
    context?: ConversationContext
  ): {
    state: 'new_intent' | 'awaiting_parameters' | 'clarification_needed' | 'follow_up';
    currentIntent?: string;
    missingParameters?: string[];
    lastAssistantMessage?: string;
  } {
    if (!context || conversationHistory.length === 0) {
      return { state: 'new_intent' };
    }

    const lastAssistantMessage = conversationHistory
      .filter(msg => msg.role === 'assistant')
      .pop()?.content;

    // Check if we're waiting for parameters
    const requiredParams = this.getRequiredParameters(context.currentPage || context.parameters?.intent);
    const missingParams = requiredParams.filter(param => !context.parameters[param]);

    if (missingParams.length > 0) {
      return {
        state: 'awaiting_parameters',
        currentIntent: context.parameters?.intent,
        missingParameters: missingParams,
        lastAssistantMessage
      };
    }

    // Check if last message was a clarification request
    if (lastAssistantMessage && this.isClarificationRequest(lastAssistantMessage)) {
      return {
        state: 'clarification_needed',
        currentIntent: context.parameters?.intent,
        lastAssistantMessage
      };
    }

    // Check if this is a follow-up to previous intent
    const recentUserMessages = conversationHistory
      .filter(msg => msg.role === 'user')
      .slice(-2);

    if (recentUserMessages.length > 1 && context.followupIntents?.length) {
      return {
        state: 'follow_up',
        currentIntent: context.followupIntents[0],
        lastAssistantMessage
      };
    }

    return { state: 'new_intent' };
  }

  /**
   * Handle parameter collection in multi-turn conversations
   */
  private async handleParameterCollection(
    message: string,
    sessionId: string,
    flowState: any,
    language: string
  ): Promise<DialogflowResponse> {
    const context = this.getConversationContext(sessionId);
    if (!context) {
      return this.detectIntent(message, sessionId, language);
    }

    // Extract entities from current message
    const entities = await this.extractEntitiesWithContext(message, sessionId, context.parameters, language);

    // Update context with new parameters
    const updatedContext = {
      ...context,
      parameters: { ...context.parameters, ...entities }
    };
    this.updateConversationContext(sessionId, updatedContext);

    // Check if we have all required parameters now
    const stillMissing = flowState.missingParameters?.filter((param: string) => !updatedContext.parameters[param]) || [];

    if (stillMissing.length > 0) {
      // Still missing parameters, ask for next one
      const nextParam = stillMissing[0];
      const clarifyingQuestion = this.generateParameterQuestion(nextParam, updatedContext.parameters?.intent, language);

      return {
        intent: updatedContext.parameters?.intent || 'parameter_collection',
        confidence: 0.9,
        parameters: updatedContext.parameters,
        fulfillmentText: clarifyingQuestion,
        action: 'collect_parameters',
        sessionId,
        requiresVectorSearch: false
      };
    } else {
      // All parameters collected, proceed with intent
      return {
        intent: updatedContext.parameters?.intent || 'unknown',
        confidence: 0.95,
        parameters: updatedContext.parameters,
        fulfillmentText: this.generateParameterCompletionResponse(
          updatedContext.parameters?.intent,
          updatedContext.parameters,
          language
        ),
        action: this.intentMappings[updatedContext.parameters?.intent]?.action || 'chat',
        sessionId,
        requiresVectorSearch: this.intentMappings[updatedContext.parameters?.intent]?.requiresContext || false
      };
    }
  }

  /**
   * Handle clarification requests
   */
  private async handleClarificationRequest(
    message: string,
    sessionId: string,
    flowState: any,
    language: string
  ): Promise<DialogflowResponse> {
    // Check if user provided clarification
    const clarificationResponse = this.parseClarificationResponse(message, flowState.currentIntent, language);

    if (clarificationResponse.understood) {
      // User provided clarification, update context and proceed
      const context = this.getConversationContext(sessionId);
      const updatedContext = {
        ...context,
        parameters: { ...context?.parameters, ...clarificationResponse.parameters }
      };
      this.updateConversationContext(sessionId, updatedContext);

      return {
        intent: flowState.currentIntent || 'clarified',
        confidence: 0.9,
        parameters: updatedContext.parameters,
        fulfillmentText: this.generateParameterCompletionResponse(
          flowState.currentIntent,
          updatedContext.parameters,
          language
        ),
        action: this.intentMappings[flowState.currentIntent]?.action || 'chat',
        sessionId,
        requiresVectorSearch: this.intentMappings[flowState.currentIntent]?.requiresContext || false
      };
    } else {
      // Still unclear, try different approach or escalate
      return this.detectIntent(message, sessionId, language);
    }
  }

  /**
   * Get required parameters for an intent
   */
  private getRequiredParameters(intent?: string): string[] {
    const requiredParams: Record<string, string[]> = {
      'product_creation': ['product-type'],
      'sales_inquiry': ['time-period'],
      'trend_analysis': ['craft-category'],
      'buyer_matching': ['product-type', 'location']
    };

    return requiredParams[intent || ''] || [];
  }

  /**
   * Check if message is a clarification request
   */
  private isClarificationRequest(message: string): boolean {
    const clarificationPatterns = [
      'what type', 'which', 'could you specify', 'please provide', 'more details',
      'क्या प्रकार', 'कौन सा', 'कृपया बताएं', 'अधिक जानकारी'
    ];

    return clarificationPatterns.some(pattern =>
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Generate parameter-specific questions
   */
  private generateParameterQuestion(parameter: string, intent: string, language: string): string {
    const questions: Record<string, Record<string, string>> = {
      'product-type': {
        en: 'What type of product would you like to work with? (e.g., jewelry, textiles, pottery, woodwork)',
        hi: 'आप किस प्रकार के प्रोडक्ट के साथ काम करना चाहते हैं? (जैसे आभूषण, कपड़े, मिट्टी के बर्तन, लकड़ी का काम)'
      },
      'time-period': {
        en: 'Which time period are you interested in? (this month, last month, this year)',
        hi: 'आप किस समय अवधि में रुचि रखते हैं? (इस महीने, पिछले महीने, इस साल)'
      },
      'craft-category': {
        en: 'Which craft category would you like to explore? (fashion, home decor, traditional crafts)',
        hi: 'आप किस शिल्प श्रेणी का अन्वेषण करना चाहते हैं? (फैशन, होम डेकोर, पारंपरिक शिल्प)'
      },
      'location': {
        en: 'What location are you interested in? (local, nearby cities, or specific region)',
        hi: 'आप किस स्थान में रुचि रखते हैं? (स्थानीय, आस-पास के शहर, या विशिष्ट क्षेत्र)'
      }
    };

    const lang = language === 'hi' ? 'hi' : 'en';
    return questions[parameter]?.[lang] ||
      (lang === 'hi' ? `कृपया ${parameter} के बारे में बताएं।` : `Please specify the ${parameter}.`);
  }

  /**
   * Parse clarification response
   */
  private parseClarificationResponse(
    message: string,
    intent: string,
    language: string
  ): { understood: boolean; parameters: Record<string, any> } {
    const lowerMessage = message.toLowerCase();

    // Simple pattern matching for common responses
    const patterns: Record<string, Record<string, any>> = {
      'product_creation': {
        'jewelry': { 'product-type': 'jewelry' },
        'textile': { 'product-type': 'textile' },
        'pottery': { 'product-type': 'pottery' },
        'wood': { 'product-type': 'woodwork' },
        'आभूषण': { 'product-type': 'jewelry' },
        'कपड़े': { 'product-type': 'textile' },
        'मिट्टी': { 'product-type': 'pottery' }
      },
      'sales_inquiry': {
        'this month': { 'time-period': 'current_month' },
        'last month': { 'time-period': 'last_month' },
        'yearly': { 'time-period': 'yearly' },
        'इस महीने': { 'time-period': 'current_month' },
        'पिछले महीने': { 'time-period': 'last_month' }
      }
    };

    const intentPatterns = patterns[intent] || {};

    for (const [pattern, params] of Object.entries(intentPatterns)) {
      if (lowerMessage.includes(pattern)) {
        return { understood: true, parameters: params };
      }
    }

    return { understood: false, parameters: {} };
  }

  /**
   * Context parameter persistence across conversation turns
   */
  public persistContextParameters(
    sessionId: string,
    parameters: Record<string, any>,
    ttlMinutes: number = 30
  ): void {
    const context = this.getConversationContext(sessionId) || {
      sessionId,
      parameters: {},
      currentPage: undefined,
      followupIntents: []
    };

    // Merge parameters
    context.parameters = { ...context.parameters, ...parameters };

    // Set expiration
    const expirationTime = new Date(Date.now() + ttlMinutes * 60 * 1000);
    context.parameters._expiration = expirationTime.toISOString();

    this.updateConversationContext(sessionId, context);
  }

  /**
   * Clean up expired conversation contexts
   */
  public cleanupExpiredContexts(): void {
    const now = new Date();

    for (const [sessionId, context] of this.conversationContexts.entries()) {
      const expiration = context.parameters._expiration;
      if (expiration && new Date(expiration) < now) {
        this.conversationContexts.delete(sessionId);
      }
    }
  }

  /**
   * Handle disambiguation when multiple intents are possible
   */
  public async handleDisambiguation(
    message: string,
    sessionId: string,
    alternativeIntents: Array<{ intent: string; confidence: number }>,
    language: string = 'en'
  ): Promise<DialogflowResponse> {
    if (alternativeIntents.length === 0) {
      return this.detectIntent(message, sessionId, language);
    }

    // If confidence difference is small, ask for clarification
    const topIntent = alternativeIntents[0];
    const secondIntent = alternativeIntents[1];

    if (secondIntent && (topIntent.confidence - secondIntent.confidence) < 0.2) {
      const disambiguationQuestion = this.generateDisambiguationQuestion(
        [topIntent, secondIntent],
        language
      );

      // Store disambiguation context
      this.persistContextParameters(sessionId, {
        _disambiguation: {
          alternatives: alternativeIntents,
          originalMessage: message
        }
      });

      return {
        intent: 'disambiguation',
        confidence: 0.8,
        parameters: { alternatives: alternativeIntents },
        fulfillmentText: disambiguationQuestion,
        action: 'clarify',
        sessionId,
        requiresVectorSearch: false
      };
    }

    // Clear winner, proceed with top intent
    return {
      intent: topIntent.intent,
      confidence: topIntent.confidence,
      parameters: {},
      fulfillmentText: this.generateFulfillmentText(topIntent.intent, language),
      action: this.intentMappings[topIntent.intent]?.action || 'chat',
      sessionId,
      requiresVectorSearch: this.intentMappings[topIntent.intent]?.requiresContext || false
    };
  }

  /**
   * Generate disambiguation questions
   */
  private generateDisambiguationQuestion(
    alternatives: Array<{ intent: string; confidence: number }>,
    language: string
  ): string {
    const intentDescriptions: Record<string, Record<string, string>> = {
      'product_creation': {
        en: 'create a new product',
        hi: 'नया प्रोडक्ट बनाना'
      },
      'sales_inquiry': {
        en: 'check your sales data',
        hi: 'अपना सेल्स डेटा देखना'
      },
      'trend_analysis': {
        en: 'analyze market trends',
        hi: 'मार्केट ट्रेंड्स का विश्लेषण करना'
      },
      'buyer_matching': {
        en: 'find potential buyers',
        hi: 'संभावित बायर्स खोजना'
      }
    };

    const lang = language === 'hi' ? 'hi' : 'en';
    const options = alternatives.map(alt =>
      intentDescriptions[alt.intent]?.[lang] || alt.intent
    ).join(lang === 'hi' ? ' या ' : ' or ');

    return lang === 'hi'
      ? `मैं समझ नहीं पा रहा कि आप ${options} चाहते हैं। कृपया स्पष्ट करें।`
      : `I'm not sure if you want to ${options}. Could you please clarify?`;
  }
}
