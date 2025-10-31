/**
 * API endpoints for intelligent message scheduling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGupshupService } from '@/lib/services/notifications/GupshupService';

/**
 * POST /api/notifications/schedule/recommendation
 * Get intelligent scheduling recommendation for a message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, priority = 'medium' } = body;

    // Validate input
    if (!channel || !['whatsapp', 'sms'].includes(channel)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid channel. Must be "whatsapp" or "sms"',
        },
        { status: 400 }
      );
    }

    if (priority && !['high', 'medium', 'low'].includes(priority)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid priority. Must be "high", "medium", or "low"',
        },
        { status: 400 }
      );
    }

    const gupshupService = getGupshupService();
    
    // Get scheduling recommendation
    const recommendation = await gupshupService.getSchedulingRecommendation(channel, priority);

    const response = {
      success: true,
      data: {
        recommendation,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting scheduling recommendation:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get scheduling recommendation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/schedule
 * Schedule a message for optimal delivery
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, channel, priority = 'medium' } = body;

    // Validate input
    if (!messageId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message ID is required',
        },
        { status: 400 }
      );
    }

    if (!channel || !['whatsapp', 'sms'].includes(channel)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid channel. Must be "whatsapp" or "sms"',
        },
        { status: 400 }
      );
    }

    if (priority && !['high', 'medium', 'low'].includes(priority)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid priority. Must be "high", "medium", or "low"',
        },
        { status: 400 }
      );
    }

    const gupshupService = getGupshupService();
    
    // Schedule message for optimal delivery
    const result = await gupshupService.scheduleMessageForOptimalDelivery(messageId, channel, priority);

    const response = {
      success: true,
      data: {
        messageId,
        ...result,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error scheduling message:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to schedule message',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/schedule/ready
 * Get messages ready for delivery from the intelligent scheduler
 */
export async function GET(request: NextRequest) {
  try {
    const gupshupService = getGupshupService();
    
    // Get ready scheduled messages
    const readyMessages = gupshupService.getReadyScheduledMessages();

    const response = {
      success: true,
      data: {
        readyMessages,
        count: readyMessages.length,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting ready messages:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get ready messages',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}