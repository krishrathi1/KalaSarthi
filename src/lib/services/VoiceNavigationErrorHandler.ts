/**
 * Voice Navigation Error Handler
 * Comprehensive error handling infrastructure for voice navigation system
 * Provides error classification, recovery strategies, and fallback mechanisms
 */

export enum VoiceNavigationError {
    // Microphone and Audio Errors
    MICROPHONE_ACCESS_DENIED = 'MICROPHONE_ACCESS_DENIED',
    MICROPHONE_NOT_FOUND = 'MICROPHONE_NOT_FOUND',
    AUDIO_CONTEXT_FAILED = 'AUDIO_CONTEXT_FAILED',
    AUDIO_PROCESSING_ERROR = 'AUDIO_PROCESSING_ERROR',

    // Speech Recognition Errors
    SPEECH_NOT_RECOGNIZED = 'SPEECH_NOT_RECOGNIZED',
    SPEECH_RECOGNITION_FAILED = 'SPEECH_RECOGNITION_FAILED',
    SPEECH_TIMEOUT = 'SPEECH_TIMEOUT',
    SPEECH_ABORTED = 'SPEECH_ABORTED',

    // Language and Localization Errors
    LANGUAGE_NOT_SUPPORTED = 'LANGUAGE_NOT_SUPPORTED',
    LANGUAGE_DETECTION_FAILED = 'LANGUAGE_DETECTION_FAILED',

    // Network and Service Errors
    NETWORK_ERROR = 'NETWORK_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    API_RATE_LIMIT = 'API_RATE_LIMIT',
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

    // Authentication and Authorization Errors
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
    AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',
    SERVICE_ACCOUNT_ERROR = 'SERVICE_ACCOUNT_ERROR',

    // Intent and Navigation Errors
    INTENT_NOT_RECOGNIZED = 'INTENT_NOT_RECOGNIZED',
    ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
    NAVIGATION_BLOCKED = 'NAVIGATION_BLOCKED',
    PERMISSION_DENIED = 'PERMISSION_DENIED',

    // Configuration and System Errors
    CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
    BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
    FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',

    // General Errors
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    INITIALIZATION_FAILED = 'INITIALIZATION_FAILED'
}

export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export enum FallbackAction {
    RETRY = 'retry',
    MANUAL_INPUT = 'manual_input',
    HELP = 'help',
    CANCEL = 'cancel',
    GRACEFUL_DEGRADATION = 'graceful_degradation',
    OFFLINE_MODE = 'offline_mode'
}

export interface ErrorContext {
    timestamp: Date;
    sessionId?: string;
    userId?: string;
    language?: string;
    command?: string;
    route?: string;
    userAgent?: string;
    additionalData?: Record<string, any>;
}

export interface ErrorHandlingStrategy {
    error: VoiceNavigationError;
    severity: ErrorSeverity;
    fallbackAction: FallbackAction;
    userMessage: string;
    audioFeedback: string;
    maxRetries: number;
    retryDelay: number;
    shouldLog: boolean;
    shouldReport: boolean;
    recoveryActions: string[];
}

export interface ErrorReport {
    id: string;
    error: VoiceNavigationError;
    severity: ErrorSeverity;
    context: ErrorContext;
    strategy: ErrorHandlingStrategy;
    timestamp: Date;
    resolved: boolean;
    resolutionTime?: Date;
    resolutionMethod?: string;
}

export interface RecoveryResult {
    success: boolean;
    action: FallbackAction;
    message: string;
    audioFeedback?: string;
    shouldRetry: boolean;
    retryAfter?: number;
}

export class VoiceNavigationErrorHandler {
    private static instance: VoiceNavigationErrorHandler;
    private errorStrategies: Map<VoiceNavigationError, ErrorHandlingStrategy>;
    private errorReports: Map<string, ErrorReport>;
    private retryAttempts: Map<string, number>;
    private isLoggingEnabled: boolean = true;
    private isReportingEnabled: boolean = true;

