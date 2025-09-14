import { GeminiSpeechService } from './GeminiSpeechService';
import { VoiceCommandProcessor } from './VoiceCommandProcessor';
import { NavigationRouter } from './NavigationRouter';

export interface AINavigationRequest {
  command: string;
  language: string;
  context?: string;
  userId?: string;
  artisanId?: string;
  confidence?: number;
}

export interface AINavigationResponse {
  success: boolean;
  action: string;
  target?: string;
  params?: Record<string, any>;
  response: string;
  confidence: number;
  suggestions?: string[];
}

export interface ContextualHelp {
  context: string;
  language: string;
  availableCommands: string[];
  examples: string[];
  tips: string[];
}

export class AIAssistedNavigationService {
  private static instance: AIAssistedNavigationService;
  private geminiService: GeminiSpeechService;
  private commandProcessor: VoiceCommandProcessor;
  private navigationRouter: NavigationRouter;
  private contextHelp: Map<string, ContextualHelp> = new Map();

  private constructor() {
    try {
      this.geminiService = GeminiSpeechService.getInstance();
    } catch (error) {
      console.warn('Gemini service not available for AI navigation:', error);
      // Create a mock service for fallback functionality
      this.geminiService = this.createFallbackGeminiService();
    }

    try {
      this.commandProcessor = new VoiceCommandProcessor();
    } catch (error) {
      console.warn('Voice command processor not available:', error);
      this.commandProcessor = null as any;
    }

    try {
      this.navigationRouter = NavigationRouter.getInstance();
    } catch (error) {
      console.warn('Navigation router not available:', error);
      this.navigationRouter = null as any;
    }

    this.initializeContextualHelp();
  }

  /**
   * Create fallback Gemini service when API key is not available
   */
  private createFallbackGeminiService(): GeminiSpeechService {
    return {
      speechToText: async (audioBuffer: ArrayBuffer, options: any) => {
        console.warn('Speech recognition not available. Please configure GOOGLE_AI_API_KEY.');
        return {
          text: '',
          confidence: 0.1,
          language: options?.language || 'en-US',
          duration: audioBuffer.byteLength / 16000
        };
      },
      textToSpeech: async (text: string, options: any) => new ArrayBuffer(0),
      processVoiceCommand: async (audioBuffer: ArrayBuffer, context: string) => ({
        intent: 'query',
        entities: { query: 'Voice command processing not available' },
        confidence: 0.1,
        text: 'Voice command processing not available'
      }),
      getSupportedLanguages: () => ['en-US', 'hi-IN'],
      getAvailableVoices: async () => []
    } as any;
  }

  public static getInstance(): AIAssistedNavigationService {
    if (!AIAssistedNavigationService.instance) {
      AIAssistedNavigationService.instance = new AIAssistedNavigationService();
    }
    return AIAssistedNavigationService.instance;
  }

  private initializeContextualHelp(): void {
    // English contextual help
    this.contextHelp.set('en-dashboard', {
      context: 'dashboard',
      language: 'en',
      availableCommands: [
        'Show sales overview',
        'View product performance',
        'Check revenue trends',
        'Go to finance section'
      ],
      examples: [
        'Show me sales for last month',
        'What are my top products?',
        'Display revenue chart'
      ],
      tips: [
        'Try saying "show sales" or "view products"',
        'You can ask for specific time periods',
        'Use "help" anytime for assistance'
      ]
    });

    this.contextHelp.set('en-marketplace', {
      context: 'marketplace',
      language: 'en',
      availableCommands: [
        'Search products',
        'Filter by category',
        'View product details',
        'Add to cart'
      ],
      examples: [
        'Find handloom sarees',
        'Show me pottery items',
        'Search for wooden crafts'
      ],
      tips: [
        'Search by product type or artisan name',
        'Use category filters for better results',
        'Ask for specific price ranges'
      ]
    });

    // Hindi contextual help
    this.contextHelp.set('hi-dashboard', {
      context: 'dashboard',
      language: 'hi',
      availableCommands: [
        'बिक्री का अवलोकन दिखाएं',
        'उत्पाद प्रदर्शन देखें',
        'राजस्व प्रवृत्ति जांचें',
        'वित्त अनुभाग में जाएं'
      ],
      examples: [
        'पिछले महीने की बिक्री दिखाएं',
        'मेरे शीर्ष उत्पाद क्या हैं?',
        'राजस्व चार्ट प्रदर्शित करें'
      ],
      tips: [
        '"बिक्री दिखाएं" या "उत्पाद देखें" कहने का प्रयास करें',
        'आप विशिष्ट समय अवधि के लिए पूछ सकते हैं',
        'सहायता के लिए कभी भी "मदद" कहें'
      ]
    });

    this.contextHelp.set('hi-marketplace', {
      context: 'marketplace',
      language: 'hi',
      availableCommands: [
        'उत्पाद खोजें',
        'श्रेणी द्वारा फ़िल्टर करें',
        'उत्पाद विवरण देखें',
        'कार्ट में जोड़ें'
      ],
      examples: [
        'हस्तशिल्प साड़ी खोजें',
        'मिट्टी के बर्तन दिखाएं',
        'लकड़ी के शिल्प खोजें'
      ],
      tips: [
        'उत्पाद प्रकार या कारीगर के नाम से खोजें',
        'बेहतर परिणामों के लिए श्रेणी फ़िल्टर का उपयोग करें',
        'विशिष्ट मूल्य सीमा के लिए पूछें'
      ]
    });

    // Add more languages and contexts as needed
  }

