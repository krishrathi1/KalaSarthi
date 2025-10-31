/**
 * Tests for Gupshup Monitoring Service
 */

import { MonitoringService, getMonitoringService, clearMonitoringServiceInstance } from '@/lib/services/notifications/MonitoringService';
import { getDeliveryTracker } from '@/lib/services/notifications/DeliveryTracker';
import { getAnalyticsService } from '@/lib/services/notifications/AnalyticsService';
import { getRateLimitManager } from '@/lib/services/notifications/RateLimitManager';

// Mock the dependencies
jest.mock('@/lib/services/notifications/DeliveryTracker');
jest.mock('@/lib/services/notifications/AnalyticsService');
jest.mock('@/lib/services/notifications/RateLimitManager');
jest.mock('@/lib/services/notifications/GupshupLogger', () => ({
    getGupshupLogger: jest.fn(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    })),
    createPerformanceTimer: jest.fn(() => ({
        end: jest.fn(() => 100)
    }))
}));
jest.mock('@/lib/config/gupshup-config', () => ({
    getGupshupConfig: jest.fn(() => ({
        baseUrl: 'https://api.gupshup.io',
        apiKey: 'test-key',
        whatsapp: { phoneNumberId: 'test-phone' },
        sms: { senderId: 'test-sender' }
    }))
}));

