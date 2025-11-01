/**
 * ResourceMonitor Tests
 * 
 * Tests for the Gemma 2B ResourceMonitor component functionality
 */

import { ResourceMonitor, createResourceMonitor, getResourceMonitor } from '../../lib/services/gemma-2b-offline/ResourceMonitor';
import { IResourceMonitor, SystemCheck, MemoryStats, OptimizationSettings, PerformanceMetrics } from '../../lib/types/gemma-2b-offline';

describe('ResourceMonitor', () => {
    let resourceMonitor: IResourceMonitor;

    beforeEach(() => {
        resourceMonitor = new ResourceMonitor();
    });

    afterEach(() => {
        resourceMonitor.dispose();
    });

    describe('System Requirements Checking', () => {
        test('should check system requirements', () => {
            const systemCheck: SystemCheck = resourceMonitor.checkSystemRequirements();

            expect(systemCheck).toBeDefined();
            expect(typeof systemCheck.isSupported).toBe('boolean');
            expect(typeof systemCheck.hasWebGL).toBe('boolean');
            expect(typeof systemCheck.hasWebAssembly).toBe('boolean');
            expect(typeof systemCheck.availableMemory).toBe('number');
            expect(typeof systemCheck.browserSupported).toBe('boolean');
            expect(Array.isArray(systemCheck.warnings)).toBe(true);
            expect(Array.isArray(systemCheck.recommendations)).toBe(true);
        });

        test('should detect WebAssembly support', () => {
            const systemCheck = resourceMonitor.checkSystemRequirements();
            // WebAssembly should be supported in modern test environments
            expect(systemCheck.hasWebAssembly).toBe(true);
        });
    });

    describe('Memory Monitoring', () => {
        test('should monitor memory usage', () => {
            const memoryStats: MemoryStats = resourceMonitor.monitorMemoryUsage();

            expect(memoryStats).toBeDefined();
            expect(typeof memoryStats.used).toBe('number');
            expect(typeof memoryStats.total).toBe('number');
            expect(typeof memoryStats.available).toBe('number');
            expect(typeof memoryStats.percentage).toBe('number');
            expect(memoryStats.used).toBeGreaterThanOrEqual(0);
            expect(memoryStats.total).toBeGreaterThan(0);
            expect(memoryStats.available).toBeGreaterThanOrEqual(0);
            expect(memoryStats.percentage).toBeGreaterThanOrEqual(0);
            expect(memoryStats.percentage).toBeLessThanOrEqual(100);
        });

        test('should return consistent memory stats on repeated calls', () => {
            const stats1 = resourceMonitor.monitorMemoryUsage();
            const stats2 = resourceMonitor.monitorMemoryUsage();

            // Should be the same due to throttling
            expect(stats1.used).toBe(stats2.used);
            expect(stats1.total).toBe(stats2.total);
        });
    });

    describe('Device Optimization', () => {
        test('should provide optimization settings', () => {
            const settings: OptimizationSettings = resourceMonitor.optimizeForDevice();

            expect(settings).toBeDefined();
            expect(typeof settings.maxConcurrentRequests).toBe('number');
            expect(typeof settings.contextWindowSize).toBe('number');
            expect(typeof settings.memoryThreshold).toBe('number');
            expect(typeof settings.cpuThrottleThreshold).toBe('number');
            expect(typeof settings.batteryOptimization).toBe('boolean');
            expect(settings.maxConcurrentRequests).toBeGreaterThan(0);
            expect(settings.contextWindowSize).toBeGreaterThan(0);
            expect(settings.memoryThreshold).toBeGreaterThan(0);
            expect(settings.memoryThreshold).toBeLessThanOrEqual(1);
        });
    });

    describe('Performance Metrics', () => {
        test('should track performance metrics', () => {
            const metrics: PerformanceMetrics = resourceMonitor.getPerformanceMetrics();

            expect(metrics).toBeDefined();
            expect(typeof metrics.modelLoadTime).toBe('number');
            expect(typeof metrics.averageInferenceTime).toBe('number');
            expect(typeof metrics.tokensPerSecond).toBe('number');
            expect(typeof metrics.memoryUsage).toBe('number');
            expect(typeof metrics.errorRate).toBe('number');
            expect(typeof metrics.fallbackRate).toBe('number');
            expect(typeof metrics.totalRequests).toBe('number');
        });

        test('should update performance metrics', () => {
            const initialMetrics = resourceMonitor.getPerformanceMetrics();
            expect(initialMetrics.totalRequests).toBe(0);

            resourceMonitor.recordInferenceTime(1000, 50);

            const updatedMetrics = resourceMonitor.getPerformanceMetrics();
            expect(updatedMetrics.totalRequests).toBe(1);
            expect(updatedMetrics.averageInferenceTime).toBe(1000);
            expect(updatedMetrics.tokensPerSecond).toBe(50);
        });

        test('should record model load time', () => {
            resourceMonitor.recordModelLoadTime(5000);

            const metrics = resourceMonitor.getPerformanceMetrics();
            expect(metrics.modelLoadTime).toBe(5000);
        });

        test('should track error rates', () => {
            // Record some requests and errors
            resourceMonitor.recordInferenceTime(1000);
            resourceMonitor.recordError();

            const metrics = resourceMonitor.getPerformanceMetrics();
            expect(metrics.errorRate).toBeGreaterThan(0);
        });
    });

    describe('Resource Constraints', () => {
        test('should determine if inference should be paused', () => {
            const shouldPause = resourceMonitor.shouldPauseInference();
            expect(typeof shouldPause).toBe('boolean');
        });
    });

    describe('Factory Functions', () => {
        test('should create ResourceMonitor instance', () => {
            const monitor = createResourceMonitor();
            expect(monitor).toBeInstanceOf(ResourceMonitor);
            monitor.dispose();
        });

        test('should return singleton instance', () => {
            const monitor1 = getResourceMonitor();
            const monitor2 = getResourceMonitor();
            expect(monitor1).toBe(monitor2);
        });
    });

    describe('Cleanup', () => {
        test('should dispose resources properly', () => {
            expect(() => {
                resourceMonitor.dispose();
            }).not.toThrow();
        });
    });
});