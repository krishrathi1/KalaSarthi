/**
 * Model Performance Monitor
 * Real-time monitoring and alerting for ML model performance
 * Tracks prediction accuracy, drift detection, and system health
 */

import { ModelPerformanceMetrics } from './MLModelTrainingPipeline';

/**
 * Performance alert types
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface PerformanceAlert {
  id: string;
  severity: AlertSeverity;
  metric: string;
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  accuracyThreshold: number; // Minimum acceptable accuracy
  f1ScoreThreshold: number; // Minimum acceptable F1 score
  calibrationErrorThreshold: number; // Maximum acceptable calibration error
  driftDetectionWindow: number; // Days to check for drift
  alertCooldownMinutes: number; // Minimum time between similar alerts
  enableRealTimeMonitoring: boolean;
}

/**
 * Performance trend data
 */
export interface PerformanceTrend {
  metric: string;
  values: Array<{ timestamp: Date; value: number }>;
  trend: 'improving' | 'stable' | 'degrading';
  changeRate: number; // Rate of change per day
}

/**
 * Model drift detection result
 */
export interface DriftDetectionResult {
  isDrifting: boolean;
  driftScore: number; // 0-1, higher means more drift
  affectedFeatures: string[];
  recommendation: string;
  detectedAt: Date;
}

/**
 * Real-time prediction monitoring
 */
interface PredictionLog {
  predictionId: string;
  timestamp: Date;
  features: Record<string, number>;
  predictedProbability: number;
  actualOutcome?: 'approved' | 'rejected';
  processingTime: number; // milliseconds
  modelVersion: string;
}

/**
 * Model Performance Monitor
 * Provides real-time monitoring and alerting
 */
