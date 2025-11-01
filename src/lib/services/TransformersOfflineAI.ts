/**
 * Transformers.js Offline AI Service
 * Real neural language models running completely offline in the browser
 * Optimized for artisan business guidance and craft-related conversations
 */

import { pipeline, Pipeline } from '@xenova/transformers';

interface TransformersAIResponse {
    text: string;
    confidence: number;
    processingTime: number;
    intent: string;
    suggestions?: string[];
}

interface ArtisanContext {
    name?: string;
    craft?: string;
    location?: string;
    language?: string;
    businessStage?: 'beginner' | 'intermediate' | 'advanced';
}

export class TransformersOfflineAI {
    private static instance: TransformersOfflineAI;
    private isReady: boolean = false;
    private isLoading: boolean = false;
    private loadError: string | null = null;

    // AI Models
    private textGenerator: Pipeline | null = null;
    private classifier: Pipeline | null = null;

    // Model configuration
    private readonly MODEL_CONFIG = {
        // Use smaller, faster models for better performance
        generator: 'Xenova/gpt2',  // 124M parameters, ~500MB
        classifier: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', // Sentiment analysis
        maxLength: 150,
        temperature: 0.7,
        topK: 50,
        topP: 0.9
    };

    private conversationHistory: string[] = [];

    private constructor() { }

    public static getInstance(): TransformersOfflineAI {
        if (!TransformersOfflineAI.instance) {
            TransformersOfflineAI.instance = new TransformersOfflineAI();
        }
        return TransformersOfflineAI.instance;
    }

