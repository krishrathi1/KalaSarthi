/**
 * Alerting System
 * Monitors metrics and triggers alerts for critical issues
 * 
 * Requirements: 10.3, 10.5
 */

import { HealthStatus, ComponentHealth } from './HealthMonitor';
import { ErrorSeverity, ErrorType } from '../errors/ErrorTypes';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Alert types
 */
export enum AlertType {
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
  SLOW_RESPONSE_TIME = 'SLOW_RESPONSE_TIME',
  HIGH_MEMORY_USAGE = 'HIGH_MEMORY_USAGE',
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  EXTERNAL_API_FAILURE = 'EXTERNAL_API_FAILURE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SYSTEM_OVERLOAD = 'SYSTEM_OVERLOAD',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT'
}

/**
 * Alert interface
 */
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  details?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  notificationsSent: string[];
}

/**
 * Alert rule
 */
export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  severity: AlertSeverity;
  condition: (context: AlertContext) => boolean;
  message: (context: AlertContext) => string;
  cooldownMinutes: number;
  notificationChannels: string[];
  enabled: boolean;
}

/**
 * Alert context for rule evaluation
 */
export interface AlertContext {
  errorRate?: number;
  responseTime?: number;
  memoryUsage?: number;
  healthStatus?: HealthStatus;
  componentHealth?: ComponentHealth;
  errorType?: ErrorType;
  errorSeverity?: ErrorSeverity;
  customMetrics?: Record<string, number>;
}

/**
 * Alert notification handler
 */
export type AlertNotificationHandler = (alert: Alert) => Promise<void>;

/**
 * Alerting System Class
 */
export class AlertingSystem {
  private static instance: AlertingSystem;
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationHandlers: Map<string, AlertNotificationHandler> = new Map();
  private lastAlertTime: Map<string, Date> = new Map();
  private maxAlerts = 1000;

  private constructor() {
    this.registerDefaultAlertRules();
  }

  static getInstance(): AlertingSystem {
    if (!AlertingSystem.instance) {
      AlertingSystem.instance = new AlertingSystem();
    }
    return AlertingSystem.instance;
  }

