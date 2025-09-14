import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/service/OrderService';

// POST - Cancel an order
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await params;
        const { userId, reason } = await request.json();

        if (!orderId) {
            return NextResponse.json({
                success: false,
                error: 'orderId is required'
            }, { status: 400 });
        }

        if (!reason) {
            return NextResponse.json({
                success: false,
                error: 'Cancellation reason is required'
            }, { status: 400 });
        }

        const result = await OrderService.cancelOrder(orderId, reason, userId);
        
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Order Cancel API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
