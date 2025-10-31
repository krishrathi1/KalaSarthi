/**
 * Error Utilities
 * Helper functions for error handling and metadata generation
 * 
 * Requirements: 10.3, 10.4
 */

import { ErrorMetadata } from './ErrorTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${uuidv4()}`;
}

/**
 * Create error metadata
 */
export function createErrorMetadata(
  service: string,
  method: string,
  userId?: string,
  context?: Record<string, any>
): ErrorMetadata {
  return {
    userId,
    service,
    method,
    timestamp: new Date(),
    requestId: generateRequestId(),
    context,
    stackTrace: new Error().stack
  };
}

/**
 * Sanitize error for client response
 * Removes sensitive information from errors before sending to client
 */
export function sanitizeError(error: any): {
  message: string;
  code?: string;
  type?: string;
  suggestedActions?: string[];
} {
  // Don't expose internal error details to client
  if (error.type === 'SYSTEM_ERROR' || error.severity === 'CRITICAL') {
    return {
      message: 'An unexpected error occurred. Please try again later.',
      code: 'SYSTEM_ERROR',
      suggestedActions: ['Try again later', 'Contact support if issue persists']
    };
  }

  return {
    message: error.message || 'An error occurred',
    code: error.code,
    type: error.type,
    suggestedActions: error.suggestedActions
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const retryableTypes = [
    'EXTERNAL_API_ERROR',
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'RATE_LIMIT_ERROR',
    'DATABASE_ERROR',
    'ML_MODEL_ERROR',
    'DOCUMENT_PROCESSING_ERROR'
  ];

  return retryableTypes.includes(error.type);
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: any): string {
  const timestamp = new Date().toISOString();
  const requestId = error.metadata?.requestId || 'unknown';
  const service = error.metadata?.service || 'unknown';
  const method = error.metadata?.method || 'unknown';
  
  return `[${timestamp}] [${requestId}] [${service}.${method}] ${error.type}: ${error.message}`;
}

/**
 * Extract error message from various error types
 */
export function extractErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error.message) {
    return error.message;
  }
  
  if (error.error?.message) {
    return error.error.message;
  }
  
  return 'An unknown error occurred';
}

/**
 * Create user-friendly error message
 */
export function createUserFriendlyMessage(error: any): string {
  const errorType = error.type || 'SYSTEM_ERROR';
  
  const friendlyMessages: Record<string, string> = {
    VALIDATION_ERROR: 'Please check your input and try again.',
    AUTHENTICATION_ERROR: 'Please log in to continue.',
    AUTHORIZATION_ERROR: 'You don\'t have permission to perform this action.',
    EXTERNAL_API_ERROR: 'We\'re having trouble connecting to external services. Please try again.',
    ML_MODEL_ERROR: 'We\'re processing your request using an alternative method.',
    DOCUMENT_PROCESSING_ERROR: 'We couldn\'t process your document. Please try uploading a clearer image.',
    NETWORK_ERROR: 'Please check your internet connection and try again.',
    DATABASE_ERROR: 'We\'re experiencing technical difficulties. Please try again.',
    RATE_LIMIT_ERROR: 'You\'ve made too many requests. Please wait a moment and try again.',
    TIMEOUT_ERROR: 'The operation is taking longer than expected. Please try again.',
    NOT_FOUND_ERROR: 'The requested resource was not found.',
    SYSTEM_ERROR: 'An unexpected error occurred. Please try again later.'
  };
  
  return friendlyMessages[errorType] || friendlyMessages.SYSTEM_ERROR;
}

/**
 * Aggregate errors for batch operations
 */
export function aggregateErrors(errors: any[]): {
  total: number;
  byType: Record<string, number>;
  messages: string[];
} {
  const byType: Record<string, number> = {};
  const messages: string[] = [];
  
  errors.forEach(error => {
    const type = error.type || 'UNKNOWN';
    byType[type] = (byType[type] || 0) + 1;
    messages.push(extractErrorMessage(error));
  });
  
  return {
    total: errors.length,
    byType,
    messages
  };
}

/**
 * Check if operation should be retried based on error
 */
export function shouldRetry(error: any, attemptNumber: number, maxAttempts: number): boolean {
  if (attemptNumber >= maxAttempts) {
    return false;
  }
  
  return isRetryableError(error);
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attemptNumber: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  multiplier: number = 2
): number {
  const delay = baseDelay * Math.pow(multiplier, attemptNumber - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Add jitter to retry delay to prevent thundering herd
 */
export function addJitter(delay: number, jitterFactor: number = 0.1): number {
  const jitter = delay * jitterFactor * Math.random();
  return delay + jitter;
}
