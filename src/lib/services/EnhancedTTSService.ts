/**
 * Enhanced TTS Service with Google Cloud TTS primary and Browser TTS fallback
 * Implements the service selection logic from the design document
 */

import { GoogleCloudTTSService, TTSOptions, TTSResult } from './GoogleCloudTTSService';

export interface EnhancedTTSOptions extends TTSOptions {
    preferredService?: 'google-cloud' | 'browser' | 'auto';
    fallbackEnabled?: boolean;
}

export interface ServiceStatus {
    googleCloud: boolean;
    browser: boolean;
    selectedService: 'google-cloud' | 'browser';
}

export class EnhancedTTSService {
    private static serviceHealthCache: { [key: string]: { status: boolean; timestamp: number } } = {};
    private static readonly HEALTH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * Main synthesis method with automatic service selection
     */
    static async synthesize(text: string, options: EnhancedTTSOptions = {}): Promise<TTSResult & { serviceUsed: string }> {
        try {
            const selectedService = await this.selectOptimalService(text, options);
            console.log(`🎯 Selected TTS service: ${selectedService}`);

            if (selectedService === 'google-cloud') {
                const result = await GoogleCloudTTSService.synthesizeSpeech(text, options);

                if (result.success) {
                    return { ...result, serviceUsed: 'google-cloud' };
                } else if (options.fallbackEnabled !== false && result.fallbackAvailable) {
                    console.log('🔄 Google Cloud TTS failed, falling back to browser TTS');
                    return this.synthesizeWithBrowser(text, options);
                } else {
                    return { ...result, serviceUsed: 'google-cloud' };
                }
            } else {
                return this.synthesizeWithBrowser(text, options);
            }

        } catch (error) {
            console.error('❌ Enhanced TTS synthesis error:', error);

            // Try browser fallback if enabled
            if (options.fallbackEnabled !== false) {
                console.log('🔄 Falling back to browser TTS due to error');
                return this.synthesizeWithBrowser(text, options);
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'TTS synthesis failed',
                serviceUsed: 'none',
                fallbackAvailable: true
            };
        }
    }

    /**
     * Synthesize using browser Web Speech API
     */
    private static async synthesizeWithBrowser(text: string, options: EnhancedTTSOptions = {}): Promise<TTSResult & { serviceUsed: string }> {
        return new Promise((resolve) => {
            try {
                if (!('speechSynthesis' in window)) {
                    resolve({
                        success: false,
                        error: 'Browser TTS not supported',
                        serviceUsed: 'browser',
                        fallbackAvailable: false
                    });
                    return;
                }

                console.log('🗣️ Using browser TTS for synthesis');

                const utterance = new SpeechSynthesisUtterance(text);

                // Configure voice settings
                const voices = speechSynthesis.getVoices();
                const preferredVoice = this.selectBrowserVoice(voices, options.languageCode || 'en-IN');

                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                    utterance.lang = preferredVoice.lang;
                } else {
                    utterance.lang = options.languageCode || 'en-IN';
                }

                utterance.rate = options.speakingRate || 1.0;
                utterance.pitch = options.pitch || 1.0;
                utterance.volume = 1.0;

                // Create audio recording to return base64 data
                let audioChunks: Blob[] = [];
                let mediaRecorder: MediaRecorder | null = null;

                // Try to capture audio (may not work in all browsers)
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        mediaRecorder = new MediaRecorder(stream);

                        mediaRecorder.ondataavailable = (event) => {
                            audioChunks.push(event.data);
                        };

                        mediaRecorder.onstop = () => {
                            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64Audio = (reader.result as string).split(',')[1];
                                resolve({
                                    success: true,
                                    audio: {
                                        content: base64Audio,
                                        duration: this.estimateDuration(text),
                                        format: 'wav',
                                        mimeType: 'audio/wav'
                                    },
                                    voice: {
                                        languageCode: utterance.lang,
                                        name: preferredVoice?.name || 'browser-default',
                                        gender: 'NEUTRAL'
                                    },
                                    serviceUsed: 'browser'
                                });
                            };
                            reader.readAsDataURL(audioBlob);

                            // Stop recording stream
                            stream.getTracks().forEach(track => track.stop());
                        };

                        mediaRecorder.start();
                    })
                    .catch(() => {
                        // Fallback: just play the speech without recording
                        console.log('⚠️ Audio recording not available, using speech-only mode');
                    });

