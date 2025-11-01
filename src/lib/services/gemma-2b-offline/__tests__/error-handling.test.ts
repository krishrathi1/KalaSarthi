/**
 * Test suite for comprehensive error handling and fallback mechanisms
 */

import { Gemma2BErrorHandler, ResourceError } from '../errors';
import { FallbackService } from '../FallbackService';
import { ErrorNotificationService } from '../ErrorNotificationService';
import {
    Gemma2BErrorType,
    ErrorSeverity,
    SupportedLanguage
} from '../../../types/gemma-2b-offline';

describe('Gemma 2B Error Handling and Fallbacks', () => {
    let errorHandler: Gemma2BErrorHandler;
    let fallbackService: FallbackService;
    let notificationService: ErrorNotificationService;

    beforeEach(() => {
        errorHandler = new Gemma2BErrorHandler();
        fallbackService = new FallbackService();
        notificationService = new ErrorNotificationService();
    });

    describe('Error Handler', () => {
        test('should handle retry mechanism with exponential backoff', async () => {
            let attempts = 0;
            const maxRetries = 3;

            const operation = jest.fn().mockImplementation(async () => {
                attempts++;
                if (attempts < maxRetries) {
                    throw new Error(`Attempt ${attempts} failed`);
                }
                return 'success';
            });

            const result = await errorHandler.retryOperation(
                operation,
                'test-operation',
                maxRetries,
                100 // 100ms base delay for faster testing
            );

            expect(result).toBe('success');
            expect(attempts).toBe(maxRetries);
            expect(operation).toHaveBeenCalledTimes(maxRetries);
        });

        test('should enable fallback mode on critical errors', async () => {
            expect(errorHandler.isInFallbackMode()).toBe(false);

            await errorHandler.enableFallbackMode('Test critical error');

            expect(errorHandler.isInFallbackMode()).toBe(true);
        });

        test('should generate user-friendly error messages', () => {
            const error = {
                type: Gemma2BErrorType.RESOURCE_ERROR,
                severity: ErrorSeverity.HIGH,
                message: 'Insufficient memory',
                timestamp: Date.now(),
                recoverable: true
            };

            const response = errorHandler.generateUserFriendlyErrorResponse(error);

            expect(response.message).toContain('memory');
            expect(response.troubleshooting).toContain('Close other browser tabs');
            expect(response.canRetry).toBe(true);
            expect(response.fallbackAvailable).toBe(true);
        });

        test('should provide recovery strategies', () => {
            const error = {
                type: Gemma2BErrorType.NETWORK_ERROR,
                severity: ErrorSeverity.MEDIUM,
                message: 'Network timeout',
                timestamp: Date.now(),
                recoverable: true
            };

            const strategies = errorHandler.getRecoveryStrategy(error);

            expect(strategies.immediate).toContain('Check internet connection');
            expect(strategies.shortTerm).toContain('Restart router/modem');
            expect(strategies.longTerm).toContain('Contact internet provider');
        });

        test('should determine fallback necessity correctly', () => {
            const criticalError = new Error('WebGL not supported');
            const minorError = new Error('Temporary network issue');

            expect(errorHandler.shouldFallbackToDemo(criticalError)).toBe(true);
            expect(errorHandler.shouldFallbackToDemo(minorError)).toBe(false);
        });
    });

    describe('Fallback Service', () => {
        test('should be always available', () => {
            expect(fallbackService.isAvailable()).toBe(true);
        });

        test('should generate appropriate demo responses', async () => {
            const pricingQuestion = 'How should I price my pottery?';
            const response = await fallbackService.generateFallbackResponse(
                pricingQuestion,
                SupportedLanguage.ENGLISH
            );

            expect(response).toContain('pricing');
            expect(response).toContain('[Demo Mode');
            expect(response.length).toBeGreaterThan(50);
        });

        test('should support Hindi responses', async () => {
            const hindiQuestion = 'मेरे हस्तशिल्प का मूल्य कैसे तय करूं?';
            const response = await fallbackService.generateFallbackResponse(
                hindiQuestion,
                SupportedLanguage.HINDI
            );

            expect(response).toContain('मूल्य');
            expect(response).toContain('[डेमो मोड');
        });

        test('should detect artisan domains correctly', async () => {
            const potteryQuestion = 'How do I fire clay pottery?';
            const response = await fallbackService.generateFallbackResponse(
                potteryQuestion,
                SupportedLanguage.ENGLISH
            );

            expect(response).toContain('pottery');
            expect(response).toContain('clay');
        });

        test('should maintain conversation history', async () => {
            const sessionId = 'test-session';

            await fallbackService.generateFallbackResponse(
                'Hello',
                SupportedLanguage.ENGLISH,
                sessionId
            );

            await fallbackService.generateFallbackResponse(
                'How do I price my crafts?',
                SupportedLanguage.ENGLISH,
                sessionId
            );

            const history = fallbackService.getConversationHistory(sessionId);
            expect(history).toHaveLength(4); // 2 user messages + 2 assistant responses
        });
    });

    describe('Error Notification Service', () => {
        test('should create appropriate notifications for different error types', () => {
            const resourceError = {
                type: Gemma2BErrorType.RESOURCE_ERROR,
                severity: ErrorSeverity.HIGH,
                message: 'Insufficient memory',
                timestamp: Date.now(),
                recoverable: true
            };

            const notification = notificationService.createErrorNotification(
                resourceError,
                SupportedLanguage.ENGLISH
            );

            expect(notification.type).toBe('error');
            expect(notification.title).toContain('Resources');
            expect(notification.message).toContain('memory');
            expect(notification.actions.length).toBeGreaterThan(0);
        });

        test('should show fallback mode notifications', () => {
            const notificationId = notificationService.showFallbackModeNotification(
                'Model loading failed',
                SupportedLanguage.ENGLISH
            );

            const notifications = notificationService.getNotifications();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].title).toContain('Demo Mode');
            expect(notifications[0].id).toBe(notificationId);
        });

        test('should support notification subscription', () => {
            const mockListener = jest.fn();
            const unsubscribe = notificationService.subscribe(mockListener);

            notificationService.showSuccess('Test success');

            expect(mockListener).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'success',
                        message: 'Test success'
                    })
                ])
            );

            unsubscribe();
            notificationService.clearAll();
            mockListener.mockClear();

            notificationService.showSuccess('Another test');
            expect(mockListener).not.toHaveBeenCalled();
        });

        test('should auto-hide low severity notifications', (done) => {
            const notification = notificationService.createErrorNotification(
                {
                    type: Gemma2BErrorType.INFERENCE_ERROR,
                    severity: ErrorSeverity.LOW,
                    message: 'Minor issue',
                    timestamp: Date.now(),
                    recoverable: true
                },
                SupportedLanguage.ENGLISH
            );

            // Override duration for faster testing
            notification.duration = 100;
            notificationService.showNotification(notification);

            expect(notificationService.getNotifications()).toHaveLength(1);

            setTimeout(() => {
                expect(notificationService.getNotifications()).toHaveLength(0);
                done();
            }, 150);
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete error flow with fallback', async () => {
            // Simulate a critical error that should trigger fallback
            const criticalError = new Error('Insufficient memory');

            // Error handler should recommend fallback
            const shouldFallback = errorHandler.shouldFallbackToDemo(criticalError);
            expect(shouldFallback).toBe(true);

            // Enable fallback mode
            await errorHandler.enableFallbackMode('Critical error occurred');
            expect(errorHandler.isInFallbackMode()).toBe(true);

            // Fallback service should provide response
            const response = await fallbackService.generateFallbackResponse(
                'Help me with my business',
                SupportedLanguage.ENGLISH
            );

            expect(response).toContain('Demo Mode');
            expect(response.length).toBeGreaterThan(20);
        });

        test('should handle resource constraint detection and recovery', async () => {
            // Mock resource constraint
            const resourceError = new ResourceError('High memory usage detected');

            // Generate user-friendly response
            const errorResponse = errorHandler.generateUserFriendlyErrorResponse({
                type: Gemma2BErrorType.RESOURCE_ERROR,
                severity: ErrorSeverity.HIGH,
                message: resourceError.message,
                timestamp: Date.now(),
                recoverable: true
            });

            expect(errorResponse.troubleshooting).toContain('Close other browser tabs');
            expect(errorResponse.canRetry).toBe(true);

            // Create notification
            const notification = notificationService.createErrorNotification(
                {
                    type: Gemma2BErrorType.RESOURCE_ERROR,
                    severity: ErrorSeverity.HIGH,
                    message: resourceError.message,
                    timestamp: Date.now(),
                    recoverable: true
                },
                SupportedLanguage.ENGLISH,
                {
                    retry: async () => {
                        // Mock retry action
                        console.log('Retrying operation...');
                    }
                }
            );

            expect(notification.actions.some(action => action.id === 'retry')).toBe(true);
        });
    });
});