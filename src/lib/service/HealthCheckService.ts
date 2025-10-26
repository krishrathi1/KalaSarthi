import { monitoringService } from '@/lib/monitoring';
import { CacheService } from './CacheService';
import { connectionPool } from './ConnectionPoolService';
import { performanceMonitor } from './PerformanceMonitoringService';

export interface HealthCheckResult {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
    details?: Record<string, any>;
    error?: string;
    lastChecked: Date;
}

export interface SystemHealthStatus {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheckResult[];
    summary: {
        healthy: number;
        degraded: number;
        unhealthy: number;
        total: number;
    };
    uptime: number;
    version: string;
    environment: string;
}

export interface HealthCheckConfig {
    timeout: number; // milliseconds
    retries: number;
    interval: number; // milliseconds for periodic checks
    enablePeriodicChecks: boolean;
}

export class HealthCheckService {
    private static instance: HealthCheckService;
    private config: HealthCheckConfig;
    private lastResults: Map<string, HealthCheckResult> = new Map();
    private startTime = Date.now();
    private periodicCheckInterval?: NodeJS.Timeout;
    private listeners: ((status: SystemHealthStatus) => void)[] = [];

    private constructor() {
        this.config = {
            timeout: 5000, // 5 seconds
            retries: 2,
            interval: 60000, // 1 minute
            enablePeriodicChecks: true
        };

        if (this.config.enablePeriodicChecks) {
            this.startPeriodicChecks();
        }
    }

    static getInstance(): HealthCheckService {
        if (!HealthCheckService.instance) {
            HealthCheckService.instance = new HealthCheckService();
        }
        return HealthCheckService.instance;
    }

