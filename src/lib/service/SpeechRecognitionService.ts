export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface VoiceCommand {
  command: string;
  confidence: number;
  timestamp: Date;
  language: string;
  isFinal: boolean;
}

export class SpeechRecognitionService {
  private static instance: SpeechRecognitionService;
  private recognition: any = null;
  private isListening: boolean = false;
  private options: SpeechRecognitionOptions;
  private listeners: Map<string, Function[]> = new Map();

  private constructor(options: SpeechRecognitionOptions = {}) {
    this.options = {
      language: 'en-US',
      continuous: true,
      interimResults: false,
      maxAlternatives: 1,
      ...options
    };

    this.initializeRecognition();
  }

  public static getInstance(options?: SpeechRecognitionOptions): SpeechRecognitionService {
    if (!SpeechRecognitionService.instance) {
      SpeechRecognitionService.instance = new SpeechRecognitionService(options);
    }
    return SpeechRecognitionService.instance;
  }

  private initializeRecognition(): void {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.options.language;
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.maxAlternatives = this.options.maxAlternatives;

    // Set up event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.emit('start');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.emit('end');
    };

    this.recognition.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];

      if (lastResult.isFinal || this.options.interimResults) {
        const command: VoiceCommand = {
          command: lastResult[0].transcript.trim(),
          confidence: lastResult[0].confidence || 0.8,
          timestamp: new Date(),
          language: this.options.language!,
          isFinal: lastResult.isFinal
        };

        this.emit('result', command);
      }
    };

    this.recognition.onerror = (event: any) => {
      const error = new Error(`Speech recognition error: ${event.error}`);
      this.emit('error', error);
    };

    this.recognition.onnomatch = () => {
      const error = new Error('No speech was detected');
      this.emit('error', error);
    };
  }

  public async start(options?: Partial<SpeechRecognitionOptions>): Promise<void> {
    if (options) {
      this.updateOptions(options);
    }

    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    if (this.isListening) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Speech recognition start timeout'));
      }, 5000);

      this.recognition.onstart = () => {
        clearTimeout(timeout);
        this.isListening = true;
        this.emit('start');
        resolve();
      };

      this.recognition.onerror = (event: any) => {
        clearTimeout(timeout);
        this.isListening = false;
        const error = new Error(`Speech recognition error: ${event.error}`);
        this.emit('error', error);
        reject(error);
      };

      try {
        this.recognition.start();
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    if (!this.recognition || !this.isListening) {
      return;
    }

    return new Promise((resolve) => {
      this.recognition.onend = () => {
        this.isListening = false;
        this.emit('end');
        resolve();
      };

      this.recognition.stop();
    });
  }

  public setLanguage(language: string): void {
    this.options.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  private updateOptions(options: Partial<SpeechRecognitionOptions>): void {
    this.options = { ...this.options, ...options };
    if (this.recognition) {
      this.recognition.lang = this.options.language;
      this.recognition.continuous = this.options.continuous;
      this.recognition.interimResults = this.options.interimResults;
      this.recognition.maxAlternatives = this.options.maxAlternatives;
    }
  }

  // Event system
  public onResult(callback: (result: VoiceCommand) => void): void {
    this.on('result', callback);
  }

  public onError(callback: (error: Error) => void): void {
    this.on('error', callback);
  }

  public onStart(callback: () => void): void {
    this.on('start', callback);
  }

  public onEnd(callback: () => void): void {
    this.on('end', callback);
  }

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

  public isActive(): boolean {
    return this.isListening;
  }

  public getSupportedLanguages(): string[] {
    // Return common supported languages for speech recognition
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA',
      'hi-IN', 'bn-IN', 'te-IN', 'mr-IN', 'ta-IN',
      'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN'
    ];
  }

  public destroy(): void {
    this.stop();
    this.listeners.clear();
    SpeechRecognitionService.instance = null as any;
  }
}