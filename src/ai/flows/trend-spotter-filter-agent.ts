import { ScrapedProduct } from './trend-spotter-scraper-agent';

export interface FilterAgentInput {
  scrapedProducts: ScrapedProduct[];
  professionCategory: string;
  targetMetrics: {
    minRating: number;
    minReviews: number;
    maxPrice: number;
    trendingThreshold: number;
  };
  filterCriteria: {
    prioritizeHighRated: boolean;
    prioritizeHighVolume: boolean;
    prioritizeRecent: boolean;
    excludeOutliers: boolean;
  };
}

export interface FilteredProduct extends ScrapedProduct {
  overallScore: number;
  popularityScore: number;
  trendScore: number;
  relevanceScore: number;
  qualityScore: number;
  valueScore: number;
  rankingFactors: {
    rating: number;
    reviews: number;
    price: number;
    trending: number;
    availability: number;
  };
}

export interface TrendInsights {
  topTrendingCategories: string[];
  priceRangeAnalysis: {
    budget: number;
    midRange: number;
    premium: number;
  };
  qualityDistribution: {
    highQuality: number;
    mediumQuality: number;
    lowQuality: number;
  };
  marketGaps: string[];
  emergingTrends: string[];
}

export interface FilterAgentResult {
  filteredProducts: FilteredProduct[];
  mostViewedProducts: FilteredProduct[];
  mostSoldProducts: FilteredProduct[];
  bestReviewedProducts: FilteredProduct[];
  globalRankedList: FilteredProduct[];
  trendInsights: TrendInsights;
  filterStatistics: {
    totalProducts: number;
    filteredProducts: number;
    filterRate: number;
    averageScore: number;
    topCategory: string;
  };
}

