import { googleTrendsService, GoogleTrendsData } from './google-trends';
import { bigQueryService, ScrapedProductData, TrendDataRecord, MarketInsightRecord } from './bigquery-service';
import { firestoreService, CachedTrendResult } from './firestore-service';
import { vertexAIService, TrendInsights, SentimentAnalysisResult } from './vertex-ai-service';
import { trendScraper, TrendData, ScrapedProduct } from './trend-scraper';

export interface ComprehensiveTrendAnalysis {
  trends: TrendData[];
  insights: TrendInsights;
  googleTrendsData: any;
  cached: boolean;
  dataSources: string[];
  generatedAt: Date;
}

export interface ArtisanQuery {
  uid: string;
  profession: string;
  query: string;
  timestamp: Date;
}

export class TrendAnalysisOrchestrator {
  /**
   * Main method to perform comprehensive trend analysis
   */
  async analyzeTrendsForArtisan(
    artisanQuery: ArtisanQuery,
    forceRefresh: boolean = false
  ): Promise<ComprehensiveTrendAnalysis> {
    const { uid, profession, query } = artisanQuery;

    // 1. Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedResult = await firestoreService.getCachedTrendResult(profession, query);
      if (cachedResult) {
        return {
          trends: cachedResult.trends,
          insights: {
            summary: cachedResult.analysis,
            keyTrends: [],
            recommendations: cachedResult.recommendations,
            marketOpportunities: [],
            competitiveAnalysis: '',
            confidence: 0.8
          },
          googleTrendsData: {},
          cached: true,
          dataSources: cachedResult.dataSources,
          generatedAt: cachedResult.createdAt
        };
      }
    }

    // 2. Fetch data from multiple sources
    const [googleTrendsData, scrapedData] = await Promise.allSettled([
      this.fetchGoogleTrendsData(profession),
      this.fetchScrapedData(profession)
    ]);

    const trendsData = googleTrendsData.status === 'fulfilled' ? googleTrendsData.value : {};
    const productsData = scrapedData.status === 'fulfilled' ? scrapedData.value : [];

    // 3. Generate AI insights
    const insights = await vertexAIService.generateTrendInsights({
      artisanProfession: profession,
      googleTrendsData: trendsData,
      scrapedProducts: productsData,
      marketData: {
        query,
        timestamp: new Date(),
        dataSources: this.determineDataSources(trendsData, productsData)
      }
    });

    // 4. Store data in BigQuery
    await this.storeAnalysisData(profession, trendsData, productsData, insights);

    // 5. Cache results in Firestore
    const cacheData = {
      artisanProfession: profession,
      query,
      trends: productsData,
      analysis: insights.summary,
      recommendations: insights.recommendations,
      dataSources: this.determineDataSources(trendsData, productsData)
    };

    await firestoreService.cacheTrendResult(cacheData);

    // 6. Update artisan profile
    await firestoreService.createArtisanProfile(uid, profession);

