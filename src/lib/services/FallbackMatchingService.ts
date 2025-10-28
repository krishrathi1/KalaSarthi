/**
 * Fallback Matching Service
 * 
 * This service provides enhanced keyword-based matching as fallback when AI services
 * are unavailable, with graceful degradation and automatic failover mechanisms.
 */

import { IUser } from '../models/User';
import { EnhancedQueryAnalysis, MatchResult, EnhancedArtisanMatch, MatchExplanation } from './IntelligentProfessionMatcher';
import { ProfessionMappingService } from './ProfessionMappingService';

export interface FallbackMatchingOptions {
  maxResults?: number;
  minScore?: number;
  enableFuzzyMatching?: boolean;
  enableSynonymMatching?: boolean;
  boostExactMatches?: boolean;
  location?: string;
}

export interface FallbackAnalysis {
  detectedKeywords: string[];
  possibleProfessions: string[];
  extractedMaterials: string[];
  extractedTechniques: string[];
  confidence: number;
  method: 'keyword' | 'fuzzy' | 'synonym' | 'hybrid';
}

export interface KeywordMatchResult {
  keyword: string;
  field: 'profession' | 'skill' | 'material' | 'technique' | 'specialization' | 'description';
  score: number;
  matchType: 'exact' | 'partial' | 'fuzzy' | 'synonym';
}

export class FallbackMatchingService {
  private static instance: FallbackMatchingService;
  private mappingService: ProfessionMappingService;
  
  // Keyword dictionaries for fallback matching
  private professionSynonyms: Record<string, string[]> = {
    'pottery': ['ceramic', 'clay work', 'ceramics', 'potter', 'clay artist'],
    'woodworking': ['carpentry', 'furniture making', 'wood craft', 'carpenter', 'woodworker'],
    'jewelry': ['jewellery', 'jewelry making', 'goldsmith', 'silversmith', 'jeweler'],
    'textiles': ['weaving', 'fabric work', 'textile art', 'weaver', 'fabric artist'],
    'leather work': ['leather craft', 'leather goods', 'leather artist', 'leatherworker'],
    'metalwork': ['blacksmithing', 'metal craft', 'blacksmith', 'metalworker', 'ironwork'],
    'painting': ['fine art', 'artwork', 'painter', 'artist', 'canvas art'],
    'embroidery': ['needlework', 'thread work', 'stitching', 'embroiderer']
  };

  private materialSynonyms: Record<string, string[]> = {
    'wood': ['timber', 'lumber', 'wooden', 'teak', 'oak', 'pine', 'mahogany'],
    'metal': ['iron', 'steel', 'brass', 'bronze', 'aluminum', 'copper'],
    'clay': ['ceramic', 'terracotta', 'porcelain', 'earthenware'],
    'fabric': ['textile', 'cloth', 'cotton', 'silk', 'wool', 'linen'],
    'leather': ['hide', 'suede', 'skin'],
    'stone': ['marble', 'granite', 'limestone', 'sandstone'],
    'glass': ['crystal', 'stained glass', 'blown glass'],
    'precious metals': ['gold', 'silver', 'platinum']
  };

  private techniqueSynonyms: Record<string, string[]> = {
    'carving': ['carved', 'sculpting', 'engraving', 'etching'],
    'weaving': ['woven', 'handwoven', 'loom work'],
    'forging': ['forged', 'hammered', 'smithing'],
    'casting': ['cast', 'molded', 'poured'],
    'painting': ['painted', 'brushwork', 'artwork'],
    'stitching': ['sewn', 'embroidered', 'needlework']
  };

  private commonProducts: Record<string, string[]> = {
    'furniture': ['table', 'chair', 'cabinet', 'desk', 'shelf', 'bed'],
    'jewelry': ['ring', 'necklace', 'earring', 'bracelet', 'pendant'],
    'pottery': ['pot', 'vase', 'bowl', 'plate', 'cup', 'mug'],
    'textiles': ['saree', 'fabric', 'carpet', 'rug', 'clothing'],
    'leather goods': ['bag', 'wallet', 'belt', 'shoe', 'purse'],
    'metalwork': ['gate', 'railing', 'sculpture', 'utensil', 'tool'],
    'art': ['painting', 'portrait', 'mural', 'illustration', 'canvas']
  };

  private constructor() {
    this.mappingService = ProfessionMappingService.getInstance();
  }

