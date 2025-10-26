import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';

export interface EnhancedSpeechToTextOptions {
    language?: string;
    enableLanguageDetection?: boolean;
    enableAutomaticPunctuation?: boolean;
    enableWordTimeOffsets?: boolean;
    model?: 'latest_long' | 'latest_short' | 'command_and_search' | 'phone_call' | 'video';
    audioEncoding?: 'LINEAR16' | 'FLAC' | 'MULAW' | 'AMR' | 'AMR_WB' | 'OGG_OPUS' | 'SPEEX_WITH_HEADER_BYTE' | 'WEBM_OPUS';
    sampleRateHertz?: number;
    audioChannelCount?: number;
    enableSpeakerDiarization?: boolean;
    maxSpeakerCount?: number;
    profanityFilter?: boolean;
    speechContexts?: Array<{ phrases: string[]; boost?: number }>;
}

export interface EnhancedSpeechToTextResult {
    text: string;
    confidence: number;
    language: string;
    detectedLanguage?: string;
    wordTimeOffsets?: Array<{
        word: string;
        startTime: number;
        endTime: number;
    }>;
    speakerTags?: number[];
    alternatives?: Array<{
        text: string;
        confidence: number;
    }>;
    audioQuality?: {
        signalToNoiseRatio: number;
        speechDuration: number;
        totalDuration: number;
    };
}

export interface StreamingResult {
    text: string;
    confidence: number;
    isFinal: boolean;
    stability?: number;
}

export class EnhancedSpeechToTextService {
    private static instance: EnhancedSpeechToTextService;
    private speechClient: SpeechClient;
    private supportedLanguages: string[] = [
        'en-US', 'en-GB', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN',
        'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN', 'ne-NP', 'ur-PK'
    ];

    private constructor() {
        this.speechClient = new SpeechClient({
            keyFilename: 'google-credentials.json',
            projectId: 'gen-lang-client-0314311341'
        });
    }

    public static getInstance(): EnhancedSpeechToTextService {
        if (!EnhancedSpeechToTextService.instance) {
            EnhancedSpeechToTextService.instance = new EnhancedSpeechToTextService();
        }
        return EnhancedSpeechToTextService.instance;
    }

