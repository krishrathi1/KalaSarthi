/**
 * Alerts API Route
 * Provides active alerts and alert history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMonitoringService } from '@/lib/services/scheme-sahayak/monitoring';

export async function GET(request: NextRequest) {
  try {
    const monitoringService = getMonitoringService();
    const activeAlerts = monitoringService.getActiveAlerts();

    return NextResponse.json({
      success: true,
      data: {
        active: activeAlerts,
        count: activeAlerts.length
      }
    });
  } catch (error) {
    console.error('Alerts retrieval failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Alerts retrieval failed'
      },
      { status: 500 }
    );
  }
}
