/**
 * Error Notification Service for Gemma 2B Offline AI
 * Provides user-friendly error notifications and recovery guidance
 */

import {
    Gemma2BError,
    Gemma2BErrorType,
    ErrorSeverity,
    SupportedLanguage
} from '../../types/gemma-2b-offline';

/**
 * Notification types for different error scenarios
 */
export enum NotificationType {
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info',
    SUCCESS = 'success'
}

/**
 * Notification data structure
 */
export interface ErrorNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    details?: string;
    actions: NotificationAction[];
    dismissible: boolean;
    autoHide: boolean;
    duration?: number;
    timestamp: number;
}

/**
 * Action that user can take from notification
 */
export interface NotificationAction {
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    action: () => Promise<void> | void;
    loading?: boolean;
}

/**
 * Service for managing error notifications
 */
export class ErrorNotificationService {
    private notifications: Map<string, ErrorNotification> = new Map();
    private listeners: Set<(notifications: ErrorNotification[]) => void> = new Set();
    private notificationCounter: number = 0;

    /**
     * Create notification from Gemma 2B error
     */
    createErrorNotification(
        error: Gemma2BError,
        language: SupportedLanguage = SupportedLanguage.ENGLISH,
        recoveryActions?: {
            retry?: () => Promise<void>;
            fallback?: () => Promise<void>;
            refresh?: () => void;
            clearCache?: () => Promise<void>;
        }
    ): ErrorNotification {
        const notificationId = `error-${++this.notificationCounter}-${Date.now()}`;

        const notification: ErrorNotification = {
            id: notificationId,
            type: this.getNotificationTypeFromSeverity(error.severity),
            title: this.getErrorTitle(error.type, language),
            message: this.getUserFriendlyMessage(error, language),
            details: this.getErrorDetails(error, language),
            actions: this.createErrorActions(error, language, recoveryActions),
            dismissible: true,
            autoHide: error.severity === ErrorSeverity.LOW,
            duration: error.severity === ErrorSeverity.LOW ? 5000 : undefined,
            timestamp: Date.now()
        };

        return notification;
    }

    /**
     * Show notification
     */
    showNotification(notification: ErrorNotification): void {
        this.notifications.set(notification.id, notification);
        this.notifyListeners();

        // Auto-hide if configured
        if (notification.autoHide && notification.duration) {
            setTimeout(() => {
                this.dismissNotification(notification.id);
            }, notification.duration);
        }
    }

    /**
     * Show error notification directly from error
     */
    showError(
        error: Gemma2BError,
        language: SupportedLanguage = SupportedLanguage.ENGLISH,
        recoveryActions?: {
            retry?: () => Promise<void>;
            fallback?: () => Promise<void>;
            refresh?: () => void;
            clearCache?: () => Promise<void>;
        }
    ): string {
        const notification = this.createErrorNotification(error, language, recoveryActions);
        this.showNotification(notification);
        return notification.id;
    }

    /**
     * Show fallback mode notification
     */
    showFallbackModeNotification(
        reason: string,
        language: SupportedLanguage = SupportedLanguage.ENGLISH,
        recoveryAction?: () => Promise<void>
    ): string {
        const notificationId = `fallback-${++this.notificationCounter}-${Date.now()}`;

        const messages = {
            [SupportedLanguage.ENGLISH]: {
                title: 'AI Demo Mode Active',
                message: 'The AI model is temporarily unavailable. Using demo responses.',
                details: `Reason: ${reason}`,
                retryLabel: 'Try Again',
                dismissLabel: 'Dismiss'
            },
            [SupportedLanguage.HINDI]: {
                title: 'AI डेमो मोड सक्रिय',
                message: 'AI मॉडल अस्थायी रूप से अनुपलब्ध है। डेमो उत्तर का उपयोग कर रहे हैं।',
                details: `कारण: ${reason}`,
                retryLabel: 'पुनः प्रयास करें',
                dismissLabel: 'बंद करें'
            }
        };

        const msg = messages[language];
        const actions: NotificationAction[] = [
            {
                id: 'dismiss',
                label: msg.dismissLabel,
                type: 'secondary',
                action: () => this.dismissNotification(notificationId)
            }
        ];

        if (recoveryAction) {
            actions.unshift({
                id: 'retry',
                label: msg.retryLabel,
                type: 'primary',
                action: async () => {
                    try {
                        await recoveryAction();
                        this.dismissNotification(notificationId);
                    } catch (error) {
                        console.error('Recovery action failed:', error);
                    }
                }
            });
        }

        const notification: ErrorNotification = {
            id: notificationId,
            type: NotificationType.WARNING,
            title: msg.title,
            message: msg.message,
            details: msg.details,
            actions,
            dismissible: true,
            autoHide: false,
            timestamp: Date.now()
        };

        this.showNotification(notification);
        return notificationId;
    }

