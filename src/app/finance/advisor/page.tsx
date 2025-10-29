'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/auth-context';
import EnhancedFinanceAdvisorService, { EnhancedFinanceAdvisorOutput } from '@/lib/services/EnhancedFinanceAdvisorService';
import { PredictiveInsightsPanel } from '@/components/finance';
import { 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingCart,
  Lightbulb,
  Target,
  AlertCircle,
  CheckCircle,
  Bot,
  User,
  Send,
  Loader2,
  Wifi,
  WifiOff,
  Zap,
  Clock,
  Activity
} from 'lucide-react';

interface FinancialQuery {
  id: string;
  query: string;
  timestamp: Date;
  response?: EnhancedFinancialResponse;
  status: 'pending' | 'processing' | 'completed' | 'error';
  useRealtimeData: boolean;
}

interface EnhancedFinancialResponse extends EnhancedFinanceAdvisorOutput {
  // Additional UI-specific properties can be added here
}

const exampleQueries = [
  "How is my revenue performing this month compared to last month?",
  "Which of my products are underperforming and what should I do about them?",
  "What discount should I offer to increase sales by 20%?",
  "What are the top trends in my category this quarter?",
  "How much revenue can I expect next month?",
  "Which products have the highest profit margins?",
  "What's causing the decline in my mobile sales?",
  "How can I optimize my inventory levels?",
];

