/**
 * Monitoring and Alerting Service for Gupshup Notification System
 * Provides health checks, performance metrics, and cost monitoring with alerts
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
    DateRange
} from './DeliveryTracker';
import {
    AnalyticsService,
    AnalyticsReport,
    CostAnalytics,
    PerformanceMetrics
} from './AnalyticsService';
import {
    GupshupError,
    GupshupErrorCode,
    handleGupshupError,
    ErrorCategory
} from './GupshupErrorHandler';
import { RateLimitManager } from './RateLimitManager';

export interface HealthCheckResult {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    lastCheck: Date;
    error?: string;
    details?: Record<string, any>;
}

export interface SystemHealthStatus {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    uptime: number;
    services: {
        gupshupApi: HealthCheckResult;
        whatsappService: HealthCheckResult;
        smsService: HealthCheckResult;
        templateManager: HealthCheckResult;
        messageQueue: HealthCheckResult;
        deliveryTracker: HealthCheckResult;
        rateLimiter: HealthCheckResult;
    };
    metrics: {
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage: NodeJS.CpuUsage;
        activeConnections: number;
        queueDepth: number;
        errorRate: number;
        throughput: number;
    };
}

export interface AlertRule {
    id: string;
    name: string;
    description: string;
    type: 'performance' | 'cost' | 'health' | 'delivery';
    condition: string;
    threshold: number;
    timeWindow: number; // in minutes
    severity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
    cooldown: number; // minutes before re-alerting
    lastTriggered?: Date;
}

export interface Alert {
    id: string;
    ruleId: string;
    ruleName: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    value: number;
    threshold: number;
    timestamp: Date;
    acknowledged: boolean;
    resolvedAt?: Date;
    metadata?: Record<string, any>;
}

export interface CostAlert {
    type: 'budget_exceeded' | 'cost_spike' | 'quota_warning';
    severity: 'warning' | 'critical';
    message: string;
    currentCost: number;
    budgetLimit?: number;
    projectedCost?: number;
    timestamp: Date;
}

export interface PerformanceAlert {
    type: 'high_latency' | 'low_throughput' | 'high_error_rate' | 'queue_overflow';
    severity: 'warning' | 'critical';
    message: string;
    currentValue: number;
    threshold: number;
    timestamp: Date;
    affectedService: string;
}

/**
 * Monitoring and Alerting Service
 */
export class MonitoringService {
    private config: GupshupConfig;
    private logger: GupshupLogger;
    private deliveryTracker: DeliveryTracker;
    private analyticsService: AnalyticsService;
    private rateLimitManager: RateLimitManager;
    
    private alertRules: Map<string, AlertRule> = new Map();
    private activeAlerts: Map<string, Alert> = new Map();
    private alertListeners: ((alert: Alert) => void)[] = [];
    private costAlertListeners: ((alert: CostAlert) => void)[] = [];
    private performanceAlertListeners: ((alert: PerformanceAlert) => void)[] = [];
    
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private metricsCollectionInterval: NodeJS.Timeout | null = null;
    private costMonitoringInterval: NodeJS.Timeout | null = null;
    
    private startTime: Date = new Date();
    private lastHealthCheck: Date = new Date();
    private healthHistory: SystemHealthStatus[] = [];
    
    // Cost tracking
    private dailyCostBudget: number = 100; // USD
    private monthlyCostBudget: number = 2000; // USD
    private costAlertThresholds = {
        warning: 0.8, // 80% of budget
        critical: 0.95 // 95% of budget
    };

    constructor(
        deliveryTracker: DeliveryTracker,
        analyticsService: AnalyticsService,
        rateLimitManager: RateLimitManager,
        config?: GupshupConfig
    ) {
        this.config = config || getGupshupConfig();
        this.logger = getGupshupLogger();
        this.deliveryTracker = deliveryTracker;
        this.analyticsService = analyticsService;
        this.rateLimitManager = rateLimitManager;

        this.initializeDefaultAlertRules();
        this.startMonitoring();

        this.logger.info('monitoring_service_init', 'Monitoring Service initialized', {
            healthCheckInterval: 60000, // 1 minute
            metricsInterval: 300000, // 5 minutes
            costMonitoringInterval: 600000, // 10 minutes
        });
    }

