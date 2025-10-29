# ML Model Training Pipeline

## Overview

The ML Model Training Pipeline implements a continuous learning system with feedback loops, weekly retraining scheduler, and comprehensive performance monitoring for the AI-Powered Scheme Sahayak recommendation engine.

## Requirements

This implementation satisfies the following requirements:
- **Requirement 1.1**: AI recommendation generation within 3 seconds
- **Requirement 1.4**: Success prediction with 85% accuracy through continuous model improvement

## Architecture

### Components

1. **MLModelTrainingPipeline**: Core training pipeline with continuous learning
2. **ModelPerformanceMonitor**: Real-time monitoring and drift detection
3. **MLTrainingService**: High-level orchestration service

### Key Features

#### 1. Continuous Learning System
- Automatic weekly retraining scheduler
- Incremental learning with new data
- Feedback loop integration
- Historical data management

#### 2. Model Retraining
- Gradient descent optimization
- Train/validation split (80/20)
- Convergence detection
- Model versioning and history

#### 3. Performance Monitoring
- Real-time prediction logging
- Accuracy, precision, recall, F1 score tracking
- Calibration error measurement
- AUC calculation

#### 4. Drift Detection
- Feature distribution monitoring
- Prediction distribution analysis
- Automatic retraining on drift
- Configurable drift thresholds

## Usage

### Basic Setup

```typescript
import { AIRecommendationEngine } from './AIRecommendationEngine';
import { MLTrainingService } from './MLTrainingService';

// Initialize recommendation engine
const recommendationEngine = new AIRecommendationEngine();

// Create ML training service
const mlService = new MLTrainingService(recommendationEngine, {
  enableContinuousLearning: true,
  enablePerformanceMonitoring: true,
  autoRetrainOnDrift: true,
  driftThreshold: 0.3,
  minDataForRetraining: 100
});

// Start the service
await mlService.initialize();
```

### Recording Application Outcomes

```typescript
// Record successful application
await mlService.recordApplicationOutcome(
  'artisan_123',
  'scheme_456',
  'approved',
  {
    features: extractedFeatures,
    compatibility: compatibilityScore,
    applicationDate: new Date('2024-01-15'),
    outcomeDate: new Date('2024-02-20'),
    processingTime: 36,
    feedbackScore: 5,
    schemeCategory: 'loan',
    benefitAmount: 500000,
    documentCount: 8,
    applicationMethod: 'online'
  }
);
```

### Recording User Feedback

```typescript
await mlService.recordUserFeedback({
  recommendationId: 'rec_123',
  artisanId: 'artisan_123',
  schemeId: 'scheme_456',
  timestamp: new Date(),
  interactionType: 'applied',
  satisfactionScore: 5,
  outcome: 'approved'
});
```

### Manual Retraining

```typescript
const result = await mlService.retrainModel();

if (result.success) {
  console.log(`Model retrained to version ${result.newVersion}`);
  console.log(`Accuracy: ${(result.performance.accuracy * 100).toFixed(2)}%`);
}
```

### Monitoring Performance

```typescript
// Get current status
const status = mlService.getStatus();
console.log(`Model Version: ${status.currentModelVersion}`);
console.log(`Training Data: ${status.trainingDataCount}`);
console.log(`Drift Status: ${status.driftStatus}`);

// Get performance metrics
const metrics = mlService.getPerformanceMetrics();
console.log(`Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
console.log(`F1 Score: ${metrics.f1Score.toFixed(3)}`);

// Get active alerts
const alerts = mlService.getActiveAlerts();
alerts.forEach(alert => {
  console.log(`[${alert.severity}] ${alert.message}`);
});
```

### Drift Detection

```typescript
const driftResult = await mlService.checkAndHandleDrift();

