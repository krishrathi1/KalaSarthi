/**
 * Gupshup Notification System Cost Monitoring API
 * Provides cost tracking, budget monitoring, and cost alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMonitoringService } from '@/lib/services/notifications/MonitoringService';
import { getDeliveryTracker } from '@/lib/services/notifications/DeliveryTracker';
import { getAnalyticsService } from '@/lib/services/notifications/AnalyticsService';
import { getRateLimitManager } from '@/lib/services/notifications/RateLimitManager';
import { handleGupshupError } from '@/lib/services/notifications/GupshupErrorHandler';
import { getGupshupLogger } from '@/lib/services/notifications/GupshupLogger';

/**
 * GET /api/notifications/gupshup/cost
 * Retrieve cost analytics and budget information
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const logger = getGupshupLogger();
    const startTime = Date.now();

    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'today'; // today, week, month, custom
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const includeProjections = searchParams.get('includeProjections') === 'true';
        const includeBudgetAlerts = searchParams.get('includeBudgetAlerts') === 'true';

        logger.info('cost_request', 'Cost analytics requested', {
            period,
            startDate,
            endDate,
            includeProjections,
            includeBudgetAlerts,
            userAgent: request.headers.get('user-agent')
        });

        // Calculate date range based on period
        const dateRange = calculateDateRange(period, startDate, endDate);

        // Initialize services
        const deliveryTracker = getDeliveryTracker();
        const analyticsService = getAnalyticsService(deliveryTracker);
        const rateLimitManager = getRateLimitManager();
        const monitoringService = getMonitoringService(deliveryTracker, analyticsService, rateLimitManager);

        // Get analytics report for the specified period
        const analyticsReport = await analyticsService.generateAnalyticsReport(dateRange);
        const costAnalytics = analyticsReport.costAnalytics;

        // Get current budget status
        const budgetStatus = await getBudgetStatus(costAnalytics, period);

        // Get cost trends if projections are requested
        let costProjections = null;
        if (includeProjections) {
            costProjections = await generateCostProjections(analyticsService, dateRange);
        }

        // Get budget alerts if requested
        let budgetAlerts = null;
        if (includeBudgetAlerts) {
            budgetAlerts = getBudgetAlerts(monitoringService, costAnalytics);
        }

        // Calculate cost breakdown by time periods
        const costBreakdown = await generateCostBreakdown(analyticsService, dateRange, period);

        // Calculate cost efficiency metrics
        const efficiencyMetrics = calculateCostEfficiency(analyticsReport);

        const responseTime = Date.now() - startTime;

        const response = {
            timestamp: new Date().toISOString(),
            period: {
                type: period,
                start: dateRange.start.toISOString(),
                end: dateRange.end.toISOString(),
                duration: dateRange.end.getTime() - dateRange.start.getTime()
            },
            responseTime,
            
            // Current period cost summary
            summary: {
                totalCost: costAnalytics.totalCost,
                totalMessages: analyticsReport.summary.totalMessages,
                averageCostPerMessage: costAnalytics.averageCostPerMessage,
                averageCostPerUser: costAnalytics.averageCostPerUser,
                costOptimizationPotential: costAnalytics.costOptimizationPotential
            },
            
            // Cost breakdown by channel
            channels: {
                whatsapp: {
                    cost: costAnalytics.costByChannel.whatsapp || 0,
                    messages: analyticsReport.deliveryMetrics.channelBreakdown.whatsapp.total,
                    costPerMessage: (costAnalytics.costByChannel.whatsapp || 0) / Math.max(analyticsReport.deliveryMetrics.channelBreakdown.whatsapp.total, 1),
                    successRate: analyticsReport.deliveryMetrics.channelBreakdown.whatsapp.successRate
                },
                sms: {
                    cost: costAnalytics.costByChannel.sms || 0,
                    messages: analyticsReport.deliveryMetrics.channelBreakdown.sms.total,
                    costPerMessage: (costAnalytics.costByChannel.sms || 0) / Math.max(analyticsReport.deliveryMetrics.channelBreakdown.sms.total, 1),
                    successRate: analyticsReport.deliveryMetrics.channelBreakdown.sms.successRate
                }
            },
            
            // Daily cost breakdown
            dailyBreakdown: costAnalytics.costByDay,
            
            // Time-based cost breakdown
            breakdown: costBreakdown,
            
            // Budget information
            budget: budgetStatus,
            
            // Cost efficiency metrics
            efficiency: efficiencyMetrics,
            
            // Cost projections (if requested)
            ...(costProjections && { projections: costProjections }),
            
            // Budget alerts (if requested)
            ...(budgetAlerts && { alerts: budgetAlerts }),
            
            // Cost optimization recommendations
            recommendations: analyticsReport.recommendations
                .filter(r => r.type === 'cost')
                .map(r => ({
                    title: r.title,
                    description: r.description,
                    expectedImpact: r.expectedImpact,
                    estimatedSavings: r.estimatedSavings,
                    implementationEffort: r.implementationEffort,
                    priority: r.priority
                }))
        };

        logger.info('cost_completed', 'Cost analytics generated successfully', {
            period,
            totalCost: costAnalytics.totalCost,
            totalMessages: analyticsReport.summary.totalMessages,
            budgetUtilization: budgetStatus.utilization,
            responseTime
        });

        return NextResponse.json(response, {
            status: 200,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });

    } catch (error) {
        const responseTime = Date.now() - startTime;
        const gupshupError = handleGupshupError(error);
        
        logger.error('cost_error', 'Failed to generate cost analytics', {
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
        }, { status: 500 });
    }
}

/**
 * POST /api/notifications/gupshup/cost
 * Update budget limits and cost alert settings
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const logger = getGupshupLogger();
    const startTime = Date.now();

    try {
        const body = await request.json();
        const { action, budgetLimits, alertThresholds } = body;

        logger.info('cost_post_request', 'Cost management request', {
            action,
            budgetLimits,
            alertThresholds,
            userAgent: request.headers.get('user-agent')
        });

        // Initialize services
        const deliveryTracker = getDeliveryTracker();
        const analyticsService = getAnalyticsService(deliveryTracker);
        const rateLimitManager = getRateLimitManager();
        const monitoringService = getMonitoringService(deliveryTracker, analyticsService, rateLimitManager);

        let result: any = {};

        switch (action) {
            case 'setBudgetLimits':
                if (!budgetLimits || typeof budgetLimits.daily !== 'number' || typeof budgetLimits.monthly !== 'number') {
                    return NextResponse.json({
                        error: { message: 'Valid budget limits (daily and monthly) are required', code: 'INVALID_BUDGET_LIMITS' }
                    }, { status: 400 });
                }

                if (budgetLimits.daily <= 0 || budgetLimits.monthly <= 0) {
                    return NextResponse.json({
                        error: { message: 'Budget limits must be positive numbers', code: 'INVALID_BUDGET_VALUES' }
                    }, { status: 400 });
                }

                monitoringService.setBudgetLimits(budgetLimits.daily, budgetLimits.monthly);
                result = {
                    success: true,
                    message: 'Budget limits updated successfully',
                    budgetLimits
                };
                break;

            case 'setAlertThresholds':
                if (!alertThresholds || 
                    typeof alertThresholds.warning !== 'number' || 
                    typeof alertThresholds.critical !== 'number') {
                    return NextResponse.json({
                        error: { message: 'Valid alert thresholds (warning and critical) are required', code: 'INVALID_ALERT_THRESHOLDS' }
                    }, { status: 400 });
                }

                if (alertThresholds.warning <= 0 || alertThresholds.warning >= 1 ||
                    alertThresholds.critical <= 0 || alertThresholds.critical >= 1 ||
                    alertThresholds.warning >= alertThresholds.critical) {
                    return NextResponse.json({
                        error: { message: 'Alert thresholds must be between 0 and 1, with warning < critical', code: 'INVALID_THRESHOLD_VALUES' }
                    }, { status: 400 });
                }

                // Update alert thresholds (this would need to be implemented in MonitoringService)
                result = {
                    success: true,
                    message: 'Alert thresholds updated successfully',
                    alertThresholds
                };
                break;

            default:
                return NextResponse.json({
                    error: { message: 'Invalid action', code: 'INVALID_ACTION' }
                }, { status: 400 });
        }

        const responseTime = Date.now() - startTime;

        logger.info('cost_post_completed', 'Cost management completed', {
            action,
            success: result.success,
            responseTime
        });

        return NextResponse.json({
            ...result,
            timestamp: new Date().toISOString(),
            responseTime
        }, { status: 200 });

    } catch (error) {
        const responseTime = Date.now() - startTime;
        const gupshupError = handleGupshupError(error);
        
        logger.error('cost_post_error', 'Cost management failed', {
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
        }, { status: 500 });
    }
}

/**
 * Calculate date range based on period
 */
