/**
 * Navigation Feedback Service
 * Generates audio responses for voice navigation using TTS service
 * Integrates with NavigationFeedbackTemplates for multilingual support
 */

import { TTSProcessor, TTSRequest, TTSResult } from './TTSProcessor';
import { NavigationFeedbackTemplates, NavigationFeedbackTemplate } from './NavigationFeedbackTemplates';

export interface NavigationFeedbackRequest {
    type: 'confirmation' | 'error' | 'navigation' | 'help' | 'retry';
    language: string;
    variables?: Record<string, string>;
    templateId?: string;
    priority?: 'low' | 'medium' | 'high';
    cacheKey?: string;
}

export interface NavigationFeedbackResponse {
    success: boolean;
    audioContent?: Buffer;
    textContent: string;
    audioFormat: string;
    duration: number;
    language: string;
    voiceName: string;
    cached: boolean;
    error?: string;
}

export interface AudioCacheEntry {
    audioContent: Buffer;
    textContent: string;
    audioFormat: string;
    duration: number;
    language: string;
    voiceName: string;
    createdAt: Date;
    expiresAt: Date;
    accessCount: number;
    lastAccessed: Date;
}

export interface FeedbackServiceConfig {
    enableCaching: boolean;
    cacheMaxSize: number;
    cacheExpirationHours: number;
    defaultAudioFormat: 'mp3' | 'wav' | 'ogg';
    defaultSpeakingRate: number;
    defaultPitch: number;
    defaultVolumeGain: number;
    maxRetries: number;
    timeoutMs: number;
}

export class NavigationFeedbackService {
    private static instance: NavigationFeedbackService;
    private ttsProcessor: TTSProcessor;
    private feedbackTemplates: NavigationFeedbackTemplates;
    private audioCache: Map<string, AudioCacheEntry> = new Map();
    private config: FeedbackServiceConfig;
    private isInitialized: boolean = false;

    private constructor() {
        this.ttsProcessor = TTSProcessor.getInstance();
        this.feedbackTemplates = NavigationFeedbackTemplates.getInstance();
        this.config = this.getDefaultConfig();
    }

    public static getInstance(): NavigationFeedbackService {
        if (!NavigationFeedbackService.instance) {
            NavigationFeedbackService.instance = new NavigationFeedbackService();
        }
        return NavigationFeedbackService.instance;
    }

