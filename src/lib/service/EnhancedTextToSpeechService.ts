import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { google } from '@google-cloud/text-to-speech/build/protos/protos';
import { 
  VOICE_MAPPING, 
  VoiceConfig, 
  getBestVoiceForLanguage, 
  getDefaultVoice, 
  getFallbackVoice,
  isLanguageSupported 
} from '../voice-mapping';

export interface EnhancedTTSOptions {
  language?: string;
  voice?: string;
  gender?: 'MALE' | 'FEMALE';
  quality?: 'Neural2' | 'Wavenet' | 'Standard';
  speed?: number;
  pitch?: number;
  volume?: number;
  enableTranslation?: boolean;
  sourceLanguage?: string;
}

export interface EnhancedTTSResult {
  audioBuffer: ArrayBuffer;
  audioFormat: string;
  language: string;
  voice: string;
  translatedText?: string;
  originalText?: string;
  processingTime: number;
}

export class EnhancedTextToSpeechService {
  private static instance: EnhancedTextToSpeechService;
  private ttsClient: TextToSpeechClient;
  private voiceCache: Map<string, VoiceConfig[]> = new Map();
  private audioCache: Map<string, ArrayBuffer> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps: Map<string, number> = new Map();

  private constructor() {
    this.ttsClient = new TextToSpeechClient({
      keyFilename: 'google-credentials.json',
      projectId: 'gen-lang-client-0314311341'
    });
  }

  public static getInstance(): EnhancedTextToSpeechService {
    if (!EnhancedTextToSpeechService.instance) {
      EnhancedTextToSpeechService.instance = new EnhancedTextToSpeechService();
    }
    return EnhancedTextToSpeechService.instance;
  }

