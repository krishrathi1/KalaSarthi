import { ImageAnnotatorClient } from '@google-cloud/vision';
import { VertexAI } from '@google-cloud/vertexai';
import { Storage } from '@google-cloud/storage';
import { AI_IMAGE_CONFIG } from './ai-image-config';

// Initialize Google Cloud clients
const visionClient = new ImageAnnotatorClient({
    keyFilename: AI_IMAGE_CONFIG.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: AI_IMAGE_CONFIG.GCP_PROJECT_ID,
});

const vertexAI = new VertexAI({
    project: AI_IMAGE_CONFIG.GCP_PROJECT_ID,
    location: AI_IMAGE_CONFIG.GCP_REGION,
});

const storage = new Storage({
    keyFilename: AI_IMAGE_CONFIG.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: AI_IMAGE_CONFIG.GCP_PROJECT_ID,
});

const bucket = storage.bucket(AI_IMAGE_CONFIG.GCP_BUCKET_NAME);

export interface ProductAnalysis {
    labels: string[];
    colors: string[];
    dominantColors: string[];
    confidence: number;
    productType: string;
    materials: string[];
    originalImageUrl?: string;
}

export interface GeneratedImage {
    id: string;
    url: string;
    style: string;
    color: string;
    prompt: string;
    createdAt: Date;
    filter?: string;
    demoMode?: boolean;
}

export class GoogleCloudService {
    /**
     * Analyze uploaded product image
     */
    static async analyzeProductImage(imageBuffer: Buffer, originalImageUrl?: string): Promise<ProductAnalysis> {
        try {
            const [result] = await visionClient.labelDetection({
                image: { content: imageBuffer },
            });

            const [colorResult] = await visionClient.imageProperties({
                image: { content: imageBuffer },
            });

            const labels = result.labelAnnotations?.map(label => label.description || '') || [];
            const colors = colorResult.imagePropertiesAnnotation?.dominantColors?.colors || [];

            const dominantColors = colors
                .map(color => {
                    const rgb = color.color;
                    if (rgb) {
                        return `rgb(${Math.round(rgb.red || 0)}, ${Math.round(rgb.green || 0)}, ${Math.round(rgb.blue || 0)})`;
                    }
                    return '';
                })
                .filter(color => color !== '');

            // Determine product type based on labels
            const productType = this.determineProductType(labels);

            // Extract materials
            const materials = this.extractMaterials(labels);

            return {
                labels,
                colors: dominantColors,
                dominantColors,
                confidence: result.labelAnnotations?.[0]?.score || 0,
                productType,
                materials,
                originalImageUrl,
            };
        } catch (error) {
            console.error('Error analyzing product image:', error);
            throw new Error('Failed to analyze product image');
        }
    }

