/**
 * Language Detection Component
 * Automatically detects language of input text and shows confidence
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Eye, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { LanguageCode, languages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { unifiedTranslationService, LanguageDetectionResult } from '@/lib/services/UnifiedTranslationService';

interface LanguageDetectionProps {
  text: string;
  onLanguageDetected?: (result: LanguageDetectionResult) => void;
  onLanguageSelected?: (language: LanguageCode) => void;
  className?: string;
  showAlternatives?: boolean;
  autoDetect?: boolean;
  minTextLength?: number;
}

export function LanguageDetection({
  text,
  onLanguageDetected,
  onLanguageSelected,
  className,
  showAlternatives = true,
  autoDetect = true,
  minTextLength = 10
}: LanguageDetectionProps) {
  const [detectionResult, setDetectionResult] = useState<LanguageDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // Debounced detection function
  const detectLanguage = useCallback(
    debounce((inputText: string) => {
      if (!inputText || inputText.trim().length < minTextLength) {
        setDetectionResult(null);
        return;
      }

      setIsDetecting(true);
      
      try {
        const result = unifiedTranslationService.detectLanguage(inputText);
        setDetectionResult(result);
        
        if (onLanguageDetected) {
          onLanguageDetected(result);
        }
      } catch (error) {
        console.error('Language detection failed:', error);
        setDetectionResult(null);
      } finally {
        setIsDetecting(false);
      }
    }, 500),
    [minTextLength, onLanguageDetected]
  );

  // Auto-detect when text changes
  useEffect(() => {
    if (autoDetect && text) {
      detectLanguage(text);
    }
  }, [text, autoDetect, detectLanguage]);

  const handleManualDetection = () => {
    if (text) {
      detectLanguage(text);
    }
  };

  const handleLanguageSelect = (language: LanguageCode) => {
    if (onLanguageSelected) {
      onLanguageSelected(language);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return CheckCircle;
    if (confidence >= 0.6) return AlertCircle;
    return AlertCircle;
  };

  if (!text || text.trim().length < minTextLength) {
    return (
      <div className={cn('text-xs text-gray-500', className)}>
        {text && text.trim().length > 0 && text.trim().length < minTextLength && (
          <span>Need at least {minTextLength} characters for language detection</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Detection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDetecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">Detecting language...</span>
            </>
          ) : detectionResult ? (
            <>
              {React.createElement(getConfidenceIcon(detectionResult.confidence), {
                className: `w-4 h-4 ${getConfidenceColor(detectionResult.confidence).split(' ')[0]}`
              })}
              <span className="text-sm font-medium text-gray-900">
                Detected: {languages[detectionResult.detectedLanguage]?.name || detectionResult.detectedLanguage}
              </span>
              <span className={cn(
                'px-2 py-1 text-xs rounded-full',
                getConfidenceColor(detectionResult.confidence)
              )}>
                {Math.round(detectionResult.confidence * 100)}% confident
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Language not detected</span>
            </>
          )}
        </div>

        {/* Manual detection button */}
        {!autoDetect && (
          <button
            onClick={handleManualDetection}
            disabled={isDetecting}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Eye className="w-3 h-3" />
            Detect
          </button>
        )}

        {/* Show details toggle */}
        {detectionResult && showAlternatives && detectionResult.alternatives.length > 0 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} alternatives
          </button>
        )}
      </div>

      {/* Detection Details */}
      {detectionResult && showDetails && showAlternatives && (
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-xs font-medium text-gray-700 mb-2">
            Alternative detections:
          </div>
          
          <div className="space-y-1">
            {/* Primary detection */}
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {languages[detectionResult.detectedLanguage]?.name || detectionResult.detectedLanguage}
                </span>
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                  Primary
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'px-2 py-1 text-xs rounded',
                  getConfidenceColor(detectionResult.confidence)
                )}>
                  {Math.round(detectionResult.confidence * 100)}%
                </span>
                <button
                  onClick={() => handleLanguageSelect(detectionResult.detectedLanguage)}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Select
                </button>
              </div>
            </div>

            {/* Alternative detections */}
            {detectionResult.alternatives.map((alt, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {languages[alt.language]?.name || alt.language}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-2 py-1 text-xs rounded',
                    getConfidenceColor(alt.confidence)
                  )}>
                    {Math.round(alt.confidence * 100)}%
                  </span>
                  <button
                    onClick={() => handleLanguageSelect(alt.language)}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick language selection */}
      {detectionResult && !showDetails && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Use detected language:</span>
          <button
            onClick={() => handleLanguageSelect(detectionResult.detectedLanguage)}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            {languages[detectionResult.detectedLanguage]?.name || detectionResult.detectedLanguage}
          </button>
        </div>
      )}
    </div>
  );
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default LanguageDetection;