/**
 * Error Handling Utilities for Artisan Buddy API
 * 
 * Provides standardized error types, error response formatting, logging, and graceful degradation
 */

import { NextResponse } from 'next/server';

/**
 * Error types for Artisan Buddy API
 */
export enum ErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TRANSLATION_ERROR = 'TRANSLATION_ERROR',
  VISION_ERROR = 'VISION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  INTENT_CLASSIFICATION_ERROR = 'INTENT_CLASSIFICATION_ERROR',
  RESPONSE_GENERATION_ERROR = 'RESPONSE_GENERATION_ERROR',
  NAVIGATION_ERROR = 'NAVIGATION_ERROR',
  CONTEXT_LOAD_ERROR = 'CONTEXT_LOAD_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Custom error class for Artisan Buddy
 */
export class ArtisanBuddyError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly userId?: string;

  constructor(
    type: ErrorType,
    message: string,
    options?: {
      severity?: ErrorSeverity;
      statusCode?: number;
      details?: any;
      requestId?: string;
      userId?: string;
    }
  ) {
    super(message);
    this.name = 'ArtisanBuddyError';
    this.type = type;
    this.severity = options?.severity || ErrorSeverity.MEDIUM;
    this.statusCode = options?.statusCode || 500;
    this.details = options?.details;
    this.timestamp = new Date();
    this.requestId = options?.requestId;
    this.userId = options?.userId;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: {
    type: ErrorType;
    message: string;
    userMessage: string;
    severity: ErrorSeverity;
    details?: any;
    timestamp: string;
    requestId?: string;
    suggestions?: string[];
  };
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(type: ErrorType, originalMessage?: string): string {
  const messages: Record<ErrorType, string> = {
    [ErrorType.AUTHENTICATION_ERROR]: 'Authentication failed. Please log in again.',
    [ErrorType.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action.',
    [ErrorType.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again in a moment.',
    [ErrorType.INVALID_INPUT]: 'The information provided is invalid. Please check and try again.',
    [ErrorType.VALIDATION_ERROR]: 'Please check your input and try again.',
    [ErrorType.SESSION_NOT_FOUND]: 'Your session has expired. Please start a new conversation.',
    [ErrorType.USER_NOT_FOUND]: 'User profile not found. Please contact support.',
    [ErrorType.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.',
    [ErrorType.TRANSLATION_ERROR]: 'Translation service is unavailable. Continuing in English.',
    [ErrorType.VISION_ERROR]: 'Image analysis failed. Please try uploading a different image.',
    [ErrorType.DATABASE_ERROR]: 'Unable to access data. Please try again.',
    [ErrorType.CACHE_ERROR]: 'Temporary storage issue. Your request is being processed.',
    [ErrorType.INTENT_CLASSIFICATION_ERROR]: 'Unable to understand your request. Please rephrase.',
    [ErrorType.RESPONSE_GENERATION_ERROR]: 'Unable to generate response. Please try again.',
    [ErrorType.NAVIGATION_ERROR]: 'Unable to navigate to the requested page.',
    [ErrorType.CONTEXT_LOAD_ERROR]: 'Unable to load your profile. Please try again.',
    [ErrorType.UNKNOWN_ERROR]: 'Something went wrong. Please try again.',
  };

  return messages[type] || originalMessage || 'An unexpected error occurred.';
}

/**
 * Get error suggestions
 */
export function getErrorSuggestions(type: ErrorType): string[] {
  const suggestions: Record<ErrorType, string[]> = {
    [ErrorType.AUTHENTICATION_ERROR]: [
      'Try logging in again',
      'Clear your browser cache',
      'Contact support if the issue persists',
    ],
    [ErrorType.RATE_LIMIT_EXCEEDED]: [
      'Wait a minute before trying again',
      'Reduce the frequency of your requests',
    ],
    [ErrorType.INVALID_INPUT]: [
      'Check that all required fields are filled',
      'Ensure your input is in the correct format',
    ],
    [ErrorType.SESSION_NOT_FOUND]: [
      'Start a new conversation',
      'Refresh the page',
    ],
    [ErrorType.SERVICE_UNAVAILABLE]: [
      'Try again in a few minutes',
      'Check your internet connection',
      'Contact support if the issue persists',
    ],
    [ErrorType.VISION_ERROR]: [
      'Ensure the image is clear and well-lit',
      'Try a different image format (JPEG, PNG)',
      'Reduce the image file size',
    ],
    [ErrorType.INTENT_CLASSIFICATION_ERROR]: [
      'Try rephrasing your question',
      'Be more specific in your request',
      'Use simpler language',
    ],
    [ErrorType.UNKNOWN_ERROR]: [
      'Refresh the page and try again',
      'Check your internet connection',
      'Contact support if the issue persists',
    ],
  };

  return suggestions[type] || ['Try again', 'Contact support if the issue persists'];
}

/**
 * Create error response
 */
export function createErrorResponse(
  error: Error | ArtisanBuddyError,
  requestId?: string
): NextResponse<ErrorResponse> {
  let errorType: ErrorType;
  let statusCode: number;
  let severity: ErrorSeverity;
  let details: any;

  if (error instanceof ArtisanBuddyError) {
    errorType = error.type;
    statusCode = error.statusCode;
    severity = error.severity;
    details = error.details;
    requestId = error.requestId || requestId;
  } else {
    errorType = ErrorType.UNKNOWN_ERROR;
    statusCode = 500;
    severity = ErrorSeverity.MEDIUM;
    details = undefined;
  }

  const userMessage = getUserFriendlyMessage(errorType, error.message);
  const suggestions = getErrorSuggestions(errorType);

  const response: ErrorResponse = {
    error: {
      type: errorType,
      message: error.message,
      userMessage,
      severity,
      details,
      timestamp: new Date().toISOString(),
      requestId,
      suggestions,
    },
  };

  // Log error
  logError(error, requestId);

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Log error with appropriate level
 */
export function logError(error: Error | ArtisanBuddyError, requestId?: string): void {
  const timestamp = new Date().toISOString();
  
  if (error instanceof ArtisanBuddyError) {
    const logData = {
      timestamp,
      requestId: error.requestId || requestId,
      userId: error.userId,
      type: error.type,
      severity: error.severity,
      message: error.message,
      details: error.details,
      stack: error.stack,
    };

    // Log based on severity
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('[CRITICAL ERROR]', JSON.stringify(logData, null, 2));
        // In production, send to error tracking service (e.g., Sentry)
        break;
      case ErrorSeverity.HIGH:
        console.error('[HIGH ERROR]', JSON.stringify(logData, null, 2));
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('[MEDIUM ERROR]', JSON.stringify(logData, null, 2));
        break;
      case ErrorSeverity.LOW:
        console.log('[LOW ERROR]', JSON.stringify(logData, null, 2));
        break;
    }
  } else {
    console.error('[UNKNOWN ERROR]', {
      timestamp,
      requestId,
      message: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Graceful degradation handler
 */
export class GracefulDegradation {
  /**
   * Handle translation service failure
   */
  static async handleTranslationFailure(
    originalText: string,
    targetLanguage: string
  ): Promise<{ text: string; degraded: boolean }> {
    console.warn('Translation service unavailable, using original text');
    return {
      text: originalText,
      degraded: true,
    };
  }

  /**
   * Handle vision service failure
   */
  static async handleVisionFailure(
    imageUrl: string
  ): Promise<{ analysis: any; degraded: boolean }> {
    console.warn('Vision service unavailable, providing basic response');
    return {
      analysis: {
        message: 'Image analysis is temporarily unavailable. Please try again later.',
        labels: [],
        colors: [],
        objects: [],
      },
      degraded: true,
    };
  }

  /**
   * Handle cache failure
   */
  static async handleCacheFailure<T>(
    fallbackFn: () => Promise<T>
  ): Promise<{ data: T; degraded: boolean }> {
    console.warn('Cache unavailable, fetching from source');
    try {
      const data = await fallbackFn();
      return { data, degraded: true };
    } catch (error) {
      throw new ArtisanBuddyError(
        ErrorType.SERVICE_UNAVAILABLE,
        'Unable to fetch data',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 503,
          details: { originalError: error },
        }
      );
    }
  }

  /**
   * Handle database failure
   */
  static async handleDatabaseFailure<T>(
    cachedData?: T
  ): Promise<{ data: T | null; degraded: boolean }> {
    console.warn('Database unavailable, using cached data if available');
    
    if (cachedData) {
      return { data: cachedData, degraded: true };
    }

    throw new ArtisanBuddyError(
      ErrorType.DATABASE_ERROR,
      'Database is temporarily unavailable',
      {
        severity: ErrorSeverity.CRITICAL,
        statusCode: 503,
      }
    );
  }

  /**
   * Handle intent classification failure
   */
  static handleIntentClassificationFailure(message: string): {
    intent: any;
    degraded: boolean;
  } {
    console.warn('Intent classification failed, using fallback');
    
    // Simple keyword-based fallback
    const lowerMessage = message.toLowerCase();
    
    let intentType = 'general_chat';
    
    if (lowerMessage.includes('navigate') || lowerMessage.includes('go to') || lowerMessage.includes('open')) {
      intentType = 'navigation';
    } else if (lowerMessage.includes('product') || lowerMessage.includes('inventory')) {
      intentType = 'query_products';
    } else if (lowerMessage.includes('sales') || lowerMessage.includes('revenue')) {
      intentType = 'query_sales';
    } else if (lowerMessage.includes('scheme') || lowerMessage.includes('loan')) {
      intentType = 'query_schemes';
    }

    return {
      intent: {
        type: intentType,
        confidence: 0.5,
        entities: [],
        parameters: {},
      },
      degraded: true,
    };
  }

  /**
   * Handle response generation failure
   */
  static handleResponseGenerationFailure(
    userMessage: string
  ): { response: string; degraded: boolean } {
    console.warn('Response generation failed, using fallback');
    
    return {
      response: `I apologize, but I'm having trouble generating a response right now. I understand you said: "${userMessage}". Could you please try rephrasing your question or try again in a moment?`,
      degraded: true,
    };
  }
}

/**
 * Validate request input
 */
export function validateInput(
  data: any,
  requiredFields: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Wrap async handler with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  errorType: ErrorType,
  requestId?: string,
  userId?: string
): Promise<T> {
  return handler().catch((error) => {
    throw new ArtisanBuddyError(
      errorType,
      error.message || 'Operation failed',
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 500,
        details: { originalError: error },
        requestId,
        userId,
      }
    );
  });
}
