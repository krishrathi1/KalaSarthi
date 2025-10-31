/**
 * Client-side Voice Navigation Service
 * Safe wrapper for voice navigation that works in the browser
 */

export interface VoiceNavigationResult {
    success: boolean;
    intent?: {
        intent: string;
        confidence: number;
        parameters: Record<string, any>;
        targetRoute?: string;
        language: string;
        reasoning?: string;
    };
    feedback: string;
    audioFeedback?: ArrayBuffer;
    error?: string;
    executionTime: number;
}

export interface LanguageSwitchResult {
    success: boolean;
    previousLanguage: string;
    newLanguage: string;
    message: string;
    audioFeedback?: string;
}

export class VoiceNavigationClientService {
    private static instance: VoiceNavigationClientService;
    private isInitialized = false;

    private constructor() { }

    public static getInstance(): VoiceNavigationClientService {
        if (!VoiceNavigationClientService.instance) {
            VoiceNavigationClientService.instance = new VoiceNavigationClientService();
        }
        return VoiceNavigationClientService.instance;
    }

    public async initialize(): Promise<void> {
        // Client-side initialization - no server dependencies
        this.isInitialized = true;
    }

    public async processMultilingualVoiceInput(
        voiceInput: string,
        userId?: string,
        autoDetectLanguage: boolean = true
    ): Promise<VoiceNavigationResult> {
        try {
            const startTime = performance.now();

            // Validate input
            if (!voiceInput || typeof voiceInput !== 'string' || voiceInput.trim().length === 0) {
                return {
                    success: false,
                    feedback: 'No voice input received. Please try speaking again.',
                    error: 'Empty or invalid voice input',
                    executionTime: performance.now() - startTime
                };
            }

            // Process the voice input to determine intent
            const intentResult = this.matchVoiceIntent(voiceInput.toLowerCase().trim());

            if (intentResult) {
                return {
                    success: true,
                    intent: {
                        intent: intentResult.intent,
                        confidence: intentResult.confidence,
                        parameters: intentResult.parameters,
                        targetRoute: intentResult.targetRoute,
                        language: 'en-US'
                    },
                    feedback: intentResult.feedback,
                    executionTime: performance.now() - startTime
                };
            } else {
                return {
                    success: false,
                    feedback: `Sorry, I didn't understand "${voiceInput}". Try saying "go to dashboard" or "open product creator".`,
                    error: 'Intent not recognized',
                    executionTime: performance.now() - startTime
                };
            }
        } catch (error) {
            return {
                success: false,
                feedback: 'Voice processing failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                executionTime: 100
            };
        }
    }

