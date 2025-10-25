import { GeminiSpeechService } from './GeminiSpeechService';

export interface VoiceFeedbackOptions {
  language?: string;
  voiceType?: 'artisan_male' | 'artisan_female' | 'professional_male' | 'professional_female';
  speed?: number;
  priority?: 'low' | 'normal' | 'high';
}

export class VoiceFeedbackService {
  private static instance: VoiceFeedbackService;
  private geminiService: GeminiSpeechService;
  private isEnabled: boolean = true;
  private currentLanguage: string = 'hi';
  private feedbackQueue: Array<{ text: string; options: VoiceFeedbackOptions }> = [];
  private isPlaying: boolean = false;

  private constructor() {
    this.geminiService = GeminiSpeechService.getInstance();
  }

  public static getInstance(): VoiceFeedbackService {
    if (!VoiceFeedbackService.instance) {
      VoiceFeedbackService.instance = new VoiceFeedbackService();
    }
    return VoiceFeedbackService.instance;
  }

  // Core feedback methods
  public async speak(text: string, options: VoiceFeedbackOptions = {}): Promise<void> {
    if (!this.isEnabled) return;

    const feedbackOptions = {
      language: options.language || this.currentLanguage,
      voiceType: options.voiceType || 'artisan_female',
      speed: options.speed || 1.0,
      priority: options.priority || 'normal',
      ...options
    };

    // Add to queue if high priority or currently playing
    if (feedbackOptions.priority === 'high' || this.isPlaying) {
      this.feedbackQueue.push({ text, options: feedbackOptions });
      if (!this.isPlaying) {
        this.processQueue();
      }
      return;
    }

    await this.playFeedback(text, feedbackOptions);
  }

  private async playFeedback(text: string, options: VoiceFeedbackOptions): Promise<void> {
    this.isPlaying = true;

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          language: options.language,
          voiceType: options.voiceType,
          speed: options.speed
        })
      });

      const result = await response.json();
      if (result.success && result.audioData) {
        const audio = new Audio(result.audioData);
        audio.onended = () => {
          this.isPlaying = false;
          this.processQueue();
        };
        audio.play();
      } else {
        throw new Error(result.error || 'TTS failed');
      }
    } catch (error) {
      console.error('Voice feedback failed:', error);
      this.isPlaying = false;
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.feedbackQueue.length === 0 || this.isPlaying) return;

    const nextFeedback = this.feedbackQueue.shift();
    if (nextFeedback) {
      await this.playFeedback(nextFeedback.text, nextFeedback.options);
    }
  }

  // Predefined feedback messages
  public async feedbackForAction(action: string, context?: any): Promise<void> {
    let message = '';

    switch (action) {
      // Navigation feedback
      case 'navigate_dashboard':
        message = 'Taking you to your dashboard';
        break;
      case 'navigate_marketplace':
        message = 'Opening the marketplace';
        break;
      case 'navigate_profile':
        message = 'Opening your profile';
        break;
      case 'navigate_create_product':
        message = 'Opening product creator';
        break;
      case 'navigate_finance':
        message = 'Opening finance dashboard';
        break;

      // Product creation feedback
      case 'product_image_uploaded':
        message = 'Image uploaded successfully. Analyzing with AI...';
        break;
      case 'product_image_enhanced':
        message = 'Image enhanced with AI. Looks beautiful!';
        break;
      case 'product_description_generated':
        message = 'Product description created with emotional storytelling';
        break;
      case 'product_saved':
        message = 'Product saved successfully';
        break;
      case 'product_published':
        message = 'Product published! It\'s now live in the marketplace';
        break;

      // Search and filter feedback
      case 'search_executed':
        message = `Searching for ${context?.query || 'products'}`;
        break;
      case 'filter_applied':
        message = `Filtered by ${context?.filter || 'category'}`;
        break;
      case 'no_results':
        message = 'No products found. Try different search terms';
        break;

      // Error feedback
      case 'error_generic':
        message = 'Sorry, something went wrong. Please try again';
        break;
      case 'error_network':
        message = 'Network error. Please check your connection';
        break;
      case 'error_permission':
        message = 'Permission denied. Please allow microphone access';
        break;

      // Success feedback
      case 'success_saved':
        message = 'Changes saved successfully';
        break;
      case 'success_deleted':
        message = 'Item deleted successfully';
        break;
      case 'success_updated':
        message = 'Updated successfully';
        break;

      // Voice interaction feedback
      case 'voice_listening':
        message = 'Listening...';
        break;
      case 'voice_processing':
        message = 'Processing your request...';
        break;
      case 'voice_command_recognized':
        message = `Heard: ${context?.command || 'command'}`;
        break;
      case 'voice_command_not_recognized':
        message = 'Sorry, I didn\'t understand that. Please try again';
        break;

      default:
        message = action;
    }

    if (message) {
      await this.speak(message, { priority: 'normal' });
    }
  }

  // Contextual feedback methods
  public async welcomeUser(name?: string): Promise<void> {
    const greeting = name
      ? `Namaste ${name}! Welcome back to KalaBandhu`
      : 'Namaste! Welcome to KalaBandhu';
    await this.speak(greeting, { priority: 'high' });
  }

  public async guideToFeature(feature: string): Promise<void> {
    const guides: Record<string, string> = {
      'create_product': 'To create a product, say "create product" or tap the create button',
      'marketplace': 'Browse the marketplace by saying "show marketplace" or "search for products"',
      'profile': 'Manage your profile by saying "go to profile"',
      'finance': 'Check your finances by saying "show finance dashboard"',
      'voice_commands': 'Try voice commands like "help", "next", or "go to marketplace"'
    };

    const guide = guides[feature] || `You can access ${feature} from the menu`;
    await this.speak(guide, { priority: 'normal' });
  }

  public async confirmAction(action: string, item?: string): Promise<void> {
    const confirmations: Record<string, string> = {
      'delete': `Are you sure you want to delete ${item || 'this item'}?`,
      'publish': `Ready to publish ${item || 'your product'} to the marketplace?`,
      'save': `Save ${item || 'your changes'}?`,
      'cancel': 'Cancel this action?'
    };

    const confirmation = confirmations[action] || `Confirm ${action}?`;
    await this.speak(confirmation, { priority: 'high' });
  }

  // Settings and configuration
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  // Emergency stop
  public stop(): void {
    this.feedbackQueue = [];
    this.isPlaying = false;
  }

  // Queue management
  public clearQueue(): void {
    this.feedbackQueue = [];
  }

  public getQueueLength(): number {
    return this.feedbackQueue.length;
  }
}
