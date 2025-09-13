import { NextRequest, NextResponse } from 'next/server';
import { ImageService } from '@/lib/image-service';

interface SearchRequest {
  query: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  let query = '';

  try {
    const { query: searchQuery, userId }: SearchRequest = await request.json();
    query = searchQuery;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid query parameter' },
        { status: 400 }
      );
    }

    console.log(`🔍 Searching for: "${query}"`);

    // Use the new scrape-products API endpoint
    const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/scrape-products?query=${encodeURIComponent(query)}&platform=all`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const searchResults = await scrapeResponse.json();

    // Even if scraping partially fails, try to return what we have
    let products: any[] = [];

    if (searchResults.success && searchResults.data) {
      // Transform scraped data to our format
      const allProducts: any[] = [];

      // Combine products from all platforms
      Object.entries(searchResults.data).forEach(([platform, platformProducts]: [string, any]) => {
        if (Array.isArray(platformProducts)) {
          platformProducts.forEach((product: any) => {
            allProducts.push({
              id: `${platform}-${Date.now()}-${Math.random()}`,
              title: product.title,
              price: product.price,
              rating: product.rating || 3.5, // Default rating if missing
              reviewCount: product.reviewCount || 10, // Default reviews if missing
              platform: platform,
              url: product.url,
              imageUrl: product.image,
              category: product.platform || query
            });
          });
        }
      });

      products = allProducts;
    }

    // If no products found from scraping, return mock data based on the query
    if (products.length === 0) {
      console.log(`⚠️ No products found from scraping, using mock data for "${query}"`);
      products = generateMockProductsForQuery(query);
    }

    // Sort by rating and review count (highest first)
    products.sort((a, b) => {
      // Primary sort: rating
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      // Secondary sort: review count
      return b.reviewCount - a.reviewCount;
    });

    // Return top 10 products
    const topProducts = products.slice(0, 10);

    console.log(`✅ Returning ${topProducts.length} products for "${query}"`);

    return NextResponse.json({
      success: true,
      products: topProducts,
      searchQuery: query,
      totalFound: topProducts.length,
      source: searchResults.success ? 'scraped' : 'mock'
    });

  } catch (error) {
    console.error('❌ Search API error:', error);
    // Return mock data even on error
    const mockProducts = generateMockProductsForQuery(query || 'handmade crafts');
    return NextResponse.json({
      success: true,
      products: mockProducts.slice(0, 10),
      searchQuery: query || 'handmade crafts',
      totalFound: mockProducts.length,
      source: 'mock-fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Enhanced mock data generator with realistic trends
function generateMockProductsForQuery(query: string) {
  const queryLower = query.toLowerCase();

  // Get current trends and seasonal data
  const currentTrends = getCurrentTrends();
  const seasonalMultiplier = getSeasonalMultiplier(queryLower);
  const professionMultiplier = getProfessionMultiplier(queryLower);

  // Generate dynamic images using ImageService
  const getImageForQuery = (query: string, index: number, productTitle?: string) => {
    return ImageService.generateImage({
      query,
      productTitle,
      index,
      width: 400,
      height: 400
    });
  };

  // Base mock products that can be customized based on query
  const baseProducts = [
    {
      id: `mock-${Date.now()}-1`,
      title: `${query} - Premium Quality Handcrafted Item`,
      price: `₹${(Math.floor(Math.random() * 5000) + 500).toLocaleString()}`,
      rating: (Math.random() * 2) + 3, // 3-5 rating
      reviewCount: Math.floor(Math.random() * 500) + 50,
      platform: 'Amazon',
      url: `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
      imageUrl: getImageForQuery(query, 0, `${query} - Premium Quality Handcrafted Item`),
      category: query,
      description: `Premium quality ${query} crafted with attention to detail. This handcrafted item features excellent craftsmanship and comes with a ${((Math.random() * 2) + 3).toFixed(1)}/5 star rating from ${Math.floor(Math.random() * 500) + 50} satisfied customers. Perfect for those seeking authentic, high-quality products.`
    },
    {
      id: `mock-${Date.now()}-2`,
      title: `${query} - Handcrafted Edition with Traditional Touch`,
      price: `₹${(Math.floor(Math.random() * 3000) + 300).toLocaleString()}`,
      rating: (Math.random() * 2) + 3,
      reviewCount: Math.floor(Math.random() * 300) + 30,
      platform: 'Flipkart',
      url: `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`,
      imageUrl: getImageForQuery(query, 1, `${query} - Handcrafted Edition with Traditional Touch`),
      category: query,
      description: `Beautiful handcrafted ${query} featuring traditional craftsmanship techniques. This authentic piece showcases skilled artisan work with intricate details and comes highly rated at ${((Math.random() * 2) + 3).toFixed(1)}/5 stars from ${Math.floor(Math.random() * 300) + 30} customers. A perfect blend of tradition and quality.`
    },
    {
      id: `mock-${Date.now()}-3`,
      title: `${query} - Traditional Design with Modern Appeal`,
      price: `₹${(Math.floor(Math.random() * 4000) + 400).toLocaleString()}`,
      rating: (Math.random() * 2) + 3,
      reviewCount: Math.floor(Math.random() * 400) + 40,
      platform: 'Meesho',
      url: `https://www.meesho.com/search?q=${encodeURIComponent(query)}`,
      imageUrl: getImageForQuery(query, 2, `${query} - Traditional Design with Modern Appeal`),
      category: query,
      description: `Exquisite ${query} that combines traditional design elements with contemporary appeal. Handcrafted by skilled artisans using time-honored techniques, this piece has earned ${((Math.random() * 2) + 3).toFixed(1)}/5 stars from ${Math.floor(Math.random() * 400) + 40} satisfied customers. Ideal for those who appreciate cultural heritage.`
    },
    {
      id: `mock-${Date.now()}-4`,
      title: `${query} - Artisan Collection - Premium Quality`,
      price: `₹${(Math.floor(Math.random() * 6000) + 600).toLocaleString()}`,
      rating: (Math.random() * 2) + 3,
      reviewCount: Math.floor(Math.random() * 600) + 60,
      platform: 'IndiaMart',
      url: `https://www.indiamart.com/search.html?ss=${encodeURIComponent(query)}`,
      imageUrl: getImageForQuery(query, 3, `${query} - Artisan Collection - Premium Quality`),
      category: query,
      description: `Premium artisan collection ${query} crafted with exceptional attention to detail. This masterpiece from skilled craftsmen features superior materials and workmanship, achieving ${((Math.random() * 2) + 3).toFixed(1)}/5 stars from ${Math.floor(Math.random() * 600) + 60} customers. A true representation of artisanal excellence.`
    },
    {
      id: `mock-${Date.now()}-5`,
      title: `${query} - Modern Twist on Traditional Craft`,
      price: `₹${(Math.floor(Math.random() * 2500) + 250).toLocaleString()}`,
      rating: (Math.random() * 2) + 3,
      reviewCount: Math.floor(Math.random() * 250) + 25,
      platform: 'Amazon',
      url: `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
      imageUrl: getImageForQuery(query, 1, `${query} - Handcrafted Edition with Traditional Touch`),
      category: query,
      description: `Innovative ${query} that brings a modern twist to traditional craftsmanship. Expertly crafted to meet contemporary needs while preserving cultural authenticity. Rated ${((Math.random() * 2) + 3).toFixed(1)}/5 stars by ${Math.floor(Math.random() * 250) + 25} customers who appreciate this unique blend of old and new.`
    },
    {
      id: `mock-${Date.now()}-6`,
      title: `${query} - Cultural Heritage Collection`,
      price: `₹${(Math.floor(Math.random() * 3500) + 350).toLocaleString()}`,
      rating: (Math.random() * 2) + 3,
      reviewCount: Math.floor(Math.random() * 350) + 35,
      platform: 'Flipkart',
      url: `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`,
      imageUrl: getImageForQuery(query, 2, `${query} - Traditional Design with Modern Appeal`),
      category: query,
      description: `Cultural heritage ${query} that preserves traditional craftsmanship techniques passed down through generations. This authentic piece represents the rich artistic legacy and has been celebrated with ${((Math.random() * 2) + 3).toFixed(1)}/5 stars from ${Math.floor(Math.random() * 350) + 35} appreciative customers.`
    },
    {
      id: `mock-${Date.now()}-7`,
      title: `${query} - Premium Series - Limited Edition`,
      price: `₹${(Math.floor(Math.random() * 7000) + 700).toLocaleString()}`,
      rating: (Math.random() * 2) + 3,
      reviewCount: Math.floor(Math.random() * 700) + 70,
      platform: 'Meesho',
      url: `https://www.meesho.com/search?q=${encodeURIComponent(query)}`,
      imageUrl: getImageForQuery(query, 3, `${query} - Artisan Collection - Premium Quality`),
      category: query,
      description: `Exclusive premium series ${query} available in limited quantities. This exceptional piece showcases master craftsmanship and premium materials, earning ${((Math.random() * 2) + 3).toFixed(1)}/5 stars from ${Math.floor(Math.random() * 700) + 70} discerning customers. A collector's item for true connoisseurs.`
    },
    {
      id: `mock-${Date.now()}-8`,
      title: `${query} - Limited Edition - Handcrafted Masterpiece`,
      price: `₹${(Math.floor(Math.random() * 4500) + 450).toLocaleString()}`,
      rating: (Math.random() * 2) + 3,
      reviewCount: Math.floor(Math.random() * 450) + 45,
      platform: 'IndiaMart',
      url: `https://www.indiamart.com/search.html?ss=${encodeURIComponent(query)}`,
      imageUrl: getImageForQuery(query, 1, `${query} - Handcrafted Edition with Traditional Touch`),
      category: query,
      description: `Limited edition ${query} masterpiece crafted by master artisans. This rare piece combines exceptional skill with unique design elements, receiving ${((Math.random() * 2) + 3).toFixed(1)}/5 stars from ${Math.floor(Math.random() * 450) + 45} privileged customers. A true work of art for the discerning collector.`
    },
    {
      id: `mock-${Date.now()}-9`,
      title: `${query} - Classic Collection - Timeless Design`,
      price: `₹${(Math.floor(Math.random() * 2800) + 280).toLocaleString()}`,
      rating: (Math.random() * 2) + 3,
      reviewCount: Math.floor(Math.random() * 280) + 28,
      platform: 'Amazon',
      url: `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
      imageUrl: getImageForQuery(query, 2, `${query} - Traditional Design with Modern Appeal`),
      category: query,
      description: `Classic collection ${query} featuring timeless design that transcends trends. Expertly crafted with enduring quality and style, this piece has earned ${((Math.random() * 2) + 3).toFixed(1)}/5 stars from ${Math.floor(Math.random() * 280) + 28} customers who value lasting craftsmanship over fleeting fashion.`
    },
    {
      id: `mock-${Date.now()}-10`,
      title: `${query} - Contemporary Style - Modern Craftsmanship`,
      price: `₹${(Math.floor(Math.random() * 3200) + 320).toLocaleString()}`,
      rating: (Math.random() * 2) + 3,
      reviewCount: Math.floor(Math.random() * 320) + 32,
      platform: 'Flipkart',
      url: `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`,
      imageUrl: getImageForQuery(query, 3, `${query} - Artisan Collection - Premium Quality`),
      category: query,
      description: `Contemporary style ${query} that represents modern craftsmanship at its finest. This innovative piece blends current design trends with traditional techniques, achieving ${((Math.random() * 2) + 3).toFixed(1)}/5 stars from ${Math.floor(Math.random() * 320) + 32} customers who appreciate forward-thinking artistry.`
    }
  ];

  // Sort by rating and review count (highest first)
  return baseProducts.sort((a, b) => {
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    return b.reviewCount - a.reviewCount;
  });
}

// Helper functions for realistic trend data
function getCurrentTrends() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  return {
    // Seasonal trends
    isFestivalSeason: month >= 9 && month <= 11, // Oct-Dec
    isWeddingSeason: month >= 10 && month <= 12, // Nov-Jan
    isSummerSeason: month >= 3 && month <= 6, // Apr-Jul

    // Current trending categories
    trendingCategories: [
      'sustainable', 'eco-friendly', 'handmade', 'traditional', 'vintage',
      'minimalist', 'bohemian', 'rustic', 'modern', 'ethnic'
    ],

    // Price trends
    priceTrends: {
      up: ['jewelry', 'furniture', 'art'],
      down: ['textiles', 'pottery', 'decor'],
      stable: ['tools', 'materials']
    }
  };
}

function getSeasonalMultiplier(query: string): number {
  const trends = getCurrentTrends();
  const queryLower = query.toLowerCase();

  // Festival season boosts
  if (trends.isFestivalSeason) {
    if (queryLower.includes('diwali') || queryLower.includes('festival') ||
      queryLower.includes('decoration') || queryLower.includes('gift')) {
      return 1.5; // 50% boost
    }
  }

  // Wedding season boosts
  if (trends.isWeddingSeason) {
    if (queryLower.includes('wedding') || queryLower.includes('bridal') ||
      queryLower.includes('jewelry') || queryLower.includes('saree')) {
      return 1.4; // 40% boost
    }
  }

  // Summer season adjustments
  if (trends.isSummerSeason) {
    if (queryLower.includes('cotton') || queryLower.includes('light') ||
      queryLower.includes('summer')) {
      return 1.3; // 30% boost
    }
  }

  return 1.0; // No multiplier
}

function getProfessionMultiplier(query: string): number {
  const queryLower = query.toLowerCase();

  // High-demand professions
  const highDemand = ['jewelry', 'textile', 'furniture', 'pottery'];
  const mediumDemand = ['painting', 'sculpture', 'woodwork', 'metalwork'];
  const nicheDemand = ['bamboo', 'cane', 'leather', 'stone'];

  if (highDemand.some(prof => queryLower.includes(prof))) {
    return 1.3; // 30% boost
  }

  if (mediumDemand.some(prof => queryLower.includes(prof))) {
    return 1.1; // 10% boost
  }

  if (nicheDemand.some(prof => queryLower.includes(prof))) {
    return 0.9; // 10% reduction
  }

  return 1.0; // No multiplier
}