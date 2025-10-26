'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    Database,
    Gauge,
    RefreshCw,
    Server,
    TrendingUp,
    Zap,
    AlertCircle,
    XCircle
} from 'lucide-react';

interface SystemHealth {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Array<{
        service: string;
        status: 'healthy' | 'degraded' | 'unhealthy';
        latency?: number;
        details?: Record<string, any>;
        error?: string;
        lastChecked: string;
    }>;
    summary: {
        healthy: number;
        degraded: number;
        unhealthy: number;
        total: number;
    };
    uptime: number;
    version: string;
    environment: string;
}

interface PerformanceStats {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowRequestRate: number;
    operations: Record<string, {
        averageDuration: number;
        p95: number;
        totalOperations: number;
        errorRate: number;
    }>;
}

export function MonitoringDashboard() {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [performance, setPerformance] = useState<PerformanceStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchData();

        if (autoRefresh) {
            const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const fetchData = async () => {
        try {
            setLoading(true);

            const [healthResponse, performanceResponse] = await Promise.all([
                fetch('/api/health'),
                fetch('/api/monitoring/performance')
            ]);

            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                setHealth(healthData);
            }

            if (performanceResponse.ok) {
                const performanceData = await performanceResponse.json();
                setPerformance(performanceData);
            }

            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch monitoring data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'degraded':
                return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            case 'unhealthy':
                return <XCircle className="h-5 w-5 text-red-600" />;
            default:
                return <AlertCircle className="h-5 w-5 text-gray-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'degraded':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'unhealthy':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatUptime = (uptimeMs: number) => {
        const seconds = Math.floor(uptimeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    };

    const formatPercentage = (value: number) => {
        return `${Math.round(value * 100)}%`;
    };

    if (loading && !health) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading monitoring data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">System Monitoring</h1>
                    <p className="text-gray-600">
                        Enhanced Artisan Buddy System Health & Performance
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        variant={autoRefresh ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        <Activity className="h-4 w-4 mr-2" />
                        Auto Refresh
                    </Button>
                </div>
            </div>

            {/* System Overview */}
            {health && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
                            {getStatusIcon(health.overall)}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                <Badge className={getStatusColor(health.overall)}>
                                    {health.overall.toUpperCase()}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {health.summary.healthy}/{health.summary.total} services healthy
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatUptime(health.uptime)}</div>
                            <p className="text-xs text-muted-foreground">
                                Since last restart
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Environment</CardTitle>
                            <Server className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{health.environment}</div>
                            <p className="text-xs text-muted-foreground">
                                Version {health.version}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Auto-refresh: {autoRefresh ? 'On' : 'Off'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Detailed Monitoring */}
            <Tabs defaultValue="services" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="alerts">Alerts</TabsTrigger>
                </TabsList>

                {/* Services Tab */}
                <TabsContent value="services" className="space-y-4">
                    {health && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {health.services.map((service) => (
                                <Card key={service.service}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium capitalize">
                                            {service.service.replace('-', ' ')}
                                        </CardTitle>
                                        {getStatusIcon(service.status)}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <Badge className={getStatusColor(service.status)}>
                                                {service.status.toUpperCase()}
                                            </Badge>

                                            {service.latency && (
                                                <div className="text-sm text-gray-600">
                                                    Latency: {service.latency}ms
                                                </div>
                                            )}

                                            {service.error && (
                                                <div className="text-sm text-red-600">
                                                    Error: {service.error}
                                                </div>
                                            )}

                                            {service.details && (
                                                <div className="text-xs text-gray-500 space-y-1">
                                                    {Object.entries(service.details).map(([key, value]) => (
                                                        <div key={key}>
                                                            <strong>{key}:</strong> {JSON.stringify(value)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="text-xs text-gray-400">
                                                Last checked: {new Date(service.lastChecked).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance" className="space-y-4">
                    {performance && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{performance.totalRequests.toLocaleString()}</div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                                        <Gauge className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{Math.round(performance.averageResponseTime)}ms</div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{formatPercentage(performance.errorRate)}</div>
                                        <Progress
                                            value={performance.errorRate * 100}
                                            className="mt-2"
                                            // @ts-ignore
                                            indicatorClassName={performance.errorRate > 0.05 ? 'bg-red-500' : 'bg-green-500'}
                                        />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Slow Requests</CardTitle>
                                        <Zap className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{formatPercentage(performance.slowRequestRate)}</div>
                                        <Progress
                                            value={performance.slowRequestRate * 100}
                                            className="mt-2"
                                            // @ts-ignore
                                            indicatorClassName={performance.slowRequestRate > 0.2 ? 'bg-yellow-500' : 'bg-green-500'}
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Operations Performance */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Operations Performance</CardTitle>
                                    <CardDescription>
                                        Performance metrics for different operations
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {Object.entries(performance.operations).map(([operation, stats]) => (
                                            <div key={operation} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <div className="font-medium">{operation}</div>
                                                    <div className="text-sm text-gray-600">
                                                        {stats.totalOperations} operations
                                                    </div>
                                                </div>
                                                <div className="text-right space-y-1">
                                                    <div className="text-sm">
                                                        Avg: {Math.round(stats.averageDuration)}ms
                                                    </div>
                                                    <div className="text-sm">
                                                        P95: {Math.round(stats.p95)}ms
                                                    </div>
                                                    <div className="text-sm">
                                                        Error Rate: {formatPercentage(stats.errorRate)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* Alerts Tab */}
                <TabsContent value="alerts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Alerts</CardTitle>
                            <CardDescription>
                                Current system alerts and thresholds
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-gray-500">
                                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                <p>No active alerts</p>
                                <p className="text-sm">All systems operating normally</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}