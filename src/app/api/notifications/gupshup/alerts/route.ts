/**
 * Gupshup Notification System Alerts API
 * Manages alerts, alert rules, and alert notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMonitoringService } from '@/lib/services/notifications/MonitoringService';
import { getDeliveryTracker } from '@/lib/services/notifications/DeliveryTracker';
import { getAnalyticsService } from '@/lib/services/notifications/AnalyticsService';
import { getRateLimitManager } from '@/lib/services/notifications/RateLimitManager';
import { handleGupshupError } from '@/lib/services/notifications/GupshupErrorHandler';
import { getGupshupLogger } from '@/lib/services/notifications/GupshupLogger';

/**
 * GET /api/notifications/gupshup/alerts
 * Retrieve active alerts and alert rules
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const logger = getGupshupLogger();
    const startTime = Date.now();

    try {
        const { searchParams } = new URL(request.url);
        const includeResolved = searchParams.get('includeResolved') === 'true';
        const severity = searchParams.get('severity'); // Filter by severity
        const type = searchParams.get('type'); // Filter by alert type
        const limit = parseInt(searchParams.get('limit') || '50');

        logger.info('alerts_request', 'Alerts requested', {
            includeResolved,
            severity,
            type,
            limit,
            userAgent: request.headers.get('user-agent')
        });

        // Initialize services
        const deliveryTracker = getDeliveryTracker();
        const analyticsService = getAnalyticsService(deliveryTracker);
        const rateLimitManager = getRateLimitManager();
        const monitoringService = getMonitoringService(deliveryTracker, analyticsService, rateLimitManager);

        // Get active alerts
        let activeAlerts = monitoringService.getActiveAlerts();

        // Apply filters
        if (severity) {
            activeAlerts = activeAlerts.filter(alert => alert.severity === severity);
        }

        if (type) {
            const alertRules = monitoringService.getAlertRules();
            const typeRuleIds = alertRules.filter(rule => rule.type === type).map(rule => rule.id);
            activeAlerts = activeAlerts.filter(alert => typeRuleIds.includes(alert.ruleId));
        }

        // Limit results
        activeAlerts = activeAlerts
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);

        // Get alert rules
        const alertRules = monitoringService.getAlertRules();

        // Get alert statistics
        const alertStats = {
            total: activeAlerts.length,
            bySeverity: {
                critical: activeAlerts.filter(a => a.severity === 'critical').length,
                high: activeAlerts.filter(a => a.severity === 'high').length,
                medium: activeAlerts.filter(a => a.severity === 'medium').length,
                low: activeAlerts.filter(a => a.severity === 'low').length
            },
            byType: alertRules.reduce((acc, rule) => {
                const typeAlerts = activeAlerts.filter(a => a.ruleId === rule.id);
                if (typeAlerts.length > 0) {
                    acc[rule.type] = (acc[rule.type] || 0) + typeAlerts.length;
                }
                return acc;
            }, {} as Record<string, number>),
            unacknowledged: activeAlerts.filter(a => !a.acknowledged).length,
            acknowledged: activeAlerts.filter(a => a.acknowledged).length
        };

        const responseTime = Date.now() - startTime;

        const response = {
            timestamp: new Date().toISOString(),
            responseTime,
            
            // Alert statistics
            statistics: alertStats,
            
            // Active alerts
            alerts: activeAlerts.map(alert => ({
                id: alert.id,
                ruleId: alert.ruleId,
                ruleName: alert.ruleName,
                severity: alert.severity,
                message: alert.message,
                value: alert.value,
                threshold: alert.threshold,
                timestamp: alert.timestamp,
                acknowledged: alert.acknowledged,
                resolvedAt: alert.resolvedAt,
                metadata: alert.metadata
            })),
            
            // Alert rules
            rules: alertRules.map(rule => ({
                id: rule.id,
                name: rule.name,
                description: rule.description,
                type: rule.type,
                condition: rule.condition,
                threshold: rule.threshold,
                timeWindow: rule.timeWindow,
                severity: rule.severity,
                enabled: rule.enabled,
                cooldown: rule.cooldown,
                lastTriggered: rule.lastTriggered
            })),
            
            // Filters applied
            filters: {
                includeResolved,
                severity,
                type,
                limit
            }
        };

        logger.info('alerts_completed', 'Alerts retrieved successfully', {
            totalAlerts: activeAlerts.length,
            unacknowledged: alertStats.unacknowledged,
            criticalAlerts: alertStats.bySeverity.critical,
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
        
        logger.error('alerts_error', 'Failed to retrieve alerts', {
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
 * POST /api/notifications/gupshup/alerts
 * Create or update alert rules
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const logger = getGupshupLogger();
    const startTime = Date.now();

    try {
        const body = await request.json();
        const { action, alertRule, alertId, budgetLimits } = body;

        logger.info('alerts_post_request', 'Alert management request', {
            action,
            alertRuleId: alertRule?.id,
            alertId,
            userAgent: request.headers.get('user-agent')
        });

        // Initialize services
        const deliveryTracker = getDeliveryTracker();
        const analyticsService = getAnalyticsService(deliveryTracker);
        const rateLimitManager = getRateLimitManager();
        const monitoringService = getMonitoringService(deliveryTracker, analyticsService, rateLimitManager);

        let result: any = {};

        switch (action) {
            case 'createRule':
            case 'updateRule':
                if (!alertRule) {
                    return NextResponse.json({
                        error: { message: 'Alert rule is required', code: 'MISSING_ALERT_RULE' }
                    }, { status: 400 });
                }

                // Validate alert rule
                const validationError = validateAlertRule(alertRule);
                if (validationError) {
                    return NextResponse.json({
                        error: { message: validationError, code: 'INVALID_ALERT_RULE' }
                    }, { status: 400 });
                }

                monitoringService.setAlertRule(alertRule);
                result = {
                    success: true,
                    message: `Alert rule ${action === 'createRule' ? 'created' : 'updated'} successfully`,
                    rule: alertRule
                };
                break;

            case 'deleteRule':
                if (!alertRule?.id) {
                    return NextResponse.json({
                        error: { message: 'Alert rule ID is required', code: 'MISSING_RULE_ID' }
                    }, { status: 400 });
                }

                const deleted = monitoringService.removeAlertRule(alertRule.id);
                result = {
                    success: deleted,
                    message: deleted ? 'Alert rule deleted successfully' : 'Alert rule not found'
                };
                break;

            case 'acknowledgeAlert':
                if (!alertId) {
                    return NextResponse.json({
                        error: { message: 'Alert ID is required', code: 'MISSING_ALERT_ID' }
                    }, { status: 400 });
                }

                const acknowledged = monitoringService.acknowledgeAlert(alertId);
                result = {
                    success: acknowledged,
                    message: acknowledged ? 'Alert acknowledged successfully' : 'Alert not found'
                };
                break;

            case 'resolveAlert':
                if (!alertId) {
                    return NextResponse.json({
                        error: { message: 'Alert ID is required', code: 'MISSING_ALERT_ID' }
                    }, { status: 400 });
                }

                const resolved = monitoringService.resolveAlert(alertId);
                result = {
                    success: resolved,
                    message: resolved ? 'Alert resolved successfully' : 'Alert not found'
                };
                break;

            case 'setBudgetLimits':
                if (!budgetLimits || typeof budgetLimits.daily !== 'number' || typeof budgetLimits.monthly !== 'number') {
                    return NextResponse.json({
                        error: { message: 'Valid budget limits (daily and monthly) are required', code: 'INVALID_BUDGET_LIMITS' }
                    }, { status: 400 });
                }

                monitoringService.setBudgetLimits(budgetLimits.daily, budgetLimits.monthly);
                result = {
                    success: true,
                    message: 'Budget limits updated successfully',
                    budgetLimits
                };
                break;

            default:
                return NextResponse.json({
                    error: { message: 'Invalid action', code: 'INVALID_ACTION' }
                }, { status: 400 });
        }

        const responseTime = Date.now() - startTime;

        logger.info('alerts_post_completed', 'Alert management completed', {
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
        
        logger.error('alerts_post_error', 'Alert management failed', {
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
 * Validate alert rule
 */
