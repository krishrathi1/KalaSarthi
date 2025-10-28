/**
 * Profile Enrichment Pipeline
 * Extracts and enriches artisan profile data for better vector embeddings
 */

import { IUser } from '../models/User';

export interface EnrichedProfileData {
  extractedKeywords: string[];
  inferredSkills: string[];
  portfolioAnalysis: {
    dominantStyles: string[];
    colorPalettes: string[];
    techniques: string[];
    materials: string[];
  };
  reviewSentiments: {
    positive: string[];
    constructive: string[];
    overallSentiment: number;
  };
  marketPositioning: {
    priceCategory: 'budget' | 'mid-range' | 'premium' | 'luxury';
    uniqueSellingPoints: string[];
    competitiveAdvantages: string[];
  };
  textualContent: {
    profileText: string;
    skillsText: string;
    portfolioText: string;
    enrichedText: string;
  };
}

export interface EnrichedProfile {
  artisanId: string;
  originalProfile: IUser;
  enrichedData: EnrichedProfileData;
  enrichmentMetadata: {
    lastEnriched: Date;
    enrichmentVersion: string;
    confidenceScore: number;
    processingTime: number;
  };
}

export interface EnrichmentConfig {
  enableKeywordExtraction: boolean;
  enableSkillInference: boolean;
  enablePortfolioAnalysis: boolean;
  enableReviewAnalysis: boolean;
  enableMarketPositioning: boolean;
  batchSize: number;
  updateFrequency: 'realtime' | 'hourly' | 'daily';
}

export class ProfileEnrichmentPipeline {
  private config: EnrichmentConfig;
  private keywordExtractor: KeywordExtractor;
  private skillInferencer: SkillInferencer;
  private portfolioAnalyzer: PortfolioAnalyzer;
  private reviewAnalyzer: ReviewAnalyzer;
  private marketAnalyzer: MarketPositioningAnalyzer;
  
  constructor(config: EnrichmentConfig) {
    this.config = config;
    this.initializeAnalyzers();
  }
  
  private initializeAnalyzers(): void {
    this.keywordExtractor = new KeywordExtractor();
    this.skillInferencer = new SkillInferencer();
    this.portfolioAnalyzer = new PortfolioAnalyzer();
    this.reviewAnalyzer = new ReviewAnalyzer();
    this.marketAnalyzer = new MarketPositioningAnalyzer();
  }
  
