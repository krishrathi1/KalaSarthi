/**
 * Error Handler with Retry Mechanisms
 * Implements retry strategies with exponential backoff and graceful degradation
 * 
 * Requirements: 10.3, 10.4
 */

import {
  ErrorType,
  ErrorSeverity,
  SchemeSahayakError,
  ErrorMetadata,
  ExternalAPIError,
  MLModelError,
  DocumentProcessingError,
  NetworkError,
  DatabaseError,
  TimeoutError,
  RateLimitError
} from './ErrorTypes';

/**
 * Retry configuration for different error types
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
  fallbackStrategy?: 'cache' | 'rule-based' | 'manual-review' | 'queue';
}

/**
 * Error handling strategy configuration
 */
export interface ErrorHandlingStrategy {
  retryAttempts: number;
  retryDelay: number[]; // exponential backoff delays
  fallbackToCache?: boolean;
  fallbackToRuleBased?: boolean;
  fallbackToManualReview?: boolean;
  userNotification: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  suggestedActions?: string[];
}

/**
 * Default error handling strategies for each error type
 */
export const ERROR_HANDLING_STRATEGIES: Record<ErrorType, ErrorHandlingStrategy> = {
  [ErrorType.EXTERNAL_API_ERROR]: {
    retryAttempts: 3,
    retryDelay: [100, 500, 2000, 5000],
    fallbackToCache: true,
    userNotification: false,
    logLevel: 'warn',
    suggestedActions: ['Using cached data', 'Will retry automatically']
  },
  [ErrorType.ML_MODEL_ERROR]: {
    retryAttempts: 1,
    retryDelay: [1000],
    fallbackToRuleBased: true,
    userNotification: false,
    logLevel: 'error',
    suggestedActions: ['Using rule-based recommendations', 'Model will be retrained']
  },
  [ErrorType.DOCUMENT_PROCESSING_ERROR]: {
    retryAttempts: 2,
    retryDelay: [500, 2000],
    fallbackToManualReview: true,
    userNotification: true,
    logLevel: 'warn',
    suggestedActions: [
      'Check image quality',
      'Try uploading a clearer image',
      'Contact support for manual processing'
    ]
  },
  [ErrorType.NETWORK_ERROR]: {
    retryAttempts: 3,
    retryDelay: [1000, 3000, 5000],
    fallbackToCache: true,
    userNotification: true,
    logLevel: 'warn',
    suggestedActions: ['Check internet connection', 'Using offline mode']
  },
  [ErrorType.DATABASE_ERROR]: {
    retryAttempts: 2,
    retryDelay: [500, 2000],
    userNotification: false,
    logLevel: 'error',
    suggestedActions: ['Retrying operation', 'Contact support if issue persists']
  },
  [ErrorType.TIMEOUT_ERROR]: {
    retryAttempts: 2,
    retryDelay: [1000, 3000],
    userNotification: true,
    logLevel: 'warn',
    suggestedActions: ['Operation taking longer than expected', 'Retrying...']
  },
  [ErrorType.RATE_LIMIT_ERROR]: {
    retryAttempts: 1,
    retryDelay: [5000],
    userNotification: false,
    logLevel: 'info',
    suggestedActions: ['Rate limit reached', 'Will retry shortly']
  },
  [ErrorType.VALIDATION_ERROR]: {
    retryAttempts: 0,
    retryDelay: [],
    userNotification: true,
    logLevel: 'info',
    suggestedActions: ['Check input data', 'Verify required fields']
  },
  [ErrorType.AUTHENTICATION_ERROR]: {
    retryAttempts: 0,
    retryDelay: [],
    userNotification: true,
    logLevel: 'warn',
    suggestedActions: ['Please log in again', 'Check credentials']
  },
  [ErrorType.AUTHORIZATION_ERROR]: {
    retryAttempts: 0,
    retryDelay: [],
    userNotification: true,
    logLevel: 'warn',
    suggestedActions: ['Access denied', 'Contact administrator']
  },
  [ErrorType.NOT_FOUND_ERROR]: {
    retryAttempts: 0,
    retryDelay: [],
    userNotification: true,
    logLevel: 'info',
    suggestedActions: ['Resource not found', 'Verify the ID']
  },
  [ErrorType.CONFLICT_ERROR]: {
    retryAttempts: 1,
    retryDelay: [1000],
    userNotification: true,
    logLevel: 'warn',
    suggestedActions: ['Resource conflict detected', 'Retrying...']
  },
  [ErrorType.SYSTEM_ERROR]: {
    retryAttempts: 0,
    retryDelay: [],
    userNotification: true,
    logLevel: 'critical',
    suggestedActions: ['System error occurred', 'Contact support']
  }
};

