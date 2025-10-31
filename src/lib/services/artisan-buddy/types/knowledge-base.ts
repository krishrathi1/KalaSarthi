/**
 * Knowledge Base Types and Interfaces
 * Defines data structures for arts and crafts knowledge
 */

export interface KnowledgeDocument {
  id: string;
  content: string;
  embedding?: number[];
  metadata: KnowledgeMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeMetadata {
  category: KnowledgeCategory;
  craftType?: string;
  language: string;
  source: string;
  region?: string;
  tags?: string[];
  lastUpdated: Date;
}

export type KnowledgeCategory = 
  | 'craft_info'
  | 'technique'
  | 'material'
  | 'market_insights'
  | 'tutorial'
  | 'history'
  | 'pricing';

export interface CraftInfo {
  name: string;
  description: string;
  history: string;
  regions: string[];
  materials: Material[];
  techniques: string[];
  products: string[];
  marketDemand: number;
  category: string;
  images?: string[];
}

export interface Material {
  name: string;
  description: string;
  sources: string[];
  averageCost: PriceRange;
  quality: 'low' | 'medium' | 'high' | 'premium';
  sustainability: number;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
  unit: string;
}

export interface TechniqueInfo {
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  steps: Step[];
  tools: string[];
  materials: string[];
  tips: string[];
  commonMistakes: string[];
  estimatedTime: string;
  craftTypes: string[];
}

export interface Step {
  order: number;
  title: string;
  description: string;
  duration?: string;
  images?: string[];
  tips?: string[];
}

export interface MarketInsights {
  craftType: string;
  demand: number;
  averagePrice: PriceRange;
  topBuyerRegions: string[];
  seasonalTrends: SeasonalTrend[];
  competitorAnalysis: CompetitorInfo[];
  growthRate: number;
  lastUpdated: Date;
}

export interface SeasonalTrend {
  season: string;
  demandMultiplier: number;
  popularProducts: string[];
  priceAdjustment: number;
}

export interface CompetitorInfo {
  region: string;
  averagePrice: number;
  qualityLevel: string;
  marketShare: number;
}

export interface SearchFilters {
  category?: KnowledgeCategory;
  craftType?: string;
  language?: string;
  region?: string;
  tags?: string[];
  minRelevance?: number;
}

export interface KnowledgeResult {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  relevance: number;
  sources: string[];
  metadata: KnowledgeMetadata;
}
