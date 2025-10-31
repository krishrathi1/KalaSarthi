import { NextRequest, NextResponse } from 'next/server';
import { getGupshupService } from '../../../../../lib/services/notifications/GupshupService';

/**
 * Test endpoint for Gupshup WhatsApp integration
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phone') || '+919876543210';
    const templateName = searchParams.get('template') || 'scheme_alert';
    const language = searchParams.get('language') || 'en';

    // Get Gupshup service
    const gupshupService = getGupshupService();

    // Test template retrieval
    const template = await gupshupService.getTemplate(templateName, language);
    
    // Test WhatsApp message sending
    const messageParams = {
      to: phoneNumber,
      templateName: templateName,
      templateParams: {
        '1': 'PM Vishwakarma Scheme',
        '2': '95',
        '3': '31st December 2024',
      },
      language: language,
    };

    const result = await gupshupService.sendWhatsAppMessage(messageParams);

    // Get delivery stats
    const deliveryStats = gupshupService.getDeliveryStats();
    const templateCacheStats = gupshupService.getTemplateCacheStats();

    return NextResponse.json({
      success: true,
      message: 'Gupshup WhatsApp integration test completed',
      data: {
        template: {
          name: template.name,
          language: template.language,
          status: template.status,
          componentCount: template.components.length,
        },
        messageResult: {
          messageId: result.messageId,
          status: result.status,
          timestamp: result.timestamp,
        },
        stats: {
          delivery: deliveryStats,
          templateCache: templateCacheStats,
        },
      },
    });

  } catch (error: any) {
    console.error('Gupshup test error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Test failed',
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, templateName, templateParams, language = 'en' } = body;

    if (!phoneNumber || !templateName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'phoneNumber and templateName are required' 
        },
        { status: 400 }
      );
    }

    // Get Gupshup service
    const gupshupService = getGupshupService();

    // Send WhatsApp message
    const result = await gupshupService.sendWhatsAppMessage({
      to: phoneNumber,
      templateName,
      templateParams: templateParams || {},
      language,
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: {
        messageId: result.messageId,
        status: result.status,
        timestamp: result.timestamp,
        to: phoneNumber,
        template: templateName,
      },
    });

  } catch (error: any) {
    console.error('Gupshup send message error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send message',
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}