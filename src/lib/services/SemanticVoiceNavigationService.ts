/**
 * AI-Powered Semantic Voice Navigation Service
 * Uses vector embeddings and semantic search for intelligent navigation
 */

export interface FeatureDefinition {
    name: string;
    route: string;
    description: string;
    functionality: string[];
    keywords: string[];
    category: string;
}

export interface SemanticSearchResult {
    feature: FeatureDefinition;
    similarity: number;
    confidence: number;
}

export interface VoiceNavigationResult {
    success: boolean;
    intent?: {
        intent: string;
        confidence: number;
        parameters: Record<string, any>;
        targetRoute: string;
        language: string;
        reasoning: string;
    };
    feedback: string;
    error?: string;
    executionTime: number;
}

export class SemanticVoiceNavigationService {
    private static instance: SemanticVoiceNavigationService;
    private features: FeatureDefinition[] = [];
    private featureEmbeddings: Map<string, number[]> = new Map();
    private isInitialized = false;

    private constructor() {
        this.initializeFeatures();
    }

    public static getInstance(): SemanticVoiceNavigationService {
        if (!SemanticVoiceNavigationService.instance) {
            SemanticVoiceNavigationService.instance = new SemanticVoiceNavigationService();
        }
        return SemanticVoiceNavigationService.instance;
    }

    private initializeFeatures(): void {
        this.features = [
            {
                name: "Trend Spotter",
                route: "/trend-spotter",
                description: "Analyze market trends and identify viral products",
                functionality: [
                    "market analysis", "trend identification", "viral product detection",
                    "consumer behavior analysis", "demand forecasting", "trend analytics"
                ],
                keywords: [
                    "trends", "market", "viral", "popular", "trending", "analysis",
                    "forecast", "demand", "consumer", "behavior", "analytics", "insights"
                ],
                category: "analytics"
            },
            {
                name: "Artisan Buddy",
                route: "/artisan-buddy",
                description: "AI assistant for artisan support and guidance",
                functionality: [
                    "artisan assistance", "craft guidance", "skill development",
                    "business advice", "product recommendations", "market insights"
                ],
                keywords: [
                    "artisan", "craft", "help", "assistant", "buddy", "guidance",
                    "support", "advice", "skills", "craftsmanship", "traditional"
                ],
                category: "assistance"
            },
            {
                name: "Dashboard",
                route: "/dashboard",
                description: "Main control panel and overview of all activities",
                functionality: [
                    "overview", "statistics", "performance metrics", "quick access",
                    "summary", "notifications", "recent activities", "key insights"
                ],
                keywords: [
                    "dashboard", "overview", "main", "home", "control", "panel",
                    "statistics", "metrics", "summary", "activities", "insights"
                ],
                category: "overview"
            },
            {
                name: "Product Creator",
                route: "/smart-product-creator",
                description: "AI-powered tool for creating and designing products",
                functionality: [
                    "product creation", "design generation", "AI assistance",
                    "product development", "creative tools", "automated design"
                ],
                keywords: [
                    "create", "product", "build", "make", "develop", "produce",
                    "creator", "development", "new", "smart", "manufacture",
                    "item", "goods", "merchandise", "invention", "prototype"
                ],
                category: "creation"
            },
            {
                name: "Design Generator",
                route: "/ai-design-generator",
                description: "Generate creative designs using AI technology",
                functionality: [
                    "design creation", "AI generation", "creative assistance",
                    "visual design", "automated creativity", "design templates"
                ],
                keywords: [
                    "design", "generate", "creative", "visual", "art", "graphics",
                    "template", "AI", "automated", "creativity", "aesthetic"
                ],
                category: "creation"
            },
            {
                name: "Buyer Connect",
                route: "/buyer-connect",
                description: "Connect artisans with potential buyers and customers",
                functionality: [
                    "buyer matching", "customer connection", "marketplace networking",
                    "business relationships", "sales opportunities", "client management"
                ],
                keywords: [
                    "buyer", "connect", "customer", "client", "sales", "networking",
                    "marketplace", "business", "relationships", "opportunities"
                ],
                category: "networking"
            },
            {
                name: "Inventory",
                route: "/dashboard/inventory",
                description: "Manage and track product inventory and stock",
                functionality: [
                    "stock management", "inventory tracking", "product catalog",
                    "quantity monitoring", "supply management", "warehouse operations"
                ],
                keywords: [
                    "inventory", "stock", "products", "catalog", "warehouse",
                    "supply", "quantity", "tracking", "management", "items"
                ],
                category: "management"
            },
            {
                name: "Global Bazaar",
                route: "/marketplace",
                description: "International marketplace for buying and selling products",
                functionality: [
                    "global marketplace", "international trade", "product listings",
                    "buying and selling", "e-commerce", "global commerce"
                ],
                keywords: [
                    "bazaar", "marketplace", "global", "international", "trade",
                    "buy", "sell", "commerce", "market", "shopping", "products",
                    "worldwide", "export", "import", "business", "store", "shop"
                ],
                category: "commerce"
            },
            {
                name: "Scheme Sahayak",
                route: "/yojana-mitra",
                description: "Government schemes and financial assistance information",
                functionality: [
                    "government schemes", "financial assistance", "policy information",
                    "subsidy details", "application guidance", "benefit tracking"
                ],
                keywords: [
                    "scheme", "sahayak", "government", "yojana", "policy", "subsidy",
                    "assistance", "financial", "help", "benefits", "application",
                    "grant", "aid", "support", "welfare", "program", "ministry"
                ],
                category: "assistance"
            },
            {
                name: "Digital Khata",
                route: "/finance/dashboard",
                description: "Digital accounting and financial management system",
                functionality: [
                    "financial tracking", "accounting", "expense management",
                    "income tracking", "financial reports", "digital bookkeeping"
                ],
                keywords: [
                    "khata", "finance", "accounting", "money", "expenses", "income",
                    "financial", "bookkeeping", "digital", "records", "transactions",
                    "budget", "cash", "payment", "revenue", "profit", "loss", "ledger"
                ],
                category: "finance"
            }
        ];

        // Generate embeddings for each feature
        this.generateFeatureEmbeddings();
        this.isInitialized = true;
    }

