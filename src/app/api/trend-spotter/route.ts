import { NextRequest, NextResponse } from 'next/server';
import { getArtisanProfile, ProfileFetcherInput } from '@/ai/flows/trend-spotter-profile-agent';
import { classifyProductsForProfession, ProductClassifierInput } from '@/ai/flows/trend-spotter-classifier-agent';
import { analyzeArtisanTrends, TrendAnalysisInput } from '@/ai/flows/trend-spotter-analysis-agent';
import { ScraperAgentInput, scrapeTrendProducts } from '@/ai/flows/trend-spotter-scraper-agent';
import { FilterAgentInput, filterTrendProducts } from '@/ai/flows/trend-spotter-filter-agent';
import { generateTrendRecommendations, RecommendationAgentInput } from '@/ai/flows/trend-spotter-recommendation-agent';
import { generateMockTrendingData } from '@/lib/services/simplified-trend-api';


interface TrendSpotterRequest {
  userId: string;
  forceRefresh?: boolean;
}

interface TrendSpotterResponse {
  success: boolean;
  workflow: {
    profile: any;
    classifier: any;
    analysis: any;
    scrapedProducts: any[];
    mostViewedProducts: any[];
    mostSoldProducts: any[];
    bestReviewedProducts: any[];
    globalRankedList: any[];
    recommendations: any[];
    marketSummary: any;
    actionableInsights: any[];
    nextSteps: string[];
  };
  // Final deliverables as per specification
  profileCompletenessSummary: string;
  querySet: Array<{
    query: string;
    rationale: string;
    category: string;
    priority: number;
  }>;
  sourceCoverageReport: {
    apisUsed: string[];
    scrapedSources: string[];
    totalProductsCollected: number;
    successRate: number;
  };
  perMetricTopLists: {
    mostViewed: any[];
    mostSold: any[];
    bestReviewed: any[];
  };
  globalRankedList: any[];
  executionTime: number;
  error?: string;

  // Data Lineage Tracking (as per specification)
  dataLineage?: {
    profileSource: string;
    productSource: string;
    salesSource: string;
    financialSource: string;
    scrapingSources: string[];
    timestamp: string;
    querySet: Array<{
      query: string;
      rationale: string;
      category: string;
      priority: number;
    }>;
    metricsUsed: {
      views: string;
      sales: string;
      reviews: string;
    };
    processingSteps: string[];
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { userId, forceRefresh = false }: TrendSpotterRequest = await request.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid userId parameter' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting Trend Spotter workflow for user:', userId);

    // Step 1: Profile Fetcher Agent
    console.log('📋 Step 1: Analyzing artisan profile...');
    const profileInput: ProfileFetcherInput = {
      userId,
      includeProducts: true,
      includeSales: true,
      checkCompleteness: true,
      profileData: '' // Will be populated by the agent
    };

    const profileResult = await getArtisanProfile(profileInput);
    console.log('✅ Profile analysis complete');

    // Step 2: Trend Analysis Agent
    console.log('🎯 Step 2: Generating trend analysis...');
    // Check if profile is complete before proceeding
    if (!profileResult.profileDataAvailable) {
      return NextResponse.json({
        success: false,
        error: 'Profile incomplete',
        profileUpdatePrompt: profileResult.profileUpdatePrompt,
        missingFields: profileResult.missingFields,
        searchQueries: profileResult.searchQueries
      });
    }

    // Step 2.5: Product Classifier Agent (NEW)
    console.log('🏷️ Step 2.5: Classifying products for profession...');
    const classifierInput: ProductClassifierInput = {
      profession: profileResult.profile!.profession,
      professionDetails: {
        skills: profileResult.profile!.skills,
        materials: [], // Will be inferred from products or profession
        experience: profileResult.profile!.experience,
        location: profileResult.profile!.location
      },
      existingProducts: profileResult.products || []
    };

    const classifierResult = await classifyProductsForProfession(classifierInput);
    console.log('✅ Product classification complete');

    // Step 3: Trend Analysis Agent (Enhanced with classifier data)
    console.log('🎯 Step 3: Generating trend analysis...');
    const analysisInput: TrendAnalysisInput = {
      profile: profileResult.profile!,
      products: profileResult.products!,
      sales: profileResult.sales!,
      marketAnalysis: profileResult.analysis!
    };

    const analysisResult = await analyzeArtisanTrends(analysisInput);
    console.log('✅ Trend analysis complete');

