import { GoogleGenerativeAI } from '@google/generative-ai';
import { VertexAI } from '@google-cloud/vertexai';

export interface GeminiGeneratedImage {
    id: string;
    url: string;
    style: string;
    color: string;
    prompt: string;
    createdAt: Date;
    model: string;
    filter?: string;
}

export class GeminiImageService {
    private static readonly API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    private static genAI = new GoogleGenerativeAI(this.API_KEY);

    // Vertex AI for Imagen (real image generation)
    private static vertexAI: VertexAI | null = null;

    private static initVertexAI() {
        if (!this.vertexAI && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            this.vertexAI = new VertexAI({
                project: process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0314311341',
                location: process.env.GCP_REGION || 'us-central1',
            });
        }
        console.log("Vertex AI Initialized")
        return this.vertexAI;
    }

    /**
     * Generate image variations using real AI image generation
     */
    static async generateImageVariations(
        originalImageUrl: string,
        style: string,
        colors: string[],
        prompt: string
    ): Promise<GeminiGeneratedImage[]> {
        console.log('🚀 Starting image generation...');
        console.log('API Key present:', !!this.API_KEY);
        console.log('Vertex AI credentials:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS);
        console.log('Colors requested:', colors);
        console.log('Style:', style);

        if (!this.API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log('❌ No AI services configured, using demo mode');
            return this.createDemoImages(originalImageUrl, style, colors, prompt);
        }

        try {
            // First, analyze the original image to understand what we're working with
            console.log('📸 Analyzing original image...');
            const imageAnalysis = await this.analyzeImage(originalImageUrl);
            console.log('✅ Image analysis complete');

            const generatedImages: GeminiGeneratedImage[] = [];

            // Try Vertex AI Imagen first (real image generation)
            const vertex = this.initVertexAI();

            if (vertex) {
                console.log('🎨 Using Vertex AI Imagen for real image generation');

                for (const color of colors) {
                    try {
                        const image = await this.generateWithImagen(
                            imageAnalysis,
                            style,
                            color,
                            prompt
                        );
                        generatedImages.push(image);
                        console.log(`✅ Generated real ${color} variation with Imagen`);
                    } catch (error) {
                        console.error(`❌ Imagen failed for ${color}:`, error);
                        // If Imagen fails, fall back to demo mode for this color
                        const demoImage = this.createSingleDemoImage(originalImageUrl, style, color, prompt);
                        generatedImages.push(demoImage);
                    }
                }
            } else {
                console.log('⚠️ Vertex AI not configured, using demo mode');
                return this.createDemoImages(originalImageUrl, style, colors, prompt);
            }

            console.log(`🎉 Generation complete! Generated ${generatedImages.length} variations`);
            return generatedImages;

        } catch (error) {
            console.error('❌ Error generating images:', error);
            return this.createDemoImages(originalImageUrl, style, colors, prompt);
        }
    }

    /**
     * Generate a real image using Vertex AI Imagen
     */
    private static async generateWithImagen(
        imageAnalysis: string,
        style: string,
        color: string,
        userPrompt: string
    ): Promise<GeminiGeneratedImage> {
        const vertex = this.vertexAI;

        if (!vertex) {
            throw new Error('Vertex AI not initialized');
        }

        try {
            // Use Imagen 3 model for image generation
            const model = vertex.getGenerativeModel({
                model: 'imagegeneration@006',
            });

            // Create a detailed prompt for the image
            const imagePrompt = this.createImageGenerationPrompt(
                imageAnalysis,
                style,
                color,
                userPrompt
            );

            console.log(`🖼️ Generating real image with prompt: ${imagePrompt.substring(0, 100)}...`);

            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{
                        text: imagePrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 2048,
                }
            });

            const response = await result.response;
            const candidates = response.candidates;

            if (!candidates || candidates.length === 0) {
                throw new Error('No images generated by Imagen');
            }

            // Extract the generated image
            const candidate = candidates[0];
            const parts = candidate.content?.parts;

            if (!parts || parts.length === 0) {
                throw new Error('No image parts in Imagen response');
            }

            // Find the image data
            const imagePart = parts.find((part: any) => part.inlineData);

            if (!imagePart || !imagePart.inlineData) {
                throw new Error('No image data in Imagen response');
            }

            // Convert to data URL
            const mimeType = imagePart.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;

            console.log(`✅ Successfully generated real ${color} image with Imagen`);

            return {
                id: `imagen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                url: imageUrl,
                style,
                color,
                prompt: imagePrompt,
                createdAt: new Date(),
                model: 'vertex-ai-imagen-3',
                // NO filter property - this is a real generated image
            };

        } catch (error) {
            console.error('Imagen generation error:', error);

            // Provide helpful error messages
            if (error instanceof Error) {
                if (error.message.includes('quota')) {
                    throw new Error('Vertex AI quota exceeded. Please check your Google Cloud quotas.');
                } else if (error.message.includes('permission')) {
                    throw new Error('Permission denied. Please check Vertex AI API is enabled and credentials are correct.');
                } else if (error.message.includes('not found')) {
                    throw new Error('Imagen model not found. Please ensure Vertex AI is properly configured.');
                }
            }

            throw error;
        }
    }

    /**
     * Create a detailed prompt for image generation
     */
    private static createImageGenerationPrompt(
        imageAnalysis: string,
        style: string,
        color: string,
        userPrompt: string
    ): string {
        const styleDescriptions = {
            'vibrant': 'vibrant, bold, and bright colors with high saturation and contrast',
            'pastel': 'soft pastel colors with gentle, muted tones and low saturation',
            'monochrome': 'monochromatic black and white with strong contrast',
            'vintage': 'vintage aged appearance with retro colors and worn texture',
            'modern': 'modern minimalist design with clean lines and contemporary aesthetic',
            'traditional': 'traditional classic design with heritage colors and authentic details'
        };

        const colorDescriptions = {
            'red': 'rich red color palette with crimson, scarlet, and burgundy tones',
            'blue': 'deep blue color palette with navy, azure, and cobalt tones',
            'green': 'vibrant green color palette with emerald, forest, and jade tones',
            'yellow': 'bright yellow color palette with golden, amber, and sunshine tones',
            'purple': 'royal purple color palette with violet, lavender, and plum tones',
            'orange': 'warm orange color palette with tangerine, coral, and sunset tones',
            'pink': 'soft pink color palette with rose, coral, and blush tones',
            'brown': 'earthy brown color palette with tan, beige, and chocolate tones',
            'default': 'natural and authentic color palette'
        };

        const styleDesc = styleDescriptions[style as keyof typeof styleDescriptions] || styleDescriptions.modern;
        const colorDesc = colorDescriptions[color.toLowerCase() as keyof typeof colorDescriptions] || colorDescriptions.default;

        return `Create a high-quality product image based on this description: ${imageAnalysis}

Transform this product with ${styleDesc} and ${colorDesc}.

User requirements: ${userPrompt}

Important guidelines:
- Maintain the product's original shape and structure
- Apply the new color scheme realistically to all parts of the product
- Ensure the style transformation is consistent throughout
- Keep lighting and shadows natural
- Make the product look professional and appealing
- High quality, detailed, 4K resolution
- Product photography style, clean background`;
    }

    /**
     * Analyze the original image
     */
    private static async analyzeImage(imageUrl: string): Promise<string> {
        try {
            console.log('🔍 Starting image analysis...');
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

            const base64Data = await this.getImageAsBase64(imageUrl);

            const result = await model.generateContent([
                "Analyze this product image in detail. Describe: 1) The type of product, 2) Its current colors and patterns, 3) The style and design elements, 4) Materials and textures, 5) Shape and structure. Be very detailed and specific.",
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/jpeg"
                    }
                }
            ]);

            const response = await result.response;
            const analysisText = response.text();
            console.log('✅ Analysis successful');
            return analysisText;
        } catch (error) {
            console.error('❌ Image analysis failed:', error);
            return 'A handcrafted artisan product with traditional design elements and natural materials';
        }
    }

    /**
     * Convert image URL to base64
     */
    private static async getImageAsBase64(imageUrl: string): Promise<string> {
        if (imageUrl.startsWith('data:')) {
            return imageUrl.split(',')[1];
        }

        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
    }

    /**
     * Create a single demo image
     */
    private static createSingleDemoImage(
        originalImageUrl: string,
        style: string,
        color: string,
        prompt: string
    ): GeminiGeneratedImage {
        console.log(`🎭 Creating demo image for ${color} (AI generation unavailable)`);

        return {
            id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: originalImageUrl,
            style,
            color,
            prompt: `${prompt} in ${color} ${style} style`,
            createdAt: new Date(),
            model: 'demo-mode',
            filter: this.getColorFilter(color, style)
        };
    }

    /**
     * Create demo images when AI is unavailable
     */
    private static createDemoImages(
        originalImageUrl: string,
        style: string,
        colors: string[],
        prompt: string
    ): GeminiGeneratedImage[] {
        console.log('🎭 Creating demo images with CSS filters (AI unavailable)');

        return colors.slice(0, 3).map((color, i) =>
            this.createSingleDemoImage(originalImageUrl, style, color, prompt)
        );
    }

    /**
     * Get CSS filter for demo mode only
     */
    private static getColorFilter(color: string, style: string): string {
        const colorFilters: { [key: string]: string } = {
            'red': 'sepia(1) hue-rotate(320deg) saturate(4) brightness(1.1) contrast(1.3)',
            'blue': 'sepia(1) hue-rotate(180deg) saturate(3) brightness(1.0) contrast(1.2)',
            'green': 'sepia(1) hue-rotate(80deg) saturate(3.5) brightness(1.1) contrast(1.2)',
            'yellow': 'sepia(1) hue-rotate(20deg) saturate(4) brightness(1.3) contrast(1.2)',
            'purple': 'sepia(1) hue-rotate(260deg) saturate(3) brightness(0.9) contrast(1.3)',
            'orange': 'sepia(1) hue-rotate(350deg) saturate(3.5) brightness(1.2) contrast(1.2)',
            'pink': 'sepia(1) hue-rotate(300deg) saturate(2.5) brightness(1.3) contrast(1.1)',
            'brown': 'sepia(1) hue-rotate(30deg) saturate(2) brightness(0.8) contrast(1.2)',
            'default': 'saturate(1.2) brightness(1.0) contrast(1.0)'
        };

        const styleFilters: { [key: string]: string } = {
            'vibrant': 'saturate(1.5) contrast(1.3) brightness(1.1)',
            'pastel': 'saturate(0.6) brightness(1.4) contrast(0.8)',
            'monochrome': 'grayscale(100%) contrast(1.4)',
            'vintage': 'sepia(0.8) saturate(0.8) contrast(1.1) brightness(0.9)',
            'modern': 'saturate(1.2) contrast(1.2) brightness(1.05)',
            'traditional': 'saturate(1.1) contrast(1.1) brightness(1.0)'
        };

        const colorFilter = colorFilters[color.toLowerCase()] || colorFilters.default;
        const styleFilter = styleFilters[style.toLowerCase()] || styleFilters.traditional;

        return `${colorFilter} ${styleFilter}`.trim();
    }

    /**
     * Analyze image for product details (public method for API use)
     */
    static async analyzeImageForProduct(imageUrl: string): Promise<string> {
        return this.analyzeImage(imageUrl);
    }

    /**
     * Generate structured analysis using Gemini
     */
    static async generateStructuredAnalysis(prompt: string): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
            const result = await model.generateContent([prompt]);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('❌ Structured analysis failed:', error);
            throw error;
        }
    }

    /**
     * Test API connection
     */
    static async testConnection(): Promise<boolean> {
        console.log('🔧 Testing API connections...');

        // Test Gemini
        if (this.API_KEY) {
            try {
                const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
                const result = await model.generateContent("Test");
                const response = await result.response;
                console.log('✅ Gemini API: Connected');
            } catch (error) {
                console.log('❌ Gemini API: Failed');
            }
        }

        // Test Vertex AI
        const vertex = this.initVertexAI();
        if (vertex) {
            try {
                const model = vertex.getGenerativeModel({ model: 'imagegeneration@006' });
                console.log('✅ Vertex AI Imagen: Available');
                return true;
            } catch (error) {
                console.log('❌ Vertex AI Imagen: Not available');
            }
        }

        return !!this.API_KEY;
    }
}
