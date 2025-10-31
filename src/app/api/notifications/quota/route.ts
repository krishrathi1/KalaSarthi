/**
 * API endpoints for quota management and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGupshupService } from '@/lib/services/notifications/GupshupService';
import { getRateLimitManager } from '@/lib/services/notifications/RateLimitManager';

/**
 * GET /api/notifications/quota
 * Get comprehensive quota usage statistics and rate limiting information
 */
export async function GET(request: NextRequest) {
  try {
    const gupshupService = getGupshupService();
    const rateLimitManager = getRateLimitManager();

    // Get quota usage statistics
    const quotaStats = gupshupService.getQuotaUsageStats();
    
    // Get rate limit information
    const whatsappRateLimit = gupshupService.getEnhancedWhatsAppRateLimit();
    const smsRateLimit = gupshupService.getEnhancedSMSRateLimit();
    
    // Get quota alerts
    const quotaAlerts = gupshupService.getQuotaAlerts();
    
    // Get performance metrics
    const performanceMetrics = gupshupService.getRateLimitPerformanceMetrics();

    const response = {
      success: true,
      data: {
        quotaUsage: quotaStats,
        rateLimits: {
          whatsapp: whatsappRateLimit,
          sms: smsRateLimit,
        },
        alerts: quotaAlerts,
        performance: performanceMetrics,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching quota information:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch quota information',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/quota/reset
 * Reset daily quota (administrative function)
 */
export async function POST(request: NextRequest) {
  try {
    const gupshupService = getGupshupService();
    
    // Reset daily quota
    gupshupService.resetDailyQuota();
    
    // Clear quota alerts
    gupshupService.clearQuotaAlerts();

    const response = {
      success: true,
      message: 'Daily quota reset successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error resetting quota:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset quota',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}