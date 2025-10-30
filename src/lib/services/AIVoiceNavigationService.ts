/**
 * AI-Powered Voice Navigation Service
 * Uses real-time AI processing of feature descriptions for intelligent navigation
 */

export interface KalaSarthiFeature {
    name: string;
    route: string;
    description: string;
    detailedDescription: string;
    useCases: string[];
    targetUsers: string[];
    category: string;
    multilingual?: {
        [language: string]: {
            name: string;
            description: string;
            useCases: string[];
            keywords: string[];
        };
    };
}

export interface AINavigationResult {
    success: boolean;
    intent?: {
        intent: string;
        confidence: number;
        targetRoute: string;
        featureName: string;
        reasoning: string;
        matchedConcepts: string[];
        language: string;
    };
    feedback: string;
    alternativeSuggestions?: string[];
    error?: string;
    executionTime: number;
}

export class AIVoiceNavigationService {
    private static instance: AIVoiceNavigationService;
    private features: KalaSarthiFeature[] = [];
    private isInitialized = false;
    private supportedLanguages = ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa'];

    private constructor() {
        this.initializeKalaSarthiFeatures();
    }

    public static getInstance(): AIVoiceNavigationService {
        if (!AIVoiceNavigationService.instance) {
            AIVoiceNavigationService.instance = new AIVoiceNavigationService();
        }
        return AIVoiceNavigationService.instance;
    }

