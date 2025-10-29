/**
 * ML Training Service
 * High-level service that integrates training pipeline and performance monitoring
 * Provides unified interface for ML model lifecycle management
 */

import {
  MLModelTrainingPipeline,
  TrainingDataPoint,
  UserFeedbackData,
  ModelPerformanceMetrics,
  ModelVersion
} from './MLModelTrainingPipeline';
import {
  ModelPerformanceMonitor,
  MonitoringConfig,
  PerformanceAlert,
  DriftDetectionResult
} from './ModelPerformanceMonitor';
import { AIRecommendationEngine } from './AIRecommendationEngine';

/**
 * Training service configuration
 */
export interface MLTrainingServiceConfig {
  enableContinuousLearning: boolean;
  enablePerformanceMonitoring: boolean;
  autoRetrainOnDrift: boolean;
  driftThreshold: number;
  minDataForRetraining: number;
}

/**
 * Service status
 */
export interface ServiceStatus {
  isRunning: boolean;
  continuousLearningActive: boolean;
  monitoringActive: boolean;
  lastTrainingDate: Date | null;
  nextScheduledTraining: Date | null;
  currentModelVersion: string;
  trainingDataCount: number;
  pendingFeedbackCount: number;
  activeAlertsCount: number;
  driftStatus: 'stable' | 'drifting' | 'unknown';
}

/**
 * ML Training Service
 * Orchestrates model training, monitoring, and lifecycle management
 */
export class MLTrainingService {
  private trainingPipeline: MLModelTrainingPipeline;
  private performanceMonitor: ModelPerformanceMonitor;
  private recommendationEngine: AIRecommendationEngine;
  private config: MLTrainingServiceConfig;
  private isInitialized: boolean;

  constructor(
    recommendationEngine: AIRecommendationEngine,
    config?: Partial<MLTrainingServiceConfig>
  ) {
    this.recommendationEngine = recommendationEngine;
    this.config = {
      enableContinuousLearning: true,
      enablePerformanceMonitoring: true,
      autoRetrainOnDrift: true,
      driftThreshold: 0.3,
      minDataForRetraining: 100,
      ...config
    };

    this.trainingPipeline = new MLModelTrainingPipeline({
      minTrainingDataSize: this.config.minDataForRetraining
    });

    this.performanceMonitor = new ModelPerformanceMonitor({
      enableRealTimeMonitoring: this.config.enablePerformanceMonitoring
    });

    this.isInitialized = false;
  }

  /**
   * Initialize and start the ML training service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('ML Training Service already initialized');
      return;
    }

    console.log('Initializing ML Training Service...');

    // Start continuous learning if enabled
    if (this.config.enableContinuousLearning) {
      this.trainingPipeline.startContinuousLearning();
    }

    // Start performance monitoring if enabled
    if (this.config.enablePerformanceMonitoring) {
      this.performanceMonitor.startMonitoring();
    }

    // Load initial model performance
    const currentModel = this.trainingPipeline.getCurrentModel();
    this.performanceMonitor.recordPerformance(currentModel.performance);

    this.isInitialized = true;
    console.log('ML Training Service initialized successfully');
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down ML Training Service...');

    this.trainingPipeline.stopContinuousLearning();
    this.performanceMonitor.stopMonitoring();

    this.isInitialized = false;
    console.log('ML Training Service shut down');
  }

  /**
   * Record application outcome for training
   */
  async recordApplicationOutcome(
    artisanId: string,
    schemeId: string,
    outcome: 'approved' | 'rejected' | 'pending' | 'withdrawn',
    metadata: {
      features: any;
      compatibility: any;
      applicationDate: Date;
      outcomeDate?: Date;
      processingTime?: number;
      feedbackScore?: number;
      schemeCategory: string;
      benefitAmount: number;
      documentCount: number;
      applicationMethod: 'online' | 'offline';
    }
  ): Promise<void> {
    // Create training data point
    const trainingData: TrainingDataPoint = {
      artisanId,
      schemeId,
      features: metadata.features,
      compatibility: metadata.compatibility,
      outcome,
      applicationDate: metadata.applicationDate,
      outcomeDate: metadata.outcomeDate,
      processingTime: metadata.processingTime,
      feedbackScore: metadata.feedbackScore,
      metadata: {
        schemeCategory: metadata.schemeCategory,
        benefitAmount: metadata.benefitAmount,
        documentCount: metadata.documentCount,
        applicationMethod: metadata.applicationMethod
      }
    };

    // Add to training pipeline
    this.trainingPipeline.addTrainingData(trainingData);

    console.log(`Recorded application outcome: ${artisanId} -> ${schemeId} = ${outcome}`);
  }

  /**
   * Record user feedback
   */
  async recordUserFeedback(feedback: UserFeedbackData): Promise<void> {
    // Add to training pipeline
    this.trainingPipeline.addFeedback(feedback);

    console.log(`Recorded user feedback: ${feedback.recommendationId}`);
  }

