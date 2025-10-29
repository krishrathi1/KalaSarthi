/**
 * ML Training Pipeline - Usage Examples
 * Demonstrates how to use the ML training and monitoring system
 */

import { AIRecommendationEngine } from './AIRecommendationEngine';
import { MLTrainingService } from './MLTrainingService';
import { TrainingDataPoint } from './MLModelTrainingPipeline';

/**
 * Example 1: Initialize and start the ML training service
 */
export async function initializeMLTrainingService(): Promise<MLTrainingService> {
  // Create recommendation engine
  const recommendationEngine = new AIRecommendationEngine();

  // Create ML training service with configuration
  const mlService = new MLTrainingService(recommendationEngine, {
    enableContinuousLearning: true,
    enablePerformanceMonitoring: true,
    autoRetrainOnDrift: true,
    driftThreshold: 0.3,
    minDataForRetraining: 100
  });

  // Initialize the service (starts continuous learning and monitoring)
  await mlService.initialize();

  console.log('ML Training Service initialized and running');
  console.log('Status:', mlService.getStatus());

  return mlService;
}

/**
 * Example 2: Record application outcomes for training
 */
export async function recordApplicationOutcomes(mlService: MLTrainingService): Promise<void> {
  // Example: Record a successful application
  await mlService.recordApplicationOutcome(
    'artisan_123',
    'scheme_456',
    'approved',
    {
      features: {
        documentReadiness: 0.9,
        applicationHistory: 0.7,
        creditworthiness: 0.8,
        businessAge: 0.6,
        experienceYears: 0.7,
        hasRegistration: 1,
        digitalLiteracy: 0.8,
        financialLiteracy: 0.7,
        persistenceLevel: 0.8,
        proactiveness: 0.9,
        governmentInteraction: 0.6,
        monthlyIncomeNormalized: 0.5,
        businessTypeEncoded: 1,
        locationTier: 2,
        incomeStability: 0.7,
        growthPotential: 0.8,
        learningOrientation: 0.7,
        riskTolerance: 0.6,
        adaptabilityScore: 0.8
      },
      compatibility: {
        overall: 85,
        eligibility: 90,
        benefit: 80,
        feasibility: 85,
        timing: 80,
        components: {
          contentBased: 85,
          collaborative: 80,
          contextual: 85
        }
      },
      applicationDate: new Date('2024-01-15'),
      outcomeDate: new Date('2024-02-20'),
      processingTime: 36, // days
      feedbackScore: 5,
      schemeCategory: 'loan',
      benefitAmount: 500000,
      documentCount: 8,
      applicationMethod: 'online'
    }
  );

  // Example: Record a rejected application
  await mlService.recordApplicationOutcome(
    'artisan_789',
    'scheme_456',
    'rejected',
    {
      features: {
        documentReadiness: 0.4,
        applicationHistory: 0.3,
        creditworthiness: 0.5,
        businessAge: 0.2,
        experienceYears: 0.3,
        hasRegistration: 0,
        digitalLiteracy: 0.5,
        financialLiteracy: 0.4,
        persistenceLevel: 0.6,
        proactiveness: 0.5,
        governmentInteraction: 0.3,
        monthlyIncomeNormalized: 0.3,
        businessTypeEncoded: 1,
        locationTier: 3,
        incomeStability: 0.4,
        growthPotential: 0.5,
        learningOrientation: 0.5,
        riskTolerance: 0.7,
        adaptabilityScore: 0.6
      },
      compatibility: {
        overall: 45,
        eligibility: 50,
        benefit: 60,
        feasibility: 30,
        timing: 50,
        components: {
          contentBased: 45,
          collaborative: 40,
          contextual: 50
        }
      },
      applicationDate: new Date('2024-01-20'),
      outcomeDate: new Date('2024-02-15'),
      processingTime: 26,
      feedbackScore: 2,
      schemeCategory: 'loan',
      benefitAmount: 500000,
      documentCount: 4,
      applicationMethod: 'online'
    }
  );

  console.log('Application outcomes recorded');
}

/**
 * Example 3: Record user feedback
 */
export async function recordUserFeedback(mlService: MLTrainingService): Promise<void> {
  // User viewed a recommendation
  await mlService.recordUserFeedback({
    recommendationId: 'rec_123',
    artisanId: 'artisan_123',
    schemeId: 'scheme_456',
    timestamp: new Date(),
    interactionType: 'viewed',
    satisfactionScore: 4
  });

  // User applied to a scheme
  await mlService.recordUserFeedback({
    recommendationId: 'rec_124',
    artisanId: 'artisan_123',
    schemeId: 'scheme_789',
    timestamp: new Date(),
    interactionType: 'applied',
    satisfactionScore: 5,
    outcome: 'approved'
  });

  console.log('User feedback recorded');
}

/**
 * Example 4: Manual model retraining
 */
export async function manualRetraining(mlService: MLTrainingService): Promise<void> {
  console.log('Triggering manual model retraining...');

  const result = await mlService.retrainModel();

  if (result.success) {
    console.log(`✓ Model retrained successfully to version ${result.newVersion}`);
    console.log('Performance metrics:');
    console.log(`  - Accuracy: ${(result.performance.accuracy * 100).toFixed(2)}%`);
    console.log(`  - Precision: ${(result.performance.precision * 100).toFixed(2)}%`);
    console.log(`  - Recall: ${(result.performance.recall * 100).toFixed(2)}%`);
    console.log(`  - F1 Score: ${result.performance.f1Score.toFixed(3)}`);
    console.log(`  - AUC: ${result.performance.auc.toFixed(3)}`);
  } else {
    console.error(`✗ Retraining failed: ${result.message}`);
  }
}

