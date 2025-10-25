import { NextRequest, NextResponse } from 'next/server';
import { WishlistService } from '@/lib/service/WishlistService';

// DELETE /api/wishlist/clear - Clear entire wishlist
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        const result = await WishlistService.clearWishlist(userId);
        return NextResponse.json(result);
    } catch (error) {
        console.error('DELETE /api/wishlist/clear error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
