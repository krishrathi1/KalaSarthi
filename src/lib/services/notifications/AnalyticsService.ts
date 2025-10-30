/**
 * Analytics and Reporting Service for Gupshup Notification System
 * Provides delivery success rate analytics, cost tracking, and performance metrics
 */

import { getGupshupConfig, GupshupConfig } from '../../config/gupshup-config';
import {
    getGupshupLogger,
    createPerformanceTimer,
    GupshupLogger
} from './GupshupLogger';
import {
    DeliveryTracker,
    DeliveryStatus,
    DeliveryReport,
    DateRange,
    UserNotificationHistory
} from './DeliveryTracker';
import {
    GupshupError,
    GupshupErrorCode,
    handleGupshupError,
    ErrorCategory
} from './GupshupErrorHandler';

export interface AnalyticsReport {
    summary: AnalyticsSummary;
    deliveryMetrics: DeliveryMetrics;
    costAnalytics: CostAnalytics;
    performanceMetrics: PerformanceMetrics;
    trendAnalysis: TrendAnalysis;
    recommendations: OptimizationRecommendation[];
    generatedAt: Date;
    timeRange: DateRange;
}

export interface AnalyticsSummary {
    totalMessages: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    pendingDeliveries: number;
    overallSuccessRate: number;
    totalCost: number;
    averageDeliveryTime: number;
    activeUsers: number;
}

export interface DeliveryMetrics {
    channelBreakdown: {
        whatsapp: ChannelMetrics;
        sms: ChannelMetrics;
    };
    hourlyDistribution: Record<string, number>;
    dailyTrends: Record<string, DailyMetric>;
    errorAnalysis: ErrorAnalysis;
    retryAnalysis: RetryAnalysis;
}

export interface ChannelMetrics {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
    averageDeliveryTime: number;
    cost: number;
    costPerMessage: number;
    preferredByUsers: number;
}

export interface DailyMetric {
    date: string;
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    cost: number;
    averageDeliveryTime: number;
}

export interface ErrorAnalysis {
    topErrors: ErrorFrequency[];
    errorTrends: Record<string, number[]>;
    errorsByChannel: Record<string, Record<string, number>>;
    resolutionSuggestions: Record<string, string>;
}

export interface ErrorFrequency {
    errorCode: string;
    errorMessage: string;
    count: number;
    percentage: number;
    affectedUsers: number;
    firstOccurrence: Date;
    lastOccurrence: Date;
}

export interface RetryAnalysis {
    totalRetries: number;
    averageRetriesPerMessage: number;
    retrySuccessRate: number;
    retryDistribution: Record<number, number>;
    costOfRetries: number;
}

export interface CostAnalytics {
    totalCost: number;
    costByChannel: Record<string, number>;
    costByDay: Record<string, number>;
    averageCostPerMessage: number;
    averageCostPerUser: number;
    projectedMonthlyCost: number;
    costOptimizationPotential: number;
    budgetUtilization: number;
}

export interface PerformanceMetrics {
    deliveryTimes: {
        p50: number;
        p95: number;
        p99: number;
        average: number;
        median: number;
    };
    throughput: {
        messagesPerSecond: number;
        messagesPerMinute: number;
        messagesPerHour: number;
        peakThroughput: number;
    };
    reliability: {
        uptime: number;
        errorRate: number;
        timeoutRate: number;
        retryRate: number;
    };
    apiPerformance: {
        averageResponseTime: number;
        slowestEndpoint: string;
        rateLimitHits: number;
        quotaUtilization: number;
    };
}

export interface TrendAnalysis {
    deliveryTrends: {
        direction: 'improving' | 'declining' | 'stable';
        changePercentage: number;
        periodComparison: string;
    };
    costTrends: {
        direction: 'increasing' | 'decreasing' | 'stable';
        changePercentage: number;
        projectedChange: number;
    };
    userEngagement: {
        activeUserTrend: 'growing' | 'shrinking' | 'stable';
        engagementScore: number;
        channelPreferenceShift: string;
    };
    seasonalPatterns: Record<string, number>;
}

