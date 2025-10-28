/**
 * Interaction Tracking API Route
 * Records user interactions for learning and analytics using Google Cloud technologies
 */

import { NextRequest, NextResponse } from 'next/server';
import { LearningEngine } from '@/lib/services/LearningEngine';
import { GoogleAnalyticsService } from '@/lib/services/GoogleAnalyticsService';
import { GoogleCloudLoggingService } from '@/lib/services/GoogleCloudLoggingService';
import connectDB from '@/lib/mongodb';

interface InteractionRequest {
  buyerId: string;
  artisanId: string;
  searchQuery: string;
  relevanceScore: number;
  action: 'viewed' | 'contacted' | 'hired' | 'skipped';
  sessionId: string;
  locationData?: {
    distance: number;
    category: string;
  };
  metadata?: {
    searchId: string;
    timestamp: string;
    userAgent: string;
    referrer?: string;
  };
}

interface InteractionResponse {
  success: boolean;
  data?: {
    interactionId: string;
    learningUpdated: boolean;
    analyticsTracked: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<InteractionResponse>> {
  const startTime = Date.now();
  
  try {
    await connectDB();
    
    // Parse request body
    const body: InteractionRequest = await request.json();
    
    // Validate required fields
    if (!body.buyerId || !body.artisanId || !body.action || !body.sessionId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: buyerId, artisanId, action, sessionId'
        }
      }, { status: 400 });
    }

    // Initialize services
    const learningEngine = LearningEngine.getInstance();
    const analyticsService = GoogleAnalyticsService.getInstance();
    const loggingService = GoogleCloudLoggingService.getInstance();

    // Generate interaction ID
    const interactionId = `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare interaction event
    const interactionEvent = {
      buyerId: body.buyerId,
      artisanId: body.artisanId,
      searchQuery: body.searchQuery,
      relevanceScore: body.relevanceScore,
      action: body.action,
      timestamp: new Date(),
      sessionId: body.sessionId,
      locationData: body.locationData
    };

    // Record interaction for learning
    let learningUpdated = false;
    try {
      await learningEngine.recordInteraction(interactionEvent);
      learningUpdated = true;
    } catch (error) {
      console.error('Error recording interaction for learning:', error);
      // Continue with other tracking even if learning fails
    }

    // Track with Google Analytics 4
    let analyticsTracked = false;
    try {
      await analyticsService.trackInteraction({
        event_name: `artisan_${body.action}`,
        user_id: body.buyerId,
        session_id: body.sessionId,
        custom_parameters: {
          artisan_id: body.artisanId,
          relevance_score: body.relevanceScore,
          search_query: body.searchQuery,
          distance: body.locationData?.distance || 0,
          location_category: body.locationData?.category || 'unknown',
          interaction_id: interactionId
        },
        timestamp: new Date().toISOString()
      });
      analyticsTracked = true;
    } catch (error) {
      console.error('Error tracking with Google Analytics:', error);
      // Continue even if analytics fails
    }

    // Log to Google Cloud Logging for monitoring and debugging
    try {
      await loggingService.logInteraction({
        severity: 'INFO',
        message: `User interaction recorded: ${body.action}`,
        resource: {
          type: 'gce_instance',
          labels: {
            instance_id: process.env.GOOGLE_CLOUD_INSTANCE_ID || 'unknown',
            zone: process.env.GOOGLE_CLOUD_ZONE || 'unknown'
          }
        },
        jsonPayload: {
          interactionId,
          buyerId: body.buyerId,
          artisanId: body.artisanId,
          action: body.action,
          relevanceScore: body.relevanceScore,
          sessionId: body.sessionId,
          processingTime: Date.now() - startTime,
          userAgent: body.metadata?.userAgent,
          referrer: body.metadata?.referrer
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging to Google Cloud:', error);
      // Continue even if logging fails
    }

    // Send real-time event to Google Analytics for immediate insights
    if (body.action === 'hired') {
      try {
        await analyticsService.trackConversion({
          event_name: 'artisan_hired',
          user_id: body.buyerId,
          session_id: body.sessionId,
          value: 1, // Conversion value
          currency: 'INR',
          custom_parameters: {
            artisan_id: body.artisanId,
            relevance_score: body.relevanceScore,
            interaction_id: interactionId
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error tracking conversion:', error);
      }
    }

    const processingTime = Date.now() - startTime;
    
    console.log(`Interaction tracking completed in ${processingTime}ms for ${body.action} action`);

    return NextResponse.json({
      success: true,
      data: {
        interactionId,
        learningUpdated,
        analyticsTracked
      }
    });

  } catch (error) {
    console.error('Error in interaction tracking:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to record interaction'
      }
    }, { status: 500 });
  }
}

// GET endpoint for interaction analytics
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const buyerId = searchParams.get('buyerId');
    const timeRange = searchParams.get('timeRange') || '7d';
    
    if (!buyerId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_BUYER_ID',
          message: 'buyerId parameter is required'
        }
      }, { status: 400 });
    }

    // Get analytics data from Google Analytics
    const analyticsService = GoogleAnalyticsService.getInstance();
    const analyticsData = await analyticsService.getBuyerInteractionAnalytics(buyerId, timeRange);
    
    // Get learning insights
    const learningEngine = LearningEngine.getInstance();
    const learningInsights = await learningEngine.getLearningInsights(buyerId);

    return NextResponse.json({
      success: true,
      data: {
        analytics: analyticsData,
        learningInsights,
        timeRange
      }
    });

  } catch (error) {
    console.error('Error getting interaction analytics:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to retrieve interaction analytics'
      }
    }, { status: 500 });
  }
}