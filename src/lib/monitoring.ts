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

export interface ConversationMetrics {
  conversationId: string;
  userId: string;
  messageCount: number;
  duration: number; // Total conversation duration in ms
  voiceUsage: number; // Percentage of voice interactions
  errorCount: number;
  completionRate: number; // Percentage of successful interactions
  userSatisfaction?: number; // 1-5 rating if available
  intentsRecognized: string[];
  averageResponseTime: number;
  contextSwitches: number; // Number of topic changes
}

export interface SystemHealthMetrics {
  timestamp: Date;
  cpu: number;
  memory: number;
  diskUsage: number;
  networkLatency: number;
  activeConnections: number;
  errorRate: number;
  responseTime: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string; // e.g., "error_rate > 0.05"
  threshold: number;
  timeWindow: number; // in minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export class MonitoringService {
  private bigquery: BigQuery | null = null;
  private projectId: string;
  private logsDataset = 'monitoring';
  private logsTable = 'enhanced_artisan_buddy_logs';
  private metricsTable = 'performance_metrics';
  private conversationTable = 'conversation_metrics';
  private healthTable = 'system_health';
  private alertRules: AlertRule[] = [];
  private alertListeners: ((alert: { rule: AlertRule; value: number; timestamp: Date }) => void)[] = [];
  private isServerSide: boolean;

