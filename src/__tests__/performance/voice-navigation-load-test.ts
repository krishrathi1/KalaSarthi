/**
 * Voice Navigation Load Testing
 * Tests system behavior under heavy concurrent load
 */

import { VoiceNavigationService } from '@/lib/services/VoiceNavigationService';
import { MultilingualVoiceService } from '@/lib/services/MultilingualVoiceService';

// Mock dependencies for load testing
jest.mock('@/lib/service/EnhancedSpeechToTextService');
jest.mock('@/lib/service/EnhancedTextToSpeechService');
jest.mock('@/lib/services/VoiceNavigationErrorHandler', () => ({
    VoiceNavigationErrorHandler: {
        getInstance: jest.fn(() => ({
            handleError: jest.fn().mockResolvedValue({
                success: true,
                action: 'retry',
                message: 'Error handled'
            })
        }))
    }
}));
jest.mock('@/lib/services/VoiceNavigationLogger', () => ({
    VoiceNavigationLogger: {
        getInstance: jest.fn(() => ({
            configure: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            critical: jest.fn(),
            startTiming: jest.fn(() => jest.fn())
        }))
    },
    LogLevel: {
        DEBUG: 'DEBUG',
        INFO: 'INFO',
        ERROR: 'ERROR'
    },
    LogCategory: {
        SYSTEM: 'SYSTEM',
        VOICE_INPUT: 'VOICE_INPUT',
        ERROR_HANDLING: 'ERROR_HANDLING'
    }
}));
jest.mock('@/lib/services/VoiceNavigationFallback', () => ({
    VoiceNavigationFallback: {
        getInstance: jest.fn(() => ({
            activateFallback: jest.fn(),
            processOfflineCommand: jest.fn(),
            getCurrentMode: jest.fn().mockReturnValue('full'),
            resetToFullMode: jest.fn()
        }))
    }
}));
jest.mock('@/lib/services/VoiceNavigationProgressiveEnhancement', () => ({
    VoiceNavigationProgressiveEnhancement: {
        getInstance: jest.fn(() => ({
            getAvailableFeatures: jest.fn().mockReturnValue(['voice_recognition', 'tts']),
            isFeatureAvailable: jest.fn().mockReturnValue({ available: true }),
            upgradeFeatures: jest.fn().mockResolvedValue({ upgraded: false, newFeatures: [] })
        }))
    }
}));
jest.mock('@/lib/services/VoiceNavigationGuidance', () => ({
    VoiceNavigationGuidance: {
        getInstance: jest.fn(() => ({
            setCurrentUser: jest.fn(),
            getHelp: jest.fn().mockReturnValue({ commands: [], topics: [], suggestions: [] }),
            getContextualHints: jest.fn().mockReturnValue([]),
            getCommandSuggestions: jest.fn().mockReturnValue([]),
            startTutorial: jest.fn().mockReturnValue({ success: true, message: 'Tutorial started' }),
            processTutorialStep: jest.fn().mockReturnValue({ success: true, completed: false, feedback: 'Good' }),
            getAvailableTutorials: jest.fn().mockReturnValue([])
        }))
    }
}));
jest.mock('@/lib/services/VoicePatternMatcher', () => ({
    VoicePatternMatcher: {
        getInstance: jest.fn(() => ({
            matchPattern: jest.fn(),
            addCustomPattern: jest.fn()
        }))
    }
}));

interface LoadTestResult {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    memoryUsage: number;
    errors: string[];
}

interface LoadTestConfig {
    concurrentUsers: number;
    requestsPerUser: number;
    rampUpTime: number; // milliseconds
    testDuration: number; // milliseconds
    languages: string[];
    commands: string[];
}

class VoiceNavigationLoadTester {
    private voiceService: VoiceNavigationService;
    private results: LoadTestResult;
    private startTime: number = 0;
    private responseTimes: number[] = [];
    private errors: string[] = [];

