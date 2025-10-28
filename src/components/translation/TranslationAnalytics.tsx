/**
 * Translation Analytics Dashboard
 * Shows translation quality metrics, usage statistics, and performance data
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Star, Clock, Database, Users, RefreshCw } from 'lucide-react';
import { LanguageCode, languages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { unifiedTranslationService, QualityFeedback } from '@/lib/services/UnifiedTranslationService';

interface AnalyticsData {
  totalTranslations: number;
  cacheHitRate: number;
  averageQuality: number;
  languageUsage: Record<LanguageCode, number>;
  qualityByLanguage: Record<LanguageCode, number>;
  recentFeedback: QualityFeedback[];
  customOverridesCount: number;
}

interface TranslationAnalyticsProps {
  className?: string;
  refreshInterval?: number;
}

export function TranslationAnalytics({
  className,
  refreshInterval = 30000 // 30 seconds
}: TranslationAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadAnalytics = async () => {
    setIsLoading(true);
    
    try {
      // Get cache stats
      const cacheStats = unifiedTranslationService.getCacheStats();
      
      // Get quality feedback
      const qualityFeedback = unifiedTranslationService.getQualityFeedback();
      
      // Get custom overrides
      const customOverrides = unifiedTranslationService.getCustomOverrides();
      
      // Calculate language usage from feedback
      const languageUsage: Record<LanguageCode, number> = {};
      const qualityByLanguage: Record<LanguageCode, number> = {};
      const languageQualitySum: Record<LanguageCode, number> = {};
      const languageQualityCount: Record<LanguageCode, number> = {};
      
      qualityFeedback.forEach(feedback => {
        // Extract language from translation ID (assuming format: originalText_source_target)
        const parts = feedback.translationId.split('_');
        if (parts.length >= 3) {
          const targetLang = parts[parts.length - 1] as LanguageCode;
          
          languageUsage[targetLang] = (languageUsage[targetLang] || 0) + 1;
          languageQualitySum[targetLang] = (languageQualitySum[targetLang] || 0) + feedback.rating;
          languageQualityCount[targetLang] = (languageQualityCount[targetLang] || 0) + 1;
        }
      });
      
      // Calculate average quality by language
      Object.keys(languageQualitySum).forEach(lang => {
        const langCode = lang as LanguageCode;
        qualityByLanguage[langCode] = languageQualitySum[langCode] / languageQualityCount[langCode];
      });
      
      // Calculate overall average quality
      const totalRating = qualityFeedback.reduce((sum, f) => sum + f.rating, 0);
      const averageQuality = qualityFeedback.length > 0 ? totalRating / qualityFeedback.length : 0;
      
      const analyticsData: AnalyticsData = {
        totalTranslations: cacheStats.size,
        cacheHitRate: cacheStats.hitRate,
        averageQuality,
        languageUsage,
        qualityByLanguage,
        recentFeedback: qualityFeedback.slice(-10).reverse(), // Last 10, most recent first
        customOverridesCount: customOverrides.length
      };
      
      setAnalytics(analyticsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    
    const interval = setInterval(loadAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;
  const formatRating = (rating: number) => rating.toFixed(1);

  if (isLoading && !analytics) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={cn('text-center p-8 text-gray-500', className)}>
        No analytics data available
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Translation Analytics
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          Last updated: {lastUpdated.toLocaleTimeString()}
          <button
            onClick={loadAnalytics}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Total Translations</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {analytics.totalTranslations.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">Cache Hit Rate</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatPercentage(analytics.cacheHitRate)}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">Average Quality</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatRating(analytics.averageQuality)}/5
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">Custom Overrides</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {analytics.customOverridesCount}
          </div>
        </div>
      </div>

      {/* Language Usage Chart */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Language Usage</h4>
        <div className="space-y-3">
          {Object.entries(analytics.languageUsage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([langCode, count]) => {
              const maxCount = Math.max(...Object.values(analytics.languageUsage));
              const percentage = (count / maxCount) * 100;
              
              return (
                <div key={langCode} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-gray-700 truncate">
                    {languages[langCode as LanguageCode]?.name || langCode}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-gray-600 text-right">
                    {count}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Quality by Language */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Quality by Language</h4>
        <div className="space-y-3">
          {Object.entries(analytics.qualityByLanguage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([langCode, quality]) => {
              const percentage = (quality / 5) * 100;
              const colorClass = quality >= 4 ? 'bg-green-500' : quality >= 3 ? 'bg-yellow-500' : 'bg-red-500';
              
              return (
                <div key={langCode} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-gray-700 truncate">
                    {languages[langCode as LanguageCode]?.name || langCode}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={cn('h-2 rounded-full transition-all duration-300', colorClass)}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-gray-600 text-right">
                    {formatRating(quality)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Recent Feedback</h4>
        <div className="space-y-3">
          {analytics.recentFeedback.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No feedback received yet
            </div>
          ) : (
            analytics.recentFeedback.map((feedback, index) => (
              <div key={index} className="border rounded p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            'w-3 h-3',
                            star <= feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {formatRating(feedback.rating)}/5
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(feedback.timestamp).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Original:</span> {feedback.originalText}
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Translation:</span> {feedback.translatedText}
                </div>
                
                {feedback.feedback && (
                  <div className="text-sm text-gray-600 italic">
                    "{feedback.feedback}"
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TranslationAnalytics;