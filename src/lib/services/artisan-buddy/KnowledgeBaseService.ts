/**
 * Knowledge Base Service
 * Provides access to curated arts and crafts knowledge
 */

import { VectorStore } from './VectorStore';
import {
  CraftInfo,
  TechniqueInfo,
  MarketInsights,
  KnowledgeResult,
  SearchFilters,
  Material,
  PriceRange
} from './types/knowledge-base';

export class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;
  private vectorStore: VectorStore;

  private constructor() {
    this.vectorStore = VectorStore.getInstance();
  }

  static getInstance(): KnowledgeBaseService {
    if (!KnowledgeBaseService.instance) {
      KnowledgeBaseService.instance = new KnowledgeBaseService();
    }
    return KnowledgeBaseService.instance;
  }

  /**
   * Search knowledge base with semantic understanding
   */
  async search(query: string, filters?: SearchFilters): Promise<KnowledgeResult[]> {
    try {
      return await this.vectorStore.semanticSearch(query, filters, 10);
    } catch (error) {
      console.error('❌ Knowledge base search failed:', error);
      throw error;
    }
  }

  /**
   * Get detailed craft information
   */
  async getCraftInfo(craftType: string): Promise<CraftInfo | null> {
    try {
      const results = await this.vectorStore.semanticSearch(
        `${craftType} craft information history techniques materials`,
        { category: 'craft_info', craftType },
        1
      );

      if (results.length === 0) {
        return null;
      }

      // Parse the content to extract craft info
      const content = results[0].content;
      return this.parseCraftInfo(content, craftType);
    } catch (error) {
      console.error('❌ Failed to get craft info:', error);
      throw error;
    }
  }

  /**
   * Get technique details
   */
  async getTechniqueInfo(technique: string): Promise<TechniqueInfo | null> {
    try {
      const results = await this.vectorStore.semanticSearch(
        `${technique} technique steps tools materials instructions`,
        { category: 'technique' },
        1
      );

      if (results.length === 0) {
        return null;
      }

      return this.parseTechniqueInfo(results[0].content, technique);
    } catch (error) {
      console.error('❌ Failed to get technique info:', error);
      throw error;
    }
  }

  /**
   * Get market insights for a craft type
   */
  async getMarketInsights(craftType: string): Promise<MarketInsights | null> {
    try {
      const results = await this.vectorStore.semanticSearch(
        `${craftType} market demand pricing trends buyer regions`,
        { category: 'market_insights', craftType },
        1
      );

      if (results.length === 0) {
        return null;
      }

      return this.parseMarketInsights(results[0].content, craftType);
    } catch (error) {
      console.error('❌ Failed to get market insights:', error);
      throw error;
    }
  }

  /**
   * Get material information
   */
  async getMaterialInfo(materialName: string): Promise<Material | null> {
    try {
      const results = await this.vectorStore.semanticSearch(
        `${materialName} material sources cost quality sustainability`,
        { category: 'material' },
        1
      );

      if (results.length === 0) {
        return null;
      }

      return this.parseMaterialInfo(results[0].content, materialName);
    } catch (error) {
      console.error('❌ Failed to get material info:', error);
      throw error;
    }
  }

  /**
   * Get craft recommendations based on artisan profile
   */
  async getCraftRecommendations(
    currentCraft: string,
    skills: string[],
    region: string
  ): Promise<KnowledgeResult[]> {
    try {
      const query = `Similar crafts to ${currentCraft} using skills ${skills.join(', ')} in ${region}`;
      return await this.vectorStore.semanticSearch(query, { category: 'craft_info' }, 5);
    } catch (error) {
      console.error('❌ Failed to get recommendations:', error);
      throw error;
    }
  }

  /**
   * Get pricing guidance
   */
  async getPricingGuidance(craftType: string, productType: string): Promise<PriceRange | null> {
    try {
      const results = await this.vectorStore.semanticSearch(
        `${craftType} ${productType} pricing average cost market rate`,
        { category: 'pricing', craftType },
        1
      );

      if (results.length === 0) {
        return null;
      }

      return this.parsePricingInfo(results[0].content);
    } catch (error) {
      console.error('❌ Failed to get pricing guidance:', error);
      throw error;
    }
  }

  /**
   * Parse craft information from content
   */
  private parseCraftInfo(content: string, craftType: string): CraftInfo {
    // Basic parsing - in production, this would be more sophisticated
    return {
      name: craftType,
      description: content.substring(0, 500),
      history: this.extractSection(content, 'history') || 'Historical information not available',
      regions: this.extractList(content, 'regions') || [],
      materials: [],
      techniques: this.extractList(content, 'techniques') || [],
      products: this.extractList(content, 'products') || [],
      marketDemand: 0.7,
      category: 'traditional'
    };
  }

  /**
   * Parse technique information from content
   */
  private parseTechniqueInfo(content: string, technique: string): TechniqueInfo {
    return {
      name: technique,
      description: content.substring(0, 300),
      difficulty: 'intermediate',
      steps: this.extractSteps(content),
      tools: this.extractList(content, 'tools') || [],
      materials: this.extractList(content, 'materials') || [],
      tips: this.extractList(content, 'tips') || [],
      commonMistakes: this.extractList(content, 'mistakes') || [],
      estimatedTime: this.extractSection(content, 'time') || 'Varies',
      craftTypes: []
    };
  }

  /**
   * Parse market insights from content
   */
  private parseMarketInsights(content: string, craftType: string): MarketInsights {
    return {
      craftType,
      demand: 0.75,
      averagePrice: this.parsePricingInfo(content) || { min: 0, max: 0, currency: 'INR', unit: 'piece' },
      topBuyerRegions: this.extractList(content, 'regions') || [],
      seasonalTrends: [],
      competitorAnalysis: [],
      growthRate: 0.15,
      lastUpdated: new Date()
    };
  }

  /**
   * Parse material information from content
   */
  private parseMaterialInfo(content: string, materialName: string): Material {
    return {
      name: materialName,
      description: content.substring(0, 200),
      sources: this.extractList(content, 'sources') || [],
      averageCost: this.parsePricingInfo(content) || { min: 0, max: 0, currency: 'INR', unit: 'kg' },
      quality: 'medium',
      sustainability: 0.7
    };
  }

  /**
   * Parse pricing information from content
   */
  private parsePricingInfo(content: string): PriceRange | null {
    // Simple regex to find price ranges
    const priceMatch = content.match(/₹?\s*(\d+)\s*-\s*₹?\s*(\d+)/);
    if (priceMatch) {
      return {
        min: parseInt(priceMatch[1]),
        max: parseInt(priceMatch[2]),
        currency: 'INR',
        unit: 'piece'
      };
    }
    return null;
  }

  /**
   * Extract a section from content
   */
  private extractSection(content: string, sectionName: string): string | null {
    const regex = new RegExp(`${sectionName}[:\\s]+([^\\n]+)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract a list from content
   */
  private extractList(content: string, listName: string): string[] | null {
    const regex = new RegExp(`${listName}[:\\s]+([^\\n]+)`, 'i');
    const match = content.match(regex);
    if (match) {
      return match[1].split(',').map(item => item.trim());
    }
    return null;
  }

  /**
   * Extract steps from content
   */
  private extractSteps(content: string): Array<{ order: number; title: string; description: string }> {
    const steps: Array<{ order: number; title: string; description: string }> = [];
    const stepMatches = content.matchAll(/step\s+(\d+)[:\s]+([^\n]+)/gi);
    
    let order = 1;
    for (const match of stepMatches) {
      steps.push({
        order: order++,
        title: match[2].trim(),
        description: match[2].trim()
      });
    }
    
    return steps.length > 0 ? steps : [{ order: 1, title: 'Follow instructions', description: content.substring(0, 200) }];
  }

  /**
   * Get knowledge base statistics
   */
  async getStatistics() {
    return await this.vectorStore.getStatistics();
  }
}
