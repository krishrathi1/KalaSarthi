'use server';

/**
 * @fileOverview Product Filter Agent for Trend Spotter
 * Filters and ranks products by popularity metrics
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ScrapedProductData } from '@/lib/web-scraper';

const FilterAgentInputSchema = z.object({
  scrapedProducts: z.array(z.any()), // ScrapedProductData with additional fields
  professionCategory: z.string(),
  targetMetrics: z.object({
    minRating: z.number().default(4.0),
    minReviews: z.number().default(10),
    maxPrice: z.number().optional(),
    trendingThreshold: z.number().default(7.5),
  }),
  filterCriteria: z.object({
    prioritizeHighRated: z.boolean().default(true),
    prioritizeHighVolume: z.boolean().default(true),
    prioritizeRecent: z.boolean().default(true),
    excludeOutliers: z.boolean().default(true),
  }),
});

export type FilterAgentInput = z.infer<typeof FilterAgentInputSchema>;

const FilterAgentOutputSchema = z.object({
  // Per-metric top lists
  mostViewedProducts: z.array(z.object({
    product: z.any(),
    score: z.number(),
    rankingReason: z.string(),
  })),
  mostSoldProducts: z.array(z.object({
    product: z.any(),
    score: z.number(),
    rankingReason: z.string(),
  })),
  bestReviewedProducts: z.array(z.object({
    product: z.any(),
    score: z.number(),
    rankingReason: z.string(),
  })),

  // Global ranked list
  globalRankedList: z.array(z.object({
    product: z.any(),
    overallScore: z.number(),
    rankingReason: z.string(),
    category: z.string(),
  })),

  filteringSummary: z.object({
    totalInput: z.number(),
    totalFiltered: z.number(),
    averageRating: z.number(),
    averagePrice: z.number(),
    topCategories: z.array(z.string()),
    platformDistribution: z.record(z.number()),
  }),
  trendInsights: z.object({
    mostClickedProducts: z.array(z.string()),
    highestRatedProducts: z.array(z.string()),
    bestSellingCategories: z.array(z.string()),
    priceSweetSpot: z.object({
      min: z.number(),
      max: z.number(),
      optimal: z.number(),
    }),
  }),
});

export type FilterAgentOutput = z.infer<typeof FilterAgentOutputSchema>;

export async function filterTrendProducts(input: FilterAgentInput): Promise<FilterAgentOutput> {
  return filterAgentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'filterAgentPrompt',
  input: { schema: FilterAgentInputSchema },
  output: { schema: FilterAgentOutputSchema },
  prompt: `You are a Product Filter Agent for the Trend Spotter feature.

Your task is to analyze scraped product data and filter/rank products based on popularity and trend metrics.

**Input Data:**
- Total products scraped: {{scrapedProducts.length}}
- Profession category: {{professionCategory}}
- Target metrics: Minimum rating {{targetMetrics.minRating}}, minimum reviews {{targetMetrics.minReviews}}

**Filtering Strategy:**
1. **Popularity Score (40%)**: Based on rating × review count × platform authority
2. **Trend Score (30%)**: Based on recent activity and search volume indicators
3. **Relevance Score (20%)**: Based on category match and profession alignment
4. **Quality Score (10%)**: Based on data completeness and seller reputation

**Ranking Criteria:**
- Prioritize products with high ratings and substantial review counts
- Favor products with recent activity indicators
- Consider platform authority (Amazon > Flipkart > Meesho > others)
- Exclude outliers and low-quality listings
- Focus on products relevant to the artisan's profession

**Output Requirements:**
- Top 20-30 filtered products with detailed scoring
- Comprehensive filtering summary with statistics
- Trend insights highlighting market patterns
- Clear ranking rationale for each product

Analyze the scraped product data and provide intelligent filtering and ranking that will help artisans identify genuine market trends.`,
});

const filterAgentFlow = ai.defineFlow(
  {
    name: 'filterAgentFlow',
    inputSchema: FilterAgentInputSchema,
    outputSchema: FilterAgentOutputSchema,
  },
  async (input) => {
    const { scrapedProducts, targetMetrics, filterCriteria } = input;

    // Calculate platform authority scores
    const platformAuthority = {
      'Amazon': 1.0,
      'Flipkart': 0.9,
      'Meesho': 0.7,
      'IndiaMart': 0.8,
      'Etsy': 0.6,
    };

    // Filter products based on criteria
    let filteredProducts = scrapedProducts.filter((product: any) => {
      // Basic quality filters
      if (product.rating < targetMetrics.minRating) return false;
      if (product.reviewCount < targetMetrics.minReviews) return false;
      if (!product.title || !product.price || product.price <= 0) return false;

      // Price filter if specified
      if (targetMetrics.maxPrice && product.price > targetMetrics.maxPrice) return false;

      return true;
    });

    // Calculate scores for each product
    const scoredProducts = filteredProducts.map((product: any) => {
      // Popularity Score (40%): rating × review count × platform authority
      const platformScore = platformAuthority[product.platform as keyof typeof platformAuthority] || 0.5;
      const popularityScore = (product.rating * Math.log(product.reviewCount + 1) * platformScore) * 0.4;

      // Trend Score (30%): Based on various trend indicators
      const trendScore = calculateTrendScore(product) * 0.3;

      // Relevance Score (20%): Category and profession match
      const relevanceScore = calculateRelevanceScore(product, input.professionCategory) * 0.2;

      // Quality Score (10%): Data completeness and seller factors
      const qualityScore = calculateQualityScore(product) * 0.1;

      const overallScore = popularityScore + trendScore + relevanceScore + qualityScore;

      return {
        product,
        popularityScore,
        trendScore,
        relevanceScore,
        overallScore,
        rankingReason: generateRankingReason(product, popularityScore, trendScore, relevanceScore),
        category: product.category || product.searchQuery || 'General',
      };
    });

    // Sort by overall score (descending)
    scoredProducts.sort((a, b) => b.overallScore - a.overallScore);

    // Take top products (limit to reasonable number)
    const topProducts = scoredProducts.slice(0, 30);

    // Calculate summary statistics
    const totalInput = scrapedProducts.length;
    const totalFiltered = topProducts.length;

    // Handle empty results gracefully
    const averageRating = totalFiltered > 0
      ? topProducts.reduce((sum, p) => sum + p.product.rating, 0) / totalFiltered
      : 0;

    const averagePrice = totalFiltered > 0
      ? topProducts.reduce((sum, p) => sum + p.product.price, 0) / totalFiltered
      : 0;

    // Category distribution
    const categoryCount: Record<string, number> = {};
    topProducts.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    // Platform distribution
    const platformDistribution: Record<string, number> = {};
    topProducts.forEach(p => {
      platformDistribution[p.product.platform] = (platformDistribution[p.product.platform] || 0) + 1;
    });

    // Generate trend insights
    const trendInsights = {
      mostClickedProducts: topProducts
        .filter(p => p.product.reviewCount > 100)
        .slice(0, 5)
        .map(p => p.product.title),
      highestRatedProducts: topProducts
        .filter(p => p.product.rating >= 4.5)
        .slice(0, 5)
        .map(p => p.product.title),
      bestSellingCategories: topCategories,
      priceSweetSpot: calculatePriceSweetSpot(topProducts.map(p => p.product)),
    };

    // Create per-metric top lists
    const mostViewedProducts = topProducts
      .filter(p => p.product.reviewCount > 50)
      .sort((a, b) => b.product.reviewCount - a.product.reviewCount)
      .slice(0, 10)
      .map(p => ({
        product: p.product,
        score: p.product.reviewCount,
        rankingReason: `High view count (${p.product.reviewCount} reviews) indicates strong customer interest`
      }));

    const mostSoldProducts = topProducts
      .filter(p => p.product.rating >= 4.0)
      .sort((a, b) => b.product.rating - a.product.rating)
      .slice(0, 10)
      .map(p => ({
        product: p.product,
        score: p.product.rating,
        rankingReason: `High rating (${p.product.rating}/5) suggests strong sales performance`
      }));

    const bestReviewedProducts = topProducts
      .filter(p => p.product.reviewCount > 20)
      .sort((a, b) => (b.product.rating * Math.log(b.product.reviewCount)) - (a.product.rating * Math.log(a.product.reviewCount)))
      .slice(0, 10)
      .map(p => ({
        product: p.product,
        score: p.product.rating * Math.log(p.product.reviewCount),
        rankingReason: `Strong combination of rating (${p.product.rating}/5) and review volume (${p.product.reviewCount})`
      }));

    return {
      mostViewedProducts,
      mostSoldProducts,
      bestReviewedProducts,
      globalRankedList: topProducts.map(p => ({
        product: p.product,
        overallScore: p.overallScore,
        rankingReason: p.rankingReason,
        category: p.category,
      })),
      filteringSummary: {
        totalInput,
        totalFiltered,
        averageRating: Math.round(averageRating * 10) / 10,
        averagePrice: Math.round(averagePrice),
        topCategories,
        platformDistribution,
      },
      trendInsights,
    };
  }
);

// Helper functions for scoring calculations
function calculateTrendScore(product: any): number {
  let score = 5; // Base score

  // Higher score for products with many reviews (indicates popularity)
  if (product.reviewCount > 100) score += 2;
  else if (product.reviewCount > 50) score += 1;

  // Higher score for high ratings
  if (product.rating >= 4.5) score += 1.5;
  else if (product.rating >= 4.0) score += 1;

  // Discount indicates trending (sales/promotions)
  if (product.discount && product.discount > 10) score += 1;

  return Math.min(score, 10); // Cap at 10
}

function calculateRelevanceScore(product: any, professionCategory: string): number {
  let score = 5; // Base score

  // Check if product category matches profession
  const productCategory = (product.category || product.searchQuery || '').toLowerCase();
  const profession = professionCategory.toLowerCase();

  if (productCategory.includes(profession) || profession.includes(productCategory)) {
    score += 3;
  }

  // Title relevance
  const title = product.title.toLowerCase();
  if (title.includes(profession.split(' ')[0])) score += 1;

  return Math.min(score, 10);
}

function calculateQualityScore(product: any): number {
  let score = 5; // Base score

  // Data completeness
  if (product.imageUrl) score += 1;
  if (product.description) score += 1;
  if (product.seller) score += 0.5;

  // Availability
  if (product.availability) score += 0.5;

  // Price reasonableness (not too low or too high)
  if (product.price > 50 && product.price < 50000) score += 1;

  return Math.min(score, 10);
}

function generateRankingReason(product: any, popularityScore: number, trendScore: number, relevanceScore: number): string {
  const reasons = [];

  if (popularityScore > 7) reasons.push('High popularity');
  if (trendScore > 7) reasons.push('Strong trend indicators');
  if (relevanceScore > 7) reasons.push('Highly relevant to profession');
  if (product.rating >= 4.5) reasons.push('Excellent customer ratings');
  if (product.reviewCount > 100) reasons.push('Large customer base');

  return reasons.join(', ') || 'Good overall performance';
}

function calculatePriceSweetSpot(products: any[]): { min: number; max: number; optimal: number } {
  const prices = products.map(p => p.price).sort((a, b) => a - b);

  if (prices.length === 0) return { min: 0, max: 0, optimal: 0 };

  const min = prices[0];
  const max = prices[prices.length - 1];

  // Calculate optimal price (around 60th percentile for sweet spot)
  const optimalIndex = Math.floor(prices.length * 0.6);
  const optimal = prices[optimalIndex];

  return { min, max, optimal };
}