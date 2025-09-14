import { GeminiSpeechService } from './GeminiSpeechService';
import { NavigationRouter } from './NavigationRouter';

export interface VoiceIntent {
  type: 'navigate' | 'search' | 'action' | 'query' | 'help';
  target?: string;
  parameters?: Record<string, any>;
  confidence: number;
}

export interface ConversationContext {
  currentPage: string;
  recentActions: string[];
  userPreferences: Record<string, any>;
  language: string;
  conversationHistory: Array<{
    userInput: string;
    intent: VoiceIntent;
    timestamp: Date;
  }>;
}

export interface VoiceCommandResult {
  intent: VoiceIntent;
  response: string;
  shouldNavigate: boolean;
  navigationTarget?: string;
  actionRequired?: string;
}

export class ConversationalVoiceProcessor {
  private static instance: ConversationalVoiceProcessor;
  private geminiService: GeminiSpeechService;
  private navigationRouter: NavigationRouter;
  private context: ConversationContext;

  private constructor() {
    this.geminiService = GeminiSpeechService.getInstance();
    this.navigationRouter = NavigationRouter.getInstance();
    this.context = this.initializeContext();
  }

  public static getInstance(): ConversationalVoiceProcessor {
    if (!ConversationalVoiceProcessor.instance) {
      ConversationalVoiceProcessor.instance = new ConversationalVoiceProcessor();
    }
    return ConversationalVoiceProcessor.instance;
  }

  private initializeContext(): ConversationContext {
    return {
      currentPage: '/',
      recentActions: [],
      userPreferences: {},
      language: 'en-US',
      conversationHistory: []
    };
  }

  public async processVoiceCommand(
    audioBuffer: ArrayBuffer,
    language: string = 'en-US'
  ): Promise<VoiceCommandResult> {
    try {
      // Update context language
      this.context.language = language;

      // Process with Gemini AI
      const aiResult = await this.geminiService.processVoiceCommand(audioBuffer, this.getContextString());

      // Convert AI result to our VoiceIntent format
      const intent = this.mapAiResultToIntent(aiResult);

      // Add to conversation history
      this.context.conversationHistory.push({
        userInput: aiResult.text,
        intent,
        timestamp: new Date()
      });

      // Keep only last 10 conversations
      if (this.context.conversationHistory.length > 10) {
        this.context.conversationHistory = this.context.conversationHistory.slice(-10);
      }

      // Generate response and determine actions
      const result = await this.generateResponse(intent, aiResult.text);

      return result;

    } catch (error) {
      console.error('Voice command processing error:', error);
      return this.generateFallbackResponse();
    }
  }

  private mapAiResultToIntent(aiResult: any): VoiceIntent {
    const intent: VoiceIntent = {
      type: aiResult.intent || 'query',
      confidence: aiResult.confidence || 0.5,
      parameters: aiResult.entities || {}
    };

    // Map target if available
    if (aiResult.entities?.target) {
      intent.target = aiResult.entities.target;
    }

    return intent;
  }

  private async generateResponse(intent: VoiceIntent, originalText: string): Promise<VoiceCommandResult> {
    let response = '';
    let shouldNavigate = false;
    let navigationTarget = '';
    let actionRequired = '';

    switch (intent.type) {
      case 'navigate':
        const navResult = await this.handleNavigation(intent);
        response = navResult.response;
        shouldNavigate = navResult.shouldNavigate;
        navigationTarget = navResult.target || '';
        break;

      case 'search':
        const searchResult = await this.handleSearch(intent);
        response = searchResult.response;
        shouldNavigate = searchResult.shouldNavigate;
        navigationTarget = searchResult.target || '';
        break;

      case 'action':
        const actionResult = await this.handleAction(intent);
        response = actionResult.response;
        actionRequired = actionResult.action || '';
        break;

      case 'query':
        response = await this.handleQuery(intent, originalText);
        break;

      case 'help':
        response = this.handleHelp(intent);
        break;

      default:
        response = "I'm not sure what you mean. Could you please rephrase that?";
    }

    return {
      intent,
      response,
      shouldNavigate,
      navigationTarget,
      actionRequired
    };
  }

