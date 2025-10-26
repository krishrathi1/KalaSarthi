/**
 * Load Test Runner for Enhanced Artisan Buddy
 * 
 * Utility for running comprehensive load tests with configurable parameters
 * Requirements: 7.1, 7.2, 7.5
 */

import { performance } from 'perf_hooks';
import { EnhancedArtisanBuddyService } from '../../lib/services/EnhancedArtisanBuddyV2';
import { ArtisanProfile, MessageInput } from '../../lib/types/enhanced-artisan-buddy';

export interface LoadTestConfig {
    concurrentUsers: number;
    messagesPerUser: number;
    testDurationMs?: number;
    rampUpTimeMs?: number;
    messageInterval?: number;
    enableVoice?: boolean;
}

export interface LoadTestMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    memoryUsage: {
        initial: number;
        peak: number;
        final: number;
    };
    testDuration: number;
}

export interface UserSession {
    userId: string;
    conversationId: string;
    messagesSent: number;
    responseTimes: number[];
    errors: Error[];
    startTime: number;
    endTime?: number;
}

export class LoadTestRunner {
    private enhancedBuddy: EnhancedArtisanBuddyService;
    private sessions: Map<string, UserSession> = new Map();
    private isRunning = false;

    constructor() {
        this.enhancedBuddy = EnhancedArtisanBuddyService.getInstance();
    }

    /**
     * Run a comprehensive load test
     */
    async runLoadTest(config: LoadTestConfig): Promise<LoadTestMetrics> {
        console.log(`🚀 Starting load test with ${config.concurrentUsers} users...`);

        const initialMemory = process.memoryUsage();
        const testStartTime = performance.now();
        this.isRunning = true;

        try {
            // Initialize user sessions
            await this.initializeUsers(config);

            // Run the load test
            const results = await this.executeLoadTest(config);

            const testEndTime = performance.now();
            const finalMemory = process.memoryUsage();

            // Calculate metrics
            const metrics = this.calculateMetrics(results, {
                testStartTime,
                testEndTime,
                initialMemory,
                finalMemory
            });

            console.log('📊 Load test completed!');
            this.printMetrics(metrics);

            return metrics;

        } finally {
            this.isRunning = false;
            this.cleanup();
        }
    }

