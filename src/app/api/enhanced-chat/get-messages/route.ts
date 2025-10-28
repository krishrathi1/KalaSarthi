/**
 * Enhanced Chat API - Get Messages Endpoint
 * Retrieves chat messages with user-specific language rendering
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService, COLLECTIONS, where, orderBy, limit as limitQuery } from '@/lib/firestore';
import { IEnhancedChatMessage } from '@/lib/models/EnhancedChat';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!sessionId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing sessionId or userId'
      }, { status: 400 });
    }
    
    // Get user's language preference
    const userLanguage = await getUserLanguage(userId);
    
    // Fetch messages using Firestore
    const messages = await FirestoreService.query<IEnhancedChatMessage>(
      'enhanced_chat_messages',
      [
        where('sessionId', '==', sessionId),
        where('senderId', 'in', [userId]),
        orderBy('timestamp', 'desc'),
        limitQuery(limit)
      ]
    );
    
    // Also get messages where user is receiver
    const receivedMessages = await FirestoreService.query<IEnhancedChatMessage>(
      'enhanced_chat_messages',
      [
        where('sessionId', '==', sessionId),
        where('receiverId', '==', userId),
        orderBy('timestamp', 'desc'),
        limitQuery(limit)
      ]
    );
    
    // Combine and sort all messages
    const allMessages = [...messages, ...receivedMessages]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
    
    // Process messages for user-specific rendering
    const processedMessages = allMessages.map(message => {
      const isFromUser = message.senderId === userId;
      
      return {
        ...message,
        displayText: isFromUser 
          ? message.originalText 
          : (message.translatedText || message.originalText),
        displayLanguage: isFromUser 
          ? message.originalLanguage 
          : userLanguage,
        showTranslation: !isFromUser && message.translatedText && 
                        message.originalLanguage !== userLanguage
      };
    }).reverse(); // Reverse to show oldest first
    
    return NextResponse.json({
      success: true,
      messages: processedMessages,
      hasMore: allMessages.length === limit
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve messages'
    }, { status: 500 });
  }
}

async function getUserLanguage(userId: string): Promise<string> {
  // TODO: Get from user profile
  return 'en'; // Default fallback
}