    /**
     * Start all monitoring processes
     */
    private startMonitoring(): void {
        // Health checks every minute
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                this.logger.error('health_check_error', 'Health check failed', { error });
            }
        }, 60000);

        // Metrics collection every 5 minutes
        this.metricsCollectionInterval = setInterval(async () => {
            try {
                await this.collectAndEvaluateMetrics();
            } catch (error) {
                this.logger.error('metrics_collection_error', 'Metrics collection failed', { error });
            }
        }, 300000);

        // Cost monitoring every 10 minutes
        this.costMonitoringInterval = setInterval(async () => {
            try {
                await this.monitorCosts();
            } catch (error) {
                this.logger.error('cost_monitoring_error', 'Cost monitoring failed', { error });
            }
        }, 600000);
    }

    /**
     * Stop all monitoring processes
     */
    public stopMonitoring(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        if (this.metricsCollectionInterval) {
            clearInterval(this.metricsCollectionInterval);
            this.metricsCollectionInterval = null;
        }
        if (this.costMonitoringInterval) {
            clearInterval(this.costMonitoringInterval);
            this.costMonitoringInterval = null;
        }
    }

    /**
     * Get current system health status
     */
    async getHealthStatus(): Promise<SystemHealthStatus> {
        const timer = createPerformanceTimer('get_health_status');

        try {
            const healthStatus = await this.performHealthCheck();
            const duration = timer.end(true, null, {
                overallStatus: healthStatus.overall,
                serviceCount: Object.keys(healthStatus.services).length
            });

            return healthStatus;
        } catch (error) {
            const duration = timer.end(false, error);
            const gupshupError = handleGupshupError(error);
            this.logger.error('health_status_error', 'Failed to get health status', gupshupError);
            throw gupshupError;
        }
    }

    /**
     * Perform comprehensive health check
     */
    private async performHealthCheck(): Promise<SystemHealthStatus> {
        const checkStartTime = Date.now();
        
        // Perform individual service health checks
        const [
            gupshupApiHealth,
            whatsappHealth,
            smsHealth,
            templateHealth,
            queueHealth,
            trackerHealth,
            rateLimiterHealth
        ] = await Promise.allSettled([
            this.checkGupshupApiHealth(),
            this.checkWhatsAppServiceHealth(),
            this.checkSMSServiceHealth(),
            this.checkTemplateManagerHealth(),
            this.checkMessageQueueHealth(),
            this.checkDeliveryTrackerHealth(),
            this.checkRateLimiterHealth()
        ]);

        // Collect system metrics
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        // Calculate queue depth and other metrics
        const queueDepth = await this.getQueueDepth();
        const errorRate = await this.calculateRecentErrorRate();
        const throughput = await this.calculateThroughput();

        const healthStatus: SystemHealthStatus = {
            overall: 'healthy',
            timestamp: new Date(),
            uptime: Date.now() - this.startTime.getTime(),
            services: {
                gupshupApi: this.getHealthResult(gupshupApiHealth, 'gupshupApi'),
                whatsappService: this.getHealthResult(whatsappHealth, 'whatsappService'),
                smsService: this.getHealthResult(smsHealth, 'smsService'),
                templateManager: this.getHealthResult(templateHealth, 'templateManager'),
                messageQueue: this.getHealthResult(queueHealth, 'messageQueue'),
                deliveryTracker: this.getHealthResult(trackerHealth, 'deliveryTracker'),
                rateLimiter: this.getHealthResult(rateLimiterHealth, 'rateLimiter')
            },
            metrics: {
                memoryUsage,
                cpuUsage,
                activeConnections: 0, // Would need actual connection monitoring
                queueDepth,
                errorRate,
                throughput
            }
        };

        // Determine overall health status
        const serviceStatuses = Object.values(healthStatus.services).map(s => s.status);
        if (serviceStatuses.some(s => s === 'unhealthy')) {
            healthStatus.overall = 'unhealthy';
        } else if (serviceStatuses.some(s => s === 'degraded')) {
            healthStatus.overall = 'degraded';
        }

        // Store in history (keep last 24 hours)
        this.healthHistory.push(healthStatus);
        if (this.healthHistory.length > 1440) { // 24 hours * 60 minutes
            this.healthHistory.shift();
        }

        this.lastHealthCheck = new Date();

        // Check for health-based alerts
        await this.evaluateHealthAlerts(healthStatus);

        this.logger.info('health_check_completed', 'Health check completed', {
            overall: healthStatus.overall,
            checkDuration: Date.now() - checkStartTime,
            serviceCount: Object.keys(healthStatus.services).length,
            queueDepth,
            errorRate,
            throughput
        });

        return healthStatus;
    }

    /**
     * Individual service health checks
     */
    private async checkGupshupApiHealth(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            // Mock API health check - in real implementation, this would ping Gupshup API
            await new Promise(resolve => setTimeout(resolve, 50)); // Simulate API call
            
            return {
                service: 'gupshupApi',
                status: 'healthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: {
                    endpoint: this.config.baseUrl,
                    authenticated: true
                }
            };
        } catch (error) {
            return {
                service: 'gupshupApi',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async checkWhatsAppServiceHealth(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            // Check WhatsApp service availability
            const rateLimitStatus = this.rateLimitManager.checkRateLimit('whatsapp');
            
            return {
                service: 'whatsappService',
                status: rateLimitStatus ? 'healthy' : 'degraded',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: {
                    rateLimitOk: rateLimitStatus,
                    phoneNumberId: this.config.whatsapp?.phoneNumberId
                }
            };
        } catch (error) {
            return {
                service: 'whatsappService',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async checkSMSServiceHealth(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            // Check SMS service availability
            const rateLimitStatus = this.rateLimitManager.checkRateLimit('sms');
            
            return {
                service: 'smsService',
                status: rateLimitStatus ? 'healthy' : 'degraded',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: {
                    rateLimitOk: rateLimitStatus,
                    senderId: this.config.sms?.senderId
                }
            };
        } catch (error) {
            return {
                service: 'smsService',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async checkTemplateManagerHealth(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            // Mock template manager health check
            return {
                service: 'templateManager',
                status: 'healthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: {
                    templatesLoaded: true,
                    lastSync: new Date()
                }
            };
        } catch (error) {
            return {
                service: 'templateManager',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async checkMessageQueueHealth(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            const queueDepth = await this.getQueueDepth();
            const status = queueDepth > 1000 ? 'degraded' : 'healthy';
            
            return {
                service: 'messageQueue',
                status,
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: {
                    queueDepth,
                    processing: true
                }
            };
        } catch (error) {
            return {
                service: 'messageQueue',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async checkDeliveryTrackerHealth(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            // Mock delivery tracker health check
            return {
                service: 'deliveryTracker',
                status: 'healthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: {
                    tracking: true,
                    webhookProcessing: true
                }
            };
        } catch (error) {
            return {
                service: 'deliveryTracker',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async checkRateLimiterHealth(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            const quotaStatus = this.rateLimitManager.getQuotaStatus();
            const status = quotaStatus.utilizationPercentage > 90 ? 'degraded' : 'healthy';
            
            return {
                service: 'rateLimiter',
                status,
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                details: {
                    quotaUtilization: quotaStatus.utilizationPercentage,
                    dailyLimit: quotaStatus.dailyLimit,
                    used: quotaStatus.used
                }
            };
        } catch (error) {
            return {
                service: 'rateLimiter',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Helper method to extract health result from Promise.allSettled
     */
    private getHealthResult(
        settledResult: PromiseSettledResult<HealthCheckResult>,
        serviceName: string
    ): HealthCheckResult {
        if (settledResult.status === 'fulfilled') {
            return settledResult.value;
        } else {
            return {
                service: serviceName,
                status: 'unhealthy',
                responseTime: 0,
                lastCheck: new Date(),
                error: settledResult.reason?.message || 'Health check failed'
            };
        }
    }

    /**
     * Collect and evaluate performance metrics
     */
    private async collectAndEvaluateMetrics(): Promise<void> {
        const timer = createPerformanceTimer('collect_evaluate_metrics');

        try {
            // Get recent analytics report
            const dateRange: DateRange = {
                start: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
                end: new Date()
            };

            const analyticsReport = await this.analyticsService.generateAnalyticsReport(dateRange);
            
            // Evaluate performance alerts
            await this.evaluatePerformanceAlerts(analyticsReport);

            const duration = timer.end(true, null, {
                totalMessages: analyticsReport.summary.totalMessages,
                successRate: analyticsReport.summary.overallSuccessRate
            });

            this.logger.info('metrics_collected', 'Performance metrics collected and evaluated', {
                totalMessages: analyticsReport.summary.totalMessages,
                successRate: analyticsReport.summary.overallSuccessRate,
                totalCost: analyticsReport.summary.totalCost,
                duration
            });

        } catch (error) {
            const duration = timer.end(false, error);
            const gupshupError = handleGupshupError(error);
            this.logger.error('metrics_collection_error', 'Failed to collect metrics', gupshupError);
        }
    }

    /**
     * Monitor costs and check budget alerts
     */
    private async monitorCosts(): Promise<void> {
        const timer = createPerformanceTimer('monitor_costs');

        try {
            // Get today's cost analytics
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const dateRange: DateRange = {
                start: startOfDay,
                end: today
            };

            const analyticsReport = await this.analyticsService.generateAnalyticsReport(dateRange);
            const costAnalytics = analyticsReport.costAnalytics;

            // Check daily budget
            await this.checkDailyBudgetAlert(costAnalytics);

            // Check monthly budget projection
            await this.checkMonthlyBudgetAlert(costAnalytics);

            // Check for cost spikes
            await this.checkCostSpikeAlert(costAnalytics);

            const duration = timer.end(true, null, {
                dailyCost: costAnalytics.totalCost,
                projectedMonthlyCost: costAnalytics.projectedMonthlyCost,
                budgetUtilization: costAnalytics.budgetUtilization
            });

            this.logger.info('cost_monitoring_completed', 'Cost monitoring completed', {
                dailyCost: costAnalytics.totalCost,
                projectedMonthlyCost: costAnalytics.projectedMonthlyCost,
                budgetUtilization: costAnalytics.budgetUtilization,
                duration
            });

        } catch (error) {
            const duration = timer.end(false, error);
            const gupshupError = handleGupshupError(error);
            this.logger.error('cost_monitoring_error', 'Failed to monitor costs', gupshupError);
        }
    }

    /**
     * Initialize default alert rules
     */
    private initializeDefaultAlertRules(): void {
        const defaultRules: AlertRule[] = [
            {
                id: 'high_error_rate',
                name: 'High Error Rate',
                description: 'Alert when message delivery error rate exceeds threshold',
                type: 'delivery',
                condition: 'error_rate > threshold',
                threshold: 0.1, // 10%
                timeWindow: 5,
                severity: 'high',
                enabled: true,
                cooldown: 15
            },
            {
                id: 'low_delivery_rate',
                name: 'Low Delivery Success Rate',
                description: 'Alert when delivery success rate falls below threshold',
                type: 'delivery',
                condition: 'success_rate < threshold',
                threshold: 0.9, // 90%
                timeWindow: 10,
                severity: 'medium',
                enabled: true,
                cooldown: 30
            },
            {
                id: 'high_response_time',
                name: 'High API Response Time',
                description: 'Alert when API response time exceeds threshold',
                type: 'performance',
                condition: 'avg_response_time > threshold',
                threshold: 5000, // 5 seconds
                timeWindow: 5,
                severity: 'medium',
                enabled: true,
                cooldown: 10
            },
            {
                id: 'queue_overflow',
                name: 'Message Queue Overflow',
                description: 'Alert when message queue depth exceeds threshold',
                type: 'performance',
                condition: 'queue_depth > threshold',
                threshold: 1000,
                timeWindow: 1,
                severity: 'high',
                enabled: true,
                cooldown: 5
            },
            {
                id: 'daily_budget_exceeded',
                name: 'Daily Budget Exceeded',
                description: 'Alert when daily spending exceeds budget',
                type: 'cost',
                condition: 'daily_cost > threshold',
                threshold: this.dailyCostBudget,
                timeWindow: 1,
                severity: 'critical',
                enabled: true,
                cooldown: 60
            },
            {
                id: 'monthly_budget_warning',
                name: 'Monthly Budget Warning',
                description: 'Alert when projected monthly cost approaches budget',
                type: 'cost',
                condition: 'projected_monthly_cost > threshold',
                threshold: this.monthlyCostBudget * this.costAlertThresholds.warning,
                timeWindow: 60,
                severity: 'medium',
                enabled: true,
                cooldown: 240
            },
            {
                id: 'service_unhealthy',
                name: 'Service Unhealthy',
                description: 'Alert when any critical service becomes unhealthy',
                type: 'health',
                condition: 'service_status == unhealthy',
                threshold: 1,
                timeWindow: 1,
                severity: 'critical',
                enabled: true,
                cooldown: 5
            }
        ];

        defaultRules.forEach(rule => {
            this.alertRules.set(rule.id, rule);
        });
    }

    /**
     * Evaluate health-based alerts
     */
    private async evaluateHealthAlerts(healthStatus: SystemHealthStatus): Promise<void> {
        const rule = this.alertRules.get('service_unhealthy');
        if (!rule || !rule.enabled) return;

        const unhealthyServices = Object.entries(healthStatus.services)
            .filter(([_, service]) => service.status === 'unhealthy')
            .map(([name, _]) => name);

        if (unhealthyServices.length > 0) {
            await this.triggerAlert(rule, unhealthyServices.length, {
                unhealthyServices,
                overallStatus: healthStatus.overall
            });
        }
    }

    /**
     * Evaluate performance alerts
     */
    private async evaluatePerformanceAlerts(analyticsReport: AnalyticsReport): Promise<void> {
        // Check error rate
        const errorRateRule = this.alertRules.get('high_error_rate');
        if (errorRateRule && errorRateRule.enabled) {
            const errorRate = (analyticsReport.summary.failedDeliveries / analyticsReport.summary.totalMessages) || 0;
            if (errorRate > errorRateRule.threshold) {
                await this.triggerAlert(errorRateRule, errorRate, {
                    totalMessages: analyticsReport.summary.totalMessages,
                    failedDeliveries: analyticsReport.summary.failedDeliveries
                });
            }
        }

        // Check delivery success rate
        const deliveryRateRule = this.alertRules.get('low_delivery_rate');
        if (deliveryRateRule && deliveryRateRule.enabled) {
            const successRate = analyticsReport.summary.overallSuccessRate / 100;
            if (successRate < deliveryRateRule.threshold) {
                await this.triggerAlert(deliveryRateRule, successRate, {
                    successRate: analyticsReport.summary.overallSuccessRate,
                    totalMessages: analyticsReport.summary.totalMessages
                });
            }
        }

        // Check response time
        const responseTimeRule = this.alertRules.get('high_response_time');
        if (responseTimeRule && responseTimeRule.enabled) {
            const avgResponseTime = analyticsReport.performanceMetrics.apiPerformance.averageResponseTime;
            if (avgResponseTime > responseTimeRule.threshold) {
                await this.triggerAlert(responseTimeRule, avgResponseTime, {
                    averageResponseTime: avgResponseTime,
                    slowestEndpoint: analyticsReport.performanceMetrics.apiPerformance.slowestEndpoint
                });
            }
        }

        // Check queue depth
        const queueRule = this.alertRules.get('queue_overflow');
        if (queueRule && queueRule.enabled) {
            const queueDepth = await this.getQueueDepth();
            if (queueDepth > queueRule.threshold) {
                await this.triggerAlert(queueRule, queueDepth, {
                    queueDepth,
                    throughput: analyticsReport.performanceMetrics.throughput.messagesPerSecond
                });
            }
        }
    }

    /**
     * Check daily budget alert
     */
    private async checkDailyBudgetAlert(costAnalytics: CostAnalytics): Promise<void> {
        const rule = this.alertRules.get('daily_budget_exceeded');
        if (!rule || !rule.enabled) return;

        if (costAnalytics.totalCost > this.dailyCostBudget) {
            await this.triggerAlert(rule, costAnalytics.totalCost, {
                dailyCost: costAnalytics.totalCost,
                budget: this.dailyCostBudget,
                overageAmount: costAnalytics.totalCost - this.dailyCostBudget
            });

            // Also trigger cost alert
            const costAlert: CostAlert = {
                type: 'budget_exceeded',
                severity: 'critical',
                message: `Daily budget of $${this.dailyCostBudget} exceeded. Current cost: $${costAnalytics.totalCost.toFixed(2)}`,
                currentCost: costAnalytics.totalCost,
                budgetLimit: this.dailyCostBudget,
                timestamp: new Date()
            };

            this.triggerCostAlert(costAlert);
        }
    }

    /**
     * Check monthly budget alert
     */
    private async checkMonthlyBudgetAlert(costAnalytics: CostAnalytics): Promise<void> {
        const rule = this.alertRules.get('monthly_budget_warning');
        if (!rule || !rule.enabled) return;

        if (costAnalytics.projectedMonthlyCost > rule.threshold) {
            await this.triggerAlert(rule, costAnalytics.projectedMonthlyCost, {
                projectedMonthlyCost: costAnalytics.projectedMonthlyCost,
                monthlyBudget: this.monthlyCostBudget,
                utilizationPercentage: costAnalytics.budgetUtilization
            });

            // Also trigger cost alert
            const severity = costAnalytics.projectedMonthlyCost > this.monthlyCostBudget * this.costAlertThresholds.critical
                ? 'critical' : 'warning';

            const costAlert: CostAlert = {
                type: 'quota_warning',
                severity,
                message: `Projected monthly cost of $${costAnalytics.projectedMonthlyCost.toFixed(2)} approaches budget of $${this.monthlyCostBudget}`,
                currentCost: costAnalytics.totalCost,
                budgetLimit: this.monthlyCostBudget,
                projectedCost: costAnalytics.projectedMonthlyCost,
                timestamp: new Date()
            };

            this.triggerCostAlert(costAlert);
        }
    }

    /**
     * Check for cost spikes
     */
    private async checkCostSpikeAlert(costAnalytics: CostAnalytics): Promise<void> {
        // Compare today's cost with average of last 7 days
        // This is a simplified implementation - in production, you'd want more sophisticated spike detection
        const averageDailyCost = costAnalytics.projectedMonthlyCost / 30;
        const spikeThreshold = averageDailyCost * 2; // 200% of average

        if (costAnalytics.totalCost > spikeThreshold) {
            const costAlert: CostAlert = {
                type: 'cost_spike',
                severity: 'warning',
                message: `Cost spike detected: $${costAnalytics.totalCost.toFixed(2)} vs average $${averageDailyCost.toFixed(2)}`,
                currentCost: costAnalytics.totalCost,
                timestamp: new Date()
            };

            this.triggerCostAlert(costAlert);
        }
    }

    /**
     * Trigger an alert
     */
    private async triggerAlert(rule: AlertRule, value: number, metadata?: Record<string, any>): Promise<void> {
        // Check cooldown
        if (rule.lastTriggered) {
            const timeSinceLastAlert = Date.now() - rule.lastTriggered.getTime();
            const cooldownMs = rule.cooldown * 60 * 1000;
            if (timeSinceLastAlert < cooldownMs) {
                return; // Still in cooldown period
            }
        }

        const alert: Alert = {
            id: `${rule.id}_${Date.now()}`,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `${rule.description}: ${value} (threshold: ${rule.threshold})`,
            value,
            threshold: rule.threshold,
            timestamp: new Date(),
            acknowledged: false,
            metadata
        };

        // Store alert
        this.activeAlerts.set(alert.id, alert);
        
        // Update rule's last triggered time
        rule.lastTriggered = new Date();

        // Notify listeners
        this.alertListeners.forEach(listener => {
            try {
                listener(alert);
            } catch (error) {
                this.logger.error('alert_listener_error', 'Alert listener failed', { error, alertId: alert.id });
            }
        });

        this.logger.warn('alert_triggered', `Alert triggered: ${rule.name}`, {
            alertId: alert.id,
            ruleId: rule.id,
            severity: rule.severity,
            value,
            threshold: rule.threshold,
            metadata
        });
    }

    /**
     * Trigger cost alert
     */
    private triggerCostAlert(alert: CostAlert): void {
        this.costAlertListeners.forEach(listener => {
            try {
                listener(alert);
            } catch (error) {
                this.logger.error('cost_alert_listener_error', 'Cost alert listener failed', { error, alert });
            }
        });

        this.logger.warn('cost_alert_triggered', alert.message, {
            type: alert.type,
            severity: alert.severity,
            currentCost: alert.currentCost,
            budgetLimit: alert.budgetLimit,
            projectedCost: alert.projectedCost
        });
    }

    /**
     * Trigger performance alert
     */
    private triggerPerformanceAlert(alert: PerformanceAlert): void {
        this.performanceAlertListeners.forEach(listener => {
            try {
                listener(alert);
            } catch (error) {
                this.logger.error('performance_alert_listener_error', 'Performance alert listener failed', { error, alert });
            }
        });

        this.logger.warn('performance_alert_triggered', alert.message, {
            type: alert.type,
            severity: alert.severity,
            currentValue: alert.currentValue,
            threshold: alert.threshold,
            affectedService: alert.affectedService
        });
    }

    /**
     * Get current queue depth (mock implementation)
     */
    private async getQueueDepth(): Promise<number> {
        // In real implementation, this would query the actual message queue
        return Math.floor(Math.random() * 100);
    }

    /**
     * Calculate recent error rate
     */
    private async calculateRecentErrorRate(): Promise<number> {
        try {
            const dateRange: DateRange = {
                start: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
                end: new Date()
            };

            const report = await this.deliveryTracker.getDeliveryReport(dateRange);
            return report.totalMessages > 0 ? (report.failedDeliveries / report.totalMessages) * 100 : 0;
        } catch (error) {
            this.logger.error('error_rate_calculation_error', 'Failed to calculate error rate', { error });
            return 0;
        }
    }

    /**
     * Calculate throughput
     */
    private async calculateThroughput(): Promise<number> {
        try {
            const dateRange: DateRange = {
                start: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
                end: new Date()
            };

            const report = await this.deliveryTracker.getDeliveryReport(dateRange);
            const timeWindowSeconds = (dateRange.end.getTime() - dateRange.start.getTime()) / 1000;
            return timeWindowSeconds > 0 ? report.totalMessages / timeWindowSeconds : 0;
        } catch (error) {
            this.logger.error('throughput_calculation_error', 'Failed to calculate throughput', { error });
            return 0;
        }
    }

    /**
     * Get all active alerts
     */
    getActiveAlerts(): Alert[] {
        return Array.from(this.activeAlerts.values());
    }

    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string): boolean {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
            alert.acknowledged = true;
            this.logger.info('alert_acknowledged', 'Alert acknowledged', { alertId, ruleName: alert.ruleName });
            return true;
        }
        return false;
    }

    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string): boolean {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
            alert.resolvedAt = new Date();
            this.activeAlerts.delete(alertId);
            this.logger.info('alert_resolved', 'Alert resolved', { alertId, ruleName: alert.ruleName });
            return true;
        }
        return false;
    }

    /**
     * Get alert rules
     */
    getAlertRules(): AlertRule[] {
        return Array.from(this.alertRules.values());
    }

    /**
     * Add or update alert rule
     */
    setAlertRule(rule: AlertRule): void {
        this.alertRules.set(rule.id, rule);
        this.logger.info('alert_rule_updated', 'Alert rule updated', { ruleId: rule.id, ruleName: rule.name });
    }

    /**
     * Remove alert rule
     */
    removeAlertRule(ruleId: string): boolean {
        const removed = this.alertRules.delete(ruleId);
        if (removed) {
            this.logger.info('alert_rule_removed', 'Alert rule removed', { ruleId });
        }
        return removed;
    }

    /**
     * Set budget limits
     */
    setBudgetLimits(daily: number, monthly: number): void {
        this.dailyCostBudget = daily;
        this.monthlyCostBudget = monthly;

        // Update related alert rules
        const dailyRule = this.alertRules.get('daily_budget_exceeded');
        if (dailyRule) {
            dailyRule.threshold = daily;
        }

        const monthlyRule = this.alertRules.get('monthly_budget_warning');
        if (monthlyRule) {
            monthlyRule.threshold = monthly * this.costAlertThresholds.warning;
        }

        this.logger.info('budget_limits_updated', 'Budget limits updated', { daily, monthly });
    }

    /**
     * Get health history
     */
    getHealthHistory(hours: number = 24): SystemHealthStatus[] {
        const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
        return this.healthHistory.filter(status => status.timestamp.getTime() > cutoffTime);
    }

    /**
     * Subscribe to alerts
     */
    onAlert(listener: (alert: Alert) => void): () => void {
        this.alertListeners.push(listener);
        return () => {
            const index = this.alertListeners.indexOf(listener);
            if (index > -1) {
                this.alertListeners.splice(index, 1);
            }
        };
    }

    /**
     * Subscribe to cost alerts
     */
    onCostAlert(listener: (alert: CostAlert) => void): () => void {
        this.costAlertListeners.push(listener);
        return () => {
            const index = this.costAlertListeners.indexOf(listener);
            if (index > -1) {
                this.costAlertListeners.splice(index, 1);
            }
        };
    }

    /**
     * Subscribe to performance alerts
     */
    onPerformanceAlert(listener: (alert: PerformanceAlert) => void): () => void {
        this.performanceAlertListeners.push(listener);
        return () => {
            const index = this.performanceAlertListeners.indexOf(listener);
            if (index > -1) {
                this.performanceAlertListeners.splice(index, 1);
            }
        };
    }

    /**
     * Get monitoring metrics summary
     */
    getMetricsSummary(): {
        uptime: number;
        lastHealthCheck: Date;
        activeAlerts: number;
        healthHistory: number;
        monitoringStatus: 'active' | 'inactive';
    } {
        return {
            uptime: Date.now() - this.startTime.getTime(),
            lastHealthCheck: this.lastHealthCheck,
            activeAlerts: this.activeAlerts.size,
            healthHistory: this.healthHistory.length,
            monitoringStatus: this.healthCheckInterval ? 'active' : 'inactive'
        };
    }
}

/**
 * Singleton instance for global use
 */
let monitoringServiceInstance: MonitoringService | null = null;

export function getMonitoringService(
    deliveryTracker: DeliveryTracker,
    analyticsService: AnalyticsService,
    rateLimitManager: RateLimitManager
): MonitoringService {
    if (!monitoringServiceInstance) {
        monitoringServiceInstance = new MonitoringService(
            deliveryTracker,
            analyticsService,
            rateLimitManager
        );
    }
    return monitoringServiceInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearMonitoringServiceInstance(): void {
    if (monitoringServiceInstance) {
        monitoringServiceInstance.stopMonitoring();
        monitoringServiceInstance = null;
    }
}