    private initializeKalaSarthiFeatures(): void {
        this.features = [
            {
                name: "Trend Spotter",
                route: "/trend-spotter",
                description: "AI-powered market trend analysis and viral product identification system",
                detailedDescription: "Advanced analytics platform that monitors market trends, identifies viral products, analyzes consumer behavior patterns, forecasts demand, and provides actionable insights for artisans to capitalize on emerging opportunities. Uses machine learning to predict which products will become popular and helps artisans stay ahead of market trends.",
                useCases: [
                    "Identify trending products in the market",
                    "Analyze consumer demand patterns",
                    "Forecast future market trends",
                    "Discover viral product opportunities",
                    "Monitor competitor product performance",
                    "Get insights on seasonal demand changes"
                ],
                targetUsers: ["Market researchers", "Product developers", "Business strategists", "Artisans looking for opportunities"],
                category: "analytics",
                multilingual: {
                    "hi": {
                        name: "ट्रेंड स्पॉटर",
                        description: "बाजार की प्रवृत्तियों का विश्लेषण और वायरल उत्पादों की पहचान",
                        useCases: [
                            "बाजार में ट्रेंडिंग उत्पादों की पहचान करें",
                            "उपभोक्ता मांग पैटर्न का विश्लेषण करें",
                            "भविष्य के बाजार रुझानों का पूर्वानुमान लगाएं",
                            "वायरल उत्पाद के अवसरों की खोज करें"
                        ],
                        keywords: ["ट्रेंड", "बाजार", "विश्लेषण", "मांग", "उत्पाद", "लोकप्रिय", "वायरल"]
                    },
                    "bn": {
                        name: "ট্রেন্ড স্পটার",
                        description: "বাজারের প্রবণতা বিশ্লেষণ এবং ভাইরাল পণ্য সনাক্তকরণ",
                        useCases: [
                            "বাজারে ট্রেন্ডিং পণ্য চিহ্নিত করুন",
                            "ভোক্তা চাহিদার ধরন বিশ্লেষণ করুন",
                            "ভবিষ্যতের বাজারের প্রবণতা পূর্বাভাস দিন"
                        ],
                        keywords: ["ট্রেন্ড", "বাজার", "বিশ্লেষণ", "চাহিদা", "পণ্য", "জনপ্রিয়"]
                    }
                }
            },
            {
                name: "Artisan Buddy",
                route: "/artisan-buddy",
                description: "AI assistant providing personalized guidance and support for traditional artisans",
                detailedDescription: "Comprehensive AI-powered assistant that helps traditional artisans with craft techniques, business advice, skill development, market insights, pricing strategies, and connecting with customers. Acts as a virtual mentor providing 24/7 support for artisan growth and success.",
                useCases: [
                    "Get guidance on traditional craft techniques",
                    "Receive business advice for artisan ventures",
                    "Learn new skills and improve craftsmanship",
                    "Get pricing recommendations for products",
                    "Connect with other artisans and mentors",
                    "Access market insights for craft products"
                ],
                targetUsers: ["Traditional artisans", "Craft makers", "Small business owners", "Skill learners"],
                category: "assistance",
                multilingual: {
                    "hi": {
                        name: "कारीगर मित्र",
                        description: "पारंपरिक कारीगरों के लिए व्यक्तिगत मार्गदर्शन और सहायता",
                        useCases: [
                            "पारंपरिक शिल्प तकनीकों पर मार्गदर्शन प्राप्त करें",
                            "कारीगर उद्यमों के लिए व्यावसायिक सलाह प्राप्त करें",
                            "नए कौशल सीखें और शिल्पकारी में सुधार करें"
                        ],
                        keywords: ["कारीगर", "शिल्प", "मदद", "सहायक", "मार्गदर्शन", "सलाह", "कौशल"]
                    },
                    "bn": {
                        name: "কারিগর বন্ধু",
                        description: "ঐতিহ্যবাহী কারিগরদের জন্য ব্যক্তিগত নির্দেশনা এবং সহায়তা",
                        useCases: [
                            "ঐতিহ্যবাহী কারুশিল্প কৌশলে নির্দেশনা পান",
                            "কারিগর উদ্যোগের জন্য ব্যবসায়িক পরামর্শ নিন"
                        ],
                        keywords: ["কারিগর", "শিল্প", "সাহায্য", "গাইড", "পরামর্শ", "দক্ষতা"]
                    }
                }
            },
            {
                name: "Dashboard",
                route: "/dashboard",
                description: "Central control panel providing comprehensive overview of all KalaSarthi activities",
                detailedDescription: "Main hub that aggregates all user activities, performance metrics, notifications, recent transactions, key insights, and quick access to all features. Provides a bird's-eye view of the user's journey on the platform with personalized recommendations and important updates.",
                useCases: [
                    "View overall platform activity summary",
                    "Check performance metrics and statistics",
                    "Access recent transactions and orders",
                    "Get personalized recommendations",
                    "Monitor business growth indicators",
                    "Quick navigation to all features"
                ],
                targetUsers: ["All users", "Business owners", "Platform administrators", "Data analysts"],
                category: "overview",
                multilingual: {
                    "hi": {
                        name: "डैशबोर्ड",
                        description: "सभी कलासार्थी गतिविधियों का व्यापक अवलोकन प्रदान करने वाला केंद्रीय नियंत्रण पैनल",
                        useCases: [
                            "समग्र प्लेटफॉर्म गतिविधि सारांश देखें",
                            "प्रदर्शन मेट्रिक्स और आंकड़े जांचें",
                            "हाल के लेनदेन और ऑर्डर तक पहुंचें"
                        ],
                        keywords: ["डैशबोर्ड", "अवलोकन", "मुख्य", "होम", "नियंत्रण", "पैनल", "आंकड़े"]
                    },
                    "bn": {
                        name: "ড্যাশবোর্ড",
                        description: "সমস্ত কলাসার্থি কার্যক্রমের ব্যাপক ওভারভিউ প্রদানকারী কেন্द্রীয় নিয়ন্ত্রণ প্যানেল",
                        useCases: [
                            "সামগ্রিক প্ল্যাটফর্ম কার্যকলাপের সারসংক্ষেপ দেখুন",
                            "পারফরম্যান্স মেট্রিক্স এবং পরিসংখ্যান পরীক্ষা করুন"
                        ],
                        keywords: ["ড্যাশবোর্ড", "ওভারভিউ", "মূল", "হোম", "নিয়ন্ত্রণ", "প্যানেল"]
                    }
                }
            },
            {
                name: "Smart Product Creator",
                route: "/smart-product-creator",
                description: "AI-powered intelligent product creation and development platform",
                detailedDescription: "Advanced product development tool that uses artificial intelligence to help artisans create, design, and develop new products. Provides automated design suggestions, market validation, pricing optimization, and complete product development workflow from concept to market-ready product.",
                useCases: [
                    "Create new products with AI assistance",
                    "Generate product designs automatically",
                    "Validate product ideas against market demand",
                    "Optimize product pricing strategies",
                    "Develop complete product specifications",
                    "Get AI-powered creative suggestions"
                ],
                targetUsers: ["Product developers", "Entrepreneurs", "Creative professionals", "Artisans"],
                category: "creation"
            },
            {
                name: "AI Design Generator",
                route: "/ai-design-generator",
                description: "Creative AI tool for generating visual designs and artistic content",
                detailedDescription: "Sophisticated AI-powered design generation platform that creates visual designs, artwork, graphics, and creative content. Uses advanced machine learning models to generate unique designs based on user preferences, style requirements, and creative briefs.",
                useCases: [
                    "Generate unique visual designs automatically",
                    "Create artwork and graphics for products",
                    "Design logos and branding materials",
                    "Generate creative content for marketing",
                    "Create design templates and patterns",
                    "Produce artistic illustrations and graphics"
                ],
                targetUsers: ["Graphic designers", "Artists", "Marketing professionals", "Creative entrepreneurs"],
                category: "creation"
            },
            {
                name: "Buyer Connect",
                route: "/buyer-connect",
                description: "Platform connecting artisans with potential buyers and customers worldwide",
                detailedDescription: "Comprehensive networking and connection platform that matches artisans with suitable buyers, facilitates business relationships, manages customer communications, tracks sales opportunities, and provides tools for building long-term business partnerships in the global marketplace.",
                useCases: [
                    "Connect with potential buyers globally",
                    "Manage customer relationships effectively",
                    "Track sales opportunities and leads",
                    "Build business partnerships",
                    "Communicate with international clients",
                    "Expand customer base worldwide"
                ],
                targetUsers: ["Artisans seeking buyers", "Sales professionals", "Export businesses", "Customer relationship managers"],
                category: "networking"
            },
            {
                name: "Inventory Management",
                route: "/dashboard/inventory",
                description: "Comprehensive inventory tracking and stock management system",
                detailedDescription: "Advanced inventory management platform that tracks product stock levels, monitors supply chain, manages warehouse operations, provides low-stock alerts, handles product cataloging, and optimizes inventory turnover for maximum efficiency and profitability.",
                useCases: [
                    "Track product stock levels in real-time",
                    "Monitor inventory turnover rates",
                    "Manage warehouse operations efficiently",
                    "Get alerts for low stock situations",
                    "Organize product catalogs systematically",
                    "Optimize inventory for profitability"
                ],
                targetUsers: ["Inventory managers", "Warehouse operators", "Business owners", "Supply chain managers"],
                category: "management"
            },
            {
                name: "Global Bazaar",
                route: "/marketplace",
                description: "International marketplace for global trade and commerce",
                detailedDescription: "Comprehensive global marketplace platform that enables international trade, facilitates cross-border commerce, provides multi-currency support, handles international shipping, manages global product listings, and connects artisans with worldwide customers and distributors.",
                useCases: [
                    "Sell products in international markets",
                    "Access global customer base",
                    "Manage international shipping and logistics",
                    "Handle multi-currency transactions",
                    "List products for worldwide visibility",
                    "Connect with international distributors"
                ],
                targetUsers: ["Export businesses", "International traders", "Global sellers", "E-commerce entrepreneurs"],
                category: "commerce"
            },
            {
                name: "Scheme Sahayak",
                route: "/yojana-mitra",
                description: "Government schemes and financial assistance information portal",
                detailedDescription: "Comprehensive government assistance platform that provides detailed information about government schemes, subsidies, financial aid programs, policy updates, application procedures, eligibility criteria, and step-by-step guidance for accessing various government benefits and support programs.",
                useCases: [
                    "Find relevant government schemes and subsidies",
                    "Check eligibility for financial assistance",
                    "Get guidance on application procedures",
                    "Track application status and updates",
                    "Access policy information and updates",
                    "Understand benefit calculation and disbursement"
                ],
                targetUsers: ["Small business owners", "Artisans seeking support", "Rural entrepreneurs", "Policy beneficiaries"],
                category: "assistance"
            },
            {
                name: "Digital Khata",
                route: "/finance/dashboard",
                description: "Digital accounting and comprehensive financial management system",
                detailedDescription: "Advanced digital accounting platform that manages financial records, tracks income and expenses, generates financial reports, handles tax calculations, monitors cash flow, provides financial analytics, and offers comprehensive bookkeeping solutions for artisan businesses.",
                useCases: [
                    "Maintain digital financial records",
                    "Track daily income and expenses",
                    "Generate financial reports and statements",
                    "Monitor cash flow and profitability",
                    "Handle tax calculations and compliance",
                    "Analyze financial performance trends"
                ],
                targetUsers: ["Business owners", "Accountants", "Financial managers", "Small entrepreneurs"],
                category: "finance",
                multilingual: {
                    "hi": {
                        name: "डिजिटल खाता",
                        description: "डिजिटल लेखांकन और वित्तीय प्रबंधन प्रणाली",
                        useCases: [
                            "डिजिटल वित्तीय रिकॉर्ड बनाए रखें",
                            "दैनिक आय और व्यय को ट्रैक करें",
                            "वित्तीय रिपोर्ट और स्टेटमेंट जेनरेट करें",
                            "कैश फ्लो और लाभप्रदता की निगरानी करें"
                        ],
                        keywords: ["खाता", "लेखा", "वित्त", "पैसा", "आय", "व्यय", "हिसाब", "किताब"]
                    },
                    "bn": {
                        name: "ডিজিটাল খাতা",
                        description: "ডিজিটাল হিসাবরক্ষণ এবং আর্থিক ব্যবস্থাপনা সিস্টেম",
                        useCases: [
                            "ডিজিটাল আর্থিক রেকর্ড বজায় রাখুন",
                            "দৈনিক আয় এবং ব্যয় ট্র্যাক করুন",
                            "আর্থিক প্রতিবেদন তৈরি করুন"
                        ],
                        keywords: ["খাতা", "হিসাব", "অর্থ", "টাকা", "আয়", "ব্যয়", "লেখা"]
                    }
                }
            }
        ];

        this.isInitialized = true;
    }

