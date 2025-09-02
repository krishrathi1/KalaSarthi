import { NextRequest, NextResponse } from 'next/server';
import { CartService } from '@/lib/service/CartService';

// GET /api/cart - Get user's cart
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

        const result = await CartService.getUserCart(userId);
        
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('GET /api/cart error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// POST /api/cart - Add product to cart
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, productId, quantity = 1 } = body;

        if (!userId || !productId) {
            return NextResponse.json({
                success: false,
                error: 'User ID and Product ID are required'
            }, { status: 400 });
        }

        if (quantity < 1) {
            return NextResponse.json({
                success: false,
                error: 'Quantity must be at least 1'
            }, { status: 400 });
        }

        const result = await CartService.addToCart(userId, productId, quantity);
        
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('POST /api/cart error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// PUT /api/cart - Update cart item quantity
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, productId, quantity } = body;

        if (!userId || !productId || quantity === undefined) {
            return NextResponse.json({
                success: false,
                error: 'User ID, Product ID, and quantity are required'
            }, { status: 400 });
        }

        const result = await CartService.updateCartItem(userId, productId, quantity);
        
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('PUT /api/cart error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// DELETE /api/cart - Remove product from cart
export async function DELETE(request: NextRequest) {
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

        const result = await CartService.removeFromCart(userId, productId);
        
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('DELETE /api/cart error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
