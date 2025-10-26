import { GeminiSpeechService } from './GeminiSpeechService';

export interface CommunicationSession {
  sessionId: string;
  buyerId: string;
  artisanId: string;
  buyerLanguage: string;
  artisanLanguage: string;
  status: 'active' | 'completed' | 'error';
  messages: CommunicationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderType: 'buyer' | 'artisan';
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  translatedLanguage: string;
  audioUrl?: string;
  timestamp: Date;
  confidence: number;
}

export interface VoiceCommunicationRequest {
  sessionId: string;
  audioBuffer: ArrayBuffer;
  senderId: string;
  senderType: 'buyer' | 'artisan';
  targetLanguage?: string;
}

export interface VoiceCommunicationResponse {
  success: boolean;
  originalText: string;
  translatedText: string;
  audioUrl: string;
  confidence: number;
  message: CommunicationMessage;
}

export class RegionalCommunicationService {
  private static instance: RegionalCommunicationService;
  private geminiService: GeminiSpeechService;
  private activeSessions: Map<string, CommunicationSession> = new Map();
  private languageMap: Map<string, string> = new Map();

  private constructor() {
    try {
      this.geminiService = GeminiSpeechService.getInstance();
    } catch (error) {
      console.warn('Gemini service not available:', error);
      // Create a mock service for fallback functionality
      this.geminiService = this.createFallbackGeminiService();
    }
    this.initializeLanguageMappings();
  }

