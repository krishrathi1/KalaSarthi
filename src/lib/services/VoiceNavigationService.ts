/**
 * Voice Navigation Service
 * Core service for handling voice-based navigation throughout the application
 * Integrates with Google Cloud services for STT, TTS, and Dialogflow
 */

import { EnhancedSpeechToTextService } from '../service/EnhancedSpeechToTextService';
import { EnhancedTextToSpeechService } from '../service/EnhancedTextToSpeechService';
import { VoiceNavigationErrorHandler, VoiceNavigationError, ErrorContext, RecoveryResult } from './VoiceNavigationErrorHandler';
import { VoiceNavigationLogger, LogLevel, LogCategory } from './VoiceNavigationLogger';
import { VoiceNavigationFallback, FallbackResult } from './VoiceNavigationFallback';
import { VoiceNavigationProgressiveEnhancement } from './VoiceNavigationProgressiveEnhancement';
import { VoiceNavigationGuidance, ContextualHint } from './VoiceNavigationGuidance';
import { MultilingualVoiceService } from './MultilingualVoiceService';
import { VoiceLanguageSwitcher, LanguageSwitchResult } from './VoiceLanguageSwitcher';
import { VoicePatternMatcher, PatternMatchResult } from './VoicePatternMatcher';

export interface VoiceNavigationConfig {
    enabledLanguages: string[];
    confidenceThreshold: number;
    maxListeningDuration: number;
    fallbackLanguage: string;
    debugMode: boolean;
    serviceAccount: {
        keyFilename: string;
        projectId: string;
    };
}

export interface NavigationIntent {
    intent: string;
    confidence: number;
    parameters: Record<string, any>;
    targetRoute?: string;
    requiresConfirmation?: boolean;
    language: string;
}

export interface VoiceNavigationResult {
    success: boolean;
    intent?: NavigationIntent;
    feedback: string;
    audioFeedback?: ArrayBuffer;
    error?: string;
    executionTime: number;
}

export interface VoiceSession {
    sessionId: string;
    userId: string;
    startTime: Date;
    endTime?: Date;
    language: string;
    commands: VoiceCommand[];
    totalDuration: number;
    successRate: number;
}

export interface VoiceCommand {
    id: string;
    sessionId: string;
    timestamp: Date;
    originalText: string;
    processedText: string;
    intent: string;
    confidence: number;
    parameters: Record<string, any>;
    success: boolean;
    executionTime: number;
    targetRoute?: string;
    error?: string;
}


export interface ErrorHandlingStrategy {
    error: VoiceNavigationError;
    fallbackAction: 'retry' | 'manual_input' | 'help' | 'cancel';
    userMessage: string;
    audioFeedback: string;
    maxRetries: number;
}

export class VoiceNavigationService {
    private static instance: VoiceNavigationService;
    private config: VoiceNavigationConfig;
    private sttService: EnhancedSpeechToTextService;
    private ttsService: EnhancedTextToSpeechService;
    private currentSession: VoiceSession | null = null;
    private isInitialized: boolean = false;
    private errorStrategies: Map<VoiceNavigationError, ErrorHandlingStrategy>;
    private errorHandler: VoiceNavigationErrorHandler;
    private logger: VoiceNavigationLogger;
    private fallbackService: VoiceNavigationFallback;
    private progressiveEnhancement: VoiceNavigationProgressiveEnhancement;
    private guidanceService: VoiceNavigationGuidance;
    private multilingualService: MultilingualVoiceService;
    private languageSwitcher: VoiceLanguageSwitcher;
    private patternMatcher: VoicePatternMatcher;

