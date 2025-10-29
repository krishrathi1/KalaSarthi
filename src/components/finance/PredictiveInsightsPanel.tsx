'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Lightbulb,
  Calendar,
  BarChart3,
  Activity,
  Clock,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import PredictiveInsightsService, { PredictiveInsights } from '@/lib/services/PredictiveInsightsService';

interface PredictiveInsightsPanelProps {
  artisanId: string;
  className?: string;
}

export default function PredictiveInsightsPanel({ artisanId, className = '' }: PredictiveInsightsPanelProps) {
  const [insights, setInsights] = useState<PredictiveInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const predictiveService = PredictiveInsightsService.getInstance();

  useEffect(() => {
    loadInsights();
  }, [artisanId]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const predictiveInsights = await predictiveService.generatePredictiveInsights(artisanId);
      setInsights(predictiveInsights);
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Error loading predictive insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'upward':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'downward':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'volatile':
        return <Activity className="h-4 w-4 text-orange-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'upward':
        return 'text-green-600 bg-green-50';
      case 'downward':
        return 'text-red-600 bg-red-50';
      case 'volatile':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Predictive Insights
          </CardTitle>
          <CardDescription>Loading AI-powered predictions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !insights) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Predictive Insights
          </CardTitle>
          <CardDescription>Error loading insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-muted-foreground">{error || 'Failed to load insights'}</p>
            <Button onClick={loadInsights} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI-Powered Predictive Insights</h3>
          <p className="text-sm text-muted-foreground">
            Real-time forecasting and trend analysis based on your business data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {lastRefresh.toLocaleTimeString()}
          </Badge>
          <Badge variant="default" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Quality: {(insights.dataQuality * 100).toFixed(0)}%
          </Badge>
          <Button variant="outline" size="sm" onClick={loadInsights}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Insights Tabs */}
      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="opportunities">Growth</TabsTrigger>
          <TabsTrigger value="recommendations">Actions</TabsTrigger>
        </TabsList>

        {/* Revenue Forecast */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                7-Day Revenue Forecast
              </CardTitle>
              <CardDescription>
                AI-powered predictions based on historical patterns and real-time data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.revenueForecast.predictions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <p>Insufficient data for reliable forecasting</p>
                  <p className="text-sm">Need more historical sales data</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Forecast Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(insights.revenueForecast.predictions.reduce((sum, p) => sum + p.predictedRevenue, 0))}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Predicted</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(insights.revenueForecast.predictions.reduce((sum, p) => sum + p.predictedRevenue, 0) / 7)}
                      </p>
                      <p className="text-sm text-muted-foreground">Daily Average</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {(insights.revenueForecast.accuracy * 100).toFixed(0)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                    </div>
                  </div>

                  {/* Daily Predictions */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Daily Predictions</h4>
                    {insights.revenueForecast.predictions.map((prediction, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{prediction.date.toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">
                            Range: {formatCurrency(prediction.lowerBound)} - {formatCurrency(prediction.upperBound)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(prediction.predictedRevenue)}</p>
                          <div className="flex items-center gap-1">
                            <Progress value={prediction.confidence * 100} className="w-16 h-2" />
                            <span className="text-xs text-muted-foreground">
                              {(prediction.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Forecast Factors */}
                  <div>
                    <h4 className="font-medium mb-2">Forecast Factors</h4>
                    <ul className="space-y-1">
                      {insights.revenueForecast.factors.map((factor, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Analysis */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Trend Analysis
              </CardTitle>
              <CardDescription>
                Current business trends and patterns analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Main Trend */}
                <div className={`p-4 rounded-lg ${getTrendColor(insights.trendAnalysis.trend)}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {getTrendIcon(insights.trendAnalysis.trend)}
                    <h4 className="font-medium capitalize">{insights.trendAnalysis.trend} Trend</h4>
                    <Badge variant="outline">
                      {(insights.trendAnalysis.strength * 100).toFixed(0)}% strength
                    </Badge>
                  </div>
                  <p className="text-sm">{insights.trendAnalysis.description}</p>
                </div>

                {/* Trend Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{insights.trendAnalysis.duration}</p>
                    <p className="text-sm text-muted-foreground">Days Analyzed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{(insights.trendAnalysis.confidence * 100).toFixed(0)}%</p>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{(insights.trendAnalysis.strength * 100).toFixed(0)}%</p>
                    <p className="text-sm text-muted-foreground">Trend Strength</p>
                  </div>
                </div>

                {/* Trend Factors */}
                <div>
                  <h4 className="font-medium mb-2">Analysis Factors</h4>
                  <ul className="space-y-1">
                    {insights.trendAnalysis.factors.map((factor, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Seasonal Patterns */}
                {insights.seasonalPatterns.pattern !== 'none' && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Seasonal Patterns</h4>
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="capitalize">
                          {insights.seasonalPatterns.pattern} Pattern
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {(insights.seasonalPatterns.strength * 100).toFixed(0)}% strength
                        </span>
                      </div>
                      
                      {insights.seasonalPatterns.peakPeriods.length > 0 && (
                        <p className="text-sm mb-1">
                          <strong>Peak periods:</strong> {insights.seasonalPatterns.peakPeriods.join(', ')}
                        </p>
                      )}
                      
                      {insights.seasonalPatterns.lowPeriods.length > 0 && (
                        <p className="text-sm mb-2">
                          <strong>Low periods:</strong> {insights.seasonalPatterns.lowPeriods.join(', ')}
                        </p>
                      )}

                      <div className="space-y-1">
                        {insights.seasonalPatterns.recommendations.map((rec, index) => (
                          <p key={index} className="text-xs text-muted-foreground">• {rec}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Factors */}
        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk Assessment
              </CardTitle>
              <CardDescription>
                Potential risks and mitigation strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.riskFactors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p>No significant risks detected</p>
                  <p className="text-sm">Your business metrics look healthy</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.riskFactors.map((risk, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(risk.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{risk.factor}</h4>
                            <Badge variant="outline" className={`capitalize ${
                              risk.severity === 'high' ? 'border-red-200 text-red-700' :
                              risk.severity === 'medium' ? 'border-orange-200 text-orange-700' :
                              'border-yellow-200 text-yellow-700'
                            }`}>
                              {risk.severity} risk
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{risk.impact}</p>
                          <div className="bg-muted/20 p-3 rounded">
                            <p className="text-sm"><strong>Mitigation:</strong> {risk.mitigation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Growth Opportunities */}
        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Growth Opportunities
              </CardTitle>
              <CardDescription>
                Identified opportunities for business growth
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.opportunities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2" />
                  <p>No specific opportunities identified</p>
                  <p className="text-sm">Continue monitoring for new opportunities</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.opportunities.map((opportunity, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{opportunity.opportunity}</h4>
                          <p className="text-sm text-muted-foreground">{opportunity.timeframe}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(opportunity.potential)}
                          </p>
                          <p className="text-xs text-muted-foreground">Potential</p>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium mb-2">Recommended Actions:</h5>
                        <ul className="space-y-1">
                          {opportunity.actions.map((action, actionIndex) => (
                            <li key={actionIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Action Recommendations
              </CardTitle>
              <CardDescription>
                Prioritized recommendations based on predictive analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.recommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2" />
                  <p>No specific recommendations at this time</p>
                  <p className="text-sm">Your business is performing well</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.recommendations
                    .sort((a, b) => {
                      const priorityOrder = { high: 3, medium: 2, low: 1 };
                      return priorityOrder[b.priority] - priorityOrder[a.priority];
                    })
                    .map((rec, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority} priority
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {rec.category}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{rec.timeline}</span>
                      </div>
                      
                      <h4 className="font-medium mb-2">{rec.recommendation}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Expected Impact:</strong> {rec.expectedImpact}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}