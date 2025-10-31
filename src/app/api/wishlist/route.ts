import { WishlistService } from '@/lib/service/WishlistService';
import { NextRequest, NextResponse } from 'next/server';


// GET /api/wishlist - Get user's wishlist
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

        const result = await WishlistService.getUserWishlist(userId);
        
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('GET /api/wishlist error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// POST /api/wishlist - Add product to wishlist
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, productId } = body;

        // Check if this is an offline sync request
        const isOfflineSync = request.headers.get('X-Offline-Sync') === 'true';
        const syncTimestamp = request.headers.get('X-Sync-Timestamp');

        if (!userId || !productId) {
            return NextResponse.json({
                success: false,
                error: 'User ID and Product ID are required'
            }, { status: 400 });
        }

        const result = await WishlistService.addToWishlist(userId, productId);
        
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
            ...result,
            synced: isOfflineSync,
            syncTimestamp: syncTimestamp || new Date().toISOString()
        });
    } catch (error) {
        console.error('POST /api/wishlist error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// DELETE /api/wishlist - Remove product from wishlist
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const productId = searchParams.get('productId');

        // Check if this is an offline sync request
        const isOfflineSync = request.headers.get('X-Offline-Sync') === 'true';
        const syncTimestamp = request.headers.get('X-Sync-Timestamp');

        if (!userId || !productId) {
            return NextResponse.json({
                success: false,
                error: 'User ID and Product ID are required'
            }, { status: 400 });
        }

        const result = await WishlistService.removeFromWishlist(userId, productId);
        
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
            ...result,
            synced: isOfflineSync,
            syncTimestamp: syncTimestamp || new Date().toISOString()
        });
    } catch (error) {
        console.error('DELETE /api/wishlist error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
