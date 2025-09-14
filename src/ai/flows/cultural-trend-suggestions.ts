export interface CulturalTrendInput {
  region?: string;
  occasion?: string;
  targetAudience?: string;
  productCategory?: string;
  season?: string;
  budget?: 'low' | 'medium' | 'high';
  preferences?: string[];
}

export interface CulturalTrend {
  id: string;
  name: string;
  description: string;
  category: string;
  popularity: number;
  seasonality: string[];
  regions: string[];
  occasions: string[];
  targetAudience: string[];
  priceRange: {
    min: number;
    max: number;
  };
  materials: string[];
  colors: string[];
  patterns: string[];
  culturalSignificance: string;
  marketDemand: 'high' | 'medium' | 'low';
  trendDirection: 'rising' | 'stable' | 'declining';
}

export interface CulturalTrendSuggestionsResult {
  trends: CulturalTrend[];
  recommendations: {
    topTrends: CulturalTrend[];
    seasonalTrends: CulturalTrend[];
    regionalTrends: CulturalTrend[];
    budgetFriendly: CulturalTrend[];
  };
  insights: {
    marketAnalysis: string;
    opportunityAreas: string[];
    culturalContext: string;
    designGuidelines: string[];
  };
  metadata: {
    generatedAt: string;
    region: string;
    season: string;
    totalTrends: number;
  };
}

