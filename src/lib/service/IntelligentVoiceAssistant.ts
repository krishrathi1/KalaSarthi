import { GeminiSpeechService } from './GeminiSpeechService';

export interface VoiceIntent {
  action: string;
  target?: string;
  parameters?: Record<string, any>;
  confidence: number;
  context?: string;
}

export interface VoiceAction {
  type: 'navigate' | 'search' | 'create' | 'edit' | 'delete' | 'view' | 'add_to_cart' | 'add_to_wishlist' | 'help' | 'settings';
  payload?: any;
  message?: string;
}

export class IntelligentVoiceAssistant {
  private static instance: IntelligentVoiceAssistant;
  private speechService: GeminiSpeechService;
  private conversationHistory: Array<{user: string, assistant: string, timestamp: Date}> = [];
  private currentContext: string = 'general';

  private constructor() {
    this.speechService = GeminiSpeechService.getInstance();
  }

  public static getInstance(): IntelligentVoiceAssistant {
    if (!IntelligentVoiceAssistant.instance) {
      IntelligentVoiceAssistant.instance = new IntelligentVoiceAssistant();
    }
    return IntelligentVoiceAssistant.instance;
  }

  /**
   * Process natural language voice input and determine intent
   */
  public async processVoiceCommand(
    audioBuffer: ArrayBuffer,
    context: string = 'general'
  ): Promise<VoiceAction> {
    try {
      // Transcribe the audio
      const transcription = await this.speechService.speechToText(audioBuffer, { language: 'en-US' });

      if (!transcription.text || transcription.confidence < 0.5) {
        return {
          type: 'help',
          message: 'I couldn\'t understand that clearly. Could you please repeat or rephrase?'
        };
      }

      // Add to conversation history
      this.conversationHistory.push({
        user: transcription.text,
        assistant: '',
        timestamp: new Date()
      });

      // Analyze intent using AI
      const intent = await this.analyzeIntent(transcription.text, context);

      // Execute the action
      const action = await this.executeIntent(intent);

      // Add assistant response to history
      this.conversationHistory[this.conversationHistory.length - 1].assistant = action.message || 'Action completed';

      return action;

    } catch (error) {
      console.error('Voice command processing error:', error);
      return {
        type: 'help',
        message: 'I\'m having trouble processing your request. Please try again.'
      };
    }
  }

  /**
   * Analyze user intent from natural language
   */
  private async analyzeIntent(text: string, context: string): Promise<VoiceIntent> {
    // Check if we're on artisan buddy page - if so, don't process navigation
    if (typeof window !== 'undefined' && window.location.pathname === '/artisan-buddy') {
      // On artisan buddy page, treat as conversational input
      return { action: 'help', target: 'conversation', confidence: 0.9, context };
    }

    const prompt = `
You are an intelligent voice assistant for KalaBandhu, a platform for artisans and handicraft sellers.

Current context: ${context}
User said: "${text}"

Analyze the user's intent and extract:
1. Primary action they want to perform
2. Target (what they're referring to)
3. Any parameters or details mentioned
4. Confidence level (0-1)

Common artisan actions:
- Navigation: go to dashboard, open marketplace, view profile, check orders
- Product management: create product, edit product, view products, delete product
- Shopping: browse products, add to cart, add to wishlist, search products
- Communication: contact buyer, send message, view messages
- Financial: check sales, view earnings, manage payments
- Help: get help, learn features, ask questions

Respond in JSON format:
{
  "action": "navigate|search|create|edit|view|add_to_cart|add_to_wishlist|help|settings",
  "target": "dashboard|marketplace|profile|products|cart|wishlist|orders|messages|sales",
  "parameters": {"key": "value"},
  "confidence": 0.95,
  "context": "${context}"
}

Examples:
"I want to see my sales" -> {"action": "view", "target": "sales", "confidence": 0.9}
"Add this beautiful saree to my cart" -> {"action": "add_to_cart", "target": "product", "parameters": {"product": "saree"}, "confidence": 0.85}
"Help me create a new product" -> {"action": "create", "target": "product", "confidence": 0.9}
    `;

    try {
      // Use Gemini to analyze the intent
      const intent = await this.speechService.analyzeIntent(text, context);

      return {
        action: intent.action,
        target: intent.target,
        parameters: intent.parameters || {},
        confidence: intent.confidence || 0.8,
        context: intent.context || context
      };

    } catch (error) {
      console.error('Intent analysis error:', error);

      // Fallback: Simple keyword-based intent detection
      return this.fallbackIntentAnalysis(text, context);
    }
  }

