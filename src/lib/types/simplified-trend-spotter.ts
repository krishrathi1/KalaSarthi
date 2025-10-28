/**
 * Type definitions for the Simplified Trend Spotter
 * Consolidates all interfaces and types needed for the artisan-friendly trend analysis
 */

// Core product interface for trending items
export interface TrendingProduct {
  id: string;
  title: string;
  price: string | number;
  rating: number;
  reviewCount: number;
  platform: string;
  url: string;
  imageUrl: string;
  category: string;
  trendType: TrendType;
  trendScore: number;
  growthRate?: number;
  trendingReason?: string;
  isRealTime: boolean;
  lastUpdated?: Date;
  keywords?: string[];
}

// Types of trends
export type TrendType = 'hot' | 'rising' | 'seasonal' | 'stable' | 'cooling';

// Market insights for artisans
export interface MarketInsight {
  category: string;
  opportunity: string;
  recommendation: string;
  confidence: number;
  actionItems: string[];
  marketSize?: string;
  competitionLevel?: 'low' | 'medium' | 'high';
  seasonality?: string;
}

// Connectivity and data source status
export interface ConnectivityStatus {
  isOnline: boolean;
  lastUpdated: Date;
  dataSource: DataSource;
  syncStatus?: 'synced' | 'syncing' | 'failed';
}

export type DataSource = 'api' | 'mock' | 'cached';

// Artisan profession categories
export type ProfessionCategory = 
  | 'pottery' 
  | 'ceramics'
  | 'woodworking' 
  | 'jewelry' 
  | 'textiles' 
  | 'metalwork' 
  | 'glasswork' 
  | 'leatherwork'
  | 'painting'
  | 'sculpture'
  | 'weaving'
  | 'embroidery'
  | 'handmade'
  | 'crafts';

// User preferences for trend filtering
export interface UserPreferences {
  profession: ProfessionCategory;
  priceRange?: {
    min: number;
    max: number;
  };
  preferredPlatforms?: string[];
  categories?: string[];
  language?: 'en' | 'hi';
}

// API response structure
export interface TrendingDataResponse {
  success: boolean;
  data: {
    products: TrendingProduct[];
    insights: MarketInsight[];
    metadata: {
      totalCount: number;
      lastUpdated: Date;
      dataSource: DataSource;
      profession: ProfessionCategory;
    };
  };
  error?: string;
}

// Mock data configuration
export interface MockDataConfig {
  profession: ProfessionCategory;
  productCount?: number;
  includeInsights?: boolean;
  includeImages?: boolean;
  priceRange?: {
    min: number;
    max: number;
  };
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Component props interfaces
export interface SimplifiedTrendSpotterProps {
  initialProfession?: ProfessionCategory;
  maxProducts?: number;
  showInsights?: boolean;
  className?: string;
}

export interface TrendCardProps {
  product: TrendingProduct;
  onClick?: (product: TrendingProduct) => void;
  showFullDetails?: boolean;
  className?: string;
}

export interface MarketInsightsProps {
  insights: MarketInsight[];
  profession: ProfessionCategory;
  className?: string;
}

export interface ConnectivityIndicatorProps {
  status: ConnectivityStatus;
  onRefresh?: () => void;
  className?: string;
}

// Error types
export interface TrendSpotterError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Analytics and tracking
export interface TrendEngagement {
  productId: string;
  action: 'view' | 'click' | 'share';
  timestamp: Date;
  metadata?: {
    source: string;
    deviceType: 'mobile' | 'desktop' | 'tablet';
    profession: ProfessionCategory;
  };
}

// Platform-specific data
export interface PlatformData {
  platform: string;
  productCount: number;
  averagePrice: number;
  averageRating: number;
  lastUpdated: Date;
}

// Trend analysis metadata
export interface TrendAnalysis {
  category: string;
  totalProducts: number;
  averageTrendScore: number;
  topKeywords: string[];
  priceDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  platformDistribution: PlatformData[];
  trendTypeDistribution: Record<TrendType, number>;
}

// Voice interface preparation (for future TTS/STT integration)
export interface VoiceCommand {
  command: string;
  action: 'navigate' | 'filter' | 'search' | 'refresh';
  parameters?: Record<string, any>;
}

export interface VoiceResponse {
  text: string;
  shouldSpeak: boolean;
  action?: {
    type: string;
    payload?: any;
  };
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Constants
export const TREND_TYPES: Record<TrendType, { label: string; color: string; icon: string }> = {
  hot: { label: 'Hot', color: 'red', icon: '🔥' },
  rising: { label: 'Rising', color: 'green', icon: '📈' },
  seasonal: { label: 'Seasonal', color: 'orange', icon: '🌟' },
  stable: { label: 'Stable', color: 'blue', icon: '📊' },
  cooling: { label: 'Cooling', color: 'gray', icon: '📉' }
};

export const PROFESSION_CATEGORIES: Record<ProfessionCategory, { label: string; keywords: string[] }> = {
  pottery: { label: 'Pottery', keywords: ['clay', 'ceramic', 'pot', 'bowl', 'vase'] },
  ceramics: { label: 'Ceramics', keywords: ['ceramic', 'porcelain', 'earthenware', 'stoneware'] },
  woodworking: { label: 'Woodworking', keywords: ['wood', 'timber', 'furniture', 'carving'] },
  jewelry: { label: 'Jewelry', keywords: ['jewelry', 'necklace', 'earrings', 'bracelet', 'ring'] },
  textiles: { label: 'Textiles', keywords: ['fabric', 'cloth', 'weaving', 'textile'] },
  metalwork: { label: 'Metalwork', keywords: ['metal', 'brass', 'copper', 'iron', 'steel'] },
  glasswork: { label: 'Glasswork', keywords: ['glass', 'crystal', 'blown glass'] },
  leatherwork: { label: 'Leatherwork', keywords: ['leather', 'hide', 'bag', 'wallet'] },
  painting: { label: 'Painting', keywords: ['paint', 'canvas', 'art', 'painting'] },
  sculpture: { label: 'Sculpture', keywords: ['sculpture', 'carving', 'statue'] },
  weaving: { label: 'Weaving', keywords: ['weave', 'loom', 'textile', 'fabric'] },
  embroidery: { label: 'Embroidery', keywords: ['embroidery', 'stitch', 'thread'] },
  handmade: { label: 'Handmade', keywords: ['handmade', 'craft', 'artisan'] },
  crafts: { label: 'Crafts', keywords: ['craft', 'handcraft', 'artisan', 'handmade'] }
};

export const DEFAULT_PRICE_RANGES: Record<ProfessionCategory, { min: number; max: number }> = {
  pottery: { min: 200, max: 5000 },
  ceramics: { min: 300, max: 8000 },
  woodworking: { min: 500, max: 15000 },
  jewelry: { min: 100, max: 50000 },
  textiles: { min: 150, max: 3000 },
  metalwork: { min: 400, max: 12000 },
  glasswork: { min: 300, max: 10000 },
  leatherwork: { min: 200, max: 6000 },
  painting: { min: 500, max: 25000 },
  sculpture: { min: 1000, max: 30000 },
  weaving: { min: 200, max: 4000 },
  embroidery: { min: 100, max: 2000 },
  handmade: { min: 100, max: 10000 },
  crafts: { min: 100, max: 10000 }
};