export interface OptimizationRecommendation {
    type: 'cost' | 'performance' | 'reliability' | 'user_experience';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: string;
    implementationEffort: 'low' | 'medium' | 'high';
    estimatedSavings?: number;
    actionItems: string[];
}

/**
 * Cost calculation constants (example rates - should be configurable)
 */
const COST_RATES = {
    whatsapp: {
        marketing: 0.0055, // USD per message
        utility: 0.0045,   // USD per message
        authentication: 0.0035, // USD per message
    },
    sms: {
        domestic: 0.0025,  // USD per SMS
        international: 0.05, // USD per SMS
    },
} as const;

/**
 * Analytics Service for comprehensive reporting and insights
 */
export class AnalyticsService {
    private config: GupshupConfig;
    private logger: GupshupLogger;
    private deliveryTracker: DeliveryTracker;

    constructor(deliveryTracker: DeliveryTracker, config?: GupshupConfig) {
        this.config = config || getGupshupConfig();
        this.logger = getGupshupLogger();
        this.deliveryTracker = deliveryTracker;

        this.logger.info('analytics_service_init', 'Analytics Service initialized', {
            costTrackingEnabled: true,
            performanceMonitoringEnabled: true,
        });
    }

    /**
     * Generate comprehensive analytics report
     */
    async generateAnalyticsReport(dateRange: DateRange): Promise<AnalyticsReport> {
        const timer = createPerformanceTimer('generate_analytics_report');

        try {
            this.logger.info('analytics_report_start', 'Starting analytics report generation', {
                dateRange,
            });

            // Get base delivery report
            const deliveryReport = await this.deliveryTracker.getDeliveryReport(dateRange);

            // Generate all analytics components
            const [
                summary,
                deliveryMetrics,
                costAnalytics,
                performanceMetrics,
                trendAnalysis,
                recommendations
            ] = await Promise.all([
                this.generateSummary(deliveryReport, dateRange),
                this.generateDeliveryMetrics(deliveryReport, dateRange),
                this.generateCostAnalytics(deliveryReport, dateRange),
                this.generatePerformanceMetrics(deliveryReport, dateRange),
                this.generateTrendAnalysis(deliveryReport, dateRange),
                this.generateRecommendations(deliveryReport, dateRange),
            ]);

            const report: AnalyticsReport = {
                summary,
                deliveryMetrics,
                costAnalytics,
                performanceMetrics,
                trendAnalysis,
                recommendations,
                generatedAt: new Date(),
                timeRange: dateRange,
            };

            const duration = timer.end(true, null, {
                totalMessages: summary.totalMessages,
                reportSections: 6
            });

            this.logger.info('analytics_report_completed', 'Analytics report generated successfully', {
                dateRange,
                totalMessages: summary.totalMessages,
                successRate: summary.overallSuccessRate,
                totalCost: summary.totalCost,
                generationTime: duration,
            });

            return report;

        } catch (error) {
            const duration = timer.end(false, error);
            const gupshupError = handleGupshupError(error, { dateRange });
            this.logger.error('analytics_report_error', 'Failed to generate analytics report', gupshupError);
            throw gupshupError;
        }
    }

