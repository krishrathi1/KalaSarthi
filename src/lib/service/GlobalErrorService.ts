import { errorHandler, EnhancedErrorInfo } from '@/lib/error-handler';
import { monitoringService } from '@/lib/monitoring';

export interface ErrorNotification {
    id: string;
    error: EnhancedErrorInfo;
    dismissed: boolean;
    timestamp: number;
}

export interface ErrorServiceConfig {
    enableGlobalHandling: boolean;
    enableNotifications: boolean;
    enableMonitoring: boolean;
    maxNotifications: number;
    autoRetryEnabled: boolean;
    autoRetryMaxAttempts: number;
    autoRetryDelay: number;
}

export class GlobalErrorService {
    private static instance: GlobalErrorService;
    private config: ErrorServiceConfig;
    private notifications: ErrorNotification[] = [];
    private notificationListeners: ((notifications: ErrorNotification[]) => void)[] = [];
    private retryQueue: Map<string, { error: EnhancedErrorInfo; attempts: number; nextRetry: number }> = new Map();
    private retryTimer?: NodeJS.Timeout;

    private constructor() {
        this.config = {
            enableGlobalHandling: true,
            enableNotifications: true,
            enableMonitoring: true,
            maxNotifications: 5,
            autoRetryEnabled: true,
            autoRetryMaxAttempts: 3,
            autoRetryDelay: 5000
        };

        this.initializeGlobalHandlers();
        this.startRetryProcessor();
    }

    static getInstance(): GlobalErrorService {
        if (!GlobalErrorService.instance) {
            GlobalErrorService.instance = new GlobalErrorService();
        }
        return GlobalErrorService.instance;
    }

