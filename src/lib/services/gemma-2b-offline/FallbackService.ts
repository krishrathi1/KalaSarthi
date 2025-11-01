/**
 * Fallback Service for Gemma 2B Offline AI
 * Provides demo responses when the main AI service is unavailable
 */

import {
    SupportedLanguage,
    ArtisanDomain,
    ConversationContext,
    ContextMessage
} from '../../types/gemma-2b-offline';

import { ARTISAN_DOMAINS } from './constants';

/**
 * Demo response templates for different scenarios
 */
const DEMO_RESPONSES = {
    [SupportedLanguage.ENGLISH]: {
        greeting: [
            "Hello! I'm here to help with your craft and business questions. What would you like to know?",
            "Welcome! I can assist you with traditional crafts, pricing, and business advice. How can I help?",
            "Hi there! I'm your artisan assistant. Feel free to ask about techniques, materials, or business strategies."
        ],
        pricing: [
            "For pricing your crafts, consider: material costs + labor time + overhead + profit margin (20-30%). Research similar products in your local market.",
            "Price calculation: (Material cost + Time × hourly rate + overhead) × 1.3 for profit. Don't undervalue your skilled work!",
            "Consider these factors: raw materials, time invested, skill level, market demand, and competitor prices. Add 25-30% profit margin."
        ],
        business: [
            "To grow your business: focus on quality, build customer relationships, use social media to showcase work, and consider online marketplaces.",
            "Key business tips: maintain consistent quality, document your processes, build a portfolio, network with other artisans, and explore digital sales channels.",
            "Business growth strategies: improve product photography, tell your craft story, offer custom work, participate in local markets, and build an online presence."
        ],
        techniques: [
            "Traditional techniques are valuable - document them, practice regularly, and consider teaching others to preserve the knowledge.",
            "Combine traditional methods with modern tools where helpful, but maintain the authentic character of your craft.",
            "Focus on mastering fundamental techniques first, then experiment with variations. Quality comes from consistent practice."
        ],
        materials: [
            "Source quality materials from trusted suppliers. Build relationships with vendors for better prices and consistent supply.",
            "Consider local materials when possible - they often work best with traditional techniques and support local economy.",
            "Keep detailed records of material costs and suppliers. This helps with pricing and ensures consistent quality."
        ],
        general: [
            "I'm here to help with your artisan journey. Could you tell me more about your specific craft or question?",
            "Every artisan's path is unique. What particular aspect of your craft or business would you like guidance on?",
            "Traditional crafts have great value in today's market. What specific challenge are you facing?"
        ]
    },
    [SupportedLanguage.HINDI]: {
        greeting: [
            "नमस्ते! मैं आपके शिल्प और व्यापार के सवालों में मदद के लिए यहाँ हूँ। आप क्या जानना चाहते हैं?",
            "स्वागत है! मैं पारंपरिक शिल्प, मूल्य निर्धारण और व्यापारिक सलाह में आपकी सहायता कर सकता हूँ।",
            "नमस्कार! मैं आपका शिल्प सहायक हूँ। तकनीक, सामग्री या व्यापारिक रणनीति के बारे में पूछें।"
        ],
        pricing: [
            "अपने शिल्प का मूल्य निर्धारण: सामग्री लागत + श्रम समय + अन्य खर्च + लाभ (20-30%)। स्थानीय बाजार में समान उत्पादों की जांच करें।",
            "मूल्य गणना: (सामग्री लागत + समय × घंटे की दर + अन्य खर्च) × 1.3 लाभ के लिए। अपने कुशल काम को कम न आंकें!",
            "इन बातों पर विचार करें: कच्चा माल, लगा समय, कौशल स्तर, बाजार मांग, प्रतियोगी मूल्य। 25-30% लाभ जोड़ें।"
        ],
        business: [
            "व्यापार बढ़ाने के लिए: गुणवत्ता पर ध्यान दें, ग्राहक संबंध बनाएं, सोशल मीडिया का उपयोग करें, ऑनलाइन बाजार देखें।",
            "व्यापारिक सुझाव: निरंतर गुणवत्ता, प्रक्रिया का दस्तावेजीकरण, पोर्टफोलियो बनाएं, अन्य कारीगरों से जुड़ें।",
            "व्यापार वृद्धि: बेहतर फोटोग्राफी, अपनी कहानी बताएं, कस्टम काम करें, स्थानीय बाजारों में भाग लें।"
        ],
        techniques: [
            "पारंपरिक तकनीकें मूल्यवान हैं - इन्हें दस्तावेजित करें, नियमित अभ्यास करें, दूसरों को सिखाने पर विचार करें।",
            "पारंपरिक विधियों को आधुनिक उपकरणों के साथ मिलाएं जहाँ उपयोगी हो, लेकिन प्रामाणिक चरित्र बनाए रखें।",
            "पहले मूलभूत तकनीकों में महारत हासिल करें, फिर विविधताओं के साथ प्रयोग करें। गुणवत्ता निरंतर अभ्यास से आती है।"
        ],
        materials: [
            "विश्वसनीय आपूर्तिकर्ताओं से गुणवत्तापूर्ण सामग्री प्राप्त करें। बेहतर मूल्य और निरंतर आपूर्ति के लिए संबंध बनाएं।",
            "जब संभव हो तो स्थानीय सामग्री का विचार करें - वे अक्सर पारंपरिक तकनीकों के साथ सबसे अच्छा काम करती हैं।",
            "सामग्री लागत और आपूर्तिकर्ताओं का विस्तृत रिकॉर्ड रखें। यह मूल्य निर्धारण और निरंतर गुणवत्ता में मदद करता है।"
        ],
        general: [
            "मैं आपकी कारीगरी यात्रा में मदद के लिए यहाँ हूँ। क्या आप अपने विशिष्ट शिल्प या प्रश्न के बारे में और बता सकते हैं?",
            "हर कारीगर का रास्ता अनोखा होता है। आप अपने शिल्प या व्यापार के किस विशेष पहलू पर मार्गदर्शन चाहते हैं?",
            "पारंपरिक शिल्प का आज के बाजार में बहुत महत्व है। आप किस विशिष्ट चुनौती का सामना कर रहे हैं?"
        ]
    }
} as const;

