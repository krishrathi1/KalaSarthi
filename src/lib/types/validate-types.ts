/**
 * Manual validation script for Simplified Trend Spotter types
 * This ensures all types work correctly in practice
 */

import {
  TrendingProduct,
  MarketInsight,
  ConnectivityStatus,
  UserPreferences,
  TrendingDataResponse,
  MockDataConfig,
  TREND_TYPES,
  PROFESSION_CATEGORIES,
  DEFAULT_PRICE_RANGES,
  ProfessionCategory
} from './simplified-trend-spotter';

// Test function to validate all types work correctly
export function validateTypes(): boolean {
  console.log('🧪 Validating Simplified Trend Spotter Types...');

  try {
    // Test TrendingProduct
    const sampleProduct: TrendingProduct = {
      id: 'pottery-bowl-001',
      title: 'Handmade Ceramic Bowl - Traditional Blue Glaze',
      price: 1299,
      rating: 4.7,
      reviewCount: 156,
      platform: 'Amazon',
      url: 'https://amazon.in/ceramic-bowl-traditional',
      imageUrl: '/images/pottery/ceramic-bowl-blue.jpg',
      category: 'pottery',
      trendType: 'hot',
      trendScore: 94,
      growthRate: 28,
      trendingReason: 'Increased demand for authentic handmade pottery during festival season',
      isRealTime: true,
      lastUpdated: new Date(),
      keywords: ['ceramic', 'bowl', 'handmade', 'traditional', 'pottery', 'blue glaze']
    };
    console.log('✅ TrendingProduct interface validated');

    // Test MarketInsight
    const sampleInsight: MarketInsight = {
      category: 'pottery',
      opportunity: 'High demand for authentic handmade pottery products with traditional glazing techniques',
      recommendation: 'Focus on traditional blue and green glazes, emphasize handmade authenticity in product descriptions',
      confidence: 87,
      actionItems: [
        'Highlight traditional glazing techniques in product photos',
        'Use keywords like "authentic", "handmade", "traditional"',
        'Price products between ₹800-2000 for optimal market positioning',
        'Target festival seasons for maximum sales'
      ],
      marketSize: 'Medium-Large (₹50L+ annually)',
      competitionLevel: 'medium',
      seasonality: 'Peak during Diwali, Dussehra, and wedding seasons'
    };
    console.log('✅ MarketInsight interface validated');

    // Test ConnectivityStatus
    const sampleStatus: ConnectivityStatus = {
      isOnline: true,
      lastUpdated: new Date(),
      dataSource: 'api',
      syncStatus: 'synced'
    };
    console.log('✅ ConnectivityStatus interface validated');

    // Test UserPreferences
    const samplePreferences: UserPreferences = {
      profession: 'pottery',
      priceRange: {
        min: 500,
        max: 3000
      },
      preferredPlatforms: ['Amazon', 'Flipkart', 'Etsy'],
      categories: ['ceramic', 'pottery', 'bowls', 'vases'],
      language: 'en'
    };
    console.log('✅ UserPreferences interface validated');

    // Test TrendingDataResponse
    const sampleResponse: TrendingDataResponse = {
      success: true,
      data: {
        products: [sampleProduct],
        insights: [sampleInsight],
        metadata: {
          totalCount: 1,
          lastUpdated: new Date(),
          dataSource: 'api',
          profession: 'pottery'
        }
      }
    };
    console.log('✅ TrendingDataResponse interface validated');

    // Test MockDataConfig
    const sampleConfig: MockDataConfig = {
      profession: 'pottery',
      productCount: 15,
      includeInsights: true,
      includeImages: true,
      priceRange: {
        min: 200,
        max: 5000
      }
    };
    console.log('✅ MockDataConfig interface validated');

    // Test Constants
    console.log('📊 Validating Constants...');

    // Validate TREND_TYPES
    const trendTypes = Object.keys(TREND_TYPES);
    console.log(`   - TREND_TYPES: ${trendTypes.length} types defined`);
    trendTypes.forEach(type => {
      const trendType = TREND_TYPES[type as keyof typeof TREND_TYPES];
      if (!trendType.label || !trendType.color || !trendType.icon) {
        throw new Error(`Invalid TREND_TYPES entry for ${type}`);
      }
    });

    // Validate PROFESSION_CATEGORIES
    const professions = Object.keys(PROFESSION_CATEGORIES);
    console.log(`   - PROFESSION_CATEGORIES: ${professions.length} professions defined`);
    professions.forEach(profession => {
      const prof = PROFESSION_CATEGORIES[profession as ProfessionCategory];
      if (!prof.label || !Array.isArray(prof.keywords) || prof.keywords.length === 0) {
        throw new Error(`Invalid PROFESSION_CATEGORIES entry for ${profession}`);
      }
    });

    // Validate DEFAULT_PRICE_RANGES
    const priceRanges = Object.keys(DEFAULT_PRICE_RANGES);
    console.log(`   - DEFAULT_PRICE_RANGES: ${priceRanges.length} ranges defined`);
    priceRanges.forEach(profession => {
      const range = DEFAULT_PRICE_RANGES[profession as ProfessionCategory];
      if (range.min <= 0 || range.max <= range.min) {
        throw new Error(`Invalid DEFAULT_PRICE_RANGES entry for ${profession}`);
      }
    });

    console.log('✅ All constants validated');

    // Test type compatibility
    console.log('🔄 Testing type compatibility...');

    // Test that profession categories match between constants
    const professionKeys = Object.keys(PROFESSION_CATEGORIES) as ProfessionCategory[];
    const priceRangeKeys = Object.keys(DEFAULT_PRICE_RANGES) as ProfessionCategory[];

    const missingInPriceRanges = professionKeys.filter(p => !priceRangeKeys.includes(p));
    const missingInProfessions = priceRangeKeys.filter(p => !professionKeys.includes(p));

    if (missingInPriceRanges.length > 0) {
      throw new Error(`Missing price ranges for professions: ${missingInPriceRanges.join(', ')}`);
    }

    if (missingInProfessions.length > 0) {
      throw new Error(`Missing profession definitions for: ${missingInProfessions.join(', ')}`);
    }

    console.log('✅ Type compatibility validated');

    // Test edge cases
    console.log('🧪 Testing edge cases...');

    // Test with string price
    const productWithStringPrice: TrendingProduct = {
      ...sampleProduct,
      price: '₹1,299'
    };
    console.log('✅ String price format supported');

    // Test minimal required fields
    const minimalProduct: TrendingProduct = {
      id: 'min-1',
      title: 'Minimal Product',
      price: 100,
      rating: 4.0,
      reviewCount: 10,
      platform: 'Test',
      url: 'https://test.com',
      imageUrl: '/test.jpg',
      category: 'pottery',
      trendType: 'stable',
      trendScore: 50,
      isRealTime: false
    };
    console.log('✅ Minimal required fields supported');

    // Test offline connectivity status
    const offlineStatus: ConnectivityStatus = {
      isOnline: false,
      lastUpdated: new Date(),
      dataSource: 'mock',
      syncStatus: 'failed'
    };
    console.log('✅ Offline status supported');

    console.log('🎉 All type validations passed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Type validation failed:', error);
    return false;
  }
}

