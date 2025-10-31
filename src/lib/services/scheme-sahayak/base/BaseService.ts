/**
 * Base service class for AI-Powered Scheme Sahayak v2.0
 * Provides common functionality and error handling for all services
 */

import { FirestoreService } from '../../../firestore';
import { 
  SchemeSahayakErrorType, 
  SchemeSahayakErrorResponse,
  SchemeSahayakApiResponse 
} from '../../../types/scheme-sahayak';

/**
 * Base service class with common functionality
 */
export abstract class BaseService {
  protected readonly serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Create a standardized error response
   */
  protected createError(
    type: SchemeSahayakErrorType,
    code: string,
    message: string,
    details?: any,
    suggestedActions: string[] = []
  ): SchemeSahayakErrorResponse {
    return {
      error: {
        type,
        code,
        message,
        details,
        timestamp: new Date(),
        requestId: this.generateRequestId(),
        suggestedActions
      }
    };
  }

  /**
   * Create a standardized success response
   */
  protected createSuccessResponse<T>(
    data: T,
    processingTime?: number
  ): SchemeSahayakApiResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: new Date(),
        processingTime: processingTime || 0,
        version: '2.0'
      }
    };
  }

  /**
   * Create a standardized error response
   */
  protected createErrorResponse(
    error: SchemeSahayakErrorResponse['error']
  ): SchemeSahayakApiResponse<never> {
    return {
      success: false,
      error,
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: new Date(),
        processingTime: 0,
        version: '2.0'
      }
    };
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log service activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      service: this.serviceName,
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    switch (level) {
      case 'error':
        console.error(`[${this.serviceName}] ERROR:`, message, data);
        break;
      case 'warn':
        console.warn(`[${this.serviceName}] WARN:`, message, data);
        break;
      default:
        console.log(`[${this.serviceName}] INFO:`, message, data);
    }
  }

  /**
   * Validate required parameters
   */
  protected validateRequired(params: Record<string, any>, requiredFields: string[]): void {
    const missing = requiredFields.filter(field => 
      params[field] === undefined || params[field] === null || params[field] === ''
    );

    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }
  }

  /**
   * Handle async operations with error catching
   */
  protected async handleAsync<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    errorCode: string = 'OPERATION_FAILED'
  ): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await operation();
      const processingTime = Date.now() - startTime;
      
      this.log('info', `Operation completed successfully in ${processingTime}ms`);
      return result;
    } catch (error) {
      this.log('error', errorMessage, error);
      
      if (error instanceof Error) {
        throw this.createError(
          SchemeSahayakErrorType.SYSTEM_ERROR,
          errorCode,
          `${errorMessage}: ${error.message}`,
          error,
          ['Check system logs', 'Retry the operation', 'Contact support if issue persists']
        );
      }
      
      throw this.createError(
        SchemeSahayakErrorType.SYSTEM_ERROR,
        errorCode,
        errorMessage,
        error,
        ['Check system logs', 'Retry the operation', 'Contact support if issue persists']
      );
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.log('warn', `Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Validate artisan ID format
   */
  protected validateArtisanId(artisanId: string): void {
    if (!artisanId || typeof artisanId !== 'string' || artisanId.trim().length === 0) {
      throw new Error('Invalid artisan ID provided');
    }
  }

  /**
   * Validate scheme ID format
   */
  protected validateSchemeId(schemeId: string): void {
    if (!schemeId || typeof schemeId !== 'string' || schemeId.trim().length === 0) {
      throw new Error('Invalid scheme ID provided');
    }
  }

  /**
   * Validate date range
   */
  protected validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    const now = new Date();
    if (startDate > now) {
      throw new Error('Start date cannot be in the future');
    }
  }

  /**
   * Sanitize user input
   */
  protected sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }

  /**
   * Check if service is healthy
   */
  public async healthCheck(): Promise<{
    service: string;
    status: 'healthy' | 'unhealthy';
    timestamp: Date;
    details?: any;
  }> {
    try {
      // Basic health check - can be overridden by subclasses
      await this.performHealthCheck();
      
      return {
        service: this.serviceName,
        status: 'healthy',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: this.serviceName,
        status: 'unhealthy',
        timestamp: new Date(),
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Override this method in subclasses for specific health checks
   */
  protected async performHealthCheck(): Promise<void> {
    // Default implementation - just check if service can be instantiated
    return Promise.resolve();
  }

  /**
   * Get service metrics
   */
  public getMetrics(): {
    service: string;
    uptime: number;
    timestamp: Date;
  } {
    return {
      service: this.serviceName,
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }
}

/**
 * Service registry for managing service instances
 */
export class ServiceRegistry {
  private static services: Map<string, BaseService> = new Map();

  /**
   * Register a service instance
   */
  static register(name: string, service: BaseService): void {
    this.services.set(name, service);
  }

  /**
   * Get a registered service
   */
  static get<T extends BaseService>(name: string): T | undefined {
    return this.services.get(name) as T;
  }

  /**
   * Get all registered services
   */
  static getAll(): Map<string, BaseService> {
    return new Map(this.services);
  }

  /**
   * Check health of all services
   */
  static async checkAllHealth(): Promise<Array<{
    service: string;
    status: 'healthy' | 'unhealthy';
    timestamp: Date;
    details?: any;
  }>> {
    const healthChecks = Array.from(this.services.values()).map(service => 
      service.healthCheck()
    );

    return Promise.all(healthChecks);
  }

  /**
   * Get metrics for all services
   */
  static getAllMetrics(): Array<{
    service: string;
    uptime: number;
    timestamp: Date;
  }> {
    return Array.from(this.services.values()).map(service => 
      service.getMetrics()
    );
  }
}