    /**
     * Perform comprehensive health check
     */
    async checkHealth(): Promise<SystemHealthStatus> {
        const checks = [
            this.checkDatabase(),
            this.checkCache(),
            this.checkMonitoring(),
            this.checkPerformance(),
            this.checkMemory(),
            this.checkDisk(),
            this.checkExternalServices()
        ];

        const results = await Promise.allSettled(checks);
        const services: HealthCheckResult[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                services.push(result.value);
                this.lastResults.set(result.value.service, result.value);
            } else {
                const errorResult: HealthCheckResult = {
                    service: `check-${index}`,
                    status: 'unhealthy',
                    error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
                    lastChecked: new Date()
                };
                services.push(errorResult);
            }
        });

        const summary = this.calculateSummary(services);
        const overall = this.determineOverallStatus(summary);

        const status: SystemHealthStatus = {
            overall,
            services,
            summary,
            uptime: Date.now() - this.startTime,
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        };

        // Notify listeners
        this.notifyListeners(status);

        return status;
    }

    /**
     * Check database health
     */
    private async checkDatabase(): Promise<HealthCheckResult> {
        const startTime = Date.now();

        try {
            const health = await connectionPool.healthCheck();
            const latency = Date.now() - startTime;

            let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
            if (health.overall === 'unhealthy') {
                status = 'unhealthy';
            } else if (health.overall === 'degraded') {
                status = 'degraded';
            }

            return {
                service: 'database',
                status,
                latency,
                details: {
                    mongodb: health.mongodb,
                    redis: health.redis
                },
                lastChecked: new Date()
            };
        } catch (error) {
            return {
                service: 'database',
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Database check failed',
                lastChecked: new Date()
            };
        }
    }

    /**
     * Check cache health
     */
    private async checkCache(): Promise<HealthCheckResult> {
        const startTime = Date.now();

        try {
            const health = await CacheService.healthCheck();
            const latency = Date.now() - startTime;

            return {
                service: 'cache',
                status: health.status,
                latency,
                details: health.details,
                lastChecked: new Date()
            };
        } catch (error) {
            return {
                service: 'cache',
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Cache check failed',
                lastChecked: new Date()
            };
        }
    }

    /**
     * Check monitoring service health
     */
    private async checkMonitoring(): Promise<HealthCheckResult> {
        const startTime = Date.now();

        try {
            // Test monitoring service by getting recent stats
            const stats = await monitoringService.getPerformanceStats(1);
            const latency = Date.now() - startTime;

            const status = latency < 2000 ? 'healthy' : 'degraded';

            return {
                service: 'monitoring',
                status,
                latency,
                details: {
                    totalRequests: stats.totalRequests,
                    successRate: stats.successRate,
                    errorRate: stats.errorRate
                },
                lastChecked: new Date()
            };
        } catch (error) {
            return {
                service: 'monitoring',
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Monitoring check failed',
                lastChecked: new Date()
            };
        }
    }

    /**
     * Check performance monitoring health
     */
    private async checkPerformance(): Promise<HealthCheckResult> {
        try {
            const overview = performanceMonitor.getOverview(300000); // Last 5 minutes

            let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
            if (overview.errorRate > 0.1) { // 10% error rate
                status = 'unhealthy';
            } else if (overview.errorRate > 0.05 || overview.slowRequestRate > 0.2) {
                status = 'degraded';
            }

            return {
                service: 'performance',
                status,
                details: {
                    totalRequests: overview.totalRequests,
                    averageResponseTime: overview.averageResponseTime,
                    errorRate: overview.errorRate,
                    slowRequestRate: overview.slowRequestRate
                },
                lastChecked: new Date()
            };
        } catch (error) {
            return {
                service: 'performance',
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Performance check failed',
                lastChecked: new Date()
            };
        }
    }

    /**
     * Check memory usage
     */
    private async checkMemory(): Promise<HealthCheckResult> {
        try {
            const memoryUsage = process.memoryUsage();
            const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
            const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
            const usagePercentage = heapUsedMB / heapTotalMB;

            let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
            if (usagePercentage > 0.9) {
                status = 'unhealthy';
            } else if (usagePercentage > 0.8) {
                status = 'degraded';
            }

            return {
                service: 'memory',
                status,
                details: {
                    heapUsedMB: Math.round(heapUsedMB),
                    heapTotalMB: Math.round(heapTotalMB),
                    usagePercentage: Math.round(usagePercentage * 100),
                    rss: Math.round(memoryUsage.rss / 1024 / 1024),
                    external: Math.round(memoryUsage.external / 1024 / 1024)
                },
                lastChecked: new Date()
            };
        } catch (error) {
            return {
                service: 'memory',
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Memory check failed',
                lastChecked: new Date()
            };
        }
    }

    /**
     * Check disk usage (simplified)
     */
    private async checkDisk(): Promise<HealthCheckResult> {
        try {
            // In a real implementation, you would check actual disk usage
            // For now, we'll simulate based on available information

            return {
                service: 'disk',
                status: 'healthy',
                details: {
                    usage: 'Not implemented - would require fs stats',
                    note: 'Disk monitoring requires additional system integration'
                },
                lastChecked: new Date()
            };
        } catch (error) {
            return {
                service: 'disk',
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Disk check failed',
                lastChecked: new Date()
            };
        }
    }

    /**
     * Check external services
     */
    private async checkExternalServices(): Promise<HealthCheckResult> {
        const startTime = Date.now();

        try {
            // Test external service connectivity
            const checks = await Promise.allSettled([
                this.pingService('Google AI', 'https://generativelanguage.googleapis.com'),
                this.pingService('Google Cloud', 'https://cloud.google.com')
            ]);

            const latency = Date.now() - startTime;
            const successfulChecks = checks.filter(c => c.status === 'fulfilled').length;
            const totalChecks = checks.length;

            let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
            if (successfulChecks === 0) {
                status = 'unhealthy';
            } else if (successfulChecks < totalChecks) {
                status = 'degraded';
            }

            return {
                service: 'external-services',
                status,
                latency,
                details: {
                    successfulChecks,
                    totalChecks,
                    checks: checks.map((check, index) => ({
                        service: index === 0 ? 'Google AI' : 'Google Cloud',
                        status: check.status,
                        error: check.status === 'rejected' ? check.reason?.message : undefined
                    }))
                },
                lastChecked: new Date()
            };
        } catch (error) {
            return {
                service: 'external-services',
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'External services check failed',
                lastChecked: new Date()
            };
        }
    }

    /**
     * Ping external service
     */
    private async pingService(name: string, url: string): Promise<void> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Calculate summary statistics
     */
    private calculateSummary(services: HealthCheckResult[]): {
        healthy: number;
        degraded: number;
        unhealthy: number;
        total: number;
    } {
        const summary = {
            healthy: 0,
            degraded: 0,
            unhealthy: 0,
            total: services.length
        };

        services.forEach(service => {
            summary[service.status]++;
        });

        return summary;
    }

    /**
     * Determine overall system status
     */
    private determineOverallStatus(summary: {
        healthy: number;
        degraded: number;
        unhealthy: number;
        total: number;
    }): 'healthy' | 'degraded' | 'unhealthy' {
        if (summary.unhealthy > 0) {
            return 'unhealthy';
        } else if (summary.degraded > 0) {
            return 'degraded';
        } else {
            return 'healthy';
        }
    }

    /**
     * Start periodic health checks
     */
    private startPeriodicChecks(): void {
        this.periodicCheckInterval = setInterval(async () => {
            try {
                await this.checkHealth();
            } catch (error) {
                console.error('Periodic health check failed:', error);
            }
        }, this.config.interval);
    }

    /**
     * Stop periodic health checks
     */
    stopPeriodicChecks(): void {
        if (this.periodicCheckInterval) {
            clearInterval(this.periodicCheckInterval);
            this.periodicCheckInterval = undefined;
        }
    }

    /**
     * Subscribe to health status changes
     */
    onHealthChange(listener: (status: SystemHealthStatus) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify listeners of health changes
     */
    private notifyListeners(status: SystemHealthStatus): void {
        this.listeners.forEach(listener => {
            try {
                listener(status);
            } catch (error) {
                console.error('Health check listener error:', error);
            }
        });
    }

    /**
     * Get last health check results
     */
    getLastResults(): Map<string, HealthCheckResult> {
        return new Map(this.lastResults);
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<HealthCheckConfig>): void {
        this.config = { ...this.config, ...config };

        // Restart periodic checks if interval changed
        if (config.interval && this.periodicCheckInterval) {
            this.stopPeriodicChecks();
            this.startPeriodicChecks();
        }
    }

    /**
     * Get configuration
     */
    getConfig(): HealthCheckConfig {
        return { ...this.config };
    }

    /**
     * Manual health check for specific service
     */
    async checkService(serviceName: string): Promise<HealthCheckResult> {
        switch (serviceName) {
            case 'database':
                return this.checkDatabase();
            case 'cache':
                return this.checkCache();
            case 'monitoring':
                return this.checkMonitoring();
            case 'performance':
                return this.checkPerformance();
            case 'memory':
                return this.checkMemory();
            case 'disk':
                return this.checkDisk();
            case 'external-services':
                return this.checkExternalServices();
            default:
                throw new Error(`Unknown service: ${serviceName}`);
        }
    }

    /**
     * Get system uptime
     */
    getUptime(): number {
        return Date.now() - this.startTime;
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.stopPeriodicChecks();
        this.listeners = [];
        this.lastResults.clear();
    }
}

export const healthCheckService = HealthCheckService.getInstance();