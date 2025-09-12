interface DialogflowResponse {
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
  fulfillmentText: string;
  action: string;
}

interface IntentMapping {
  [key: string]: {
    action: string;
    target?: string;
    parameters?: string[];
  };
}

export class DialogflowService {
  private static instance: DialogflowService;
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
    }
  };

  private constructor() {}

  public static getInstance(): DialogflowService {
    if (!DialogflowService.instance) {
      DialogflowService.instance = new DialogflowService();
    }
    return DialogflowService.instance;
  }

  /**
   * Detect intent from user message using pattern matching
   * In production, this would integrate with Google Dialogflow API
   */
  public async detectIntent(message: string, language: string = 'en'): Promise<DialogflowResponse> {
    const lowerMessage = message.toLowerCase().trim();
    
    // Hindi patterns
    if (language === 'hi' || this.containsHindi(message)) {
      return this.detectHindiIntent(lowerMessage);
    }
    
    // English patterns
    return this.detectEnglishIntent(lowerMessage);
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
}