export default function FinanceAdvisor() {
  const { userProfile } = useAuth();
  const [query, setQuery] = useState('');
  const [queries, setQueries] = useState<FinancialQuery[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [useRealtimeData, setUseRealtimeData] = useState(true);
  const [realtimeInsights, setRealtimeInsights] = useState<any>(null);
  
  const artisanId = userProfile?.uid || 'dev_bulchandani_001';
  const advisorService = EnhancedFinanceAdvisorService.getInstance();

  // Load real-time insights on component mount
  useEffect(() => {
    loadRealtimeInsights();
  }, [artisanId]);

  const loadRealtimeInsights = async () => {
    try {
      const insights = await advisorService.getRealtimeFinancialInsights(artisanId);
      setRealtimeInsights(insights);
    } catch (error) {
      console.error('Error loading real-time insights:', error);
    }
  };

  const handleSubmitQuery = async () => {
    if (!query.trim()) return;

    const newQuery: FinancialQuery = {
      id: Date.now().toString(),
      query: query.trim(),
      timestamp: new Date(),
      status: 'pending',
      useRealtimeData,
    };

    setQueries(prev => [newQuery, ...prev]);
    setQuery('');
    setIsProcessing(true);

    try {
      // Update status to processing
      setQueries(prev => prev.map(q => 
        q.id === newQuery.id 
          ? { ...q, status: 'processing' }
          : q
      ));

      // Call enhanced advisor service
      const response = await advisorService.consultWithRealtimeData({
        userId: artisanId,
        query: newQuery.query,
        context: {
          artisanId,
          timeRange: selectedTimeRange as any,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
        },
        includeRealtimeData: useRealtimeData
      });
      
      setQueries(prev => prev.map(q => 
        q.id === newQuery.id 
          ? { ...q, response, status: 'completed' }
          : q
      ));

    } catch (error) {
      console.error('Error processing query:', error);
      setQueries(prev => prev.map(q => 
        q.id === newQuery.id 
          ? { ...q, status: 'error' }
          : q
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMockResponse = (query: string): FinancialResponse => {
    const responses = {
      revenue: {
        response: "Your revenue is showing positive growth trends with a 15% increase month-over-month. The mobile channel is driving most of this growth.",
        insights: [
          "Mobile sales increased by 25% this month",
          "Weekend sales are 30% higher than weekdays",
          "Your top 3 products contribute 60% of total revenue"
        ],
        recommendations: [
          "Increase mobile marketing spend",
          "Optimize weekend inventory levels",
          "Focus on top-performing product categories"
        ],
        dataPoints: { revenue: 125000, growth: 15 },
        nextSteps: [
          "Review mobile conversion rates",
          "Analyze weekend vs weekday patterns",
          "Set revenue targets for next month"
        ],
        confidence: 0.85
      },
      performance: {
        response: "Several products are underperforming due to pricing and inventory issues. I've identified 3 products that need immediate attention.",
        insights: [
          "Product A has 40% higher return rate than average",
          "Product B inventory turnover is below industry standard",
          "Product C pricing is 15% above market average"
        ],
        recommendations: [
          "Review Product A quality control processes",
          "Optimize Product B inventory management",
          "Adjust Product C pricing strategy"
        ],
        dataPoints: { margin: 0.25 },
        nextSteps: [
          "Conduct product quality audit",
          "Implement inventory optimization",
          "Perform competitive pricing analysis"
        ],
        confidence: 0.78
      },
      discount: {
        response: "Based on your current margins and market elasticity, a 15% discount could increase sales by 20% while maintaining profitability.",
        insights: [
          "Your current margin allows for up to 20% discount",
          "Market research shows 15% is the sweet spot",
          "Seasonal demand supports discount strategy"
        ],
        recommendations: [
          "Start with 15% discount on underperforming products",
          "Monitor conversion rate changes",
          "Adjust discount based on performance"
        ],
        dataPoints: { revenue: 150000, growth: 20 },
        nextSteps: [
          "Implement A/B testing for discount levels",
          "Track margin impact daily",
          "Prepare inventory for increased demand"
        ],
        confidence: 0.82
      }
    };

    if (query.toLowerCase().includes('revenue')) return responses.revenue;
    if (query.toLowerCase().includes('underperforming')) return responses.performance;
    if (query.toLowerCase().includes('discount')) return responses.discount;

    // Default response
    return {
      response: "I've analyzed your query and found several interesting patterns in your financial data. Here are my key insights and recommendations.",
      insights: [
        "Your business shows strong growth potential",
        "Several optimization opportunities identified",
        "Market trends are favorable for your category"
      ],
      recommendations: [
        "Focus on high-margin products",
        "Optimize inventory management",
        "Consider expanding to new channels"
      ],
      dataPoints: { revenue: 100000, growth: 10 },
      nextSteps: [
        "Review detailed analytics",
        "Set specific improvement targets",
        "Monitor key performance indicators"
      ],
      confidence: 0.75
    };
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Bot className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Enhanced Finance Advisor</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          AI-powered financial advisor with real-time Firestore data integration. 
          Get instant insights, recommendations, and analysis based on your live business data.
        </p>
      </div>

      {/* Real-time Insights Panel */}
      {realtimeInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Business Insights
            </CardTitle>
            <CardDescription>
              Real-time analysis of your current business performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Insights */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Key Insights
                </h4>
                <ul className="space-y-1">
                  {realtimeInsights.insights.slice(0, 3).map((insight: string, index: number) => (
                    <li key={index} className="text-xs text-muted-foreground">• {insight}</li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                  <Target className="h-4 w-4 text-green-500" />
                  Quick Actions
                </h4>
                <ul className="space-y-1">
                  {realtimeInsights.recommendations.slice(0, 3).map((rec: string, index: number) => (
                    <li key={index} className="text-xs text-muted-foreground">• {rec}</li>
                  ))}
                </ul>
              </div>

              {/* Alerts */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Alerts
                </h4>
                <ul className="space-y-1">
                  {realtimeInsights.alerts.length > 0 ? 
                    realtimeInsights.alerts.slice(0, 3).map((alert: string, index: number) => (
                      <li key={index} className="text-xs text-muted-foreground">• {alert}</li>
                    )) : 
                    <li className="text-xs text-muted-foreground">• No alerts</li>
                  }
                </ul>
              </div>

              {/* Opportunities */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Opportunities
                </h4>
                <ul className="space-y-1">
                  {realtimeInsights.opportunities.slice(0, 3).map((opp: string, index: number) => (
                    <li key={index} className="text-xs text-muted-foreground">• {opp}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Query Input */}
      <Card>
        <CardHeader>
          <CardTitle>Ask Your Financial Question</CardTitle>
          <CardDescription>
            Get AI-powered insights with real-time data integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="handicrafts">Handicrafts</SelectItem>
                <SelectItem value="textiles">Textiles</SelectItem>
                <SelectItem value="jewelry">Jewelry</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={useRealtimeData ? "default" : "outline"}
              size="sm"
              onClick={() => setUseRealtimeData(!useRealtimeData)}
            >
              {useRealtimeData ? <Wifi className="h-4 w-4 mr-2" /> : <WifiOff className="h-4 w-4 mr-2" />}
              {useRealtimeData ? 'Real-time Data' : 'Cached Data'}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Textarea
              placeholder="e.g., How is my revenue performing this month compared to last month?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-h-[100px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSubmitQuery();
                }
              }}
            />
            <Button 
              onClick={handleSubmitQuery} 
              disabled={!query.trim() || isProcessing}
              className="px-6"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Example Queries */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Try asking about:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.slice(0, 4).map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(example)}
                  className="text-xs"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Insights Panel */}
      <PredictiveInsightsPanel artisanId={artisanId} />

      {/* Query History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Queries</h2>
        
        {queries.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                <p>No queries yet. Ask your first question above!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {queries.map((queryItem) => (
              <Card key={queryItem.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">
                        {queryItem.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {queryItem.status === 'pending' && 'Pending'}
                      {queryItem.status === 'processing' && 'Processing'}
                      {queryItem.status === 'completed' && 'Completed'}
                      {queryItem.status === 'error' && 'Error'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* User Query */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="font-medium">{queryItem.query}</p>
                  </div>

                  {/* AI Response */}
                  {queryItem.status === 'completed' && queryItem.response && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Bot className="h-4 w-4 text-primary" />
                          <span className="font-medium">Enhanced AI Analysis</span>
                          <Badge className={getConfidenceColor(queryItem.response.confidence)}>
                            {getConfidenceLabel(queryItem.response.confidence)}
                          </Badge>
                        </div>
                        {queryItem.useRealtimeData && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            Real-time Data
                          </Badge>
                        )}
                      </div>

                      <div className="bg-muted/20 p-4 rounded-lg">
                        <p>{queryItem.response.response}</p>
                      </div>

                      {/* Real-time Insights */}
                      {queryItem.response.realtimeInsights && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-2 flex items-center">
                            <Activity className="h-4 w-4 text-blue-500 mr-2" />
                            Live Business Metrics
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-600">
                                ₹{queryItem.response.realtimeInsights.liveMetrics.currentRevenue.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">Today's Revenue</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-blue-600">
                                {queryItem.response.realtimeInsights.liveMetrics.todayOrders}
                              </p>
                              <p className="text-xs text-muted-foreground">Today's Orders</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {queryItem.response.realtimeInsights.dataFreshness.isLive ? (
                                  <Wifi className="h-4 w-4 text-green-500" />
                                ) : (
                                  <WifiOff className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-sm font-medium">
                                  {queryItem.response.realtimeInsights.dataFreshness.isLive ? 'Live' : 'Cached'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">Data Status</p>
                            </div>
                          </div>
                          
                          {queryItem.response.realtimeInsights.liveMetrics.recentTrends.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-1">Recent Trends:</p>
                              <ul className="space-y-1">
                                {queryItem.response.realtimeInsights.liveMetrics.recentTrends.map((trend, index) => (
                                  <li key={index} className="text-xs text-muted-foreground">• {trend}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Key Insights */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Lightbulb className="h-4 w-4 text-yellow-500 mr-2" />
                          Key Insights
                        </h4>
                        <ul className="space-y-1">
                          {queryItem.response.insights.map((insight, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                              <span className="text-sm">{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommendations */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Target className="h-4 w-4 text-green-500 mr-2" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {queryItem.response.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Urgent Recommendations */}
                      {queryItem.response.realtimeInsights?.urgentRecommendations && 
                       queryItem.response.realtimeInsights.urgentRecommendations.length > 0 && (
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-2 flex items-center">
                            <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                            Urgent Actions Required
                          </h4>
                          <ul className="space-y-1">
                            {queryItem.response.realtimeInsights.urgentRecommendations.map((rec, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm font-medium">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Data Points */}
                      {queryItem.response.dataPoints && Object.keys(queryItem.response.dataPoints).length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Key Metrics</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {queryItem.response.dataPoints.revenue && (
                              <div className="text-center p-3 bg-green-50 rounded-lg">
                                <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-1" />
                                <p className="text-sm font-medium">
                                  ₹{queryItem.response.dataPoints.revenue.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">Revenue</p>
                              </div>
                            )}
                            {queryItem.response.dataPoints.growth !== undefined && (
                              <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                                <p className="text-sm font-medium">
                                  {queryItem.response.dataPoints.growth > 0 ? '+' : ''}
                                  {queryItem.response.dataPoints.growth}%
                                </p>
                                <p className="text-xs text-muted-foreground">Growth</p>
                              </div>
                            )}
                            {queryItem.response.dataPoints.margin && (
                              <div className="text-center p-3 bg-purple-50 rounded-lg">
                                <Package className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                                <p className="text-sm font-medium">
                                  {(queryItem.response.dataPoints.margin * 100).toFixed(1)}%
                                </p>
                                <p className="text-xs text-muted-foreground">Margin</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Next Steps */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                          Next Steps
                        </h4>
                        <ul className="space-y-1">
                          {queryItem.response.nextSteps.map((step, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                              <span className="text-sm">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Data Freshness Info */}
                      {queryItem.response.realtimeInsights?.dataFreshness && (
                        <div className="text-xs text-muted-foreground border-t pt-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              Data updated: {queryItem.response.realtimeInsights.dataFreshness.lastUpdated.toLocaleString()}
                            </span>
                            <span>•</span>
                            <span>Status: {queryItem.response.realtimeInsights.dataFreshness.cacheStatus}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {queryItem.status === 'processing' && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-2">Analyzing your data...</span>
                    </div>
                  )}

                  {queryItem.status === 'error' && (
                    <div className="flex items-center justify-center py-8 text-red-500">
                      <AlertCircle className="h-8 w-8 mr-2" />
                      <span>Failed to process query. Please try again.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