    private constructor() {
        this.config = this.getDefaultConfig();
        this.sttService = EnhancedSpeechToTextService.getInstance();
        this.ttsService = EnhancedTextToSpeechService.getInstance();
        this.errorStrategies = this.initializeErrorStrategies();
        this.errorHandler = VoiceNavigationErrorHandler.getInstance();
        this.logger = VoiceNavigationLogger.getInstance();
        this.fallbackService = VoiceNavigationFallback.getInstance();
        this.progressiveEnhancement = VoiceNavigationProgressiveEnhancement.getInstance();
        this.guidanceService = VoiceNavigationGuidance.getInstance();
        this.multilingualService = MultilingualVoiceService.getInstance();
        this.languageSwitcher = VoiceLanguageSwitcher.getInstance();
        this.patternMatcher = VoicePatternMatcher.getInstance();

        // Configure logger for voice navigation
        this.logger.configure({
            enabled: this.config.debugMode,
            level: this.config.debugMode ? LogLevel.DEBUG : LogLevel.INFO,
            enableConsoleOutput: this.config.debugMode,
            enablePerformanceTracking: true
        });
    }

    public static getInstance(): VoiceNavigationService {
        if (!VoiceNavigationService.instance) {
            VoiceNavigationService.instance = new VoiceNavigationService();
        }
        return VoiceNavigationService.instance;
    }