/**
 * Example 5: Check for model drift
 */
export async function checkModelDrift(mlService: MLTrainingService): Promise<void> {
  console.log('Checking for model drift...');

  const driftResult = await mlService.checkAndHandleDrift();

  if (driftResult.driftDetected) {
    console.log(`⚠️  Model drift detected!`);
    console.log(`Drift score: ${driftResult.driftAnalysis.driftScore.toFixed(3)}`);
    console.log(`Affected features: ${driftResult.driftAnalysis.affectedFeatures.join(', ')}`);
    console.log(`Recommendation: ${driftResult.driftAnalysis.recommendation}`);

    if (driftResult.retrainTriggered) {
      console.log('✓ Automatic retraining triggered');
    }
  } else {
    console.log('✓ No significant drift detected');
  }
}

/**
 * Example 6: Monitor performance and get alerts
 */
export function monitorPerformance(mlService: MLTrainingService): void {
  // Get current status
  const status = mlService.getStatus();
  console.log('=== ML Service Status ===');
  console.log(`Running: ${status.isRunning}`);
  console.log(`Model Version: ${status.currentModelVersion}`);
  console.log(`Training Data: ${status.trainingDataCount}`);
  console.log(`Drift Status: ${status.driftStatus}`);
  console.log(`Active Alerts: ${status.activeAlertsCount}`);

  // Get performance metrics
  const metrics = mlService.getPerformanceMetrics();
  console.log('\n=== Performance Metrics ===');
  console.log(`Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`F1 Score: ${metrics.f1Score.toFixed(3)}`);
  console.log(`Calibration Error: ${(metrics.calibrationError * 100).toFixed(2)}%`);

  // Get active alerts
  const alerts = mlService.getActiveAlerts();
  if (alerts.length > 0) {
    console.log('\n=== Active Alerts ===');
    alerts.forEach(alert => {
      console.log(`[${alert.severity.toUpperCase()}] ${alert.message}`);
    });
  }
}

/**
 * Example 7: Generate comprehensive report
 */
export function generateComprehensiveReport(mlService: MLTrainingService): void {
  const report = mlService.generateReport();

  console.log('=== ML Training Service Report ===\n');
  
  console.log('Service Status:');
  console.log(`  - Running: ${report.serviceStatus.isRunning}`);
  console.log(`  - Model Version: ${report.serviceStatus.currentModelVersion}`);
  console.log(`  - Training Data: ${report.serviceStatus.trainingDataCount}`);
  console.log(`  - Drift Status: ${report.serviceStatus.driftStatus}`);
  
  console.log('\nPerformance Metrics:');
  console.log(`  - Accuracy: ${(report.performanceMetrics.accuracy * 100).toFixed(2)}%`);
  console.log(`  - Precision: ${(report.performanceMetrics.precision * 100).toFixed(2)}%`);
  console.log(`  - Recall: ${(report.performanceMetrics.recall * 100).toFixed(2)}%`);
  console.log(`  - F1 Score: ${report.performanceMetrics.f1Score.toFixed(3)}`);
  
  console.log('\nRecommendations:');
  report.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });
}

/**
 * Example 8: Batch import historical data
 */
export async function batchImportHistoricalData(
  mlService: MLTrainingService
): Promise<void> {
  // Example: Import historical application data
  const historicalData: TrainingDataPoint[] = [
    // ... array of historical training data points
    // This would typically come from a database or file
  ];

  console.log(`Importing ${historicalData.length} historical data points...`);

  const result = await mlService.batchImportTrainingData(historicalData);

  console.log(`Import completed: ${result.imported} imported, ${result.skipped} skipped`);
}

/**
 * Example 9: Export and import model
 */
export function exportImportModel(mlService: MLTrainingService): void {
  // Export current model
  const exportedModel = mlService.exportModel();
  console.log('Model exported:', exportedModel.version);

  // Save to file or database
  // fs.writeFileSync('model.json', JSON.stringify(exportedModel));

  // Later, import the model
  // const savedModel = JSON.parse(fs.readFileSync('model.json', 'utf-8'));
  // mlService.importModel(savedModel);
  // console.log('Model imported:', savedModel.version);
}

/**
 * Example 10: Complete workflow
 */
export async function completeMLWorkflow(): Promise<void> {
  console.log('=== Starting Complete ML Workflow ===\n');

  // Step 1: Initialize service
  const mlService = await initializeMLTrainingService();

  // Step 2: Record some application outcomes
  await recordApplicationOutcomes(mlService);

  // Step 3: Record user feedback
  await recordUserFeedback(mlService);

  // Step 4: Monitor performance
  monitorPerformance(mlService);

  // Step 5: Check for drift
  await checkModelDrift(mlService);

  // Step 6: Generate report
  generateComprehensiveReport(mlService);

  // Step 7: Manual retraining (if needed)
  // await manualRetraining(mlService);

  console.log('\n=== Workflow Complete ===');
  console.log('The ML service is now running with:');
  console.log('  - Continuous learning (weekly retraining)');
  console.log('  - Real-time performance monitoring');
  console.log('  - Automatic drift detection and handling');

  // Keep service running...
  // To shutdown: await mlService.shutdown();
}

// Export all examples
export const MLTrainingExamples = {
  initializeMLTrainingService,
  recordApplicationOutcomes,
  recordUserFeedback,
  manualRetraining,
  checkModelDrift,
  monitorPerformance,
  generateComprehensiveReport,
  batchImportHistoricalData,
  exportImportModel,
  completeMLWorkflow
};