    return {
      trends: this.convertToTrendData(productsData),
      insights,
      googleTrendsData: trendsData,
      cached: false,
      dataSources: cacheData.dataSources,
      generatedAt: new Date()
    };
  }

  /**
   * Fetch Google Trends data as primary source
   */
  private async fetchGoogleTrendsData(profession: string): Promise<any> {
    try {
      console.log(`Fetching Google Trends data for ${profession}`);
      const trendsData = await googleTrendsService.getComprehensiveTrends(profession);
      return trendsData;
    } catch (error) {
      console.error('Error fetching Google Trends data:', error);
      return {};
    }
  }

  /**
   * Fetch scraped data as backup/enrichment source
   */
  private async fetchScrapedData(profession: string): Promise<ScrapedProduct[]> {
    try {
      console.log(`Fetching scraped data for ${profession}`);
      const trends = await trendScraper.getTrendingProducts(profession, 20);

      // Flatten products from all trends
      const allProducts: ScrapedProduct[] = [];
      trends.forEach(trend => {
        allProducts.push(...trend.products);
      });

      return allProducts.slice(0, 50); // Limit to 50 products
    } catch (error) {
      console.error('Error fetching scraped data:', error);
      return [];
    }
  }

  /**
   * Store analysis data in BigQuery
   */
  private async storeAnalysisData(
    profession: string,
    trendsData: any,
    productsData: ScrapedProduct[],
    insights: TrendInsights
  ): Promise<void> {
    try {
      // Store scraped products
      if (productsData.length > 0) {
        const productRecords: ScrapedProductData[] = productsData.map(product => ({
          id: `${profession}_${product.title}_${Date.now()}_${Math.random()}`,
          keyword: profession,
          title: product.title,
          price: product.price,
          rating: product.rating,
          reviews: product.reviews,
          platform: product.platform,
          url: product.url,
          imageUrl: product.imageUrl,
          description: product.description || '',
          scrapedAt: new Date(),
          artisanProfession: profession
        }));

        await bigQueryService.insertScrapedProducts(productRecords);
      }

      // Store trend data
      if (trendsData.interestOverTime && trendsData.interestOverTime.length > 0) {
        const trendRecords: TrendDataRecord[] = trendsData.interestOverTime.map((trend: any, index: number) => ({
          id: `${profession}_trend_${Date.now()}_${index}`,
          keyword: trend.keyword,
          searchVolume: trend.data ? trend.data.length * 10 : 0,
          trendIndex: trend.data ? trend.data[trend.data.length - 1]?.value || 0 : 0,
          relatedQueries: trendsData.relatedQueries?.find((r: any) => r.keyword === trend.keyword)?.related || [],
          rising: true,
          geo: 'IN',
          timeRange: 'today 3-m',
          createdAt: new Date(),
          artisanProfession: profession
        }));

        await bigQueryService.insertTrendData(trendRecords);
      }

      // Store market insights
      const insightRecord: MarketInsightRecord = {
        id: `${profession}_insights_${Date.now()}`,
        artisanProfession: profession,
        insights: insights.summary,
        recommendations: insights.recommendations,
        dataSources: this.determineDataSources(trendsData, productsData),
        confidence: insights.confidence,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      await bigQueryService.insertMarketInsights([insightRecord]);

    } catch (error) {
      console.error('Error storing analysis data:', error);
      // Don't throw error - continue with analysis even if storage fails
    }
  }

  /**
   * Convert scraped products to TrendData format
   */
  private convertToTrendData(products: ScrapedProduct[]): TrendData[] {
    // Group products by platform or create a single trend
    const platformGroups: { [key: string]: ScrapedProduct[] } = {};

    products.forEach(product => {
      if (!platformGroups[product.platform]) {
        platformGroups[product.platform] = [];
      }
      platformGroups[product.platform].push(product);
    });

    return Object.entries(platformGroups).map(([platform, platformProducts]) => ({
      keyword: platform,
      searchVolume: platformProducts.length * 10,
      products: platformProducts,
      trending: true,
      demandScore: this.calculateDemandScore(platformProducts)
    }));
  }

  /**
   * Calculate demand score for products
   */
  private calculateDemandScore(products: ScrapedProduct[]): number {
    if (products.length === 0) return 0;

    let totalScore = 0;
    products.forEach(product => {
      let score = 0;
      // Rating score (0-3)
      const rating = parseFloat(product.rating) || 0;
      score += Math.min(rating / 5 * 3, 3);

      // Reviews score (0-4)
      score += Math.min(product.reviews / 100, 4);

      // Platform bonus (0-2)
      score += this.getPlatformBonus(product.platform);

      totalScore += score;
    });

    return totalScore / products.length;
  }

  /**
   * Get platform bonus for scoring
   */
  private getPlatformBonus(platform: string): number {
    const bonuses: { [key: string]: number } = {
      'Amazon': 2.0,
      'Flipkart': 1.8,
      'Meesho': 1.5,
      'IndiaMart': 1.3,
      'eBay': 1.6,
      'Etsy': 1.7,
      'Nykaa': 1.4
    };
    return bonuses[platform] || 1.0;
  }

  /**
   * Determine data sources used
   */
  private determineDataSources(trendsData: any, productsData: ScrapedProduct[]): string[] {
    const sources: string[] = [];

    if (trendsData && Object.keys(trendsData).length > 0) {
      sources.push('Google Trends');
    }

    if (productsData && productsData.length > 0) {
      const platforms = [...new Set(productsData.map(p => p.platform))];
      sources.push(...platforms);
    }

    return sources.length > 0 ? sources : ['Market Analysis'];
  }

  /**
   * Get trend analysis history for artisan
   */
  async getTrendHistoryForArtisan(uid: string, limit: number = 10): Promise<CachedTrendResult[]> {
    const profile = await firestoreService.getArtisanProfile(uid);
    if (!profile) return [];

    return await firestoreService.getPopularResultsForProfession(profile.artisticProfession, limit);
  }

  /**
   * Clean up old data and cache
   */
  async cleanup(): Promise<void> {
    try {
      // Clean up BigQuery data older than 90 days
      await bigQueryService.cleanupOldData(90);

      // Clean up expired Firestore cache
      await firestoreService.deleteExpiredCache();

      // Clean up inactive artisan profiles
      await firestoreService.cleanupInactiveProfiles();

      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    bigquery: boolean;
    firestore: boolean;
    googleTrends: boolean;
    vertexAI: boolean;
    cacheStats: any;
  }> {
    const health = {
      bigquery: false,
      firestore: false,
      googleTrends: false,
      vertexAI: false,
      cacheStats: {}
    };

    try {
      // Test BigQuery
      await bigQueryService.initializeDataset();
      health.bigquery = true;
    } catch (error) {
      console.error('BigQuery health check failed:', error);
    }

    try {
      // Test Firestore
      health.cacheStats = await firestoreService.getCacheStats();
      health.firestore = true;
    } catch (error) {
      console.error('Firestore health check failed:', error);
    }

    try {
      // Test Google Trends
      await googleTrendsService.getTrendingSearches();
      health.googleTrends = true;
    } catch (error) {
      console.error('Google Trends health check failed:', error);
    }

    try {
      // Test Vertex AI with a simple prompt
      await vertexAIService.generateTrendInsights({
        artisanProfession: 'test',
        googleTrendsData: {},
        scrapedProducts: [],
        marketData: {}
      });
      health.vertexAI = true;
    } catch (error) {
      console.error('Vertex AI health check failed:', error);
    }

    return health;
  }
}

export const trendAnalysisOrchestrator = new TrendAnalysisOrchestrator();