  /**
   * Execute the determined intent
   */
  private async executeIntent(intent: VoiceIntent): Promise<VoiceAction> {
    const { action, target, parameters, confidence } = intent;

    if (confidence < 0.6) {
      return {
        type: 'help',
        message: 'I\'m not sure what you meant. Could you please clarify?'
      };
    }

    switch (action) {
      case 'navigate':
        return this.handleNavigation(target, parameters);

      case 'search':
        return this.handleSearch(parameters);

      case 'create':
        return this.handleCreate(target, parameters);

      case 'view':
        return this.handleView(target, parameters);

      case 'add_to_cart':
        return this.handleAddToCart(parameters);

      case 'add_to_wishlist':
        return this.handleAddToWishlist(parameters);

      case 'help':
        return this.handleHelp(parameters);

      case 'settings':
        return this.handleSettings(parameters);

      default:
        return {
          type: 'help',
          message: 'I understand you want to ' + action + ', but I\'m not sure how to help with that yet.'
        };
    }
  }

  /**
   * Handle navigation intents
   */
  private handleNavigation(target?: string, parameters?: any): VoiceAction {
    const navigationMap: Record<string, string> = {
      'dashboard': '/',
      'home': '/',
      'marketplace': '/marketplace',
      'shop': '/marketplace',
      'products': '/marketplace',
      'profile': '/profile',
      'account': '/profile',
      'cart': '/marketplace/cart',
      'wishlist': '/marketplace/wishlist',
      'orders': '/orders',
      'sales': '/finance/dashboard',
      'finance': '/finance/dashboard',
      'money': '/finance/dashboard',
      'smart product creator': '/smart-product-creator',
      'create product': '/smart-product-creator',
      'product creator': '/smart-product-creator',
      'trend spotter': '/trend-spotter',
      'trends': '/trend-spotter',
      'matchmaking': '/matchmaking',
      'buyer connect': '/matchmaking',
      'trust layer': '/trust-layer',
      'certicraft': '/trust-layer',
      'govt schemes': '/yojana-mitra',
      'schemes': '/yojana-mitra',
      'yojana mitra': '/yojana-mitra',
      'settings': '/settings',
      'help': '/help'
    };

    const path = navigationMap[target || ''] || '/';

    return {
      type: 'navigate',
      payload: { path },
      message: `Taking you to ${target || 'the main page'}.`
    };
  }

  /**
   * Handle search intents
   */
  private handleSearch(parameters?: any): VoiceAction {
    const query = parameters?.query || parameters?.search || '';

    return {
      type: 'search',
      payload: { query },
      message: `Searching for ${query || 'products'}.`
    };
  }

  /**
   * Handle create intents
   */
  private handleCreate(target?: string, parameters?: any): VoiceAction {
    if (target === 'product') {
      return {
        type: 'navigate',
        payload: { path: '/smart-product-creator' },
        message: 'Opening the product creation page to help you create a new product.'
      };
    }

    return {
      type: 'help',
      message: 'I can help you create products. Would you like to create a new product listing?'
    };
  }

  /**
   * Handle view intents
   */
  private handleView(target?: string, parameters?: any): VoiceAction {
    const viewMap: Record<string, string> = {
      'products': '/products',
      'orders': '/orders',
      'sales': '/finance/dashboard',
      'profile': '/profile',
      'cart': '/marketplace/cart',
      'wishlist': '/marketplace/wishlist'
    };

    const path = viewMap[target || ''] || '/';

    return {
      type: 'navigate',
      payload: { path },
      message: `Showing you your ${target || 'dashboard'}.`
    };
  }

  /**
   * Handle add to cart intents
   */
  private handleAddToCart(parameters?: any): VoiceAction {
    return {
      type: 'add_to_cart',
      payload: parameters,
      message: 'I\'ve added that item to your cart.'
    };
  }

  /**
   * Handle add to wishlist intents
   */
  private handleAddToWishlist(parameters?: any): VoiceAction {
    return {
      type: 'add_to_wishlist',
      payload: parameters,
      message: 'I\'ve added that item to your wishlist.'
    };
  }

