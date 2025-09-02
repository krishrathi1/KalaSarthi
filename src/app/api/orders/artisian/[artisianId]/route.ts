import { OrderService } from '@/lib/service/OrderService';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get orders for a specific artisan
export async function GET(
    request: NextRequest,
    { params }: { params: { artisanId: string } }
) {
    try {
        const { artisanId } = params;
        const { searchParams } = request.nextUrl;
        const status = searchParams.get('status');

        if (!artisanId) {
            return NextResponse.json({
                success: false,
                error: 'artisanId is required'
            }, { status: 400 });
        }

        const result = await OrderService.getArtisanOrders(artisanId, status || undefined);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Artisan Orders API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}