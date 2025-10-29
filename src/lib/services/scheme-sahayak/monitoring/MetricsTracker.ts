/**
 * Performance Metrics Tracker
 * Tracks and aggregates performance metrics
 * 
 * Requirements: 10.3, 10.5
 */

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'COUNTER',
  GAUGE = 'GAUGE',
  HISTOGRAM = 'HISTOGRAM',
  TIMER = 'TIMER'
}

/**
 * Metric data point
 */
export interface MetricDataPoint {
  name: string;
  type: MetricType;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

/**
 * Aggregated metric
 */
export interface AggregatedMetric {
  name: string;
  type: MetricType;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  tags?: Record<string, string>;
}

/**
 * Metrics summary
 */
export interface MetricsSummary {
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  metrics: AggregatedMetric[];
}

/**
 * Timer for measuring operation duration
 */
export class Timer {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = Date.now();
  }

  stop(): number {
    this.endTime = Date.now();
    return this.duration();
  }

  duration(): number {
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }
}

/**
 * Metrics Tracker Class
 */
export class MetricsTracker {
  private static instance: MetricsTracker;
  private metrics: Map<string, MetricDataPoint[]> = new Map();
  private maxDataPoints = 10000;

  private constructor() {}

  static getInstance(): MetricsTracker {
    if (!MetricsTracker.instance) {
      MetricsTracker.instance = new MetricsTracker();
    }
    return MetricsTracker.instance;
  }

  /**
   * Record a counter metric
   */
  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      type: MetricType.COUNTER,
      value,
      timestamp: new Date(),
      tags
    });
  }

  /**
   * Record a gauge metric
   */
  recordGauge(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      type: MetricType.GAUGE,
      value,
      timestamp: new Date(),
      tags
    });
  }

  /**
   * Record a histogram metric
   */
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      type: MetricType.HISTOGRAM,
      value,
      timestamp: new Date(),
      tags
    });
  }

  /**
   * Start a timer
   */
  startTimer(): Timer {
    return new Timer();
  }

  /**
   * Record timer duration
   */
  recordTimer(name: string, duration: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      type: MetricType.TIMER,
      value: duration,
      timestamp: new Date(),
      tags
    });
  }

  /**
   * Measure and record operation duration
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const timer = this.startTimer();
    try {
      const result = await operation();
      this.recordTimer(name, timer.stop(), tags);
      return result;
    } catch (error) {
      this.recordTimer(name, timer.stop(), { ...tags, error: 'true' });
      throw error;
    }
  }

  /**
   * Measure and record synchronous operation duration
   */
  measure<T>(
    name: string,
    operation: () => T,
    tags?: Record<string, string>
  ): T {
    const timer = this.startTimer();
    try {
      const result = operation();
      this.recordTimer(name, timer.stop(), tags);
      return result;
    } catch (error) {
      this.recordTimer(name, timer.stop(), { ...tags, error: 'true' });
      throw error;
    }
  }

  /**
   * Record a metric data point
   */
  private recordMetric(dataPoint: MetricDataPoint): void {
    const key = this.getMetricKey(dataPoint.name, dataPoint.tags);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const dataPoints = this.metrics.get(key)!;
    dataPoints.push(dataPoint);

    // Maintain max data points
    if (dataPoints.length > this.maxDataPoints) {
      dataPoints.shift();
    }
  }

  /**
   * Get metric key with tags
   */
  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${name}{${tagString}}`;
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(
    metricName?: string,
    startTime?: Date,
    endTime?: Date
  ): AggregatedMetric[] {
    const results: AggregatedMetric[] = [];

    for (const [key, dataPoints] of this.metrics) {
      // Filter by metric name if provided
      if (metricName && !key.startsWith(metricName)) {
        continue;
      }

      // Filter by time range
      let filteredPoints = dataPoints;
      if (startTime || endTime) {
        filteredPoints = dataPoints.filter(point => {
          if (startTime && point.timestamp < startTime) return false;
          if (endTime && point.timestamp > endTime) return false;
          return true;
        });
      }

      if (filteredPoints.length === 0) continue;

      const aggregated = this.aggregateDataPoints(filteredPoints);
      results.push(aggregated);
    }

    return results;
  }

  /**
   * Aggregate data points
   */
  private aggregateDataPoints(dataPoints: MetricDataPoint[]): AggregatedMetric {
    const values = dataPoints.map(p => p.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const avg = sum / count;

    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    return {
      name: dataPoints[0].name,
      type: dataPoints[0].type,
      count,
      sum,
      min: values[0],
      max: values[values.length - 1],
      avg,
      p50: values[p50Index] || 0,
      p95: values[p95Index] || 0,
      p99: values[p99Index] || 0,
      tags: dataPoints[0].tags
    };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(startTime?: Date, endTime?: Date): MetricsSummary {
    const metrics = this.getAggregatedMetrics(undefined, startTime, endTime);
    
    const actualStart = startTime || new Date(Date.now() - 3600000); // Last hour
    const actualEnd = endTime || new Date();

    return {
      timestamp: new Date(),
      period: {
        start: actualStart,
        end: actualEnd
      },
      metrics
    };
  }

  /**
   * Get specific metric
   */
  getMetric(name: string, tags?: Record<string, string>): MetricDataPoint[] {
    const key = this.getMetricKey(name, tags);
    return this.metrics.get(key) || [];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThan: Date): void {
    for (const [key, dataPoints] of this.metrics) {
      const filtered = dataPoints.filter(point => point.timestamp >= olderThan);
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filtered);
      }
    }
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    const names = new Set<string>();
    for (const key of this.metrics.keys()) {
      const name = key.split('{')[0];
      names.add(name);
    }
    return Array.from(names);
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    metrics: MetricDataPoint[];
    summary: MetricsSummary;
  } {
    const allMetrics: MetricDataPoint[] = [];
    for (const dataPoints of this.metrics.values()) {
      allMetrics.push(...dataPoints);
    }

    return {
      metrics: allMetrics,
      summary: this.getMetricsSummary()
    };
  }
}

/**
 * Convenience function to get metrics tracker instance
 */
export const getMetricsTracker = () => MetricsTracker.getInstance();

/**
 * Decorator for measuring method execution time
 */
export function Measure(metricName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const tracker = getMetricsTracker();
      return tracker.measureAsync(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
