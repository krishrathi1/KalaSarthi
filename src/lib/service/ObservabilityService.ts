import connectDB from '../mongodb';

interface MetricData {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

interface APIMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  timestamp: Date;
}

interface AggregationMetric {
  jobId: string;
  jobType: 'backfill' | 'realtime' | 'batch';
  recordsProcessed: number;
  processingTime: number;
  lagTime?: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

interface AgentToolMetric {
  agentName: string;
  toolName: string;
  executionTime: number;
  success: boolean;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  timestamp: Date;
}

export class ObservabilityService {
  private static metrics: MetricData[] = [];
  private static apiMetrics: APIMetric[] = [];
  private static aggregationMetrics: AggregationMetric[] = [];
  private static agentMetrics: AgentToolMetric[] = [];

  /**
   * Record a custom metric
   */
  static recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: MetricData = {
      name,
      value,
      tags,
      timestamp: new Date()
    };

    this.metrics.push(metric);
    console.log(`📊 Metric: ${name} = ${value}`, tags);
  }

  /**
   * Record API performance metric
   */
  static recordAPIMetric(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string
  ): void {
    const metric: APIMetric = {
      endpoint,
      method,
      statusCode,
      responseTime,
      userId,
      timestamp: new Date()
    };

    this.apiMetrics.push(metric);

    // Record response time metric
    this.recordMetric('api.response_time', responseTime, {
      endpoint,
      method,
      status_code: statusCode.toString()
    });

    console.log(`🚀 API: ${method} ${endpoint} - ${statusCode} (${responseTime}ms)`);
  }

  /**
   * Record aggregation job metric
   */
  static recordAggregationMetric(
    jobId: string,
    jobType: 'backfill' | 'realtime' | 'batch',
    recordsProcessed: number,
    processingTime: number,
    success: boolean,
    lagTime?: number,
    error?: string
  ): void {
    const metric: AggregationMetric = {
      jobId,
      jobType,
      recordsProcessed,
      processingTime,
      lagTime,
      success,
      error,
      timestamp: new Date()
    };

    this.aggregationMetrics.push(metric);

    // Record processing metrics
    this.recordMetric('aggregation.records_processed', recordsProcessed, {
      job_id: jobId,
      job_type: jobType,
      success: success.toString()
    });

    this.recordMetric('aggregation.processing_time', processingTime, {
      job_id: jobId,
      job_type: jobType
    });

    if (lagTime !== undefined) {
      this.recordMetric('aggregation.lag_time', lagTime, {
        job_id: jobId,
        job_type: jobType
      });
    }

    console.log(`⚙️ Aggregation: ${jobType} job ${jobId} - ${recordsProcessed} records in ${processingTime}ms`);
  }

  /**
   * Record agent tool call metric
   */
  static recordAgentToolMetric(
    agentName: string,
    toolName: string,
    executionTime: number,
    success: boolean,
    inputTokens?: number,
    outputTokens?: number,
    error?: string
  ): void {
    const metric: AgentToolMetric = {
      agentName,
      toolName,
      executionTime,
      success,
      inputTokens,
      outputTokens,
      error,
      timestamp: new Date()
    };

    this.agentMetrics.push(metric);

    // Record execution time metric
    this.recordMetric('agent.tool_execution_time', executionTime, {
      agent_name: agentName,
      tool_name: toolName,
      success: success.toString()
    });

    if (inputTokens !== undefined) {
      this.recordMetric('agent.input_tokens', inputTokens, {
        agent_name: agentName,
        tool_name: toolName
      });
    }

    if (outputTokens !== undefined) {
      this.recordMetric('agent.output_tokens', outputTokens, {
        agent_name: agentName,
        tool_name: toolName
      });
    }

    console.log(`🤖 Agent: ${agentName}.${toolName} - ${executionTime}ms (${success ? 'success' : 'failed'})`);
  }