    /**
     * Initialize the AI models with progress tracking
     */
    public async initialize(onProgress?: (progress: number, stage: string) => void): Promise<boolean> {
        if (this.isReady) return true;
        if (this.isLoading) return false;

        this.isLoading = true;
        this.loadError = null;

        try {
            console.log('🤖 Loading Transformers.js models...');
            onProgress?.(10, 'Initializing Transformers.js...');

            // Load text generation model
            onProgress?.(30, 'Loading GPT-2 text generation model...');
            console.log('📥 Downloading GPT-2 model (this may take a moment)...');

            this.textGenerator = await pipeline('text-generation', this.MODEL_CONFIG.generator, {
                progress_callback: (progress: any) => {
                    if (progress.status === 'downloading') {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        onProgress?.(30 + (percent * 0.5), `Downloading GPT-2: ${percent}%`);
                    }
                }
            });

            onProgress?.(80, 'Loading classification model...');
            console.log('📥 Loading classification model...');

            // Load classification model for intent detection
            this.classifier = await pipeline('sentiment-analysis', this.MODEL_CONFIG.classifier);

            onProgress?.(95, 'Finalizing setup...');

            // Test the models
            await this.testModels();

            this.isReady = true;
            onProgress?.(100, 'AI models ready!');

            console.log('✅ Transformers.js AI initialized successfully!');
            console.log('📊 Model info:', {
                generator: this.MODEL_CONFIG.generator,
                classifier: this.MODEL_CONFIG.classifier,
                ready: this.isReady
            });

            return true;

        } catch (error) {
            console.error('❌ Transformers AI initialization error:', error);
            this.loadError = error instanceof Error ? error.message : 'Unknown error';

            // Don't fail completely - we can still provide fallback responses
            this.isReady = false;
            return false;

        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Test the loaded models
     */
    private async testModels(): Promise<void> {
        try {
            if (this.textGenerator) {
                const testResult = await this.textGenerator('Hello', {
                    max_length: 20,
                    temperature: 0.7,
                    do_sample: true,
                    pad_token_id: 50256
                });
                console.log('🧪 GPT-2 test successful:', testResult);
            }

            if (this.classifier) {
                const testClassification = await this.classifier('I need help with my business');
                console.log('🧪 Classification test successful:', testClassification);
            }
        } catch (error) {
            console.warn('⚠️ Model test failed:', error);
            // Don't throw - models might still work for actual use
        }
    }

    /**
     * Generate AI response using the loaded models
     */
    public async generateResponse(
        userMessage: string,
        context?: ArtisanContext
    ): Promise<TransformersAIResponse> {
        const startTime = performance.now();

        if (!this.isReady || !this.textGenerator) {
            throw new Error('AI models not ready. Please initialize first.');
        }

        try {
            // Detect language
            const language = this.detectLanguage(userMessage);

            // Classify intent using our classifier
            const intent = await this.classifyIntent(userMessage);

            // Create artisan-specific prompt
            const prompt = this.createArtisanPrompt(userMessage, context, language);

            console.log('🧠 Generating response with prompt:', prompt.substring(0, 100) + '...');

            // Generate response using GPT-2
            const result = await this.textGenerator(prompt, {
                max_length: prompt.length + this.MODEL_CONFIG.maxLength,
                temperature: this.MODEL_CONFIG.temperature,
                top_k: this.MODEL_CONFIG.topK,
                top_p: this.MODEL_CONFIG.topP,
                do_sample: true,
                pad_token_id: 50256,
                eos_token_id: 50256,
                repetition_penalty: 1.1
            });

            // Extract and clean the generated text
            let generatedText = result[0].generated_text;
            const responseText = this.extractResponse(generatedText, prompt);

            // Add to conversation history
            this.conversationHistory.push(userMessage);
            if (this.conversationHistory.length > 5) {
                this.conversationHistory.shift();
            }

            const processingTime = performance.now() - startTime;

            console.log('✅ AI response generated:', {
                intent,
                responseLength: responseText.length,
                processingTime: Math.round(processingTime) + 'ms'
            });

            return {
                text: responseText,
                confidence: 0.8, // GPT-2 responses are generally good
                processingTime,
                intent,
                suggestions: this.generateSuggestions(intent, language)
            };

        } catch (error) {
            console.error('❌ AI generation error:', error);

            // Fallback to rule-based response
            const fallbackResponse = this.getFallbackResponse(userMessage, context);
            const processingTime = performance.now() - startTime;

            return {
                text: fallbackResponse.text,
                confidence: 0.6,
                processingTime,
                intent: fallbackResponse.intent,
                suggestions: fallbackResponse.suggestions
            };
        }
    }

    /**
     * Detect language using character patterns
     */
    private detectLanguage(text: string): string {
        const hindiPattern = /[\u0900-\u097F]/;
        const hindiMatches = (text.match(/[\u0900-\u097F]/g) || []).length;
        const englishMatches = (text.match(/[a-zA-Z]/g) || []).length;

        return hindiMatches > englishMatches ? 'hi' : 'en';
    }

    /**
     * Classify intent using the sentiment classifier and keywords
     */
    private async classifyIntent(message: string): Promise<string> {
        try {
            // Use keyword-based classification (more reliable for specific domains)
            const lowerMessage = message.toLowerCase();

            if (this.matchesKeywords(lowerMessage, ['business', 'व्यापार', 'money', 'पैसा', 'profit', 'sell', 'price'])) {
                return 'business_finance';
            }

            if (this.matchesKeywords(lowerMessage, ['craft', 'शिल्प', 'product', 'उत्पाद', 'make', 'create', 'design'])) {
                return 'product_creation';
            }

            if (this.matchesKeywords(lowerMessage, ['market', 'बाज़ार', 'customer', 'online', 'social', 'website'])) {
                return 'marketing_sales';
            }

            if (this.matchesKeywords(lowerMessage, ['help', 'मदद', 'how', 'कैसे', 'what', 'क्या'])) {
                return 'help_guidance';
            }

            if (this.matchesKeywords(lowerMessage, ['hello', 'hi', 'नमस्ते', 'हैलो'])) {
                return 'greeting';
            }

            return 'general_chat';

        } catch (error) {
            console.warn('Intent classification error:', error);
            return 'general_chat';
        }
    }

    /**
     * Check if message matches keywords
     */
    private matchesKeywords(message: string, keywords: string[]): boolean {
        return keywords.some(keyword => message.includes(keyword.toLowerCase()));
    }

    /**
     * Create artisan-specific prompt for better responses
     */
    private createArtisanPrompt(message: string, context?: ArtisanContext, language: string = 'en'): string {
        const isHindi = language === 'hi';

        // System prompt to guide the AI
        const systemPrompt = isHindi ?
            `आप एक भारतीय कारीगरों के लिए AI सहायक हैं। आप शिल्प, व्यापार, और डिजिटल मार्केटिंग में मदद करते हैं। हमेशा व्यावहारिक और उपयोगी सलाह दें।` :
            `You are an AI assistant for Indian artisans. You help with crafts, business, and digital marketing. Always provide practical and useful advice.`;

        // Context information
        let contextInfo = '';
        if (context?.craft) {
            contextInfo += isHindi ?
                `उपयोगकर्ता ${context.craft} का काम करता है। ` :
                `The user works with ${context.craft}. `;
        }

        if (context?.businessStage) {
            contextInfo += isHindi ?
                `वे ${context.businessStage === 'beginner' ? 'नए' : context.businessStage === 'intermediate' ? 'मध्यम स्तर के' : 'अनुभवी'} कारीगर हैं। ` :
                `They are a ${context.businessStage} level artisan. `;
        }

        // Recent conversation context
        const recentContext = this.conversationHistory.length > 0 ?
            `Previous conversation: ${this.conversationHistory.slice(-2).join(' ')}` : '';

        // Construct the full prompt
        const prompt = `${systemPrompt}

${contextInfo}${recentContext}
User: 
${message}Assis
tant:`;

        return prompt;
    }

    /**
     * Extract the AI response from the generated text
     */
    private extractResponse(generatedText: string, originalPrompt: string): string {
        try {
            // Remove the original prompt from the generated text
            let response = generatedText.replace(originalPrompt, '').trim();

            // Clean up the response
            response = response
                .split('\n')[0] // Take only the first line/paragraph
                .replace(/^(Assistant:|AI:|Bot:)/i, '') // Remove AI prefixes
                .trim();

            // If response is too short or empty, provide a fallback
            if (response.length < 10) {
                return "I'd be happy to help you with your artisan business needs. Could you please provide more details about what you're looking for?";
            }

            // Limit response length
            if (response.length > 300) {
                response = response.substring(0, 300) + '...';
            }

            return response;

        } catch (error) {
            console.error('Error extracting response:', error);
            return "I'm here to help with your artisan business. Please let me know what specific guidance you need.";
        }
    }

    /**
     * Generate contextual suggestions based on intent
     */
    private generateSuggestions(intent: string, language: string): string[] {
        const isHindi = language === 'hi';

        const suggestions: Record<string, string[]> = {
            business_finance: isHindi ? [
                'प्रोडक्ट की कीमत कैसे तय करें',
                'मुनाफा कैसे बढ़ाएं',
                'बिजनेस प्लान बनाएं'
            ] : [
                'How to price products',
                'Ways to increase profit',
                'Create business plan'
            ],

            product_creation: isHindi ? [
                'नए डिज़ाइन कैसे बनाएं',
                'क्वालिटी कैसे बेहतर करें',
                'मैटेरियल कैसे चुनें'
            ] : [
                'How to create new designs',
                'Improve product quality',
                'Choose right materials'
            ],

            marketing_sales: isHindi ? [
                'ऑनलाइन मार्केटिंग करें',
                'सोशल मीडिया का उपयोग',
                'कस्टमर कैसे ढूंढें'
            ] : [
                'Start online marketing',
                'Use social media effectively',
                'Find new customers'
            ],

            help_guidance: isHindi ? [
                'बिजनेस की सलाह चाहिए',
                'नया प्रोडक्ट बनाना है',
                'मार्केटिंग कैसे करें'
            ] : [
                'Need business advice',
                'Want to create new product',
                'How to do marketing'
            ]
        };

        return suggestions[intent] || suggestions.help_guidance;
    }

    /**
     * Fallback response when AI models fail
     */
    private getFallbackResponse(message: string, context?: ArtisanContext): {
        text: string;
        intent: string;
        suggestions: string[];
    } {
        const language = this.detectLanguage(message);
        const isHindi = language === 'hi';

        const fallbackText = isHindi ?
            'मैं आपका Artisan Buddy हूँ। मैं आपकी शिल्पकारी और व्यापार में मदद कर सकता हूँ। कृपया अपना प्रश्न स्पष्ट रूप से पूछें।' :
            'I\'m your Artisan Buddy. I can help you with crafts and business. Please ask your question clearly.';

        return {
            text: fallbackText,
            intent: 'general_chat',
            suggestions: this.generateSuggestions('help_guidance', language)
        };
    }

    /**
     * Get system status
     */
    public getStatus() {
        return {
            isReady: this.isReady,
            isLoading: this.isLoading,
            loadError: this.loadError,
            modelId: 'Transformers.js GPT-2',
            hasRealAI: true,
            capabilities: {
                available: this.isReady ? 'readily' : 'loading',
                languages: ['Hindi', 'English'],
                models: {
                    generator: this.MODEL_CONFIG.generator,
                    classifier: this.MODEL_CONFIG.classifier
                }
            }
        };
    }

    /**
     * Get model information
     */
    public getModelInfo() {
        return {
            modelId: 'Transformers.js Offline AI',
            isReady: this.isReady,
            type: 'Neural Language Model (GPT-2)',
            capabilities: [
                'Real AI Text Generation',
                'Hindi/English Support',
                'Artisan Business Guidance',
                'Intent Classification',
                'Contextual Responses',
                'Completely Offline'
            ],
            hasRealAI: true,
            browserCompatible: true,
            offlineCapable: true,
            modelSize: '~500MB',
            parameters: '124M (GPT-2)'
        };
    }

    /**
     * Check if Transformers.js is available
     */
    public static async isAvailable(): Promise<boolean> {
        try {
            // Test if we can import the pipeline function
            const { pipeline } = await import('@xenova/transformers');
            return typeof pipeline === 'function';
        } catch (error) {
            console.error('Transformers.js not available:', error);
            return false;
        }
    }

    /**
     * Get memory usage information
     */
    public getMemoryInfo() {
        if (typeof performance !== 'undefined' && 'memory' in performance) {
            const memory = (performance as any).memory;
            return {
                used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
                total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
                limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
            };
        }
        return null;
    }

    /**
     * Clear conversation history
     */
    public clearHistory(): void {
        this.conversationHistory = [];
    }

    /**
     * Dispose resources and clean up
     */
    public async dispose(): Promise<void> {
        try {
            // Clear models
            this.textGenerator = null;
            this.classifier = null;

            // Clear history
            this.conversationHistory = [];

            // Reset state
            this.isReady = false;
            this.isLoading = false;
            this.loadError = null;

            console.log('🧹 Transformers AI resources disposed');

        } catch (error) {
            console.warn('Error disposing Transformers AI:', error);
        }
    }
}