  /**
   * Handle help intents
   */
  private handleHelp(parameters?: any): VoiceAction {
    const helpMessage = `
I can help you with:
• Navigating the platform
• Creating and managing products
• Shopping and browsing
• Managing your profile and settings
• Viewing sales and orders

Just tell me what you'd like to do, like:
"I want to create a new product"
"Show me my sales"
"Help me find handloom sarees"
    `;

    return {
      type: 'help',
      message: helpMessage.trim()
    };
  }

  /**
   * Handle settings intents
   */
  private handleSettings(parameters?: any): VoiceAction {
    return {
      type: 'navigate',
      payload: { path: '/settings' },
      message: 'Opening your settings page.'
    };
  }

  /**
   * Fallback intent analysis using simple keyword matching
   */
  private fallbackIntentAnalysis(text: string, context: string): VoiceIntent {
    const lowerText = text.toLowerCase();

    // Check if we're on artisan buddy page - if so, don't process navigation
    if (typeof window !== 'undefined' && window.location.pathname === '/artisan-buddy') {
      // On artisan buddy page, treat as conversational input
      return { action: 'help', target: 'conversation', confidence: 0.9, context };
    }

    // Navigation keywords
    if (lowerText.includes('go to') || lowerText.includes('take me') || lowerText.includes('show me') || lowerText.includes('open')) {
      if (lowerText.includes('dashboard') || lowerText.includes('home')) {
        return { action: 'navigate', target: 'dashboard', confidence: 0.8, context };
      }
      if (lowerText.includes('marketplace') || lowerText.includes('shop') || lowerText.includes('products')) {
        return { action: 'navigate', target: 'marketplace', confidence: 0.8, context };
      }
      if (lowerText.includes('profile') || lowerText.includes('account')) {
        return { action: 'navigate', target: 'profile', confidence: 0.8, context };
      }
      if (lowerText.includes('cart')) {
        return { action: 'navigate', target: 'cart', confidence: 0.8, context };
      }
      if (lowerText.includes('wishlist') || lowerText.includes('favorites')) {
        return { action: 'navigate', target: 'wishlist', confidence: 0.8, context };
      }
      if (lowerText.includes('smart product creator') || lowerText.includes('product creator') || lowerText.includes('create product')) {
        return { action: 'navigate', target: 'smart product creator', confidence: 0.8, context };
      }
      if (lowerText.includes('finance') || lowerText.includes('sales') || lowerText.includes('money')) {
        return { action: 'navigate', target: 'finance', confidence: 0.8, context };
      }
      if (lowerText.includes('trend spotter') || lowerText.includes('trends')) {
        return { action: 'navigate', target: 'trend spotter', confidence: 0.8, context };
      }
      if (lowerText.includes('matchmaking') || lowerText.includes('buyer connect')) {
        return { action: 'navigate', target: 'matchmaking', confidence: 0.8, context };
      }
      if (lowerText.includes('trust layer') || lowerText.includes('certicraft')) {
        return { action: 'navigate', target: 'trust layer', confidence: 0.8, context };
      }
      if (lowerText.includes('govt schemes') || lowerText.includes('schemes') || lowerText.includes('yojana mitra')) {
        return { action: 'navigate', target: 'govt schemes', confidence: 0.8, context };
      }
    }

    // Search keywords
    if (lowerText.includes('search') || lowerText.includes('find') || lowerText.includes('look for')) {
      return { action: 'search', parameters: { query: text }, confidence: 0.7, context };
    }

    // Create keywords
    if (lowerText.includes('create') || lowerText.includes('make') || lowerText.includes('new')) {
      if (lowerText.includes('product')) {
        return { action: 'navigate', target: 'smart product creator', confidence: 0.8, context };
      }
    }

    // Help keywords
    if (lowerText.includes('help') || lowerText.includes('how') || lowerText.includes('what')) {
      return { action: 'help', confidence: 0.9, context };
    }

    // Default fallback
    return { action: 'help', confidence: 0.5, context };
  }

  /**
   * Get conversation history
   */
  public getConversationHistory(): Array<{user: string, assistant: string, timestamp: Date}> {
    return this.conversationHistory.slice(-10); // Return last 10 conversations
  }

  /**
   * Clear conversation history
   */
  public clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Set current context
   */
  public setContext(context: string): void {
    this.currentContext = context;
  }

  /**
   * Get current context
   */
  public getContext(): string {
    return this.currentContext;
  }
}