  /**
   * Enhanced speech synthesis with intelligent voice selection
   */
  public async synthesizeSpeech(
    text: string,
    options: EnhancedTTSOptions = {}
  ): Promise<EnhancedTTSResult> {
    const startTime = Date.now();
    
    try {
      const {
        language = 'en-IN',
        voice,
        gender = 'FEMALE',
        quality = 'Neural2',
        speed = 1.0,
        pitch = 0.0,
        volume = 1.0,
        enableTranslation = false,
        sourceLanguage = 'en'
      } = options;

      // Validate language support
      if (!isLanguageSupported(language)) {
        throw new Error(`Language ${language} is not supported`);
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(text, language, voice, gender, quality);
      const cachedAudio = this.getCachedAudio(cacheKey);
      if (cachedAudio) {
        console.log('Using cached audio for:', cacheKey);
        return {
          audioBuffer: cachedAudio,
          audioFormat: 'MP3',
          language,
          voice: voice || getDefaultVoice(language),
          processingTime: Date.now() - startTime
        };
      }

      // Handle translation if needed
      let processedText = text;
      let translatedText: string | undefined;
      
      if (enableTranslation && language !== sourceLanguage) {
        try {
          // Import translation service dynamically to avoid circular dependencies
          const { TranslationService } = await import('./TranslationService');
          const translationService = TranslationService.getInstance();
          const translationResult = await translationService.translateText(text, language, sourceLanguage);
          translatedText = translationResult.translatedText;
          processedText = translatedText;
        } catch (error) {
          console.warn('Translation failed, using original text:', error);
        }
      }

      // Select optimal voice
      const selectedVoice = await this.selectOptimalVoice(language, voice, gender, quality);
      
      console.log('TTS Synthesis:', {
        language,
        voice: selectedVoice.name,
        gender: selectedVoice.gender,
        quality: selectedVoice.quality,
        textLength: processedText.length
      });

      // Enhanced voice configuration
      const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { text: processedText },
        voice: {
          languageCode: language,
          name: selectedVoice.name,
          ssmlGender: selectedVoice.gender,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speed,
          pitch: pitch,
          volumeGainDb: volume,
          effectsProfileId: ['headphone-class-device'],
          sampleRateHertz: 24000, // High quality audio
        },
      };

      const [response] = await this.ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from TTS service');
      }

      // Convert to ArrayBuffer
      let audioBuffer: ArrayBuffer;
      if (typeof response.audioContent === 'string') {
        // If it's a base64 string, decode it
        audioBuffer = Buffer.from(response.audioContent, 'base64').buffer;
      } else if (response.audioContent instanceof Uint8Array) {
        const slicedBuffer = response.audioContent.buffer.slice(
          response.audioContent.byteOffset,
          response.audioContent.byteOffset + response.audioContent.byteLength
        );
        audioBuffer = slicedBuffer instanceof ArrayBuffer ? slicedBuffer : new ArrayBuffer(slicedBuffer.byteLength);
        if (!(slicedBuffer instanceof ArrayBuffer)) {
          // Copy data if it's a SharedArrayBuffer
          const view = new Uint8Array(audioBuffer);
          view.set(new Uint8Array(slicedBuffer));
        }
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(response.audioContent)) {
        const buf: Buffer = response.audioContent as Buffer;
        audioBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      } else {
        throw new Error('Unknown audioContent type');
      }

      // Cache the result
      this.setCachedAudio(cacheKey, audioBuffer);

      const processingTime = Date.now() - startTime;

      return {
        audioBuffer,
        audioFormat: 'MP3',
        language,
        voice: selectedVoice.name,
        translatedText,
        originalText: enableTranslation ? text : undefined,
        processingTime
      };

    } catch (error: any) {
      console.error('Enhanced TTS error:', error);
      throw new Error(`Enhanced TTS failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Intelligent voice selection based on preferences and availability
   */
  private async selectOptimalVoice(
    language: string,
    preferredVoice?: string,
    gender: 'MALE' | 'FEMALE' = 'FEMALE',
    quality: 'Neural2' | 'Wavenet' | 'Standard' = 'Neural2'
  ): Promise<VoiceConfig> {
    // If specific voice is requested, try to use it
    if (preferredVoice) {
      const voices = VOICE_MAPPING[language]?.voices || [];
      const specificVoice = voices.find(v => v.name === preferredVoice);
      if (specificVoice) {
        return specificVoice;
      }
    }

    // Get best voice for the language
    const bestVoice = getBestVoiceForLanguage(language, gender, quality);
    if (bestVoice) {
      return bestVoice;
    }

    // Fallback to default voice
    const defaultVoiceName = getDefaultVoice(language);
    const voices = VOICE_MAPPING[language]?.voices || [];
    const defaultVoice = voices.find(v => v.name === defaultVoiceName);
    
    if (defaultVoice) {
      return defaultVoice;
    }

    // Last resort fallback
    const fallbackVoiceName = getFallbackVoice(language);
    const fallbackVoice = voices.find(v => v.name === fallbackVoiceName);
    
    if (fallbackVoice) {
      return fallbackVoice;
    }

    // Ultimate fallback - return first available voice
    if (voices.length > 0) {
      return voices[0];
    }

    throw new Error(`No voices available for language: ${language}`);
  }

  /**
   * Get available voices for a language
   */
  public async getAvailableVoices(language: string): Promise<VoiceConfig[]> {
    // Check cache first
    if (this.voiceCache.has(language)) {
      return this.voiceCache.get(language)!;
    }

    try {
      // Get voices from our mapping
      const voices = VOICE_MAPPING[language]?.voices || [];
      
      // Cache the result
      this.voiceCache.set(language, voices);
      
      return voices;
    } catch (error) {
      console.error('Error getting voices:', error);
      return [];
    }
  }

  /**
   * Get all supported languages
   */
  public getSupportedLanguages(): string[] {
    return Object.keys(VOICE_MAPPING);
  }

  /**
   * Preload voices for better performance
   */
  public async preloadVoices(languages: string[]): Promise<void> {
    const promises = languages.map(async (lang) => {
      if (isLanguageSupported(lang)) {
        await this.getAvailableVoices(lang);
      }
    });
    
    await Promise.allSettled(promises);
  }

  /**
   * Generate cache key for audio
   */
  private generateCacheKey(
    text: string, 
    language: string, 
    voice?: string, 
    gender?: string, 
    quality?: string
  ): string {
    const textHash = this.simpleHash(text);
    return `${language}_${voice || 'auto'}_${gender || 'auto'}_${quality || 'auto'}_${textHash}`;
  }

  /**
   * Simple hash function for text
   */
  private simpleHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached audio if available and not expired
   */
  private getCachedAudio(cacheKey: string): ArrayBuffer | null {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp || Date.now() - timestamp > this.CACHE_TTL) {
      this.audioCache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
      return null;
    }
    return this.audioCache.get(cacheKey) || null;
  }

  /**
   * Set cached audio with timestamp
   */
  private setCachedAudio(cacheKey: string, audioBuffer: ArrayBuffer): void {
    this.audioCache.set(cacheKey, audioBuffer);
    this.cacheTimestamps.set(cacheKey, Date.now());
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.CACHE_TTL) {
        this.audioCache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  public clearCache(): void {
    this.audioCache.clear();
    this.cacheTimestamps.clear();
    this.voiceCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    audioCacheSize: number;
    voiceCacheSize: number;
    totalCacheSize: number;
  } {
    return {
      audioCacheSize: this.audioCache.size,
      voiceCacheSize: this.voiceCache.size,
      totalCacheSize: this.audioCache.size + this.voiceCache.size
    };
  }

  /**
   * Create SSML with enhanced features
   */
  public createEnhancedSSML(
    text: string,
    options: {
      pause?: number;
      emphasis?: string[];
      break?: number;
      speed?: number;
      voice?: string;
      language?: string;
    } = {}
  ): string {
    const { pause = 0, emphasis = [], break: breakTime = 0, speed = 1.0, voice, language } = options;

    let ssml = `<speak>`;
    
    if (voice && language) {
      ssml += `<voice name="${voice}" language="${language}">`;
    }
    
    if (speed !== 1.0) {
      ssml += `<prosody rate="${speed}">`;
    }

    if (emphasis.length > 0) {
      emphasis.forEach(word => {
        text = text.replace(new RegExp(word, 'gi'), `<emphasis level="strong">${word}</emphasis>`);
      });
    }

    ssml += text;

    if (speed !== 1.0) {
      ssml += `</prosody>`;
    }

    if (voice && language) {
      ssml += `</voice>`;
    }

    if (breakTime > 0) {
      ssml += `<break time="${breakTime}ms"/>`;
    }

    if (pause > 0) {
      ssml += `<break time="${pause}ms"/>`;
    }

    ssml += `</speak>`;

    return ssml;
  }

  /**
   * Synthesize SSML with enhanced features
   */
  public async synthesizeSSML(
    ssml: string,
    options: EnhancedTTSOptions = {}
  ): Promise<EnhancedTTSResult> {
    const startTime = Date.now();
    
    try {
      const {
        language = 'en-IN',
        voice,
        gender = 'FEMALE',
        quality = 'Neural2',
        speed = 1.0,
        pitch = 0.0,
        volume = 1.0
      } = options;

      // Select optimal voice
      const selectedVoice = await this.selectOptimalVoice(language, voice, gender, quality);

      const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { ssml },
        voice: {
          languageCode: language,
          name: selectedVoice.name,
          ssmlGender: selectedVoice.gender,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speed,
          pitch: pitch,
          volumeGainDb: volume,
          effectsProfileId: ['headphone-class-device'],
          sampleRateHertz: 24000,
        },
      };

      const [response] = await this.ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from TTS service');
      }

      let audioBuffer: ArrayBuffer;
      if (typeof response.audioContent === 'string') {
        audioBuffer = Buffer.from(response.audioContent, 'base64').buffer;
      } else if (response.audioContent instanceof Uint8Array) {
        const slicedBuffer = response.audioContent.buffer.slice(
          response.audioContent.byteOffset,
          response.audioContent.byteOffset + response.audioContent.byteLength
        );
        audioBuffer = slicedBuffer instanceof ArrayBuffer ? slicedBuffer : new ArrayBuffer(slicedBuffer.byteLength);
        if (!(slicedBuffer instanceof ArrayBuffer)) {
          const view = new Uint8Array(audioBuffer);
          view.set(new Uint8Array(slicedBuffer));
        }
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(response.audioContent)) {
        const buf: Buffer = response.audioContent as Buffer;
        audioBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      } else {
        throw new Error('Unknown audioContent type');
      }

      return {
        audioBuffer,
        audioFormat: 'MP3',
        language,
        voice: selectedVoice.name,
        processingTime: Date.now() - startTime
      };

    } catch (error : any) {
      console.error('Enhanced SSML synthesis error:', error);
      throw new Error(`Enhanced SSML synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