    private constructor() {
        this.errorStrategies = new Map();
        this.errorReports = new Map();
        this.retryAttempts = new Map();
        this.initializeErrorStrategies();
    }

    public static getInstance(): VoiceNavigationErrorHandler {
        if (!VoiceNavigationErrorHandler.instance) {
            VoiceNavigationErrorHandler.instance = new VoiceNavigationErrorHandler();
        }
        return VoiceNavigationErrorHandler.instance;
    }

    /**
     * Handle an error with appropriate strategy and recovery
     */
    public async handleError(
        error: VoiceNavigationError | Error,
        context: Partial<ErrorContext> = {}
    ): Promise<RecoveryResult> {
        try {
            // Classify the error
            const classifiedError = this.classifyError(error);

            // Get error handling strategy
            const strategy = this.getErrorStrategy(classifiedError);

            // Create error context
            const fullContext: ErrorContext = {
                timestamp: new Date(),
                userAgent: navigator.userAgent,
                ...context
            };

            // Create error report
            const report = this.createErrorReport(classifiedError, strategy, fullContext);

            // Log error if enabled
            if (strategy.shouldLog && this.isLoggingEnabled) {
                this.logError(report);
            }

            // Report error if enabled
            if (strategy.shouldReport && this.isReportingEnabled) {
                await this.reportError(report);
            }

            // Execute recovery strategy
            const recoveryResult = await this.executeRecoveryStrategy(strategy, fullContext);

            // Update error report with resolution
            if (recoveryResult.success) {
                this.markErrorResolved(report.id, recoveryResult.action);
            }

            return recoveryResult;

        } catch (handlingError) {
            console.error('Error in error handler:', handlingError);
            return this.getDefaultRecoveryResult();
        }
    }

    /**
     * Classify an error into a VoiceNavigationError enum
     */
    public classifyError(error: VoiceNavigationError | Error): VoiceNavigationError {
        if (typeof error === 'string' && Object.values(VoiceNavigationError).includes(error as VoiceNavigationError)) {
            return error as VoiceNavigationError;
        }

        if (error instanceof Error) {
            const message = error.message.toLowerCase();

            // Microphone errors
            if (message.includes('permission') && message.includes('microphone')) {
                return VoiceNavigationError.MICROPHONE_ACCESS_DENIED;
            }
            if (message.includes('microphone') && message.includes('not found')) {
                return VoiceNavigationError.MICROPHONE_NOT_FOUND;
            }
            if (message.includes('audiocontext')) {
                return VoiceNavigationError.AUDIO_CONTEXT_FAILED;
            }

            // Network errors
            if (message.includes('network') || message.includes('fetch')) {
                return VoiceNavigationError.NETWORK_ERROR;
            }
            if (message.includes('timeout')) {
                return VoiceNavigationError.TIMEOUT_ERROR;
            }

            // Authentication errors
            if (message.includes('authentication') || message.includes('unauthorized')) {
                return VoiceNavigationError.AUTHENTICATION_FAILED;
            }
            if (message.includes('quota') || message.includes('rate limit')) {
                return VoiceNavigationError.QUOTA_EXCEEDED;
            }

            // Speech recognition errors
            if (message.includes('speech') && message.includes('not recognized')) {
                return VoiceNavigationError.SPEECH_NOT_RECOGNIZED;
            }
            if (message.includes('language') && message.includes('not supported')) {
                return VoiceNavigationError.LANGUAGE_NOT_SUPPORTED;
            }

            // Browser support errors
            if (message.includes('not supported') || message.includes('unavailable')) {
                return VoiceNavigationError.BROWSER_NOT_SUPPORTED;
            }
        }

        return VoiceNavigationError.UNKNOWN_ERROR;
    }

    /**
     * Get error handling strategy for a specific error
     */
    public getErrorStrategy(error: VoiceNavigationError): ErrorHandlingStrategy {
        const strategy = this.errorStrategies.get(error);
        if (!strategy) {
            return this.getDefaultErrorStrategy(error);
        }
        return strategy;
    }