    private matchVoiceIntent(voiceInput: string): {
        intent: string;
        confidence: number;
        parameters: Record<string, any>;
        targetRoute: string;
        feedback: string;
    } | null {
        // Define navigation patterns with multiple variations
        const navigationPatterns = [
            // Dashboard patterns
            {
                patterns: ['go to dashboard', 'open dashboard', 'show dashboard', 'dashboard', 'go dashboard', 'navigate to dashboard'],
                intent: 'navigate_dashboard',
                targetRoute: '/dashboard',
                feedback: 'Navigating to dashboard'
            },
            // Product Creator patterns
            {
                patterns: [
                    'go to product creator', 'open product creator', 'show product creator', 'product creator',
                    'create product', 'new product', 'add product', 'product creation',
                    'go to creator', 'open creator', 'creator page', 'creator tool',
                    'smart product creator', 'smart creator'
                ],
                intent: 'navigate_product_creator',
                targetRoute: '/smart-product-creator',
                feedback: 'Opening product creator'
            },
            // Profile patterns
            {
                patterns: ['go to profile', 'open profile', 'show profile', 'my profile', 'profile page', 'user profile'],
                intent: 'navigate_profile',
                targetRoute: '/profile',
                feedback: 'Opening your profile'
            },
            // Marketplace patterns
            {
                patterns: ['go to marketplace', 'open marketplace', 'show marketplace', 'marketplace', 'market', 'browse products'],
                intent: 'navigate_marketplace',
                targetRoute: '/marketplace',
                feedback: 'Opening marketplace'
            },
            // Cart patterns
            {
                patterns: ['go to cart', 'open cart', 'show cart', 'my cart', 'shopping cart', 'view cart'],
                intent: 'navigate_cart',
                targetRoute: '/cart',
                feedback: 'Opening your cart'
            },
            // Home patterns
            {
                patterns: ['go home', 'go to home', 'home page', 'main page', 'homepage', 'back to home'],
                intent: 'navigate_home',
                targetRoute: '/',
                feedback: 'Going to home page'
            },
            // Trends patterns
            {
                patterns: ['show trends', 'trend spotter', 'trends page', 'market trends', 'trending products'],
                intent: 'navigate_trends',
                targetRoute: '/trend-spotter',
                feedback: 'Opening trend spotter'
            },
            // Finance patterns
            {
                patterns: ['finance dashboard', 'financial dashboard', 'finance page', 'money dashboard', 'financial overview'],
                intent: 'navigate_finance',
                targetRoute: '/finance/dashboard',
                feedback: 'Opening finance dashboard'
            },
            // Artisan Buddy patterns
            {
                patterns: ['artisan buddy', 'open artisan buddy', 'buddy page', 'artisan helper'],
                intent: 'navigate_artisan_buddy',
                targetRoute: '/artisan-buddy',
                feedback: 'Opening artisan buddy'
            },
            // Enhanced Artisan Buddy patterns
            {
                patterns: ['enhanced artisan buddy', 'enhanced buddy', 'advanced artisan buddy'],
                intent: 'navigate_enhanced_artisan_buddy',
                targetRoute: '/enhanced-artisan-buddy',
                feedback: 'Opening enhanced artisan buddy'
            }
        ];

        // Find the best matching pattern
        let bestMatch = null;
        let highestConfidence = 0;

        for (const navPattern of navigationPatterns) {
            for (const pattern of navPattern.patterns) {
                const confidence = this.calculateSimilarity(voiceInput, pattern);

                if (confidence > highestConfidence && confidence > 0.6) { // Minimum confidence threshold
                    highestConfidence = confidence;
                    bestMatch = {
                        intent: navPattern.intent,
                        confidence: confidence,
                        parameters: {},
                        targetRoute: navPattern.targetRoute,
                        feedback: navPattern.feedback
                    };
                }
            }
        }

        return bestMatch;
    }

    private calculateSimilarity(input: string, pattern: string): number {
        // Simple similarity calculation using word matching and fuzzy matching
        const inputWords = input.split(' ').filter(word => word.length > 0);
        const patternWords = pattern.split(' ').filter(word => word.length > 0);

        // Exact match gets highest score
        if (input === pattern) {
            return 1.0;
        }

        // Check if input contains the pattern
        if (input.includes(pattern)) {
            return 0.95;
        }

        // Check if pattern contains the input
        if (pattern.includes(input)) {
            return 0.9;
        }

        // Calculate word overlap
        let matchedWords = 0;
        let totalWords = Math.max(inputWords.length, patternWords.length);

        for (const inputWord of inputWords) {
            for (const patternWord of patternWords) {
                if (inputWord === patternWord) {
                    matchedWords++;
                    break;
                } else if (this.isWordSimilar(inputWord, patternWord)) {
                    matchedWords += 0.8; // Partial credit for similar words
                    break;
                }
            }
        }

        const wordOverlapScore = matchedWords / totalWords;

        // Boost score if key words match
        const keyWords = ['go', 'open', 'show', 'navigate', 'to'];
        let keyWordBonus = 0;

        for (const keyWord of keyWords) {
            if (inputWords.includes(keyWord) && patternWords.includes(keyWord)) {
                keyWordBonus += 0.1;
            }
        }

        return Math.min(wordOverlapScore + keyWordBonus, 1.0);
    }

