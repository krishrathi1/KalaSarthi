import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { FinanceAggregationService, AggregationOptions, AggregationResult } from '../../lib/service/FinanceAggregationService';
import { AnomalyService } from '../../lib/service/AnomalyService';

export interface FinanceAggregatorRequest {
  action: 'backfill' | 'daily_aggregation' | 'detect_anomalies' | 'full_pipeline' | 'status_check';
  artisanId: string;
  options?: {
    startDate?: string;
    endDate?: string;
    periods?: ('daily' | 'weekly' | 'monthly' | 'yearly')[];
    forceRecalculate?: boolean;
    batchSize?: number;
  };
}

export interface FinanceAggregatorResponse {
  success: boolean;
  action: string;
  artisanId: string;
  results: {
    aggregation?: AggregationResult;
    anomalies?: any;
    status?: any;
    recommendations?: string[];
  };
  processingTime: number;
  timestamp: string;
  errors: string[];
}

// Remove the old defineFlow usage - we'll define it properly later

async function handleBackfill(
  service: FinanceAggregationService, 
  request: FinanceAggregatorRequest
): Promise<AggregationResult> {
  console.log(`Starting historical backfill for artisan ${request.artisanId}`);
  
  const startDate = request.options?.startDate ? new Date(request.options.startDate) : undefined;
  const endDate = request.options?.endDate ? new Date(request.options.endDate) : undefined;
  
  return await service.backfillHistoricalData(request.artisanId, startDate, endDate);
}

async function handleDailyAggregation(
  service: FinanceAggregationService,
  request: FinanceAggregatorRequest
): Promise<AggregationResult> {
  console.log(`Running daily aggregation for artisan ${request.artisanId}`);
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const options: AggregationOptions = {
    artisanId: request.artisanId,
    startDate: request.options?.startDate ? new Date(request.options.startDate) : yesterday,
    endDate: request.options?.endDate ? new Date(request.options.endDate) : today,
    periods: request.options?.periods || ['daily'],
    forceRecalculate: request.options?.forceRecalculate || false,
    batchSize: request.options?.batchSize || 100
  };
  
  return await service.aggregateFinancialData(options);
}

async function handleAnomalyDetection(
  service: AnomalyService,
  request: FinanceAggregatorRequest
): Promise<any> {
  console.log(`Running anomaly detection for artisan ${request.artisanId}`);
  
  const detectionResult = await service.detectAnomalies(request.artisanId);
  
  // Get recent alerts for context
  const recentAlerts = await service.getAlerts({
    artisanId: request.artisanId,
    limit: 10
  });
  
  return {
    detection: detectionResult,
    recentAlerts: recentAlerts.slice(0, 5), // Limit for response size
    summary: await service.getAlertSummary(request.artisanId)
  };
}

async function handleFullPipeline(
  aggregationService: FinanceAggregationService,
  anomalyService: AnomalyService,
  request: FinanceAggregatorRequest
): Promise<any> {
  console.log(`Running full finance pipeline for artisan ${request.artisanId}`);
  
  const results: any = {};
  
  // Step 1: Run aggregation
  try {
    const aggregationOptions: AggregationOptions = {
      artisanId: request.artisanId,
      startDate: request.options?.startDate ? new Date(request.options.startDate) : getDefaultStartDate(),
      endDate: request.options?.endDate ? new Date(request.options.endDate) : new Date(),
      periods: request.options?.periods || ['daily', 'weekly', 'monthly'],
      forceRecalculate: request.options?.forceRecalculate || false,
      batchSize: request.options?.batchSize || 50
    };
    
    results.aggregation = await aggregationService.aggregateFinancialData(aggregationOptions);
  } catch (error) {
    results.aggregationError = error instanceof Error ? error.message : 'Aggregation failed';
  }
  
  // Step 2: Run anomaly detection (only if aggregation succeeded)
  if (results.aggregation?.success) {
    try {
      results.anomalies = await anomalyService.detectAnomalies(request.artisanId);
      results.alertSummary = await anomalyService.getAlertSummary(request.artisanId);
    } catch (error) {
      results.anomalyError = error instanceof Error ? error.message : 'Anomaly detection failed';
    }
  }
  
  // Step 3: Get status overview
  try {
    results.status = await aggregationService.getAggregationStatus(request.artisanId);
  } catch (error) {
    results.statusError = error instanceof Error ? error.message : 'Status check failed';
  }
  
  return results;
}

