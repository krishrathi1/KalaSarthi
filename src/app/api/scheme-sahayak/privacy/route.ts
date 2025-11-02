/**
 * Privacy Management API Routes
 * Handles privacy settings, consent management, and data deletion requests
 * Requirements: 9.4, 9.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { privacyManagementService, ConsentType } from '@/lib/services/scheme-sahayak/PrivacyManagementService';
import { tlsConfigService } from '@/lib/services/scheme-sahayak/TLSConfig';

/**
 * GET /api/scheme-sahayak/privacy
 * Get privacy settings for a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400, headers: tlsConfigService.getSecurityHeaders() }
      );
    }

    const settings = await privacyManagementService.getPrivacySettings(userId);

    if (!settings) {
      return NextResponse.json(
        { error: 'Privacy settings not found' },
        { status: 404, headers: tlsConfigService.getSecurityHeaders() }
      );
    }

    return NextResponse.json(
      { success: true, data: settings },
      { headers: tlsConfigService.getSecurityHeaders() }
    );
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings' },
      { status: 500, headers: tlsConfigService.getSecurityHeaders() }
    );
  }
}

/**
 * POST /api/scheme-sahayak/privacy
 * Initialize or update privacy settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, ...data } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400, headers: tlsConfigService.getSecurityHeaders() }
      );
    }

    switch (action) {
      case 'initialize':
        await privacyManagementService.initializePrivacySettings(userId, data.consents);
        return NextResponse.json(
          { success: true, message: 'Privacy settings initialized' },
          { headers: tlsConfigService.getSecurityHeaders() }
        );

      case 'updateConsent':
        if (!data.consentType || typeof data.granted !== 'boolean') {
          return NextResponse.json(
            { error: 'Consent type and granted status are required' },
            { status: 400, headers: tlsConfigService.getSecurityHeaders() }
          );
        }

        await privacyManagementService.updateConsent(
          userId,
          data.consentType as ConsentType,
          data.granted,
          {
            ipAddress: request.headers.get('x-forwarded-for') || (request as any).ip,
            userAgent: request.headers.get('user-agent') || undefined
          }
        );

        return NextResponse.json(
          { success: true, message: 'Consent updated' },
          { headers: tlsConfigService.getSecurityHeaders() }
        );

      case 'updateConsents':
        if (!data.consents) {
          return NextResponse.json(
            { error: 'Consents object is required' },
            { status: 400, headers: tlsConfigService.getSecurityHeaders() }
          );
        }

        await privacyManagementService.updateConsents(
          userId,
          data.consents,
          {
            ipAddress: request.headers.get('x-forwarded-for') || (request as any).ip,
            userAgent: request.headers.get('user-agent') || undefined
          }
        );

        return NextResponse.json(
          { success: true, message: 'Consents updated' },
          { headers: tlsConfigService.getSecurityHeaders() }
        );

      case 'requestDeletion':
        const requestId = await privacyManagementService.requestDataDeletion(
          userId,
          data.requestType || 'full',
          data.dataTypes,
          data.reason
        );

        return NextResponse.json(
          {
            success: true,
            message: 'Data deletion requested',
            requestId,
            scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          },
          { headers: tlsConfigService.getSecurityHeaders() }
        );

      case 'cancelDeletion':
        if (!data.requestId) {
          return NextResponse.json(
            { error: 'Request ID is required' },
            { status: 400, headers: tlsConfigService.getSecurityHeaders() }
          );
        }

        await privacyManagementService.cancelDataDeletion(userId, data.requestId);

        return NextResponse.json(
          { success: true, message: 'Data deletion cancelled' },
          { headers: tlsConfigService.getSecurityHeaders() }
        );

      case 'exportData':
        const exportedData = await privacyManagementService.exportUserData(userId);

        return NextResponse.json(
          {
            success: true,
            message: 'Data exported',
            data: exportedData
          },
          { headers: tlsConfigService.getSecurityHeaders() }
        );

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400, headers: tlsConfigService.getSecurityHeaders() }
        );
    }
  } catch (error) {
    console.error('Error processing privacy request:', error);
    return NextResponse.json(
      { error: 'Failed to process privacy request' },
      { status: 500, headers: tlsConfigService.getSecurityHeaders() }
    );
  }
}

/**
 * DELETE /api/scheme-sahayak/privacy
 * Check consent status
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const consentType = searchParams.get('consentType');

    if (!userId || !consentType) {
      return NextResponse.json(
        { error: 'User ID and consent type are required' },
        { status: 400, headers: tlsConfigService.getSecurityHeaders() }
      );
    }

    const hasConsent = await privacyManagementService.hasConsent(
      userId,
      consentType as ConsentType
    );

    return NextResponse.json(
      { success: true, hasConsent },
      { headers: tlsConfigService.getSecurityHeaders() }
    );
  } catch (error) {
    console.error('Error checking consent:', error);
    return NextResponse.json(
      { error: 'Failed to check consent' },
      { status: 500, headers: tlsConfigService.getSecurityHeaders() }
    );
  }
}