                utterance.onend = () => {
                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    } else {
                        // No recording available, return success without audio data
                        resolve({
                            success: true,
                            audio: {
                                content: '', // No audio data available
                                duration: this.estimateDuration(text),
                                format: 'speech-only',
                                mimeType: 'audio/speech'
                            },
                            voice: {
                                languageCode: utterance.lang,
                                name: preferredVoice?.name || 'browser-default',
                                gender: 'NEUTRAL'
                            },
                            serviceUsed: 'browser'
                        });
                    }
                };

                utterance.onerror = (event) => {
                    console.error('❌ Browser TTS error:', event.error);
                    resolve({
                        success: false,
                        error: `Browser TTS error: ${event.error}`,
                        serviceUsed: 'browser',
                        fallbackAvailable: false
                    });
                };

                // Start speech synthesis
                speechSynthesis.speak(utterance);

            } catch (error) {
                console.error('❌ Browser TTS synthesis error:', error);
                resolve({
                    success: false,
                    error: error instanceof Error ? error.message : 'Browser TTS failed',
                    serviceUsed: 'browser',
                    fallbackAvailable: false
                });
            }
        });
    }

    /**
     * Select optimal TTS service based on availability and preferences
     */
    private static async selectOptimalService(text: string, options: EnhancedTTSOptions): Promise<'google-cloud' | 'browser'> {
        // Check user preference
        if (options.preferredService === 'browser') {
            return 'browser';
        }

        if (options.preferredService === 'google-cloud') {
            return 'google-cloud';
        }

        // Auto selection logic
        try {
            // Check Google Cloud TTS availability
            const isGoogleCloudAvailable = await this.isGoogleCloudTTSAvailable();

            if (isGoogleCloudAvailable) {
                // Check if browser supports the requested language
                const browserSupportsLanguage = this.browserSupportsLanguage(options.languageCode || 'en-IN');

                // Prefer Google Cloud for better quality, especially for Indian languages
                if (options.languageCode?.includes('-IN') || !browserSupportsLanguage) {
                    return 'google-cloud';
                }

                // For common languages, prefer Google Cloud for consistency
                return 'google-cloud';
            } else {
                // Fallback to browser if available
                if (this.isBrowserTTSAvailable()) {
                    return 'browser';
                }

                // Default to Google Cloud even if health check failed (might be temporary)
                return 'google-cloud';
            }

        } catch (error) {
            console.error('❌ Service selection error:', error);
            return 'google-cloud'; // Default fallback
        }
    }

    /**
     * Check if Google Cloud TTS is available (with caching)
     */
    private static async isGoogleCloudTTSAvailable(): Promise<boolean> {
        const cacheKey = 'google-cloud-tts';
        const now = Date.now();

        // Check cache
        if (this.serviceHealthCache[cacheKey]) {
            const cached = this.serviceHealthCache[cacheKey];
            if ((now - cached.timestamp) < this.HEALTH_CACHE_DURATION) {
                return cached.status;
            }
        }

        try {
            const isHealthy = await GoogleCloudTTSService.checkServiceHealth();

            // Update cache
            this.serviceHealthCache[cacheKey] = {
                status: isHealthy,
                timestamp: now
            };

            return isHealthy;

        } catch (error) {
            console.error('❌ Google Cloud TTS health check failed:', error);

            // Cache negative result for shorter duration
            this.serviceHealthCache[cacheKey] = {
                status: false,
                timestamp: now
            };

            return false;
        }
    }

    /**
     * Check if browser TTS is available
     */
    private static isBrowserTTSAvailable(): boolean {
        return typeof window !== 'undefined' && 'speechSynthesis' in window;
    }

    /**
     * Check if browser supports the requested language
     */
    private static browserSupportsLanguage(languageCode: string): boolean {
        if (!this.isBrowserTTSAvailable()) {
            return false;
        }

        const voices = speechSynthesis.getVoices();
        return voices.some(voice =>
            voice.lang.toLowerCase().startsWith(languageCode.toLowerCase().split('-')[0])
        );
    }

    /**
     * Select best browser voice for the given language
     */
    private static selectBrowserVoice(voices: SpeechSynthesisVoice[], languageCode: string): SpeechSynthesisVoice | null {
        if (!voices.length) return null;

        // Try exact match first
        let voice = voices.find(v => v.lang.toLowerCase() === languageCode.toLowerCase());
        if (voice) return voice;

        // Try language prefix match (e.g., 'en' for 'en-IN')
        const langPrefix = languageCode.split('-')[0].toLowerCase();
        voice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
        if (voice) return voice;

        // Fallback to default voice
        return voices.find(v => v.default) || voices[0];
    }

    /**
     * Estimate speech duration based on text length
     */
    private static estimateDuration(text: string): number {
        const wordsPerMinute = 150; // Average speaking rate
        const wordCount = text.split(' ').length;
        return Math.ceil((wordCount / wordsPerMinute) * 60 * 1000); // in milliseconds
    }

    /**
     * Get service availability status
     */
    static async checkServiceAvailability(): Promise<ServiceStatus> {
        const [googleCloud, browser] = await Promise.all([
            this.isGoogleCloudTTSAvailable(),
            Promise.resolve(this.isBrowserTTSAvailable())
        ]);

        const selectedService = googleCloud ? 'google-cloud' : 'browser';

        return {
            googleCloud,
            browser,
            selectedService
        };
    }

    /**
     * Enhanced story narration with service selection
     */
    static async narrateEnhancedStory(
        storyText: string,
        options: EnhancedTTSOptions = {}
    ): Promise<TTSResult & { serviceUsed: string; storyText: string }> {
        try {
            console.log('📖 Creating enhanced story narration with service selection...');

            // Enhanced options for storytelling
            const storyOptions: EnhancedTTSOptions = {
                languageCode: 'en-IN',
                gender: 'FEMALE',
                speakingRate: 0.9, // Slightly slower for storytelling
                pitch: 0.1, // Slightly higher pitch for engaging narration
                fallbackEnabled: true,
                ...options
            };

            const result = await this.synthesize(storyText, storyOptions);

            return {
                ...result,
                storyText
            };

        } catch (error) {
            console.error('❌ Enhanced story narration failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Story narration failed',
                serviceUsed: 'none',
                storyText,
                fallbackAvailable: true
            };
        }
    }
}