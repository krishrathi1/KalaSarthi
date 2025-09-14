import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { google } from '@google-cloud/text-to-speech/build/protos/protos';

export interface TextToSpeechOptions {
  language?: string;
  voice?: string;
  gender?: 'MALE' | 'FEMALE';
  speed?: number;
  pitch?: number;
  volume?: number;
}

export interface TextToSpeechResult {
  audioBuffer: ArrayBuffer;
  audioFormat: string;
  language: string;
  voice: string;
}

export class TextToSpeechService {
  private static instance: TextToSpeechService;
  private ttsClient: TextToSpeechClient;

  private constructor() {
    this.ttsClient = new TextToSpeechClient({
      keyFilename: 'google-credentials.json',
      projectId: 'gen-lang-client-0314311341'
    });
  }

  public static getInstance(): TextToSpeechService {
    if (!TextToSpeechService.instance) {
      TextToSpeechService.instance = new TextToSpeechService();
    }
    return TextToSpeechService.instance;
  }

  public async synthesizeSpeech(
    text: string,
    language: string = 'en-US',
    options: TextToSpeechOptions = {}
  ): Promise<ArrayBuffer> {
    try {
      const {
        voice,
        gender = 'FEMALE',
        speed = 1.0,
        pitch = 0.0,
        volume = 1.0
      } = options;

      // Get available voices for the language
      const [voices] = await this.ttsClient.listVoices({
        languageCode: language
      });

      // Select the best voice based on language and gender
      let selectedVoice = voice;
      if (!selectedVoice) {
        // First try to get optimal voice from our mapping
        selectedVoice = this.getOptimalVoice(language, gender) ?? undefined;
        
        // If no optimal voice found, fallback to API lookup
        if (!selectedVoice && voices.voices) {
          // Prefer Neural2 voices for better quality
          const neural2Voices = voices.voices.filter(v => 
            v.languageCodes?.includes(language) && 
            v.ssmlGender === gender &&
            v.name?.includes('Neural2')
          );
          
          if (neural2Voices.length > 0) {
            selectedVoice = neural2Voices[0].name || undefined;
          } else {
            // Fallback to any voice with the right gender and language
            const filteredVoices = voices.voices.filter(v => 
              v.languageCodes?.includes(language) && 
              v.ssmlGender === gender
            );
            
            if (filteredVoices.length > 0) {
              selectedVoice = filteredVoices[0].name || undefined;
            }
          }
        }
      }

      // Enhanced voice configuration for better quality
      const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { text },
        voice: {
          languageCode: language,
          name: selectedVoice,
          ssmlGender: gender,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speed,
          pitch: pitch,
          volumeGainDb: volume,
          effectsProfileId: ['headphone-class-device'],
          // Enhanced audio quality settings
          sampleRateHertz: 24000, // Higher sample rate for better quality
        },
      };

      const [response] = await this.ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from TTS service');
      }

      // Convert audioContent to ArrayBuffer
      let audioBuffer: ArrayBuffer;
      if (typeof response.audioContent === 'string') {
        // If audioContent is a base64 string, decode it
        const buffer = Buffer.from(response.audioContent, 'base64');
        const slicedBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        audioBuffer = slicedBuffer instanceof ArrayBuffer ? slicedBuffer : new ArrayBuffer(buffer.byteLength);
      } else {
        // If audioContent is Uint8Array or Buffer
        const buffer = response.audioContent as Uint8Array;
        const sliced = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        // Ensure audioBuffer is ArrayBuffer type
        audioBuffer = sliced instanceof ArrayBuffer
          ? sliced
          : new ArrayBuffer(buffer.byteLength);
      }

