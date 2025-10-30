/**
 * Dialogflow Navigation Service
 * Extends existing DialogflowService for navigation-specific intents and entity mappings
 * Adds multilingual intent recognition patterns for voice navigation
 */

import { DialogflowService } from '../service/DialogflowService';

export interface NavigationIntentMapping {
    [intentName: string]: {
        routes: string[];
        aliases: string[];
        parameters?: string[];
        confirmationRequired?: boolean;
        multilingual: {
            [language: string]: {
                patterns: string[];
                responses: string[];
            };
        };
    };
}

export interface NavigationDialogflowResponse {
    intent: string;
    confidence: number;
    parameters: Record<string, any>;
    fulfillmentText: string;
    action: string;
    targetRoute?: string;
    requiresConfirmation?: boolean;
    language: string;
    navigationContext?: NavigationContext;
}

export interface NavigationContext {
    currentRoute: string;
    previousRoute?: string;
    userRole?: string;
    permissions?: string[];
    sessionData?: Record<string, any>;
}

export interface NavigationEntity {
    name: string;
    value: string;
    confidence: number;
    synonyms?: string[];
}

export class DialogflowNavigationService {
    private static instance: DialogflowNavigationService;
    private baseDialogflowService: DialogflowService;
    private navigationIntentMappings: NavigationIntentMapping;
    private supportedLanguages: string[];
    private currentLanguage: string = 'en-US';

    private constructor() {
        this.baseDialogflowService = DialogflowService.getInstance();
        this.navigationIntentMappings = this.initializeNavigationIntentMappings();
        this.supportedLanguages = [
            'en-US', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN',
            'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN'
        ];
    }

    public static getInstance(): DialogflowNavigationService {
        if (!DialogflowNavigationService.instance) {
            DialogflowNavigationService.instance = new DialogflowNavigationService();
        }
        return DialogflowNavigationService.instance;
    }

    /**
     * Detect navigation intent from user speech
     */
    public async detectNavigationIntent(
        message: string,
        sessionId: string,
        language: string = 'en-US',
        navigationContext?: NavigationContext
    ): Promise<NavigationDialogflowResponse> {
        try {
            // First try base Dialogflow service
            const baseResponse = await this.baseDialogflowService.detectIntent(message, sessionId, language);

            // Enhance response with navigation-specific processing
            const navigationResponse = await this.enhanceWithNavigationContext(
                baseResponse,
                message,
                language,
                navigationContext
            );

            return navigationResponse;
        } catch (error) {
            console.error('Navigation intent detection error:', error);

            // Fallback to pattern-based navigation intent detection
            return await this.detectNavigationIntentFallback(message, language, navigationContext);
        }
    }

    /**
     * Get navigation route from intent
     */
    public getNavigationRouteFromIntent(
        intent: string,
        parameters: Record<string, any> = {},
        language: string = 'en-US'
    ): string | null {
        const mapping = this.navigationIntentMappings[intent];
        if (!mapping) {
            return null;
        }

        // Get primary route
        let route = mapping.routes[0];

        // Apply parameters to route if needed
        if (parameters && Object.keys(parameters).length > 0) {
            route = this.applyParametersToRoute(route, parameters);
        }

        return route;
    }

    /**
     * Check if intent requires confirmation
     */
    public requiresConfirmation(intent: string): boolean {
        const mapping = this.navigationIntentMappings[intent];
        return mapping?.confirmationRequired || false;
    }

    /**
     * Get confirmation message for intent
     */
    public getConfirmationMessage(
        intent: string,
        targetRoute: string,
        language: string = 'en-US'
    ): string {
        const mapping = this.navigationIntentMappings[intent];
        if (!mapping || !mapping.multilingual[language]) {
            return `Do you want to navigate to ${targetRoute}?`;
        }

        const responses = mapping.multilingual[language].responses;
        return responses[0] || `Do you want to navigate to ${targetRoute}?`;
    }