async function handleStatusCheck(
  service: FinanceAggregationService,
  request: FinanceAggregatorRequest
): Promise<any> {
  console.log(`Checking aggregation status for artisan ${request.artisanId}`);
  
  const status = await service.getAggregationStatus(request.artisanId);
  
  // Add health indicators
  const health = {
    dataFreshness: calculateDataFreshness(status.lastUpdated),
    completeness: status.dataCompleteness,
    coverage: calculateCoverage(status.oldestData, status.newestData),
    recommendations: [] as string[]
  };
  
  // Generate health recommendations
  if (health.dataFreshness > 24) {
    health.recommendations.push('Data is more than 24 hours old. Consider running daily aggregation.');
  }
  
  if (health.completeness < 90) {
    health.recommendations.push('Data completeness is below 90%. Check for missing sales events.');
  }
  
  if (health.coverage < 30) {
    health.recommendations.push('Limited historical data coverage. Consider running backfill.');
  }
  
  return {
    status,
    health,
    lastProcessed: status.lastUpdated,
    nextRecommendedRun: getNextRecommendedRun(status.lastUpdated)
  };
}

async function generateRecommendations(
  request: FinanceAggregatorRequest,
  results: any
): Promise<string[]> {
  const recommendations: string[] = [];
  
  try {
    // Create context for AI recommendations
    const context = {
      action: request.action,
      artisanId: request.artisanId,
      success: results.aggregation?.success || results.anomalies?.anomaliesDetected !== undefined,
      processingTime: results.aggregation?.processingTime || 0,
      errors: results.aggregation?.errors || [],
      anomaliesDetected: results.anomalies?.anomaliesDetected || 0,
      alertsGenerated: results.anomalies?.alertsGenerated || 0
    };
    
    // Use AI to generate contextual recommendations
    const prompt = `
    Based on the following finance aggregation results, provide 3-5 actionable recommendations for the artisan:
    
    Context:
    - Action performed: ${context.action}
    - Success: ${context.success}
    - Processing time: ${context.processingTime}ms
    - Errors: ${context.errors.length}
    - Anomalies detected: ${context.anomaliesDetected}
    - Alerts generated: ${context.alertsGenerated}
    
    Focus on:
    1. Data quality improvements
    2. Performance optimizations
    3. Business insights
    4. Next steps for better financial tracking
    
    Provide practical, specific recommendations in a JSON array format.
    `;
    
    // For now, use rule-based recommendations instead of AI
    // In production, this would use the AI model
    const aiRecommendations = getDefaultRecommendations(context);
    recommendations.push(...aiRecommendations);
    
    // Removed AI parsing logic for now
    
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    // Fallback to rule-based recommendations
    recommendations.push(...getDefaultRecommendations({
      action: request.action,
      success: results.aggregation?.success || false,
      errors: results.aggregation?.errors || [],
      anomaliesDetected: results.anomalies?.anomaliesDetected || 0
    }));
  }
  
  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

function getDefaultRecommendations(context: any): string[] {
  const recommendations: string[] = [];
  
  if (!context.success) {
    recommendations.push('Review and fix data aggregation errors to ensure accurate financial tracking');
  }
  
  if (context.errors && context.errors.length > 0) {
    recommendations.push('Address data quality issues to improve aggregation reliability');
  }
  
  if (context.anomaliesDetected > 0) {
    recommendations.push('Investigate detected anomalies to identify potential business opportunities or issues');
  }
  
  if (context.action === 'backfill') {
    recommendations.push('Set up automated daily aggregation to keep data current');
  }
  
  if (context.action === 'daily_aggregation') {
    recommendations.push('Monitor daily trends and set up alerts for significant changes');
  }
  
  recommendations.push('Review financial dashboard regularly to track business performance');
  
  return recommendations;
}

function calculateDataFreshness(lastUpdated: Date | null): number {
  if (!lastUpdated) return Infinity;
  return (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60); // Hours
}

function calculateCoverage(oldestData: Date | null, newestData: Date | null): number {
  if (!oldestData || !newestData) return 0;
  const totalDays = (newestData.getTime() - oldestData.getTime()) / (1000 * 60 * 60 * 24);
  return Math.min(totalDays, 365); // Cap at 365 days
}

function getDefaultStartDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 7); // Default to last 7 days
  return date;
}

