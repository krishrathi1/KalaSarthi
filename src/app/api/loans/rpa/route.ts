import { NextRequest, NextResponse } from 'next/server';
import { getRPAService } from '@/lib/service/RPAService';
import { AutomateLoanFormFillingInput } from '@/ai/flows/rpa-loan-form-agent';

interface RPARequest {
  action: 'start' | 'status' | 'stop';
  formData?: AutomateLoanFormFillingInput;
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RPARequest = await request.json();
    const { action, formData } = body;
    let sessionId = body.sessionId;

    const rpaService = getRPAService();

    console.log(`🤖 RPA Loan API called with action: ${action}`);

    switch (action) {
      case 'start':
        if (!formData) {
          return NextResponse.json({
            success: false,
            error: 'Form data is required for start action'
          }, { status: 400 });
        }

        sessionId = await rpaService.startLoanFormAutomation(formData);

        return NextResponse.json({
          success: true,
          message: 'RPA loan form automation started',
          sessionId,
          timestamp: new Date()
        });

      case 'status':
        if (!sessionId) {
          return NextResponse.json({
            success: false,
            error: 'Session ID is required for status action'
          }, { status: 400 });
        }

        const status = rpaService.getSessionStatus(sessionId);

        return NextResponse.json({
          success: true,
          status,
          timestamp: new Date()
        });

      case 'stop':
        if (!sessionId) {
          return NextResponse.json({
            success: false,
            error: 'Session ID is required for stop action'
          }, { status: 400 });
        }

        await rpaService.closeSession(sessionId);

        return NextResponse.json({
          success: true,
          message: `RPA session ${sessionId} stopped`,
          timestamp: new Date()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "start", "status", or "stop"'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ RPA Loan API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error occurred',
        timestamp: new Date()
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
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 });
    }

    const rpaService = getRPAService();
    const status = rpaService.getSessionStatus(sessionId);

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ RPA Loan GET API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