    /**
     * Extract navigation entities from text
     */
    public extractNavigationEntities(
        text: string,
        language: string = 'en-US'
    ): NavigationEntity[] {
        const entities: NavigationEntity[] = [];
        const lowerText = text.toLowerCase();

        // Extract route entities
        for (const [intentName, mapping] of Object.entries(this.navigationIntentMappings)) {
            const languageData = mapping.multilingual[language];
            if (!languageData) continue;

            for (const pattern of languageData.patterns) {
                const patternWords = pattern.toLowerCase().split(/\s+/);
                let matches = 0;
                let totalWords = patternWords.length;

                for (const word of patternWords) {
                    if (lowerText.includes(word)) {
                        matches++;
                    }
                }

                const confidence = matches / totalWords;
                if (confidence > 0.5) {
                    entities.push({
                        name: 'navigation_target',
                        value: intentName,
                        confidence,
                        synonyms: mapping.aliases
                    });
                }
            }
        }

        // Extract action entities
        const actionWords = ['go', 'navigate', 'open', 'show', 'display', 'visit'];
        const hindiActionWords = ['जाओ', 'खोलो', 'दिखाओ', 'देखो'];

        const allActionWords = language.startsWith('hi') ?
            [...actionWords, ...hindiActionWords] : actionWords;

        for (const action of allActionWords) {
            if (lowerText.includes(action.toLowerCase())) {
                entities.push({
                    name: 'navigation_action',
                    value: action,
                    confidence: 0.9
                });
            }
        }

        return entities;
    }

    /**
     * Set current language for navigation
     */
    public setNavigationLanguage(language: string): void {
        if (this.supportedLanguages.includes(language)) {
            this.currentLanguage = language;
        } else {
            console.warn(`Language ${language} not supported for navigation, using fallback`);
            this.currentLanguage = 'en-US';
        }
    }

    /**
     * Get supported navigation languages
     */
    public getSupportedNavigationLanguages(): string[] {
        return [...this.supportedLanguages];
    }

    /**
     * Add custom navigation intent mapping
     */
    public addNavigationIntentMapping(intentName: string, mapping: NavigationIntentMapping[string]): void {
        this.navigationIntentMappings[intentName] = mapping;
    }

    /**
     * Get all navigation intent mappings
     */
    public getNavigationIntentMappings(): NavigationIntentMapping {
        return { ...this.navigationIntentMappings };
    }

    /**
     * Validate navigation permissions
     */
    public validateNavigationPermissions(
        targetRoute: string,
        userRole?: string,
        permissions?: string[]
    ): boolean {
        // Define route permissions
        const routePermissions: Record<string, string[]> = {
            '/admin': ['admin'],
            '/finance': ['artisan', 'admin'],
            '/enhanced-artisan-buddy': ['artisan', 'admin'],
            '/yojana-mitra': ['artisan', 'admin']
        };

        const requiredPermissions = routePermissions[targetRoute];
        if (!requiredPermissions) {
            return true; // Public route
        }

        if (userRole && requiredPermissions.includes(userRole)) {
            return true;
        }

        if (permissions) {
            return requiredPermissions.some(perm => permissions.includes(perm));
        }

        return false;
    }

    /**
     * Enhance base Dialogflow response with navigation context
     */
    private async enhanceWithNavigationContext(
        baseResponse: any,
        message: string,
        language: string,
        navigationContext?: NavigationContext
    ): Promise<NavigationDialogflowResponse> {
        const intent = baseResponse.intent;
        const mapping = this.navigationIntentMappings[intent];

        let targetRoute: string | undefined;
        let requiresConfirmation = false;

        if (mapping) {
            targetRoute = this.getNavigationRouteFromIntent(intent, baseResponse.parameters, language);
            requiresConfirmation = mapping.confirmationRequired || false;
        }

        return {
            intent: baseResponse.intent,
            confidence: baseResponse.confidence,
            parameters: baseResponse.parameters,
            fulfillmentText: baseResponse.fulfillmentText,
            action: baseResponse.action,
            targetRoute,
            requiresConfirmation,
            language,
            navigationContext
        };
    }

    /**
     * Fallback navigation intent detection using pattern matching
     */
    private async detectNavigationIntentFallback(
        message: string,
        language: string,
        navigationContext?: NavigationContext
    ): Promise<NavigationDialogflowResponse> {
        const lowerMessage = message.toLowerCase().trim();
        let bestMatch = { intent: 'unknown', confidence: 0, parameters: {} };

        // Pattern matching for navigation intents
        for (const [intentName, mapping] of Object.entries(this.navigationIntentMappings)) {
            const languageData = mapping.multilingual[language] || mapping.multilingual['en-US'];
            if (!languageData) continue;

            for (const pattern of languageData.patterns) {
                const confidence = this.calculatePatternMatch(lowerMessage, pattern.toLowerCase());
                if (confidence > bestMatch.confidence) {
                    bestMatch = {
                        intent: intentName,
                        confidence,
                        parameters: this.extractParametersFromPattern(lowerMessage, pattern)
                    };
                }
            }
        }

        const targetRoute = bestMatch.intent !== 'unknown' ?
            this.getNavigationRouteFromIntent(bestMatch.intent, bestMatch.parameters, language) : undefined;

        return {
            intent: bestMatch.intent,
            confidence: bestMatch.confidence,
            parameters: bestMatch.parameters,
            fulfillmentText: this.generateFulfillmentText(bestMatch.intent, language),
            action: bestMatch.intent !== 'unknown' ? 'navigate' : 'unknown',
            targetRoute,
            requiresConfirmation: this.requiresConfirmation(bestMatch.intent),
            language,
            navigationContext
        };
    }