    /**
     * Initialize the voice navigation service with configuration
     */
    public async initialize(config?: Partial<VoiceNavigationConfig>): Promise<void> {
        const initTimer = this.logger.startTiming('voice_navigation_initialization');

        try {
            this.logger.info(LogCategory.SYSTEM, 'Initializing VoiceNavigationService');

            if (config) {
                this.config = { ...this.config, ...config };
                this.logger.debug(LogCategory.SYSTEM, 'Configuration updated', { config });
            }

            // Validate configuration
            this.validateConfiguration();
            this.logger.debug(LogCategory.SYSTEM, 'Configuration validated');

            // Test authentication with Google Cloud services
            await this.testAuthentication();
            this.logger.debug(LogCategory.SYSTEM, 'Authentication test passed');

            this.isInitialized = true;
            initTimer();
            this.logger.info(LogCategory.SYSTEM, 'VoiceNavigationService initialized successfully');
        } catch (error) {
            initTimer();
            this.logger.error(
                LogCategory.SYSTEM,
                'Failed to initialize VoiceNavigationService',
                error instanceof Error ? error : new Error(String(error))
            );

            // Handle initialization error
            const recoveryResult = await this.handleError(
                VoiceNavigationError.INITIALIZATION_FAILED,
                { additionalData: { configProvided: !!config } }
            );

            throw new Error(`Voice navigation initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Start a new voice navigation session
     */
    public async startSession(userId: string, language?: string): Promise<string> {
        const sessionTimer = this.logger.startTiming('voice_session_start');

        try {
            this.logger.info(LogCategory.SYSTEM, 'Starting voice navigation session', { userId, language });

            if (!this.isInitialized) {
                const error = new Error('VoiceNavigationService not initialized');
                await this.handleError(VoiceNavigationError.INITIALIZATION_FAILED, { userId });
                throw error;
            }

            const sessionId = this.generateSessionId();
            const sessionLanguage = language || this.config.fallbackLanguage;

            // Validate language support
            if (!this.config.enabledLanguages.includes(sessionLanguage)) {
                const error = new Error(`Language ${sessionLanguage} not supported`);
                await this.handleError(VoiceNavigationError.LANGUAGE_NOT_SUPPORTED, {
                    userId,
                    language: sessionLanguage,
                    additionalData: { requestedLanguage: sessionLanguage, supportedLanguages: this.config.enabledLanguages }
                });
                throw error;
            }

            this.currentSession = {
                sessionId,
                userId,
                startTime: new Date(),
                language: sessionLanguage,
                commands: [],
                totalDuration: 0,
                successRate: 0
            };

            sessionTimer();
            // Set user for guidance system
            this.guidanceService.setCurrentUser(userId);

            this.logger.info(LogCategory.SYSTEM, 'Voice navigation session started successfully', {
                sessionId,
                userId,
                language: sessionLanguage
            });

            return sessionId;
        } catch (error) {
            sessionTimer();
            this.logger.error(
                LogCategory.SYSTEM,
                'Failed to start voice session',
                error instanceof Error ? error : new Error(String(error)),
                { userId, language }
            );
            throw error;
        }
    }

    /**
     * End the current voice navigation session
     */
    public async endSession(): Promise<VoiceSession | null> {
        try {
            if (!this.currentSession) {
                return null;
            }

            this.currentSession.endTime = new Date();
            this.currentSession.totalDuration =
                this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();

            // Calculate success rate
            const successfulCommands = this.currentSession.commands.filter(cmd => cmd.success).length;
            this.currentSession.successRate =
                this.currentSession.commands.length > 0
                    ? successfulCommands / this.currentSession.commands.length
                    : 0;

            const completedSession = { ...this.currentSession };
            this.currentSession = null;

            this.log(`Voice navigation session ended: ${completedSession.sessionId}`, 'info');
            return completedSession;
        } catch (error) {
            this.log(`Failed to end voice session: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Get current configuration
     */
    public getConfiguration(): VoiceNavigationConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    public updateConfiguration(updates: Partial<VoiceNavigationConfig>): void {
        this.config = { ...this.config, ...updates };
        this.validateConfiguration();
        this.log('Configuration updated', 'info');
    }

    /**
     * Get supported languages
     */
    public getSupportedLanguages(): string[] {
        return [...this.config.enabledLanguages];
    }

    /**
     * Check if service is initialized and ready
     */
    public isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * Get current session information
     */
    public getCurrentSession(): VoiceSession | null {
        return this.currentSession ? { ...this.currentSession } : null;
    }

    /**
     * Activate fallback mode when voice navigation fails
     */
    public async activateFallback(error: VoiceNavigationError, context?: any): Promise<FallbackResult> {
        try {
            this.logger.info(LogCategory.ERROR_HANDLING, 'Activating fallback mode', { error, context });

            const fallbackResult = await this.fallbackService.activateFallback(error, context);

            // Log fallback activation
            this.logger.info(LogCategory.ERROR_HANDLING, 'Fallback mode activated', {
                mode: fallbackResult.mode,
                success: fallbackResult.success,
                availableFeatures: fallbackResult.availableFeatures
            });

            return fallbackResult;
        } catch (fallbackError) {
            this.logger.error(
                LogCategory.ERROR_HANDLING,
                'Failed to activate fallback mode',
                fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
                { originalError: error }
            );

            // Return emergency fallback
            return {
                success: true,
                mode: 'manual_only',
                message: 'Voice navigation is unavailable. Please use manual navigation.',
                availableFeatures: ['manual_navigation'],
                limitations: ['All voice features disabled']
            };
        }
    }

    /**
     * Process command using offline patterns when online services fail
     */
    public processOfflineCommand(input: string, language?: string): {
        matched: boolean;
        route?: string;
        confidence: number;
    } {
        try {
            const sessionLanguage = language || this.currentSession?.language || this.config.fallbackLanguage;

            this.logger.debug(LogCategory.VOICE_INPUT, 'Processing offline command', { input, language: sessionLanguage });

            const result = this.fallbackService.processOfflineCommand(input, sessionLanguage);

            if (result.matched && result.command) {
                // Add to session if available
                if (this.currentSession) {
                    this.addCommandToSession({
                        id: `offline_${Date.now()}`,
                        timestamp: new Date(),
                        originalText: input,
                        processedText: input,
                        intent: result.command.intent,
                        confidence: result.confidence,
                        parameters: { offline: true },
                        success: true,
                        executionTime: 0,
                        targetRoute: result.route
                    });
                }

                this.logger.info(LogCategory.VOICE_INPUT, 'Offline command processed successfully', {
                    intent: result.command.intent,
                    route: result.route,
                    confidence: result.confidence
                });
            }

            return {
                matched: result.matched,
                route: result.route,
                confidence: result.confidence
            };
        } catch (error) {
            this.logger.error(
                LogCategory.VOICE_INPUT,
                'Error processing offline command',
                error instanceof Error ? error : new Error(String(error)),
                { input, language }
            );

            return {
                matched: false,
                confidence: 0
            };
        }
    }

    /**
     * Check available features based on current capabilities
     */
    public getAvailableFeatures(): string[] {
        return this.progressiveEnhancement.getAvailableFeatures();
    }

    /**
     * Check if a specific feature is available
     */
    public isFeatureAvailable(feature: string): boolean {
        const availability = this.progressiveEnhancement.isFeatureAvailable(feature);
        return availability.available;
    }

    /**
     * Get current fallback mode
     */
    public getCurrentFallbackMode(): string {
        return this.fallbackService.getCurrentMode();
    }

    /**
     * Attempt to upgrade features if capabilities have improved
     */
    public async upgradeFeatures(): Promise<{
        upgraded: boolean;
        newFeatures: string[];
    }> {
        try {
            const result = await this.progressiveEnhancement.upgradeFeatures();

            if (result.upgraded) {
                this.logger.info(LogCategory.SYSTEM, 'Features upgraded', {
                    previousLevel: result.previousLevel,
                    newLevel: result.newLevel,
                    newFeatures: result.newFeatures
                });

                // Try to reset fallback mode to full functionality
                await this.fallbackService.resetToFullMode();
            }

            return {
                upgraded: result.upgraded,
                newFeatures: result.newFeatures
            };
        } catch (error) {
            this.logger.error(
                LogCategory.SYSTEM,
                'Failed to upgrade features',
                error instanceof Error ? error : new Error(String(error))
            );

            return {
                upgraded: false,
                newFeatures: []
            };
        }
    }

    /**
     * Get help for voice navigation
     */
    public getHelp(query?: string, language?: string): {
        commands: any[];
        topics: any[];
        suggestions: string[];
    } {
        const sessionLanguage = language || this.currentSession?.language || this.config.fallbackLanguage;
        return this.guidanceService.getHelp(query, sessionLanguage);
    }

    /**
     * Get contextual hints for current situation
     */
    public getContextualHints(context: {
        currentPage?: string;
        lastError?: string;
        userAction?: string;
        sessionDuration?: number;
    }): ContextualHint[] {
        return this.guidanceService.getContextualHints(context);
    }

    /**
     * Get command suggestions
     */
    public getCommandSuggestions(context: {
        currentPage?: string;
        userInput?: string;
        errorType?: string;
        language?: string;
    }): string[] {
        const sessionLanguage = context.language || this.currentSession?.language || this.config.fallbackLanguage;
        return this.guidanceService.getCommandSuggestions({
            ...context,
            language: sessionLanguage
        });
    }

    /**
     * Start a tutorial
     */
    public startTutorial(tutorialId: string): {
        success: boolean;
        tutorial?: any;
        currentStep?: any;
        message: string;
    } {
        // Set current user if session exists
        if (this.currentSession?.userId) {
            this.guidanceService.setCurrentUser(this.currentSession.userId);
        }

        return this.guidanceService.startTutorial(tutorialId);
    }

    /**
     * Process tutorial step
     */
    public processTutorialStep(command: string): {
        success: boolean;
        completed: boolean;
        nextStep?: any;
        feedback: string;
        audioFeedback?: string;
    } {
        return this.guidanceService.processTutorialStep(command);
    }

    /**
     * Get available tutorials
     */
    public getAvailableTutorials(): any[] {
        return this.guidanceService.getAvailableTutorials();
    }

    /**
     * Process voice input with multilingual support and pattern matching
     */
    public async processMultilingualVoiceInput(
        voiceInput: string,
        userId?: string,
        autoDetectLanguage: boolean = true
    ): Promise<VoiceNavigationResult> {
        const startTime = Date.now();

        try {
            this.logger.info(LogCategory.VOICE_INPUT, 'Processing multilingual voice input', {
                input: voiceInput,
                userId,
                autoDetectLanguage
            });

            // Auto-detect and switch language if needed
            if (autoDetectLanguage) {
                const switchResult = await this.languageSwitcher.autoSwitchFromInput(voiceInput, userId);
                if (switchResult.success) {
                    this.logger.info(LogCategory.VOICE_INPUT, 'Language auto-switched', {
                        from: switchResult.previousLanguage,
                        to: switchResult.newLanguage
                    });
                }
            }

            // Check for language switch commands first
            const languageSwitchResult = await this.languageSwitcher.processLanguageSwitchCommand(voiceInput, userId);
            if (languageSwitchResult.success) {
                return {
                    success: true,
                    feedback: languageSwitchResult.message,
                    audioFeedback: languageSwitchResult.audioFeedback ?
                        new TextEncoder().encode(languageSwitchResult.audioFeedback).buffer : undefined,
                    executionTime: Date.now() - startTime
                };
            }

            // Match voice patterns for navigation
            const currentLanguage = this.multilingualService.getCurrentLanguage();
            const patternMatch = this.patternMatcher.matchPattern(voiceInput, currentLanguage);

            if (!patternMatch.matched) {
                const errorMessage = this.multilingualService.getErrorMessages(currentLanguage)[0] ||
                    'Command not recognized';

                return {
                    success: false,
                    feedback: errorMessage,
                    error: 'INTENT_NOT_RECOGNIZED',
                    executionTime: Date.now() - startTime
                };
            }

            // Create navigation intent from pattern match
            const navigationIntent: NavigationIntent = {
                intent: patternMatch.intent!,
                confidence: patternMatch.confidence,
                parameters: patternMatch.parameters,
                language: patternMatch.language,
                targetRoute: this.resolveRouteFromIntent(patternMatch.intent!, patternMatch.parameters)
            };

            // Add command to session if available
            if (this.currentSession) {
                this.addCommandToSession({
                    id: `multilingual_${Date.now()}`,
                    timestamp: new Date(),
                    originalText: voiceInput,
                    processedText: voiceInput,
                    intent: navigationIntent.intent,
                    confidence: navigationIntent.confidence,
                    parameters: navigationIntent.parameters,
                    success: true,
                    executionTime: Date.now() - startTime,
                    targetRoute: navigationIntent.targetRoute
                });
            }

            // Generate confirmation message
            const confirmationPhrases = this.multilingualService.getConfirmationPhrases(currentLanguage);
            const confirmationTemplate = confirmationPhrases[0] || 'Navigating to {destination}';
            const feedback = confirmationTemplate.replace('{destination}',
                navigationIntent.targetRoute || navigationIntent.intent);

            this.logger.info(LogCategory.VOICE_INPUT, 'Multilingual voice input processed successfully', {
                intent: navigationIntent.intent,
                confidence: navigationIntent.confidence,
                language: currentLanguage,
                targetRoute: navigationIntent.targetRoute
            });

            return {
                success: true,
                intent: navigationIntent,
                feedback,
                executionTime: Date.now() - startTime
            };

        } catch (error) {
            this.logger.error(
                LogCategory.VOICE_INPUT,
                'Error processing multilingual voice input',
                error instanceof Error ? error : new Error(String(error)),
                { input: voiceInput, userId }
            );

            return {
                success: false,
                feedback: 'Voice processing failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                executionTime: Date.now() - startTime
            };
        }
    }

    /**
     * Switch voice navigation language
     */
    public async switchVoiceLanguage(
        targetLanguage: string,
        userId?: string
    ): Promise<LanguageSwitchResult> {
        try {
            this.logger.info(LogCategory.SYSTEM, 'Switching voice language', {
                targetLanguage,
                userId,
                currentLanguage: this.multilingualService.getCurrentLanguage()
            });

            const result = await this.languageSwitcher.switchLanguage(targetLanguage, userId);

            if (result.success) {
                // Update session language if available
                if (this.currentSession) {
                    this.currentSession.language = result.newLanguage;
                }

                this.logger.info(LogCategory.SYSTEM, 'Voice language switched successfully', {
                    from: result.previousLanguage,
                    to: result.newLanguage
                });
            }

            return result;
        } catch (error) {
            this.logger.error(
                LogCategory.SYSTEM,
                'Error switching voice language',
                error instanceof Error ? error : new Error(String(error)),
                { targetLanguage, userId }
            );

            return {
                success: false,
                previousLanguage: this.multilingualService.getCurrentLanguage(),
                newLanguage: this.multilingualService.getCurrentLanguage(),
                message: `Language switch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Get current voice language
     */
    public getCurrentVoiceLanguage(): string {
        return this.multilingualService.getCurrentLanguage();
    }

    /**
     * Get supported voice languages
     */
    public getSupportedVoiceLanguages(): Array<{ code: string; name: string; supported: boolean }> {
        return this.languageSwitcher.getAvailableLanguages();
    }

    /**
     * Get language-specific navigation patterns
     */
    public getNavigationPatterns(language?: string): any {
        return this.multilingualService.getNavigationPatterns(language);
    }

    /**
     * Add custom voice pattern for a language
     */
    public addCustomVoicePattern(
        language: string,
        pattern: string,
        intent: string,
        variations: string[] = [],
        culturalContext: string = 'informal'
    ): void {
        try {
            const voicePattern = {
                pattern,
                intent,
                confidence: 0.8,
                language,
                culturalContext,
                variations
            };

            this.patternMatcher.addCustomPattern(language, voicePattern, culturalContext);

            this.logger.info(LogCategory.SYSTEM, 'Custom voice pattern added', {
                language,
                pattern,
                intent,
                culturalContext
            });
        } catch (error) {
            this.logger.error(
                LogCategory.SYSTEM,
                'Error adding custom voice pattern',
                error instanceof Error ? error : new Error(String(error)),
                { language, pattern, intent }
            );
        }
    }

    /**
     * Resolve route from navigation intent and parameters
     */
    private resolveRouteFromIntent(intent: string, parameters: Record<string, any>): string | undefined {
        const routeMapping: Record<string, string> = {
            'navigate_dashboard': '/dashboard',
            'navigate_profile': '/profile',
            'navigate_marketplace': '/marketplace',
            'navigate_cart': '/cart',
            'navigate_wishlist': '/wishlist',
            'navigate_trends': '/trend-spotter',
            'navigate_finance': '/finance/dashboard',
            'navigate_create_product': '/smart-product-creator',
            'navigate_back': 'back',
            'navigate_home': '/'
        };

        // Handle destination parameter
        if (parameters.destination) {
            const destination = parameters.destination.toLowerCase();

            // Map common destination names to routes
            const destinationMapping: Record<string, string> = {
                'dashboard': '/dashboard',
                'profile': '/profile',
                'marketplace': '/marketplace',
                'market': '/marketplace',
                'shop': '/marketplace',
                'cart': '/cart',
                'wishlist': '/wishlist',
                'trends': '/trend-spotter',
                'finance': '/finance/dashboard',
                'khata': '/finance/dashboard',
                'product creator': '/smart-product-creator',
                'creator': '/smart-product-creator',
                'home': '/'
            };

            if (destinationMapping[destination]) {
                return destinationMapping[destination];
            }
        }

        return routeMapping[intent];
    }

    /**
     * Handle voice navigation errors with comprehensive error handling
     */
    public async handleError(error: VoiceNavigationError | Error, context?: Partial<ErrorContext>): Promise<RecoveryResult> {
        try {
            // Create error context with session information
            const errorContext: Partial<ErrorContext> = {
                sessionId: this.currentSession?.sessionId,
                userId: this.currentSession?.userId,
                language: this.currentSession?.language || this.config.fallbackLanguage,
                ...context
            };

            // Log the error
            this.logger.error(
                LogCategory.ERROR_HANDLING,
                `Voice navigation error occurred: ${error instanceof Error ? error.message : error}`,
                error instanceof Error ? error : undefined,
                errorContext
            );

            // Use the error handler to process the error
            const recoveryResult = await this.errorHandler.handleError(error, errorContext);

            // Log the recovery action
            this.logger.info(
                LogCategory.ERROR_HANDLING,
                `Error recovery action: ${recoveryResult.action}`,
                {
                    success: recoveryResult.success,
                    shouldRetry: recoveryResult.shouldRetry,
                    retryAfter: recoveryResult.retryAfter
                }
            );

            return recoveryResult;
        } catch (handlingError) {
            this.logger.critical(
                LogCategory.ERROR_HANDLING,
                'Failed to handle voice navigation error',
                handlingError instanceof Error ? handlingError : new Error(String(handlingError)),
                { originalError: error }
            );

            // Return default recovery result
            return {
                success: false,
                action: 'cancel' as any,
                message: 'An unexpected error occurred. Please try again.',
                shouldRetry: false
            };
        }
    }

    /**
     * Handle voice navigation errors with appropriate strategies (legacy method)
     */
    public handleErrorLegacy(error: VoiceNavigationError, context?: any): ErrorHandlingStrategy {
        const strategy = this.errorStrategies.get(error);
        if (!strategy) {
            return {
                error,
                fallbackAction: 'cancel',
                userMessage: 'An unexpected error occurred. Please try again.',
                audioFeedback: 'Sorry, something went wrong. Please try again.',
                maxRetries: 1
            };
        }

        this.log(`Handling error: ${error} with strategy: ${strategy.fallbackAction}`, 'warn');
        return strategy;
    }

    /**
     * Add a command to the current session
     */
    public addCommandToSession(command: Omit<VoiceCommand, 'sessionId'>): void {
        if (!this.currentSession) {
            return;
        }

        const fullCommand: VoiceCommand = {
            ...command,
            sessionId: this.currentSession.sessionId
        };

        this.currentSession.commands.push(fullCommand);
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(): VoiceNavigationConfig {
        return {
            enabledLanguages: [
                'en-US', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN',
                'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN'
            ],
            confidenceThreshold: 0.7,
            maxListeningDuration: 10000, // 10 seconds
            fallbackLanguage: 'en-US',
            debugMode: process.env.NODE_ENV === 'development',
            serviceAccount: {
                keyFilename: 'key.json',
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kalabandhu-a93b0'
            }
        };
    }

    /**
     * Validate configuration
     */
    private validateConfiguration(): void {
        if (!this.config.enabledLanguages || this.config.enabledLanguages.length === 0) {
            throw new Error('At least one language must be enabled');
        }

        if (!this.config.enabledLanguages.includes(this.config.fallbackLanguage)) {
            throw new Error('Fallback language must be in enabled languages list');
        }

        if (this.config.confidenceThreshold < 0 || this.config.confidenceThreshold > 1) {
            throw new Error('Confidence threshold must be between 0 and 1');
        }

        if (this.config.maxListeningDuration < 1000 || this.config.maxListeningDuration > 30000) {
            throw new Error('Max listening duration must be between 1 and 30 seconds');
        }

        if (!this.config.serviceAccount.keyFilename || !this.config.serviceAccount.projectId) {
            throw new Error('Service account configuration is required');
        }
    }

    /**
     * Test authentication with Google Cloud services
     */
    private async testAuthentication(): Promise<void> {
        try {
            // Test STT service authentication
            const supportedLanguages = this.sttService.getSupportedLanguages();
            if (!supportedLanguages || supportedLanguages.length === 0) {
                throw new Error('STT service authentication failed');
            }

            this.log('Google Cloud authentication successful', 'info');
        } catch (error) {
            this.log(`Authentication test failed: ${error}`, 'error');
            throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Initialize error handling strategies
     */
    private initializeErrorStrategies(): Map<VoiceNavigationError, ErrorHandlingStrategy> {
        const strategies = new Map<VoiceNavigationError, ErrorHandlingStrategy>();

        strategies.set(VoiceNavigationError.MICROPHONE_ACCESS_DENIED, {
            error: VoiceNavigationError.MICROPHONE_ACCESS_DENIED,
            fallbackAction: 'manual_input',
            userMessage: 'Microphone access is required for voice navigation. Please enable microphone permissions.',
            audioFeedback: 'Please enable microphone access to use voice navigation.',
            maxRetries: 0
        });

        strategies.set(VoiceNavigationError.SPEECH_NOT_RECOGNIZED, {
            error: VoiceNavigationError.SPEECH_NOT_RECOGNIZED,
            fallbackAction: 'retry',
            userMessage: 'Sorry, I didn\'t understand that. Please try speaking more clearly.',
            audioFeedback: 'I didn\'t catch that. Please try again.',
            maxRetries: 3
        });

        strategies.set(VoiceNavigationError.LANGUAGE_NOT_SUPPORTED, {
            error: VoiceNavigationError.LANGUAGE_NOT_SUPPORTED,
            fallbackAction: 'help',
            userMessage: 'This language is not supported. Please switch to a supported language.',
            audioFeedback: 'Language not supported. Please use English or another supported language.',
            maxRetries: 0
        });

        strategies.set(VoiceNavigationError.NETWORK_ERROR, {
            error: VoiceNavigationError.NETWORK_ERROR,
            fallbackAction: 'retry',
            userMessage: 'Network connection issue. Please check your internet connection and try again.',
            audioFeedback: 'Connection problem. Please try again.',
            maxRetries: 2
        });

        strategies.set(VoiceNavigationError.SERVICE_UNAVAILABLE, {
            error: VoiceNavigationError.SERVICE_UNAVAILABLE,
            fallbackAction: 'manual_input',
            userMessage: 'Voice navigation service is temporarily unavailable. Please use manual navigation.',
            audioFeedback: 'Voice service unavailable. Please navigate manually.',
            maxRetries: 1
        });

        strategies.set(VoiceNavigationError.INTENT_NOT_RECOGNIZED, {
            error: VoiceNavigationError.INTENT_NOT_RECOGNIZED,
            fallbackAction: 'help',
            userMessage: 'I didn\'t understand that command. Say "help" to hear available commands.',
            audioFeedback: 'Command not recognized. Say help for available commands.',
            maxRetries: 2
        });

        strategies.set(VoiceNavigationError.ROUTE_NOT_FOUND, {
            error: VoiceNavigationError.ROUTE_NOT_FOUND,
            fallbackAction: 'help',
            userMessage: 'That page doesn\'t exist or you don\'t have access to it.',
            audioFeedback: 'Page not found or access denied.',
            maxRetries: 0
        });

        strategies.set(VoiceNavigationError.AUTHENTICATION_FAILED, {
            error: VoiceNavigationError.AUTHENTICATION_FAILED,
            fallbackAction: 'cancel',
            userMessage: 'Authentication failed. Please check your credentials.',
            audioFeedback: 'Authentication error. Please contact support.',
            maxRetries: 0
        });

        strategies.set(VoiceNavigationError.QUOTA_EXCEEDED, {
            error: VoiceNavigationError.QUOTA_EXCEEDED,
            fallbackAction: 'manual_input',
            userMessage: 'Voice service quota exceeded. Please try again later or use manual navigation.',
            audioFeedback: 'Service limit reached. Please try again later.',
            maxRetries: 0
        });

        return strategies;
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `voice_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Logging utility
     */
    private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        if (this.config.debugMode || level === 'error') {
            const timestamp = new Date().toISOString();
            console[level](`[VoiceNavigationService] ${timestamp}: ${message}`);
        }
    }
}