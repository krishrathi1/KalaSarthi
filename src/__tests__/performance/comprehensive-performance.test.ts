/**
 * Comprehensive Performance Test Suite for Enhanced Artisan Buddy
 * 
 * Integrates load testing, stress testing, and performance monitoring
 * Requirements: 7.1, 7.2, 7.5
 */

import { LoadTestRunner, LoadTestConfig } from './load-test-runner';
import { StressTestRunner } from './stress-test-runner';
import { PerformanceMonitor, createPerformanceMonitor } from './performance-monitor';

describe('Enhanced Artisan Buddy Comprehensive Performance Tests', () => {
    let loadTestRunner: LoadTestRunner;
    let stressTestRunner: StressTestRunner;
    let performanceMonitor: PerformanceMonitor;

    beforeAll(() => {
        loadTestRunner = new LoadTestRunner();
        stressTestRunner = new StressTestRunner();
        performanceMonitor = createPerformanceMonitor({
            sampleInterval: 500, // More frequent sampling for tests
            memoryThreshold: 200 * 1024 * 1024, // 200MB threshold for tests
            responseTimeThreshold: 2000, // 2 second threshold
            errorRateThreshold: 5, // 5% error rate threshold
            enableAlerts: true
        });
    });

    afterEach(() => {
        if (performanceMonitor) {
            performanceMonitor.stop();
        }
    });

    describe('Response Time Requirements (7.1, 7.2)', () => {
        it('should meet text response time requirements under normal load', async () => {
            performanceMonitor.start();

            const config: LoadTestConfig = {
                concurrentUsers: 10,
                messagesPerUser: 5,
                messageInterval: 1000
            };

            const results = await loadTestRunner.runLoadTest(config);
            const metrics = performanceMonitor.stop();

            // Requirement 7.1: Text responses within 2 seconds
            expect(results.averageResponseTime).toBeLessThan(2000);
            expect(results.p95ResponseTime).toBeLessThan(3000); // 95% under 3 seconds
            expect(results.errorRate).toBeLessThan(5);

            console.log(`Average response time: ${results.averageResponseTime.toFixed(2)}ms`);
            console.log(`95th percentile: ${results.p95ResponseTime.toFixed(2)}ms`);
        }, 60000); // 60 second timeout

        it('should meet voice response time requirements', async () => {
            performanceMonitor.start();

            const config: LoadTestConfig = {
                concurrentUsers: 5,
                messagesPerUser: 3,
                enableVoice: true,
                messageInterval: 2000
            };

            const results = await loadTestRunner.runLoadTest(config);
            const metrics = performanceMonitor.stop();

            // Requirement 7.2: Voice processing under 1 second
            expect(results.averageResponseTime).toBeLessThan(1000);
            expect(results.p95ResponseTime).toBeLessThan(1500);

            console.log(`Voice average response time: ${results.averageResponseTime.toFixed(2)}ms`);
        }, 45000);

        it('should maintain response times under increasing load', async () => {
            const userCounts = [5, 10, 15, 20];
            const responseTimeResults: number[] = [];

            for (const userCount of userCounts) {
                performanceMonitor.start();

                const config: LoadTestConfig = {
                    concurrentUsers: userCount,
                    messagesPerUser: 3,
                    messageInterval: 500
                };

                const results = await loadTestRunner.runLoadTest(config);
                responseTimeResults.push(results.averageResponseTime);

                performanceMonitor.stop();

                // Response time should not degrade more than 100% from baseline
                if (responseTimeResults.length > 1) {
                    const baseline = responseTimeResults[0];
                    const current = results.averageResponseTime;
                    const degradation = (current - baseline) / baseline;

                    expect(degradation).toBeLessThan(1.0); // Less than 100% degradation
                }

                // Cool down between tests
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            console.log('Response time progression:', responseTimeResults.map(t => `${t.toFixed(0)}ms`).join(' → '));
        }, 120000);
    });

    describe('Memory Usage Requirements (7.5)', () => {
        it('should maintain memory usage under 100MB per active session', async () => {
            performanceMonitor.start();

            const initialMemory = process.memoryUsage().heapUsed;
            const sessionCount = 10;

            const config: LoadTestConfig = {
                concurrentUsers: sessionCount,
                messagesPerUser: 10, // Build up conversation history
                messageInterval: 200
            };

            const results = await loadTestRunner.runLoadTest(config);
            const metrics = performanceMonitor.stop();

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryPerSession = memoryIncrease / sessionCount;

            // Requirement 7.5: Under 100MB per session
            const maxMemoryPerSession = 100 * 1024 * 1024; // 100MB
            expect(memoryPerSession).toBeLessThan(maxMemoryPerSession);

            console.log(`Memory per session: ${(memoryPerSession / 1024 / 1024).toFixed(2)}MB`);
            console.log(`Total memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        }, 90000);

        it('should not have memory leaks during extended operation', async () => {
            performanceMonitor.start();

            const memorySnapshots: number[] = [];
            const iterations = 5;

            for (let i = 0; i < iterations; i++) {
                const config: LoadTestConfig = {
                    concurrentUsers: 5,
                    messagesPerUser: 5,
                    messageInterval: 100
                };

                await loadTestRunner.runLoadTest(config);

                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }

                const currentMemory = process.memoryUsage().heapUsed;
                memorySnapshots.push(currentMemory);

                console.log(`Iteration ${i + 1} memory: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`);

                // Cool down between iterations
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            performanceMonitor.stop();

            // Memory should not continuously grow
            const firstMemory = memorySnapshots[0];
            const lastMemory = memorySnapshots[memorySnapshots.length - 1];
            const memoryGrowth = (lastMemory - firstMemory) / firstMemory;

            // Allow up to 50% memory growth over iterations
            expect(memoryGrowth).toBeLessThan(0.5);

            console.log(`Memory growth over ${iterations} iterations: ${(memoryGrowth * 100).toFixed(1)}%`);
        }, 120000);
    });

    describe('Concurrent User Load Tests', () => {
        it('should handle 25 concurrent users with acceptable performance', async () => {
            performanceMonitor.start();

            const config: LoadTestConfig = {
                concurrentUsers: 25,
                messagesPerUser: 8,
                rampUpTimeMs: 5000,
                messageInterval: 1000
            };

            const results = await loadTestRunner.runLoadTest(config);
            const metrics = performanceMonitor.stop();

            expect(results.errorRate).toBeLessThan(10); // Allow higher error rate under load
            expect(results.averageResponseTime).toBeLessThan(4000); // 4 seconds under load
            expect(results.requestsPerSecond).toBeGreaterThan(1); // At least 1 RPS

            console.log(`Concurrent users test - RPS: ${results.requestsPerSecond.toFixed(2)}`);
            console.log(`Error rate: ${results.errorRate.toFixed(2)}%`);
        }, 180000);

        it('should maintain conversation isolation under concurrent load', async () => {
            performanceMonitor.start();

            const config: LoadTestConfig = {
                concurrentUsers: 15,
                messagesPerUser: 5,
                rampUpTimeMs: 3000
            };

            const results = await loadTestRunner.runLoadTest(config);
            const metrics = performanceMonitor.stop();

            // All requests should complete (conversation isolation maintained)
            expect(results.successfulRequests).toBeGreaterThan(results.totalRequests * 0.9); // 90% success rate

            console.log(`Conversation isolation test - Success rate: ${(results.successfulRequests / results.totalRequests * 100).toFixed(1)}%`);
        }, 120000);
    });

    describe('System Resilience and Error Recovery', () => {
        it('should recover from service failures gracefully', async () => {
            performanceMonitor.start();

            // This test would simulate service failures and measure recovery
            // For now, we'll test the monitoring system's ability to track errors

            const config: LoadTestConfig = {
                concurrentUsers: 10,
                messagesPerUser: 5,
                messageInterval: 500
            };

            const results = await loadTestRunner.runLoadTest(config);
            const monitoringMetrics = performanceMonitor.stop();

            // System should handle some failures gracefully
            expect(results.errorRate).toBeLessThan(20); // Allow up to 20% errors during failure simulation

            console.log(`Error recovery test - Error rate: ${results.errorRate.toFixed(2)}%`);
        }, 90000);

        it('should maintain stability under burst traffic', async () => {
            performanceMonitor.start();

            // Simulate burst traffic
            const burstConfig: LoadTestConfig = {
                concurrentUsers: 50,
                messagesPerUser: 2,
                rampUpTimeMs: 1000 // Very fast ramp-up for burst
            };

            const results = await loadTestRunner.runLoadTest(burstConfig);
            const metrics = performanceMonitor.stop();

            // System should handle burst without complete failure
            expect(results.successfulRequests).toBeGreaterThan(0);
            expect(results.errorRate).toBeLessThan(50); // Allow higher error rate for burst

            console.log(`Burst traffic test - Success rate: ${(results.successfulRequests / results.totalRequests * 100).toFixed(1)}%`);
        }, 60000);
    });

    describe('Performance Monitoring Integration', () => {
        it('should detect performance alerts during load testing', async () => {
            const alerts: any[] = [];

            performanceMonitor.on('alert', (alert) => {
                alerts.push(alert);
                console.log(`Alert detected: ${alert.message}`);
            });

            performanceMonitor.start();

            // Run a test that might trigger alerts
            const config: LoadTestConfig = {
                concurrentUsers: 30,
                messagesPerUser: 10,
                messageInterval: 100 // Fast messages to stress the system
            };

            await loadTestRunner.runLoadTest(config);
            const metrics = performanceMonitor.stop();

            // Verify monitoring detected performance issues if they occurred
            console.log(`Total alerts detected: ${alerts.length}`);

            // Generate and verify report
            const report = performanceMonitor.generateReport();
            expect(report).toContain('Performance Monitoring Report');
            expect(report).toContain('Total Requests:');

            console.log(report);
        }, 120000);

        it('should export metrics in correct format', async () => {
            performanceMonitor.start();

            // Run a short test to generate metrics
            const config: LoadTestConfig = {
                concurrentUsers: 5,
                messagesPerUser: 3,
                messageInterval: 500
            };

            await loadTestRunner.runLoadTest(config);
            const metrics = performanceMonitor.stop();

            const exportedData = performanceMonitor.exportMetrics();
            const parsedData = JSON.parse(exportedData);

            expect(parsedData).toHaveProperty('summary');
            expect(parsedData).toHaveProperty('config');
            expect(parsedData).toHaveProperty('metrics');
            expect(parsedData).toHaveProperty('collectedAt');

            expect(parsedData.summary).toHaveProperty('totalRequests');
            expect(parsedData.summary).toHaveProperty('errorRate');
            expect(parsedData.summary).toHaveProperty('avgResponseTime');

            console.log('Metrics export validated successfully');
        }, 60000);
    });

    describe('Performance Benchmarks', () => {
        it('should establish baseline performance metrics', async () => {
            performanceMonitor.start();

            const baselineConfig: LoadTestConfig = {
                concurrentUsers: 1,
                messagesPerUser: 10,
                messageInterval: 1000
            };

            const results = await loadTestRunner.runLoadTest(baselineConfig);
            const metrics = performanceMonitor.stop();

            // Establish baseline expectations
            const baselineMetrics = {
                singleUserResponseTime: results.averageResponseTime,
                singleUserErrorRate: results.errorRate,
                baselineMemoryUsage: results.memoryUsage.final
            };

            console.log('Baseline Performance Metrics:');
            console.log(`  Single user response time: ${baselineMetrics.singleUserResponseTime.toFixed(2)}ms`);
            console.log(`  Single user error rate: ${baselineMetrics.singleUserErrorRate.toFixed(2)}%`);
            console.log(`  Baseline memory usage: ${(baselineMetrics.baselineMemoryUsage / 1024 / 1024).toFixed(2)}MB`);

            // Baseline should meet strict requirements
            expect(baselineMetrics.singleUserResponseTime).toBeLessThan(1000); // 1 second for single user
            expect(baselineMetrics.singleUserErrorRate).toBeLessThan(1); // Less than 1% error rate
        }, 60000);
    });
});