/**
 * Fallback service that provides demo responses
 */
export class FallbackService {
    private conversationHistory: Map<string, ContextMessage[]> = new Map();
    private responseCount: number = 0;

    /**
     * Generate a demo response based on user input
     */
    async generateFallbackResponse(
        userMessage: string,
        language: SupportedLanguage = SupportedLanguage.ENGLISH,
        sessionId: string = 'default'
    ): Promise<string> {
        try {
            // Simulate processing delay for realism
            await this.simulateProcessingDelay();

            // Detect the topic/domain from user message
            const detectedDomain = this.detectArtisanDomain(userMessage, language);
            const responseCategory = this.categorizeMessage(userMessage, language);

            // Get appropriate demo response
            const response = this.selectDemoResponse(responseCategory, language, detectedDomain);

            // Update conversation history
            this.updateConversationHistory(sessionId, userMessage, response, language);

            // Add fallback mode indicator
            const fallbackIndicator = language === SupportedLanguage.HINDI
                ? '\n\n[डेमो मोड - AI मॉडल लोड हो रहा है]'
                : '\n\n[Demo Mode - AI model loading]';

            return response + fallbackIndicator;

        } catch (error) {
            console.error('Fallback response generation failed:', error);

            // Ultimate fallback
            return language === SupportedLanguage.HINDI
                ? 'क्षमा करें, मैं अभी आपकी मदद नहीं कर सकता। कृपया बाद में पुनः प्रयास करें।\n\n[डेमो मोड]'
                : 'Sorry, I cannot help you right now. Please try again later.\n\n[Demo Mode]';
        }
    }

    /**
     * Check if fallback service is available
     */
    isAvailable(): boolean {
        return true; // Fallback is always available
    }

    /**
     * Get fallback service status
     */
    getStatus(): {
        active: boolean;
        responseCount: number;
        message: string;
    } {
        return {
            active: true,
            responseCount: this.responseCount,
            message: 'Fallback service active - providing demo responses'
        };
    }

    /**
     * Clear conversation history for a session
     */
    clearSession(sessionId: string): void {
        this.conversationHistory.delete(sessionId);
    }

    /**
     * Get conversation history for a session
     */
    getConversationHistory(sessionId: string): ContextMessage[] {
        return this.conversationHistory.get(sessionId) || [];
    }

    // ============================================================================
    // Private Helper Methods
    // ============================================================================

    /**
     * Simulate processing delay to make responses feel more natural
     */
    private async simulateProcessingDelay(): Promise<void> {
        // Random delay between 500ms and 2000ms
        const delay = Math.random() * 1500 + 500;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Detect artisan domain from user message
     */
    private detectArtisanDomain(message: string, language: SupportedLanguage): ArtisanDomain {
        const lowerMessage = message.toLowerCase();

        for (const [domain, config] of Object.entries(ARTISAN_DOMAINS)) {
            const keywords = language === SupportedLanguage.HINDI
                ? config.hindiKeywords
                : config.keywords;

            if (keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))) {
                return domain as ArtisanDomain;
            }
        }

