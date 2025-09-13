import { NextRequest, NextResponse } from 'next/server';
import { WishlistService } from '@/lib/service/WishlistService';

// GET /api/wishlist/count - Get wishlist count
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

        const result = await WishlistService.getWishlistCount(userId);
        return NextResponse.json(result);
    } catch (error) {
        console.error('GET /api/wishlist/count error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
