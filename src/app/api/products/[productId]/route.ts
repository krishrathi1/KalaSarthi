import { IProduct } from "@/lib/models/Product";
import { ProductService } from "@/lib/service/ProductService";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
    params: {
        productId: string;
    };
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { productId } = params;
        const product = await ProductService.getProductById(productId);

        if (!product) {
            return NextResponse.json(
                { success: false, error: 'Product not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: product },
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

export async function PUT(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { productId } = params;
        const updateData: Partial<IProduct> = await request.json();

        const result = await ProductService.updateProduct(productId, updateData);

        if (result.success) {
            return NextResponse.json(
                { success: true, data: result },
                { status: 200 }
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

export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { productId } = params;
        const result = await ProductService.deleteProduct(productId);

        if (result.success) {
            return NextResponse.json(
                { success: true, data: result },
                { status: 200 }
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