    /**
     * Detect language of the input text
     */
    private detectLanguage(text: string): string {
        // Simple language detection based on character patterns
        const hindiPattern = /[\u0900-\u097F]/;
        const bengaliPattern = /[\u0980-\u09FF]/;
        const tamilPattern = /[\u0B80-\u0BFF]/;
        const teluguPattern = /[\u0C00-\u0C7F]/;
        const marathiPattern = /[\u0900-\u097F]/; // Similar to Hindi
        const gujaratiPattern = /[\u0A80-\u0AFF]/;
        const kannadaPattern = /[\u0C80-\u0CFF]/;
        const malayalamPattern = /[\u0D00-\u0D7F]/;
        const punjabiPattern = /[\u0A00-\u0A7F]/;

        if (hindiPattern.test(text)) return 'hi';
        if (bengaliPattern.test(text)) return 'bn';
        if (tamilPattern.test(text)) return 'ta';
        if (teluguPattern.test(text)) return 'te';
        if (gujaratiPattern.test(text)) return 'gu';
        if (kannadaPattern.test(text)) return 'kn';
        if (malayalamPattern.test(text)) return 'ml';
        if (punjabiPattern.test(text)) return 'pa';

        return 'en'; // Default to English
    }

    /**
     * Process voice input using AI analysis of feature descriptions
     */
    public async processAIVoiceInput(
        voiceInput: string,
        _userId?: string
    ): Promise<AINavigationResult> {
        const startTime = performance.now();

        try {
            if (!this.isInitialized) {
                throw new Error('AI navigation service not initialized');
            }

            if (!voiceInput || voiceInput.trim().length === 0) {
                return {
                    success: false,
                    feedback: 'No voice input received. Please try speaking again.',
                    error: 'Empty voice input',
                    executionTime: performance.now() - startTime
                };
            }

            // Detect language and analyze user intent
            const detectedLanguage = this.detectLanguage(voiceInput);
            const analysisResult = await this.analyzeUserIntentWithAI(voiceInput, detectedLanguage);

            if (analysisResult.bestMatch && analysisResult.confidence > 0.3) {
                const feature = analysisResult.bestMatch;

                return {
                    success: true,
                    intent: {
                        intent: `navigate_${feature.name.toLowerCase().replace(/\s+/g, '_')}`,
                        confidence: analysisResult.confidence,
                        targetRoute: feature.route,
                        featureName: feature.name,
                        reasoning: analysisResult.reasoning,
                        matchedConcepts: analysisResult.matchedConcepts,
                        language: detectedLanguage
                    },
                    feedback: `${this.generateMultilingualFeedback(feature, detectedLanguage, 'opening')} - ${analysisResult.explanation}`,
                    executionTime: performance.now() - startTime
                };
            } else {
                // Provide intelligent suggestions based on AI analysis
                const suggestions = analysisResult.topMatches
                    .slice(0, 3)
                    .map(match => match.feature.name);

                return {
                    success: false,
                    feedback: `I understand you're looking for "${voiceInput}". ${analysisResult.reasoning}`,
                    alternativeSuggestions: suggestions,
                    error: 'No confident match found',
                    executionTime: performance.now() - startTime
                };
            }

        } catch (error) {
            return {
                success: false,
                feedback: 'AI processing failed. Please try again.',
                error: error instanceof Error ? error.message : 'Unknown error',
                executionTime: performance.now() - startTime
            };
        }
    }