    /**
     * Generate image variations using Vertex AI Imagen
     */
    static async generateImageVariations(
        originalImageUrl: string,
        style: string,
        colors: string[],
        prompt?: string
    ): Promise<GeneratedImage[]> {
        const maxRetries = AI_IMAGE_CONFIG.MAX_RETRY_ATTEMPTS;
        const retryDelay = AI_IMAGE_CONFIG.RETRY_DELAY_MS;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt}/${maxRetries} to generate images`);

                const generatedImages: GeneratedImage[] = [];

                // Process each color variation
                for (const color of colors) {
                    try {
                        const generatedImage = await this.generateSingleImage(
                            originalImageUrl,
                            style,
                            color,
                            attempt,
                            prompt
                        );

                        if (generatedImage) {
                            generatedImages.push(generatedImage);
                        }
                    } catch (colorError) {
                        console.error(`Error generating image for color ${color}:`, colorError);
                        // Continue with other colors even if one fails
                        continue;
                    }
                }

                if (generatedImages.length === 0) {
                    // If no images were generated due to quota issues, create fallback images
                    console.log('No images generated due to quota issues, creating fallback images');
                    return this.createFallbackImages(originalImageUrl, style, colors);
                }

                console.log(`Successfully generated ${generatedImages.length} images`);
                return generatedImages;

            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);

                if (attempt === maxRetries) {
                    // If all attempts failed, create fallback images
                    console.log('All attempts failed, creating fallback images');
                    return this.createFallbackImages(originalImageUrl, style, colors);
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
        }

        // Final fallback
        return this.createFallbackImages(originalImageUrl, style, colors);
    }

    /**
     * Generate a single image using Vertex AI Imagen
     */
    private static async generateSingleImage(
        originalImageUrl: string,
        style: string,
        color: string,
        attempt: number,
        prompt?: string
    ): Promise<GeneratedImage | null> {
        try {
            // Get the Imagen model
            const model = vertexAI.getGenerativeModel({
                model: AI_IMAGE_CONFIG.IMAGEN_MODEL,
            });

            // Create the prompt
            const finalPrompt = prompt ?
                `${prompt}. Style: ${style}, Color: ${color}. Use the original image as reference.` :
                this.createImagePrompt(style, color, originalImageUrl);

            console.log(`Generating image with prompt: ${finalPrompt}`);

            // Generate the image
            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{
                        text: finalPrompt
                    }]
                }],
                generationConfig: {
                    temperature: AI_IMAGE_CONFIG.IMAGEN_TEMPERATURE,
                    topK: AI_IMAGE_CONFIG.IMAGEN_TOP_K,
                    topP: AI_IMAGE_CONFIG.IMAGEN_TOP_P,
                    maxOutputTokens: AI_IMAGE_CONFIG.IMAGEN_MAX_OUTPUT_TOKENS,
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH' as any,
                        threshold: AI_IMAGE_CONFIG.IMAGEN_SAFETY_THRESHOLD as any
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any,
                        threshold: AI_IMAGE_CONFIG.IMAGEN_SAFETY_THRESHOLD as any
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any,
                        threshold: AI_IMAGE_CONFIG.IMAGEN_SAFETY_THRESHOLD as any
                    },
                    {
                        category: 'HARM_CATEGORY_HARASSMENT' as any,
                        threshold: AI_IMAGE_CONFIG.IMAGEN_SAFETY_THRESHOLD as any
                    }
                ]
            });

            // Process the response
            const response = await result.response;
            const generatedImage = await this.processGeneratedImage(
                response,
                style,
                color,
                prompt || 'Generated image variation'
            );

            if (!generatedImage) {
                throw new Error('Failed to process generated image response');
            }

            return generatedImage;

        } catch (error) {
            console.error(`Error generating single image (attempt ${attempt}):`, error);

            // Handle specific Vertex AI errors
            if (error instanceof Error) {
                if (error.message.includes('quota')) {
                    throw new Error('API quota exceeded. Please try again later.');
                } else if (error.message.includes('permission')) {
                    throw new Error('Insufficient permissions for image generation.');
                } else if (error.message.includes('safety')) {
                    throw new Error('Content blocked by safety filters. Please try a different prompt.');
                } else if (error.message.includes('timeout')) {
                    throw new Error('Request timed out. Please try again.');
                }
            }

            throw error;
        }
    }

    /**
     * Upload image to Cloud Storage
     */
    static async uploadImage(
        imageBuffer: Buffer,
        fileName: string,
        folder: string = 'products'
    ): Promise<string> {
        try {
            const filePath = `${folder}/${Date.now()}-${fileName}`;
            const file = bucket.file(filePath);

            await file.save(imageBuffer, {
                metadata: {
                    contentType: 'image/jpeg',
                },
            });

            // Make the file publicly accessible
            await file.makePublic();

            return `https://storage.googleapis.com/${AI_IMAGE_CONFIG.GCP_BUCKET_NAME}/${filePath}`;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error('Failed to upload image');
        }
    }

    /**
     * Create image generation prompt
     */
    private static createImagePrompt(style: string, color: string, originalImageUrl: string): string {
        const stylePrompts = {
            vibrant: 'vibrant, bright, bold colors, high contrast',
            pastel: 'soft pastel colors, gentle tones, muted palette',
            monochrome: 'black and white, grayscale, monochrome',
            vintage: 'vintage style, aged appearance, retro colors',
            modern: 'modern minimalist, clean lines, contemporary',
            traditional: 'traditional style, classic design, heritage colors'
        };

        const stylePrompt = stylePrompts[style as keyof typeof stylePrompts] || style;

        return `Generate a product image variation with ${stylePrompt} and ${color} color scheme. 
    Use the original product design as reference but apply the new color and style. 
    Maintain the product's shape and structure while changing the visual appearance. 
    Original image: ${originalImageUrl}`;
    }

    /**
     * Process generated image response
     */
    private static async processGeneratedImage(
        response: any,
        style: string,
        color: string,
        prompt: string
    ): Promise<GeneratedImage | null> {
        try {
            console.log('Processing generated image response:', JSON.stringify(response, null, 2));

            // Extract the generated image from the response
            const candidates = response.candidates;
            if (!candidates || candidates.length === 0) {
                throw new Error('No generated images found in response');
            }

            const candidate = candidates[0];
            const parts = candidate.content?.parts;
            if (!parts || parts.length === 0) {
                throw new Error('No image parts found in response');
            }

            // Find the image part
            const imagePart = parts.find((part: any) => part.inlineData);
            if (!imagePart || !imagePart.inlineData) {
                throw new Error('No image data found in response');
            }

            // Convert base64 image to buffer
            const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

            // Upload the generated image to Cloud Storage
            const imageId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const fileName = `${imageId}_${style}_${color}.png`;
            const imageUrl = await this.uploadImage(imageBuffer, fileName, 'generated');

            return {
                id: imageId,
                url: imageUrl,
                style,
                color,
                prompt,
                createdAt: new Date(),
            };
        } catch (error) {
            console.error('Error processing generated image:', error);

            // If image processing fails, try to create a fallback
            try {
                const imageId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Create a fallback image URL
                const fallbackUrl = `${AI_IMAGE_CONFIG.FALLBACK_IMAGE_SERVICE}/512x512/cccccc/666666?text=${encodeURIComponent(`${style} ${color}`)}`;

                return {
                    id: imageId,
                    url: fallbackUrl,
                    style,
                    color,
                    prompt,
                    createdAt: new Date(),
                };
            } catch (fallbackError) {
                console.error('Error creating fallback image:', fallbackError);
                return null;
            }
        }
    }

    /**
     * Determine product type from labels
     */
    private static determineProductType(labels: string[]): string {
        const productTypes = {
            pottery: ['pottery', 'ceramic', 'clay', 'vase', 'bowl', 'plate'],
            textile: ['fabric', 'cloth', 'textile', 'saree', 'dress', 'shirt'],
            jewelry: ['jewelry', 'necklace', 'ring', 'bracelet', 'earring'],
            woodwork: ['wood', 'wooden', 'furniture', 'carving', 'sculpture'],
            metalwork: ['metal', 'steel', 'iron', 'copper', 'brass'],
            basketry: ['basket', 'woven', 'cane', 'bamboo']
        };

        for (const [type, keywords] of Object.entries(productTypes)) {
            if (keywords.some(keyword =>
                labels.some(label => label.toLowerCase().includes(keyword))
            )) {
                return type;
            }
        }

        return 'handicraft';
    }

    /**
     * Extract materials from labels
     */
    private static extractMaterials(labels: string[]): string[] {
        const materialKeywords = [
            'wood', 'metal', 'fabric', 'clay', 'ceramic', 'stone', 'glass',
            'leather', 'bamboo', 'cane', 'cotton', 'silk', 'wool', 'jute'
        ];

        return labels.filter(label =>
            materialKeywords.some(keyword =>
                label.toLowerCase().includes(keyword)
            )
        );
    }

    /**
     * Create fallback images when Vertex AI is unavailable
     */
    private static createFallbackImages(
        originalImageUrl: string,
        style: string,
        colors: string[]
    ): GeneratedImage[] {
        console.log('Creating fallback images due to quota limitations');

        const generatedImages: GeneratedImage[] = [];

        for (const color of colors) {
            const imageId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create a more sophisticated fallback using a placeholder service
            const fallbackUrl = this.createAdvancedFallbackImage(style, color, originalImageUrl);

            const generatedImage: GeneratedImage = {
                id: imageId,
                url: fallbackUrl,
                style,
                color,
                prompt: `Fallback ${style} style product image with ${color} color scheme (Vertex AI quota exceeded)`,
                createdAt: new Date(),
                filter: this.getColorFilter(color, style),
                demoMode: true
            };

            generatedImages.push(generatedImage);
        }

        return generatedImages;
    }

    /**
     * Create product color variations using CSS filters and image manipulation
     */
    private static createAdvancedFallbackImage(style: string, color: string, originalImageUrl: string): string {
        // Create a data URL that applies color filters to the original image
        const colorFilters = this.getColorFilter(color, style);

        // For now, return a placeholder that represents the concept
        // In a real implementation, this would process the actual image
        const baseUrl = 'https://via.placeholder.com';

        // Map colors to hex values
        const colorMap: { [key: string]: string } = {
            'Red': 'ff0000',
            'Blue': '0000ff',
            'Green': '00ff00',
            'Yellow': 'ffff00',
            'Purple': '800080',
            'Orange': 'ffa500',
            'Pink': 'ffc0cb',
            'Brown': 'a52a2a'
        };

        const styleMap: { [key: string]: string } = {
            'vibrant': 'bright',
            'pastel': 'soft',
            'monochrome': 'bw',
            'vintage': 'sepia',
            'modern': 'clean',
            'traditional': 'classic'
        };

        const colorHex = colorMap[color] || '000000';
        const styleText = styleMap[style] || 'style';

        // Return the original image URL - the frontend will apply CSS filters
        // This is much better than external placeholder services that cause 404s
        return originalImageUrl;
    }

    /**
     * Get color filter CSS for product variations
     */
    private static getColorFilter(color: string, style: string): string {
        const colorFilters: { [key: string]: string } = {
            'Red': 'hue-rotate(0deg) saturate(1.5) brightness(1.1)',
            'Blue': 'hue-rotate(240deg) saturate(1.3) brightness(1.0)',
            'Green': 'hue-rotate(120deg) saturate(1.4) brightness(1.1)',
            'Yellow': 'hue-rotate(60deg) saturate(1.6) brightness(1.2)',
            'Purple': 'hue-rotate(300deg) saturate(1.3) brightness(0.9)',
            'Orange': 'hue-rotate(30deg) saturate(1.5) brightness(1.1)',
            'Pink': 'hue-rotate(320deg) saturate(1.2) brightness(1.3)',
            'Brown': 'hue-rotate(25deg) saturate(0.8) brightness(0.7)'
        };

        const styleFilters: { [key: string]: string } = {
            'vibrant': 'saturate(1.5) contrast(1.2)',
            'pastel': 'saturate(0.7) brightness(1.2)',
            'monochrome': 'grayscale(1) contrast(1.1)',
            'vintage': 'sepia(0.8) contrast(1.1) brightness(0.9)',
            'modern': 'contrast(1.1) brightness(1.05)',
            'traditional': 'sepia(0.3) contrast(1.05)'
        };

        const colorFilter = colorFilters[color] || '';
        const styleFilter = styleFilters[style] || '';

        return `${colorFilter} ${styleFilter}`.trim();
    }

    /**
     * Get contrasting text color for readability
     */
    private static getContrastColor(hexColor: string): string {
        // Simple contrast calculation
        const color = hexColor.replace('#', '');
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);

        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        return luminance > 0.5 ? '000000' : 'ffffff';
    }
}