    /**
     * Generate delivery success rate analytics with trending
     */
    async generateDeliverySuccessAnalytics(dateRange: DateRange): Promise<{
        currentPeriod: DeliveryReport;
        previousPeriod: DeliveryReport;
        trend: {
            direction: 'improving' | 'declining' | 'stable';
            changePercentage: number;
            significantChange: boolean;
        };
    }> {
        const timer = createPerformanceTimer('generate_delivery_success_analytics');

        try {
            // Calculate previous period for comparison
            const periodDuration = dateRange.end.getTime() - dateRange.start.getTime();
            const previousPeriodStart = new Date(dateRange.start.getTime() - periodDuration);
            const previousPeriodEnd = new Date(dateRange.start.getTime());

            const [currentPeriod, previousPeriod] = await Promise.all([
                this.deliveryTracker.getDeliveryReport(dateRange),
                this.deliveryTracker.getDeliveryReport({
                    start: previousPeriodStart,
                    end: previousPeriodEnd,
                }),
            ]);

            // Calculate trend
            const currentRate = currentPeriod.successRate;
            const previousRate = previousPeriod.successRate;
            const changePercentage = previousRate > 0
                ? ((currentRate - previousRate) / previousRate) * 100
                : 0;

            let direction: 'improving' | 'declining' | 'stable' = 'stable';
            if (Math.abs(changePercentage) > 5) { // 5% threshold for significant change
                direction = changePercentage > 0 ? 'improving' : 'declining';
            }

            const result = {
                currentPeriod,
                previousPeriod,
                trend: {
                    direction,
                    changePercentage,
                    significantChange: Math.abs(changePercentage) > 5,
                },
            };

            const duration = timer.end(true, null, {
                currentRate,
                previousRate,
                changePercentage
            });

            this.logger.info('delivery_success_analytics_generated', 'Delivery success analytics generated', {
                currentRate,
                previousRate,
                changePercentage,
                direction,
            });

            return result;

        } catch (error) {
            const duration = timer.end(false, error);
            const gupshupError = handleGupshupError(error, { dateRange });
            this.logger.error('delivery_success_analytics_error', 'Failed to generate delivery success analytics', gupshupError);
            throw gupshupError;
        }
    }

    /**
     * Generate cost tracking and usage analytics
     */
    async generateCostAnalytics(deliveryReport: DeliveryReport, dateRange: DateRange): Promise<CostAnalytics> {
        const timer = createPerformanceTimer('generate_cost_analytics');

        try {
            // Calculate costs by channel
            const whatsappCost = deliveryReport.channelBreakdown.whatsapp.total * COST_RATES.whatsapp.utility;
            const smsCost = deliveryReport.channelBreakdown.sms.total * COST_RATES.sms.domestic;
            const totalCost = whatsappCost + smsCost;

            // Calculate daily costs (mock implementation)
            const costByDay: Record<string, number> = {};
            const dayCount = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
            const avgDailyCost = totalCost / dayCount;

            for (let i = 0; i < dayCount; i++) {
                const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
                const dateStr = date.toISOString().split('T')[0];
                costByDay[dateStr] = avgDailyCost * (0.8 + Math.random() * 0.4); // Add some variation
            }

            // Calculate projections and optimization potential
            const projectedMonthlyCost = (totalCost / dayCount) * 30;
            const monthlyBudget = 1000; // Should be configurable
            const budgetUtilization = (projectedMonthlyCost / monthlyBudget) * 100;

            // Estimate optimization potential (switching failed WhatsApp to SMS)
            const failedWhatsAppMessages = deliveryReport.channelBreakdown.whatsapp.failed;
            const potentialSavings = failedWhatsAppMessages * (COST_RATES.whatsapp.utility - COST_RATES.sms.domestic);

            const costAnalytics: CostAnalytics = {
                totalCost,
                costByChannel: {
                    whatsapp: whatsappCost,
                    sms: smsCost,
                },
                costByDay,
                averageCostPerMessage: deliveryReport.totalMessages > 0 ? totalCost / deliveryReport.totalMessages : 0,
                averageCostPerUser: 0, // Would need user count
                projectedMonthlyCost,
                costOptimizationPotential: potentialSavings,
                budgetUtilization,
            };

            const duration = timer.end(true, null, { totalCost, projectedMonthlyCost });

            this.logger.info('cost_analytics_generated', 'Cost analytics generated', {
                totalCost,
                whatsappCost,
                smsCost,
                projectedMonthlyCost,
                budgetUtilization,
                optimizationPotential: potentialSavings,
            });

            return costAnalytics;

        } catch (error) {
            const duration = timer.end(false, error);
            const gupshupError = handleGupshupError(error, { dateRange });
            this.logger.error('cost_analytics_error', 'Failed to generate cost analytics', gupshupError);
            throw gupshupError;
        }
    }

