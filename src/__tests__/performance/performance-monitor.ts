/**
 * Performance Monitor for Enhanced Artisan Buddy
 * 
 * Real-time monitoring of system performance during tests
 * Requirements: 7.1, 7.2, 7.5
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

export interface PerformanceMetrics {
    timestamp: number;
    responseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
    activeConnections: number;
    errorCount: number;
    requestCount: number;
}

export interface PerformanceAlert {
    type: 'memory' | 'response_time' | 'error_rate' | 'cpu';
    severity: 'warning' | 'critical';
    message: string;
    value: number;
    threshold: number;
    timestamp: number;
}

export interface MonitoringConfig {
    sampleInterval: number; // milliseconds
    memoryThreshold: number; // bytes
    responseTimeThreshold: number; // milliseconds
    errorRateThreshold: number; // percentage
    cpuThreshold: number; // percentage
    enableAlerts: boolean;
}

export class PerformanceMonitor extends EventEmitter {
    private config: MonitoringConfig;
    private isMonitoring = false;
    private metrics: PerformanceMetrics[] = [];
    private intervalId?: NodeJS.Timeout;
    private startTime: number = 0;
    private requestCount = 0;
    private errorCount = 0;
    private activeConnections = 0;
    private lastCpuUsage?: NodeJS.CpuUsage;

    constructor(config: Partial<MonitoringConfig> = {}) {
        super();

        this.config = {
            sampleInterval: 1000, // 1 second
            memoryThreshold: 500 * 1024 * 1024, // 500MB
            responseTimeThreshold: 2000, // 2 seconds
            errorRateThreshold: 5, // 5%
            cpuThreshold: 80, // 80%
            enableAlerts: true,
            ...config
        };
    }

    /**
     * Start monitoring performance
     */
    start(): void {
        if (this.isMonitoring) {
            console.warn('Performance monitor is already running');
            return;
        }

        console.log('📊 Starting performance monitoring...');
        this.isMonitoring = true;
        this.startTime = performance.now();
        this.metrics = [];
        this.requestCount = 0;
        this.errorCount = 0;
        this.lastCpuUsage = process.cpuUsage();

        this.intervalId = setInterval(() => {
            this.collectMetrics();
        }, this.config.sampleInterval);

        this.emit('started');
    }

    /**
     * Stop monitoring and return collected metrics
     */
    stop(): PerformanceMetrics[] {
        if (!this.isMonitoring) {
            console.warn('Performance monitor is not running');
            return this.metrics;
        }

        console.log('📊 Stopping performance monitoring...');
        this.isMonitoring = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }

        this.emit('stopped', this.metrics);
        return [...this.metrics];
    }

    /**
     * Record a request completion
     */
    recordRequest(responseTime: number, isError: boolean = false): void {
        this.requestCount++;
        if (isError) {
            this.errorCount++;
        }

        // Check for response time alerts
        if (this.config.enableAlerts && responseTime > this.config.responseTimeThreshold) {
            this.emitAlert({
                type: 'response_time',
                severity: responseTime > this.config.responseTimeThreshold * 2 ? 'critical' : 'warning',
                message: `High response time detected: ${responseTime.toFixed(2)}ms`,
                value: responseTime,
                threshold: this.config.responseTimeThreshold,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Record active connection change
     */
    recordConnection(delta: number): void {
        this.activeConnections = Math.max(0, this.activeConnections + delta);
    }

    /**
     * Get current performance summary
     */
    getCurrentSummary(): {
        uptime: number;
        totalRequests: number;
        errorRate: number;
        avgResponseTime: number;
        currentMemoryUsage: number;
        peakMemoryUsage: number;
        activeConnections: number;
    } {
        const uptime = performance.now() - this.startTime;
        const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

        const recentMetrics = this.metrics.slice(-10); // Last 10 samples
        const avgResponseTime = recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
            : 0;

        const currentMemory = process.memoryUsage().heapUsed;
        const peakMemory = Math.max(...this.metrics.map(m => m.memoryUsage.heapUsed), currentMemory);

        return {
            uptime,
            totalRequests: this.requestCount,
            errorRate,
            avgResponseTime,
            currentMemoryUsage: currentMemory,
            peakMemoryUsage: peakMemory,
            activeConnections: this.activeConnections
        };
    }

    /**
     * Export metrics to JSON
     */
    exportMetrics(): string {
        const summary = this.getCurrentSummary();

        return JSON.stringify({
            summary,
            config: this.config,
            metrics: this.metrics,
            collectedAt: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Generate performance report
     */
    generateReport(): string {
        const summary = this.getCurrentSummary();
        const duration = summary.uptime / 1000; // Convert to seconds

        let report = '\n📊 Performance Monitoring Report\n';
        report += '═'.repeat(50) + '\n';
        report += `Duration: ${duration.toFixed(2)} seconds\n`;
        report += `Total Requests: ${summary.totalRequests}\n`;
        report += `Error Rate: ${summary.errorRate.toFixed(2)}%\n`;
        report += `Average Response Time: ${summary.avgResponseTime.toFixed(2)}ms\n`;
        report += `Active Connections: ${summary.activeConnections}\n`;
        report += `Current Memory: ${(summary.currentMemoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
        report += `Peak Memory: ${(summary.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB\n`;

        if (this.metrics.length > 0) {
            const responseTimes = this.metrics.map(m => m.responseTime);
            const minResponseTime = Math.min(...responseTimes);
            const maxResponseTime = Math.max(...responseTimes);

            report += `\nResponse Time Statistics:\n`;
            report += `  Min: ${minResponseTime.toFixed(2)}ms\n`;
            report += `  Max: ${maxResponseTime.toFixed(2)}ms\n`;
            report += `  Avg: ${summary.avgResponseTime.toFixed(2)}ms\n`;

            // Memory statistics
            const memoryUsages = this.metrics.map(m => m.memoryUsage.heapUsed);
            const minMemory = Math.min(...memoryUsages);
            const maxMemory = Math.max(...memoryUsages);

            report += `\nMemory Usage Statistics:\n`;
            report += `  Min: ${(minMemory / 1024 / 1024).toFixed(2)}MB\n`;
            report += `  Max: ${(maxMemory / 1024 / 1024).toFixed(2)}MB\n`;
            report += `  Growth: ${((maxMemory - minMemory) / 1024 / 1024).toFixed(2)}MB\n`;
        }

        // Performance assessment
        report += '\n🎯 Performance Assessment:\n';

        if (summary.errorRate > this.config.errorRateThreshold) {
            report += `  ❌ High error rate (${summary.errorRate.toFixed(2)}%)\n`;
        } else {
            report += `  ✅ Error rate within acceptable limits\n`;
        }

        if (summary.avgResponseTime > this.config.responseTimeThreshold) {
            report += `  ❌ High average response time (${summary.avgResponseTime.toFixed(2)}ms)\n`;
        } else {
            report += `  ✅ Response time within acceptable limits\n`;
        }

        if (summary.peakMemoryUsage > this.config.memoryThreshold) {
            report += `  ❌ High memory usage (${(summary.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB)\n`;
        } else {
            report += `  ✅ Memory usage within acceptable limits\n`;
        }

        report += '═'.repeat(50) + '\n';

        return report;
    }

    /**
     * Collect current performance metrics
     */
    private collectMetrics(): void {
        const memoryUsage = process.memoryUsage();
        const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);

        // Calculate CPU percentage (approximate)
        const cpuPercent = this.lastCpuUsage
            ? ((currentCpuUsage.user + currentCpuUsage.system) / (this.config.sampleInterval * 1000)) * 100
            : 0;

        const metrics: PerformanceMetrics = {
            timestamp: Date.now(),
            responseTime: 0, // Will be updated by recordRequest calls
            memoryUsage,
            cpuUsage: currentCpuUsage,
            activeConnections: this.activeConnections,
            errorCount: this.errorCount,
            requestCount: this.requestCount
        };

        this.metrics.push(metrics);
        this.lastCpuUsage = process.cpuUsage();

        // Check for alerts
        if (this.config.enableAlerts) {
            this.checkAlerts(metrics, cpuPercent);
        }

        // Emit metrics for real-time monitoring
        this.emit('metrics', metrics);

        // Keep only last 1000 metrics to prevent memory issues
        if (this.metrics.length > 1000) {
            this.metrics = this.metrics.slice(-1000);
        }
    }

    /**
     * Check for performance alerts
     */
    private checkAlerts(metrics: PerformanceMetrics, cpuPercent: number): void {
        // Memory alert
        if (metrics.memoryUsage.heapUsed > this.config.memoryThreshold) {
            this.emitAlert({
                type: 'memory',
                severity: metrics.memoryUsage.heapUsed > this.config.memoryThreshold * 1.5 ? 'critical' : 'warning',
                message: `High memory usage: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                value: metrics.memoryUsage.heapUsed,
                threshold: this.config.memoryThreshold,
                timestamp: metrics.timestamp
            });
        }

        // Error rate alert
        const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
        if (errorRate > this.config.errorRateThreshold) {
            this.emitAlert({
                type: 'error_rate',
                severity: errorRate > this.config.errorRateThreshold * 2 ? 'critical' : 'warning',
                message: `High error rate: ${errorRate.toFixed(2)}%`,
                value: errorRate,
                threshold: this.config.errorRateThreshold,
                timestamp: metrics.timestamp
            });
        }

        // CPU alert
        if (cpuPercent > this.config.cpuThreshold) {
            this.emitAlert({
                type: 'cpu',
                severity: cpuPercent > this.config.cpuThreshold * 1.2 ? 'critical' : 'warning',
                message: `High CPU usage: ${cpuPercent.toFixed(2)}%`,
                value: cpuPercent,
                threshold: this.config.cpuThreshold,
                timestamp: metrics.timestamp
            });
        }
    }

    /**
     * Emit performance alert
     */
    private emitAlert(alert: PerformanceAlert): void {
        console.warn(`🚨 Performance Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
        this.emit('alert', alert);
    }
}

/**
 * Utility function to create a performance monitor with common settings
 */
export function createPerformanceMonitor(config?: Partial<MonitoringConfig>): PerformanceMonitor {
    return new PerformanceMonitor(config);
}

/**
 * Decorator to monitor function performance
 */
export function monitorPerformance(monitor: PerformanceMonitor) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const startTime = performance.now();
            let isError = false;

            try {
                monitor.recordConnection(1); // Connection started
                const result = await method.apply(this, args);
                return result;
            } catch (error) {
                isError = true;
                throw error;
            } finally {
                const endTime = performance.now();
                const responseTime = endTime - startTime;

                monitor.recordRequest(responseTime, isError);
                monitor.recordConnection(-1); // Connection ended
            }
        };

        return descriptor;
    };
}

export default PerformanceMonitor;