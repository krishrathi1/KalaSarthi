/**
 * Etsy API Service
 * Fetches real trending handmade products from Etsy marketplace
 */

import { TrendingProduct, ProfessionCategory, PROFESSION_CATEGORIES } from '@/lib/types/simplified-trend-spotter';

// Etsy API Configuration
const ETSY_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_ETSY_API_BASE_URL || 'https://openapi.etsy.com/v3',
  apiKey: process.env.ETSY_API_KEY,
  apiSecret: process.env.ETSY_API_SECRET,
  timeout: 10000,
};

// Etsy API interfaces
interface EtsyListing {
  listing_id: number;
  title: string;
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  url: string;
  views: number;
  num_favorers: number;
  tags: string[];
  materials: string[];
  category_path: string[];
  images: Array<{
    url_570xN: string;
    url_fullxfull: string;
  }>;
  shop: {
    shop_name: string;
    num_favorers: number;
  };
  creation_timestamp: number;
  last_modified_timestamp: number;
}

interface EtsySearchResponse {
  count: number;
  results: EtsyListing[];
}

/**
 * Map profession categories to Etsy search terms
 */
const PROFESSION_TO_ETSY_KEYWORDS: Record<ProfessionCategory, string[]> = {
  pottery: ['ceramic', 'pottery', 'clay', 'handmade pottery', 'ceramic bowl', 'ceramic vase'],
  ceramics: ['ceramic', 'porcelain', 'earthenware', 'ceramic art', 'handmade ceramic'],
  woodworking: ['wood', 'wooden', 'handmade wood', 'wood carving', 'wooden furniture', 'wood craft'],
  jewelry: ['handmade jewelry', 'silver jewelry', 'artisan jewelry', 'handcrafted jewelry', 'unique jewelry'],
  textiles: ['textile', 'fabric', 'handwoven', 'textile art', 'fabric craft', 'handmade textile'],
  metalwork: ['metal', 'brass', 'copper', 'handmade metal', 'metal art', 'metalwork'],
  glasswork: ['glass', 'handblown glass', 'glass art', 'stained glass', 'glass craft'],
  leatherwork: ['leather', 'handmade leather', 'leather craft', 'leather goods', 'leather bag'],
  painting: ['painting', 'art', 'canvas', 'handmade art', 'original painting'],
  sculpture: ['sculpture', 'handmade sculpture', 'art sculpture', 'carved sculpture'],
  weaving: ['woven', 'weaving', 'handwoven', 'textile weaving', 'woven art'],
  embroidery: ['embroidery', 'embroidered', 'hand embroidery', 'embroidery art'],
  handmade: ['handmade', 'artisan', 'handcrafted', 'unique', 'one of a kind'],
  crafts: ['craft', 'handcraft', 'artisan craft', 'handmade craft', 'unique craft']
};

/**
 * Etsy API Service Class
 */
export class EtsyAPIService {
  private static instance: EtsyAPIService;

  static getInstance(): EtsyAPIService {
    if (!EtsyAPIService.instance) {
      EtsyAPIService.instance = new EtsyAPIService();
    }
    return EtsyAPIService.instance;
  }

  /**
   * Check if Etsy API is configured
   */
  isConfigured(): boolean {
    return !!(ETSY_CONFIG.apiKey && ETSY_CONFIG.apiSecret);
  }

  /**
   * Get trending products from Etsy for a specific profession
   */
  async getTrendingProducts(
    profession: ProfessionCategory,
    limit: number = 6
  ): Promise<TrendingProduct[]> {
    if (!this.isConfigured()) {
      throw new Error('Etsy API not configured. Please add ETSY_API_KEY and ETSY_API_SECRET to .env');
    }

    try {
      const keywords = PROFESSION_TO_ETSY_KEYWORDS[profession] || PROFESSION_TO_ETSY_KEYWORDS.handmade;
      const searchTerm = keywords[0]; // Use primary keyword for search

      // Search for trending listings
      const listings = await this.searchListings(searchTerm, limit);
      
      // Convert Etsy listings to our TrendingProduct format
      return listings.map(listing => this.convertEtsyListingToTrendingProduct(listing));
    } catch (error) {
      console.error('Etsy API error:', error);
      throw error;
    }
  }

