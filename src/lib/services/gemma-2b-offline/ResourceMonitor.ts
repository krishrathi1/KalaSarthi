/**
 * ResourceMonitor - System Resource Monitoring for Gemma 2B Offline Service
 * 
 * This component monitors system resources, checks device capabilities,
 * and provides performance metrics for optimal AI model operation.
 * 
 * Features:
 * - System requirements validation
 * - Memory usage monitoring
 * - WebGL and WebAssembly capability detection
 * - Performance metrics collection
 * - Resource optimization recommendations
 */

import {
    IResourceMonitor,
    SystemCheck,
    MemoryStats,
    OptimizationSettings,
    PerformanceMetrics,
    Gemma2BError,
    Gemma2BErrorType,
    ErrorSeverity
} from '../../types/gemma-2b-offline';

import {
    SYSTEM_REQUIREMENTS,
    BROWSER_SUPPORT,
    DEFAULT_OPTIMIZATION_SETTINGS,
    PERFORMANCE_LIMITS,
    DEBUG_CONFIG
} from './constants';

import { Gemma2BBaseError, ResourceError } from './errors';

/**
 * ResourceMonitor implementation for system resource management
 */
export class ResourceMonitor implements IResourceMonitor {
    private performanceMetrics: PerformanceMetrics;
    private memoryObserver: PerformanceObserver | null = null;
    private isMonitoring: boolean = false;
    private lastMemoryCheck: number = 0;
    private memoryCheckInterval: number = 5000; // 5 seconds

    constructor() {
        this.performanceMetrics = {
            modelLoadTime: 0,
            averageInferenceTime: 0,
            tokensPerSecond: 0,
            memoryUsage: 0,
            errorRate: 0,
            fallbackRate: 0,
            totalRequests: 0
        };

        this.initializeMonitoring();
    }

    /**
     * Check if the system meets minimum requirements for Gemma 2B
     */
    public checkSystemRequirements(): SystemCheck {
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // Check WebGL support
        const hasWebGL = this.checkWebGLSupport();
        if (!hasWebGL) {
            warnings.push('WebGL not supported - AI performance will be limited');
            recommendations.push('Enable hardware acceleration in browser settings');
        }

        // Check WebAssembly support
        const hasWebAssembly = this.checkWebAssemblySupport();
        if (!hasWebAssembly) {
            warnings.push('WebAssembly not supported - AI features unavailable');
            recommendations.push('Update to a modern browser version');
        }

        // Check available memory
        const memoryStats = this.monitorMemoryUsage();
        const availableMemory = memoryStats.available;

        if (availableMemory < SYSTEM_REQUIREMENTS.minMemoryMB) {
            warnings.push(`Insufficient memory: ${availableMemory}MB available, ${SYSTEM_REQUIREMENTS.minMemoryMB}MB required`);
            recommendations.push('Close other applications to free up memory');
        } else if (availableMemory < SYSTEM_REQUIREMENTS.recommendedMemoryMB) {
            warnings.push(`Low memory: ${availableMemory}MB available, ${SYSTEM_REQUIREMENTS.recommendedMemoryMB}MB recommended`);
            recommendations.push('Consider closing unnecessary browser tabs');
        }

        // Check browser compatibility
        const browserSupported = this.checkBrowserSupport();
        if (!browserSupported) {
            warnings.push('Browser version may not be fully supported');
            recommendations.push('Update to the latest browser version for best performance');
        }

        const isSupported = hasWebGL && hasWebAssembly &&
            availableMemory >= SYSTEM_REQUIREMENTS.minMemoryMB &&
            browserSupported;

        return {
            isSupported,
            hasWebGL,
            hasWebAssembly,
            availableMemory,
            browserSupported,
            warnings,
            recommendations
        };
    }

    /**
     * Monitor current memory usage
     */
    public monitorMemoryUsage(): MemoryStats {
        const now = Date.now();

        // Throttle memory checks to avoid performance impact
        if (now - this.lastMemoryCheck < this.memoryCheckInterval) {
            return this.getCachedMemoryStats();
        }

        this.lastMemoryCheck = now;

        let memoryStats: MemoryStats;

        // Try to get precise memory info if available
        if ('memory' in performance && (performance as any).memory) {
            const memory = (performance as any).memory;
            const used = Math.round(memory.usedJSHeapSize / (1024 * 1024));
            const total = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
            const available = total - used;
            const percentage = Math.round((used / total) * 100);

            memoryStats = {
                used,
                total,
                available,
                percentage,
                jsHeapSizeLimit: memory.jsHeapSizeLimit,
                usedJSHeapSize: memory.usedJSHeapSize
            };
        } else {
            // Fallback to estimated memory usage
            memoryStats = this.estimateMemoryUsage();
        }

        // Update performance metrics
        this.performanceMetrics.memoryUsage = memoryStats.percentage;

        // Cache the result
        this.cacheMemoryStats(memoryStats);

        if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
            console.log('Memory usage:', memoryStats);
        }

