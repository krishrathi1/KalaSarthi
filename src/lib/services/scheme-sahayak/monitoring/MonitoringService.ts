/**
 * Monitoring Service
 * Integrates health monitoring, metrics tracking, and alerting
 * 
 * Requirements: 10.3, 10.5
 */

import { HealthMonitor, HealthStatus, SystemHealthReport } from './HealthMonitor';
import { MetricsTracker, MetricsSummary } from './MetricsTracker';
import {
  AlertingSystem,
  Alert,
  AlertContext,
  AlertSeverity,
  consoleNotificationHandler,
  emailNotificationHandler,
  slackNotificationHandler,
  smsNotificationHandler
} from './AlertingSystem';
import { getErrorHandler } from '../errors/ErrorHandler';

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  healthCheckInterval: number; // milliseconds
  metricsAggregationInterval: number; // milliseconds
  alertEvaluationInterval: number; // milliseconds
  enableHealthChecks: boolean;
  enableMetrics: boolean;
  enableAlerts: boolean;
  notificationChannels: {
    console: boolean;
    email: boolean;
    slack: boolean;
    sms: boolean;
  };
}

/**
 * Monitoring dashboard data
 */
export interface MonitoringDashboard {
  timestamp: Date;
  health: SystemHealthReport;
  metrics: MetricsSummary;
  alerts: {
    active: Alert[];
    recent: Alert[];
    statistics: {
      total: number;
      active: number;
      resolved: number;
      bySeverity: Record<AlertSeverity, number>;
    };
  };
  errors: {
    total: number;
    recent: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

/**
 * Monitoring Service Class
 */
export class MonitoringService {
  private static instance: MonitoringService;
  private healthMonitor: HealthMonitor;
  private metricsTracker: MetricsTracker;
  private alertingSystem: AlertingSystem;
  private config: MonitoringConfig;
  private intervals: NodeJS.Timeout[] = [];
  private isRunning: boolean = false;

  private constructor(config?: Partial<MonitoringConfig>) {
    this.healthMonitor = HealthMonitor.getInstance();
    this.metricsTracker = MetricsTracker.getInstance();
    this.alertingSystem = AlertingSystem.getInstance();

    this.config = {
      healthCheckInterval: 60000, // 1 minute
      metricsAggregationInterval: 300000, // 5 minutes
      alertEvaluationInterval: 30000, // 30 seconds
      enableHealthChecks: true,
      enableMetrics: true,
      enableAlerts: true,
      notificationChannels: {
        console: true,
        email: false,
        slack: false,
        sms: false
      },
      ...config
    };

    this.setupNotificationHandlers();
  }

  static getInstance(config?: Partial<MonitoringConfig>): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService(config);
    }
    return MonitoringService.instance;
  }

  /**
   * Setup notification handlers
   */
  private setupNotificationHandlers(): void {
    if (this.config.notificationChannels.console) {
      this.alertingSystem.registerNotificationHandler('console', consoleNotificationHandler);
    }
    if (this.config.notificationChannels.email) {
      this.alertingSystem.registerNotificationHandler('email', emailNotificationHandler);
    }
    if (this.config.notificationChannels.slack) {
      this.alertingSystem.registerNotificationHandler('slack', slackNotificationHandler);
    }
    if (this.config.notificationChannels.sms) {
      this.alertingSystem.registerNotificationHandler('sms', smsNotificationHandler);
    }
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.log('[MonitoringService] Already running');
      return;
    }

    console.log('[MonitoringService] Starting monitoring...');
    this.isRunning = true;

    // Health checks
    if (this.config.enableHealthChecks) {
      const healthInterval = setInterval(
        () => this.runHealthChecks(),
        this.config.healthCheckInterval
      );
      this.intervals.push(healthInterval);
    }

    // Alert evaluation
    if (this.config.enableAlerts) {
      const alertInterval = setInterval(
        () => this.evaluateAlerts(),
        this.config.alertEvaluationInterval
      );
      this.intervals.push(alertInterval);
    }

    // Metrics cleanup (every hour)
    const cleanupInterval = setInterval(
      () => this.cleanupOldData(),
      3600000
    );
    this.intervals.push(cleanupInterval);

    console.log('[MonitoringService] Monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[MonitoringService] Stopping monitoring...');
    
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.isRunning = false;

