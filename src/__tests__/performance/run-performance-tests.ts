#!/usr/bin/env node

/**
 * Performance Test Runner Script
 * 
 * Runs all performance tests for Enhanced Artisan Buddy
 * Requirements: 7.1, 7.2, 7.5
 */

import { LoadTestRunner } from './load-test-runner';
import { StressTestRunner } from './stress-test-runner';
import { createPerformanceMonitor } from './performance-monitor';

interface TestSuite {
    name: string;
    description: string;
    run: () => Promise<void>;
}

class PerformanceTestSuite {
    private loadTestRunner: LoadTestRunner;
    private stressTestRunner: StressTestRunner;

    constructor() {
        this.loadTestRunner = new LoadTestRunner();
        this.stressTestRunner = new StressTestRunner();
    }

    /**
     * Run all performance test suites
     */
    async runAllTests(): Promise<void> {
        console.log('🚀 Enhanced Artisan Buddy Performance Test Suite');
        console.log('='.repeat(60));
        console.log('Testing system performance, load handling, and resilience');
        console.log('Requirements: 7.1 (Response Times), 7.2 (Voice Processing), 7.5 (Memory Usage)\n');

        const testSuites: TestSuite[] = [
            {
                name: 'Basic Performance Tests',
                description: 'Test response times and basic functionality',
                run: () => this.runBasicPerformanceTests()
            },
            {
                name: 'Load Tests',
                description: 'Test system under various load conditions',
                run: () => this.runLoadTests()
            },
            {
                name: 'Stress Tests',
                description: 'Find system limits and breaking points',
                run: () => this.runStressTests()
            },
            {
                name: 'Memory Tests',
                description: 'Test memory usage and leak detection',
                run: () => this.runMemoryTests()
            },
            {
                name: 'Resilience Tests',
                description: 'Test error recovery and system stability',
                run: () => this.runResilienceTests()
            }
        ];

        const results: { name: string; success: boolean; error?: string }[] = [];

        for (const suite of testSuites) {
            console.log(`\n🧪 Running ${suite.name}...`);
            console.log(`   ${suite.description}`);
            console.log('-'.repeat(50));

            try {
                await suite.run();
                results.push({ name: suite.name, success: true });
                console.log(`✅ ${suite.name} completed successfully`);
            } catch (error) {
                results.push({
                    name: suite.name,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
                console.error(`❌ ${suite.name} failed:`, error);
            }

            // Cool down between test suites
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        this.printFinalResults(results);
    }

    /**
     * Run basic performance tests
     */
    private async runBasicPerformanceTests(): Promise<void> {
        console.log('Testing basic response time requirements...');

        // Test 1: Single user baseline
        const baselineResult = await this.loadTestRunner.runLoadTest({
            concurrentUsers: 1,
            messagesPerUser: 5,
            messageInterval: 1000
        });

        console.log(`Baseline response time: ${baselineResult.averageResponseTime.toFixed(2)}ms`);

        if (baselineResult.averageResponseTime > 2000) {
            throw new Error(`Baseline response time too high: ${baselineResult.averageResponseTime}ms`);
        }

        // Test 2: Voice processing
        const voiceResult = await this.loadTestRunner.runLoadTest({
            concurrentUsers: 1,
            messagesPerUser: 3,
            enableVoice: true,
            messageInterval: 2000
        });

        console.log(`Voice response time: ${voiceResult.averageResponseTime.toFixed(2)}ms`);

        if (voiceResult.averageResponseTime > 1000) {
            throw new Error(`Voice response time too high: ${voiceResult.averageResponseTime}ms`);
        }
    }

    /**
     * Run load tests
     */
    private async runLoadTests(): Promise<void> {
        console.log('Testing system under various load conditions...');

        const loadScenarios = [
            { users: 5, messages: 5, name: 'Light Load' },
            { users: 15, messages: 8, name: 'Medium Load' },
            { users: 25, messages: 10, name: 'Heavy Load' }
        ];

        for (const scenario of loadScenarios) {
            console.log(`\n  Testing ${scenario.name} (${scenario.users} users)...`);

            const result = await this.loadTestRunner.runLoadTest({
                concurrentUsers: scenario.users,
                messagesPerUser: scenario.messages,
                rampUpTimeMs: scenario.users * 200
            });

            console.log(`    Response time: ${result.averageResponseTime.toFixed(2)}ms`);
            console.log(`    Error rate: ${result.errorRate.toFixed(2)}%`);
            console.log(`    Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);

            // Validate results
            if (result.errorRate > 10) {
                throw new Error(`High error rate in ${scenario.name}: ${result.errorRate}%`);
            }

            if (result.averageResponseTime > 5000) {
                throw new Error(`High response time in ${scenario.name}: ${result.averageResponseTime}ms`);
            }
        }
    }

    /**
     * Run stress tests
     */
    private async runStressTests(): Promise<void> {
        console.log('Finding system limits and breaking points...');

        const stressResult = await this.stressTestRunner.runStressTest({
            startUsers: 10,
            maxUsers: 60,
            userIncrement: 10,
            messagesPerUser: 5,
            acceptableErrorRate: 10,
            acceptableResponseTime: 3000
        });

        console.log(`Maximum stable users: ${stressResult.maxStableUsers}`);
        console.log(`Breaking point: ${stressResult.breakingPoint} users`);

        if (stressResult.maxStableUsers < 20) {
            console.warn('⚠️  System can handle fewer than 20 concurrent users');
        }

        // Run burst test
        console.log('\nTesting burst traffic handling...');
        await this.stressTestRunner.runBurstStressTest();
    }

    /**
     * Run memory tests
     */
    private async runMemoryTests(): Promise<void> {
        console.log('Testing memory usage and leak detection...');

        const monitor = createPerformanceMonitor({
            sampleInterval: 1000,
            memoryThreshold: 300 * 1024 * 1024, // 300MB
            enableAlerts: true
        });

        monitor.start();

        // Test memory usage under load
        const memoryResult = await this.loadTestRunner.runLoadTest({
            concurrentUsers: 10,
            messagesPerUser: 15, // Build up conversation history
            messageInterval: 200
        });

        const metrics = monitor.stop();
        const summary = monitor.getCurrentSummary();

        console.log(`Peak memory usage: ${(summary.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Memory per user: ${(summary.peakMemoryUsage / 10 / 1024 / 1024).toFixed(2)}MB`);

        // Validate memory usage (Requirement 7.5)
        const memoryPerUser = summary.peakMemoryUsage / 10;
        const maxMemoryPerUser = 100 * 1024 * 1024; // 100MB

        if (memoryPerUser > maxMemoryPerUser) {
            throw new Error(`Memory usage per user too high: ${(memoryPerUser / 1024 / 1024).toFixed(2)}MB`);
        }

        // Test for memory leaks
        console.log('\nTesting for memory leaks...');
        await this.stressTestRunner.runMemoryStressTest();
    }

    /**
     * Run resilience tests
     */
    private async runResilienceTests(): Promise<void> {
        console.log('Testing error recovery and system stability...');

        // Test system stability under intermittent failures
        const resilenceResult = await this.loadTestRunner.runLoadTest({
            concurrentUsers: 15,
            messagesPerUser: 8,
            messageInterval: 500
        });

        console.log(`Resilience test error rate: ${resilenceResult.errorRate.toFixed(2)}%`);

        // System should maintain some level of functionality even with failures
        if (resilenceResult.successfulRequests === 0) {
            throw new Error('System completely failed under stress');
        }

        // Run endurance test
        console.log('\nRunning endurance test (3 minutes)...');
        await this.stressTestRunner.runEnduranceTest(3);
    }

    /**
     * Print final test results
     */
    private printFinalResults(results: { name: string; success: boolean; error?: string }[]): void {
        console.log('\n🏁 Performance Test Suite Results');
        console.log('='.repeat(60));

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        results.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.name}`);
            if (result.error) {
                console.log(`    Error: ${result.error}`);
            }
        });

        console.log('\n📊 Summary:');
        console.log(`  Total Test Suites: ${results.length}`);
        console.log(`  Successful: ${successful}`);
        console.log(`  Failed: ${failed}`);
        console.log(`  Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);

        if (failed === 0) {
            console.log('\n🎉 All performance tests passed!');
            console.log('✅ System meets all performance requirements (7.1, 7.2, 7.5)');
        } else {
            console.log(`\n⚠️  ${failed} test suite(s) failed`);
            console.log('❌ System may not meet all performance requirements');
        }

        console.log('\n💡 Performance Requirements Status:');
        console.log('  7.1 - Text response times ≤ 2 seconds');
        console.log('  7.2 - Voice processing ≤ 1 second');
        console.log('  7.5 - Memory usage ≤ 100MB per session');
        console.log('='.repeat(60));
    }

    /**
     * Run quick performance check
     */
    async runQuickCheck(): Promise<void> {
        console.log('🏃‍♂️ Running Quick Performance Check...\n');

        try {
            const result = await this.loadTestRunner.runLoadTest({
                concurrentUsers: 5,
                messagesPerUser: 3,
                messageInterval: 1000
            });

            console.log('📊 Quick Check Results:');
            console.log(`  Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
            console.log(`  Error Rate: ${result.errorRate.toFixed(2)}%`);
            console.log(`  Requests/Second: ${result.requestsPerSecond.toFixed(2)}`);

            const status = result.averageResponseTime < 2000 && result.errorRate < 5 ? '✅' : '❌';
            console.log(`\n${status} Quick performance check ${status === '✅' ? 'passed' : 'failed'}`);

        } catch (error) {
            console.error('❌ Quick performance check failed:', error);
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const testSuite = new PerformanceTestSuite();

    if (args.includes('--quick')) {
        await testSuite.runQuickCheck();
    } else if (args.includes('--help')) {
        console.log('Enhanced Artisan Buddy Performance Test Runner');
        console.log('\nUsage:');
        console.log('  npm run test:performance           # Run all performance tests');
        console.log('  npm run test:performance -- --quick # Run quick performance check');
        console.log('  npm run test:performance -- --help  # Show this help');
    } else {
        await testSuite.runAllTests();
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Performance test suite failed:', error);
        process.exit(1);
    });
}

export { PerformanceTestSuite };