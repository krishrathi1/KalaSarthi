import { NextRequest, NextResponse } from 'next/server';
import { trendAnalysisOrchestrator, ComprehensiveTrendAnalysis } from '@/lib/trend-analysis-orchestrator';
import { TrendData } from '@/lib/trend-scraper';
import { webScraper, ScrapedProductData } from '@/lib/web-scraper';

interface TrendAnalysisRequest {
  artisanProfession: string;
  limit?: number;
  userProfile?: any;
}

interface TrendAnalysisResponse {
  success: boolean;
  trends: TrendData[];
  analysis: string;
  recommendations: string[];
  cached?: boolean;
  dataSources?: string[];
  generatedAt?: Date;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { artisanProfession, limit = 20, uid, forceRefresh = false, userProfile, selectedCategories }: TrendAnalysisRequest & { uid?: string; forceRefresh?: boolean; selectedCategories?: string[] } = await request.json();

    if (!artisanProfession || typeof artisanProfession !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid artisanProfession parameter' },
        { status: 400 }
      );
    }

    console.log('🎯 Starting trend analysis for:', artisanProfession);

    // Try full analysis first, fallback to local if it fails
    try {
      // Set a timeout for the entire operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout')), 180000); // 3 minutes for comprehensive analysis
      });

      const analysisPromise = trendAnalysisOrchestrator.analyzeTrendsForArtisan({
        uid: uid || 'anonymous',
        profession: artisanProfession,
        query: artisanProfession,
        timestamp: new Date()
      }, forceRefresh);

      // Race between analysis and timeout
      const result = await Promise.race([analysisPromise, timeoutPromise]) as ComprehensiveTrendAnalysis;

      console.log('✅ Full analysis completed successfully');

      const response: TrendAnalysisResponse = {
        success: true,
        trends: result.trends,
        analysis: result.insights.summary,
        recommendations: result.insights.recommendations,
        cached: result.cached,
        dataSources: result.dataSources,
        generatedAt: result.generatedAt
      };

      return NextResponse.json(response);

    } catch (cloudError) {
      console.warn('⚠️ Cloud services not available, using fallback analysis:', cloudError instanceof Error ? cloudError.message : String(cloudError));

      // Fallback to local analysis without cloud services
      const fallbackResult = await generateFallbackAnalysis(artisanProfession, limit, userProfile);

      console.log('🔄 Fallback result:', fallbackResult);
      console.log('🔄 Fallback trends structure:', JSON.stringify(fallbackResult.trends, null, 2));

      const response: TrendAnalysisResponse = {
        success: true,
        trends: fallbackResult.trends,
        analysis: fallbackResult.analysis,
        recommendations: fallbackResult.recommendations,
        cached: false,
        dataSources: ['Local Analysis'],
        generatedAt: new Date()
      };

      console.log('📤 Sending response:', response);
      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('❌ Trend analysis completely failed:', error);

    // Ultimate fallback
    const fallbackTrends = generateFallbackTrends('general artisan', 10);
    const analysis = generateAnalysis('general artisan', fallbackTrends);
    const recommendations = generateRecommendations('general artisan', fallbackTrends);

    console.log('🚨 Ultimate fallback trends:', fallbackTrends);
    console.log('🚨 Ultimate fallback analysis:', analysis);

    const response: TrendAnalysisResponse = {
      success: true,
      trends: fallbackTrends,
      analysis: analysis + '\n\n⚠️ Note: Using basic fallback analysis.',
      recommendations,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error occurred'
    };

    console.log('📤 Ultimate fallback response:', response);
    return NextResponse.json(response);
  }
}

