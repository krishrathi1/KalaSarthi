import { ArtisanProfile, Product, SalesData, MarketAnalysis } from './trend-spotter-profile-agent';

export interface TrendAnalysisInput {
  profile: ArtisanProfile;
  products: Product[];
  sales: SalesData;
  marketAnalysis: MarketAnalysis;
}

export interface ProfessionInsights {
  primaryCategory: string;
  subCategories: string[];
  skillGaps: string[];
  marketPosition: 'leader' | 'follower' | 'niche' | 'emerging';
  competitiveAdvantages: string[];
  growthOpportunities: string[];
}

export interface TrendAnalysisResult {
  professionInsights: ProfessionInsights;
  marketTrends: {
    trendingKeywords: string[];
    seasonalPatterns: string[];
    emergingCategories: string[];
    decliningCategories: string[];
  };
  competitiveAnalysis: {
    directCompetitors: number;
    marketShare: number;
    pricingStrategy: 'premium' | 'competitive' | 'budget';
    differentiationFactors: string[];
  };
  strategicRecommendations: {
    productDevelopment: string[];
    marketingStrategy: string[];
    pricingAdjustments: string[];
    skillDevelopment: string[];
  };
  searchStrategy: {
    primaryQueries: string[];
    longTailQueries: string[];
    competitorQueries: string[];
    seasonalQueries: string[];
  };
}

