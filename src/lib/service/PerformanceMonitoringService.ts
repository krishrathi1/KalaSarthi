import { monitoringService } from '@/lib/monitoring';

export interface PerformanceMetric {
    operation: string;
    duration: number;
    timestamp: number;
    success: boolean;
    context?: string;
    userId?: string;
    metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
    warning: number; // milliseconds
    critical: number; // milliseconds
}

export interface PerformanceStats {
    averageDuration: number;
    p50: number;
    p95: number;
    p99: number;
    totalOperations: number;
    slowOperations: number;
    errorRate: number;
}

export class PerformanceMonitoringService {
    private static instance: PerformanceMonitoringService;
    private metrics: PerformanceMetric[] = [];
    private thresholds: Map<string, PerformanceThresholds> = new Map();
    private maxMetrics = 10000; // Keep last 10k metrics in memory
    private listeners: ((metric: PerformanceMetric) => void)[] = [];

    private constructor() {
        // Set default thresholds
        this.setThresholds('api-request', { warning: 1000, critical: 3000 });
        this.setThresholds('database-query', { warning: 500, critical: 2000 });
        this.setThresholds('ai-generation', { warning: 5000, critical: 15000 });
        this.setThresholds('voice-processing', { warning: 2000, critical: 5000 });
        this.setThresholds('vector-search', { warning: 1000, critical: 3000 });

        // Cleanup old metrics periodically
        setInterval(() => this.cleanup(), 300000); // Every 5 minutes
    }

    static getInstance(): PerformanceMonitoringService {
        if (!PerformanceMonitoringService.instance) {
            PerformanceMonitoringService.instance = new PerformanceMonitoringService();
        }
        return PerformanceMonitoringService.instance;
    }

    /**
     * Record a performance metric
     */
    recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
        const fullMetric: PerformanceMetric = {
            ...metric,
            timestamp: Date.now()
        };

        this.metrics.push(fullMetric);

        // Keep only recent metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }

        // Check thresholds and alert if necessary
        this.checkThresholds(fullMetric);

        // Notify listeners
        this.listeners.forEach(listener => {
            try {
                listener(fullMetric);
            } catch (error) {
                console.error('Performance listener error:', error);
            }
        });

