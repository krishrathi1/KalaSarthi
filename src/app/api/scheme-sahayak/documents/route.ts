/**
 * Document Management API Routes
 * Handles document upload, retrieval, and management for Scheme Sahayak
 * 
 * Endpoints:
 * - POST /api/scheme-sahayak/documents - Upload a document
 * - GET /api/scheme-sahayak/documents - Get document status for artisan
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/scheme-sahayak/documents
 * Upload a document for an artisan
 * 
 * Requirements: 2.1, 9.1, 9.2
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const artisanId = formData.get('artisanId') as string;
    const documentType = formData.get('documentType') as string | undefined;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File is required' },
        { status: 400 }
      );
    }

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: 'Artisan ID is required' },
        { status: 400 }
      );
    }

    // Detect document type from filename if auto-detect
    let detectedType = documentType;
    if (documentType === 'auto-detect') {
      const fileName = file.name.toLowerCase();
      if (fileName.includes('aadhaar') || fileName.includes('aadhar')) {
        detectedType = 'aadhaar';
      } else if (fileName.includes('pan')) {
        detectedType = 'pan';
      } else if (fileName.includes('bank')) {
        detectedType = 'bank_statement';
      } else if (fileName.includes('income')) {
        detectedType = 'income_certificate';
      } else if (fileName.includes('caste')) {
        detectedType = 'caste_certificate';
      } else {
        detectedType = 'other';
      }
    }

    // Always return mock success for demo purposes (Firebase/Google Cloud not required)
    const documentId = `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📄 Document uploaded: ${file.name} (${file.size} bytes) for artisan ${artisanId}`);
    
    return NextResponse.json({
      success: true,
      data: {
        documentId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        status: 'verified',
        ocrData: {
          documentType: detectedType || 'other',
          extractedText: `✅ Document "${file.name}" processed successfully with AI-powered OCR.\n\nDocument Type: ${detectedType}\nFile Size: ${(file.size / 1024).toFixed(2)} KB\nUpload Time: ${new Date().toLocaleString()}\n\nThis is a demo mode - actual OCR processing would extract text from the document.`,
          confidence: 0.95
        },
        verificationStatus: 'verified',
        message: '✅ Document uploaded and verified successfully!'
      }
    });
  } catch (error: any) {
    console.error('Document upload error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload document'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scheme-sahayak/documents
 * Get document status summary for an artisan
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: 'Artisan ID is required' },
        { status: 400 }
      );
    }

    // Return mock data for demo purposes (Firebase not required)
    return NextResponse.json({
      success: true,
      data: {
        totalDocuments: 3,
        verified: 2,
        pending: 1,
        missing: 2,
        documents: [
          { id: 'doc1', type: 'aadhaar', status: 'verified', uploadedAt: new Date().toISOString() },
          { id: 'doc2', type: 'pan', status: 'verified', uploadedAt: new Date().toISOString() },
          { id: 'doc3', type: 'bank_statement', status: 'pending', uploadedAt: new Date().toISOString() }
        ]
      }
    });
  } catch (error: any) {
    console.error('Get document status error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get document status'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scheme-sahayak/documents
 * Delete a document
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const artisanId = searchParams.get('artisanId');

    if (!documentId || !artisanId) {
      return NextResponse.json(
        { success: false, error: 'Document ID and Artisan ID are required' },
        { status: 400 }
      );
    }

    // Return mock success for demo purposes (Firebase not required)
    console.log(`🗑️ Document deleted: ${documentId} for artisan ${artisanId}`);
    
    return NextResponse.json({
      success: true,
      message: '✅ Document deleted successfully!'
    });
  } catch (error: any) {
    console.error('Delete document error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete document'
      },
      { status: 500 }
    );
  }
}
