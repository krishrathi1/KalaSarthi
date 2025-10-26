/**
 * Stress Test Runner for Enhanced Artisan Buddy
 * 
 * Tests system limits, breaking points, and recovery capabilities
 * Requirements: 7.1, 7.2, 7.5
 */

import { performance } from 'perf_hooks';
import { LoadTestRunner, LoadTestConfig, LoadTestMetrics } from './load-test-runner';

export interface StressTestConfig {
    startUsers: number;
    maxUsers: number;
    userIncrement: number;
    messagesPerUser: number;
    acceptableErrorRate: number; // Percentage
    acceptableResponseTime: number; // Milliseconds
}

export interface StressTestResult {
    maxStableUsers: number;
    breakingPoint: number;
    metrics: LoadTestMetrics[];
    recommendations: string[];
}

export class StressTestRunner {
    private loadTestRunner: LoadTestRunner;

    constructor() {
        this.loadTestRunner = new LoadTestRunner();
    }

    /**
     * Run progressive stress test to find system limits
     */
    async runStressTest(config: StressTestConfig): Promise<StressTestResult> {
        console.log('🔥 Starting Progressive Stress Test...');
        console.log(`Testing from ${config.startUsers} to ${config.maxUsers} users`);
        console.log(`Acceptable error rate: ${config.acceptableErrorRate}%`);
        console.log(`Acceptable response time: ${config.acceptableResponseTime}ms\n`);

        const metrics: LoadTestMetrics[] = [];
        let maxStableUsers = 0;
        let breakingPoint = config.maxUsers;

        for (let users = config.startUsers; users <= config.maxUsers; users += config.userIncrement) {
            console.log(`\n🧪 Testing with ${users} concurrent users...`);

            const loadConfig: LoadTestConfig = {
                concurrentUsers: users,
                messagesPerUser: config.messagesPerUser,
                rampUpTimeMs: Math.min(users * 100, 5000) // Scale ramp-up time
            };

            try {
                const result = await this.loadTestRunner.runLoadTest(loadConfig);
                metrics.push(result);

                // Check if system is still stable
                const isStable = this.isSystemStable(result, config);

                if (isStable) {
                    maxStableUsers = users;
                    console.log(`✅ System stable at ${users} users`);
                } else {
                    breakingPoint = users;
                    console.log(`❌ System unstable at ${users} users`);
                    console.log(`   Error rate: ${result.errorRate.toFixed(2)}%`);
                    console.log(`   Avg response time: ${result.averageResponseTime.toFixed(2)}ms`);
                    break;
                }

                // Cool down between tests
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                console.error(`💥 System failed at ${users} users:`, error);
                breakingPoint = users;
                break;
            }
        }

        const recommendations = this.generateRecommendations(metrics, maxStableUsers, breakingPoint);

        const result: StressTestResult = {
            maxStableUsers,
            breakingPoint,
            metrics,
            recommendations
        };

        this.printStressTestResults(result, config);
        return result;
    }

