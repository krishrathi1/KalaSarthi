import { GoogleGenerativeAI } from '@google/generative-ai';

interface ArtisanProfile {
    id: string;
    name: string;
    craft: string;
    specialties: string[];
    experience: number;
    location: string;
    products: string[];
    skills: string[];
    bio: string;
    languages: string[];
    businessInfo: {
        established: string;
        revenue: string;
        markets: string[];
    };
}

interface DialogflowIntent {
    name: string;
    patterns: string[];
    responses: {
        en: string[];
        hi: string[];
    };
    action?: string;
    navigationTarget?: string;
    requiresProfile?: boolean;
}

interface ChatResponse {
    response: string;
    intent: string;
    confidence: number;
    shouldNavigate?: boolean;
    navigationTarget?: string;
    language: string;
    usedProfile?: boolean;
}

export class EnhancedArtisanBuddy {
    private static instance: EnhancedArtisanBuddy;
    private genAI: GoogleGenerativeAI;
    private artisanProfiles: Map<string, ArtisanProfile> = new Map();
    private conversationHistory: Map<string, Array<{ role: string, content: string, timestamp: Date }>> = new Map();

    // Predefined intents with patterns
    private intents: DialogflowIntent[] = [
        {
            name: 'greeting',
            patterns: [
                'hello', 'hi', 'hey', 'namaste', 'good morning', 'good afternoon',
                'नमस्ते', 'हैलो', 'कैसे हो', 'कैसे हैं'
            ],
            responses: {
                en: [
                    'Hello! I\'m your Enhanced Artisan Buddy. I can help you with your craft business, navigate the app, and answer questions about artisan life.',
                    'Hi there! I\'m here to assist you with everything related to your artisan journey. What would you like to know?'
                ],
                hi: [
                    'नमस्ते! मैं आपका Enhanced Artisan Buddy हूं। मैं आपके क्राफ्ट बिज़नेस, ऐप नेवीगेशन और कारीगर जीवन के बारे में मदद कर सकता हूं।',
                    'नमस्कार! मैं आपकी कारीगरी यात्रा से जुड़ी हर चीज़ में मदद के लिए यहां हूं। आप क्या जानना चाहते हैं?'
                ]
            }
        },
        {
            name: 'product_creation',
            patterns: [
                'create product', 'new product', 'make product', 'add product', 'design product',
                'नया प्रोडक्ट', 'प्रोडक्ट बनाना', 'प्रोडक्ट डालना', 'product banana'
            ],
            responses: {
                en: [
                    'I\'ll help you create a new product! Let me take you to the Smart Product Creator where you can design and add your crafts.',
                    'Great! Creating new products is exciting. I\'m opening the Product Creator for you.'
                ],
                hi: [
                    'मैं आपको नया प्रोडक्ट बनाने में मदद करूंगा! मैं आपको Smart Product Creator पर ले चलता हूं।',
                    'बहुत अच्छा! नए प्रोडक्ट बनाना रोमांचक है। मैं आपके लिए Product Creator खोल रहा हूं।'
                ]
            },
            action: 'navigate',
            navigationTarget: '/smart-product-creator'
        },
        {
            name: 'sales_inquiry',
            patterns: [
                'sales', 'revenue', 'earnings', 'money', 'profit', 'income', 'finance',
                'सेल्स', 'कमाई', 'फाइनेंस', 'पैसा', 'लाभ', 'आमदनी'
            ],
            responses: {
                en: [
                    'Let me show you your sales and financial data. Opening the Finance Dashboard now.',
                    'I\'ll help you track your earnings and sales performance. Taking you to the finance section.'
                ],
                hi: [
                    'मैं आपकी सेल्स और वित्तीय डेटा दिखाता हूं। Finance Dashboard खोल रहा हूं।',
                    'मैं आपकी कमाई और सेल्स ट्रैक करने में मदद करूंगा। फाइनेंस सेक्शन में ले चलता हूं।'
                ]
            },
            action: 'navigate',
            navigationTarget: '/finance/dashboard'
        },
        {
            name: 'trend_analysis',
            patterns: [
                'trend', 'trending', 'popular', 'fashion', 'style', 'design', 'latest',
                'ट्रेंड', 'लोकप्रिय', 'फैशन', 'डिज़ाइन', 'नवीनतम'
            ],
            responses: {
                en: [
                    'I\'ll help you discover the latest trends and popular designs. Opening Trend Spotter for you.',
                    'Let\'s explore what\'s trending in the craft world! Taking you to trend analysis.'
                ],
                hi: [
                    'मैं आपको नवीनतम ट्रेंड्स और लोकप्रिय डिज़ाइन दिखाता हूं। Trend Spotter खोल रहा हूं।',
                    'चलिए देखते हैं कि क्राफ्ट की दुनिया में क्या ट्रेंड कर रहा है! ट्रेंड एनालिसिस में ले चलता हूं।'
                ]
            },
            action: 'navigate',
            navigationTarget: '/trend-spotter'
        },
        {
            name: 'buyer_matching',
            patterns: [
                'buyer', 'customer', 'match', 'connect', 'find buyer', 'sell to',
                'बायर', 'ग्राहक', 'कस्टमर', 'जुड़ना', 'मैच', 'बेचना'
            ],
            responses: {
                en: [
                    'I\'ll help you connect with potential buyers! Opening the Matchmaking section.',
                    'Let\'s find the right customers for your products. Taking you to buyer matching.'
                ],
                hi: [
                    'मैं आपको संभावित बायर्स से जोड़ने में मदद करूंगा! Matchmaking सेक्शन खोल रहा हूं।',
                    'चलिए आपके प्रोडक्ट्स के लिए सही ग्राहक ढूंढते हैं। बायर मैचिंग में ले चलता हूं।'
                ]
            },
            action: 'navigate',
            navigationTarget: '/matchmaking'
        },
        {
            name: 'profile_info',
            patterns: [
                'my profile', 'about me', 'my info', 'my details', 'profile',
                'मेरी प्रोफाइल', 'मेरे बारे में', 'मेरी जानकारी'
            ],
            responses: {
                en: [
                    'I can tell you about your artisan profile and help you manage it.',
                    'Let me share information about your craft profile and experience.'
                ],
                hi: [
                    'मैं आपकी कारीगर प्रोफाइल के बारे में बता सकता हूं और इसे मैनेज करने में मदद कर सकता हूं।',
                    'मैं आपकी क्राफ्ट प्रोफाइल और अनुभव की जानकारी साझा करता हूं।'
                ]
            },
            requiresProfile: true
        },
        {
            name: 'app_help',
            patterns: [
                'help', 'how to use', 'features', 'what can you do', 'guide',
                'मदद', 'कैसे इस्तेमाल करें', 'फीचर्स', 'गाइड'
            ],
            responses: {
                en: [
                    'I can help you with:\n• Creating and managing products\n• Tracking sales and finances\n• Finding trends and popular designs\n• Connecting with buyers\n• Navigating the app\n• Answering craft-related questions\n• Business advice and strategies\n• Material and technique guidance\n• Marketing and pricing help',
                    'I\'m your complete artisan assistant! I can guide you through the app, help with business decisions, answer questions about your craft, and provide expert advice on techniques, materials, and market trends.'
                ],
                hi: [
                    'मैं आपकी इन चीज़ों में मदद कर सकता हूं:\n• प्रोडक्ट्स बनाना और मैनेज करना\n• सेल्स और फाइनेंस ट्रैक करना\n• ट्रेंड्स और लोकप्रिय डिज़ाइन ढूंढना\n• बायर्स से जुड़ना\n• ऐप नेवीगेट करना\n• क्राफ्ट से जुड़े सवालों के जवाब देना\n• व्यवसाय सलाह और रणनीतियां\n• सामग्री और तकनीक मार्गदर्शन\n• मार्केटिंग और मूल्य निर्धारण सहायता',
                    'मैं आपका पूरा कारीगर असिस्टेंट हूं! मैं ऐप गाइड कर सकता हूं, बिज़नेस डिसिशन में मदद कर सकता हूं, आपके क्राफ्ट के बारे में सवालों के जवाब दे सकता हूं, और तकनीकों, सामग्री और बाज़ार ट्रेंड्स पर विशेषज्ञ सलाह प्रदान कर सकता हूं।'
                ]
            }
        },
        {
            name: 'craft_advice',
            patterns: [
                'material', 'technique', 'how to make', 'best way', 'quality', 'improve',
                'सामग्री', 'तकनीक', 'कैसे बनाएं', 'बेहतर तरीका', 'गुणवत्ता', 'सुधार'
            ],
            responses: {
                en: [
                    'I\'d be happy to help you with craft techniques and materials! What specific aspect would you like guidance on?',
                    'Let me provide you with expert advice on your craft. What particular technique or material question do you have?'
                ],
                hi: [
                    'मुझे खुशी होगी आपकी शिल्प तकनीकों और सामग्री में मदद करने में! आप किस विशिष्ट पहलू पर मार्गदर्शन चाहते हैं?',
                    'मैं आपको आपके शिल्प पर विशेषज्ञ सलाह प्रदान करता हूं। आपका कौन सा विशेष तकनीक या सामग्री का सवाल है?'
                ]
            }
        },
        {
            name: 'business_advice',
            patterns: [
                'pricing', 'marketing', 'sell online', 'customers', 'profit', 'business',
                'मूल्य', 'मार्केटिंग', 'ऑनलाइन बेचना', 'ग्राहक', 'लाभ', 'व्यवसाय'
            ],
            responses: {
                en: [
                    'I can help you with business strategies, pricing, marketing, and growing your craft business. What specific business challenge are you facing?',
                    'Let\'s work on improving your craft business! What aspect of business development would you like to focus on?'
                ],
                hi: [
                    'मैं आपकी व्यवसाय रणनीतियों, मूल्य निर्धारण, मार्केटिंग और आपके शिल्प व्यवसाय को बढ़ाने में मदद कर सकता हूं। आप किस विशिष्ट व्यवसाय चुनौती का सामना कर रहे हैं?',
                    'चलिए आपके शिल्प व्यवसाय को बेहतर बनाने पर काम करते हैं! आप व्यवसाय विकास के किस पहलू पर ध्यान देना चाहते हैं?'
                ]
            }
        }
    ];

