/**
 * Comprehensive Error Handling for Gupshup Service
 * Defines error types, categorization, retry policies, and monitoring infrastructure
 */

/**
 * Gupshup-specific error codes and categories
 */
export enum GupshupErrorCode {
  // Authentication Errors
  INVALID_API_KEY = 'INVALID_API_KEY',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Rate Limiting Errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // Message Errors
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  INVALID_TEMPLATE = 'INVALID_TEMPLATE',
  TEMPLATE_NOT_APPROVED = 'TEMPLATE_NOT_APPROVED',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  
  // WhatsApp Specific Errors
  WHATSAPP_USER_NOT_OPTED_IN = 'WHATSAPP_USER_NOT_OPTED_IN',
  WHATSAPP_USER_BLOCKED = 'WHATSAPP_USER_BLOCKED',
  WHATSAPP_BUSINESS_ACCOUNT_RESTRICTED = 'WHATSAPP_BUSINESS_ACCOUNT_RESTRICTED',
  
  // SMS Specific Errors
  SMS_SENDER_ID_NOT_APPROVED = 'SMS_SENDER_ID_NOT_APPROVED',
  SMS_CONTENT_BLOCKED = 'SMS_CONTENT_BLOCKED',
  SMS_ROUTE_UNAVAILABLE = 'SMS_ROUTE_UNAVAILABLE',
  INVALID_SENDER_ID = 'INVALID_SENDER_ID',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  SMS_DND_NUMBER = 'SMS_DND_NUMBER',
  
  // Network and System Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  
  // Configuration Errors
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  
  // Unknown Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error categories for different handling strategies
 */
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMITING = 'RATE_LIMITING',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  SERVICE = 'SERVICE',
  CONFIGURATION = 'CONFIGURATION',
  USER_ERROR = 'USER_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

/**
 * Retry action types
 */
export enum RetryAction {
  RETRY = 'RETRY',
  RETRY_WITH_BACKOFF = 'RETRY_WITH_BACKOFF',
  RETRY_AFTER_DELAY = 'RETRY_AFTER_DELAY',
  FALLBACK = 'FALLBACK',
  SKIP = 'SKIP',
  ESCALATE = 'ESCALATE',
  NO_RETRY = 'NO_RETRY',
}

/**
 * Gupshup error class with detailed information
 */
export class GupshupError extends Error {
  public readonly code: GupshupErrorCode;
  public readonly category: ErrorCategory;
  public readonly retryAction: RetryAction;
  public readonly httpStatus?: number;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly isRetryable: boolean;

  constructor(
    code: GupshupErrorCode,
    message: string,
    options: {
      category?: ErrorCategory;
      retryAction?: RetryAction;
      httpStatus?: number;
      originalError?: Error;
      context?: Record<string, any>;
    } = {}
  ) {
    super(message);
    this.name = 'GupshupError';
    this.code = code;
    this.category = options.category || this.inferCategory(code);
    this.retryAction = options.retryAction || this.inferRetryAction(code);
    this.httpStatus = options.httpStatus;
    this.originalError = options.originalError;
    this.context = options.context;
    this.timestamp = new Date();
    this.isRetryable = this.retryAction !== RetryAction.NO_RETRY;
  }

  /**
   * Infer error category from error code
   */
  private inferCategory(code: GupshupErrorCode): ErrorCategory {
    switch (code) {
      case GupshupErrorCode.INVALID_API_KEY:
      case GupshupErrorCode.UNAUTHORIZED:
      case GupshupErrorCode.FORBIDDEN:
        return ErrorCategory.AUTHENTICATION;
      
      case GupshupErrorCode.RATE_LIMIT_EXCEEDED:
      case GupshupErrorCode.QUOTA_EXCEEDED:
        return ErrorCategory.RATE_LIMITING;
      
      case GupshupErrorCode.INVALID_PHONE_NUMBER:
      case GupshupErrorCode.INVALID_TEMPLATE:
      case GupshupErrorCode.INVALID_PARAMETERS:
      case GupshupErrorCode.MESSAGE_TOO_LONG:
        return ErrorCategory.VALIDATION;
      
      case GupshupErrorCode.NETWORK_ERROR:
      case GupshupErrorCode.TIMEOUT:
        return ErrorCategory.NETWORK;
      
      case GupshupErrorCode.SERVICE_UNAVAILABLE:
      case GupshupErrorCode.INTERNAL_SERVER_ERROR:
        return ErrorCategory.SERVICE;
      
      case GupshupErrorCode.INVALID_CONFIGURATION:
      case GupshupErrorCode.MISSING_CREDENTIALS:
        return ErrorCategory.CONFIGURATION;
      
      case GupshupErrorCode.WHATSAPP_USER_NOT_OPTED_IN:
      case GupshupErrorCode.WHATSAPP_USER_BLOCKED:
      case GupshupErrorCode.SMS_CONTENT_BLOCKED:
      case GupshupErrorCode.SMS_DND_NUMBER:
        return ErrorCategory.USER_ERROR;
      
      case GupshupErrorCode.INVALID_SENDER_ID:
      case GupshupErrorCode.INSUFFICIENT_BALANCE:
      case GupshupErrorCode.SMS_SENDER_ID_NOT_APPROVED:
        return ErrorCategory.CONFIGURATION;
      
      default:
        return ErrorCategory.SYSTEM_ERROR;
    }
  }