    /**
     * Run memory stress test
     */
    async runMemoryStressTest(): Promise<void> {
        console.log('\n🧠 Running Memory Stress Test...');

        const initialMemory = process.memoryUsage();
        console.log(`Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

        // Test with increasing conversation history
        for (let historySize = 10; historySize <= 100; historySize += 10) {
            console.log(`\nTesting with ${historySize} messages per conversation...`);

            const config: LoadTestConfig = {
                concurrentUsers: 10,
                messagesPerUser: historySize,
                messageInterval: 100 // Fast messages to build history quickly
            };

            const result = await this.loadTestRunner.runLoadTest(config);
            const currentMemory = process.memoryUsage();
            const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;

            console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
            console.log(`Memory per message: ${(memoryIncrease / (10 * historySize) / 1024).toFixed(2)}KB`);

            // Check for memory leaks
            if (memoryIncrease > 500 * 1024 * 1024) { // 500MB threshold
                console.log('⚠️  Potential memory leak detected!');
                break;
            }

            // Cool down and force GC
            if (global.gc) {
                global.gc();
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    /**
     * Run burst traffic stress test
     */
    async runBurstStressTest(): Promise<void> {
        console.log('\n💥 Running Burst Traffic Stress Test...');

        const burstSizes = [50, 100, 200, 500, 1000];

        for (const burstSize of burstSizes) {
            console.log(`\nTesting burst of ${burstSize} simultaneous requests...`);

            const startTime = performance.now();
            const promises: Promise<any>[] = [];

            // Create burst of requests
            for (let i = 0; i < burstSize; i++) {
                const promise = this.simulateSingleRequest(`burst-${i}`);
                promises.push(promise);
            }

            try {
                const results = await Promise.allSettled(promises);
                const endTime = performance.now();

                const successful = results.filter(r => r.status === 'fulfilled').length;
                const failed = results.filter(r => r.status === 'rejected').length;
                const successRate = (successful / burstSize) * 100;
                const totalTime = endTime - startTime;

                console.log(`   Success rate: ${successRate.toFixed(1)}%`);
                console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
                console.log(`   Avg time per request: ${(totalTime / burstSize).toFixed(2)}ms`);

                if (successRate < 80) {
                    console.log(`❌ System failed burst test at ${burstSize} requests`);
                    break;
                } else {
                    console.log(`✅ System handled burst of ${burstSize} requests`);
                }

            } catch (error) {
                console.error(`💥 Burst test failed at ${burstSize} requests:`, error);
                break;
            }

            // Cool down between bursts
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    /**
     * Run endurance test
     */
    async runEnduranceTest(durationMinutes: number = 10): Promise<void> {
        console.log(`\n⏱️  Running Endurance Test (${durationMinutes} minutes)...`);

        const endTime = Date.now() + (durationMinutes * 60 * 1000);
        const metrics: { timestamp: number; responseTime: number; memoryUsage: number }[] = [];
        let requestCount = 0;
        let errorCount = 0;

        while (Date.now() < endTime) {
            try {
                const startTime = performance.now();
                await this.simulateSingleRequest(`endurance-${requestCount}`);
                const responseTime = performance.now() - startTime;

                const memoryUsage = process.memoryUsage().heapUsed;

                metrics.push({
                    timestamp: Date.now(),
                    responseTime,
                    memoryUsage
                });

                requestCount++;

                // Log progress every 100 requests
                if (requestCount % 100 === 0) {
                    const avgResponseTime = metrics.slice(-100).reduce((sum, m) => sum + m.responseTime, 0) / 100;
                    console.log(`   Processed ${requestCount} requests, avg response time: ${avgResponseTime.toFixed(2)}ms`);
                }

            } catch (error) {
                errorCount++;
                console.error(`Endurance test error:`, error);
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Analyze endurance results
        const errorRate = (errorCount / requestCount) * 100;
        const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
        const memoryGrowth = metrics[metrics.length - 1].memoryUsage - metrics[0].memoryUsage;

        console.log(`\n📊 Endurance Test Results:`);
        console.log(`   Total requests: ${requestCount}`);
        console.log(`   Error rate: ${errorRate.toFixed(2)}%`);
        console.log(`   Average response time: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`   Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

        if (errorRate > 5) {
            console.log(`⚠️  High error rate detected during endurance test`);
        }

        if (memoryGrowth > 100 * 1024 * 1024) { // 100MB
            console.log(`⚠️  Significant memory growth detected - possible memory leak`);
        }
    }

    /**
     * Simulate a single request for testing
     */
    private async simulateSingleRequest(userId: string): Promise<void> {
        // This would normally use the actual Enhanced Artisan Buddy service
        // For testing purposes, we'll simulate the request
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    }

    /**
     * Check if system is stable under current load
     */
    private isSystemStable(metrics: LoadTestMetrics, config: StressTestConfig): boolean {
        return metrics.errorRate <= config.acceptableErrorRate &&
            metrics.averageResponseTime <= config.acceptableResponseTime;
    }

    /**
     * Generate recommendations based on stress test results
     */
    private generateRecommendations(
        metrics: LoadTestMetrics[],
        maxStableUsers: number,
        breakingPoint: number
    ): string[] {
        const recommendations: string[] = [];

        if (maxStableUsers < 50) {
            recommendations.push('Consider implementing connection pooling to handle more concurrent users');
            recommendations.push('Optimize database queries and add caching layers');
        }

        if (breakingPoint - maxStableUsers < 20) {
            recommendations.push('System has a narrow stability margin - implement graceful degradation');
        }

        const lastStableMetrics = metrics.find(m => m.errorRate <= 5);
        if (lastStableMetrics && lastStableMetrics.averageResponseTime > 1000) {
            recommendations.push('Response times are high - consider optimizing AI service calls');
        }

        if (lastStableMetrics && lastStableMetrics.memoryUsage.final > lastStableMetrics.memoryUsage.initial * 2) {
            recommendations.push('Memory usage doubles under load - investigate potential memory leaks');
        }

        recommendations.push(`System can reliably handle ${maxStableUsers} concurrent users`);
        recommendations.push(`Consider load balancing if you expect more than ${Math.floor(maxStableUsers * 0.8)} concurrent users`);

        return recommendations;
    }

    /**
     * Print comprehensive stress test results
     */
    private printStressTestResults(result: StressTestResult, config: StressTestConfig): void {
        console.log('\n🔥 Stress Test Results Summary:');
        console.log('═'.repeat(60));
        console.log(`Maximum Stable Users: ${result.maxStableUsers}`);
        console.log(`Breaking Point: ${result.breakingPoint} users`);
        console.log(`Stability Margin: ${result.breakingPoint - result.maxStableUsers} users`);

        console.log('\n📈 Performance Progression:');
        result.metrics.forEach((metric, index) => {
            const users = config.startUsers + (index * config.userIncrement);
            const status = metric.errorRate <= config.acceptableErrorRate ? '✅' : '❌';
            console.log(`   ${status} ${users} users: ${metric.errorRate.toFixed(1)}% errors, ${metric.averageResponseTime.toFixed(0)}ms avg`);
        });

        console.log('\n💡 Recommendations:');
        result.recommendations.forEach(rec => {
            console.log(`   • ${rec}`);
        });

        console.log('═'.repeat(60));
    }

    /**
     * Run all stress test scenarios
     */
    static async runAllStressTests(): Promise<void> {
        const runner = new StressTestRunner();

        console.log('🚀 Running Comprehensive Stress Tests\n');

        // Progressive load stress test
        await runner.runStressTest({
            startUsers: 10,
            maxUsers: 100,
            userIncrement: 10,
            messagesPerUser: 5,
            acceptableErrorRate: 5,
            acceptableResponseTime: 2000
        });

        // Memory stress test
        await runner.runMemoryStressTest();

        // Burst traffic stress test
        await runner.runBurstStressTest();

        // Endurance test (5 minutes)
        await runner.runEnduranceTest(5);

        console.log('\n🎉 All stress tests completed!');
    }
}

// Export for use in tests
export default StressTestRunner;

// Allow running as standalone script
if (require.main === module) {
    StressTestRunner.runAllStressTests().catch(console.error);
}