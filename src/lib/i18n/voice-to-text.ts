/**
 * Voice-to-Text Support for Regional Languages
 * Supports speech recognition in 12 Indian languages
 */

import { SupportedLanguage } from './scheme-sahayak-translations';

// Language codes for Web Speech API
const SPEECH_LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  bn: 'bn-IN',
  te: 'te-IN',
  gu: 'gu-IN',
  mr: 'mr-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  or: 'or-IN',
  ur: 'ur-IN'
};

export interface VoiceRecognitionOptions {
  language: SupportedLanguage;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export class VoiceToText {
  private recognition: any = null;
  private isListening = false;
  private currentLanguage: SupportedLanguage = 'en';

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
      }
    }
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  startListening(
    options: VoiceRecognitionOptions,
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: string) => void
  ): void {
    if (!this.recognition) {
      onError?.('Speech recognition not supported');
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.currentLanguage = options.language;
    this.recognition.lang = SPEECH_LANGUAGE_CODES[options.language];
    this.recognition.continuous = options.continuous ?? false;
    this.recognition.interimResults = options.interimResults ?? true;
    this.recognition.maxAlternatives = options.maxAlternatives ?? 1;

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      onResult({
        transcript,
        confidence,
        isFinal
      });
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      onError?.('Failed to start speech recognition');
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return Object.keys(SPEECH_LANGUAGE_CODES) as SupportedLanguage[];
  }
}

export const voiceToText = new VoiceToText();
