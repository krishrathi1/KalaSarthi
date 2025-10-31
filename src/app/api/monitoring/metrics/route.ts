/**
 * Metrics API Route
 * Provides performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMonitoringService } from '@/lib/services/scheme-sahayak/monitoring';

export async function GET(request: NextRequest) {
  try {
    const monitoringService = getMonitoringService();
    const metrics = monitoringService.getMetrics();

    return NextResponse.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Metrics retrieval failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Metrics retrieval failed'
      },
      { status: 500 }
    );
  }
}