  /**
   * Process AI-assisted navigation request
   */
  public async processNavigationRequest(request: AINavigationRequest): Promise<AINavigationResponse> {
    try {
      console.log(`🧠 Processing AI navigation: "${request.command}" in ${request.language}`);

      // First, try the rule-based command processor
      let ruleBasedResult = null;
      if (this.commandProcessor) {
        try {
          ruleBasedResult = await this.commandProcessor.processCommand({
            command: request.command,
            confidence: request.confidence || 0.8,
            timestamp: new Date(),
            language: request.language
          });
        } catch (error) {
          console.warn('Command processor error:', error);
        }
      }

      if (ruleBasedResult) {
        // Execute the navigation action
        const executionResult = await this.executeNavigationAction(ruleBasedResult.type, ruleBasedResult.target, ruleBasedResult.params);

        return {
          success: true,
          action: ruleBasedResult.type,
          target: ruleBasedResult.target,
          params: ruleBasedResult.params,
          response: executionResult.message,
          confidence: ruleBasedResult.confidence
        };
      }

      // If rule-based processing fails, use AI for understanding
      const aiResult = await this.processWithAI(request);

      return aiResult;

    } catch (error) {
      console.error('AI navigation processing error:', error);
      return {
        success: false,
        action: 'error',
        response: 'Sorry, I couldn\'t understand that command. Please try again.',
        confidence: 0
      };
    }
  }

  /**
   * Process command with AI when rule-based processing fails
   */
  private async processWithAI(request: AINavigationRequest): Promise<AINavigationResponse> {
    try {
      const contextHelp = this.getContextualHelp(request.language, request.context);

      const prompt = `
You are an AI assistant for KalaBandhu, a platform connecting artisans with buyers. Help the user navigate the app using voice commands.

User command: "${request.command}"
Language: ${request.language}
Context: ${request.context || 'general'}

Available app sections:
- Dashboard (sales, revenue, products)
- Marketplace (products, search, categories)
- Profile (account, settings)
- Finance (tracker, analytics)
- Loans (applications, status)

${contextHelp ? `
Contextual help for ${contextHelp.context}:
Available commands: ${contextHelp.availableCommands.join(', ')}
Examples: ${contextHelp.examples.join(', ')}
Tips: ${contextHelp.tips.join(', ')}
` : ''}

Please analyze the user's command and provide:
1. The intended action (navigate, search, help, etc.)
2. The target section/page
3. Any parameters extracted from the command
4. A helpful response in the user's language
5. Confidence score (0-1)

Respond in JSON format:
{
  "action": "navigate|search|help|query",
  "target": "dashboard|marketplace|profile|finance|loans",
  "params": {},
  "response": "response text in user's language",
  "confidence": 0.85,
  "suggestions": ["alternative commands"]
}
`;

      const aiResponse = await this.geminiService.processVoiceCommand(
        new ArrayBuffer(0), // Empty buffer since we're processing text
        'navigation'
      );

      // For now, return a fallback response
      // In production, you'd parse the AI response
      return {
        success: true,
        action: 'help',
        response: this.getFallbackResponse(request.language),
        confidence: 0.6,
        suggestions: this.getCommandSuggestions(request.language, request.context)
      };

    } catch (error) {
      console.error('AI processing error:', error);
      return {
        success: false,
        action: 'error',
        response: this.getErrorResponse(request.language),
        confidence: 0
      };
    }
  }

