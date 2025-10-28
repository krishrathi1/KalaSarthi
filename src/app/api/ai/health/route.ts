import { NextRequest, NextResponse } from 'next/server';
import { getAIHealthStatus } from '@/ai/core';
import { aiMonitoringService } from '@/ai/core/monitoring';

export async function GET(request: NextRequest) {
  try {
    // Get AI infrastructure health status
    const healthStatus = getAIHealthStatus();
    
    // Get performance metrics
    const metrics = aiMonitoringService.getMetrics();
    
    // Get recent error summary
    const errorSummary = aiMonitoringService.getErrorSummary();
    
    return NextResponse.json({
      success: true,
      data: {
        health: healthStatus,
        metrics,
        errors: errorSummary,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI health check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get AI health status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'clear_metrics':
        aiMonitoringService.clearOldEvents(0); // Clear all events
        return NextResponse.json({
          success: true,
          message: 'Metrics cleared successfully'
        });
        
      case 'export_events':
        const format = body.format || 'json';
        const events = aiMonitoringService.exportEvents(format);
        
        return NextResponse.json({
          success: true,
          data: events,
          format
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('AI health action failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to execute action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}