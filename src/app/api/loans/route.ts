import { NextRequest, NextResponse } from 'next/server';
import { LoanApplicationService } from '@/lib/service/LoanApplicationService';

interface CreateLoanApplicationRequest {
  userId: string;
  personalInfo: any;
  businessInfo: any;
  loanDetails: any;
  documents?: any[];
  bankDetails?: any;
  createdBy: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let result;

    if (search) {
      result = await LoanApplicationService.searchLoanApplications(search);
    } else if (status) {
      result = await LoanApplicationService.getLoanApplicationsByStatus(status);
    } else if (userId) {
      result = await LoanApplicationService.getUserLoanApplications(userId);
    } else {
      // Get stats if no specific query
      result = await LoanApplicationService.getLoanApplicationStats();
    }

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error: any) {
    console.error('Loans API GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateLoanApplicationRequest = await request.json();

    const result = await LoanApplicationService.createLoanApplication(body);

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error: any) {
    console.error('Loans API POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
