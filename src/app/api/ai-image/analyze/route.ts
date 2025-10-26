import { NextRequest, NextResponse } from 'next/server';
import { GoogleCloudService } from '@/lib/google-cloud-service';
import { AI_IMAGE_CONFIG } from '@/lib/ai-image-config';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No image file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!AI_IMAGE_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > AI_IMAGE_CONFIG.MAX_IMAGE_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 5MB.' },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        // For now, skip upload and use a placeholder URL
        const imageUrl = `data:${file.type};base64,${imageBuffer.toString('base64')}`;

        // Analyze the image
        const analysis = await GoogleCloudService.analyzeProductImage(imageBuffer, imageUrl);

        return NextResponse.json({
            success: true,
            analysis,
            originalImageUrl: imageUrl,
            message: 'Image analyzed successfully'
        });

    } catch (error) {
        console.error('Error in image analysis API:', error);
        return NextResponse.json(
            {
                error: 'Failed to analyze image',
                details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
