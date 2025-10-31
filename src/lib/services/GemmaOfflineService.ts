/**
 * Gemma Offline AI Service
 * Runs Google Gemma 2B model in the browser for offline AI chat
 */

import { pipeline, Pipeline } from '@xenova/transformers';

export class GemmaOfflineService {
    private static instance: GemmaOfflineService;
    private generator: Pipeline | null = null;
    private isLoading = false;
    private isLoaded = false;
    private loadError: string | null = null;

    private constructor() { }

    public static getInstance(): GemmaOfflineService {
        if (!GemmaOfflineService.instance) {
            GemmaOfflineService.instance = new GemmaOfflineService();
        }
        return GemmaOfflineService.instance;
    }

    /**
     * Initialize and load the Gemma model
     */
    public async initialize(): Promise<boolean> {
        if (this.isLoaded) {
            return true;
        }

        if (this.isLoading) {
            // Wait for current loading to complete
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.isLoading) {
                        clearInterval(checkInterval);
                        resolve(this.isLoaded);
                    }
                }, 100);
            });
        }

        try {
            this.isLoading = true;
            console.log('🤖 Loading Gemma 2B model for offline AI...');

            // Load the text generation pipeline with Gemma 2B
            this.generator = await pipeline(
                'text-generation',
                'Xenova/gemma-2b-it-GGUF',
                {
                    dtype: 'q4', // Quantized for faster loading
                    device: 'wasm', // Use WebAssembly for compatibility
                }
            );

            this.isLoaded = true;
            this.loadError = null;
            console.log('✅ Gemma model loaded successfully!');
            return true;
        } catch (error) {
            console.error('❌ Failed to load Gemma model:', error);
            this.loadError = error instanceof Error ? error.message : 'Unknown error';
            this.isLoaded = false;
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Generate AI response using Gemma
     */
    public async generateResponse(
        userMessage: string,
        systemPrompt?: string
    ): Promise<string> {
        if (!this.isLoaded || !this.generator) {
            throw new Error('Gemma model not loaded. Call initialize() first.');
        }

        try {
            console.log('🤖 Generating response with Gemma...');

            // Build the prompt with system context
            const fullPrompt = systemPrompt
                ? `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`
                : `User: ${userMessage}\nAssistant:`;

            // Generate response
            const result = await this.generator(fullPrompt, {
                max_new_tokens: 256,
                temperature: 0.7,
                top_p: 0.9,
                do_sample: true,
            });

            // Extract the generated text
            const generatedText = Array.isArray(result)
                ? result[0]?.generated_text || ''
                : result.generated_text || '';

            // Clean up the response (remove the prompt part)
            const response = generatedText
                .replace(fullPrompt, '')
                .trim();

            console.log('✅ Gemma response generated');
            return response || 'I apologize, but I could not generate a proper response. Please try again.';
        } catch (error) {
            console.error('❌ Gemma generation error:', error);
            throw new Error('Failed to generate response with Gemma');
        }
    }

    /**
     * Check if model is ready
     */
    public isReady(): boolean {
        return this.isLoaded && this.generator !== null;
    }

    /**
     * Check if model is currently loading
     */
    public isModelLoading(): boolean {
        return this.isLoading;
    }

    /**
     * Get load error if any
     */
    public getLoadError(): string | null {
        return this.loadError;
    }

    /**
     * Get artisan-specific system prompt
     */
    public getArtisanSystemPrompt(language: string = 'en'): string {
        if (language === 'hi') {
            return `आप एक AI सहायक हैं जो भारतीय शिल्पकारों की मदद करते हैं। आप शिल्प, व्यापार, और डिजिटल खाता प्रबंधन में विशेषज्ञ हैं। संक्षिप्त और व्यावहारिक सलाह दें।`;
        } else {
            return `You are an AI assistant helping Indian artisans. You are an expert in crafts, business, and digital ledger management. Provide concise and practical advice.`;
        }
    }
}
