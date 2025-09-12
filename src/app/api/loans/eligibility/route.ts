import { NextRequest, NextResponse } from 'next/server';
import { LoanEligibilityService } from '@/lib/service/LoanEligibilityService';

interface EligibilityRequest {
  userId: string;
  requestedAmount: number;
  loanTenure: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: EligibilityRequest = await request.json();
    const { userId, requestedAmount, loanTenure } = body;

    if (!userId || !requestedAmount || !loanTenure) {
      return NextResponse.json({
        success: false,
        error: 'userId, requestedAmount, and loanTenure are required'
      }, { status: 400 });
    }

    console.log(`📊 Calculating loan eligibility for user ${userId}: ₹${requestedAmount} over ${loanTenure} months`);

    const result = await LoanEligibilityService.calculateEligibilityScore(
      userId,
      requestedAmount,
      loanTenure
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        eligibility: result.score
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Loan Eligibility API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 });
    }

    console.log(`📈 Getting eligibility summary for user ${userId}`);

    const summary = await LoanEligibilityService.getEligibilitySummary(userId);

    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error: any) {
    console.error('Loan Eligibility GET API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}