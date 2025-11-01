/**
 * ContextManager - Conversation context and prompt management for Gemma 2B Offline Service
 * 
 * This component manages:
 * - Artisan-specific system prompts for different craft domains
 * - Conversation context tracking with sliding window
 * - Language detection for English/Hindi support
 * - Prompt templates optimized for Indian artisans
 */

import {
    IContextManager,
    ConversationContext,
    ContextMessage,
    SupportedLanguage,
    ArtisanDomain
} from '../../types/gemma-2b-offline';

import {
    SYSTEM_PROMPTS,
    LANGUAGE_CONFIG,
    ARTISAN_DOMAINS,
    CONTEXT_SETTINGS
} from './constants';

// ============================================================================
// Context Manager Implementation
// ============================================================================

export class ContextManager implements IContextManager {
    private context: ConversationContext;
    private domainKeywords: Map<ArtisanDomain, string[]>;
    private hindiKeywords: Map<ArtisanDomain, string[]>;

    constructor() {
        this.context = {
            messages: [],
            language: LANGUAGE_CONFIG.DEFAULT,
            maxContextLength: CONTEXT_SETTINGS.MAX_CONTEXT_TOKENS
        };

        // Initialize domain keyword maps
        this.domainKeywords = new Map();
        this.hindiKeywords = new Map();
        this.initializeDomainKeywords();
    }

    /**
     * Build a complete prompt with system context and conversation history
     */
    buildPrompt(userMessage: string, language?: string): string {
        // Detect language if not provided
        const detectedLanguage = language || this.detectLanguage(userMessage);
        this.context.language = detectedLanguage as SupportedLanguage;

        // Detect artisan domain from message
        const domain = this.detectArtisanDomain(userMessage);
        this.context.artisanDomain = domain;

        // Get system prompt for the language and domain
        const systemPrompt = this.getArtisanSystemPrompt(detectedLanguage, domain);

        // Build conversation context
        const conversationHistory = this.buildConversationHistory();

        // Construct final prompt
        const prompt = this.constructPrompt(systemPrompt, conversationHistory, userMessage);

        return prompt;
    }

    /**
     * Update conversation context with new message and response
     */
    updateContext(message: string, response: string): void {
        const timestamp = Date.now();

        // Add user message
        this.context.messages.push({
            role: 'user',
            content: message,
            timestamp
        });

        // Add assistant response
        this.context.messages.push({
            role: 'assistant',
            content: response,
            timestamp
        });

        // Maintain context window size
        this.trimContextWindow();
    }

    /**
     * Clear conversation context
     */
    clearContext(): void {
        this.context.messages = [];
        this.context.artisanDomain = undefined;
    }

    /**
     * Get artisan-specific system prompt for language and domain
     */
    getArtisanSystemPrompt(language: string, domain?: string): string {
        const lang = language as SupportedLanguage;
        const basePrompt = SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS[SupportedLanguage.ENGLISH];

        // Add domain-specific context if detected
        if (domain && domain !== ArtisanDomain.GENERAL) {
            return this.enhancePromptWithDomain(basePrompt, domain as ArtisanDomain, lang);
        }

        return basePrompt;
    }

    /**
     * Detect language from text input
     */
    detectLanguage(text: string): string {
        // Empty or very short text defaults to English
        if (!text || text.trim().length < 2) {
            return SupportedLanguage.ENGLISH;
        }

        // Check for Hindi (Devanagari script)
        const hindiPattern = LANGUAGE_CONFIG.DETECTION_PATTERNS[SupportedLanguage.HINDI];
        const hasHindi = hindiPattern.test(text);

        // If text contains Hindi characters, it's Hindi
        if (hasHindi) {
            return SupportedLanguage.HINDI;
        }

        // For non-Hindi text, check if it's primarily English
        const englishPattern = LANGUAGE_CONFIG.DETECTION_PATTERNS[SupportedLanguage.ENGLISH];
        const hasEnglish = englishPattern.test(text);

        // If it matches English pattern or doesn't match Hindi, default to English
        return SupportedLanguage.ENGLISH;
    }