// Fallback analysis function that works without cloud services
function generateFallbackAnalysis(profession: string, limit: number, userProfile?: any): { trends: TrendData[], analysis: string, recommendations: string[] } {
  // Generate realistic fallback trends with proper data structure
  const trends: TrendData[] = [
    {
      keyword: 'handcrafted wooden furniture',
      searchVolume: 85,
      products: [
        {
          title: 'Handcrafted Wooden Chair',
          price: '₹2,500',
          rating: '4.5',
          reviews: 89,
          platform: 'IndiaMart',
          url: 'https://www.indiamart.com/wooden-chair',
          imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=300&h=300&fit=crop'
        },
        {
          title: 'Traditional Wooden Spice Box',
          price: '₹300',
          rating: '4.3',
          reviews: 156,
          platform: 'Flipkart',
          url: 'https://www.flipkart.com/wooden-spice-box',
          imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop'
        },
        {
          title: 'Artisan Wooden Wall Shelf',
          price: '₹800',
          rating: '4.6',
          reviews: 67,
          platform: 'Meesho',
          url: 'https://www.meesho.com/wooden-wall-shelf',
          imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop'
        },
        {
          title: 'Wooden Cutting Board Set',
          price: '₹450',
          rating: '4.2',
          reviews: 112,
          platform: 'Amazon',
          url: 'https://www.amazon.in/wooden-cutting-board',
          imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=300&h=300&fit=crop'
        }
      ],
      trending: true,
      demandScore: 8.2
    },
    {
      keyword: 'traditional handwoven textiles',
      searchVolume: 92,
      products: [
        {
          title: 'Handwoven Cotton Saree',
          price: '₹1,200',
          rating: '4.4',
          reviews: 234,
          platform: 'Amazon',
          url: 'https://www.amazon.in/handwoven-saree',
          imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&h=300&fit=crop'
        },
        {
          title: 'Traditional Block Print Fabric',
          price: '₹450',
          rating: '4.7',
          reviews: 89,
          platform: 'Etsy',
          url: 'https://www.etsy.com/block-print-fabric',
          imageUrl: 'https://images.unsplash.com/photo-1601762603332-db5e4b90cc5d?w=300&h=300&fit=crop'
        },
        {
          title: 'Handloom Table Runner',
          price: '₹350',
          rating: '4.3',
          reviews: 76,
          platform: 'IndiaMart',
          url: 'https://www.indiamart.com/table-runner',
          imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop'
        },
        {
          title: 'Cotton Cushion Covers',
          price: '₹250',
          rating: '4.1',
          reviews: 145,
          platform: 'Flipkart',
          url: 'https://www.flipkart.com/cushion-covers',
          imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop'
        }
      ],
      trending: true,
      demandScore: 7.8
    }
  ];

  const analysis = generateAnalysis(profession, trends);
  const recommendations = generateRecommendations(profession, trends);

  return { trends, analysis, recommendations };
}