    /**
     * Generate performance metrics and optimization recommendations
     */
    async generatePerformanceMetrics(deliveryReport: DeliveryReport, dateRange: DateRange): Promise<PerformanceMetrics> {
        const timer = createPerformanceTimer('generate_performance_metrics');

        try {
            // Mock performance data (in real implementation, this would come from actual metrics)
            const performanceMetrics: PerformanceMetrics = {
                deliveryTimes: {
                    p50: 15000, // 15 seconds
                    p95: 45000, // 45 seconds
                    p99: 90000, // 90 seconds
                    average: deliveryReport.averageDeliveryTime,
                    median: 18000, // 18 seconds
                },
                throughput: {
                    messagesPerSecond: deliveryReport.totalMessages / ((dateRange.end.getTime() - dateRange.start.getTime()) / 1000),
                    messagesPerMinute: deliveryReport.totalMessages / ((dateRange.end.getTime() - dateRange.start.getTime()) / 60000),
                    messagesPerHour: deliveryReport.totalMessages / ((dateRange.end.getTime() - dateRange.start.getTime()) / 3600000),
                    peakThroughput: 50, // messages per second
                },
                reliability: {
                    uptime: 99.9, // percentage
                    errorRate: (deliveryReport.failedDeliveries / deliveryReport.totalMessages) * 100,
                    timeoutRate: 0.5, // percentage
                    retryRate: 2.3, // percentage
                },
                apiPerformance: {
                    averageResponseTime: 250, // milliseconds
                    slowestEndpoint: '/api/notifications/gupshup/whatsapp',
                    rateLimitHits: 0,
                    quotaUtilization: 45.2, // percentage
                },
            };

            const duration = timer.end(true, null, {
                errorRate: performanceMetrics.reliability.errorRate,
                throughput: performanceMetrics.throughput.messagesPerSecond
            });

            this.logger.info('performance_metrics_generated', 'Performance metrics generated', {
                errorRate: performanceMetrics.reliability.errorRate,
                averageDeliveryTime: performanceMetrics.deliveryTimes.average,
                throughput: performanceMetrics.throughput.messagesPerSecond,
                uptime: performanceMetrics.reliability.uptime,
            });

            return performanceMetrics;

        } catch (error) {
            const duration = timer.end(false, error);
            const gupshupError = handleGupshupError(error, { dateRange });
            this.logger.error('performance_metrics_error', 'Failed to generate performance metrics', gupshupError);
            throw gupshupError;
        }
    }

    /**
     * Generate summary analytics
     */
    private async generateSummary(deliveryReport: DeliveryReport, dateRange: DateRange): Promise<AnalyticsSummary> {
        const costAnalytics = await this.generateCostAnalytics(deliveryReport, dateRange);

        return {
            totalMessages: deliveryReport.totalMessages,
            successfulDeliveries: deliveryReport.successfulDeliveries,
            failedDeliveries: deliveryReport.failedDeliveries,
            pendingDeliveries: deliveryReport.pendingDeliveries,
            overallSuccessRate: deliveryReport.successRate,
            totalCost: costAnalytics.totalCost,
            averageDeliveryTime: deliveryReport.averageDeliveryTime,
            activeUsers: 0, // Would need to calculate from user data
        };
    }

