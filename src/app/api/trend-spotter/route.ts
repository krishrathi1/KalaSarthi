import { NextRequest, NextResponse } from 'next/server';
import { getArtisanProfile, ProfileFetcherInput } from '@/ai/flows/trend-spotter-profile-agent';
import { classifyProductsForProfession, ProductClassifierInput } from '@/ai/flows/trend-spotter-classifier-agent';
import { analyzeArtisanTrends, TrendAnalysisInput } from '@/ai/flows/trend-spotter-analysis-agent';
import { ScraperAgentInput, scrapeTrendProducts } from '@/ai/flows/trend-spotter-scraper-agent';
import { FilterAgentInput, filterTrendProducts } from '@/ai/flows/trend-spotter-filter-agent';
import { generateTrendRecommendations, RecommendationAgentInput } from '@/ai/flows/trend-spotter-recommendation-agent';


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

    const executionTime = Date.now() - startTime;

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
      error: error instanceof Error ? error.message : 'Unknown error occurred',
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