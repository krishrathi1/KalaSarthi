/**
 * ML Model Training Pipeline
 * Implements continuous learning system with feedback loops
 * Handles model retraining, performance monitoring, and evaluation
 * Requirements: 1.1, 1.4
 */

import { ArtisanProfile, GovernmentScheme } from '../../../types/scheme-sahayak';
import { ExtractedFeatures } from './ProfileAnalyzer';
import { CompatibilityScore } from './SchemeMatcher';

/**
 * Training data point for model learning
 */
export interface TrainingDataPoint {
  artisanId: string;
  schemeId: string;
  features: ExtractedFeatures;
  compatibility: CompatibilityScore;
  outcome: 'approved' | 'rejected' | 'pending' | 'withdrawn';
  applicationDate: Date;
  outcomeDate?: Date;
  processingTime?: number; // days
  feedbackScore?: number; // 1-5 user satisfaction
  metadata: {
    schemeCategory: string;
    benefitAmount: number;
    documentCount: number;
    applicationMethod: 'online' | 'offline';
  };
}

/**
 * Model performance metrics
 */
export interface ModelPerformanceMetrics {
  accuracy: number; // Overall prediction accuracy
  precision: number; // True positives / (True positives + False positives)
  recall: number; // True positives / (True positives + False negatives)
  f1Score: number; // Harmonic mean of precision and recall
  auc: number; // Area under ROC curve
  calibrationError: number; // How well probabilities match actual outcomes
  predictionCount: number;
  lastEvaluated: Date;
  modelVersion: string;
}

/**
 * Training configuration
 */
export interface TrainingConfig {
  minTrainingDataSize: number; // Minimum data points required
  validationSplit: number; // Percentage for validation (0-1)
  learningRate: number;
  regularizationStrength: number;
  maxIterations: number;
  convergenceThreshold: number;
  featureImportanceThreshold: number;
}

/**
 * Model version metadata
 */
export interface ModelVersion {
  version: string;
  trainedAt: Date;
  trainingDataSize: number;
  performance: ModelPerformanceMetrics;
  featureWeights: Map<string, number>;
  hyperparameters: TrainingConfig;
  status: 'active' | 'archived' | 'testing';
}

/**
 * Feedback data for continuous learning
 */
export interface UserFeedbackData {
  recommendationId: string;
  artisanId: string;
  schemeId: string;
  timestamp: Date;
  interactionType: 'viewed' | 'clicked' | 'applied' | 'ignored';
  satisfactionScore?: number; // 1-5
  outcome?: 'approved' | 'rejected' | 'pending' | 'withdrawn';
  comments?: string;
}

/**
 * ML Model Training Pipeline
 * Implements continuous learning and model retraining
 */
export class MLModelTrainingPipeline {
  private trainingData: TrainingDataPoint[];
  private feedbackQueue: UserFeedbackData[];
  private currentModel: ModelVersion;
  private modelHistory: ModelVersion[];
  private performanceMetrics: ModelPerformanceMetrics;
  private trainingConfig: TrainingConfig;
  private isTraining: boolean;
  private lastTrainingDate: Date | null;
  private retrainingScheduler: NodeJS.Timeout | null;

  constructor(config?: Partial<TrainingConfig>) {
    this.trainingData = [];
    this.feedbackQueue = [];
    this.modelHistory = [];
    this.isTraining = false;
    this.lastTrainingDate = null;
    this.retrainingScheduler = null;

    // Initialize training configuration
    this.trainingConfig = {
      minTrainingDataSize: 100,
      validationSplit: 0.2,
      learningRate: 0.01,
      regularizationStrength: 0.1,
      maxIterations: 1000,
      convergenceThreshold: 0.001,
      featureImportanceThreshold: 0.05,
      ...config
    };

    // Initialize current model
    this.currentModel = this.initializeModel();
    this.performanceMetrics = this.initializeMetrics();
  }

  /**
   * Start the continuous learning system
   * Sets up weekly retraining scheduler
   */
  startContinuousLearning(): void {
    console.log('Starting continuous learning system...');

    // Schedule weekly retraining (every 7 days)
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    
    this.retrainingScheduler = setInterval(async () => {
      console.log('Scheduled retraining triggered');
      await this.retrainModel();
    }, weekInMs);

    console.log('Continuous learning system started. Weekly retraining scheduled.');
  }