if (driftResult.driftDetected) {
  console.log(`Drift score: ${driftResult.driftAnalysis.driftScore}`);
  console.log(`Affected features: ${driftResult.driftAnalysis.affectedFeatures}`);
  
  if (driftResult.retrainTriggered) {
    console.log('Automatic retraining triggered');
  }
}
```

## Configuration

### Training Configuration

```typescript
interface TrainingConfig {
  minTrainingDataSize: number;      // Default: 100
  validationSplit: number;           // Default: 0.2 (20%)
  learningRate: number;              // Default: 0.01
  regularizationStrength: number;    // Default: 0.1
  maxIterations: number;             // Default: 1000
  convergenceThreshold: number;      // Default: 0.001
  featureImportanceThreshold: number; // Default: 0.05
}
```

### Monitoring Configuration

```typescript
interface MonitoringConfig {
  accuracyThreshold: number;         // Default: 0.75 (75%)
  f1ScoreThreshold: number;          // Default: 0.70 (70%)
  calibrationErrorThreshold: number; // Default: 0.20 (20%)
  driftDetectionWindow: number;      // Default: 7 days
  alertCooldownMinutes: number;      // Default: 60 minutes
  enableRealTimeMonitoring: boolean; // Default: true
}
```

### Service Configuration

```typescript
interface MLTrainingServiceConfig {
  enableContinuousLearning: boolean;  // Default: true
  enablePerformanceMonitoring: boolean; // Default: true
  autoRetrainOnDrift: boolean;        // Default: true
  driftThreshold: number;             // Default: 0.3
  minDataForRetraining: number;       // Default: 100
}
```

## Performance Metrics

### Tracked Metrics

1. **Accuracy**: Overall prediction correctness
2. **Precision**: True positives / (True positives + False positives)
3. **Recall**: True positives / (True positives + False negatives)
4. **F1 Score**: Harmonic mean of precision and recall
5. **AUC**: Area under ROC curve
6. **Calibration Error**: Probability calibration accuracy

### Thresholds

- Minimum Accuracy: 75%
- Minimum F1 Score: 70%
- Maximum Calibration Error: 20%
- Drift Detection: 30% threshold

## Continuous Learning

### Weekly Retraining Schedule

The system automatically retrains the model every 7 days:

1. Collects all training data since last training
2. Splits into training (80%) and validation (20%) sets
3. Trains new model using gradient descent
4. Evaluates on validation set
5. Compares with current model
6. Deploys if performance improves by >2%

### Incremental Learning

Between scheduled retraining, the system performs incremental learning:

- Triggers when 100+ new data points are collected
- Updates feature weights using online learning
- Lower learning rate (0.001) for stability
- No model replacement, only weight adjustment

## Drift Detection

### Feature Drift

Monitors changes in feature distributions:
- Compares recent vs. baseline feature values
- Calculates mean shift for each feature
- Identifies features with >20% drift

### Prediction Drift

Monitors changes in prediction distributions:
- Compares recent vs. baseline prediction probabilities
- Calculates distribution shift
- Triggers alert if drift >30%

### Automatic Handling

When drift is detected:
1. Log drift analysis
2. Create performance alert
3. Trigger automatic retraining (if enabled)
4. Update model with new patterns

## Alerts and Monitoring

### Alert Types

1. **Critical**: Accuracy below threshold, severe drift
2. **Warning**: F1 score below threshold, moderate drift
3. **Info**: Model updated, training completed

### Alert Cooldown

- Prevents alert spam
- Default: 60 minutes between similar alerts
- Configurable per alert type

### Real-time Monitoring

- Checks performance every 5 minutes
- Logs prediction anomalies
- Tracks processing time
- Monitors system health

## Model Versioning

### Version Format

`major.minor.patch` (e.g., 1.2.0)

- **Major**: Breaking changes or complete retraining
- **Minor**: Incremental improvements
- **Patch**: Bug fixes or minor adjustments

### Model History

- All previous models are archived
- Performance metrics stored for each version
- Rollback capability to previous versions
- Export/import functionality for deployment

## Best Practices

### Data Collection

1. Record all application outcomes (approved/rejected)
2. Collect user feedback on recommendations
3. Track processing times and user satisfaction
4. Maintain data quality and completeness

### Training Schedule

1. Weekly automatic retraining
2. Manual retraining after major data updates
3. Immediate retraining on critical drift
4. Validation before deployment

### Monitoring

1. Check alerts daily
2. Review performance trends weekly
3. Analyze drift patterns monthly
4. Generate comprehensive reports quarterly

### Performance Optimization

1. Maintain >100 training samples minimum
2. Balance training data (approved/rejected)
3. Monitor feature importance
4. Remove low-impact features
5. Tune hyperparameters based on validation results

## Integration with Recommendation Engine

The training pipeline integrates seamlessly with the AI Recommendation Engine:

```typescript
// The recommendation engine uses the trained model
const recommendations = await recommendationEngine.generateRecommendations(
  artisanId,
  artisanProfile,
  availableSchemes
);

// Record outcomes for training
for (const rec of recommendations) {
  // When outcome is known
  await mlService.recordApplicationOutcome(
    artisanId,
    rec.scheme.id,
    outcome,
    metadata
  );
}
```

## Troubleshooting

### Low Accuracy

- Check training data quality
- Verify feature engineering
- Increase training data size
- Adjust learning rate
- Review feature importance

### High Drift

- Analyze affected features
- Check for data quality issues
- Verify external factors (policy changes)
- Consider feature recalibration
- Trigger immediate retraining

### Slow Training

- Reduce max iterations
- Increase convergence threshold
- Optimize feature count
- Use incremental learning
- Batch process training data

### Memory Issues

- Limit historical data retention
- Clear old prediction logs
- Archive old model versions
- Optimize data structures
- Use streaming for large datasets

## Future Enhancements

1. **Advanced Algorithms**: Implement neural networks, ensemble methods
2. **Feature Selection**: Automatic feature importance analysis
3. **Hyperparameter Tuning**: Automated grid search
4. **A/B Testing**: Compare model versions in production
5. **Explainability**: Enhanced SHAP/LIME integration
6. **Distributed Training**: Scale to larger datasets
7. **Real-time Inference**: Edge deployment optimization

## References

- Requirements Document: `.kiro/specs/ai-powered-scheme-sahayak/requirements.md`
- Design Document: `.kiro/specs/ai-powered-scheme-sahayak/design.md`
- Usage Examples: `./MLTrainingExample.ts`
- AI Components: `./AIRecommendationEngine.ts`, `./SchemeMatcher.ts`, `./SuccessPredictor.ts`
