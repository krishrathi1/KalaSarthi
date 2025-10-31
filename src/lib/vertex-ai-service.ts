import { GoogleAuth } from 'google-auth-library';

export class VertexAIImageService {
    private auth: GoogleAuth;
    private projectId: string;
    private location: string = 'us-central1';
    private apiEndpoint: string;

    constructor() {
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';

        if (!this.projectId) {
            throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
        }

        this.apiEndpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models`;

        // Initialize Google Auth
        this.auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
    }

    /**
     * Get access token for API calls
     */
    private async getAccessToken(): Promise<string> {
        const client = await this.auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) {
            throw new Error('Failed to get access token');
        }

        return accessToken.token;
    }

    /**
     * Generate design variations with different colors using Vertex AI Imagen
     */
    async generateDesignVariations(
        originalImageUrl: string,
        productName: string,
        colors: string[],
        style?: string
    ): Promise<Array<{ color: string; imageUrl: string; prompt: string }>> {
        const results = [];

        console.log(`Generating ${colors.length} color variations for: ${productName}`);
        console.log('Original image URL:', originalImageUrl);
        console.log('Style:', style || 'default');

        for (const color of colors) {
            try {
                // Build a detailed prompt that describes the product and desired color
                const prompt = this.buildDetailedPromptWithColor(productName, color, style, originalImageUrl);
                console.log(`Generating ${color} variation with prompt:`, prompt);

                // Use text-to-image with detailed description
                // This is more reliable than image editing for color variations
                const requestBody = {
                    instances: [
                        {
                            prompt: prompt,
                        }
                    ],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: '1:1',
                        safetySetting: 'block_some',
                        personGeneration: 'allow_adult',
                    }
                };

                const imageUrl = await this.callImageGenerationAPI(requestBody);

                results.push({
                    color,
                    imageUrl,
                    prompt,
                });

                console.log(`✅ Successfully generated ${color} variation`);
            } catch (error) {
                console.error(`Error generating variation for color ${color}:`, error);
                // Continue with other colors even if one fails
            }
        }

        return results;
    }

    /**
     * Call the Vertex AI Image Generation API
     */
    private async callImageGenerationAPI(requestBody: any): Promise<string> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(
            `${this.apiEndpoint}/imagegeneration@006:predict`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Extract the generated image
        if (data.predictions && data.predictions.length > 0) {
            const prediction = data.predictions[0];

            // The response typically contains bytesBase64Encoded
            if (prediction.bytesBase64Encoded) {
                return `data:image/png;base64,${prediction.bytesBase64Encoded}`;
            } else if (prediction.gcsUri) {
                return prediction.gcsUri;
            }
        }

        throw new Error('No image generated in response');
    }



    /**
     * Edit an existing image with color changes
     */
    async editImageColor(
        imageUrl: string,
        maskUrl: string | null,
        targetColor: string,
        productDescription: string
    ): Promise<string> {
        try {
            const prompt = `Change the color of this ${productDescription} to ${targetColor}. Maintain all other details and quality.`;

            // Fetch and convert image to base64
            let imageBase64 = '';
            if (imageUrl.startsWith('http')) {
                imageBase64 = await this.fetchImageAsBase64(imageUrl);
            } else if (imageUrl.startsWith('data:')) {
                imageBase64 = imageUrl.split(',')[1];
            }

            const requestBody: any = {
                instances: [
                    {
                        prompt: prompt,
                        image: {
                            bytesBase64Encoded: imageBase64,
                        },
                    }
                ],
                parameters: {
                    sampleCount: 1,
                    editMode: 'inpainting-insert',
                }
            };

            // Add mask if provided
            if (maskUrl) {
                let maskBase64 = '';
                if (maskUrl.startsWith('http')) {
                    maskBase64 = await this.fetchImageAsBase64(maskUrl);
                } else if (maskUrl.startsWith('data:')) {
                    maskBase64 = maskUrl.split(',')[1];
                }

                requestBody.instances[0].mask = {
                    bytesBase64Encoded: maskBase64,
                };
            }

            return await this.callImageGenerationAPI(requestBody);
        } catch (error) {
            console.error('Error editing image color:', error);
            throw error;
        }
    }

    /**
     * Build a detailed prompt for design generation
     */
    private buildPrompt(productName: string, color: string, style?: string): string {
        const basePrompt = `Create a beautiful ${color} colored variation of this ${productName} design.`;

        const styleDescriptions: Record<string, string> = {
            traditional: 'with traditional Indian handicraft patterns and motifs',
            modern: 'with contemporary, minimalist aesthetic',
            vibrant: 'with bold, vibrant colors and energetic patterns',
            elegant: 'with sophisticated, elegant details',
            rustic: 'with natural, rustic textures',
            festive: 'with festive, celebratory decorations',
        };

        const styleDesc = style && styleDescriptions[style]
            ? styleDescriptions[style]
            : 'maintaining the original artistic style';

        return `${basePrompt} ${styleDesc}. Keep the same product structure and form, only change the color scheme to ${color}. High quality, professional product photography, well-lit, clean background.`;
    }

    /**
     * Build a prompt specifically for color change operations
     */
    private buildColorChangePrompt(productName: string, color: string, style?: string): string {
        const styleDescriptions: Record<string, string> = {
            traditional: 'Keep the traditional Indian handicraft patterns and motifs.',
            modern: 'Maintain the contemporary, minimalist aesthetic.',
            vibrant: 'Keep the bold, energetic patterns.',
            elegant: 'Preserve the sophisticated, elegant details.',
            rustic: 'Maintain the natural, rustic textures.',
            festive: 'Keep the festive, celebratory decorations.',
        };

        const styleInstruction = style && styleDescriptions[style]
            ? styleDescriptions[style]
            : 'Maintain the original artistic style and patterns.';

        return `Change the main color of this ${productName} to ${color}. ${styleInstruction} Keep the exact same product shape, structure, design patterns, and details. Only change the primary color to ${color} while preserving all other aspects of the product. Professional product photography, same lighting and background.`;
    }

    /**
     * Build a detailed prompt for generating color variations
     * Since image editing requires masks, we use detailed text-to-image instead
     */
    private buildDetailedPromptWithColor(productName: string, color: string, style?: string, imageUrl?: string): string {
        const styleDescriptions: Record<string, string> = {
            traditional: 'traditional Indian handicraft style with intricate patterns and motifs',
            modern: 'modern, contemporary, minimalist design',
            vibrant: 'vibrant, bold, energetic patterns and colors',
            elegant: 'elegant, sophisticated, refined details',
            rustic: 'rustic, natural, earthy textures',
            festive: 'festive, celebratory, decorative elements',
        };

        const styleDesc = style && styleDescriptions[style]
            ? styleDescriptions[style]
            : 'authentic artisan craftsmanship';

        // Build a very detailed prompt
        return `A beautiful ${color} colored ${productName} with ${styleDesc}. Professional product photography, high quality, well-lit, clean white background, centered composition, sharp focus, detailed texture, handcrafted Indian handicraft, artisan made, studio lighting, commercial product photo, 4k resolution.`;
    }

    /**
     * Fetch image from URL and convert to base64
     * Converts AVIF/WebP to PNG for compatibility
     */
    private async fetchImageAsBase64(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Check if image needs conversion (AVIF or WebP)
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('avif') || contentType.includes('webp') || url.includes('.avif') || url.includes('.webp')) {
                // Import sharp dynamically (server-side only)
                const sharp = (await import('sharp')).default;
                const pngBuffer = await sharp(buffer).png().toBuffer();
                return pngBuffer.toString('base64');
            }

            // For JPEG/PNG, return as-is
            return buffer.toString('base64');
        } catch (error) {
            console.error('Error fetching and converting image:', error);
            throw new Error(`Failed to fetch image from URL: ${url}`);
        }
    }

    /**
     * Generate variations using reference image (style transfer approach)
     */
    async generateVariationsWithReference(
        originalImageUrl: string,
        productName: string,
        colors: string[],
        style?: string
    ): Promise<Array<{ color: string; imageUrl: string; prompt: string }>> {
        const results = [];

        // Fetch reference image once
        let referenceImageBase64 = '';
        if (originalImageUrl.startsWith('http')) {
            referenceImageBase64 = await this.fetchImageAsBase64(originalImageUrl);
        } else if (originalImageUrl.startsWith('data:')) {
            referenceImageBase64 = originalImageUrl.split(',')[1];
        }

        for (const color of colors) {
            try {
                const prompt = this.buildPrompt(productName, color, style);

                // Use upscaling/editing endpoint for style preservation
                const requestBody = {
                    instances: [
                        {
                            prompt: prompt,
                            referenceImage: {
                                bytesBase64Encoded: referenceImageBase64,
                            }
                        }
                    ],
                    parameters: {
                        sampleCount: 1,
                        mode: 'stylize', // Try to preserve style from reference
                    }
                };

                const imageUrl = await this.callImageGenerationAPI(requestBody);

                results.push({
                    color,
                    imageUrl,
                    prompt,
                });
            } catch (error) {
                console.error(`Error generating variation for color ${color}:`, error);
            }
        }

        return results;
    }

    /**
     * Simple image generation without reference image
     */
    async generateSimpleImage(prompt: string): Promise<string> {
        const requestBody = {
            instances: [
                {
                    prompt: prompt,
                }
            ],
            parameters: {
                sampleCount: 1,
            }
        };

        return await this.callImageGenerationAPI(requestBody);
    }
}

// Singleton instance
let vertexAIService: VertexAIImageService | null = null;

export function getVertexAIService(): VertexAIImageService {
    if (!vertexAIService) {
        vertexAIService = new VertexAIImageService();
    }
    return vertexAIService;
}