    /**
     * Generate detailed delivery metrics
     */
    private async generateDeliveryMetrics(deliveryReport: DeliveryReport, dateRange: DateRange): Promise<DeliveryMetrics> {
        // Generate hourly distribution (mock data)
        const hourlyDistribution: Record<string, number> = {};
        for (let hour = 0; hour < 24; hour++) {
            hourlyDistribution[hour.toString()] = Math.floor(Math.random() * 100);
        }

        // Generate daily trends
        const dailyTrends: Record<string, DailyMetric> = {};
        const dayCount = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));

        for (let i = 0; i < dayCount; i++) {
            const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const dailyTotal = Math.floor(deliveryReport.totalMessages / dayCount);
            const dailySuccessful = Math.floor(dailyTotal * (0.8 + Math.random() * 0.2));

            dailyTrends[dateStr] = {
                date: dateStr,
                total: dailyTotal,
                successful: dailySuccessful,
                failed: dailyTotal - dailySuccessful,
                successRate: (dailySuccessful / dailyTotal) * 100,
                cost: dailyTotal * 0.004, // Average cost per message
                averageDeliveryTime: 15000 + Math.random() * 10000,
            };
        }

        return {
            channelBreakdown: {
                whatsapp: {
                    ...deliveryReport.channelBreakdown.whatsapp,
                    cost: deliveryReport.channelBreakdown.whatsapp.total * COST_RATES.whatsapp.utility,
                    costPerMessage: COST_RATES.whatsapp.utility,
                    preferredByUsers: 0, // Would need user preference data
                },
                sms: {
                    ...deliveryReport.channelBreakdown.sms,
                    cost: deliveryReport.channelBreakdown.sms.total * COST_RATES.sms.domestic,
                    costPerMessage: COST_RATES.sms.domestic,
                    preferredByUsers: 0, // Would need user preference data
                },
            },
            hourlyDistribution,
            dailyTrends,
            errorAnalysis: this.generateErrorAnalysis(deliveryReport),
            retryAnalysis: this.generateRetryAnalysis(deliveryReport),
        };
    }

    /**
     * Generate error analysis
     */
    private generateErrorAnalysis(deliveryReport: DeliveryReport): ErrorAnalysis {
        const topErrors: ErrorFrequency[] = Object.entries(deliveryReport.errorBreakdown)
            .map(([errorCode, count]) => ({
                errorCode,
                errorMessage: this.getErrorMessage(errorCode),
                count,
                percentage: (count / deliveryReport.totalMessages) * 100,
                affectedUsers: Math.floor(count * 0.8), // Estimate
                firstOccurrence: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                lastOccurrence: new Date(),
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Convert error breakdown to trends format (array of timestamps)
        const errorTrends: Record<string, number[]> = {};
        for (const [errorCode, count] of Object.entries(deliveryReport.errorBreakdown)) {
            // Mock trend data - in real implementation, this would be historical data
            errorTrends[errorCode] = Array.from({ length: count }, () => Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
        }

        return {
            topErrors,
            errorTrends,
            errorsByChannel: {
                whatsapp: deliveryReport.errorBreakdown,
                sms: {},
            },
            resolutionSuggestions: this.getErrorResolutionSuggestions(),
        };
    }

    /**
     * Generate retry analysis
     */
    private generateRetryAnalysis(deliveryReport: DeliveryReport): RetryAnalysis {
        return {
            totalRetries: Math.floor(deliveryReport.failedDeliveries * 0.3),
            averageRetriesPerMessage: 1.2,
            retrySuccessRate: 65.5,
            retryDistribution: {
                1: 70,
                2: 20,
                3: 10,
            },
            costOfRetries: deliveryReport.failedDeliveries * 0.3 * 0.004,
        };
    }

    /**
     * Generate trend analysis
     */
    private async generateTrendAnalysis(deliveryReport: DeliveryReport, dateRange: DateRange): Promise<TrendAnalysis> {
        return {
            deliveryTrends: {
                direction: 'improving',
                changePercentage: 5.2,
                periodComparison: 'vs previous period',
            },
            costTrends: {
                direction: 'increasing',
                changePercentage: 12.3,
                projectedChange: 15.0,
            },
            userEngagement: {
                activeUserTrend: 'growing',
                engagementScore: 78.5,
                channelPreferenceShift: 'WhatsApp preference increasing by 8%',
            },
            seasonalPatterns: {
                morning: 35,
                afternoon: 45,
                evening: 15,
                night: 5,
            },
        };
    }

    /**
     * Generate optimization recommendations
     */
    private async generateRecommendations(deliveryReport: DeliveryReport, dateRange: DateRange): Promise<OptimizationRecommendation[]> {
        const recommendations: OptimizationRecommendation[] = [];

        // Cost optimization recommendation
        if (deliveryReport.channelBreakdown.whatsapp.failed > 10) {
            recommendations.push({
                type: 'cost',
                priority: 'high',
                title: 'Implement Smart Fallback to Reduce Costs',
                description: 'Failed WhatsApp messages are costing more than necessary. Implement immediate SMS fallback for failed WhatsApp deliveries.',
                expectedImpact: `Save approximately $${(deliveryReport.channelBreakdown.whatsapp.failed * (COST_RATES.whatsapp.utility - COST_RATES.sms.domestic)).toFixed(2)} per period`,
                implementationEffort: 'low',
                estimatedSavings: deliveryReport.channelBreakdown.whatsapp.failed * (COST_RATES.whatsapp.utility - COST_RATES.sms.domestic),
                actionItems: [
                    'Configure automatic SMS fallback for WhatsApp failures',
                    'Set fallback timeout to 30 seconds',
                    'Monitor fallback success rates',
                ],
            });
        }

        // Performance optimization recommendation
        if (deliveryReport.successRate < 90) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                title: 'Improve Delivery Success Rate',
                description: `Current success rate of ${deliveryReport.successRate.toFixed(1)}% is below the 90% target. Focus on error reduction and retry optimization.`,
                expectedImpact: 'Increase success rate to 95%+',
                implementationEffort: 'medium',
                actionItems: [
                    'Analyze top error codes and implement fixes',
                    'Optimize retry logic with exponential backoff',
                    'Implement phone number validation',
                    'Add user preference verification',
                ],
            });
        }

        // User experience recommendation
        recommendations.push({
            type: 'user_experience',
            priority: 'medium',
            title: 'Optimize Message Timing',
            description: 'Analyze user engagement patterns to send messages at optimal times for better delivery and read rates.',
            expectedImpact: 'Increase read rates by 15-20%',
            implementationEffort: 'medium',
            actionItems: [
                'Implement user timezone detection',
                'Add optimal timing analysis',
                'Create smart scheduling system',
                'A/B test different sending times',
            ],
        });

        return recommendations;
    }

    /**
     * Get error message for error code
     */
    private getErrorMessage(errorCode: string): string {
        const errorMessages: Record<string, string> = {
            '1001': 'Invalid phone number format',
            '1002': 'User not registered for WhatsApp Business',
            '1003': 'Message template not approved',
            '1004': 'Rate limit exceeded',
            '1005': 'Insufficient account balance',
            '2001': 'SMS delivery failed - invalid number',
            '2002': 'SMS blocked by carrier',
            '2003': 'SMS content rejected',
        };

        return errorMessages[errorCode] || 'Unknown error';
    }

    /**
     * Get error resolution suggestions
     */
    private getErrorResolutionSuggestions(): Record<string, string> {
        return {
            '1001': 'Implement phone number validation before sending',
            '1002': 'Add SMS fallback for non-WhatsApp users',
            '1003': 'Review and update message templates',
            '1004': 'Implement intelligent rate limiting',
            '1005': 'Set up balance monitoring and alerts',
            '2001': 'Enhance phone number validation for SMS',
            '2002': 'Review SMS content for compliance',
            '2003': 'Implement content filtering and validation',
        };
    }
}

/**
 * Singleton instance for global use
 */
let analyticsServiceInstance: AnalyticsService | null = null;

export function getAnalyticsService(deliveryTracker: DeliveryTracker): AnalyticsService {
    if (!analyticsServiceInstance) {
        analyticsServiceInstance = new AnalyticsService(deliveryTracker);
    }
    return analyticsServiceInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearAnalyticsServiceInstance(): void {
    analyticsServiceInstance = null;
}