    /**
     * AI-powered analysis of user intent against feature descriptions
     */
    private async analyzeUserIntentWithAI(userQuery: string, language: string = 'en'): Promise<{
        bestMatch: KalaSarthiFeature | null;
        confidence: number;
        reasoning: string;
        explanation: string;
        matchedConcepts: string[];
        topMatches: Array<{ feature: KalaSarthiFeature; score: number; reasoning: string }>;
    }> {
        const userIntent = userQuery.toLowerCase().trim();
        const analysisResults: Array<{
            feature: KalaSarthiFeature;
            score: number;
            reasoning: string;
            matchedConcepts: string[];
        }> = [];

        // Analyze each feature using AI-like processing with multilingual support
        for (const feature of this.features) {
            const analysis = this.analyzeFeatureMatch(userIntent, feature, language);
            analysisResults.push({
                feature,
                score: analysis.score,
                reasoning: analysis.reasoning,
                matchedConcepts: analysis.matchedConcepts
            });
        }

        // Sort by score and get the best match
        analysisResults.sort((a, b) => b.score - a.score);
        const bestMatch = analysisResults[0];

        let overallReasoning = '';
        let explanation = '';

        if (bestMatch && bestMatch.score > 0.3) {
            overallReasoning = `Based on AI analysis, "${userQuery}" best matches ${bestMatch.feature.name} because ${bestMatch.reasoning}`;
            explanation = `This feature ${bestMatch.feature.description.toLowerCase()}`;
        } else {
            const topFeatures = analysisResults.slice(0, 3).map(r => r.feature.name).join(', ');
            overallReasoning = `The query "${userQuery}" doesn't clearly match any specific feature. The closest matches are: ${topFeatures}. Please be more specific about what you want to do.`;
            explanation = 'Please try a more specific request';
        }

        return {
            bestMatch: bestMatch?.feature || null,
            confidence: bestMatch?.score || 0,
            reasoning: overallReasoning,
            explanation,
            matchedConcepts: bestMatch?.matchedConcepts || [],
            topMatches: analysisResults.slice(0, 5).map(r => ({
                feature: r.feature,
                score: r.score,
                reasoning: r.reasoning
            }))
        };
    }