    /**
     * Check if an error should be retried
     */
    public shouldRetry(error: VoiceNavigationError, context: ErrorContext): boolean {
        const strategy = this.getErrorStrategy(error);
        const attemptKey = this.getAttemptKey(error, context);
        const currentAttempts = this.retryAttempts.get(attemptKey) || 0;

        return currentAttempts < strategy.maxRetries;
    }

    /**
     * Increment retry attempt counter
     */
    public incrementRetryAttempt(error: VoiceNavigationError, context: ErrorContext): number {
        const attemptKey = this.getAttemptKey(error, context);
        const currentAttempts = this.retryAttempts.get(attemptKey) || 0;
        const newAttempts = currentAttempts + 1;
        this.retryAttempts.set(attemptKey, newAttempts);
        return newAttempts;
    }

    /**
     * Reset retry attempts for an error
     */
    public resetRetryAttempts(error: VoiceNavigationError, context: ErrorContext): void {
        const attemptKey = this.getAttemptKey(error, context);
        this.retryAttempts.delete(attemptKey);
    }

    /**
     * Get error statistics
     */
    public getErrorStatistics(): {
        totalErrors: number;
        errorsByType: Record<string, number>;
        errorsBySeverity: Record<string, number>;
        resolvedErrors: number;
        averageResolutionTime: number;
    } {
        const reports = Array.from(this.errorReports.values());

        const errorsByType: Record<string, number> = {};
        const errorsBySeverity: Record<string, number> = {};
        let resolvedErrors = 0;
        let totalResolutionTime = 0;

        reports.forEach(report => {
            // Count by type
            errorsByType[report.error] = (errorsByType[report.error] || 0) + 1;

            // Count by severity
            errorsBySeverity[report.severity] = (errorsBySeverity[report.severity] || 0) + 1;

            // Count resolved errors and calculate resolution time
            if (report.resolved && report.resolutionTime) {
                resolvedErrors++;
                totalResolutionTime += report.resolutionTime.getTime() - report.timestamp.getTime();
            }
        });

        return {
            totalErrors: reports.length,
            errorsByType,
            errorsBySeverity,
            resolvedErrors,
            averageResolutionTime: resolvedErrors > 0 ? totalResolutionTime / resolvedErrors : 0
        };
    }

    /**
     * Configure error handling settings
     */
    public configure(settings: {
        loggingEnabled?: boolean;
        reportingEnabled?: boolean;
        customStrategies?: Map<VoiceNavigationError, Partial<ErrorHandlingStrategy>>;
    }): void {
        if (settings.loggingEnabled !== undefined) {
            this.isLoggingEnabled = settings.loggingEnabled;
        }

        if (settings.reportingEnabled !== undefined) {
            this.isReportingEnabled = settings.reportingEnabled;
        }

        if (settings.customStrategies) {
            settings.customStrategies.forEach((customStrategy, error) => {
                const existingStrategy = this.errorStrategies.get(error);
                if (existingStrategy) {
                    this.errorStrategies.set(error, { ...existingStrategy, ...customStrategy });
                }
            });
        }
    }

