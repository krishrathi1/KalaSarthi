/**
 * Gupshup Notification System Metrics API
 * Provides performance metrics and monitoring data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMonitoringService } from '@/lib/services/notifications/MonitoringService';
import { getDeliveryTracker } from '@/lib/services/notifications/DeliveryTracker';
import { getAnalyticsService } from '@/lib/services/notifications/AnalyticsService';
import { getRateLimitManager } from '@/lib/services/notifications/RateLimitManager';
import { handleGupshupError } from '@/lib/services/notifications/GupshupErrorHandler';
import { getGupshupLogger } from '@/lib/services/notifications/GupshupLogger';

export async function GET(request: NextRequest): Promise<NextResponse> {
    const logger = getGupshupLogger();
    const startTime = Date.now();

    try {
        const { searchParams } = new URL(request.url);
        const timeRange = searchParams.get('timeRange') || '1h'; // Default to 1 hour
        const includeHistory = searchParams.get('includeHistory') === 'true';
        const format = searchParams.get('format') || 'json'; // json or prometheus

        logger.info('metrics_request', 'Metrics requested', {
            timeRange,
            includeHistory,
            format,
            userAgent: request.headers.get('user-agent')
        });

        // Parse time range
        const timeRangeMs = parseTimeRange(timeRange);
        const dateRange = {
            start: new Date(Date.now() - timeRangeMs),
            end: new Date()
        };

        // Initialize services
        const deliveryTracker = getDeliveryTracker();
        const analyticsService = getAnalyticsService(deliveryTracker);
        const rateLimitManager = getRateLimitManager();
        const monitoringService = getMonitoringService(deliveryTracker, analyticsService, rateLimitManager);

        // Get comprehensive analytics report
        const analyticsReport = await analyticsService.generateAnalyticsReport(dateRange);
        
        // Get current health status
        const healthStatus = await monitoringService.getHealthStatus();
        
        // Get monitoring metrics
        const metricsSummary = monitoringService.getMetricsSummary();
        
        // Get active alerts
        const activeAlerts = monitoringService.getActiveAlerts();
        
        // Get health history if requested
        const healthHistory = includeHistory 
            ? monitoringService.getHealthHistory(timeRangeMs / (1000 * 60 * 60))
            : [];

        const responseTime = Date.now() - startTime;

        if (format === 'prometheus') {
            // Return Prometheus format metrics
            const prometheusMetrics = generatePrometheusMetrics(
                analyticsReport,
                healthStatus,
                metricsSummary,
                activeAlerts
            );

            logger.info('metrics_completed_prometheus', 'Metrics generated in Prometheus format', {
                timeRange,
                responseTime,
                metricsCount: prometheusMetrics.split('\n').length
            });

            return new NextResponse(prometheusMetrics, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });
        }

        // Return JSON format metrics
        const response = {
            timestamp: new Date().toISOString(),
            timeRange: {
                duration: timeRange,
                start: dateRange.start.toISOString(),
                end: dateRange.end.toISOString()
            },
            responseTime,
            
            // Summary metrics
            summary: {
                totalMessages: analyticsReport.summary.totalMessages,
                successfulDeliveries: analyticsReport.summary.successfulDeliveries,
                failedDeliveries: analyticsReport.summary.failedDeliveries,
                pendingDeliveries: analyticsReport.summary.pendingDeliveries,
                overallSuccessRate: analyticsReport.summary.overallSuccessRate,
                totalCost: analyticsReport.summary.totalCost,
                averageDeliveryTime: analyticsReport.summary.averageDeliveryTime,
                activeUsers: analyticsReport.summary.activeUsers
            },
            
            // Delivery metrics
            delivery: {
                channels: analyticsReport.deliveryMetrics.channelBreakdown,
                hourlyDistribution: analyticsReport.deliveryMetrics.hourlyDistribution,
                errorAnalysis: {
                    topErrors: analyticsReport.deliveryMetrics.errorAnalysis.topErrors.slice(0, 5),
                    totalErrors: analyticsReport.deliveryMetrics.errorAnalysis.topErrors.length,
                    errorsByChannel: analyticsReport.deliveryMetrics.errorAnalysis.errorsByChannel
                },
                retryAnalysis: analyticsReport.deliveryMetrics.retryAnalysis
            },
            
            // Performance metrics
            performance: {
                deliveryTimes: analyticsReport.performanceMetrics.deliveryTimes,
                throughput: analyticsReport.performanceMetrics.throughput,
                reliability: analyticsReport.performanceMetrics.reliability,
                apiPerformance: analyticsReport.performanceMetrics.apiPerformance
            },
            
            // Cost metrics
            cost: {
                totalCost: analyticsReport.costAnalytics.totalCost,
                costByChannel: analyticsReport.costAnalytics.costByChannel,
                averageCostPerMessage: analyticsReport.costAnalytics.averageCostPerMessage,
                projectedMonthlyCost: analyticsReport.costAnalytics.projectedMonthlyCost,
                budgetUtilization: analyticsReport.costAnalytics.budgetUtilization,
                costOptimizationPotential: analyticsReport.costAnalytics.costOptimizationPotential
            },
            
            // System health metrics
            health: {
                overall: healthStatus.overall,
                services: Object.entries(healthStatus.services).reduce((acc, [name, service]) => {
                    acc[name] = {
                        status: service.status,
                        responseTime: service.responseTime,
                        lastCheck: service.lastCheck
                    };
                    return acc;
                }, {} as Record<string, any>),
                systemMetrics: {
                    memoryUsage: healthStatus.metrics.memoryUsage,
                    queueDepth: healthStatus.metrics.queueDepth,
                    errorRate: healthStatus.metrics.errorRate,
                    throughput: healthStatus.metrics.throughput
                }
            },
            
            // Alert metrics
            alerts: {
                active: activeAlerts.length,
                bySeverity: {
                    critical: activeAlerts.filter(a => a.severity === 'critical').length,
                    high: activeAlerts.filter(a => a.severity === 'high').length,
                    medium: activeAlerts.filter(a => a.severity === 'medium').length,
                    low: activeAlerts.filter(a => a.severity === 'low').length
                },
                unacknowledged: activeAlerts.filter(a => !a.acknowledged).length,
                recentAlerts: activeAlerts
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .slice(0, 10)
                    .map(alert => ({
                        id: alert.id,
                        ruleName: alert.ruleName,
                        severity: alert.severity,
                        message: alert.message,
                        timestamp: alert.timestamp,
                        acknowledged: alert.acknowledged
                    }))
            },
            
            // Trend analysis
            trends: analyticsReport.trendAnalysis,
            
            // Recommendations
            recommendations: analyticsReport.recommendations.slice(0, 5), // Top 5 recommendations
            
            // Health history (if requested)
            ...(includeHistory && {
                healthHistory: healthHistory.map(h => ({
                    timestamp: h.timestamp,
                    overall: h.overall,
                    errorRate: h.metrics.errorRate,
                    throughput: h.metrics.throughput,
                    queueDepth: h.metrics.queueDepth
                }))
            }),
            
            // Monitoring metadata
            monitoring: {
                uptime: metricsSummary.uptime,
                lastHealthCheck: metricsSummary.lastHealthCheck,
                monitoringStatus: metricsSummary.monitoringStatus,
                dataFreshness: Date.now() - metricsSummary.lastHealthCheck.getTime()
            }
        };

        logger.info('metrics_completed', 'Metrics generated successfully', {
            timeRange,
            totalMessages: analyticsReport.summary.totalMessages,
            successRate: analyticsReport.summary.overallSuccessRate,
            totalCost: analyticsReport.summary.totalCost,
            activeAlerts: activeAlerts.length,
            responseTime
        });

        return NextResponse.json(response, {
            status: 200,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        const responseTime = Date.now() - startTime;
        const gupshupError = handleGupshupError(error);
        
        logger.error('metrics_error', 'Failed to generate metrics', {
            error: gupshupError,
            responseTime
        });

        return NextResponse.json({
            error: {
                message: gupshupError.message,
                code: gupshupError.code,
                category: gupshupError.category
            },
            timestamp: new Date().toISOString(),
            responseTime
        }, { 
            status: 500,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });
    }
}

/**
 * Parse time range string to milliseconds
 */
function parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/^(\d+)([smhd])$/);
    if (!match) {
        return 60 * 60 * 1000; // Default to 1 hour
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 60 * 60 * 1000;
    }
}

/**
 * Generate Prometheus format metrics
 */
function generatePrometheusMetrics(
    analyticsReport: any,
    healthStatus: any,
    metricsSummary: any,
    activeAlerts: any[]
): string {
    const metrics: string[] = [];
    const timestamp = Date.now();

    // Add metric with help and type
    const addMetric = (name: string, help: string, type: string, value: number, labels?: Record<string, string>) => {
        metrics.push(`# HELP ${name} ${help}`);
        metrics.push(`# TYPE ${name} ${type}`);
        
        const labelStr = labels 
            ? '{' + Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
            : '';
        
        metrics.push(`${name}${labelStr} ${value} ${timestamp}`);
        metrics.push('');
    };

    // Message metrics
    addMetric(
        'gupshup_messages_total',
        'Total number of messages sent',
        'counter',
        analyticsReport.summary.totalMessages
    );

    addMetric(
        'gupshup_messages_successful_total',
        'Total number of successful message deliveries',
        'counter',
        analyticsReport.summary.successfulDeliveries
    );

    addMetric(
        'gupshup_messages_failed_total',
        'Total number of failed message deliveries',
        'counter',
        analyticsReport.summary.failedDeliveries
    );

    addMetric(
        'gupshup_delivery_success_rate',
        'Message delivery success rate (0-1)',
        'gauge',
        analyticsReport.summary.overallSuccessRate / 100
    );

    // Channel-specific metrics
    Object.entries(analyticsReport.deliveryMetrics.channelBreakdown).forEach(([channel, metrics]: [string, any]) => {
        addMetric(
            'gupshup_channel_messages_total',
            'Total messages by channel',
            'counter',
            metrics.total,
            { channel }
        );

        addMetric(
            'gupshup_channel_success_rate',
            'Success rate by channel (0-1)',
            'gauge',
            metrics.successRate / 100,
            { channel }
        );

        addMetric(
            'gupshup_channel_cost_total',
            'Total cost by channel in USD',
            'counter',
            metrics.cost,
            { channel }
        );
    });

    // Performance metrics
    addMetric(
        'gupshup_delivery_time_seconds',
        'Average message delivery time in seconds',
        'gauge',
        analyticsReport.summary.averageDeliveryTime / 1000
    );

    addMetric(
        'gupshup_throughput_messages_per_second',
        'Message throughput in messages per second',
        'gauge',
        analyticsReport.performanceMetrics.throughput.messagesPerSecond
    );

    addMetric(
        'gupshup_api_response_time_seconds',
        'Average API response time in seconds',
        'gauge',
        analyticsReport.performanceMetrics.apiPerformance.averageResponseTime / 1000
    );

    // Cost metrics
    addMetric(
        'gupshup_cost_total_usd',
        'Total cost in USD',
        'counter',
        analyticsReport.costAnalytics.totalCost
    );

    addMetric(
        'gupshup_cost_projected_monthly_usd',
        'Projected monthly cost in USD',
        'gauge',
        analyticsReport.costAnalytics.projectedMonthlyCost
    );

    addMetric(
        'gupshup_budget_utilization_ratio',
        'Budget utilization ratio (0-1)',
        'gauge',
        analyticsReport.costAnalytics.budgetUtilization / 100
    );

    // Health metrics
    Object.entries(healthStatus.services).forEach(([service, health]: [string, any]) => {
        const statusValue = health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0;
        addMetric(
            'gupshup_service_health',
            'Service health status (1=healthy, 0.5=degraded, 0=unhealthy)',
            'gauge',
            statusValue,
            { service }
        );

        addMetric(
            'gupshup_service_response_time_seconds',
            'Service health check response time in seconds',
            'gauge',
            health.responseTime / 1000,
            { service }
        );
    });

    // System metrics
    addMetric(
        'gupshup_queue_depth',
        'Current message queue depth',
        'gauge',
        healthStatus.metrics.queueDepth
    );

    addMetric(
        'gupshup_error_rate',
        'Current error rate (0-1)',
        'gauge',
        healthStatus.metrics.errorRate / 100
    );

    addMetric(
        'gupshup_memory_usage_bytes',
        'Memory usage in bytes',
        'gauge',
        healthStatus.metrics.memoryUsage.heapUsed
    );

    // Alert metrics
    addMetric(
        'gupshup_alerts_active_total',
        'Total number of active alerts',
        'gauge',
        activeAlerts.length
    );

    ['critical', 'high', 'medium', 'low'].forEach(severity => {
        const count = activeAlerts.filter(a => a.severity === severity).length;
        addMetric(
            'gupshup_alerts_by_severity',
            'Number of alerts by severity',
            'gauge',
            count,
            { severity }
        );
    });

    // Uptime metrics
    addMetric(
        'gupshup_uptime_seconds',
        'System uptime in seconds',
        'counter',
        metricsSummary.uptime / 1000
    );

    return metrics.join('\n');
}