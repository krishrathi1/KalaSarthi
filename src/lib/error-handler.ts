// Centralized error handling utilities

export interface ErrorInfo {
  message: string;
  code?: string;
  status?: number;
  timestamp: number;
  context?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: ErrorInfo[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
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
          message: `Fetch attempt ${attempt} failed: ${lastError.message}`,
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
   * Handle API errors with user-friendly messages
   */
  handleApiError(error: any, context: string = 'API'): string {
    let userMessage = 'An unexpected error occurred.';

    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        userMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.message.includes('HTTP 404')) {
        userMessage = 'The requested resource was not found. Please try again later.';
      } else if (error.message.includes('HTTP 500')) {
        userMessage = 'Server error occurred. Please try again in a few moments.';
      } else if (error.message.includes('HTTP 429')) {
        userMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out. Please check your connection and try again.';
      } else {
        userMessage = error.message;
      }
    }

    this.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'API_ERROR',
      context,
      timestamp: Date.now()
    });

    return userMessage;
  }

  /**
   * Handle file upload errors
   */
  handleFileError(error: any, fileName: string = 'file'): string {
    let userMessage = 'File upload failed.';

    if (error instanceof Error) {
      if (error.message.includes('413')) {
        userMessage = 'File is too large. Please choose a smaller file.';
      } else if (error.message.includes('415')) {
        userMessage = 'File type not supported. Please choose a valid image file.';
      } else if (error.message.includes('Failed to fetch')) {
        userMessage = 'Upload failed due to network issues. Please try again.';
      } else {
        userMessage = `Upload failed: ${error.message}`;
      }
    }

    this.logError({
      message: `File upload error for ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: 'FILE_UPLOAD_ERROR',
      context: fileName,
      timestamp: Date.now()
    });

    return userMessage;
  }

  /**
   * Handle speech recognition errors
   */
  handleSpeechError(error: any): string {
    let userMessage = 'Speech recognition is not available.';

    if (error instanceof Error) {
      if (error.message.includes('not supported')) {
        userMessage = 'Speech recognition is not supported in this browser.';
      } else if (error.message.includes('permission')) {
        userMessage = 'Microphone permission denied. Please allow microphone access.';
      } else if (error.message.includes('network')) {
        userMessage = 'Speech recognition requires internet connection.';
      } else if (error.message.includes('GOOGLE_AI_API_KEY')) {
        userMessage = 'Voice features require API configuration. Please use text input instead.';
      }
    }

    this.logError({
      message: `Speech recognition error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: 'SPEECH_ERROR',
      context: 'voice',
      timestamp: Date.now()
    });

    return userMessage;
  }

  /**
   * Log error for debugging
   */
  private logError(errorInfo: ErrorInfo): void {
    this.errors.push(errorInfo);
    console.error('Error logged:', errorInfo.message || 'Unknown error', errorInfo);
    
    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): ErrorInfo[] {
    return this.errors.slice(-limit);
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

export function handleError(error: any, context: string = 'Unknown'): string {
  return errorHandler.handleApiError(error, context);
}

export function handleFileUploadError(error: any, fileName?: string): string {
  return errorHandler.handleFileError(error, fileName);
}

export function handleSpeechRecognitionError(error: any): string {
  return errorHandler.handleSpeechError(error);
}