    private generateFeatureEmbeddings(): void {
        this.features.forEach(feature => {
            // Combine all text for embedding
            const combinedText = [
                feature.name,
                feature.description,
                ...feature.functionality,
                ...feature.keywords
            ].join(' ').toLowerCase();

            // Generate simple embedding (in production, use OpenAI or similar)
            const embedding = this.generateSimpleEmbedding(combinedText);
            this.featureEmbeddings.set(feature.name, embedding);
        });
    }

    private generateSimpleEmbedding(text: string): number[] {
        // Simple TF-IDF style embedding for demonstration
        // In production, use OpenAI embeddings API or similar
        const words = text.toLowerCase().split(/\s+/);
        const wordFreq = new Map<string, number>();

        // Count word frequencies with keyword boosting
        words.forEach(word => {
            let weight = 1;

            // Boost important keywords
            const importantKeywords = [
                'create', 'product', 'design', 'finance', 'money', 'accounting',
                'marketplace', 'bazaar', 'government', 'scheme', 'trend', 'artisan',
                'khata', 'yojana', 'sahayak', 'buddy', 'dashboard', 'build', 'make',
                'item', 'manufacture', 'develop', 'produce', 'goods', 'development'
            ];

            if (importantKeywords.includes(word)) {
                weight = 3; // Give 3x weight to important keywords
            }

            wordFreq.set(word, (wordFreq.get(word) || 0) + weight);
        });

        // Create a vocabulary from all features
        const vocabulary = this.createVocabulary();
        const embedding = new Array(vocabulary.length).fill(0);

        // Generate embedding based on word frequencies
        vocabulary.forEach((word, index) => {
            const freq = wordFreq.get(word) || 0;
            embedding[index] = freq / words.length; // Normalize by document length
        });

        return embedding;
    }

    private createVocabulary(): string[] {
        const allWords = new Set<string>();

        this.features.forEach(feature => {
            const text = [
                feature.name,
                feature.description,
                ...feature.functionality,
                ...feature.keywords
            ].join(' ').toLowerCase();

            text.split(/\s+/).forEach(word => {
                if (word.length > 2) { // Filter out very short words
                    allWords.add(word);
                }
            });
        });

        return Array.from(allWords).sort();
    }