    /**
     * AI-like analysis of how well a user query matches a feature with multilingual support
     */
    private analyzeFeatureMatch(userQuery: string, feature: KalaSarthiFeature, language: string = 'en'): {
        score: number;
        reasoning: string;
        matchedConcepts: string[];
    } {
        const matchedConcepts: string[] = [];
        let totalScore = 0;
        let matchReasons: string[] = [];

        // Get multilingual content for the detected language
        const multilingualContent = feature.multilingual?.[language];

        // 1. Analyze against feature name (high weight) - check both English and local language
        let nameScore = this.calculateTextSimilarity(userQuery, feature.name.toLowerCase());
        if (multilingualContent) {
            const localNameScore = this.calculateTextSimilarity(userQuery, multilingualContent.name.toLowerCase());
            nameScore = Math.max(nameScore, localNameScore);
        }
        if (nameScore > 0.2) { // Lowered threshold for better multilingual matching
            totalScore += nameScore * 0.4; // 40% weight for name match
            matchReasons.push(`name similarity (${(nameScore * 100).toFixed(0)}%)`);
            matchedConcepts.push(multilingualContent?.name || feature.name);
        }

        // 2. Analyze against description (medium weight) - check both languages
        let descScore = this.calculateTextSimilarity(userQuery, feature.description.toLowerCase());
        if (multilingualContent) {
            const localDescScore = this.calculateTextSimilarity(userQuery, multilingualContent.description.toLowerCase());
            descScore = Math.max(descScore, localDescScore);
        }
        if (descScore > 0.15) { // Lowered threshold
            totalScore += descScore * 0.3; // 30% weight for description match
            matchReasons.push(`description relevance (${(descScore * 100).toFixed(0)}%)`);
        }

        // 3. Analyze against detailed description (medium weight)
        const detailedScore = this.calculateTextSimilarity(userQuery, feature.detailedDescription.toLowerCase());
        if (detailedScore > 0.1) {
            totalScore += detailedScore * 0.2; // 20% weight for detailed description
            matchReasons.push(`detailed functionality match (${(detailedScore * 100).toFixed(0)}%)`);
        }

        // 4. Analyze against use cases (enhanced with multilingual support)
        let useCaseScore = 0;

        // Check English use cases
        for (const useCase of feature.useCases) {
            const caseScore = this.calculateTextSimilarity(userQuery, useCase.toLowerCase());
            if (caseScore > 0.15) { // Lowered threshold
                useCaseScore = Math.max(useCaseScore, caseScore);
                matchedConcepts.push(useCase);
            }
        }

        // Check multilingual use cases
        if (multilingualContent?.useCases) {
            for (const useCase of multilingualContent.useCases) {
                const caseScore = this.calculateTextSimilarity(userQuery, useCase.toLowerCase());
                if (caseScore > 0.15) {
                    useCaseScore = Math.max(useCaseScore, caseScore);
                    matchedConcepts.push(useCase);
                }
            }
        }

        // Check multilingual keywords
        if (multilingualContent?.keywords) {
            for (const keyword of multilingualContent.keywords) {
                if (userQuery.includes(keyword.toLowerCase())) {
                    useCaseScore = Math.max(useCaseScore, 0.8); // High score for direct keyword match
                    matchedConcepts.push(keyword);
                }
            }
        }

        if (useCaseScore > 0) {
            totalScore += useCaseScore * 0.2; // Increased weight for use case match
            matchReasons.push(`use case alignment (${(useCaseScore * 100).toFixed(0)}%)`);
        }

        // 5. Intent-based keyword analysis
        const intentScore = this.analyzeUserIntent(userQuery, feature);
        if (intentScore > 0) {
            totalScore += intentScore * 0.3; // 30% weight for intent analysis
            matchReasons.push(`intent analysis (${(intentScore * 100).toFixed(0)}%)`);
        }

        // Generate reasoning
        const reasoning = matchReasons.length > 0
            ? `matches through ${matchReasons.join(', ')}`
            : 'no significant matches found';

        return {
            score: Math.min(totalScore, 1.0), // Cap at 1.0
            reasoning,
            matchedConcepts
        };
    }

