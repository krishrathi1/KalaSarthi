/**
 * Text-to-Speech Processing Pipeline
 * Handles multilingual text-to-speech conversion with cultural voice selection
 */

import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';

const ttsClient = new TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

type SsmlVoiceGender = protos.google.cloud.texttospeech.v1.SsmlVoiceGender;
type AudioEncoding = protos.google.cloud.texttospeech.v1.AudioEncoding;

export interface TTSRequest {
  text: string;
  language: string;
  voiceGender?: 'male' | 'female' | 'neutral';
  voiceName?: string;
  speakingRate?: number; // 0.25 to 4.0
  pitch?: number; // -20.0 to 20.0
  volumeGainDb?: number; // -96.0 to 16.0
  audioFormat?: 'mp3' | 'wav' | 'ogg';
  userId?: string;
  sessionId?: string;
  culturalContext?: 'formal' | 'casual' | 'business' | 'traditional';
}

export interface TTSResult {
  audioContent: Buffer;
  audioFormat: string;
  language: string;
  voiceName: string;
  voiceGender: string;
  duration: number; // estimated duration in seconds
  metadata: {
    speakingRate: number;
    pitch: number;
    volumeGainDb: number;
    culturalContext?: string;
  };
}

export interface VoiceProfile {
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  region: string;
  culturalSuitability: {
    formal: number; // 0-1 score
    casual: number;
    business: number;
    traditional: number;
  };
  description: string;
}

export class TTSProcessor {
  private static instance: TTSProcessor;
  private voiceProfiles: Map<string, VoiceProfile[]>;
  private audioCache: Map<string, TTSResult>;

  constructor() {
    this.voiceProfiles = this.initializeVoiceProfiles();
    this.audioCache = new Map();
  }

  static getInstance(): TTSProcessor {
    if (!TTSProcessor.instance) {
      TTSProcessor.instance = new TTSProcessor();
    }
    return TTSProcessor.instance;
  }

  async synthesizeSpeech(request: TTSRequest): Promise<TTSResult> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedResult = this.audioCache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Select optimal voice based on language and cultural context
      const selectedVoice = this.selectOptimalVoice(
        request.language,
        request.voiceGender,
        request.culturalContext,
        request.voiceName
      );

      // Prepare text with cultural pronunciation adjustments
      const processedText = this.preprocessTextForCulturalPronunciation(
        request.text,
        request.language,
        request.culturalContext
      );

      // Configure synthesis request
      const synthesisRequest = {
        input: { text: processedText },
        voice: {
          languageCode: this.mapLanguageToGoogleCode(request.language),
          name: selectedVoice.name,
          ssmlGender: this.mapGenderToSSML(selectedVoice.gender)
        },
        audioConfig: {
          audioEncoding: this.mapAudioFormat(request.audioFormat || 'mp3'),
          speakingRate: request.speakingRate || 1.0,
          pitch: request.pitch || 0.0,
          volumeGainDb: request.volumeGainDb || 0.0,
          sampleRateHertz: 24000
        }
      };

      // Perform synthesis
      const [response] = await ttsClient.synthesizeSpeech(synthesisRequest);

      if (!response.audioContent) {
        throw new Error('No audio content generated');
      }

      // Estimate duration
      const estimatedDuration = this.estimateAudioDuration(
        request.text,
        request.speakingRate || 1.0
      );

      const result: TTSResult = {
        audioContent: Buffer.from(response.audioContent),
        audioFormat: request.audioFormat || 'mp3',
        language: request.language,
        voiceName: selectedVoice.name,
        voiceGender: selectedVoice.gender,
        duration: estimatedDuration,
        metadata: {
          speakingRate: request.speakingRate || 1.0,
          pitch: request.pitch || 0.0,
          volumeGainDb: request.volumeGainDb || 0.0,
          culturalContext: request.culturalContext
        }
      };

      // Cache the result
      this.audioCache.set(cacheKey, result);