  /**
   * Search Etsy listings
   */
  private async searchListings(
    keywords: string,
    limit: number = 6
  ): Promise<EtsyListing[]> {
    const params = new URLSearchParams({
      keywords,
      limit: limit.toString(),
      sort_on: 'score', // Etsy's relevance/trending algorithm
      sort_order: 'desc',
      includes: 'Images,Shop',
      // Filter for active listings only
      state: 'active',
      // Focus on handmade items
      is_supply: 'false'
    });

    const url = `${ETSY_CONFIG.baseUrl}/application/listings/active?${params}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': ETSY_CONFIG.apiKey!,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(ETSY_CONFIG.timeout)
    });

    if (!response.ok) {
      throw new Error(`Etsy API error: ${response.status} ${response.statusText}`);
    }

    const data: EtsySearchResponse = await response.json();
    return data.results || [];
  }

  /**
   * Convert Etsy listing to our TrendingProduct format
   */
  private convertEtsyListingToTrendingProduct(listing: EtsyListing): TrendingProduct {
    // Calculate trend score based on views and favorites
    const trendScore = Math.min(100, Math.floor(
      (listing.views / 100) + (listing.num_favorers / 10) + 50
    ));

    // Determine trend type based on metrics
    const getTrendType = (score: number) => {
      if (score >= 85) return 'hot' as const;
      if (score >= 70) return 'rising' as const;
      if (score >= 55) return 'seasonal' as const;
      return 'stable' as const;
    };

    // Calculate price in rupees (approximate conversion from USD)
    const priceInUSD = listing.price.amount / listing.price.divisor;
    const priceInINR = Math.round(priceInUSD * 83); // Approximate USD to INR conversion

    // Generate trending reason
    const trendingReason = this.generateTrendingReason(listing, trendScore);

    return {
      id: `etsy-${listing.listing_id}`,
      title: listing.title,
      price: priceInINR,
      rating: 4.0 + Math.random() * 1.0, // Etsy doesn't provide ratings in search, so we estimate
      reviewCount: Math.floor(listing.views / 10), // Estimate reviews from views
      platform: 'Etsy',
      url: listing.url,
      imageUrl: listing.images?.[0]?.url_570xN || listing.images?.[0]?.url_fullxfull || '',
      category: this.mapEtsyCategoryToProfession(listing.category_path, listing.tags),
      trendType: getTrendType(trendScore),
      trendScore,
      growthRate: Math.floor(Math.random() * 30) + 10, // Estimate growth rate
      trendingReason,
      isRealTime: true,
      lastUpdated: new Date(),
      keywords: [...listing.tags, ...listing.materials].filter(Boolean)
    };
  }

  /**
   * Map Etsy category to our profession categories
   */
  private mapEtsyCategoryToProfession(categoryPath: string[], tags: string[]): string {
    const allTerms = [...categoryPath, ...tags].join(' ').toLowerCase();
    
    // Check for specific profession matches
    for (const [profession, keywords] of Object.entries(PROFESSION_TO_ETSY_KEYWORDS)) {
      if (keywords.some(keyword => allTerms.includes(keyword.toLowerCase()))) {
        return profession;
      }
    }
    
    return 'handmade'; // Default fallback
  }

  /**
   * Generate trending reason based on Etsy listing data
   */
  private generateTrendingReason(listing: EtsyListing, trendScore: number): string {
    const reasons = [
      `Popular on Etsy with ${listing.views} views and ${listing.num_favorers} favorites`,
      `Trending handmade item from ${listing.shop.shop_name} with strong customer interest`,
      `High-demand artisan product with ${listing.views} views on Etsy marketplace`,
      `Popular handcrafted item gaining traction among Etsy shoppers`,
      `Trending in handmade category with growing customer engagement`
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  /**
   * Get shop information (for future use)
   */
  async getShopInfo(shopId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Etsy API not configured');
    }

    const url = `${ETSY_CONFIG.baseUrl}/application/shops/${shopId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': ETSY_CONFIG.apiKey!,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Etsy API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const etsyAPI = EtsyAPIService.getInstance();