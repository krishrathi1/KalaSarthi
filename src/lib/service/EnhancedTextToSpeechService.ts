import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { google } from '@google-cloud/text-to-speech/build/protos/protos';

export interface EnhancedTextToSpeechOptions {
  language?: string;
  voice?: string;
  gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speed?: number;
  pitch?: number;
  volume?: number;
  audioEncoding?: 'LINEAR16' | 'MP3' | 'OGG_OPUS' | 'MULAW' | 'ALAW';
  sampleRateHertz?: number;
  effectsProfile?: string[];
  enableCache?: boolean;
  cacheKey?: string;
  ssmlOptions?: {
    emphasis?: Array<{ text: string; level: 'strong' | 'moderate' | 'reduced' }>;
    breaks?: Array<{ position: number; time: string }>;
    prosody?: {
      rate?: string;
      pitch?: string;
      volume?: string;
    };
    sayAs?: Array<{ text: string; interpretAs: string; format?: string }>;
  };
}

export interface EnhancedTextToSpeechResult {
  audioBuffer: ArrayBuffer;
  audioFormat: string;
  language: string;
  voice: string;
  duration: number;
  cached: boolean;
  audioUrl?: string;
  metadata: {
    textLength: number;
    processingTime: number;
    voiceQuality: 'standard' | 'wavenet' | 'neural2';
    estimatedCost: number;
  };
}

export interface VoiceInfo {
  name: string;
  languageCode: string;
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  naturalSampleRateHertz: number;
  voiceType: 'standard' | 'wavenet' | 'neural2';
  quality: number; // 1-10 scale
}

export class EnhancedTextToSpeechService {
  private static instance: EnhancedTextToSpeechService;
  private ttsClient: TextToSpeechClient;
  private audioCache: Map<string, { buffer: ArrayBuffer; timestamp: number; metadata: any }> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 100; // Maximum cached items

  private constructor() {
    this.ttsClient = new TextToSpeechClient({
      keyFilename: 'google-credentials.json',
      projectId: 'gen-lang-client-0314311341'
    });

    // Clean cache periodically
    setInterval(() => this.cleanCache(), 60 * 60 * 1000); // Every hour
  }

  public static getInstance(): EnhancedTextToSpeechService {
    if (!EnhancedTextToSpeechService.instance) {
      EnhancedTextToSpeechService.instance = new EnhancedTextToSpeechService();
    }
    return EnhancedTextToSpeechService.instance;
  }

  /**
   * Synthesize speech with enhanced features
   */
  public async synthesizeSpeech(
    text: string,
    options: EnhancedTextToSpeechOptions = {}
  ): Promise<EnhancedTextToSpeechResult> {
    const startTime = Date.now();

    try {
      const {
        language = 'en-US',
        voice,
        gender = 'FEMALE',
        speed = 1.0,
        pitch = 0.0,
        volume = 0.0,
        audioEncoding = 'MP3',
        sampleRateHertz = 24000,
        effectsProfile = ['headphone-class-device'],
        enableCache = true,
        cacheKey,
        ssmlOptions
      } = options;

      // Generate cache key
      const finalCacheKey = cacheKey || this.generateCacheKey(text, options);

      // Check cache first
      if (enableCache) {
        const cached = this.getFromCache(finalCacheKey);
        if (cached) {
          return {
            ...cached.metadata,
            audioBuffer: cached.buffer,
            cached: true
          };
        }
      }

      // Get optimal voice for the language and gender
      const selectedVoice = voice || await this.getOptimalVoice(language, gender);

      // Convert text to SSML if options are provided
      const inputText = ssmlOptions ? this.createSSML(text, ssmlOptions) : text;
      const isSSML = ssmlOptions !== undefined;

      // Build synthesis request
      const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: isSSML ? { ssml: inputText } : { text: inputText },
        voice: {
          languageCode: language,
          name: selectedVoice,
          ssmlGender: gender,
        },
        audioConfig: {
          audioEncoding: audioEncoding,
          speakingRate: Math.max(0.25, Math.min(4.0, speed)),
          pitch: Math.max(-20.0, Math.min(20.0, pitch)),
          volumeGainDb: Math.max(-96.0, Math.min(16.0, volume)),
          sampleRateHertz,
          effectsProfileId: effectsProfile,
        },
      };

      const [response] = await this.ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from TTS service');
      }

