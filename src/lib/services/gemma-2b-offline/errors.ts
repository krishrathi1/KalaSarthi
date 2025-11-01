/**
 * Error handling classes and utilities for Gemma 2B Offline Service
 * Provides structured error handling with recovery strategies
 */

import {
    Gemma2BError,
    Gemma2BErrorType,
    ErrorSeverity
} from '../../types/gemma-2b-offline';

// ============================================================================
// Base Error Classes
// ============================================================================

/**
 * Base error class for all Gemma 2B related errors
 */
export class Gemma2BBaseError extends Error {
    public readonly type: Gemma2BErrorType;
    public readonly severity: ErrorSeverity;
    public readonly timestamp: number;
    public readonly recoverable: boolean;
    public readonly suggestedAction?: string;
    public readonly details?: any;

    constructor(
        type: Gemma2BErrorType,
        message: string,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        recoverable: boolean = true,
        suggestedAction?: string,
        details?: any
    ) {
        super(message);
        this.name = 'Gemma2BBaseError';
        this.type = type;
        this.severity = severity;
        this.timestamp = Date.now();
        this.recoverable = recoverable;
        this.suggestedAction = suggestedAction;
        this.details = details;

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, Gemma2BBaseError);
        }
    }

    /**
     * Convert error to structured format
     */
    toStructured(): Gemma2BError {
        return {
            type: this.type,
            severity: this.severity,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp,
            recoverable: this.recoverable,
            suggestedAction: this.suggestedAction
        };
    }
}

// ============================================================================
// Specific Error Classes
// ============================================================================

/**
 * Model loading related errors
 */
export class ModelLoadError extends Gemma2BBaseError {
    constructor(
        message: string,
        details?: any,
        suggestedAction?: string
    ) {
        super(
            Gemma2BErrorType.MODEL_LOAD_ERROR,
            message,
            ErrorSeverity.HIGH,
            true,
            suggestedAction || 'Try clearing cache and reloading the model',
            details
        );
        this.name = 'ModelLoadError';
    }
}

/**
 * Inference execution errors
 */
export class InferenceError extends Gemma2BBaseError {
    constructor(
        message: string,
        details?: any,
        recoverable: boolean = true
    ) {
        super(
            Gemma2BErrorType.INFERENCE_ERROR,
            message,
            ErrorSeverity.MEDIUM,
            recoverable,
            recoverable ? 'Retry the request or reduce input length' : 'Restart the service',
            details
        );
        this.name = 'InferenceError';
    }
}

/**
 * System resource related errors
 */
export class ResourceError extends Gemma2BBaseError {
    constructor(
        message: string,
        details?: any,
        suggestedAction?: string
    ) {
        super(
            Gemma2BErrorType.RESOURCE_ERROR,
            message,
            ErrorSeverity.HIGH,
            true,
            suggestedAction || 'Close other applications to free up resources',
            details
        );
        this.name = 'ResourceError';
    }
}

/**
 * Browser compatibility errors
 */
export class BrowserCompatibilityError extends Gemma2BBaseError {
    constructor(
        message: string,
        details?: any
    ) {
        super(
            Gemma2BErrorType.BROWSER_COMPATIBILITY_ERROR,
            message,
            ErrorSeverity.CRITICAL,
            false,
            'Use a supported browser version or enable required features',
            details
        );
        this.name = 'BrowserCompatibilityError';
    }
}

/**
 * Network related errors during model download
 */
export class NetworkError extends Gemma2BBaseError {
    constructor(
        message: string,
        details?: any
    ) {
        super(
            Gemma2BErrorType.NETWORK_ERROR,
            message,
            ErrorSeverity.MEDIUM,
            true,
            'Check internet connection and retry',
            details
        );
        this.name = 'NetworkError';
    }
}

/**
 * Cache operation errors
 */
export class CacheError extends Gemma2BBaseError {
    constructor(
        message: string,
        details?: any
    ) {
        super(
            Gemma2BErrorType.CACHE_ERROR,
            message,
            ErrorSeverity.MEDIUM,
            true,
            'Clear browser cache and storage',
            details
        );
        this.name = 'CacheError';
    }
}