    /**
     * Initialize user sessions with profiles
     */
    private async initializeUsers(config: LoadTestConfig): Promise<void> {
        const initPromises: Promise<void>[] = [];

        for (let i = 0; i < config.concurrentUsers; i++) {
            const userId = `load-test-user-${i}`;

            const promise = (async () => {
                try {
                    const profile = this.generateTestProfile(i);
                    const context = await this.enhancedBuddy.initializeConversation(userId, profile);

                    this.sessions.set(userId, {
                        userId,
                        conversationId: context.conversationId,
                        messagesSent: 0,
                        responseTimes: [],
                        errors: [],
                        startTime: performance.now()
                    });
                } catch (error) {
                    console.error(`Failed to initialize user ${userId}:`, error);
                }
            })();

            initPromises.push(promise);

            // Ramp up users gradually if specified
            if (config.rampUpTimeMs && i > 0) {
                const delay = config.rampUpTimeMs / config.concurrentUsers;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        await Promise.all(initPromises);
        console.log(`✅ Initialized ${this.sessions.size} user sessions`);
    }

    /**
     * Execute the main load test
     */
    private async executeLoadTest(config: LoadTestConfig): Promise<UserSession[]> {
        const userPromises: Promise<UserSession>[] = [];

        for (const [userId, session] of this.sessions) {
            const promise = this.runUserSession(session, config);
            userPromises.push(promise);
        }

        return Promise.all(userPromises);
    }

    /**
     * Run a single user session
     */
    private async runUserSession(session: UserSession, config: LoadTestConfig): Promise<UserSession> {
        const messages = this.generateTestMessages(config.messagesPerUser);
        let currentContext = await this.enhancedBuddy.initializeConversation(session.userId, this.generateTestProfile(0));

        for (const message of messages) {
            if (!this.isRunning) break;

            try {
                const input: MessageInput = {
                    content: message,
                    userId: session.userId,
                    conversationId: session.conversationId,
                    inputType: config.enableVoice ? 'voice' : 'text',
                    context: currentContext
                };

                const startTime = performance.now();
                const response = await this.enhancedBuddy.processMessage(input);
                const endTime = performance.now();

                const responseTime = endTime - startTime;
                session.responseTimes.push(responseTime);
                session.messagesSent++;

                if (response.updatedContext) {
                    currentContext = response.updatedContext;
                }

                // Add delay between messages if specified
                if (config.messageInterval) {
                    await new Promise(resolve => setTimeout(resolve, config.messageInterval));
                }

            } catch (error) {
                session.errors.push(error as Error);
                console.error(`Error in session ${session.userId}:`, error);
            }
        }

        session.endTime = performance.now();
        return session;
    }

    /**
     * Calculate comprehensive metrics from test results
     */
    private calculateMetrics(
        sessions: UserSession[],
        testInfo: {
            testStartTime: number;
            testEndTime: number;
            initialMemory: NodeJS.MemoryUsage;
            finalMemory: NodeJS.MemoryUsage;
        }
    ): LoadTestMetrics {
        const allResponseTimes = sessions.flatMap(s => s.responseTimes);
        const totalErrors = sessions.reduce((sum, s) => sum + s.errors.length, 0);
        const totalRequests = sessions.reduce((sum, s) => sum + s.messagesSent, 0);
        const successfulRequests = totalRequests - totalErrors;

        // Sort response times for percentile calculations
        const sortedTimes = [...allResponseTimes].sort((a, b) => a - b);

        const testDuration = testInfo.testEndTime - testInfo.testStartTime;
        const requestsPerSecond = (totalRequests / testDuration) * 1000;

        return {
            totalRequests,
            successfulRequests,
            failedRequests: totalErrors,
            averageResponseTime: allResponseTimes.reduce((sum, t) => sum + t, 0) / allResponseTimes.length || 0,
            minResponseTime: Math.min(...allResponseTimes) || 0,
            maxResponseTime: Math.max(...allResponseTimes) || 0,
            p95ResponseTime: this.calculatePercentile(sortedTimes, 95),
            p99ResponseTime: this.calculatePercentile(sortedTimes, 99),
            requestsPerSecond,
            errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
            memoryUsage: {
                initial: testInfo.initialMemory.heapUsed,
                peak: Math.max(testInfo.initialMemory.heapUsed, testInfo.finalMemory.heapUsed),
                final: testInfo.finalMemory.heapUsed
            },
            testDuration
        };
    }

    /**
     * Calculate percentile from sorted array
     */
    private calculatePercentile(sortedArray: number[], percentile: number): number {
        if (sortedArray.length === 0) return 0;

        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
    }

    /**
     * Generate test profile for a user
     */
    private generateTestProfile(userIndex: number): ArtisanProfile {
        const skills = ['pottery', 'weaving', 'woodworking', 'metalwork', 'painting'];
        const categories = ['home-decor', 'jewelry', 'furniture', 'textiles', 'art'];

        return {
            id: `test-profile-${userIndex}`,
            userId: `load-test-user-${userIndex}`,
            personalInfo: {
                name: `Test Artisan ${userIndex}`,
                location: `Test City ${userIndex % 5}`,
                languages: ['English'],
                experience: (userIndex % 10) + 1
            },
            skills: {
                primary: [skills[userIndex % skills.length]],
                secondary: [skills[(userIndex + 1) % skills.length]],
                certifications: []
            },
            products: {
                categories: [categories[userIndex % categories.length]],
                specialties: [`specialty-${userIndex}`],
                priceRange: { min: 100, max: 1000, currency: 'USD' }
            },
            preferences: {
                communicationStyle: userIndex % 2 === 0 ? 'casual' : 'formal',
                responseLength: userIndex % 3 === 0 ? 'brief' : 'detailed',
                topics: [skills[userIndex % skills.length]]
            },
            businessInfo: {
                businessType: 'individual',
                targetMarket: ['local'],
                challenges: ['marketing'],
                goals: ['growth']
            },
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                completeness: 70 + (userIndex % 30)
            }
        };
    }

    /**
     * Generate test messages for a user session
     */
    private generateTestMessages(count: number): string[] {
        const messageTemplates = [
            'Help me with pottery techniques',
            'What tools do I need for my craft?',
            'How can I improve my product quality?',
            'Tell me about market trends',
            'What pricing strategy should I use?',
            'How do I market my products online?',
            'What materials work best for beginners?',
            'Can you suggest design improvements?',
            'How do I handle customer feedback?',
            'What are the latest craft trends?'
        ];

        const messages: string[] = [];
        for (let i = 0; i < count; i++) {
            const template = messageTemplates[i % messageTemplates.length];
            messages.push(`${template} (message ${i + 1})`);
        }

        return messages;
    }

    /**
     * Print formatted metrics to console
     */
    private printMetrics(metrics: LoadTestMetrics): void {
        console.log('\n📈 Load Test Results:');
        console.log('═'.repeat(50));
        console.log(`Total Requests: ${metrics.totalRequests}`);
        console.log(`Successful: ${metrics.successfulRequests}`);
        console.log(`Failed: ${metrics.failedRequests}`);
        console.log(`Error Rate: ${metrics.errorRate.toFixed(2)}%`);
        console.log(`\nResponse Times (ms):`);
        console.log(`  Average: ${metrics.averageResponseTime.toFixed(2)}`);
        console.log(`  Min: ${metrics.minResponseTime.toFixed(2)}`);
        console.log(`  Max: ${metrics.maxResponseTime.toFixed(2)}`);
        console.log(`  95th Percentile: ${metrics.p95ResponseTime.toFixed(2)}`);
        console.log(`  99th Percentile: ${metrics.p99ResponseTime.toFixed(2)}`);
        console.log(`\nThroughput:`);
        console.log(`  Requests/Second: ${metrics.requestsPerSecond.toFixed(2)}`);
        console.log(`\nMemory Usage (MB):`);
        console.log(`  Initial: ${(metrics.memoryUsage.initial / 1024 / 1024).toFixed(2)}`);
        console.log(`  Peak: ${(metrics.memoryUsage.peak / 1024 / 1024).toFixed(2)}`);
        console.log(`  Final: ${(metrics.memoryUsage.final / 1024 / 1024).toFixed(2)}`);
        console.log(`\nTest Duration: ${(metrics.testDuration / 1000).toFixed(2)} seconds`);
        console.log('═'.repeat(50));
    }

    /**
     * Cleanup resources
     */
    private cleanup(): void {
        this.sessions.clear();

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
    }

    /**
     * Run predefined load test scenarios
     */
    static async runScenarios(): Promise<void> {
        const runner = new LoadTestRunner();

        console.log('🎯 Running Load Test Scenarios\n');

        // Scenario 1: Light Load
        console.log('📋 Scenario 1: Light Load (10 users, 5 messages each)');
        await runner.runLoadTest({
            concurrentUsers: 10,
            messagesPerUser: 5,
            messageInterval: 1000
        });

        await new Promise(resolve => setTimeout(resolve, 2000)); // Cool down

        // Scenario 2: Medium Load
        console.log('\n📋 Scenario 2: Medium Load (25 users, 10 messages each)');
        await runner.runLoadTest({
            concurrentUsers: 25,
            messagesPerUser: 10,
            messageInterval: 500
        });

        await new Promise(resolve => setTimeout(resolve, 2000)); // Cool down

        // Scenario 3: Heavy Load
        console.log('\n📋 Scenario 3: Heavy Load (50 users, 15 messages each)');
        await runner.runLoadTest({
            concurrentUsers: 50,
            messagesPerUser: 15,
            rampUpTimeMs: 5000
        });

        await new Promise(resolve => setTimeout(resolve, 2000)); // Cool down

        // Scenario 4: Voice Load Test
        console.log('\n📋 Scenario 4: Voice Load Test (20 users, 8 voice messages each)');
        await runner.runLoadTest({
            concurrentUsers: 20,
            messagesPerUser: 8,
            enableVoice: true,
            messageInterval: 2000
        });

        console.log('\n🎉 All load test scenarios completed!');
    }
}

// Export for use in tests and standalone execution
export default LoadTestRunner;

// Allow running as standalone script
if (require.main === module) {
    LoadTestRunner.runScenarios().catch(console.error);
}