  constructor() {
    this.isServerSide = typeof window === 'undefined';
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0314311341';

    // Only initialize BigQuery on server-side
    if (this.isServerSide) {
      this.bigquery! = new BigQuery({
        projectId: this.projectId,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json'
      });

      // Initialize default alert rules
      this.initializeDefaultAlerts();

      // Start health monitoring
      this.startHealthMonitoring();
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlerts(): void {
    this.alertRules = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: 'error_rate > 0.05',
        threshold: 0.05,
        timeWindow: 5,
        severity: 'high',
        enabled: true
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        condition: 'avg_response_time > 3000',
        threshold: 3000,
        timeWindow: 5,
        severity: 'medium',
        enabled: true
      },
      {
        id: 'low-conversation-completion',
        name: 'Low Conversation Completion Rate',
        condition: 'completion_rate < 0.8',
        threshold: 0.8,
        timeWindow: 15,
        severity: 'medium',
        enabled: true
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        condition: 'memory_usage > 0.9',
        threshold: 0.9,
        timeWindow: 5,
        severity: 'critical',
        enabled: true
      }
    ];
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Monitor system health every minute
    setInterval(async () => {
      try {
        const healthMetrics = await this.collectSystemHealth();
        await this.recordSystemHealth(healthMetrics);
        await this.checkAlerts();
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 60000);
  }

  /**
   * Log an operation
   */
  async log(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date()
    };

    // Only log to BigQuery on server-side
    if (!this.isServerSide || !this.bigquery!) {
      // Fallback to console logging on client-side
      console.log(`[${logEntry.level}] ${logEntry.service}:${logEntry.operation}`, {
        userId: logEntry.userId,
        duration: logEntry.duration,
        error: logEntry.error
      });
      return;
    }

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
    if (!this.isServerSide || !this.bigquery!) {
      return;
    }

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

    const [rows] = await this.bigquery!!.query({
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

    const [topOpsRows] = await this.bigquery!.query({
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

    const [rows] = await this.bigquery!.query({
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

    const [rows] = await this.bigquery!.query({
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
   * Record conversation metrics
   */
  async recordConversationMetrics(metrics: ConversationMetrics): Promise<void> {
    try {
      await this.insertConversationMetrics(metrics);
    } catch (error) {
      console.error('Failed to record conversation metrics:', error);
    }
  }

  /**
   * Record system health metrics
   */
  async recordSystemHealth(metrics: SystemHealthMetrics): Promise<void> {
    try {
      await this.insertSystemHealth(metrics);
    } catch (error) {
      console.error('Failed to record system health:', error);
    }
  }

  /**
   * Get conversation quality analytics
   */
  async getConversationAnalytics(hours: number = 24): Promise<{
    totalConversations: number;
    averageMessageCount: number;
    averageDuration: number;
    voiceUsageRate: number;
    completionRate: number;
    averageResponseTime: number;
    topIntents: Array<{ intent: string; count: number }>;
    userSatisfactionScore: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as totalConversations,
        AVG(messageCount) as averageMessageCount,
        AVG(duration) as averageDuration,
        AVG(voiceUsage) as voiceUsageRate,
        AVG(completionRate) as completionRate,
        AVG(averageResponseTime) as averageResponseTime,
        AVG(userSatisfaction) as userSatisfactionScore
      FROM \`${this.projectId}.${this.logsDataset}.${this.conversationTable}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @hours HOUR)
    `;

    const [rows] = await this.bigquery!.query({
      query,
      params: { hours }
    });

    // Get top intents
    const intentsQuery = `
      SELECT
        intent,
        COUNT(*) as count
      FROM \`${this.projectId}.${this.logsDataset}.${this.conversationTable}\`,
      UNNEST(intentsRecognized) as intent
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @hours HOUR)
      GROUP BY intent
      ORDER BY count DESC
      LIMIT 10
    `;

    const [intentsRows] = await this.bigquery!.query({
      query: intentsQuery,
      params: { hours }
    });

    const stats = rows[0] || {};
    return {
      totalConversations: parseInt(stats.totalConversations) || 0,
      averageMessageCount: parseFloat(stats.averageMessageCount) || 0,
      averageDuration: parseFloat(stats.averageDuration) || 0,
      voiceUsageRate: parseFloat(stats.voiceUsageRate) || 0,
      completionRate: parseFloat(stats.completionRate) || 0,
      averageResponseTime: parseFloat(stats.averageResponseTime) || 0,
      userSatisfactionScore: parseFloat(stats.userSatisfactionScore) || 0,
      topIntents: intentsRows.map(row => ({
        intent: row.intent,
        count: parseInt(row.count)
      }))
    };
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: SystemHealthMetrics;
    alerts: Array<{ rule: AlertRule; triggered: boolean; value?: number }>;
  }> {
    // Get latest health metrics
    const query = `
      SELECT *
      FROM \`${this.projectId}.${this.logsDataset}.${this.healthTable}\`
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const [rows] = await this.bigquery!.query({ query });
    const latestMetrics = rows[0] as SystemHealthMetrics || await this.collectSystemHealth();

    // Check alert status
    const alerts = await this.evaluateAlerts(latestMetrics);
    const criticalAlerts = alerts.filter(a => a.triggered && a.rule.severity === 'critical');
    const highAlerts = alerts.filter(a => a.triggered && a.rule.severity === 'high');

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'unhealthy';
    } else if (highAlerts.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      metrics: latestMetrics,
      alerts
    };
  }

  /**
   * Collect current system health metrics
   */
  private async collectSystemHealth(): Promise<SystemHealthMetrics> {
    // In a real implementation, these would come from system monitoring
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: new Date(),
      cpu: 0, // Would need actual CPU monitoring
      memory: memoryUsage.heapUsed / memoryUsage.heapTotal,
      diskUsage: 0, // Would need disk monitoring
      networkLatency: 0, // Would need network monitoring
      activeConnections: 0, // Would need connection monitoring
      errorRate: await this.calculateCurrentErrorRate(),
      responseTime: await this.calculateCurrentResponseTime()
    };
  }

  /**
   * Calculate current error rate
   */
  private async calculateCurrentErrorRate(): Promise<number> {
    try {
      const query = `
        SELECT
          SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as errorRate
        FROM \`${this.projectId}.${this.logsDataset}.${this.logsTable}\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
      `;

      const [rows] = await this.bigquery!.query({ query });
      return parseFloat(rows[0]?.errorRate) || 0;
    } catch (error) {
      console.error('Failed to calculate error rate:', error);
      return 0;
    }
  }

  /**
   * Calculate current response time
   */
  private async calculateCurrentResponseTime(): Promise<number> {
    try {
      const query = `
        SELECT AVG(duration) as avgResponseTime
        FROM \`${this.projectId}.${this.logsDataset}.${this.metricsTable}\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
      `;

      const [rows] = await this.bigquery!.query({ query });
      return parseFloat(rows[0]?.avgResponseTime) || 0;
    } catch (error) {
      console.error('Failed to calculate response time:', error);
      return 0;
    }
  }

  /**
   * Check alerts against current metrics
   */
  private async checkAlerts(): Promise<void> {
    const currentMetrics = await this.collectSystemHealth();
    const alerts = await this.evaluateAlerts(currentMetrics);

    for (const alert of alerts) {
      if (alert.triggered) {
        this.triggerAlert(alert.rule, alert.value || 0);
      }
    }
  }

  /**
   * Evaluate alerts against metrics
   */
  private async evaluateAlerts(metrics: SystemHealthMetrics): Promise<Array<{ rule: AlertRule; triggered: boolean; value?: number }>> {
    const results: Array<{ rule: AlertRule; triggered: boolean; value?: number }> = [];

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      let triggered = false;
      let value: number | undefined;

      switch (rule.id) {
        case 'high-error-rate':
          value = metrics.errorRate / 100; // Convert percentage to decimal
          triggered = value > rule.threshold;
          break;
        case 'slow-response-time':
          value = metrics.responseTime;
          triggered = value > rule.threshold;
          break;
        case 'high-memory-usage':
          value = metrics.memory;
          triggered = value > rule.threshold;
          break;
        case 'low-conversation-completion':
          // Would need to calculate from conversation metrics
          value = await this.getRecentCompletionRate();
          triggered = value < rule.threshold;
          break;
      }

      results.push({ rule, triggered, value });
    }

    return results;
  }

  /**
   * Get recent conversation completion rate
   */
  private async getRecentCompletionRate(): Promise<number> {
    try {
      const query = `
        SELECT AVG(completionRate) as avgCompletionRate
        FROM \`${this.projectId}.${this.logsDataset}.${this.conversationTable}\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE)
      `;

      const [rows] = await this.bigquery!.query({ query });
      return parseFloat(rows[0]?.avgCompletionRate) || 1;
    } catch (error) {
      console.error('Failed to get completion rate:', error);
      return 1;
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(rule: AlertRule, value: number): void {
    const alert = { rule, value, timestamp: new Date() };

    console.warn(`🚨 ALERT: ${rule.name} - Value: ${value}, Threshold: ${rule.threshold}`);

    // Notify listeners
    this.alertListeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        console.error('Alert listener error:', error);
      }
    });
  }

  /**
   * Subscribe to alerts
   */
  onAlert(listener: (alert: { rule: AlertRule; value: number; timestamp: Date }) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      const index = this.alertListeners.indexOf(listener);
      if (index > -1) {
        this.alertListeners.splice(index, 1);
      }
    };
  }

  /**
   * Add or update alert rule
   */
  addAlertRule(rule: AlertRule): void {
    const existingIndex = this.alertRules.findIndex(r => r.id === rule.id);
    if (existingIndex > -1) {
      this.alertRules[existingIndex] = rule;
    } else {
      this.alertRules.push(rule);
    }
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Initialize monitoring tables
   */
  async initializeMonitoring(): Promise<void> {
    await Promise.all([
      this.createLogsTable(),
      this.createMetricsTable(),
      this.createConversationTable(),
      this.createHealthTable()
    ]);
  }

  /**
   * Create logs table
   */
  private async createLogsTable(): Promise<void> {
    const dataset = this.bigquery!.dataset(this.logsDataset);
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
    const dataset = this.bigquery!.dataset(this.logsDataset);
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
   * Create conversation metrics table
   */
  private async createConversationTable(): Promise<void> {
    const dataset = this.bigquery!.dataset(this.logsDataset);
    const table = dataset.table(this.conversationTable);

    const [exists] = await table.exists();
    if (exists) return;

    const schema = [
      { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'conversationId', type: 'STRING', mode: 'REQUIRED' },
      { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
      { name: 'messageCount', type: 'INTEGER', mode: 'REQUIRED' },
      { name: 'duration', type: 'INTEGER', mode: 'REQUIRED' },
      { name: 'voiceUsage', type: 'FLOAT', mode: 'REQUIRED' },
      { name: 'errorCount', type: 'INTEGER', mode: 'REQUIRED' },
      { name: 'completionRate', type: 'FLOAT', mode: 'REQUIRED' },
      { name: 'userSatisfaction', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'intentsRecognized', type: 'STRING', mode: 'REPEATED' },
      { name: 'averageResponseTime', type: 'FLOAT', mode: 'REQUIRED' },
      { name: 'contextSwitches', type: 'INTEGER', mode: 'REQUIRED' }
    ];

    await table.create({
      schema: { fields: schema },
      timePartitioning: { type: 'DAY', field: 'timestamp' }
    });
  }

  /**
   * Create system health table
   */
  private async createHealthTable(): Promise<void> {
    const dataset = this.bigquery!.dataset(this.logsDataset);
    const table = dataset.table(this.healthTable);

    const [exists] = await table.exists();
    if (exists) return;

    const schema = [
      { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'cpu', type: 'FLOAT', mode: 'REQUIRED' },
      { name: 'memory', type: 'FLOAT', mode: 'REQUIRED' },
      { name: 'diskUsage', type: 'FLOAT', mode: 'REQUIRED' },
      { name: 'networkLatency', type: 'FLOAT', mode: 'REQUIRED' },
      { name: 'activeConnections', type: 'INTEGER', mode: 'REQUIRED' },
      { name: 'errorRate', type: 'FLOAT', mode: 'REQUIRED' },
      { name: 'responseTime', type: 'FLOAT', mode: 'REQUIRED' }
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
    const dataset = this.bigquery!.dataset(this.logsDataset);
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
    const dataset = this.bigquery!.dataset(this.logsDataset);
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

  /**
   * Insert conversation metrics
   */
  private async insertConversationMetrics(metrics: ConversationMetrics): Promise<void> {
    const dataset = this.bigquery!.dataset(this.logsDataset);
    const table = dataset.table(this.conversationTable);

    await table.insert({
      timestamp: new Date().toISOString(),
      conversationId: metrics.conversationId,
      userId: metrics.userId,
      messageCount: metrics.messageCount,
      duration: metrics.duration,
      voiceUsage: metrics.voiceUsage,
      errorCount: metrics.errorCount,
      completionRate: metrics.completionRate,
      userSatisfaction: metrics.userSatisfaction || null,
      intentsRecognized: metrics.intentsRecognized,
      averageResponseTime: metrics.averageResponseTime,
      contextSwitches: metrics.contextSwitches
    });
  }

  /**
   * Insert system health metrics
   */
  private async insertSystemHealth(metrics: SystemHealthMetrics): Promise<void> {
    const dataset = this.bigquery!.dataset(this.logsDataset);
    const table = dataset.table(this.healthTable);

    await table.insert({
      timestamp: metrics.timestamp.toISOString(),
      cpu: metrics.cpu,
      memory: metrics.memory,
      diskUsage: metrics.diskUsage,
      networkLatency: metrics.networkLatency,
      activeConnections: metrics.activeConnections,
      errorRate: metrics.errorRate,
      responseTime: metrics.responseTime
    });
  }
}

export const monitoringService = new MonitoringService();
