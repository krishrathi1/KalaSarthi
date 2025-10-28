/**
 * Quality Feedback Component
 * Allows users to rate and provide feedback on translations
 */

'use client';

import React, { useState } from 'react';
import { Star, MessageSquare, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { unifiedTranslationService, QualityFeedback } from '@/lib/services/UnifiedTranslationService';

interface QualityFeedbackProps {
  translationId: string;
  originalText: string;
  translatedText: string;
  onFeedbackSubmitted?: (feedback: QualityFeedback) => void;
  className?: string;
  compact?: boolean;
}

export function QualityFeedbackComponent({
  translationId,
  originalText,
  translatedText,
  onFeedbackSubmitted,
  className,
  compact = false
}: QualityFeedbackProps) {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState<boolean>(false);

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
    if (compact) {
      // In compact mode, submit immediately with just rating
      submitFeedback(selectedRating, '');
    } else {
      setShowFeedbackForm(true);
    }
  };

  const submitFeedback = (finalRating: number, finalFeedback: string) => {
    const qualityFeedback: Omit<QualityFeedback, 'timestamp'> = {
      translationId,
      originalText,
      translatedText,
      rating: finalRating,
      feedback: finalFeedback || undefined
    };

    unifiedTranslationService.submitQualityFeedback(qualityFeedback);
    setIsSubmitted(true);
    
    if (onFeedbackSubmitted) {
      onFeedbackSubmitted({ ...qualityFeedback, timestamp: Date.now() });
    }
  };

  const handleSubmit = () => {
    if (rating > 0) {
      submitFeedback(rating, feedback);
    }
  };

  const handleQuickFeedback = (isPositive: boolean) => {
    const quickRating = isPositive ? 5 : 2;
    setRating(quickRating);
    submitFeedback(quickRating, isPositive ? 'Good translation' : 'Poor translation');
  };

  if (isSubmitted) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-green-600', className)}>
        <ThumbsUp className="w-4 h-4" />
        <span>Thank you for your feedback!</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <span className="text-xs text-gray-500 mr-2">Rate:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRatingClick(star)}
              className={cn(
                'w-4 h-4 transition-colors',
                star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
              )}
            >
              <Star className="w-full h-full fill-current" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg p-4 bg-gray-50', className)}>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          How was this translation?
        </h4>
        
        {/* Quick feedback buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => handleQuickFeedback(true)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            <ThumbsUp className="w-3 h-3" />
            Good
          </button>
          <button
            onClick={() => handleQuickFeedback(false)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            <ThumbsDown className="w-3 h-3" />
            Poor
          </button>
        </div>

        <div className="text-xs text-gray-500 mb-2">Or rate with stars:</div>
        
        {/* Star rating */}
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRatingClick(star)}
              className={cn(
                'w-6 h-6 transition-colors',
                star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
              )}
            >
              <Star className="w-full h-full fill-current" />
            </button>
          ))}
        </div>
      </div>

      {/* Detailed feedback form */}
      {showFeedbackForm && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Additional feedback (optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What could be improved about this translation?"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={rating === 0}
              className={cn(
                'flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors',
                rating > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              <Send className="w-3 h-3" />
              Submit
            </button>
            <button
              onClick={() => setShowFeedbackForm(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Translation preview */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-1">Original:</div>
        <div className="text-sm text-gray-700 mb-2 p-2 bg-white rounded border">
          {originalText}
        </div>
        <div className="text-xs text-gray-500 mb-1">Translation:</div>
        <div className="text-sm text-gray-700 p-2 bg-white rounded border">
          {translatedText}
        </div>
      </div>
    </div>
  );
}

export default QualityFeedbackComponent;