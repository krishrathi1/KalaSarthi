/**
 * API Routes for AI Profile Management
 * Handles AI profile features and success probability updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '../../../../../lib/services/scheme-sahayak';

/**
 * PUT /api/scheme-sahayak/artisans/ai-profile
 * Update AI profile features and success probability
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId, features, successProbability } = body;

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    if (!features || typeof features !== 'object') {
      return NextResponse.json(
        { success: false, error: { message: 'Features object is required', code: 'MISSING_FEATURES' } },
        { status: 400 }
      );
    }

    if (typeof successProbability !== 'number' || successProbability < 0 || successProbability > 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Success probability must be a number between 0 and 1', 
            code: 'INVALID_SUCCESS_PROBABILITY' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate features are numeric
    for (const [key, value] of Object.entries(features)) {
      if (typeof value !== 'number') {
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              message: `Feature '${key}' must be a number`, 
              code: 'INVALID_FEATURE_VALUE' 
            } 
          },
          { status: 400 }
        );
      }
    }

    const userService = getUserService();
    
    // Check if artisan exists
    const existingArtisan = await userService.getArtisanProfile(artisanId);
    if (!existingArtisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    await userService.updateAIProfile(artisanId, features, successProbability);

    return NextResponse.json({
      success: true,
      message: 'AI profile updated successfully',
      data: {
        artisanId,
        featuresCount: Object.keys(features).length,
        successProbability,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('PUT /api/scheme-sahayak/artisans/ai-profile error:', error);
    
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
 * GET /api/scheme-sahayak/artisans/ai-profile
 * Get AI profile features for an artisan
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    const userService = getUserService();
    const artisan = await userService.getArtisanProfile(artisanId);

    if (!artisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        artisanId: artisan.id,
        aiProfile: artisan.aiProfile,
        profileCompleteness: calculateProfileCompleteness(artisan),
        lastUpdated: artisan.updatedAt
      }
    });

  } catch (error) {
    console.error('GET /api/scheme-sahayak/artisans/ai-profile error:', error);
    
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
 * Calculate profile completeness percentage
 */
function calculateProfileCompleteness(artisan: any): number {
  let completedFields = 0;
  let totalFields = 0;

  // Personal info fields
  const personalInfoFields = ['name', 'phone', 'email', 'aadhaarHash', 'dateOfBirth'];
  personalInfoFields.forEach(field => {
    totalFields++;
    if (artisan.personalInfo?.[field]) completedFields++;
  });

  // Location fields
  const locationFields = ['state', 'district', 'pincode', 'address'];
  locationFields.forEach(field => {
    totalFields++;
    if (artisan.location?.[field]) completedFields++;
  });

  // Business fields
  const businessFields = ['type', 'category', 'subCategory', 'establishmentYear', 'employeeCount', 'monthlyIncome', 'experienceYears'];
  businessFields.forEach(field => {
    totalFields++;
    if (artisan.business?.[field] !== undefined && artisan.business?.[field] !== null) completedFields++;
  });

  // Preferences fields
  const preferencesFields = ['language', 'notificationChannels', 'timeHorizon', 'riskTolerance', 'interestedCategories'];
  preferencesFields.forEach(field => {
    totalFields++;
    if (artisan.preferences?.[field]) completedFields++;
  });

  // Documents
  totalFields++;
  if (artisan.documents && Object.keys(artisan.documents).length > 0) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
}