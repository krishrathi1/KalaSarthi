// app/api/orders/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/service/OrderService';

// GET - Get order statistics
export async function GET(request: NextRequest) {
    try {
        const result = await OrderService.getOrderStats();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Order Stats API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
