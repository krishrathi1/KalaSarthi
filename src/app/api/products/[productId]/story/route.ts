import { IProduct } from "@/lib/models/Product";
import { ProductService } from "@/lib/service/ProductService";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
    params: {
        productId: string;
    };
}

export async function PUT(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { productId } = params;
        const storyData: IProduct['story'] = await request.json();

        // Validate that at least one story field is provided
        if (!storyData || Object.keys(storyData).length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Story data is required'
                },
                { status: 400 }
            );
        }

        const result = await ProductService.updateProductStory(productId, storyData);

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