    /**
     * Get current conversation context
     */
    getContext(): ConversationContext {
        return { ...this.context };
    }

    /**
     * Set maximum context length
     */
    setMaxContextLength(length: number): void {
        this.context.maxContextLength = length;
        this.trimContextWindow();
    }

    /**
     * Get context statistics
     */
    getContextStats(): {
        messageCount: number;
        estimatedTokens: number;
        language: SupportedLanguage;
        domain?: string;
    } {
        return {
            messageCount: this.context.messages.length,
            estimatedTokens: this.estimateTokenCount(),
            language: this.context.language,
            domain: this.context.artisanDomain
        };
    }

    // ========================================================================
    // Private Helper Methods
    // ========================================================================

    /**
     * Initialize domain keyword mappings
     */
    private initializeDomainKeywords(): void {
        Object.entries(ARTISAN_DOMAINS).forEach(([domain, config]) => {
            this.domainKeywords.set(domain as ArtisanDomain, [...config.keywords]);
            this.hindiKeywords.set(domain as ArtisanDomain, [...config.hindiKeywords]);
        });
    }

    /**
     * Detect artisan domain from user message
     */
    private detectArtisanDomain(message: string): string {
        const lowerMessage = message.toLowerCase();
        let bestMatch = ArtisanDomain.GENERAL;
        let maxMatches = 0;

        // Check each domain for keyword matches
        for (const [domain, keywords] of Array.from(this.domainKeywords.entries())) {
            const englishMatches = keywords.filter(keyword =>
                lowerMessage.includes(keyword.toLowerCase())
            ).length;

            const hindiKeywords = this.hindiKeywords.get(domain) || [];
            const hindiMatches = hindiKeywords.filter(keyword =>
                message.includes(keyword)
            ).length;

            const totalMatches = englishMatches + hindiMatches;

            if (totalMatches > maxMatches) {
                maxMatches = totalMatches;
                bestMatch = domain;
            }
        }

        return bestMatch;
    }

    /**
     * Enhance system prompt with domain-specific context
     */
    private enhancePromptWithDomain(
        basePrompt: string,
        domain: ArtisanDomain,
        language: SupportedLanguage
    ): string {
        const domainPrompts = this.getDomainSpecificPrompts();
        const domainContext = domainPrompts[domain]?.[language];

        if (domainContext) {
            return `${basePrompt}\n\n${domainContext}`;
        }

        return basePrompt;
    }

