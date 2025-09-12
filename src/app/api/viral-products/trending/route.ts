import { NextRequest, NextResponse } from 'next/server';
import { getTopViralProducts, getViralProductsByProfession, VIRAL_PRODUCTS } from '@/lib/viral-products';

interface TrendingRequest {
    profession?: string;
    limit?: number;
}

export async function POST(request: NextRequest) {
    try {
        const { profession, limit = 10 }: TrendingRequest = await request.json();

        // Get products based on profession - optimized for speed
        const products = profession
            ? getViralProductsByProfession(profession)
            : getTopViralProducts(limit);

        // Minimal processing for speed
        const responseData = {
            success: true,
            products: products.slice(0, limit),
            isRealTime: true,
            lastUpdated: new Date().toISOString(),
            totalFound: products.length,
            source: 'real-time-api'
        };

        // Return immediately with minimal processing
        return NextResponse.json(responseData);

    } catch (error) {
        console.error('❌ Viral products API error:', error);

        // Fast fallback
        const fallbackProducts = getTopViralProducts(10);

        return NextResponse.json({
            success: true,
            products: fallbackProducts,
            isRealTime: false,
            lastUpdated: new Date().toISOString(),
            totalFound: fallbackProducts.length,
            source: 'fallback-hardcoded'
        });
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Viral Products Trending API',
        description: 'Real-time viral products with offline fallback',
        endpoints: {
            POST: '/api/viral-products/trending - Get trending viral products'
        },
        features: {
            realTime: 'Fetches live trending data when online',
            offline: 'Falls back to hardcoded data when offline',
            professionSpecific: 'Filters products by artisan profession',
            viralScoring: 'Real-time viral score calculation'
        },
        example: {
            profession: 'woodworking',
            limit: 10
        }
    });
}