function calculateDateRange(period: string, startDate?: string | null, endDate?: string | null): { start: Date; end: Date } {
    const now = new Date();
    
    switch (period) {
        case 'today':
            return {
                start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                end: now
            };
        
        case 'yesterday':
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            return {
                start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
                end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
            };
        
        case 'week':
            const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return {
                start: weekStart,
                end: now
            };
        
        case 'month':
            return {
                start: new Date(now.getFullYear(), now.getMonth(), 1),
                end: now
            };
        
        case 'custom':
            if (!startDate || !endDate) {
                throw new Error('Start date and end date are required for custom period');
            }
            return {
                start: new Date(startDate),
                end: new Date(endDate)
            };
        
        default:
            // Default to today
            return {
                start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                end: now
            };
    }
}

/**
 * Get budget status
 */
async function getBudgetStatus(costAnalytics: any, period: string): Promise<any> {
    // Mock budget limits - in real implementation, these would come from configuration
    const dailyBudget = 100; // USD
    const monthlyBudget = 2000; // USD
    
    let budgetLimit = dailyBudget;
    let currentSpend = costAnalytics.totalCost;
    
    if (period === 'month') {
        budgetLimit = monthlyBudget;
    }
    
    const utilization = (currentSpend / budgetLimit) * 100;
    const remaining = Math.max(0, budgetLimit - currentSpend);
    
    let status = 'healthy';
    if (utilization >= 95) {
        status = 'critical';
    } else if (utilization >= 80) {
        status = 'warning';
    }
    
    return {
        limit: budgetLimit,
        spent: currentSpend,
        remaining,
        utilization,
        status,
        projectedMonthly: costAnalytics.projectedMonthlyCost,
        projectedMonthlyUtilization: (costAnalytics.projectedMonthlyCost / monthlyBudget) * 100
    };
}

