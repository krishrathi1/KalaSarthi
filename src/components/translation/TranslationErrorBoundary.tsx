/**
 * Translation Error Boundary
 * Handles translation failures gracefully
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TranslationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface TranslationErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
}

export class TranslationErrorBoundary extends Component<
  TranslationErrorBoundaryProps,
  TranslationErrorBoundaryState
> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: TranslationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<TranslationErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log error for debugging
    console.error('Translation Error Boundary caught an error:', error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleAutoRetry = () => {
    // Auto-retry with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    this.retryTimeout = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    const { children, fallback, maxRetries = 3 } = this.props;
    const { hasError, error, retryCount } = this.state;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium">Translation Error</h3>
            <p className="text-xs text-red-600 mt-1">
              {error?.message || 'An error occurred while translating content'}
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-red-500 mt-1">
                Retry attempt {retryCount} of {maxRetries}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {retryCount < maxRetries && (
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleRetry}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={this.handleDismiss}
              className="text-red-700 hover:bg-red-100"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default TranslationErrorBoundary;