    /**
     * Calculate pattern match confidence
     */
    private calculatePatternMatch(text: string, pattern: string): number {
        const textWords = text.split(/\s+/);
        const patternWords = pattern.split(/\s+/);

        let matches = 0;
        for (const patternWord of patternWords) {
            for (const textWord of textWords) {
                if (textWord.includes(patternWord) || patternWord.includes(textWord)) {
                    matches++;
                    break;
                }
            }
        }

        return matches / patternWords.length;
    }

    /**
     * Extract parameters from pattern match
     */
    private extractParametersFromPattern(text: string, pattern: string): Record<string, any> {
        const parameters: Record<string, any> = {};

        // Simple parameter extraction - can be enhanced
        const words = text.split(/\s+/);

        // Look for common parameter patterns
        for (let i = 0; i < words.length; i++) {
            const word = words[i];

            // Extract section/page parameters
            if (['section', 'page', 'tab'].includes(word) && i + 1 < words.length) {
                parameters.section = words[i + 1];
            }

            // Extract action parameters
            if (['create', 'add', 'new'].includes(word) && i + 1 < words.length) {
                parameters.action = word;
                parameters.target = words[i + 1];
            }
        }

        return parameters;
    }

    /**
     * Apply parameters to route template
     */
    private applyParametersToRoute(route: string, parameters: Record<string, any>): string {
        let processedRoute = route;

        // Replace parameter placeholders in route
        for (const [key, value] of Object.entries(parameters)) {
            const placeholder = `{${key}}`;
            if (processedRoute.includes(placeholder)) {
                processedRoute = processedRoute.replace(placeholder, String(value));
            }
        }

        return processedRoute;
    }