  public static getInstance(): FallbackMatchingService {
    if (!FallbackMatchingService.instance) {
      FallbackMatchingService.instance = new FallbackMatchingService();
    }
    return FallbackMatchingService.instance;
  }

  /**
   * Perform fallback matching when AI services are unavailable
   */
  public async performFallbackMatching(
    query: string,
    artisans: IUser[],
    options: FallbackMatchingOptions = {}
  ): Promise<MatchResult> {
    const startTime = Date.now();
    
    try {
      // Analyze query using keyword-based methods
      const analysis = this.analyzeFallbackQuery(query);
      
      // Score and rank artisans
      const scoredMatches = this.scoreArtisansForFallback(artisans, analysis, options);
      
      // Filter and sort results
      const filteredMatches = this.filterAndSortFallbackResults(scoredMatches, options);
      
      // Create fallback query analysis
      const fallbackQueryAnalysis = this.createFallbackQueryAnalysis(query, analysis);
      
      const processingTime = Date.now() - startTime;

      return {
        matches: filteredMatches,
        totalFound: filteredMatches.length,
        queryAnalysis: fallbackQueryAnalysis,
        processingTime,
        confidence: analysis.confidence,
        fallbackUsed: true
      };

    } catch (error) {
      console.error('Error in fallback matching:', error);
      
      // Ultimate fallback - simple text matching
      return this.performSimpleFallback(query, artisans, options, startTime);
    }
  }

  /**
   * Check if AI services are available and decide on fallback
   */
  public async shouldUseFallback(aiServiceHealthy: boolean, forceCheck: boolean = false): Promise<boolean> {
    if (forceCheck) {
      // Could implement additional health checks here
      return !aiServiceHealthy;
    }
    
    return !aiServiceHealthy;
  }

  /**
   * Get fallback matching capabilities and status
   */
  public getFallbackCapabilities(): {
    supportedProfessions: string[];
    supportedMaterials: string[];
    supportedTechniques: string[];
    matchingMethods: string[];
    confidence: number;
  } {
    return {
      supportedProfessions: Object.keys(this.professionSynonyms),
      supportedMaterials: Object.keys(this.materialSynonyms),
      supportedTechniques: Object.keys(this.techniqueSynonyms),
      matchingMethods: ['keyword', 'fuzzy', 'synonym', 'hybrid'],
      confidence: 0.6 // Fallback matching confidence level
    };
  }

  /**
   * Enhance fallback matching with learned patterns
   */
  public learnFromSuccessfulMatches(
    query: string,
    selectedArtisan: IUser,
    userFeedback: 'positive' | 'negative'
  ): void {
    // This could be used to improve fallback matching over time
    // For now, just log the learning opportunity
    console.log(`Learning opportunity: Query "${query}" -> Artisan ${selectedArtisan.uid} (${userFeedback})`);
  }

  // Private helper methods

