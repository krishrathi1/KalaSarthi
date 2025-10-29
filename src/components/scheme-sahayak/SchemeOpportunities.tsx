/**
 * Scheme Opportunities Component
 * Displays predicted future scheme opportunities and upcoming deadlines
 * 
 * Requirement 8.5: Predict future scheme opportunities based on business growth patterns
 */

'use client';

import React, { useEffect, useState } from 'react';
import { SchemeOpportunityPrediction } from '@/lib/types/scheme-sahayak';

interface SchemeOpportunitiesProps {
  artisanId: string;
}

export function SchemeOpportunities({ artisanId }: SchemeOpportunitiesProps) {
  const [opportunities, setOpportunities] = useState<SchemeOpportunityPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOpportunities();
  }, [artisanId]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/scheme-sahayak/analytics?artisanId=${artisanId}&type=opportunities`);
      const data = await response.json();

      if (data.success) {
        setOpportunities(data.data);
      } else {
        setError(data.error || 'Failed to load opportunities');
      }
    } catch (err) {
      setError('Failed to fetch opportunities');
      console.error('Error fetching opportunities:', err);
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

  if (!opportunities) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No opportunities available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Deadlines Alert */}
      {opportunities.upcomingDeadlines.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            Urgent: Upcoming Deadlines
          </h3>
          <div className="space-y-3">
            {opportunities.upcomingDeadlines.map((deadline, index) => (
              <DeadlineCard key={index} deadline={deadline} />
            ))}
          </div>
        </div>
      )}

      {/* Predicted Opportunities */}
      <div>
        <h3 className="text-xl font-bold mb-4">Predicted Opportunities for You</h3>
        <div className="grid grid-cols-1 gap-4">
          {opportunities.predictedOpportunities.map((opp, index) => (
            <OpportunityCard key={index} opportunity={opp} />
          ))}
        </div>
      </div>

      {/* Seasonal Trends */}
      {opportunities.seasonalTrends.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Seasonal Trends</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.seasonalTrends.map((trend, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">{trend.month}</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">
                    Typical schemes: <span className="font-semibold">{trend.typicalSchemeCount}</span>
                  </p>
                  <p className="text-gray-600">
                    Success rate: <span className="font-semibold text-green-600">
                      {trend.historicalSuccessRate.toFixed(0)}%
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {trend.categories.map((cat, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OpportunityCard({ 
  opportunity 
}: { 
  opportunity: SchemeOpportunityPrediction['predictedOpportunities'][0];
}) {
  const [expanded, setExpanded] = useState(false);

  const confidenceColor = 
    opportunity.confidence > 0.8 ? 'text-green-600' :
    opportunity.confidence > 0.6 ? 'text-yellow-600' :
    'text-gray-600';

  const confidenceLabel =
    opportunity.confidence > 0.8 ? 'High Confidence' :
    opportunity.confidence > 0.6 ? 'Medium Confidence' :
    'Low Confidence';

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-5 hover:border-blue-400 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-lg mb-1">{opportunity.schemeName}</h4>
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
            {opportunity.category}
          </span>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${confidenceColor}`}>{confidenceLabel}</p>
          <p className="text-xs text-gray-500">{(opportunity.confidence * 100).toFixed(0)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-green-50 rounded p-3">
          <p className="text-xs text-gray-600 mb-1">Eligibility</p>
          <p className="text-lg font-bold text-green-700">
            {(opportunity.eligibilityProbability * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-blue-50 rounded p-3">
          <p className="text-xs text-gray-600 mb-1">Success Probability</p>
          <p className="text-lg font-bold text-blue-700">
            {(opportunity.successProbability * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded p-3 mb-3">
        <p className="text-xs text-gray-600 mb-1">Estimated Benefit</p>
        <p className="text-lg font-bold">
          {opportunity.estimatedBenefit.currency} {opportunity.estimatedBenefit.min.toLocaleString()} - {opportunity.estimatedBenefit.max.toLocaleString()}
        </p>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-700 italic">{opportunity.reasoning}</p>
      </div>

      {opportunity.preparationRequired.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
          <p className="text-xs font-semibold text-yellow-800 mb-2">
            Preparation Required ({opportunity.timeToPrep} days):
          </p>
          <ul className="space-y-1">
            {opportunity.preparationRequired.map((req, index) => (
              <li key={index} className="text-xs text-yellow-900 flex items-start gap-1">
                <span>•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Available: {new Date(opportunity.predictedAvailability).toLocaleDateString()}
        </p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          {expanded ? 'Hide Details' : 'View Details'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t">
          <div className="space-y-2 text-sm">
            <p><strong>Scheme ID:</strong> {opportunity.schemeId}</p>
            <p><strong>Category:</strong> {opportunity.category}</p>
            <p><strong>Time to Prepare:</strong> {opportunity.timeToPrep} days</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DeadlineCard({ 
  deadline 
}: { 
  deadline: SchemeOpportunityPrediction['upcomingDeadlines'][0];
}) {
  const urgencyColor = 
    deadline.daysRemaining <= 3 ? 'bg-red-100 border-red-300' :
    deadline.daysRemaining <= 7 ? 'bg-orange-100 border-orange-300' :
    'bg-yellow-100 border-yellow-300';

  const readinessColor =
    deadline.readinessScore >= 80 ? 'text-green-600' :
    deadline.readinessScore >= 50 ? 'text-yellow-600' :
    'text-red-600';

  return (
    <div className={`border rounded-lg p-3 ${urgencyColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{deadline.schemeName}</h4>
          <p className="text-xs text-gray-600 mt-1">
            Deadline: {new Date(deadline.deadline).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-red-700">{deadline.daysRemaining}</p>
          <p className="text-xs text-gray-600">days left</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600">Readiness Score</p>
          <p className={`text-sm font-bold ${readinessColor}`}>{deadline.readinessScore}%</p>
        </div>
        {deadline.missingRequirements.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-600">Missing</p>
            <p className="text-sm font-bold text-red-600">{deadline.missingRequirements.length} items</p>
          </div>
        )}
      </div>

      {deadline.missingRequirements.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-300">
          <p className="text-xs font-semibold mb-1">Still needed:</p>
          <ul className="space-y-1">
            {deadline.missingRequirements.slice(0, 3).map((req, index) => (
              <li key={index} className="text-xs flex items-start gap-1">
                <span>•</span>
                <span>{req}</span>
              </li>
            ))}
            {deadline.missingRequirements.length > 3 && (
              <li className="text-xs text-gray-600">
                +{deadline.missingRequirements.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SchemeOpportunities;
