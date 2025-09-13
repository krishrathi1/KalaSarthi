import { NextRequest, NextResponse } from 'next/server';
import { CartService } from '@/lib/service/CartService';

// GET /api/cart/count - Get cart count
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

        const result = await CartService.getCartCount(userId);
        return NextResponse.json(result);
    } catch (error) {
        console.error('GET /api/cart/count error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
