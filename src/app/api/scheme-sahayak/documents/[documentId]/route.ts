/**
 * Document URL API Route
 * Get signed URL for document download
 */

import { NextRequest, NextResponse } from 'next/server';
import { documentManager } from '@/lib/services/scheme-sahayak/DocumentManager';

/**
 * GET /api/scheme-sahayak/documents/[documentId]
 * Get signed URL for document download
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');

    if (!artisanId) {
      return NextResponse.json(
        { error: 'Artisan ID is required' },
        { status: 400 }
      );
    }

    const url = await documentManager.getDocumentUrl(
      params.documentId,
      artisanId
    );

    return NextResponse.json({
      success: true,
      data: { url }
    });
  } catch (error: any) {
    console.error('Get document URL error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get document URL'
      },
      { status: 500 }
    );
  }
}
