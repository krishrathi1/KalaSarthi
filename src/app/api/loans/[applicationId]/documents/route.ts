import { NextRequest, NextResponse } from 'next/server';
import { LoanApplicationService } from '@/lib/service/LoanApplicationService';

interface AddDocumentRequest {
  type: string;
  fileName: string;
  fileUrl: string;
  addedBy: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const body: AddDocumentRequest = await request.json();

    const { type, fileName, fileUrl, addedBy } = body;

    if (!type || !fileName || !fileUrl || !addedBy) {
      return NextResponse.json({
        success: false,
        error: 'type, fileName, fileUrl, and addedBy are required'
      }, { status: 400 });
    }

    const result = await LoanApplicationService.addDocument(
      applicationId,
      { type, fileName, fileUrl },
      addedBy
    );

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error: any) {
    console.error('Loan Application Documents API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;

    const result = await LoanApplicationService.getLoanApplicationById(applicationId);

    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        documents: result.data.documents || []
      });
    } else {
      return NextResponse.json(result, { status: 404 });
    }

  } catch (error: any) {
    console.error('Loan Application Documents GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}