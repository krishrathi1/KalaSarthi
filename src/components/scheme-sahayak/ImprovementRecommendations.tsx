/**
 * Improvement Recommendations Component
 * Displays personalized monthly improvement recommendations
 * 
 * Requirement 8.4: Generate personalized improvement recommendations monthly
 */

'use client';

import React, { useEffect, useState } from 'react';
import { ImprovementRecommendations as ImprovementRecsType } from '@/lib/types/scheme-sahayak';

interface ImprovementRecommendationsProps {
  artisanId: string;
}

export function ImprovementRecommendations({ artisanId }: ImprovementRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<ImprovementRecsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [artisanId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/scheme-sahayak/analytics?artisanId=${artisanId}&type=recommendations`);
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.data);
      } else {
        setError(data.error || 'Failed to load recommendations');
      }
    } catch (err) {
      setError('Failed to fetch recommendations');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No recommendations available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Your Performance Score</h2>
        <div className="flex items-end gap-2">
          <span className="text-5xl font-bold">{Math.round(recommendations.overallScore)}</span>
          <span className="text-xl mb-2">/100</span>
        </div>
        <p className="text-blue-100 mt-2">
          Generated on {new Date(recommendations.generatedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Quick Wins */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
          <span>⚡</span>
          Quick Wins
        </h3>
        <ul className="space-y-2">
          {recommendations.quickWins.map((win, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <span className="text-sm text-green-900">{win}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Personalized Recommendations</h3>
        {recommendations.recommendations.map((rec) => (
          <RecommendationCard key={rec.id} recommendation={rec} />
        ))}
      </div>

      {/* Long-term Goals */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <span>🎯</span>
          Long-term Goals
        </h3>
        <ul className="space-y-2">
          {recommendations.longTermGoals.map((goal, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">→</span>
              <span className="text-sm text-blue-900">{goal}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RecommendationCard({ 
  recommendation 
}: { 
  recommendation: ImprovementRecsType['recommendations'][0];
}) {
  const [expanded, setExpanded] = useState(false);

  const priorityColors = {
    high: 'border-red-300 bg-red-50',
    medium: 'border-yellow-300 bg-yellow-50',
    low: 'border-gray-300 bg-gray-50'
  };

  const priorityBadgeColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-700'
  };

  const categoryIcons = {
    documentation: '📄',
    profile: '👤',
    timing: '⏰',
    scheme_selection: '🎯',
    application_quality: '✨'
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${priorityColors[recommendation.priority]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{categoryIcons[recommendation.category]}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-lg">{recommendation.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityBadgeColors[recommendation.priority]}`}>
          {recommendation.priority.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="bg-white rounded p-3">
          <p className="text-xs text-gray-500 mb-1">Expected Impact</p>
          <p className="text-sm font-semibold">{recommendation.expectedImpact}</p>
        </div>
        <div className="bg-white rounded p-3">
          <p className="text-xs text-gray-500 mb-1">Time to Implement</p>
          <p className="text-sm font-semibold">{recommendation.estimatedTimeToImplement} days</p>
        </div>
      </div>

      <div className="bg-white rounded p-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Potential Success Rate Increase</span>
          <span className="text-lg font-bold text-green-600">+{recommendation.potentialSuccessRateIncrease}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{ width: `${Math.min(100, recommendation.potentialSuccessRateIncrease * 5)}%` }}
          ></div>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
      >
        {expanded ? '▼' : '▶'} {expanded ? 'Hide' : 'Show'} Action Steps
      </button>

      {expanded && (
        <div className="mt-3 bg-white rounded p-4">
          <h5 className="font-semibold text-sm mb-2">Action Steps:</h5>
          <ol className="space-y-2">
            {recommendation.actionSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-600 font-semibold text-sm">{index + 1}.</span>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default ImprovementRecommendations;
