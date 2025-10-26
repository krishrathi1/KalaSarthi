import { NextRequest, NextResponse } from 'next/server';
import { webScraper, ScrapedProductData } from '@/lib/web-scraper';

interface RecommendationsRequest {
  userId?: string;
  profession?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, profession }: RecommendationsRequest = await request.json();

    if (!profession) {
      return NextResponse.json(
        { success: false, error: 'Missing profession parameter' },
        { status: 400 }
      );
    }

    console.log(`🎯 Generating recommendations for profession: ${profession}`);

    // Get profession-specific search terms
    const searchTerms = getProfessionSearchTerms(profession);

    // Scrape products for each search term
    const allProducts: any[] = [];

    for (const term of searchTerms.slice(0, 3)) { // Limit to 3 terms for performance
      try {
        console.log(`🔍 Searching for: ${term}`);
        const results = await webScraper.scrapeMultiplePlatforms(term, 5); // Increased from 3 to 5

        if (results.success && results.products.length > 0) {
          const transformedProducts = results.products.map((product: ScrapedProductData) => ({
            id: `${product.platform}-${term}-${Date.now()}-${Math.random()}`,
            title: product.title,
            price: product.price,
            rating: product.rating || 4.0, // Default higher rating
            reviewCount: product.reviewCount || 25, // Default reviews
            platform: product.platform,
            url: product.url,
            imageUrl: product.imageUrl,
            category: product.category || term,
            searchTerm: term
          }));
          allProducts.push(...transformedProducts);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error searching for ${term}:`, error);
      }
    }

    // If no products found from scraping, generate mock recommendations
    if (allProducts.length === 0) {
      console.log(`⚠️ No products found from scraping, using mock recommendations for ${profession}`);
      const mockProducts = generateMockRecommendationsForProfession(profession);
      allProducts.push(...mockProducts);
    }

    // Remove duplicates and sort by rating and review count
    const uniqueProducts = removeDuplicates(allProducts)
      .sort((a, b) => {
        // Primary sort: rating
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        // Secondary sort: review count
        return b.reviewCount - a.reviewCount;
      })
      .slice(0, 12); // Return top 12 recommendations

    console.log(`✅ Generated ${uniqueProducts.length} recommendations for ${profession}`);

    return NextResponse.json({
      success: true,
      recommendations: uniqueProducts,
      profession,
      searchTermsUsed: searchTerms.slice(0, 3)
    });

  } catch (error) {
    console.error('❌ Recommendations API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getProfessionSearchTerms(profession: string): string[] {
  const professionTerms: Record<string, string[]> = {
    weaver: [
      'handwoven sarees',
      'traditional dupattas',
      'artisan wall hangings',
      'handloom table runners',
      'cotton cushion covers',
      'silk scarves',
      'banarasi silk products'
    ],
    silk: [
      'pure silk sarees',
      'kanchipuram silk',
      'banarasi silk dupattas',
      'silk wall hangings',
      'traditional silk fabrics',
      'silk cushion covers',
      'designer silk scarves'
    ],
    potter: [
      'handmade ceramic bowls',
      'traditional pottery sets',
      'ceramic dinner plates',
      'artisan vases',
      'pottery mugs',
      'ceramic kitchenware',
      'decorative pottery'
    ],
    ceramic: [
      'ceramic planters',
      'handmade ceramic tiles',
      'ceramic dinnerware',
      'artisan ceramic bowls',
      'ceramic home decor',
      'traditional ceramics',
      'ceramic kitchen sets'
    ],
    jeweler: [
      'silver earrings handmade',
      'traditional silver necklace',
      'artisan silver bracelets',
      'gemstone jewelry',
      'handcrafted gold rings',
      'traditional maang tikka',
      'silver jewelry sets'
    ],
    metalwork: [
      'brass door handles',
      'traditional metal lanterns',
      'metal wall art',
      'handcrafted metal bowls',
      'decorative metal sculptures',
      'metal home decor',
      'artisan metal products'
    ],
    woodworking: [
      'handcrafted wooden chairs',
      'wooden spice boxes',
      'wooden wall shelves',
      'wooden cutting boards',
      'wooden jewelry boxes',
      'wooden photo frames',
      'traditional wooden furniture'
    ],
    carpenter: [
      'custom wooden furniture',
      'wooden dining tables',
      'wooden cabinets',
      'wooden rocking chairs',
      'wooden bookshelves',
      'handmade wooden beds',
      'wooden home furniture'
    ],
    woodwork: [
      'wooden carvings',
      'wooden inlay boxes',
      'wooden toys',
      'wooden decorative panels',
      'wooden wall art',
      'traditional woodwork',
      'handcrafted wooden items'
    ],
    painter: [
      'original acrylic paintings',
      'madhubani art',
      'canvas paintings',
      'miniature paintings',
      'traditional art',
      'oil paintings',
      'watercolor art'
    ],
    artist: [
      'contemporary art prints',
      'handmade art journals',
      'traditional block prints',
      'art sketch sets',
      'decorative wall art',
      'indian traditional art',
      'handcrafted art pieces'
    ]
  };

  return professionTerms[profession.toLowerCase()] ||
    professionTerms['weaver']; // Default fallback
}

function removeDuplicates(products: any[]): any[] {
  const seen = new Set();
  return products.filter(product => {
    const key = `${product.title}-${product.platform}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Fallback function to generate mock recommendations when scraping fails
function generateMockRecommendationsForProfession(profession: string) {
  const professionTerms = getProfessionSearchTerms(profession);
  const mockProducts: any[] = [];

  // Generate mock products for the first few search terms
  professionTerms.slice(0, 5).forEach((term, index) => {
    const platforms = ['Amazon', 'Flipkart', 'Meesho', 'IndiaMart'];
    const platform = platforms[index % platforms.length];

    mockProducts.push({
      id: `mock-rec-${profession}-${index}-${Date.now()}`,
      title: `${term} - Premium ${profession.charAt(0).toUpperCase() + profession.slice(1)} Collection`,
      price: Math.floor(Math.random() * 5000) + 500,
      rating: (Math.random() * 1.5) + 3.5, // 3.5-5.0 rating
      reviewCount: Math.floor(Math.random() * 300) + 50,
      platform: platform,
      url: getPlatformUrl(platform, term),
      imageUrl: getRandomImage(),
      category: term,
      searchTerm: term
    });
  });

  return mockProducts;
}

function getPlatformUrl(platform: string, term: string): string {
  const encodedTerm = encodeURIComponent(term);
  switch (platform) {
    case 'Amazon':
      return `https://www.amazon.in/s?k=${encodedTerm}`;
    case 'Flipkart':
      return `https://www.flipkart.com/search?q=${encodedTerm}`;
    case 'Meesho':
      return `https://www.meesho.com/search?q=${encodedTerm}`;
    case 'IndiaMart':
      return `https://www.indiamart.com/search.html?ss=${encodedTerm}`;
    default:
      return `https://www.google.com/search?q=${encodedTerm}`;
  }
}

function getRandomImage(): string {
  const images = [
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1601762603332-db5e4b90cc5d?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop'
  ];
  return images[Math.floor(Math.random() * images.length)];
}
