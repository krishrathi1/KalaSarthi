import { OrderService } from '@/lib/service/OrderService';
import { NextRequest, NextResponse } from 'next/server';


// GET - Fetch orders for a user or all orders
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const userId = searchParams.get('userId');
        const status = searchParams.get('status');
        const isAdmin = searchParams.get('admin') === 'true';

        if (!userId && !isAdmin) {
            return NextResponse.json({
                success: false,
                error: 'userId is required'
            }, { status: 400 });
        }

        let result;
        if (isAdmin) {
            // Admin route - get all orders
            const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
            const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
            const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
            const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0;
            
            result = await OrderService.getAllOrders({
                status: status || undefined,
                startDate,
                endDate,
                limit,
                skip
            });
        } else {
            // User route - get user orders
            result = await OrderService.getUserOrders(userId!, status || undefined);
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Orders GET API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}


export async function POST(request: NextRequest) {
    try {
        const orderData = await request.json();

        if (!orderData.userId) {
            return NextResponse.json({
                success: false,
                error: 'userId is required'
            }, { status: 400 });
        }

        if (!orderData.shippingAddress) {
            return NextResponse.json({
                success: false,
                error: 'shippingAddress is required'
            }, { status: 400 });
        }

        // Validate shipping address
        const requiredFields = ['fullName', 'street', 'city', 'state', 'zipCode', 'country', 'phone'];
        for (const field of requiredFields) {
            if (!orderData.shippingAddress[field]) {
                return NextResponse.json({
                    success: false,
                    error: `shippingAddress.${field} is required`
                }, { status: 400 });
            }
        }

        const result = await OrderService.createOrder(orderData);
        
        if (result.success) {
            return NextResponse.json(result, { status: 201 });
        } else {
            return NextResponse.json(result, { status: 400 });
        }
    } catch (error: any) {
        console.error('Orders POST API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