function validateAlertRule(rule: any): string | null {
    if (!rule.id || typeof rule.id !== 'string') {
        return 'Alert rule ID is required and must be a string';
    }

    if (!rule.name || typeof rule.name !== 'string') {
        return 'Alert rule name is required and must be a string';
    }

    if (!rule.description || typeof rule.description !== 'string') {
        return 'Alert rule description is required and must be a string';
    }

    if (!['performance', 'cost', 'health', 'delivery'].includes(rule.type)) {
        return 'Alert rule type must be one of: performance, cost, health, delivery';
    }

    if (!rule.condition || typeof rule.condition !== 'string') {
        return 'Alert rule condition is required and must be a string';
    }

    if (typeof rule.threshold !== 'number') {
        return 'Alert rule threshold is required and must be a number';
    }

    if (typeof rule.timeWindow !== 'number' || rule.timeWindow <= 0) {
        return 'Alert rule timeWindow is required and must be a positive number';
    }

    if (!['low', 'medium', 'high', 'critical'].includes(rule.severity)) {
        return 'Alert rule severity must be one of: low, medium, high, critical';
    }

    if (typeof rule.enabled !== 'boolean') {
        return 'Alert rule enabled is required and must be a boolean';
    }

    if (typeof rule.cooldown !== 'number' || rule.cooldown < 0) {
        return 'Alert rule cooldown is required and must be a non-negative number';
    }

    return null;
}