    /**
     * Convert speech to text with enhanced features
     */
    public async speechToText(
        audioBuffer: ArrayBuffer,
        options: EnhancedSpeechToTextOptions = {}
    ): Promise<EnhancedSpeechToTextResult> {
        try {
            // Preprocess audio
            const processedAudio = await this.preprocessAudio(audioBuffer, options);

            const {
                language = 'en-US',
                enableLanguageDetection = true,
                enableAutomaticPunctuation = true,
                enableWordTimeOffsets = true,
                model = 'latest_long',
                audioEncoding = 'WEBM_OPUS',
                sampleRateHertz = 16000,
                audioChannelCount = 1,
                enableSpeakerDiarization = false,
                maxSpeakerCount = 2,
                profanityFilter = false,
                speechContexts = []
            } = options;

            const audioBytes = Buffer.from(processedAudio);

            // Build recognition config
            const config: google.cloud.speech.v1.IRecognitionConfig = {
                encoding: audioEncoding,
                sampleRateHertz,
                audioChannelCount,
                languageCode: language,
                enableAutomaticPunctuation,
                enableWordTimeOffsets,
                model,
                profanityFilter,
                speechContexts: speechContexts.map(ctx => ({
                    phrases: ctx.phrases,
                    boost: ctx.boost || 0
                }))
            };

            // Add language detection if enabled
            if (enableLanguageDetection) {
                config.alternativeLanguageCodes = this.supportedLanguages.filter(lang => lang !== language);
            }

            // Add speaker diarization if enabled
            if (enableSpeakerDiarization) {
                config.diarizationConfig = {
                    enableSpeakerDiarization: true,
                    maxSpeakerCount
                };
            }

            const request: google.cloud.speech.v1.IRecognizeRequest = {
                audio: {
                    content: audioBytes.toString('base64'),
                },
                config
            };

            const [response] = await this.speechClient.recognize(request);

            if (!response.results || response.results.length === 0) {
                throw new Error('No transcription results found');
            }

            const result = response.results[0];
            const alternative = result.alternatives?.[0];

            if (!alternative) {
                throw new Error('No transcription alternative found');
            }

            // Extract word time offsets
            const wordTimeOffsets = alternative.words?.map(word => ({
                word: word.word || '',
                startTime: this.convertDurationToSeconds(word.startTime),
                endTime: this.convertDurationToSeconds(word.endTime)
            })) || [];

            // Extract speaker tags if diarization is enabled
            const speakerTags = alternative.words?.map(word => word.speakerTag || 0) || [];

            // Extract alternatives
            const alternatives = result.alternatives?.slice(1).map(alt => ({
                text: alt.transcript || '',
                confidence: alt.confidence || 0
            })) || [];

            // Calculate audio quality metrics
            const audioQuality = this.calculateAudioQuality(audioBuffer, wordTimeOffsets);

            return {
                text: alternative.transcript || '',
                confidence: alternative.confidence || 0,
                language: language,
                detectedLanguage: response.results[0]?.languageCode || language,
                wordTimeOffsets,
                speakerTags: speakerTags.length > 0 ? speakerTags : undefined,
                alternatives,
                audioQuality
            };

        } catch (error) {
            console.error('Enhanced speech-to-text error:', error);
            throw new Error(`Failed to transcribe speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Real-time streaming speech recognition
     */
    public async streamSpeechToText(
        audioStream: NodeJS.ReadableStream,
        options: EnhancedSpeechToTextOptions = {}
    ): Promise<AsyncGenerator<StreamingResult, void, unknown>> {
        const {
            language = 'en-US',
            enableLanguageDetection = true,
            enableAutomaticPunctuation = true,
            model = 'latest_long',
            audioEncoding = 'WEBM_OPUS',
            sampleRateHertz = 16000,
            audioChannelCount = 1,
            speechContexts = []
        } = options;

        const config: google.cloud.speech.v1.IStreamingRecognitionConfig = {
            config: {
                encoding: audioEncoding,
                sampleRateHertz,
                audioChannelCount,
                languageCode: language,
                enableAutomaticPunctuation,
                model,
                speechContexts: speechContexts.map(ctx => ({
                    phrases: ctx.phrases,
                    boost: ctx.boost || 0
                }))
            },
            interimResults: true,
            enableVoiceActivityEvents: true
        };

        // Add language detection if enabled
        if (enableLanguageDetection) {
            config.config!.alternativeLanguageCodes = this.supportedLanguages.filter(lang => lang !== language);
        }

        const recognizeStream = this.speechClient
            .streamingRecognize(config)
            .on('error', (error) => {
                console.error('Streaming recognition error:', error);
            });

        // Pipe audio stream to recognition stream
        audioStream.pipe(recognizeStream);

        return this.processStreamingResults(recognizeStream);
    }

    /**
     * Detect language from audio
     */
    public async detectLanguage(audioBuffer: ArrayBuffer): Promise<string[]> {
        try {
            const audioBytes = Buffer.from(audioBuffer);

            const request: google.cloud.speech.v1.IRecognizeRequest = {
                audio: {
                    content: audioBytes.toString('base64'),
                },
                config: {
                    encoding: 'WEBM_OPUS',
                    sampleRateHertz: 16000,
                    languageCode: 'en-US', // Primary language for detection
                    alternativeLanguageCodes: this.supportedLanguages.slice(1), // Other supported languages
                    enableAutomaticPunctuation: false,
                    model: 'latest_short' // Use short model for faster language detection
                },
            };

            const [response] = await this.speechClient.recognize(request);

            const detectedLanguages: string[] = [];

            if (response.results && response.results.length > 0) {
                const result = response.results[0];
                if (result.languageCode) {
                    detectedLanguages.push(result.languageCode);
                }
            }

            return detectedLanguages.length > 0 ? detectedLanguages : ['en-US'];

        } catch (error) {
            console.error('Language detection error:', error);
            return ['en-US']; // Fallback to English
        }
    }

    /**
     * Preprocess audio for better recognition
     */
    private async preprocessAudio(
        audioBuffer: ArrayBuffer,
        options: EnhancedSpeechToTextOptions
    ): Promise<ArrayBuffer> {
        // For now, return the original audio buffer
        // In a production environment, you might want to:
        // - Normalize audio levels
        // - Remove background noise
        // - Convert to optimal format
        // - Adjust sample rate

        return audioBuffer;
    }

    /**
     * Calculate audio quality metrics
     */
    private calculateAudioQuality(
        audioBuffer: ArrayBuffer,
        wordTimeOffsets: Array<{ startTime: number; endTime: number }>
    ): EnhancedSpeechToTextResult['audioQuality'] {
        // Calculate approximate duration from audio buffer size
        // This is a simplified calculation - in production you'd use proper audio analysis
        const approximateDuration = audioBuffer.byteLength / (16000 * 2); // Assuming 16kHz, 16-bit

        // Calculate speech duration from word time offsets
        const speechDuration = wordTimeOffsets.length > 0
            ? Math.max(...wordTimeOffsets.map(w => w.endTime)) - Math.min(...wordTimeOffsets.map(w => w.startTime))
            : 0;

        // Simplified SNR calculation based on speech vs silence ratio
        const speechRatio = speechDuration / approximateDuration;
        const estimatedSNR = speechRatio > 0.7 ? 20 : speechRatio > 0.4 ? 15 : 10;

        return {
            signalToNoiseRatio: estimatedSNR,
            speechDuration,
            totalDuration: approximateDuration
        };
    }

    /**
     * Convert Google's Duration format to seconds
     */
    private convertDurationToSeconds(duration: any): number {
        if (!duration) return 0;

        const seconds = duration.seconds || 0;
        const nanos = duration.nanos || 0;

        return Number(seconds) + (nanos / 1000000000);
    }

    /**
     * Process streaming recognition results
     */
    private async *processStreamingResults(
        stream: any
    ): AsyncGenerator<StreamingResult, void, unknown> {
        for await (const chunk of stream) {
            if (chunk.results && chunk.results.length > 0) {
                const result = chunk.results[0];
                const alternative = result.alternatives?.[0];

                if (alternative) {
                    yield {
                        text: alternative.transcript || '',
                        confidence: alternative.confidence || 0,
                        isFinal: result.isFinal || false,
                        stability: result.stability || 0
                    };
                }
            }
        }
    }

    /**
     * Get supported languages
     */
    public getSupportedLanguages(): string[] {
        return [...this.supportedLanguages];
    }

    /**
     * Add custom speech context for better recognition
     */
    public createSpeechContext(phrases: string[], boost: number = 10): { phrases: string[]; boost: number } {
        return {
            phrases: phrases.map(phrase => phrase.toLowerCase()),
            boost: Math.max(0, Math.min(20, boost)) // Clamp boost between 0 and 20
        };
    }
}