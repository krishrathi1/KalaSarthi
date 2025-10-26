import { NextRequest, NextResponse } from 'next/server';
import { getVertexAIService } from '@/lib/vertex-ai-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { productId, productName, originalImageUrl, colors, style } = body;

        // Validate required fields
        if (!productName || !originalImageUrl || !colors || colors.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: productName, originalImageUrl, and colors',
                },
                { status: 400 }
            );
        }

        // Limit number of color variations
        if (colors.length > 6) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Maximum 6 color variations allowed per request',
                },
                { status: 400 }
            );
        }

        console.log(`Generating ${colors.length} design variations for product: ${productName}`);

        // Generate variations using Vertex AI Imagen
        const vertexAI = getVertexAIService();
        const variations = await vertexAI.generateDesignVariations(
            originalImageUrl,
            productName,
            colors,
            style
        );

        return NextResponse.json({
            success: true,
            productId,
            productName,
            variations,
            count: variations.length,
            message: `Successfully generated ${variations.length} design variations`,
        });

    } catch (error) {
        console.error('Error generating design variations:', error);
        
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate design variations',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}
