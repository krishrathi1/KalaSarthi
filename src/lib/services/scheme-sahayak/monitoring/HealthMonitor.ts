/**
 * System Health Monitor
 * Monitors system health and component status
 * 
 * Requirements: 10.3, 10.5
 */

import { db } from '@/lib/config/scheme-sahayak-firebase';
import { collection, getDocs, query, limit as firestoreLimit } from 'firebase/firestore';

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  CRITICAL = 'CRITICAL'
}

/**
 * Component health check result
 */
export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  responseTime: number;
  lastChecked: Date;
  message?: string;
  details?: Record<string, any>;
}

/**
 * System health report
 */
export interface SystemHealthReport {
  overallStatus: HealthStatus;
  timestamp: Date;
  components: ComponentHealth[];
  metrics: {
    uptime: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

/**
 * Health check function type
 */
type HealthCheckFunction = () => Promise<ComponentHealth>;

/**
 * Health Monitor Class
 */
export class HealthMonitor {
  private static instance: HealthMonitor;
  private healthChecks: Map<string, HealthCheckFunction> = new Map();
  private lastHealthReport?: SystemHealthReport;
  private startTime: Date = new Date();
  private requestCount: number = 0;
  private errorCount: number = 0;
  private responseTimes: number[] = [];
  private maxResponseTimesSamples = 1000;

  private constructor() {
    this.registerDefaultHealthChecks();
  }

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  /**
   * Register default health checks
   */
  private registerDefaultHealthChecks(): void {
    this.registerHealthCheck('database', this.checkDatabaseHealth.bind(this));
    this.registerHealthCheck('memory', this.checkMemoryHealth.bind(this));
    this.registerHealthCheck('api', this.checkAPIHealth.bind(this));
  }

  /**
   * Register a health check
   */
  registerHealthCheck(name: string, checkFunction: HealthCheckFunction): void {
    this.healthChecks.set(name, checkFunction);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<SystemHealthReport> {
    const componentResults: ComponentHealth[] = [];

    // Run all registered health checks
    for (const [name, checkFunction] of this.healthChecks) {
      try {
        const result = await checkFunction();
        componentResults.push(result);
      } catch (error) {
        componentResults.push({
          name,
          status: HealthStatus.UNHEALTHY,
          responseTime: 0,
          lastChecked: new Date(),
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    // Determine overall status
    const overallStatus = this.determineOverallStatus(componentResults);

    // Calculate metrics
    const uptime = Date.now() - this.startTime.getTime();
    const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    const report: SystemHealthReport = {
      overallStatus,
      timestamp: new Date(),
      components: componentResults,
      metrics: {
        uptime,
        totalRequests: this.requestCount,
        errorRate,
        averageResponseTime
      }
    };

    this.lastHealthReport = report;
    return report;
  }

  /**
   * Get last health report
   */
  getLastHealthReport(): SystemHealthReport | undefined {
    return this.lastHealthReport;
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Try to query Firestore
      const testQuery = query(
        collection(db, 'schemes'),
        firestoreLimit(1)
      );
      await getDocs(testQuery);
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: responseTime < 1000 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        responseTime,
        lastChecked: new Date(),
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check memory health
   */
  private async checkMemoryHealth(): Promise<ComponentHealth> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    let status: HealthStatus;
    if (usagePercent < 70) {
      status = HealthStatus.HEALTHY;
    } else if (usagePercent < 85) {
      status = HealthStatus.DEGRADED;
    } else if (usagePercent < 95) {
      status = HealthStatus.UNHEALTHY;
    } else {
      status = HealthStatus.CRITICAL;
    }

    return {
      name: 'memory',
      status,
      responseTime: 0,
      lastChecked: new Date(),
      message: `Memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${usagePercent.toFixed(2)}%)`,
      details: {
        heapUsedMB: heapUsedMB.toFixed(2),
        heapTotalMB: heapTotalMB.toFixed(2),
        usagePercent: usagePercent.toFixed(2),
        rss: (memoryUsage.rss / 1024 / 1024).toFixed(2)
      }
    };
  }

  /**
   * Check API health
   */
  private async checkAPIHealth(): Promise<ComponentHealth> {
    const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    let status: HealthStatus;
    if (errorRate < 0.01 && avgResponseTime < 1000) {
      status = HealthStatus.HEALTHY;
    } else if (errorRate < 0.05 && avgResponseTime < 3000) {
      status = HealthStatus.DEGRADED;
    } else if (errorRate < 0.1) {
      status = HealthStatus.UNHEALTHY;
    } else {
      status = HealthStatus.CRITICAL;
    }

    return {
      name: 'api',
      status,
      responseTime: avgResponseTime,
      lastChecked: new Date(),
      message: `Error rate: ${(errorRate * 100).toFixed(2)}%, Avg response: ${avgResponseTime.toFixed(0)}ms`,
      details: {
        totalRequests: this.requestCount,
        errorCount: this.errorCount,
        errorRate: (errorRate * 100).toFixed(2),
        avgResponseTime: avgResponseTime.toFixed(0)
      }
    };
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(components: ComponentHealth[]): HealthStatus {
    if (components.some(c => c.status === HealthStatus.CRITICAL)) {
      return HealthStatus.CRITICAL;
    }
    if (components.some(c => c.status === HealthStatus.UNHEALTHY)) {
      return HealthStatus.UNHEALTHY;
    }
    if (components.some(c => c.status === HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }
    return HealthStatus.HEALTHY;
  }

  /**
   * Record request metrics
   */
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    if (isError) {
      this.errorCount++;
    }
    
    this.responseTimes.push(responseTime);
    
    // Keep only recent samples
    if (this.responseTimes.length > this.maxResponseTimesSamples) {
      this.responseTimes.shift();
    }
  }

  /**
   * Get system metrics
   */
  getMetrics(): {
    uptime: number;
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    const uptime = Date.now() - this.startTime.getTime();
    const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    // Calculate percentiles
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    const p95ResponseTime = sortedTimes[p95Index] || 0;
    const p99ResponseTime = sortedTimes[p99Index] || 0;

    return {
      uptime,
      totalRequests: this.requestCount,
      errorCount: this.errorCount,
      errorRate,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.startTime = new Date();
  }

  /**
   * Check if system is healthy
   */
  async isHealthy(): Promise<boolean> {
    const report = await this.runHealthChecks();
    return report.overallStatus === HealthStatus.HEALTHY || 
           report.overallStatus === HealthStatus.DEGRADED;
  }
}

/**
 * Convenience function to get health monitor instance
 */
export const getHealthMonitor = () => HealthMonitor.getInstance();
