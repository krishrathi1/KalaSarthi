/**
 * Design Share API
 * Shares designs in chat conversations
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService, serverTimestamp } from '@/lib/firestore';
import { IEnhancedChatMessage } from '@/lib/models/EnhancedChat';

interface ShareDesignRequest {
  designId: string;
  sessionId: string;
  artisanId: string;
  design?: any; // Full design object
}

export async function POST(request: NextRequest) {
  try {
    const body: ShareDesignRequest = await request.json();
    
    // Validate required fields
    if (!body.designId || !body.sessionId || !body.artisanId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: designId, sessionId, artisanId'
      }, { status: 400 });
    }

    // Get session participants to find receiver
    const session = await FirestoreService.getById('enhanced_chat_sessions', body.sessionId);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Chat session not found'
      }, { status: 404 });
    }

    // Find the receiver (non-artisan participant)
    const receiver = session.participants?.find((p: any) => p.id !== body.artisanId);
    if (!receiver) {
      return NextResponse.json({
        success: false,
        error: 'Receiver not found in session'
      }, { status: 404 });
    }

    // Create design message
    const designMessage: Omit<IEnhancedChatMessage, 'id' | 'createdAt' | 'updatedAt'> = {
      sessionId: body.sessionId,
      senderId: body.artisanId,
      receiverId: receiver.id,
      originalText: `I've shared a design with you. What do you think?`,
      originalLanguage: 'en',
      messageType: 'design',
      designData: {
        designs: body.design ? [body.design] : [],
        prompt: body.design?.prompt || '',
        generationMetadata: body.design?.metadata || {}
      },
      aiAnalysis: {
        sentiment: 'positive',
        sentimentScore: 0.8,
        intent: 'design_sharing',
        intentConfidence: 0.9,
        keyTopics: ['design', 'sharing', 'collaboration'],
        urgency: 'medium',
        dealIndicators: [{
          type: 'design_presentation',
          confidence: 0.8,
          evidence: ['design_shared'],
          stage: 'negotiation'
        }]
      },
      timestamp: new Date(),
      status: 'sent'
    };

    // Save message to Firestore
    const messageId = await FirestoreService.create('enhanced_chat_messages', designMessage);

    // Update session with shared design
    if (session.conversationContext) {
      const updatedContext = {
        ...session.conversationContext,
        sharedDesigns: [
          ...(session.conversationContext.sharedDesigns || []),
          {
            id: body.designId,
            imageUrl: body.design?.imageUrl || '',
            prompt: body.design?.prompt || '',
            sharedAt: new Date(),
            feedback: null
          }
        ]
      };

      await FirestoreService.update('enhanced_chat_sessions', body.sessionId, {
        conversationContext: updatedContext,
        lastActivity: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      messageId,
      message: {
        id: messageId,
        ...designMessage
      }
    });
    
  } catch (error) {
    console.error('Design share error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share design'
    }, { status: 500 });
  }
}