export async function getCulturalTrendSuggestions(input: CulturalTrendInput): Promise<CulturalTrendSuggestionsResult> {
  try {
    console.log('🎨 Generating cultural trend suggestions for region:', input.region);

    const region = input.region || 'India';
    const season = input.season || getCurrentSeason();
    
    // Generate cultural trends based on input parameters
    const trends = generateCulturalTrends(input);
    
    // Categorize trends
    const recommendations = {
      topTrends: trends.filter(t => t.popularity >= 8).slice(0, 5),
      seasonalTrends: trends.filter(t => t.seasonality.includes(season)).slice(0, 5),
      regionalTrends: trends.filter(t => t.regions.includes(region)).slice(0, 5),
      budgetFriendly: trends.filter(t => t.priceRange.max <= 2000).slice(0, 5)
    };

    // Generate insights
    const insights = generateInsights(trends, input);

    return {
      trends,
      recommendations,
      insights,
      metadata: {
        generatedAt: new Date().toISOString(),
        region,
        season,
        totalTrends: trends.length
      }
    };

  } catch (error) {
    console.error('Cultural trend suggestions error:', error);
    throw new Error(`Failed to generate cultural trend suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateCulturalTrends(input: CulturalTrendInput): CulturalTrend[] {
  const baseTrends: CulturalTrend[] = [
    {
      id: 'trend_1',
      name: 'Traditional Blue Pottery Revival',
      description: 'Classic blue pottery with modern design elements gaining popularity',
      category: 'Ceramics',
      popularity: 9,
      seasonality: ['winter', 'spring'],
      regions: ['Rajasthan', 'Delhi', 'Mumbai'],
      occasions: ['wedding', 'festival', 'home_decoration'],
      targetAudience: ['young_adults', 'families', 'collectors'],
      priceRange: { min: 800, max: 3500 },
      materials: ['clay', 'cobalt_oxide', 'quartz'],
      colors: ['blue', 'white', 'turquoise'],
      patterns: ['floral', 'geometric', 'traditional'],
      culturalSignificance: 'Heritage craft from Jaipur with royal connections',
      marketDemand: 'high',
      trendDirection: 'rising'
    },
    {
      id: 'trend_2',
      name: 'Eco-Friendly Terracotta',
      description: 'Sustainable terracotta products with natural finishes',
      category: 'Pottery',
      popularity: 8,
      seasonality: ['summer', 'monsoon'],
      regions: ['West Bengal', 'Tamil Nadu', 'Karnataka'],
      occasions: ['garden', 'kitchen', 'outdoor'],
      targetAudience: ['eco_conscious', 'gardeners', 'homeowners'],
      priceRange: { min: 500, max: 2000 },
      materials: ['terracotta_clay', 'natural_glazes'],
      colors: ['terracotta', 'brown', 'natural'],
      patterns: ['minimalist', 'organic', 'textured'],
      culturalSignificance: 'Ancient craft with environmental benefits',
      marketDemand: 'high',
      trendDirection: 'rising'
    },
    {
      id: 'trend_3',
      name: 'Modern Handloom Fusion',
      description: 'Traditional handloom with contemporary designs',
      category: 'Textiles',
      popularity: 7,
      seasonality: ['winter', 'festival'],
      regions: ['West Bengal', 'Assam', 'Odisha'],
      occasions: ['festival', 'wedding', 'formal'],
      targetAudience: ['fashion_conscious', 'cultural_enthusiasts'],
      priceRange: { min: 1500, max: 8000 },
      materials: ['cotton', 'silk', 'jute'],
      colors: ['earth_tones', 'bright_colors', 'pastels'],
      patterns: ['traditional', 'contemporary', 'fusion'],
      culturalSignificance: 'Preserving traditional weaving techniques',
      marketDemand: 'medium',
      trendDirection: 'stable'
    },
    {
      id: 'trend_4',
      name: 'Minimalist Wooden Crafts',
      description: 'Clean, simple wooden products with natural beauty',
      category: 'Woodwork',
      popularity: 8,
      seasonality: ['all_seasons'],
      regions: ['Karnataka', 'Kerala', 'Himachal Pradesh'],
      occasions: ['home_decoration', 'gift', 'office'],
      targetAudience: ['minimalists', 'professionals', 'designers'],
      priceRange: { min: 1000, max: 5000 },
      materials: ['teak', 'rosewood', 'bamboo'],
      colors: ['natural_wood', 'light_stain', 'dark_stain'],
      patterns: ['clean_lines', 'geometric', 'organic'],
      culturalSignificance: 'Traditional craftsmanship with modern appeal',
      marketDemand: 'high',
      trendDirection: 'rising'
    },
    {
      id: 'trend_5',
      name: 'Festive Metalwork',
      description: 'Traditional metal crafts for festivals and celebrations',
      category: 'Metalwork',
      popularity: 6,
      seasonality: ['festival', 'wedding'],
      regions: ['Rajasthan', 'Gujarat', 'Tamil Nadu'],
      occasions: ['festival', 'wedding', 'religious'],
      targetAudience: ['traditional_families', 'collectors'],
      priceRange: { min: 2000, max: 10000 },
      materials: ['brass', 'copper', 'silver'],
      colors: ['gold', 'copper', 'silver'],
      patterns: ['traditional', 'religious', 'ornate'],
      culturalSignificance: 'Sacred and ceremonial importance',
      marketDemand: 'medium',
      trendDirection: 'stable'
    }
  ];

  // Filter trends based on input criteria
  let filteredTrends = baseTrends;

  if (input.region) {
    filteredTrends = filteredTrends.filter(trend => 
      trend.regions.some(region => region.toLowerCase().includes(input.region!.toLowerCase()))
    );
  }

  if (input.occasion) {
    filteredTrends = filteredTrends.filter(trend => 
      trend.occasions.includes(input.occasion!)
    );
  }

  if (input.productCategory) {
    filteredTrends = filteredTrends.filter(trend => 
      trend.category.toLowerCase() === input.productCategory!.toLowerCase()
    );
  }

  if (input.budget) {
    const budgetRanges = {
      low: 2000,
      medium: 5000,
      high: 10000
    };
    const maxPrice = budgetRanges[input.budget];
    filteredTrends = filteredTrends.filter(trend => trend.priceRange.max <= maxPrice);
  }

  return filteredTrends;
}

function generateInsights(trends: CulturalTrend[], input: CulturalTrendInput): {
  marketAnalysis: string;
  opportunityAreas: string[];
  culturalContext: string;
  designGuidelines: string[];
} {
  const highDemandTrends = trends.filter(t => t.marketDemand === 'high');
  const risingTrends = trends.filter(t => t.trendDirection === 'rising');
  
  const marketAnalysis = `The cultural craft market shows strong demand for ${highDemandTrends.length} high-demand trends, with ${risingTrends.length} trends showing upward momentum. Traditional crafts with modern adaptations are particularly popular.`;

  const opportunityAreas = [
    'Eco-friendly and sustainable products',
    'Modern interpretations of traditional designs',
    'Custom and personalized items',
    'Digital marketing and online presence',
    'Collaboration with contemporary designers'
  ];

  const culturalContext = `Cultural trends reflect a growing appreciation for heritage crafts combined with contemporary aesthetics. Consumers value authenticity, sustainability, and the story behind each piece.`;

  const designGuidelines = [
    'Maintain traditional techniques while incorporating modern elements',
    'Use natural and sustainable materials',
    'Focus on quality craftsmanship and attention to detail',
    'Create pieces that tell a cultural story',
    'Ensure products are functional and practical for modern living'
  ];

  return {
    marketAnalysis,
    opportunityAreas,
    culturalContext,
    designGuidelines
  };
}

function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'monsoon';
  return 'winter';
}
