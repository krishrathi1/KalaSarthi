import { NextRequest, NextResponse } from 'next/server';
import { handleVoiceEnrollment } from '@/ai/flows/voice-scheme-enrollment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleVoiceEnrollment(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Voice enrollment error:', error);
    return NextResponse.json(
      {
        response: "I'm sorry, I encountered an error. Please try again.",
        nextStep: "error",
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
