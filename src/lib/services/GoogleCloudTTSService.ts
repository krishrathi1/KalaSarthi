/**
 * Google Cloud Text-to-Speech Service
 * Integrates with existing Vertex AI infrastructure for enhanced story narration
 */

export interface TTSOptions {
    languageCode?: string;
    voiceName?: string;
    gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
    speakingRate?: number;
    pitch?: number;
    audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
}

export interface TTSResult {
    success: boolean;
    audio?: {
        content: string; // base64 encoded
        duration: number; // in milliseconds
        format: string;
        mimeType: string;
    };
    voice?: {
        languageCode: string;
        name: string;
        gender: string;
    };
    error?: string;
    fallbackAvailable?: boolean;
}

export interface Voice {
    name: string;
    languageCode: string;
    languageCodes: string[];
    gender: string;
    naturalSampleRateHertz: number;
    languageDisplayName: string;
    region: string;
    recommended: boolean;
}

export interface VoicesResult {
    success: boolean;
    voices?: Voice[];
    cached?: boolean;
    totalVoices?: number;
    error?: string;
}

export class GoogleCloudTTSService {
    private static readonly BASE_URL = '/api/tts/google-cloud';

    // Cache for voices to reduce API calls
    private static voicesCache: Voice[] | null = null;
    private static cacheTimestamp = 0;
    private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