  /**
   * Trigger manual model retraining
   */
  async retrainModel(): Promise<{
    success: boolean;
    newVersion: string;
    performance: ModelPerformanceMetrics;
    message: string;
  }> {
    try {
      console.log('Manual model retraining triggered...');

      const newModel = await this.trainingPipeline.retrainModel();
      
      // Record new performance
      this.performanceMonitor.recordPerformance(newModel.performance);

      return {
        success: true,
        newVersion: newModel.version,
        performance: newModel.performance,
        message: `Model successfully retrained to version ${newModel.version}`
      };
    } catch (error) {
      console.error('Model retraining failed:', error);
      return {
        success: false,
        newVersion: this.trainingPipeline.getCurrentModel().version,
        performance: this.trainingPipeline.getCurrentModel().performance,
        message: `Retraining failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check for model drift and retrain if necessary
   */
  async checkAndHandleDrift(): Promise<{
    driftDetected: boolean;
    retrainTriggered: boolean;
    driftAnalysis: DriftDetectionResult;
  }> {
    const driftAnalysis = this.performanceMonitor.detectDrift();

    if (driftAnalysis.isDrifting && this.config.autoRetrainOnDrift) {
      console.log('Drift detected, triggering automatic retraining...');
      
      const retrainResult = await this.retrainModel();
      
      return {
        driftDetected: true,
        retrainTriggered: retrainResult.success,
        driftAnalysis
      };
    }

    return {
      driftDetected: driftAnalysis.isDrifting,
      retrainTriggered: false,
      driftAnalysis
    };
  }

  /**
   * Get service status
   */
  getStatus(): ServiceStatus {
    const trainingStats = this.trainingPipeline.getTrainingStatistics();
    const monitoringStats = this.performanceMonitor.getMonitoringStatistics();
    const driftAnalysis = this.performanceMonitor.detectDrift();

    return {
      isRunning: this.isInitialized,
      continuousLearningActive: this.config.enableContinuousLearning,
      monitoringActive: this.config.enablePerformanceMonitoring,
      lastTrainingDate: trainingStats.lastTrainingDate,
      nextScheduledTraining: trainingStats.nextScheduledTraining,
      currentModelVersion: trainingStats.modelVersion,
      trainingDataCount: trainingStats.totalTrainingData,
      pendingFeedbackCount: trainingStats.pendingFeedback,
      activeAlertsCount: monitoringStats.activeAlerts,
      driftStatus: driftAnalysis.isDrifting ? 'drifting' : 'stable'
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): ModelPerformanceMetrics {
    return this.trainingPipeline.getPerformanceMetrics();
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.performanceMonitor.getActiveAlerts();
  }

  /**
   * Get model history
   */
  getModelHistory(): ModelVersion[] {
    return this.trainingPipeline.getModelHistory();
  }

  /**
   * Generate comprehensive report
   */
  generateReport(): {
    serviceStatus: ServiceStatus;
    performanceMetrics: ModelPerformanceMetrics;
    monitoringReport: any;
    trainingStatistics: any;
    recommendations: string[];
  } {
    const status = this.getStatus();
    const metrics = this.getPerformanceMetrics();
    const monitoringReport = this.performanceMonitor.generateReport();
    const trainingStats = this.trainingPipeline.getTrainingStatistics();

    // Generate recommendations
    const recommendations: string[] = [];

    if (status.driftStatus === 'drifting') {
      recommendations.push('Model drift detected - schedule retraining');
    }

    if (status.activeAlertsCount > 0) {
      recommendations.push(`${status.activeAlertsCount} active alerts require attention`);
    }

    if (metrics.accuracy < 0.80) {
      recommendations.push('Model accuracy below target - consider feature engineering');
    }

    if (status.trainingDataCount < 500) {
      recommendations.push('Limited training data - collect more application outcomes');
    }

    return {
      serviceStatus: status,
      performanceMetrics: metrics,
      monitoringReport,
      trainingStatistics: trainingStats,
      recommendations: [...recommendations, ...monitoringReport.recommendations]
    };
  }

  /**
   * Export model for deployment
   */
  exportModel(): any {
    return this.trainingPipeline.exportModel();
  }

  /**
   * Import model from saved state
   */
  importModel(modelData: any): void {
    this.trainingPipeline.importModel(modelData);
    
    // Update monitoring
    const currentModel = this.trainingPipeline.getCurrentModel();
    this.performanceMonitor.recordPerformance(currentModel.performance);
  }

  /**
   * Batch import training data (for initial setup or migration)
   */
  async batchImportTrainingData(dataPoints: TrainingDataPoint[]): Promise<{
    imported: number;
    skipped: number;
  }> {
    const initialCount = this.trainingPipeline.getTrainingStatistics().totalTrainingData;
    
    this.trainingPipeline.batchAddTrainingData(dataPoints);
    
    const finalCount = this.trainingPipeline.getTrainingStatistics().totalTrainingData;
    const imported = finalCount - initialCount;
    const skipped = dataPoints.length - imported;

    console.log(`Batch import completed: ${imported} imported, ${skipped} skipped`);

    return { imported, skipped };
  }

  /**
   * Get training pipeline instance (for advanced usage)
   */
  getTrainingPipeline(): MLModelTrainingPipeline {
    return this.trainingPipeline;
  }

  /**
   * Get performance monitor instance (for advanced usage)
   */
  getPerformanceMonitor(): ModelPerformanceMonitor {
    return this.performanceMonitor;
  }
}
