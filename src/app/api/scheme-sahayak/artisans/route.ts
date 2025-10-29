/**
 * API Routes for Artisan Management
 * Handles CRUD operations for artisan profiles
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '../../../../lib/services/scheme-sahayak';
import { ArtisanProfile, SchemeSahayakErrorType } from '../../../../lib/types/scheme-sahayak';

/**
 * GET /api/scheme-sahayak/artisans
 * Get artisan profile by phone or ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const id = searchParams.get('id');
    const state = searchParams.get('state');
    const district = searchParams.get('district');

    const userService = getUserService();

    if (phone) {
      // Get artisan by phone number
      const artisan = await userService.getArtisanByPhone(phone);
      
      if (!artisan) {
        return NextResponse.json(
          { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: artisan
      });
    }

    if (id) {
      // Get artisan by ID
      const artisan = await userService.getArtisanProfile(id);
      
      if (!artisan) {
        return NextResponse.json(
          { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: artisan
      });
    }

    if (state) {
      // Get artisans by location
      const artisans = await userService.getArtisansByLocation(state, district || undefined);
      
      return NextResponse.json({
        success: true,
        data: artisans,
        metadata: {
          count: artisans.length,
          filters: { state, district }
        }
      });
    }

    return NextResponse.json(
      { success: false, error: { message: 'Missing required parameters', code: 'MISSING_PARAMETERS' } },
      { status: 400 }
    );

  } catch (error) {
    console.error('GET /api/scheme-sahayak/artisans error:', error);
    
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
 * POST /api/scheme-sahayak/artisans
 * Create a new artisan profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.personalInfo || !body.location || !body.business || !body.preferences) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Missing required fields: personalInfo, location, business, preferences', 
            code: 'VALIDATION_ERROR' 
          } 
        },
        { status: 400 }
      );
    }

    const userService = getUserService();
    const artisanId = await userService.createArtisanProfile(body);

    return NextResponse.json({
      success: true,
      data: { id: artisanId },
      message: 'Artisan profile created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/scheme-sahayak/artisans error:', error);
    
    const statusCode = error instanceof Error && error.message.includes('already exists') ? 409 : 500;
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: statusCode === 409 ? 'ARTISAN_EXISTS' : 'INTERNAL_ERROR'
        }
      },
      { status: statusCode }
    );
  }
}

/**
 * PUT /api/scheme-sahayak/artisans
 * Update an existing artisan profile
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ID' } },
        { status: 400 }
      );
    }

    const userService = getUserService();
    
    // Check if artisan exists
    const existingArtisan = await userService.getArtisanProfile(id);
    if (!existingArtisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    await userService.updateArtisanProfile(id, updates);

    return NextResponse.json({
      success: true,
      message: 'Artisan profile updated successfully'
    });

  } catch (error) {
    console.error('PUT /api/scheme-sahayak/artisans error:', error);
    
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
 * DELETE /api/scheme-sahayak/artisans
 * Delete an artisan profile
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ID' } },
        { status: 400 }
      );
    }

    const userService = getUserService();
    
    // Check if artisan exists
    const existingArtisan = await userService.getArtisanProfile(id);
    if (!existingArtisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    await userService.deleteArtisanProfile(id);

    return NextResponse.json({
      success: true,
      message: 'Artisan profile deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/scheme-sahayak/artisans error:', error);
    
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