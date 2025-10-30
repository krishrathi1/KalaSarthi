/**
 * Voice Navigation Integration
 * Integrates NavigationFeedbackService with the existing voice navigation system
 * Provides a unified interface for voice navigation with audio feedback
 */

import { NavigationFeedbackService, NavigationFeedbackRequest } from './NavigationFeedbackService';
import { VoiceNavigationService, NavigationIntent, VoiceNavigationResult } from './VoiceNavigationService';

export interface VoiceNavigationWithFeedback {
    navigationResult: VoiceNavigationResult;
    audioFeedback?: ArrayBuffer;
    textFeedback: string;
    feedbackLanguage: string;
}

export interface NavigationFeedbackOptions {
    enableAudioFeedback: boolean;
    feedbackLanguage?: string;
    priority?: 'low' | 'medium' | 'high';
    customTemplateId?: string;
}

export class VoiceNavigationIntegration {
    private static instance: VoiceNavigationIntegration;
    private voiceNavigationService: VoiceNavigationService;
    private feedbackService: NavigationFeedbackService;
    private isInitialized: boolean = false;

    private constructor() {
        this.voiceNavigationService = VoiceNavigationService.getInstance();
        this.feedbackService = NavigationFeedbackService.getInstance();
    }

    public static getInstance(): VoiceNavigationIntegration {
        if (!VoiceNavigationIntegration.instance) {
            VoiceNavigationIntegration.instance = new VoiceNavigationIntegration();
        }
        return VoiceNavigationIntegration.instance;
    }

    /**
     * Initialize the integrated voice navigation system
     */
    public async initialize(): Promise<void> {
        try {
            // Initialize both services
            if (!this.voiceNavigationService.isReady()) {
                await this.voiceNavigationService.initialize();
            }

            if (!this.feedbackService.isReady()) {
                await this.feedbackService.initialize();
            }

            this.isInitialized = true;
            console.log('VoiceNavigationIntegration initialized successfully');
        } catch (error) {
            console.error('Failed to initialize VoiceNavigationIntegration:', error);
            throw error;
        }
    }

    /**
     * Process navigation intent with audio feedback
     */
    public async processNavigationWithFeedback(
        intent: NavigationIntent,
        options: NavigationFeedbackOptions = { enableAudioFeedback: true }
    ): Promise<VoiceNavigationWithFeedback> {
        try {
            if (!this.isInitialized) {
                throw new Error('VoiceNavigationIntegration not initialized');
            }

            const feedbackLanguage = options.feedbackLanguage || intent.language || 'en-US';

            // Process the navigation intent
            const navigationResult: VoiceNavigationResult = {
                success: true,
                intent,
                feedback: `Navigating to ${intent.targetRoute || intent.intent}`,
                executionTime: Date.now()
            };

            // Generate appropriate feedback based on navigation result
            let feedbackType: NavigationFeedbackRequest['type'];
            let variables: Record<string, string> = {};

            if (navigationResult.success) {
                if (intent.targetRoute) {
                    feedbackType = 'confirmation';
                    variables = { destination: this.getDestinationDisplayName(intent.targetRoute, feedbackLanguage) };
                } else {
                    feedbackType = 'navigation';
                    variables = { destination: intent.intent };
                }
            } else {
                feedbackType = 'error';
                variables = { error: navigationResult.error || 'Unknown error' };
            }

            // Generate audio feedback if enabled
            let audioFeedback: ArrayBuffer | undefined;
            let textFeedback: string;

            if (options.enableAudioFeedback) {
                const feedbackRequest: NavigationFeedbackRequest = {
                    type: feedbackType,
                    language: feedbackLanguage,
                    variables,
                    templateId: options.customTemplateId,
                    priority: options.priority || 'medium'
                };

                const feedbackResponse = await this.feedbackService.generateFeedback(feedbackRequest);

                if (feedbackResponse.success && feedbackResponse.audioContent) {
                    audioFeedback = feedbackResponse.audioContent;
                }

                textFeedback = feedbackResponse.textContent;
            } else {
                // Generate text-only feedback
                textFeedback = this.generateTextFeedback(feedbackType, variables, feedbackLanguage);
            }

            return {
                navigationResult,
                audioFeedback,
                textFeedback,
                feedbackLanguage
            };

        } catch (error) {
            console.error('Failed to process navigation with feedback:', error);

            // Return error feedback
            const errorFeedback = await this.generateErrorFeedback(
                error instanceof Error ? error.message : 'Unknown error',
                options.feedbackLanguage || 'en-US',
                options.enableAudioFeedback
            );

            return {
                navigationResult: {
                    success: false,
                    feedback: 'Navigation failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    executionTime: Date.now()
                },
                audioFeedback: errorFeedback.audioFeedback,
                textFeedback: errorFeedback.textFeedback,
                feedbackLanguage: options.feedbackLanguage || 'en-US'
            };
        }
    }

    /**
     * Pre-cache common navigation feedback for better performance
     */
    public async preCacheNavigationFeedback(languages: string[]): Promise<void> {
        try {
            await this.feedbackService.preCacheCommonFeedback(languages);
            console.log(`Pre-cached navigation feedback for ${languages.length} languages`);
        } catch (error) {
            console.error('Failed to pre-cache navigation feedback:', error);
            throw error;
        }
    }