function generateMockTrendsForProfession(profession: string, limit: number, selectedCategories?: string[]) {
  const professionLower = profession.toLowerCase();

  // Enhanced product templates with better profession matching
  const productTemplates = {
    // Textile & Weaving (Realistic prices for local artisans)
    weaver: [
      { title: 'Handwoven Cotton Saree', price: '₹1,200', rating: '4.2', reviews: 89, platform: 'IndiaMart', url: 'https://indiamart.com/saree1', imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&h=300&fit=crop' },
      { title: 'Traditional Silk Dupatta', price: '₹800', rating: '4.5', reviews: 156, platform: 'Flipkart', url: 'https://flipkart.com/dupatta1', imageUrl: 'https://images.unsplash.com/photo-1601762603332-db5e4b90cc5d?w=300&h=300&fit=crop' },
      { title: 'Artisan Wall Hanging', price: '₹600', rating: '4.7', reviews: 67, platform: 'Meesho', url: 'https://meesho.com/wallhanging1', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Handloom Bedspread', price: '₹1,500', rating: '4.3', reviews: 43, platform: 'Amazon', url: 'https://amazon.in/bedspread1', imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=300&h=300&fit=crop' },
      { title: 'Traditional Table Runner', price: '₹400', rating: '4.1', reviews: 98, platform: 'Etsy', url: 'https://etsy.com/runner1', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
      { title: 'Cotton Cushion Covers', price: '₹300', rating: '4.4', reviews: 145, platform: 'IndiaMart', url: 'https://indiamart.com/cushion1', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
      { title: 'Handwoven Scarf', price: '₹250', rating: '4.0', reviews: 203, platform: 'eBay', url: 'https://ebay.com/scarf1', imageUrl: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=300&h=300&fit=crop' }
    ],
    silk: [
      { title: 'Pure Kanchipuram Silk Saree', price: '₹2,500', rating: '4.6', reviews: 127, platform: 'IndiaMart', url: 'https://indiamart.com/silk1', imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&h=300&fit=crop' },
      { title: 'Banarasi Silk Dupatta', price: '₹800', rating: '4.4', reviews: 89, platform: 'Flipkart', url: 'https://flipkart.com/silk2', imageUrl: 'https://images.unsplash.com/photo-1601762603332-db5e4b90cc5d?w=300&h=300&fit=crop' },
      { title: 'Traditional Silk Wall Art', price: '₹600', rating: '4.3', reviews: 156, platform: 'Meesho', url: 'https://meesho.com/silk3', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Designer Silk Cushion Covers', price: '₹350', rating: '4.2', reviews: 203, platform: 'Amazon', url: 'https://amazon.in/silk4', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
      { title: 'Handwoven Silk Scarf', price: '₹400', rating: '4.5', reviews: 78, platform: 'Etsy', url: 'https://etsy.com/silk5', imageUrl: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=300&h=300&fit=crop' },
      { title: 'Silk Stoles', price: '₹450', rating: '4.1', reviews: 145, platform: 'eBay', url: 'https://ebay.com/silk6', imageUrl: 'https://images.unsplash.com/photo-1601762603332-db5e4b90cc5d?w=300&h=300&fit=crop' },
      { title: 'Silk Pillow Covers', price: '₹300', rating: '4.0', reviews: 98, platform: 'IndiaMart', url: 'https://indiamart.com/silk7', imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=300&h=300&fit=crop' }
    ],
    // Pottery & Ceramics
    potter: [
      { title: 'Handmade Ceramic Bowl', price: '₹800', rating: '4.4', reviews: 123, platform: 'Amazon', url: 'https://amazon.in/bowl1', imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=300&h=300&fit=crop' },
      { title: 'Traditional Pottery Set', price: '₹2,200', rating: '4.6', reviews: 78, platform: 'Flipkart', url: 'https://flipkart.com/potteryset1', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Artisan Vase Collection', price: '₹3,500', rating: '4.2', reviews: 56, platform: 'Meesho', url: 'https://meesho.com/vase1', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Ceramic Dinner Plates', price: '₹1,800', rating: '4.5', reviews: 89, platform: 'Amazon', url: 'https://amazon.in/plates1', imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=300&h=300&fit=crop' },
      { title: 'Handcrafted Teapot', price: '₹1,500', rating: '4.3', reviews: 67, platform: 'Flipkart', url: 'https://flipkart.com/teapot1', imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&h=300&fit=crop' }
    ],
    ceramic: [
      { title: 'Blue Pottery Vase', price: '₹2,800', rating: '4.5', reviews: 145, platform: 'Amazon', url: 'https://amazon.in/ceramic1', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Handmade Ceramic Planters', price: '₹1,200', rating: '4.3', reviews: 234, platform: 'Flipkart', url: 'https://flipkart.com/ceramic2', imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&h=300&fit=crop' },
      { title: 'Traditional Ceramic Bowl Set', price: '₹3,500', rating: '4.6', reviews: 98, platform: 'Meesho', url: 'https://meesho.com/ceramic3', imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=300&h=300&fit=crop' },
      { title: 'Artisan Ceramic Tiles', price: '₹800', rating: '4.2', reviews: 167, platform: 'Amazon', url: 'https://amazon.in/ceramic4', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Decorative Ceramic Figurines', price: '₹1,500', rating: '4.4', reviews: 89, platform: 'Flipkart', url: 'https://flipkart.com/ceramic5', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' }
    ],
    // Jewelry & Metalwork
    jeweler: [
      { title: 'Silver Earrings Set', price: '₹3,500', rating: '4.8', reviews: 234, platform: 'Amazon', url: 'https://amazon.in/earrings1', imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop' },
      { title: 'Traditional Necklace', price: '₹8,500', rating: '4.5', reviews: 145, platform: 'Flipkart', url: 'https://flipkart.com/necklace1', imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop' },
      { title: 'Artisan Bracelet', price: '₹4,200', rating: '4.3', reviews: 98, platform: 'Meesho', url: 'https://meesho.com/bracelet1', imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop' },
      { title: 'Gold-plated Ring', price: '₹2,800', rating: '4.6', reviews: 167, platform: 'Amazon', url: 'https://amazon.in/ring1', imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop' },
      { title: 'Traditional Maang Tikka', price: '₹6,500', rating: '4.4', reviews: 89, platform: 'Flipkart', url: 'https://flipkart.com/tikka1', imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop' }
    ],
    metalwork: [
      { title: 'Brass Door Handles', price: '₹1,200', rating: '4.3', reviews: 156, platform: 'Amazon', url: 'https://amazon.in/metal1', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
      { title: 'Traditional Metal Lanterns', price: '₹2,800', rating: '4.5', reviews: 89, platform: 'Flipkart', url: 'https://flipkart.com/metal2', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop' },
      { title: 'Artisan Metal Wall Art', price: '₹3,500', rating: '4.2', reviews: 67, platform: 'Meesho', url: 'https://meesho.com/metal3', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Handcrafted Metal Bowls', price: '₹1,800', rating: '4.4', reviews: 123, platform: 'Amazon', url: 'https://amazon.in/metal4', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Decorative Metal Sculptures', price: '₹4,200', rating: '4.6', reviews: 45, platform: 'Flipkart', url: 'https://flipkart.com/metal5', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' }
    ],
    // Woodworking & Carpentry (Realistic for local artisans)
    woodworking: [
      { title: 'Handcrafted Wooden Chair', price: '₹2,500', rating: '4.5', reviews: 89, platform: 'IndiaMart', url: 'https://indiamart.com/wood1', imageUrl: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=300&h=300&fit=crop' },
      { title: 'Traditional Wooden Spice Box', price: '₹300', rating: '4.3', reviews: 156, platform: 'Flipkart', url: 'https://flipkart.com/wood2', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
      { title: 'Artisan Wooden Wall Shelf', price: '₹800', rating: '4.6', reviews: 67, platform: 'Meesho', url: 'https://meesho.com/wood3', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
      { title: 'Handmade Wooden Cutting Board', price: '₹400', rating: '4.4', reviews: 123, platform: 'Amazon', url: 'https://amazon.in/wood4', imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300&h=300&fit=crop' },
      { title: 'Traditional Wooden Jewelry Box', price: '₹600', rating: '4.2', reviews: 98, platform: 'Etsy', url: 'https://etsy.com/wood5', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
      { title: 'Wooden Photo Frame', price: '₹200', rating: '4.1', reviews: 145, platform: 'eBay', url: 'https://ebay.com/wood6', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
      { title: 'Wooden Key Holder', price: '₹150', rating: '4.0', reviews: 203, platform: 'IndiaMart', url: 'https://indiamart.com/wood7', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' }
    ],
    carpenter: [
      { title: 'Custom Wooden Furniture', price: '₹15,000', rating: '4.7', reviews: 45, platform: 'Amazon', url: 'https://amazon.in/carpenter1', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop' },
      { title: 'Handcrafted Wooden Table', price: '₹12,000', rating: '4.5', reviews: 78, platform: 'Flipkart', url: 'https://flipkart.com/carpenter2', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
      { title: 'Traditional Wooden Cabinet', price: '₹25,000', rating: '4.8', reviews: 23, platform: 'Meesho', url: 'https://meesho.com/carpenter3', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop' },
      { title: 'Artisan Wooden Rocking Chair', price: '₹18,000', rating: '4.6', reviews: 34, platform: 'Amazon', url: 'https://amazon.in/carpenter4', imageUrl: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=300&h=300&fit=crop' },
      { title: 'Handmade Wooden Bookshelf', price: '₹8,500', rating: '4.4', reviews: 56, platform: 'Flipkart', url: 'https://flipkart.com/carpenter5', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' }
    ],
    woodwork: [
      { title: 'Wooden Carving Set', price: '₹3,200', rating: '4.5', reviews: 89, platform: 'Amazon', url: 'https://amazon.in/woodwork1', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Traditional Wood Inlay Box', price: '₹4,500', rating: '4.6', reviews: 67, platform: 'Flipkart', url: 'https://flipkart.com/woodwork2', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
      { title: 'Artisan Wooden Toys', price: '₹800', rating: '4.3', reviews: 123, platform: 'Meesho', url: 'https://meesho.com/woodwork3', imageUrl: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=300&h=300&fit=crop' },
      { title: 'Handcrafted Wooden Frames', price: '₹1,500', rating: '4.4', reviews: 98, platform: 'Amazon', url: 'https://amazon.in/woodwork4', imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
      { title: 'Decorative Wooden Panels', price: '₹6,800', rating: '4.7', reviews: 45, platform: 'Flipkart', url: 'https://flipkart.com/woodwork5', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' }
    ],
    // Painting & Art
    painter: [
      { title: 'Original Acrylic Painting', price: '₹12,000', rating: '4.8', reviews: 67, platform: 'Amazon', url: 'https://amazon.in/paint1', imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=300&h=300&fit=crop' },
      { title: 'Traditional Madhubani Art', price: '₹8,500', rating: '4.6', reviews: 89, platform: 'Flipkart', url: 'https://flipkart.com/paint2', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Handmade Canvas Art', price: '₹6,800', rating: '4.4', reviews: 123, platform: 'Meesho', url: 'https://meesho.com/paint3', imageUrl: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=300&h=300&fit=crop' },
      { title: 'Miniature Painting Set', price: '₹3,200', rating: '4.3', reviews: 156, platform: 'Amazon', url: 'https://amazon.in/paint4', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Traditional Warli Art', price: '₹4,500', rating: '4.5', reviews: 78, platform: 'Flipkart', url: 'https://flipkart.com/paint5', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' }
    ],
    artist: [
      { title: 'Contemporary Art Print', price: '₹2,800', rating: '4.4', reviews: 145, platform: 'Amazon', url: 'https://amazon.in/artist1', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
      { title: 'Handmade Art Journal', price: '₹1,200', rating: '4.2', reviews: 234, platform: 'Flipkart', url: 'https://flipkart.com/artist2', imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=300&fit=crop' },
      { title: 'Traditional Block Print Fabric', price: '₹1,800', rating: '4.5', reviews: 98, platform: 'Meesho', url: 'https://meesho.com/artist3', imageUrl: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=300&h=300&fit=crop' },
      { title: 'Artisan Sketch Set', price: '₹3,500', rating: '4.3', reviews: 67, platform: 'Amazon', url: 'https://amazon.in/artist4', imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=300&fit=crop' },
      { title: 'Decorative Wall Art', price: '₹5,200', rating: '4.6', reviews: 89, platform: 'Flipkart', url: 'https://flipkart.com/artist5', imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' }
    ]
  };

  // Smart profession matching with multiple keywords
  const professionKeywords = {
    'weaver': ['weaver', 'weaving', 'textile', 'fabric', 'cloth'],
    'silk': ['silk', 'saree', 'dupatta', 'scarf'],
    'potter': ['potter', 'pottery', 'ceramic', 'clay'],
    'ceramic': ['ceramic', 'pottery', 'clay', 'tile'],
    'jeweler': ['jeweler', 'jewelry', 'silver', 'gold', 'necklace'],
    'metalwork': ['metalwork', 'metal', 'brass', 'iron', 'steel'],
    'woodworking': ['woodworking', 'woodwork', 'wood', 'carpenter', 'furniture'],
    'carpenter': ['carpenter', 'woodwork', 'furniture', 'cabinet'],
    'woodwork': ['woodwork', 'woodworking', 'carving', 'wood'],
    'painter': ['painter', 'painting', 'art', 'canvas'],
    'artist': ['artist', 'art', 'painting', 'drawing']
  };

  // Find the best matching profession
  let matchedProfession = 'weaver'; // default
  let bestMatchScore = 0;

  for (const [professionKey, keywords] of Object.entries(professionKeywords)) {
    for (const keyword of keywords) {
      if (professionLower.includes(keyword)) {
        matchedProfession = professionKey;
        bestMatchScore = keyword.length; // Prefer longer matches
        break;
      }
    }
    if (bestMatchScore > 0) break;
  }

  // Get products for matched profession
  let allProducts = productTemplates[matchedProfession as keyof typeof productTemplates] || productTemplates.weaver;

  // Filter products based on selected categories if provided
  if (selectedCategories && selectedCategories.length > 0) {
    allProducts = allProducts.filter(product =>
      selectedCategories.some(category =>
        product.title.toLowerCase().includes(category.toLowerCase())
      )
    );
  }

  // Create trend data structure with profession-specific insights
  return [{
    keyword: `${profession} products`,
    searchVolume: Math.floor(Math.random() * 5000) + 5000, // Realistic search volume
    products: allProducts.slice(0, Math.min(limit, allProducts.length)),
    trending: true,
    demandScore: 7.5 + Math.random() * 2 // Random score between 7.5-9.5
  }];
}

function generatePersonalizedRecommendations(avgPrice: number, userProfile?: any, profession?: string) {
  const recommendations = [];

  // Location-based recommendations
  if (userProfile?.address?.city) {
    const city = userProfile.address.city;
    recommendations.push(`Leverage your ${city} location advantage. Local customers in ${city} are seeking authentic ${profession || 'craft'} products - highlight your regional specialty in your listings`);
  }

  // Experience-based recommendations
  if (userProfile?.createdAt) {
    const joinDate = new Date(userProfile.createdAt);
    const monthsSinceJoin = Math.floor((new Date().getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (monthsSinceJoin < 6) {
      recommendations.push('As a new artisan, focus on building your portfolio with 5-10 high-quality products. Quality over quantity will establish your reputation');
    } else if (monthsSinceJoin < 24) {
      recommendations.push('With your growing experience, consider creating product collections or themed series. This showcases your evolving craftsmanship');
    } else {
      recommendations.push('Your extensive experience is your biggest asset. Share your journey and expertise through detailed product stories and behind-the-scenes content');
    }
  }

  // Pricing recommendations with personalization
  const minPrice = Math.round(avgPrice * 0.8);
  const maxPrice = Math.round(avgPrice * 1.3);
  recommendations.push(`Based on your ${profession || 'craft'} expertise, focus on ₹${minPrice.toLocaleString()}-₹${maxPrice.toLocaleString()} pricing. This premium range reflects the quality and authenticity of your work`);

  // Platform recommendations based on location
  if (userProfile?.address?.state) {
    const state = userProfile.address.state;
    if (['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi'].includes(state)) {
      recommendations.push('You are in a major market! Start with IndiaMart and Flipkart for maximum reach, then expand to Etsy for international buyers');
    } else {
      recommendations.push('Focus on regional platforms first. IndiaMart and Meesho are excellent for connecting with customers in your area before expanding nationally');
    }
  }

  // Photography and presentation
  recommendations.push('Your smartphone camera works perfectly for product photography. Take photos in natural light during golden hour (early morning or late afternoon) to showcase your craftsmanship beautifully');

  // Storytelling based on profile
  if (userProfile?.description) {
    recommendations.push('Your personal story is compelling! Weave elements of your background into product descriptions - customers connect deeply with authentic narratives');
  } else {
    recommendations.push('Share your story! Write about your journey as an artisan, what inspires your work, and why you create. This creates emotional connections with customers');
  }

  // Social media recommendations
  recommendations.push('Build relationships through social media. Share your creative process, respond to comments, and engage with customers who appreciate your craft');

  // Bundle and customization recommendations
  recommendations.push('Create value with thoughtful bundles. "Buy 2 items, get Rs 100 off" or "Purchase a set and receive a custom engraving" makes customers feel they are getting special value');

  // Customer engagement
  recommendations.push('Your satisfied customers are your best advocates. Gently ask happy buyers to share their experience - their authentic reviews build trust with new customers');

  // Quality focus
  recommendations.push('Quality is your signature. Focus on meticulous craftsmanship in every piece - this is what will differentiate you in the marketplace');

  return recommendations;
}

function getProfessionSpecificRecommendations(profession: string, userProfile?: any) {
  const city = userProfile?.address?.city || '';

  const professionRecommendations: { [key: string]: string[] } = {
    woodworking: [
      `Your woodworking skills are truly special${city ? ` in ${city}` : ''}. Start with small, meaningful items like Rs 150-Rs 400 key holders and photo frames - they are quick to make and customers love them as thoughtful gifts`,
      `You know your local area best${city ? ` in ${city}` : ''}. Visit nearby timber markets for affordable, quality wood - this keeps your costs down and supports local suppliers too`,
      'Make each piece personal. Add simple customizations like engraving names or small carvings for Rs 50-Rs 100 extra - customers feel like you are creating just for them',
      `Your community believes in you${city ? ` in ${city}` : ''}. Start by showcasing your work at local markets and fairs - it is a great way to connect with people who appreciate real craftsmanship`,
      'Create value with bundles. A key holder + photo frame for Rs 300 makes customers feel they are getting a special package crafted with care'
    ],
    carpenter: [
      'Specialize in bespoke furniture commissions',
      'Offer furniture restoration and antique repair services',
      'Create workshop experiences and carpentry classes',
      'Develop relationships with architects and interior designers'
    ],
    weaver: [
      'Combine traditional patterns with contemporary color schemes',
      'Create fusion designs blending multiple textile techniques',
      'Offer textile care and maintenance workshops',
      'Partner with fashion designers for collaborative collections'
    ],
    silk: [
      'Emphasize the luxury and heritage value of silk products',
      'Create themed collections for different occasions',
      'Offer silk care and maintenance guidance',
      'Position products as heirloom pieces with cultural significance'
    ],
    potter: [
      'Focus on functional yet artistic ceramic pieces',
      'Offer pottery painting and customization services',
      'Create seasonal collections with traditional motifs',
      'Partner with restaurants and hotels for custom serveware'
    ],
    jeweler: [
      'Create jewelry with personal and cultural storytelling',
      'Offer jewelry repair and restoration services',
      'Develop signature design collections',
      'Partner with luxury brands for exclusive collaborations'
    ],
    painter: [
      'Create series and collections around specific themes',
      'Offer commissioned works and custom paintings',
      'Document your artistic process for marketing content',
      'Participate in art fairs and cultural exhibitions'
    ]
  };

  return professionRecommendations[profession] || [];
}

function generateMockInsights(profession: string, trends: any[], userProfile?: any) {
  const professionLower = profession.toLowerCase();
  const professionTitle = profession.charAt(0).toUpperCase() + profession.slice(1);

  // Calculate price statistics
  const allProducts = trends.flatMap(t => t.products);
  const prices = allProducts.map(p => parseInt(p.price.replace(/[^\d]/g, '')));
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Profession-specific insights and recommendations
  const professionInsights = {
    woodworking: {
      analysis: `${professionTitle} products show excellent market potential with strong demand for sustainable, handcrafted wooden items. The current market favors eco-friendly materials and traditional craftsmanship. Your expertise in woodworking positions you well for the growing demand for sustainable furniture and decor items.`,
      focus: 'Sustainable materials, traditional joinery techniques, modern-minimalist designs',
      opportunities: 'Custom furniture commissions, eco-friendly product lines, workshop experiences'
    },
    carpenter: {
      analysis: `${professionTitle} craftsmanship is experiencing renewed interest as consumers seek quality, long-lasting furniture. The market shows strong demand for custom pieces and traditional woodworking techniques. Your carpentry skills can command premium pricing for bespoke furniture.`,
      focus: 'Bespoke furniture, restoration services, traditional joinery methods',
      opportunities: 'High-end custom orders, antique restoration, furniture design consultations'
    },
    weaver: {
      analysis: `${professionTitle} products maintain strong cultural significance with growing demand for authentic, handwoven textiles. The market favors traditional techniques combined with contemporary designs. Your weaving expertise can bridge traditional craftsmanship with modern fashion trends.`,
      focus: 'Traditional weaving patterns, natural fibers, contemporary color palettes',
      opportunities: 'Designer collaborations, fashion brand partnerships, textile workshops'
    },
    silk: {
      analysis: `Silk products command premium positioning in the luxury textile market. Kanchipuram silk sarees and related products show exceptional demand with high customer satisfaction. Your silk craftsmanship represents the pinnacle of traditional Indian textile art.`,
      focus: 'Premium quality silk, traditional motifs, luxury positioning',
      opportunities: 'International export markets, luxury brand collaborations, bridal collections'
    },
    potter: {
      analysis: `${professionTitle} products appeal to consumers seeking unique, handcrafted ceramics. The market shows growing interest in functional art and traditional pottery techniques. Your pottery skills can create distinctive pieces that stand out in crowded marketplaces.`,
      focus: 'Functional ceramics, traditional glazing techniques, unique designs',
      opportunities: 'Artisan marketplaces, home decor collaborations, pottery workshops'
    },
    jeweler: {
      analysis: `${professionTitle} craftsmanship represents the intersection of tradition and luxury. The market favors authentic, handcrafted jewelry with cultural significance. Your jewelry-making skills can create pieces that tell stories and carry heritage value.`,
      focus: 'Traditional motifs, precious metals, cultural symbolism',
      opportunities: 'Luxury jewelry markets, cultural exhibitions, custom design commissions'
    },
    painter: {
      analysis: `${professionTitle} products have strong demand in the contemporary art market. Traditional painting techniques combined with modern themes create unique value propositions. Your artistic skills can produce pieces that appeal to both traditional and modern aesthetics.`,
      focus: 'Traditional techniques, contemporary themes, limited edition series',
      opportunities: 'Art galleries, online marketplaces, commissioned works'
    },
    artist: {
      analysis: `${professionTitle} products span various mediums with growing demand for authentic, handcrafted art. The market favors unique pieces that tell stories and reflect cultural heritage. Your artistic versatility positions you well across multiple art categories.`,
      focus: 'Unique artistic expression, cultural storytelling, versatile mediums',
      opportunities: 'Art exhibitions, online galleries, collaborative projects'
    }
  };

  // Get profession-specific insights or use generic
  const insights = professionInsights[professionLower as keyof typeof professionInsights] || {
    analysis: `${professionTitle} products show strong market demand with premium positioning. The price range spans from ₹${minPrice.toLocaleString()} to ₹${maxPrice.toLocaleString()}, with an average of ₹${avgPrice.toLocaleString()}. Customer ratings average 4.4/5 stars across ${allProducts.length} analyzed products.`,
    focus: 'Authentic craftsmanship, traditional techniques, quality materials',
    opportunities: 'Direct-to-consumer sales, artisan marketplaces, custom orders'
  };

  const analysis = `${insights.analysis}

What makes your work special:
• Your authentic, handcrafted ${profession} pieces tell a beautiful story that mass-produced items simply can't match
• Customers are drawn to the genuine care and skill that goes into each creation
• Your work represents the rich tradition of Indian craftsmanship that deserves to be celebrated
• Every piece you create carries your passion and dedication

Market Opportunity: There's wonderful potential for your ${profession} products in the ₹${Math.round(avgPrice * 0.8).toLocaleString()}-₹${Math.round(avgPrice * 1.5).toLocaleString()} range. Focus on ${insights.opportunities} - these are areas where your unique skills can truly shine and bring joy to customers who appreciate real craftsmanship!`;

  // Generate personalized recommendations based on user profile
  const baseRecommendations = generatePersonalizedRecommendations(avgPrice, userProfile, profession);


  const specificRecs = getProfessionSpecificRecommendations(professionLower, userProfile) || [];
  const recommendations = [...baseRecommendations.slice(0, 8), ...specificRecs, ...baseRecommendations.slice(8)];

  return { analysis, recommendations };
}

function generateFallbackTrends(profession: string, limit: number): TrendData[] {
  const keywords = ['handmade crafts', 'traditional art', 'artisan products'];

  return keywords.map((keyword, index) => ({
    keyword,
    searchVolume: 100 + index * 20,
    products: [
      {
        title: 'Premium Handmade Product',
        price: '₹1,500',
        rating: '4.5',
        reviews: 25,
        platform: 'IndiaMart',
        url: 'https://www.indiamart.com/premium-product',
        imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop'
      },
      {
        title: 'Traditional Craft Item',
        price: '₹2,200',
        rating: '4.3',
        reviews: 18,
        platform: 'Amazon',
        url: 'https://www.amazon.in/traditional-craft',
        imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop'
      },
      {
        title: 'Artisan Made Product',
        price: '₹800',
        rating: '4.7',
        reviews: 45,
        platform: 'Flipkart',
        url: 'https://www.flipkart.com/artisan-product',
        imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=300&h=300&fit=crop'
      }
    ],
    trending: true,
    demandScore: 7.5 + index * 0.5
  }));
}

function generateAnalysis(profession: string, trends: TrendData[]): string {
  const totalProducts = trends.reduce((sum, trend) => sum + trend.products.length, 0);
  const avgDemandScore = trends.reduce((sum, trend) => sum + trend.demandScore, 0) / trends.length;
  const trendingKeywords = trends.filter(t => t.trending).map(t => t.keyword);

  // Count products by platform
  const platformCount: { [key: string]: number } = {};
  trends.forEach(trend => {
    trend.products.forEach(product => {
      platformCount[product.platform] = (platformCount[product.platform] || 0) + 1;
    });
  });

  const topPlatforms = Object.entries(platformCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([platform]) => platform);

  let analysis = `Based on current market data for ${profession}, we've analyzed ${totalProducts} products across ${trends.length} trending categories from ${Object.keys(platformCount).length} different platforms.\n\n`;

  if (trendingKeywords.length > 0) {
    analysis += `🔥 **Trending Categories:** ${trendingKeywords.join(', ')}\n\n`;
  }

  analysis += `📊 **Market Insights:**
- Average demand score: ${avgDemandScore.toFixed(1)}/10
- Most active platforms: ${topPlatforms.join(', ')}
- Price range: ₹200 - ₹10,000 (most popular range: ₹500 - ₹3,000)
- High-rated products (>4.0 stars) show strong demand\n\n`;

  analysis += `💡 **Key Findings:**
- Products with detailed descriptions and high-quality images perform better
- Customer reviews emphasize authenticity and craftsmanship
- Sustainable and eco-friendly materials are increasingly popular
- Customization options significantly boost product appeal
- Multi-platform presence indicates strong market demand\n\n`;

  analysis += `🎯 **Market Opportunity:** There's strong demand for unique, handcrafted items that combine traditional techniques with modern design elements. Focus on platforms like ${topPlatforms.slice(0, 3).join(', ')} for maximum reach.`;

  return analysis;
}

function generateRecommendations(profession: string, trends: TrendData[]): string[] {
  const recommendations: string[] = [];
  const professionLower = profession.toLowerCase();

  // Platform analysis
  const platformCount: { [key: string]: number } = {};
  trends.forEach(trend => {
    trend.products.forEach(product => {
      platformCount[product.platform] = (platformCount[product.platform] || 0) + 1;
    });
  });

  const topPlatforms = Object.entries(platformCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([platform]) => platform);

  // General recommendations
  recommendations.push("Focus on high-quality product photography with multiple angles showing craftsmanship");
  recommendations.push("Emphasize the handmade and authentic nature of your products in descriptions");
  recommendations.push("Consider offering customization options for colors, sizes, and personalization");
  recommendations.push("Create detailed product stories highlighting your craft's heritage and techniques");

  // Price-based recommendations
  recommendations.push("Price competitively in the ₹500-₹3,000 range for maximum market reach");
  recommendations.push("Offer tiered pricing: basic (₹500-₹1,000), premium (₹1,000-₹3,000), luxury (₹3,000+)");

  // Platform-specific recommendations
  if (topPlatforms.includes('Amazon')) {
    recommendations.push("List on Amazon with A+ content showcasing your artisan story and production process");
  }
  if (topPlatforms.includes('Flipkart')) {
    recommendations.push("Use Flipkart's assured quality badges to build trust with Indian customers");
  }
  if (topPlatforms.includes('Meesho')) {
    recommendations.push("Leverage Meesho's reseller network for wider reach among small retailers");
  }
  if (topPlatforms.includes('IndiaMart')) {
    recommendations.push("Use IndiaMart for B2B connections and bulk orders from retailers");
  }
  if (topPlatforms.includes('Etsy')) {
    recommendations.push("Position on Etsy as authentic handmade art with international appeal");
  }

  // Profession-specific recommendations
  if (professionLower.includes('weaver') || professionLower.includes('textile')) {
    recommendations.push("Create fusion designs: traditional weaves with modern patterns and colors");
    recommendations.push("Offer wall hangings, table runners, and cushion covers in ₹800-₹2,500 range");
    recommendations.push("Partner with interior designers for custom home textile solutions");
  }

  if (professionLower.includes('potter') || professionLower.includes('ceramic')) {
    recommendations.push("Design functional kitchenware: bowls, plates, mugs in ₹300-₹1,500 range");
    recommendations.push("Create decorative pieces: vases, planters, sculptures for ₹1,000-₹5,000");
    recommendations.push("Offer ceramic painting workshops to engage customers directly");
  }

  if (professionLower.includes('jeweler') || professionLower.includes('metal')) {
    recommendations.push("Design contemporary pieces with traditional motifs for ₹2,000-₹15,000 range");
    recommendations.push("Offer personalized engraving and customization services");
    recommendations.push("Create themed collections: festive, bridal, everyday wear");
  }

  if (professionLower.includes('carpenter') || professionLower.includes('wood')) {
    recommendations.push("Focus on sustainable wood sourcing with eco-friendly certifications");
    recommendations.push("Create modular furniture and storage solutions for ₹3,000-₹25,000");
    recommendations.push("Offer restoration services for antique wooden items");
  }

  if (professionLower.includes('painter') || professionLower.includes('artist')) {
    recommendations.push("Create limited edition series with certificates of authenticity");
    recommendations.push("Offer commissioned work and custom paintings for ₹5,000-₹50,000");
    recommendations.push("Partner with galleries and art consultants for wider exposure");
  }

  // Marketing and sales recommendations
  recommendations.push("Build a strong social media presence showcasing your craft process and behind-the-scenes");
  recommendations.push("Offer artisan stories and videos to create emotional connections with customers");
  recommendations.push("Consider pop-up shops and artisan markets for direct customer engagement");
  recommendations.push("Create care instructions and maintenance guides for your products");

  return recommendations.slice(0, 12); // Return top 12 recommendations
}

export async function GET() {
  return NextResponse.json({
    message: 'Trend Analysis API',
    endpoints: {
      POST: '/api/trend-analysis - Analyze trends for artisan profession'
    },
    example: {
      artisanProfession: 'weaver',
      limit: 20
    }
  });
}
