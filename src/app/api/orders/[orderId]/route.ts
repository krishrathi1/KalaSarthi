import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/service/OrderService';


// GET - Get specific order by ID
export async function GET(
    request: NextRequest,
    { params }: { params: { orderId: string } }
) {
    try {
        const { orderId } = params;

        if (!orderId) {
            return NextResponse.json({
                success: false,
                error: 'orderId is required'
            }, { status: 400 });
        }

        const result = await OrderService.getOrderById(orderId);
        
        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 404 });
        }
    } catch (error: any) {
        console.error('Order GET API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// PUT - Update order (admin/artisan only)
export async function PUT(
    request: NextRequest,
    { params }: { params: { orderId: string } }
) {
    try {
        const { orderId } = params;
        const updateData = await request.json();

        if (!orderId) {
            return NextResponse.json({
                success: false,
                error: 'orderId is required'
            }, { status: 400 });
        }

        const result = await OrderService.updateOrder(orderId, updateData);
        
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Order PUT API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}