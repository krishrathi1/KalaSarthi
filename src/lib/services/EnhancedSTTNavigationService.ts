/**
 * Enhanced Speech-to-Text Navigation Service
 * Extends the existing EnhancedSpeechToTextService for navigation-specific features
 * Adds multilingual speech recognition and real-time voice activity detection
 */

import { EnhancedSpeechToTextService, EnhancedSpeechToTextOptions, EnhancedSpeechToTextResult, StreamingResult } from '../service/EnhancedSpeechToTextService';

export interface NavigationSTTOptions extends EnhancedSpeechToTextOptions {
    enableVoiceActivityDetection?: boolean;
    navigationContext?: string;
    enableNavigationPhrases?: boolean;
    realTimeProcessing?: boolean;
    voiceActivityThreshold?: number;
    silenceTimeout?: number;
}

export interface NavigationSTTResult extends EnhancedSpeechToTextResult {
    voiceActivityDetected: boolean;
    navigationIntent?: string;
    contextualConfidence: number;
    processingTime: number;
    voiceActivityEvents?: VoiceActivityEvent[];
}

export interface VoiceActivityEvent {
    type: 'speech_start' | 'speech_end' | 'silence_detected' | 'noise_detected';
    timestamp: number;
    confidence: number;
    duration?: number;
}

export interface NavigationSpeechContext {
    navigationCommands: string[];
    routeNames: string[];
    actionVerbs: string[];
    locationTerms: string[];
}

export class EnhancedSTTNavigationService {
    private static instance: EnhancedSTTNavigationService;
    private baseSTTService: EnhancedSpeechToTextService;
    private navigationContexts: Map<string, NavigationSpeechContext>;
    private voiceActivityBuffer: VoiceActivityEvent[] = [];
    private isListening: boolean = false;
    private currentLanguage: string = 'en-US';

    private constructor() {
        this.baseSTTService = EnhancedSpeechToTextService.getInstance();
        this.navigationContexts = this.initializeNavigationContexts();
    }

    public static getInstance(): EnhancedSTTNavigationService {
        if (!EnhancedSTTNavigationService.instance) {
            EnhancedSTTNavigationService.instance = new EnhancedSTTNavigationService();
        }
        return EnhancedSTTNavigationService.instance;
    }