export class ModelPerformanceMonitor {
  private config: MonitoringConfig;
  private alerts: PerformanceAlert[];
  private performanceHistory: Map<string, PerformanceTrend>;
  private predictionLogs: PredictionLog[];
  private lastAlertTime: Map<string, Date>;
  private monitoringInterval: NodeJS.Timeout | null;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      accuracyThreshold: 0.75, // 75% minimum
      f1ScoreThreshold: 0.70, // 70% minimum
      calibrationErrorThreshold: 0.20, // 20% maximum
      driftDetectionWindow: 7, // 7 days
      alertCooldownMinutes: 60, // 1 hour
      enableRealTimeMonitoring: true,
      ...config
    };

    this.alerts = [];
    this.performanceHistory = new Map();
    this.predictionLogs = [];
    this.lastAlertTime = new Map();
    this.monitoringInterval = null;

    this.initializePerformanceHistory();
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(): void {
    if (!this.config.enableRealTimeMonitoring) {
      console.log('Real-time monitoring is disabled');
      return;
    }

    console.log('Starting model performance monitoring...');

    // Check performance every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);

    console.log('Model performance monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Model performance monitoring stopped');
    }
  }

  /**
   * Record model performance metrics
   */
  recordPerformance(metrics: ModelPerformanceMetrics): void {
    const timestamp = new Date();

    // Update performance history for each metric
    this.updatePerformanceHistory('accuracy', metrics.accuracy, timestamp);
    this.updatePerformanceHistory('precision', metrics.precision, timestamp);
    this.updatePerformanceHistory('recall', metrics.recall, timestamp);
    this.updatePerformanceHistory('f1Score', metrics.f1Score, timestamp);
    this.updatePerformanceHistory('auc', metrics.auc, timestamp);
    this.updatePerformanceHistory('calibrationError', metrics.calibrationError, timestamp);

    // Check for performance issues
    this.checkPerformanceThresholds(metrics);
  }

  /**
   * Log a prediction for monitoring
   */
  logPrediction(log: PredictionLog): void {
    this.predictionLogs.push(log);

    // Keep only recent predictions (last 7 days)
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.predictionLogs = this.predictionLogs.filter(
      p => p.timestamp > cutoffDate
    );

    // Check for anomalies in real-time
    if (this.config.enableRealTimeMonitoring) {
      this.checkPredictionAnomaly(log);
    }
  }

  /**
   * Update prediction with actual outcome
   */
  updatePredictionOutcome(
    predictionId: string,
    outcome: 'approved' | 'rejected'
  ): void {
    const prediction = this.predictionLogs.find(p => p.predictionId === predictionId);
    if (prediction) {
      prediction.actualOutcome = outcome;

      // Calculate prediction accuracy
      const predicted = prediction.predictedProbability > 0.5;
      const actual = outcome === 'approved';
      const correct = predicted === actual;

      if (!correct) {
        // Log incorrect prediction for analysis
        console.log(`Incorrect prediction: ${predictionId}, predicted: ${predicted}, actual: ${actual}`);
      }
    }
  }

  /**
   * Detect model drift
   */
  detectDrift(): DriftDetectionResult {
    const recentPredictions = this.getRecentPredictions(this.config.driftDetectionWindow);
    
    if (recentPredictions.length < 50) {
      return {
        isDrifting: false,
        driftScore: 0,
        affectedFeatures: [],
        recommendation: 'Insufficient data for drift detection',
        detectedAt: new Date()
      };
    }

    // Calculate feature distribution drift
    const featureDrift = this.calculateFeatureDrift(recentPredictions);
    
    // Calculate prediction distribution drift
    const predictionDrift = this.calculatePredictionDrift(recentPredictions);

    // Combine drift scores
    const driftScore = (featureDrift.score + predictionDrift.score) / 2;
    const isDrifting = driftScore > 0.3; // 30% drift threshold

    const affectedFeatures = featureDrift.features
      .filter(f => f.drift > 0.2)
      .map(f => f.name);

    let recommendation = '';
    if (isDrifting) {
      if (driftScore > 0.5) {
        recommendation = 'Critical drift detected. Immediate model retraining recommended.';
      } else {
        recommendation = 'Moderate drift detected. Schedule model retraining within 48 hours.';
      }
    } else {
      recommendation = 'No significant drift detected. Continue monitoring.';
    }

    return {
      isDrifting,
      driftScore,
      affectedFeatures,
      recommendation,
      detectedAt: new Date()
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`Alert resolved: ${alertId}`);
    }
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(): PerformanceTrend[] {
    return Array.from(this.performanceHistory.values());
  }

  /**
   * Get specific metric trend
   */
  getMetricTrend(metric: string): PerformanceTrend | undefined {
    return this.performanceHistory.get(metric);
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStatistics(): {
    totalPredictions: number;
    recentPredictions: number;
    activeAlerts: number;
    averageProcessingTime: number;
    predictionAccuracy: number;
  } {
    const recentPredictions = this.getRecentPredictions(1); // Last 24 hours
    const predictionsWithOutcome = this.predictionLogs.filter(p => p.actualOutcome);
    
    const correctPredictions = predictionsWithOutcome.filter(p => {
      const predicted = p.predictedProbability > 0.5;
      const actual = p.actualOutcome === 'approved';
      return predicted === actual;
    }).length;

    const accuracy = predictionsWithOutcome.length > 0
      ? correctPredictions / predictionsWithOutcome.length
      : 0;

    const avgProcessingTime = recentPredictions.length > 0
      ? recentPredictions.reduce((sum, p) => sum + p.processingTime, 0) / recentPredictions.length
      : 0;

    return {
      totalPredictions: this.predictionLogs.length,
      recentPredictions: recentPredictions.length,
      activeAlerts: this.getActiveAlerts().length,
      averageProcessingTime: avgProcessingTime,
      predictionAccuracy: accuracy
    };
  }

  /**
   * Generate monitoring report
   */
  generateReport(): {
    summary: string;
    metrics: Record<string, any>;
    alerts: PerformanceAlert[];
    trends: PerformanceTrend[];
    driftAnalysis: DriftDetectionResult;
    recommendations: string[];
  } {
    const stats = this.getMonitoringStatistics();
    const trends = this.getPerformanceTrends();
    const driftAnalysis = this.detectDrift();
    const activeAlerts = this.getActiveAlerts();

    // Generate summary
    let summary = `Model Performance Report - ${new Date().toISOString()}\n`;
    summary += `Total Predictions: ${stats.totalPredictions}\n`;
    summary += `Recent Predictions (24h): ${stats.recentPredictions}\n`;
    summary += `Prediction Accuracy: ${(stats.predictionAccuracy * 100).toFixed(2)}%\n`;
    summary += `Active Alerts: ${stats.activeAlerts}\n`;
    summary += `Drift Status: ${driftAnalysis.isDrifting ? 'DRIFTING' : 'STABLE'}\n`;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (stats.predictionAccuracy < this.config.accuracyThreshold) {
      recommendations.push('Model accuracy below threshold - consider retraining');
    }
    
    if (driftAnalysis.isDrifting) {
      recommendations.push(driftAnalysis.recommendation);
    }
    
    if (activeAlerts.length > 0) {
      recommendations.push(`${activeAlerts.length} active alerts require attention`);
    }

    if (stats.averageProcessingTime > 3000) {
      recommendations.push('Average processing time exceeds 3 seconds - optimize inference');
    }

    return {
      summary,
      metrics: stats,
      alerts: activeAlerts,
      trends,
      driftAnalysis,
      recommendations
    };
  }

  // ==================== Private Methods ====================

  /**
   * Initialize performance history
   */
  private initializePerformanceHistory(): void {
    const metrics = ['accuracy', 'precision', 'recall', 'f1Score', 'auc', 'calibrationError'];
    
    for (const metric of metrics) {
      this.performanceHistory.set(metric, {
        metric,
        values: [],
        trend: 'stable',
        changeRate: 0
      });
    }
  }

  /**
   * Update performance history
   */
  private updatePerformanceHistory(
    metric: string,
    value: number,
    timestamp: Date
  ): void {
    const trend = this.performanceHistory.get(metric);
    if (!trend) return;

    trend.values.push({ timestamp, value });

    // Keep only last 30 days
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    trend.values = trend.values.filter(v => v.timestamp > cutoffDate);

    // Calculate trend
    if (trend.values.length >= 2) {
      const recent = trend.values.slice(-7); // Last 7 data points
      const older = trend.values.slice(-14, -7); // Previous 7 data points

      if (older.length > 0) {
        const recentAvg = recent.reduce((sum, v) => sum + v.value, 0) / recent.length;
        const olderAvg = older.reduce((sum, v) => sum + v.value, 0) / older.length;
        const change = recentAvg - olderAvg;

        trend.changeRate = change;

        if (change > 0.05) {
          trend.trend = 'improving';
        } else if (change < -0.05) {
          trend.trend = 'degrading';
        } else {
          trend.trend = 'stable';
        }
      }
    }
  }

  /**
   * Check performance thresholds
   */
  private checkPerformanceThresholds(metrics: ModelPerformanceMetrics): void {
    // Check accuracy
    if (metrics.accuracy < this.config.accuracyThreshold) {
      this.createAlert(
        'critical',
        'accuracy',
        `Model accuracy (${(metrics.accuracy * 100).toFixed(2)}%) below threshold (${(this.config.accuracyThreshold * 100).toFixed(2)}%)`,
        metrics.accuracy,
        this.config.accuracyThreshold
      );
    }

    // Check F1 score
    if (metrics.f1Score < this.config.f1ScoreThreshold) {
      this.createAlert(
        'warning',
        'f1Score',
        `F1 score (${metrics.f1Score.toFixed(3)}) below threshold (${this.config.f1ScoreThreshold.toFixed(3)})`,
        metrics.f1Score,
        this.config.f1ScoreThreshold
      );
    }

    // Check calibration error
    if (metrics.calibrationError > this.config.calibrationErrorThreshold) {
      this.createAlert(
        'warning',
        'calibrationError',
        `Calibration error (${(metrics.calibrationError * 100).toFixed(2)}%) above threshold (${(this.config.calibrationErrorThreshold * 100).toFixed(2)}%)`,
        metrics.calibrationError,
        this.config.calibrationErrorThreshold
      );
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    severity: AlertSeverity,
    metric: string,
    message: string,
    currentValue: number,
    threshold: number
  ): void {
    // Check cooldown period
    const lastAlert = this.lastAlertTime.get(metric);
    if (lastAlert) {
      const minutesSinceLastAlert = (Date.now() - lastAlert.getTime()) / (1000 * 60);
      if (minutesSinceLastAlert < this.config.alertCooldownMinutes) {
        return; // Skip alert due to cooldown
      }
    }

    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity,
      metric,
      message,
      currentValue,
      threshold,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    this.lastAlertTime.set(metric, new Date());

    console.log(`[${severity.toUpperCase()}] ${message}`);
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    const stats = this.getMonitoringStatistics();
    
    console.log('=== Model Health Check ===');
    console.log(`Predictions (24h): ${stats.recentPredictions}`);
    console.log(`Accuracy: ${(stats.predictionAccuracy * 100).toFixed(2)}%`);
    console.log(`Avg Processing Time: ${stats.averageProcessingTime.toFixed(2)}ms`);
    console.log(`Active Alerts: ${stats.activeAlerts}`);

    // Check for drift
    const drift = this.detectDrift();
    if (drift.isDrifting) {
      console.log(`⚠️  Model drift detected: ${drift.driftScore.toFixed(3)}`);
    }
  }

  /**
   * Check for prediction anomalies
   */
  private checkPredictionAnomaly(log: PredictionLog): void {
    // Check processing time
    if (log.processingTime > 5000) { // 5 seconds
      this.createAlert(
        'warning',
        'processingTime',
        `Slow prediction detected: ${log.processingTime}ms`,
        log.processingTime,
        3000
      );
    }

    // Check for extreme probabilities (potential overconfidence)
    if (log.predictedProbability > 0.95 || log.predictedProbability < 0.05) {
      console.log(`Extreme probability detected: ${log.predictedProbability.toFixed(3)}`);
    }
  }

  /**
   * Get recent predictions
   */
  private getRecentPredictions(days: number): PredictionLog[] {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.predictionLogs.filter(p => p.timestamp > cutoffDate);
  }

  /**
   * Calculate feature drift
   */
  private calculateFeatureDrift(predictions: PredictionLog[]): {
    score: number;
    features: Array<{ name: string; drift: number }>;
  } {
    // Get baseline (older predictions)
    const midpoint = Math.floor(predictions.length / 2);
    const baseline = predictions.slice(0, midpoint);
    const recent = predictions.slice(midpoint);

    const featureDrifts: Array<{ name: string; drift: number }> = [];

    // Calculate drift for each feature
    const featureNames = Object.keys(predictions[0].features);
    
    for (const featureName of featureNames) {
      const baselineValues = baseline.map(p => p.features[featureName]);
      const recentValues = recent.map(p => p.features[featureName]);

      const baselineMean = baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length;
      const recentMean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;

      const drift = Math.abs(recentMean - baselineMean);
      featureDrifts.push({ name: featureName, drift });
    }

    const avgDrift = featureDrifts.reduce((sum, f) => sum + f.drift, 0) / featureDrifts.length;

    return {
      score: avgDrift,
      features: featureDrifts.sort((a, b) => b.drift - a.drift)
    };
  }

  /**
   * Calculate prediction distribution drift
   */
  private calculatePredictionDrift(predictions: PredictionLog[]): {
    score: number;
  } {
    const midpoint = Math.floor(predictions.length / 2);
    const baseline = predictions.slice(0, midpoint);
    const recent = predictions.slice(midpoint);

    const baselineMean = baseline.reduce((sum, p) => sum + p.predictedProbability, 0) / baseline.length;
    const recentMean = recent.reduce((sum, p) => sum + p.predictedProbability, 0) / recent.length;

    const drift = Math.abs(recentMean - baselineMean);

    return { score: drift };
  }
}
