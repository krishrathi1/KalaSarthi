import { NextRequest, NextResponse } from 'next/server';
import { LoanApplicationService } from '@/lib/service/LoanApplicationService';

interface UpdateLoanApplicationRequest {
  status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  subStatus?: string;
  creditScore?: number;
  riskAssessment?: any;
  bankDetails?: any;
  portalApplicationId?: string;
  portalUrl?: string;
  rejectionReason?: string;
  updatedBy?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;

    const result = await LoanApplicationService.getLoanApplicationById(applicationId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 404 });
    }

  } catch (error: any) {
    console.error('Loan Application GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const body: UpdateLoanApplicationRequest = await request.json();

    const result = await LoanApplicationService.updateLoanApplication(applicationId, body);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error: any) {
    console.error('Loan Application PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;

    // Note: In a real application, you might want to soft delete
    // For now, we'll return a not implemented response
    return NextResponse.json(
      {
        success: false,
        error: 'Delete operation not implemented'
      },
      { status: 501 }
    );

  } catch (error: any) {
    console.error('Loan Application DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}