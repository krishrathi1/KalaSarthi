import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryTracker } from '../../../../../../../lib/services/notifications/DeliveryTracker';
import { handleGupshupError } from '../../../../../../../lib/services/notifications/GupshupErrorHandler';

/**
 * Get notification history for a specific user
 * GET /api/notifications/gupshup/users/[userId]/history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User ID is required' 
        },
        { status: 400 }
      );
    }

    // Validate limit parameter
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 1000)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Limit must be a number between 1 and 1000' 
        },
        { status: 400 }
      );
    }

    // Get delivery tracker
    const deliveryTracker = getDeliveryTracker();
    
    // Get user notification history
    const history = await deliveryTracker.getUserNotificationHistory(userId, limit);

    return NextResponse.json({
      success: true,
      userId,
      history,
      retrievedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Get user notification history error:', error);
    
    const gupshupError = handleGupshupError(error, { 
      source: 'user_history_endpoint',
      userId: params?.userId 
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