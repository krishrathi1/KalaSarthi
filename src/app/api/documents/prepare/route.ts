import { NextRequest, NextResponse } from 'next/server';
import { DocumentPreparationService } from '@/lib/service/DocumentPreparationService';

interface DocumentPreparationRequest {
  applicationId: string;
  documentType: 'loan_application' | 'business_plan' | 'financial_statement' | 'identity_proof';
  sourceDocuments?: Array<{
    url: string;
    type: string;
  }>;
  requirements?: {
    schemeId?: string;
    customRequirements?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: DocumentPreparationRequest = await request.json();

    const { applicationId, documentType, sourceDocuments, requirements } = body;

    if (!applicationId || !documentType) {
      return NextResponse.json({
        success: false,
        error: 'applicationId and documentType are required'
      }, { status: 400 });
    }

    console.log(`📄 Preparing document: ${documentType} for application ${applicationId}`);

    const result = await DocumentPreparationService.prepareLoanDocuments({
      applicationId,
      documentType,
      sourceDocuments,
      requirements
    });

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }

  } catch (error: any) {
    console.error('Document preparation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentUrl = searchParams.get('url');
    const documentType = searchParams.get('type');

    if (!documentUrl) {
      return NextResponse.json({
        success: false,
        error: 'Document URL is required'
      }, { status: 400 });
    }

    console.log(`🔍 Extracting data from document: ${documentType || 'unknown'}`);

    const result = await DocumentPreparationService.extractDocumentData(
      documentUrl,
      documentType || 'general'
    );

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Document extraction API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