    private constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        this.initializeSampleProfiles();
    }

    public static getInstance(): EnhancedArtisanBuddy {
        if (!EnhancedArtisanBuddy.instance) {
            EnhancedArtisanBuddy.instance = new EnhancedArtisanBuddy();
        }
        return EnhancedArtisanBuddy.instance;
    }

    private initializeSampleProfiles() {
        // Sample artisan profiles
        const sampleProfiles: ArtisanProfile[] = [
            {
                id: 'artisan_001',
                name: 'Rajesh Kumar',
                craft: 'Handloom Weaving',
                specialties: ['Silk Sarees', 'Cotton Fabrics', 'Traditional Patterns'],
                experience: 15,
                location: 'Varanasi, Uttar Pradesh',
                products: ['Banarasi Silk Sarees', 'Cotton Dupattas', 'Traditional Stoles'],
                skills: ['Jacquard Weaving', 'Hand Dyeing', 'Pattern Design'],
                bio: 'Master weaver specializing in traditional Banarasi silk sarees with 15 years of experience.',
                languages: ['Hindi', 'English', 'Bhojpuri'],
                businessInfo: {
                    established: '2008',
                    revenue: '₹12-15 lakhs annually',
                    markets: ['India', 'USA', 'UK', 'Canada']
                }
            },
            {
                id: 'artisan_002',
                name: 'Priya Sharma',
                craft: 'Pottery',
                specialties: ['Terracotta', 'Glazed Ceramics', 'Decorative Items'],
                experience: 10,
                location: 'Jaipur, Rajasthan',
                products: ['Decorative Vases', 'Kitchen Utensils', 'Garden Planters'],
                skills: ['Wheel Throwing', 'Hand Building', 'Glazing Techniques'],
                bio: 'Contemporary potter blending traditional techniques with modern designs.',
                languages: ['Hindi', 'English', 'Rajasthani'],
                businessInfo: {
                    established: '2013',
                    revenue: '₹8-10 lakhs annually',
                    markets: ['India', 'Germany', 'Australia']
                }
            }
        ];

        sampleProfiles.forEach(profile => {
            this.artisanProfiles.set(profile.id, profile);
        });
    }

    private detectLanguage(text: string): string {
        const hindiRegex = /[\u0900-\u097F]/;
        const hindiWords = ['मैं', 'मुझे', 'है', 'हैं', 'का', 'की', 'के', 'को', 'से', 'नमस्ते', 'कैसे', 'क्या'];

        if (hindiRegex.test(text)) return 'hi';

        const lowerText = text.toLowerCase();
        const hindiWordCount = hindiWords.filter(word => lowerText.includes(word)).length;

        return hindiWordCount > 0 ? 'hi' : 'en';
    }

    private matchIntent(message: string): { intent: DialogflowIntent | null, confidence: number } {
        const lowerMessage = message.toLowerCase();
        let bestMatch: DialogflowIntent | null = null;
        let highestScore = 0;

        for (const intent of this.intents) {
            let score = 0;
            for (const pattern of intent.patterns) {
                if (lowerMessage.includes(pattern.toLowerCase())) {
                    score += pattern.length; // Longer patterns get higher scores
                }
            }

            if (score > highestScore) {
                highestScore = score;
                bestMatch = intent;
            }
        }

        const confidence = highestScore > 0 ? Math.min(0.9, highestScore / 10) : 0;
        return { intent: bestMatch, confidence };
    }

    private getProfileResponse(artisanId: string, language: string): string {
        const profile = this.artisanProfiles.get(artisanId);

        if (!profile) {
            return language === 'hi'
                ? 'मुझे आपकी प्रोफाइल की जानकारी नहीं मिली। कृपया अपनी प्रोफाइल सेट करें।'
                : 'I couldn\'t find your profile information. Please set up your profile first.';
        }

        if (language === 'hi') {
            return `आपकी प्रोफाइल:\n• नाम: ${profile.name}\n• क्राफ्ट: ${profile.craft}\n• अनुभव: ${profile.experience} साल\n• स्थान: ${profile.location}\n• विशेषताएं: ${profile.specialties.join(', ')}\n• प्रोडक्ट्स: ${profile.products.join(', ')}`;
        } else {
            return `Your Profile:\n• Name: ${profile.name}\n• Craft: ${profile.craft}\n• Experience: ${profile.experience} years\n• Location: ${profile.location}\n• Specialties: ${profile.specialties.join(', ')}\n• Products: ${profile.products.join(', ')}`;
        }
    }

    private async generateGenericResponse(message: string, language: string, artisanId?: string): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            let context = `You are an Enhanced Artisan Buddy, an expert AI assistant specifically designed to help artisans with their craft business, techniques, materials, marketing, and all aspects of artisan life. You have deep knowledge about:

- Traditional and modern crafting techniques
- Materials, tools, and equipment
- Business development and marketing strategies
- Pricing and cost management
- Online selling and e-commerce
- Customer relationship management
- Quality control and product improvement
- Cultural heritage and traditional crafts
- Modern trends and market demands
- Financial planning and business growth
- Supply chain and sourcing
- Skill development and learning resources

Always provide practical, actionable advice tailored to artisans and craftspeople.`;

            if (language === 'hi') {
                context = `आप Enhanced Artisan Buddy हैं, एक विशेषज्ञ AI असिस्टेंट जो विशेष रूप से कारीगरों की उनके क्राफ्ट बिज़नेस, तकनीकों, सामग्री, मार्केटिंग और कारीगर जीवन के सभी पहलुओं में मदद करने के लिए बनाया गया है। आपके पास इन विषयों की गहरी जानकारी है:

- पारंपरिक और आधुनिक शिल्प तकनीकें
- सामग्री, उपकरण और साज़-सामान
- व्यवसाय विकास और मार्केटिंग रणनीतियां
- मूल्य निर्धारण और लागत प्रबंधन
- ऑनलाइन बिक्री और ई-कॉमर्स
- ग्राहक संबंध प्रबंधन
- गुणवत्ता नियंत्रण और उत्पाद सुधार
- सांस्कृतिक विरासत और पारंपरिक शिल्प
- आधुनिक ट्रेंड्स और बाज़ार की मांग
- वित्तीय योजना और व्यवसाय विकास
- आपूर्ति श्रृंखला और सोर्सिंग
- कौशल विकास और सीखने के संसाधन

हमेशा कारीगरों और शिल्पकारों के लिए व्यावहारिक, कार्यान्वित करने योग्य सलाह प्रदान करें।`;
            }

            // Add artisan profile context if available
            if (artisanId) {
                const profile = this.artisanProfiles.get(artisanId);
                if (profile) {
                    if (language === 'hi') {
                        context += `\n\nआप ${profile.name} की मदद कर रहे हैं, जो ${profile.location} से ${profile.craft} के क्षेत्र में ${profile.experience} साल का अनुभव रखते हैं। उनकी विशेषताएं: ${profile.specialties.join(', ')}। उनके कौशल: ${profile.skills.join(', ')}।`;
                    } else {
                        context += `\n\nYou are helping ${profile.name}, a ${profile.craft} artisan from ${profile.location} with ${profile.experience} years of experience. Their specialties: ${profile.specialties.join(', ')}. Their skills: ${profile.skills.join(', ')}.`;
                    }
                }
            }

            // Add conversation history context
            const history = this.conversationHistory.get(artisanId || 'default') || [];
            const recentHistory = history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n');

            const prompt = `${context}

${recentHistory ? `Recent conversation:\n${recentHistory}\n` : ''}

User question: ${message}

Please provide a comprehensive, helpful response that addresses the user's question with specific, actionable advice. If it's about crafts, materials, techniques, or business, provide detailed guidance. Be encouraging and supportive while being informative.`;

            const result = await model.generateContent(prompt);
            return result.response.text();

        } catch (error) {
            console.error('Generic response generation error:', error);
            return language === 'hi'
                ? 'मुझे खुशी होगी आपकी मदद करने में। कृपया अपना सवाल दोबारा पूछें।'
                : 'I\'d be happy to help you. Please ask your question again.';
        }
    }

    public async processMessage(
        message: string,
        userId: string,
        artisanId?: string
    ): Promise<ChatResponse> {
        try {
            const language = this.detectLanguage(message);

            // Add to conversation history
            const historyKey = artisanId || userId;
            if (!this.conversationHistory.has(historyKey)) {
                this.conversationHistory.set(historyKey, []);
            }

            const history = this.conversationHistory.get(historyKey)!;
            history.push({ role: 'user', content: message, timestamp: new Date() });

            // Keep only last 20 messages
            if (history.length > 20) {
                this.conversationHistory.set(historyKey, history.slice(-20));
            }

            // Try to match with predefined intents first (only for navigation and specific actions)
            const { intent, confidence } = this.matchIntent(message);

            // Only use predefined intents for navigation and high-confidence matches
            if (intent && confidence > 0.7 && (intent.navigationTarget || intent.name === 'greeting')) {
                let response: string;

                // Handle profile-specific intents
                if (intent.requiresProfile && artisanId) {
                    response = this.getProfileResponse(artisanId, language);
                } else {
                    // Get random response from intent responses
                    const responses = intent.responses[language as keyof typeof intent.responses] || intent.responses.en;
                    response = responses[Math.floor(Math.random() * responses.length)];
                }

                // Add to conversation history
                history.push({ role: 'assistant', content: response, timestamp: new Date() });

                return {
                    response,
                    intent: intent.name,
                    confidence,
                    shouldNavigate: !!intent.navigationTarget,
                    navigationTarget: intent.navigationTarget,
                    language,
                    usedProfile: intent.requiresProfile && !!artisanId
                };
            }

            // For all other queries, use AI to generate comprehensive responses
            const genericResponse = await this.generateGenericResponse(message, language, artisanId);

            // Add to conversation history
            history.push({ role: 'assistant', content: genericResponse, timestamp: new Date() });

            // Check if the response suggests navigation (for voice commands)
            let shouldNavigate = false;
            let navigationTarget = '';

            // Check for navigation keywords in the original message
            const lowerMessage = message.toLowerCase();
            if (lowerMessage.includes('take me to') || lowerMessage.includes('go to') || lowerMessage.includes('navigate to') || lowerMessage.includes('show me')) {
                if (lowerMessage.includes('finance') || lowerMessage.includes('sales') || lowerMessage.includes('dashboard')) {
                    shouldNavigate = true;
                    navigationTarget = '/finance/dashboard';
                } else if (lowerMessage.includes('product') && lowerMessage.includes('create')) {
                    shouldNavigate = true;
                    navigationTarget = '/smart-product-creator';
                } else if (lowerMessage.includes('marketplace') || lowerMessage.includes('products')) {
                    shouldNavigate = true;
                    navigationTarget = '/marketplace';
                } else if (lowerMessage.includes('trend')) {
                    shouldNavigate = true;
                    navigationTarget = '/trend-spotter';
                }
            }

            return {
                response: genericResponse,
                intent: 'ai_response',
                confidence: 0.9,
                shouldNavigate,
                navigationTarget: navigationTarget || undefined,
                language,
                usedProfile: !!artisanId
            };

        } catch (error) {
            console.error('Message processing error:', error);
            const language = this.detectLanguage(message);

            return {
                response: language === 'hi'
                    ? 'क्षमा करें, मुझे कुछ तकनीकी समस्या हो रही है। कृपया दोबारा कोशिश करें।'
                    : 'I apologize, but I\'m experiencing some technical difficulties. Please try again.',
                intent: 'error',
                confidence: 0.1,
                language
            };
        }
    }

    public addArtisanProfile(profile: ArtisanProfile): void {
        this.artisanProfiles.set(profile.id, profile);
    }

    public getArtisanProfile(artisanId: string): ArtisanProfile | null {
        return this.artisanProfiles.get(artisanId) || null;
    }

    public clearConversationHistory(userId: string): void {
        this.conversationHistory.delete(userId);
    }

    public getConversationHistory(userId: string): Array<{ role: string, content: string, timestamp: Date }> {
        return this.conversationHistory.get(userId) || [];
    }
}