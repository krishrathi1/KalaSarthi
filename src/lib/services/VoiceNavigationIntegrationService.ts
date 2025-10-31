/**
 * Voice Navigation Integration Service
 * Unified interface that integrates all navigation components
 * Provides a single entry point for voice navigation functionality
 */

import { NavigationIntentMappingService, NavigationPermissionContext } from './NavigationIntentMappingService';
import { NavigationExecutorService, NavigationExecutionResult } from './NavigationExecutorService';
import { RouteValidationSecurityService } from './RouteValidationSecurityService';
import { DialogflowNavigationService } from './DialogflowNavigationService';
import { NavigationFeedbackService } from './NavigationFeedbackService';
import { UserProfile } from '@/context/auth-context';

export interface VoiceNavigationRequest {
    message: string;
    sessionId: string;
    language?: string;
    userProfile?: UserProfile;
    currentRoute?: string;
    sessionData?: Record<string, any>;
}

export interface VoiceNavigationResponse {
    success: boolean;
    executed: boolean;
    intent?: string;
    confidence?: number;
    targetRoute?: string;
    message: string;
    audioFeedback?: string;
    audioContent?: Buffer;
    requiresConfirmation?: boolean;
    confirmationId?: string;
    confirmationMessage?: string;
    error?: string;
    errorType?: 'not_found' | 'access_denied' | 'network_error' | 'service_unavailable' | 'general';
    suggestions?: string[];
    retryCount?: number;
    canRetry?: boolean;
    navigationHistory?: any[];
}

export interface NavigationServiceStatus {
    isInitialized: boolean;
    servicesReady: {
        intentMapping: boolean;
        executor: boolean;
        security: boolean;
        dialogflow: boolean;
        feedback: boolean;
    };
    retryAttempts: number;
    lastError?: string;
}

export class VoiceNavigationIntegrationService {
    private static instance: VoiceNavigationIntegrationService;
    private intentMappingService: NavigationIntentMappingService;
    private executorService: NavigationExecutorService;
    private securityService: RouteValidationSecurityService;
    private dialogflowService: DialogflowNavigationService;
    private feedbackService: NavigationFeedbackService;
    private isInitialized: boolean = false;
    private router: any = null;
    private retryAttempts: Map<string, number> = new Map();
    private maxRetryAttempts: number = 3;

    private constructor() {
        this.intentMappingService = NavigationIntentMappingService.getInstance();
        this.executorService = NavigationExecutorService.getInstance();
        this.securityService = RouteValidationSecurityService.getInstance();
        this.dialogflowService = DialogflowNavigationService.getInstance();
        this.feedbackService = NavigationFeedbackService.getInstance();
    }

    public static getInstance(): VoiceNavigationIntegrationService {
        if (!VoiceNavigationIntegrationService.instance) {
            VoiceNavigationIntegrationService.instance = new VoiceNavigationIntegrationService();
        }
        return VoiceNavigationIntegrationService.instance;
    }

    /**
     * Initialize the integrated voice navigation system
     */
    public async initialize(router?: any): Promise<void> {
        try {
            if (router) {
                this.router = router;
                this.executorService.initialize(router);
            }

            // Initialize feedback service
            await this.feedbackService.initialize();

            this.isInitialized = true;
            console.log('VoiceNavigationIntegrationService initialized successfully');
        } catch (error) {
            console.error('Failed to initialize VoiceNavigationIntegrationService:', error);
            throw error;
        }
    }

