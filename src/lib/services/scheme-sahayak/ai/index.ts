/**
 * AI Recommendation System - Main Exports
 * Provides ML-powered scheme matching and success prediction
 */

export { ProfileAnalyzer, ExtractedFeatures } from './ProfileAnalyzer';
export { SchemeMatcher, CompatibilityScore, MatchingResult } from './SchemeMatcher';
export { SuccessPredictor } from './SuccessPredictor';
export { AIRecommendationEngine } from './AIRecommendationEngine';

// Re-export data preprocessing components
export { DataPreprocessor } from './DataPreprocessor';
export { FeatureEngineeringPipeline } from './FeatureEngineeringPipeline';

// Export ML training and monitoring components
export {
  MLModelTrainingPipeline,
  TrainingDataPoint,
  UserFeedbackData,
  ModelPerformanceMetrics,
  ModelVersion,
  TrainingConfig
} from './MLModelTrainingPipeline';

export {
  ModelPerformanceMonitor,
  MonitoringConfig,
  PerformanceAlert,
  DriftDetectionResult,
  PerformanceTrend
} from './ModelPerformanceMonitor';

export {
  MLTrainingService,
  MLTrainingServiceConfig,
  ServiceStatus
} from './MLTrainingService';
