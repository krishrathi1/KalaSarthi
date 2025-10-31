/**
 * Health Check API Route
 * Provides system health status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMonitoringService } from '@/lib/services/scheme-sahayak/monitoring';

export async function GET(request: NextRequest) {
  try {
    const monitoringService = getMonitoringService();
    const healthReport = await monitoringService.getHealthStatus();

    return NextResponse.json({
      success: true,
      data: healthReport
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
}