export async function analyzeArtisanTrends(input: TrendAnalysisInput): Promise<TrendAnalysisResult> {
  try {
    console.log(`📊 Analyzing trends for profession: ${input.profile.profession}`);

    // Analyze profession insights
    const professionInsights: ProfessionInsights = {
      primaryCategory: input.profile.profession.toLowerCase(),
      subCategories: input.profile.specialties || [],
      skillGaps: identifySkillGaps(input.profile, input.products),
      marketPosition: determineMarketPosition(input.sales, input.marketAnalysis),
      competitiveAdvantages: identifyCompetitiveAdvantages(input.profile, input.products),
      growthOpportunities: identifyGrowthOpportunities(input.marketAnalysis, input.sales)
    };

    // Analyze market trends
    const marketTrends = {
      trendingKeywords: generateTrendingKeywords(input.profile.profession, input.marketAnalysis.trends),
      seasonalPatterns: identifySeasonalPatterns(input.sales.salesHistory),
      emergingCategories: input.marketAnalysis.trends,
      decliningCategories: identifyDecliningCategories(input.products, input.marketAnalysis)
    };

    // Competitive analysis
    const competitiveAnalysis = {
      directCompetitors: Math.floor(input.marketAnalysis.competition * 100),
      marketShare: calculateMarketShare(input.sales, input.marketAnalysis),
      pricingStrategy: determinePricingStrategy(input.products, input.marketAnalysis),
      differentiationFactors: input.profile.skills
    };

    // Strategic recommendations
    const strategicRecommendations = {
      productDevelopment: generateProductDevelopmentRecommendations(input.profile, input.products),
      marketingStrategy: generateMarketingRecommendations(input.profile, input.marketAnalysis),
      pricingAdjustments: generatePricingRecommendations(input.products, input.marketAnalysis),
      skillDevelopment: generateSkillDevelopmentRecommendations(input.profile, input.marketAnalysis)
    };

    // Search strategy
    const searchStrategy = {
      primaryQueries: generatePrimaryQueries(input.profile, input.products),
      longTailQueries: generateLongTailQueries(input.profile, input.marketAnalysis),
      competitorQueries: generateCompetitorQueries(input.profile.profession),
      seasonalQueries: generateSeasonalQueries(input.profile.profession, marketTrends.seasonalPatterns)
    };

    return {
      professionInsights,
      marketTrends,
      competitiveAnalysis,
      strategicRecommendations,
      searchStrategy
    };

  } catch (error) {
    console.error('Error analyzing artisan trends:', error);
    throw new Error(`Trend analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper functions
function identifySkillGaps(profile: ArtisanProfile, products: Product[]): string[] {
  const gaps = [];
  const productCategories = [...new Set(products.map(p => p.category))];
  
  if (!profile.skills.includes('Digital Marketing')) gaps.push('Digital Marketing');
  if (!profile.skills.includes('E-commerce')) gaps.push('E-commerce');
  if (productCategories.length < 3) gaps.push('Product Diversification');
  
  return gaps;
}

function determineMarketPosition(sales: SalesData, analysis: MarketAnalysis): 'leader' | 'follower' | 'niche' | 'emerging' {
  const marketShare = calculateMarketShare(sales, analysis);
  
  if (marketShare > 0.1) return 'leader';
  if (marketShare > 0.05) return 'follower';
  if (sales.totalSales < 20) return 'emerging';
  return 'niche';
}

function identifyCompetitiveAdvantages(profile: ArtisanProfile, products: Product[]): string[] {
  const advantages = [];
  
  if (profile.skills.length > 3) advantages.push('Multi-skilled artisan');
  if (profile.certifications && profile.certifications.length > 0) advantages.push('Certified professional');
  if (products.some(p => p.price > 2000)) advantages.push('Premium product range');
  
  return advantages;
}

function identifyGrowthOpportunities(analysis: MarketAnalysis, sales: SalesData): string[] {
  return analysis.opportunities.filter(opp => 
    !sales.topProducts.some(p => p.productId.includes(opp.toLowerCase()))
  );
}

function generateTrendingKeywords(profession: string, trends: string[]): string[] {
  return [
    `${profession} trending`,
    `${profession} popular`,
    `${profession} best selling`,
    ...trends.map(trend => `${profession} ${trend}`)
  ];
}

function identifySeasonalPatterns(salesHistory: Array<{date: string, sales: number, revenue: number}>): string[] {
  // Simple seasonal pattern detection
  const patterns = [];
  const monthlySales = salesHistory.reduce((acc, sale) => {
    const month = new Date(sale.date).getMonth();
    acc[month] = (acc[month] || 0) + sale.sales;
    return acc;
  }, {} as Record<number, number>);

  if (monthlySales[11] > monthlySales[0]) patterns.push('Holiday season boost');
  if (monthlySales[5] > monthlySales[1]) patterns.push('Summer peak');
  
  return patterns;
}

function identifyDecliningCategories(products: Product[], analysis: MarketAnalysis): string[] {
  // Mock implementation - in real scenario, would analyze market data
  return ['Traditional pottery', 'Basic ceramics'];
}

function calculateMarketShare(sales: SalesData, analysis: MarketAnalysis): number {
  const totalRevenue = sales.topProducts.reduce((sum, p) => sum + p.revenue, 0);
  return Math.min(totalRevenue / analysis.marketSize, 1);
}

function determinePricingStrategy(products: Product[], analysis: MarketAnalysis): 'premium' | 'competitive' | 'budget' {
  const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
  
  if (avgPrice > 3000) return 'premium';
  if (avgPrice > 1000) return 'competitive';
  return 'budget';
}

function generateProductDevelopmentRecommendations(profile: ArtisanProfile, products: Product[]): string[] {
  return [
    'Develop eco-friendly product line',
    'Create customizable options',
    'Add digital art integration',
    'Expand into home decor accessories'
  ];
}

function generateMarketingRecommendations(profile: ArtisanProfile, analysis: MarketAnalysis): string[] {
  return [
    'Focus on social media marketing',
    'Partner with local boutiques',
    'Create video content showcasing skills',
    'Participate in craft fairs and exhibitions'
  ];
}

function generatePricingRecommendations(products: Product[], analysis: MarketAnalysis): string[] {
  return [
    'Consider premium pricing for unique designs',
    'Offer bundle deals for multiple items',
    'Implement dynamic pricing for seasonal items',
    'Create different price tiers for different markets'
  ];
}

function generateSkillDevelopmentRecommendations(profile: ArtisanProfile, analysis: MarketAnalysis): string[] {
  return [
    'Learn digital marketing techniques',
    'Improve photography skills for product listings',
    'Develop online sales capabilities',
    'Learn about sustainable materials'
  ];
}

function generatePrimaryQueries(profile: ArtisanProfile, products: Product[]): string[] {
  return [
    `${profile.profession} trending products`,
    `${profile.skills[0]} popular designs`,
    `${profile.location} handmade crafts`
  ];
}

function generateLongTailQueries(profile: ArtisanProfile, analysis: MarketAnalysis): string[] {
  return [
    `best ${profile.profession} for home decoration`,
    `${profile.skills[0]} techniques for beginners`,
    `where to buy ${profile.profession} online`
  ];
}

function generateCompetitorQueries(profession: string): string[] {
  return [
    `${profession} competitors`,
    `${profession} market leaders`,
    `top ${profession} brands`
  ];
}

function generateSeasonalQueries(profession: string, patterns: string[]): string[] {
  return [
    `${profession} holiday gifts`,
    `${profession} summer collection`,
    `${profession} wedding decorations`
  ];
}
