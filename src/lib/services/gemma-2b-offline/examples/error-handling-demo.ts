/**
 * Demo script showing comprehensive error handling and fallback mechanisms
 * for the Gemma 2B Offline Service
 */

import { GemmaOfflineService } from '../../GemmaOfflineService';
import {
    getErrorNotificationService,
    ErrorNotificationService
} from '../ErrorNotificationService';
import { SupportedLanguage } from '../../../types/gemma-2b-offline';

/**
 * Demo class showing error handling and fallback usage
 */
export class ErrorHandlingDemo {
    private gemmaService: GemmaOfflineService;
    private notificationService: ErrorNotificationService;

    constructor() {
        this.gemmaService = GemmaOfflineService.getInstance();
        this.notificationService = getErrorNotificationService();

        // Subscribe to notifications
        this.notificationService.subscribe((notifications) => {
            console.log('📢 Active notifications:', notifications.length);
            notifications.forEach(notification => {
                console.log(`  - ${notification.type}: ${notification.title}`);
            });
        });
    }

    /**
     * Demo: Initialize service with error handling
     */
    async demoInitialization(): Promise<void> {
        console.log('🚀 Demo: Service Initialization with Error Handling');

        try {
            const initialized = await this.gemmaService.initialize();

            if (initialized) {
                console.log('✅ Service initialized successfully');

                if (this.gemmaService.getErrorInfo().isInFallbackMode) {
                    console.log('⚠️ Service is running in fallback mode');

                    // Show fallback notification
                    this.notificationService.showFallbackModeNotification(
                        'Service initialized in fallback mode',
                        SupportedLanguage.ENGLISH,
                        async () => {
                            console.log('🔄 Attempting recovery...');
                            await this.gemmaService.attemptRecovery();
                        }
                    );
                }
            } else {
                console.log('❌ Service initialization failed');
                this.handleInitializationError();
            }
        } catch (error) {
            console.error('💥 Initialization error:', error);
            this.handleInitializationError();
        }
    }

    /**
     * Demo: Generate response with comprehensive error handling
     */
    async demoResponseGeneration(): Promise<void> {
        console.log('\n💬 Demo: Response Generation with Error Handling');

        const testMessages = [
            'How should I price my pottery?',
            'What materials work best for wood carving?',
            'मेरे हस्तशिल्प का व्यापार कैसे बढ़ाऊं?'
        ];

        for (const message of testMessages) {
            try {
                console.log(`\n📝 User: ${message}`);

                const response = await this.gemmaService.generateResponse(message);
                console.log(`🤖 AI: ${response.slice(0, 100)}...`);

                // Check if response is from fallback mode
                if (response.includes('[Demo Mode') || response.includes('[डेमो मोड')) {
                    console.log('ℹ️ Response generated using fallback service');
                }

            } catch (error) {
                console.error(`❌ Error generating response: ${error}`);
                await this.handleResponseError(error as Error, message);
            }
        }
    }

    /**
     * Demo: Resource constraint simulation
     */
    async demoResourceConstraints(): Promise<void> {
        console.log('\n🔧 Demo: Resource Constraint Handling');

        // Get current error info
        const errorInfo = this.gemmaService.getErrorInfo();

        console.log('📊 Current Error Statistics:');
        console.log('  - In Fallback Mode:', errorInfo.isInFallbackMode);
        console.log('  - Error Stats:', errorInfo.errorStats);

        if (errorInfo.lastError) {
            console.log('  - Last Error:', errorInfo.lastError.message);
            console.log('  - Troubleshooting Steps:');
            errorInfo.troubleshooting.forEach((step, index) => {
                console.log(`    ${index + 1}. ${step}`);
            });

            console.log('  - Recovery Strategies:');
            console.log('    Immediate:', errorInfo.recoveryStrategies.immediate);
            console.log('    Short-term:', errorInfo.recoveryStrategies.shortTerm);
            console.log('    Long-term:', errorInfo.recoveryStrategies.longTerm);
        }
    }