    private isWordSimilar(word1: string, word2: string): boolean {
        // Simple fuzzy matching for common variations
        const variations: Record<string, string[]> = {
            'creator': ['create', 'creation', 'maker'],
            'product': ['products', 'item', 'items'],
            'dashboard': ['dash', 'board'],
            'profile': ['account', 'user'],
            'marketplace': ['market', 'store', 'shop'],
            'cart': ['basket', 'bag'],
            'home': ['main', 'start'],
            'trends': ['trending', 'trend'],
            'finance': ['financial', 'money', 'cash']
        };

        // Check if words are variations of each other
        for (const [baseWord, variants] of Object.entries(variations)) {
            if ((word1 === baseWord && variants.includes(word2)) ||
                (word2 === baseWord && variants.includes(word1)) ||
                (variants.includes(word1) && variants.includes(word2))) {
                return true;
            }
        }

        // Check for simple typos or partial matches
        if (word1.length > 3 && word2.length > 3) {
            const longer = word1.length > word2.length ? word1 : word2;
            const shorter = word1.length <= word2.length ? word1 : word2;

            if (longer.includes(shorter) || shorter.includes(longer)) {
                return true;
            }
        }

        return false;
    }

    public async switchVoiceLanguage(
        targetLanguage: string,
        userId?: string
    ): Promise<LanguageSwitchResult> {
        try {
            // Mock language switch
            return {
                success: true,
                previousLanguage: 'en-US',
                newLanguage: targetLanguage,
                message: `Language switched to ${targetLanguage}`,
                audioFeedback: `Language switched to ${targetLanguage}`
            };
        } catch (error) {
            return {
                success: false,
                previousLanguage: 'en-US',
                newLanguage: 'en-US',
                message: `Language switch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    public getCurrentVoiceLanguage(): string {
        return 'en-US';
    }

    public getSupportedVoiceLanguages(): Array<{ code: string; name: string; supported: boolean }> {
        return [
            { code: 'en-US', name: 'English', supported: true },
            { code: 'hi-IN', name: 'हिन्दी', supported: true },
            { code: 'ta-IN', name: 'தமிழ்', supported: true },
            { code: 'bn-IN', name: 'বাংলা', supported: true },
            { code: 'te-IN', name: 'తెలుగు', supported: true }
        ];
    }

    public isReady(): boolean {
        return this.isInitialized;
    }
}

export class MultilingualVoiceClientService {
    private static instance: MultilingualVoiceClientService;

    private constructor() { }

    public static getInstance(): MultilingualVoiceClientService {
        if (!MultilingualVoiceClientService.instance) {
            MultilingualVoiceClientService.instance = new MultilingualVoiceClientService();
        }
        return MultilingualVoiceClientService.instance;
    }

    public getCurrentLanguage(): string {
        return 'en-US';
    }

    public getLanguageConfig(languageCode?: string) {
        return {
            languageCode: languageCode || 'en-US',
            speechRate: 1.0,
            pitch: 0.0
        };
    }

    public getErrorMessages(languageCode?: string): string[] {
        return ['Command not recognized', 'Please try again'];
    }
}

export class VoiceLanguageSwitcherClient {
    private static instance: VoiceLanguageSwitcherClient;

    private constructor() { }

    public static getInstance(): VoiceLanguageSwitcherClient {
        if (!VoiceLanguageSwitcherClient.instance) {
            VoiceLanguageSwitcherClient.instance = new VoiceLanguageSwitcherClient();
        }
        return VoiceLanguageSwitcherClient.instance;
    }

    public async switchFromTranslationContext(
        translationLanguage: string,
        userId?: string
    ): Promise<LanguageSwitchResult> {
        return {
            success: true,
            previousLanguage: 'en-US',
            newLanguage: `${translationLanguage}-IN`,
            message: 'Language switched'
        };
    }
}