    /**
     * Initialize default error handling strategies
     */
    private initializeErrorStrategies(): void {
        // Microphone and Audio Errors
        this.errorStrategies.set(VoiceNavigationError.MICROPHONE_ACCESS_DENIED, {
            error: VoiceNavigationError.MICROPHONE_ACCESS_DENIED,
            severity: ErrorSeverity.HIGH,
            fallbackAction: FallbackAction.MANUAL_INPUT,
            userMessage: 'Microphone access is required for voice navigation. Please enable microphone permissions in your browser settings.',
            audioFeedback: 'Please enable microphone access to use voice navigation.',
            maxRetries: 0,
            retryDelay: 0,
            shouldLog: true,
            shouldReport: true,
            recoveryActions: ['Show permission instructions', 'Fallback to manual navigation', 'Show help guide']
        });

        this.errorStrategies.set(VoiceNavigationError.MICROPHONE_NOT_FOUND, {
            error: VoiceNavigationError.MICROPHONE_NOT_FOUND,
            severity: ErrorSeverity.HIGH,
            fallbackAction: FallbackAction.MANUAL_INPUT,
            userMessage: 'No microphone detected. Please connect a microphone or use manual navigation.',
            audioFeedback: 'No microphone found. Please use manual navigation.',
            maxRetries: 0,
            retryDelay: 0,
            shouldLog: true,
            shouldReport: true,
            recoveryActions: ['Check hardware', 'Fallback to manual navigation']
        });

        // Speech Recognition Errors
        this.errorStrategies.set(VoiceNavigationError.SPEECH_NOT_RECOGNIZED, {
            error: VoiceNavigationError.SPEECH_NOT_RECOGNIZED,
            severity: ErrorSeverity.MEDIUM,
            fallbackAction: FallbackAction.RETRY,
            userMessage: 'Sorry, I didn\'t understand that. Please try speaking more clearly.',
            audioFeedback: 'I didn\'t catch that. Please try again.',
            maxRetries: 3,
            retryDelay: 1000,
            shouldLog: true,
            shouldReport: false,
            recoveryActions: ['Retry with clearer speech', 'Show voice commands help', 'Switch to manual input']
        });

        // Network and Service Errors
        this.errorStrategies.set(VoiceNavigationError.NETWORK_ERROR, {
            error: VoiceNavigationError.NETWORK_ERROR,
            severity: ErrorSeverity.MEDIUM,
            fallbackAction: FallbackAction.RETRY,
            userMessage: 'Network connection issue. Please check your internet connection and try again.',
            audioFeedback: 'Connection problem. Please try again.',
            maxRetries: 2,
            retryDelay: 2000,
            shouldLog: true,
            shouldReport: true,
            recoveryActions: ['Retry connection', 'Use offline mode', 'Manual navigation']
        });

        this.errorStrategies.set(VoiceNavigationError.SERVICE_UNAVAILABLE, {
            error: VoiceNavigationError.SERVICE_UNAVAILABLE,
            severity: ErrorSeverity.HIGH,
            fallbackAction: FallbackAction.GRACEFUL_DEGRADATION,
            userMessage: 'Voice navigation service is temporarily unavailable. Please use manual navigation.',
            audioFeedback: 'Voice service unavailable. Please navigate manually.',
            maxRetries: 1,
            retryDelay: 5000,
            shouldLog: true,
            shouldReport: true,
            recoveryActions: ['Fallback to manual navigation', 'Show service status', 'Enable offline mode']
        });

        // Add more error strategies...
        this.initializeAdditionalStrategies();
    }

