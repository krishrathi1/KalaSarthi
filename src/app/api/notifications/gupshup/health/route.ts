import { NextRequest, NextResponse } from 'next/server';
import { validateGupshupConfig, getConfigSummary } from '@/lib/config/gupshup-config';
import { getDeliveryTracker } from '@/lib/services/notifications/DeliveryTracker';

/**
 * Production Health Check Endpoint for Gupshup Notification System
 * Provides comprehensive health status for monitoring and alerting
 */

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    configuration: HealthCheck;
    database: HealthCheck;
    webhook: HealthCheck;
    services: HealthCheck;
  };
  metrics?: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    deliveryStats?: any;
  };
}

interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
  responseTime?: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const healthResult: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        configuration: await checkConfiguration(),
        database: await checkDatabase(),
        webhook: await checkWebhook(),
        services: await checkServices(),
      },
    };

    // Add metrics in development or if explicitly requested
    const includeMetrics = process.env.NODE_ENV !== 'production' || 
                          request.nextUrl.searchParams.get('metrics') === 'true';
    
    if (includeMetrics) {
      healthResult.metrics = {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        deliveryStats: await getDeliveryStats(),
      };
    }

    // Determine overall health status
    const checks = Object.values(healthResult.checks);
    const hasFailures = checks.some(check => check.status === 'fail');
    const hasWarnings = checks.some(check => check.status === 'warn');
    
    if (hasFailures) {
      healthResult.status = 'unhealthy';
    } else if (hasWarnings) {
      healthResult.status = 'degraded';
    }

    // Set appropriate HTTP status
    const httpStatus = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthResult, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      responseTime: Date.now() - startTime,
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * Check Gupshup configuration
 */
async function checkConfiguration(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const validation = validateGupshupConfig();
    const configSummary = getConfigSummary();
    
    if (!validation.isValid) {
      return {
        status: 'fail',
        message: 'Configuration validation failed',
        details: {
          errors: validation.errors,
          warnings: validation.warnings,
        },
        responseTime: Date.now() - startTime,
      };
    }
    
    if (validation.warnings.length > 0) {
      return {
        status: 'warn',
        message: 'Configuration has warnings',
        details: {
          warnings: validation.warnings,
          summary: configSummary,
        },
        responseTime: Date.now() - startTime,
      };
    }
    
    return {
      status: 'pass',
      message: 'Configuration is valid',
      details: configSummary,
      responseTime: Date.now() - startTime,
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: 'Configuration check failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Test database connection by trying to get delivery tracker
    const deliveryTracker = getDeliveryTracker();
    
    // Try to get stats (this will test database connectivity)
    await deliveryTracker.getDeliveryStats();
    
    return {
      status: 'pass',
      message: 'Database connection successful',
      responseTime: Date.now() - startTime,
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: 'Database connection failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check webhook configuration
 */
async function checkWebhook(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const webhookUrl = process.env.GUPSHUP_WEBHOOK_URL;
    const webhookSecret = process.env.GUPSHUP_WEBHOOK_SECRET;
    
    if (!webhookUrl || webhookUrl.includes('REPLACE_WITH')) {
      return {
        status: 'fail',
        message: 'Webhook URL not configured',
        responseTime: Date.now() - startTime,
      };
    }
    
    if (!webhookSecret || webhookSecret.length < 32) {
      return {
        status: 'fail',
        message: 'Webhook secret not properly configured',
        responseTime: Date.now() - startTime,
      };
    }
    
    // Check if webhook URL is accessible (in production)
    if (process.env.NODE_ENV === 'production') {
      if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
        return {
          status: 'fail',
          message: 'Webhook URL cannot be localhost in production',
          responseTime: Date.now() - startTime,
        };
      }
      
      if (!webhookUrl.startsWith('https://')) {
        return {
          status: 'warn',
          message: 'Webhook URL should use HTTPS in production',
          responseTime: Date.now() - startTime,
        };
      }
    }
    
    return {
      status: 'pass',
      message: 'Webhook configuration is valid',
      details: {
        url: webhookUrl,
        secretLength: webhookSecret.length,
      },
      responseTime: Date.now() - startTime,
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: 'Webhook check failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check critical services
 */
async function checkServices(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check if required environment variables are set
    const requiredServices = [
      'GUPSHUP_API_KEY',
      'GUPSHUP_APP_ID',
    ];
    
    const missingServices = requiredServices.filter(service => 
      !process.env[service] || process.env[service]?.includes('REPLACE_WITH')
    );
    
    if (missingServices.length > 0) {
      return {
        status: 'fail',
        message: 'Required services not configured',
        details: { missing: missingServices },
        responseTime: Date.now() - startTime,
      };
    }
    
    return {
      status: 'pass',
      message: 'All services configured',
      responseTime: Date.now() - startTime,
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: 'Services check failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Get delivery statistics for metrics
 */
async function getDeliveryStats(): Promise<any> {
  try {
    const deliveryTracker = getDeliveryTracker();
    return await deliveryTracker.getDeliveryStats();
  } catch (error) {
    return { error: 'Unable to fetch delivery stats' };
  }
}