  /**
   * Get API performance metrics
   */
  static getAPIMetrics(
    timeRange: { start: Date; end: Date },
    filters?: { endpoint?: string; method?: string; statusCode?: number }
  ): APIMetric[] {
    return this.apiMetrics.filter(metric => {
      if (metric.timestamp < timeRange.start || metric.timestamp > timeRange.end) {
        return false;
      }

      if (filters?.endpoint && !metric.endpoint.includes(filters.endpoint)) {
        return false;
      }

      if (filters?.method && metric.method !== filters.method) {
        return false;
      }

      if (filters?.statusCode && metric.statusCode !== filters.statusCode) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get aggregation performance metrics
   */
  static getAggregationMetrics(
    timeRange: { start: Date; end: Date },
    filters?: { jobType?: string; success?: boolean }
  ): AggregationMetric[] {
    return this.aggregationMetrics.filter(metric => {
      if (metric.timestamp < timeRange.start || metric.timestamp > timeRange.end) {
        return false;
      }

      if (filters?.jobType && metric.jobType !== filters.jobType) {
        return false;
      }

      if (filters?.success !== undefined && metric.success !== filters.success) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get agent tool performance metrics
   */
  static getAgentMetrics(
    timeRange: { start: Date; end: Date },
    filters?: { agentName?: string; toolName?: string; success?: boolean }
  ): AgentToolMetric[] {
    return this.agentMetrics.filter(metric => {
      if (metric.timestamp < timeRange.start || metric.timestamp > timeRange.end) {
        return false;
      }

      if (filters?.agentName && metric.agentName !== filters.agentName) {
        return false;
      }

      if (filters?.toolName && metric.toolName !== filters.toolName) {
        return false;
      }

      if (filters?.success !== undefined && metric.success !== filters.success) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate API performance statistics
   */
  static calculateAPIStats(metrics: APIMetric[]): {
    totalRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    requestsPerSecond: number;
  } {
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        errorRate: 0,
        requestsPerSecond: 0
      };
    }

    const totalRequests = metrics.length;
    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
    const p95Index = Math.floor(totalRequests * 0.95);
    const p95ResponseTime = responseTimes[p95Index] || responseTimes[responseTimes.length - 1];

    const errorCount = metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = errorCount / totalRequests;

    // Calculate time span for RPS
    const timeSpan = metrics.length > 1
      ? (metrics[metrics.length - 1].timestamp.getTime() - metrics[0].timestamp.getTime()) / 1000
      : 1;
    const requestsPerSecond = totalRequests / timeSpan;

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100
    };
  }

  /**
   * Calculate aggregation performance statistics
   */
  static calculateAggregationStats(metrics: AggregationMetric[]): {
    totalJobs: number;
    successRate: number;
    averageProcessingTime: number;
    averageLagTime: number;
    totalRecordsProcessed: number;
  } {
    if (metrics.length === 0) {
      return {
        totalJobs: 0,
        successRate: 0,
        averageProcessingTime: 0,
        averageLagTime: 0,
        totalRecordsProcessed: 0
      };
    }

    const totalJobs = metrics.length;
    const successfulJobs = metrics.filter(m => m.success).length;
    const successRate = successfulJobs / totalJobs;

    const processingTimes = metrics.map(m => m.processingTime);
    const averageProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / totalJobs;

    const lagTimes = metrics.filter(m => m.lagTime !== undefined).map(m => m.lagTime!);
    const averageLagTime = lagTimes.length > 0
      ? lagTimes.reduce((sum, time) => sum + time, 0) / lagTimes.length
      : 0;

    const totalRecordsProcessed = metrics.reduce((sum, m) => sum + m.recordsProcessed, 0);

    return {
      totalJobs,
      successRate: Math.round(successRate * 100) / 100,
      averageProcessingTime: Math.round(averageProcessingTime),
      averageLagTime: Math.round(averageLagTime),
      totalRecordsProcessed
    };
  }

  /**
   * Calculate agent performance statistics
   */
  static calculateAgentStats(metrics: AgentToolMetric[]): {
    totalCalls: number;
    successRate: number;
    averageExecutionTime: number;
    totalTokensUsed: number;
  } {
    if (metrics.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        averageExecutionTime: 0,
        totalTokensUsed: 0
      };
    }

    const totalCalls = metrics.length;
    const successfulCalls = metrics.filter(m => m.success).length;
    const successRate = successfulCalls / totalCalls;

    const executionTimes = metrics.map(m => m.executionTime);
    const averageExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / totalCalls;

    const totalTokensUsed = metrics.reduce((sum, m) =>
      sum + (m.inputTokens || 0) + (m.outputTokens || 0), 0
    );

    return {
      totalCalls,
      successRate: Math.round(successRate * 100) / 100,
      averageExecutionTime: Math.round(averageExecutionTime),
      totalTokensUsed
    };
  }

  /**
   * Get system health metrics
   */
  static getSystemHealth(): {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    activeConnections: number;
    errorRate: number;
  } {
    // Mock system health - in real implementation, collect actual metrics
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeConnections: Math.floor(Math.random() * 100), // Mock
      errorRate: Math.random() * 0.05 // Mock 0-5% error rate
    };
  }

  /**
   * Export metrics for monitoring dashboard
   */
  static exportMetrics(): {
    customMetrics: MetricData[];
    apiStats: any;
    aggregationStats: any;
    agentStats: any;
    systemHealth: any;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentAPIMetrics = this.getAPIMetrics({ start: oneHourAgo, end: now });
    const recentAggregationMetrics = this.getAggregationMetrics({ start: oneHourAgo, end: now });
    const recentAgentMetrics = this.getAgentMetrics({ start: oneHourAgo, end: now });

    return {
      customMetrics: this.metrics.filter(m => m.timestamp >= oneHourAgo),
      apiStats: this.calculateAPIStats(recentAPIMetrics),
      aggregationStats: this.calculateAggregationStats(recentAggregationMetrics),
      agentStats: this.calculateAgentStats(recentAgentMetrics),
      systemHealth: this.getSystemHealth()
    };
  }
}