    /**
     * Initialize additional error strategies
     */
    private initializeAdditionalStrategies(): void {
        // Language Errors
        this.errorStrategies.set(VoiceNavigationError.LANGUAGE_NOT_SUPPORTED, {
            error: VoiceNavigationError.LANGUAGE_NOT_SUPPORTED,
            severity: ErrorSeverity.MEDIUM,
            fallbackAction: FallbackAction.HELP,
            userMessage: 'This language is not supported. Please switch to a supported language.',
            audioFeedback: 'Language not supported. Please use English or another supported language.',
            maxRetries: 0,
            retryDelay: 0,
            shouldLog: true,
            shouldReport: false,
            recoveryActions: ['Show supported languages', 'Switch to default language', 'Manual navigation']
        });

        // Authentication Errors
        this.errorStrategies.set(VoiceNavigationError.AUTHENTICATION_FAILED, {
            error: VoiceNavigationError.AUTHENTICATION_FAILED,
            severity: ErrorSeverity.CRITICAL,
            fallbackAction: FallbackAction.CANCEL,
            userMessage: 'Authentication failed. Please check your credentials or contact support.',
            audioFeedback: 'Authentication error. Please contact support.',
            maxRetries: 0,
            retryDelay: 0,
            shouldLog: true,
            shouldReport: true,
            recoveryActions: ['Contact support', 'Check credentials', 'Manual navigation']
        });

        // Intent and Navigation Errors
        this.errorStrategies.set(VoiceNavigationError.INTENT_NOT_RECOGNIZED, {
            error: VoiceNavigationError.INTENT_NOT_RECOGNIZED,
            severity: ErrorSeverity.LOW,
            fallbackAction: FallbackAction.HELP,
            userMessage: 'I didn\'t understand that command. Say "help" to hear available commands.',
            audioFeedback: 'Command not recognized. Say help for available commands.',
            maxRetries: 2,
            retryDelay: 1000,
            shouldLog: true,
            shouldReport: false,
            recoveryActions: ['Show help', 'Suggest similar commands', 'Manual navigation']
        });

        this.errorStrategies.set(VoiceNavigationError.ROUTE_NOT_FOUND, {
            error: VoiceNavigationError.ROUTE_NOT_FOUND,
            severity: ErrorSeverity.MEDIUM,
            fallbackAction: FallbackAction.HELP,
            userMessage: 'That page doesn\'t exist or you don\'t have access to it.',
            audioFeedback: 'Page not found or access denied.',
            maxRetries: 0,
            retryDelay: 0,
            shouldLog: true,
            shouldReport: false,
            recoveryActions: ['Show available pages', 'Check permissions', 'Manual navigation']
        });

        // Browser Support Errors
        this.errorStrategies.set(VoiceNavigationError.BROWSER_NOT_SUPPORTED, {
            error: VoiceNavigationError.BROWSER_NOT_SUPPORTED,
            severity: ErrorSeverity.HIGH,
            fallbackAction: FallbackAction.MANUAL_INPUT,
            userMessage: 'Voice navigation is not supported in this browser. Please use a modern browser or manual navigation.',
            audioFeedback: 'Browser not supported. Please use manual navigation.',
            maxRetries: 0,
            retryDelay: 0,
            shouldLog: true,
            shouldReport: true,
            recoveryActions: ['Show browser requirements', 'Manual navigation', 'Download supported browser']
        });
    }

    /**
     * Execute recovery strategy for an error
     */
    private async executeRecoveryStrategy(
        strategy: ErrorHandlingStrategy,
        context: ErrorContext
    ): Promise<RecoveryResult> {
        try {
            switch (strategy.fallbackAction) {
                case FallbackAction.RETRY:
                    if (this.shouldRetry(strategy.error, context)) {
                        this.incrementRetryAttempt(strategy.error, context);
                        return {
                            success: false,
                            action: FallbackAction.RETRY,
                            message: strategy.userMessage,
                            audioFeedback: strategy.audioFeedback,
                            shouldRetry: true,
                            retryAfter: strategy.retryDelay
                        };
                    } else {
                        // Max retries reached, fallback to manual input
                        return {
                            success: false,
                            action: FallbackAction.MANUAL_INPUT,
                            message: 'Maximum retry attempts reached. Please use manual navigation.',
                            audioFeedback: 'Please use manual navigation.',
                            shouldRetry: false
                        };
                    }

                case FallbackAction.MANUAL_INPUT:
                    return {
                        success: true,
                        action: FallbackAction.MANUAL_INPUT,
                        message: strategy.userMessage,
                        audioFeedback: strategy.audioFeedback,
                        shouldRetry: false
                    };

                case FallbackAction.HELP:
                    return {
                        success: true,
                        action: FallbackAction.HELP,
                        message: strategy.userMessage,
                        audioFeedback: strategy.audioFeedback,
                        shouldRetry: false
                    };

                case FallbackAction.GRACEFUL_DEGRADATION:
                    return {
                        success: true,
                        action: FallbackAction.GRACEFUL_DEGRADATION,
                        message: strategy.userMessage,
                        audioFeedback: strategy.audioFeedback,
                        shouldRetry: false
                    };

                case FallbackAction.OFFLINE_MODE:
                    return {
                        success: true,
                        action: FallbackAction.OFFLINE_MODE,
                        message: 'Switching to offline mode.',
                        audioFeedback: 'Using offline mode.',
                        shouldRetry: false
                    };

                default:
                    return {
                        success: false,
                        action: FallbackAction.CANCEL,
                        message: strategy.userMessage,
                        audioFeedback: strategy.audioFeedback,
                        shouldRetry: false
                    };
            }
        } catch (error) {
            console.error('Error executing recovery strategy:', error);
            return this.getDefaultRecoveryResult();
        }
    }