  /**
   * Stop the continuous learning system
   */
  stopContinuousLearning(): void {
    if (this.retrainingScheduler) {
      clearInterval(this.retrainingScheduler);
      this.retrainingScheduler = null;
      console.log('Continuous learning system stopped');
    }
  }

  /**
   * Add training data point from application outcome
   */
  addTrainingData(dataPoint: TrainingDataPoint): void {
    // Validate data point
    if (!this.validateTrainingData(dataPoint)) {
      console.warn('Invalid training data point, skipping');
      return;
    }

    this.trainingData.push(dataPoint);

    // Trigger incremental learning if we have enough new data
    if (this.shouldTriggerIncrementalLearning()) {
      this.performIncrementalLearning();
    }
  }

  /**
   * Batch add training data
   */
  batchAddTrainingData(dataPoints: TrainingDataPoint[]): void {
    const validDataPoints = dataPoints.filter(dp => this.validateTrainingData(dp));
    this.trainingData.push(...validDataPoints);
    
    console.log(`Added ${validDataPoints.length} training data points`);
  }

  /**
   * Add user feedback for continuous learning
   */
  addFeedback(feedback: UserFeedbackData): void {
    this.feedbackQueue.push(feedback);

    // Process feedback queue periodically
    if (this.feedbackQueue.length >= 50) {
      this.processFeedbackQueue();
    }
  }