    /**
     * Initialize global error handlers
     */
    private initializeGlobalHandlers(): void {
        if (typeof window === 'undefined') return;

        // Global unhandled error handler
        window.addEventListener('error', (event) => {
            if (!this.config.enableGlobalHandling) return;

            const enhancedError = errorHandler.handleApiError(
                event.error || new Error(event.message),
                'global-error'
            );

            this.handleGlobalError(enhancedError);
        });

        // Global unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            if (!this.config.enableGlobalHandling) return;

            const enhancedError = errorHandler.handleApiError(
                event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
                'unhandled-promise'
            );

            this.handleGlobalError(enhancedError);
        });

        // Subscribe to error handler events
        errorHandler.onError((error) => {
            this.handleGlobalError(error);
        });
    }

    /**
     * Handle global errors
     */
    private handleGlobalError(error: EnhancedErrorInfo): void {
        // Add to notifications if enabled
        if (this.config.enableNotifications) {
            this.addNotification(error);
        }

        // Send to monitoring if enabled and severity is high enough
        if (this.config.enableMonitoring && (error.severity === 'high' || error.severity === 'critical')) {
            this.sendToMonitoring(error);
        }

        // Add to retry queue if recoverable and auto-retry is enabled
        if (this.config.autoRetryEnabled && error.recoverable && error.severity !== 'low') {
            this.addToRetryQueue(error);
        }

        // Log to console
        console.error('Global error handled:', {
            code: error.code,
            message: error.message,
            severity: error.severity,
            context: error.context
        });
    }

    /**
     * Add error notification
     */
    private addNotification(error: EnhancedErrorInfo): void {
        const notification: ErrorNotification = {
            id: `${error.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
            error,
            dismissed: false,
            timestamp: Date.now()
        };

        this.notifications.unshift(notification);

        // Keep only max notifications
        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.config.maxNotifications);
        }

        this.notifyListeners();
    }

    /**
     * Add error to retry queue
     */
    private addToRetryQueue(error: EnhancedErrorInfo): void {
        const key = `${error.code}-${error.context}`;
        const existing = this.retryQueue.get(key);

        if (existing && existing.attempts >= this.config.autoRetryMaxAttempts) {
            return; // Max attempts reached
        }

        this.retryQueue.set(key, {
            error,
            attempts: existing ? existing.attempts + 1 : 1,
            nextRetry: Date.now() + this.config.autoRetryDelay
        });
    }

    /**
     * Start retry processor
     */
    private startRetryProcessor(): void {
        this.retryTimer = setInterval(() => {
            const now = Date.now();
            const toRetry: string[] = [];

            for (const [key, item] of this.retryQueue.entries()) {
                if (now >= item.nextRetry) {
                    toRetry.push(key);
                }
            }

            toRetry.forEach(key => {
                const item = this.retryQueue.get(key);
                if (item) {
                    this.processRetry(item.error);
                    this.retryQueue.delete(key);
                }
            });
        }, 1000);
    }

    /**
     * Process retry for an error
     */
    private async processRetry(error: EnhancedErrorInfo): Promise<void> {
        try {
            // Find and execute retry action
            const retryAction = error.recoveryActions?.find(action => action.type === 'retry');
            if (retryAction) {
                await retryAction.action();
                console.log('Auto-retry successful for:', error.code);
            }
        } catch (e) {
            console.error('Auto-retry failed for:', error.code, e);
            // Add back to queue with increased attempts
            this.addToRetryQueue(error);
        }
    }

    /**
     * Send error to monitoring service
     */
    private async sendToMonitoring(error: EnhancedErrorInfo): Promise<void> {
        try {
            await monitoringService.log({
                level: 'ERROR',
                service: 'global-error-service',
                operation: error.context || 'unknown',
                userId: error.userId,
                error: error.message,
                metadata: {
                    code: error.code,
                    severity: error.severity,
                    recoverable: error.recoverable,
                    userMessage: error.userMessage,
                    url: error.url,
                    userAgent: error.userAgent,
                    timestamp: error.timestamp
                }
            });
        } catch (e) {
            console.error('Failed to send error to monitoring:', e);
        }
    }

    /**
     * Subscribe to notification updates
     */
    onNotificationsChange(listener: (notifications: ErrorNotification[]) => void): () => void {
        this.notificationListeners.push(listener);
        return () => {
            const index = this.notificationListeners.indexOf(listener);
            if (index > -1) {
                this.notificationListeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners of notification changes
     */
    private notifyListeners(): void {
        this.notificationListeners.forEach(listener => {
            try {
                listener([...this.notifications]);
            } catch (e) {
                console.error('Error in notification listener:', e);
            }
        });
    }

    /**
     * Get current notifications
     */
    getNotifications(): ErrorNotification[] {
        return [...this.notifications];
    }

    /**
     * Dismiss notification
     */
    dismissNotification(id: string): void {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.dismissed = true;
            this.notifyListeners();
        }
    }

    /**
     * Clear all notifications
     */
    clearNotifications(): void {
        this.notifications = [];
        this.notifyListeners();
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<ErrorServiceConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): ErrorServiceConfig {
        return { ...this.config };
    }

    /**
     * Get error statistics
     */
    getErrorStats(): {
        totalErrors: number;
        errorsBySeverity: Record<string, number>;
        errorsByCode: Record<string, number>;
        retryQueueSize: number;
        recentErrors: EnhancedErrorInfo[];
    } {
        const recentErrors = errorHandler.getRecentErrors(10);
        const errorsBySeverity: Record<string, number> = {};
        const errorsByCode: Record<string, number> = {};

        recentErrors.forEach(error => {
            errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
            errorsByCode[error.code || 'unknown'] = (errorsByCode[error.code || 'unknown'] || 0) + 1;
        });

        return {
            totalErrors: recentErrors.length,
            errorsBySeverity,
            errorsByCode,
            retryQueueSize: this.retryQueue.size,
            recentErrors
        };
    }

    /**
     * Manually report an error
     */
    reportError(error: Error, context: string, userId?: string): void {
        const enhancedError = errorHandler.handleApiError(error, context, userId);
        this.handleGlobalError(enhancedError);
    }

    /**
     * Test error handling (for development)
     */
    testError(severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
        if (process.env.NODE_ENV !== 'development') {
            console.warn('testError should only be used in development');
            return;
        }

        const testError = new Error(`Test error with ${severity} severity`);
        const enhancedError = errorHandler.handleApiError(testError, 'test-error');
        enhancedError.severity = severity;
        this.handleGlobalError(enhancedError);
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.retryTimer) {
            clearInterval(this.retryTimer);
        }
        this.notifications = [];
        this.notificationListeners = [];
        this.retryQueue.clear();
    }
}

export const globalErrorService = GlobalErrorService.getInstance();