function getNextRecommendedRun(lastUpdated: Date | null): Date {
  const next = new Date();
  if (!lastUpdated) {
    return next; // Run immediately if never run
  }
  
  // Recommend next run in 24 hours
  next.setTime(lastUpdated.getTime() + 24 * 60 * 60 * 1000);
  return next;
}

// Utility function to run the agent
const FinanceAggregatorInputSchema = z.object({
  action: z.enum(['backfill', 'daily_aggregation', 'detect_anomalies', 'full_pipeline', 'status_check']),
  artisanId: z.string(),
  options: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    periods: z.array(z.enum(['daily', 'weekly', 'monthly', 'yearly'])).optional(),
    forceRecalculate: z.boolean().optional(),
    batchSize: z.number().optional(),
  }).optional(),
});

const FinanceAggregatorOutputSchema = z.object({
  success: z.boolean(),
  action: z.string(),
  artisanId: z.string(),
  results: z.object({
    aggregation: z.any().optional(),
    anomalies: z.any().optional(),
    status: z.any().optional(),
    recommendations: z.array(z.string()).optional(),
  }),
  processingTime: z.number(),
  timestamp: z.string(),
  errors: z.array(z.string()),
});

// Mock implementation for build compatibility
const financeAggregatorFlow = async (request: FinanceAggregatorRequest): Promise<FinanceAggregatorResponse> => {
    const startTime = Date.now();
    const response: FinanceAggregatorResponse = {
      success: false,
      action: request.action,
      artisanId: request.artisanId,
      results: {},
      processingTime: 0,
      timestamp: new Date().toISOString(),
      errors: []
    };

    try {
      console.log(`Finance Aggregator Agent: Processing ${request.action} for artisan ${request.artisanId}`);

      const aggregationService = FinanceAggregationService.getInstance();
      const anomalyService = AnomalyService.getInstance();

      switch (request.action) {
        case 'backfill':
          response.results.aggregation = await handleBackfill(aggregationService, request);
          break;

        case 'daily_aggregation':
          response.results.aggregation = await handleDailyAggregation(aggregationService, request);
          break;

        case 'detect_anomalies':
          response.results.anomalies = await handleAnomalyDetection(anomalyService, request);
          break;

        case 'full_pipeline':
          const pipelineResults = await handleFullPipeline(aggregationService, anomalyService, request);
          response.results = pipelineResults;
          break;

        case 'status_check':
          response.results.status = await handleStatusCheck(aggregationService, request);
          break;

        default:
          throw new Error(`Unknown action: ${request.action}`);
      }

      // Generate AI-powered recommendations based on results
      response.results.recommendations = await generateRecommendations(request, response.results);

      response.success = true;
      console.log(`Finance Aggregator Agent: Successfully completed ${request.action}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      response.errors.push(errorMessage);
      console.error(`Finance Aggregator Agent Error:`, error);
    }

    response.processingTime = Date.now() - startTime;
    return response;
};

export async function runFinanceAggregator(request: FinanceAggregatorRequest): Promise<FinanceAggregatorResponse> {
  return await financeAggregatorFlow(request);
}

// Scheduled job helpers
export async function runDailyAggregationJob(artisanIds: string[]): Promise<void> {
  console.log(`Running daily aggregation job for ${artisanIds.length} artisans`);
  
  const promises = artisanIds.map(artisanId => 
    runFinanceAggregator({
      action: 'daily_aggregation',
      artisanId,
      options: {
        periods: ['daily'],
        forceRecalculate: false
      }
    })
  );
  
  const results = await Promise.allSettled(promises);
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`Daily aggregation job completed: ${successful} successful, ${failed} failed`);
}

export async function runWeeklyAggregationJob(artisanIds: string[]): Promise<void> {
  console.log(`Running weekly aggregation job for ${artisanIds.length} artisans`);
  
  const promises = artisanIds.map(artisanId => 
    runFinanceAggregator({
      action: 'daily_aggregation',
      artisanId,
      options: {
        periods: ['weekly', 'monthly'],
        forceRecalculate: false
      }
    })
  );
  
  await Promise.allSettled(promises);
  console.log('Weekly aggregation job completed');
}

export async function runAnomalyDetectionJob(artisanIds: string[]): Promise<void> {
  console.log(`Running anomaly detection job for ${artisanIds.length} artisans`);
  
  const promises = artisanIds.map(artisanId => 
    runFinanceAggregator({
      action: 'detect_anomalies',
      artisanId
    })
  );
  
  await Promise.allSettled(promises);
  console.log('Anomaly detection job completed');
}