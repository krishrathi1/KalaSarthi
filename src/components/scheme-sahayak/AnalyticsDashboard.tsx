/**
 * Analytics Dashboard Component
 * Displays personal analytics, comparative metrics, and insights
 * 
 * Requirements:
 * - 8.1: Track and display personal application success rate over time
 * - 8.2: Provide comparative analytics with similar artisan profiles
 * - 8.3: Identify factors contributing to application success or failure
 */

'use client';

import React, { useEffect, useState } from 'react';
import { PersonalAnalytics } from '@/lib/types/scheme-sahayak';

interface AnalyticsDashboardProps {
  artisanId: string;
}

export function AnalyticsDashboard({ artisanId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [artisanId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/scheme-sahayak/analytics?artisanId=${artisanId}&type=personal`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      setError('Failed to fetch analytics');
      console.error('Error fetching analytics:', err);
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

  if (!analytics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Success Rate"
          value={`${analytics.applicationSuccessRate.toFixed(1)}%`}
          subtitle={`${analytics.approvedApplications} of ${analytics.totalApplications} approved`}
          trend={analytics.applicationSuccessRate > analytics.comparativeAnalytics.averageSuccessRate ? 'up' : 'down'}
        />
        <MetricCard
          title="Total Applications"
          value={analytics.totalApplications.toString()}
          subtitle={`${analytics.pendingApplications} pending`}
        />
        <MetricCard
          title="Avg Processing Time"
          value={`${Math.round(analytics.averageProcessingTime)} days`}
          subtitle="From submission to decision"
        />
        <MetricCard
          title="Your Ranking"
          value={analytics.comparativeAnalytics.position.replace('_', ' ')}
          subtitle={`Top ${Math.round(100 - analytics.comparativeAnalytics.percentile)}%`}
          trend="up"
        />
      </div>

      {/* Monthly Trends Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
        <div className="space-y-2">
          {analytics.monthlyTrends.slice(-6).map((trend, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium">{trend.month} {trend.year}</span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{trend.applications} applications</span>
                <span className="text-sm text-green-600">{trend.approvals} approved</span>
                <span className="text-sm font-semibold">{trend.successRate.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparative Analytics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Comparative Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ComparisonCard
            title="Applications"
            yours={analytics.comparativeAnalytics.comparison.applications.yours}
            average={Math.round(analytics.comparativeAnalytics.comparison.applications.average)}
            top10={analytics.comparativeAnalytics.comparison.applications.top10Percent}
          />
          <ComparisonCard
            title="Processing Time (days)"
            yours={Math.round(analytics.comparativeAnalytics.comparison.processingTime.yours)}
            average={Math.round(analytics.comparativeAnalytics.comparison.processingTime.average)}
            best={Math.round(analytics.comparativeAnalytics.comparison.processingTime.best)}
            lowerIsBetter
          />
          <ComparisonCard
            title="Approval Rate (%)"
            yours={Math.round(analytics.comparativeAnalytics.comparison.approvalRate.yours)}
            average={Math.round(analytics.comparativeAnalytics.comparison.approvalRate.average)}
            top10={Math.round(analytics.comparativeAnalytics.comparison.approvalRate.top10Percent)}
          />
        </div>
        <p className="text-sm text-gray-600 mt-4">
          Compared with {analytics.comparativeAnalytics.similarArtisansCount} similar artisans
        </p>
      </div>

      {/* Success Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-700">Positive Factors</h3>
          <div className="space-y-3">
            {analytics.successFactors.positiveFactors.map((factor, index) => (
              <FactorCard key={index} factor={factor} type="positive" />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-700">Areas for Improvement</h3>
          <div className="space-y-3">
            {analytics.successFactors.negativeFactors.map((factor, index) => (
              <FactorCard key={index} factor={factor} type="negative" />
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
        <ul className="space-y-2">
          {analytics.successFactors.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span className="text-sm">{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Top Categories */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Top Categories</h3>
        <div className="space-y-3">
          {analytics.topCategories.map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium capitalize">{category.category}</span>
                  <span className="text-sm text-gray-600">{category.count} applications</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${category.successRate}%` }}
                  ></div>
                </div>
              </div>
              <span className="ml-4 text-sm font-semibold">{category.successRate.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper Components

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  trend 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-600">{title}</h4>
        {trend && (
          <span className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function ComparisonCard({
  title,
  yours,
  average,
  top10,
  best,
  lowerIsBetter = false
}: {
  title: string;
  yours: number;
  average: number;
  top10?: number;
  best?: number;
  lowerIsBetter?: boolean;
}) {
  const isGood = lowerIsBetter 
    ? yours < average 
    : yours > average;

  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-600 mb-3">{title}</h4>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">You</span>
          <span className={`font-semibold ${isGood ? 'text-green-600' : 'text-gray-900'}`}>
            {yours}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Average</span>
          <span className="text-gray-600">{average}</span>
        </div>
        {top10 !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Top 10%</span>
            <span className="text-blue-600">{top10}</span>
          </div>
        )}
        {best !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Best</span>
            <span className="text-blue-600">{best}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FactorCard({ 
  factor, 
  type 
}: { 
  factor: { factor: string; impact: string; description: string; frequency: number; correlationScore: number };
  type: 'positive' | 'negative';
}) {
  const bgColor = type === 'positive' ? 'bg-green-50' : 'bg-red-50';
  const borderColor = type === 'positive' ? 'border-green-200' : 'border-red-200';
  const textColor = type === 'positive' ? 'text-green-800' : 'text-red-800';

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-3`}>
      <div className="flex items-start justify-between mb-1">
        <h4 className={`text-sm font-semibold ${textColor}`}>{factor.factor}</h4>
        <span className={`text-xs px-2 py-1 rounded ${
          factor.impact === 'high' ? 'bg-red-100 text-red-700' :
          factor.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {factor.impact}
        </span>
      </div>
      <p className="text-xs text-gray-600">{factor.description}</p>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <span>Frequency: {factor.frequency}</span>
        <span>Impact: {(factor.correlationScore * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