      return result;

    } catch (error) {
      console.error('TTS processing error:', error);
      throw new Error(`Speech synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private initializeVoiceProfiles(): Map<string, VoiceProfile[]> {
    const profiles = new Map<string, VoiceProfile[]>();

    // English voices
    profiles.set('en', [
      {
        name: 'en-IN-Standard-A',
        language: 'en',
        gender: 'female',
        region: 'IN',
        culturalSuitability: {
          formal: 0.9,
          casual: 0.8,
          business: 0.95,
          traditional: 0.7
        },
        description: 'Indian English female voice, suitable for business communication'
      },
      {
        name: 'en-IN-Standard-B',
        language: 'en',
        gender: 'male',
        region: 'IN',
        culturalSuitability: {
          formal: 0.85,
          casual: 0.9,
          business: 0.9,
          traditional: 0.8
        },
        description: 'Indian English male voice, versatile for various contexts'
      },
      {
        name: 'en-IN-Wavenet-A',
        language: 'en',
        gender: 'female',
        region: 'IN',
        culturalSuitability: {
          formal: 0.95,
          casual: 0.85,
          business: 0.98,
          traditional: 0.75
        },
        description: 'High-quality Indian English female voice with natural intonation'
      },
      {
        name: 'en-IN-Wavenet-B',
        language: 'en',
        gender: 'male',
        region: 'IN',
        culturalSuitability: {
          formal: 0.9,
          casual: 0.95,
          business: 0.92,
          traditional: 0.85
        },
        description: 'High-quality Indian English male voice with natural flow'
      }
    ]);

    // Hindi voices
    profiles.set('hi', [
      {
        name: 'hi-IN-Standard-A',
        language: 'hi',
        gender: 'female',
        region: 'IN',
        culturalSuitability: {
          formal: 0.9,
          casual: 0.85,
          business: 0.8,
          traditional: 0.95
        },
        description: 'Standard Hindi female voice with traditional pronunciation'
      },
      {
        name: 'hi-IN-Standard-B',
        language: 'hi',
        gender: 'male',
        region: 'IN',
        culturalSuitability: {
          formal: 0.85,
          casual: 0.9,
          business: 0.85,
          traditional: 0.9
        },
        description: 'Standard Hindi male voice suitable for various contexts'
      },
      {
        name: 'hi-IN-Wavenet-A',
        language: 'hi',
        gender: 'female',
        region: 'IN',
        culturalSuitability: {
          formal: 0.95,
          casual: 0.9,
          business: 0.85,
          traditional: 0.98
        },
        description: 'High-quality Hindi female voice with cultural authenticity'
      },
      {
        name: 'hi-IN-Wavenet-B',
        language: 'hi',
        gender: 'male',
        region: 'IN',
        culturalSuitability: {
          formal: 0.9,
          casual: 0.95,
          business: 0.9,
          traditional: 0.95
        },
        description: 'High-quality Hindi male voice with natural expression'
      }
    ]);

    // Bengali voices
    profiles.set('bn', [
      {
        name: 'bn-IN-Standard-A',
        language: 'bn',
        gender: 'female',
        region: 'IN',
        culturalSuitability: {
          formal: 0.85,
          casual: 0.9,
          business: 0.8,
          traditional: 0.95
        },
        description: 'Bengali female voice with cultural authenticity'
      },
      {
        name: 'bn-IN-Standard-B',
        language: 'bn',
        gender: 'male',
        region: 'IN',
        culturalSuitability: {
          formal: 0.8,
          casual: 0.95,
          business: 0.85,
          traditional: 0.9
        },
        description: 'Bengali male voice suitable for casual communication'
      }
    ]);

    // Tamil voices
    profiles.set('ta', [
      {
        name: 'ta-IN-Standard-A',
        language: 'ta',
        gender: 'female',
        region: 'IN',
        culturalSuitability: {
          formal: 0.9,
          casual: 0.85,
          business: 0.8,
          traditional: 0.98
        },
        description: 'Tamil female voice with traditional pronunciation'
      },
      {
        name: 'ta-IN-Standard-B',
        language: 'ta',
        gender: 'male',
        region: 'IN',
        culturalSuitability: {
          formal: 0.85,
          casual: 0.9,
          business: 0.85,
          traditional: 0.95
        },
        description: 'Tamil male voice with cultural depth'
      }
    ]);

    // Telugu voices
    profiles.set('te', [
      {
        name: 'te-IN-Standard-A',
        language: 'te',
        gender: 'female',
        region: 'IN',
        culturalSuitability: {
          formal: 0.85,
          casual: 0.9,
          business: 0.8,
          traditional: 0.95
        },
        description: 'Telugu female voice with regional authenticity'
      },
      {
        name: 'te-IN-Standard-B',
        language: 'te',
        gender: 'male',
        region: 'IN',
        culturalSuitability: {
          formal: 0.8,
          casual: 0.95,
          business: 0.85,
          traditional: 0.9
        },
        description: 'Telugu male voice for everyday communication'
      }
    ]);

    // Add more languages as needed...
    return profiles;
  }

  private selectOptimalVoice(
    language: string,
    preferredGender?: string,
    culturalContext?: string,
    specificVoiceName?: string
  ): VoiceProfile {
    const languageVoices = this.voiceProfiles.get(language) || [];

    if (languageVoices.length === 0) {
      // Fallback to English if language not supported
      const englishVoices = this.voiceProfiles.get('en') || [];
      return englishVoices[0] || {
        name: 'en-US-Standard-A',
        language: 'en',
        gender: 'female',
        region: 'US',
        culturalSuitability: { formal: 0.8, casual: 0.8, business: 0.8, traditional: 0.6 },
        description: 'Fallback English voice'
      };
    }

    // If specific voice name is requested
    if (specificVoiceName) {
      const specificVoice = languageVoices.find(v => v.name === specificVoiceName);
      if (specificVoice) return specificVoice;
    }

    // Filter by gender preference
    let candidateVoices = languageVoices;
    if (preferredGender) {
      const genderFiltered = languageVoices.filter(v => v.gender === preferredGender);
      if (genderFiltered.length > 0) {
        candidateVoices = genderFiltered;
      }
    }

    // Score voices based on cultural context
    if (culturalContext) {
      candidateVoices.sort((a, b) => {
        const scoreA = a.culturalSuitability[culturalContext as keyof typeof a.culturalSuitability] || 0;
        const scoreB = b.culturalSuitability[culturalContext as keyof typeof b.culturalSuitability] || 0;
        return scoreB - scoreA;
      });
    }

    return candidateVoices[0];
  }

  private preprocessTextForCulturalPronunciation(
    text: string,
    language: string,
    culturalContext?: string
  ): string {
    let processedText = text;

    // Add pronunciation guides for common craft terms
    if (language === 'en') {
      // Indian English pronunciation adjustments
      processedText = processedText.replace(/\bkhadi\b/gi, 'khaadi');
      processedText = processedText.replace(/\bkundan\b/gi, 'kundan');
      processedText = processedText.replace(/\bmeenakari\b/gi, 'meenakaari');
      processedText = processedText.replace(/\bterracotta\b/gi, 'terra-cotta');
    }

    // Add pauses for better comprehension in business context
    if (culturalContext === 'business') {
      processedText = processedText.replace(/\./g, '. <break time="0.5s"/>');
      processedText = processedText.replace(/,/g, ', <break time="0.3s"/>');
    }

    // Add emphasis for traditional context
    if (culturalContext === 'traditional') {
      // Emphasize craft terms
      const craftTerms = ['pottery', 'handloom', 'artisan', 'handicraft', 'traditional'];
      for (const term of craftTerms) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        processedText = processedText.replace(regex, `<emphasis level="moderate">${term}</emphasis>`);
      }
    }

    return processedText;
  }

  private mapLanguageToGoogleCode(language: string): string {
    const languageMap: { [key: string]: string } = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'bn': 'bn-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'gu': 'gu-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'mr': 'mr-IN',
      'pa': 'pa-IN',
      'or': 'or-IN',
      'as': 'as-IN',
      'ur': 'ur-IN'
    };

    return languageMap[language] || 'en-US';
  }

  private mapGenderToSSML(gender: string): SsmlVoiceGender {
    switch (gender.toLowerCase()) {
      case 'male': return 'MALE' as SsmlVoiceGender;
      case 'female': return 'FEMALE' as SsmlVoiceGender;
      case 'neutral': return 'NEUTRAL' as SsmlVoiceGender;
      default: return 'FEMALE' as SsmlVoiceGender;
    }
  }

  private mapAudioFormat(format: string): AudioEncoding {
    switch (format.toLowerCase()) {
      case 'mp3': return 'MP3' as AudioEncoding;
      case 'wav': return 'LINEAR16' as AudioEncoding;
      case 'ogg': return 'OGG_OPUS' as AudioEncoding;
      default: return 'MP3' as AudioEncoding;
    }
  }

  private estimateAudioDuration(text: string, speakingRate: number): number {
    // Rough estimation: average speaking rate is ~150 words per minute
    const words = text.split(/\s+/).length;
    const baseWPM = 150;
    const adjustedWPM = baseWPM * speakingRate;
    return (words / adjustedWPM) * 60; // Convert to seconds
  }

  private generateCacheKey(request: TTSRequest): string {
    const keyComponents = [
      request.text,
      request.language,
      request.voiceGender || 'default',
      request.voiceName || 'default',
      request.speakingRate || 1.0,
      request.pitch || 0.0,
      request.volumeGainDb || 0.0,
      request.audioFormat || 'mp3',
      request.culturalContext || 'default'
    ];
    
    return Buffer.from(keyComponents.join('|')).toString('base64').substring(0, 50);
  }



  // Method to get available voices for a language
  getAvailableVoices(language: string): VoiceProfile[] {
    return this.voiceProfiles.get(language) || [];
  }

  // Method to get supported languages
  getSupportedLanguages(): string[] {
    return Array.from(this.voiceProfiles.keys());
  }

  // Method to clear audio cache
  clearCache(): void {
    this.audioCache.clear();
  }

  // Method to get voice recommendations based on context
  getVoiceRecommendations(
    language: string,
    culturalContext: string
  ): VoiceProfile[] {
    const voices = this.voiceProfiles.get(language) || [];
    
    return voices
      .filter(voice => {
        const suitability = voice.culturalSuitability[culturalContext as keyof typeof voice.culturalSuitability];
        return suitability && suitability > 0.7;
      })
      .sort((a, b) => {
        const scoreA = a.culturalSuitability[culturalContext as keyof typeof a.culturalSuitability] || 0;
        const scoreB = b.culturalSuitability[culturalContext as keyof typeof b.culturalSuitability] || 0;
        return scoreB - scoreA;
      });
  }

  // Method to synthesize with SSML for advanced control
  async synthesizeWithSSML(
    ssmlText: string,
    language: string,
    voiceName?: string,
    audioFormat?: string
  ): Promise<TTSResult> {
    try {
      const selectedVoice = this.selectOptimalVoice(language, undefined, undefined, voiceName);

      const synthesisRequest = {
        input: { ssml: ssmlText },
        voice: {
          languageCode: this.mapLanguageToGoogleCode(language),
          name: selectedVoice.name,
          ssmlGender: this.mapGenderToSSML(selectedVoice.gender)
        },
        audioConfig: {
          audioEncoding: this.mapAudioFormat(audioFormat || 'mp3'),
          sampleRateHertz: 24000
        }
      };

      const [response] = await ttsClient.synthesizeSpeech(synthesisRequest);

      if (!response.audioContent) {
        throw new Error('No audio content generated');
      }

      return {
        audioContent: Buffer.from(response.audioContent),
        audioFormat: audioFormat || 'mp3',
        language,
        voiceName: selectedVoice.name,
        voiceGender: selectedVoice.gender,
        duration: 0, // Cannot estimate from SSML
        metadata: {
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0
        }
      };

    } catch (error) {
      console.error('SSML TTS processing error:', error);
      throw new Error(`SSML speech synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}