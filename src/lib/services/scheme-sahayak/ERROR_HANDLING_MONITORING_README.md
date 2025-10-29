# Error Handling and Monitoring System

Comprehensive error handling and monitoring implementation for the AI-Powered Scheme Sahayak system.

## Overview

This implementation provides:
- **Error Classification**: Custom error types with severity levels
- **Retry Mechanisms**: Exponential backoff and graceful degradation
- **Health Monitoring**: System and component health checks
- **Performance Metrics**: Request tracking and aggregation
- **Alerting System**: Automated alerts for critical issues

## Requirements Addressed

- **Requirement 10.3**: Performance and reliability monitoring
- **Requirement 10.4**: Error handling with graceful degradation
- **Requirement 10.5**: System uptime and monitoring

## Architecture

### Error Handling Components

```
errors/
├── ErrorTypes.ts       # Error classification and custom error classes
├── ErrorHandler.ts     # Retry logic and graceful degradation
├── ErrorUtils.ts       # Helper utilities for error handling
└── index.ts           # Module exports
```

### Monitoring Components

```
monitoring/
├── HealthMonitor.ts      # System health checks
├── MetricsTracker.ts     # Performance metrics tracking
├── AlertingSystem.ts     # Alert rules and notifications
├── MonitoringService.ts  # Integrated monitoring service
└── index.ts             # Module exports
```

## Error Handling

### Error Types

The system defines the following error types:

- `VALIDATION_ERROR`: Input validation failures
- `AUTHENTICATION_ERROR`: Authentication failures
- `AUTHORIZATION_ERROR`: Permission denied
- `EXTERNAL_API_ERROR`: External service failures
- `ML_MODEL_ERROR`: AI/ML model failures
- `DOCUMENT_PROCESSING_ERROR`: Document processing failures
- `NETWORK_ERROR`: Network connectivity issues
- `DATABASE_ERROR`: Database operation failures
- `RATE_LIMIT_ERROR`: Rate limit exceeded
- `TIMEOUT_ERROR`: Operation timeout
- `NOT_FOUND_ERROR`: Resource not found
- `SYSTEM_ERROR`: Unexpected system errors

### Error Severity Levels

- `LOW`: Minor issues, user can continue
- `MEDIUM`: Significant issues, some functionality affected
- `HIGH`: Major issues, core functionality affected
- `CRITICAL`: System-wide failures

### Usage Examples

#### Basic Error Handling

```typescript
import { 
  getErrorHandler, 
  ErrorType, 
  createErrorMetadata 
} from '@/lib/services/scheme-sahayak/errors';

const errorHandler = getErrorHandler();

// Execute with retry
const result = await errorHandler.executeWithRetry(
  async () => {
    // Your operation
    return await fetchDataFromAPI();
  },
  ErrorType.EXTERNAL_API_ERROR,
  createErrorMetadata('MyService', 'fetchData', userId)
);

if (result.success) {
  console.log('Data:', result.data);
} else {
  console.error('Error:', result.error);
}
```

#### Graceful Degradation

```typescript
// Execute with fallback
const result = await errorHandler.handleWithGracefulDegradation(
  async () => {
    // Primary operation
    return await fetchFromAPI();
  },
  async () => {
    // Fallback operation
    return await fetchFromCache();
  },
  ErrorType.EXTERNAL_API_ERROR,
  createErrorMetadata('MyService', 'fetchData')
);
```

#### Exponential Backoff

```typescript
const result = await errorHandler.executeWithExponentialBackoff(
  async () => {
    return await unstableOperation();
  },
  {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR
    ]
  },
  createErrorMetadata('MyService', 'unstableOp')
);
```

### Error Handling Strategies

Each error type has a predefined handling strategy:

```typescript
// External API errors: 3 retries with exponential backoff, fallback to cache
// ML Model errors: 1 retry, fallback to rule-based system
// Document Processing: 2 retries, fallback to manual review
// Network errors: 3 retries, fallback to offline mode
```

## Monitoring System

### Health Monitoring

The health monitor checks:
- Database connectivity
- Memory usage
- API performance
- Custom component health

```typescript
import { getHealthMonitor } from '@/lib/services/scheme-sahayak/monitoring';

const healthMonitor = getHealthMonitor();

// Run health checks
const report = await healthMonitor.runHealthChecks();
console.log('System status:', report.overallStatus);
console.log('Components:', report.components);

// Check if system is healthy
const isHealthy = await healthMonitor.isHealthy();
```

### Performance Metrics

Track various metrics:

```typescript
import { getMetricsTracker } from '@/lib/services/scheme-sahayak/monitoring';

const metricsTracker = getMetricsTracker();

// Counter metrics
metricsTracker.incrementCounter('api.requests', 1, { endpoint: '/schemes' });

// Gauge metrics
metricsTracker.recordGauge('memory.usage', 75.5);

// Timer metrics
const timer = metricsTracker.startTimer();
// ... perform operation ...
metricsTracker.recordTimer('operation.duration', timer.stop());

// Measure async operations
const result = await metricsTracker.measureAsync(
  'database.query',
  async () => {
    return await db.query();
  },
  { collection: 'schemes' }
);

// Get aggregated metrics
const metrics = metricsTracker.getAggregatedMetrics('api.requests');
console.log('Average:', metrics[0].avg);
console.log('P95:', metrics[0].p95);
```

### Alerting System

Configure and manage alerts:

```typescript
import { 
  getAlertingSystem, 
  AlertType, 
  AlertSeverity 
} from '@/lib/services/scheme-sahayak/monitoring';

const alertingSystem = getAlertingSystem();

// Register custom alert rule
alertingSystem.registerAlertRule({
  id: 'custom_alert',
  name: 'Custom Alert',
  type: AlertType.HIGH_ERROR_RATE,
  severity: AlertSeverity.WARNING,
  condition: (context) => context.errorRate > 0.1,
  message: (context) => `Error rate too high: ${context.errorRate}`,
  cooldownMinutes: 10,
  notificationChannels: ['email', 'slack'],
  enabled: true
});

// Register notification handler
alertingSystem.registerNotificationHandler('custom', async (alert) => {
  // Send notification
  console.log('Alert:', alert.message);
});

// Get active alerts
const activeAlerts = alertingSystem.getActiveAlerts();
```

### Integrated Monitoring Service

Use the monitoring service for comprehensive monitoring:

```typescript
import { getMonitoringService } from '@/lib/services/scheme-sahayak/monitoring';

const monitoringService = getMonitoringService({
  healthCheckInterval: 60000,
  alertEvaluationInterval: 30000,
  enableHealthChecks: true,
  enableMetrics: true,
  enableAlerts: true,
  notificationChannels: {
    console: true,
    email: true,
    slack: false,
    sms: false
  }
});

// Start monitoring
monitoringService.start();

// Record requests
monitoringService.recordRequest(250, false); // 250ms, no error
monitoringService.recordRequest(1500, true); // 1500ms, error

// Get dashboard
const dashboard = await monitoringService.getDashboard();
console.log('Health:', dashboard.health);
console.log('Metrics:', dashboard.metrics);
console.log('Alerts:', dashboard.alerts);

// Stop monitoring
monitoringService.stop();
```

## API Endpoints

### Health Check
```
GET /api/monitoring/health
```

Returns system health status.

### Metrics
```
GET /api/monitoring/metrics
```

Returns performance metrics.

### Alerts
```
GET /api/monitoring/alerts
```

Returns active alerts.

### Dashboard
```
GET /api/monitoring/dashboard
```

Returns comprehensive monitoring dashboard.

## Integration with Services

### Example Service Integration

```typescript
import { 
  getErrorHandler, 
  ErrorType, 
  createErrorMetadata 
} from '@/lib/services/scheme-sahayak/errors';
import { getMetricsTracker } from '@/lib/services/scheme-sahayak/monitoring';

export class MyService {
  private errorHandler = getErrorHandler();
  private metricsTracker = getMetricsTracker();

  async fetchData(userId: string): Promise<any> {
    // Track metrics
    return await this.metricsTracker.measureAsync(
      'MyService.fetchData',
      async () => {
        // Execute with error handling
        const result = await this.errorHandler.executeWithRetry(
          async () => {
            return await this.performFetch();
          },
          ErrorType.EXTERNAL_API_ERROR,
          createErrorMetadata('MyService', 'fetchData', userId)
        );

        if (!result.success) {
          throw result.error;
        }

        return result.data;
      },
      { userId }
    );
  }

  private async performFetch(): Promise<any> {
    // Actual implementation
  }
}
```

## Best Practices

### Error Handling

1. **Always use appropriate error types** for better classification
2. **Provide context** in error metadata for debugging
3. **Use graceful degradation** for non-critical operations
4. **Log errors appropriately** based on severity
5. **Sanitize errors** before sending to clients

### Monitoring

1. **Start monitoring service** on application startup
2. **Record all API requests** for accurate metrics
3. **Set up custom health checks** for critical components
4. **Configure appropriate alert thresholds**
5. **Review monitoring dashboard** regularly

### Performance

1. **Use timers** to measure operation duration
2. **Track key metrics** (error rate, response time, etc.)
3. **Set up alerts** for performance degradation
4. **Monitor resource usage** (memory, CPU)
5. **Clean up old data** periodically

## Configuration

### Environment Variables

```env
# Monitoring
ENABLE_MONITORING=true
HEALTH_CHECK_INTERVAL=60000
ALERT_EVALUATION_INTERVAL=30000

# Notifications
ENABLE_EMAIL_ALERTS=true
ENABLE_SLACK_ALERTS=false
ENABLE_SMS_ALERTS=false
ALERT_EMAIL=alerts@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

## Testing

The system includes comprehensive error handling and monitoring that can be tested:

```typescript
// Test error handling
const errorHandler = getErrorHandler();
const result = await errorHandler.executeWithRetry(
  async () => {
    throw new Error('Test error');
  },
  ErrorType.SYSTEM_ERROR,
  createErrorMetadata('Test', 'test')
);

expect(result.success).toBe(false);
expect(result.attempts).toBeGreaterThan(1);

// Test monitoring
const healthMonitor = getHealthMonitor();
const report = await healthMonitor.runHealthChecks();
expect(report.overallStatus).toBeDefined();
```

## Troubleshooting

### High Error Rate

1. Check error logs for patterns
2. Review recent deployments
3. Check external service status
4. Verify database connectivity

### Slow Response Times

1. Check database query performance
2. Review API call durations
3. Check memory usage
3. Analyze slow endpoints

### Memory Issues

1. Check for memory leaks
2. Review cache sizes
3. Monitor garbage collection
4. Analyze heap usage

## Future Enhancements

- Integration with external monitoring services (DataDog, New Relic)
- Advanced anomaly detection
- Predictive alerting
- Custom dashboards
- Log aggregation and analysis
- Distributed tracing

## Support

For issues or questions:
1. Check error logs and monitoring dashboard
2. Review this documentation
3. Contact the development team
