/**
 * Enhanced Chat - Update Message Status API
 * Updates message delivery and read status
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService, where } from '@/lib/firestore';
import { IEnhancedChatMessage } from '@/lib/models/EnhancedChat';

export interface UpdateStatusRequest {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateStatusRequest = await request.json();
    
    if (!body.messageId || !body.status || !body.userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // First, get the message to verify user access
    const message = await FirestoreService.getById<IEnhancedChatMessage>(
      'enhanced_chat_messages', 
      body.messageId
    );

    if (!message) {
      return NextResponse.json({
        success: false,
        error: 'Message not found'
      }, { status: 404 });
    }

    // Check if user is authorized to update this message
    if (message.senderId !== body.userId && message.receiverId !== body.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 403 });
    }

    // Update message status
    const updateData: Partial<IEnhancedChatMessage> = {
      status: body.status,
      ...(body.status === 'read' && { readAt: new Date() })
    };

    await FirestoreService.update('enhanced_chat_messages', body.messageId, updateData);

    // Get updated message
    const updatedMessage = await FirestoreService.getById<IEnhancedChatMessage>(
      'enhanced_chat_messages', 
      body.messageId
    );

    return NextResponse.json({
      success: true,
      message: updatedMessage
    });

  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update message status'
    }, { status: 500 });
  }
}