    /**
     * Calculate text similarity using multiple enhanced techniques
     */
    private calculateTextSimilarity(text1: string, text2: string): number {
        // Normalize texts
        const normalizedText1 = text1.toLowerCase().trim();
        const normalizedText2 = text2.toLowerCase().trim();

        // Exact phrase match
        if (normalizedText1 === normalizedText2) return 1.0;

        // Substring match (higher score for longer matches)
        if (normalizedText1.includes(normalizedText2)) {
            return 0.9 * (normalizedText2.length / normalizedText1.length);
        }
        if (normalizedText2.includes(normalizedText1)) {
            return 0.9 * (normalizedText1.length / normalizedText2.length);
        }

        // Word-based analysis
        const words1 = normalizedText1.split(/\s+/).filter(word => word.length > 1); // Reduced minimum length
        const words2 = normalizedText2.split(/\s+/).filter(word => word.length > 1);

        if (words1.length === 0 || words2.length === 0) return 0;

        // Enhanced word overlap analysis with position weighting
        let totalScore = 0;
        let matchedWords = 0;
        const maxWords = Math.max(words1.length, words2.length);

        for (let i = 0; i < words1.length; i++) {
            let bestMatch = 0;
            for (let j = 0; j < words2.length; j++) {
                const word1 = words1[i];
                const word2 = words2[j];

                if (word1 === word2) {
                    bestMatch = 1.0;
                    break;
                } else if (this.areWordsSimilar(word1, word2)) {
                    bestMatch = Math.max(bestMatch, 0.8);
                } else if (word1.includes(word2) || word2.includes(word1)) {
                    const similarity = Math.min(word1.length, word2.length) / Math.max(word1.length, word2.length);
                    bestMatch = Math.max(bestMatch, similarity * 0.6);
                }
            }

            if (bestMatch > 0) {
                matchedWords++;
                totalScore += bestMatch;
            }
        }

        // Calculate final similarity score
        const wordOverlapScore = totalScore / maxWords;

        // Bonus for high match percentage
        const matchPercentage = matchedWords / Math.min(words1.length, words2.length);
        const bonus = matchPercentage > 0.5 ? 0.1 : 0;

        return Math.min(wordOverlapScore + bonus, 1.0);
    }

