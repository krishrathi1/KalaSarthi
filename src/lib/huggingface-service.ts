// Hugging Face API Service for AI Image Generation
export interface HuggingFaceImage {
    id: string;
    url: string;
    style: string;
    color: string;
    prompt: string;
    createdAt: Date;
    model: string;
}

export class HuggingFaceService {
    private static readonly API_BASE = 'https://api-inference.huggingface.co/models';
    private static readonly API_KEY = process.env.HUGGINGFACE_API_KEY || '';

    // Popular image generation models
    private static readonly MODELS = {
        'stable-diffusion': 'runwayml/stable-diffusion-v1-5',
        'realistic': 'stabilityai/stable-diffusion-2-1',
        'anime': 'gsdf/Counterfeit-V2.5',
        'realistic-v2': 'stabilityai/stable-diffusion-xl-base-1.0'
    };

    /**
     * Generate image variations using Hugging Face API
     */
    static async generateImageVariations(
        originalImageUrl: string,
        style: string,
        colors: string[],
        prompt: string
    ): Promise<HuggingFaceImage[]> {
        if (!this.API_KEY) {
            console.log('Hugging Face API key not configured, using demo mode');
            return this.createDemoImages(originalImageUrl, style, colors, prompt);
        }

        const generatedImages: HuggingFaceImage[] = [];

        try {
            // Generate variations for each color
            for (const color of colors) {
                const variationPrompt = this.createVariationPrompt(originalImageUrl, style, color, prompt);

                // Try different models for variety
                const models = Object.values(this.MODELS);
                const model = models[Math.floor(Math.random() * models.length)];

                const image = await this.generateSingleImage(variationPrompt, model, style, color);
                if (image) {
                    generatedImages.push(image);
                }
            }
        } catch (error) {
            console.error('Error generating images with Hugging Face:', error);
            return this.createDemoImages(originalImageUrl, style, colors, prompt);
        }

        return generatedImages.length > 0 ? generatedImages : this.createDemoImages(originalImageUrl, style, colors, prompt);
    }

    /**
     * Generate a single image using Hugging Face API
     */
    private static async generateSingleImage(
        prompt: string,
        model: string,
        style: string,
        color: string
    ): Promise<HuggingFaceImage | null> {
        try {
            const response = await fetch(`${this.API_BASE}/${model}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        num_inference_steps: 20,
                        guidance_scale: 7.5,
                        width: 512,
                        height: 512
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Hugging Face API error: ${response.status}`);
            }

            const imageBlob = await response.blob();
            const imageUrl = await this.uploadImageToCloudinary(imageBlob);

            return {
                id: `hf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                url: imageUrl,
                style,
                color,
                prompt,
                createdAt: new Date(),
                model
            };

        } catch (error) {
            console.error(`Error generating image with model ${model}:`, error);
            return null;
        }
    }

    /**
     * Upload image to Cloudinary (free tier available)
     */
    private static async uploadImageToCloudinary(imageBlob: Blob): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('file', imageBlob);
            formData.append('upload_preset', 'ml_default'); // Use unsigned preset

            const response = await fetch('https://api.cloudinary.com/v1_1/demo/image/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Cloudinary upload failed');
            }

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            // Fallback to data URL
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(imageBlob);
            });
        }
    }

    /**
     * Create variation prompt for image generation
     */
    private static createVariationPrompt(
        originalImageUrl: string,
        style: string,
        color: string,
        userPrompt: string
    ): string {
        const stylePrompts = {
            'vibrant': 'vibrant, bright, bold colors, high contrast, energetic',
            'pastel': 'soft pastel colors, gentle tones, muted palette, dreamy',
            'monochrome': 'black and white, grayscale, monochrome, classic',
            'vintage': 'vintage style, aged appearance, retro colors, nostalgic',
            'modern': 'modern minimalist, clean lines, contemporary, sleek',
            'traditional': 'traditional style, classic design, heritage colors, authentic'
        };

        const colorPrompts = {
            'red': 'red color scheme, crimson, burgundy, scarlet',
            'blue': 'blue color scheme, navy, sky blue, azure',
            'green': 'green color scheme, emerald, forest green, mint',
            'yellow': 'yellow color scheme, golden, amber, sunshine',
            'purple': 'purple color scheme, violet, lavender, plum',
            'orange': 'orange color scheme, tangerine, peach, sunset',
            'pink': 'pink color scheme, rose, coral, blush',
            'brown': 'brown color scheme, tan, beige, earth tones',
            'default': 'natural colors, authentic tones'
        };

        const stylePrompt = stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.modern;
        const colorPrompt = colorPrompts[color.toLowerCase() as keyof typeof colorPrompts] || colorPrompts.default;

        return `${userPrompt}, ${stylePrompt}, ${colorPrompt}, high quality, detailed, professional product photography`;
    }

    /**
     * Create demo images when API is not available
     */
    private static createDemoImages(
        originalImageUrl: string,
        style: string,
        colors: string[],
        prompt: string
    ): HuggingFaceImage[] {
        const demoImages: HuggingFaceImage[] = [];

        for (let i = 0; i < Math.min(colors.length, 3); i++) {
            const color = colors[i];
            const demoImage: HuggingFaceImage = {
                id: `demo_${Date.now()}_${i}`,
                url: originalImageUrl,
                style,
                color,
                prompt: `${prompt} in ${color} ${style} style`,
                createdAt: new Date(),
                model: 'demo-mode'
            };
            demoImages.push(demoImage);
        }

        return demoImages;
    }

    /**
     * Test API connection
     */
    static async testConnection(): Promise<boolean> {
        if (!this.API_KEY) {
            return false;
        }

        try {
            const response = await fetch(`${this.API_BASE}/runwayml/stable-diffusion-v1-5`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: 'test image',
                    parameters: { num_inference_steps: 1 }
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Hugging Face API test failed:', error);
            return false;
        }
    }
}