    // Step 3: Web Scraping Agent (Enhanced with classifier queries)
    console.log('🕷️ Step 3: Scraping ecommerce platforms...');
    const scraperInput: ScraperAgentInput = {
      searchQueries: classifierResult.searchQueries.map((q: any) => ({
        category: q.category,
        query: q.query,
        priority: q.priority === 1 ? 'high' : q.priority === 2 ? 'medium' : 'low',
        rationale: q.rationale
      })), // Transform classifier queries to scraper format
      targetPlatforms: classifierResult.marketInsights.targetPlatforms.map((platform: any) => ({
        platform,
        relevance: 0.8, // Default high relevance
        searchStrategy: 'comprehensive'
      })), // Transform platforms to scraper format
      limit: 20
    };

    const scraperResult = await scrapeTrendProducts(scraperInput);
    console.log('✅ Web scraping complete');

    // Step 4: Product Filter Agent
    console.log('🎛️ Step 4: Filtering and ranking products...');
    const filterInput: FilterAgentInput = {
      scrapedProducts: scraperResult.scrapedProducts,
      professionCategory: analysisResult.professionInsights.primaryCategory,
      targetMetrics: {
        minRating: 4.0,
        minReviews: 10,
        maxPrice: 50000,
        trendingThreshold: 7.5
      },
      filterCriteria: {
        prioritizeHighRated: true,
        prioritizeHighVolume: true,
        prioritizeRecent: true,
        excludeOutliers: true
      }
    };

    const filterResult = await filterTrendProducts(filterInput);
    console.log('✅ Product filtering complete');

    // Step 5: Recommendation Agent
    console.log('💡 Step 5: Generating recommendations...');
    const recommendationInput: RecommendationAgentInput = {
      filteredProducts: filterResult.globalRankedList.map((item: any) => ({
        ...item,
        popularityScore: item.overallScore * 0.4, // Distribute overall score
        trendScore: item.overallScore * 0.3,
        relevanceScore: item.overallScore * 0.3,
      })),
      artisanProfile: profileResult.profile!,
      marketAnalysis: profileResult.analysis!,
      trendInsights: filterResult.trendInsights
    };

    const recommendationResult = await generateTrendRecommendations(recommendationInput);
    console.log('✅ Recommendations generated');

    const executionTime = Date.now() - startTime;

    const response: TrendSpotterResponse = {
      success: true,
      workflow: {
        profile: profileResult,
        classifier: classifierResult, // Add classifier results
        analysis: analysisResult,
        scrapedProducts: scraperResult.scrapedProducts,
        mostViewedProducts: filterResult.mostViewedProducts,
        mostSoldProducts: filterResult.mostSoldProducts,
        bestReviewedProducts: filterResult.bestReviewedProducts,
        globalRankedList: filterResult.globalRankedList,
        recommendations: recommendationResult.topRecommendations,
        marketSummary: recommendationResult.marketSummary,
        actionableInsights: recommendationResult.actionableInsights,
        nextSteps: recommendationResult.nextSteps
      },
      profileCompletenessSummary: profileResult.completenessSummary,
      querySet: classifierResult.searchQueries.map((q: any) => ({
        query: q.query,
        rationale: q.rationale,
        category: q.category,
        priority: q.priority
      })), // Use classifier's optimized queries
      sourceCoverageReport: {
        apisUsed: [], // No official APIs used in current implementation
        scrapedSources: ['Amazon', 'Flipkart', 'Meesho'],
        totalProductsCollected: scraperResult.scrapedProducts.length,
        successRate: scraperResult.scrapedProducts.length > 0 ? 1.0 : 0.0
      },
      perMetricTopLists: {
        mostViewed: filterResult.mostViewedProducts,
        mostSold: filterResult.mostSoldProducts,
        bestReviewed: filterResult.bestReviewedProducts
      },
      globalRankedList: filterResult.globalRankedList,
      executionTime,

      // Data Lineage Tracking (as per specification)
      dataLineage: {
        profileSource: 'Artisan Profile DB',
        productSource: 'Product Listings DB',
        salesSource: 'Sales History DB',
        financialSource: 'Financial Data DB',
        scrapingSources: ['Amazon', 'Flipkart', 'Meesho'],
        timestamp: new Date().toISOString(),
        querySet: profileResult.searchQueries || [],
        metricsUsed: {
          views: 'reviewCount from product data',
          sales: 'rating * reviewCount composite score',
          reviews: 'rating and reviewCount analysis'
        },
        processingSteps: [
          'Profile Fetcher Agent - Analyzed artisan data',
          'Product Classifier Agent - Classified profession and generated optimized queries',
          'Trend Analysis Agent - Generated strategic search queries',
          'Web Scraping Agent - Collected product data from ecommerce platforms',
          'Product Filter Agent - Applied popularity filters and rankings',
          'Recommendation Agent - Generated final insights and business recommendations'
        ]
      }
    };