    private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
        if (vec1.length !== vec2.length) return 0;

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        if (norm1 === 0 || norm2 === 0) return 0;
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    public async processSemanticVoiceInput(
        voiceInput: string,
        userId?: string
    ): Promise<VoiceNavigationResult> {
        const startTime = performance.now();

        try {
            if (!this.isInitialized) {
                throw new Error('Semantic navigation service not initialized');
            }

            if (!voiceInput || voiceInput.trim().length === 0) {
                return {
                    success: false,
                    feedback: 'No voice input received. Please try speaking again.',
                    error: 'Empty voice input',
                    executionTime: performance.now() - startTime
                };
            }

            // Generate embedding for the input query
            const queryEmbedding = this.generateSimpleEmbedding(voiceInput.toLowerCase());

            // Find the best matching feature using semantic similarity
            const searchResults: SemanticSearchResult[] = [];

            this.features.forEach(feature => {
                const featureEmbedding = this.featureEmbeddings.get(feature.name);
                if (featureEmbedding) {
                    const similarity = this.calculateCosineSimilarity(queryEmbedding, featureEmbedding);
                    searchResults.push({
                        feature,
                        similarity,
                        confidence: similarity
                    });
                }
            });

            // Sort by similarity and get the best match
            searchResults.sort((a, b) => b.similarity - a.similarity);
            const bestMatch = searchResults[0];

            // Set confidence threshold
            const CONFIDENCE_THRESHOLD = 0.01; // Very low threshold for better matching

            if (bestMatch && bestMatch.confidence > CONFIDENCE_THRESHOLD) {
                const reasoning = this.generateReasoning(voiceInput, bestMatch);

                return {
                    success: true,
                    intent: {
                        intent: `navigate_${bestMatch.feature.name.toLowerCase().replace(/\s+/g, '_')}`,
                        confidence: bestMatch.confidence,
                        parameters: {
                            featureName: bestMatch.feature.name,
                            category: bestMatch.feature.category,
                            similarity: bestMatch.similarity
                        },
                        targetRoute: bestMatch.feature.route,
                        language: 'en-US',
                        reasoning
                    },
                    feedback: `Opening ${bestMatch.feature.name} - ${bestMatch.feature.description}`,
                    executionTime: performance.now() - startTime
                };
            } else {
                // Provide helpful suggestions
                const topSuggestions = searchResults
                    .slice(0, 3)
                    .map(result => result.feature.name)
                    .join(', ');

                return {
                    success: false,
                    feedback: `I couldn't understand "${voiceInput}". Did you mean: ${topSuggestions}? Try being more specific about what you want to do.`,
                    error: 'No confident match found',
                    executionTime: performance.now() - startTime
                };
            }

        } catch (error) {
            return {
                success: false,
                feedback: 'Voice processing failed. Please try again.',
                error: error instanceof Error ? error.message : 'Unknown error',
                executionTime: performance.now() - startTime
            };
        }
    }

    private generateReasoning(query: string, match: SemanticSearchResult): string {
        const { feature, confidence } = match;

        // Find which keywords/functionality matched
        const queryWords = query.toLowerCase().split(/\s+/);
        const matchedKeywords = feature.keywords.filter(keyword =>
            queryWords.some(word => word.includes(keyword) || keyword.includes(word))
        );

        const matchedFunctionality = feature.functionality.filter(func =>
            queryWords.some(word => func.toLowerCase().includes(word))
        );

        let reasoning = `Matched "${feature.name}" with ${(confidence * 100).toFixed(1)}% confidence. `;

        if (matchedKeywords.length > 0) {
            reasoning += `Keywords matched: ${matchedKeywords.slice(0, 3).join(', ')}. `;
        }

        if (matchedFunctionality.length > 0) {
            reasoning += `Functionality matched: ${matchedFunctionality.slice(0, 2).join(', ')}.`;
        }

        return reasoning;
    }

    public getAvailableFeatures(): FeatureDefinition[] {
        return [...this.features];
    }

    public async searchFeatures(query: string, limit: number = 5): Promise<SemanticSearchResult[]> {
        if (!this.isInitialized) {
            return [];
        }

        const queryEmbedding = this.generateSimpleEmbedding(query.toLowerCase());
        const results: SemanticSearchResult[] = [];

        this.features.forEach(feature => {
            const featureEmbedding = this.featureEmbeddings.get(feature.name);
            if (featureEmbedding) {
                const similarity = this.calculateCosineSimilarity(queryEmbedding, featureEmbedding);
                results.push({
                    feature,
                    similarity,
                    confidence: similarity
                });
            }
        });

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    public isReady(): boolean {
        return this.isInitialized;
    }
}