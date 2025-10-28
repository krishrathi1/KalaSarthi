/**
 * Intelligent Match Analytics API
 * 
 * Provides analytics data and monitoring information for the intelligent matching system
 */

import { NextRequest, NextResponse } from 'next/server';
import { MatchingAnalyticsService } from '@/lib/services/MatchingAnalyticsService';
import { IntelligentMatchingOrchestrator } from '@/lib/services/IntelligentMatchingOrchestrator';
import { QueryAnalysisCacheService } from '@/lib/services/QueryAnalysisCacheService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const format = searchParams.get('format') || 'json';
    
    const analyticsService = MatchingAnalyticsService.getInstance();
    const orchestrator = IntelligentMatchingOrchestrator.getInstance();
    const cacheService = QueryAnalysisCacheService.getInstance();

    switch (type) {
      case 'overview':
        const metrics = analyticsService.getAnalyticsMetrics();
        const systemStatus = await orchestrator.getSystemStatus().catch(() => null);
        const cacheStats = cacheService.getCacheStats();
        const alerts = analyticsService.getPerformanceAlerts();

        return NextResponse.json({
          success: true,
          data: {
            metrics,
            systemStatus,
            cacheStats,
            alerts: alerts.slice(0, 10), // Latest 10 alerts
            lastUpdated: new Date().toISOString()
          }
        });

      case 'metrics':
        const analyticsMetrics = analyticsService.getAnalyticsMetrics();
        return NextResponse.json({
          success: true,
          data: analyticsMetrics
        });

      case 'alerts':
        const severity = searchParams.get('severity') as any;
        const performanceAlerts = analyticsService.getPerformanceAlerts(severity);
        return NextResponse.json({
          success: true,
          data: {
            alerts: performanceAlerts,
            totalCount: performanceAlerts.length
          }
        });

      case 'logs':
        const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
        const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
        const profession = searchParams.get('profession') || undefined;
        const searchMethod = searchParams.get('searchMethod') || undefined;
        const limit = parseInt(searchParams.get('limit') || '100');

        const logs = analyticsService.getDecisionLogs({
          startDate,
          endDate,
          profession,
          searchMethod,
          limit
        });

        if (format === 'csv') {
          const csvData = analyticsService.exportAnalyticsData('csv');
          return new NextResponse(csvData, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="matching-analytics.csv"'
            }
          });
        }

        return NextResponse.json({
          success: true,
          data: {
            logs,
            totalCount: logs.length,
            filters: { startDate, endDate, profession, searchMethod, limit }
          }
        });

      case 'patterns':
        const timeRange = {
          start: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          end: endDate || new Date()
        };
        
        const patterns = analyticsService.getQueryPatterns(timeRange);
        return NextResponse.json({
          success: true,
          data: {
            patterns,
            timeRange
          }
        });

      case 'export':
        const exportFormat = searchParams.get('format') || 'json';
        const exportData = analyticsService.exportAnalyticsData(exportFormat as 'json' | 'csv');
        
        if (exportFormat === 'csv') {
          return new NextResponse(exportData, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="intelligent-matching-analytics.csv"'
            }
          });
        }

        return NextResponse.json({
          success: true,
          data: JSON.parse(exportData)
        });

      case 'health':
        const healthStatus = await orchestrator.getSystemStatus().catch(() => ({
          error: 'System status unavailable'
        }));
        
        const healthMetrics = analyticsService.getAnalyticsMetrics();
        
        return NextResponse.json({
          success: true,
          data: {
            systemHealth: healthStatus,
            performanceMetrics: healthMetrics.matchingPerformance,
            systemMetrics: healthMetrics.systemHealth,
            cacheHealth: cacheService.getCacheStats(),
            timestamp: new Date().toISOString()
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: 'Invalid analytics type requested',
            supportedTypes: ['overview', 'metrics', 'alerts', 'logs', 'patterns', 'export', 'health']
          }
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to retrieve analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const analyticsService = MatchingAnalyticsService.getInstance();

    switch (body.action) {
      case 'log_decision':
        const decisionId = analyticsService.logMatchingDecision(body.decision);
        return NextResponse.json({
          success: true,
          data: { decisionId }
        });

      case 'update_interaction':
        analyticsService.updateUserInteraction(body.decisionId, body.interaction);
        return NextResponse.json({
          success: true,
          message: 'User interaction updated'
        });

      case 'clear_old_logs':
        const daysToKeep = body.daysToKeep || 30;
        const deletedCount = analyticsService.clearOldLogs(daysToKeep);
        return NextResponse.json({
          success: true,
          data: { deletedCount }
        });

      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Invalid action specified',
            supportedActions: ['log_decision', 'update_interaction', 'clear_old_logs']
          }
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Analytics POST error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'ANALYTICS_POST_ERROR',
        message: 'Failed to process analytics request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}