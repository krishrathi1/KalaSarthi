import { NextRequest, NextResponse } from 'next/server';
import { RegionalCommunicationService } from '@/lib/service/RegionalCommunicationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buyerId, artisanId, buyerLanguage, artisanLanguage } = body;

    if (!buyerId || !artisanId) {
      return NextResponse.json(
        { success: false, error: 'buyerId and artisanId are required' },
        { status: 400 }
      );
    }

    const communicationService = RegionalCommunicationService.getInstance();
    const session = await communicationService.startSession(
      buyerId,
      artisanId,
      buyerLanguage || 'hi',
      artisanLanguage || 'hi'
    );

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        buyerLanguage: session.buyerLanguage,
        artisanLanguage: session.artisanLanguage,
        status: session.status,
        createdAt: session.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Communication session creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session'
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
        buyerId: session.buyerId,
        artisanId: session.artisanId,
        buyerLanguage: session.buyerLanguage,
        artisanLanguage: session.artisanLanguage,
        status: session.status,
        messageCount: session.messages.length,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    });

  } catch (error) {
    console.error('Communication session fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch session'
      },
      { status: 500 }
    );
  }
}