    /**
     * Process voice navigation request with enhanced confirmation and error handling
     */
    public async processVoiceNavigation(request: VoiceNavigationRequest): Promise<VoiceNavigationResponse> {
        const language = request.language || 'en-US';
        const sessionKey = `${request.sessionId}_${request.message}`;

        try {
            if (!this.isInitialized) {
                throw new Error('Voice navigation service not initialized');
            }

            // Track retry attempts
            const currentRetryCount = this.retryAttempts.get(sessionKey) || 0;
            this.retryAttempts.set(sessionKey, currentRetryCount + 1);

            // Create navigation context
            const context: NavigationPermissionContext = {
                userProfile: request.userProfile,
                currentRoute: request.currentRoute,
                sessionData: request.sessionData,
                language
            };

            // Update executor context
            if (request.userProfile || request.currentRoute) {
                this.executorService.updateContext({
                    userProfile: request.userProfile,
                    currentRoute: request.currentRoute || '/',
                    sessionData: request.sessionData,
                    language
                });
            }

            // Detect navigation intent using Dialogflow
            const dialogflowResponse = await this.dialogflowService.detectNavigationIntent(
                request.message,
                request.sessionId,
                language,
                {
                    currentRoute: request.currentRoute || '/',
                    userRole: request.userProfile?.role,
                    sessionData: request.sessionData
                }
            );

            // Handle low confidence with retry logic
            if (dialogflowResponse.confidence < 0.5) {
                return await this.handleLowConfidenceResponse(
                    request.message,
                    language,
                    currentRetryCount,
                    sessionKey
                );
            }

            // Execute navigation
            const startTime = Date.now();
            const executionResult = await this.executorService.executeNavigation(
                dialogflowResponse.intent,
                dialogflowResponse.parameters,
                context
            );
            const executionTime = Date.now() - startTime;

            // Handle successful navigation with audio confirmation
            if (executionResult.success && executionResult.executed) {
                return await this.handleSuccessfulNavigation(
                    executionResult,
                    dialogflowResponse,
                    language,
                    executionTime,
                    sessionKey
                );
            }

            // Handle navigation errors with enhanced messaging
            if (!executionResult.success) {
                return await this.handleNavigationError(
                    executionResult,
                    request.message,
                    language,
                    currentRetryCount,
                    sessionKey
                );
            }

            // Handle confirmation required
            if (executionResult.requiresConfirmation) {
                return await this.handleConfirmationRequired(
                    executionResult,
                    dialogflowResponse,
                    context,
                    language
                );
            }

            // Default response for other cases
            return {
                success: executionResult.success,
                executed: executionResult.executed,
                intent: dialogflowResponse.intent,
                confidence: dialogflowResponse.confidence,
                targetRoute: executionResult.route,
                message: executionResult.message,
                audioFeedback: executionResult.message,
                retryCount: currentRetryCount,
                canRetry: currentRetryCount < this.maxRetryAttempts
            };

        } catch (error) {
            console.error('Voice navigation processing error:', error);
            return await this.handleSystemError(error, language, currentRetryCount, sessionKey);
        }
    }

    /**
     * Confirm pending navigation
     */
    public confirmNavigation(confirmationId: string, confirmed: boolean): boolean {
        return this.executorService.confirmNavigation(confirmationId, confirmed);
    }

    /**
     * Get navigation suggestions
     */
    public getNavigationSuggestions(limit: number = 5): string[] {
        return this.executorService.getNavigationSuggestions(limit);
    }

    /**
     * Check if user can access a route
     */
    public canAccessRoute(route: string, userProfile?: UserProfile): boolean {
        const context: NavigationPermissionContext = {
            userProfile,
            currentRoute: this.executorService.getContext().currentRoute
        };

        const routeObj = this.intentMappingService.getAllRoutes().get(route);
        if (!routeObj) {
            return false;
        }

        const validation = this.securityService.validateRouteAccess(routeObj, context);
        return validation.then(result => result.hasAccess).catch(() => false);
    }

    /**
     * Get available routes for user
     */
    public getAvailableRoutes(userProfile?: UserProfile): string[] {
        const context: NavigationPermissionContext = {
            userProfile,
            currentRoute: this.executorService.getContext().currentRoute
        };

        const availableRoutes = this.intentMappingService.getAvailableRoutes(context);
        return availableRoutes.map(route => route.name);
    }

    /**
     * Get navigation history
     */
    public getNavigationHistory(): any[] {
        return this.executorService.getNavigationHistory();
    }

    /**
     * Clear navigation history
     */
    public clearNavigationHistory(): void {
        this.executorService.clearNavigationHistory();
    }

    /**
     * Get service status
     */
    public getServiceStatus(): NavigationServiceStatus {
        return {
            isInitialized: this.isInitialized,
            servicesReady: {
                intentMapping: !!this.intentMappingService,
                executor: !!this.executorService,
                security: !!this.securityService,
                dialogflow: !!this.dialogflowService,
                feedback: !!this.feedbackService && this.feedbackService.isReady()
            },
            retryAttempts: this.retryAttempts.size
        };
    }

