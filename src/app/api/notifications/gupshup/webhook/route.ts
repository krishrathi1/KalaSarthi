import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryTracker } from '../../../../../lib/services/notifications/DeliveryTracker';
import { getWebhookProcessor } from '../../../../../lib/services/notifications/WebhookProcessor';
import { handleGupshupError } from '../../../../../lib/services/notifications/GupshupErrorHandler';

/**
 * Enhanced Gupshup Webhook Handler
 * Processes delivery status updates with security validation and real-time updates
 */

export async function POST(request: NextRequest) {
  try {
    // Parse request data
    const payload = await request.json();
    const headers = Object.fromEntries(request.headers.entries());
    const sourceIP = request.ip || 
                    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    request.headers.get('x-real-ip') ||
                    'unknown';

    // Get webhook processor with delivery tracker
    const deliveryTracker = getDeliveryTracker();
    const webhookProcessor = getWebhookProcessor(deliveryTracker);
    
    // Process the webhook with full security validation
    const result = await webhookProcessor.processWebhook(payload, headers, sourceIP);

    // Return appropriate response based on processing result
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Webhook processed successfully',
        messageId: result.messageId,
        status: result.status,
        processedAt: result.processedAt.toISOString(),
        processingTime: result.processingTime,
        hasRealTimeUpdate: !!result.realTimeUpdate,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Webhook processing failed',
          messageId: result.messageId,
          status: result.status,
          processedAt: result.processedAt.toISOString(),
          processingTime: result.processingTime,
        },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Gupshup webhook processing error:', error);
    
    // Handle Gupshup-specific errors
    const gupshupError = handleGupshupError(error, { 
      source: 'webhook_endpoint',
      url: request.url 
    });
    
    return NextResponse.json(
      {
        success: false,
        error: gupshupError.message,
        code: gupshupError.code,
        timestamp: new Date().toISOString(),
        processingTime: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for webhook verification (if required by Gupshup)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');
  
  // Verify token if provided
  const expectedToken = process.env.GUPSHUP_WEBHOOK_VERIFY_TOKEN;
  if (expectedToken && verifyToken !== expectedToken) {
    return NextResponse.json(
      { error: 'Invalid verify token' },
      { status: 403 }
    );
  }

  // Return challenge for webhook verification
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Return webhook info
  return NextResponse.json({
    webhook: 'Gupshup Notification System',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}