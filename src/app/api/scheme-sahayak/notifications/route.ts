/**
 * Smart Notification System API Routes
 * Handles notification sending, scheduling, and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  smartNotificationSystem,
  notificationContentGenerator,
  notificationTimingOptimizer
} from '@/lib/services/scheme-sahayak';
import { SmartNotification } from '@/lib/types/scheme-sahayak';

/**
 * POST /api/scheme-sahayak/notifications
 * Send a notification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'send':
        return await handleSendNotification(data);
      
      case 'schedule':
        return await handleScheduleNotification(data);
      
      case 'generate':
        return await handleGenerateNotification(data);
      
      case 'schedule-deadline-reminders':
        return await handleScheduleDeadlineReminders(data);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process notification request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scheme-sahayak/notifications
 * Get notification history or analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'history':
        const limit = parseInt(searchParams.get('limit') || '50');
        const history = await smartNotificationSystem.getNotificationHistory(userId, limit);
        return NextResponse.json({ success: true, notifications: history });
      
      case 'analytics':
        const analytics = await smartNotificationSystem.getDeliveryAnalytics(userId);
        return NextResponse.json({ success: true, analytics });
      
      case 'preferences':
        const preferences = await getUserPreferences(userId);
        return NextResponse.json({ success: true, preferences });
      
      case 'active-reminders':
        const reminders = await notificationTimingOptimizer.getActiveReminders(userId);
        return NextResponse.json({ success: true, reminders });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch notification data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/scheme-sahayak/notifications
 * Update notification preferences or mark as read
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, ...data } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'update-preferences':
        await smartNotificationSystem.updatePreferences(userId, data.preferences);
        return NextResponse.json({ 
          success: true, 
          message: 'Preferences updated successfully' 
        });
      
      case 'mark-read':
        if (!data.notificationId) {
          return NextResponse.json(
            { error: 'notificationId is required' },
            { status: 400 }
          );
        }
        await smartNotificationSystem.markAsRead(data.notificationId, userId);
        return NextResponse.json({ 
          success: true, 
          message: 'Notification marked as read' 
        });
      
      case 'update-engagement':
        if (!data.notificationId || !data.action) {
          return NextResponse.json(
            { error: 'notificationId and action are required' },
            { status: 400 }
          );
        }
        await notificationTimingOptimizer.updateEngagementPattern(
          userId,
          data.notificationId,
          data.action,
          new Date()
        );
        return NextResponse.json({ 
          success: true, 
          message: 'Engagement pattern updated' 
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update notification data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scheme-sahayak/notifications
 * Cancel scheduled notification
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('notificationId');
    const userId = searchParams.get('userId');
    const schemeId = searchParams.get('schemeId');
    const action = searchParams.get('action');

    if (action === 'cancel-reminders' && userId && schemeId) {
      await notificationTimingOptimizer.cancelDeadlineReminders(userId, schemeId);
      return NextResponse.json({ 
        success: true, 
        message: 'Deadline reminders cancelled' 
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      );
    }

    await smartNotificationSystem.cancelScheduledNotification(notificationId);
    return NextResponse.json({ 
      success: true, 
      message: 'Notification cancelled successfully' 
    });
  } catch (error) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cancel notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Handle send notification request
 */
async function handleSendNotification(data: any) {
  const { notification } = data;

  if (!notification || !notification.userId) {
    return NextResponse.json(
      { error: 'Invalid notification data' },
      { status: 400 }
    );
  }

  // Check for duplicates
  const isDuplicate = await notificationTimingOptimizer.deduplicateNotifications(
    notification.userId,
    notification
  );

  if (isDuplicate) {
    return NextResponse.json({
      success: true,
      message: 'Duplicate notification detected, skipped',
      skipped: true
    });
  }

  const result = await smartNotificationSystem.sendNotification(notification);

  return NextResponse.json({
    success: result.overallSuccess,
    result
  });
}

/**
 * Handle schedule notification request
 */
async function handleScheduleNotification(data: any) {
  const { notification, scheduledFor } = data;

  if (!notification || !scheduledFor) {
    return NextResponse.json(
      { error: 'notification and scheduledFor are required' },
      { status: 400 }
    );
  }

  const notificationId = await smartNotificationSystem.scheduleNotification(
    notification,
    new Date(scheduledFor)
  );

  return NextResponse.json({
    success: true,
    notificationId,
    message: 'Notification scheduled successfully'
  });
}

/**
 * Handle generate notification request
 */
async function handleGenerateNotification(data: any) {
  const { userId, type, context } = data;

  if (!userId || !type) {
    return NextResponse.json(
      { error: 'userId and type are required' },
      { status: 400 }
    );
  }

  const notification = await notificationContentGenerator.generatePersonalizedNotification(
    userId,
    type,
    context || {}
  );

  return NextResponse.json({
    success: true,
    notification
  });
}

/**
 * Handle schedule deadline reminders request
 */
async function handleScheduleDeadlineReminders(data: any) {
  const { userId, schemeId, schemeName, deadline } = data;

  if (!userId || !schemeId || !schemeName || !deadline) {
    return NextResponse.json(
      { error: 'userId, schemeId, schemeName, and deadline are required' },
      { status: 400 }
    );
  }

  const reminderId = await notificationTimingOptimizer.scheduleDeadlineReminders(
    userId,
    schemeId,
    schemeName,
    new Date(deadline)
  );

  return NextResponse.json({
    success: true,
    reminderId,
    message: 'Deadline reminders scheduled successfully'
  });
}

/**
 * Get user notification preferences (mock implementation)
 */
async function getUserPreferences(userId: string) {
  // This would fetch from database in production
  return {
    channels: {
      sms: true,
      email: true,
      push: true,
      whatsapp: false
    },
    timing: {
      preferredHours: [9, 18],
      timezone: 'Asia/Kolkata',
      frequency: 'immediate'
    },
    types: {
      newSchemes: true,
      deadlineReminders: true,
      statusUpdates: true,
      documentRequests: true,
      rejectionNotices: true
    }
  };
}
