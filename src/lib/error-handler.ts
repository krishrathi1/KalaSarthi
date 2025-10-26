// Centralized error handling utilities

export interface ErrorInfo {
  message: string;
  code?: string;
  status?: number;
  timestamp: number;
  context?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
}

export interface ErrorRecoveryAction {
  type: 'retry' | 'fallback' | 'redirect' | 'refresh';
  label: string;
  action: () => void | Promise<void>;
}

export interface EnhancedErrorInfo extends ErrorInfo {
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  recoveryActions?: ErrorRecoveryAction[];
  userMessage: string;
  technicalDetails?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: EnhancedErrorInfo[] = [];
  private errorListeners: ((error: EnhancedErrorInfo) => void)[] = [];
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Subscribe to error events
   */
  onError(listener: (error: EnhancedErrorInfo) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit error to all listeners
   */
  private emitError(error: EnhancedErrorInfo): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  /**
   * Handle fetch errors with retry logic
   */
  async handleFetchError(
    url: string,
    options: RequestInit = {},
    retries: number = 3
  ): Promise<Response> {
    // Longer timeout for image processing endpoints
    const isImageProcessing = url.includes('/api/image-enhance') || url.includes('/api/upload');
    const timeout = isImageProcessing ? 60000 : 30000; // 60s for images, 30s for others
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown fetch error');

        this.logError({
          message: `Fetch attempt ${attempt} failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
          code: 'FETCH_ERROR',
          context: url,
          timestamp: Date.now()
        });

        if (attempt < retries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All fetch attempts failed');
  }

  /**
   * Handle API errors with enhanced error information
   */
  handleApiError(error: any, context: string = 'API', userId?: string): EnhancedErrorInfo {
    const errorKey = `${context}-${error?.message || 'unknown'}`;
    const attempts = this.retryAttempts.get(errorKey) || 0;

    let userMessage = 'An unexpected error occurred.';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let recoverable = true;
    let code = 'API_ERROR';

    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        userMessage = 'Network connection failed. Please check your internet connection and try again.';
        code = 'NETWORK_ERROR';
        severity = 'high';
      } else if (error.message.includes('HTTP 404')) {
        userMessage = 'The requested resource was not found. Please try again later.';
        code = 'NOT_FOUND_ERROR';
        severity = 'medium';
      } else if (error.message.includes('HTTP 500')) {
        userMessage = 'Server error occurred. Please try again in a few moments.';
        code = 'SERVER_ERROR';
        severity = 'high';
      } else if (error.message.includes('HTTP 429')) {
        userMessage = 'Too many requests. Please wait a moment before trying again.';
        code = 'RATE_LIMIT_ERROR';
        severity = 'medium';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out. Please check your connection and try again.';
        code = 'TIMEOUT_ERROR';
        severity = 'high';
      } else if (error.message.includes('HTTP 401') || error.message.includes('HTTP 403')) {
        userMessage = 'Authentication failed. Please refresh the page and try again.';
        code = 'AUTH_ERROR';
        severity = 'high';
        recoverable = false;
      } else {
        userMessage = error instanceof Error ? error.message : String(error);
      }
    }

    const enhancedError: EnhancedErrorInfo = {
      message: error instanceof Error ? error.message : 'Unknown error',
      code,
      context,
      timestamp: Date.now(),
      userId,
      severity,
      recoverable,
      userMessage,
      technicalDetails: error?.stack,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      recoveryActions: this.generateRecoveryActions(code, context, attempts)
    };

    this.logEnhancedError(enhancedError);
    this.retryAttempts.set(errorKey, attempts + 1);

    return enhancedError;
  }

  /**
   * Generate recovery actions based on error type
   */
  private generateRecoveryActions(code: string, context: string, attempts: number): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    // Add retry action if under max attempts
    if (attempts < this.maxRetries && code !== 'AUTH_ERROR') {
      actions.push({
        type: 'retry',
        label: 'Try Again',
        action: () => {
          // This will be handled by the calling component
        }
      });
    }

    // Add refresh action for auth errors
    if (code === 'AUTH_ERROR') {
      actions.push({
        type: 'refresh',
        label: 'Refresh Page',
        action: () => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }
      });
    }

    // Add fallback actions for specific contexts
    if (context.includes('voice') || context.includes('speech')) {
      actions.push({
        type: 'fallback',
        label: 'Use Text Input',
        action: () => {
          // This will be handled by the calling component
        }
      });
    }

    return actions;
  }

  /**
   * Handle file upload errors with enhanced information
   */
  handleFileError(error: any, fileName: string = 'file', userId?: string): EnhancedErrorInfo {
    let userMessage = 'File upload failed.';
    let code = 'FILE_UPLOAD_ERROR';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    if (error instanceof Error) {
      if (error.message.includes('413')) {
        userMessage = 'File is too large. Please choose a smaller file.';
        code = 'FILE_TOO_LARGE';
        severity = 'low';
      } else if (error.message.includes('415')) {
        userMessage = 'File type not supported. Please choose a valid image file.';
        code = 'UNSUPPORTED_FILE_TYPE';
        severity = 'low';
      } else if (error.message.includes('Failed to fetch')) {
        userMessage = 'Upload failed due to network issues. Please try again.';
        code = 'UPLOAD_NETWORK_ERROR';
        severity = 'high';
      } else {
        userMessage = `Upload failed: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    const enhancedError: EnhancedErrorInfo = {
      message: `File upload error for ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code,
      context: `file-upload-${fileName}`,
      timestamp: Date.now(),
      userId,
      severity,
      recoverable: true,
      userMessage,
      technicalDetails: error?.stack,
      recoveryActions: [
        {
          type: 'retry',
          label: 'Try Again',
          action: () => { }
        },
        {
          type: 'fallback',
          label: 'Choose Different File',
          action: () => { }
        }
      ]
    };

    this.logEnhancedError(enhancedError);
    return enhancedError;
  }

  /**
   * Handle speech recognition errors with enhanced information
   */
  handleSpeechError(error: any, userId?: string): EnhancedErrorInfo {
    let userMessage = 'Speech recognition is not available.';
    let code = 'SPEECH_ERROR';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let recoverable = true;

    if (error instanceof Error) {
      if (error.message.includes('not supported')) {
        userMessage = 'Speech recognition is not supported in this browser.';
        code = 'SPEECH_NOT_SUPPORTED';
        severity = 'low';
        recoverable = false;
      } else if (error.message.includes('permission')) {
        userMessage = 'Microphone permission denied. Please allow microphone access.';
        code = 'MICROPHONE_PERMISSION_DENIED';
        severity = 'high';
      } else if (error.message.includes('network')) {
        userMessage = 'Speech recognition requires internet connection.';
        code = 'SPEECH_NETWORK_ERROR';
        severity = 'high';
      } else if (error.message.includes('GOOGLE_AI_API_KEY')) {
        userMessage = 'Voice features require API configuration. Please use text input instead.';
        code = 'SPEECH_API_CONFIG_ERROR';
        severity = 'medium';
        recoverable = false;
      }
    }

    const enhancedError: EnhancedErrorInfo = {
      message: `Speech recognition error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code,
      context: 'voice',
      timestamp: Date.now(),
      userId,
      severity,
      recoverable,
      userMessage,
      technicalDetails: error?.stack,
      recoveryActions: [
        {
          type: 'fallback',
          label: 'Use Text Input',
          action: () => { }
        }
      ]
    };

    // Add retry action if recoverable
    if (recoverable && code !== 'SPEECH_NOT_SUPPORTED') {
      enhancedError.recoveryActions?.unshift({
        type: 'retry',
        label: 'Try Again',
        action: () => { }
      });
    }

    this.logEnhancedError(enhancedError);
    return enhancedError;
  }

  /**
   * Log enhanced error for debugging and monitoring
   */
  private logEnhancedError(errorInfo: EnhancedErrorInfo): void {
    this.errors.push(errorInfo);

    // Log to console with appropriate level
    const logLevel = errorInfo.severity === 'critical' ? 'error' :
      errorInfo.severity === 'high' ? 'error' :
        errorInfo.severity === 'medium' ? 'warn' : 'info';

    console[logLevel]('Enhanced error logged:', {
      message: errorInfo.message,
      code: errorInfo.code,
      context: errorInfo.context,
      severity: errorInfo.severity,
      recoverable: errorInfo.recoverable,
      userId: errorInfo.userId
    });

    // Emit error to listeners
    this.emitError(errorInfo);

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    // Send to monitoring service for critical errors
    if (errorInfo.severity === 'critical' || errorInfo.severity === 'high') {
      this.sendToMonitoring(errorInfo);
    }
  }

  /**
   * Log error for debugging (legacy method)
   */
  private logError(errorInfo: ErrorInfo): void {
    const enhancedError: EnhancedErrorInfo = {
      ...errorInfo,
      severity: 'medium',
      recoverable: true,
      userMessage: errorInfo.message
    };
    this.logEnhancedError(enhancedError);
  }

  /**
   * Send error to monitoring service
   */
  private async sendToMonitoring(errorInfo: EnhancedErrorInfo): Promise<void> {
    // Only run monitoring on server-side
    if (typeof window !== 'undefined') {
      return;
    }

    try {
      // Import monitoring service dynamically to avoid circular dependencies
      const { monitoringService } = await import('./monitoring');

      await monitoringService.log({
        level: 'ERROR',
        service: 'enhanced-artisan-buddy',
        operation: errorInfo.context || 'unknown',
        userId: errorInfo.userId,
        error: errorInfo.message,
        metadata: {
          code: errorInfo.code,
          severity: errorInfo.severity,
          recoverable: errorInfo.recoverable,
          userMessage: errorInfo.userMessage,
          url: errorInfo.url,
          userAgent: errorInfo.userAgent
        }
      });
    } catch (e) {
      console.error('Failed to send error to monitoring:', e);
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): EnhancedErrorInfo[] {
    return this.errors.slice(-limit);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical', limit: number = 10): EnhancedErrorInfo[] {
    return this.errors
      .filter(error => error.severity === severity)
      .slice(-limit);
  }

  /**
   * Get recoverable errors
   */
  getRecoverableErrors(limit: number = 10): EnhancedErrorInfo[] {
    return this.errors
      .filter(error => error.recoverable)
      .slice(-limit);
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { total: number; byCode: Record<string, number>; byContext: Record<string, number> } {
    const byCode: Record<string, number> = {};
    const byContext: Record<string, number> = {};

    this.errors.forEach(error => {
      byCode[error.code || 'unknown'] = (byCode[error.code || 'unknown'] || 0) + 1;
      byContext[error.context || 'unknown'] = (byContext[error.context || 'unknown'] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byCode,
      byContext
    };
  }
}

// Convenience functions
export const errorHandler = ErrorHandler.getInstance();

export async function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return errorHandler.handleFetchError(url, options);
}

export function handleError(error: any, context: string = 'Unknown', userId?: string): EnhancedErrorInfo {
  return errorHandler.handleApiError(error, context, userId);
}

export function handleFileUploadError(error: any, fileName?: string, userId?: string): EnhancedErrorInfo {
  return errorHandler.handleFileError(error, fileName, userId);
}

export function handleSpeechRecognitionError(error: any, userId?: string): EnhancedErrorInfo {
  return errorHandler.handleSpeechError(error, userId);
}

// Legacy functions for backward compatibility
export function handleErrorLegacy(error: any, context: string = 'Unknown'): string {
  return errorHandler.handleApiError(error, context).userMessage;
}

export function handleFileUploadErrorLegacy(error: any, fileName?: string): string {
  return errorHandler.handleFileError(error, fileName).userMessage;
}

export function handleSpeechRecognitionErrorLegacy(error: any): string {
  return errorHandler.handleSpeechError(error).userMessage;
}
