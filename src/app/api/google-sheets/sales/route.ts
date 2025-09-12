import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService, SalesOrder, SalesQuery } from '@/lib/service/GoogleSheetsService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query: SalesQuery = {
      artisanId: searchParams.get('artisanId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status') || undefined,
      region: searchParams.get('region') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const sheetsService = GoogleSheetsService.getInstance();
    const result = await sheetsService.getSalesData(query);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        summary: result.summary,
        count: result.count,
        metadata: {
          query,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sales data' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Google Sheets sales API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orderData: SalesOrder = await request.json();

    // Validate required fields
    const requiredFields = ['orderId', 'artisanId', 'productId', 'buyerId', 'totalAmount'];
    for (const field of requiredFields) {
      if (!orderData[field as keyof SalesOrder]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const sheetsService = GoogleSheetsService.getInstance();
    const result = await sheetsService.addSalesOrder(orderData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          orderId: result.orderId,
          message: result.message
        }
      }, { status: 201 });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Google Sheets sales POST API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}