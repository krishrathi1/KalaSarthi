import { NextRequest, NextResponse } from 'next/server';
import { LoanApplicationService } from '@/lib/service/LoanApplicationService';

export async function POST(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const applicationId = params.applicationId;
    const body = await request.json();
    const { submittedBy } = body;

    if (!submittedBy) {
      return NextResponse.json({
        success: false,
        error: 'submittedBy is required'
      }, { status: 400 });
    }

    const result = await LoanApplicationService.submitLoanApplication(applicationId, submittedBy);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error: any) {
    console.error('Loan Application Submit API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}