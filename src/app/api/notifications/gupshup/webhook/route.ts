import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryTracker } from '../../../../../lib/services/notifications/DeliveryTracker';
import { getWebhookProcessor } from '../../../../../lib/services/notifications/WebhookProcessor';
import { handleGupshupError } from '../../../../../lib/services/notifications/GupshupErrorHandler';
import { getGupshupConfig } from '../../../../../lib/config/gupshup-config';

/**
 * Enhanced Gupshup Webhook Handler - Production Ready
 * Processes delivery status updates with security validation and real-time updates
 * Includes production-specific security, rate limiting, and monitoring
 */

// Production security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// Rate limiting for webhook endpoint (simple in-memory for now)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 1000; // Max requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = ip;
  const current = rateLimitMap.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  current.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Extract source IP for security and rate limiting
    const sourceIP = (request as any).ip || 
                    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    request.headers.get('x-real-ip') ||
                    'unknown';

    // Production rate limiting
    if (!checkRateLimit(sourceIP)) {
      console.warn(`Rate limit exceeded for IP: ${sourceIP}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded',
          retryAfter: 60 
        },
        { 
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            'Retry-After': '60',
          }
        }
      );
    }

    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid content type. Expected application/json' 
        },
        { 
          status: 400,
          headers: SECURITY_HEADERS
        }
      );
    }

    // Parse request data with size limit
    let payload;
    try {
      const text = await request.text();
      if (text.length > 10000) { // 10KB limit
        throw new Error('Payload too large');
      }
      payload = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON payload' 
        },
        { 
          status: 400,
          headers: SECURITY_HEADERS
        }
      );
    }

    const headers = Object.fromEntries(request.headers.entries());

    // Get webhook processor with delivery tracker
    const deliveryTracker = getDeliveryTracker();
    const webhookProcessor = getWebhookProcessor(deliveryTracker);
    
    // Process the webhook with full security validation
    const result = await webhookProcessor.processWebhook(payload, headers, sourceIP);

    // Return appropriate response based on processing result
    const totalProcessingTime = Date.now() - startTime;
    
    if (result.success) {
      // Log successful webhook processing for monitoring
      console.log('Webhook processed successfully', {
        messageId: result.messageId,
        status: result.status,
        processingTime: totalProcessingTime,
        sourceIP: sourceIP.includes('.') ? sourceIP.split('.').slice(0, 2).join('.') + '.xxx.xxx' : 'masked',
      });

      return NextResponse.json({
        success: true,
        message: 'Webhook processed successfully',
        messageId: result.messageId,
        status: result.status,
        processedAt: result.processedAt.toISOString(),
        processingTime: totalProcessingTime,
        hasRealTimeUpdate: !!result.realTimeUpdate,
      }, {
        headers: SECURITY_HEADERS
      });
    } else {
      // Log failed webhook processing for monitoring
      console.warn('Webhook processing failed', {
        messageId: result.messageId,
        error: result.error,
        processingTime: totalProcessingTime,
        sourceIP: sourceIP.includes('.') ? sourceIP.split('.').slice(0, 2).join('.') + '.xxx.xxx' : 'masked',
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Webhook processing failed',
          messageId: result.messageId,
          status: result.status,
          processedAt: result.processedAt.toISOString(),
          processingTime: totalProcessingTime,
        },
        { 
          status: 400,
          headers: SECURITY_HEADERS
        }
      );
    }

  } catch (error: any) {
    const totalProcessingTime = Date.now() - startTime;
    
    // Log error for monitoring and alerting
    console.error('Gupshup webhook processing error:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      processingTime: totalProcessingTime,
      timestamp: new Date().toISOString(),
    });
    
    // Handle Gupshup-specific errors
    const gupshupError = handleGupshupError(error, { 
      source: 'webhook_endpoint',
      url: request.url,
      processingTime: totalProcessingTime,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: gupshupError.message,
        code: gupshupError.code,
        timestamp: new Date().toISOString(),
        processingTime: totalProcessingTime,
      },
      { 
        status: 500,
        headers: SECURITY_HEADERS
      }
    );
  }
}

/**
 * GET endpoint for webhook verification and health check (Production Ready)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = searchParams.get('hub.verify_token');
    
    // Verify token if provided (for webhook verification)
    const expectedToken = process.env.GUPSHUP_WEBHOOK_VERIFY_TOKEN;
    if (expectedToken && verifyToken && verifyToken !== expectedToken) {
      console.warn('Invalid webhook verify token received', {
        providedToken: verifyToken.substring(0, 8) + '...',
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json(
        { error: 'Invalid verify token' },
        { 
          status: 403,
          headers: SECURITY_HEADERS
        }
      );
    }

    // Return challenge for webhook verification (Gupshup requirement)
    if (challenge) {
      console.log('Webhook verification challenge received', {
        challenge: challenge.substring(0, 10) + '...',
        timestamp: new Date().toISOString(),
      });
      
      return new NextResponse(challenge, {
        status: 200,
        headers: { 
          'Content-Type': 'text/plain',
          ...SECURITY_HEADERS
        },
      });
    }

    // Health check and webhook info
    const config = getGupshupConfig();
    const isProduction = config.environment === 'production';
    
    return NextResponse.json({
      webhook: 'Gupshup Notification System',
      status: 'active',
      environment: config.environment,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      security: {
        signatureValidation: true,
        timestampValidation: true,
        rateLimiting: true,
      },
      // Only include debug info in development
      ...(isProduction ? {} : {
        debug: {
          webhookUrl: config.webhook.url,
          rateLimitStatus: `${rateLimitMap.size} IPs tracked`,
        }
      })
    }, {
      headers: SECURITY_HEADERS
    });

  } catch (error) {
    console.error('Webhook GET endpoint error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { 
        status: 500,
        headers: SECURITY_HEADERS
      }
    );
  }
}