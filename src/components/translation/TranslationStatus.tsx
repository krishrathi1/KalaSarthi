/**
 * Translation Status Component
 * Shows translation progress and error states
 */

'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw, X } from 'lucide-react';
import { useTranslation } from '@/context/TranslationContext';
import { cn } from '@/lib/utils';

interface TranslationStatusProps {
  className?: string;
  showDetails?: boolean;
  onDismiss?: () => void;
}

export function TranslationStatus({ 
  className, 
  showDetails = false, 
  onDismiss 
}: TranslationStatusProps) {
  const { 
    isTranslating, 
    error, 
    currentLanguage, 
    isEnabled,
    cacheStats,
    retryTranslation,
    clearCache
  } = useTranslation();

  // Don't show anything if translation is disabled or language is English
  if (!isEnabled || currentLanguage === 'en') {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main Status */}
      {(isTranslating || error) && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg border',
          error 
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        )}>
          {/* Icon */}
          <div className="flex-shrink-0">
            {isTranslating && (
              <Loader2 className="w-5 h-5 animate-spin" />
            )}
            {error && (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isTranslating && (
              <div>
                <p className="text-sm font-medium">Translating page...</p>
                <p className="text-xs opacity-75">Please wait while we translate the content</p>
              </div>
            )}
            {error && (
              <div>
                <p className="text-sm font-medium">Translation Error</p>
                <p className="text-xs opacity-75">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {error && (
              <button
                onClick={retryTranslation}
                className="p-1 rounded hover:bg-red-100 transition-colors"
                title="Retry translation"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={cn(
                  'p-1 rounded transition-colors',
                  error 
                    ? 'hover:bg-red-100' 
                    : 'hover:bg-blue-100'
                )}
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success State */}
      {!isTranslating && !error && isEnabled && currentLanguage !== 'en' && (
        <div className="flex items-center gap-3 px-4 py-2 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">Page translated successfully</span>
        </div>
      )}

      {/* Detailed Stats */}
      {showDetails && isEnabled && (
        <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Translation Details</h4>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <span className="font-medium">Current Language:</span>
              <br />
              {currentLanguage.toUpperCase()}
            </div>
            <div>
              <span className="font-medium">Cache Size:</span>
              <br />
              {cacheStats.size} items
            </div>
            <div>
              <span className="font-medium">Cache Hit Rate:</span>
              <br />
              {(cacheStats.hitRate * 100).toFixed(1)}%
            </div>
            <div>
              <span className="font-medium">Status:</span>
              <br />
              {isTranslating ? 'Translating' : error ? 'Error' : 'Ready'}
            </div>
          </div>
          
          {/* Cache Actions */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={clearCache}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear Translation Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TranslationStatus;