        return ArtisanDomain.GENERAL;
    }

    /**
     * Categorize message to select appropriate response type
     */
    private categorizeMessage(message: string, language: SupportedLanguage): keyof typeof DEMO_RESPONSES[SupportedLanguage.ENGLISH] {
        const lowerMessage = message.toLowerCase();

        // Pricing related keywords
        const pricingKeywords = language === SupportedLanguage.HINDI
            ? ['मूल्य', 'कीमत', 'दाम', 'रेट', 'पैसा', 'लागत']
            : ['price', 'cost', 'rate', 'money', 'sell', 'charge', 'expensive', 'cheap'];

        if (pricingKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return 'pricing';
        }

        // Business related keywords
        const businessKeywords = language === SupportedLanguage.HINDI
            ? ['व्यापार', 'बिजनेस', 'बेचना', 'ग्राहक', 'मार्केट', 'बाजार', 'विक्रय']
            : ['business', 'market', 'customer', 'sell', 'marketing', 'growth', 'profit'];

        if (businessKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return 'business';
        }

        // Technique related keywords
        const techniqueKeywords = language === SupportedLanguage.HINDI
            ? ['तकनीक', 'विधि', 'कैसे', 'बनाना', 'सीखना', 'कौशल']
            : ['technique', 'method', 'how', 'make', 'create', 'skill', 'learn'];

        if (techniqueKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return 'techniques';
        }

        // Material related keywords
        const materialKeywords = language === SupportedLanguage.HINDI
            ? ['सामग्री', 'माल', 'कच्चा', 'मटेरियल']
            : ['material', 'supply', 'raw', 'ingredient', 'component'];

        if (materialKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return 'materials';
        }

        // Greeting keywords
        const greetingKeywords = language === SupportedLanguage.HINDI
            ? ['नमस्ते', 'हैलो', 'हाय', 'सलाम']
            : ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon'];

        if (greetingKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return 'greeting';
        }

        // Default to general
        return 'general';
    }

    /**
     * Select appropriate demo response
     */
    private selectDemoResponse(
        category: keyof typeof DEMO_RESPONSES[SupportedLanguage.ENGLISH],
        language: SupportedLanguage,
        domain: ArtisanDomain
    ): string {
        const responses = DEMO_RESPONSES[language][category];

        if (!responses || responses.length === 0) {
            return DEMO_RESPONSES[language].general[0];
        }

        // Select response based on response count for variety
        const index = this.responseCount % responses.length;
        this.responseCount++;

        let response = responses[index];

        // Add domain-specific context if relevant
        if (domain !== ArtisanDomain.GENERAL && category !== 'greeting') {
            const domainContext = this.getDomainContext(domain, language);
            if (domainContext) {
                response += ` ${domainContext}`;
            }
        }

        return response;
    }

    /**
     * Get domain-specific context to add to responses
     */
    private getDomainContext(domain: ArtisanDomain, language: SupportedLanguage): string {
        const contexts = {
            [SupportedLanguage.ENGLISH]: {
                [ArtisanDomain.POTTERY]: "For pottery work, consider clay quality, firing temperatures, and glaze compatibility.",
                [ArtisanDomain.TEXTILES]: "In textile work, thread quality and weaving tension are crucial for durability.",
                [ArtisanDomain.WOODWORK]: "For woodworking, wood grain direction and moisture content affect the final quality.",
                [ArtisanDomain.METALWORK]: "In metalwork, proper heating and cooling techniques ensure strength and finish.",
                [ArtisanDomain.JEWELRY]: "For jewelry making, precision in measurements and quality of metals/stones is essential.",
                [ArtisanDomain.PAINTING]: "In painting, color mixing and surface preparation determine the artwork's longevity.",
                [ArtisanDomain.SCULPTURE]: "For sculpture, understanding material properties helps achieve desired forms.",
                [ArtisanDomain.GENERAL]: ""
            },
            [SupportedLanguage.HINDI]: {
                [ArtisanDomain.POTTERY]: "मिट्टी के काम में, मिट्टी की गुणवत्ता, पकाने का तापमान और ग्लेज़ की संगति महत्वपूर्ण है।",
                [ArtisanDomain.TEXTILES]: "कपड़े के काम में, धागे की गुणवत्ता और बुनाई का तनाव टिकाऊपन के लिए महत्वपूर्ण है।",
                [ArtisanDomain.WOODWORK]: "लकड़ी के काम में, लकड़ी की दिशा और नमी की मात्रा अंतिम गुणवत्ता को प्रभावित करती है।",
                [ArtisanDomain.METALWORK]: "धातु के काम में, उचित गर्म करना और ठंडा करना मजबूती और फिनिश सुनिश्चित करता है।",
                [ArtisanDomain.JEWELRY]: "आभूषण बनाने में, माप में सटीकता और धातु/पत्थर की गुणवत्ता आवश्यक है।",
                [ArtisanDomain.PAINTING]: "चित्रकारी में, रंग मिश्रण और सतह की तैयारी कलाकृति की दीर्घायु निर्धारित करती है।",
                [ArtisanDomain.SCULPTURE]: "मूर्तिकला के लिए, सामग्री के गुणों को समझना वांछित रूप प्राप्त करने में मदद करता है।",
                [ArtisanDomain.GENERAL]: ""
            }
        };

        return contexts[language][domain] || "";
    }

    /**
     * Update conversation history
     */
    private updateConversationHistory(
        sessionId: string,
        userMessage: string,
        response: string,
        language: SupportedLanguage
    ): void {
        if (!this.conversationHistory.has(sessionId)) {
            this.conversationHistory.set(sessionId, []);
        }

        const history = this.conversationHistory.get(sessionId)!;
        const timestamp = Date.now();

        // Add user message
        history.push({
            role: 'user',
            content: userMessage,
            timestamp
        });

        // Add assistant response
        history.push({
            role: 'assistant',
            content: response,
            timestamp: timestamp + 1
        });

        // Keep only last 10 messages to prevent memory issues
        if (history.length > 10) {
            history.splice(0, history.length - 10);
        }
    }
}