      return audioBuffer;

    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw new Error('Failed to synthesize speech');
    }
  }

  public async synthesizeSSML(
    ssml: string,
    language: string = 'en-US',
    options: TextToSpeechOptions = {}
  ): Promise<ArrayBuffer> {
    try {
      const {
        voice,
        gender = 'FEMALE',
        speed = 1.0,
        pitch = 0.0,
        volume = 1.0
      } = options;

      // Get available voices for the language
      const [voices] = await this.ttsClient.listVoices({
        languageCode: language
      });

      // Select voice based on gender preference
      let selectedVoice = voice;
      if (!selectedVoice && voices.voices) {
        const filteredVoices = voices.voices.filter(v => 
          v.languageCodes?.includes(language) && 
          v.ssmlGender === gender
        );
        
        if (filteredVoices.length > 0) {
          selectedVoice = filteredVoices[0].name || undefined;
        }
      }

      const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { ssml },
        voice: {
          languageCode: language,
          name: selectedVoice,
          ssmlGender: gender,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speed,
          pitch: pitch,
          volumeGainDb: volume,
          effectsProfileId: ['headphone-class-device'],
        },
      };

      const [response] = await this.ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from TTS service');
      }

      // Convert Uint8Array to ArrayBuffer
      let audioBuffer: ArrayBuffer;
      if (typeof response.audioContent === 'string') {
        // If audioContent is a base64 string, decode it
        const buffer = Buffer.from(response.audioContent, 'base64');
        audioBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      } else {
        // If audioContent is Uint8Array or Buffer
        const buffer = response.audioContent as Uint8Array;
        audioBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      }

      return audioBuffer;

    } catch (error) {
      console.error('SSML synthesis error:', error);
      throw new Error('Failed to synthesize SSML speech');
    }
  }

  public async getAvailableVoices(language?: string): Promise<any[]> {
    try {
      const [voices] = await this.ttsClient.listVoices({
        languageCode: language
      });

      return voices.voices || [];

    } catch (error) {
      console.error('Get voices error:', error);
      return [];
    }
  }

  public async getBestVoiceForLanguage(language: string, gender: 'MALE' | 'FEMALE' = 'FEMALE'): Promise<string | null> {
    try {
      const [voices] = await this.ttsClient.listVoices({
        languageCode: language
      });

      if (!voices.voices) return null;

      // Prefer Neural2 voices for better quality
      const neural2Voices = voices.voices.filter(v => 
        v.languageCodes?.includes(language) && 
        v.ssmlGender === gender &&
        v.name?.includes('Neural2')
      );
      
      if (neural2Voices.length > 0) {
        return neural2Voices[0].name || null;
      }

      // Fallback to any voice with the right gender and language
      const filteredVoices = voices.voices.filter(v => 
        v.languageCodes?.includes(language) && 
        v.ssmlGender === gender
      );
      
      if (filteredVoices.length > 0) {
        return filteredVoices[0].name || null;
      }

      return null;
    } catch (error) {
      console.error('Get best voice error:', error);
      return null;
    }
  }

  // Language-specific voice mappings for better quality
  private getLanguageVoiceMap(): Record<string, { male: string; female: string }> {
    return {
      'en-US': {
        male: 'en-US-Neural2-J',
        female: 'en-US-Neural2-F'
      },
      'en-GB': {
        male: 'en-GB-Neural2-B',
        female: 'en-GB-Neural2-A'
      },
      'hi-IN': {
        male: 'hi-IN-Neural2-B',
        female: 'hi-IN-Neural2-A'
      },
      'bn-IN': {
        male: 'bn-IN-Neural2-A',
        female: 'bn-IN-Neural2-B'
      },
      'ta-IN': {
        male: 'ta-IN-Neural2-A',
        female: 'ta-IN-Neural2-C'
      },
      'te-IN': {
        male: 'te-IN-Neural2-A',
        female: 'te-IN-Neural2-B'
      },
      'mr-IN': {
        male: 'mr-IN-Neural2-A',
        female: 'mr-IN-Neural2-C'
      },
      'gu-IN': {
        male: 'gu-IN-Neural2-A',
        female: 'gu-IN-Neural2-B'
      },
      'kn-IN': {
        male: 'kn-IN-Neural2-A',
        female: 'kn-IN-Neural2-B'
      },
      'ml-IN': {
        male: 'ml-IN-Neural2-A',
        female: 'ml-IN-Neural2-B'
      },
      'pa-IN': {
        male: 'pa-IN-Neural2-A',
        female: 'pa-IN-Neural2-B'
      },
      'or-IN': {
        male: 'or-IN-Neural2-A',
        female: 'or-IN-Neural2-B'
      },
      'as-IN': {
        male: 'as-IN-Neural2-A',
        female: 'as-IN-Neural2-B'
      },
      'ne-NP': {
        male: 'ne-NP-Neural2-A',
        female: 'ne-NP-Neural2-B'
      },
      'ur-PK': {
        male: 'ur-PK-Neural2-A',
        female: 'ur-PK-Neural2-B'
      }
    };
  }

  public getOptimalVoice(language: string, gender: 'MALE' | 'FEMALE' = 'FEMALE'): string | null {
    const voiceMap = this.getLanguageVoiceMap();
    const languageKey = language.toLowerCase();
    
    if (voiceMap[languageKey]) {
      return voiceMap[languageKey][gender.toLowerCase() as 'male' | 'female'];
    }
    
    return null;
  }

  public async createSSML(
    text: string,
    options: {
      pause?: number;
      emphasis?: string[];
      break?: number;
      speed?: number;
    } = {}
  ): Promise<string> {
    const { pause = 0, emphasis = [], break: breakTime = 0, speed = 1.0 } = options;

    let ssml = `<speak>`;
    
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

    if (breakTime > 0) {
      ssml += `<break time="${breakTime}ms"/>`;
    }

    if (pause > 0) {
      ssml += `<break time="${pause}ms"/>`;
    }

    ssml += `</speak>`;

    return ssml;
  }
}