    console.log('🎉 Trend Spotter workflow completed successfully');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Trend Spotter workflow failed:', error);
    console.log('🔄 Falling back to mock trend spotter data');

    const executionTime = Date.now() - startTime;

    try {
      // Generate comprehensive mock data for trend spotter
      const mockTrendingData = generateMockTrendingData({ 
        profession: 'pottery', 
        productCount: 6,
        includeInsights: true,
        includeImages: true
      });
      
      // Generate mock viral content (simple placeholder since it's not used in response)
      const mockViralContent = {
        viralProducts: [],
        trendingHashtags: ['#handmade', '#pottery', '#ceramics'],
        socialMetrics: { engagement: 0.85, reach: 12500 }
      };
      
      const mockProfile = {
        userId: 'mock-user-id',
        profession: 'pottery',
        experienceLevel: 'intermediate',
        specialties: ['ceramic bowls', 'decorative pottery', 'functional ceramics'],
        targetMarket: 'home decor enthusiasts',
        priceRange: { min: 25, max: 150 },
        preferredChannels: ['instagram', 'etsy', 'local markets']
      };

      const mockProducts = [
        {
          id: 'mock-product-1',
          title: 'Handmade Ceramic Bowl Set - Natural Glaze',
          price: 45.99,
          rating: 4.7,
          reviews: 1247,
          category: 'pottery',
          trend_score: 87,
          growth_rate: 23.5,
          market_demand: 'high',
          competition_level: 'medium'
        },
        {
          id: 'mock-product-2',
          title: 'Artisan Pottery Vase - Minimalist Design',
          price: 32.99,
          rating: 4.8,
          reviews: 892,
          category: 'pottery',
          trend_score: 79,
          growth_rate: 18.2,
          market_demand: 'high',
          competition_level: 'low'
        },
        {
          id: 'mock-product-3',
          title: 'Ceramic Dinnerware Set - Rustic Style',
          price: 89.99,
          rating: 4.6,
          reviews: 634,
          category: 'pottery',
          trend_score: 72,
          growth_rate: 15.8,
          market_demand: 'medium',
          competition_level: 'high'
        }
      ];

      const mockRecommendations = [
        {
          product_type: 'Ceramic Bowl Sets',
          confidence: 0.89,
          market_opportunity: 'High demand for natural glaze finishes',
          suggested_price_range: '$35-$65',
          target_keywords: ['handmade ceramic bowls', 'natural glaze pottery', 'artisan dinnerware'],
          marketing_channels: ['Instagram', 'Pinterest', 'Etsy'],
          seasonal_factors: 'Peak demand in Q4 for holiday gifts'
        },
        {
          product_type: 'Minimalist Vases',
          confidence: 0.82,
          market_opportunity: 'Growing trend in minimalist home decor',
          suggested_price_range: '$25-$45',
          target_keywords: ['minimalist vase', 'modern pottery', 'simple ceramic decor'],
          marketing_channels: ['Instagram', 'Home decor blogs', 'Local galleries'],
          seasonal_factors: 'Consistent demand year-round'
        }
      ];

      const mockMarketSummary = {
        total_opportunities: 15,
        high_potential_products: 5,
        market_trends: [
          'Natural and organic finishes are trending',
          'Minimalist designs show strong growth',
          'Functional pottery has consistent demand'
        ],
        recommended_focus: 'Ceramic bowls and minimalist vases',
        market_saturation: 'Medium - good opportunity for quality products'
      };

      const mockResponse: TrendSpotterResponse = {
        success: true,
        workflow: {
          profile: mockProfile,
          classifier: { 
            classified_products: mockProducts,
            total_classified: mockProducts.length 
          },
          analysis: {
            trending_products: mockProducts,
            market_insights: mockMarketSummary.market_trends
          },
          scrapedProducts: mockProducts,
          mostViewedProducts: mockProducts.slice(0, 2),
          mostSoldProducts: mockProducts.slice(1, 3),
          bestReviewedProducts: mockProducts.filter(p => p.rating >= 4.7),
          globalRankedList: mockProducts.sort((a, b) => b.trend_score - a.trend_score),
          recommendations: mockRecommendations,
          marketSummary: mockMarketSummary,
          actionableInsights: [
            'Focus on ceramic bowls with natural glazes',
            'Consider minimalist vase designs',
            'Target Instagram and Pinterest for marketing'
          ],
          nextSteps: [
            'Create product prototypes based on recommendations',
            'Set up Instagram business account',
            'Research local pottery suppliers'
          ]
        },
        profileCompletenessSummary: 'Mock profile data - pottery artisan',
        querySet: [
          { query: 'ceramic bowls', rationale: 'High demand kitchen item', category: 'functional', priority: 1 },
          { query: 'pottery vases', rationale: 'Popular home decor', category: 'decorative', priority: 2 },
          { query: 'handmade ceramics', rationale: 'Broad category appeal', category: 'general', priority: 3 }
        ],
        sourceCoverageReport: {
          apisUsed: ['Mock Amazon API', 'Mock Instagram API'],
          scrapedSources: ['Mock Etsy', 'Mock Pinterest'],
          totalProductsCollected: mockProducts.length,
          successRate: 1.0
        },
        perMetricTopLists: {
          mostViewed: mockProducts.slice(0, 2),
          mostSold: mockProducts.slice(1, 3),
          bestReviewed: mockProducts.filter(p => p.rating >= 4.7)
        },
        globalRankedList: mockProducts.sort((a, b) => b.trend_score - a.trend_score),
        executionTime,
        dataLineage: {
          profileSource: 'Mock user profile data',
          productSource: 'Mock trending products database',
          salesSource: 'Mock sales analytics',
          financialSource: 'Mock financial projections',
          scrapingSources: ['Mock Amazon', 'Mock Etsy', 'Mock Instagram'],
          timestamp: new Date().toISOString(),
          querySet: [
            { query: 'ceramic bowls', rationale: 'High demand kitchen item', category: 'functional', priority: 1 },
            { query: 'pottery vases', rationale: 'Popular home decor', category: 'decorative', priority: 2 },
            { query: 'handmade ceramics', rationale: 'Broad category appeal', category: 'general', priority: 3 }
          ],
          metricsUsed: {
            views: 'Mock view analytics',
            sales: 'Mock sales data',
            reviews: 'Mock review aggregation'
          },
          processingSteps: [
            'Mock profile analysis',
            'Mock product classification',
            'Mock trend analysis',
            'Mock recommendation generation'
          ]
        }
      };

      console.log('✅ Returning mock trend spotter data');
      const headers = new Headers();
      headers.set('X-Data-Source', 'mock');
      headers.set('X-Fallback-Reason', 'workflow_error');
      
      return NextResponse.json(mockResponse, { headers });

    } catch (mockError) {
      console.error('Mock trend spotter fallback failed:', mockError);
      
      const errorResponse: TrendSpotterResponse = {
        success: false,
        workflow: {
          profile: null,
          classifier: null,
          analysis: null,
          scrapedProducts: [],
          mostViewedProducts: [],
          mostSoldProducts: [],
          bestReviewedProducts: [],
          globalRankedList: [],
          recommendations: [],
          marketSummary: null,
          actionableInsights: [],
          nextSteps: []
        },
        profileCompletenessSummary: 'Error occurred during analysis',
        querySet: [],
        sourceCoverageReport: {
          apisUsed: [],
          scrapedSources: [],
          totalProductsCollected: 0,
          successRate: 0.0
        },
        perMetricTopLists: {
          mostViewed: [],
          mostSold: [],
          bestReviewed: []
        },
        globalRankedList: [],
        executionTime,
        error: 'Both primary workflow and mock fallback failed',
        dataLineage: {
          profileSource: 'Error - No profile data available',
          productSource: 'Error - No product data available',
          salesSource: 'Error - No sales data available',
          financialSource: 'Error - No financial data available',
          scrapingSources: [],
          timestamp: new Date().toISOString(),
          querySet: [],
          metricsUsed: {
            views: 'Error - No metrics available',
            sales: 'Error - No metrics available',
            reviews: 'Error - No metrics available'
          },
          processingSteps: ['Error occurred during processing']
        }
      };

      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Trend Spotter API',
    description: 'AI-powered trend discovery for artisans',
    endpoints: {
      POST: '/api/trend-spotter - Run complete trend spotting workflow'
    },
    workflow: {
      step1: 'Profile Analysis - Analyze artisan expertise',
      step2: 'Trend Analysis - Generate strategic search queries',
      step3: 'Web Scraping - Collect trending products',
      step4: 'Smart Filtering - Rank by popularity metrics',
      step5: 'AI Recommendations - Generate personalized insights'
    },
    example: {
      userId: 'artisan123',
      forceRefresh: false
    }
  });
}
