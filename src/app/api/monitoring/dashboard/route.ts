/**
 * Monitoring Dashboard API Route
 * Provides comprehensive monitoring dashboard data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMonitoringService } from '@/lib/services/scheme-sahayak/monitoring';

export async function GET(request: NextRequest) {
  try {
    const monitoringService = getMonitoringService();
    const dashboard = await monitoringService.getDashboard();

    return NextResponse.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Dashboard retrieval failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Dashboard retrieval failed'
      },
      { status: 500 }
    );
  }
}
