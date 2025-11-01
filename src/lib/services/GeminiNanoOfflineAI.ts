/**
 * Gemini Nano Offline AI Service
 * Uses Google's Gemini Nano for real local inference in the browser
 */

interface GeminiNanoResponse {
    text: string;
    confidence: number;
    processingTime: number;
}

interface GeminiNanoSession {
    prompt: (text: string) => Promise<string>;
    destroy: () => void;
}

declare global {
    interface Window {
        ai?: {
            languageModel?: {
                capabilities: () => Promise<{
                    available: 'readily' | 'after-download' | 'no';
                    defaultTopK?: number;
                    maxTopK?: number;
                    defaultTemperature?: number;
                }>;
                create: (options?: {
                    systemPrompt?: string;
                    temperature?: number;
                    topK?: number;
                }) => Promise<GeminiNanoSession>;
            };
        };
    }
}

export class GeminiNanoOfflineAI {
    private static instance: GeminiNanoOfflineAI;
    private isReady: boolean = false;
    private isLoading: boolean = false;
    private loadError: string | null = null;
    private session: GeminiNanoSession | null = null;
    private capabilities: any = null;

    private constructor() { }

    public static getInstance(): GeminiNanoOfflineAI {
        if (!GeminiNanoOfflineAI.instance) {
            GeminiNanoOfflineAI.instance = new GeminiNanoOfflineAI();
        }
        return GeminiNanoOfflineAI.instance;
    }

