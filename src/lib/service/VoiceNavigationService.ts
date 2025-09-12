import { GeminiSpeechService } from './GeminiSpeechService';
import { ConversationalVoiceProcessor } from './ConversationalVoiceProcessor';
import { NavigationRouter } from './NavigationRouter';

export interface VoiceNavigationOptions {
  language?: string;
  continuous?: boolean;
  autoStart?: boolean;
  feedbackEnabled?: boolean;
}

export interface VoiceCommand {
  command: string;
  confidence: number;
  timestamp: Date;
  language: string;
  isFinal?: boolean;
}

export interface NavigationAction {
  type: 'navigate' | 'action' | 'query';
  target: string;
  params?: Record<string, any>;
  confidence: number;
}

export class VoiceNavigationService {
  private static instance: VoiceNavigationService;
  private geminiService: GeminiSpeechService;
  private conversationalProcessor: ConversationalVoiceProcessor;
  private navigationRouter: NavigationRouter;
  private options: VoiceNavigationOptions;
  private isActive: boolean = false;
  private listeners: Map<string, Function[]> = new Map();
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  private constructor(options: VoiceNavigationOptions = {}) {
    this.options = {
      language: 'en-US',
      continuous: true,
      autoStart: false,
      feedbackEnabled: true,
      ...options
    };

    this.geminiService = GeminiSpeechService.getInstance();
    this.conversationalProcessor = ConversationalVoiceProcessor.getInstance();
    this.navigationRouter = NavigationRouter.getInstance();

    this.initializeServices();
  }

  public static getInstance(options?: VoiceNavigationOptions): VoiceNavigationService {
    if (!VoiceNavigationService.instance) {
      VoiceNavigationService.instance = new VoiceNavigationService(options);
    }
    return VoiceNavigationService.instance;
  }

  private initializeServices(): void {
    // Initialize media recorder for audio capture
    this.initializeMediaRecorder();
  }

  private initializeMediaRecorder(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Media devices not supported');
      return;
    }
  }

  public async start(): Promise<void> {
    if (this.isActive) return;

    try {
      // Get user media (microphone)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.processAudioBlob(audioBlob);
      };

      this.mediaRecorder.start();
      this.isActive = true;
      this.emit('started', { active: true });

      if (this.options.feedbackEnabled) {
        await this.speak('Voice navigation activated. How can I help you?');
      }
    } catch (error) {
      console.error('Failed to start voice navigation:', error);
      this.emit('error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async stop(): Promise<void> {
    if (!this.isActive || !this.mediaRecorder) return;

    try {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.isActive = false;
      this.emit('stopped', { active: false });

      if (this.options.feedbackEnabled) {
        await this.speak('Voice navigation deactivated.');
      }
    } catch (error) {
      console.error('Failed to stop voice navigation:', error);
      this.emit('error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async processAudioBlob(audioBlob: Blob): Promise<void> {
    try {
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Process with conversational processor (which uses Gemini internally)
      const result = await this.conversationalProcessor.processVoiceCommand(
        arrayBuffer,
        this.options.language!
      );

      // Create voice command object for compatibility
      const voiceCommand: VoiceCommand = {
        command: result.intent.parameters?.query || 'voice command',
        confidence: result.intent.confidence,
        timestamp: new Date(),
        language: this.options.language!,
        isFinal: true
      };

      // Emit command event with the result
      this.emit('command', { command: voiceCommand, result });

      // Handle navigation if required
      if (result.shouldNavigate && result.navigationTarget) {
        await this.navigationRouter.navigate(result.navigationTarget);
      }

      // Provide voice feedback
      if (this.options.feedbackEnabled && result.response) {
        await this.speak(result.response);
      }

    } catch (error) {
      console.error('Failed to process audio blob:', error);
      if (this.options.feedbackEnabled) {
        await this.speak('Sorry, I had trouble understanding that. Could you please try again?');
      }
      this.emit('error', { error: error instanceof Error ? error.message : 'Audio processing failed' });
    }
  }

  public async speak(text: string, options?: { language?: string; rate?: number; pitch?: number }): Promise<void> {
    try {
      await this.geminiService.textToSpeech(text, {
        language: options?.language || this.options.language,
        speed: options?.rate || 1.0,
        pitch: options?.pitch || 1.0
      });
    } catch (error) {
      console.error('Failed to speak:', error);
    }
  }

  private async handleVoiceCommand(command: VoiceCommand): Promise<void> {
    try {
      console.log('🎤 Processing voice command:', command);

      // Process the command using the conversational processor
      const result = await this.conversationalProcessor.processVoiceCommand(
        new ArrayBuffer(0), // We already have the text, so pass empty buffer
        command.language
      );

      // Update conversational processor with the actual command text
      // Note: This is a simplified integration. In production, we'd pass the actual audio buffer
      this.conversationalProcessor.updateContext({
        conversationHistory: [{
          userInput: command.command,
          intent: result.intent,
          timestamp: command.timestamp
        }]
      });

      this.emit('command', { command, result });

      // Handle navigation if required
      if (result.shouldNavigate && result.navigationTarget) {
        await this.navigationRouter.navigate(result.navigationTarget);
      }

      // Actions are handled by the conversational processor
      // No additional action handling needed here

      // Provide voice feedback
      if (this.options.feedbackEnabled && result.response) {
        await this.speak(result.response);
      }

    } catch (error) {
      console.error('Error handling voice command:', error);
      if (this.options.feedbackEnabled) {
        await this.speak('Sorry, I didn\'t understand that. Could you please try again?');
      }
      this.emit('error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async executeAction(action: NavigationAction): Promise<void> {
    try {
      switch (action.type) {
        case 'navigate':
          await this.navigationRouter.navigate(action.target, action.params);
          break;
        case 'action':
          await this.navigationRouter.executeAction(action.target, action.params);
          break;
        case 'query':
          const result = await this.navigationRouter.handleQuery(action.target, action.params);
          if (result && this.options.feedbackEnabled) {
            await this.speak(result);
          }
          break;
      }

      this.emit('action', { action, executed: true });
    } catch (error) {
      console.error('Error executing action:', error);
      this.emit('error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async provideFeedback(action: NavigationAction): Promise<void> {
    let feedback = '';

    switch (action.type) {
      case 'navigate':
        feedback = `Navigating to ${action.target}`;
        break;
      case 'action':
        feedback = `Executing ${action.target}`;
        break;
      case 'query':
        feedback = 'Processing your query';
        break;
    }

    if (feedback) {
      await this.speak(feedback);
    }
  }

  private handleError(error: Error): void {
    console.error('Voice navigation error:', error);
    this.emit('error', { error: error.message });
  }

  // Event system
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Configuration methods
  public setLanguage(language: string): void {
    this.options.language = language;
    // Language is handled by Gemini service automatically
  }

  public setFeedbackEnabled(enabled: boolean): void {
    this.options.feedbackEnabled = enabled;
  }

  public isListening(): boolean {
    return this.isActive;
  }

  public getSupportedLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'hi-IN', 'bn-IN', 'te-IN', 'mr-IN', 'ta-IN',
      'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN'
    ];
  }

  // Cleanup
  public destroy(): void {
    this.stop();
    this.listeners.clear();
    VoiceNavigationService.instance = null as any;
  }
}