    /**
     * Get domain-specific prompt enhancements
     */
    private getDomainSpecificPrompts(): {
        [key in ArtisanDomain]: {
            [key in SupportedLanguage]: string;
        };
    } {
        return {
            [ArtisanDomain.POTTERY]: {
                [SupportedLanguage.ENGLISH]: `You specialize in pottery and ceramics. Focus on clay types, wheel techniques, firing methods, glazing, and pottery business strategies. Help with traditional Indian pottery styles like terracotta, blue pottery, and regional variations.`,
                [SupportedLanguage.HINDI]: `आप मिट्टी के बर्तन और सिरेमिक में विशेषज्ञ हैं। मिट्टी के प्रकार, चाक तकनीक, पकाने की विधि, चमकाने और मिट्टी के बर्तन के व्यापार पर ध्यान दें। पारंपरिक भारतीय मिट्टी के काम जैसे टेराकोटा, नीले मिट्टी के बर्तन में मदद करें।`
            },
            [ArtisanDomain.TEXTILES]: {
                [SupportedLanguage.ENGLISH]: `You specialize in textiles and fabric work. Focus on weaving, embroidery, dyeing, fabric selection, and textile business. Help with traditional Indian textiles like khadi, silk weaving, block printing, and regional textile traditions.`,
                [SupportedLanguage.HINDI]: `आप कपड़ा और वस्त्र के काम में विशेषज्ञ हैं। बुनाई, कढ़ाई, रंगाई, कपड़े का चयन और वस्त्र व्यापार पर ध्यान दें। पारंपरिक भारतीय वस्त्र जैसे खादी, रेशम बुनाई, ब्लॉक प्रिंटिंग में मदद करें।`
            },
            [ArtisanDomain.WOODWORK]: {
                [SupportedLanguage.ENGLISH]: `You specialize in woodworking and carpentry. Focus on wood selection, carving techniques, joinery, finishing, and woodwork business. Help with traditional Indian woodcraft like furniture making, decorative carving, and regional wood traditions.`,
                [SupportedLanguage.HINDI]: `आप लकड़ी का काम और बढ़ईगिरी में विशेषज्ञ हैं। लकड़ी का चयन, नक्काशी तकनीक, जोड़ाई, फिनिशिंग और लकड़ी के व्यापार पर ध्यान दें। पारंपरिक भारतीय लकड़ी के काम में मदद करें।`
            },
            [ArtisanDomain.METALWORK]: {
                [SupportedLanguage.ENGLISH]: `You specialize in metalworking and metal crafts. Focus on metal types, forging, casting, finishing, and metalwork business. Help with traditional Indian metalcraft like brass work, copper crafts, and regional metal traditions.`,
                [SupportedLanguage.HINDI]: `आप धातु का काम और धातु शिल्प में विशेषज्ञ हैं। धातु के प्रकार, फोर्जिंग, कास्टिंग, फिनिशिंग और धातु व्यापार पर ध्यान दें। पारंपरिक भारतीय धातु शिल्प में मदद करें।`
            },
            [ArtisanDomain.JEWELRY]: {
                [SupportedLanguage.ENGLISH]: `You specialize in jewelry making and ornament crafts. Focus on precious metals, gemstones, design techniques, and jewelry business. Help with traditional Indian jewelry styles and regional ornament traditions.`,
                [SupportedLanguage.HINDI]: `आप आभूषण बनाने और गहने के शिल्प में विशेषज्ञ हैं। कीमती धातु, रत्न, डिजाइन तकनीक और आभूषण व्यापार पर ध्यान दें। पारंपरिक भारतीय आभूषण शैलियों में मदद करें।`
            },
            [ArtisanDomain.PAINTING]: {
                [SupportedLanguage.ENGLISH]: `You specialize in painting and visual arts. Focus on traditional techniques, color mixing, canvas preparation, and art business. Help with traditional Indian painting styles like miniature, folk art, and regional painting traditions.`,
                [SupportedLanguage.HINDI]: `आप चित्रकारी और दृश्य कला में विशेषज्ञ हैं। पारंपरिक तकनीक, रंग मिश्रण, कैनवास तैयारी और कला व्यापार पर ध्यान दें। पारंपरिक भारतीय चित्रकारी में मदद करें।`
            },
            [ArtisanDomain.SCULPTURE]: {
                [SupportedLanguage.ENGLISH]: `You specialize in sculpture and stone carving. Focus on material selection, carving techniques, tools, and sculpture business. Help with traditional Indian sculpture styles and regional stone carving traditions.`,
                [SupportedLanguage.HINDI]: `आप मूर्तिकला और पत्थर की नक्काशी में विशेषज्ञ हैं। सामग्री चयन, नक्काशी तकनीक, उपकरण और मूर्तिकला व्यापार पर ध्यान दें। पारंपरिक भारतीय मूर्तिकला में मदद करें।`
            },
            [ArtisanDomain.GENERAL]: {
                [SupportedLanguage.ENGLISH]: `You help with general artisan and craft questions. Provide broad guidance on traditional crafts, business development, and skill improvement for Indian artisans.`,
                [SupportedLanguage.HINDI]: `आप सामान्य कारीगर और शिल्प के सवालों में मदद करते हैं। भारतीय कारीगरों के लिए पारंपरिक शिल्प, व्यापार विकास और कौशल सुधार पर व्यापक मार्गदर्शन प्रदान करें।`
            }
        };
    }