    /**
     * Initialize Gemini Nano AI
     */
    public async initialize(onProgress?: (progress: number, stage: string) => void): Promise<boolean> {
        if (this.isReady) return true;
        if (this.isLoading) return false;

        this.isLoading = true;
        this.loadError = null;

        try {
            console.log('🤖 Initializing Gemini Nano for offline AI...');
            onProgress?.(10, 'Checking Gemini Nano availability...');

            // Check if Gemini Nano is available
            if (!window.ai?.languageModel) {
                console.log('ℹ️ Gemini Nano not available in this browser - using fallback');
                throw new Error('Gemini Nano not available - requires Chrome 127+ with Prompt API enabled');
            }

            onProgress?.(30, 'Checking capabilities...');

            // Check capabilities
            this.capabilities = await window.ai.languageModel.capabilities();
            console.log('📊 Gemini Nano capabilities:', this.capabilities);

            if (this.capabilities.available === 'no') {
                throw new Error('Gemini Nano is not available on this device');
            }

            if (this.capabilities.available === 'after-download') {
                onProgress?.(50, 'Downloading Gemini Nano model...');
                console.log('📥 Gemini Nano model needs to be downloaded...');
            } else {
                onProgress?.(50, 'Model ready, creating session...');
            }

            // Create AI session with artisan-specific system prompt
            onProgress?.(70, 'Creating AI session...');

            const systemPrompt = this.buildArtisanSystemPrompt();

            this.session = await window.ai.languageModel.create({
                systemPrompt,
                temperature: 0.7,
                topK: this.capabilities.maxTopK || 3
            });

            onProgress?.(90, 'Testing AI session...');

            // Test the session
            const testResponse = await this.session.prompt('Hello');
            if (!testResponse) {
                throw new Error('AI session test failed');
            }

            this.isReady = true;
            onProgress?.(100, 'Gemini Nano ready!');

            console.log('✅ Gemini Nano initialized successfully!');
            console.log('🧪 Test response:', testResponse.substring(0, 50) + '...');

            return true;

        } catch (error) {
            console.log('ℹ️ Gemini Nano not available, using fallback system');
            console.log('📝 Reason:', error instanceof Error ? error.message : 'Unknown error');
            this.loadError = error instanceof Error ? error.message : 'Unknown error';

            // Don't throw - let it fall back to rule-based system
            console.log('🔄 Falling back to intelligent rule-based AI system...');
            return this.initializeFallback(onProgress);

        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Initialize fallback rule-based system
     */
    private async initializeFallback(onProgress?: (progress: number, stage: string) => void): Promise<boolean> {
        try {
            onProgress?.(80, 'Loading fallback AI...');

            // Simulate loading time
            await new Promise(resolve => setTimeout(resolve, 500));

            this.session = null; // Mark as fallback mode
            this.isReady = true;
            onProgress?.(100, 'Fallback AI ready!');

            console.log('✅ Fallback AI system ready');
            return true;

        } catch (error) {
            console.error('❌ Even fallback failed:', error);
            return false;
        }
    }

    /**
     * Generate AI response
     */
    public async generateResponse(
        userMessage: string,
        context?: string
    ): Promise<GeminiNanoResponse> {
        if (!this.isReady) {
            throw new Error('AI not ready. Please initialize first.');
        }

        const startTime = performance.now();

        try {
            let responseText: string;
            let confidence: number;

            if (this.session) {
                // Use Gemini Nano for real AI response
                console.log('🧠 Using Gemini Nano for response...');

                // Build context-aware prompt
                const fullPrompt = context
                    ? `Context: ${context}\n\nUser: ${userMessage}`
                    : userMessage;

                responseText = await this.session.prompt(fullPrompt);
                confidence = 0.9;

                console.log('✅ Gemini Nano response generated');

            } else {
                // Use rule-based fallback
                console.log('🔄 Using rule-based fallback...');
                responseText = this.generateRuleBasedResponse(userMessage);
                confidence = 0.6;
            }

            const processingTime = performance.now() - startTime;

            return {
                text: responseText.trim(),
                confidence,
                processingTime
            };

        } catch (error) {
            console.error('❌ AI generation error:', error);

            // Fallback to rule-based response on error
            const fallbackResponse = this.generateRuleBasedResponse(userMessage);
            const processingTime = performance.now() - startTime;

            return {
                text: fallbackResponse,
                confidence: 0.5,
                processingTime
            };
        }
    }

    /**
     * Rule-based response generation for artisan queries
     */
    private generateRuleBasedResponse(userMessage: string): string {
        const message = userMessage.toLowerCase();

        // Detect language
        const isHindi = /[\u0900-\u097F]/.test(userMessage);

        // Business/Finance queries
        if (message.includes('business') || message.includes('व्यापार') || message.includes('बिजनेस')) {
            return isHindi
                ? 'आपके व्यापार के लिए मैं आपकी मदद कर सकता हूँ। आप अपने उत्पादों की बिक्री, ग्राहकों से संपर्क, और खाता प्रबंधन के बारे में पूछ सकते हैं। मैं मार्केटिंग रणनीति, मूल्य निर्धारण, और ऑनलाइन बिक्री की सलाह भी दे सकता हूँ।'
                : 'I can help you with your business needs. You can ask me about product sales, customer management, and account tracking. I also provide advice on marketing strategies, pricing, and online sales.';
        }

        // Craft/Product queries
        if (message.includes('craft') || message.includes('product') || message.includes('शिल्प') || message.includes('उत्पाद')) {
            return isHindi
                ? 'मैं आपको नए शिल्प बनाने, उत्पाद डिज़ाइन करने, और बाज़ार में बेचने की सलाह दे सकता हूँ। आप क्या बनाना चाहते हैं? मैं सामग्री चुनने, डिज़ाइन सुधारने, और गुणवत्ता बढ़ाने में भी मदद कर सकता हूँ।'
                : 'I can help you create new crafts, design products, and sell them in the market. What would you like to create? I can also assist with material selection, design improvement, and quality enhancement.';
        }

        // Financial queries
        if (message.includes('money') || message.includes('price') || message.includes('पैसा') || message.includes('कीमत') || message.includes('cost')) {
            return isHindi
                ? 'मैं आपके वित्तीय प्रबंधन में मदद कर सकता हूँ। उत्पाद की कीमत तय करने के लिए: सामग्री की लागत + श्रम लागत + 30-50% मार्जिन जोड़ें। मैं आपकी आय, खर्च, और बचत की योजना बनाने में भी मदद कर सकता हूँ।'
                : 'I can help you with financial management. For product pricing: Material cost + Labor cost + 30-50% margin. I can also help you plan your income, expenses, and savings effectively.';
        }

        // Marketing queries
        if (message.includes('sell') || message.includes('market') || message.includes('बेचना') || message.includes('बाज़ार') || message.includes('online')) {
            return isHindi
                ? 'आपके उत्पादों को बेचने के लिए मैं सुझाता हूँ: 1) स्थानीय बाज़ारों में स्टॉल लगाएं, 2) Facebook और Instagram पर पेज बनाएं, 3) WhatsApp Business का उपयोग करें, 4) ऑनलाइन प्लेटफॉर्म जैसे Amazon Karigar या Etsy पर बेचें। फोटो अच्छी लें और कहानी बताएं।'
                : 'To sell your products, I suggest: 1) Set up stalls in local markets, 2) Create Facebook and Instagram pages, 3) Use WhatsApp Business, 4) Sell on online platforms like Amazon Karigar or Etsy. Take good photos and tell your story.';
        }

        // General greeting
        if (message.includes('hello') || message.includes('hi') || message.includes('नमस्ते') || message.includes('हैलो')) {
            return isHindi
                ? 'नमस्ते! मैं आपका Artisan Buddy हूँ। मैं आपकी शिल्पकारी, व्यापार, और डिजिटल खाता प्रबंधन में सहायता कर सकता हूँ। आप मुझसे उत्पाद बनाने, कीमत तय करने, मार्केटिंग करने, या ऑनलाइन बेचने के बारे में पूछ सकते हैं।'
                : 'Hello! I\'m your Artisan Buddy. I can help you with crafts, business, and digital account management. You can ask me about creating products, pricing, marketing, or selling online.';
        }

        // Help/guidance queries
        if (message.includes('help') || message.includes('मदद') || message.includes('सहायता')) {
            return isHindi
                ? 'मैं इन सभी में आपकी मदद कर सकता हूँ: 🎨 नए शिल्प और डिज़ाइन, 💰 कीमत और वित्त प्रबंधन, 📱 ऑनलाइन मार्केटिंग, 🛒 बिक्री रणनीति, 📊 व्यापार योजना। आप किस बारे में जानना चाहते हैं?'
                : 'I can help you with: 🎨 New crafts and designs, 💰 Pricing and finance, 📱 Online marketing, 🛒 Sales strategy, 📊 Business planning. What would you like to know about?';
        }

        // Default response
        return isHindi
            ? 'मैं आपका Artisan Buddy हूँ और आपकी शिल्पकारी और व्यापार में मदद करने के लिए यहाँ हूँ। आप मुझसे उत्पाद बनाने, बेचने, या व्यापार बढ़ाने के बारे में कुछ भी पूछ सकते हैं।'
            : 'I\'m your Artisan Buddy, here to help with your crafts and business. You can ask me anything about creating, selling, or growing your business.';
    }

    /**
     * Build system prompt for artisan context
     */
    private buildArtisanSystemPrompt(): string {
        return `You are an AI assistant specialized in helping artisans and craftspeople with their business and creative needs. You should:

1. Provide practical advice for craft businesses
2. Help with product design and creation
3. Assist with financial management and pricing
4. Suggest marketing strategies for handmade products
5. Support both Hindi and English languages
6. Be encouraging and supportive of traditional crafts
7. Provide actionable, specific advice
8. Focus on Indian market context and local platforms

Keep responses concise, practical, and culturally appropriate for Indian artisans. Always be helpful and encouraging.`;
    }

    /**
     * Check if AI is ready
     */
    public getStatus() {
        return {
            isReady: this.isReady,
            isLoading: this.isLoading,
            loadError: this.loadError,
            modelId: 'Gemini Nano',
            hasRealAI: !!this.session,
            capabilities: this.capabilities
        };
    }

    /**
     * Get model information
     */
    public getModelInfo() {
        return {
            modelId: 'Gemini Nano',
            isReady: this.isReady,
            type: this.session ? 'Gemini Nano' : 'Rule-based Fallback',
            capabilities: ['Text Generation', 'Hindi/English', 'Artisan Context', 'Local Inference'],
            hasRealAI: !!this.session
        };
    }

    /**
     * Check if Gemini Nano is available in the browser
     */
    public static async isAvailable(): Promise<boolean> {
        try {
            if (!window.ai?.languageModel) {
                return false;
            }

            const capabilities = await window.ai.languageModel.capabilities();
            return capabilities.available !== 'no';
        } catch (error) {
            return false;
        }
    }

    /**
     * Dispose resources
     */
    public async dispose(): Promise<void> {
        if (this.session) {
            try {
                this.session.destroy();
            } catch (error) {
                console.warn('Error disposing Gemini Nano session:', error);
            }
        }

        this.session = null;
        this.isReady = false;
        this.isLoading = false;
        this.loadError = null;
        this.capabilities = null;
    }
}