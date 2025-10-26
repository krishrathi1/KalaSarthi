import { NextRequest, NextResponse } from 'next/server';

interface ProductData {
  productId: string;
  title: string;
  description: string;
  transcription: string;
  translations: Record<string, string>;
  price: number;
  category: string;
  tags: string[];
  artisanName: string;
  region: string;
  culturalSignificance: string;
}

interface MarketplaceListing {
  platform: string;
  title: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  images: string[];
  seoKeywords: string[];
  status: 'ready' | 'pending' | 'failed';
}

// Mock marketplace listing generation
// In production, this would integrate with actual marketplace APIs

export async function POST(request: NextRequest) {
  try {
    const productData: ProductData = await request.json();

    if (!productData.productId || !productData.title) {
      return NextResponse.json(
        { error: 'Missing required product data' },
        { status: 400 }
      );
    }

    // Generate listings for multiple marketplaces
    const listings: MarketplaceListing[] = [
      generateAmazonKarigarListing(productData),
      generateEtsyListing(productData),
      generateFlipkartSamarthListing(productData),
      generateMeeshoListing(productData)
    ];

    return NextResponse.json({
      success: true,
      productId: productData.productId,
      listings,
      summary: {
        totalListings: listings.length,
        readyListings: listings.filter(l => l.status === 'ready').length,
        platforms: listings.map(l => l.platform)
      }
    });

  } catch (error) {
    console.error('Generate listings error:', error);
    return NextResponse.json(
      { error: 'Failed to generate marketplace listings' },
      { status: 500 }
    );
  }
}

function generateAmazonKarigarListing(product: ProductData): MarketplaceListing {
  const baseTitle = `${product.title} - Authentic ${product.region} Handicraft`;
  const title = baseTitle.length > 200 ? baseTitle.substring(0, 197) + '...' : baseTitle;

  const description = generatePlatformDescription(product, 'amazon');
  const price = calculatePlatformPrice(product.price, 'amazon');

  return {
    platform: 'Amazon Karigar',
    title,
    description,
    price,
    category: mapCategoryToAmazon(product.category),
    tags: generateAmazonTags(product),
    images: [`${product.productId}_primary.jpg`], // Would be actual image URLs
    seoKeywords: generateSEOKeywords(product, 'amazon'),
    status: 'ready'
  };
}

function generateEtsyListing(product: ProductData): MarketplaceListing {
  const title = `${product.title} - Handmade ${product.category} from ${product.region}`;
  const description = generatePlatformDescription(product, 'etsy');

  return {
    platform: 'Etsy',
    title: title.length > 140 ? title.substring(0, 137) + '...' : title,
    description,
    price: calculatePlatformPrice(product.price, 'etsy'),
    category: mapCategoryToEtsy(product.category),
    tags: generateEtsyTags(product),
    images: [`${product.productId}_primary.jpg`, `${product.productId}_detail.jpg`],
    seoKeywords: generateSEOKeywords(product, 'etsy'),
    status: 'ready'
  };
}

function generateFlipkartSamarthListing(product: ProductData): MarketplaceListing {
  const title = `Pure ${product.region} ${product.title} - Traditional Handicraft`;
  const description = generatePlatformDescription(product, 'flipkart');

  return {
    platform: 'Flipkart Samarth',
    title: title.length > 150 ? title.substring(0, 147) + '...' : title,
    description,
    price: calculatePlatformPrice(product.price, 'flipkart'),
    category: mapCategoryToFlipkart(product.category),
    tags: generateFlipkartTags(product),
    images: [`${product.productId}_primary.jpg`],
    seoKeywords: generateSEOKeywords(product, 'flipkart'),
    status: 'ready'
  };
}

function generateMeeshoListing(product: ProductData): MarketplaceListing {
  const title = `${product.title} - ${product.region} Handmade`;
  const description = generatePlatformDescription(product, 'meesho');

  return {
    platform: 'Meesho',
    title: title.length > 120 ? title.substring(0, 117) + '...' : title,
    description,
    price: calculatePlatformPrice(product.price, 'meesho'),
    category: mapCategoryToMeesho(product.category),
    tags: generateMeeshoTags(product),
    images: [`${product.productId}_primary.jpg`],
    seoKeywords: generateSEOKeywords(product, 'meesho'),
    status: 'ready'
  };
}

function generatePlatformDescription(product: ProductData, platform: string): string {
  const baseDescription = product.transcription || product.description;
  const culturalNote = `\n\n🎨 Cultural Significance: ${product.culturalSignificance}`;
  const artisanNote = `\n👨‍🎨 Crafted by: ${product.artisanName} from ${product.region}`;

  let platformSpecific = '';

  switch (platform) {
    case 'amazon':
      platformSpecific = '\n\n✓ Authentic handmade product\n✓ Supports traditional artisans\n✓ Unique cultural piece';
      break;
    case 'etsy':
      platformSpecific = '\n\n✨ Each piece tells a unique story\n🌍 Supports fair trade artisans\n🎭 Preserves cultural heritage';
      break;
    case 'flipkart':
      platformSpecific = '\n\n• Genuine handicraft from India\n• Empowering rural artisans\n• Traditional craftsmanship';
      break;
    case 'meesho':
      platformSpecific = '\n\n💝 Authentic Indian handicraft\n🌟 Made with love by skilled artisans\n🎊 Perfect gift for special occasions';
      break;
  }

  return baseDescription + culturalNote + artisanNote + platformSpecific;
}

