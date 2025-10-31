import { IProduct } from "@/lib/models/Product";
import { ProductService } from "@/lib/service/ProductService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const productData: Partial<IProduct> = await request.json();

        // Check if this is an offline sync request
        const isOfflineSync = request.headers.get('X-Offline-Sync') === 'true';
        const syncTimestamp = request.headers.get('X-Sync-Timestamp');

        // Validate required fields
        if (!productData.artisanId || !productData.name || !productData.description || !productData.price || !productData.category) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: artisanId, name, description, price, category'
                },
                { status: 400 }
            );
        }

        // Validate images array
        if (!productData.images || productData.images.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'At least one product image is required'
                },
                { status: 400 }
            );
        }

        const result = await ProductService.createProduct(productData);

        if (result.success) {
            return NextResponse.json(
                { 
                    success: true, 
                    data: result.data,
                    synced: isOfflineSync,
                    syncTimestamp: syncTimestamp || new Date().toISOString()
                },
                { status: 201 }
            );
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const artisanId = searchParams.get('artisanId');
        const category = searchParams.get('category');
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const featured = searchParams.get('featured');

        if (search) {
            const products = await ProductService.searchProducts(search);
            return NextResponse.json(
                { success: true, data: products },
                { status: 200 }
            );
        }

        if (featured === 'true') {
            const limit = parseInt(searchParams.get('limit') || '10');
            const products = await ProductService.getFeaturedProducts(limit);
            return NextResponse.json(
                { success: true, data: products },
                { status: 200 }
            );
        }

        if (artisanId) {
            const products = await ProductService.getProductsByArtisan(artisanId, status || undefined);
            return NextResponse.json(
                { success: true, data: products },
                { status: 200 }
            );
        }

        if (status === 'published') {
            const products = await ProductService.getPublishedProducts(category || undefined);
            return NextResponse.json(
                { success: true, data: products },
                { status: 200 }
            );
        }

        const products = await ProductService.getAllProducts();
        return NextResponse.json(
            { success: true, data: products },
            { status: 200 }
        );

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