    /**
     * Analyze user intent patterns
     */
    private analyzeUserIntent(userQuery: string, feature: KalaSarthiFeature): number {
        const query = userQuery.toLowerCase();
        let intentScore = 0;

        // Intent patterns for different actions
        const intentPatterns = {
            creation: ['create', 'make', 'build', 'develop', 'generate', 'design', 'produce', 'craft'],
            analysis: ['analyze', 'check', 'show', 'see', 'view', 'monitor', 'track', 'study'],
            assistance: ['help', 'guide', 'support', 'assist', 'advice', 'mentor', 'teach'],
            management: ['manage', 'organize', 'control', 'handle', 'maintain', 'operate'],
            connection: ['connect', 'link', 'join', 'network', 'meet', 'find', 'reach'],
            financial: ['money', 'finance', 'accounting', 'budget', 'expense', 'income', 'payment']
        };

        // Check which intent patterns match the query
        for (const [intentType, patterns] of Object.entries(intentPatterns)) {
            const patternMatches = patterns.filter(pattern => query.includes(pattern));

            if (patternMatches.length > 0) {
                // Check if this intent aligns with the feature category
                const categoryAlignment = this.getCategoryIntentAlignment(feature.category, intentType);
                intentScore += (patternMatches.length / patterns.length) * categoryAlignment;
            }
        }

        return Math.min(intentScore, 1.0);
    }

    /**
     * Generate multilingual feedback message
     */
    private generateMultilingualFeedback(feature: KalaSarthiFeature, language: string, action: 'opening' | 'suggesting'): string {
        const feedbackTemplates = {
            opening: {
                en: `Opening ${feature.name}`,
                hi: `${feature.multilingual?.hi?.name || feature.name} खोला जा रहा है`,
                bn: `${feature.multilingual?.bn?.name || feature.name} খোলা হচ্ছে`
            },
            suggesting: {
                en: `Did you mean ${feature.name}?`,
                hi: `क्या आपका मतलब ${feature.multilingual?.hi?.name || feature.name} था?`,
                bn: `আপনি কি ${feature.multilingual?.bn?.name || feature.name} বোঝাতে চেয়েছিলেন?`
            }
        };

        const template = feedbackTemplates[action][language as keyof typeof feedbackTemplates.opening] ||
            feedbackTemplates[action].en;

        return template;
    }

    /**
     * Get alignment score between feature category and user intent
     */
    private getCategoryIntentAlignment(category: string, intentType: string): number {
        const alignments: Record<string, Record<string, number>> = {
            'creation': { creation: 1.0, analysis: 0.3, assistance: 0.5, management: 0.2, connection: 0.1, financial: 0.1 },
            'analytics': { analysis: 1.0, creation: 0.2, assistance: 0.3, management: 0.4, connection: 0.2, financial: 0.3 },
            'assistance': { assistance: 1.0, creation: 0.4, analysis: 0.3, management: 0.2, connection: 0.5, financial: 0.2 },
            'management': { management: 1.0, analysis: 0.5, creation: 0.2, assistance: 0.3, connection: 0.2, financial: 0.6 },
            'networking': { connection: 1.0, management: 0.3, assistance: 0.4, creation: 0.2, analysis: 0.3, financial: 0.2 },
            'commerce': { connection: 0.8, management: 0.6, analysis: 0.4, creation: 0.3, assistance: 0.3, financial: 0.7 },
            'finance': { financial: 1.0, management: 0.8, analysis: 0.6, assistance: 0.3, creation: 0.1, connection: 0.2 },
            'overview': { analysis: 0.8, management: 0.7, assistance: 0.4, creation: 0.3, connection: 0.3, financial: 0.5 }
        };

        return alignments[category]?.[intentType] || 0.1;
    }

