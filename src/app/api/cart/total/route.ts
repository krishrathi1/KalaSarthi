import { NextRequest, NextResponse } from 'next/server';
import { CartService } from '@/lib/service/CartService';

// GET /api/cart/total - Get cart total amount
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        const result = await CartService.getCartTotal(userId);
        return NextResponse.json(result);
    } catch (error) {
        console.error('GET /api/cart/total error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