function calculatePlatformPrice(basePrice: number, platform: string): number {
  const platformFees = {
    amazon: 0.12,    // 12% commission
    etsy: 0.08,      // 8% transaction fee
    flipkart: 0.10,  // 10% commission
    meesho: 0.15     // 15% commission
  };

  const fee = platformFees[platform as keyof typeof platformFees] || 0.10;
  const shipping = platform === 'etsy' ? 500 : 200; // Shipping costs

  // Calculate price that covers costs, fees, and provides profit
  const costCoverage = basePrice * 1.5; // 50% margin for artisan
  const platformPrice = (costCoverage + shipping) / (1 - fee);

  return Math.round(platformPrice);
}

function mapCategoryToAmazon(category: string): string {
  const categoryMap: Record<string, string> = {
    'textile': 'Handmade > Textiles',
    'pottery': 'Handmade > Pottery & Ceramics',
    'jewelry': 'Handmade > Jewelry',
    'woodwork': 'Handmade > Woodworking',
    'metalwork': 'Handmade > Metalwork',
    'default': 'Handmade > General Crafts'
  };
  return categoryMap[category.toLowerCase()] || categoryMap.default;
}

function mapCategoryToEtsy(category: string): string {
  const categoryMap: Record<string, string> = {
    'textile': 'Art & Collectibles > Textile Art',
    'pottery': 'Home & Living > Kitchen & Dining > Pottery',
    'jewelry': 'Jewelry & Accessories > Jewelry',
    'woodwork': 'Home & Living > Furniture',
    'metalwork': 'Art & Collectibles > Sculpture',
    'default': 'Art & Collectibles > Mixed Media'
  };
  return categoryMap[category.toLowerCase()] || categoryMap.default;
}

function mapCategoryToFlipkart(category: string): string {
  const categoryMap: Record<string, string> = {
    'textile': 'Home & Kitchen > Home Decor > Handicrafts',
    'pottery': 'Home & Kitchen > Kitchenware > Pottery',
    'jewelry': 'Jewellery & Accessories > Jewellery',
    'woodwork': 'Home & Kitchen > Home Decor > Wooden Crafts',
    'metalwork': 'Home & Kitchen > Home Decor > Metal Crafts',
    'default': 'Home & Kitchen > Home Decor > Handicrafts'
  };
  return categoryMap[category.toLowerCase()] || categoryMap.default;
}

function mapCategoryToMeesho(category: string): string {
  const categoryMap: Record<string, string> = {
    'textile': 'Home & Kitchen > Curtains & Cushions',
    'pottery': 'Home & Kitchen > Kitchenware',
    'jewelry': 'Jewellery & Accessories',
    'woodwork': 'Home & Kitchen > Home Decor',
    'metalwork': 'Home & Kitchen > Home Decor',
    'default': 'Home & Kitchen > Home Decor'
  };
  return categoryMap[category.toLowerCase()] || categoryMap.default;
}

function generateAmazonTags(product: ProductData): string[] {
  return [
    'handmade',
    'handicraft',
    product.category.toLowerCase(),
    product.region.toLowerCase(),
    'traditional',
    'authentic',
    'indian',
    'cultural',
    'artisan',
    'unique'
  ];
}

function generateEtsyTags(product: ProductData): string[] {
  return [
    'handmade',
    'artisan',
    'traditional',
    product.category.toLowerCase(),
    product.region.toLowerCase(),
    'cultural',
    'heritage',
    'authentic',
    'unique',
    'fairtrade'
  ];
}

function generateFlipkartTags(product: ProductData): string[] {
  return [
    'handicraft',
    'handmade',
    product.category.toLowerCase(),
    product.region.toLowerCase(),
    'traditional',
    'authentic',
    'indian',
    'cultural'
  ];
}

function generateMeeshoTags(product: ProductData): string[] {
  return [
    'handmade',
    product.category.toLowerCase(),
    product.region.toLowerCase(),
    'traditional',
    'authentic',
    'gift',
    'cultural'
  ];
}

function generateSEOKeywords(product: ProductData, platform: string): string[] {
  const baseKeywords = [
    product.title.toLowerCase(),
    `${product.category} handmade`,
    `${product.region} ${product.category}`,
    'traditional handicraft',
    'authentic indian craft',
    'artisan made'
  ];

  const platformSpecific = {
    amazon: ['buy online', 'genuine product', 'certified handicraft'],
    etsy: ['vintage style', 'cultural heritage', 'fair trade'],
    flipkart: ['best price', 'genuine product', 'home delivery'],
    meesho: ['trending', 'gift item', 'special occasion']
  };

  return [...baseKeywords, ...(platformSpecific[platform as keyof typeof platformSpecific] || [])];
}
