import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryTracker } from '../../../../../../lib/services/notifications/DeliveryTracker';
import { handleGupshupError } from '../../../../../../lib/services/notifications/GupshupErrorHandler';

/**
 * Get delivery status for a specific message
 * GET /api/notifications/gupshup/status/[messageId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const { messageId } = params;

    if (!messageId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message ID is required' 
        },
        { status: 400 }
      );
    }

    // Get delivery tracker
    const deliveryTracker = getDeliveryTracker();
    
    // Get delivery status
    const deliveryStatus = deliveryTracker.getDeliveryStats();
    
    // Get delivery timeline
    const timeline = await deliveryTracker.getDeliveryTimeline(messageId);

    return NextResponse.json({
      success: true,
      messageId,
      timeline,
      retrievedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Get delivery status error:', error);
    
    const gupshupError = handleGupshupError(error, { 
      source: 'status_endpoint',
      messageId: params?.messageId 
    });
    
    return NextResponse.json(
      {
        success: false,
        error: gupshupError.message,
        code: gupshupError.code,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}