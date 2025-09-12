import { NextRequest, NextResponse } from 'next/server';
import { RegionalCommunicationService, VoiceCommunicationRequest } from '@/lib/service/RegionalCommunicationService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    const senderId = formData.get('senderId') as string;
    const senderType = formData.get('senderType') as 'buyer' | 'artisan';
    const targetLanguage = formData.get('targetLanguage') as string;

    if (!audioFile || !sessionId || !senderId || !senderType) {
      return NextResponse.json(
        {
          success: false,
          error: 'audio, sessionId, senderId, and senderType are required'
        },
        { status: 400 }
      );
    }

    // Convert audio file to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();

    const communicationService = RegionalCommunicationService.getInstance();
    const voiceRequest: VoiceCommunicationRequest = {
      sessionId,
      audioBuffer: arrayBuffer,
      senderId,
      senderType,
      targetLanguage: targetLanguage || undefined
    };

    const result = await communicationService.processVoiceCommunication(voiceRequest);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          originalText: result.originalText,
          translatedText: result.translatedText,
          audioUrl: result.audioUrl,
          confidence: result.confidence,
          message: {
            id: result.message.id,
            timestamp: result.message.timestamp,
            originalLanguage: result.message.originalLanguage,
            translatedLanguage: result.message.translatedLanguage
          }
        }
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Voice communication processing failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Voice communication API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Voice communication failed'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const communicationService = RegionalCommunicationService.getInstance();
    const session = communicationService.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        status: session.status,
        messages: session.messages.map(msg => ({
          id: msg.id,
          senderType: msg.senderType,
          originalText: msg.originalText,
          translatedText: msg.translatedText,
          timestamp: msg.timestamp,
          confidence: msg.confidence
        })),
        buyerLanguage: session.buyerLanguage,
        artisanLanguage: session.artisanLanguage
      }
    });

  } catch (error) {
    console.error('Voice communication GET API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch messages'
      },
      { status: 500 }
    );
  }
}