    /**
     * Build conversation history string
     */
    private buildConversationHistory(): string {
        if (this.context.messages.length === 0) {
            return '';
        }

        const recentMessages = this.context.messages.slice(-CONTEXT_SETTINGS.MAX_MESSAGES);

        return recentMessages
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');
    }

    /**
     * Construct the final prompt with all components
     */
    private constructPrompt(
        systemPrompt: string,
        conversationHistory: string,
        userMessage: string
    ): string {
        let prompt = systemPrompt;

        // Add conversation history if available
        if (conversationHistory) {
            prompt += `\n\nPrevious conversation:\n${conversationHistory}`;
        }

        // Add current user message
        prompt += `\n\nUser: ${userMessage}\nAssistant:`;

        return prompt;
    }

    /**
     * Trim context window to maintain token limits
     */
    private trimContextWindow(): void {
        // Remove oldest messages if we exceed the limit
        while (this.context.messages.length > CONTEXT_SETTINGS.MAX_MESSAGES) {
            this.context.messages.shift();
        }

        // Estimate token count and trim if necessary
        while (this.estimateTokenCount() > this.context.maxContextLength) {
            if (this.context.messages.length <= 2) {
                // Keep at least the last exchange
                break;
            }
            // Remove the oldest pair of messages (user + assistant)
            this.context.messages.splice(0, 2);
        }
    }

    /**
     * Estimate token count for current context
     */
    private estimateTokenCount(): number {
        // Rough estimation: 1 token ≈ 4 characters for English, 2 characters for Hindi
        const totalChars = this.context.messages.reduce((sum, msg) => sum + msg.content.length, 0);

        // Adjust for language
        const multiplier = this.context.language === SupportedLanguage.HINDI ? 0.5 : 0.25;

        return Math.ceil(totalChars * multiplier) + CONTEXT_SETTINGS.SYSTEM_PROMPT_TOKENS;
    }
}

// ============================================================================
// Factory Functions and Utilities
// ============================================================================

/**
 * Create a new ContextManager instance
 */
export function createContextManager(): ContextManager {
    return new ContextManager();
}

/**
 * Singleton instance for global use
 */
let globalContextManager: ContextManager | null = null;

/**
 * Get or create global ContextManager instance
 */
export function getContextManager(): ContextManager {
    if (!globalContextManager) {
        globalContextManager = createContextManager();
    }
    return globalContextManager;
}

/**
 * Reset global ContextManager instance
 */
export function resetContextManager(): void {
    globalContextManager = null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate language code
 */
export function isValidLanguage(language: string): language is SupportedLanguage {
    return Object.values(SupportedLanguage).includes(language as SupportedLanguage);
}

/**
 * Validate artisan domain
 */
export function isValidDomain(domain: string): domain is ArtisanDomain {
    return Object.values(ArtisanDomain).includes(domain as ArtisanDomain);
}

/**
 * Get supported languages list
 */
export function getSupportedLanguages(): SupportedLanguage[] {
    return [...LANGUAGE_CONFIG.SUPPORTED];
}

/**
 * Get available artisan domains
 */
export function getArtisanDomains(): ArtisanDomain[] {
    return Object.values(ArtisanDomain);
}

/**
 * Extract keywords from text for domain detection
 */
export function extractKeywords(text: string): string[] {
    // Simple keyword extraction - split by spaces and filter
    return text
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2)
        .filter(word => !/^(the|and|or|but|in|on|at|to|for|of|with|by)$/.test(word));
}

/**
 * Calculate text similarity for domain matching
 */
export function calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(extractKeywords(text1));
    const words2 = new Set(extractKeywords(text2));

    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);

    return union.size > 0 ? intersection.size / union.size : 0;
}