/**
 * Model validation errors
 */
export class ValidationError extends Gemma2BBaseError {
    constructor(
        message: string,
        details?: any
    ) {
        super(
            Gemma2BErrorType.VALIDATION_ERROR,
            message,
            ErrorSeverity.HIGH,
            true,
            'Re-download the model or clear cache',
            details
        );
        this.name = 'ValidationError';
    }
}

// ============================================================================
// Error Handler Class
// ============================================================================

/**
 * Central error handler for Gemma 2B service
 */
export class Gemma2BErrorHandler {
    private errorLog: Gemma2BError[] = [];
    private maxLogSize: number = 100;
    private retryAttempts: Map<string, number> = new Map();
    private fallbackMode: boolean = false;
    private lastResourceCheck: number = 0;
    private resourceCheckInterval: number = 5000; // 5 seconds

    /**
     * Handle model loading errors with recovery strategies
     */
    async handleModelLoadError(error: Error): Promise<boolean> {
        const gemmaError = this.wrapError(error, Gemma2BErrorType.MODEL_LOAD_ERROR);
        this.logError(gemmaError);

        // Attempt recovery strategies
        if (error.message.includes('network') || error.message.includes('fetch')) {
            // Network error - suggest retry
            return this.suggestRetry(gemmaError, 'Network issue detected');
        }

        if (error.message.includes('storage') || error.message.includes('quota')) {
            // Storage error - suggest cache clear
            return this.suggestCacheClear(gemmaError, 'Storage quota exceeded');
        }

        if (error.message.includes('memory') || error.message.includes('OOM')) {
            // Memory error - suggest resource optimization
            return this.suggestResourceOptimization(gemmaError, 'Insufficient memory');
        }

        // Generic model load error
        return false;
    }

    /**
     * Handle inference errors with retry logic
     */
    async handleInferenceError(error: Error): Promise<string> {
        const gemmaError = this.wrapError(error, Gemma2BErrorType.INFERENCE_ERROR);
        this.logError(gemmaError);

        // Check if error is recoverable
        if (this.isRecoverableInferenceError(error)) {
            throw new InferenceError(
                'Inference failed but can be retried',
                { originalError: error.message },
                true
            );
        }

        // Non-recoverable error
        throw new InferenceError(
            'Inference failed and requires service restart',
            { originalError: error.message },
            false
        );
    }

    /**
     * Handle resource constraint errors
     */
    async handleResourceError(error: Error): Promise<void> {
        const gemmaError = this.wrapError(error, Gemma2BErrorType.RESOURCE_ERROR);
        this.logError(gemmaError);

        // Suggest resource optimization
        throw new ResourceError(
            'System resources insufficient for AI operations',
            {
                originalError: error.message,
                suggestions: [
                    'Close other browser tabs',
                    'Close other applications',
                    'Restart the browser',
                    'Use a device with more memory'
                ]
            },
            'Free up system resources and try again'
        );
    }