    /**
     * Synthesize text to speech using Google Cloud TTS
     */
    static async synthesizeSpeech(text: string, options: TTSOptions = {}): Promise<TTSResult> {
        try {
            console.log(`🔊 Synthesizing speech: "${text.substring(0, 50)}..."`);

            const requestBody = {
                text,
                languageCode: options.languageCode || 'en-IN',
                voiceName: options.voiceName,
                gender: options.gender || 'NEUTRAL',
                speakingRate: options.speakingRate || 1.0,
                pitch: options.pitch || 0.0,
                audioEncoding: options.audioEncoding || 'MP3'
            };

            const response = await fetch(`${this.BASE_URL}/synthesize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ TTS synthesis successful');
                return result;
            } else {
                console.error('❌ TTS synthesis failed:', result.error);
                return {
                    success: false,
                    error: result.error,
                    fallbackAvailable: result.fallbackAvailable
                };
            }

        } catch (error) {
            console.error('❌ TTS service error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'TTS service unavailable',
                fallbackAvailable: true
            };
        }
    }

    /**
     * Get available voices for a specific language
     */
    static async getVoices(languageCode?: string): Promise<VoicesResult> {
        try {
            // Check cache first
            const now = Date.now();
            if (this.voicesCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
                console.log('📦 Using cached voices');
                const filteredVoices = languageCode
                    ? this.voicesCache.filter(voice => voice.languageCode === languageCode)
                    : this.voicesCache;

                return {
                    success: true,
                    voices: filteredVoices,
                    cached: true,
                    totalVoices: this.voicesCache.length
                };
            }

            console.log(`🎤 Fetching voices${languageCode ? ` for ${languageCode}` : ''}`);

            const url = languageCode
                ? `${this.BASE_URL}/voices?languageCode=${languageCode}`
                : `${this.BASE_URL}/voices`;

            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                // Update cache if we got all voices
                if (!languageCode) {
                    this.voicesCache = result.voices;
                    this.cacheTimestamp = now;
                }

                console.log(`✅ Retrieved ${result.voices.length} voices`);
                return result;
            } else {
                console.error('❌ Failed to fetch voices:', result.error);
                return {
                    success: false,
                    error: result.error
                };
            }

        } catch (error) {
            console.error('❌ Voices service error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Voices service unavailable'
            };
        }
    }

    /**
     * Get recommended voices for Indian languages
     */
    static async getRecommendedVoices(): Promise<VoicesResult> {
        try {
            const allVoicesResult = await this.getVoices();

            if (!allVoicesResult.success || !allVoicesResult.voices) {
                return allVoicesResult;
            }

            // Filter for recommended voices, prioritizing Indian languages
            const recommendedVoices = allVoicesResult.voices.filter(voice => {
                return voice.recommended ||
                    voice.languageCode.includes('-IN') ||
                    ['en-IN', 'hi-IN', 'en-US'].includes(voice.languageCode);
            });

            // Sort by preference: Indian languages first, then quality
            recommendedVoices.sort((a, b) => {
                const aIsIndian = a.languageCode.includes('-IN');
                const bIsIndian = b.languageCode.includes('-IN');

                if (aIsIndian && !bIsIndian) return -1;
                if (!aIsIndian && bIsIndian) return 1;

                if (a.recommended && !b.recommended) return -1;
                if (!a.recommended && b.recommended) return 1;

                return a.name.localeCompare(b.name);
            });

            return {
                success: true,
                voices: recommendedVoices.slice(0, 10), // Top 10 recommended
                cached: allVoicesResult.cached,
                totalVoices: allVoicesResult.totalVoices
            };

        } catch (error) {
            console.error('❌ Error getting recommended voices:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get recommended voices'
            };
        }
    }

    /**
     * Test a specific voice
     */
    static async testVoice(voiceName: string, languageCode: string, testText?: string): Promise<TTSResult> {
        try {
            console.log(`🎵 Testing voice: ${voiceName}`);

            const requestBody = {
                voiceName,
                languageCode,
                text: testText || 'Hello, this is a test of the selected voice.'
            };

            const response = await fetch(`${this.BASE_URL}/voices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();

            if (result.success) {
                console.log(`✅ Voice test successful for ${voiceName}`);
                return {
                    success: true,
                    audio: result.audio,
                    voice: result.voice
                };
            } else {
                console.error(`❌ Voice test failed for ${voiceName}:`, result.error);
                return {
                    success: false,
                    error: result.error
                };
            }

        } catch (error) {
            console.error('❌ Voice test error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Voice test failed'
            };
        }
    }

    /**
     * Check if Google Cloud TTS service is available
     */
    static async checkServiceHealth(): Promise<boolean> {
        try {
            console.log('🔍 Checking Google Cloud TTS health...');

            const response = await fetch(`${this.BASE_URL}/synthesize`);
            const result = await response.json();

            const isHealthy = result.success && result.status === 'healthy';
            console.log(isHealthy ? '✅ TTS service is healthy' : '❌ TTS service is unhealthy');

            return isHealthy;

        } catch (error) {
            console.error('❌ TTS health check failed:', error);
            return false;
        }
    }

    /**
     * Create audio URL from base64 content
     */
    static createAudioUrl(audioContent: string, mimeType: string): string {
        return `data:${mimeType};base64,${audioContent}`;
    }

    /**
     * Enhanced story narration - combines image analysis with TTS
     */
    static async narrateEnhancedStory(
        storyText: string,
        options: TTSOptions = {}
    ): Promise<TTSResult & { storyText: string }> {
        try {
            console.log('📖 Creating enhanced story narration...');

            // Use Indian English voice by default for better cultural context
            const enhancedOptions: TTSOptions = {
                languageCode: 'en-IN',
                gender: 'FEMALE',
                speakingRate: 0.9, // Slightly slower for storytelling
                pitch: 0.1, // Slightly higher pitch for engaging narration
                ...options
            };

            const result = await this.synthesizeSpeech(storyText, enhancedOptions);

            return {
                ...result,
                storyText
            };

        } catch (error) {
            console.error('❌ Enhanced story narration failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Story narration failed',
                storyText,
                fallbackAvailable: true
            };
        }
    }

    /**
     * Get language-specific voice recommendations
     */
    static getLanguageVoiceRecommendations(languageCode: string): {
        primary: string[];
        fallback: string[];
    } {
        const recommendations: { [key: string]: { primary: string[]; fallback: string[] } } = {
            'en-IN': {
                primary: ['en-IN-Neural2-A', 'en-IN-Neural2-B', 'en-IN-Neural2-C'],
                fallback: ['en-IN-Standard-A', 'en-IN-Standard-B']
            },
            'hi-IN': {
                primary: ['hi-IN-Neural2-A', 'hi-IN-Neural2-B', 'hi-IN-Neural2-C'],
                fallback: ['hi-IN-Standard-A', 'hi-IN-Standard-B']
            },
            'en-US': {
                primary: ['en-US-Neural2-A', 'en-US-Neural2-C', 'en-US-Neural2-F'],
                fallback: ['en-US-Standard-A', 'en-US-Standard-C']
            },
            'en-GB': {
                primary: ['en-GB-Neural2-A', 'en-GB-Neural2-B', 'en-GB-Neural2-C'],
                fallback: ['en-GB-Standard-A', 'en-GB-Standard-B']
            }
        };

        return recommendations[languageCode] || {
            primary: [],
            fallback: []
        };
    }
}