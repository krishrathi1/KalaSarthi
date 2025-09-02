import { WishlistService } from '@/lib/service/WishlistService';
import { NextRequest, NextResponse } from 'next/server';


// GET /api/wishlist/check - Check if product is in wishlist
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const productId = searchParams.get('productId');

        if (!userId || !productId) {
            return NextResponse.json({
                success: false,
                error: 'User ID and Product ID are required'
            }, { status: 400 });
        }

        const result = await WishlistService.isInWishlist(userId, productId);
        return NextResponse.json(result);
    } catch (error) {
        console.error('GET /api/wishlist/check error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}