      // Convert to ArrayBuffer
      const audioBuffer = this.convertToArrayBuffer(response.audioContent);

      // Calculate duration (approximate)
      const duration = this.estimateAudioDuration(audioBuffer, sampleRateHertz, audioEncoding);

      // Get voice quality info
      const voiceInfo = await this.getVoiceInfo(selectedVoice || '', language);

      // Calculate processing time and estimated cost
      const processingTime = Date.now() - startTime;
      const estimatedCost = this.calculateEstimatedCost(text.length, voiceInfo?.voiceType || 'standard');

      const result: EnhancedTextToSpeechResult = {
        audioBuffer,
        audioFormat: audioEncoding.toLowerCase(),
        language,
        voice: selectedVoice || '',
        duration,
        cached: false,
        metadata: {
          textLength: text.length,
          processingTime,
          voiceQuality: voiceInfo?.voiceType || 'standard',
          estimatedCost
        }
      };

      // Cache the result
      if (enableCache) {
        this.addToCache(finalCacheKey, audioBuffer, result);
      }

      return result;

    } catch (error) {
      console.error('Enhanced text-to-speech error:', error);
      throw new Error(`Failed to synthesize speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Synthesize SSML directly
   */
  public async synthesizeSSML(
    ssml: string,
    options: Omit<EnhancedTextToSpeechOptions, 'ssmlOptions'> = {}
  ): Promise<EnhancedTextToSpeechResult> {
    const startTime = Date.now();

    try {
      const {
        language = 'en-US',
        voice,
        gender = 'FEMALE',
        speed = 1.0,
        pitch = 0.0,
        volume = 0.0,
        audioEncoding = 'MP3',
        sampleRateHertz = 24000,
        effectsProfile = ['headphone-class-device'],
        enableCache = true,
        cacheKey
      } = options;

      // Generate cache key
      const finalCacheKey = cacheKey || this.generateCacheKey(ssml, options);

      // Check cache first
      if (enableCache) {
        const cached = this.getFromCache(finalCacheKey);
        if (cached) {
          return {
            ...cached.metadata,
            audioBuffer: cached.buffer,
            cached: true
          };
        }
      }

      // Get optimal voice
      const selectedVoice = voice || await this.getOptimalVoice(language, gender);

      const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { ssml },
        voice: {
          languageCode: language,
          name: selectedVoice,
          ssmlGender: gender,
        },
        audioConfig: {
          audioEncoding: audioEncoding,
          speakingRate: Math.max(0.25, Math.min(4.0, speed)),
          pitch: Math.max(-20.0, Math.min(20.0, pitch)),
          volumeGainDb: Math.max(-96.0, Math.min(16.0, volume)),
          sampleRateHertz,
          effectsProfileId: effectsProfile,
        },
      };

      const [response] = await this.ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from TTS service');
      }

      const audioBuffer = this.convertToArrayBuffer(response.audioContent);
      const duration = this.estimateAudioDuration(audioBuffer, sampleRateHertz, audioEncoding);
      const voiceInfo = await this.getVoiceInfo(selectedVoice || '', language);
      const processingTime = Date.now() - startTime;

      // Extract text length from SSML for cost calculation
      const textLength = ssml.replace(/<[^>]*>/g, '').length;
      const estimatedCost = this.calculateEstimatedCost(textLength, voiceInfo?.voiceType || 'standard');

      const result: EnhancedTextToSpeechResult = {
        audioBuffer,
        audioFormat: audioEncoding.toLowerCase(),
        language,
        voice: selectedVoice || '',
        duration,
        cached: false,
        metadata: {
          textLength,
          processingTime,
          voiceQuality: voiceInfo?.voiceType || 'standard',
          estimatedCost
        }
      };

      // Cache the result
      if (enableCache) {
        this.addToCache(finalCacheKey, audioBuffer, result);
      }

      return result;

    } catch (error) {
      console.error('SSML synthesis error:', error);
      throw new Error(`Failed to synthesize SSML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available voices with quality information
   */
  public async getAvailableVoices(language?: string): Promise<VoiceInfo[]> {
    try {
      const [voices] = await this.ttsClient.listVoices({
        languageCode: language
      });

      return (voices.voices || []).map(voice => ({
        name: voice.name || '',
        languageCode: voice.languageCodes?.[0] || '',
        gender: (voice.ssmlGender as 'MALE' | 'FEMALE' | 'NEUTRAL') || 'NEUTRAL',
        naturalSampleRateHertz: voice.naturalSampleRateHertz || 22050,
        voiceType: this.getVoiceType(voice.name || ''),
        quality: this.getVoiceQuality(voice.name || '')
      }));

    } catch (error) {
      console.error('Get voices error:', error);
      return [];
    }
  }

  /**
   * Get optimal voice for language and gender
   */
  public async getOptimalVoice(language: string, gender: 'MALE' | 'FEMALE' | 'NEUTRAL' = 'FEMALE'): Promise<string> {
    // First try predefined optimal voices
    const predefinedVoice = this.getPredefinedOptimalVoice(language, gender);
    if (predefinedVoice) {
      return predefinedVoice;
    }

    // Fallback to API lookup
    try {
      const voices = await this.getAvailableVoices(language);

      // Filter by gender and sort by quality
      const filteredVoices = voices
        .filter(v => v.gender === gender)
        .sort((a, b) => b.quality - a.quality);

      if (filteredVoices.length > 0) {
        return filteredVoices[0].name;
      }

      // If no voices found for specific gender, get any voice for the language
      const anyVoices = voices.sort((a, b) => b.quality - a.quality);
      if (anyVoices.length > 0) {
        return anyVoices[0].name;
      }

    } catch (error) {
      console.error('Error getting optimal voice:', error);
    }

    // Final fallback
    return this.getFallbackVoice(language, gender);
  }

  /**
   * Create SSML from text and options
   */
  public createSSML(text: string, options: NonNullable<EnhancedTextToSpeechOptions['ssmlOptions']>): string {
    let ssml = '<speak>';
    let processedText = text;

    // Apply prosody if specified
    if (options.prosody) {
      const { rate, pitch, volume } = options.prosody;
      const prosodyAttrs = [];
      if (rate) prosodyAttrs.push(`rate="${rate}"`);
      if (pitch) prosodyAttrs.push(`pitch="${pitch}"`);
      if (volume) prosodyAttrs.push(`volume="${volume}"`);

      if (prosodyAttrs.length > 0) {
        ssml += `<prosody ${prosodyAttrs.join(' ')}>`;
      }
    }

    // Apply emphasis
    if (options.emphasis) {
      options.emphasis.forEach(({ text: emphasisText, level }) => {
        const regex = new RegExp(this.escapeRegExp(emphasisText), 'gi');
        processedText = processedText.replace(regex, `<emphasis level="${level}">${emphasisText}</emphasis>`);
      });
    }

    // Apply say-as interpretations
    if (options.sayAs) {
      options.sayAs.forEach(({ text: sayAsText, interpretAs, format }) => {
        const regex = new RegExp(this.escapeRegExp(sayAsText), 'gi');
        const formatAttr = format ? ` format="${format}"` : '';
        processedText = processedText.replace(regex, `<say-as interpret-as="${interpretAs}"${formatAttr}>${sayAsText}</say-as>`);
      });
    }

    ssml += processedText;

    // Add breaks
    if (options.breaks) {
      options.breaks.forEach(({ position, time }) => {
        const beforeText = processedText.substring(0, position);
        const afterText = processedText.substring(position);
        processedText = beforeText + `<break time="${time}"/>` + afterText;
      });
    }

    // Close prosody if opened
    if (options.prosody) {
      ssml += '</prosody>';
    }

    ssml += '</speak>';
    return ssml;
  }

  /**
   * Clear audio cache
   */
  public clearCache(): void {
    this.audioCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; totalSize: number; hitRate: number } {
    const totalSize = Array.from(this.audioCache.values())
      .reduce((sum, item) => sum + item.buffer.byteLength, 0);

    return {
      size: this.audioCache.size,
      totalSize,
      hitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }

  // Private helper methods

  private generateCacheKey(text: string, options: EnhancedTextToSpeechOptions): string {
    const keyData = {
      text: text.substring(0, 100), // Limit text length in key
      language: options.language,
      voice: options.voice,
      gender: options.gender,
      speed: options.speed,
      pitch: options.pitch,
      audioEncoding: options.audioEncoding
    };

    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private getFromCache(key: string): { buffer: ArrayBuffer; metadata: any } | null {
    const cached = this.audioCache.get(key);
    if (!cached) return null;

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.audioCache.delete(key);
      return null;
    }

    return { buffer: cached.buffer, metadata: cached.metadata };
  }

  private addToCache(key: string, buffer: ArrayBuffer, metadata: any): void {
    // Remove oldest entries if cache is full
    if (this.audioCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.audioCache.keys())[0];
      this.audioCache.delete(oldestKey);
    }

    this.audioCache.set(key, {
      buffer,
      timestamp: Date.now(),
      metadata
    });
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.audioCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.audioCache.delete(key);
      }
    }
  }

  private convertToArrayBuffer(audioContent: string | Uint8Array): ArrayBuffer {
    if (typeof audioContent === 'string') {
      const buffer = Buffer.from(audioContent, 'base64');
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } else {
      const buffer = audioContent as Uint8Array;
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
  }

  private estimateAudioDuration(audioBuffer: ArrayBuffer, sampleRate: number, encoding: string): number {
    // Simplified duration estimation based on buffer size
    // This is approximate - actual duration would require audio analysis
    const bytesPerSecond = encoding === 'LINEAR16' ? sampleRate * 2 : sampleRate / 8; // Rough estimate
    return audioBuffer.byteLength / bytesPerSecond;
  }

  private getVoiceType(voiceName: string): 'standard' | 'wavenet' | 'neural2' {
    if (voiceName.includes('Neural2')) return 'neural2';
    if (voiceName.includes('Wavenet')) return 'wavenet';
    return 'standard';
  }

  private getVoiceQuality(voiceName: string): number {
    const type = this.getVoiceType(voiceName);
    switch (type) {
      case 'neural2': return 10;
      case 'wavenet': return 8;
      case 'standard': return 6;
      default: return 5;
    }
  }

  private async getVoiceInfo(voiceName: string, language: string): Promise<VoiceInfo | null> {
    try {
      const voices = await this.getAvailableVoices(language);
      return voices.find(v => v.name === voiceName) || null;
    } catch {
      return null;
    }
  }

  private calculateEstimatedCost(textLength: number, voiceType: 'standard' | 'wavenet' | 'neural2'): number {
    // Simplified cost calculation based on Google Cloud TTS pricing
    const baseRate = voiceType === 'neural2' ? 0.000016 : voiceType === 'wavenet' ? 0.000016 : 0.000004;
    return textLength * baseRate;
  }

  private getPredefinedOptimalVoice(language: string, gender: 'MALE' | 'FEMALE' | 'NEUTRAL'): string | null {
    const voiceMap: Record<string, Record<string, string>> = {
      'en-US': {
        'MALE': 'en-US-Neural2-J',
        'FEMALE': 'en-US-Neural2-F',
        'NEUTRAL': 'en-US-Neural2-F'
      },
      'en-GB': {
        'MALE': 'en-GB-Neural2-B',
        'FEMALE': 'en-GB-Neural2-A',
        'NEUTRAL': 'en-GB-Neural2-A'
      },
      'hi-IN': {
        'MALE': 'hi-IN-Neural2-B',
        'FEMALE': 'hi-IN-Neural2-A',
        'NEUTRAL': 'hi-IN-Neural2-A'
      }
    };

    return voiceMap[language]?.[gender] || null;
  }

  private getFallbackVoice(language: string, gender: 'MALE' | 'FEMALE' | 'NEUTRAL'): string {
    // Fallback voices for common languages
    const fallbacks: Record<string, string> = {
      'en-US': gender === 'MALE' ? 'en-US-Standard-B' : 'en-US-Standard-C',
      'en-GB': gender === 'MALE' ? 'en-GB-Standard-B' : 'en-GB-Standard-A',
      'hi-IN': gender === 'MALE' ? 'hi-IN-Standard-B' : 'hi-IN-Standard-A'
    };

    return fallbacks[language] || 'en-US-Standard-C';
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}