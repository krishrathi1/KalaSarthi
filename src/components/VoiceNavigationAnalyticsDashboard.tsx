'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts';
import {
    Activity,
    TrendingUp,
    Users,
    Clock,
    AlertTriangle,
    CheckCircle,
    Download,
    RefreshCw,
    Mic,
    Globe,
    Smartphone,
    Monitor,
    Tablet
} from 'lucide-react';
import {
    VoiceNavigationAnalytics,
    VoiceNavigationMetrics,
    VoiceNavigationInsights,
    VoiceNavigationPerformanceMonitor
} from '@/lib/services/VoiceNavigationAnalytics';

interface AnalyticsDashboardProps {
    className?: string;
    refreshInterval?: number;
}

export function VoiceNavigationAnalyticsDashboard({
    className,
    refreshInterval = 30000 // 30 seconds
}: AnalyticsDashboardProps) {
    const [metrics, setMetrics] = useState<VoiceNavigationMetrics | null>(null);
    const [insights, setInsights] = useState<VoiceNavigationInsights | null>(null);
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const analytics = VoiceNavigationAnalytics.getInstance();
    const performanceMonitor = VoiceNavigationPerformanceMonitor.getInstance();

    // Load analytics data
    const loadAnalyticsData = async () => {
        try {
            setIsLoading(true);

            const [metricsData, insightsData, perfData] = await Promise.all([
                Promise.resolve(analytics.getMetrics()),
                Promise.resolve(analytics.generateInsights()),
                Promise.resolve(performanceMonitor.getPerformanceMetrics())
            ]);

            setMetrics(metricsData);
            setInsights(insightsData);
            setPerformanceData(perfData);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to load analytics data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-refresh data
    useEffect(() => {
        loadAnalyticsData();

        const interval = setInterval(loadAnalyticsData, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval]);

    // Export data
    const handleExportData = (format: 'json' | 'csv') => {
        const data = analytics.exportData(format);
        const blob = new Blob([data], {
            type: format === 'json' ? 'application/json' : 'text/csv'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-navigation-analytics-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Clear analytics data
    const handleClearData = () => {
        if (confirm('Are you sure you want to clear all analytics data? This action cannot be undone.')) {
            analytics.clearData();
            loadAnalyticsData();
        }
    };

    if (isLoading || !metrics || !insights) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading analytics data...</span>
                </div>
            </div>
        );
    }

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Voice Navigation Analytics</h2>
                    <p className="text-muted-foreground">
                        Monitor usage, performance, and insights for voice navigation
                    </p>
                    {lastUpdated && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Last updated: {lastUpdated.toLocaleString()}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportData('json')}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export JSON
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportData('csv')}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadAnalyticsData}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalSessions}</div>
                        <p className="text-xs text-muted-foreground">
                            Voice navigation sessions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(metrics.successRate * 100).toFixed(1)}%
                        </div>
                        <Progress value={metrics.successRate * 100} className="mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metrics.averageCommandProcessingTime.toFixed(0)}ms
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Command processing time
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Commands</CardTitle>
                        <Mic className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalCommands}</div>
                        <p className="text-xs text-muted-foreground">
                            Voice commands processed
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Insights and Issues */}
            {(insights.performanceIssues.length > 0 || insights.recommendations.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {insights.performanceIssues.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                                    Performance Issues
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {insights.performanceIssues.map((issue, index) => (
                                        <Badge key={index} variant="destructive" className="mr-2 mb-2">
                                            {issue}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {insights.recommendations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                    Recommendations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {insights.recommendations.map((recommendation, index) => (
                                        <div key={index} className="text-sm p-2 bg-green-50 rounded border-l-4 border-green-400">
                                            {recommendation}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Detailed Analytics Tabs */}
            <Tabs defaultValue="usage" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="languages">Languages</TabsTrigger>
                    <TabsTrigger value="devices">Devices</TabsTrigger>
                    <TabsTrigger value="errors">Errors</TabsTrigger>
                </TabsList>

                <TabsContent value="usage" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Most Used Commands */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Most Used Commands</CardTitle>
                                <CardDescription>Top voice commands by frequency</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={metrics.mostUsedCommands.slice(0, 8)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="command"
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Command Success Rates */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Command Success Rates</CardTitle>
                                <CardDescription>Success rate by command type</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {metrics.mostUsedCommands.slice(0, 6).map((command, index) => (
                                        <div key={index} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="truncate">{command.command}</span>
                                                <span>{(command.successRate * 100).toFixed(1)}%</span>
                                            </div>
                                            <Progress value={command.successRate * 100} />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Performance Metrics */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance Overview</CardTitle>
                                <CardDescription>System performance metrics</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Average Latency</span>
                                        <Badge variant="outline">
                                            {performanceData?.averageResponseTime?.toFixed(0) || 0}ms
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Cache Hit Rate</span>
                                        <Badge variant="outline">
                                            {(metrics.performanceMetrics.cacheHitRate * 100).toFixed(1)}%
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Memory Usage</span>
                                        <Badge variant="outline">
                                            {(performanceData?.memoryUsage / 1024 / 1024).toFixed(1) || 0}MB
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Session Duration</span>
                                        <Badge variant="outline">
                                            {(metrics.averageSessionDuration / 1000).toFixed(1)}s
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Resource Load Times */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Resource Load Times</CardTitle>
                                <CardDescription>Slowest loading resources</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {performanceData?.resourceLoadTimes?.slice(0, 6).map((resource: any, index: number) => (
                                        <div key={index} className="flex justify-between items-center text-sm">
                                            <span className="truncate flex-1 mr-2">
                                                {resource.name.split('/').pop() || resource.name}
                                            </span>
                                            <Badge variant="outline">
                                                {resource.duration.toFixed(0)}ms
                                            </Badge>
                                        </div>
                                    )) || <p className="text-muted-foreground">No resource data available</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="languages" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Language Distribution</CardTitle>
                            <CardDescription>Voice navigation usage by language</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={metrics.languageDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ language, percentage }) => `${language} (${percentage.toFixed(1)}%)`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="count"
                                        >
                                            {metrics.languageDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>

                                <div className="space-y-3">
                                    {metrics.languageDistribution.map((lang, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                <Globe className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">{lang.language}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium">{lang.count}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {lang.percentage.toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="devices" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Device Distribution</CardTitle>
                            <CardDescription>Voice navigation usage by device type</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {metrics.deviceDistribution.map((device, index) => {
                                    const Icon = device.device === 'mobile' ? Smartphone :
                                        device.device === 'tablet' ? Tablet : Monitor;

                                    return (
                                        <Card key={index}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="h-5 w-5 text-muted-foreground" />
                                                        <span className="capitalize">{device.device}</span>
                                                    </div>
                                                    <Badge variant="outline">{device.percentage.toFixed(1)}%</Badge>
                                                </div>
                                                <div className="mt-2">
                                                    <Progress value={device.percentage} />
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {device.count} sessions
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="errors" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Error Analysis</CardTitle>
                            <CardDescription>Most common errors and their frequency</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {metrics.errorDistribution.length > 0 ? (
                                <div className="space-y-3">
                                    {metrics.errorDistribution.map((error, index) => (
                                        <div key={index} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                                    {error.error}
                                                </span>
                                                <span>{error.percentage.toFixed(1)}% ({error.count})</span>
                                            </div>
                                            <Progress value={error.percentage} className="h-2" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                    <p>No errors recorded</p>
                                    <p className="text-sm">Voice navigation is working smoothly!</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Data Management */}
            <Card>
                <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>Manage analytics data and settings</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleClearData}
                        >
                            Clear All Data
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.reload()}
                        >
                            Reset Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}