    /**
     * Demo: Manual fallback mode toggle
     */
    async demoFallbackToggle(): Promise<void> {
        console.log('\n🔄 Demo: Manual Fallback Mode Toggle');

        const wasInFallback = this.gemmaService.getErrorInfo().isInFallbackMode;

        if (!wasInFallback) {
            console.log('🔄 Enabling fallback mode manually...');
            await this.gemmaService.enableFallbackMode('Manual demo activation');

            // Show notification
            this.notificationService.showFallbackModeNotification(
                'Manually activated for demonstration',
                SupportedLanguage.ENGLISH
            );
        }

        // Test response in fallback mode
        const response = await this.gemmaService.generateResponse(
            'Tell me about traditional Indian crafts'
        );

        console.log('🤖 Fallback Response:', response.slice(0, 150) + '...');

        // Attempt recovery
        console.log('🔄 Attempting to exit fallback mode...');
        const recovered = await this.gemmaService.attemptRecovery();

        if (recovered) {
            console.log('✅ Successfully exited fallback mode');
            this.notificationService.showSuccess(
                'Service recovered successfully',
                SupportedLanguage.ENGLISH
            );
        } else {
            console.log('⚠️ Still in fallback mode');
        }
    }

    /**
     * Demo: Notification system
     */
    async demoNotificationSystem(): Promise<void> {
        console.log('\n📢 Demo: Notification System');

        // Show different types of notifications
        this.notificationService.showError(
            {
                type: 'RESOURCE_ERROR' as any,
                severity: 'HIGH' as any,
                message: 'Demo resource error',
                timestamp: Date.now(),
                recoverable: true
            },
            SupportedLanguage.ENGLISH,
            {
                retry: async () => {
                    console.log('🔄 Demo retry action executed');
                },
                clearCache: async () => {
                    console.log('🧹 Demo cache clear action executed');
                }
            }
        );

        // Show success notification
        setTimeout(() => {
            this.notificationService.showSuccess(
                'Demo operation completed successfully',
                SupportedLanguage.ENGLISH
            );
        }, 2000);

        // Show Hindi notification
        setTimeout(() => {
            this.notificationService.showError(
                {
                    type: 'NETWORK_ERROR' as any,
                    severity: 'MEDIUM' as any,
                    message: 'नेटवर्क कनेक्शन समस्या',
                    timestamp: Date.now(),
                    recoverable: true
                },
                SupportedLanguage.HINDI
            );
        }, 4000);
    }

    /**
     * Run complete demo
     */
    async runCompleteDemo(): Promise<void> {
        console.log('🎯 Starting Comprehensive Error Handling Demo\n');

        await this.demoInitialization();
        await this.demoResponseGeneration();
        await this.demoResourceConstraints();
        await this.demoFallbackToggle();
        await this.demoNotificationSystem();

        console.log('\n✅ Demo completed! Check the console for all error handling features.');

        // Show final status
        setTimeout(() => {
            const errorInfo = this.gemmaService.getErrorInfo();
            const fallbackStatus = this.gemmaService.getFallbackStatus();

            console.log('\n📊 Final Status:');
            console.log('  - Service Ready:', this.gemmaService.isReady());
            console.log('  - In Fallback Mode:', errorInfo.isInFallbackMode);
            console.log('  - Fallback Responses Generated:', fallbackStatus.responseCount);
            console.log('  - Active Notifications:', this.notificationService.getNotifications().length);
        }, 6000);
    }

    // ============================================================================
    // Private Helper Methods
    // ============================================================================

    /**
     * Handle initialization errors
     */
    private handleInitializationError(): void {
        const errorInfo = this.gemmaService.getErrorInfo();

        if (errorInfo.lastError) {
            this.notificationService.showError(
                errorInfo.lastError,
                SupportedLanguage.ENGLISH,
                {
                    retry: async () => {
                        console.log('🔄 Retrying initialization...');
                        await this.gemmaService.initialize();
                    },
                    fallback: async () => {
                        console.log('🔄 Enabling fallback mode...');
                        await this.gemmaService.enableFallbackMode('User requested fallback');
                    }
                }
            );
        }
    }

    /**
     * Handle response generation errors
     */
    private async handleResponseError(error: Error, originalMessage: string): Promise<void> {
        console.log('🚨 Handling response error:', error.message);

        // Try to get a fallback response
        try {
            await this.gemmaService.enableFallbackMode(`Response error: ${error.message}`);
            const fallbackResponse = await this.gemmaService.generateResponse(originalMessage);
            console.log('🔄 Fallback response:', fallbackResponse.slice(0, 100) + '...');
        } catch (fallbackError) {
            console.error('💥 Even fallback failed:', fallbackError);
        }
    }
}

// Export demo function for easy usage
export async function runErrorHandlingDemo(): Promise<void> {
    const demo = new ErrorHandlingDemo();
    await demo.runCompleteDemo();
}

// Auto-run demo if this file is executed directly
if (require.main === module) {
    runErrorHandlingDemo().catch(console.error);
}