/**
 * Webhook endpoint for receiving application status updates from government portals
 * Requirement 3.1: Real-time application tracking via webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortalIntegrationService } from '@/lib/services/scheme-sahayak/PortalIntegrationService';
import type { WebhookPayload } from '@/lib/services/scheme-sahayak/PortalIntegrationService';

const portalIntegration = new PortalIntegrationService();

/**
 * POST /api/webhooks/application-status
 * Handle incoming webhooks from government portals
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from headers
    const signature = request.headers.get('x-webhook-signature') || '';
    
    // Parse webhook payload
    const payload: WebhookPayload = await request.json();

    // Validate required fields
    if (!payload.event || !payload.portalName || !payload.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid webhook payload'
        },
        { status: 400 }
      );
    }

    // Process webhook
    const result = await portalIntegration.handleWebhook(payload, signature);

    // Return success response
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);

    return NextResponse.json(
      {
        success: false,
        processed: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/application-status
 * Webhook verification endpoint (for some government portals)
 */
export async function GET(request: NextRequest) {
  // Some government portals send a verification challenge
  const challenge = request.nextUrl.searchParams.get('challenge');
  
  if (challenge) {
    return NextResponse.json({ challenge }, { status: 200 });
  }

  return NextResponse.json(
    {
      message: 'Webhook endpoint is active',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}