  /**
   * Enrich a single artisan profile
   */
  async enrichProfile(artisan: IUser): Promise<EnrichedProfile> {
    const startTime = Date.now();
    
    console.log(`🔄 Enriching profile for: ${artisan.name}`);
    
    try {
      // Extract base textual content
      const textualContent = this.extractTextualContent(artisan);
      
      // Initialize enriched data structure
      const enrichedData: EnrichedProfileData = {
        extractedKeywords: [],
        inferredSkills: [],
        portfolioAnalysis: {
          dominantStyles: [],
          colorPalettes: [],
          techniques: [],
          materials: []
        },
        reviewSentiments: {
          positive: [],
          constructive: [],
          overallSentiment: 0
        },
        marketPositioning: {
          priceCategory: 'mid-range',
          uniqueSellingPoints: [],
          competitiveAdvantages: []
        },
        textualContent
      };
      
      // Run enrichment processes in parallel where possible
      const enrichmentPromises: Promise<void>[] = [];
      
      if (this.config.enableKeywordExtraction) {
        enrichmentPromises.push(
          this.keywordExtractor.extractKeywords(textualContent.profileText)
            .then(keywords => { enrichedData.extractedKeywords = keywords; })
        );
      }
      
      if (this.config.enableSkillInference) {
        enrichmentPromises.push(
          this.skillInferencer.inferSkills(artisan, textualContent)
            .then(skills => { enrichedData.inferredSkills = skills; })
        );
      }
      
      if (this.config.enablePortfolioAnalysis) {
        enrichmentPromises.push(
          this.portfolioAnalyzer.analyzePortfolio(artisan)
            .then(analysis => { enrichedData.portfolioAnalysis = analysis; })
        );
      }
      
      if (this.config.enableReviewAnalysis) {
        enrichmentPromises.push(
          this.reviewAnalyzer.analyzeReviews(artisan)
            .then(sentiments => { enrichedData.reviewSentiments = sentiments; })
        );
      }
      
      if (this.config.enableMarketPositioning) {
        enrichmentPromises.push(
          this.marketAnalyzer.analyzeMarketPositioning(artisan)
            .then(positioning => { enrichedData.marketPositioning = positioning; })
        );
      }
      
      // Wait for all enrichment processes to complete
      await Promise.all(enrichmentPromises);
      
      // Create enriched text combining all extracted information
      enrichedData.textualContent.enrichedText = this.createEnrichedText(enrichedData, textualContent);
      
      const processingTime = Date.now() - startTime;
      const confidenceScore = this.calculateEnrichmentConfidence(enrichedData);
      
      const enrichedProfile: EnrichedProfile = {
        artisanId: artisan.uid,
        originalProfile: artisan,
        enrichedData,
        enrichmentMetadata: {
          lastEnriched: new Date(),
          enrichmentVersion: '1.0',
          confidenceScore,
          processingTime
        }
      };
      
      console.log(`✅ Enriched profile for ${artisan.name} in ${processingTime}ms (confidence: ${(confidenceScore * 100).toFixed(1)}%)`);
      
      return enrichedProfile;
      
    } catch (error) {
      console.error(`❌ Failed to enrich profile for ${artisan.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Enrich multiple profiles in batch
   */
  async enrichProfiles(artisans: IUser[]): Promise<EnrichedProfile[]> {
    const results: EnrichedProfile[] = [];
    const batchSize = this.config.batchSize;
    
    console.log(`🔄 Enriching ${artisans.length} profiles in batches of ${batchSize}`);
    
    for (let i = 0; i < artisans.length; i += batchSize) {
      const batch = artisans.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(artisans.length / batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(artisan => this.enrichProfile(artisan))
      );
      
      results.push(...batchResults);
      
      // Add delay between batches to avoid overwhelming services
      if (i + batchSize < artisans.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`✅ Enriched ${results.length} profiles successfully`);
    return results;
  }
  
  /**
   * Extract base textual content from artisan profile
   */
  private extractTextualContent(artisan: IUser): EnrichedProfileData['textualContent'] {
    const profile = artisan.artisanConnectProfile;
    const matchingData = profile?.matchingData;
    
    // Profile text (general information)
    const profileParts = [
      artisan.name,
      artisan.artisticProfession,
      artisan.description,
      profile?.specializations?.join(' '),
      profile?.culturalCertifications?.map(cert => cert.name).join(' '),
      profile?.portfolioHighlights?.join(' ')
    ].filter(Boolean);
    
    // Skills text (technical capabilities)
    const skillsParts = [
      matchingData?.skills?.join(' '),
      matchingData?.techniques?.join(' '),
      matchingData?.materials?.join(' '),
      matchingData?.categoryTags?.join(' '),
      matchingData?.experienceLevel,
      profile?.skillTags?.map(tag => `${tag.skill} proficiency ${tag.proficiency}`).join(' ')
    ].filter(Boolean);
    
    // Portfolio text (work examples and pricing)
    const portfolioParts = [
      matchingData?.portfolioKeywords?.join(' '),
      profile?.portfolioHighlights?.join(' '),
      matchingData?.averageProjectSize ? `price range ${matchingData.averageProjectSize.min} to ${matchingData.averageProjectSize.max}` : '',
      matchingData?.typicalTimeline ? `timeline ${matchingData.typicalTimeline}` : '',
      `experience level ${matchingData?.experienceLevel || 'intermediate'}`
    ].filter(Boolean);
    
    return {
      profileText: profileParts.join(' ').toLowerCase().trim(),
      skillsText: skillsParts.join(' ').toLowerCase().trim(),
      portfolioText: portfolioParts.join(' ').toLowerCase().trim(),
      enrichedText: '' // Will be populated later
    };
  }
  
  /**
   * Create enriched text combining all extracted information
   */
  private createEnrichedText(
    enrichedData: EnrichedProfileData,
    textualContent: EnrichedProfileData['textualContent']
  ): string {
    const parts = [
      textualContent.profileText,
      textualContent.skillsText,
      textualContent.portfolioText,
      enrichedData.extractedKeywords.join(' '),
      enrichedData.inferredSkills.join(' '),
      enrichedData.portfolioAnalysis.dominantStyles.join(' '),
      enrichedData.portfolioAnalysis.techniques.join(' '),
      enrichedData.portfolioAnalysis.materials.join(' '),
      enrichedData.reviewSentiments.positive.join(' '),
      enrichedData.marketPositioning.uniqueSellingPoints.join(' '),
      enrichedData.marketPositioning.competitiveAdvantages.join(' ')
    ].filter(Boolean);
    
    return parts.join(' ').toLowerCase().trim();
  }
  
  /**
   * Calculate confidence score for enrichment quality
   */
  private calculateEnrichmentConfidence(enrichedData: EnrichedProfileData): number {
    let confidence = 0;
    let factors = 0;
    
    // Base content quality
    if (enrichedData.textualContent.profileText.length > 50) {
      confidence += 0.2;
      factors++;
    }
    
    // Keyword extraction quality
    if (enrichedData.extractedKeywords.length > 3) {
      confidence += 0.15;
      factors++;
    }
    
    // Skill inference quality
    if (enrichedData.inferredSkills.length > 2) {
      confidence += 0.15;
      factors++;
    }
    
    // Portfolio analysis quality
    if (enrichedData.portfolioAnalysis.techniques.length > 1) {
      confidence += 0.15;
      factors++;
    }
    
    // Review sentiment quality
    if (enrichedData.reviewSentiments.positive.length > 0) {
      confidence += 0.1;
      factors++;
    }
    
    // Market positioning quality
    if (enrichedData.marketPositioning.uniqueSellingPoints.length > 1) {
      confidence += 0.1;
      factors++;
    }
    
    // Enriched text quality
    if (enrichedData.textualContent.enrichedText.length > 100) {
      confidence += 0.15;
      factors++;
    }
    
    return factors > 0 ? Math.min(1, confidence / factors) : 0.5;
  }
}

/**
 * Keyword Extractor
 * Extracts meaningful keywords from profile text
 */
class KeywordExtractor {
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'am', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);
  
  async extractKeywords(text: string): Promise<string[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }
    
    // Simple keyword extraction using frequency analysis
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word));
    
    // Count word frequencies
    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    
    // Sort by frequency and return top keywords
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
}

/**
 * Skill Inferencer
 * Infers additional skills based on profile content and existing skills
 */
class SkillInferencer {
  private skillMappings = new Map([
    ['pottery', ['ceramics', 'clay work', 'glazing', 'kiln firing', 'wheel throwing']],
    ['woodworking', ['carpentry', 'furniture making', 'wood carving', 'joinery', 'finishing']],
    ['jewelry', ['metalworking', 'gem setting', 'soldering', 'polishing', 'design']],
    ['textiles', ['weaving', 'embroidery', 'dyeing', 'pattern making', 'fabric work']],
    ['leather', ['tanning', 'stitching', 'tooling', 'finishing', 'pattern cutting']],
    ['painting', ['color mixing', 'brushwork', 'composition', 'canvas preparation', 'varnishing']],
    ['sculpture', ['modeling', 'carving', 'casting', 'finishing', 'armature building']]
  ]);
  
  async inferSkills(artisan: IUser, textualContent: EnrichedProfileData['textualContent']): Promise<string[]> {
    const existingSkills = artisan.artisanConnectProfile?.matchingData?.skills || [];
    const inferredSkills: string[] = [];
    
    // Analyze profession and existing skills
    const profession = artisan.artisticProfession?.toLowerCase() || '';
    const allText = `${profession} ${textualContent.profileText} ${textualContent.skillsText}`;
    
    // Infer skills based on profession and content
    for (const [category, skills] of this.skillMappings) {
      if (allText.includes(category)) {
        for (const skill of skills) {
          if (!existingSkills.includes(skill) && !inferredSkills.includes(skill)) {
            // Check if skill is mentioned in text or related to existing skills
            if (allText.includes(skill) || this.isRelatedSkill(skill, existingSkills)) {
              inferredSkills.push(skill);
            }
          }
        }
      }
    }
    
    // Infer skills from materials and techniques
    const materials = artisan.artisanConnectProfile?.matchingData?.materials || [];
    const techniques = artisan.artisanConnectProfile?.matchingData?.techniques || [];
    
    materials.forEach(material => {
      const relatedSkills = this.getSkillsForMaterial(material);
      relatedSkills.forEach(skill => {
        if (!existingSkills.includes(skill) && !inferredSkills.includes(skill)) {
          inferredSkills.push(skill);
        }
      });
    });
    
    techniques.forEach(technique => {
      const relatedSkills = this.getSkillsForTechnique(technique);
      relatedSkills.forEach(skill => {
        if (!existingSkills.includes(skill) && !inferredSkills.includes(skill)) {
          inferredSkills.push(skill);
        }
      });
    });
    
    return inferredSkills.slice(0, 8); // Limit to 8 inferred skills
  }
  
  private isRelatedSkill(skill: string, existingSkills: string[]): boolean {
    // Simple relatedness check based on common words
    const skillWords = skill.split(' ');
    return existingSkills.some(existing => 
      skillWords.some(word => existing.toLowerCase().includes(word))
    );
  }
  
  private getSkillsForMaterial(material: string): string[] {
    const materialSkills: Record<string, string[]> = {
      'clay': ['pottery', 'ceramics', 'glazing'],
      'wood': ['woodworking', 'carving', 'finishing'],
      'metal': ['metalworking', 'forging', 'soldering'],
      'fabric': ['sewing', 'embroidery', 'dyeing'],
      'leather': ['leather working', 'tooling', 'stitching'],
      'glass': ['glassblowing', 'fusing', 'cutting'],
      'stone': ['stone carving', 'polishing', 'setting']
    };
    
    const materialLower = material.toLowerCase();
    for (const [key, skills] of Object.entries(materialSkills)) {
      if (materialLower.includes(key)) {
        return skills;
      }
    }
    
    return [];
  }
  
  private getSkillsForTechnique(technique: string): string[] {
    const techniqueSkills: Record<string, string[]> = {
      'hand': ['handcrafting', 'manual dexterity', 'precision work'],
      'carving': ['tool handling', 'detail work', 'finishing'],
      'weaving': ['pattern making', 'color coordination', 'texture work'],
      'painting': ['color theory', 'brushwork', 'composition'],
      'molding': ['shaping', 'form creation', 'detail work'],
      'assembly': ['joining', 'fitting', 'construction']
    };
    
    const techniqueLower = technique.toLowerCase();
    for (const [key, skills] of Object.entries(techniqueSkills)) {
      if (techniqueLower.includes(key)) {
        return skills;
      }
    }
    
    return [];
  }
}

/**
 * Portfolio Analyzer
 * Analyzes portfolio content for styles, techniques, and materials
 */
class PortfolioAnalyzer {
  async analyzePortfolio(artisan: IUser): Promise<EnrichedProfileData['portfolioAnalysis']> {
    const profile = artisan.artisanConnectProfile;
    const matchingData = profile?.matchingData;
    
    // For now, return analysis based on existing data
    // In the future, this could analyze actual portfolio images
    
    return {
      dominantStyles: this.inferStyles(artisan),
      colorPalettes: this.inferColorPalettes(artisan),
      techniques: matchingData?.techniques || [],
      materials: matchingData?.materials || []
    };
  }
  
  private inferStyles(artisan: IUser): string[] {
    const profession = artisan.artisticProfession?.toLowerCase() || '';
    const description = artisan.description?.toLowerCase() || '';
    const specializations = artisan.artisanConnectProfile?.specializations || [];
    
    const allText = `${profession} ${description} ${specializations.join(' ')}`.toLowerCase();
    
    const styleKeywords = {
      'traditional': ['traditional', 'heritage', 'classic', 'authentic', 'cultural'],
      'contemporary': ['modern', 'contemporary', 'current', 'trendy', 'stylish'],
      'rustic': ['rustic', 'rural', 'country', 'natural', 'earthy'],
      'minimalist': ['minimal', 'simple', 'clean', 'elegant', 'refined'],
      'ornate': ['ornate', 'decorative', 'elaborate', 'detailed', 'intricate'],
      'artistic': ['artistic', 'creative', 'expressive', 'unique', 'original']
    };
    
    const detectedStyles: string[] = [];
    
    for (const [style, keywords] of Object.entries(styleKeywords)) {
      if (keywords.some(keyword => allText.includes(keyword))) {
        detectedStyles.push(style);
      }
    }
    
    return detectedStyles.length > 0 ? detectedStyles : ['traditional'];
  }
  
  private inferColorPalettes(artisan: IUser): string[] {
    const description = artisan.description?.toLowerCase() || '';
    const materials = artisan.artisanConnectProfile?.matchingData?.materials || [];
    
    const allText = `${description} ${materials.join(' ')}`.toLowerCase();
    
    const colorMappings = {
      'earth_tones': ['brown', 'beige', 'tan', 'clay', 'wood', 'natural'],
      'vibrant': ['bright', 'colorful', 'vivid', 'bold', 'rainbow'],
      'monochrome': ['black', 'white', 'gray', 'silver', 'neutral'],
      'warm': ['red', 'orange', 'yellow', 'gold', 'warm'],
      'cool': ['blue', 'green', 'purple', 'cool', 'teal'],
      'metallic': ['gold', 'silver', 'copper', 'bronze', 'metallic']
    };
    
    const detectedPalettes: string[] = [];
    
    for (const [palette, keywords] of Object.entries(colorMappings)) {
      if (keywords.some(keyword => allText.includes(keyword))) {
        detectedPalettes.push(palette);
      }
    }
    
    return detectedPalettes.length > 0 ? detectedPalettes : ['earth_tones'];
  }
}

/**
 * Review Analyzer
 * Analyzes customer reviews and feedback (placeholder implementation)
 */
class ReviewAnalyzer {
  async analyzeReviews(artisan: IUser): Promise<EnrichedProfileData['reviewSentiments']> {
    // Placeholder implementation - in the future, this would analyze actual reviews
    const rating = artisan.artisanConnectProfile?.performanceMetrics?.customerSatisfaction || 4.0;
    
    return {
      positive: rating > 4.0 ? ['excellent craftsmanship', 'timely delivery', 'beautiful work'] : ['good quality'],
      constructive: rating < 4.0 ? ['could improve communication'] : [],
      overallSentiment: Math.min(1, rating / 5)
    };
  }
}

/**
 * Market Positioning Analyzer
 * Analyzes market positioning based on pricing and offerings
 */
class MarketPositioningAnalyzer {
  async analyzeMarketPositioning(artisan: IUser): Promise<EnrichedProfileData['marketPositioning']> {
    const priceRange = artisan.artisanConnectProfile?.matchingData?.averageProjectSize;
    const acceptsCustom = artisan.artisanConnectProfile?.acceptsCustomOrders;
    const responseTime = artisan.artisanConnectProfile?.performanceMetrics?.responseTime || 24;
    const rating = artisan.artisanConnectProfile?.performanceMetrics?.customerSatisfaction || 4.0;
    
    // Determine price category
    let priceCategory: 'budget' | 'mid-range' | 'premium' | 'luxury' = 'mid-range';
    
    if (priceRange) {
      const avgPrice = (priceRange.min + priceRange.max) / 2;
      if (avgPrice < 2000) priceCategory = 'budget';
      else if (avgPrice < 10000) priceCategory = 'mid-range';
      else if (avgPrice < 50000) priceCategory = 'premium';
      else priceCategory = 'luxury';
    }
    
    // Determine unique selling points
    const uniqueSellingPoints: string[] = [];
    if (acceptsCustom) uniqueSellingPoints.push('custom designs');
    if (responseTime < 12) uniqueSellingPoints.push('quick response');
    if (rating > 4.5) uniqueSellingPoints.push('excellent reviews');
    
    // Add default USPs if none found
    if (uniqueSellingPoints.length === 0) {
      uniqueSellingPoints.push('handcrafted', 'quality materials');
    }
    
    // Determine competitive advantages
    const competitiveAdvantages: string[] = [];
    if (responseTime < 6) competitiveAdvantages.push('same day response');
    if (priceCategory === 'budget') competitiveAdvantages.push('affordable pricing');
    if (priceCategory === 'premium' || priceCategory === 'luxury') competitiveAdvantages.push('premium quality');
    
    return {
      priceCategory,
      uniqueSellingPoints,
      competitiveAdvantages
    };
  }
}

export default ProfileEnrichmentPipeline;