    /**
     * Create error report
     */
    private createErrorReport(
        error: VoiceNavigationError,
        strategy: ErrorHandlingStrategy,
        context: ErrorContext
    ): ErrorReport {
        const report: ErrorReport = {
            id: this.generateErrorId(),
            error,
            severity: strategy.severity,
            context,
            strategy,
            timestamp: new Date(),
            resolved: false
        };

        this.errorReports.set(report.id, report);
        return report;
    }

    /**
     * Log error to console
     */
    private logError(report: ErrorReport): void {
        const logLevel = this.getLogLevel(report.severity);
        const message = `[VoiceNavigationError] ${report.error}: ${report.strategy.userMessage}`;

        console[logLevel](message, {
            id: report.id,
            severity: report.severity,
            context: report.context,
            timestamp: report.timestamp
        });
    }

    /**
     * Report error to external service (placeholder)
     */
    private async reportError(report: ErrorReport): Promise<void> {
        try {
            // In a real implementation, this would send to an error reporting service
            // For now, we'll just log it
            console.info('Error reported:', {
                id: report.id,
                error: report.error,
                severity: report.severity,
                timestamp: report.timestamp
            });
        } catch (error) {
            console.error('Failed to report error:', error);
        }
    }

    /**
     * Mark error as resolved
     */
    private markErrorResolved(reportId: string, resolutionMethod: string): void {
        const report = this.errorReports.get(reportId);
        if (report) {
            report.resolved = true;
            report.resolutionTime = new Date();
            report.resolutionMethod = resolutionMethod;
        }
    }

    /**
     * Get default error strategy
     */
    private getDefaultErrorStrategy(error: VoiceNavigationError): ErrorHandlingStrategy {
        return {
            error,
            severity: ErrorSeverity.MEDIUM,
            fallbackAction: FallbackAction.CANCEL,
            userMessage: 'An unexpected error occurred. Please try again.',
            audioFeedback: 'Sorry, something went wrong. Please try again.',
            maxRetries: 1,
            retryDelay: 1000,
            shouldLog: true,
            shouldReport: true,
            recoveryActions: ['Retry', 'Manual navigation']
        };
    }

    /**
     * Get default recovery result
     */
    private getDefaultRecoveryResult(): RecoveryResult {
        return {
            success: false,
            action: FallbackAction.CANCEL,
            message: 'An unexpected error occurred. Please try again.',
            shouldRetry: false
        };
    }

    /**
     * Generate unique error ID
     */
    private generateErrorId(): string {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get attempt key for retry tracking
     */
    private getAttemptKey(error: VoiceNavigationError, context: ErrorContext): string {
        return `${error}_${context.sessionId || 'no_session'}_${context.userId || 'no_user'}`;
    }

    /**
     * Get log level based on error severity
     */
    private getLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
        switch (severity) {
            case ErrorSeverity.LOW:
                return 'log';
            case ErrorSeverity.MEDIUM:
                return 'warn';
            case ErrorSeverity.HIGH:
            case ErrorSeverity.CRITICAL:
                return 'error';
            default:
                return 'warn';
        }
    }
}