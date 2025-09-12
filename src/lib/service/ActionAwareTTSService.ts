import { EnhancedTextToSpeechService } from './EnhancedTextToSpeechService';
import { NavigationService } from './NavigationService';

interface ActionAwareTTSOptions {
  language: string;
  gender?: 'MALE' | 'FEMALE';
  quality?: 'Standard' | 'Wavenet' | 'Neural2' | 'Chirp3-HD';
  speed?: number;
  pitch?: number;
  volume?: number;
  enableActions?: boolean;
}

interface ActionAwareTTSResult {
  audioBuffer: Buffer;
  text: string;
  action?: {
    type: string;
    target: string;
    parameters?: Record<string, any>;
  };
  shouldNavigate?: boolean;
  navigationTarget?: string;
}

export class ActionAwareTTSService {
  private static instance: ActionAwareTTSService;
  private enhancedTtsService: EnhancedTextToSpeechService;
  private navigationService: NavigationService;

  private constructor() {
    this.enhancedTtsService = EnhancedTextToSpeechService.getInstance();
    this.navigationService = NavigationService.getInstance();
  }

  public static getInstance(): ActionAwareTTSService {
    if (!ActionAwareTTSService.instance) {
      ActionAwareTTSService.instance = new ActionAwareTTSService();
    }
    return ActionAwareTTSService.instance;
  }

  /**
   * Synthesize speech with action awareness
   */
  public async synthesizeWithAction(
    text: string,
    options: ActionAwareTTSOptions = {}
  ): Promise<ActionAwareTTSResult> {
    const {
      language = 'en-US',
      gender = 'FEMALE',
      quality = 'Neural2',
      speed = 1.0,
      pitch = 0.0,
      volume = 1.0,
      enableActions = true
    } = options;

    // Generate audio
    const ttsResult = await this.enhancedTtsService.synthesizeSpeech(text, {
      language,
      gender,
      quality,
      speed,
      pitch,
      volume,
      enableTranslation: false
    });

    // Check if text contains action indicators
    const actionInfo = enableActions ? this.extractActionInfo(text) : null;

    return {
      audioBuffer: ttsResult.audioBuffer,
      text,
      action: actionInfo?.action,
      shouldNavigate: actionInfo?.shouldNavigate,
      navigationTarget: actionInfo?.navigationTarget
    };
  }

  /**
   * Extract action information from text
   */
  private extractActionInfo(text: string): {
    action?: {
      type: string;
      target: string;
      parameters?: Record<string, any>;
    };
    shouldNavigate?: boolean;
    navigationTarget?: string;
  } | null {
    const lowerText = text.toLowerCase();

    // Product creation patterns
    if (this.containsPatterns(lowerText, [
      'product creator', 'smart product', 'create product', 'new product',
      'product banana', 'product dalna', 'नया प्रोडक्ट', 'प्रोडक्ट बनाना'
    ])) {
      return {
        action: {
          type: 'navigate',
          target: '/smart-product-creator',
          parameters: { source: 'voice_command' }
        },
        shouldNavigate: true,
        navigationTarget: '/smart-product-creator'
      };
    }

    // Sales/Finance patterns
    if (this.containsPatterns(lowerText, [
      'finance', 'sales', 'dashboard', 'earnings', 'revenue',
      'सेल्स', 'कमाई', 'फाइनेंस', 'डैशबोर्ड'
    ])) {
      return {
        action: {
          type: 'navigate',
          target: '/finance/dashboard',
          parameters: { source: 'voice_command' }
        },
        shouldNavigate: true,
        navigationTarget: '/finance/dashboard'
      };
    }

    // Trend analysis patterns
    if (this.containsPatterns(lowerText, [
      'trend', 'trending', 'spotter', 'popular', 'fashion',
      'ट्रेंड', 'लोकप्रिय', 'फैशन', 'डिज़ाइन'
    ])) {
      return {
        action: {
          type: 'navigate',
          target: '/trend-spotter',
          parameters: { source: 'voice_command' }
        },
        shouldNavigate: true,
        navigationTarget: '/trend-spotter'
      };
    }

    // Buyer matching patterns
    if (this.containsPatterns(lowerText, [
      'buyer', 'match', 'matchmaking', 'customer', 'connect',
      'बायर', 'मैच', 'ग्राहक', 'जुड़ना'
    ])) {
      return {
        action: {
          type: 'navigate',
          target: '/matchmaking',
          parameters: { source: 'voice_command' }
        },
        shouldNavigate: true,
        navigationTarget: '/matchmaking'
      };
    }

    // Profile patterns
    if (this.containsPatterns(lowerText, [
      'profile', 'account', 'settings', 'personal',
      'प्रोफाइल', 'खाता', 'सेटिंग्स'
    ])) {
      return {
        action: {
          type: 'navigate',
          target: '/profile',
          parameters: { source: 'voice_command' }
        },
        shouldNavigate: true,
        navigationTarget: '/profile'
      };
    }

    return null;
  }

  private containsPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern.toLowerCase()));
  }

  /**
   * Execute action after TTS completion
   */
  public async executeActionAfterTTS(
    result: ActionAwareTTSResult,
    delay: number = 2000
  ): Promise<void> {
    if (result.shouldNavigate && result.navigationTarget) {
      setTimeout(() => {
        this.navigationService.navigateToPage(result.navigationTarget!);
      }, delay);
    }

    if (result.action) {
      setTimeout(() => {
        switch (result.action!.type) {
          case 'navigate':
            this.navigationService.navigateToPage(
              result.action!.target,
              result.action!.parameters
            );
            break;
          case 'open_modal':
            this.navigationService.showModal(
              result.action!.target,
              result.action!.parameters
            );
            break;
          case 'execute_function':
            this.navigationService.executeFunction(
              result.action!.target,
              result.action!.parameters
            );
            break;
        }
      }, delay);
    }
  }

  /**
   * Play audio and execute action
   */
  public async playWithAction(
    text: string,
    options: ActionAwareTTSOptions = {}
  ): Promise<void> {
    const result = await this.synthesizeWithAction(text, options);
    
    // Play audio
    const audio = new Audio(`data:audio/mp3;base64,${Buffer.from(result.audioBuffer).toString('base64')}`);
    audio.play();

    // Execute action after audio starts playing
    if (result.shouldNavigate || result.action) {
      await this.executeActionAfterTTS(result, 1000);
    }
  }
}
