/**
 * API Routes for Government Scheme Management
 * Handles scheme discovery, search, and data retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSchemeService } from '../../../../lib/services/scheme-sahayak';

/**
 * GET /api/scheme-sahayak/schemes
 * Get schemes with various filtering options
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const category = searchParams.get('category');
    const state = searchParams.get('state');
    const businessType = searchParams.get('businessType');
    const maxAmount = searchParams.get('maxAmount');
    const popular = searchParams.get('popular');
    const search = searchParams.get('search');
    const upcomingDeadlines = searchParams.get('upcomingDeadlines');
    const limit = searchParams.get('limit');

    const schemeService = getSchemeService();

    // Get scheme by ID
    if (id) {
      const scheme = await schemeService.getSchemeById(id);
      
      if (!scheme) {
        return NextResponse.json(
          { success: false, error: { message: 'Scheme not found', code: 'SCHEME_NOT_FOUND' } },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: scheme
      });
    }

    // Get popular schemes
    if (popular === 'true') {
      const limitCount = limit ? parseInt(limit) : 10;
      const schemes = await schemeService.getPopularSchemes(limitCount);
      
      return NextResponse.json({
        success: true,
        data: schemes,
        metadata: {
          count: schemes.length,
          type: 'popular',
          limit: limitCount
        }
      });
    }

    // Search schemes
    if (search) {
      const filters: Record<string, any> = {};
      if (category) filters.category = category;
      if (state) filters.state = state;
      if (businessType) filters.businessType = businessType;
      if (maxAmount) filters.maxAmount = parseInt(maxAmount);

      const schemes = await schemeService.searchSchemes(search, filters);
      
      return NextResponse.json({
        success: true,
        data: schemes,
        metadata: {
          count: schemes.length,
          query: search,
          filters
        }
      });
    }

    // Get schemes by category
    if (category) {
      const schemes = await schemeService.getSchemesByCategory(category);
      
      return NextResponse.json({
        success: true,
        data: schemes,
        metadata: {
          count: schemes.length,
          category
        }
      });
    }

    // Get schemes with upcoming deadlines
    if (upcomingDeadlines === 'true') {
      const daysAhead = limit ? parseInt(limit) : 30;
      // Note: This would require implementing getSchemesWithUpcomingDeadlines in SchemeService
      const schemes = await schemeService.getActiveSchemes();
      
      // Filter for schemes with deadlines in the next N days
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + daysAhead);
      
      const upcomingSchemes = schemes.filter(scheme => 
        scheme.application.deadline && 
        scheme.application.deadline >= now && 
        scheme.application.deadline <= futureDate
      );
      
      return NextResponse.json({
        success: true,
        data: upcomingSchemes,
        metadata: {
          count: upcomingSchemes.length,
          daysAhead,
          type: 'upcoming_deadlines'
        }
      });
    }

    // Get active schemes with filters
    const filters: any = {};
    if (category) filters.category = category;
    if (state) filters.state = state;
    if (businessType) filters.businessType = businessType;
    if (maxAmount) filters.maxAmount = parseInt(maxAmount);

    const schemes = await schemeService.getActiveSchemes(filters);
    
    return NextResponse.json({
      success: true,
      data: schemes,
      metadata: {
        count: schemes.length,
        filters
      }
    });

  } catch (error) {
    console.error('GET /api/scheme-sahayak/schemes error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheme-sahayak/schemes/sync
 * Trigger scheme data synchronization
 */
export async function POST(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    
    if (pathname.endsWith('/sync')) {
      const schemeService = getSchemeService();
      const syncResult = await schemeService.syncSchemeData();
      
      return NextResponse.json({
        success: true,
        data: syncResult,
        message: 'Scheme data synchronization completed'
      });
    }

    return NextResponse.json(
      { success: false, error: { message: 'Invalid endpoint', code: 'INVALID_ENDPOINT' } },
      { status: 404 }
    );

  } catch (error) {
    console.error('POST /api/scheme-sahayak/schemes error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}