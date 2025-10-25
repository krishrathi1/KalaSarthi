import { NextRequest, NextResponse } from 'next/server';
import { SalesAggregate } from '@/lib/models/SalesAggregate';
import { AnomalyService } from '@/lib/service/AnomalyService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');
    const severity = searchParams.get('severity') || 'all'; // low, medium, high, critical, all
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'all'; // active, resolved, dismissed, all

    if (!artisanId) {
      return NextResponse.json(
        { error: 'artisanId is required' },
        { status: 400 }
      );
    }

    const anomalyService = AnomalyService.getInstance();
    
    // Get recent alerts
    const alerts = await anomalyService.getAlerts({
      artisanId,
      severity: severity === 'all' ? undefined : severity as 'low' | 'medium' | 'high' | 'critical',
      status: status === 'all' ? undefined : status as 'active' | 'resolved' | 'dismissed',
      limit
    });

    // Get alert summary
    const summary = await anomalyService.getAlertSummary(artisanId);

    // Get threshold configurations
    const thresholds = await anomalyService.getThresholds(artisanId);

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        summary,
        thresholds,
        metadata: {
          artisanId,
          totalAlerts: alerts.length,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch alerts',
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId, action, alertId, thresholds } = body;

    if (!artisanId) {
      return NextResponse.json(
        { error: 'artisanId is required' },
        { status: 400 }
      );
    }

    const anomalyService = AnomalyService.getInstance();

    switch (action) {
      case 'dismiss':
        if (!alertId) {
          return NextResponse.json(
            { error: 'alertId is required for dismiss action' },
            { status: 400 }
          );
        }
        await anomalyService.dismissAlert(alertId);
        return NextResponse.json({
          success: true,
          message: 'Alert dismissed successfully'
        });

      case 'resolve':
        if (!alertId) {
          return NextResponse.json(
            { error: 'alertId is required for resolve action' },
            { status: 400 }
          );
        }
        await anomalyService.resolveAlert(alertId);
        return NextResponse.json({
          success: true,
          message: 'Alert resolved successfully'
        });

      case 'update_thresholds':
        if (!thresholds) {
          return NextResponse.json(
            { error: 'thresholds are required for update_thresholds action' },
            { status: 400 }
          );
        }
        await anomalyService.updateThresholds(artisanId, thresholds);
        return NextResponse.json({
          success: true,
          message: 'Thresholds updated successfully'
        });

      case 'run_detection':
        // Manually trigger anomaly detection
        const detectionResult = await anomalyService.detectAnomalies(artisanId);
        return NextResponse.json({
          success: true,
          data: detectionResult,
          message: 'Anomaly detection completed'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: dismiss, resolve, update_thresholds, run_detection' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Alerts API POST error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process alert action',
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId, alertSettings } = body;

    if (!artisanId || !alertSettings) {
      return NextResponse.json(
        { error: 'artisanId and alertSettings are required' },
        { status: 400 }
      );
    }

    const anomalyService = AnomalyService.getInstance();
    
    // Update alert settings (notification preferences, thresholds, etc.)
    await anomalyService.updateAlertSettings(artisanId, alertSettings);

    return NextResponse.json({
      success: true,
      message: 'Alert settings updated successfully',
      data: {
        artisanId,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Alerts API PUT error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update alert settings',
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