// Export sample data for testing
export const sampleData = {
  product: {
    id: 'pottery-bowl-001',
    title: 'Handmade Ceramic Bowl - Traditional Blue Glaze',
    price: 1299,
    rating: 4.7,
    reviewCount: 156,
    platform: 'Amazon',
    url: 'https://amazon.in/ceramic-bowl-traditional',
    imageUrl: '/images/pottery/ceramic-bowl-blue.jpg',
    category: 'pottery',
    trendType: 'hot' as const,
    trendScore: 94,
    growthRate: 28,
    trendingReason: 'Increased demand for authentic handmade pottery during festival season',
    isRealTime: true,
    lastUpdated: new Date(),
    keywords: ['ceramic', 'bowl', 'handmade', 'traditional', 'pottery', 'blue glaze']
  } as TrendingProduct,

  insight: {
    category: 'pottery',
    opportunity: 'High demand for authentic handmade pottery products',
    recommendation: 'Focus on traditional techniques and quality materials',
    confidence: 87,
    actionItems: [
      'Highlight traditional craftsmanship',
      'Use quality clay materials',
      'Price competitively around ₹800-1500'
    ]
  } as MarketInsight,

  preferences: {
    profession: 'pottery' as ProfessionCategory,
    priceRange: {
      min: 500,
      max: 3000
    },
    preferredPlatforms: ['Amazon', 'Flipkart'],
    categories: ['ceramic', 'pottery'],
    language: 'en' as const
  } as UserPreferences
};

// Run validation if this file is executed directly
if (require.main === module) {
  validateTypes();
}