interface FastResponse {
  response: string;
  shouldNavigate?: boolean;
  navigationTarget?: string;
  isFast: boolean;
}

export class FastResponseGenerator {
  private static instance: FastResponseGenerator;

  private constructor() {}

  public static getInstance(): FastResponseGenerator {
    if (!FastResponseGenerator.instance) {
      FastResponseGenerator.instance = new FastResponseGenerator();
    }
    return FastResponseGenerator.instance;
  }

  public getFastResponse(message: string, language: string): FastResponse | null {
    const lowerMessage = message.toLowerCase().trim();
    
    // Common greetings - instant responses
    if (this.isGreeting(lowerMessage)) {
      return this.getGreetingResponse(language);
    }

    // Common questions - instant responses
    if (this.isCommonQuestion(lowerMessage)) {
      return this.getCommonQuestionResponse(lowerMessage, language);
    }

    // Navigation requests - instant responses
    if (this.isNavigationRequest(lowerMessage)) {
      return this.getNavigationResponse(lowerMessage, language);
    }

    // Product creation - instant responses
    if (this.isProductCreationRequest(lowerMessage)) {
      return this.getProductCreationResponse(language);
    }

    // Sales/finance - instant responses
    if (this.isSalesRequest(lowerMessage)) {
      return this.getSalesResponse(language);
    }

    // Trend analysis - instant responses
    if (this.isTrendRequest(lowerMessage)) {
      return this.getTrendResponse(language);
    }

    return null; // No fast response available
  }

  private isGreeting(message: string): boolean {
    const greetings = [
      'hello', 'hi', 'hey', 'namaste', 'namaskar', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'how are you doing', 'what\'s up', 'sup',
      'हेलो', 'नमस्ते', 'नमस्कार', 'कैसे हो', 'कैसे हैं', 'आप कैसे हैं',
      'hello kaise ho', 'namaste kaise ho', 'kaise ho aap'
    ];
    return greetings.some(greeting => message.toLowerCase().includes(greeting.toLowerCase()));
  }

  private isCommonQuestion(message: string): boolean {
    const questions = [
      'what can you do', 'what do you do', 'how can you help', 'what are your features',
      'tell me about yourself', 'who are you', 'what is this', 'explain'
    ];
    return questions.some(question => message.includes(question));
  }

  private isNavigationRequest(message: string): boolean {
    const navKeywords = [
      'go to', 'take me to', 'show me', 'open', 'navigate to', 'visit',
      'product creator', 'smart product', 'sales', 'finance', 'trend', 'marketplace',
      'profile', 'dashboard', 'settings', 'help'
    ];
    return navKeywords.some(keyword => message.includes(keyword));
  }

  private isProductCreationRequest(message: string): boolean {
    const productKeywords = [
      'create product', 'new product', 'make product', 'product creation',
      'design product', 'build product', 'product maker', 'product creator',
      'naya product', 'product dalna', 'product banana', 'product create',
      'नया प्रोडक्ट', 'प्रोडक्ट बनाना', 'प्रोडक्ट डालना', 'प्रोडक्ट क्रिएट'
    ];
    return productKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
  }

  private isSalesRequest(message: string): boolean {
    const salesKeywords = [
      'sales', 'revenue', 'earnings', 'money', 'profit', 'income',
      'finance', 'financial', 'budget', 'expenses', 'cost'
    ];
    return salesKeywords.some(keyword => message.includes(keyword));
  }

  private isTrendRequest(message: string): boolean {
    const trendKeywords = [
      'trend', 'trending', 'popular', 'fashion', 'style', 'design',
      'market trend', 'what\'s popular', 'latest trend'
    ];
    return trendKeywords.some(keyword => message.includes(keyword));
  }