    /**
     * Initialize the navigation feedback service
     */
    public async initialize(config?: Partial<FeedbackServiceConfig>): Promise<void> {
        try {
            if (config) {
                this.config = { ...this.config, ...config };
            }

            // Validate configuration
            this.validateConfiguration();

            // Initialize cache cleanup interval
            if (this.config.enableCaching) {
                this.startCacheCleanup();
            }

            this.isInitialized = true;
            this.log('NavigationFeedbackService initialized successfully', 'info');
        } catch (error) {
            this.log(`Failed to initialize NavigationFeedbackService: ${error}`, 'error');
            throw new Error(`Navigation feedback service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Generate audio feedback for navigation actions
     */
    public async generateFeedback(request: NavigationFeedbackRequest): Promise<NavigationFeedbackResponse> {
        try {
            if (!this.isInitialized) {
                throw new Error('NavigationFeedbackService not initialized');
            }

            // Generate cache key
            const cacheKey = request.cacheKey || this.generateCacheKey(request);

            // Check cache first if enabled
            if (this.config.enableCaching) {
                const cachedResponse = this.getCachedResponse(cacheKey);
                if (cachedResponse) {
                    this.log(`Cache hit for key: ${cacheKey}`, 'info');
                    return cachedResponse;
                }
            }

            // Get appropriate template
            const template = this.getTemplate(request.type, request.language, request.templateId);
            if (!template) {
                throw new Error(`No template found for type: ${request.type}, language: ${request.language}`);
            }

            // Render template with variables
            const textContent = this.feedbackTemplates.renderTemplate(template, request.variables || {});

            // Get language-specific voice configuration
            const voiceConfig = this.feedbackTemplates.getLanguageVoiceConfig(request.language);
            if (!voiceConfig) {
                throw new Error(`No voice configuration found for language: ${request.language}`);
            }

            // Prepare TTS request with enhanced configuration for different feedback types
            const ttsRequest: TTSRequest = {
                text: textContent,
                language: request.language,
                voiceName: voiceConfig.voiceName,
                voiceGender: voiceConfig.gender.toLowerCase() as 'male' | 'female' | 'neutral',
                speakingRate: this.getOptimalSpeakingRate(request.type, voiceConfig.speechRate),
                pitch: this.getOptimalPitch(request.type, voiceConfig.pitch),
                volumeGainDb: this.getOptimalVolumeGain(request.type, this.config.defaultVolumeGain),
                audioFormat: this.config.defaultAudioFormat,
                culturalContext: this.getCulturalContext(request.type)
            };

            // Generate audio with retry logic
            const ttsResult = await this.generateAudioWithRetry(ttsRequest);

            // Create response
            const response: NavigationFeedbackResponse = {
                success: true,
                audioContent: ttsResult.audioContent,
                textContent,
                audioFormat: ttsResult.audioFormat,
                duration: ttsResult.duration,
                language: request.language,
                voiceName: ttsResult.voiceName,
                cached: false
            };

            // Cache the response if enabled
            if (this.config.enableCaching) {
                this.cacheResponse(cacheKey, response);
            }

            this.log(`Generated feedback for type: ${request.type}, language: ${request.language}`, 'info');
            return response;

        } catch (error) {
            this.log(`Failed to generate feedback: ${error}`, 'error');
            return {
                success: false,
                textContent: this.getFallbackText(request.type, request.language),
                audioFormat: this.config.defaultAudioFormat,
                duration: 0,
                language: request.language,
                voiceName: 'fallback',
                cached: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Generate confirmation audio for successful navigation
     */
    public async generateNavigationConfirmation(
        destination: string,
        language: string = 'en-US',
        executionTime?: number
    ): Promise<NavigationFeedbackResponse> {
        const variables: Record<string, string> = {
            destination: this.formatDestinationName(destination, language)
        };

        // Add execution time context if available
        if (executionTime && executionTime > 0) {
            variables.executionTime = `${Math.round(executionTime)}ms`;
        }

        return this.generateFeedback({
            type: 'confirmation',
            language,
            variables,
            templateId: 'nav_success',
            priority: 'high',
            cacheKey: `confirmation_${language}_${destination}`
        });
    }

    /**
     * Generate error message with helpful guidance and retry suggestions
     */
    public async generateErrorWithGuidance(
        errorType: 'not_found' | 'access_denied' | 'network_error' | 'service_unavailable' | 'general',
        language: string = 'en-US',
        context?: {
            command?: string;
            destination?: string;
            error?: string;
            suggestions?: string[];
            retryCount?: number;
        }
    ): Promise<NavigationFeedbackResponse> {
        const templateId = this.getErrorTemplateId(errorType);
        const variables: Record<string, string> = {};

        // Populate variables based on context
        if (context?.command) variables.command = context.command;
        if (context?.destination) variables.destination = context.destination;
        if (context?.error) variables.error = context.error;

        // Add retry-specific messaging for repeated failures
        if (context?.retryCount && context.retryCount > 1) {
            variables.retryContext = this.getRetryContextMessage(context.retryCount, language);
        }

        const response = await this.generateFeedback({
            type: 'error',
            language,
            variables,
            templateId,
            priority: 'high'
        });

        // Add suggestions to the response if available
        if (context?.suggestions && context.suggestions.length > 0) {
            const suggestionText = this.formatSuggestions(context.suggestions, language);
            response.textContent += ` ${suggestionText}`;

            // Regenerate audio with suggestions if the original generation was successful
            if (response.success && response.audioContent) {
                const enhancedResponse = await this.generateFeedback({
                    type: 'error',
                    language,
                    variables: { ...variables, suggestions: suggestionText },
                    templateId: 'nav_error_with_suggestions'
                });

                if (enhancedResponse.success) {
                    return enhancedResponse;
                }
            }
        }

        return response;
    }

    /**
     * Generate retry prompt with alternative suggestions
     */
    public async generateRetryPrompt(
        language: string = 'en-US',
        context?: {
            failedCommand?: string;
            retryCount?: number;
            suggestions?: string[];
            lastError?: string;
        }
    ): Promise<NavigationFeedbackResponse> {
        const variables: Record<string, string> = {};

        if (context?.failedCommand) {
            variables.failedCommand = context.failedCommand;
        }

        if (context?.retryCount) {
            variables.retryCount = context.retryCount.toString();
            variables.retryMessage = this.getRetryMessage(context.retryCount, language);
        }

        if (context?.suggestions && context.suggestions.length > 0) {
            variables.suggestions = this.formatSuggestions(context.suggestions, language);
        }

        const templateId = context?.retryCount && context.retryCount > 2
            ? 'nav_retry_final_attempt'
            : 'nav_retry_prompt';

        return this.generateFeedback({
            type: 'retry',
            language,
            variables,
            templateId,
            priority: 'medium'
        });
    }

    /**
     * Generate help message with available commands and examples
     */
    public async generateHelpWithExamples(
        language: string = 'en-US',
        context?: {
            availableCommands?: string[];
            userRole?: string;
            currentPage?: string;
        }
    ): Promise<NavigationFeedbackResponse> {
        const variables: Record<string, string> = {};

        if (context?.availableCommands && context.availableCommands.length > 0) {
            variables.availableCommands = this.formatAvailableCommands(context.availableCommands, language);
        }

        if (context?.currentPage) {
            variables.currentPage = context.currentPage;
        }

        const templateId = context?.userRole === 'admin'
            ? 'nav_help_admin_commands'
            : 'nav_help_commands';

        return this.generateFeedback({
            type: 'help',
            language,
            variables,
            templateId,
            priority: 'low'
        });
    }

    /**
     * Generate multiple feedback responses in batch
     */
    public async generateBatchFeedback(requests: NavigationFeedbackRequest[]): Promise<NavigationFeedbackResponse[]> {
        try {
            const responses = await Promise.allSettled(
                requests.map(request => this.generateFeedback(request))
            );

            return responses.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    this.log(`Batch feedback failed for request ${index}: ${result.reason}`, 'error');
                    return {
                        success: false,
                        textContent: this.getFallbackText(requests[index].type, requests[index].language),
                        audioFormat: this.config.defaultAudioFormat,
                        duration: 0,
                        language: requests[index].language,
                        voiceName: 'fallback',
                        cached: false,
                        error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
                    };
                }
            });
        } catch (error) {
            this.log(`Batch feedback generation failed: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Pre-cache common navigation feedback
     */
    public async preCacheCommonFeedback(languages: string[]): Promise<void> {
        try {
            const commonRequests: NavigationFeedbackRequest[] = [];

            // Generate common feedback requests for each language
            languages.forEach(language => {
                // Confirmation messages
                ['dashboard', 'profile', 'marketplace', 'cart', 'wishlist'].forEach(destination => {
                    commonRequests.push({
                        type: 'confirmation',
                        language,
                        variables: { destination },
                        cacheKey: `confirmation_${language}_${destination}`
                    });
                });

                // Common error messages
                commonRequests.push(
                    {
                        type: 'error',
                        language,
                        templateId: 'nav_error_not_found',
                        cacheKey: `error_not_found_${language}`
                    },
                    {
                        type: 'help',
                        language,
                        templateId: 'nav_help_commands',
                        cacheKey: `help_commands_${language}`
                    }
                );
            });

            // Generate all common feedback in batches
            const batchSize = 5;
            for (let i = 0; i < commonRequests.length; i += batchSize) {
                const batch = commonRequests.slice(i, i + batchSize);
                await this.generateBatchFeedback(batch);

                // Small delay between batches to avoid overwhelming the TTS service
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            this.log(`Pre-cached ${commonRequests.length} common feedback responses`, 'info');
        } catch (error) {
            this.log(`Pre-caching failed: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Clear audio cache
     */
    public clearCache(): void {
        this.audioCache.clear();
        this.log('Audio cache cleared', 'info');
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        totalRequests: number;
        cacheHits: number;
    } {
        const size = this.audioCache.size;
        const maxSize = this.config.cacheMaxSize;

        // Calculate hit rate from cache entries
        let totalAccess = 0;
        let cacheHits = 0;

        this.audioCache.forEach(entry => {
            totalAccess += entry.accessCount;
            if (entry.accessCount > 1) {
                cacheHits += entry.accessCount - 1; // First access is not a hit
            }
        });

        const hitRate = totalAccess > 0 ? cacheHits / totalAccess : 0;

        return {
            size,
            maxSize,
            hitRate,
            totalRequests: totalAccess,
            cacheHits
        };
    }

    /**
     * Get supported languages
     */
    public getSupportedLanguages(): string[] {
        return this.feedbackTemplates.getSupportedLanguages();
    }

    /**
     * Check if service is ready
     */
    public isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * Update configuration
     */
    public updateConfiguration(updates: Partial<FeedbackServiceConfig>): void {
        this.config = { ...this.config, ...updates };
        this.validateConfiguration();
        this.log('Configuration updated', 'info');
    }

    /**
     * Get current configuration
     */
    public getConfiguration(): FeedbackServiceConfig {
        return { ...this.config };
    }

    // Private methods

    private getDefaultConfig(): FeedbackServiceConfig {
        return {
            enableCaching: true,
            cacheMaxSize: 100,
            cacheExpirationHours: 24,
            defaultAudioFormat: 'mp3',
            defaultSpeakingRate: 1.0,
            defaultPitch: 0.0,
            defaultVolumeGain: 0.0,
            maxRetries: 2,
            timeoutMs: 10000
        };
    }

    private validateConfiguration(): void {
        if (this.config.cacheMaxSize < 1) {
            throw new Error('Cache max size must be at least 1');
        }
        if (this.config.cacheExpirationHours < 1) {
            throw new Error('Cache expiration must be at least 1 hour');
        }
        if (this.config.defaultSpeakingRate < 0.25 || this.config.defaultSpeakingRate > 4.0) {
            throw new Error('Speaking rate must be between 0.25 and 4.0');
        }
        if (this.config.defaultPitch < -20.0 || this.config.defaultPitch > 20.0) {
            throw new Error('Pitch must be between -20.0 and 20.0');
        }
    }

    private getTemplate(
        type: NavigationFeedbackTemplate['type'],
        language: string,
        templateId?: string
    ): NavigationFeedbackTemplate | null {
        return this.feedbackTemplates.getTemplate(type, language, templateId);
    }

    private generateCacheKey(request: NavigationFeedbackRequest): string {
        const keyComponents = [
            request.type,
            request.language,
            request.templateId || 'default',
            JSON.stringify(request.variables || {}),
            this.config.defaultAudioFormat,
            this.config.defaultSpeakingRate.toString(),
            this.config.defaultPitch.toString()
        ];

        return Buffer.from(keyComponents.join('|')).toString('base64').substring(0, 32);
    }

    private getCachedResponse(cacheKey: string): NavigationFeedbackResponse | null {
        const entry = this.audioCache.get(cacheKey);
        if (!entry) {
            return null;
        }

        // Check if expired
        if (entry.expiresAt < new Date()) {
            this.audioCache.delete(cacheKey);
            return null;
        }

        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = new Date();

        return {
            success: true,
            audioContent: entry.audioContent,
            textContent: entry.textContent,
            audioFormat: entry.audioFormat,
            duration: entry.duration,
            language: entry.language,
            voiceName: entry.voiceName,
            cached: true
        };
    }

    private cacheResponse(cacheKey: string, response: NavigationFeedbackResponse): void {
        if (!response.success || !response.audioContent) {
            return;
        }

        // Check cache size limit
        if (this.audioCache.size >= this.config.cacheMaxSize) {
            this.evictOldestCacheEntry();
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.config.cacheExpirationHours * 60 * 60 * 1000);

        const entry: AudioCacheEntry = {
            audioContent: response.audioContent,
            textContent: response.textContent,
            audioFormat: response.audioFormat,
            duration: response.duration,
            language: response.language,
            voiceName: response.voiceName,
            createdAt: now,
            expiresAt,
            accessCount: 1,
            lastAccessed: now
        };

        this.audioCache.set(cacheKey, entry);
    }

    private evictOldestCacheEntry(): void {
        let oldestKey: string | null = null;
        let oldestTime = Date.now();

        this.audioCache.forEach((entry, key) => {
            if (entry.lastAccessed.getTime() < oldestTime) {
                oldestTime = entry.lastAccessed.getTime();
                oldestKey = key;
            }
        });

        if (oldestKey) {
            this.audioCache.delete(oldestKey);
        }
    }

    private async generateAudioWithRetry(ttsRequest: TTSRequest): Promise<TTSResult> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
            try {
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('TTS request timeout')), this.config.timeoutMs);
                });

                const ttsPromise = this.ttsProcessor.synthesizeSpeech(ttsRequest);
                const result = await Promise.race([ttsPromise, timeoutPromise]);

                return result;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown TTS error');
                this.log(`TTS attempt ${attempt} failed: ${lastError.message}`, 'warn');

                if (attempt <= this.config.maxRetries) {
                    // Wait before retry with exponential backoff
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError || new Error('TTS generation failed after all retries');
    }

    private getCulturalContext(feedbackType: NavigationFeedbackTemplate['type']): 'formal' | 'casual' | 'business' | 'traditional' {
        switch (feedbackType) {
            case 'confirmation':
            case 'navigation':
                return 'business';
            case 'error':
                return 'formal';
            case 'help':
                return 'casual';
            case 'retry':
                return 'casual';
            default:
                return 'business';
        }
    }

    private getFallbackText(type: NavigationFeedbackTemplate['type'], language: string): string {
        const fallbacks: Record<string, Record<string, string>> = {
            'en-US': {
                confirmation: 'Navigation confirmed',
                error: 'Navigation error occurred',
                navigation: 'Navigating',
                help: 'Voice navigation help',
                retry: 'Please try again'
            },
            'hi-IN': {
                confirmation: 'नेवीगेशन की पुष्टि',
                error: 'नेवीगेशन त्रुटि हुई',
                navigation: 'नेवीगेट कर रहे हैं',
                help: 'वॉयस नेवीगेशन सहायता',
                retry: 'कृपया पुनः प्रयास करें'
            }
        };

        return fallbacks[language]?.[type] || fallbacks['en-US'][type] || 'Navigation feedback';
    }

    private startCacheCleanup(): void {
        // Clean up expired cache entries every hour
        setInterval(() => {
            const now = new Date();
            const expiredKeys: string[] = [];

            this.audioCache.forEach((entry, key) => {
                if (entry.expiresAt < now) {
                    expiredKeys.push(key);
                }
            });

            expiredKeys.forEach(key => {
                this.audioCache.delete(key);
            });

            if (expiredKeys.length > 0) {
                this.log(`Cleaned up ${expiredKeys.length} expired cache entries`, 'info');
            }
        }, 60 * 60 * 1000); // 1 hour
    }

    /**
     * Get optimal speaking rate based on feedback type
     */
    private getOptimalSpeakingRate(type: NavigationFeedbackRequest['type'], baseSpeakingRate: number): number {
        const adjustments = {
            confirmation: 1.1, // Slightly faster for confirmations
            error: 0.9,        // Slower for errors to ensure clarity
            navigation: 1.0,   // Normal speed for navigation
            help: 0.95,        // Slightly slower for help messages
            retry: 0.9         // Slower for retry prompts
        };

        return baseSpeakingRate * (adjustments[type] || 1.0);
    }

    /**
     * Get optimal pitch based on feedback type
     */
    private getOptimalPitch(type: NavigationFeedbackRequest['type'], basePitch: number): number {
        const adjustments = {
            confirmation: 2.0,  // Higher pitch for positive confirmations
            error: -1.0,        // Lower pitch for errors
            navigation: 0.0,    // Neutral pitch for navigation
            help: 1.0,          // Slightly higher for help messages
            retry: 0.0          // Neutral pitch for retry prompts
        };

        return basePitch + (adjustments[type] || 0.0);
    }

    /**
     * Get optimal volume gain based on feedback type
     */
    private getOptimalVolumeGain(type: NavigationFeedbackRequest['type'], baseVolumeGain: number): number {
        const adjustments = {
            confirmation: 1.0,  // Normal volume for confirmations
            error: 2.0,         // Slightly louder for errors to ensure attention
            navigation: 0.0,    // Normal volume for navigation
            help: 0.0,          // Normal volume for help messages
            retry: 1.0          // Slightly louder for retry prompts
        };

        return baseVolumeGain + (adjustments[type] || 0.0);
    }

    /**
     * Format destination name for audio feedback
     */
    private formatDestinationName(destination: string, language: string): string {
        const destinationMappings: Record<string, Record<string, string>> = {
            'en-US': {
                '/dashboard': 'dashboard',
                '/profile': 'profile page',
                '/marketplace': 'marketplace',
                '/cart': 'shopping cart',
                '/wishlist': 'wishlist',
                '/trend-spotter': 'trend analysis',
                '/finance': 'financial dashboard',
                '/smart-product-creator': 'product creator',
                'back': 'previous page'
            },
            'hi-IN': {
                '/dashboard': 'डैशबोर्ड',
                '/profile': 'प्रोफाइल पेज',
                '/marketplace': 'मार्केटप्लेस',
                '/cart': 'शॉपिंग कार्ट',
                '/wishlist': 'विशलिस्ट',
                '/trend-spotter': 'ट्रेंड एनालिसिस',
                '/finance': 'वित्तीय डैशबोर्ड',
                '/smart-product-creator': 'प्रोडक्ट क्रिएटर',
                'back': 'पिछला पेज'
            }
        };

        return destinationMappings[language]?.[destination] || destination.replace(/^\//, '').replace(/-/g, ' ');
    }

    /**
     * Get error template ID based on error type
     */
    private getErrorTemplateId(errorType: string): string {
        const templateMap = {
            not_found: 'nav_error_not_found',
            access_denied: 'nav_error_access_denied',
            network_error: 'nav_error_network',
            service_unavailable: 'nav_error_service_unavailable',
            general: 'nav_error_general'
        };

        return templateMap[errorType] || 'nav_error_general';
    }

    /**
     * Get retry context message based on retry count
     */
    private getRetryContextMessage(retryCount: number, language: string): string {
        const messages: Record<string, Record<number, string>> = {
            'en-US': {
                2: 'This is your second attempt.',
                3: 'This is your third attempt. Please speak clearly.',
                4: 'Final attempt. Please try a different command if this doesn\'t work.'
            },
            'hi-IN': {
                2: 'यह आपका दूसरा प्रयास है।',
                3: 'यह आपका तीसरा प्रयास है। कृपया स्पष्ट रूप से बोलें।',
                4: 'अंतिम प्रयास। यदि यह काम नहीं करता तो कृपया दूसरा कमांड आज़माएं।'
            }
        };

        return messages[language]?.[retryCount] || messages['en-US'][retryCount] || '';
    }

    /**
     * Get retry message based on retry count
     */
    private getRetryMessage(retryCount: number, language: string): string {
        if (retryCount <= 1) return '';

        const messages: Record<string, string[]> = {
            'en-US': [
                'Let\'s try that again.',
                'Please try once more.',
                'One more time, please speak clearly.',
                'Final attempt - please use a simple command.'
            ],
            'hi-IN': [
                'चलिए फिर से कोशिश करते हैं।',
                'कृपया एक बार और कोशिश करें।',
                'एक बार और, कृपया स्पष्ट रूप से बोलें।',
                'अंतिम प्रयास - कृपया सरल कमांड का उपयोग करें।'
            ]
        };

        const languageMessages = messages[language] || messages['en-US'];
        const index = Math.min(retryCount - 1, languageMessages.length - 1);
        return languageMessages[index];
    }

    /**
     * Format suggestions for audio feedback
     */
    private formatSuggestions(suggestions: string[], language: string): string {
        if (suggestions.length === 0) return '';

        const introText = language === 'hi-IN'
            ? 'आप कह सकते हैं:'
            : 'You can try saying:';

        if (suggestions.length === 1) {
            return `${introText} "${suggestions[0]}"`;
        }

        const connector = language === 'hi-IN' ? 'या' : 'or';
        const lastSuggestion = suggestions[suggestions.length - 1];
        const otherSuggestions = suggestions.slice(0, -1);

        return `${introText} ${otherSuggestions.map(s => `"${s}"`).join(', ')} ${connector} "${lastSuggestion}"`;
    }

    /**
     * Format available commands for help messages
     */
    private formatAvailableCommands(commands: string[], language: string): string {
        if (commands.length === 0) return '';

        const introText = language === 'hi-IN'
            ? 'उपलब्ध कमांड्स:'
            : 'Available commands:';

        const formattedCommands = commands.slice(0, 5).map(cmd => `"${cmd}"`).join(', ');

        if (commands.length > 5) {
            const moreText = language === 'hi-IN' ? 'और भी' : 'and more';
            return `${introText} ${formattedCommands}, ${moreText}`;
        }

        return `${introText} ${formattedCommands}`;
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        if (process.env.NODE_ENV === 'development' || level === 'error') {
            const timestamp = new Date().toISOString();
            console[level](`[NavigationFeedbackService] ${timestamp}: ${message}`);
        }
    }
}