    constructor() {
        this.voiceService = VoiceNavigationService.getInstance();
        this.results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            minResponseTime: 0,
            maxResponseTime: 0,
            requestsPerSecond: 0,
            memoryUsage: 0,
            errors: []
        };
    }

    async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
        console.log(`Starting load test with ${config.concurrentUsers} users, ${config.requestsPerUser} requests each`);

        this.startTime = Date.now();
        const initialMemory = this.getMemoryUsage();

        // Setup pattern matcher for load testing
        await this.setupMockServices();

        // Create user sessions with ramp-up
        const userPromises = this.createUserSessions(config);

        // Wait for all users to complete
        await Promise.all(userPromises);

        // Calculate final results
        this.calculateResults(config, initialMemory);

        return this.results;
    }

    private async setupMockServices(): Promise<void> {
        // Setup optimized pattern matcher for load testing
        const mockPatternMatcher = {
            matchPattern: jest.fn().mockImplementation((input: string, language: string) => {
                // Simulate realistic processing time
                const processingDelay = Math.random() * 5; // 0-5ms random delay

                return new Promise(resolve => {
                    setTimeout(() => {
                        const patterns: Record<string, any> = {
                            'go to dashboard': { matched: true, intent: 'navigate_dashboard', confidence: 0.9, parameters: {}, language },
                            'open profile': { matched: true, intent: 'navigate_profile', confidence: 0.85, parameters: {}, language },
                            'show marketplace': { matched: true, intent: 'navigate_marketplace', confidence: 0.9, parameters: {}, language },
                            'navigate to cart': { matched: true, intent: 'navigate_cart', confidence: 0.88, parameters: {}, language },
                            'display wishlist': { matched: true, intent: 'navigate_wishlist', confidence: 0.87, parameters: {}, language }
                        };

                        resolve(patterns[input.toLowerCase()] || { matched: false, confidence: 0.1 });
                    }, processingDelay);
                });
            }),
            addCustomPattern: jest.fn()
        };

        (this.voiceService as any).patternMatcher = mockPatternMatcher;
        await this.voiceService.initialize();
    }

    private createUserSessions(config: LoadTestConfig): Promise<void>[] {
        const userPromises: Promise<void>[] = [];

        for (let i = 0; i < config.concurrentUsers; i++) {
            const userDelay = (config.rampUpTime / config.concurrentUsers) * i;

            const userPromise = new Promise<void>((resolve) => {
                setTimeout(async () => {
                    await this.simulateUser(i, config);
                    resolve();
                }, userDelay);
            });

            userPromises.push(userPromise);
        }

        return userPromises;
    }

    private async simulateUser(userId: number, config: LoadTestConfig): Promise<void> {
        const userIdString = `loadtest_user_${userId}`;
        const language = config.languages[userId % config.languages.length];

        try {
            // Start session
            await this.voiceService.startSession(userIdString, language);

            // Execute requests
            for (let i = 0; i < config.requestsPerUser; i++) {
                const command = config.commands[i % config.commands.length];
                await this.executeRequest(userIdString, command);

                // Add small delay between requests to simulate realistic usage
                await this.sleep(Math.random() * 100); // 0-100ms delay
            }

            // End session
            await this.voiceService.endSession();

        } catch (error) {
            this.errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            this.results.failedRequests++;
        }
    }

    private async executeRequest(userId: string, command: string): Promise<void> {
        const startTime = performance.now();

        try {
            const result = await this.voiceService.processMultilingualVoiceInput(
                command,
                userId,
                false // Disable auto-detection for consistent performance
            );

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            this.responseTimes.push(responseTime);
            this.results.totalRequests++;

            if (result.success) {
                this.results.successfulRequests++;
            } else {
                this.results.failedRequests++;
                this.errors.push(`Command failed: ${command} - ${result.error}`);
            }

        } catch (error) {
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            this.responseTimes.push(responseTime);
            this.results.totalRequests++;
            this.results.failedRequests++;
            this.errors.push(`Request error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private calculateResults(config: LoadTestConfig, initialMemory: number): void {
        const endTime = Date.now();
        const totalDuration = (endTime - this.startTime) / 1000; // Convert to seconds

        // Calculate response time statistics
        if (this.responseTimes.length > 0) {
            this.results.averageResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
            this.results.minResponseTime = Math.min(...this.responseTimes);
            this.results.maxResponseTime = Math.max(...this.responseTimes);
        }

        // Calculate throughput
        this.results.requestsPerSecond = this.results.totalRequests / totalDuration;

        // Calculate memory usage
        this.results.memoryUsage = this.getMemoryUsage() - initialMemory;

        // Store errors (limit to first 10 to avoid excessive output)
        this.results.errors = this.errors.slice(0, 10);

        console.log('Load test completed:', {
            duration: `${totalDuration.toFixed(2)}s`,
            totalRequests: this.results.totalRequests,
            successRate: `${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`,
            avgResponseTime: `${this.results.averageResponseTime.toFixed(2)}ms`,
            requestsPerSecond: `${this.results.requestsPerSecond.toFixed(2)} req/s`,
            memoryIncrease: `${(this.results.memoryUsage / 1024 / 1024).toFixed(2)}MB`
        });
    }

    private getMemoryUsage(): number {
        if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

describe('Voice Navigation Load Tests', () => {
    let loadTester: VoiceNavigationLoadTester;

    beforeEach(() => {
        // Reset singleton instances
        (VoiceNavigationService as any).instance = undefined;
        (MultilingualVoiceService as any).instance = undefined;

        loadTester = new VoiceNavigationLoadTester();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Concurrent User Load Tests', () => {
        it('should handle 10 concurrent users with 5 requests each', async () => {
            const config: LoadTestConfig = {
                concurrentUsers: 10,
                requestsPerUser: 5,
                rampUpTime: 1000, // 1 second ramp-up
                testDuration: 10000, // 10 seconds
                languages: ['en-US', 'hi-IN', 'ta-IN'],
                commands: [
                    'go to dashboard',
                    'open profile',
                    'show marketplace',
                    'navigate to cart',
                    'display wishlist'
                ]
            };

            const results = await loadTester.runLoadTest(config);

            // Assertions for acceptable performance
            expect(results.totalRequests).toBe(50); // 10 users * 5 requests
            expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.95); // 95% success rate
            expect(results.averageResponseTime).toBeLessThan(100); // Average response time under 100ms
            expect(results.requestsPerSecond).toBeGreaterThan(10); // At least 10 requests per second
            expect(results.memoryUsage).toBeLessThan(10 * 1024 * 1024); // Less than 10MB memory increase
        }, 15000); // 15 second timeout

        it('should handle 25 concurrent users with moderate load', async () => {
            const config: LoadTestConfig = {
                concurrentUsers: 25,
                requestsPerUser: 3,
                rampUpTime: 2000, // 2 second ramp-up
                testDuration: 15000, // 15 seconds
                languages: ['en-US', 'hi-IN', 'ta-IN', 'bn-IN', 'te-IN'],
                commands: [
                    'go to dashboard',
                    'open profile',
                    'show marketplace'
                ]
            };

            const results = await loadTester.runLoadTest(config);

            // Assertions for moderate load
            expect(results.totalRequests).toBe(75); // 25 users * 3 requests
            expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.90); // 90% success rate
            expect(results.averageResponseTime).toBeLessThan(150); // Average response time under 150ms
            expect(results.requestsPerSecond).toBeGreaterThan(8); // At least 8 requests per second
        }, 20000); // 20 second timeout

        it('should handle high load with 50 concurrent users', async () => {
            const config: LoadTestConfig = {
                concurrentUsers: 50,
                requestsPerUser: 2,
                rampUpTime: 3000, // 3 second ramp-up
                testDuration: 20000, // 20 seconds
                languages: ['en-US', 'hi-IN'],
                commands: [
                    'go to dashboard',
                    'open profile'
                ]
            };

            const results = await loadTester.runLoadTest(config);

            // Assertions for high load (more lenient)
            expect(results.totalRequests).toBe(100); // 50 users * 2 requests
            expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.85); // 85% success rate
            expect(results.averageResponseTime).toBeLessThan(300); // Average response time under 300ms
            expect(results.requestsPerSecond).toBeGreaterThan(5); // At least 5 requests per second
        }, 30000); // 30 second timeout
    });

    describe('Sustained Load Tests', () => {
        it('should maintain performance over extended period', async () => {
            const config: LoadTestConfig = {
                concurrentUsers: 15,
                requestsPerUser: 10, // More requests per user
                rampUpTime: 2000,
                testDuration: 30000, // 30 seconds
                languages: ['en-US', 'hi-IN', 'ta-IN'],
                commands: [
                    'go to dashboard',
                    'open profile',
                    'show marketplace',
                    'navigate to cart',
                    'display wishlist'
                ]
            };

            const results = await loadTester.runLoadTest(config);

            // Should maintain good performance over time
            expect(results.totalRequests).toBe(150); // 15 users * 10 requests
            expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.90);
            expect(results.averageResponseTime).toBeLessThan(200);

            // Memory usage should not grow excessively
            expect(results.memoryUsage).toBeLessThan(20 * 1024 * 1024); // Less than 20MB
        }, 40000); // 40 second timeout

        it('should handle burst traffic patterns', async () => {
            // Simulate burst by having all users start quickly
            const config: LoadTestConfig = {
                concurrentUsers: 30,
                requestsPerUser: 3,
                rampUpTime: 500, // Very fast ramp-up (burst)
                testDuration: 10000,
                languages: ['en-US', 'hi-IN'],
                commands: [
                    'go to dashboard',
                    'open profile',
                    'show marketplace'
                ]
            };

            const results = await loadTester.runLoadTest(config);

            // Should handle burst traffic
            expect(results.totalRequests).toBe(90); // 30 users * 3 requests
            expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.80); // 80% success rate for burst
            expect(results.maxResponseTime).toBeLessThan(1000); // Max response time under 1 second
        }, 15000);
    });

    describe('Multilingual Load Tests', () => {
        it('should handle multilingual load efficiently', async () => {
            const config: LoadTestConfig = {
                concurrentUsers: 20,
                requestsPerUser: 4,
                rampUpTime: 2000,
                testDuration: 15000,
                languages: ['en-US', 'hi-IN', 'ta-IN', 'bn-IN', 'te-IN'], // All supported languages
                commands: [
                    'go to dashboard',
                    'open profile',
                    'show marketplace',
                    'navigate to cart'
                ]
            };

            const results = await loadTester.runLoadTest(config);

            // Multilingual processing should not significantly impact performance
            expect(results.totalRequests).toBe(80); // 20 users * 4 requests
            expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.90);
            expect(results.averageResponseTime).toBeLessThan(150);
        }, 20000);

        it('should handle language switching under load', async () => {
            // This test would need to be implemented with language switching commands
            const config: LoadTestConfig = {
                concurrentUsers: 15,
                requestsPerUser: 6, // Include language switch commands
                rampUpTime: 1500,
                testDuration: 12000,
                languages: ['en-US', 'hi-IN', 'ta-IN'],
                commands: [
                    'go to dashboard',
                    'switch to hindi',
                    'डैशबोर्ड पर जाएं',
                    'switch to english',
                    'open profile',
                    'show marketplace'
                ]
            };

            const results = await loadTester.runLoadTest(config);

            // Language switching should not break the system
            expect(results.totalRequests).toBe(90); // 15 users * 6 requests
            expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.85);
        }, 18000);
    });

    describe('Error Handling Under Load', () => {
        it('should gracefully handle errors under load', async () => {
            // This test would simulate error conditions
            const config: LoadTestConfig = {
                concurrentUsers: 20,
                requestsPerUser: 3,
                rampUpTime: 1000,
                testDuration: 10000,
                languages: ['en-US'],
                commands: [
                    'go to dashboard',
                    'invalid command that will fail', // This should cause errors
                    'open profile'
                ]
            };

            const results = await loadTester.runLoadTest(config);

            // Should handle errors gracefully without crashing
            expect(results.totalRequests).toBe(60); // 20 users * 3 requests
            expect(results.failedRequests).toBeGreaterThan(0); // Some requests should fail
            expect(results.successfulRequests).toBeGreaterThan(0); // But not all
            expect(results.errors.length).toBeGreaterThan(0); // Should capture error details
        }, 15000);
    });

    describe('Memory and Resource Management', () => {
        it('should not leak memory under sustained load', async () => {
            const config: LoadTestConfig = {
                concurrentUsers: 25,
                requestsPerUser: 8,
                rampUpTime: 2000,
                testDuration: 20000,
                languages: ['en-US', 'hi-IN'],
                commands: [
                    'go to dashboard',
                    'open profile',
                    'show marketplace',
                    'navigate to cart'
                ]
            };

            const results = await loadTester.runLoadTest(config);

            // Memory usage should be reasonable
            expect(results.memoryUsage).toBeLessThan(25 * 1024 * 1024); // Less than 25MB increase

            // Should complete all requests
            expect(results.totalRequests).toBe(200); // 25 users * 8 requests
        }, 25000);
    });
});