  private analyzeFallbackQuery(query: string): FallbackAnalysis {
    const queryLower = query.toLowerCase().trim();
    const words = queryLower.split(/\s+/);
    
    const detectedKeywords: string[] = [];
    const possibleProfessions: string[] = [];
    const extractedMaterials: string[] = [];
    const extractedTechniques: string[] = [];
    
    let totalMatches = 0;
    let exactMatches = 0;

    // Detect professions
    for (const [profession, synonyms] of Object.entries(this.professionSynonyms)) {
      if (queryLower.includes(profession)) {
        possibleProfessions.push(profession);
        detectedKeywords.push(profession);
        exactMatches++;
        totalMatches++;
      } else {
        for (const synonym of synonyms) {
          if (queryLower.includes(synonym)) {
            possibleProfessions.push(profession);
            detectedKeywords.push(synonym);
            totalMatches++;
            break;
          }
        }
      }
    }

    // Detect materials
    for (const [material, synonyms] of Object.entries(this.materialSynonyms)) {
      if (queryLower.includes(material)) {
        extractedMaterials.push(material);
        detectedKeywords.push(material);
        exactMatches++;
        totalMatches++;
      } else {
        for (const synonym of synonyms) {
          if (queryLower.includes(synonym)) {
            extractedMaterials.push(material);
            detectedKeywords.push(synonym);
            totalMatches++;
            break;
          }
        }
      }
    }

    // Detect techniques
    for (const [technique, synonyms] of Object.entries(this.techniqueSynonyms)) {
      if (queryLower.includes(technique)) {
        extractedTechniques.push(technique);
        detectedKeywords.push(technique);
        exactMatches++;
        totalMatches++;
      } else {
        for (const synonym of synonyms) {
          if (queryLower.includes(synonym)) {
            extractedTechniques.push(technique);
            detectedKeywords.push(synonym);
            totalMatches++;
            break;
          }
        }
      }
    }

    // Detect products and infer professions
    for (const [category, products] of Object.entries(this.commonProducts)) {
      for (const product of products) {
        if (queryLower.includes(product)) {
          detectedKeywords.push(product);
          
          // Infer profession from product
          const inferredProfession = this.inferProfessionFromProduct(product);
          if (inferredProfession && !possibleProfessions.includes(inferredProfession)) {
            possibleProfessions.push(inferredProfession);
          }
          
          totalMatches++;
        }
      }
    }

    // Calculate confidence based on matches
    let confidence = 0.3; // Base confidence for fallback
    if (totalMatches > 0) {
      confidence = Math.min(0.8, 0.3 + (totalMatches * 0.1) + (exactMatches * 0.1));
    }

    // Determine method used
    let method: FallbackAnalysis['method'] = 'keyword';
    if (exactMatches > 0 && totalMatches > exactMatches) {
      method = 'hybrid';
    } else if (totalMatches > exactMatches) {
      method = 'synonym';
    }

    return {
      detectedKeywords: [...new Set(detectedKeywords)],
      possibleProfessions: [...new Set(possibleProfessions)],
      extractedMaterials: [...new Set(extractedMaterials)],
      extractedTechniques: [...new Set(extractedTechniques)],
      confidence,
      method
    };
  }

  private scoreArtisansForFallback(
    artisans: IUser[],
    analysis: FallbackAnalysis,
    options: FallbackMatchingOptions
  ): Array<{
    artisan: IUser;
    score: number;
    matches: KeywordMatchResult[];
  }> {
    return artisans.map(artisan => {
      const matches: KeywordMatchResult[] = [];
      let totalScore = 0;

      // Score profession matches
      const artisanProfession = artisan.artisticProfession?.toLowerCase() || '';
      for (const profession of analysis.possibleProfessions) {
        if (artisanProfession.includes(profession)) {
          const score = 0.4;
          totalScore += score;
          matches.push({
            keyword: profession,
            field: 'profession',
            score,
            matchType: 'exact'
          });
        } else {
          // Check synonyms
          const synonyms = this.professionSynonyms[profession] || [];
          for (const synonym of synonyms) {
            if (artisanProfession.includes(synonym)) {
              const score = 0.3;
              totalScore += score;
              matches.push({
                keyword: synonym,
                field: 'profession',
                score,
                matchType: 'synonym'
              });
              break;
            }
          }
        }
      }

      // Score material matches
      const artisanMaterials = artisan.artisanConnectProfile?.matchingData?.materials || [];
      for (const material of analysis.extractedMaterials) {
        const materialMatch = artisanMaterials.find(am => 
          am.toLowerCase().includes(material) || material.includes(am.toLowerCase())
        );
        if (materialMatch) {
          const score = 0.2;
          totalScore += score;
          matches.push({
            keyword: material,
            field: 'material',
            score,
            matchType: 'exact'
          });
        }
      }

      // Score technique matches
      const artisanTechniques = artisan.artisanConnectProfile?.matchingData?.techniques || [];
      for (const technique of analysis.extractedTechniques) {
        const techniqueMatch = artisanTechniques.find(at => 
          at.toLowerCase().includes(technique) || technique.includes(at.toLowerCase())
        );
        if (techniqueMatch) {
          const score = 0.2;
          totalScore += score;
          matches.push({
            keyword: technique,
            field: 'technique',
            score,
            matchType: 'exact'
          });
        }
      }

      // Score skill matches
      const artisanSkills = artisan.artisanConnectProfile?.matchingData?.skills || [];
      for (const keyword of analysis.detectedKeywords) {
        const skillMatch = artisanSkills.find(skill => 
          skill.toLowerCase().includes(keyword) || keyword.includes(skill.toLowerCase())
        );
        if (skillMatch) {
          const score = 0.15;
          totalScore += score;
          matches.push({
            keyword: keyword,
            field: 'skill',
            score,
            matchType: 'partial'
          });
        }
      }

      // Score specialization matches
      const specializations = artisan.artisanConnectProfile?.specializations || [];
      for (const keyword of analysis.detectedKeywords) {
        const specMatch = specializations.find(spec => 
          spec.toLowerCase().includes(keyword) || keyword.includes(spec.toLowerCase())
        );
        if (specMatch) {
          const score = 0.1;
          totalScore += score;
          matches.push({
            keyword: keyword,
            field: 'specialization',
            score,
            matchType: 'partial'
          });
        }
      }

      // Score description matches
      const description = artisan.description?.toLowerCase() || '';
      for (const keyword of analysis.detectedKeywords) {
        if (description.includes(keyword)) {
          const score = 0.05;
          totalScore += score;
          matches.push({
            keyword: keyword,
            field: 'description',
            score,
            matchType: 'partial'
          });
        }
      }

      // Boost for exact profession matches
      if (options.boostExactMatches && matches.some(m => m.field === 'profession' && m.matchType === 'exact')) {
        totalScore *= 1.2;
      }

      return {
        artisan,
        score: Math.min(1.0, totalScore),
        matches
      };
    });
  }