    console.log('[MonitoringService] Monitoring stopped');
  }

  /**
   * Run health checks
   */
  private async runHealthChecks(): Promise<void> {
    try {
      const report = await this.healthMonitor.runHealthChecks();
      
      // Log health status
      if (report.overallStatus !== HealthStatus.HEALTHY) {
        console.warn(`[MonitoringService] System health: ${report.overallStatus}`);
      }
    } catch (error) {
      console.error('[MonitoringService] Health check failed:', error);
    }
  }

  /**
   * Evaluate alerts
   */
  private async evaluateAlerts(): Promise<void> {
    try {
      const metrics = this.healthMonitor.getMetrics();
      const healthReport = this.healthMonitor.getLastHealthReport();
      const errorHandler = getErrorHandler();
      const errorStats = errorHandler.getErrorStatistics();

      const context: AlertContext = {
        errorRate: metrics.errorRate,
        responseTime: metrics.averageResponseTime,
        healthStatus: healthReport?.overallStatus
      };

      // Add memory usage from health report
      const memoryComponent = healthReport?.components.find(c => c.name === 'memory');
      if (memoryComponent?.details?.usagePercent) {
        context.memoryUsage = parseFloat(memoryComponent.details.usagePercent);
      }

      await this.alertingSystem.evaluateRules(context);
    } catch (error) {
      console.error('[MonitoringService] Alert evaluation failed:', error);
    }
  }

  /**
   * Cleanup old data
   */
  private cleanupOldData(): void {
    try {
      // Clear metrics older than 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.metricsTracker.clearOldMetrics(oneDayAgo);

      // Clear resolved alerts
      this.alertingSystem.clearResolvedAlerts();

      console.log('[MonitoringService] Old data cleaned up');
    } catch (error) {
      console.error('[MonitoringService] Cleanup failed:', error);
    }
  }

  /**
   * Get monitoring dashboard
   */
  async getDashboard(): Promise<MonitoringDashboard> {
    const healthReport = await this.healthMonitor.runHealthChecks();
    const metricsSummary = this.metricsTracker.getMetricsSummary();
    const activeAlerts = this.alertingSystem.getActiveAlerts();
    const recentAlerts = this.alertingSystem.getRecentAlerts(50);
    const alertStats = this.alertingSystem.getAlertStatistics();
    const errorHandler = getErrorHandler();
    const errorStats = errorHandler.getErrorStatistics();

    return {
      timestamp: new Date(),
      health: healthReport,
      metrics: metricsSummary,
      alerts: {
        active: activeAlerts,
        recent: recentAlerts,
        statistics: alertStats
      },
      errors: errorStats
    };
  }

  /**
   * Record request
   */
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.healthMonitor.recordRequest(responseTime, isError);
    
    if (this.config.enableMetrics) {
      this.metricsTracker.recordTimer('api.request', responseTime, {
        error: isError.toString()
      });
      
      if (isError) {
        this.metricsTracker.incrementCounter('api.errors');
      } else {
        this.metricsTracker.incrementCounter('api.success');
      }
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<SystemHealthReport> {
    return await this.healthMonitor.runHealthChecks();
  }

  /**
   * Get metrics
   */
  getMetrics(): MetricsSummary {
    return this.metricsTracker.getMetricsSummary();
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alertingSystem.getActiveAlerts();
  }

  /**
   * Check if system is healthy
   */
  async isHealthy(): Promise<boolean> {
    return await this.healthMonitor.isHealthy();
  }

  /**
   * Get configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MonitoringConfig>): void {
    Object.assign(this.config, updates);
    
    // Restart if running to apply new config
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Export monitoring data
   */
  async exportData(): Promise<{
    health: SystemHealthReport;
    metrics: any;
    alerts: Alert[];
    errors: any;
  }> {
    const healthReport = await this.healthMonitor.runHealthChecks();
    const metricsExport = this.metricsTracker.exportMetrics();
    const alerts = this.alertingSystem.getRecentAlerts();
    const errorHandler = getErrorHandler();
    const errors = errorHandler.getRecentErrors();

    return {
      health: healthReport,
      metrics: metricsExport,
      alerts,
      errors
    };
  }
}

/**
 * Convenience function to get monitoring service instance
 */
export const getMonitoringService = (config?: Partial<MonitoringConfig>) => 
  MonitoringService.getInstance(config);