    /**
     * Execute back navigation
     */
    public async executeBackNavigation(): Promise<VoiceNavigationResponse> {
        try {
            const result = await this.executorService.executeBackNavigation();

            return {
                success: result.success,
                executed: result.executed,
                intent: 'navigate_back',
                targetRoute: result.route,
                message: result.message,
                audioFeedback: result.success ? 'Going back' : 'Cannot go back',
                error: result.error
            };
        } catch (error) {
            return {
                success: false,
                executed: false,
                message: 'Failed to navigate back',
                audioFeedback: 'Cannot go back',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get help information
     */
    public getHelpInformation(language: string = 'en-US'): {
        availableCommands: string[];
        examples: string[];
        tips: string[];
    } {
        const intentMappings = this.intentMappingService.getIntentMappingsForLanguage(language);
        const availableCommands: string[] = [];
        const examples: string[] = [];

        for (const [intent, mapping] of Object.entries(intentMappings)) {
            const languageData = mapping.multilingual[language] || mapping.multilingual['en-US'];
            if (languageData && languageData.patterns.length > 0) {
                availableCommands.push(languageData.patterns[0]);
                if (languageData.patterns.length > 1) {
                    examples.push(languageData.patterns[1]);
                }
            }
        }

        const tips = language === 'hi-IN' ? [
            'आप "डैशबोर्ड पर जाओ" कह सकते हैं',
            'मार्केटप्लेस देखने के लिए "बाजार दिखाओ" कहें',
            'वापस जाने के लिए "वापस जाओ" कहें'
        ] : [
            'You can say "go to dashboard"',
            'Try "show marketplace" to browse products',
            'Say "go back" to return to the previous page'
        ];

        return {
            availableCommands: availableCommands.slice(0, 10),
            examples: examples.slice(0, 5),
            tips
        };
    }

    /**
     * Handle successful navigation with audio confirmation
     */
    private async handleSuccessfulNavigation(
        executionResult: NavigationExecutionResult,
        dialogflowResponse: any,
        language: string,
        executionTime: number,
        sessionKey: string
    ): Promise<VoiceNavigationResponse> {
        // Clear retry attempts on success
        this.retryAttempts.delete(sessionKey);

        // Generate confirmation audio
        const confirmationResponse = await this.feedbackService.generateNavigationConfirmation(
            executionResult.route || 'destination',
            language,
            executionTime
        );

        return {
            success: true,
            executed: true,
            intent: dialogflowResponse.intent,
            confidence: dialogflowResponse.confidence,
            targetRoute: executionResult.route,
            message: confirmationResponse.textContent,
            audioFeedback: confirmationResponse.textContent,
            audioContent: confirmationResponse.audioContent,
            retryCount: 0,
            canRetry: false
        };
    }

    /**
     * Handle navigation errors with enhanced messaging and retry logic
     */
    private async handleNavigationError(
        executionResult: NavigationExecutionResult,
        originalCommand: string,
        language: string,
        retryCount: number,
        sessionKey: string
    ): Promise<VoiceNavigationResponse> {
        // Determine error type
        const errorType = this.determineErrorType(executionResult.error);

        // Get suggestions for retry
        const suggestions = this.executorService.getNavigationSuggestions(3);

        // Generate error message with guidance
        const errorResponse = await this.feedbackService.generateErrorWithGuidance(
            errorType,
            language,
            {
                command: originalCommand,
                destination: executionResult.route,
                error: executionResult.error,
                suggestions,
                retryCount
            }
        );

        const canRetry = retryCount < this.maxRetryAttempts && errorType !== 'access_denied';

        // If max retries reached, clear the session
        if (!canRetry) {
            this.retryAttempts.delete(sessionKey);
        }

        return {
            success: false,
            executed: false,
            message: errorResponse.textContent,
            audioFeedback: errorResponse.textContent,
            audioContent: errorResponse.audioContent,
            error: executionResult.error,
            errorType,
            suggestions,
            retryCount,
            canRetry
        };
    }

    /**
     * Handle low confidence responses with retry prompts
     */
    private async handleLowConfidenceResponse(
        originalCommand: string,
        language: string,
        retryCount: number,
        sessionKey: string
    ): Promise<VoiceNavigationResponse> {
        const suggestions = this.executorService.getNavigationSuggestions(3);
        const canRetry = retryCount < this.maxRetryAttempts;

        // Generate retry prompt
        const retryResponse = await this.feedbackService.generateRetryPrompt(
            language,
            {
                failedCommand: originalCommand,
                retryCount,
                suggestions: canRetry ? suggestions : undefined
            }
        );

        // If max retries reached, clear the session
        if (!canRetry) {
            this.retryAttempts.delete(sessionKey);
        }

        return {
            success: false,
            executed: false,
            message: retryResponse.textContent,
            audioFeedback: retryResponse.textContent,
            audioContent: retryResponse.audioContent,
            suggestions: canRetry ? suggestions : [],
            retryCount,
            canRetry
        };
    }

    /**
     * Handle confirmation required scenarios
     */
    private async handleConfirmationRequired(
        executionResult: NavigationExecutionResult,
        dialogflowResponse: any,
        context: NavigationPermissionContext,
        language: string
    ): Promise<VoiceNavigationResponse> {
        const confirmationId = await this.executorService.executeWithConfirmation(
            dialogflowResponse.intent,
            dialogflowResponse.parameters,
            context
        );

        // Generate confirmation prompt
        const confirmationResponse = await this.feedbackService.generateFeedback({
            type: 'confirmation',
            language,
            variables: {
                destination: executionResult.route || 'destination'
            },
            templateId: 'nav_confirmation'
        });

        return {
            success: false,
            executed: false,
            intent: dialogflowResponse.intent,
            confidence: dialogflowResponse.confidence,
            targetRoute: executionResult.route,
            message: confirmationResponse.textContent,
            audioFeedback: confirmationResponse.textContent,
            audioContent: confirmationResponse.audioContent,
            requiresConfirmation: true,
            confirmationId,
            confirmationMessage: executionResult.confirmationMessage,
            canRetry: false
        };
    }

    /**
     * Handle system errors
     */
    private async handleSystemError(
        error: any,
        language: string,
        retryCount: number,
        sessionKey: string
    ): Promise<VoiceNavigationResponse> {
        const errorType = this.isNetworkError(error) ? 'network_error' : 'service_unavailable';
        const canRetry = retryCount < this.maxRetryAttempts && errorType === 'network_error';

        const errorResponse = await this.feedbackService.generateErrorWithGuidance(
            errorType,
            language,
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                retryCount
            }
        );

        // If max retries reached, clear the session
        if (!canRetry) {
            this.retryAttempts.delete(sessionKey);
        }

        return {
            success: false,
            executed: false,
            message: errorResponse.textContent,
            audioFeedback: errorResponse.textContent,
            audioContent: errorResponse.audioContent,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType,
            suggestions: canRetry ? this.executorService.getNavigationSuggestions(3) : [],
            retryCount,
            canRetry
        };
    }

    /**
     * Determine error type from error message
     */
    private determineErrorType(errorMessage?: string): 'not_found' | 'access_denied' | 'network_error' | 'service_unavailable' | 'general' {
        if (!errorMessage) return 'general';

        const lowerError = errorMessage.toLowerCase();

        if (lowerError.includes('not found') || lowerError.includes('404')) {
            return 'not_found';
        }
        if (lowerError.includes('access denied') || lowerError.includes('permission') || lowerError.includes('403')) {
            return 'access_denied';
        }
        if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('timeout')) {
            return 'network_error';
        }
        if (lowerError.includes('service unavailable') || lowerError.includes('503')) {
            return 'service_unavailable';
        }

        return 'general';
    }

    /**
     * Check if error is network-related
     */
    private isNetworkError(error: any): boolean {
        if (!error) return false;

        const message = error.message?.toLowerCase() || '';
        return message.includes('network') ||
            message.includes('connection') ||
            message.includes('timeout') ||
            message.includes('fetch');
    }

    /**
     * Clear retry attempts for a session
     */
    public clearRetryAttempts(sessionId: string): void {
        const keysToDelete = Array.from(this.retryAttempts.keys()).filter(key => key.startsWith(sessionId));
        keysToDelete.forEach(key => this.retryAttempts.delete(key));
    }

    /**
     * Generate audio feedback message (legacy method for backward compatibility)
     */
    private generateAudioFeedback(
        executionResult: NavigationExecutionResult,
        dialogflowResponse: any
    ): string {
        if (executionResult.requiresConfirmation) {
            return executionResult.confirmationMessage || 'Do you want to proceed?';
        }

        if (executionResult.success && executionResult.executed) {
            return dialogflowResponse.fulfillmentText || 'Navigation completed';
        }

        if (executionResult.redirected) {
            return 'Redirected to an accessible page';
        }

        return executionResult.message || 'Navigation failed';
    }

    /**
     * Add custom intent mapping
     */
    public addCustomIntentMapping(
        intentName: string,
        routes: string[],
        patterns: { [language: string]: string[] },
        responses: { [language: string]: string[] }
    ): void {
        const mapping = {
            routes,
            aliases: [],
            category: 'navigation' as const,
            priority: 5,
            multilingual: Object.keys(patterns).reduce((acc, lang) => {
                acc[lang] = {
                    patterns: patterns[lang],
                    responses: responses[lang]
                };
                return acc;
            }, {} as any)
        };

        this.intentMappingService.addIntentMapping(intentName, mapping);
    }

    /**
     * Update user context
     */
    public updateUserContext(userProfile: UserProfile, currentRoute?: string): void {
        this.executorService.updateContext({
            userProfile,
            currentRoute: currentRoute || this.executorService.getContext().currentRoute
        });
    }

    /**
     * Get security audit logs
     */
    public getSecurityAuditLogs(filters?: any): any[] {
        return this.securityService.getAuditLogs(filters);
    }
}