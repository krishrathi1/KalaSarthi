/**
 * Analytics API Route
 * Provides analytics and insights endpoints for the Scheme Sahayak system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsService } from '@/lib/services/scheme-sahayak';

/**
 * GET /api/scheme-sahayak/analytics
 * Get personal analytics for an artisan
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const artisanId = searchParams.get('artisanId');
    const type = searchParams.get('type') || 'personal';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!artisanId) {
      return NextResponse.json(
        { error: 'artisanId is required' },
        { status: 400 }
      );
    }

    const analyticsService = getAnalyticsService();

    switch (type) {
      case 'personal': {
        const period = startDate && endDate ? {
          start: new Date(startDate),
          end: new Date(endDate)
        } : undefined;

        const analytics = await analyticsService.getPersonalAnalytics(artisanId, period);
        return NextResponse.json({
          success: true,
          data: analytics
        });
      }

      case 'recommendations': {
        const recommendations = await analyticsService.generateImprovementRecommendations(artisanId);
        return NextResponse.json({
          success: true,
          data: recommendations
        });
      }

      case 'opportunities': {
        const opportunities = await analyticsService.predictSchemeOpportunities(artisanId);
        return NextResponse.json({
          success: true,
          data: opportunities
        });
      }

      case 'growth': {
        const growth = await analyticsService.analyzeBusinessGrowth(artisanId);
        return NextResponse.json({
          success: true,
          data: growth
        });
      }

      case 'comparative': {
        const comparative = await analyticsService.calculateComparativeAnalytics(artisanId);
        return NextResponse.json({
          success: true,
          data: comparative
        });
      }

      case 'success-factors': {
        const factors = await analyticsService.identifySuccessFactors(artisanId);
        return NextResponse.json({
          success: true,
          data: factors
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown analytics type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheme-sahayak/analytics
 * Track user actions for analytics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId, action, metadata } = body;

    if (!artisanId || !action) {
      return NextResponse.json(
        { error: 'artisanId and action are required' },
        { status: 400 }
      );
    }

    const analyticsService = getAnalyticsService();
    await analyticsService.trackUserAction(artisanId, action, metadata);

    return NextResponse.json({
      success: true,
      message: 'Action tracked successfully'
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to track action'
      },
      { status: 500 }
    );
  }
}
