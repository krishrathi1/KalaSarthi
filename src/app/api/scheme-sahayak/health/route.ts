/**
 * Health Check API for Scheme Sahayak Services
 * Provides system health status and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSchemeSahayakHealthStatus, SCHEME_SAHAYAK_CONFIG } from '../../../../lib/services/scheme-sahayak';

/**
 * GET /api/scheme-sahayak/health
 * Get health status of all Scheme Sahayak services
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    const healthStatus = await getSchemeSahayakHealthStatus();

    const response = {
      success: true,
      data: {
        status: healthStatus.overall,
        timestamp: new Date(),
        version: SCHEME_SAHAYAK_CONFIG.version,
        services: healthStatus.services.map(service => ({
          name: service.service,
          status: service.status,
          timestamp: service.timestamp,
          ...(detailed && service.details ? { details: service.details } : {})
        }))
      }
    };

    if (detailed) {
      response.data = {
        ...response.data,
        metrics: healthStatus.metrics,
        configuration: {
          services: SCHEME_SAHAYAK_CONFIG.services,
          features: SCHEME_SAHAYAK_CONFIG.features
        }
      } as any;
    }

    // Set appropriate HTTP status based on health
    const httpStatus = healthStatus.overall === 'healthy' ? 200 : 
                      healthStatus.overall === 'degraded' ? 207 : 503;

    return NextResponse.json(response, { status: httpStatus });

  } catch (error) {
    console.error('GET /api/scheme-sahayak/health error:', error);
    
    return NextResponse.json(
      {
        success: false,
        data: {
          status: 'unhealthy',
          timestamp: new Date(),
          version: SCHEME_SAHAYAK_CONFIG.version,
          services: []
        },
        error: {
          message: error instanceof Error ? error.message : 'Health check failed',
          code: 'HEALTH_CHECK_FAILED'
        }
      },
      { status: 503 }
    );
  }
}