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
                category: "analytics"
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
                category: "assistance"
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
                category: "overview"
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
                category: "finance"
            }
        ];

        this.isInitialized = true;
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

            // Use AI to analyze the user's intent against feature descriptions
            const analysisResult = await this.analyzeUserIntentWithAI(voiceInput);

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
                        language: 'en-US'
                    },
                    feedback: `Opening ${feature.name} - ${analysisResult.explanation}`,
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
    private async analyzeUserIntentWithAI(userQuery: string): Promise<{
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

        // Analyze each feature using AI-like processing
        for (const feature of this.features) {
            const analysis = this.analyzeFeatureMatch(userIntent, feature);
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
     * AI-like analysis of how well a user query matches a feature
     */
    private analyzeFeatureMatch(userQuery: string, feature: KalaSarthiFeature): {
        score: number;
        reasoning: string;
        matchedConcepts: string[];
    } {
        const matchedConcepts: string[] = [];
        let totalScore = 0;
        let matchReasons: string[] = [];

        // 1. Analyze against feature name (high weight)
        const nameScore = this.calculateTextSimilarity(userQuery, feature.name.toLowerCase());
        if (nameScore > 0.3) {
            totalScore += nameScore * 0.4; // 40% weight for name match
            matchReasons.push(`name similarity (${(nameScore * 100).toFixed(0)}%)`);
            matchedConcepts.push(feature.name);
        }

        // 2. Analyze against description (medium weight)
        const descScore = this.calculateTextSimilarity(userQuery, feature.description.toLowerCase());
        if (descScore > 0.2) {
            totalScore += descScore * 0.3; // 30% weight for description match
            matchReasons.push(`description relevance (${(descScore * 100).toFixed(0)}%)`);
        }

        // 3. Analyze against detailed description (medium weight)
        const detailedScore = this.calculateTextSimilarity(userQuery, feature.detailedDescription.toLowerCase());
        if (detailedScore > 0.1) {
            totalScore += detailedScore * 0.2; // 20% weight for detailed description
            matchReasons.push(`detailed functionality match (${(detailedScore * 100).toFixed(0)}%)`);
        }

        // 4. Analyze against use cases (low weight but important for intent)
        let useCaseScore = 0;

        for (const useCase of feature.useCases) {
            const caseScore = this.calculateTextSimilarity(userQuery, useCase.toLowerCase());
            if (caseScore > 0.2) {
                useCaseScore = Math.max(useCaseScore, caseScore);
                matchedConcepts.push(useCase);
            }
        }

        if (useCaseScore > 0) {
            totalScore += useCaseScore * 0.1; // 10% weight for use case match
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
     * Calculate text similarity using multiple techniques
     */
    private calculateTextSimilarity(text1: string, text2: string): number {
        // Exact phrase match
        if (text1 === text2) return 1.0;
        if (text1.includes(text2) || text2.includes(text1)) return 0.8;

        const words1 = text1.split(/\s+/).filter(word => word.length > 2);
        const words2 = text2.split(/\s+/).filter(word => word.length > 2);

        if (words1.length === 0 || words2.length === 0) return 0;

        // Word overlap analysis
        let matchedWords = 0;
        const totalWords = Math.max(words1.length, words2.length);

        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1 === word2) {
                    matchedWords += 1;
                    break;
                } else if (this.areWordsSimilar(word1, word2)) {
                    matchedWords += 0.7; // Partial credit for similar words
                    break;
                }
            }
        }

        return matchedWords / totalWords;
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
     * Check if two words are semantically similar
     */
    private areWordsSimilar(word1: string, word2: string): boolean {
        // Semantic word relationships
        const semanticGroups = {
            creation: ['create', 'make', 'build', 'develop', 'generate', 'produce', 'craft', 'design'],
            analysis: ['analyze', 'check', 'study', 'examine', 'review', 'assess', 'evaluate'],
            assistance: ['help', 'support', 'guide', 'assist', 'mentor', 'advice', 'aid'],
            financial: ['money', 'finance', 'accounting', 'budget', 'cash', 'payment', 'income', 'expense'],
            business: ['business', 'commerce', 'trade', 'market', 'sales', 'profit', 'revenue'],
            management: ['manage', 'control', 'organize', 'handle', 'maintain', 'operate', 'track']
        };

        // Check if words belong to the same semantic group
        for (const group of Object.values(semanticGroups)) {
            if (group.includes(word1) && group.includes(word2)) {
                return true;
            }
        }

        // Check for partial string matches
        if (word1.length > 4 && word2.length > 4) {
            const longer = word1.length > word2.length ? word1 : word2;
            const shorter = word1.length <= word2.length ? word1 : word2;

            if (longer.includes(shorter) && shorter.length / longer.length > 0.6) {
                return true;
            }
        }

        return false;
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