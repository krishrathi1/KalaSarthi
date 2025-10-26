import { NextRequest, NextResponse } from 'next/server';
import { UnifiedNotificationService } from '@/lib/service/UnifiedNotificationService';

interface NotificationRequest {
  type: 'finance_alert' | 'loan_status' | 'payment_reminder' | 'document_request';
  recipient: {
    userId: string;
    email?: string;
    phone?: string;
    deviceToken?: string;
    preferences: {
      email: boolean;
      sms: boolean;
      push: boolean;
      inApp: boolean;
    };
  };
  data: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: NotificationRequest = await request.json();
    const { type, recipient, data } = body;

    console.log(`🔔 Sending ${type} notification to user ${recipient.userId}`);

    let result;

    switch (type) {
      case 'finance_alert':
        result = await UnifiedNotificationService.sendFinanceAlert(
          recipient,
          data.alertType,
          data.alertData
        );
        break;

      case 'loan_status':
        result = await UnifiedNotificationService.sendLoanStatusUpdate(
          recipient,
          data.applicationId,
          data.oldStatus,
          data.newStatus,
          data.additionalData
        );
        break;

      case 'payment_reminder':
        result = await UnifiedNotificationService.sendPaymentReminder(
          recipient,
          data.amount,
          new Date(data.dueDate),
          data.loanId
        );
        break;

      case 'document_request':
        result = await UnifiedNotificationService.sendDocumentRequest(
          recipient,
          data.applicationId,
          data.requiredDocuments
        );
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid notification type'
        }, { status: 400 });
    }

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }

  } catch (error: any) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 });
    }

    // In a real implementation, you'd fetch user notifications from database
    // For now, return a placeholder response
    const mockNotifications = [
      {
        id: '1',
        type: type || 'general',
        title: 'Sample Notification',
        message: 'This is a sample notification',
        timestamp: new Date(),
        read: false
      }
    ];

    return NextResponse.json({
      success: true,
      notifications: mockNotifications
    });

  } catch (error: any) {
    console.error('Notification GET API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