        return memoryStats;
    }

    /**
     * Optimize settings based on device capabilities
     */
    public optimizeForDevice(): OptimizationSettings {
        const systemCheck = this.checkSystemRequirements();
        const memoryStats = this.monitorMemoryUsage();
        const settings = { ...DEFAULT_OPTIMIZATION_SETTINGS };

        // Adjust based on available memory
        if (memoryStats.available < 2048) {
            // Low memory device
            settings.maxConcurrentRequests = 1;
            settings.contextWindowSize = 1024;
            settings.memoryThreshold = 0.7;
            settings.batteryOptimization = true;
        } else if (memoryStats.available < 4096) {
            // Medium memory device
            settings.maxConcurrentRequests = 1;
            settings.contextWindowSize = 2048;
            settings.memoryThreshold = 0.8;
        } else {
            // High memory device
            settings.maxConcurrentRequests = 2;
            settings.contextWindowSize = 4096;
            settings.memoryThreshold = 0.85;
        }

        // Adjust based on WebGL support
        if (!systemCheck.hasWebGL) {
            settings.maxConcurrentRequests = 1;
            settings.contextWindowSize = Math.min(settings.contextWindowSize, 1024);
        }

        // Adjust based on battery status if available
        if ('getBattery' in navigator) {
            (navigator as any).getBattery().then((battery: any) => {
                if (battery.charging === false && battery.level < 0.2) {
                    settings.batteryOptimization = true;
                    settings.maxConcurrentRequests = 1;
                }
            }).catch(() => {
                // Battery API not available, use default settings
            });
        }

        return settings;
    }

    /**
     * Determine if inference should be paused due to resource constraints
     */
    public shouldPauseInference(): boolean {
        const memoryStats = this.monitorMemoryUsage();

        // Pause if memory usage is critical
        if (memoryStats.percentage > PERFORMANCE_LIMITS.MEMORY_CRITICAL_THRESHOLD * 100) {
            return true;
        }

        // Check if system is under heavy load
        if (this.isCPUThrottled()) {
            return true;
        }

        // Check battery status for mobile devices
        if (this.isBatteryLow()) {
            return true;
        }

        return false;
    }

    /**
     * Get current performance metrics
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Update performance metrics with new data
     */
    public updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
        this.performanceMetrics = {
            ...this.performanceMetrics,
            ...metrics
        };
    }

    /**
     * Record model load time
     */
    public recordModelLoadTime(loadTime: number): void {
        this.performanceMetrics.modelLoadTime = loadTime;
    }

    /**
     * Record inference time and update averages
     */
    public recordInferenceTime(inferenceTime: number, tokenCount: number = 0): void {
        const currentAvg = this.performanceMetrics.averageInferenceTime;
        const totalRequests = this.performanceMetrics.totalRequests;

        // Calculate new average
        this.performanceMetrics.averageInferenceTime =
            (currentAvg * totalRequests + inferenceTime) / (totalRequests + 1);

        // Calculate tokens per second
        if (tokenCount > 0) {
            this.performanceMetrics.tokensPerSecond = tokenCount / (inferenceTime / 1000);
        }

        this.performanceMetrics.totalRequests++;
    }

    /**
     * Record error occurrence
     */
    public recordError(): void {
        const totalRequests = this.performanceMetrics.totalRequests;
        if (totalRequests > 0) {
            this.performanceMetrics.errorRate =
                (this.performanceMetrics.errorRate * totalRequests + 1) / (totalRequests + 1);
        }
    }

    /**
     * Record fallback usage
     */
    public recordFallback(): void {
        const totalRequests = this.performanceMetrics.totalRequests;
        if (totalRequests > 0) {
            this.performanceMetrics.fallbackRate =
                (this.performanceMetrics.fallbackRate * totalRequests + 1) / (totalRequests + 1);
        }
    }

    /**
     * Clean up resources and stop monitoring
     */
    public dispose(): void {
        this.stopMonitoring();
        this.memoryObserver = null;
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    /**
     * Initialize performance monitoring
     */
    private initializeMonitoring(): void {
        if (!this.isMonitoring && 'PerformanceObserver' in window) {
            try {
                this.memoryObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    for (const entry of entries) {
                        if (entry.entryType === 'measure') {
                            this.recordInferenceTime(entry.duration);
                        }
                    }
                });

                this.memoryObserver.observe({ entryTypes: ['measure'] });
                this.isMonitoring = true;
            } catch (error) {
                console.warn('Performance monitoring not available:', error);
            }
        }
    }

    /**
     * Stop performance monitoring
     */
    private stopMonitoring(): void {
        if (this.memoryObserver) {
            this.memoryObserver.disconnect();
            this.isMonitoring = false;
        }
    }

    /**
     * Check WebGL support
     */
    private checkWebGLSupport(): boolean {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check WebAssembly support
     */
    private checkWebAssemblySupport(): boolean {
        try {
            return typeof WebAssembly === 'object' &&
                typeof WebAssembly.instantiate === 'function';
        } catch (error) {
            return false;
        }
    }

    /**
     * Check browser compatibility
     */
    private checkBrowserSupport(): boolean {
        const userAgent = navigator.userAgent;

        // Chrome
        if (userAgent.includes('Chrome/')) {
            const version = parseInt(userAgent.match(/Chrome\/(\d+)/)?.[1] || '0');
            return version >= parseInt(BROWSER_SUPPORT.chrome.min);
        }

        // Firefox
        if (userAgent.includes('Firefox/')) {
            const version = parseInt(userAgent.match(/Firefox\/(\d+)/)?.[1] || '0');
            return version >= parseInt(BROWSER_SUPPORT.firefox.min);
        }

        // Safari
        if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
            const version = parseInt(userAgent.match(/Version\/(\d+)/)?.[1] || '0');
            return version >= parseInt(BROWSER_SUPPORT.safari.min);
        }

        // Edge
        if (userAgent.includes('Edg/')) {
            const version = parseInt(userAgent.match(/Edg\/(\d+)/)?.[1] || '0');
            return version >= parseInt(BROWSER_SUPPORT.edge.min);
        }

        // Unknown browser - assume compatible
        return true;
    }

    /**
     * Estimate memory usage when precise info is unavailable
     */
    private estimateMemoryUsage(): MemoryStats {
        // Rough estimation based on typical browser memory usage
        const estimatedTotal = 4096; // 4GB typical
        const estimatedUsed = 1024;  // 1GB typical usage
        const available = estimatedTotal - estimatedUsed;
        const percentage = Math.round((estimatedUsed / estimatedTotal) * 100);

        return {
            used: estimatedUsed,
            total: estimatedTotal,
            available,
            percentage
        };
    }

    /**
     * Cache memory stats to avoid frequent recalculation
     */
    private cachedMemoryStats: MemoryStats | null = null;

    private cacheMemoryStats(stats: MemoryStats): void {
        this.cachedMemoryStats = stats;
    }

    private getCachedMemoryStats(): MemoryStats {
        return this.cachedMemoryStats || this.estimateMemoryUsage();
    }

    /**
     * Check if CPU is being throttled
     */
    private isCPUThrottled(): boolean {
        // Simple heuristic: if inference is taking too long, assume throttling
        return this.performanceMetrics.averageInferenceTime > PERFORMANCE_LIMITS.MAX_INFERENCE_TIME_MS * 0.8;
    }

    /**
     * Check if battery is low (for mobile devices)
     */
    private isBatteryLow(): boolean {
        // This would need to be implemented with Battery API if available
        // For now, return false as a safe default
        return false;
    }
}

/**
 * Factory function to create ResourceMonitor instance
 */
export function createResourceMonitor(): IResourceMonitor {
    return new ResourceMonitor();
}

/**
 * Singleton instance for global use
 */
let resourceMonitorInstance: IResourceMonitor | null = null;

/**
 * Get or create singleton ResourceMonitor instance
 */
export function getResourceMonitor(): IResourceMonitor {
    if (!resourceMonitorInstance) {
        resourceMonitorInstance = createResourceMonitor();
    }
    return resourceMonitorInstance;
}