  /**
   * Retrain the model with accumulated data
   */
  async retrainModel(): Promise<ModelVersion> {
    if (this.isTraining) {
      console.log('Training already in progress, skipping');
      return this.currentModel;
    }

    if (this.trainingData.length < this.trainingConfig.minTrainingDataSize) {
      console.log(`Insufficient training data: ${this.trainingData.length}/${this.trainingConfig.minTrainingDataSize}`);
      return this.currentModel;
    }

    console.log(`Starting model retraining with ${this.trainingData.length} data points...`);
    this.isTraining = true;

    try {
      // Step 1: Prepare training and validation sets
      const { trainingSet, validationSet } = this.splitData(this.trainingData);

      // Step 2: Train new model
      const newModel = await this.trainNewModel(trainingSet);

      // Step 3: Evaluate on validation set
      const performance = await this.evaluateModel(newModel, validationSet);

      // Step 4: Compare with current model
      const shouldDeploy = this.shouldDeployNewModel(performance, this.performanceMetrics);

      if (shouldDeploy) {
        // Archive current model
        this.currentModel.status = 'archived';
        this.modelHistory.push({ ...this.currentModel });

        // Deploy new model
        newModel.status = 'active';
        newModel.performance = performance;
        this.currentModel = newModel;
        this.performanceMetrics = performance;

        console.log(`New model deployed: v${newModel.version}`);
        console.log(`Performance - Accuracy: ${(performance.accuracy * 100).toFixed(2)}%, F1: ${performance.f1Score.toFixed(3)}`);
      } else {
        console.log('New model did not outperform current model, keeping existing model');
      }

      this.lastTrainingDate = new Date();
      return this.currentModel;

    } catch (error) {
      console.error('Model retraining failed:', error);
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Evaluate model performance
   */
  async evaluateModel(
    model: ModelVersion,
    validationData: TrainingDataPoint[]
  ): Promise<ModelPerformanceMetrics> {
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    let totalCalibrationError = 0;

    for (const dataPoint of validationData) {
      // Skip pending outcomes
      if (dataPoint.outcome === 'pending') continue;

      // Predict success probability
      const predictedProbability = this.predictWithModel(model, dataPoint.features, dataPoint.compatibility);
      const predicted = predictedProbability > 0.5;
      const actual = dataPoint.outcome === 'approved';

      // Update confusion matrix
      if (predicted && actual) truePositives++;
      else if (predicted && !actual) falsePositives++;
      else if (!predicted && actual) falseNegatives++;
      else if (!predicted && !actual) trueNegatives++;

      // Calculate calibration error
      const actualOutcome = actual ? 1 : 0;
      totalCalibrationError += Math.abs(predictedProbability - actualOutcome);
    }

    const total = truePositives + falsePositives + trueNegatives + falseNegatives;
    
    // Calculate metrics
    const accuracy = total > 0 ? (truePositives + trueNegatives) / total : 0;
    const precision = (truePositives + falsePositives) > 0 
      ? truePositives / (truePositives + falsePositives) 
      : 0;
    const recall = (truePositives + falseNegatives) > 0 
      ? truePositives / (truePositives + falseNegatives) 
      : 0;
    const f1Score = (precision + recall) > 0 
      ? 2 * (precision * recall) / (precision + recall) 
      : 0;
    const calibrationError = total > 0 ? totalCalibrationError / total : 0;

    // Calculate AUC (simplified version)
    const auc = this.calculateAUC(model, validationData);

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      auc,
      calibrationError,
      predictionCount: total,
      lastEvaluated: new Date(),
      modelVersion: model.version
    };
  }

  /**
   * Get current model performance metrics
   */
  getPerformanceMetrics(): ModelPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get model training history
   */
  getModelHistory(): ModelVersion[] {
    return [...this.modelHistory];
  }

  /**
   * Get current model version
   */
  getCurrentModel(): ModelVersion {
    return { ...this.currentModel };
  }

  /**
   * Get training statistics
   */
  getTrainingStatistics(): {
    totalTrainingData: number;
    pendingFeedback: number;
    lastTrainingDate: Date | null;
    nextScheduledTraining: Date | null;
    isTraining: boolean;
    modelVersion: string;
  } {
    const nextTraining = this.lastTrainingDate 
      ? new Date(this.lastTrainingDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;

    return {
      totalTrainingData: this.trainingData.length,
      pendingFeedback: this.feedbackQueue.length,
      lastTrainingDate: this.lastTrainingDate,
      nextScheduledTraining: nextTraining,
      isTraining: this.isTraining,
      modelVersion: this.currentModel.version
    };
  }

  /**
   * Export model for deployment
   */
  exportModel(): {
    version: string;
    featureWeights: Record<string, number>;
    hyperparameters: TrainingConfig;
    performance: ModelPerformanceMetrics;
  } {
    return {
      version: this.currentModel.version,
      featureWeights: Object.fromEntries(this.currentModel.featureWeights),
      hyperparameters: this.currentModel.hyperparameters,
      performance: this.performanceMetrics
    };
  }

  /**
   * Import model from saved state
   */
  importModel(modelData: {
    version: string;
    featureWeights: Record<string, number>;
    hyperparameters: TrainingConfig;
    performance: ModelPerformanceMetrics;
  }): void {
    this.currentModel = {
      version: modelData.version,
      trainedAt: new Date(),
      trainingDataSize: this.trainingData.length,
      performance: modelData.performance,
      featureWeights: new Map(Object.entries(modelData.featureWeights)),
      hyperparameters: modelData.hyperparameters,
      status: 'active'
    };
    this.performanceMetrics = modelData.performance;
    
    console.log(`Model imported: v${modelData.version}`);
  }

  // ==================== Private Methods ====================

  /**
   * Initialize default model
   */
  private initializeModel(): ModelVersion {
    const defaultWeights = new Map<string, number>([
      ['documentReadiness', 1.5],
      ['applicationHistory', 1.4],
      ['creditworthiness', 1.3],
      ['eligibility', 1.6],
      ['businessAge', 1.2],
      ['experienceYears', 1.2],
      ['hasRegistration', 1.3],
      ['digitalLiteracy', 1.1],
      ['financialLiteracy', 1.1],
      ['persistenceLevel', 1.0],
      ['proactiveness', 1.0],
      ['governmentInteraction', 1.1]
    ]);

    return {
      version: '1.0.0',
      trainedAt: new Date(),
      trainingDataSize: 0,
      performance: this.initializeMetrics(),
      featureWeights: defaultWeights,
      hyperparameters: this.trainingConfig,
      status: 'active'
    };
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): ModelPerformanceMetrics {
    return {
      accuracy: 0.75, // Baseline
      precision: 0.70,
      recall: 0.70,
      f1Score: 0.70,
      auc: 0.75,
      calibrationError: 0.15,
      predictionCount: 0,
      lastEvaluated: new Date(),
      modelVersion: '1.0.0'
    };
  }

  /**
   * Validate training data point
   */
  private validateTrainingData(dataPoint: TrainingDataPoint): boolean {
    if (!dataPoint.artisanId || !dataPoint.schemeId) return false;
    if (!dataPoint.features || !dataPoint.compatibility) return false;
    if (!dataPoint.outcome || dataPoint.outcome === 'pending') return false;
    return true;
  }

  /**
   * Check if incremental learning should be triggered
   */
  private shouldTriggerIncrementalLearning(): boolean {
    // Trigger if we have 100+ new data points since last training
    const newDataCount = this.trainingData.filter(dp => 
      !this.lastTrainingDate || dp.applicationDate > this.lastTrainingDate
    ).length;

    return newDataCount >= 100;
  }

  /**
   * Perform incremental learning with new data
   */
  private async performIncrementalLearning(): Promise<void> {
    console.log('Performing incremental learning...');

    // Get new data since last training
    const newData = this.trainingData.filter(dp =>
      !this.lastTrainingDate || dp.applicationDate > this.lastTrainingDate
    );

    // Update feature weights incrementally
    this.updateFeatureWeightsIncremental(newData);

    console.log(`Incremental learning completed with ${newData.length} new data points`);
  }

  /**
   * Update feature weights incrementally
   */
  private updateFeatureWeightsIncremental(newData: TrainingDataPoint[]): void {
    const learningRate = this.trainingConfig.learningRate * 0.1; // Lower rate for incremental

    for (const dataPoint of newData) {
      const predicted = this.predictWithModel(
        this.currentModel,
        dataPoint.features,
        dataPoint.compatibility
      );
      const actual = dataPoint.outcome === 'approved' ? 1 : 0;
      const error = actual - predicted;

      // Update weights based on error
      for (const [feature, weight] of this.currentModel.featureWeights) {
        const featureValue = this.getFeatureValue(dataPoint.features, feature);
        const gradient = error * featureValue;
        const newWeight = weight + learningRate * gradient;
        this.currentModel.featureWeights.set(feature, newWeight);
      }
    }
  }

  /**
   * Process feedback queue
   */
  private processFeedbackQueue(): void {
    console.log(`Processing ${this.feedbackQueue.length} feedback items...`);

    // Convert feedback to training data where possible
    for (const feedback of this.feedbackQueue) {
      if (feedback.outcome && feedback.outcome !== 'pending') {
        // Find corresponding training data or create new entry
        // This would integrate with the actual data storage
        console.log(`Processed feedback for recommendation ${feedback.recommendationId}`);
      }
    }

    // Clear processed feedback
    this.feedbackQueue = [];
  }

  /**
   * Split data into training and validation sets
   */
  private splitData(data: TrainingDataPoint[]): {
    trainingSet: TrainingDataPoint[];
    validationSet: TrainingDataPoint[];
  } {
    // Shuffle data
    const shuffled = [...data].sort(() => Math.random() - 0.5);

    // Split based on validation split ratio
    const splitIndex = Math.floor(shuffled.length * (1 - this.trainingConfig.validationSplit));

    return {
      trainingSet: shuffled.slice(0, splitIndex),
      validationSet: shuffled.slice(splitIndex)
    };
  }

  /**
   * Train new model with training data
   */
  private async trainNewModel(trainingData: TrainingDataPoint[]): Promise<ModelVersion> {
    console.log(`Training new model with ${trainingData.length} data points...`);

    // Initialize new feature weights
    const featureWeights = new Map(this.currentModel.featureWeights);

    // Gradient descent training
    for (let iteration = 0; iteration < this.trainingConfig.maxIterations; iteration++) {
      let totalError = 0;
      const gradients = new Map<string, number>();

      // Initialize gradients
      for (const feature of featureWeights.keys()) {
        gradients.set(feature, 0);
      }

      // Calculate gradients
      for (const dataPoint of trainingData) {
        const predicted = this.predictWithWeights(
          featureWeights,
          dataPoint.features,
          dataPoint.compatibility
        );
        const actual = dataPoint.outcome === 'approved' ? 1 : 0;
        const error = actual - predicted;
        totalError += Math.abs(error);

        // Accumulate gradients
        for (const [feature, weight] of featureWeights) {
          const featureValue = this.getFeatureValue(dataPoint.features, feature);
          const gradient = error * featureValue;
          gradients.set(feature, gradients.get(feature)! + gradient);
        }
      }

      // Update weights
      for (const [feature, weight] of featureWeights) {
        const gradient = gradients.get(feature)! / trainingData.length;
        const regularization = this.trainingConfig.regularizationStrength * weight;
        const newWeight = weight + this.trainingConfig.learningRate * (gradient - regularization);
        featureWeights.set(feature, newWeight);
      }

      // Check convergence
      const avgError = totalError / trainingData.length;
      if (avgError < this.trainingConfig.convergenceThreshold) {
        console.log(`Converged after ${iteration + 1} iterations`);
        break;
      }

      // Log progress every 100 iterations
      if ((iteration + 1) % 100 === 0) {
        console.log(`Iteration ${iteration + 1}: Avg Error = ${avgError.toFixed(4)}`);
      }
    }

    // Create new model version
    const versionParts = this.currentModel.version.split('.');
    const newVersion = `${versionParts[0]}.${parseInt(versionParts[1]) + 1}.0`;

    return {
      version: newVersion,
      trainedAt: new Date(),
      trainingDataSize: trainingData.length,
      performance: this.initializeMetrics(), // Will be updated after evaluation
      featureWeights,
      hyperparameters: this.trainingConfig,
      status: 'testing'
    };
  }

  /**
   * Predict with specific model
   */
  private predictWithModel(
    model: ModelVersion,
    features: ExtractedFeatures,
    compatibility: CompatibilityScore
  ): number {
    return this.predictWithWeights(model.featureWeights, features, compatibility);
  }

  /**
   * Predict with specific weights
   */
  private predictWithWeights(
    weights: Map<string, number>,
    features: ExtractedFeatures,
    compatibility: CompatibilityScore
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Eligibility foundation
    score += (compatibility.eligibility / 100) * (weights.get('eligibility') || 1.0);
    totalWeight += weights.get('eligibility') || 1.0;

    // Feature-based scoring
    for (const [feature, weight] of weights) {
      if (feature === 'eligibility') continue; // Already handled
      
      const featureValue = this.getFeatureValue(features, feature);
      score += featureValue * weight;
      totalWeight += weight;
    }

    // Normalize to 0-1 probability
    const probability = score / totalWeight;
    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Get feature value by name
   */
  private getFeatureValue(features: ExtractedFeatures, featureName: string): number {
    return (features as any)[featureName] || 0;
  }

  /**
   * Calculate AUC (Area Under Curve)
   */
  private calculateAUC(model: ModelVersion, data: TrainingDataPoint[]): number {
    // Sort predictions by probability
    const predictions = data
      .filter(dp => dp.outcome !== 'pending')
      .map(dp => ({
        probability: this.predictWithModel(model, dp.features, dp.compatibility),
        actual: dp.outcome === 'approved' ? 1 : 0
      }))
      .sort((a, b) => b.probability - a.probability);

    if (predictions.length === 0) return 0.5;

    // Calculate AUC using trapezoidal rule
    let auc = 0;
    let tpr = 0; // True positive rate
    let fpr = 0; // False positive rate
    
    const positives = predictions.filter(p => p.actual === 1).length;
    const negatives = predictions.length - positives;

    if (positives === 0 || negatives === 0) return 0.5;

    for (const pred of predictions) {
      const prevTPR = tpr;
      const prevFPR = fpr;

      if (pred.actual === 1) {
        tpr += 1 / positives;
      } else {
        fpr += 1 / negatives;
      }

      // Trapezoidal area
      auc += (fpr - prevFPR) * (tpr + prevTPR) / 2;
    }

    return auc;
  }

  /**
   * Determine if new model should be deployed
   */
  private shouldDeployNewModel(
    newPerformance: ModelPerformanceMetrics,
    currentPerformance: ModelPerformanceMetrics
  ): boolean {
    // Require minimum improvement threshold
    const minImprovement = 0.02; // 2% improvement

    // Primary metric: F1 score
    const f1Improvement = newPerformance.f1Score - currentPerformance.f1Score;
    if (f1Improvement < minImprovement) {
      return false;
    }

    // Secondary: Accuracy should not degrade significantly
    const accuracyChange = newPerformance.accuracy - currentPerformance.accuracy;
    if (accuracyChange < -0.05) {
      return false;
    }

    // Tertiary: AUC should improve or stay similar
    const aucChange = newPerformance.auc - currentPerformance.auc;
    if (aucChange < -0.03) {
      return false;
    }

    return true;
  }
}