    /**
     * Check if two words are semantically similar with multilingual support
     */
    private areWordsSimilar(word1: string, word2: string): boolean {
        // Enhanced semantic word relationships with multilingual terms
        const semanticGroups = {
            creation: {
                en: ['create', 'make', 'build', 'develop', 'generate', 'produce', 'craft', 'design', 'new', 'add'],
                hi: ['बनाना', 'बनाएं', 'तैयार', 'विकसित', 'नया', 'जोड़ना', 'डिजाइन'],
                bn: ['তৈরি', 'বানান', 'নতুন', 'যোগ', 'ডিজাইন']
            },
            analysis: {
                en: ['analyze', 'check', 'study', 'examine', 'review', 'assess', 'evaluate', 'show', 'see', 'view'],
                hi: ['विश्लेषण', 'जांच', 'देखना', 'दिखाना', 'समीक्षा'],
                bn: ['বিশ্লেষণ', 'পরীক্ষা', 'দেখা', 'দেখান']
            },
            assistance: {
                en: ['help', 'support', 'guide', 'assist', 'mentor', 'advice', 'aid'],
                hi: ['मदद', 'सहायता', 'गाइड', 'सलाह', 'सहारा'],
                bn: ['সাহায্য', 'সহায়তা', 'গাইড', 'পরামর্শ']
            },
            financial: {
                en: ['money', 'finance', 'accounting', 'budget', 'cash', 'payment', 'income', 'expense', 'khata'],
                hi: ['पैसा', 'वित्त', 'लेखा', 'खाता', 'आय', 'व्यय', 'हिसाब', 'बजट'],
                bn: ['টাকা', 'অর্থ', 'হিসাব', 'খাতা', 'আয়', 'ব্যয়']
            },
            business: {
                en: ['business', 'commerce', 'trade', 'market', 'sales', 'profit', 'revenue', 'bazaar'],
                hi: ['व्यापार', 'बाजार', 'बिक्री', 'लाभ', 'बाज़ार'],
                bn: ['ব্যবসা', 'বাজার', 'বিক্রয়', 'লাভ']
            },
            management: {
                en: ['manage', 'control', 'organize', 'handle', 'maintain', 'operate', 'track', 'inventory'],
                hi: ['प्रबंधन', 'नियंत्रण', 'व्यवस्थित', 'संचालन', 'ट्रैक'],
                bn: ['ব্যবস্থাপনা', 'নিয়ন্ত্রণ', 'সংগঠিত', 'ট্র্যাক']
            },
            trending: {
                en: ['trend', 'trending', 'popular', 'viral', 'hot', 'demand'],
                hi: ['ट्रेंड', 'लोकप्রিय', 'वायरल', 'मांग', 'चलन'],
                bn: ['ট্রেন্ড', 'জনপ্রিয়', 'ভাইরাল', 'চাহিদা']
            }
        };

        // Check if words belong to the same semantic group across languages
        for (const group of Object.values(semanticGroups)) {
            const allWords = Object.values(group).flat();
            if (allWords.includes(word1) && allWords.includes(word2)) {
                return true;
            }
        }

        // Enhanced partial string matching
        if (word1.length > 3 && word2.length > 3) {
            const longer = word1.length > word2.length ? word1 : word2;
            const shorter = word1.length <= word2.length ? word1 : word2;

            // Check for substring match with lower threshold
            if (longer.includes(shorter) && shorter.length / longer.length > 0.5) {
                return true;
            }

            // Check for common prefixes/suffixes
            if (word1.substring(0, 3) === word2.substring(0, 3) &&
                Math.abs(word1.length - word2.length) <= 2) {
                return true;
            }
        }

        // Check for phonetic similarity (basic)
        if (this.arePhoneticallySimilar(word1, word2)) {
            return true;
        }

        return false;
    }

    /**
     * Basic phonetic similarity check
     */
    private arePhoneticallySimilar(word1: string, word2: string): boolean {
        // Simple phonetic patterns for common variations
        const phoneticPairs = [
            ['ph', 'f'], ['ck', 'k'], ['c', 'k'], ['z', 's'],
            ['tion', 'sion'], ['er', 'ar'], ['or', 'ar']
        ];

        let normalized1 = word1.toLowerCase();
        let normalized2 = word2.toLowerCase();

        for (const [pattern1, pattern2] of phoneticPairs) {
            normalized1 = normalized1.replace(new RegExp(pattern1, 'g'), pattern2);
            normalized2 = normalized2.replace(new RegExp(pattern1, 'g'), pattern2);
        }

        return normalized1 === normalized2;
    }

    /**
     * Get all available features with their descriptions
     */
    public getKalaSarthiFeatures(): KalaSarthiFeature[] {
        return [...this.features];
    }

    /**
     * Search features using AI analysis
     */
    public async searchFeaturesWithAI(query: string, limit: number = 5): Promise<Array<{
        feature: KalaSarthiFeature;
        score: number;
        reasoning: string;
        matchedConcepts: string[];
    }>> {
        if (!this.isInitialized) {
            return [];
        }

        const results = [];

        for (const feature of this.features) {
            const analysis = this.analyzeFeatureMatch(query, feature);
            results.push({
                feature,
                score: analysis.score,
                reasoning: analysis.reasoning,
                matchedConcepts: analysis.matchedConcepts
            });
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    public isReady(): boolean {
        return this.isInitialized;
    }
}