/**
 * Retry result
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: SchemeSahayakError;
  attempts: number;
  fallbackUsed: boolean;
  fallbackType?: string;
}

/**
 * Error Handler Class
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: SchemeSahayakError[] = [];
  private maxLogSize = 1000;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorType: ErrorType,
    metadata: ErrorMetadata,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const strategy = ERROR_HANDLING_STRATEGIES[errorType];
    const maxAttempts = customConfig?.maxAttempts ?? strategy.retryAttempts + 1;
    
    let lastError: Error | undefined;
    let attempts = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      attempts++;
      
      try {
        const result = await operation();
        return {
          success: true,
          data: result,
          attempts,
          fallbackUsed: false
        };
      } catch (error) {
        lastError = error as Error;
        
        // If this is the last attempt, don't wait
        if (attempt < maxAttempts - 1) {
          const delay = strategy.retryDelay[attempt] || strategy.retryDelay[strategy.retryDelay.length - 1];
          await this.sleep(delay);
        }
      }
    }

    // All retries failed, create appropriate error
    const schemeSahayakError = this.createError(
      lastError?.message || 'Operation failed after retries',
      errorType,
      metadata,
      lastError
    );

    this.logError(schemeSahayakError);

    return {
      success: false,
      error: schemeSahayakError,
      attempts,
      fallbackUsed: false
    };
  }

  /**
   * Execute with exponential backoff
   */
  async executeWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    metadata: ErrorMetadata
  ): Promise<RetryResult<T>> {
    let attempts = 0;
    let delay = config.baseDelay;
    let lastError: Error | undefined;

    while (attempts < config.maxAttempts) {
      attempts++;

      try {
        const result = await operation();
        return {
          success: true,
          data: result,
          attempts,
          fallbackUsed: false
        };
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        const errorType = this.identifyErrorType(error);
        if (!config.retryableErrors.includes(errorType)) {
          break;
        }

        // If not last attempt, wait with exponential backoff
        if (attempts < config.maxAttempts) {
          await this.sleep(delay);
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
        }
      }
    }

    // Create error after all retries failed
    const errorType = this.identifyErrorType(lastError);
    const schemeSahayakError = this.createError(
      lastError?.message || 'Operation failed',
      errorType,
      metadata,
      lastError
    );

    this.logError(schemeSahayakError);

    return {
      success: false,
      error: schemeSahayakError,
      attempts,
      fallbackUsed: false
    };
  }

  /**
   * Handle error with graceful degradation
   */
  async handleWithGracefulDegradation<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    errorType: ErrorType,
    metadata: ErrorMetadata
  ): Promise<RetryResult<T>> {
    const retryResult = await this.executeWithRetry(
      operation,
      errorType,
      metadata
    );

    if (retryResult.success) {
      return retryResult;
    }

    // Try fallback
    try {
      const fallbackData = await fallbackOperation();
      return {
        success: true,
        data: fallbackData,
        attempts: retryResult.attempts,
        fallbackUsed: true,
        fallbackType: ERROR_HANDLING_STRATEGIES[errorType].fallbackToCache 
          ? 'cache' 
          : ERROR_HANDLING_STRATEGIES[errorType].fallbackToRuleBased 
          ? 'rule-based' 
          : 'manual-review'
      };
    } catch (fallbackError) {
      // Both primary and fallback failed
      return retryResult;
    }
  }

  /**
   * Create appropriate error based on type
   */
  createError(
    message: string,
    type: ErrorType,
    metadata: ErrorMetadata,
    originalError?: Error
  ): SchemeSahayakError {
    switch (type) {
      case ErrorType.EXTERNAL_API_ERROR:
        return new ExternalAPIError(message, metadata, originalError);
      case ErrorType.ML_MODEL_ERROR:
        return new MLModelError(message, metadata, originalError);
      case ErrorType.DOCUMENT_PROCESSING_ERROR:
        return new DocumentProcessingError(message, metadata, originalError);
      case ErrorType.NETWORK_ERROR:
        return new NetworkError(message, metadata, originalError);
      case ErrorType.DATABASE_ERROR:
        return new DatabaseError(message, metadata, originalError);
      case ErrorType.TIMEOUT_ERROR:
        return new TimeoutError(message, metadata, originalError);
      case ErrorType.RATE_LIMIT_ERROR:
        return new RateLimitError(message, metadata, 60);
      default:
        return new SchemeSahayakError(
          message,
          type,
          'UNKNOWN_001',
          ErrorSeverity.MEDIUM,
          false,
          ['Contact support'],
          metadata,
          originalError
        );
    }
  }

  /**
   * Identify error type from error object
   */
  private identifyErrorType(error: any): ErrorType {
    if (!error) return ErrorType.SYSTEM_ERROR;

    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR;
    }
    if (message.includes('rate limit')) {
      return ErrorType.RATE_LIMIT_ERROR;
    }
    if (message.includes('not found') || error.code === 'NOT_FOUND') {
      return ErrorType.NOT_FOUND_ERROR;
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return ErrorType.AUTHENTICATION_ERROR;
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return ErrorType.AUTHORIZATION_ERROR;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION_ERROR;
    }
    if (message.includes('database') || message.includes('firestore')) {
      return ErrorType.DATABASE_ERROR;
    }

    return ErrorType.SYSTEM_ERROR;
  }

  /**
   * Log error for monitoring
   */
  private logError(error: SchemeSahayakError): void {
    this.errorLog.push(error);
    
    // Maintain max log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console based on severity
    const strategy = ERROR_HANDLING_STRATEGIES[error.type];
    const logMessage = `[${error.severity}] ${error.type}: ${error.message}`;
    
    switch (strategy.logLevel) {
      case 'critical':
      case 'error':
        console.error(logMessage, error);
        break;
      case 'warn':
        console.warn(logMessage, error);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
    }
  }

  /**
   * Get recent errors for monitoring
   */
  getRecentErrors(count: number = 100): SchemeSahayakError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: ErrorType): SchemeSahayakError[] {
    return this.errorLog.filter(error => error.type === type);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): SchemeSahayakError[] {
    return this.errorLog.filter(error => error.severity === severity);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recentErrors: number;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errorLog.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    // Count errors in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = this.errorLog.filter(
      error => error.metadata.timestamp > oneHourAgo
    ).length;

    return {
      total: this.errorLog.length,
      byType: byType as Record<ErrorType, number>,
      bySeverity: bySeverity as Record<ErrorSeverity, number>,
      recentErrors
    };
  }
}

/**
 * Convenience function to get error handler instance
 */
export const getErrorHandler = () => ErrorHandler.getInstance();
