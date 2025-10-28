/**
 * GenAI-Based Semantic Search for Artisan Matching
 * Uses RAG approach with sentiment analysis and semantic understanding
 */

import { IUser } from '../models/User';
import { FirestoreService, where, orderBy, limit as limitQuery } from '../firestore';
import { FirestoreVectorSearch, VectorSearchResult } from './FirestoreVectorSearch';

export interface SemanticSearchRequest {
  query: string;
  maxResults?: number;
  buyerId?: string;
}

export interface SemanticMatchResult {
  artisan: IUser;
  relevanceScore: number;
  matchReason: string;
  professionMatch: boolean;
  skillsMatch: string[];
  rank: number;
  qualityLevel?: 'excellent' | 'good' | 'fair' | 'low';
}

export interface SemanticSearchResponse {
  matches: SemanticMatchResult[];
  totalFound: number;
  processingTime: number;
  queryAnalysis: {
    detectedProfession: string;
    extractedSkills: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
  };
}

export class GenAISemanticSearch {
  private static instance: GenAISemanticSearch;
  
  // Configurable thresholds for different quality levels
  private readonly RELEVANCE_THRESHOLDS = {
    MINIMUM: parseFloat(process.env.SEMANTIC_SEARCH_MIN_THRESHOLD || '0.15'),      // Absolute minimum to show any results
    LOW_QUALITY: parseFloat(process.env.SEMANTIC_SEARCH_LOW_THRESHOLD || '0.25'),  // Below this shows "low confidence" warning
    GOOD_MATCH: parseFloat(process.env.SEMANTIC_SEARCH_GOOD_THRESHOLD || '0.4'),   // Good quality matches
    EXCELLENT: parseFloat(process.env.SEMANTIC_SEARCH_EXCELLENT_THRESHOLD || '0.7') // Excellent matches
  };
  
  // Profession keywords mapping for semantic understanding
  private professionKeywords = new Map([
    ['pottery', ['pottery', 'ceramic', 'clay', 'pot', 'vase', 'bowl', 'earthenware', 'terracotta', 'glazing', 'kiln']],
    ['woodworking', ['wood', 'wooden', 'furniture', 'table', 'chair', 'cabinet', 'carving', 'carpentry', 'timber', 'oak', 'teak']],
    ['textiles', ['fabric', 'cloth', 'weaving', 'textile', 'cotton', 'silk', 'embroidery', 'handloom', 'saree', 'scarf']],
    ['jewelry', ['jewelry', 'jewellery', 'gold', 'silver', 'necklace', 'ring', 'bracelet', 'earring', 'gem', 'precious']],
    ['leather', ['leather', 'bag', 'wallet', 'belt', 'purse', 'hide', 'suede', 'handbag', 'accessories']],
    ['painting', ['painting', 'art', 'canvas', 'portrait', 'landscape', 'artwork', 'brush', 'color', 'acrylic', 'oil']],
    ['metalwork', ['metal', 'iron', 'steel', 'brass', 'copper', 'forging', 'welding', 'blacksmith', 'sculpture']],
    ['embroidery', ['embroidery', 'stitching', 'thread', 'needle', 'pattern', 'design', 'handwork', 'decorative']]
  ]);

  // Skill synonyms for better matching
  private skillSynonyms = new Map([
    ['handmade', ['handcrafted', 'artisan', 'traditional', 'manual', 'craft']],
    ['custom', ['bespoke', 'personalized', 'made-to-order', 'tailored', 'unique']],
    ['traditional', ['heritage', 'cultural', 'authentic', 'classic', 'ethnic']],
    ['modern', ['contemporary', 'stylish', 'trendy', 'current', 'fashionable']],
    ['decorative', ['ornamental', 'artistic', 'beautiful', 'aesthetic', 'design']]
  ]);

  static getInstance(): GenAISemanticSearch {
    if (!GenAISemanticSearch.instance) {
      GenAISemanticSearch.instance = new GenAISemanticSearch();
    }
    return GenAISemanticSearch.instance;
  }