  /**
   * Register default alert rules
   */
  private registerDefaultAlertRules(): void {
    // High error rate alert
    this.registerAlertRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      type: AlertType.HIGH_ERROR_RATE,
      severity: AlertSeverity.ERROR,
      condition: (context) => (context.errorRate || 0) > 0.05,
      message: (context) => `Error rate is ${((context.errorRate || 0) * 100).toFixed(2)}% (threshold: 5%)`,
      cooldownMinutes: 15,
      notificationChannels: ['email', 'slack'],
      enabled: true
    });

    // Slow response time alert
    this.registerAlertRule({
      id: 'slow_response_time',
      name: 'Slow Response Time',
      type: AlertType.SLOW_RESPONSE_TIME,
      severity: AlertSeverity.WARNING,
      condition: (context) => (context.responseTime || 0) > 3000,
      message: (context) => `Average response time is ${context.responseTime}ms (threshold: 3000ms)`,
      cooldownMinutes: 10,
      notificationChannels: ['email'],
      enabled: true
    });

    // High memory usage alert
    this.registerAlertRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      type: AlertType.HIGH_MEMORY_USAGE,
      severity: AlertSeverity.WARNING,
      condition: (context) => (context.memoryUsage || 0) > 85,
      message: (context) => `Memory usage is ${context.memoryUsage}% (threshold: 85%)`,
      cooldownMinutes: 5,
      notificationChannels: ['email', 'slack'],
      enabled: true
    });

    // Critical memory usage alert
    this.registerAlertRule({
      id: 'critical_memory_usage',
      name: 'Critical Memory Usage',
      type: AlertType.HIGH_MEMORY_USAGE,
      severity: AlertSeverity.CRITICAL,
      condition: (context) => (context.memoryUsage || 0) > 95,
      message: (context) => `CRITICAL: Memory usage is ${context.memoryUsage}% (threshold: 95%)`,
      cooldownMinutes: 5,
      notificationChannels: ['email', 'slack', 'sms'],
      enabled: true
    });

    // Database connection failed alert
    this.registerAlertRule({
      id: 'database_connection_failed',
      name: 'Database Connection Failed',
      type: AlertType.DATABASE_CONNECTION_FAILED,
      severity: AlertSeverity.CRITICAL,
      condition: (context) => 
        context.healthStatus === HealthStatus.UNHEALTHY || 
        context.healthStatus === HealthStatus.CRITICAL,
      message: () => 'Database connection failed',
      cooldownMinutes: 5,
      notificationChannels: ['email', 'slack', 'sms'],
      enabled: true
    });

    // External API failure alert
    this.registerAlertRule({
      id: 'external_api_failure',
      name: 'External API Failure',
      type: AlertType.EXTERNAL_API_FAILURE,
      severity: AlertSeverity.ERROR,
      condition: (context) => context.errorType === ErrorType.EXTERNAL_API_ERROR,
      message: () => 'External API calls are failing',
      cooldownMinutes: 10,
      notificationChannels: ['email'],
      enabled: true
    });
  }

  /**
   * Register an alert rule
   */
  registerAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  /**
   * Register a notification handler
   */
  registerNotificationHandler(channel: string, handler: AlertNotificationHandler): void {
    this.notificationHandlers.set(channel, handler);
  }

  /**
   * Evaluate alert rules
   */
  async evaluateRules(context: AlertContext): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown period
      const lastAlert = this.lastAlertTime.get(rule.id);
      if (lastAlert) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - lastAlert.getTime() < cooldownMs) {
          continue;
        }
      }

      // Evaluate condition
      try {
        if (rule.condition(context)) {
          const alert = await this.createAlert(rule, context);
          triggeredAlerts.push(alert);
          this.lastAlertTime.set(rule.id, new Date());
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${rule.id}:`, error);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Create an alert
   */
  private async createAlert(rule: AlertRule, context: AlertContext): Promise<Alert> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: rule.type,
      severity: rule.severity,
      message: rule.message(context),
      timestamp: new Date(),
      details: context,
      resolved: false,
      notificationsSent: []
    };

    // Store alert
    this.alerts.set(alert.id, alert);

    // Maintain max alerts
    if (this.alerts.size > this.maxAlerts) {
      const oldestKey = Array.from(this.alerts.keys())[0];
      this.alerts.delete(oldestKey);
    }

    // Send notifications
    await this.sendNotifications(alert, rule.notificationChannels);

    return alert;
  }

  /**
   * Send alert notifications
   */
  private async sendNotifications(alert: Alert, channels: string[]): Promise<void> {
    for (const channel of channels) {
      const handler = this.notificationHandlers.get(channel);
      if (handler) {
        try {
          await handler(alert);
          alert.notificationsSent.push(channel);
        } catch (error) {
          console.error(`Failed to send alert notification via ${channel}:`, error);
        }
      }
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.severity === severity);
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: AlertType): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.type === type);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(count: number = 100): Alert[] {
    const alerts = Array.from(this.alerts.values());
    return alerts.slice(-count);
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): void {
    for (const [id, alert] of this.alerts) {
      if (alert.resolved) {
        this.alerts.delete(id);
      }
    }
  }

  /**
   * Clear all alerts
   */
  clearAllAlerts(): void {
    this.alerts.clear();
    this.lastAlertTime.clear();
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<AlertSeverity, number>;
    byType: Record<AlertType, number>;
  } {
    const alerts = Array.from(this.alerts.values());
    const active = alerts.filter(a => !a.resolved).length;
    const resolved = alerts.filter(a => a.resolved).length;

    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    alerts.forEach(alert => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      byType[alert.type] = (byType[alert.type] || 0) + 1;
    });

    return {
      total: alerts.length,
      active,
      resolved,
      bySeverity: bySeverity as Record<AlertSeverity, number>,
      byType: byType as Record<AlertType, number>
    };
  }

  /**
   * Enable/disable alert rule
   */
  setAlertRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
    }
  }
}

/**
 * Convenience function to get alerting system instance
 */
export const getAlertingSystem = () => AlertingSystem.getInstance();

/**
 * Default notification handlers
 */

/**
 * Console notification handler (for development)
 */
export const consoleNotificationHandler: AlertNotificationHandler = async (alert: Alert) => {
  const severityColors: Record<AlertSeverity, string> = {
    [AlertSeverity.INFO]: '\x1b[36m',
    [AlertSeverity.WARNING]: '\x1b[33m',
    [AlertSeverity.ERROR]: '\x1b[31m',
    [AlertSeverity.CRITICAL]: '\x1b[35m'
  };

  const color = severityColors[alert.severity];
  const reset = '\x1b[0m';

  console.log(`${color}[ALERT ${alert.severity}] ${alert.type}${reset}`);
  console.log(`Message: ${alert.message}`);
  console.log(`Timestamp: ${alert.timestamp.toISOString()}`);
  if (alert.details) {
    console.log('Details:', JSON.stringify(alert.details, null, 2));
  }
};

/**
 * Email notification handler (placeholder)
 */
export const emailNotificationHandler: AlertNotificationHandler = async (alert: Alert) => {
  // In production, this would send an email via SendGrid, AWS SES, etc.
  console.log(`[EMAIL] Would send alert: ${alert.message}`);
};

/**
 * Slack notification handler (placeholder)
 */
export const slackNotificationHandler: AlertNotificationHandler = async (alert: Alert) => {
  // In production, this would send to Slack via webhook
  console.log(`[SLACK] Would send alert: ${alert.message}`);
};

/**
 * SMS notification handler (placeholder)
 */
export const smsNotificationHandler: AlertNotificationHandler = async (alert: Alert) => {
  // In production, this would send SMS via Twilio
  console.log(`[SMS] Would send alert: ${alert.message}`);
};
