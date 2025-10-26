import { GoogleGenerativeAI } from '@google/generative-ai';
// Google Cloud clients will be used in API routes (server-side only)
// import { TextToSpeechClient } from '@google-cloud/text-to-speech';
// import { SpeechClient } from '@google-cloud/speech';

export interface SpeechToTextOptions {
  language?: string;
  model?: 'gemini-pro' | 'gemini-pro-vision' | 'gemini-1.5-flash' | 'gemini-1.5-pro';
  temperature?: number;
}

export interface TextToSpeechOptions {
  language?: string;
  voice?: string;
  speed?: number;
  pitch?: number;
}

export interface SpeechResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

export class GeminiSpeechService {
  private static instance: GeminiSpeechService;
  private genAI: GoogleGenerativeAI;
  private model: any;
  private googleCloudAvailable: boolean = false;
  private googleCloudChecked: boolean = false;

  private constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;

    console.log('🔧 Initializing GeminiSpeechService:', {
      hasApiKey: !!apiKey,
      nodeEnv: process.env.NODE_ENV,
      isClient: typeof window !== 'undefined'
    });

    if (!apiKey) {
      console.warn('❌ GOOGLE_AI_API_KEY not found. Gemini features will use fallback implementations.');
      this.genAI = null as any;
      this.model = null as any;
      // Still check Google Cloud availability even without Gemini
      this.checkGoogleCloudAvailability();
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Use the correct model name for Gemini 1.5
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Gemini AI initialized successfully');

      // Don't check Google Cloud availability immediately - do it lazily on first use
      console.log('✅ Gemini AI initialized successfully - Google Cloud availability will be checked on first use');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error);
      this.genAI = null as any;
      this.model = null as any;
    }
  }

  private async checkGoogleCloudAvailability(): Promise<void> {
    // Delay initial check to allow APIs to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Checking Google Cloud API availability (attempt ${attempt}/${maxRetries})...`);

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );

        // Test TTS API availability with timeout
        console.log('Testing TTS API...');
        const ttsPromise = fetch('/api/google-cloud-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'test', language: 'en-US' })
        });

        const ttsResponse = await Promise.race([ttsPromise, timeoutPromise]) as Response;

        console.log('TTS API response:', {
          ok: ttsResponse.ok,
          status: ttsResponse.status,
          statusText: ttsResponse.statusText
        });

        // Test STT API availability with timeout
        console.log('Testing STT API...');
        const sttPromise = fetch('/api/google-cloud-stt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioData: 'dGVzdA==', language: 'en-US' }) // base64 'test'
        });

        const sttResponse = await Promise.race([sttPromise, timeoutPromise]) as Response;

        console.log('STT API response:', {
          ok: sttResponse.ok,
          status: sttResponse.status,
          statusText: sttResponse.statusText
        });

        this.googleCloudAvailable = ttsResponse.ok && sttResponse.ok;

        if (this.googleCloudAvailable) {
          console.log('✅ Google Cloud TTS and STT services available via API routes');
          console.log('🎵 Natural voice synthesis and advanced speech recognition enabled');
          return; // Success, exit retry loop
        } else {
          console.warn(`❌ Google Cloud services not available (attempt ${attempt}/${maxRetries})`);
          console.warn('TTS available:', ttsResponse.ok, 'STT available:', sttResponse.ok);

          // Try to get error details
          if (!ttsResponse.ok) {
            try {
              const ttsError = await ttsResponse.text();
              console.error('TTS API error:', ttsError);
            } catch (e) {
              console.error('Could not read TTS error response');
            }
          }

          if (!sttResponse.ok) {
            try {
              const sttError = await sttResponse.text();
              console.error('STT API error:', sttError);
            } catch (e) {
              console.error('Could not read STT error response');
            }
          }

          // If not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            console.log(`⏳ Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      } catch (error) {
        console.error(`❌ Failed to check Google Cloud availability (attempt ${attempt}/${maxRetries}):`, error);

        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // If we get here, all attempts failed
    console.error('❌ All attempts to check Google Cloud availability failed');
    this.googleCloudAvailable = false;
  }

  public static getInstance(): GeminiSpeechService {
    if (!GeminiSpeechService.instance) {
      GeminiSpeechService.instance = new GeminiSpeechService();
    }
    return GeminiSpeechService.instance;
  }

  /**
   * Ensure Google Cloud availability is checked
   */
  private async ensureGoogleCloudChecked(): Promise<void> {
    if (!this.googleCloudChecked) {
      this.googleCloudChecked = true;
      await this.checkGoogleCloudAvailability();
    }
  }

  /**
   * Get current Google Cloud availability status
   */
  public isGoogleCloudAvailable(): boolean {
    return this.googleCloudAvailable;
  }

  /**
   * Force re-check Google Cloud availability
   */
  public async recheckGoogleCloudAvailability(): Promise<boolean> {
    this.googleCloudChecked = false; // Reset the flag to force recheck
    await this.ensureGoogleCloudChecked();
    return this.googleCloudAvailable;
  }

  /**
   * Convert speech audio to text using Google Cloud Speech-to-Text via API
   */
  public async speechToText(
    audioBuffer: ArrayBuffer,
    options: SpeechToTextOptions = {}
  ): Promise<SpeechResult> {
    const { language = 'en-US' } = options;

    // Ensure Google Cloud availability is checked
    await this.ensureGoogleCloudChecked();

    console.log('🎤 speechToText called:', {
      audioBufferSize: audioBuffer.byteLength,
      language,
      googleCloudAvailable: this.googleCloudAvailable,
      googleCloudChecked: this.googleCloudChecked,
      hasGeminiAI: !!this.genAI,
      hasModel: !!this.model
    });

    // Try Google Cloud STT API first
    if (this.googleCloudAvailable) {
      try {
        console.log('🎤 Using Google Cloud STT API for language:', language);

        // Convert ArrayBuffer to base64 for API transmission
        const audioBase64 = this.arrayBufferToBase64(audioBuffer);

        const response = await fetch('/api/google-cloud-stt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: audioBase64,
            language: 'hi-IN', // Use Hindi as primary language for better detection
            sampleRate: 48000, // Pass the correct sample rate for WEBM OPUS
            enableMultilingual: true // Enable multilingual support
          })
        });

        console.log('🎤 Google Cloud STT response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        });

        if (response.ok) {
          const result = await response.json();
          console.log('🌍 STT detected language:', result.detectedLanguage || result.language);
          return {
            text: result.text || '',
            confidence: result.confidence || 0.9,
            language: result.detectedLanguage || result.language || language,
            duration: audioBuffer.byteLength / 32000 // 16kHz * 2 bytes per sample
          };
        } else {
          const errorText = await response.text();
          console.error('❌ Google Cloud STT API error:', errorText);
        }
      } catch (error) {
        console.error('❌ Google Cloud STT API failed:', error);
      }
    } else {
      console.warn('⚠️ Google Cloud STT not available, using fallback. Reason: googleCloudAvailable =', this.googleCloudAvailable);
    }

    // Fallback to Gemini/Web Speech API
    console.log('🔄 Falling back to Gemini/Web Speech API');
    return this.fallbackSpeechToTextGemini(audioBuffer, options);
  }

  /**
   * Fallback speech-to-text using Gemini AI
   */
  private async fallbackSpeechToTextGemini(
    audioBuffer: ArrayBuffer,
    options: SpeechToTextOptions = {}
  ): Promise<SpeechResult> {
    try {
      const { language = 'en-US' } = options;

      // Check if Gemini is available
      if (!this.genAI || !this.model) {
        console.warn('❌ Gemini STT not available, using basic fallback. Reason:', {
          hasGenAI: !!this.genAI,
          hasModel: !!this.model,
          apiKeyAvailable: !!(process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY)
        });

        // Basic fallback: Return a placeholder text instead of empty
        return {
          text: 'Audio recorded successfully. Please use text input for now.',
          confidence: 0.5,
          language,
          duration: audioBuffer.byteLength / 16000
        };
      }

      // Convert audio buffer to base64
      const audioBase64 = this.arrayBufferToBase64(audioBuffer);

      // Create prompt for speech-to-text
      const prompt = `
You are a speech-to-text transcription service. Convert the following audio to text.
Language: ${language}
Please provide only the transcribed text without any additional commentary.

Audio data: ${audioBase64}
      `;

      // Use Gemini to process the audio with retry logic for overload errors
      let result;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          result = await this.model.generateContent({
            contents: [{
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'audio/wav',
                    data: audioBase64
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1000,
            }
          });
          break; // Success, exit retry loop
        } catch (error: any) {
          console.error(`Gemini STT attempt ${retryCount + 1} failed:`, error);

          // Check if it's a quota/overload error
          if (error instanceof Error ? error.message : String(error)?.includes('429') || error instanceof Error ? error.message : String(error)?.includes('503') || error instanceof Error ? error.message : String(error)?.includes('overloaded')) {
            retryCount++;
            if (retryCount < maxRetries) {
              // Wait before retry (exponential backoff)
              const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
              console.log(`Retrying in ${waitTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }

          // If not a retryable error or max retries reached, throw
          throw error;
        }
      }

      if (!result) {
        throw new Error('Failed to get result from Gemini after retries');
      }

      const response = await result.response;
      const text = response.text().trim();

      return {
        text,
        confidence: 0.9, // Gemini doesn't provide confidence scores
        language,
        duration: audioBuffer.byteLength / 16000 // Rough estimate for 16kHz audio
      };

    } catch (error) {
      console.error('Gemini STT error after retries:', error);

      // Check if it's a network-related error
      const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
      const isNetworkError = errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND');

      if (isNetworkError) {
        // Don't use Web Speech API for network errors as it will likely fail too
        return {
          text: 'Speech recognition temporarily unavailable due to network issues. Please check your internet connection and try again.',
          confidence: 0.1,
          language: options.language || 'en-US',
          duration: 0
        };
      }

      // Skip Web Speech API to avoid network errors
      // Return a helpful message instead
      return {
        text: 'Speech recognition failed. Please try again or use text input instead.',
        confidence: 0.1,
        language: options.language || 'en-US',
        duration: 0
      };
    }
  }

  /**
   * Web Speech API fallback for speech-to-text
   */
  private async fallbackSpeechToTextWebAPI(language: string): Promise<SpeechResult> {
    return new Promise((resolve) => {
      // Web Speech API fallback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        resolve({
          text: 'Speech recognition not supported in this browser.',
          confidence: 0.1,
          language,
          duration: 0
        });
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;

      let hasResult = false;
      let timeoutId: NodeJS.Timeout;

      // Set a timeout to prevent hanging
      timeoutId = setTimeout(() => {
        if (!hasResult) {
          recognition.stop();
          resolve({
            text: 'Speech recognition timed out. Please try again.',
            confidence: 0.1,
            language,
            duration: 0
          });
        }
      }, 10000); // 10 second timeout

      recognition.onresult = (event: any) => {
        hasResult = true;
        clearTimeout(timeoutId);
        const result = event.results[0];
        if (result && result[0]) {
          resolve({
            text: result[0].transcript,
            confidence: result[0].confidence || 0.8,
            language,
            duration: 0
          });
        } else {
          resolve({
            text: 'No speech detected. Please try again.',
            confidence: 0.1,
            language,
            duration: 0
          });
        }
      };

      recognition.onerror = (event: any) => {
        hasResult = true;
        clearTimeout(timeoutId);
        console.error('Speech recognition error:', event.error);

        // Handle specific error types
        let errorMessage = 'Speech recognition failed. Please try again.';
        switch (event.error) {
          case 'network':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please speak clearly and try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not found. Please check your microphone and try again.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. Please try again later.';
            break;
          default:
            errorMessage = `Speech recognition failed: ${event.error}. Please try again.`;
        }

        resolve({
          text: errorMessage,
          confidence: 0.1,
          language,
          duration: 0
        });
      };

      recognition.onend = () => {
        clearTimeout(timeoutId);
        // If no result was captured after recognition ends, provide fallback
        if (!hasResult) {
          setTimeout(() => {
            resolve({
              text: 'No speech detected. Please try again.',
              confidence: 0.1,
              language,
              duration: 0
            });
          }, 100);
        }
      };

      // Start recognition
      try {
        recognition.start();
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Failed to start speech recognition:', error);
        resolve({
          text: 'Speech recognition failed to start. Please try again.',
          confidence: 0.1,
          language,
          duration: 0
        });
      }
    });
  }

  /**
   * Convert text to speech using Enhanced TTS API with intelligent voice selection
   */
  public async textToSpeech(
    text: string,
    options: TextToSpeechOptions = {}
  ): Promise<ArrayBuffer> {
    const {
      language = 'en-US',
      voice = 'en-US-Neural2-D',
      speed = 1.0,
      pitch = 0.0
    } = options;

    // Try Enhanced TTS API first
    if (this.googleCloudAvailable) {
      try {
        console.log('🎵 Using Enhanced TTS API for:', text.substring(0, 50) + '...');

        const response = await fetch('/api/tts/enhanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            language,
            voice,
            gender: 'FEMALE', // Default to female voice
            quality: 'Neural2', // Use Neural2 quality
            speed,
            pitch,
            volume: 1.0,
            enableTranslation: false
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.audio?.data) {
            // Convert base64 audio back to ArrayBuffer
            const audioBuffer = Uint8Array.from(atob(result.audio.data), c => c.charCodeAt(0));
            console.log('✅ Enhanced TTS synthesis successful');
            return audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength);
          }
        } else {
          const errorData = await response.json();
          console.warn('Enhanced TTS API failed:', errorData);
        }
      } catch (error) {
        console.warn('Enhanced TTS API failed, falling back to Web Speech API:', error);
      }
    }

    // Fallback to Web Speech API
    return this.fallbackTextToSpeech(text, { language, voice, speed, pitch });
  }

  /**
   * Fallback text-to-speech using Web Speech API
   */
  private async fallbackTextToSpeech(
    text: string,
    options: TextToSpeechOptions = {}
  ): Promise<ArrayBuffer> {
    const {
      language = 'en-US',
      voice,
      speed = 1.0,
      pitch = 1.0
    } = options;

    return new Promise((resolve, reject) => {
      // Check for browser support
      if (!('speechSynthesis' in window)) {
        reject(new Error('Text-to-speech not supported in this browser'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = speed;
      utterance.pitch = pitch;

      // Set voice if specified
      if (voice) {
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.name === voice || v.voiceURI === voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => {
        try {
          // Create a simple audio buffer (placeholder) with reasonable bounds
          const sampleRate = 44100;
          const maxDuration = 30; // Maximum 30 seconds to prevent huge buffers
          const estimatedDuration = Math.min(text.length * 0.1, maxDuration); // Rough estimate, capped
          const numSamples = Math.floor(sampleRate * estimatedDuration);
          const maxSamples = sampleRate * maxDuration; // Prevent excessive memory usage

          // Ensure we don't exceed reasonable bounds
          const safeNumSamples = Math.min(numSamples, maxSamples);
          const audioBuffer = new ArrayBuffer(safeNumSamples * 2); // 16-bit samples
          const view = new DataView(audioBuffer);

          // Fill with silence (placeholder) with bounds checking
          for (let i = 0; i < safeNumSamples; i++) {
            const offset = i * 2;
            if (offset + 1 < audioBuffer.byteLength) {
              view.setInt16(offset, 0, true);
            } else {
              break; // Prevent writing beyond buffer bounds
            }
          }

          resolve(audioBuffer);
        } catch (error) {
          console.error('Error creating audio buffer:', error);
          // Return a minimal buffer on error
          const minimalBuffer = new ArrayBuffer(1024);
          resolve(minimalBuffer);
        }
      };

      utterance.onerror = (event) => {
        reject(new Error(`TTS error: ${event.error}`));
      };

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Map language codes to Google Cloud format
   */
  private mapLanguageToGoogleCloud(language: string): string {
    const languageMap: { [key: string]: string } = {
      'en-US': 'en-US',
      'en-GB': 'en-GB',
      'hi-IN': 'hi-IN',
      'bn-IN': 'bn-IN',
      'te-IN': 'te-IN',
      'mr-IN': 'mr-IN',
      'ta-IN': 'ta-IN',
      'gu-IN': 'gu-IN',
      'kn-IN': 'kn-IN',
      'ml-IN': 'ml-IN',
      'pa-IN': 'pa-IN',
      'or-IN': 'or-IN',
      'as-IN': 'as-IN',
      'es-ES': 'es-ES',
      'fr-FR': 'fr-FR',
      'de-DE': 'de-DE',
      'it-IT': 'it-IT',
      'pt-BR': 'pt-BR',
      'ja-JP': 'ja-JP',
      'ko-KR': 'ko-KR',
      'zh-CN': 'cmn-CN',
      'zh-TW': 'cmn-TW'
    };

    return languageMap[language] || 'en-US';
  }

  /**
   * Get optimal voice for language
   */
  private getOptimalVoice(languageCode: string, requestedVoice?: string): string {
    // If a specific voice is requested and available, use it
    if (requestedVoice) {
      return requestedVoice;
    }

    // Default voices for different languages (Neural2 voices for natural sound)
    const defaultVoices: { [key: string]: string } = {
      'en-US': 'en-US-Neural2-D',
      'en-GB': 'en-GB-Neural2-D',
      'hi-IN': 'hi-IN-Neural2-D',
      'bn-IN': 'bn-IN-Neural2-D',
      'te-IN': 'te-IN-Neural2-D',
      'mr-IN': 'mr-IN-Neural2-D',
      'ta-IN': 'ta-IN-Neural2-D',
      'gu-IN': 'gu-IN-Neural2-D',
      'kn-IN': 'kn-IN-Neural2-D',
      'ml-IN': 'ml-IN-Neural2-D',
      'pa-IN': 'pa-IN-Neural2-D',
      'or-IN': 'or-IN-Neural2-D',
      'as-IN': 'as-IN-Neural2-D',
      'es-ES': 'es-ES-Neural2-F',
      'fr-FR': 'fr-FR-Neural2-D',
      'de-DE': 'de-DE-Neural2-D',
      'it-IT': 'it-IT-Neural2-D',
      'pt-BR': 'pt-BR-Neural2-C',
      'ja-JP': 'ja-JP-Neural2-D',
      'ko-KR': 'ko-KR-Neural2-C',
      'cmn-CN': 'cmn-CN-Neural2-D',
      'cmn-TW': 'cmn-TW-Neural2-D'
    };

    return defaultVoices[languageCode] || 'en-US-Neural2-D';
  }

  /**
   * Get supported languages for speech recognition
   */
  public getSupportedLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA',
      'hi-IN', 'bn-IN', 'te-IN', 'mr-IN', 'ta-IN',
      'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN',
      'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR',
      'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW'
    ];
  }

  /**
   * Get available voices for text-to-speech
   */
  public async getAvailableVoices(): Promise<any[]> {
    // If Google Cloud TTS is available, return predefined Google Cloud voices
    if (this.googleCloudAvailable) {
      // Return a list of common Google Cloud Neural2 voices
      return [
        { name: 'en-US-Neural2-D', languageCode: 'en-US', ssmlGender: 'MALE' },
        { name: 'en-US-Neural2-F', languageCode: 'en-US', ssmlGender: 'FEMALE' },
        { name: 'hi-IN-Neural2-D', languageCode: 'hi-IN', ssmlGender: 'MALE' },
        { name: 'hi-IN-Neural2-F', languageCode: 'hi-IN', ssmlGender: 'FEMALE' },
        { name: 'bn-IN-Neural2-D', languageCode: 'bn-IN', ssmlGender: 'MALE' },
        { name: 'te-IN-Neural2-D', languageCode: 'te-IN', ssmlGender: 'MALE' },
        { name: 'mr-IN-Neural2-D', languageCode: 'mr-IN', ssmlGender: 'MALE' },
        { name: 'ta-IN-Neural2-D', languageCode: 'ta-IN', ssmlGender: 'MALE' },
        { name: 'gu-IN-Neural2-D', languageCode: 'gu-IN', ssmlGender: 'MALE' },
        { name: 'kn-IN-Neural2-D', languageCode: 'kn-IN', ssmlGender: 'MALE' },
        { name: 'ml-IN-Neural2-D', languageCode: 'ml-IN', ssmlGender: 'MALE' },
        { name: 'pa-IN-Neural2-D', languageCode: 'pa-IN', ssmlGender: 'MALE' },
        { name: 'or-IN-Neural2-D', languageCode: 'or-IN', ssmlGender: 'MALE' },
        { name: 'as-IN-Neural2-D', languageCode: 'as-IN', ssmlGender: 'MALE' }
      ];
    }

    // Fallback to Web Speech API voices
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices.map(voice => ({
          name: voice.name,
          languageCode: voice.lang,
          ssmlGender: voice.name.includes('Female') ? 'FEMALE' : voice.name.includes('Male') ? 'MALE' : 'FEMALE'
        })));
      } else {
        // Wait for voices to load
        speechSynthesis.onvoiceschanged = () => {
          const webVoices = speechSynthesis.getVoices();
          resolve(webVoices.map(voice => ({
            name: voice.name,
            languageCode: voice.lang,
            ssmlGender: voice.name.includes('Female') ? 'FEMALE' : voice.name.includes('Male') ? 'MALE' : 'FEMALE'
          })));
        };
      }
    });
  }


  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Analyze user intent from natural language text
   */
  public async analyzeIntent(text: string, context: string = 'general'): Promise<any> {
    if (!this.genAI || !this.model) {
      throw new Error('Gemini AI not available');
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

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const jsonResponse = response.text().trim();

    try {
      // Handle Gemini's tendency to wrap JSON in markdown code blocks
      let cleanResponse = jsonResponse.trim();

      // Remove markdown code block wrappers if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Remove any leading/trailing whitespace
      cleanResponse = cleanResponse.trim();

      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to parse intent analysis response:', jsonResponse);
      console.error('Cleaned response attempt:', jsonResponse.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '').trim());

      // Fallback: try to extract JSON from the response
      try {
        const jsonMatch = jsonResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (fallbackError) {
        console.error('Fallback JSON parsing also failed:', fallbackError);
      }

      throw new Error('Invalid response format from AI analysis');
    }
  }

  /**
   * Process voice command with natural language understanding
   */
  public async processVoiceCommand(
    audioBuffer: ArrayBuffer,
    context: string = 'general'
  ): Promise<{
    intent: string;
    entities: Record<string, any>;
    confidence: number;
    text: string;
  }> {
    try {
      // First, transcribe the audio
      const transcription = await this.speechToText(audioBuffer, { language: 'en-US' });

      // Check if Gemini is available
      if (!this.genAI || !this.model) {
        // Fallback: Simple rule-based intent detection
        return this.fallbackVoiceCommandProcessing(transcription.text, context);
      }

      // Use Gemini to understand the intent
      const prompt = `
You are a voice command processor for a business application. Analyze the following transcribed speech and extract:
1. Intent (what the user wants to do)
2. Entities (specific items mentioned)
3. Confidence score

Context: ${context}
Transcription: "${transcription.text}"

Please respond in JSON format:
{
  "intent": "navigate|search|action|query",
  "entities": {
    "target": "page or feature name",
    "query": "search terms if applicable"
  },
  "confidence": 0.0-1.0,
  "text": "original transcription"
}

Common intents:
- navigate: go to a page/feature
- search: search for something
- action: perform an action
- query: ask a question

Examples:
"go to finance dashboard" -> {"intent": "navigate", "entities": {"target": "finance"}, "confidence": 0.95}
"search for handloom sarees" -> {"intent": "search", "entities": {"query": "handloom sarees"}, "confidence": 0.9}
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const jsonResponse = response.text();

      // Parse the JSON response (handle Gemini's markdown wrapping)
      let cleanResponse = jsonResponse.trim();

      // Remove markdown code block wrappers if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Remove any leading/trailing whitespace
      cleanResponse = cleanResponse.trim();

      const parsed = JSON.parse(cleanResponse);

      return {
        ...parsed,
        text: transcription.text
      };

    } catch (error) {
      console.error('Voice command processing error:', error);
      // Fallback to rule-based processing
      return this.fallbackVoiceCommandProcessing('voice command', context);
    }
  }

  /**
   * Fallback voice command processing when Gemini is not available
   */
  private fallbackVoiceCommandProcessing(text: string, context: string): {
    intent: string;
    entities: Record<string, any>;
    confidence: number;
    text: string;
  } {
    const lowerText = text.toLowerCase();

    // Simple rule-based intent detection
    if (lowerText.includes('go to') || lowerText.includes('navigate') || lowerText.includes('show')) {
      let target = 'dashboard'; // default

      if (lowerText.includes('finance') || lowerText.includes('sales')) {
        target = 'finance';
      } else if (lowerText.includes('marketplace') || lowerText.includes('products')) {
        target = 'marketplace';
      } else if (lowerText.includes('profile')) {
        target = 'profile';
      }

      return {
        intent: 'navigate',
        entities: { target },
        confidence: 0.7,
        text
      };
    }

    if (lowerText.includes('search') || lowerText.includes('find')) {
      return {
        intent: 'search',
        entities: { query: text },
        confidence: 0.6,
        text
      };
    }

    // Default fallback
    return {
      intent: 'query',
      entities: { query: text },
      confidence: 0.5,
      text
    };
  }
}