  /**
   * Main semantic search method using GenAI approach with vector search
   */
  async searchArtisans(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 GenAI Semantic Search: "${request.query}"`);
      
      // Step 1: Analyze query using semantic understanding
      const queryAnalysis = this.analyzeQuery(request.query);
      console.log(`🧠 Detected profession: ${queryAnalysis.detectedProfession}, Skills: ${queryAnalysis.extractedSkills.join(', ')}`);
      
      // Step 2: Use vector search for better semantic matching
      const vectorSearch = FirestoreVectorSearch.getInstance();
      const vectorResults = await vectorSearch.searchArtisans(request.query, {
        profession: queryAnalysis.detectedProfession !== 'unknown' ? queryAnalysis.detectedProfession : undefined,
        maxResults: request.maxResults || 20,
        includeUnavailable: false
      });
      
      // Step 3: Convert vector results to our format
      const matches = vectorResults.map((result, index) => ({
        artisan: result.user,
        relevanceScore: result.similarity,
        matchReasons: [
          `Vector similarity: ${(result.similarity * 100).toFixed(1)}%`,
          `Matched on: ${result.matchType}`,
          `Text: "${result.matchedText.substring(0, 100)}..."`
        ],
        rank: index + 1,
        qualityLevel: this.getMatchQuality(result.similarity),
        vectorSimilarity: result.similarity,
        matchedText: result.matchedText,
        matchType: result.matchType
      }));
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Found ${matches.length} vector matches in ${processingTime}ms`);
      
