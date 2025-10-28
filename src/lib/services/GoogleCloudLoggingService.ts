/**
 * Google Cloud Logging Service for Intelligent Artisan Matching
 * Provides structured logging and monitoring using Google Cloud Logging
 */

import { Logging } from '@google-cloud/logging';
import { GoogleAuth } from 'google-auth-library';

export interface LogEntry {
  severity: 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'ALERT' | 'EMERGENCY';
  message: string;
  resource?: {
    type: string;
    labels: {
      [key: string]: string;
    };
  };
  jsonPayload?: {
    [key: string]: any;
  };
  timestamp: string;
  labels?: {
    [key: string]: string;
  };
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  errorCode?: string;
  metadata?: {
    [key: string]: any;
  };
}

export class GoogleCloudLoggingService {
  private static instance: GoogleCloudLoggingService;
  private logging: Logging;
  private log: any;
  private projectId: string;
  private logName: string;

  constructor() {
    // Initialize Google Cloud Logging
    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/logging.write']
    });

    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
    this.logName = process.env.GOOGLE_CLOUD_LOG_NAME || 'intelligent-matching-log';

    this.logging = new Logging({
      projectId: this.projectId,
      auth
    });

    this.log = this.logging.log(this.logName);

    if (!this.projectId) {
      console.warn('Google Cloud Project ID not configured. Logging will use console fallback.');
    }
  }

  static getInstance(): GoogleCloudLoggingService {
    if (!GoogleCloudLoggingService.instance) {
      GoogleCloudLoggingService.instance = new GoogleCloudLoggingService();
    }
    return GoogleCloudLoggingService.instance;
  }

  /**
   * Log interaction events to Google Cloud Logging
   */
  async logInteraction(entry: LogEntry): Promise<void> {
    try {
      if (!this.projectId) {
        // Fallback to console logging
        console.log(`[${entry.severity}] ${entry.message}`, entry.jsonPayload);
        return;
      }

      // Create structured log entry for Google Cloud Logging
      const logEntry = this.log.entry({
        resource: entry.resource || {
          type: 'global'
        },
        severity: entry.severity,
        timestamp: new Date(entry.timestamp),
        labels: {
          service: 'intelligent-matching',
          version: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          ...entry.labels
        }
      }, {
        message: entry.message,
        ...entry.jsonPayload
      });

      // Write to Google Cloud Logging
      await this.log.write(logEntry);
      
    } catch (error) {
      console.error('Error writing to Google Cloud Logging:', error);
      // Fallback to console logging
      console.log(`[${entry.severity}] ${entry.message}`, entry.jsonPayload);
    }
  }

  /**
   * Log performance metrics
   */
  async logPerformance(metrics: PerformanceMetrics): Promise<void> {
    try {
      await this.logInteraction({
        severity: metrics.success ? 'INFO' : 'WARNING',
        message: `Performance: ${metrics.operation}`,
        jsonPayload: {
          operation: metrics.operation,
          duration_ms: metrics.duration,
          success: metrics.success,
          error_code: metrics.errorCode,
          metadata: metrics.metadata,
          performance_category: 'api_response_time'
        },
        timestamp: new Date().toISOString(),
        labels: {
          operation_type: metrics.operation,
          status: metrics.success ? 'success' : 'error'
        }
      });
    } catch (error) {
      console.error('Error logging performance metrics:', error);
    }
  }

  /**
   * Log matching algorithm performance
   */
  async logMatchingPerformance(data: {
    searchQuery: string;
    processingTime: number;
    resultsCount: number;
    averageRelevanceScore: number;
    filtersApplied: any;
    success: boolean;
    errorDetails?: string;
  }): Promise<void> {
    try {
      await this.logInteraction({
        severity: data.success ? 'INFO' : 'ERROR',
        message: `Matching algorithm execution: ${data.success ? 'SUCCESS' : 'FAILED'}`,
        jsonPayload: {
          search_query: data.searchQuery,
          processing_time_ms: data.processingTime,
          results_count: data.resultsCount,
          average_relevance_score: data.averageRelevanceScore,
          filters_applied: data.filtersApplied,
          success: data.success,
          error_details: data.errorDetails,
          algorithm_version: '1.0.0',
          performance_category: 'matching_algorithm'
        },
        timestamp: new Date().toISOString(),
        labels: {
          operation_type: 'intelligent_matching',
          status: data.success ? 'success' : 'error',
          results_category: data.resultsCount > 0 ? 'has_results' : 'no_results'
        }
      });
    } catch (error) {
      console.error('Error logging matching performance:', error);
    }
  }

  /**
   * Log user behavior patterns for analysis
   */
  async logUserBehavior(data: {
    userId: string;
    sessionId: string;
    action: string;
    context: {
      searchQuery?: string;
      artisanId?: string;
      relevanceScore?: number;
      locationUsed?: boolean;
      deviceType?: string;
      userAgent?: string;
    };
  }): Promise<void> {
    try {
      await this.logInteraction({
        severity: 'INFO',
        message: `User behavior: ${data.action}`,
        jsonPayload: {
          user_id: data.userId,
          session_id: data.sessionId,
          action: data.action,
          context: data.context,
          behavior_category: 'user_interaction',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        labels: {
          user_action: data.action,
          has_location: data.context.locationUsed ? 'true' : 'false',
          device_type: data.context.deviceType || 'unknown'
        }
      });
    } catch (error) {
      console.error('Error logging user behavior:', error);
    }
  }

  /**
   * Log system errors with context
   */
  async logError(error: Error, context: {
    operation: string;
    userId?: string;
    requestData?: any;
    stackTrace?: string;
  }): Promise<void> {
    try {
      await this.logInteraction({
        severity: 'ERROR',
        message: `System error in ${context.operation}: ${error.message}`,
        jsonPayload: {
          error_message: error.message,
          error_name: error.name,
          operation: context.operation,
          user_id: context.userId,
          request_data: context.requestData,
          stack_trace: context.stackTrace || error.stack,
          error_category: 'system_error',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        labels: {
          error_type: error.name,
          operation: context.operation,
          severity_level: 'high'
        }
      });
    } catch (loggingError) {
      console.error('Error logging system error:', loggingError);
      console.error('Original error:', error);
    }
  }

  /**
   * Log AI service performance and accuracy
   */
  async logAIPerformance(data: {
    service: 'requirement_analysis' | 'relevance_scoring' | 'location_processing';
    inputData: any;
    outputData: any;
    processingTime: number;
    confidence: number;
    success: boolean;
    errorDetails?: string;
  }): Promise<void> {
    try {
      await this.logInteraction({
        severity: data.success ? 'INFO' : 'WARNING',
        message: `AI Service Performance: ${data.service}`,
        jsonPayload: {
          ai_service: data.service,
          processing_time_ms: data.processingTime,
          confidence_score: data.confidence,
          success: data.success,
          error_details: data.errorDetails,
          input_size: JSON.stringify(data.inputData).length,
          output_size: JSON.stringify(data.outputData).length,
          ai_category: 'service_performance',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        labels: {
          ai_service: data.service,
          confidence_level: data.confidence > 0.7 ? 'high' : data.confidence > 0.4 ? 'medium' : 'low',
          status: data.success ? 'success' : 'error'
        }
      });
    } catch (error) {
      console.error('Error logging AI performance:', error);
    }
  }

  /**
   * Create custom metrics for Google Cloud Monitoring
   */
  async createCustomMetric(metricData: {
    metricType: string;
    value: number;
    labels: { [key: string]: string };
    timestamp?: Date;
  }): Promise<void> {
    try {
      if (!this.projectId) {
        console.log(`Custom metric: ${metricData.metricType} = ${metricData.value}`, metricData.labels);
        return;
      }

      // Log as structured data that can be used to create custom metrics
      await this.logInteraction({
        severity: 'INFO',
        message: `Custom metric: ${metricData.metricType}`,
        jsonPayload: {
          metric_type: metricData.metricType,
          metric_value: metricData.value,
          metric_labels: metricData.labels,
          metric_category: 'custom_metrics',
          timestamp: (metricData.timestamp || new Date()).toISOString()
        },
        timestamp: (metricData.timestamp || new Date()).toISOString(),
        labels: {
          metric_type: metricData.metricType,
          ...metricData.labels
        }
      });
    } catch (error) {
      console.error('Error creating custom metric:', error);
    }
  }

  /**
   * Batch log multiple entries for efficiency
   */
  async batchLog(entries: LogEntry[]): Promise<void> {
    try {
      if (!this.projectId) {
        // Fallback to console logging
        entries.forEach(entry => {
          console.log(`[${entry.severity}] ${entry.message}`, entry.jsonPayload);
        });
        return;
      }

      const logEntries = entries.map(entry => 
        this.log.entry({
          resource: entry.resource || { type: 'global' },
          severity: entry.severity,
          timestamp: new Date(entry.timestamp),
          labels: {
            service: 'intelligent-matching',
            version: process.env.APP_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            ...entry.labels
          }
        }, {
          message: entry.message,
          ...entry.jsonPayload
        })
      );

      await this.log.write(logEntries);
      
    } catch (error) {
      console.error('Error batch writing to Google Cloud Logging:', error);
      // Fallback to individual console logs
      entries.forEach(entry => {
        console.log(`[${entry.severity}] ${entry.message}`, entry.jsonPayload);
      });
    }
  }

  /**
   * Query logs for analysis (requires additional permissions)
   */
  async queryLogs(filter: string, timeRange: { start: Date; end: Date }): Promise<any[]> {
    try {
      if (!this.projectId) {
        console.warn('Google Cloud Project ID not configured. Cannot query logs.');
        return [];
      }

      const options = {
        filter: `${filter} AND timestamp >= "${timeRange.start.toISOString()}" AND timestamp <= "${timeRange.end.toISOString()}"`,
        pageSize: 1000
      };

      const [entries] = await this.logging.getEntries(options);
      
      return entries.map(entry => ({
        timestamp: entry.metadata.timestamp,
        severity: entry.metadata.severity,
        message: entry.data.message,
        jsonPayload: entry.data
      }));
      
    } catch (error) {
      console.error('Error querying logs:', error);
      return [];
    }
  }

  /**
   * Check if Google Cloud Logging is properly configured
   */
  isConfigured(): boolean {
    return !!this.projectId;
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): { configured: boolean; missingFields: string[] } {
    const missingFields = [];
    
    if (!this.projectId) missingFields.push('GOOGLE_CLOUD_PROJECT_ID');
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) missingFields.push('GOOGLE_APPLICATION_CREDENTIALS');
    
    return {
      configured: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Test logging functionality
   */
  async testLogging(): Promise<boolean> {
    try {
      await this.logInteraction({
        severity: 'INFO',
        message: 'Google Cloud Logging test',
        jsonPayload: {
          test: true,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Logging test failed:', error);
      return false;
    }
  }
}

export default GoogleCloudLoggingService;