  /**
   * Create fallback Gemini service when API key is not available
   */
  private createFallbackGeminiService(): GeminiSpeechService {
    // Return a mock service that provides basic functionality
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
      textToSpeech: async (text: string, options: any) => {
        // Return empty audio buffer
        return new ArrayBuffer(0);
      },
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

  public static getInstance(): RegionalCommunicationService {
    if (!RegionalCommunicationService.instance) {
      RegionalCommunicationService.instance = new RegionalCommunicationService();
    }
    return RegionalCommunicationService.instance;
  }

  private initializeLanguageMappings(): void {
    // Map regional language codes to Gemini-supported languages
    this.languageMap.set('hi', 'hi-IN'); // Hindi
    this.languageMap.set('bn', 'bn-IN'); // Bengali
    this.languageMap.set('te', 'te-IN'); // Telugu
    this.languageMap.set('mr', 'mr-IN'); // Marathi
    this.languageMap.set('ta', 'ta-IN'); // Tamil
    this.languageMap.set('gu', 'gu-IN'); // Gujarati
    this.languageMap.set('kn', 'kn-IN'); // Kannada
    this.languageMap.set('ml', 'ml-IN'); // Malayalam
    this.languageMap.set('pa', 'pa-IN'); // Punjabi
    this.languageMap.set('or', 'or-IN'); // Odia
    this.languageMap.set('as', 'as-IN'); // Assamese
    this.languageMap.set('mai', 'hi-IN'); // Maithili -> Hindi
    this.languageMap.set('bho', 'hi-IN'); // Bhojpuri -> Hindi
    this.languageMap.set('awa', 'hi-IN'); // Awadhi -> Hindi
    this.languageMap.set('mag', 'hi-IN'); // Magahi -> Hindi
  }

  /**
   * Start a new communication session
   */
  public async startSession(buyerId: string, artisanId: string, buyerLanguage: string, artisanLanguage: string): Promise<CommunicationSession> {
    const sessionId = this.generateSessionId();
    const session: CommunicationSession = {
      sessionId,
      buyerId,
      artisanId,
      buyerLanguage: this.normalizeLanguage(buyerLanguage),
      artisanLanguage: this.normalizeLanguage(artisanLanguage),
      status: 'active',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.activeSessions.set(sessionId, session);
    console.log(`🗣️ Started communication session ${sessionId} between ${buyerLanguage} and ${artisanLanguage}`);

    return session;
  }

  /**
   * Process voice communication in the regional pipeline
   */
  public async processVoiceCommunication(request: VoiceCommunicationRequest): Promise<VoiceCommunicationResponse> {
    try {
      const session = this.activeSessions.get(request.sessionId);
      if (!session) {
        throw new Error('Communication session not found');
      }

      // Determine target language based on sender
      const targetLanguage = request.targetLanguage ||
        (request.senderType === 'buyer' ? session.artisanLanguage : session.buyerLanguage);

      // Step 1: Speech-to-Text (STT)
      const sttResult = await this.performSpeechToText(request.audioBuffer, request.senderType === 'buyer' ? session.buyerLanguage : session.artisanLanguage);

      if (!sttResult.success) {
        throw new Error('Speech-to-text conversion failed');
      }

      // Step 2: Translate text to target language
      const translationResult = await this.translateText(sttResult.text, targetLanguage);

      // Step 3: Text-to-Speech (TTS) in target language
      const ttsResult = await this.performTextToSpeech(translationResult.translatedText, targetLanguage);

      // Step 4: Create communication message
      const message: CommunicationMessage = {
        id: this.generateMessageId(),
        sessionId: request.sessionId,
        senderId: request.senderId,
        senderType: request.senderType,
        originalText: sttResult.text,
        originalLanguage: request.senderType === 'buyer' ? session.buyerLanguage : session.artisanLanguage,
        translatedText: translationResult.translatedText,
        translatedLanguage: targetLanguage,
        audioUrl: ttsResult.audioUrl,
        timestamp: new Date(),
        confidence: sttResult.confidence
      };

      // Add message to session
      session.messages.push(message);
      session.updatedAt = new Date();

      console.log(`✅ Processed voice communication: ${sttResult.text} → ${translationResult.translatedText}`);

      return {
        success: true,
        originalText: sttResult.text,
        translatedText: translationResult.translatedText,
        audioUrl: ttsResult.audioUrl,
        confidence: sttResult.confidence,
        message
      };

    } catch (error) {
      console.error('Voice communication processing error:', error);
      return {
        success: false,
        originalText: '',
        translatedText: '',
        audioUrl: '',
        confidence: 0,
        message: {} as CommunicationMessage
      };
    }
  }

  /**
   * Perform Speech-to-Text conversion
   */
  private async performSpeechToText(audioBuffer: ArrayBuffer, language: string): Promise<{ success: boolean; text: string; confidence: number }> {
    try {
      const geminiLanguage = this.languageMap.get(language) || 'hi-IN';
      const result = await this.geminiService.speechToText(audioBuffer, {
        language: geminiLanguage,
        model: 'gemini-2.5-flash'
      });

      return {
        success: true,
        text: result.text,
        confidence: result.confidence
      };

    } catch (error) {
      console.error('STT error:', error);
      return {
        success: false,
        text: '',
        confidence: 0
      };
    }
  }

  /**
   * Translate text to target language
   */
  private async translateText(text: string, targetLanguage: string): Promise<{ translatedText: string; confidence: number }> {
    try {
      // For now, using a simple placeholder translation
      // In production, you'd integrate with Google Translate API or similar
      const translatedText = await this.performTranslation(text, targetLanguage);

      return {
        translatedText,
        confidence: 0.9
      };

    } catch (error) {
      console.error('Translation error:', error);
      return {
        translatedText: text, // Fallback to original text
        confidence: 0.5
      };
    }
  }

  /**
   * Perform Text-to-Speech conversion
   */
  private async performTextToSpeech(text: string, language: string): Promise<{ audioUrl: string }> {
    try {
      const geminiLanguage = this.languageMap.get(language) || 'hi-IN';
      const audioBuffer = await this.geminiService.textToSpeech(text, {
        language: geminiLanguage,
        speed: 1.0,
        pitch: 1.0
      });

      // Convert to base64 and create data URL
      const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
      const audioUrl = `data:audio/wav;base64,${audioBase64}`;

      return { audioUrl };

    } catch (error) {
      console.error('TTS error:', error);
      return { audioUrl: '' };
    }
  }

  /**
   * Simple translation function (placeholder for actual translation service)
   */
  private async performTranslation(text: string, targetLanguage: string): Promise<string> {
    // This is a placeholder implementation
    // In production, integrate with Google Translate API, Azure Translator, or similar

    const translations: Record<string, Record<string, string>> = {
      'hi': {
        'Hello': 'नमस्ते',
        'How much does this cost?': 'इसकी कीमत कितनी है?',
        'Can you deliver this?': 'क्या आप इसे डिलीवर कर सकते हैं?',
        'Thank you': 'धन्यवाद'
      },
      'te': {
        'Hello': 'నమస్కారం',
        'How much does this cost?': 'దీని ధర ఎంత?',
        'Can you deliver this?': 'మీరు దీన్ని డెలివరీ చేయగలరా?',
        'Thank you': 'ధన్యవాదాలు'
      },
      'ta': {
        'Hello': 'வணக்கம்',
        'How much does this cost?': 'இதன் விலை என்ன?',
        'Can you deliver this?': 'இதை நீங்கள் டெலிவரி செய்ய முடியுமா?',
        'Thank you': 'நன்றி'
      }
    };

    const targetTranslations = translations[targetLanguage];
    if (targetTranslations && targetTranslations[text]) {
      return targetTranslations[text];
    }

    // Fallback: return original text with language indicator
    return `[${targetLanguage.toUpperCase()}] ${text}`;
  }

  /**
   * End communication session
   */
  public async endSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.status = 'completed';
        session.updatedAt = new Date();
        console.log(`🏁 Ended communication session ${sessionId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }

  /**
   * Get session details
   */
  public getSession(sessionId: string): CommunicationSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  public getActiveSessions(): CommunicationSession[] {
    return Array.from(this.activeSessions.values()).filter(session => session.status === 'active');
  }

  /**
   * Normalize language code
   */
  private normalizeLanguage(language: string): string {
    return language.toLowerCase().split('-')[0];
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get supported languages
   */
  public getSupportedLanguages(): string[] {
    return Array.from(this.languageMap.keys());
  }

  /**
   * Clean up old sessions (older than 24 hours)
   */
  public cleanupOldSessions(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.updatedAt < cutoffTime) {
        this.activeSessions.delete(sessionId);
        console.log(`🧹 Cleaned up old session ${sessionId}`);
      }
    }
  }
}