    /**
     * Generate confirmation feedback for successful navigation
     */
    public async generateConfirmationFeedback(
        destination: string,
        language: string = 'en-US',
        enableAudio: boolean = true
    ): Promise<{ textFeedback: string; audioFeedback?: ArrayBuffer }> {
        const feedbackRequest: NavigationFeedbackRequest = {
            type: 'confirmation',
            language,
            variables: { destination: this.getDestinationDisplayName(destination, language) },
            priority: 'high'
        };

        if (enableAudio) {
            const response = await this.feedbackService.generateFeedback(feedbackRequest);
            return {
                textFeedback: response.textContent,
                audioFeedback: response.success ? response.audioContent : undefined
            };
        } else {
            return {
                textFeedback: this.generateTextFeedback('confirmation', { destination }, language)
            };
        }
    }

    /**
     * Generate help feedback for voice navigation commands
     */
    public async generateHelpFeedback(
        language: string = 'en-US',
        enableAudio: boolean = true
    ): Promise<{ textFeedback: string; audioFeedback?: ArrayBuffer }> {
        const feedbackRequest: NavigationFeedbackRequest = {
            type: 'help',
            language,
            templateId: 'nav_help_commands',
            priority: 'medium'
        };

        if (enableAudio) {
            const response = await this.feedbackService.generateFeedback(feedbackRequest);
            return {
                textFeedback: response.textContent,
                audioFeedback: response.success ? response.audioContent : undefined
            };
        } else {
            return {
                textFeedback: this.generateTextFeedback('help', {}, language)
            };
        }
    }

    /**
     * Get cache statistics from the feedback service
     */
    public getCacheStatistics() {
        return this.feedbackService.getCacheStats();
    }

    /**
     * Clear audio feedback cache
     */
    public clearFeedbackCache(): void {
        this.feedbackService.clearCache();
    }

    /**
     * Check if the integration is ready
     */
    public isReady(): boolean {
        return this.isInitialized &&
            this.voiceNavigationService.isReady() &&
            this.feedbackService.isReady();
    }

    // Private helper methods

    private getDestinationDisplayName(route: string, language: string): string {
        const routeNames: Record<string, Record<string, string>> = {
            'en-US': {
                '/dashboard': 'dashboard',
                '/profile': 'profile',
                '/marketplace': 'marketplace',
                '/cart': 'shopping cart',
                '/wishlist': 'wishlist',
                '/trends': 'trends',
                '/finance': 'finance dashboard',
                '/create-product': 'product creator'
            },
            'hi-IN': {
                '/dashboard': 'डैशबोर्ड',
                '/profile': 'प्रोफाइल',
                '/marketplace': 'बाज़ार',
                '/cart': 'शॉपिंग कार्ट',
                '/wishlist': 'विशलिस्ट',
                '/trends': 'ट्रेंड्स',
                '/finance': 'वित्त डैशबोर्ड',
                '/create-product': 'उत्पाद निर्माता'
            }
        };

        return routeNames[language]?.[route] ||
            routeNames['en-US'][route] ||
            route.replace('/', '').replace('-', ' ');
    }

    private generateTextFeedback(
        type: NavigationFeedbackRequest['type'],
        variables: Record<string, string>,
        language: string
    ): string {
        const fallbackTexts: Record<string, Record<string, string>> = {
            'en-US': {
                confirmation: `Navigating to ${variables.destination || 'page'}`,
                navigation: `Opening ${variables.destination || 'page'}`,
                error: `Navigation error: ${variables.error || 'Unknown error'}`,
                help: 'You can say commands like "go to dashboard" or "open profile"',
                retry: 'Please try again with a different command'
            },
            'hi-IN': {
                confirmation: `${variables.destination || 'पेज'} पर जा रहे हैं`,
                navigation: `${variables.destination || 'पेज'} खोल रहे हैं`,
                error: `नेवीगेशन त्रुटि: ${variables.error || 'अज्ञात त्रुटि'}`,
                help: 'आप "डैशबोर्ड पर जाएं" या "प्रोफाइल खोलें" जैसे कमांड कह सकते हैं',
                retry: 'कृपया दूसरे कमांड के साथ कोशिश करें'
            }
        };

        return fallbackTexts[language]?.[type] ||
            fallbackTexts['en-US'][type] ||
            'Navigation feedback';
    }

    private async generateErrorFeedback(
        error: string,
        language: string,
        enableAudio: boolean
    ): Promise<{ textFeedback: string; audioFeedback?: ArrayBuffer }> {
        try {
            if (enableAudio) {
                const feedbackRequest: NavigationFeedbackRequest = {
                    type: 'error',
                    language,
                    variables: { error },
                    priority: 'high'
                };

                const response = await this.feedbackService.generateFeedback(feedbackRequest);
                return {
                    textFeedback: response.textContent,
                    audioFeedback: response.success ? response.audioContent : undefined
                };
            } else {
                return {
                    textFeedback: this.generateTextFeedback('error', { error }, language)
                };
            }
        } catch (feedbackError) {
            console.error('Failed to generate error feedback:', feedbackError);
            return {
                textFeedback: language === 'hi-IN'
                    ? `नेवीगेशन त्रुटि: ${error}`
                    : `Navigation error: ${error}`
            };
        }
    }
}