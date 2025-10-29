import { NextRequest, NextResponse } from 'next/server';

/**
 * WhatsApp Notification API
 * Sends AI-generated notifications via WhatsApp
 */

interface WhatsAppNotification {
  phoneNumber: string;
  message: string;
  schemeUrl?: string;
  notificationType: 'new_scheme' | 'deadline' | 'document_reminder' | 'application_update';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, message, schemeUrl, notificationType } = body as WhatsAppNotification;

    // Validate phone number
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      return NextResponse.json(
        { success: false, error: 'Valid phone number with country code required (e.g., +918630365222)' },
        { status: 400 }
      );
    }

    // For demo mode - log the notification
    console.log('📱 WhatsApp Notification:', {
      to: phoneNumber,
      type: notificationType,
      message,
      url: schemeUrl
    });

    // Check if Twilio credentials are configured
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      // Demo mode - simulate successful send
      return NextResponse.json({
        success: true,
        mode: 'demo',
        message: 'WhatsApp notification simulated (Twilio not configured)',
        data: {
          to: phoneNumber,
          message,
          schemeUrl,
          sentAt: new Date().toISOString()
        }
      });
    }

    // Real Twilio integration
    const twilio = require('twilio');
    const client = twilio(twilioAccountSid, twilioAuthToken);

    const fullMessage = schemeUrl 
      ? `${message}\n\n🔗 Apply here: ${schemeUrl}`
      : message;

    const result = await client.messages.create({
      from: `whatsapp:${twilioWhatsAppNumber}`,
      to: `whatsapp:${phoneNumber}`,
      body: fullMessage
    });

    return NextResponse.json({
      success: true,
      mode: 'production',
      message: 'WhatsApp notification sent successfully',
      data: {
        messageId: result.sid,
        to: phoneNumber,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('WhatsApp notification error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send WhatsApp notification'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to test WhatsApp notifications
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phoneNumber = searchParams.get('phone') || '+918630365222';

  // Generate AI notification
  const testMessage = `🎯 *New Scheme Alert!*

PM Vishwakarma Scheme is now available for you!

✅ 95% Match Score
💰 Loan: ₹1L - ₹3L
📊 Success Probability: 87%

Your profile matches perfectly with this scheme. Apply now for best results!`;

  // Send test notification
  const response = await fetch(`${request.nextUrl.origin}/api/notifications/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber,
      message: testMessage,
      schemeUrl: 'https://pmvishwakarma.gov.in/',
      notificationType: 'new_scheme'
    })
  });

  const result = await response.json();

  return NextResponse.json({
    success: true,
    testMessage,
    result
  });
}