  private filterAndSortFallbackResults(
    scoredMatches: Array<{
      artisan: IUser;
      score: number;
      matches: KeywordMatchResult[];
    }>,
    options: FallbackMatchingOptions
  ): EnhancedArtisanMatch[] {
    const minScore = options.minScore || 0.1;
    
    return scoredMatches
      .filter(match => match.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxResults || 20)
      .map((match, index) => ({
        artisan: match.artisan,
        relevanceScore: match.score,
        professionMatch: match.matches.some(m => m.field === 'profession'),
        materialMatch: match.matches.some(m => m.field === 'material'),
        techniqueMatch: match.matches.some(m => m.field === 'technique'),
        specializationMatch: match.matches.some(m => m.field === 'specialization'),
        locationMatch: true, // Default to true for fallback
        explanation: this.createFallbackExplanation(match.matches, match.score),
        rank: index + 1
      }));
  }

  private createFallbackExplanation(
    matches: KeywordMatchResult[],
    score: number
  ): MatchExplanation {
    const reasons: string[] = [];
    const matchedSkills: string[] = [];
    const matchedMaterials: string[] = [];
    const matchedTechniques: string[] = [];

    // Group matches by field
    const professionMatches = matches.filter(m => m.field === 'profession');
    const materialMatches = matches.filter(m => m.field === 'material');
    const techniqueMatches = matches.filter(m => m.field === 'technique');
    const skillMatches = matches.filter(m => m.field === 'skill');

    if (professionMatches.length > 0) {
      reasons.push(`Profession matches: ${professionMatches.map(m => m.keyword).join(', ')}`);
    }

    if (materialMatches.length > 0) {
      matchedMaterials.push(...materialMatches.map(m => m.keyword));
      reasons.push(`Material expertise: ${materialMatches.map(m => m.keyword).join(', ')}`);
    }

    if (techniqueMatches.length > 0) {
      matchedTechniques.push(...techniqueMatches.map(m => m.keyword));
      reasons.push(`Technique skills: ${techniqueMatches.map(m => m.keyword).join(', ')}`);
    }

    if (skillMatches.length > 0) {
      matchedSkills.push(...skillMatches.map(m => m.keyword));
      reasons.push(`Relevant skills: ${skillMatches.map(m => m.keyword).join(', ')}`);
    }

    let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
    if (score > 0.6) confidenceLevel = 'medium';
    if (score > 0.8) confidenceLevel = 'high';

    return {
      primaryReason: reasons[0] || 'Basic keyword matching (fallback mode)',
      detailedReasons: reasons.slice(0, 5),
      matchedSkills: [...new Set(matchedSkills)],
      matchedMaterials: [...new Set(matchedMaterials)],
      matchedTechniques: [...new Set(matchedTechniques)],
      confidenceLevel,
      scoreBreakdown: {
        professionScore: professionMatches.reduce((sum, m) => sum + m.score, 0),
        skillScore: skillMatches.reduce((sum, m) => sum + m.score, 0),
        materialScore: materialMatches.reduce((sum, m) => sum + m.score, 0),
        techniqueScore: techniqueMatches.reduce((sum, m) => sum + m.score, 0),
        experienceScore: 0,
        locationScore: 0,
        performanceScore: 0
      }
    };
  }

