import { NextRequest, NextResponse } from 'next/server';
import { GoogleCloudService } from '@/lib/google-cloud-service';
import { HuggingFaceService } from '@/lib/huggingface-service';
import { GeminiImageService } from '@/lib/gemini-image-service';
import { AI_IMAGE_CONFIG } from '@/lib/ai-image-config';

// Helper function to generate CSS filters for demo mode
function getColorFilter(color: string, style: string): string {
    const colorFilters = {
        'red': 'hue-rotate(0deg) saturate(1.5) brightness(1.1)',
        'blue': 'hue-rotate(240deg) saturate(1.3) brightness(1.0)',
        'green': 'hue-rotate(120deg) saturate(1.4) brightness(1.0)',
        'yellow': 'hue-rotate(60deg) saturate(1.6) brightness(1.2)',
        'purple': 'hue-rotate(280deg) saturate(1.3) brightness(0.9)',
        'orange': 'hue-rotate(30deg) saturate(1.5) brightness(1.1)',
        'pink': 'hue-rotate(320deg) saturate(1.2) brightness(1.1)',
        'brown': 'hue-rotate(25deg) saturate(0.8) brightness(0.8)',
        'default': 'saturate(1.2) brightness(1.0)'
    };

    const styleFilters = {
        'vibrant': 'saturate(1.5) contrast(1.2)',
        'pastel': 'saturate(0.7) brightness(1.3) contrast(0.8)',
        'monochrome': 'grayscale(100%) contrast(1.1)',
        'vintage': 'sepia(0.3) saturate(0.8) contrast(0.9)',
        'modern': 'saturate(1.1) contrast(1.1) brightness(1.05)',
        'traditional': 'saturate(1.0) contrast(1.0) brightness(1.0)'
    };

    const colorFilter = colorFilters[color.toLowerCase() as keyof typeof colorFilters] || colorFilters.default;
    const styleFilter = styleFilters[style.toLowerCase() as keyof typeof styleFilters] || styleFilters.traditional;

    return `${colorFilter} ${styleFilter}`;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Handle both JSON and FormData requests
        let data: any;
        const contentType = request.headers.get('content-type');

        if (contentType?.includes('multipart/form-data')) {
            const formData = await request.formData();
            const image = formData.get('image') as File;
            const prompt = formData.get('prompt') as string;
            const style = formData.get('style') as string;
            const color = formData.get('color') as string;

            // Convert image to base64
            const imageBuffer = await image.arrayBuffer();
            const imageBase64 = Buffer.from(imageBuffer).toString('base64');
            const imageUrl = `data:${image.type};base64,${imageBase64}`;

            data = {
                originalImageUrl: imageUrl,
                prompt,
                style: style || 'default',
                colors: color ? [color] : ['default']
            };
        } else {
            data = await request.json();
        }

        const { originalImageUrl, prompt, style, colors } = data;

        // Validate required parameters
        if (!originalImageUrl || !prompt) {
            return NextResponse.json(
                {
                    error: 'Missing required parameters: image and prompt',
                    code: 'MISSING_PARAMETERS'
                },
                { status: 400 }
            );
        }

        // Validate style - allow 'default' as a valid style
        const validStyles = [...AI_IMAGE_CONFIG.STYLE_OPTIONS.map(s => s.id), 'default'];
        if (!validStyles.includes(style)) {
            return NextResponse.json(
                {
                    error: 'Invalid style. Please choose from available styles.',
                    code: 'INVALID_STYLE',
                    validStyles
                },
                { status: 400 }
            );
        }

        // Validate colors - allow 'default' as a valid color
        const validColors = [...AI_IMAGE_CONFIG.COLOR_VARIATIONS.map(c => c.name.toLowerCase()), 'default'];
        const invalidColors = colors.filter((color: string) => !validColors.includes(color.toLowerCase()));
        if (invalidColors.length > 0) {
            return NextResponse.json(
                {
                    error: `Invalid colors: ${invalidColors.join(', ')}`,
                    code: 'INVALID_COLORS',
                    validColors: [...AI_IMAGE_CONFIG.COLOR_VARIATIONS.map(c => c.name), 'default']
                },
                { status: 400 }
            );
        }

        // Limit number of generations
        if (colors.length > AI_IMAGE_CONFIG.MAX_GENERATIONS_PER_REQUEST) {
            return NextResponse.json(
                {
                    error: `Too many colors. Maximum ${AI_IMAGE_CONFIG.MAX_GENERATIONS_PER_REQUEST} allowed.`,
                    code: 'TOO_MANY_COLORS',
                    maxAllowed: AI_IMAGE_CONFIG.MAX_GENERATIONS_PER_REQUEST
                },
                { status: 400 }
            );
        }

        // Validate original image URL
        if (!originalImageUrl.startsWith('http') && !originalImageUrl.startsWith('data:')) {
            return NextResponse.json(
                {
                    error: 'Invalid original image URL format',
                    code: 'INVALID_IMAGE_URL'
                },
                { status: 400 }
            );
        }

        console.log(`Starting image generation for ${colors.length} colors with style: ${style}`);

        // Try Gemini Vision API first (you already have the API key)
        console.log('Attempting to generate images with Gemini Vision API...');

        try {
            const generatedImages = await GeminiImageService.generateImageVariations(
                originalImageUrl,
                style,
                colors,
                prompt
            );

            const processingTime = Date.now() - startTime;
            console.log(`Gemini generation completed in ${processingTime}ms`);

            // Return single image URL for the frontend
            const imageUrl = generatedImages.length > 0 ? generatedImages[0].url : originalImageUrl;

            return NextResponse.json({
                success: true,
                imageUrl,
                generatedImages,
                style,
                colors,
                count: generatedImages.length,
                processingTimeMs: processingTime,
                message: `Successfully generated ${generatedImages.length} image variations using Gemini Vision AI`,
                aiProvider: 'gemini'
            });

        } catch (geminiError) {
            console.log('Gemini failed, trying Hugging Face...', geminiError);

            // Fallback to Hugging Face
            try {
                const generatedImages = await HuggingFaceService.generateImageVariations(
                    originalImageUrl,
                    style,
                    colors,
                    prompt
                );

                const processingTime = Date.now() - startTime;
                console.log(`Hugging Face generation completed in ${processingTime}ms`);

                const imageUrl = generatedImages.length > 0 ? generatedImages[0].url : originalImageUrl;

                return NextResponse.json({
                    success: true,
                    imageUrl,
                    generatedImages,
                    style,
                    colors,
                    count: generatedImages.length,
                    processingTimeMs: processingTime,
                    message: `Successfully generated ${generatedImages.length} image variations using Hugging Face AI`,
                    aiProvider: 'huggingface'
                });

            } catch (huggingFaceError) {
                console.log('Hugging Face failed, trying Google Cloud...', huggingFaceError);

                // Fallback to Google Cloud if configured
                if (process.env.GOOGLE_APPLICATION_CREDENTIALS && (process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID)) {
                    try {
                        const generatedImages = await GoogleCloudService.generateImageVariations(
                            originalImageUrl,
                            style,
                            colors,
                            prompt
                        );

                        const processingTime = Date.now() - startTime;
                        const imageUrl = generatedImages.length > 0 ? generatedImages[0].url : originalImageUrl;

                        return NextResponse.json({
                            success: true,
                            imageUrl,
                            generatedImages,
                            style,
                            colors,
                            count: generatedImages.length,
                            processingTimeMs: processingTime,
                            message: `Successfully generated ${generatedImages.length} image variations using Google Cloud AI`,
                            aiProvider: 'google-cloud'
                        });
                    } catch (googleError) {
                        console.log('Google Cloud also failed, using demo mode...', googleError);
                    }
                }
            }
        }

        // Final fallback: Demo mode with CSS filters
        console.log('All AI services failed, creating demo images with CSS filters');

        const demoImages = [];
        const baseColors = colors.length > 0 ? colors : ['default', 'red', 'blue', 'green'];

        for (let i = 0; i < Math.min(baseColors.length, 3); i++) {
            const color = baseColors[i];
            const demoImage = {
                id: `demo_${Date.now()}_${i}`,
                url: originalImageUrl,
                style,
                color,
                prompt: `${prompt} in ${color} ${style} style`,
                createdAt: new Date(),
                demoMode: true,
                filter: getColorFilter(color, style)
            };
            demoImages.push(demoImage);
        }

        return NextResponse.json({
            success: true,
            imageUrl: originalImageUrl,
            generatedImages: demoImages,
            style,
            colors,
            count: demoImages.length,
            processingTimeMs: Date.now() - startTime,
            message: 'Demo mode: No AI services configured. Set up HUGGINGFACE_API_KEY or GOOGLE_APPLICATION_CREDENTIALS for real AI generation.',
            demoMode: true,
            aiProvider: 'demo'
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('Error in image generation API:', error);

        // Handle specific error types
        let errorMessage = 'Failed to generate images';
        let errorCode = 'GENERATION_FAILED';
        let statusCode = 500;

        if (error instanceof Error) {
            if (error.message.includes('quota')) {
                errorMessage = 'API quota exceeded. Please try again later.';
                errorCode = 'QUOTA_EXCEEDED';
                statusCode = 429;
            } else if (error.message.includes('permission')) {
                errorMessage = 'Insufficient permissions for image generation.';
                errorCode = 'PERMISSION_DENIED';
                statusCode = 403;
            } else if (error.message.includes('safety')) {
                errorMessage = 'Content blocked by safety filters. Please try a different prompt.';
                errorCode = 'SAFETY_VIOLATION';
                statusCode = 400;
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out. Please try again.';
                errorCode = 'TIMEOUT';
                statusCode = 408;
            } else if (error.message.includes('network')) {
                errorMessage = 'Network error occurred. Please check your connection.';
                errorCode = 'NETWORK_ERROR';
                statusCode = 503;
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                code: errorCode,
                processingTimeMs: processingTime,
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: statusCode }
        );
    }
}