    /**
     * Determine if service should fallback to demo mode
     */
    shouldFallbackToDemo(error: Error): boolean {
        // Critical errors that require demo fallback
        const criticalErrors = [
            'WebGL not supported',
            'WebAssembly not supported',
            'Insufficient memory',
            'Browser not supported',
            'Model validation failed'
        ];

        return criticalErrors.some(criticalError =>
            error.message.toLowerCase().includes(criticalError.toLowerCase())
        );
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(error: Gemma2BError): string {
        switch (error.type) {
            case Gemma2BErrorType.MODEL_LOAD_ERROR:
                return 'Failed to load AI model. Please check your internet connection and try again.';

            case Gemma2BErrorType.INFERENCE_ERROR:
                return 'AI processing failed. Please try rephrasing your message or try again later.';

            case Gemma2BErrorType.RESOURCE_ERROR:
                return 'Your device needs more memory to run the AI. Try closing other apps and try again.';

            case Gemma2BErrorType.BROWSER_COMPATIBILITY_ERROR:
                return 'Your browser doesn\'t support this AI feature. Please update your browser or use a different one.';

            case Gemma2BErrorType.NETWORK_ERROR:
                return 'Network connection issue. Please check your internet and try again.';

            case Gemma2BErrorType.CACHE_ERROR:
                return 'Storage issue detected. Please clear your browser cache and try again.';

            case Gemma2BErrorType.VALIDATION_ERROR:
                return 'AI model validation failed. The model may be corrupted and needs to be re-downloaded.';

            default:
                return 'An unexpected error occurred. Please try again or contact support.';
        }
    }

    /**
     * Get troubleshooting steps for error
     */
    getTroubleshootingSteps(error: Gemma2BError): string[] {
        const baseSteps = ['Refresh the page', 'Try again in a few minutes'];

        switch (error.type) {
            case Gemma2BErrorType.MODEL_LOAD_ERROR:
                return [
                    ...baseSteps,
                    'Check your internet connection',
                    'Clear browser cache and cookies',
                    'Try using a different browser'
                ];

            case Gemma2BErrorType.RESOURCE_ERROR:
                return [
                    'Close other browser tabs',
                    'Close other applications',
                    'Restart your browser',
                    'Use a device with more memory',
                    ...baseSteps
                ];

            case Gemma2BErrorType.BROWSER_COMPATIBILITY_ERROR:
                return [
                    'Update your browser to the latest version',
                    'Enable WebGL in browser settings',
                    'Enable JavaScript',
                    'Try a different browser (Chrome, Firefox, Safari, Edge)'
                ];

            default:
                return baseSteps;
        }
    }

    /**
     * Log error for debugging
     */
    private logError(error: Gemma2BError): void {
        this.errorLog.push(error);

        // Maintain log size limit
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }

        // Console logging for development
        console.error('Gemma2B Error:', error);
    }

    /**
     * Wrap generic error into Gemma2B error
     */
    private wrapError(error: Error, type: Gemma2BErrorType): Gemma2BError {
        return {
            type,
            severity: this.determineSeverity(error, type),
            message: error.message,
            details: { stack: error.stack },
            timestamp: Date.now(),
            recoverable: this.isRecoverable(error, type)
        };
    }

    /**
     * Determine error severity
     */
    private determineSeverity(error: Error, type: Gemma2BErrorType): ErrorSeverity {
        if (type === Gemma2BErrorType.BROWSER_COMPATIBILITY_ERROR) {
            return ErrorSeverity.CRITICAL;
        }

        if (type === Gemma2BErrorType.MODEL_LOAD_ERROR || type === Gemma2BErrorType.RESOURCE_ERROR) {
            return ErrorSeverity.HIGH;
        }

        return ErrorSeverity.MEDIUM;
    }

    /**
     * Check if error is recoverable
     */
    private isRecoverable(error: Error, type: Gemma2BErrorType): boolean {
        if (type === Gemma2BErrorType.BROWSER_COMPATIBILITY_ERROR) {
            return false;
        }

        return !error.message.toLowerCase().includes('critical');
    }

    /**
     * Check if inference error is recoverable
     */
    private isRecoverableInferenceError(error: Error): boolean {
        const nonRecoverablePatterns = [
            'model corrupted',
            'critical error',
            'fatal',
            'webgl context lost',
            'out of memory'
        ];

        return !nonRecoverablePatterns.some(pattern =>
            error.message.toLowerCase().includes(pattern)
        );
    }

    /**
     * Suggest retry strategy
     */
    private suggestRetry(error: Gemma2BError, reason: string): boolean {
        console.warn(`Retry suggested for ${error.type}: ${reason}`);
        return true;
    }

    /**
     * Suggest cache clearing
     */
    private suggestCacheClear(error: Gemma2BError, reason: string): boolean {
        console.warn(`Cache clear suggested for ${error.type}: ${reason}`);
        return true;
    }

    /**
     * Suggest resource optimization
     */
    private suggestResourceOptimization(error: Gemma2BError, reason: string): boolean {
        console.warn(`Resource optimization suggested for ${error.type}: ${reason}`);
        return true;
    }

