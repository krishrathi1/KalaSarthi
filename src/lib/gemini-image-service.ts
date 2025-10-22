import { GoogleGenerativeAI } from '@google/generative-ai';

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

    /**
     * Generate image variations using Gemini Vision + description
     */
    static async generateImageVariations(
        originalImageUrl: string,
        style: string,
        colors: string[],
        prompt: string
    ): Promise<GeminiGeneratedImage[]> {
        console.log('🚀 Starting Gemini image generation...');
        console.log('API Key present:', !!this.API_KEY);
        console.log('Colors requested:', colors);
        console.log('Style:', style);

        if (!this.API_KEY) {
            console.log('❌ Gemini API key not configured, using demo mode');
            return this.createDemoImages(originalImageUrl, style, colors, prompt);
        }

        try {
            console.log('📸 Analyzing original image...');
            // First, analyze the original image to understand what we're working with
            const imageAnalysis = await this.analyzeImage(originalImageUrl);
            console.log('✅ Image analysis complete:', imageAnalysis.substring(0, 100) + '...');

            const generatedImages: GeminiGeneratedImage[] = [];

            // Generate variations for each color
            for (const color of colors) {
                console.log(`🎨 Processing color variation: ${color}`);
                const variationPrompt = this.createVariationPrompt(imageAnalysis, style, color, prompt);

                // For now, we'll create enhanced descriptions and use the original image with filters
                // This is more reliable than trying to generate completely new images
                const image = await this.createEnhancedVariation(
                    originalImageUrl,
                    variationPrompt,
                    style,
                    color
                );

                if (image) {
                    console.log(`✅ Generated ${color} variation with model: ${image.model}`);
                    generatedImages.push(image);
                }
            }

            console.log(`🎉 Gemini generation complete! Generated ${generatedImages.length} variations`);
            return generatedImages;
        } catch (error) {
            console.error('❌ Error generating images with Gemini:', error);
            return this.createDemoImages(originalImageUrl, style, colors, prompt);
        }
    }

    /**
     * Analyze the original image to understand its content
     */
    private static async analyzeImage(imageUrl: string): Promise<string> {
        try {
            console.log('🔍 Starting Gemini image analysis...');
            // Use gemini-2.0-flash-001 for vision tasks (supports multimodal input)
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

            console.log('📤 Converting image to base64...');
            const base64Data = await this.getImageAsBase64(imageUrl);
            console.log('✅ Image converted, size:', base64Data.length, 'characters');

            console.log('🤖 Calling Gemini API for image analysis...');
            const result = await model.generateContent([
                "Analyze this product image and describe it in detail. Focus on: 1) What type of product it is, 2) Its current colors, 3) Its style and design elements, 4) Materials and textures visible. Be concise but detailed.",
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/jpeg"
                    }
                }
            ]);

            const response = await result.response;
            const analysisText = response.text();
            console.log('✅ Gemini analysis successful:', analysisText.substring(0, 100) + '...');
            return analysisText;
        } catch (error) {
            console.error('❌ Gemini image analysis failed:', error);
            console.log('🔄 Using fallback analysis');
            return 'A handcrafted product with traditional design elements';
        }
    }

    /**
     * Convert image URL to base64
     */
    private static async getImageAsBase64(imageUrl: string): Promise<string> {
        if (imageUrl.startsWith('data:')) {
            // Already base64
            return imageUrl.split(',')[1];
        }

        try {
            const response = await fetch(imageUrl);
            const buffer = await response.arrayBuffer();
            return Buffer.from(buffer).toString('base64');
        } catch (error) {
            console.error('Error converting image to base64:', error);
            throw error;
        }
    }

    /**
     * Create enhanced variation with AI-generated description
     */
    private static async createEnhancedVariation(
        originalImageUrl: string,
        prompt: string,
        style: string,
        color: string
    ): Promise<GeminiGeneratedImage> {
        let enhancedDescription = `${prompt} in ${color} ${style} style`;
        let model = 'gemini-fallback';

        try {
            console.log(`🤖 Attempting Gemini API call for ${color} variation...`);
            // Use gemini-2.0-flash-001 for text generation
            const genAI = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

            // Try to get enhanced description from Gemini (text-only, no image to avoid issues)
            const enhancementPrompt = `Describe how a handcrafted product would look if transformed with ${style} styling and ${color} color scheme. Focus on specific visual changes, color transformations, and style adaptations. Be detailed about the visual appearance.`;

            console.log(`📤 Sending prompt to Gemini: ${enhancementPrompt.substring(0, 100)}...`);
            const result = await genAI.generateContent(enhancementPrompt);
            const response = await result.response;
            enhancedDescription = response.text();
            model = 'gemini-2.0-flash';

            console.log(`✅ Gemini API call successful for ${color}:`, enhancedDescription.substring(0, 100) + '...');

        } catch (error) {
            console.error(`❌ Gemini API call failed for ${color}:`, error);
            console.log(`🔄 Using fallback description for ${color}`);
        }

        // Always return with CSS filter for visual color change
        const filter = this.getColorFilter(color, style);
        console.log(`🎨 Generated CSS filter for ${color}:`, filter);

        return {
            id: `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: originalImageUrl,
            style,
            color,
            prompt: enhancedDescription,
            createdAt: new Date(),
            model,
            filter // Add CSS filter for visual change
        };
    }

    /**
     * Get CSS filter for color transformation
     */
    private static getColorFilter(color: string, style: string): string {
        // More dramatic color filters for better visual impact
        const colorFilters: { [key: string]: string } = {
            'red': 'hue-rotate(0deg) saturate(3.0) brightness(1.2) contrast(1.4) sepia(0.3)',
            'blue': 'hue-rotate(240deg) saturate(2.5) brightness(1.0) contrast(1.3)',
            'green': 'hue-rotate(120deg) saturate(2.8) brightness(1.1) contrast(1.3)',
            'yellow': 'hue-rotate(60deg) saturate(3.5) brightness(1.4) contrast(1.3)',
            'purple': 'hue-rotate(300deg) saturate(2.2) brightness(0.9) contrast(1.3)',
            'orange': 'hue-rotate(30deg) saturate(3.0) brightness(1.3) contrast(1.2)',
            'pink': 'hue-rotate(320deg) saturate(2.0) brightness(1.4) contrast(1.1)',
            'brown': 'hue-rotate(25deg) saturate(1.2) brightness(0.8) contrast(1.2) sepia(0.4)',
            'default': 'saturate(1.2) brightness(1.0) contrast(1.0)'
        };

        const styleFilters: { [key: string]: string } = {
            'vibrant': 'saturate(2.5) contrast(1.5) brightness(1.2)',
            'pastel': 'saturate(0.4) brightness(1.6) contrast(0.7)',
            'monochrome': 'grayscale(100%) contrast(1.4)',
            'vintage': 'sepia(0.8) saturate(0.6) contrast(1.1) brightness(0.8)',
            'modern': 'saturate(1.3) contrast(1.3) brightness(1.1)',
            'traditional': 'saturate(1.1) contrast(1.1) brightness(1.0)'
        };

        const colorFilter = colorFilters[color.toLowerCase()] || colorFilters.default;
        const styleFilter = styleFilters[style.toLowerCase()] || styleFilters.traditional;

        return `${colorFilter} ${styleFilter}`.trim();
    }

    /**
     * Create variation prompt for image generation
     */
    private static createVariationPrompt(
        imageAnalysis: string,
        style: string,
        color: string,
        userPrompt: string
    ): string {
        const stylePrompts = {
            'vibrant': 'with vibrant, bright, bold colors and high contrast',
            'pastel': 'with soft pastel colors, gentle tones, and muted palette',
            'monochrome': 'in black and white, grayscale, monochrome style',
            'vintage': 'with vintage style, aged appearance, and retro colors',
            'modern': 'with modern minimalist, clean lines, and contemporary look',
            'traditional': 'with traditional style, classic design, and heritage colors'
        };

        const colorPrompts = {
            'red': 'predominantly red color scheme with crimson, burgundy, and scarlet tones',
            'blue': 'predominantly blue color scheme with navy, sky blue, and azure tones',
            'green': 'predominantly green color scheme with emerald, forest green, and mint tones',
            'yellow': 'predominantly yellow color scheme with golden, amber, and sunshine tones',
            'purple': 'predominantly purple color scheme with violet, lavender, and plum tones',
            'orange': 'predominantly orange color scheme with tangerine, peach, and sunset tones',
            'pink': 'predominantly pink color scheme with rose, coral, and blush tones',
            'brown': 'predominantly brown color scheme with tan, beige, and earth tones',
            'default': 'with natural colors and authentic tones'
        };

        const stylePrompt = stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.modern;
        const colorPrompt = colorPrompts[color.toLowerCase() as keyof typeof colorPrompts] || colorPrompts.default;

        return `${userPrompt} - Transform this product (${imageAnalysis}) ${stylePrompt} and ${colorPrompt}`;
    }

    /**
     * Create demo images when API is not available
     */
    private static createDemoImages(
        originalImageUrl: string,
        style: string,
        colors: string[],
        prompt: string
    ): GeminiGeneratedImage[] {
        console.log('🎭 Creating demo images with CSS filters');
        const demoImages: GeminiGeneratedImage[] = [];

        for (let i = 0; i < Math.min(colors.length, 3); i++) {
            const color = colors[i];
            const filter = this.getColorFilter(color, style);
            console.log(`🎨 Demo filter for ${color}:`, filter);

            const demoImage: GeminiGeneratedImage = {
                id: `demo_${Date.now()}_${i}`,
                url: originalImageUrl,
                style,
                color,
                prompt: `${prompt} in ${color} ${style} style`,
                createdAt: new Date(),
                model: 'demo-mode',
                filter
            };
            demoImages.push(demoImage);
        }

        return demoImages;
    }

    /**
     * Test API connection
     */
    static async testConnection(): Promise<boolean> {
        console.log('🔧 Testing Gemini API connection...');
        if (!this.API_KEY) {
            console.log('❌ No API key found');
            return false;
        }

        try {
            // Use gemini-2.0-flash-001 for testing
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
            const result = await model.generateContent("Test connection");
            const response = await result.response;
            const success = !!response.text();
            console.log(success ? '✅ Gemini API connection successful' : '❌ Gemini API connection failed');
            return success;
        } catch (error) {
            console.error('❌ Gemini API test failed:', error);
            return false;
        }
    }
}