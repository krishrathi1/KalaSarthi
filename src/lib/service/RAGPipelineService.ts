/**
 * RAG Pipeline Service - Retrieval-Augmented Generation
 * 
 * This service implements the RAG pipeline for the Enhanced Artisan Buddy,
 * combining query processing, context retrieval, and AI response generation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { VectorStoreService } from './VectorStoreService';
import {
    ArtisanProfile,
    RetrievalResult,
    ConversationContext,
    MessageMetadata
} from '../types/enhanced-artisan-buddy';

// ============================================================================
// Query Processing Types and Interfaces
// ============================================================================

export interface QueryAnalysis {
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    queryType: 'profile_search' | 'skill_inquiry' | 'product_question' | 'general_help' | 'business_advice';
    keywords: string[];
    preprocessedQuery: string;
}

export interface ContextRetrievalOptions {
    maxResults: number;
    minRelevanceScore: number;
    includeUserProfile: boolean;
    filterByPermissions: boolean;
    userPreferences?: {
        communicationStyle?: string;
        responseLength?: string;
        topics?: string[];
    };
}

export interface RAGResponse {
    content: string;
    sources: RetrievalResult[];
    confidence: number;
    metadata: MessageMetadata;
}

// ============================================================================
// RAG Pipeline Service Implementation
// ============================================================================

export class RAGPipelineService {
    private static instance: RAGPipelineService;
    private genAI: GoogleGenerativeAI;
    private vectorStoreService: VectorStoreService;
    private isInitialized: boolean = false;

    // Intent patterns for query classification
    private readonly intentPatterns = {
        profile_search: [
            /find.*artisan/i,
            /search.*profile/i,
            /who.*makes/i,
            /artisan.*near/i,
            /craftsperson.*in/i,
            /artisans.*who/i,
            /traditional.*textiles/i
        ],
        skill_inquiry: [
            /how.*to.*make/i,
            /learn.*skill/i,
            /technique.*for/i,
            /method.*of/i,
            /process.*to/i,
            /how.*to.*learn/i,
            /learn.*\w+.*techniques/i,
            /\w+.*techniques/i
        ],
        product_question: [
            /product.*price/i,
            /cost.*of/i,
            /material.*for/i,
            /design.*idea/i,
            /create.*product/i,
            /price.*range/i,
            /what.*is.*the.*price/i
        ],
        business_advice: [
            /business.*help/i,
            /marketing.*advice/i,
            /sell.*more/i,
            /increase.*sales/i,
            /grow.*business/i
        ],
        general_help: [
            /help.*me/i,
            /what.*can.*you/i,
            /assist.*with/i,
            /support.*for/i,
            /guide.*me/i
        ]
    };

    private constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        this.vectorStoreService = VectorStoreService.getInstance();
    }

    public static getInstance(): RAGPipelineService {
        if (!RAGPipelineService.instance) {
            RAGPipelineService.instance = new RAGPipelineService();
        }
        return RAGPipelineService.instance;
    }

    /**
     * Initialize the RAG Pipeline Service
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            await this.vectorStoreService.initialize();
            this.isInitialized = true;
            console.log('RAGPipelineService initialized successfully');
        } catch (error) {
            console.error('Failed to initialize RAGPipelineService:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    // ============================================================================
    // Subtask 4.1: Query Processing and Analysis
    // ============================================================================

    /**
     * Analyze and process user query for intent detection and entity extraction
     */
    async processQuery(query: string, userId?: string): Promise<QueryAnalysis> {
        try {
            // Preprocess the query
            const preprocessedQuery = this.preprocessQuery(query);

            // Detect intent and extract entities
            const intent = this.detectQueryIntent(preprocessedQuery);
            const entities = await this.extractEntities(query); // Use original query for entity extraction
            const queryType = this.classifyQueryType(intent, entities);
            const keywords = this.extractKeywords(preprocessedQuery);

            // Calculate confidence based on pattern matching and entity extraction
            const confidence = this.calculateIntentConfidence(intent, preprocessedQuery, entities);

            return {
                intent,
                confidence,
                entities,
                queryType,
                keywords,
                preprocessedQuery
            };

        } catch (error) {
            console.error('Query processing error:', error);
            // Return fallback analysis
            return {
                intent: 'general_help',
                confidence: 0.3,
                entities: {},
                queryType: 'general_help',
                keywords: query.toLowerCase().split(' ').filter(word => word.length > 2),
                preprocessedQuery: query.toLowerCase().trim()
            };
        }
    }

    /**
     * Preprocess query text for better analysis
     */
    private preprocessQuery(query: string): string {
        return query
            .toLowerCase()
            .trim()
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            // Remove special characters but keep important punctuation
            .replace(/[^\w\s\?\!\.\,]/g, '')
            // Normalize common variations
            .replace(/\b(artisan|craftsman|craftsperson|maker)\b/g, 'artisan')
            .replace(/\b(product|item|craft|creation)\b/g, 'product')
            .replace(/\b(skill|technique|method|process)\b/g, 'skill');
    }

    /**
     * Detect the primary intent of the user query
     */
    private detectQueryIntent(query: string): string {
        let bestIntent = 'general_help';
        let maxMatches = 0;

        for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
            const matches = patterns.filter(pattern => pattern.test(query)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                bestIntent = intent;
            }
        }

        return bestIntent;
    }

    /**
     * Extract entities from the query using pattern matching and NLP
     */
    private async extractEntities(query: string): Promise<Record<string, any>> {
        const entities: Record<string, any> = {};

        try {
            // Extract location entities (preserve original case)
            const locationMatch = query.match(/\b(?:in|from|near|at)\s+([a-zA-Z\s]+?)(?:\s|$|,|\?|\!)/i);
            if (locationMatch) {
                entities.location = locationMatch[1].trim();
            }

            // Extract skill/craft entities (use lowercase for matching)
            const lowerQuery = query.toLowerCase();
            const skillPatterns = [
                /\b(pottery|weaving|woodworking|metalwork|jewelry|textile|painting|sculpture|carving|embroidery|knitting|ceramics|glasswork|leatherwork)\b/g
            ];

            const skills: string[] = [];
            skillPatterns.forEach(pattern => {
                const matches = lowerQuery.match(pattern);
                if (matches) {
                    skills.push(...matches);
                }
            });

            if (skills.length > 0) {
                entities.skills = [...new Set(skills)]; // Remove duplicates
            }

            // Extract product categories (use lowercase for matching)
            const productMatch = lowerQuery.match(/\b(bag|pot|bowl|jewelry|clothing|furniture|decoration|art|craft)\b/g);
            if (productMatch) {
                entities.products = [...new Set(productMatch)];
            }

            // Extract price-related entities
            const priceMatch = query.match(/\$?(\d+(?:\.\d{2})?)\s*(?:to|\-)\s*\$?(\d+(?:\.\d{2})?)/);
            if (priceMatch) {
                entities.priceRange = {
                    min: parseFloat(priceMatch[1]),
                    max: parseFloat(priceMatch[2])
                };
            }

            // Extract experience level
            const experienceMatch = lowerQuery.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/);
            if (experienceMatch) {
                entities.experience = parseInt(experienceMatch[1]);
            }

            return entities;

        } catch (error) {
            console.error('Entity extraction error:', error);
            return {};
        }
    }

    /**
     * Classify the query type based on intent and entities
     */
    private classifyQueryType(intent: string, entities: Record<string, any>): QueryAnalysis['queryType'] {
        // Direct mapping from intent to query type
        const intentToTypeMap: Record<string, QueryAnalysis['queryType']> = {
            'profile_search': 'profile_search',
            'skill_inquiry': 'skill_inquiry',
            'product_question': 'product_question',
            'business_advice': 'business_advice',
            'general_help': 'general_help'
        };

        let queryType = intentToTypeMap[intent] || 'general_help';

        // Refine based on entities
        if (entities.location || entities.skills) {
            queryType = 'profile_search';
        } else if (entities.products && !entities.skills) {
            queryType = 'product_question';
        } else if (entities.skills && !entities.location) {
            queryType = 'skill_inquiry';
        }

        return queryType;
    }

    /**
     * Extract relevant keywords from the preprocessed query
     */
    private extractKeywords(query: string): string[] {
        // Common stop words to filter out
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must',
            'this', 'that', 'these', 'those', 'what', 'where', 'when', 'why', 'how', 'who'
        ]);

        return query
            .split(' ')
            .filter(word =>
                word.length > 2 &&
                !stopWords.has(word) &&
                /^[a-zA-Z]+$/.test(word)
            )
            .slice(0, 10); // Limit to top 10 keywords
    }

    /**
     * Calculate confidence score for intent detection
     */
    private calculateIntentConfidence(intent: string, query: string, entities: Record<string, any>): number {
        // Handle empty or very short queries
        if (!query || query.trim().length < 2) {
            return 0.3;
        }

        let confidence = 0.5; // Base confidence

        // Increase confidence based on pattern matches
        const patterns = this.intentPatterns[intent as keyof typeof this.intentPatterns] || [];
        const matchCount = patterns.filter(pattern => pattern.test(query)).length;
        confidence += (matchCount * 0.2);

        // Increase confidence based on entity extraction
        const entityCount = Object.keys(entities).length;
        confidence += (entityCount * 0.1);

        // Increase confidence for specific keywords
        const specificKeywords = ['artisan', 'craft', 'skill', 'product', 'business', 'help'];
        const keywordMatches = specificKeywords.filter(keyword => query.includes(keyword)).length;
        confidence += (keywordMatches * 0.05);

        // Ensure confidence is within bounds
        return Math.min(Math.max(confidence, 0.1), 1.0);
    }

    /**
     * Optimize query for vector search
     */
    async optimizeQueryForVectorSearch(analysis: QueryAnalysis): Promise<string> {
        try {
            let optimizedQuery = analysis.preprocessedQuery;

            // Enhance query based on query type
            switch (analysis.queryType) {
                case 'profile_search':
                    // Add relevant profile fields to search
                    if (analysis.entities.location) {
                        optimizedQuery += ` location:${analysis.entities.location}`;
                    }
                    if (analysis.entities.skills) {
                        optimizedQuery += ` skills:${analysis.entities.skills.join(' ')}`;
                    }
                    break;

                case 'skill_inquiry':
                    // Focus on skills and techniques
                    optimizedQuery = `skills techniques methods ${optimizedQuery}`;
                    break;

                case 'product_question':
                    // Focus on products and categories
                    optimizedQuery = `products categories items ${optimizedQuery}`;
                    break;

                case 'business_advice':
                    // Focus on business-related content
                    optimizedQuery = `business marketing sales growth ${optimizedQuery}`;
                    break;
            }

            // Add important keywords
            if (analysis.keywords.length > 0) {
                optimizedQuery += ` ${analysis.keywords.join(' ')}`;
            }

            return optimizedQuery.trim();

        } catch (error) {
            console.error('Query optimization error:', error);
            return analysis.preprocessedQuery;
        }
    }

    // ============================================================================
    // Subtask 4.2: Context Retrieval and Ranking Methods
    // ============================================================================

    /**
     * Convert profile matches to retrieval results with enhanced context
     */
    private async convertProfilesToRetrievalResults(
        profileMatches: any[],
        analysis: QueryAnalysis,
        options: ContextRetrievalOptions
    ): Promise<RetrievalResult[]> {
        const results: RetrievalResult[] = [];

        for (const match of profileMatches) {
            try {
                const profile = match.profile;

                // Generate contextual content based on query type
                const content = this.generateContextualContent(profile, analysis);

                // Calculate enhanced relevance score
                const relevanceScore = this.calculateEnhancedRelevanceScore(
                    match.similarity,
                    profile,
                    analysis
                );

                const retrievalResult: RetrievalResult = {
                    content,
                    source: `artisan_profile:${profile.id}`,
                    relevanceScore,
                    metadata: profile.metadata
                };

                results.push(retrievalResult);

            } catch (error) {
                console.error('Error converting profile to retrieval result:', error);
                continue;
            }
        }

        return results;
    }

    /**
     * Generate contextual content from artisan profile based on query analysis
     */
    private generateContextualContent(profile: any, analysis: QueryAnalysis): string {
        const sections: string[] = [];

        // Add profile header
        sections.push(`Artisan: ${profile.personalInfo.name} from ${profile.personalInfo.location}`);
        sections.push(`Experience: ${profile.personalInfo.experience} years`);

        // Add relevant sections based on query type
        switch (analysis.queryType) {
            case 'profile_search':
                sections.push(`Skills: ${profile.skills.primary.join(', ')}`);
                if (profile.skills.secondary.length > 0) {
                    sections.push(`Additional Skills: ${profile.skills.secondary.join(', ')}`);
                }
                sections.push(`Products: ${profile.products.categories.join(', ')}`);
                break;

            case 'skill_inquiry':
                sections.push(`Primary Skills: ${profile.skills.primary.join(', ')}`);
                if (profile.skills.certifications.length > 0) {
                    sections.push(`Certifications: ${profile.skills.certifications.join(', ')}`);
                }
                break;

            case 'product_question':
                sections.push(`Product Categories: ${profile.products.categories.join(', ')}`);
                if (profile.products.specialties.length > 0) {
                    sections.push(`Specialties: ${profile.products.specialties.join(', ')}`);
                }
                sections.push(`Price Range: $${profile.products.priceRange.min} - $${profile.products.priceRange.max}`);
                break;

            case 'business_advice':
                sections.push(`Business Type: ${profile.businessInfo.businessType}`);
                sections.push(`Target Market: ${profile.businessInfo.targetMarket.join(', ')}`);
                if (profile.businessInfo.goals.length > 0) {
                    sections.push(`Goals: ${profile.businessInfo.goals.join(', ')}`);
                }
                break;

            default:
                // General information
                sections.push(`Skills: ${profile.skills.primary.join(', ')}`);
                sections.push(`Products: ${profile.products.categories.join(', ')}`);
        }

        return sections.join('\n');
    }

    /**
     * Calculate enhanced relevance score considering multiple factors
     */
    private calculateEnhancedRelevanceScore(
        baseSimilarity: number,
        profile: any,
        analysis: QueryAnalysis
    ): number {
        let score = baseSimilarity;

        // Boost score based on entity matches
        if (analysis.entities.location &&
            profile.personalInfo.location.toLowerCase().includes(analysis.entities.location.toLowerCase())) {
            score += 0.1;
        }

        if (analysis.entities.skills) {
            const skillMatches = analysis.entities.skills.filter((skill: string) =>
                profile.skills.primary.some((pSkill: string) =>
                    pSkill.toLowerCase().includes(skill.toLowerCase())
                )
            );
            score += (skillMatches.length * 0.05);
        }

        if (analysis.entities.products) {
            const productMatches = analysis.entities.products.filter((product: string) =>
                profile.products.categories.some((category: string) =>
                    category.toLowerCase().includes(product.toLowerCase())
                )
            );
            score += (productMatches.length * 0.05);
        }

        // Boost score for experience relevance
        if (analysis.entities.experience) {
            const experienceDiff = Math.abs(profile.personalInfo.experience - analysis.entities.experience);
            if (experienceDiff <= 2) {
                score += 0.1;
            } else if (experienceDiff <= 5) {
                score += 0.05;
            }
        }

        // Boost score for profile completeness
        const completenessBoost = (profile.metadata.completeness / 100) * 0.1;
        score += completenessBoost;

        // Ensure score is within bounds
        return Math.min(Math.max(score, 0.0), 1.0);
    }

    /**
     * Filter results by minimum relevance score
     */
    private filterByRelevance(results: RetrievalResult[], minScore: number): RetrievalResult[] {
        return results.filter(result => result.relevanceScore >= minScore);
    }

    /**
     * Filter results based on user permissions and privacy settings
     */
    private async filterByPermissions(results: RetrievalResult[], userId: string): Promise<RetrievalResult[]> {
        // For now, implement basic filtering
        // In a real implementation, this would check user permissions, privacy settings, etc.

        return results.filter(result => {
            // Basic permission check - exclude user's own profile from results
            const profileId = result.source.split(':')[1];
            return profileId !== userId;
        });
    }

    /**
     * Filter results based on user preferences
     */
    private filterByUserPreferences(
        results: RetrievalResult[],
        preferences: NonNullable<ContextRetrievalOptions['userPreferences']>
    ): RetrievalResult[] {
        return results.filter(result => {
            // Filter by preferred topics if specified
            if (preferences.topics && preferences.topics.length > 0) {
                const hasPreferredTopic = preferences.topics.some(topic =>
                    result.content.toLowerCase().includes(topic.toLowerCase())
                );
                if (!hasPreferredTopic) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Rank and sort retrieval results based on relevance and query analysis
     */
    private rankRetrievalResults(results: RetrievalResult[], analysis: QueryAnalysis): RetrievalResult[] {
        return results
            .map(result => ({
                ...result,
                // Add ranking boost based on intent confidence
                finalScore: result.relevanceScore * (1 + (analysis.confidence * 0.2))
            }))
            .sort((a, b) => (b as any).finalScore - (a as any).finalScore)
            .map(({ finalScore, ...result }) => result); // Remove temporary finalScore
    }

    /**
     * Get contextual information for specific artisan profiles
     */
    async getProfileContext(profileIds: string[]): Promise<RetrievalResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const results: RetrievalResult[] = [];

        for (const profileId of profileIds) {
            try {
                // Search for specific profile
                const profileMatches = await this.vectorStoreService.searchSimilarProfiles(
                    `id:${profileId}`,
                    1
                );

                if (profileMatches.length > 0) {
                    const profile = profileMatches[0].profile;

                    const result: RetrievalResult = {
                        content: this.generateContextualContent(profile, {
                            intent: 'profile_search',
                            confidence: 1.0,
                            entities: {},
                            queryType: 'profile_search',
                            keywords: [],
                            preprocessedQuery: ''
                        }),
                        source: `artisan_profile:${profile.id}`,
                        relevanceScore: 1.0,
                        metadata: profile.metadata
                    };

                    results.push(result);
                }

            } catch (error) {
                console.error(`Error retrieving profile context for ${profileId}:`, error);
                continue;
            }
        }

        return results;
    }

    /**
     * Search for similar artisans based on specific criteria
     */
    async searchSimilarArtisans(
        criteria: {
            skills?: string[];
            location?: string;
            products?: string[];
            experienceRange?: { min: number; max: number };
        },
        limit: number = 5
    ): Promise<RetrievalResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Build search query from criteria
            const queryParts: string[] = [];

            if (criteria.skills) {
                queryParts.push(`skills:${criteria.skills.join(' ')}`);
            }

            if (criteria.location) {
                queryParts.push(`location:${criteria.location}`);
            }

            if (criteria.products) {
                queryParts.push(`products:${criteria.products.join(' ')}`);
            }

            const searchQuery = queryParts.join(' ');

            // Search for matching profiles
            const profileMatches = await this.vectorStoreService.searchSimilarProfiles(searchQuery, limit);

            // Filter by experience range if specified
            let filteredMatches = profileMatches;
            if (criteria.experienceRange) {
                filteredMatches = profileMatches.filter(match => {
                    const experience = match.profile.personalInfo.experience;
                    return experience >= criteria.experienceRange!.min &&
                        experience <= criteria.experienceRange!.max;
                });
            }

            // Convert to retrieval results
            return await this.convertProfilesToRetrievalResults(
                filteredMatches,
                {
                    intent: 'profile_search',
                    confidence: 0.8,
                    entities: criteria,
                    queryType: 'profile_search',
                    keywords: Object.values(criteria).flat().filter(Boolean) as string[],
                    preprocessedQuery: searchQuery
                },
                {
                    maxResults: limit,
                    minRelevanceScore: 0.5,
                    includeUserProfile: false,
                    filterByPermissions: true
                }
            );

        } catch (error) {
            console.error('Error searching similar artisans:', error);
            return [];
        }
    }

    // ============================================================================
    // Public Interface Methods
    // ============================================================================

    /**
     * Main method to retrieve relevant context for a query
     */
    async retrieveRelevantContext(
        query: string,
        userId: string,
        options: Partial<ContextRetrievalOptions> = {}
    ): Promise<RetrievalResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Set default options
        const retrievalOptions: ContextRetrievalOptions = {
            maxResults: 5,
            minRelevanceScore: 0.7,
            includeUserProfile: true,
            filterByPermissions: true,
            ...options
        };

        try {
            // Process and analyze the query
            const analysis = await this.processQuery(query, userId);

            // Optimize query for vector search
            const optimizedQuery = await this.optimizeQueryForVectorSearch(analysis);

            // Retrieve relevant profiles from vector store
            const profileMatches = await this.vectorStoreService.searchSimilarProfiles(
                optimizedQuery,
                retrievalOptions.maxResults
            );

            // Convert profile matches to retrieval results
            let retrievalResults = await this.convertProfilesToRetrievalResults(
                profileMatches,
                analysis,
                retrievalOptions
            );

            // Apply relevance filtering
            retrievalResults = this.filterByRelevance(retrievalResults, retrievalOptions.minRelevanceScore);

            // Apply permission-based filtering
            if (retrievalOptions.filterByPermissions) {
                retrievalResults = await this.filterByPermissions(retrievalResults, userId);
            }

            // Apply user preference filtering
            if (retrievalOptions.userPreferences) {
                retrievalResults = this.filterByUserPreferences(retrievalResults, retrievalOptions.userPreferences);
            }

            // Rank and sort results
            retrievalResults = this.rankRetrievalResults(retrievalResults, analysis);

            console.log(`Retrieved ${retrievalResults.length} relevant contexts for query: "${query}"`);

            return retrievalResults;

        } catch (error) {
            console.error('Context retrieval error:', error);
            // Return empty array on any error during retrieval
            return [];
        }
    }

    /**
     * Generate response using retrieved context
     */
    async generateResponse(
        query: string,
        context: RetrievalResult[],
        conversationContext?: ConversationContext
    ): Promise<RAGResponse> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Analyze the query to understand intent and requirements
            const analysis = await this.processQuery(query, conversationContext?.userId || 'anonymous');

            // Prepare context for AI generation
            const contextualPrompt = await this.prepareContextualPrompt(
                query,
                context,
                analysis,
                conversationContext
            );

            // Generate response using Gemini AI
            const aiResponse = await this.generateAIResponse(contextualPrompt, analysis);

            // Post-process and format the response
            const formattedResponse = await this.postProcessResponse(
                aiResponse,
                context,
                analysis,
                conversationContext
            );

            // Calculate overall confidence
            const confidence = this.calculateResponseConfidence(context, analysis, aiResponse);

            return {
                content: formattedResponse,
                sources: context,
                confidence,
                metadata: {
                    intent: analysis.intent,
                    confidence: analysis.confidence,
                    entities: analysis.entities,
                    source: 'assistant',
                    processingTime: Date.now()
                }
            };

        } catch (error) {
            console.error('Response generation error:', error);
            return this.generateFallbackResponse(query, context, conversationContext);
        }
    }

    // ============================================================================
    // Subtask 4.3: AI Response Generation Methods
    // ============================================================================

    /**
     * Prepare contextual prompt for AI generation
     */
    private async prepareContextualPrompt(
        query: string,
        context: RetrievalResult[],
        analysis: QueryAnalysis,
        conversationContext?: ConversationContext
    ): Promise<string> {
        const promptSections: string[] = [];

        // Add system context and role definition
        promptSections.push(this.getSystemPrompt(analysis.queryType));

        // Add conversation context if available
        if (conversationContext) {
            promptSections.push(this.formatConversationContext(conversationContext));
        }

        // Add retrieved context information
        if (context.length > 0) {
            promptSections.push(this.formatRetrievedContext(context, analysis));
        }

        // Add user preferences if available
        if (conversationContext?.profileContext?.preferences) {
            promptSections.push(this.formatUserPreferences(conversationContext.profileContext.preferences));
        }

        // Add the user query
        promptSections.push(`\nUser Query: "${query}"`);

        // Add response guidelines
        promptSections.push(this.getResponseGuidelines(analysis, context.length > 0));

        return promptSections.join('\n\n');
    }

    /**
     * Get system prompt based on query type
     */
    private getSystemPrompt(queryType: QueryAnalysis['queryType']): string {
        const basePrompt = "You are an Enhanced Artisan Buddy, an AI assistant specialized in helping artisans with their craft business, skills development, and connecting with buyers.";

        const typeSpecificPrompts = {
            profile_search: "Focus on helping users find and connect with relevant artisans based on their needs.",
            skill_inquiry: "Provide detailed guidance on artisan skills, techniques, and learning resources.",
            product_question: "Assist with product development, pricing, and market insights for artisan products.",
            business_advice: "Offer business guidance for artisan entrepreneurs including marketing, sales, and growth strategies.",
            general_help: "Provide comprehensive assistance across all aspects of artisan business and craft development."
        };

        return `${basePrompt} ${typeSpecificPrompts[queryType]}`;
    }

    /**
     * Format conversation context for the prompt
     */
    private formatConversationContext(conversationContext: ConversationContext): string {
        const sections: string[] = [];

        // Add user profile context if available
        if (conversationContext.profileContext) {
            const profile = conversationContext.profileContext;
            sections.push(`User Profile Context:`);
            sections.push(`- Name: ${profile.personalInfo.name}`);
            sections.push(`- Location: ${profile.personalInfo.location}`);
            sections.push(`- Experience: ${profile.personalInfo.experience} years`);
            sections.push(`- Primary Skills: ${profile.skills.primary.join(', ')}`);
            sections.push(`- Business Type: ${profile.businessInfo.businessType}`);
        }

        // Add recent conversation history (last 3 messages)
        if (conversationContext.conversationHistory.length > 0) {
            const recentMessages = conversationContext.conversationHistory.slice(-3);
            sections.push(`Recent Conversation:`);
            recentMessages.forEach(msg => {
                sections.push(`${msg.sender}: ${msg.content}`);
            });
        }

        return sections.join('\n');
    }

    /**
     * Format retrieved context for the prompt
     */
    private formatRetrievedContext(context: RetrievalResult[], analysis: QueryAnalysis): string {
        const sections: string[] = [];
        sections.push(`Relevant Artisan Information (${context.length} results):`);

        context.forEach((result, index) => {
            sections.push(`\n${index + 1}. Source: ${result.source} (Relevance: ${(result.relevanceScore * 100).toFixed(1)}%)`);
            sections.push(result.content);
        });

        return sections.join('\n');
    }

    /**
     * Format user preferences for the prompt
     */
    private formatUserPreferences(preferences: any): string {
        return `User Preferences:
- Communication Style: ${preferences.communicationStyle}
- Response Length: ${preferences.responseLength}
- Preferred Topics: ${preferences.topics.join(', ') || 'None specified'}`;
    }

    /**
     * Get response guidelines based on analysis and context availability
     */
    private getResponseGuidelines(analysis: QueryAnalysis, hasContext: boolean): string {
        const guidelines: string[] = [];

        guidelines.push("Response Guidelines:");
        guidelines.push("- Provide helpful, accurate, and contextually relevant information");
        guidelines.push("- Use a friendly, professional tone appropriate for artisan community");
        guidelines.push("- Be specific and actionable when possible");

        if (hasContext) {
            guidelines.push("- Reference the provided artisan information when relevant");
            guidelines.push("- Suggest connections with specific artisans when appropriate");
        } else {
            guidelines.push("- Provide general guidance and suggest ways to find relevant artisans");
        }

        // Add query-specific guidelines
        switch (analysis.queryType) {
            case 'profile_search':
                guidelines.push("- Help connect the user with relevant artisans");
                guidelines.push("- Highlight matching skills and expertise");
                break;
            case 'skill_inquiry':
                guidelines.push("- Provide detailed skill development guidance");
                guidelines.push("- Suggest learning resources and techniques");
                break;
            case 'product_question':
                guidelines.push("- Offer product development insights");
                guidelines.push("- Include pricing and market considerations");
                break;
            case 'business_advice':
                guidelines.push("- Focus on practical business strategies");
                guidelines.push("- Include marketing and growth recommendations");
                break;
        }

        return guidelines.join('\n');
    }

    /**
     * Generate AI response using Gemini
     */
    private async generateAIResponse(prompt: string, analysis: QueryAnalysis): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 1024,
                }
            });

            const result = await model.generateContent(prompt);
            const response = result.response;

            if (!response || !response.text()) {
                throw new Error('Empty response from Gemini AI');
            }

            return response.text();

        } catch (error) {
            console.error('Gemini AI generation error:', error);
            throw new Error(`AI response generation failed: ${error}`);
        }
    }

    /**
     * Post-process and format the AI response
     */
    private async postProcessResponse(
        aiResponse: string,
        context: RetrievalResult[],
        analysis: QueryAnalysis,
        conversationContext?: ConversationContext
    ): Promise<string> {
        let formattedResponse = aiResponse.trim();

        // Add source attribution if context was used
        if (context.length > 0) {
            formattedResponse += this.addSourceAttribution(context);
        }

        // Apply user preference formatting
        if (conversationContext?.profileContext?.preferences) {
            formattedResponse = this.applyPreferenceFormatting(
                formattedResponse,
                conversationContext.profileContext.preferences
            );
        }

        // Add helpful suggestions based on query type
        formattedResponse += this.addHelpfulSuggestions(analysis, context.length > 0);

        return formattedResponse;
    }

    /**
     * Add source attribution to the response
     */
    private addSourceAttribution(context: RetrievalResult[]): string {
        if (context.length === 0) return '';

        const sources = context
            .filter(result => result.relevanceScore > 0.7)
            .map(result => {
                const sourceId = result.source.split(':')[1];
                return `artisan profile ${sourceId}`;
            })
            .slice(0, 3); // Limit to top 3 sources

        if (sources.length === 0) return '';

        return `\n\n*Information based on: ${sources.join(', ')}*`;
    }

    /**
     * Apply user preference formatting to the response
     */
    private applyPreferenceFormatting(response: string, preferences: any): string {
        // Adjust response length based on preference
        switch (preferences.responseLength) {
            case 'brief':
                // Keep only the first paragraph or first 200 characters
                const briefResponse = response.split('\n\n')[0];
                return briefResponse.length > 200 ? briefResponse.substring(0, 200) + '...' : briefResponse;

            case 'comprehensive':
                // Response is already comprehensive, no changes needed
                return response;

            case 'detailed':
            default:
                // Default detailed response
                return response;
        }
    }

    /**
     * Add helpful suggestions based on query analysis
     */
    private addHelpfulSuggestions(analysis: QueryAnalysis, hasContext: boolean): string {
        const suggestions: string[] = [];

        if (!hasContext) {
            suggestions.push("\n\n💡 **Helpful Tips:**");

            switch (analysis.queryType) {
                case 'profile_search':
                    suggestions.push("- Try being more specific about location or skills to find better matches");
                    suggestions.push("- Consider expanding your search to nearby areas");
                    break;
                case 'skill_inquiry':
                    suggestions.push("- Look for local workshops or online courses to develop these skills");
                    suggestions.push("- Connect with experienced artisans in your area for mentorship");
                    break;
                case 'product_question':
                    suggestions.push("- Research market trends for your product category");
                    suggestions.push("- Consider creating a prototype to test market response");
                    break;
                case 'business_advice':
                    suggestions.push("- Start with a clear business plan and target market analysis");
                    suggestions.push("- Consider joining artisan communities for networking and support");
                    break;
            }
        } else {
            suggestions.push("\n\n🔗 **Next Steps:**");
            suggestions.push("- Feel free to ask for more specific information about any artisan mentioned");
            suggestions.push("- I can help you connect with these artisans or find similar profiles");
        }

        return suggestions.join('\n');
    }

    /**
     * Calculate overall response confidence
     */
    private calculateResponseConfidence(
        context: RetrievalResult[],
        analysis: QueryAnalysis,
        aiResponse: string
    ): number {
        let confidence = analysis.confidence;

        // Boost confidence if we have high-quality context
        if (context.length > 0) {
            const avgRelevance = context.reduce((sum, result) => sum + result.relevanceScore, 0) / context.length;
            confidence += (avgRelevance * 0.3);
        }

        // Boost confidence for longer, more detailed responses
        if (aiResponse.length > 200) {
            confidence += 0.1;
        }

        // Reduce confidence if no context was available
        if (context.length === 0) {
            confidence *= 0.7;
        }

        return Math.min(Math.max(confidence, 0.1), 1.0);
    }

    /**
     * Generate fallback response when AI generation fails
     */
    private generateFallbackResponse(
        query: string,
        context: RetrievalResult[],
        conversationContext?: ConversationContext
    ): RAGResponse {
        let fallbackContent = "I apologize, but I'm having trouble processing your request right now. ";

        if (context.length > 0) {
            fallbackContent += "However, I found some relevant artisan information that might help:\n\n";
            context.slice(0, 2).forEach((result, index) => {
                fallbackContent += `${index + 1}. ${result.content.split('\n')[0]}\n`;
            });
        } else {
            fallbackContent += "Please try rephrasing your question or being more specific about what you're looking for.";
        }

        return {
            content: fallbackContent,
            sources: context,
            confidence: 0.3,
            metadata: {
                intent: 'error_fallback',
                confidence: 0.3,
                entities: {},
                source: 'assistant'
            }
        };
    }

    /**
     * Update knowledge base with new profile information
     */
    async updateKnowledgeBase(profile: ArtisanProfile): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            await this.vectorStoreService.storeProfile(profile);
            console.log(`Knowledge base updated with profile: ${profile.id}`);
        } catch (error) {
            console.error('Knowledge base update error:', error);
            throw error;
        }
    }

    /**
     * Get service health status
     */
    async getHealthStatus(): Promise<{ healthy: boolean; details: any }> {
        try {
            const vectorStoreHealth = await this.vectorStoreService.getHealthStatus();

            return {
                healthy: this.isInitialized && vectorStoreHealth.healthy,
                details: {
                    initialized: this.isInitialized,
                    vectorStore: vectorStoreHealth,
                    intentPatterns: Object.keys(this.intentPatterns).length
                }
            };
        } catch (error) {
            return {
                healthy: false,
                details: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
        }
    }
}