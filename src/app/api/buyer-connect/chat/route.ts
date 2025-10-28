import { NextRequest, NextResponse } from 'next/server';
import { conversationMediatorAgent } from '@/ai/agents/conversation-mediator';
import { Chat } from '@/lib/models';
import connectDB from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { action, sessionId, senderId, receiverId, message, language } = body;
    
    // If no action is specified but message is provided, default to send_message
    const chatAction = action || (message ? 'send_message' : null);
    
    switch (chatAction) {
      case 'send_message':
        return await handleSendMessage(body);
      case 'get_messages':
        return await handleGetMessages(sessionId);
      case 'create_session':
        return await handleCreateSession(body);
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: send_message, get_messages, create_session'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

async function handleSendMessage(body: any) {
  const { sessionId, senderId, receiverId, message, senderLanguage, receiverLanguage } = body;
  
  try {
    // Get or create chat session
    let chatSession = await Chat.findOne({ sessionId });
    
    if (!chatSession) {
      chatSession = new Chat({
        sessionId,
        participants: {
          buyerId: senderId, // Assuming sender is buyer for now
          artisanId: receiverId,
          buyerLanguage: senderLanguage,
          artisanLanguage: receiverLanguage
        },
        status: 'active',
        settings: {
          translationEnabled: true,
          notificationsEnabled: true,
          aiAssistanceEnabled: true,
          culturalContextEnabled: true
        },
        messages: [],
        aiContext: {
          keyDecisions: [],
          culturalNotes: [],
          recommendedActions: []
        },
        metadata: {
          createdAt: new Date(),
          lastActivity: new Date(),
          messageCount: 0,
          translationCount: 0,
          averageResponseTime: 0
        }
      });
    }
    
    // Process message with AI translation and cultural adaptation
    let processedMessage;
    try {
      processedMessage = await conversationMediatorAgent.processMessage(
        message,
        senderLanguage,
        receiverLanguage,
        { uid: senderId }, // Mock sender profile
        { uid: receiverId }, // Mock receiver profile
        {
          sessionId,
          isBusinessContext: true,
          involvesTraditionalCrafts: true,
          recentMessages: chatSession.messages.slice(-5)
        }
      );
    } catch (error) {
      console.warn('AI message processing failed, using fallback:', error);
      // Fallback to simple message processing
      processedMessage = {
        translation: {
          translatedText: message, // No translation fallback
          confidence: 0.5,
          translationMetadata: {
            service: 'fallback',
            alternativeTranslations: []
          },
          alternativeTranslations: []
        },
        culturalAdaptation: {
          culturalContext: 'General business communication',
          culturalNotes: []
        },
        recommendations: []
      };
    }
    
    // Create message object
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage = {
      id: messageId,
      senderId,
      receiverId,
      originalText: message,
      originalLanguage: senderLanguage,
      translatedText: processedMessage.translation.translatedText,
      targetLanguage: receiverLanguage,
      messageType: 'text' as const,
      timestamp: new Date(),
      status: 'sent' as const,
      translationMetadata: {
        confidence: processedMessage.translation?.confidence || 0.5,
        service: processedMessage.translation?.translationMetadata?.service || 'unknown',
        alternativeTranslations: processedMessage.translation?.alternativeTranslations || [],
        culturalContext: processedMessage.culturalAdaptation?.culturalContext || 'General communication'
      },
      aiAnalysis: {
        sentiment: 'neutral' as const, // Would be determined by AI
        intent: 'communication',
        confidence: 0.8,
        keyTopics: ['conversation'],
        urgency: 'low' as const
      }
    };
    
    // Add message to session
    chatSession.messages.push(newMessage);
    chatSession.metadata.messageCount += 1;
    chatSession.metadata.lastActivity = new Date();
    
    if (processedMessage.translation.translatedText !== message) {
      chatSession.metadata.translationCount += 1;
    }
    
    // Update AI context with recommendations
    if (processedMessage.recommendations.length > 0) {
      chatSession.aiContext.recommendedActions.push(...processedMessage.recommendations.map(rec => ({
        action: rec,
        reason: 'AI communication suggestion',
        priority: 'medium' as const
      })));
    }
    
    // Save session
    await chatSession.save();
    
    return NextResponse.json({
      success: true,
      data: {
        messageId,
        translatedText: processedMessage.translation.translatedText,
        confidence: processedMessage.translation.confidence,
        culturalNotes: processedMessage.culturalAdaptation?.culturalNotes || [],
        recommendations: processedMessage.recommendations
      }
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send message',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

async function handleGetMessages(sessionId: string) {
  try {
    const chatSession = await Chat.findOne({ sessionId });
    
    if (!chatSession) {
      return NextResponse.json({
        success: false,
        error: 'Chat session not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        messages: chatSession.messages,
        participants: chatSession.participants,
        settings: chatSession.settings,
        aiContext: chatSession.aiContext
      }
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get messages'
    }, { status: 500 });
  }
}

async function handleCreateSession(body: any) {
  const { buyerId, artisanId, buyerLanguage, artisanLanguage } = body;
  
  try {
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const chatSession = new Chat({
      sessionId,
      participants: {
        buyerId,
        artisanId,
        buyerLanguage: buyerLanguage || 'en',
        artisanLanguage: artisanLanguage || 'en'
      },
      status: 'active',
      settings: {
        translationEnabled: buyerLanguage !== artisanLanguage,
        notificationsEnabled: true,
        aiAssistanceEnabled: true,
        culturalContextEnabled: true
      },
      messages: [],
      aiContext: {
        keyDecisions: [],
        culturalNotes: [],
        recommendedActions: []
      },
      metadata: {
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        translationCount: 0,
        averageResponseTime: 0
      }
    });
    
    await chatSession.save();
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        participants: chatSession.participants,
        settings: chatSession.settings
      }
    });
    
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create chat session'
    }, { status: 500 });
  }
}