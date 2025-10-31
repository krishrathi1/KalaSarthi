/**
 * Analytics Page
 * Demonstrates the Analytics and Insights System
 */

'use client';

import React, { useState } from 'react';
import { AnalyticsDashboard } from '@/components/scheme-sahayak/AnalyticsDashboard';
import { ImprovementRecommendations } from '@/components/scheme-sahayak/ImprovementRecommendations';
import { SchemeOpportunities } from '@/components/scheme-sahayak/SchemeOpportunities';

export default function AnalyticsPage() {
  const [artisanId, setArtisanId] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'recommendations' | 'opportunities'>('dashboard');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (artisanId.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Analytics & Insights Dashboard
          </h1>
          <p className="text-gray-600">
            Track your performance, get personalized recommendations, and discover new opportunities
          </p>
        </div>

        {/* Artisan ID Input */}
        {!submitted ? (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <form onSubmit={handleSubmit} className="max-w-md">
              <label htmlFor="artisanId" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Artisan ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="artisanId"
                  value={artisanId}
                  onChange={(e) => setArtisanId(e.target.value)}
                  placeholder="e.g., artisan123"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Analytics
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Demo: Use any artisan ID from your database
              </p>
            </form>
          </div>
        ) : (
          <>
            {/* Artisan Info Bar */}
            <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Viewing analytics for:</p>
                <p className="font-semibold text-lg">{artisanId}</p>
              </div>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setArtisanId('');
                }}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Change Artisan
              </button>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'dashboard'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📊 Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'recommendations'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    💡 Recommendations
                  </button>
                  <button
                    onClick={() => setActiveTab('opportunities')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'opportunities'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🎯 Opportunities
                  </button>
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="mb-8">
              {activeTab === 'dashboard' && <AnalyticsDashboard artisanId={artisanId} />}
              {activeTab === 'recommendations' && <ImprovementRecommendations artisanId={artisanId} />}
              {activeTab === 'opportunities' && <SchemeOpportunities artisanId={artisanId} />}
            </div>
          </>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">About This System</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-semibold mb-2">📈 Personal Analytics</h4>
              <p>Track your application success rate, processing times, and performance trends over time.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🔍 Comparative Insights</h4>
              <p>See how you compare with similar artisans and identify areas for improvement.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎯 Smart Predictions</h4>
              <p>Get AI-powered recommendations and discover upcoming scheme opportunities.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