    /**
     * Show success notification
     */
    showSuccess(
        message: string,
        language: SupportedLanguage = SupportedLanguage.ENGLISH,
        autoHide: boolean = true
    ): string {
        const notificationId = `success-${++this.notificationCounter}-${Date.now()}`;

        const titles = {
            [SupportedLanguage.ENGLISH]: 'Success',
            [SupportedLanguage.HINDI]: 'सफलता'
        };

        const notification: ErrorNotification = {
            id: notificationId,
            type: NotificationType.SUCCESS,
            title: titles[language],
            message,
            actions: [{
                id: 'dismiss',
                label: language === SupportedLanguage.HINDI ? 'बंद करें' : 'Dismiss',
                type: 'secondary',
                action: () => this.dismissNotification(notificationId)
            }],
            dismissible: true,
            autoHide,
            duration: autoHide ? 3000 : undefined,
            timestamp: Date.now()
        };

        this.showNotification(notification);
        return notificationId;
    }

    /**
     * Dismiss notification
     */
    dismissNotification(id: string): void {
        this.notifications.delete(id);
        this.notifyListeners();
    }

    /**
     * Clear all notifications
     */
    clearAll(): void {
        this.notifications.clear();
        this.notifyListeners();
    }

    /**
     * Get all active notifications
     */
    getNotifications(): ErrorNotification[] {
        return Array.from(this.notifications.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Subscribe to notification changes
     */
    subscribe(listener: (notifications: ErrorNotification[]) => void): () => void {
        this.listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    // ============================================================================
    // Private Helper Methods
    // ============================================================================

    /**
     * Get notification type from error severity
     */
    private getNotificationTypeFromSeverity(severity: ErrorSeverity): NotificationType {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                return NotificationType.ERROR;
            case ErrorSeverity.HIGH:
                return NotificationType.ERROR;
            case ErrorSeverity.MEDIUM:
                return NotificationType.WARNING;
            case ErrorSeverity.LOW:
                return NotificationType.INFO;
            default:
                return NotificationType.ERROR;
        }
    }

    /**
     * Get error title based on type and language
     */
    private getErrorTitle(type: Gemma2BErrorType, language: SupportedLanguage): string {
        const titles = {
            [SupportedLanguage.ENGLISH]: {
                [Gemma2BErrorType.MODEL_LOAD_ERROR]: 'AI Model Loading Failed',
                [Gemma2BErrorType.INFERENCE_ERROR]: 'AI Processing Error',
                [Gemma2BErrorType.RESOURCE_ERROR]: 'System Resources Low',
                [Gemma2BErrorType.BROWSER_COMPATIBILITY_ERROR]: 'Browser Not Supported',
                [Gemma2BErrorType.NETWORK_ERROR]: 'Network Connection Issue',
                [Gemma2BErrorType.CACHE_ERROR]: 'Storage Issue',
                [Gemma2BErrorType.VALIDATION_ERROR]: 'AI Model Validation Failed'
            },
            [SupportedLanguage.HINDI]: {
                [Gemma2BErrorType.MODEL_LOAD_ERROR]: 'AI मॉडल लोडिंग असफल',
                [Gemma2BErrorType.INFERENCE_ERROR]: 'AI प्रोसेसिंग त्रुटि',
                [Gemma2BErrorType.RESOURCE_ERROR]: 'सिस्टम संसाधन कम',
                [Gemma2BErrorType.BROWSER_COMPATIBILITY_ERROR]: 'ब्राउज़र समर्थित नहीं',
                [Gemma2BErrorType.NETWORK_ERROR]: 'नेटवर्क कनेक्शन समस्या',
                [Gemma2BErrorType.CACHE_ERROR]: 'स्टोरेज समस्या',
                [Gemma2BErrorType.VALIDATION_ERROR]: 'AI मॉडल सत्यापन असफल'
            }
        };

        return titles[language][type] || titles[language][Gemma2BErrorType.INFERENCE_ERROR];
    }

    /**
     * Get user-friendly error message
     */
    private getUserFriendlyMessage(error: Gemma2BError, language: SupportedLanguage): string {
        const messages = {
            [SupportedLanguage.ENGLISH]: {
                [Gemma2BErrorType.MODEL_LOAD_ERROR]: 'We couldn\'t load the AI model. This might be due to network issues or insufficient storage.',
                [Gemma2BErrorType.INFERENCE_ERROR]: 'The AI couldn\'t process your request. Please try rephrasing your message.',
                [Gemma2BErrorType.RESOURCE_ERROR]: 'Your device needs more memory to run the AI. Try closing other applications.',
                [Gemma2BErrorType.BROWSER_COMPATIBILITY_ERROR]: 'Your browser doesn\'t support the AI features. Please update your browser.',
                [Gemma2BErrorType.NETWORK_ERROR]: 'There\'s a problem with your internet connection. Please check and try again.',
                [Gemma2BErrorType.CACHE_ERROR]: 'There\'s an issue with browser storage. Try clearing your cache.',
                [Gemma2BErrorType.VALIDATION_ERROR]: 'The AI model appears to be corrupted and needs to be re-downloaded.'
            },
            [SupportedLanguage.HINDI]: {
                [Gemma2BErrorType.MODEL_LOAD_ERROR]: 'हम AI मॉडल लोड नहीं कर सके। यह नेटवर्क समस्या या अपर्याप्त स्टोरेज के कारण हो सकता है।',
                [Gemma2BErrorType.INFERENCE_ERROR]: 'AI आपके अनुरोध को प्रोसेस नहीं कर सका। कृपया अपना संदेश दोबारा लिखें।',
                [Gemma2BErrorType.RESOURCE_ERROR]: 'AI चलाने के लिए आपके डिवाइस को अधिक मेमोरी की आवश्यकता है। अन्य एप्लिकेशन बंद करने का प्रयास करें।',
                [Gemma2BErrorType.BROWSER_COMPATIBILITY_ERROR]: 'आपका ब्राउज़र AI सुविधाओं का समर्थन नहीं करता। कृपया अपना ब्राउज़र अपडेट करें।',
                [Gemma2BErrorType.NETWORK_ERROR]: 'आपके इंटरनेट कनेक्शन में समस्या है। कृपया जांचें और पुनः प्रयास करें।',
                [Gemma2BErrorType.CACHE_ERROR]: 'ब्राउज़र स्टोरेज में समस्या है। अपना कैश साफ़ करने का प्रयास करें।',
                [Gemma2BErrorType.VALIDATION_ERROR]: 'AI मॉडल दूषित प्रतीत होता है और इसे पुनः डाउनलोड करने की आवश्यकता है।'
            }
        };

        return messages[language][error.type] || error.message;
    }

    /**
     * Get detailed error information
     */
    private getErrorDetails(error: Gemma2BError, language: SupportedLanguage): string {
        if (!error.details) return '';

        const detailLabels = {
            [SupportedLanguage.ENGLISH]: 'Technical details:',
            [SupportedLanguage.HINDI]: 'तकनीकी विवरण:'
        };

        return `${detailLabels[language]} ${JSON.stringify(error.details, null, 2)}`;
    }

    /**
     * Create action buttons for error notifications
     */
    private createErrorActions(
        error: Gemma2BError,
        language: SupportedLanguage,
        recoveryActions?: {
            retry?: () => Promise<void>;
            fallback?: () => Promise<void>;
            refresh?: () => void;
            clearCache?: () => Promise<void>;
        }
    ): NotificationAction[] {
        const labels = {
            [SupportedLanguage.ENGLISH]: {
                retry: 'Try Again',
                fallback: 'Use Demo Mode',
                refresh: 'Refresh Page',
                clearCache: 'Clear Cache',
                dismiss: 'Dismiss'
            },
            [SupportedLanguage.HINDI]: {
                retry: 'पुनः प्रयास करें',
                fallback: 'डेमो मोड का उपयोग करें',
                refresh: 'पेज रीफ्रेश करें',
                clearCache: 'कैश साफ़ करें',
                dismiss: 'बंद करें'
            }
        };

        const l = labels[language];
        const actions: NotificationAction[] = [];

        // Add recovery actions based on error type and availability
        if (error.recoverable && recoveryActions?.retry) {
            actions.push({
                id: 'retry',
                label: l.retry,
                type: 'primary',
                action: recoveryActions.retry
            });
        }

        if (recoveryActions?.fallback) {
            actions.push({
                id: 'fallback',
                label: l.fallback,
                type: 'secondary',
                action: recoveryActions.fallback
            });
        }

        if (error.type === Gemma2BErrorType.CACHE_ERROR && recoveryActions?.clearCache) {
            actions.push({
                id: 'clearCache',
                label: l.clearCache,
                type: 'secondary',
                action: recoveryActions.clearCache
            });
        }

        if (recoveryActions?.refresh) {
            actions.push({
                id: 'refresh',
                label: l.refresh,
                type: 'secondary',
                action: recoveryActions.refresh
            });
        }

        // Always add dismiss action
        actions.push({
            id: 'dismiss',
            label: l.dismiss,
            type: 'secondary',
            action: () => this.dismissNotification(error.timestamp.toString())
        });

        return actions;
    }

    /**
     * Notify all listeners of notification changes
     */
    private notifyListeners(): void {
        const notifications = this.getNotifications();
        this.listeners.forEach(listener => {
            try {
                listener(notifications);
            } catch (error) {
                console.error('Error notifying listener:', error);
            }
        });
    }
}

// Singleton instance
let errorNotificationService: ErrorNotificationService | null = null;

/**
 * Get singleton instance of ErrorNotificationService
 */
export function getErrorNotificationService(): ErrorNotificationService {
    if (!errorNotificationService) {
        errorNotificationService = new ErrorNotificationService();
    }
    return errorNotificationService;
}