  /**
   * Execute navigation action
   */
  private async executeNavigationAction(action: string, target?: string, params?: Record<string, any>): Promise<{ success: boolean; message: string }> {
    try {
      switch (action) {
        case 'navigate':
          if (target && this.navigationRouter) {
            try {
              const result = await this.navigationRouter.navigate(target, params);
              return {
                success: result.success,
                message: result.message
              };
            } catch (error) {
              console.warn('Navigation error:', error);
            }
          }
          break;

        case 'search':
          if (this.navigationRouter) {
            try {
              const searchResult = await this.navigationRouter.executeAction('search', params);
              return {
                success: searchResult.success,
                message: searchResult.message
              };
            } catch (error) {
              console.warn('Search error:', error);
            }
          }
          break;

        case 'help':
          if (this.navigationRouter) {
            try {
              const helpResult = await this.navigationRouter.executeAction('help', params);
              return {
                success: helpResult.success,
                message: helpResult.message
              };
            } catch (error) {
              console.warn('Help error:', error);
            }
          }
          break;

        default:
          return {
            success: false,
            message: 'Unknown action type'
          };
      }

      return {
        success: false,
        message: 'Navigation action failed'
      };

    } catch (error) {
      console.error('Navigation execution error:', error);
      return {
        success: false,
        message: 'Failed to execute navigation action'
      };
    }
  }

  /**
   * Get contextual help for the current context and language
   */
  private getContextualHelp(language: string, context?: string): ContextualHelp | null {
    const key = `${language}-${context || 'general'}`;
    return this.contextHelp.get(key) || null;
  }

  /**
   * Get fallback response when AI processing fails
   */
  private getFallbackResponse(language: string): string {
    const responses: Record<string, string> = {
      'en': 'I\'m here to help you navigate KalaBandhu. Try saying "go to dashboard" or "show marketplace".',
      'hi': 'मैं आपकी मदद करने के लिए यहां हूं। "डैशबोर्ड पर जाएं" या "मार्केटप्लेस दिखाएं" कहने का प्रयास करें।'
    };
    return responses[language] || responses['en'];
  }

  /**
   * Get error response
   */
  private getErrorResponse(language: string): string {
    const responses: Record<string, string> = {
      'en': 'Sorry, I couldn\'t process that command. Please try again.',
      'hi': 'क्षमा करें, मैं उस कमांड को प्रोसेस नहीं कर सका। कृपया फिर से प्रयास करें।'
    };
    return responses[language] || responses['en'];
  }

  /**
   * Get command suggestions
   */
  private getCommandSuggestions(language: string, context?: string): string[] {
    const suggestions: Record<string, string[]> = {
      'en': [
        'Go to dashboard',
        'Show marketplace',
        'View my profile',
        'Search products',
        'Help me navigate'
      ],
      'hi': [
        'डैशबोर्ड पर जाएं',
        'मार्केटप्लेस दिखाएं',
        'मेरी प्रोफाइल देखें',
        'उत्पाद खोजें',
        'मदद करें'
      ]
    };
    return suggestions[language] || suggestions['en'];
  }

  /**
   * Add custom contextual help
   */
  public addContextualHelp(help: ContextualHelp): void {
    const key = `${help.language}-${help.context}`;
    this.contextHelp.set(key, help);
  }

  /**
   * Get available contexts for a language
   */
  public getAvailableContexts(language: string): string[] {
    const contexts: string[] = [];
    for (const key of this.contextHelp.keys()) {
      if (key.startsWith(`${language}-`)) {
        contexts.push(key.replace(`${language}-`, ''));
      }
    }
    return contexts;
  }

  /**
   * Update user context for better suggestions
   */
  public updateUserContext(userId: string, context: string, language: string): void {
    // In a real implementation, you'd store this in a database
    console.log(`📍 Updated context for user ${userId}: ${context} (${language})`);
  }
}