describe('MonitoringService', () => {
    let monitoringService: MonitoringService;
    let mockDeliveryTracker: any;
    let mockAnalyticsService: any;
    let mockRateLimitManager: any;

    beforeEach(() => {
        // Clear singleton instance
        clearMonitoringServiceInstance();

        // Create mocks
        mockDeliveryTracker = {
            getDeliveryReport: jest.fn().mockResolvedValue({
                totalMessages: 100,
                successfulDeliveries: 90,
                failedDeliveries: 10,
                pendingDeliveries: 0,
                successRate: 90,
                averageDeliveryTime: 15000,
                channelBreakdown: {
                    whatsapp: { total: 60, successful: 55, failed: 5, successRate: 91.67 },
                    sms: { total: 40, successful: 35, failed: 5, successRate: 87.5 }
                },
                errorBreakdown: {
                    '1001': 3,
                    '1002': 2
                }
            })
        };

        mockAnalyticsService = {
            generateAnalyticsReport: jest.fn().mockResolvedValue({
                summary: {
                    totalMessages: 100,
                    successfulDeliveries: 90,
                    failedDeliveries: 10,
                    pendingDeliveries: 0,
                    overallSuccessRate: 90,
                    totalCost: 5.50,
                    averageDeliveryTime: 15000,
                    activeUsers: 25
                },
                deliveryMetrics: {
                    channelBreakdown: {
                        whatsapp: { total: 60, successful: 55, failed: 5, successRate: 91.67 },
                        sms: { total: 40, successful: 35, failed: 5, successRate: 87.5 }
                    },
                    errorAnalysis: {
                        topErrors: [
                            { errorCode: '1001', count: 3, percentage: 3 },
                            { errorCode: '1002', count: 2, percentage: 2 }
                        ]
                    }
                },
                costAnalytics: {
                    totalCost: 5.50,
                    projectedMonthlyCost: 165,
                    budgetUtilization: 8.25
                },
                performanceMetrics: {
                    apiPerformance: {
                        averageResponseTime: 250
                    }
                }
            })
        };

        mockRateLimitManager = {
            checkRateLimit: jest.fn().mockReturnValue(true),
            getQuotaStatus: jest.fn().mockReturnValue({
                utilizationPercentage: 45,
                dailyLimit: 1000,
                used: 450
            })
        };

        // Mock the getter functions
        (getDeliveryTracker as jest.Mock).mockReturnValue(mockDeliveryTracker);
        (getAnalyticsService as jest.Mock).mockReturnValue(mockAnalyticsService);
        (getRateLimitManager as jest.Mock).mockReturnValue(mockRateLimitManager);

        // Create monitoring service instance
        monitoringService = getMonitoringService(
            mockDeliveryTracker,
            mockAnalyticsService,
            mockRateLimitManager
        );
    });

    afterEach(() => {
        // Stop monitoring to clean up intervals
        if (monitoringService && typeof monitoringService.stopMonitoring === 'function') {
            monitoringService.stopMonitoring();
        }
        clearMonitoringServiceInstance();
        jest.clearAllMocks();
    });

    describe('Health Checks', () => {
        it('should perform comprehensive health check', async () => {
            const healthStatus = await monitoringService.getHealthStatus();

            expect(healthStatus).toBeDefined();
            expect(healthStatus.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
            expect(healthStatus.timestamp).toBeInstanceOf(Date);
            expect(healthStatus.uptime).toBeGreaterThan(0);
            expect(healthStatus.services).toBeDefined();
            expect(healthStatus.metrics).toBeDefined();

            // Check that all expected services are monitored
            expect(healthStatus.services.gupshupApi).toBeDefined();
            expect(healthStatus.services.whatsappService).toBeDefined();
            expect(healthStatus.services.smsService).toBeDefined();
            expect(healthStatus.services.templateManager).toBeDefined();
            expect(healthStatus.services.messageQueue).toBeDefined();
            expect(healthStatus.services.deliveryTracker).toBeDefined();
            expect(healthStatus.services.rateLimiter).toBeDefined();
        });

        it('should return healthy status when all services are operational', async () => {
            const healthStatus = await monitoringService.getHealthStatus();

            expect(healthStatus.overall).toBe('healthy');
            expect(healthStatus.services.gupshupApi.status).toBe('healthy');
            expect(healthStatus.services.whatsappService.status).toBe('healthy');
            expect(healthStatus.services.smsService.status).toBe('healthy');
        });

        it('should include system metrics in health status', async () => {
            const healthStatus = await monitoringService.getHealthStatus();

            expect(healthStatus.metrics.memoryUsage).toBeDefined();
            expect(healthStatus.metrics.cpuUsage).toBeDefined();
            expect(healthStatus.metrics.queueDepth).toBeGreaterThanOrEqual(0);
            expect(healthStatus.metrics.errorRate).toBeGreaterThanOrEqual(0);
            expect(healthStatus.metrics.throughput).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Alert Management', () => {
        it('should initialize with default alert rules', () => {
            const alertRules = monitoringService.getAlertRules();

            expect(alertRules.length).toBeGreaterThan(0);
            expect(alertRules.some(rule => rule.id === 'high_error_rate')).toBe(true);
            expect(alertRules.some(rule => rule.id === 'daily_budget_exceeded')).toBe(true);
            expect(alertRules.some(rule => rule.id === 'service_unhealthy')).toBe(true);
        });

        it('should allow adding custom alert rules', () => {
            const customRule = {
                id: 'custom_test_rule',
                name: 'Custom Test Rule',
                description: 'Test rule for unit testing',
                type: 'performance' as const,
                condition: 'test_metric > threshold',
                threshold: 100,
                timeWindow: 5,
                severity: 'medium' as const,
                enabled: true,
                cooldown: 10
            };

            monitoringService.setAlertRule(customRule);
            const alertRules = monitoringService.getAlertRules();

            expect(alertRules.some(rule => rule.id === 'custom_test_rule')).toBe(true);
        });

        it('should allow removing alert rules', () => {
            const customRule = {
                id: 'rule_to_remove',
                name: 'Rule to Remove',
                description: 'This rule will be removed',
                type: 'performance' as const,
                condition: 'test_metric > threshold',
                threshold: 100,
                timeWindow: 5,
                severity: 'low' as const,
                enabled: true,
                cooldown: 10
            };

            monitoringService.setAlertRule(customRule);
            expect(monitoringService.getAlertRules().some(rule => rule.id === 'rule_to_remove')).toBe(true);

            const removed = monitoringService.removeAlertRule('rule_to_remove');
            expect(removed).toBe(true);
            expect(monitoringService.getAlertRules().some(rule => rule.id === 'rule_to_remove')).toBe(false);
        });

        it('should manage active alerts', () => {
            const initialAlerts = monitoringService.getActiveAlerts();
            expect(Array.isArray(initialAlerts)).toBe(true);
        });

        it('should allow acknowledging alerts', () => {
            // This test would need an actual alert to be triggered
            // For now, we just test that the method exists and returns false for non-existent alert
            const acknowledged = monitoringService.acknowledgeAlert('non-existent-alert');
            expect(acknowledged).toBe(false);
        });

        it('should allow resolving alerts', () => {
            // This test would need an actual alert to be triggered
            // For now, we just test that the method exists and returns false for non-existent alert
            const resolved = monitoringService.resolveAlert('non-existent-alert');
            expect(resolved).toBe(false);
        });
    });

    describe('Budget Management', () => {
        it('should allow setting budget limits', () => {
            const dailyBudget = 150;
            const monthlyBudget = 3000;

            monitoringService.setBudgetLimits(dailyBudget, monthlyBudget);

            // Verify that the budget limits are set by checking if related alert rules are updated
            const alertRules = monitoringService.getAlertRules();
            const dailyBudgetRule = alertRules.find(rule => rule.id === 'daily_budget_exceeded');
            const monthlyBudgetRule = alertRules.find(rule => rule.id === 'monthly_budget_warning');

            expect(dailyBudgetRule?.threshold).toBe(dailyBudget);
            expect(monthlyBudgetRule?.threshold).toBe(monthlyBudget * 0.8); // Warning threshold
        });
    });

    describe('Metrics Summary', () => {
        it('should provide monitoring metrics summary', () => {
            const metricsSummary = monitoringService.getMetricsSummary();

            expect(metricsSummary.uptime).toBeGreaterThan(0);
            expect(metricsSummary.lastHealthCheck).toBeInstanceOf(Date);
            expect(metricsSummary.activeAlerts).toBeGreaterThanOrEqual(0);
            expect(metricsSummary.healthHistory).toBeGreaterThanOrEqual(0);
            expect(metricsSummary.monitoringStatus).toMatch(/^(active|inactive)$/);
        });
    });

    describe('Event Listeners', () => {
        it('should allow subscribing to alerts', () => {
            const alertListener = jest.fn();
            const unsubscribe = monitoringService.onAlert(alertListener);

            expect(typeof unsubscribe).toBe('function');

            // Test unsubscribe
            unsubscribe();
        });

        it('should allow subscribing to cost alerts', () => {
            const costAlertListener = jest.fn();
            const unsubscribe = monitoringService.onCostAlert(costAlertListener);

            expect(typeof unsubscribe).toBe('function');

            // Test unsubscribe
            unsubscribe();
        });

        it('should allow subscribing to performance alerts', () => {
            const performanceAlertListener = jest.fn();
            const unsubscribe = monitoringService.onPerformanceAlert(performanceAlertListener);

            expect(typeof unsubscribe).toBe('function');

            // Test unsubscribe
            unsubscribe();
        });
    });

    describe('Health History', () => {
        it('should maintain health history', () => {
            const healthHistory = monitoringService.getHealthHistory(1); // Last 1 hour

            expect(Array.isArray(healthHistory)).toBe(true);
            // Initially empty since no health checks have been performed yet
        });

        it('should limit health history by time range', () => {
            const oneHourHistory = monitoringService.getHealthHistory(1);
            const oneDayHistory = monitoringService.getHealthHistory(24);

            expect(Array.isArray(oneHourHistory)).toBe(true);
            expect(Array.isArray(oneDayHistory)).toBe(true);
            expect(oneDayHistory.length).toBeGreaterThanOrEqual(oneHourHistory.length);
        });
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance when called multiple times', () => {
            const instance1 = getMonitoringService(mockDeliveryTracker, mockAnalyticsService, mockRateLimitManager);
            const instance2 = getMonitoringService(mockDeliveryTracker, mockAnalyticsService, mockRateLimitManager);

            expect(instance1).toBe(instance2);
        });

        it('should create new instance after clearing singleton', () => {
            const instance1 = getMonitoringService(mockDeliveryTracker, mockAnalyticsService, mockRateLimitManager);
            
            clearMonitoringServiceInstance();
            
            const instance2 = getMonitoringService(mockDeliveryTracker, mockAnalyticsService, mockRateLimitManager);

            expect(instance1).not.toBe(instance2);
        });
    });
});