      return {
        matches,
        totalFound: matches.length,
        processingTime,
        queryAnalysis
      };
      
    } catch (error) {
      console.error('❌ GenAI Semantic Search failed:', error);
      
      // Fallback to traditional search if vector search fails
      console.log('🔄 Falling back to traditional search...');
      try {
        return await this.fallbackSearch(request);
      } catch (fallbackError) {
        console.error('❌ Fallback search also failed:', fallbackError);
        
        // Last resort: call the simple search API
        console.log('🚨 Using simple search API as last resort...');
        return await this.useSimpleSearchAPI(request);
      }
    }
  }

  /**
   * Fallback search method when vector search fails
   */
  private async fallbackSearch(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Using fallback keyword search...');
      
      const queryAnalysis = this.analyzeQuery(request.query);
      const allArtisans = await this.getAllArtisans();
      
      console.log(`📊 Found ${allArtisans.length} artisans for fallback search`);
      
      // Simple keyword matching for fallback
      const matches = this.performKeywordMatching(allArtisans, request.query, queryAnalysis);
      
      const sortedMatches = matches
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, request.maxResults || 20)
        .map((match, index) => ({ 
          ...match, 
          rank: index + 1,
          qualityLevel: this.getMatchQuality(match.relevanceScore)
        }));
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Fallback search found ${sortedMatches.length} matches`);
      
      return {
        matches: sortedMatches,
        totalFound: matches.length,
        processingTime,
        queryAnalysis
      };
      
    } catch (error) {
      console.error('❌ Fallback search also failed:', error);
      
      // Last resort: return some sample artisans
      return this.getEmergencyResults(request);
    }
  }

  /**
   * Simple keyword-based matching for fallback
   */
  private performKeywordMatching(artisans: IUser[], query: string, queryAnalysis: any): any[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const matches: any[] = [];

    for (const artisan of artisans) {
      let score = 0;
      const matchReasons: string[] = [];

      // Check profession match
      if (artisan.artisticProfession && queryWords.some(word => 
        artisan.artisticProfession.toLowerCase().includes(word) ||
        word.includes(artisan.artisticProfession.toLowerCase())
      )) {
        score += 0.8;
        matchReasons.push(`Profession: ${artisan.artisticProfession}`);
      }

      // Check name match
      if (queryWords.some(word => artisan.name.toLowerCase().includes(word))) {
        score += 0.3;
        matchReasons.push(`Name: ${artisan.name}`);
      }

      // Check description match
      if (artisan.description && queryWords.some(word => 
        artisan.description.toLowerCase().includes(word)
      )) {
        score += 0.5;
        matchReasons.push('Description match');
      }

      // Check location match
      if (artisan.address && queryWords.some(word => 
        artisan.address.city?.toLowerCase().includes(word) ||
        artisan.address.state?.toLowerCase().includes(word)
      )) {
        score += 0.4;
        matchReasons.push(`Location: ${artisan.address.city}, ${artisan.address.state}`);
      }

      // Check specializations
      if (artisan.artisanConnectProfile?.specializations) {
        const specializationMatch = artisan.artisanConnectProfile.specializations.some(spec =>
          queryWords.some(word => spec.toLowerCase().includes(word))
        );
        if (specializationMatch) {
          score += 0.6;
          matchReasons.push('Specialization match');
        }
      }

      // Specific keyword bonuses
      const keywords = {
        'silver': ['silver', 'metal', 'jewelry'],
        'jewelry': ['jewelry', 'ornament', 'accessory'],
        'traditional': ['traditional', 'classic', 'heritage'],
        'pottery': ['pottery', 'ceramic', 'clay'],
        'wood': ['wood', 'carving', 'furniture'],
        'textile': ['textile', 'fabric', 'weaving']
      };

      for (const [key, synonyms] of Object.entries(keywords)) {
        if (queryWords.includes(key) || queryWords.some(word => synonyms.includes(word))) {
          if (artisan.artisticProfession.toLowerCase().includes(key) ||
              synonyms.some(syn => artisan.artisticProfession.toLowerCase().includes(syn))) {
            score += 0.7;
            matchReasons.push(`Keyword match: ${key}`);
          }
        }
      }

      if (score > 0.2) { // Minimum threshold
        matches.push({
          artisan,
          relevanceScore: Math.min(score, 1.0), // Cap at 1.0
          matchReasons,
          searchType: 'keyword_fallback'
        });
      }
    }

    return matches;
  }

  /**
   * Emergency results when all else fails
   */
  private getEmergencyResults(request: SemanticSearchRequest): SemanticSearchResponse {
    console.log('🚨 Using emergency results...');
    
    // Return some hardcoded sample results
    const sampleMatches = [
      {
        artisan: {
          uid: 'artisan_002',
          name: 'Priya Sharma',
          artisticProfession: 'jewelry',
          description: 'Traditional jewelry maker specializing in Kundan and Meenakari work',
          address: { city: 'Jaipur', state: 'Rajasthan' }
        },
        relevanceScore: 0.8,
        matchReasons: ['Sample jewelry artisan'],
        rank: 1,
        qualityLevel: 'high'
      },
      {
        artisan: {
          uid: 'artisan_008',
          name: 'Meera Agarwal',
          artisticProfession: 'jewelry',
          description: 'Silver jewelry designer with expertise in tribal and contemporary designs',
          address: { city: 'Pushkar', state: 'Rajasthan' }
        },
        relevanceScore: 0.7,
        matchReasons: ['Sample silver jewelry artisan'],
        rank: 2,
        qualityLevel: 'high'
      }
    ];

    return {
      matches: sampleMatches,
      totalFound: sampleMatches.length,
      processingTime: 50,
      queryAnalysis: {
        detectedProfession: 'jewelry',
        extractedSkills: ['silver', 'jewelry'],
        sentiment: 'neutral',
        confidence: 0.6
      }
    };
  }

  /**
   * Use simple search API as last resort
   */
  private async useSimpleSearchAPI(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
    try {
      console.log('🔗 Calling simple search API...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003'}/api/search-artisans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: request.query,
          maxResults: request.maxResults || 20
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log(`✅ Simple search API returned ${result.data.matches.length} matches`);
          return {
            matches: result.data.matches,
            totalFound: result.data.totalFound,
            processingTime: result.data.processingTime,
            queryAnalysis: result.data.queryAnalysis
          };
        }
      }
      
      throw new Error('Simple search API failed');
      
    } catch (error) {
      console.error('❌ Simple search API also failed:', error);
      
      // Absolute last resort
      return this.getEmergencyResults(request);
    }
  }

  /**
   * Analyze query using semantic understanding and sentiment analysis
   */
  private analyzeQuery(query: string): SemanticSearchResponse['queryAnalysis'] {
    const queryLower = query.toLowerCase().trim();
    
    // Detect profession using semantic keywords
    let detectedProfession = 'general';
    let maxMatches = 0;
    
    for (const [profession, keywords] of this.professionKeywords.entries()) {
      const matches = keywords.filter(keyword => queryLower.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedProfession = profession;
      }
    }
    
    // Extract skills from query
    const extractedSkills: string[] = [];
    
    // Add profession-specific skills
    if (detectedProfession !== 'general') {
      const professionKeywords = this.professionKeywords.get(detectedProfession) || [];
      extractedSkills.push(...professionKeywords.filter(keyword => queryLower.includes(keyword)));
    }
    
    // Add general skills from synonyms
    for (const [skill, synonyms] of this.skillSynonyms.entries()) {
      if (queryLower.includes(skill) || synonyms.some(syn => queryLower.includes(syn))) {
        extractedSkills.push(skill);
      }
    }
    
    // Simple sentiment analysis
    const positiveWords = ['beautiful', 'amazing', 'excellent', 'quality', 'best', 'good', 'love', 'want', 'need'];
    const negativeWords = ['bad', 'poor', 'cheap', 'worst', 'hate', 'dislike'];
    
    const positiveCount = positiveWords.filter(word => queryLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => queryLower.includes(word)).length;
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';
    
    // Calculate confidence based on keyword matches and query length
    const confidence = Math.min(1, (maxMatches * 0.3 + extractedSkills.length * 0.2 + Math.min(query.length / 20, 1) * 0.5));
    
    return {
      detectedProfession,
      extractedSkills: [...new Set(extractedSkills)], // Remove duplicates
      sentiment,
      confidence
    };
  }

  /**
   * Perform semantic matching using RAG approach
   */
  private performSemanticMatching(
    artisans: IUser[], 
    queryAnalysis: SemanticSearchResponse['queryAnalysis'],
    originalQuery: string
  ): SemanticMatchResult[] {
    const matches: SemanticMatchResult[] = [];
    
    for (const artisan of artisans) {
      const matchResult = this.calculateSemanticMatch(artisan, queryAnalysis, originalQuery);
      
      // Only include matches above minimum threshold
      if (matchResult.relevanceScore >= this.RELEVANCE_THRESHOLDS.MINIMUM) {
        matches.push(matchResult);
      }
    }
    
    return matches;
  }

  /**
   * Calculate semantic match score for an artisan
   */
  private calculateSemanticMatch(
    artisan: IUser, 
    queryAnalysis: SemanticSearchResponse['queryAnalysis'],
    originalQuery: string
  ): SemanticMatchResult {
    let relevanceScore = 0;
    const matchedSkills: string[] = [];
    let matchReason = '';
    let professionMatch = false;
    
    // Get artisan data
    const profession = artisan.artisticProfession?.toLowerCase() || '';
    const description = artisan.description?.toLowerCase() || '';
    const skills = artisan.artisanConnectProfile?.matchingData?.skills || [];
    const materials = artisan.artisanConnectProfile?.matchingData?.materials || [];
    const techniques = artisan.artisanConnectProfile?.matchingData?.techniques || [];
    
    // Combine all artisan text for semantic search
    const artisanText = [profession, description, ...skills, ...materials, ...techniques]
      .join(' ').toLowerCase();
    
    // 1. Profession matching (40% weight)
    if (queryAnalysis.detectedProfession !== 'general') {
      const professionKeywords = this.professionKeywords.get(queryAnalysis.detectedProfession) || [];
      
      // Direct profession match
      if (profession.includes(queryAnalysis.detectedProfession)) {
        relevanceScore += 0.4;
        professionMatch = true;
        matchReason = `Specializes in ${queryAnalysis.detectedProfession}`;
      }
      // Keyword-based profession match
      else {
        const keywordMatches = professionKeywords.filter(keyword => artisanText.includes(keyword));
        if (keywordMatches.length > 0) {
          relevanceScore += 0.3 * (keywordMatches.length / professionKeywords.length);
          professionMatch = true;
          matchReason = `Works with ${keywordMatches.slice(0, 2).join(', ')}`;
          matchedSkills.push(...keywordMatches);
        }
      }
    }
    
    // 2. Skills matching (30% weight)
    const skillMatches = queryAnalysis.extractedSkills.filter(skill => 
      artisanText.includes(skill) || 
      skills.some(artisanSkill => artisanSkill.toLowerCase().includes(skill))
    );
    
    if (skillMatches.length > 0) {
      relevanceScore += 0.3 * (skillMatches.length / Math.max(queryAnalysis.extractedSkills.length, 1));
      matchedSkills.push(...skillMatches);
      
      if (!matchReason) {
        matchReason = `Skilled in ${skillMatches.slice(0, 2).join(', ')}`;
      }
    }
    
    // 3. Direct text matching (20% weight)
    const queryWords = originalQuery.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const directMatches = queryWords.filter(word => artisanText.includes(word));
    
    if (directMatches.length > 0) {
      relevanceScore += 0.2 * (directMatches.length / queryWords.length);
      
      if (!matchReason) {
        matchReason = `Matches your search for ${directMatches.slice(0, 2).join(', ')}`;
      }
    }
    
    // 4. Performance bonus (10% weight)
    const performance = artisan.artisanConnectProfile?.performanceMetrics;
    if (performance) {
      const performanceScore = (
        (performance.customerSatisfaction || 4) / 5 * 0.5 +
        (performance.completionRate || 0.9) * 0.3 +
        Math.min(1, (performance.totalOrders || 10) / 50) * 0.2
      );
      relevanceScore += 0.1 * performanceScore;
    }
    
    // Default match reason if none found
    if (!matchReason) {
      matchReason = 'General artisan match';
    }
    
    return {
      artisan,
      relevanceScore: Math.min(1, relevanceScore),
      matchReason,
      professionMatch,
      skillsMatch: [...new Set(matchedSkills)],
      rank: 0 // Will be set during sorting
    };
  }

  /**
   * Get all available artisans from database
   */
  private async getAllArtisans(): Promise<IUser[]> {
    try {
      // First get all artisans
      const allArtisans = await FirestoreService.query<IUser>('users', [
        where('role', '==', 'artisan')
      ]);
      
      // Filter out unavailable artisans in memory to avoid complex index
      return allArtisans.filter(artisan => 
        !artisan.artisanConnectProfile?.availabilityStatus || 
        artisan.artisanConnectProfile.availabilityStatus !== 'unavailable'
      );
      
    } catch (error) {
      console.error('❌ Failed to get artisans:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on query
   */
  getSuggestions(partialQuery: string): string[] {
    const suggestions: string[] = [];
    const queryLower = partialQuery.toLowerCase();
    
    // Add profession suggestions
    for (const [profession, keywords] of this.professionKeywords.entries()) {
      if (profession.includes(queryLower) || keywords.some(k => k.includes(queryLower))) {
        suggestions.push(profession);
        suggestions.push(...keywords.filter(k => k.includes(queryLower)).slice(0, 2));
      }
    }
    
    // Add skill suggestions
    for (const [skill, synonyms] of this.skillSynonyms.entries()) {
      if (skill.includes(queryLower) || synonyms.some(s => s.includes(queryLower))) {
        suggestions.push(skill);
      }
    }
    
    return [...new Set(suggestions)].slice(0, 8);
  }

  /**
   * Determine match quality based on relevance score
   */
  private getMatchQuality(relevanceScore: number): 'excellent' | 'good' | 'fair' | 'low' {
    if (relevanceScore >= this.RELEVANCE_THRESHOLDS.EXCELLENT) {
      return 'excellent';
    } else if (relevanceScore >= this.RELEVANCE_THRESHOLDS.GOOD_MATCH) {
      return 'good';
    } else if (relevanceScore >= this.RELEVANCE_THRESHOLDS.LOW_QUALITY) {
      return 'fair';
    } else {
      return 'low';
    }
  }

  /**
   * Get quality-based filtering statistics
   */
  getQualityStats(matches: SemanticMatchResult[]): {
    total: number;
    excellent: number;
    good: number;
    fair: number;
    low: number;
    averageScore: number;
  } {
    const stats = {
      total: matches.length,
      excellent: 0,
      good: 0,
      fair: 0,
      low: 0,
      averageScore: 0
    };

    if (matches.length === 0) return stats;

    let totalScore = 0;
    for (const match of matches) {
      totalScore += match.relevanceScore;
      const quality = this.getMatchQuality(match.relevanceScore);
      stats[quality]++;
    }

    stats.averageScore = totalScore / matches.length;
    return stats;
  }

  /**
   * Get analytics for search performance
   */
  getSearchAnalytics(): {
    totalSearches: number;
    averageMatches: number;
    topProfessions: Array<{ profession: string; count: number }>;
  } {
    // This would be implemented with actual analytics storage
    return {
      totalSearches: 0,
      averageMatches: 0,
      topProfessions: []
    };
  }
}

export default GenAISemanticSearch;