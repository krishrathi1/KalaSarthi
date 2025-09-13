import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/service/OrderService';

// GET - Search orders
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const searchTerm = searchParams.get('q');

        if (!searchTerm) {
            return NextResponse.json({
                success: false,
                error: 'Search term is required'
            }, { status: 400 });
        }

        const result = await OrderService.searchOrders(searchTerm);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Order Search API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