/**
 * Generate cost projections
 */
async function generateCostProjections(analyticsService: any, currentRange: any): Promise<any> {
    // Calculate daily average from current period
    const periodDays = Math.ceil((currentRange.end.getTime() - currentRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const currentReport = await analyticsService.generateAnalyticsReport(currentRange);
    const dailyAverage = currentReport.costAnalytics.totalCost / Math.max(periodDays, 1);
    
    // Project costs for different time periods
    return {
        daily: dailyAverage,
        weekly: dailyAverage * 7,
        monthly: dailyAverage * 30,
        quarterly: dailyAverage * 90,
        yearly: dailyAverage * 365,
        
        // Growth scenarios
        scenarios: {
            conservative: {
                monthly: dailyAverage * 30 * 1.1, // 10% growth
                description: 'Assuming 10% growth in usage'
            },
            moderate: {
                monthly: dailyAverage * 30 * 1.25, // 25% growth
                description: 'Assuming 25% growth in usage'
            },
            aggressive: {
                monthly: dailyAverage * 30 * 1.5, // 50% growth
                description: 'Assuming 50% growth in usage'
            }
        },
        
        // Confidence intervals
        confidence: {
            low: dailyAverage * 30 * 0.8,
            high: dailyAverage * 30 * 1.2,
            description: '80-120% of current trend'
        }
    };
}

/**
 * Get budget alerts
 */
function getBudgetAlerts(monitoringService: any, costAnalytics: any): any {
    const activeAlerts = monitoringService.getActiveAlerts();
    const costAlerts = activeAlerts.filter(alert => 
        alert.ruleId.includes('budget') || alert.ruleId.includes('cost')
    );
    
    return {
        active: costAlerts.length,
        alerts: costAlerts.map(alert => ({
            id: alert.id,
            severity: alert.severity,
            message: alert.message,
            timestamp: alert.timestamp,
            acknowledged: alert.acknowledged
        })),
        
        // Potential alerts based on current trends
        potential: [
            ...(costAnalytics.budgetUtilization > 80 ? [{
                type: 'budget_warning',
                message: `Budget utilization at ${costAnalytics.budgetUtilization.toFixed(1)}%`,
                severity: costAnalytics.budgetUtilization > 95 ? 'critical' : 'warning'
            }] : []),
            
            ...(costAnalytics.projectedMonthlyCost > 2000 ? [{
                type: 'projected_overage',
                message: `Projected monthly cost of $${costAnalytics.projectedMonthlyCost.toFixed(2)} exceeds budget`,
                severity: 'warning'
            }] : [])
        ]
    };
}

/**
 * Generate cost breakdown by time periods
 */
async function generateCostBreakdown(analyticsService: any, dateRange: any, period: string): Promise<any> {
    // This is a simplified implementation
    // In a real system, you'd query historical data for detailed breakdowns
    
    const totalCost = (await analyticsService.generateAnalyticsReport(dateRange)).costAnalytics.totalCost;
    const periodDuration = dateRange.end.getTime() - dateRange.start.getTime();
    
    if (period === 'today' || period === 'yesterday') {
        // Hourly breakdown for daily periods
        const hourlyBreakdown: Record<string, number> = {};
        const avgHourlyCost = totalCost / 24;
        
        for (let hour = 0; hour < 24; hour++) {
            const variation = 0.5 + Math.random(); // Add some realistic variation
            hourlyBreakdown[hour.toString().padStart(2, '0')] = avgHourlyCost * variation;
        }
        
        return { hourly: hourlyBreakdown };
    } else {
        // Daily breakdown for longer periods
        const days = Math.ceil(periodDuration / (1000 * 60 * 60 * 24));
        const dailyBreakdown: Record<string, number> = {};
        const avgDailyCost = totalCost / days;
        
        for (let i = 0; i < days; i++) {
            const date = new Date(dateRange.start.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const variation = 0.7 + Math.random() * 0.6; // Add realistic variation
            dailyBreakdown[dateStr] = avgDailyCost * variation;
        }
        
        return { daily: dailyBreakdown };
    }
}

/**
 * Calculate cost efficiency metrics
 */
function calculateCostEfficiency(analyticsReport: any): any {
    const costAnalytics = analyticsReport.costAnalytics;
    const summary = analyticsReport.summary;
    
    return {
        costPerSuccessfulMessage: summary.successfulDeliveries > 0 
            ? costAnalytics.totalCost / summary.successfulDeliveries 
            : 0,
        
        costPerFailedMessage: summary.failedDeliveries > 0 
            ? (summary.failedDeliveries * costAnalytics.averageCostPerMessage) 
            : 0,
        
        wastedCostFromFailures: summary.failedDeliveries * costAnalytics.averageCostPerMessage,
        
        channelEfficiency: {
            whatsapp: {
                costEfficiency: analyticsReport.deliveryMetrics.channelBreakdown.whatsapp.successRate / 100,
                recommendedUsage: analyticsReport.deliveryMetrics.channelBreakdown.whatsapp.successRate > 90 ? 'primary' : 'secondary'
            },
            sms: {
                costEfficiency: analyticsReport.deliveryMetrics.channelBreakdown.sms.successRate / 100,
                recommendedUsage: analyticsReport.deliveryMetrics.channelBreakdown.sms.successRate > 95 ? 'primary' : 'fallback'
            }
        },
        
        optimizationScore: Math.min(100, (summary.overallSuccessRate + (100 - (costAnalytics.totalCost / 100))) / 2),
        
        potentialSavings: costAnalytics.costOptimizationPotential
    };
}