  private createFallbackQueryAnalysis(query: string, analysis: FallbackAnalysis): EnhancedQueryAnalysis {
    return {
      originalQuery: query,
      processedQuery: query.toLowerCase().trim(),
      detectedIntent: {
        action: 'browse',
        urgency: 'exploring',
        budget: 'unspecified'
      },
      extractedRequirements: {
        products: [],
        materials: analysis.extractedMaterials,
        techniques: analysis.extractedTechniques,
        styles: [],
        endUse: '',
        specifications: {}
      },
      contextualFactors: {
        endUse: '',
        setting: '',
        occasion: '',
        targetAudience: ''
      },
      professionMapping: {
        professions: analysis.possibleProfessions.map(p => ({
          name: p,
          confidence: analysis.confidence,
          matchingFactors: [`Keyword: ${p}`]
        })),
        fallbackProfessions: [],
        reasoning: `Fallback matching using ${analysis.method} method with ${analysis.confidence.toFixed(2)} confidence`
      },
      confidence: analysis.confidence,
      timestamp: new Date(),
      processingTime: 0
    };
  }

  private performSimpleFallback(
    query: string,
    artisans: IUser[],
    options: FallbackMatchingOptions,
    startTime: number
  ): MatchResult {
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter(word => word.length > 2);

    const matches = artisans
      .map(artisan => {
        let score = 0;
        const explanation: MatchExplanation = {
          primaryReason: 'Simple text matching (emergency fallback)',
          detailedReasons: [],
          matchedSkills: [],
          matchedMaterials: [],
          matchedTechniques: [],
          confidenceLevel: 'low',
          scoreBreakdown: {
            professionScore: 0,
            skillScore: 0,
            materialScore: 0,
            techniqueScore: 0,
            experienceScore: 0,
            locationScore: 0,
            performanceScore: 0
          }
        };

        keywords.forEach(keyword => {
          if (artisan.artisticProfession?.toLowerCase().includes(keyword)) {
            score += 0.3;
            explanation.detailedReasons.push(`Profession contains "${keyword}"`);
          }
          if (artisan.name.toLowerCase().includes(keyword)) {
            score += 0.1;
            explanation.detailedReasons.push(`Name contains "${keyword}"`);
          }
          if (artisan.description?.toLowerCase().includes(keyword)) {
            score += 0.1;
            explanation.detailedReasons.push(`Description contains "${keyword}"`);
          }
        });

        return {
          artisan,
          relevanceScore: Math.min(1, score),
          professionMatch: score > 0.2,
          materialMatch: false,
          techniqueMatch: false,
          specializationMatch: false,
          locationMatch: true,
          explanation,
          rank: 0
        };
      })
      .filter(match => match.relevanceScore >= (options.minScore || 0.05))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.maxResults || 10)
      .map((match, index) => ({ ...match, rank: index + 1 }));

    const processingTime = Date.now() - startTime;

    return {
      matches,
      totalFound: matches.length,
      queryAnalysis: {
        originalQuery: query,
        processedQuery: queryLower,
        detectedIntent: { action: 'browse', urgency: 'exploring', budget: 'unspecified' },
        extractedRequirements: {
          products: [], materials: [], techniques: [], styles: [], endUse: '', specifications: {}
        },
        contextualFactors: { endUse: '', setting: '', occasion: '', targetAudience: '' },
        professionMapping: { professions: [], fallbackProfessions: [], reasoning: 'Emergency fallback' },
        confidence: 0.1,
        timestamp: new Date(),
        processingTime: 0
      },
      processingTime,
      confidence: 0.1,
      fallbackUsed: true
    };
  }

  private inferProfessionFromProduct(product: string): string | null {
    const productToProfession: Record<string, string> = {
      'table': 'woodworking', 'chair': 'woodworking', 'furniture': 'woodworking',
      'ring': 'jewelry', 'necklace': 'jewelry', 'earring': 'jewelry',
      'pot': 'pottery', 'vase': 'pottery', 'bowl': 'pottery',
      'saree': 'textiles', 'fabric': 'textiles', 'carpet': 'textiles',
      'bag': 'leather work', 'wallet': 'leather work', 'belt': 'leather work',
      'gate': 'metalwork', 'railing': 'metalwork', 'sculpture': 'metalwork',
      'painting': 'painting', 'portrait': 'painting', 'mural': 'painting'
    };

    return productToProfession[product] || null;
  }
}