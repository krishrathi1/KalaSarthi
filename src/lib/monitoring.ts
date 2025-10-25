import { BigQuery } from '@google-cloud/bigquery';

export interface LogEntry {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR';
  service: string;
  operation: string;
  userId?: string;
  artisanProfession?: string;
  duration?: number;
  dataSources?: string[];
  error?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  dataPoints: number;
  cacheHit: boolean;
  userId?: string;
}

export class MonitoringService {
  private bigquery: BigQuery;
  private projectId: string;
  private logsDataset = 'monitoring';
  private logsTable = 'trend_analysis_logs';
  private metricsTable = 'performance_metrics';

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0314311341';
    this.bigquery = new BigQuery({
      projectId: this.projectId,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json'
    });
  }

  /**
   * Log an operation
   */
  async log(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date()
    };

    try {
      await this.insertLogEntry(logEntry);
    } catch (error) {
      console.error('Failed to insert log entry:', error);
      // Fallback to console logging
      console.log(`[${logEntry.level}] ${logEntry.service}:${logEntry.operation}`, {
        userId: logEntry.userId,
        duration: logEntry.duration,
        error: logEntry.error
      });
    }
  }

  /**
   * Record performance metrics
   */
  async recordMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      await this.insertMetrics(metrics);
    } catch (error) {
      console.error('Failed to record metrics:', error);
    }
  }

  /**
   * Log trend analysis operation
   */
  async logTrendAnalysis(
    userId: string,
    artisanProfession: string,
    operation: string,
    duration: number,
    success: boolean,
    dataSources: string[],
    error?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      level: success ? 'INFO' : 'ERROR',
      service: 'trend-analysis',
      operation,
      userId,
      artisanProfession,
      duration,
      dataSources,
      error,
      metadata
    });

    // Also record performance metrics
    await this.recordMetrics({
      operation,
      duration,
      success,
      dataPoints: metadata?.productCount || 0,
      cacheHit: metadata?.cached || false,
      userId
    });
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(hours: number = 24): Promise<{
    totalRequests: number;
    successRate: number;
    averageDuration: number;
    cacheHitRate: number;
    topOperations: Array<{ operation: string; count: number; avgDuration: number }>;
    errorRate: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as totalRequests,
        AVG(CASE WHEN success THEN 1 ELSE 0 END) as successRate,
        AVG(duration) as averageDuration,
        AVG(CASE WHEN cacheHit THEN 1 ELSE 0 END) as cacheHitRate,
        SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as errorRate
      FROM \`${this.projectId}.${this.logsDataset}.${this.metricsTable}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @hours HOUR)
    `;

    const [rows] = await this.bigquery.query({
      query,
      params: { hours }
    });

    // Get top operations
    const topOpsQuery = `
      SELECT
        operation,
        COUNT(*) as count,
        AVG(duration) as avgDuration
      FROM \`${this.projectId}.${this.logsDataset}.${this.metricsTable}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @hours HOUR)
      GROUP BY operation
      ORDER BY count DESC
      LIMIT 10
    `;

    const [topOpsRows] = await this.bigquery.query({
      query: topOpsQuery,
      params: { hours }
    });

    const stats = rows[0] || {};
    return {
      totalRequests: parseInt(stats.totalRequests) || 0,
      successRate: parseFloat(stats.successRate) || 0,
      averageDuration: parseFloat(stats.averageDuration) || 0,
      cacheHitRate: parseFloat(stats.cacheHitRate) || 0,
      errorRate: parseFloat(stats.errorRate) || 0,
      topOperations: topOpsRows.map(row => ({
        operation: row.operation,
        count: parseInt(row.count),
        avgDuration: parseFloat(row.avgDuration)
      }))
    };
  }

  /**
   * Get error logs
   */
  async getErrorLogs(hours: number = 24, limit: number = 50): Promise<LogEntry[]> {
    const query = `
      SELECT *
      FROM \`${this.projectId}.${this.logsDataset}.${this.logsTable}\`
      WHERE level = 'ERROR'
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @hours HOUR)
      ORDER BY timestamp DESC
      LIMIT @limit
    `;

    const [rows] = await this.bigquery.query({
      query,
      params: { hours, limit }
    });

    return rows.map(row => ({
      timestamp: row.timestamp,
      level: row.level,
      service: row.service,
      operation: row.operation,
      userId: row.userId,
      artisanProfession: row.artisanProfession,
      duration: row.duration,
      dataSources: row.dataSources,
      error: row.error,
      metadata: row.metadata
    }));
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(hours: number = 24): Promise<Array<{
    userId: string;
    requestCount: number;
    professions: string[];
    lastActivity: Date;
    averageDuration: number;
  }>> {
    const query = `
      SELECT
        userId,
        COUNT(*) as requestCount,
        ARRAY_AGG(DISTINCT artisanProfession) as professions,
        MAX(timestamp) as lastActivity,
        AVG(duration) as averageDuration
      FROM \`${this.projectId}.${this.logsDataset}.${this.logsTable}\`
      WHERE userId IS NOT NULL
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @hours HOUR)
      GROUP BY userId
      ORDER BY requestCount DESC
      LIMIT 100
    `;

    const [rows] = await this.bigquery.query({
      query,
      params: { hours }
    });

    return rows.map(row => ({
      userId: row.userId,
      requestCount: parseInt(row.requestCount),
      professions: row.professions,
      lastActivity: row.lastActivity,
      averageDuration: parseFloat(row.averageDuration)
    }));
  }

  /**
   * Initialize monitoring tables
   */
  async initializeMonitoring(): Promise<void> {
    await this.createLogsTable();
    await this.createMetricsTable();
  }

  /**
   * Create logs table
   */
  private async createLogsTable(): Promise<void> {
    const dataset = this.bigquery.dataset(this.logsDataset);
    const table = dataset.table(this.logsTable);

    const [exists] = await table.exists();
    if (exists) return;

    const schema = [
      { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'level', type: 'STRING', mode: 'REQUIRED' },
      { name: 'service', type: 'STRING', mode: 'REQUIRED' },
      { name: 'operation', type: 'STRING', mode: 'REQUIRED' },
      { name: 'userId', type: 'STRING', mode: 'NULLABLE' },
      { name: 'artisanProfession', type: 'STRING', mode: 'NULLABLE' },
      { name: 'duration', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'dataSources', type: 'STRING', mode: 'REPEATED' },
      { name: 'error', type: 'STRING', mode: 'NULLABLE' },
      { name: 'metadata', type: 'JSON', mode: 'NULLABLE' }
    ];

    await table.create({
      schema: { fields: schema },
      timePartitioning: { type: 'DAY', field: 'timestamp' }
    });
  }

  /**
   * Create metrics table
   */
  private async createMetricsTable(): Promise<void> {
    const dataset = this.bigquery.dataset(this.logsDataset);
    const table = dataset.table(this.metricsTable);

    const [exists] = await table.exists();
    if (exists) return;

    const schema = [
      { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'operation', type: 'STRING', mode: 'REQUIRED' },
      { name: 'duration', type: 'INTEGER', mode: 'REQUIRED' },
      { name: 'success', type: 'BOOLEAN', mode: 'REQUIRED' },
      { name: 'dataPoints', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'cacheHit', type: 'BOOLEAN', mode: 'NULLABLE' },
      { name: 'userId', type: 'STRING', mode: 'NULLABLE' }
    ];

    await table.create({
      schema: { fields: schema },
      timePartitioning: { type: 'DAY', field: 'timestamp' }
    });
  }

  /**
   * Insert log entry
   */
  private async insertLogEntry(entry: LogEntry): Promise<void> {
    const dataset = this.bigquery.dataset(this.logsDataset);
    const table = dataset.table(this.logsTable);

    await table.insert({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      service: entry.service,
      operation: entry.operation,
      userId: entry.userId || null,
      artisanProfession: entry.artisanProfession || null,
      duration: entry.duration || null,
      dataSources: entry.dataSources || [],
      error: entry.error || null,
      metadata: entry.metadata || null
    });
  }

  /**
   * Insert metrics
   */
  private async insertMetrics(metrics: PerformanceMetrics): Promise<void> {
    const dataset = this.bigquery.dataset(this.logsDataset);
    const table = dataset.table(this.metricsTable);

    await table.insert({
      timestamp: new Date().toISOString(),
      operation: metrics.operation,
      duration: metrics.duration,
      success: metrics.success,
      dataPoints: metrics.dataPoints,
      cacheHit: metrics.cacheHit,
      userId: metrics.userId || null
    });
  }
}

export const monitoringService = new MonitoringService();
