/**
 * Gupshup Logging Infrastructure
 * Provides structured logging for Gupshup operations, performance monitoring, and debugging
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  operation: string;
  message: string;
  data?: Record<string, any>;
  duration?: number;
  messageId?: string;
  userId?: string;
  channel?: 'whatsapp' | 'sms';
  error?: any;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  errorCode?: string;
  channel?: 'whatsapp' | 'sms';
}

/**
 * Gupshup Logger class for structured logging
 */
export class GupshupLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private performanceMetrics: PerformanceMetrics[] = [];
  private maxMetrics = 500;

  /**
   * Log debug information
   */
  debug(operation: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, operation, message, data);
  }

  /**
   * Log informational messages
   */
  info(operation: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, operation, message, data);
  }

  /**
   * Log warning messages
   */
  warn(operation: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, operation, message, data);
  }

  /**
   * Log error messages
   */
  error(operation: string, message: string, error?: any, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, operation, message, { ...data, error });
  }

  /**
   * Log message sending operation
   */
  logMessageSent(
    channel: 'whatsapp' | 'sms',
    messageId: string,
    userId: string,
    success: boolean,
    duration: number,
    error?: any
  ): void {
    const operation = `send_${channel}_message`;
    const message = success 
      ? `${channel.toUpperCase()} message sent successfully`
      : `${channel.toUpperCase()} message failed`;

    this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      operation,
      message,
      {
        messageId,
        userId,
        channel,
        duration,
        success,
        error,
      }
    );

    // Record performance metrics
    this.recordPerformance({
      operation,
      duration,
      timestamp: new Date(),
      success,
      errorCode: error?.code,
      channel,
    });
  }

  /**
   * Log rate limiting events
   */
  logRateLimit(
    channel: 'whatsapp' | 'sms',
    remaining: number,
    isLimited: boolean
  ): void {
    const message = isLimited
      ? `Rate limit exceeded for ${channel.toUpperCase()}`
      : `Rate limit check: ${remaining} requests remaining for ${channel.toUpperCase()}`;

    this.log(
      isLimited ? LogLevel.WARN : LogLevel.DEBUG,
      'rate_limit_check',
      message,
      {
        channel,
        remaining,
        isLimited,
      }
    );
  }

  /**
   * Log webhook processing
   */
  logWebhook(
    messageId: string,
    status: string,
    processingTime: number,
    success: boolean,
    error?: any
  ): void {
    const message = success
      ? `Webhook processed successfully for message ${messageId}`
      : `Webhook processing failed for message ${messageId}`;

    this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      'webhook_processing',
      message,
      {
        messageId,
        status,
        processingTime,
        success,
        error,
      }
    );
  }

  /**
   * Log API configuration validation
   */
  logConfigValidation(success: boolean, errors?: string[]): void {
    const message = success
      ? 'Gupshup configuration validated successfully'
      : `Gupshup configuration validation failed: ${errors?.join(', ')}`;

    this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      'config_validation',
      message,
      {
        success,
        errors,
      }
    );
  }

  /**
   * Log template operations
   */
  logTemplateOperation(
    operation: 'validate' | 'format' | 'sync',
    templateName: string,
    language: string,
    success: boolean,
    duration: number,
    error?: any
  ): void {
    const message = success
      ? `Template ${operation} successful for ${templateName} (${language})`
      : `Template ${operation} failed for ${templateName} (${language})`;

    this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      `template_${operation}`,
      message,
      {
        templateName,
        language,
        success,
        duration,
        error,
      }
    );
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 50, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }

    return filteredLogs.slice(0, count);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(operation?: string): PerformanceMetrics[] {
    if (operation) {
      return this.performanceMetrics.filter(metric => metric.operation === operation);
    }
    return this.performanceMetrics.slice();
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    // Group metrics by operation
    const operationGroups = this.performanceMetrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = [];
      }
      groups[metric.operation].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetrics[]>);

    // Calculate statistics for each operation
    for (const [operation, metrics] of Object.entries(operationGroups)) {
      const durations = metrics.map(m => m.duration);
      const successCount = metrics.filter(m => m.success).length;
      const totalCount = metrics.length;

      summary[operation] = {
        totalRequests: totalCount,
        successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
        averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
        recentErrors: metrics
          .filter(m => !m.success)
          .slice(0, 5)
          .map(m => ({
            timestamp: m.timestamp,
            errorCode: m.errorCode,
            duration: m.duration,
          })),
      };
    }

    return summary;
  }

  /**
   * Export logs for external analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'operation', 'message', 'messageId', 'userId', 'channel', 'duration'];
      const csvRows = [headers.join(',')];
      
      for (const log of this.logs) {
        const row = [
          log.timestamp.toISOString(),
          log.level,
          log.operation,
          `"${log.message.replace(/"/g, '""')}"`,
          log.messageId || '',
          log.userId || '',
          log.channel || '',
          log.duration?.toString() || '',
        ];
        csvRows.push(row.join(','));
      }
      
      return csvRows.join('\n');
    }

    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear old logs to prevent memory issues
   */
  clearOldLogs(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    this.logs = this.logs.filter(log => log.timestamp > cutoffTime);
    this.performanceMetrics = this.performanceMetrics.filter(metric => metric.timestamp > cutoffTime);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    operation: string,
    message: string,
    data?: Record<string, any>
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      operation,
      message,
      data,
      messageId: data?.messageId,
      userId: data?.userId,
      channel: data?.channel,
      duration: data?.duration,
      error: data?.error,
    };

    this.logs.unshift(logEntry);

    // Trim logs if too many
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Output to console based on environment
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.outputToConsole(logEntry);
    }
  }

  /**
   * Record performance metrics
   */
  private recordPerformance(metric: PerformanceMetrics): void {
    this.performanceMetrics.unshift(metric);

    // Trim metrics if too many
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(0, this.maxMetrics);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${logEntry.level}] [${logEntry.operation}]`;
    
    switch (logEntry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, logEntry.message, logEntry.data);
        break;
      case LogLevel.INFO:
        console.info(prefix, logEntry.message, logEntry.data);
        break;
      case LogLevel.WARN:
        console.warn(prefix, logEntry.message, logEntry.data);
        break;
      case LogLevel.ERROR:
        console.error(prefix, logEntry.message, logEntry.error || logEntry.data);
        break;
    }
  }
}

/**
 * Performance timer utility for measuring operation duration
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private logger: GupshupLogger;

  constructor(operation: string, logger: GupshupLogger) {
    this.operation = operation;
    this.logger = logger;
    this.startTime = Date.now();
  }

  /**
   * End timing and log the result
   */
  end(success: boolean, error?: any, additionalData?: Record<string, any>): number {
    const duration = Date.now() - this.startTime;
    
    this.logger.debug(
      this.operation,
      `Operation completed in ${duration}ms`,
      {
        duration,
        success,
        error,
        ...additionalData,
      }
    );

    return duration;
  }
}

/**
 * Singleton logger instance
 */
let gupshupLoggerInstance: GupshupLogger | null = null;

export function getGupshupLogger(): GupshupLogger {
  if (!gupshupLoggerInstance) {
    gupshupLoggerInstance = new GupshupLogger();
  }
  return gupshupLoggerInstance;
}

/**
 * Create a performance timer
 */
export function createPerformanceTimer(operation: string): PerformanceTimer {
  return new PerformanceTimer(operation, getGupshupLogger());
}

/**
 * Clear logger instance (useful for testing)
 */
export function clearGupshupLoggerInstance(): void {
  gupshupLoggerInstance = null;
}