  /**
   * Infer retry action from error code
   */
  private inferRetryAction(code: GupshupErrorCode): RetryAction {
    switch (code) {
      case GupshupErrorCode.RATE_LIMIT_EXCEEDED:
        return RetryAction.RETRY_AFTER_DELAY;
      
      case GupshupErrorCode.NETWORK_ERROR:
      case GupshupErrorCode.TIMEOUT:
      case GupshupErrorCode.SERVICE_UNAVAILABLE:
        return RetryAction.RETRY_WITH_BACKOFF;
      
      case GupshupErrorCode.WHATSAPP_USER_NOT_OPTED_IN:
      case GupshupErrorCode.WHATSAPP_USER_BLOCKED:
      case GupshupErrorCode.SMS_DND_NUMBER:
        return RetryAction.FALLBACK;
      
      case GupshupErrorCode.INVALID_API_KEY:
      case GupshupErrorCode.UNAUTHORIZED:
      case GupshupErrorCode.FORBIDDEN:
      case GupshupErrorCode.INVALID_PHONE_NUMBER:
      case GupshupErrorCode.INVALID_TEMPLATE:
      case GupshupErrorCode.INVALID_PARAMETERS:
        return RetryAction.NO_RETRY;
      
      case GupshupErrorCode.TEMPLATE_NOT_APPROVED:
      case GupshupErrorCode.SMS_SENDER_ID_NOT_APPROVED:
      case GupshupErrorCode.INSUFFICIENT_BALANCE:
        return RetryAction.ESCALATE;
      
      case GupshupErrorCode.INVALID_SENDER_ID:
      case GupshupErrorCode.SMS_CONTENT_BLOCKED:
        return RetryAction.NO_RETRY;
      
      default:
        return RetryAction.RETRY;
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      retryAction: this.retryAction,
      httpStatus: this.httpStatus,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }
}

/**
 * Error parser to convert HTTP responses and exceptions to GupshupError
 */
export class GupshupErrorParser {
  /**
   * Parse HTTP response error
   */
  static parseHttpError(
    response: Response,
    responseBody?: any,
    context?: Record<string, any>
  ): GupshupError {
    const status = response.status;
    const statusText = response.statusText;
    
    // Try to extract error details from response body
    const errorMessage = responseBody?.message || responseBody?.error || statusText;
    const errorCode = this.mapHttpStatusToErrorCode(status, responseBody);
    
    return new GupshupError(errorCode, errorMessage, {
      httpStatus: status,
      context: {
        ...context,
        url: response.url,
        statusText,
        responseBody,
      },
    });
  }

  /**
   * Parse network or system error
   */
  static parseSystemError(
    error: Error,
    context?: Record<string, any>
  ): GupshupError {
    const message = error.message.toLowerCase();
    let code = GupshupErrorCode.UNKNOWN_ERROR;

    if (message.includes('timeout') || message.includes('aborted')) {
      code = GupshupErrorCode.TIMEOUT;
    } else if (message.includes('network') || message.includes('fetch')) {
      code = GupshupErrorCode.NETWORK_ERROR;
    } else if (message.includes('rate limit')) {
      code = GupshupErrorCode.RATE_LIMIT_EXCEEDED;
    } else if (message.includes('unauthorized') || message.includes('401')) {
      code = GupshupErrorCode.UNAUTHORIZED;
    } else if (message.includes('forbidden') || message.includes('403')) {
      code = GupshupErrorCode.FORBIDDEN;
    }

    return new GupshupError(code, error.message, {
      originalError: error,
      context,
    });
  }