    /**
     * Enhanced speech-to-text for navigation with voice activity detection
     */
    public async speechToTextForNavigation(
        audioBuffer: ArrayBuffer,
        options: NavigationSTTOptions = {}
    ): Promise<NavigationSTTResult> {
        const startTime = Date.now();

        try {
            const {
                enableVoiceActivityDetection = true,
                navigationContext = 'general',
                enableNavigationPhrases = true,
                voiceActivityThreshold = 0.5,
                ...baseOptions
            } = options;

            // Enhance speech contexts with navigation-specific phrases
            const enhancedOptions = this.enhanceOptionsForNavigation(baseOptions, navigationContext, enableNavigationPhrases);

            // Perform voice activity detection if enabled
            let voiceActivityEvents: VoiceActivityEvent[] = [];
            let voiceActivityDetected = true;

            if (enableVoiceActivityDetection) {
                const activityResult = await this.detectVoiceActivity(audioBuffer, voiceActivityThreshold);
                voiceActivityEvents = activityResult.events;
                voiceActivityDetected = activityResult.hasVoice;
            }

            // If no voice activity detected, return early
            if (!voiceActivityDetected) {
                return {
                    text: '',
                    confidence: 0,
                    language: enhancedOptions.language || 'en-US',
                    voiceActivityDetected: false,
                    contextualConfidence: 0,
                    processingTime: Date.now() - startTime,
                    voiceActivityEvents
                };
            }

            // Perform speech recognition using base service
            const baseResult = await this.baseSTTService.speechToText(audioBuffer, enhancedOptions);

            // Analyze navigation intent and contextual confidence
            const navigationAnalysis = this.analyzeNavigationIntent(baseResult.text, navigationContext);

            const result: NavigationSTTResult = {
                ...baseResult,
                voiceActivityDetected,
                navigationIntent: navigationAnalysis.intent,
                contextualConfidence: navigationAnalysis.confidence,
                processingTime: Date.now() - startTime,
                voiceActivityEvents
            };

            return result;

        } catch (error) {
            console.error('Enhanced STT navigation error:', error);
            throw new Error(`Navigation speech recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Real-time streaming speech recognition for navigation
     */
    public async *streamSpeechToTextForNavigation(
        audioStream: NodeJS.ReadableStream,
        options: NavigationSTTOptions = {}
    ): AsyncGenerator<NavigationSTTResult, void, unknown> {
        const {
            navigationContext = 'general',
            enableNavigationPhrases = true,
            realTimeProcessing = true,
            silenceTimeout = 3000,
            ...baseOptions
        } = options;

        // Enhance options for navigation
        const enhancedOptions = this.enhanceOptionsForNavigation(baseOptions, navigationContext, enableNavigationPhrases);

        // Start streaming recognition
        const streamingGenerator = this.baseSTTService.streamSpeechToText(audioStream, enhancedOptions);

        let lastSpeechTime = Date.now();
        let accumulatedText = '';
        this.isListening = true;

        try {
            for await (const streamResult of streamingGenerator) {
                const currentTime = Date.now();

                // Check for silence timeout
                if (streamResult.text.trim() === '' && currentTime - lastSpeechTime > silenceTimeout) {
                    this.isListening = false;
                    break;
                }

                if (streamResult.text.trim() !== '') {
                    lastSpeechTime = currentTime;
                    accumulatedText = streamResult.text;
                }

                // Analyze navigation intent for real-time feedback
                const navigationAnalysis = this.analyzeNavigationIntent(streamResult.text, navigationContext);

                // Create voice activity event
                const voiceActivityEvent: VoiceActivityEvent = {
                    type: streamResult.text.trim() !== '' ? 'speech_start' : 'silence_detected',
                    timestamp: currentTime,
                    confidence: streamResult.confidence,
                    duration: 0
                };

                const navigationResult: NavigationSTTResult = {
                    text: streamResult.text,
                    confidence: streamResult.confidence,
                    language: enhancedOptions.language || 'en-US',
                    voiceActivityDetected: streamResult.text.trim() !== '',
                    navigationIntent: navigationAnalysis.intent,
                    contextualConfidence: navigationAnalysis.confidence,
                    processingTime: currentTime - lastSpeechTime,
                    voiceActivityEvents: [voiceActivityEvent]
                };

                yield navigationResult;

                // If final result and navigation intent detected, stop streaming
                if (streamResult.isFinal && navigationAnalysis.intent && navigationAnalysis.confidence > 0.7) {
                    this.isListening = false;
                    break;
                }
            }
        } finally {
            this.isListening = false;
        }
    }

    /**
     * Detect language with navigation context awareness
     */
    public async detectLanguageForNavigation(audioBuffer: ArrayBuffer): Promise<string[]> {
        try {
            const detectedLanguages = await this.baseSTTService.detectLanguage(audioBuffer);

            // Filter languages based on navigation support
            const supportedNavigationLanguages = this.getSupportedNavigationLanguages();
            const filteredLanguages = detectedLanguages.filter(lang =>
                supportedNavigationLanguages.includes(lang)
            );

            return filteredLanguages.length > 0 ? filteredLanguages : ['en-US'];
        } catch (error) {
            console.error('Navigation language detection error:', error);
            return ['en-US'];
        }
    }

    /**
     * Set current language for navigation
     */
    public setNavigationLanguage(language: string): void {
        const supportedLanguages = this.getSupportedNavigationLanguages();
        if (supportedLanguages.includes(language)) {
            this.currentLanguage = language;
        } else {
            console.warn(`Language ${language} not supported for navigation, using fallback`);
            this.currentLanguage = 'en-US';
        }
    }

    /**
     * Get current navigation language
     */
    public getCurrentNavigationLanguage(): string {
        return this.currentLanguage;
    }

    /**
     * Check if currently listening
     */
    public isCurrentlyListening(): boolean {
        return this.isListening;
    }

    /**
     * Stop current listening session
     */
    public stopListening(): void {
        this.isListening = false;
    }

    /**
     * Get supported navigation languages
     */
    public getSupportedNavigationLanguages(): string[] {
        return [
            'en-US', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN',
            'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN'
        ];
    }

    /**
     * Add custom navigation context
     */
    public addNavigationContext(contextName: string, context: NavigationSpeechContext): void {
        this.navigationContexts.set(contextName, context);
    }

    /**
     * Get navigation context
     */
    public getNavigationContext(contextName: string): NavigationSpeechContext | undefined {
        return this.navigationContexts.get(contextName);
    }

    /**
     * Enhance STT options with navigation-specific speech contexts
     */
    private enhanceOptionsForNavigation(
        baseOptions: EnhancedSpeechToTextOptions,
        navigationContext: string,
        enableNavigationPhrases: boolean
    ): EnhancedSpeechToTextOptions {
        const enhancedOptions = { ...baseOptions };

        if (enableNavigationPhrases) {
            const context = this.navigationContexts.get(navigationContext);
            if (context) {
                const navigationPhrases = [
                    ...context.navigationCommands,
                    ...context.routeNames,
                    ...context.actionVerbs,
                    ...context.locationTerms
                ];

                // Create speech context for better recognition
                const navigationSpeechContext = this.baseSTTService.createSpeechContext(navigationPhrases, 15);

                enhancedOptions.speechContexts = [
                    ...(enhancedOptions.speechContexts || []),
                    navigationSpeechContext
                ];
            }
        }

        // Optimize for navigation use case
        enhancedOptions.model = 'command_and_search'; // Better for short commands
        enhancedOptions.enableAutomaticPunctuation = false; // Not needed for navigation
        enhancedOptions.enableWordTimeOffsets = false; // Not needed for navigation
        enhancedOptions.profanityFilter = false; // Allow all navigation terms

        return enhancedOptions;
    }

    /**
     * Detect voice activity in audio buffer
     */
    private async detectVoiceActivity(
        audioBuffer: ArrayBuffer,
        threshold: number
    ): Promise<{ hasVoice: boolean; events: VoiceActivityEvent[] }> {
        try {
            // Simple voice activity detection based on audio energy
            // In a production environment, you might use more sophisticated VAD algorithms

            const audioData = new Float32Array(audioBuffer);
            const windowSize = 1024;
            const events: VoiceActivityEvent[] = [];
            let hasVoice = false;

            for (let i = 0; i < audioData.length; i += windowSize) {
                const window = audioData.slice(i, i + windowSize);
                const energy = this.calculateAudioEnergy(window);
                const timestamp = Date.now() + (i / audioData.length) * 1000;

                if (energy > threshold) {
                    hasVoice = true;
                    events.push({
                        type: 'speech_start',
                        timestamp,
                        confidence: Math.min(energy / threshold, 1.0)
                    });
                } else if (energy < threshold * 0.3) {
                    events.push({
                        type: 'silence_detected',
                        timestamp,
                        confidence: 1.0 - (energy / (threshold * 0.3))
                    });
                }
            }

            return { hasVoice, events };
        } catch (error) {
            console.error('Voice activity detection error:', error);
            return { hasVoice: true, events: [] }; // Assume voice present on error
        }
    }

    /**
     * Calculate audio energy for voice activity detection
     */
    private calculateAudioEnergy(audioWindow: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < audioWindow.length; i++) {
            sum += audioWindow[i] * audioWindow[i];
        }
        return Math.sqrt(sum / audioWindow.length);
    }

    /**
     * Analyze navigation intent from recognized text
     */
    private analyzeNavigationIntent(
        text: string,
        contextName: string
    ): { intent: string | undefined; confidence: number } {
        const context = this.navigationContexts.get(contextName);
        if (!context) {
            return { intent: undefined, confidence: 0 };
        }

        const lowerText = text.toLowerCase().trim();
        let bestMatch = { intent: undefined as string | undefined, confidence: 0 };

        // Check navigation commands
        for (const command of context.navigationCommands) {
            const similarity = this.calculateTextSimilarity(lowerText, command.toLowerCase());
            if (similarity > bestMatch.confidence) {
                bestMatch = { intent: `navigate_${command.replace(/\s+/g, '_')}`, confidence: similarity };
            }
        }

        // Check route names
        for (const route of context.routeNames) {
            const similarity = this.calculateTextSimilarity(lowerText, route.toLowerCase());
            if (similarity > bestMatch.confidence) {
                bestMatch = { intent: `navigate_to_${route.replace(/\s+/g, '_')}`, confidence: similarity };
            }
        }

        // Check action verbs combined with location terms
        for (const verb of context.actionVerbs) {
            for (const location of context.locationTerms) {
                const phrase = `${verb} ${location}`.toLowerCase();
                const similarity = this.calculateTextSimilarity(lowerText, phrase);
                if (similarity > bestMatch.confidence) {
                    bestMatch = { intent: `${verb}_${location}`.replace(/\s+/g, '_'), confidence: similarity };
                }
            }
        }

        return bestMatch;
    }

    /**
     * Calculate text similarity for intent matching
     */
    private calculateTextSimilarity(text1: string, text2: string): number {
        // Simple word-based similarity calculation
        const words1 = text1.split(/\s+/);
        const words2 = text2.split(/\s+/);

        let matches = 0;
        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
                    matches++;
                    break;
                }
            }
        }

        return matches / Math.max(words1.length, words2.length);
    }

    /**
     * Initialize navigation contexts for different languages and scenarios
     */
    private initializeNavigationContexts(): Map<string, NavigationSpeechContext> {
        const contexts = new Map<string, NavigationSpeechContext>();

        // General navigation context (English)
        contexts.set('general', {
            navigationCommands: [
                'go to', 'navigate to', 'open', 'show', 'display', 'take me to',
                'switch to', 'move to', 'visit', 'access', 'view', 'browse'
            ],
            routeNames: [
                'dashboard', 'home', 'profile', 'marketplace', 'cart', 'wishlist',
                'trends', 'finance', 'create product', 'orders', 'settings',
                'notifications', 'help', 'about', 'contact'
            ],
            actionVerbs: [
                'go', 'navigate', 'open', 'show', 'display', 'view', 'browse',
                'create', 'add', 'edit', 'delete', 'search', 'find'
            ],
            locationTerms: [
                'page', 'section', 'area', 'panel', 'tab', 'menu', 'screen',
                'dashboard', 'profile', 'marketplace', 'cart', 'wishlist'
            ]
        });

        // Hindi navigation context
        contexts.set('hindi', {
            navigationCommands: [
                'जाओ', 'खोलो', 'दिखाओ', 'ले चलो', 'देखो', 'ब्राउज़ करो'
            ],
            routeNames: [
                'डैशबोर्ड', 'होम', 'प्रोफाइल', 'मार्केटप्लेस', 'कार्ट', 'विशलिस्ट',
                'ट्रेंड्स', 'फाइनेंस', 'प्रोडक्ट बनाओ', 'ऑर्डर्स', 'सेटिंग्स'
            ],
            actionVerbs: [
                'जाओ', 'खोलो', 'दिखाओ', 'देखो', 'बनाओ', 'जोड़ो', 'खोजो'
            ],
            locationTerms: [
                'पेज', 'सेक्शन', 'एरिया', 'पैनल', 'टैब', 'मेन्यू', 'स्क्रीन'
            ]
        });

        // Add more language contexts as needed
        return contexts;
    }
}