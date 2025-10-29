/**
 * API Routes for Privacy Controls and Data Management
 * Handles consent management, data deletion, and privacy settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '../../../../../lib/services/scheme-sahayak';

/**
 * Privacy Consent Interface
 */
interface PrivacyConsent {
  dataProcessing: {
    granted: boolean;
    grantedAt?: Date;
    purpose: string[];
  };
  analytics: {
    granted: boolean;
    grantedAt?: Date;
    anonymized: boolean;
  };
  marketing: {
    granted: boolean;
    grantedAt?: Date;
    channels: string[];
  };
  thirdPartySharing: {
    granted: boolean;
    grantedAt?: Date;
    partners: string[];
  };
  locationTracking: {
    granted: boolean;
    grantedAt?: Date;
    precision: 'exact' | 'approximate' | 'city' | 'state';
  };
}

/**
 * Data Export Interface
 */
interface DataExportRequest {
  artisanId: string;
  requestedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  format: 'json' | 'csv' | 'pdf';
  includeDocuments: boolean;
}

/**
 * GET /api/scheme-sahayak/artisans/privacy
 * Get privacy settings and consent status
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
    
    // Check if artisan exists
    const artisan = await userService.getArtisanProfile(artisanId);
    if (!artisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Default privacy consent (in production, this would be stored in a separate collection)
    const privacyConsent: PrivacyConsent = {
      dataProcessing: {
        granted: true,
        grantedAt: artisan.createdAt,
        purpose: ['scheme_recommendations', 'application_processing', 'profile_management']
      },
      analytics: {
        granted: false,
        anonymized: true
      },
      marketing: {
        granted: false,
        channels: []
      },
      thirdPartySharing: {
        granted: false,
        partners: []
      },
      locationTracking: {
        granted: true,
        grantedAt: artisan.createdAt,
        precision: 'city'
      }
    };

    const dataRetention = {
      profileData: '7 years',
      applicationData: '10 years',
      documents: '7 years',
      analytics: '2 years',
      nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    };

    return NextResponse.json({
      success: true,
      data: {
        artisanId,
        consent: privacyConsent,
        dataRetention,
        rights: {
          dataPortability: true,
          dataRectification: true,
          dataErasure: true,
          restrictProcessing: true,
          objectProcessing: true
        },
        lastUpdated: artisan.updatedAt
      }
    });

  } catch (error) {
    console.error('GET /api/scheme-sahayak/artisans/privacy error:', error);
    
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
 * PUT /api/scheme-sahayak/artisans/privacy
 * Update privacy consent and settings
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId, consent } = body;

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    if (!consent || typeof consent !== 'object') {
      return NextResponse.json(
        { success: false, error: { message: 'Consent object is required', code: 'MISSING_CONSENT' } },
        { status: 400 }
      );
    }

    const userService = getUserService();
    
    // Check if artisan exists
    const artisan = await userService.getArtisanProfile(artisanId);
    if (!artisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Validate consent changes
    const now = new Date();
    const updatedConsent = { ...consent };

    // Add timestamps for newly granted consents
    Object.keys(updatedConsent).forEach(key => {
      if (updatedConsent[key].granted && !updatedConsent[key].grantedAt) {
        updatedConsent[key].grantedAt = now;
      }
    });

    // In production, store consent in a separate privacy_consents collection
    // For now, we'll just acknowledge the update

    // Log consent changes for audit trail
    console.log(`Privacy consent updated for artisan ${artisanId}:`, {
      artisanId,
      updatedConsent,
      timestamp: now.toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Privacy consent updated successfully',
      data: {
        artisanId,
        updatedAt: now.toISOString(),
        consentUpdated: Object.keys(consent)
      }
    });

  } catch (error) {
    console.error('PUT /api/scheme-sahayak/artisans/privacy error:', error);
    
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
 * POST /api/scheme-sahayak/artisans/privacy/export
 * Request data export (GDPR compliance)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId, format = 'json', includeDocuments = false } = body;

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    const validFormats = ['json', 'csv', 'pdf'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid format. Must be json, csv, or pdf', code: 'INVALID_FORMAT' } },
        { status: 400 }
      );
    }

    const userService = getUserService();
    
    // Check if artisan exists
    const artisan = await userService.getArtisanProfile(artisanId);
    if (!artisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Create data export request
    const exportRequest: DataExportRequest = {
      artisanId,
      requestedAt: new Date(),
      status: 'pending',
      format: format as 'json' | 'csv' | 'pdf',
      includeDocuments
    };

    // In production, this would:
    // 1. Queue a background job to collect all user data
    // 2. Generate the export file
    // 3. Store it securely with expiration
    // 4. Send notification when ready

    const requestId = `export_${artisanId}_${Date.now()}`;

    // Mock processing - in reality this would be async
    setTimeout(() => {
      console.log(`Data export completed for request ${requestId}`);
    }, 5000);

    return NextResponse.json({
      success: true,
      message: 'Data export request submitted successfully',
      data: {
        requestId,
        status: 'pending',
        estimatedCompletionTime: '5-10 minutes',
        format,
        includeDocuments,
        requestedAt: exportRequest.requestedAt.toISOString()
      }
    });

  } catch (error) {
    console.error('POST /api/scheme-sahayak/artisans/privacy/export error:', error);
    
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
 * DELETE /api/scheme-sahayak/artisans/privacy
 * Request data deletion (Right to be forgotten)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');
    const confirmDeletion = searchParams.get('confirm') === 'true';

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    if (!confirmDeletion) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Deletion confirmation is required. Add ?confirm=true to proceed.', 
            code: 'CONFIRMATION_REQUIRED' 
          } 
        },
        { status: 400 }
      );
    }

    const userService = getUserService();
    
    // Check if artisan exists
    const artisan = await userService.getArtisanProfile(artisanId);
    if (!artisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    // In production, this would:
    // 1. Check for any legal obligations to retain data
    // 2. Anonymize data that must be kept for legal reasons
    // 3. Schedule complete deletion of personal data
    // 4. Send confirmation to user
    // 5. Update audit logs

    // For now, we'll use the existing delete method
    await userService.deleteArtisanProfile(artisanId);

    // Log deletion for audit trail
    console.log(`Data deletion completed for artisan ${artisanId}:`, {
      artisanId,
      deletedAt: new Date().toISOString(),
      reason: 'user_request'
    });

    return NextResponse.json({
      success: true,
      message: 'Data deletion completed successfully',
      data: {
        artisanId,
        deletedAt: new Date().toISOString(),
        dataRetained: {
          anonymizedAnalytics: false,
          legalRequirements: false
        }
      }
    });

  } catch (error) {
    console.error('DELETE /api/scheme-sahayak/artisans/privacy error:', error);
    
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