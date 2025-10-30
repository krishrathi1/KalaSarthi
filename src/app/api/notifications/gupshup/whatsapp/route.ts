import { NextRequest, NextResponse } from 'next/server';
import { getGupshupService } from '../../../../../lib/services/notifications/GupshupService';
import { handleGupshupError } from '../../../../../lib/services/notifications/GupshupErrorHandler';

/**
 * Gupshup WhatsApp Notification API
 * Sends WhatsApp messages using Gupshup Business API with template support
 */

interface WhatsAppNotificationRequest {
  phoneNumber: string;
  templateName: string;
  templateParams?: Record<string, string>;
  language?: string;
  messageType?: 'template' | 'text';
  priority?: 'high' | 'medium' | 'low';
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      phoneNumber, 
      templateName, 
      templateParams = {}, 
      language = 'en',
      messageType = 'template',
      priority = 'medium',
      userId 
    } = body as WhatsAppNotificationRequest;

    // Validate required fields
    if (!phoneNumber) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'phoneNumber is required' 
        },
        { status: 400 }
      );
    }

    if (!templateName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'templateName is required' 
        },
        { status: 400 }
      );
    }

    // Get Gupshup service instance
    const gupshupService = getGupshupService();
    
    // Send WhatsApp message
    const result = await gupshupService.sendWhatsAppMessage({
      to: phoneNumber,
      templateName,
      templateParams,
      language,
      messageType,
      priority,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: {
        messageId: result.messageId,
        status: result.status,
        timestamp: result.timestamp,
        to: phoneNumber,
        template: templateName,
        language,
        sentAt: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('Gupshup WhatsApp notification error:', error);
    
    // Handle Gupshup-specific errors
    const gupshupError = handleGupshupError(error, { 
      source: 'whatsapp_endpoint',
      url: request.url 
    });
    
    return NextResponse.json(
      {
        success: false,
        error: gupshupError.message,
        code: gupshupError.code,
        category: gupshupError.category,
        retryable: gupshupError.isRetryable,
        timestamp: new Date().toISOString(),
      },
      { status: gupshupError.httpStatus || 500 }
    );
  }
}

/**
 * GET endpoint for WhatsApp notification testing and status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'test';

    const gupshupService = getGupshupService();

    switch (action) {
      case 'test':
        // Send a test message
        const testPhone = searchParams.get('phone') || '+919876543210';
        const testTemplate = searchParams.get('template') || 'scheme_alert';
        const testLanguage = searchParams.get('language') || 'en';

        const testResult = await gupshupService.sendWhatsAppMessage({
          to: testPhone,
          templateName: testTemplate,
          templateParams: {
            '1': 'Test Scheme',
            '2': '90',
            '3': 'Today',
          },
          language: testLanguage,
        });

        return NextResponse.json({
          success: true,
          message: 'Test WhatsApp message sent',
          data: testResult,
        });

      case 'templates':
        // Get available templates
        const templates = await gupshupService.getApprovedTemplates();
        return NextResponse.json({
          success: true,
          message: 'Available templates retrieved',
          data: {
            templates: templates.map(t => ({
              name: t.name,
              language: t.language,
              category: t.category,
              status: t.status,
            })),
            count: templates.length,
          },
        });

      case 'stats':
        // Get delivery statistics
        const deliveryStats = gupshupService.getDeliveryStats();
        const rateLimitInfo = gupshupService.getWhatsAppRateLimit();
        const cacheStats = gupshupService.getTemplateCacheStats();

        return NextResponse.json({
          success: true,
          message: 'WhatsApp service statistics',
          data: {
            delivery: deliveryStats,
            rateLimit: rateLimitInfo,
            templateCache: cacheStats,
            timestamp: new Date().toISOString(),
          },
        });

      case 'sync':
        // Synchronize templates
        const syncResult = await gupshupService.syncTemplates();
        return NextResponse.json({
          success: true,
          message: 'Templates synchronized successfully',
          data: syncResult,
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'Gupshup WhatsApp API is operational',
          availableActions: ['test', 'templates', 'stats', 'sync'],
          timestamp: new Date().toISOString(),
        });
    }

  } catch (error: any) {
    console.error('Gupshup WhatsApp GET error:', error);
    
    const gupshupError = handleGupshupError(error, { 
      source: 'whatsapp_get_endpoint',
      url: request.url 
    });
    
    return NextResponse.json(
      {
        success: false,
        error: gupshupError.message,
        code: gupshupError.code,
        timestamp: new Date().toISOString(),
      },
      { status: gupshupError.httpStatus || 500 }
    );
  }
}