export async function filterTrendProducts(input: FilterAgentInput): Promise<FilterAgentResult> {
  try {
    console.log(`🎛️ Filtering ${input.scrapedProducts.length} products for profession: ${input.professionCategory}`);

    // Step 1: Apply basic filters
    const basicFiltered = applyBasicFilters(input.scrapedProducts, input.targetMetrics);
    console.log(`📊 Basic filtering: ${basicFiltered.length} products remaining`);

    // Step 2: Calculate scores for each product
    const scoredProducts = basicFiltered.map(product => calculateProductScores(product, input.professionCategory));
    console.log(`📈 Scoring complete: ${scoredProducts.length} products scored`);

    // Step 3: Apply advanced filtering criteria
    const advancedFiltered = applyAdvancedFilters(scoredProducts, input.filterCriteria);
    console.log(`🔍 Advanced filtering: ${advancedFiltered.length} products remaining`);

    // Step 4: Generate ranked lists
    const rankedLists = generateRankedLists(advancedFiltered);

    // Step 5: Generate trend insights
    const trendInsights = generateTrendInsights(advancedFiltered);

    // Step 6: Calculate filter statistics
    const filterStatistics = calculateFilterStatistics(input.scrapedProducts, advancedFiltered);

    const result: FilterAgentResult = {
      filteredProducts: advancedFiltered,
      mostViewedProducts: rankedLists.mostViewed,
      mostSoldProducts: rankedLists.mostSold,
      bestReviewedProducts: rankedLists.bestReviewed,
      globalRankedList: rankedLists.global,
      trendInsights,
      filterStatistics
    };

    console.log(`✅ Filtering completed: ${advancedFiltered.length} products in final list`);
    return result;

  } catch (error) {
    console.error('Error filtering trend products:', error);
    throw new Error(`Product filtering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function applyBasicFilters(products: ScrapedProduct[], metrics: FilterAgentInput['targetMetrics']): ScrapedProduct[] {
  return products.filter(product => {
    // Rating filter
    if (product.rating < metrics.minRating) return false;
    
    // Review count filter
    if (product.reviewCount < metrics.minReviews) return false;
    
    // Price filter
    if (product.price > metrics.maxPrice) return false;
    
    // Trending threshold filter
    if (product.trendingScore < metrics.trendingThreshold) return false;
    
    // Availability filter
    if (product.availability === 'out_of_stock') return false;
    
    return true;
  });
}

function calculateProductScores(product: ScrapedProduct, professionCategory: string): FilteredProduct {
  // Calculate individual scores (0-10 scale)
  const ratingScore = (product.rating / 5) * 10;
  const reviewScore = Math.min((product.reviewCount / 100) * 10, 10);
  const priceScore = calculatePriceScore(product.price);
  const trendingScore = product.trendingScore;
  const relevanceScore = calculateRelevanceScore(product, professionCategory);
  const qualityScore = calculateQualityScore(product);
  const valueScore = calculateValueScore(product);

  // Calculate overall score with weighted average
  const overallScore = (
    ratingScore * 0.25 +
    reviewScore * 0.20 +
    trendingScore * 0.20 +
    relevanceScore * 0.15 +
    qualityScore * 0.10 +
    valueScore * 0.10
  );

  const rankingFactors = {
    rating: ratingScore,
    reviews: reviewScore,
    price: priceScore,
    trending: trendingScore,
    availability: product.availability === 'in_stock' ? 10 : 5
  };

  return {
    ...product,
    overallScore: Math.round(overallScore * 100) / 100,
    popularityScore: Math.round((ratingScore + reviewScore) / 2 * 100) / 100,
    trendScore: trendingScore,
    relevanceScore: Math.round(relevanceScore * 100) / 100,
    qualityScore: Math.round(qualityScore * 100) / 100,
    valueScore: Math.round(valueScore * 100) / 100,
    rankingFactors
  };
}

function calculatePriceScore(price: number): number {
  // Optimal price range scoring (500-3000 gets highest score)
  if (price < 500) return 5;
  if (price <= 1000) return 8;
  if (price <= 3000) return 10;
  if (price <= 5000) return 7;
  return 4;
}

function calculateRelevanceScore(product: ScrapedProduct, professionCategory: string): number {
  let score = 5; // Base score
  
  // Category relevance
  if (product.category.toLowerCase().includes(professionCategory.toLowerCase())) {
    score += 3;
  }
  
  // Title relevance
  if (product.title.toLowerCase().includes(professionCategory.toLowerCase())) {
    score += 2;
  }
  
  // Tag relevance
  const relevantTags = product.tags.filter(tag => 
    tag.toLowerCase().includes(professionCategory.toLowerCase())
  );
  score += relevantTags.length;
  
  return Math.min(score, 10);
}

function calculateQualityScore(product: ScrapedProduct): number {
  let score = 5; // Base score
  
  // Rating contribution
  score += (product.rating - 3) * 2;
  
  // Review count contribution
  if (product.reviewCount > 100) score += 1;
  if (product.reviewCount > 500) score += 1;
  
  // Feature count contribution
  score += Math.min(product.features.length * 0.5, 2);
  
  return Math.min(Math.max(score, 0), 10);
}

function calculateValueScore(product: ScrapedProduct): number {
  // Value = quality/price ratio
  const qualityScore = calculateQualityScore(product);
  const priceValue = Math.max(1, product.price / 1000);
  return Math.min(qualityScore / priceValue, 10);
}

function applyAdvancedFilters(products: FilteredProduct[], criteria: FilterAgentInput['filterCriteria']): FilteredProduct[] {
  let filtered = [...products];

  // Prioritize high-rated products
  if (criteria.prioritizeHighRated) {
    filtered = filtered.filter(p => p.rating >= 4.0);
  }

  // Prioritize high-volume products
  if (criteria.prioritizeHighVolume) {
    filtered = filtered.filter(p => p.reviewCount >= 50);
  }

  // Prioritize recent products (based on trending score as proxy)
  if (criteria.prioritizeRecent) {
    filtered = filtered.filter(p => p.trendingScore >= 6.0);
  }

  // Exclude outliers (very high or very low prices)
  if (criteria.excludeOutliers) {
    const prices = filtered.map(p => p.price);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const stdDev = Math.sqrt(prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length);
    
    filtered = filtered.filter(p => 
      p.price >= avgPrice - 2 * stdDev && 
      p.price <= avgPrice + 2 * stdDev
    );
  }

  return filtered;
}

function generateRankedLists(products: FilteredProduct[]) {
  // Sort by different criteria
  const mostViewed = [...products]
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 10);

  const mostSold = [...products]
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 10);

  const bestReviewed = [...products]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 10);

  const global = [...products]
    .sort((a, b) => b.overallScore - a.overallScore);

  return {
    mostViewed,
    mostSold,
    bestReviewed,
    global
  };
}

function generateTrendInsights(products: FilteredProduct[]): TrendInsights {
  // Analyze categories
  const categoryCounts = products.reduce((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topTrendingCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category]) => category);

  // Price range analysis
  const prices = products.map(p => p.price);
  const budget = prices.filter(p => p < 1000).length;
  const midRange = prices.filter(p => p >= 1000 && p < 3000).length;
  const premium = prices.filter(p => p >= 3000).length;

  // Quality distribution
  const highQuality = products.filter(p => p.qualityScore >= 8).length;
  const mediumQuality = products.filter(p => p.qualityScore >= 6 && p.qualityScore < 8).length;
  const lowQuality = products.filter(p => p.qualityScore < 6).length;

  // Market gaps (categories with few products)
  const marketGaps = Object.entries(categoryCounts)
    .filter(([, count]) => count < 3)
    .map(([category]) => category);

  // Emerging trends (high trending score categories)
  const emergingTrends = products
    .filter(p => p.trendingScore >= 8)
    .map(p => p.category)
    .filter((category, index, arr) => arr.indexOf(category) === index)
    .slice(0, 3);

  return {
    topTrendingCategories,
    priceRangeAnalysis: { budget, midRange, premium },
    qualityDistribution: { highQuality, mediumQuality, lowQuality },
    marketGaps,
    emergingTrends
  };
}

function calculateFilterStatistics(originalProducts: ScrapedProduct[], filteredProducts: FilteredProduct[]) {
  const totalProducts = originalProducts.length;
  const filteredCount = filteredProducts.length;
  const filterRate = totalProducts > 0 ? filteredCount / totalProducts : 0;
  const averageScore = filteredProducts.length > 0 
    ? filteredProducts.reduce((sum, p) => sum + p.overallScore, 0) / filteredProducts.length 
    : 0;

  // Find top category
  const categoryCounts = filteredProducts.reduce((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

  return {
    totalProducts,
    filteredProducts: filteredCount,
    filterRate: Math.round(filterRate * 100) / 100,
    averageScore: Math.round(averageScore * 100) / 100,
    topCategory
  };
}