  /**
   * Map HTTP status codes to Gupshup error codes
   */
  private static mapHttpStatusToErrorCode(
    status: number,
    responseBody?: any
  ): GupshupErrorCode {
    switch (status) {
      case 400:
        if (responseBody?.code === 'INVALID_PHONE_NUMBER') {
          return GupshupErrorCode.INVALID_PHONE_NUMBER;
        }
        if (responseBody?.code === 'INVALID_TEMPLATE') {
          return GupshupErrorCode.INVALID_TEMPLATE;
        }
        return GupshupErrorCode.INVALID_PARAMETERS;
      
      case 401:
        return GupshupErrorCode.UNAUTHORIZED;
      
      case 403:
        return GupshupErrorCode.FORBIDDEN;
      
      case 429:
        return GupshupErrorCode.RATE_LIMIT_EXCEEDED;
      
      case 500:
        return GupshupErrorCode.INTERNAL_SERVER_ERROR;
      
      case 503:
        return GupshupErrorCode.SERVICE_UNAVAILABLE;
      
      default:
        return GupshupErrorCode.UNKNOWN_ERROR;
    }
  }
}

/**
 * Retry policy configuration
 */
export interface RetryPolicyConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableCategories: ErrorCategory[];
}

/**
 * Default retry policies for different error categories
 */
export const DEFAULT_RETRY_POLICIES: Record<ErrorCategory, RetryPolicyConfig> = {
  [ErrorCategory.AUTHENTICATION]: {
    maxRetries: 0,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    retryableCategories: [],
  },
  [ErrorCategory.RATE_LIMITING]: {
    maxRetries: 3,
    baseDelay: 5000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    retryableCategories: [ErrorCategory.RATE_LIMITING],
  },
  [ErrorCategory.VALIDATION]: {
    maxRetries: 0,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    retryableCategories: [],
  },
  [ErrorCategory.NETWORK]: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableCategories: [ErrorCategory.NETWORK, ErrorCategory.SERVICE],
  },
  [ErrorCategory.SERVICE]: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 20000,
    backoffMultiplier: 2,
    retryableCategories: [ErrorCategory.SERVICE],
  },
  [ErrorCategory.CONFIGURATION]: {
    maxRetries: 0,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    retryableCategories: [],
  },
  [ErrorCategory.USER_ERROR]: {
    maxRetries: 0,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    retryableCategories: [],
  },
  [ErrorCategory.SYSTEM_ERROR]: {
    maxRetries: 1,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryableCategories: [ErrorCategory.SYSTEM_ERROR],
  },
};

/**
 * Error monitoring and logging service
 */
export class GupshupErrorMonitor {
  private errorCounts: Map<GupshupErrorCode, number> = new Map();
  private lastErrors: GupshupError[] = [];
  private maxStoredErrors = 100;

  /**
   * Log an error occurrence
   */
  logError(error: GupshupError): void {
    // Update error counts
    const currentCount = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, currentCount + 1);

    // Store recent errors
    this.lastErrors.unshift(error);
    if (this.lastErrors.length > this.maxStoredErrors) {
      this.lastErrors = this.lastErrors.slice(0, this.maxStoredErrors);
    }

    // Log to console (in production, this would go to a proper logging service)
    console.error('Gupshup Error:', error.toJSON());

    // Check for error patterns that need escalation
    this.checkForEscalation(error);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, any> {
    const stats: Record<string, number> = {};
    for (const [code, count] of this.errorCounts.entries()) {
      stats[code] = count;
    }

    return {
      totalErrors: this.lastErrors.length,
      errorCounts: stats,
      recentErrors: this.lastErrors.slice(0, 10).map(e => ({
        code: e.code,
        message: e.message,
        timestamp: e.timestamp,
        category: e.category,
      })),
    };
  }

  /**
   * Check if error patterns require escalation
   */
  private checkForEscalation(error: GupshupError): void {
    // Check for authentication errors
    if (error.category === ErrorCategory.AUTHENTICATION) {
      console.warn('Authentication error detected - check API credentials');
    }

    // Check for high error rates
    const recentErrors = this.lastErrors.filter(
      e => Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
    );

    if (recentErrors.length > 10) {
      console.warn('High error rate detected - consider service health check');
    }

    // Check for quota exceeded
    if (error.code === GupshupErrorCode.QUOTA_EXCEEDED) {
      console.warn('Daily quota exceeded - consider upgrading plan or implementing better rate limiting');
    }
  }

  /**
   * Clear error statistics
   */
  clearStats(): void {
    this.errorCounts.clear();
    this.lastErrors = [];
  }
}

/**
 * Singleton error monitor instance
 */
let errorMonitorInstance: GupshupErrorMonitor | null = null;

export function getGupshupErrorMonitor(): GupshupErrorMonitor {
  if (!errorMonitorInstance) {
    errorMonitorInstance = new GupshupErrorMonitor();
  }
  return errorMonitorInstance;
}

/**
 * Utility function to handle errors consistently
 */
export function handleGupshupError(
  error: unknown,
  context?: Record<string, any>
): GupshupError {
  let gupshupError: GupshupError;

  if (error instanceof GupshupError) {
    gupshupError = error;
  } else if (error instanceof Error) {
    gupshupError = GupshupErrorParser.parseSystemError(error, context);
  } else {
    gupshupError = new GupshupError(
      GupshupErrorCode.UNKNOWN_ERROR,
      'An unknown error occurred',
      { context }
    );
  }

  // Log the error
  getGupshupErrorMonitor().logError(gupshupError);

  return gupshupError;
}