  private async handleNavigation(intent: VoiceIntent): Promise<{response: string, shouldNavigate: boolean, target?: string}> {
    const target = intent.target || intent.parameters?.target;

    if (!target) {
      return {
        response: "Where would you like to go? I can take you to the dashboard, marketplace, or your profile.",
        shouldNavigate: false
      };
    }

    // Map natural language targets to routes
    const routeMap: Record<string, string> = {
      'dashboard': '/',
      'home': '/',
      'finance': '/finance/dashboard',
      'sales': '/finance/dashboard',
      'money': '/finance/dashboard',
      'marketplace': '/marketplace',
      'shop': '/marketplace',
      'products': '/marketplace',
      'profile': '/profile',
      'account': '/profile',
      'settings': '/profile',
      'smart product creator': '/smart-product-creator',
      'create product': '/smart-product-creator',
      'trend spotter': '/trend-spotter',
      'trends': '/trend-spotter',
      'matchmaking': '/matchmaking',
      'buyer connect': '/matchmaking',
      'inventory': '/dashboard/inventory',
      'trust layer': '/trust-layer',
      'certicraft': '/trust-layer',
      'govt schemes': '/yojana-mitra',
      'schemes': '/yojana-mitra',
      'archived': '/archived',
      'drafts': '/drafts'
    };

    const route = routeMap[target.toLowerCase()] || routeMap[target.toLowerCase().replace(/\s+/g, ' ')];

    if (route) {
      // Update context
      this.context.currentPage = route;
      this.context.recentActions.push(`navigated to ${target}`);

      return {
        response: `Taking you to ${target}`,
        shouldNavigate: true,
        target: route
      };
    } else {
      return {
        response: `I don't recognize "${target}" as a destination. Try saying "dashboard", "marketplace", "profile", or "finance".`,
        shouldNavigate: false
      };
    }
  }

  private async handleSearch(intent: VoiceIntent): Promise<{response: string, shouldNavigate: boolean, target?: string}> {
    const query = intent.parameters?.query || '';

    if (!query) {
      return {
        response: "What would you like to search for?",
        shouldNavigate: false
      };
    }

    // Navigate to marketplace with search
    return {
      response: `Searching for "${query}" in the marketplace`,
      shouldNavigate: true,
      target: `/marketplace?search=${encodeURIComponent(query)}`
    };
  }

  private async handleAction(intent: VoiceIntent): Promise<{response: string, action?: string, target?: string}> {
    const target = intent.target || intent.parameters?.target;

    if (!target) {
      return {
        response: "What action would you like me to perform?"
      };
    }

    // Handle common actions
    switch (target.toLowerCase()) {
      case 'create product':
      case 'new product':
        return {
          response: "Let's create a new product. Opening the Product Creator.",
          action: 'navigate',
          target: '/smart-product-creator'
        };

      case 'help':
      case 'support':
        return {
          response: "I'm here to help! You can ask me to navigate anywhere, search for products, or get information about features."
        };

      default:
        return {
          response: `I'm not sure how to "${target}". Try saying "create product" or "help".`
        };
    }
  }

  private async handleQuery(intent: VoiceIntent, originalText: string): Promise<string> {
    // Use Gemini to generate helpful responses for queries
    try {
      const contextPrompt = `
You are a helpful assistant for KalaBandhu, a platform for artisans. The user asked: "${originalText}"

Current context:
- Current page: ${this.context.currentPage}
- Recent actions: ${this.context.recentActions.slice(-3).join(', ')}
- Language: ${this.context.language}

Provide a helpful, concise response. If they need to navigate somewhere or perform an action, suggest it clearly.
      `;

      // For now, return a simple response. In production, this would use Gemini
      const lowerText = originalText.toLowerCase();

      if (lowerText.includes('how') && lowerText.includes('create')) {
        return "To create a product, say 'create product' and I'll take you to the Product Creator where I can guide you through each step.";
      }

      if (lowerText.includes('what') && lowerText.includes('features')) {
        return "KalaBandhu has features like Product Creator, TrendSpotter, marketplace, finance tracking, and buyer matching. What would you like to explore?";
      }

      if (lowerText.includes('help')) {
        return "I can help you navigate the platform, create products, search the marketplace, check your finances, and answer questions about features.";
      }

      return "I'm here to help you with KalaBandhu. You can ask me to navigate to different sections, create products, search for items, or get help with any feature.";

    } catch (error) {
      return "I'm here to help! Try asking me to navigate somewhere or perform an action.";
    }
  }

  private handleHelp(intent: VoiceIntent): string {
    return "I can help you with:\n• Navigation: 'go to dashboard', 'show marketplace'\n• Actions: 'create product', 'search for sarees'\n• Questions: 'how do I create a product?'\n• Features: 'what is trendspotter?'\n\nWhat would you like to do?";
  }

  private generateFallbackResponse(): VoiceCommandResult {
    return {
      intent: { type: 'query', confidence: 0.1 },
      response: "I'm having trouble understanding that. Could you please try again or ask for help?",
      shouldNavigate: false
    };
  }

  private getContextString(): string {
    return `Current page: ${this.context.currentPage}, Recent actions: ${this.context.recentActions.slice(-3).join(', ')}, Language: ${this.context.language}`;
  }

  // Context management methods
  public updateContext(updates: Partial<ConversationContext>): void {
    Object.assign(this.context, updates);
  }

  public getContext(): ConversationContext {
    return { ...this.context };
  }

  public clearHistory(): void {
    this.context.conversationHistory = [];
  }

  public setCurrentPage(page: string): void {
    this.context.currentPage = page;
  }

  public addRecentAction(action: string): void {
    this.context.recentActions.push(action);
    // Keep only last 5 actions
    if (this.context.recentActions.length > 5) {
      this.context.recentActions = this.context.recentActions.slice(-5);
    }
  }
}