    /**
     * Generate fulfillment text for intent
     */
    private generateFulfillmentText(intent: string, language: string): string {
        const mapping = this.navigationIntentMappings[intent];
        if (!mapping || !mapping.multilingual[language]) {
            return intent === 'unknown' ?
                'I didn\'t understand that command.' :
                'Navigating to the requested page.';
        }

        const responses = mapping.multilingual[language].responses;
        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * Initialize navigation intent mappings with multilingual support
     */
    private initializeNavigationIntentMappings(): NavigationIntentMapping {
        return {
            'navigate_dashboard': {
                routes: ['/dashboard'],
                aliases: ['home', 'main', 'dashboard'],
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to dashboard', 'open dashboard', 'show dashboard', 'navigate to dashboard',
                            'go home', 'go to home', 'take me home', 'home page', 'main page'
                        ],
                        responses: ['Navigating to dashboard', 'Opening dashboard', 'Going to home page']
                    },
                    'hi-IN': {
                        patterns: [
                            'डैशबोर्ड पर जाओ', 'डैशबोर्ड खोलो', 'होम पेज दिखाओ', 'मुख्य पृष्ठ'
                        ],
                        responses: ['डैशबोर्ड पर जा रहे हैं', 'होम पेज खोल रहे हैं']
                    }
                }
            },
            'navigate_profile': {
                routes: ['/profile'],
                aliases: ['profile', 'account', 'my account'],
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to profile', 'open profile', 'show profile', 'my profile',
                            'account settings', 'my account', 'user profile'
                        ],
                        responses: ['Opening your profile', 'Navigating to profile page']
                    },
                    'hi-IN': {
                        patterns: [
                            'प्रोफाइल पर जाओ', 'प्रोफाइल खोलो', 'मेरा प्रोफाइल', 'खाता सेटिंग्स'
                        ],
                        responses: ['प्रोफाइल खोल रहे हैं', 'प्रोफाइल पेज पर जा रहे हैं']
                    }
                }
            },
            'navigate_marketplace': {
                routes: ['/marketplace'],
                aliases: ['marketplace', 'market', 'shop', 'products'],
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to marketplace', 'open marketplace', 'show marketplace', 'browse products',
                            'go shopping', 'show products', 'market place'
                        ],
                        responses: ['Opening marketplace', 'Navigating to product marketplace']
                    },
                    'hi-IN': {
                        patterns: [
                            'मार्केटप्लेस पर जाओ', 'बाजार दिखाओ', 'उत्पाद देखो', 'खरीदारी करो'
                        ],
                        responses: ['मार्केटप्लेस खोल रहे हैं', 'बाजार दिखा रहे हैं']
                    }
                }
            },
            'navigate_cart': {
                routes: ['/cart'],
                aliases: ['cart', 'shopping cart', 'basket'],
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to cart', 'open cart', 'show cart', 'shopping cart',
                            'my cart', 'view cart', 'check cart'
                        ],
                        responses: ['Opening your cart', 'Showing shopping cart']
                    },
                    'hi-IN': {
                        patterns: [
                            'कार्ट पर जाओ', 'कार्ट खोलो', 'शॉपिंग कार्ट', 'मेरा कार्ट'
                        ],
                        responses: ['कार्ट खोल रहे हैं', 'शॉपिंग कार्ट दिखा रहे हैं']
                    }
                }
            },
            'navigate_wishlist': {
                routes: ['/wishlist'],
                aliases: ['wishlist', 'favorites', 'saved items'],
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to wishlist', 'open wishlist', 'show wishlist', 'my wishlist',
                            'saved items', 'favorites', 'wish list'
                        ],
                        responses: ['Opening your wishlist', 'Showing saved items']
                    },
                    'hi-IN': {
                        patterns: [
                            'विशलिस्ट पर जाओ', 'पसंदीदा आइटम', 'सेव किए गए आइटम'
                        ],
                        responses: ['विशलिस्ट खोल रहे हैं', 'पसंदीदा आइटम दिखा रहे हैं']
                    }
                }
            },
            'navigate_trends': {
                routes: ['/trend-spotter'],
                aliases: ['trends', 'trend analysis', 'market trends'],
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to trends', 'show trends', 'trend analysis', 'market trends',
                            'trend spotter', 'analyze trends'
                        ],
                        responses: ['Opening trend analysis', 'Showing market trends']
                    },
                    'hi-IN': {
                        patterns: [
                            'ट्रेंड्स दिखाओ', 'बाजार के रुझान', 'ट्रेंड एनालिसिस'
                        ],
                        responses: ['ट्रेंड एनालिसिस खोल रहे हैं', 'बाजार के रुझान दिखा रहे हैं']
                    }
                }
            },
            'navigate_finance': {
                routes: ['/finance'],
                aliases: ['finance', 'financial', 'sales', 'earnings'],
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to finance', 'show finance', 'financial dashboard', 'sales data',
                            'earnings', 'revenue', 'financial reports'
                        ],
                        responses: ['Opening financial dashboard', 'Showing sales data']
                    },
                    'hi-IN': {
                        patterns: [
                            'वित्त डैशबोर्ड', 'बिक्री डेटा', 'आय की जानकारी', 'वित्तीय रिपोर्ट'
                        ],
                        responses: ['वित्तीय डैशबोर्ड खोल रहे हैं', 'बिक्री डेटा दिखा रहे हैं']
                    }
                }
            },
            'navigate_create_product': {
                routes: ['/smart-product-creator'],
                aliases: ['create product', 'add product', 'new product'],
                multilingual: {
                    'en-US': {
                        patterns: [
                            'create product', 'add product', 'new product', 'make product',
                            'product creator', 'add new item'
                        ],
                        responses: ['Opening product creator', 'Starting product creation']
                    },
                    'hi-IN': {
                        patterns: [
                            'उत्पाद बनाओ', 'नया उत्पाद', 'प्रोडक्ट बनाओ', 'आइटम जोड़ो'
                        ],
                        responses: ['उत्पाद निर्माता खोल रहे हैं', 'नया उत्पाद बना रहे हैं']
                    }
                }
            },
            'navigate_back': {
                routes: ['back'],
                aliases: ['back', 'previous', 'go back'],
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go back', 'back', 'previous page', 'return', 'go to previous'
                        ],
                        responses: ['Going back', 'Returning to previous page']
                    },
                    'hi-IN': {
                        patterns: [
                            'वापस जाओ', 'पिछला पेज', 'वापस', 'पहले वाला पेज'
                        ],
                        responses: ['वापस जा रहे हैं', 'पिछले पेज पर जा रहे हैं']
                    }
                }
            }
        };
    }
}