        // Send to monitoring service for slow operations
        if (this.isSlowOperation(fullMetric)) {
            this.sendToMonitoring(fullMetric);
        }
    }

    /**
     * Start timing an operation
     */
    startTiming(operation: string, context?: string, userId?: string): () => void {
        const startTime = Date.now();

        return (success: boolean = true, metadata?: Record<string, any>) => {
            const duration = Date.now() - startTime;
            this.recordMetric({
                operation,
                duration,
                success,
                context,
                userId,
                metadata
            });
        };
    }

    /**
     * Measure async operation
     */
    async measureAsync<T>(
        operation: string,
        fn: () => Promise<T>,
        context?: string,
        userId?: string
    ): Promise<T> {
        const endTiming = this.startTiming(operation, context, userId);

        try {
            const result = await fn();
            endTiming(true);
            return result;
        } catch (error) {
            endTiming(false, { error: error instanceof Error ? error.message : 'Unknown error' });
            throw error;
        }
    }

    /**
     * Measure sync operation
     */
    measureSync<T>(
        operation: string,
        fn: () => T,
        context?: string,
        userId?: string
    ): T {
        const endTiming = this.startTiming(operation, context, userId);

        try {
            const result = fn();
            endTiming(true);
            return result;
        } catch (error) {
            endTiming(false, { error: error instanceof Error ? error.message : 'Unknown error' });
            throw error;
        }
    }

    /**
     * Set performance thresholds for an operation
     */
    setThresholds(operation: string, thresholds: PerformanceThresholds): void {
        this.thresholds.set(operation, thresholds);
    }

    /**
     * Get performance statistics for an operation
     */
    getStats(operation: string, timeWindow?: number): PerformanceStats {
        const now = Date.now();
        const windowStart = timeWindow ? now - timeWindow : 0;

        const operationMetrics = this.metrics.filter(m =>
            m.operation === operation && m.timestamp >= windowStart
        );

        if (operationMetrics.length === 0) {
            return {
                averageDuration: 0,
                p50: 0,
                p95: 0,
                p99: 0,
                totalOperations: 0,
                slowOperations: 0,
                errorRate: 0
            };
        }

        const durations = operationMetrics.map(m => m.duration).sort((a, b) => a - b);
        const successfulOps = operationMetrics.filter(m => m.success);
        const thresholds = this.thresholds.get(operation);
        const slowOps = thresholds ?
            operationMetrics.filter(m => m.duration > thresholds.warning) : [];

        return {
            averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
            p50: this.percentile(durations, 50),
            p95: this.percentile(durations, 95),
            p99: this.percentile(durations, 99),
            totalOperations: operationMetrics.length,
            slowOperations: slowOps.length,
            errorRate: (operationMetrics.length - successfulOps.length) / operationMetrics.length
        };
    }

    /**
     * Get all operation names
     */
    getOperations(): string[] {
        const operations = new Set(this.metrics.map(m => m.operation));
        return Array.from(operations);
    }

    /**
     * Get recent slow operations
     */
    getSlowOperations(limit: number = 10, timeWindow?: number): PerformanceMetric[] {
        const now = Date.now();
        const windowStart = timeWindow ? now - timeWindow : 0;

        return this.metrics
            .filter(m => m.timestamp >= windowStart && this.isSlowOperation(m))
            .sort((a, b) => b.duration - a.duration)
            .slice(0, limit);
    }

    /**
     * Get recent failed operations
     */
    getFailedOperations(limit: number = 10, timeWindow?: number): PerformanceMetric[] {
        const now = Date.now();
        const windowStart = timeWindow ? now - timeWindow : 0;

        return this.metrics
            .filter(m => m.timestamp >= windowStart && !m.success)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Subscribe to performance events
     */
    onMetric(listener: (metric: PerformanceMetric) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Get system performance overview
     */
    getOverview(timeWindow: number = 3600000): { // Default 1 hour
        operations: Record<string, PerformanceStats>;
        totalRequests: number;
        averageResponseTime: number;
        errorRate: number;
        slowRequestRate: number;
    } {
        const operations = this.getOperations();
        const operationStats: Record<string, PerformanceStats> = {};

        for (const operation of operations) {
            operationStats[operation] = this.getStats(operation, timeWindow);
        }

        const now = Date.now();
        const windowStart = now - timeWindow;
        const recentMetrics = this.metrics.filter(m => m.timestamp >= windowStart);

        const totalRequests = recentMetrics.length;
        const averageResponseTime = totalRequests > 0 ?
            recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests : 0;

        const failedRequests = recentMetrics.filter(m => !m.success).length;
        const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

        const slowRequests = recentMetrics.filter(m => this.isSlowOperation(m)).length;
        const slowRequestRate = totalRequests > 0 ? slowRequests / totalRequests : 0;

        return {
            operations: operationStats,
            totalRequests,
            averageResponseTime: Math.round(averageResponseTime),
            errorRate: Math.round(errorRate * 100) / 100,
            slowRequestRate: Math.round(slowRequestRate * 100) / 100
        };
    }

    /**
     * Check if operation exceeds thresholds
     */
    private isSlowOperation(metric: PerformanceMetric): boolean {
        const thresholds = this.thresholds.get(metric.operation);
        return thresholds ? metric.duration > thresholds.warning : metric.duration > 1000;
    }

    /**
     * Check thresholds and log warnings
     */
    private checkThresholds(metric: PerformanceMetric): void {
        const thresholds = this.thresholds.get(metric.operation);
        if (!thresholds) return;

        if (metric.duration > thresholds.critical) {
            console.error(`🚨 CRITICAL: ${metric.operation} took ${metric.duration}ms (threshold: ${thresholds.critical}ms)`);
        } else if (metric.duration > thresholds.warning) {
            console.warn(`⚠️ SLOW: ${metric.operation} took ${metric.duration}ms (threshold: ${thresholds.warning}ms)`);
        }
    }

    /**
     * Send slow operations to monitoring service
     */
    private async sendToMonitoring(metric: PerformanceMetric): Promise<void> {
        try {
            await monitoringService.log({
                level: 'WARN',
                service: 'performance-monitoring',
                operation: metric.operation,
                userId: metric.userId,
                duration: metric.duration,
                metadata: {
                    context: metric.context,
                    success: metric.success,
                    ...metric.metadata
                }
            });
        } catch (error) {
            console.error('Failed to send performance metric to monitoring:', error);
        }
    }

    /**
     * Calculate percentile
     */
    private percentile(sortedArray: number[], p: number): number {
        if (sortedArray.length === 0) return 0;

        const index = (p / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);

        if (lower === upper) {
            return sortedArray[lower];
        }

        const weight = index - lower;
        return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
    }

    /**
     * Cleanup old metrics
     */
    private cleanup(): void {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // Keep 24 hours
        const initialLength = this.metrics.length;

        this.metrics = this.metrics.filter(m => m.timestamp > cutoff);

        const removed = initialLength - this.metrics.length;
        if (removed > 0) {
            console.log(`🧹 Performance metrics cleanup: Removed ${removed} old metrics`);
        }
    }

    /**
     * Export metrics for analysis
     */
    exportMetrics(timeWindow?: number): PerformanceMetric[] {
        if (!timeWindow) return [...this.metrics];

        const cutoff = Date.now() - timeWindow;
        return this.metrics.filter(m => m.timestamp > cutoff);
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics = [];
    }
}

// Performance monitoring decorator
export function Monitor(operation?: string, context?: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;
        const operationName = operation || `${target.constructor.name}.${propertyName}`;

        descriptor.value = async function (...args: any[]) {
            const monitor = PerformanceMonitoringService.getInstance();
            return await monitor.measureAsync(
                operationName,
                () => method.apply(this, args),
                context
            );
        };

        return descriptor;
    };
}

export const performanceMonitor = PerformanceMonitoringService.getInstance();