  private getGreetingResponse(language: string): FastResponse {
    if (language === 'hi' || language === 'hi-IN') {
      return {
        response: 'नमस्ते! मैं आपका Artisan Buddy हूं। मैं आपकी क्राफ्ट बिज़नेस में मदद कर सकता हूं। आज आप क्या करना चाहते हैं?',
        isFast: true
      };
    }
    return {
      response: 'Hello! I\'m your Artisan Buddy. I can help you with your craft business. What would you like to work on today?',
      isFast: true
    };
  }

  private getCommonQuestionResponse(message: string, language: string): FastResponse {
    if (language === 'hi' || language === 'hi-IN') {
      return {
        response: 'मैं आपका AI Artisan Buddy हूं। मैं आपकी मदद कर सकता हूं:\n• नए प्रोडक्ट बनाने में\n• सेल्स ट्रैक करने में\n• ट्रेंड एनालिसिस में\n• बायर्स से जुड़ने में\n• बिज़नेस सलाह देने में',
        isFast: true
      };
    }
    return {
      response: 'I\'m your AI Artisan Buddy. I can help you with:\n• Creating new products\n• Tracking sales\n• Trend analysis\n• Connecting with buyers\n• Business advice',
      isFast: true
    };
  }

  private getNavigationResponse(message: string, language: string): FastResponse {
    if (message.includes('product') || message.includes('creator')) {
      return {
        response: language === 'hi' ? 'मैं आपको Smart Product Creator पर ले जा रहा हूं...' : 'Taking you to Smart Product Creator...',
        shouldNavigate: true,
        navigationTarget: '/smart-product-creator',
        isFast: true
      };
    }
    
    if (message.includes('sales') || message.includes('finance')) {
      return {
        response: language === 'hi' ? 'मैं आपको Finance Dashboard दिखा रहा हूं...' : 'Showing you Finance Dashboard...',
        shouldNavigate: true,
        navigationTarget: '/finance/dashboard',
        isFast: true
      };
    }
    
    if (message.includes('trend')) {
      return {
        response: language === 'hi' ? 'मैं आपको Trend Spotter दिखा रहा हूं...' : 'Showing you Trend Spotter...',
        shouldNavigate: true,
        navigationTarget: '/trend-spotter',
        isFast: true
      };
    }

    return {
      response: language === 'hi' ? 'मैं आपकी मदद कर सकता हूं। कृपया बताएं कि आप कहां जाना चाहते हैं।' : 'I can help you navigate. Please tell me where you\'d like to go.',
      isFast: true
    };
  }

  private getProductCreationResponse(language: string): FastResponse {
    return {
      response: language === 'hi' 
        ? 'बहुत अच्छा! मैं आपको नया प्रोडक्ट बनाने में मदद कर सकता हूं। क्या आप चाहते हैं कि मैं आपको Smart Product Creator पर ले जाऊं?'
        : 'Great! I can help you create a new product. Would you like me to take you to the Smart Product Creator?',
      shouldNavigate: true,
      navigationTarget: '/smart-product-creator',
      isFast: true
    };
  }

  private getSalesResponse(language: string): FastResponse {
    return {
      response: language === 'hi'
        ? 'मैं आपकी सेल्स और कमाई को ट्रैक करने में मदद कर सकता हूं। क्या आप चाहते हैं कि मैं आपको Finance Dashboard दिखाऊं?'
        : 'I can help you track your sales and earnings. Would you like me to show you the Finance Dashboard?',
      shouldNavigate: true,
      navigationTarget: '/finance/dashboard',
      isFast: true
    };
  }

  private getTrendResponse(language: string): FastResponse {
    return {
      response: language === 'hi'
        ? 'मैं आपको ट्रेंडिंग डिज़ाइन और लोकप्रिय प्रोडक्ट्स दिखा सकता हूं। क्या आप चाहते हैं कि मैं आपको Trend Spotter पर ले जाऊं?'
        : 'I can help you discover trending designs and popular products. Would you like me to take you to the Trend Spotter?',
      shouldNavigate: true,
      navigationTarget: '/trend-spotter',
      isFast: true
    };
  }
}
