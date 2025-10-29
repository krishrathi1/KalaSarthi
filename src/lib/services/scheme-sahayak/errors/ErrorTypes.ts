/**
 * Error Types and Classification
 * Comprehensive error handling system for Scheme Sahayak
 * 
 * Requirements: 10.3, 10.4
 */

/**
 * Error type enumeration for classification
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  ML_MODEL_ERROR = 'ML_MODEL_ERROR',
  DOCUMENT_PROCESSING_ERROR = 'DOCUMENT_PROCESSING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Base error response interface
 */
export interface ErrorResponse {
  error: {
    type: ErrorType;
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
    requestId: string;
    suggestedActions: string[];
    severity: ErrorSeverity;
    retryable: boolean;
  };
}

/**
 * Error metadata for tracking and debugging
 */
export interface ErrorMetadata {
  userId?: string;
  service: string;
  method: string;
  timestamp: Date;
  requestId: string;
  context?: Record<string, any>;
  stackTrace?: string;
}

/**
 * Base custom error class
 */
export class SchemeSahayakError extends Error {
  public readonly type: ErrorType;
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly suggestedActions: string[];
  public readonly metadata: ErrorMetadata;
  public readonly originalError?: Error;

  constructor(
    message: string,
    type: ErrorType,
    code: string,
    severity: ErrorSeverity,
    retryable: boolean,
    suggestedActions: string[],
    metadata: ErrorMetadata,
    originalError?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.code = code;
    this.severity = severity;
    this.retryable = retryable;
    this.suggestedActions = suggestedActions;
    this.metadata = metadata;
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): ErrorResponse {
    return {
      error: {
        type: this.type,
        code: this.code,
        message: this.message,
        details: this.originalError?.message,
        timestamp: this.metadata.timestamp,
        requestId: this.metadata.requestId,
        suggestedActions: this.suggestedActions,
        severity: this.severity,
        retryable: this.retryable
      }
    };
  }
}

/**
 * Validation Error
 */
export class ValidationError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    suggestedActions: string[] = ['Check input data format', 'Verify required fields']
  ) {
    super(
      message,
      ErrorType.VALIDATION_ERROR,
      'VAL_001',
      ErrorSeverity.LOW,
      false,
      suggestedActions,
      metadata
    );
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    suggestedActions: string[] = ['Re-authenticate', 'Check credentials']
  ) {
    super(
      message,
      ErrorType.AUTHENTICATION_ERROR,
      'AUTH_001',
      ErrorSeverity.HIGH,
      false,
      suggestedActions,
      metadata
    );
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    suggestedActions: string[] = ['Check user permissions', 'Contact administrator']
  ) {
    super(
      message,
      ErrorType.AUTHORIZATION_ERROR,
      'AUTHZ_001',
      ErrorSeverity.MEDIUM,
      false,
      suggestedActions,
      metadata
    );
  }
}

/**
 * External API Error
 */
export class ExternalAPIError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    originalError?: Error,
    suggestedActions: string[] = ['Retry the operation', 'Check API status']
  ) {
    super(
      message,
      ErrorType.EXTERNAL_API_ERROR,
      'EXT_API_001',
      ErrorSeverity.MEDIUM,
      true,
      suggestedActions,
      metadata,
      originalError
    );
  }
}

/**
 * ML Model Error
 */
export class MLModelError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    originalError?: Error,
    suggestedActions: string[] = ['Using fallback recommendations', 'Model will be retrained']
  ) {
    super(
      message,
      ErrorType.ML_MODEL_ERROR,
      'ML_001',
      ErrorSeverity.MEDIUM,
      true,
      suggestedActions,
      metadata,
      originalError
    );
  }
}

/**
 * Document Processing Error
 */
export class DocumentProcessingError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    originalError?: Error,
    suggestedActions: string[] = [
      'Check image quality',
      'Try uploading a clearer image',
      'Contact support for manual processing'
    ]
  ) {
    super(
      message,
      ErrorType.DOCUMENT_PROCESSING_ERROR,
      'DOC_001',
      ErrorSeverity.MEDIUM,
      true,
      suggestedActions,
      metadata,
      originalError
    );
  }
}

/**
 * Network Error
 */
export class NetworkError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    originalError?: Error,
    suggestedActions: string[] = ['Check internet connection', 'Retry the operation']
  ) {
    super(
      message,
      ErrorType.NETWORK_ERROR,
      'NET_001',
      ErrorSeverity.MEDIUM,
      true,
      suggestedActions,
      metadata,
      originalError
    );
  }
}

/**
 * Database Error
 */
export class DatabaseError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    originalError?: Error,
    suggestedActions: string[] = ['Retry the operation', 'Contact support if issue persists']
  ) {
    super(
      message,
      ErrorType.DATABASE_ERROR,
      'DB_001',
      ErrorSeverity.HIGH,
      true,
      suggestedActions,
      metadata,
      originalError
    );
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    retryAfter: number,
    suggestedActions: string[] = ['Wait before retrying', 'Reduce request frequency']
  ) {
    super(
      message,
      ErrorType.RATE_LIMIT_ERROR,
      'RATE_001',
      ErrorSeverity.LOW,
      true,
      [...suggestedActions, `Retry after ${retryAfter} seconds`],
      metadata
    );
  }
}

/**
 * Timeout Error
 */
export class TimeoutError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    originalError?: Error,
    suggestedActions: string[] = ['Retry the operation', 'Check network connection']
  ) {
    super(
      message,
      ErrorType.TIMEOUT_ERROR,
      'TIMEOUT_001',
      ErrorSeverity.MEDIUM,
      true,
      suggestedActions,
      metadata,
      originalError
    );
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    suggestedActions: string[] = ['Verify the resource ID', 'Check if resource exists']
  ) {
    super(
      message,
      ErrorType.NOT_FOUND_ERROR,
      'NOT_FOUND_001',
      ErrorSeverity.LOW,
      false,
      suggestedActions,
      metadata
    );
  }
}

/**
 * System Error
 */
export class SystemError extends SchemeSahayakError {
  constructor(
    message: string,
    metadata: ErrorMetadata,
    originalError?: Error,
    suggestedActions: string[] = ['Contact support', 'Try again later']
  ) {
    super(
      message,
      ErrorType.SYSTEM_ERROR,
      'SYS_001',
      ErrorSeverity.CRITICAL,
      false,
      suggestedActions,
      metadata,
      originalError
    );
  }
}