    /**
     * Get error statistics
     */
    getErrorStats(): { [key in Gemma2BErrorType]?: number } {
        const stats: { [key in Gemma2BErrorType]?: number } = {};

        this.errorLog.forEach(error => {
            stats[error.type] = (stats[error.type] || 0) + 1;
        });

        return stats;
    }

    /**
     * Clear error log
     */
    clearErrorLog(): void {
        this.errorLog = [];
    }

    // ============================================================================
    // Enhanced Error Handling and Fallback Methods
    // ============================================================================

    /**
     * Comprehensive retry mechanism with exponential backoff
     */
    async retryOperation<T>(
        operation: () => Promise<T>,
        operationId: string,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        const currentAttempts = this.retryAttempts.get(operationId) || 0;

        try {
            const result = await operation();
            // Reset retry count on success
            this.retryAttempts.delete(operationId);
            return result;
        } catch (error) {
            const nextAttempt = currentAttempts + 1;
            this.retryAttempts.set(operationId, nextAttempt);

            if (nextAttempt >= maxRetries) {
                // Max retries reached, clear counter and throw
                this.retryAttempts.delete(operationId);
                throw new InferenceError(
                    `Operation failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    {
                        operationId,
                        attempts: nextAttempt,
                        originalError: error instanceof Error ? error.message : String(error)
                    },
                    false // Not recoverable after max retries
                );
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(baseDelay * Math.pow(2, currentAttempts), 10000);

            console.warn(`Retry attempt ${nextAttempt}/${maxRetries} for ${operationId} in ${delay}ms`);

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay));

            // Recursive retry
            return this.retryOperation(operation, operationId, maxRetries, baseDelay);
        }
    }

    /**
     * Graceful degradation to demo mode
     */
    async enableFallbackMode(reason: string): Promise<void> {
        if (this.fallbackMode) {
            return; // Already in fallback mode
        }

        this.fallbackMode = true;

        console.warn('🔄 Enabling fallback mode:', reason);

        // Log fallback activation
        this.logError({
            type: Gemma2BErrorType.RESOURCE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: `Fallback mode activated: ${reason}`,
            timestamp: Date.now(),
            recoverable: true,
            suggestedAction: 'System will use demo responses until resources are available'
        });

        // Notify user about fallback mode
        this.showFallbackNotification(reason);
    }

    /**
     * Check if currently in fallback mode
     */
    isInFallbackMode(): boolean {
        return this.fallbackMode;
    }

    /**
     * Attempt to exit fallback mode
     */
    async attemptExitFallbackMode(): Promise<boolean> {
        if (!this.fallbackMode) {
            return true; // Not in fallback mode
        }

        try {
            // Check if resources are now available
            const resourcesAvailable = await this.checkResourceAvailability();

            if (resourcesAvailable) {
                this.fallbackMode = false;
                console.log('✅ Exited fallback mode - resources now available');
                return true;
            }

            return false;
        } catch (error) {
            console.warn('Failed to check resource availability for fallback exit:', error);
            return false;
        }
    }

    /**
     * Enhanced resource constraint handling
     */
    async handleResourceConstraints(): Promise<void> {
        const now = Date.now();

        // Throttle resource checks
        if (now - this.lastResourceCheck < this.resourceCheckInterval) {
            return;
        }

        this.lastResourceCheck = now;

        try {
            // Check memory usage
            const memoryInfo = this.getMemoryInfo();

            if (memoryInfo.usage > 0.9) { // 90% memory usage
                await this.handleCriticalMemoryUsage(memoryInfo);
            } else if (memoryInfo.usage > 0.8) { // 80% memory usage
                await this.handleHighMemoryUsage(memoryInfo);
            }

            // Check if browser is throttling
            if (this.detectCPUThrottling()) {
                await this.handleCPUThrottling();
            }

            // Check storage quota
            const storageInfo = await this.getStorageInfo();
            if (storageInfo.usage > 0.9) {
                await this.handleStorageQuotaExceeded(storageInfo);
            }

        } catch (error) {
            console.warn('Resource constraint check failed:', error);
        }
    }

    /**
     * Generate user-friendly error messages with troubleshooting steps
     */
    generateUserFriendlyErrorResponse(error: Gemma2BError): {
        message: string;
        troubleshooting: string[];
        canRetry: boolean;
        fallbackAvailable: boolean;
    } {
        const baseResponse = {
            message: this.getUserFriendlyMessage(error),
            troubleshooting: this.getTroubleshootingSteps(error),
            canRetry: error.recoverable,
            fallbackAvailable: !this.fallbackMode
        };

        // Add specific guidance based on error type
        switch (error.type) {
            case Gemma2BErrorType.RESOURCE_ERROR:
                return {
                    ...baseResponse,
                    message: `${baseResponse.message} The AI needs more memory to work properly.`,
                    troubleshooting: [
                        '🔄 Close other browser tabs and applications',
                        '💾 Free up device memory',
                        '🔄 Restart your browser',
                        '⚡ Try using a device with more RAM',
                        ...baseResponse.troubleshooting
                    ]
                };

            case Gemma2BErrorType.MODEL_LOAD_ERROR:
                return {
                    ...baseResponse,
                    message: `${baseResponse.message} We're having trouble loading the AI model.`,
                    troubleshooting: [
                        '🌐 Check your internet connection',
                        '🔄 Refresh the page and try again',
                        '🧹 Clear browser cache and cookies',
                        '🌍 Try using a different browser',
                        ...baseResponse.troubleshooting
                    ]
                };

            case Gemma2BErrorType.BROWSER_COMPATIBILITY_ERROR:
                return {
                    ...baseResponse,
                    canRetry: false,
                    message: `${baseResponse.message} Your browser doesn't support the AI features.`,
                    troubleshooting: [
                        '🔄 Update your browser to the latest version',
                        '⚙️ Enable WebGL and JavaScript in browser settings',
                        '🌍 Try Chrome, Firefox, Safari, or Edge',
                        '📱 Use a desktop browser for better compatibility'
                    ]
                };

            default:
                return baseResponse;
        }
    }

    /**
     * Intelligent error recovery suggestions
     */
    getRecoveryStrategy(error: Gemma2BError): {
        immediate: string[];
        shortTerm: string[];
        longTerm: string[];
    } {
        const strategies = {
            immediate: ['Refresh the page', 'Try again in a moment'],
            shortTerm: ['Clear browser cache', 'Restart browser'],
            longTerm: ['Update browser', 'Use a different device']
        };

        switch (error.type) {
            case Gemma2BErrorType.RESOURCE_ERROR:
                return {
                    immediate: [
                        'Close other browser tabs',
                        'Close other applications',
                        'Wait a moment and try again'
                    ],
                    shortTerm: [
                        'Restart your browser',
                        'Restart your device',
                        'Free up storage space'
                    ],
                    longTerm: [
                        'Upgrade device memory (RAM)',
                        'Use a more powerful device',
                        'Use during off-peak hours'
                    ]
                };

            case Gemma2BErrorType.NETWORK_ERROR:
                return {
                    immediate: [
                        'Check internet connection',
                        'Try again in a moment',
                        'Switch to mobile data/WiFi'
                    ],
                    shortTerm: [
                        'Restart router/modem',
                        'Clear DNS cache',
                        'Try different network'
                    ],
                    longTerm: [
                        'Contact internet provider',
                        'Upgrade internet plan',
                        'Use offline mode when available'
                    ]
                };

            default:
                return strategies;
        }
    }

    // ============================================================================
    // Private Helper Methods for Enhanced Error Handling
    // ============================================================================

    /**
     * Show fallback mode notification to user
     */
    private showFallbackNotification(reason: string): void {
        // This would integrate with the UI notification system
        console.info('📢 Fallback Mode Active:', {
            reason,
            message: 'Using demo responses while AI model is unavailable',
            action: 'Try refreshing the page or closing other applications'
        });
    }

    /**
     * Check resource availability for fallback exit
     */
    private async checkResourceAvailability(): Promise<boolean> {
        try {
            const memoryInfo = this.getMemoryInfo();
            const hasWebGL = this.checkWebGLSupport();
            const hasWasm = this.checkWebAssemblySupport();

            return (
                memoryInfo.usage < 0.7 && // Less than 70% memory usage
                hasWebGL &&
                hasWasm
            );
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current memory information
     */
    private getMemoryInfo(): { usage: number; available: number; total: number } {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            return {
                usage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
                available: memory.jsHeapSizeLimit - memory.usedJSHeapSize,
                total: memory.jsHeapSizeLimit
            };
        }

        // Fallback estimation
        return {
            usage: 0.5, // Assume 50% usage if can't detect
            available: 1024 * 1024 * 1024, // 1GB
            total: 2048 * 1024 * 1024 // 2GB
        };
    }

    /**
     * Handle critical memory usage (>90%)
     */
    private async handleCriticalMemoryUsage(memoryInfo: any): Promise<void> {
        console.error('🚨 Critical memory usage detected:', memoryInfo);

        await this.enableFallbackMode('Critical memory usage detected');

        throw new ResourceError(
            'Critical memory usage detected. AI features temporarily disabled.',
            {
                memoryUsage: memoryInfo.usage,
                availableMemory: memoryInfo.available,
                recommendations: [
                    'Close other browser tabs immediately',
                    'Close other applications',
                    'Restart your browser',
                    'Use a device with more memory'
                ]
            },
            'Free up memory immediately to continue using AI features'
        );
    }

    /**
     * Handle high memory usage (>80%)
     */
    private async handleHighMemoryUsage(memoryInfo: any): Promise<void> {
        console.warn('⚠️ High memory usage detected:', memoryInfo);

        // Log warning but don't enable fallback yet
        this.logError({
            type: Gemma2BErrorType.RESOURCE_ERROR,
            severity: ErrorSeverity.MEDIUM,
            message: 'High memory usage detected - performance may be affected',
            timestamp: Date.now(),
            recoverable: true,
            suggestedAction: 'Consider closing other applications'
        });
    }

    /**
     * Detect CPU throttling
     */
    private detectCPUThrottling(): boolean {
        // Simple heuristic: measure time for a small computation
        const start = performance.now();
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
            sum += Math.random();
        }
        const duration = performance.now() - start;

        // If computation takes unusually long, assume throttling
        return duration > 50; // 50ms threshold
    }

    /**
     * Handle CPU throttling
     */
    private async handleCPUThrottling(): Promise<void> {
        console.warn('⚠️ CPU throttling detected');

        this.logError({
            type: Gemma2BErrorType.RESOURCE_ERROR,
            severity: ErrorSeverity.MEDIUM,
            message: 'CPU throttling detected - AI responses may be slower',
            timestamp: Date.now(),
            recoverable: true,
            suggestedAction: 'Close other applications or use a more powerful device'
        });
    }

    /**
     * Get storage information
     */
    private async getStorageInfo(): Promise<{ usage: number; available: number; total: number }> {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const usage = (estimate.usage || 0) / (estimate.quota || 1);

                return {
                    usage,
                    available: (estimate.quota || 0) - (estimate.usage || 0),
                    total: estimate.quota || 0
                };
            }
        } catch (error) {
            console.warn('Could not get storage info:', error);
        }

        // Fallback
        return {
            usage: 0.5,
            available: 1024 * 1024 * 1024, // 1GB
            total: 2048 * 1024 * 1024 // 2GB
        };
    }

    /**
     * Handle storage quota exceeded
     */
    private async handleStorageQuotaExceeded(storageInfo: any): Promise<void> {
        console.error('🚨 Storage quota exceeded:', storageInfo);

        throw new CacheError(
            'Storage quota exceeded. Please clear browser data.',
            {
                storageUsage: storageInfo.usage,
                availableStorage: storageInfo.available,
                recommendations: [
                    'Clear browser cache and cookies',
                    'Delete unnecessary files',
                    'Clear application data',
                    'Use browser cleanup tools'
                ]
            },
            'Clear browser storage to continue'
        );
    }

    /**
     * Check WebGL support
     */
    private checkWebGLSupport(): boolean {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check WebAssembly support
     */
    private checkWebAssemblySupport(): boolean {
        try {
            return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
        } catch (error) {
            return false;
        }
    }
}