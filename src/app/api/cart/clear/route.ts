import { NextRequest, NextResponse } from 'next/server';
import { CartService } from '@/lib/service/CartService';

// DELETE /api/cart/clear - Clear entire cart
export async function DELETE(request:  NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        const result = await CartService.clearCart(userId);
        return NextResponse.json(result);
    } catch (error) {
        console.error('DELETE /api/cart/clear error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}