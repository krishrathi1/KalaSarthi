import { ArtisanProfile, MarketAnalysis } from './trend-spotter-profile-agent';
import { FilteredProduct, TrendInsights } from './trend-spotter-filter-agent';

export interface RecommendationAgentInput {
  filteredProducts: Array<FilteredProduct & {
    popularityScore: number;
    trendScore: number;
    relevanceScore: number;
  }>;
  artisanProfile: ArtisanProfile;
  marketAnalysis: MarketAnalysis;
  trendInsights: TrendInsights;
}

export interface ProductRecommendation {
  product: FilteredProduct;
  recommendationReason: string;
  businessOpportunity: string;
  implementationDifficulty: 'easy' | 'medium' | 'hard';
  estimatedROI: number;
  marketDemand: 'high' | 'medium' | 'low';
  competitiveAdvantage: string;
  suggestedPricing: {
    min: number;
    max: number;
    recommended: number;
  };
  targetAudience: string[];
  marketingChannels: string[];
}

export interface MarketSummary {
  totalMarketSize: number;
  addressableMarket: number;
  marketGrowthRate: number;
  keyTrends: string[];
  competitiveLandscape: {
    directCompetitors: number;
    marketLeaders: string[];
    competitiveGaps: string[];
  };
  opportunityScore: number;
}

export interface ActionableInsight {
  category: 'product' | 'marketing' | 'pricing' | 'skill' | 'market';
  insight: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  priority: number;
  actionItems: string[];
  expectedOutcome: string;
  timeline: string;
}

export interface RecommendationAgentResult {
  topRecommendations: ProductRecommendation[];
  marketSummary: MarketSummary;
  actionableInsights: ActionableInsight[];
  nextSteps: string[];
  strategicRecommendations: {
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
  };
  riskAssessment: {
    marketRisks: string[];
    competitiveRisks: string[];
    operationalRisks: string[];
    mitigationStrategies: string[];
  };
}

export async function generateTrendRecommendations(input: RecommendationAgentInput): Promise<RecommendationAgentResult> {
  try {
    console.log(`💡 Generating recommendations for ${input.filteredProducts.length} products`);

    // Step 1: Generate product recommendations
    const topRecommendations = generateProductRecommendations(input);
    console.log(`🎯 Generated ${topRecommendations.length} product recommendations`);

    // Step 2: Create market summary
    const marketSummary = generateMarketSummary(input);
    console.log(`📊 Market summary created`);

    // Step 3: Generate actionable insights
    const actionableInsights = generateActionableInsights(input);
    console.log(`🔍 Generated ${actionableInsights.length} actionable insights`);

    // Step 4: Define next steps
    const nextSteps = generateNextSteps(input, topRecommendations);
    console.log(`📋 Generated ${nextSteps.length} next steps`);

    // Step 5: Create strategic recommendations
    const strategicRecommendations = generateStrategicRecommendations(input, actionableInsights);
    console.log(`🎯 Strategic recommendations created`);

    // Step 6: Assess risks
    const riskAssessment = assessRisks(input, marketSummary);
    console.log(`⚠️ Risk assessment completed`);

    const result: RecommendationAgentResult = {
      topRecommendations,
      marketSummary,
      actionableInsights,
      nextSteps,
      strategicRecommendations,
      riskAssessment
    };

    console.log(`✅ Recommendation generation completed`);
    return result;

  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw new Error(`Recommendation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateProductRecommendations(input: RecommendationAgentInput): ProductRecommendation[] {
  const recommendations: ProductRecommendation[] = [];

  // Take top 10 products for recommendations
  const topProducts = input.filteredProducts
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 10);

  for (const product of topProducts) {
    const recommendation = createProductRecommendation(product, input.artisanProfile, input.trendInsights);
    recommendations.push(recommendation);
  }

  return recommendations;
}

function createProductRecommendation(
  product: FilteredProduct, 
  profile: ArtisanProfile, 
  trends: TrendInsights
): ProductRecommendation {
  const recommendationReason = generateRecommendationReason(product, profile);
  const businessOpportunity = identifyBusinessOpportunity(product, trends);
  const implementationDifficulty = assessImplementationDifficulty(product, profile);
  const estimatedROI = calculateEstimatedROI(product, profile);
  const marketDemand = assessMarketDemand(product, trends);
  const competitiveAdvantage = identifyCompetitiveAdvantage(product, profile);
  const suggestedPricing = calculateSuggestedPricing(product, profile);
  const targetAudience = identifyTargetAudience(product, profile);
  const marketingChannels = suggestMarketingChannels(product, profile);

  return {
    product,
    recommendationReason,
    businessOpportunity,
    implementationDifficulty,
    estimatedROI,
    marketDemand,
    competitiveAdvantage,
    suggestedPricing,
    targetAudience,
    marketingChannels
  };
}

function generateRecommendationReason(product: FilteredProduct, profile: ArtisanProfile): string {
  const reasons = [];
  
  if (product.rating >= 4.5) {
    reasons.push('High customer satisfaction');
  }
  
  if (product.reviewCount > 100) {
    reasons.push('Strong market validation');
  }
  
  if (product.trendingScore >= 8) {
    reasons.push('Currently trending');
  }
  
  if (product.category.toLowerCase().includes(profile.profession.toLowerCase())) {
    reasons.push('Aligns with your expertise');
  }
  
  return reasons.join(', ') || 'Good market opportunity';
}

function identifyBusinessOpportunity(product: FilteredProduct, trends: TrendInsights): string {
  if (trends.emergingTrends.includes(product.category)) {
    return 'Early entry into emerging market trend';
  }
  
  if (trends.marketGaps.includes(product.category)) {
    return 'Market gap with limited competition';
  }
  
  if (product.overallScore >= 8) {
    return 'High-performing product with strong market demand';
  }
  
  return 'Steady market opportunity with growth potential';
}

function assessImplementationDifficulty(product: FilteredProduct, profile: ArtisanProfile): 'easy' | 'medium' | 'hard' {
  const skillMatch = profile.skills.some(skill => 
    product.title.toLowerCase().includes(skill.toLowerCase()) ||
    product.description.toLowerCase().includes(skill.toLowerCase())
  );
  
  if (skillMatch && product.price < 2000) return 'easy';
  if (skillMatch || product.price < 3000) return 'medium';
  return 'hard';
}

function calculateEstimatedROI(product: FilteredProduct, profile: ArtisanProfile): number {
  const baseROI = 0.3; // 30% base ROI
  const qualityMultiplier = product.qualityScore / 10;
  const trendMultiplier = product.trendingScore / 10;
  const skillMatch = profile.skills.some(skill => 
    product.title.toLowerCase().includes(skill.toLowerCase())
  ) ? 1.2 : 1.0;
  
  return Math.round((baseROI * qualityMultiplier * trendMultiplier * skillMatch) * 100);
}

function assessMarketDemand(product: FilteredProduct, trends: TrendInsights): 'high' | 'medium' | 'low' {
  if (product.reviewCount > 500 && product.rating >= 4.5) return 'high';
  if (product.reviewCount > 100 && product.rating >= 4.0) return 'medium';
  return 'low';
}

function identifyCompetitiveAdvantage(product: FilteredProduct, profile: ArtisanProfile): string {
  if (profile.specialties && profile.specialties.length > 0) {
    return `Leverage your ${profile.specialties[0]} expertise`;
  }
  
  if (product.price < 1500) {
    return 'Competitive pricing advantage';
  }
  
  return 'Focus on quality and craftsmanship';
}

function calculateSuggestedPricing(product: FilteredProduct, profile: ArtisanProfile): {
  min: number;
  max: number;
  recommended: number;
} {
  const basePrice = product.price;
  const min = Math.round(basePrice * 0.8);
  const max = Math.round(basePrice * 1.3);
  const recommended = Math.round(basePrice * 1.1);
  
  return { min, max, recommended };
}

function identifyTargetAudience(product: FilteredProduct, profile: ArtisanProfile): string[] {
  const audiences = ['Home decor enthusiasts', 'Art collectors'];
  
  if (product.category === 'Kitchen') {
    audiences.push('Cooking enthusiasts', 'Home chefs');
  }
  
  if (product.price > 2000) {
    audiences.push('Premium buyers', 'Gift shoppers');
  }
  
  return audiences;
}

function suggestMarketingChannels(product: FilteredProduct, profile: ArtisanProfile): string[] {
  const channels = ['Social media marketing', 'Online marketplaces'];
  
  if (profile.socialMedia && Object.keys(profile.socialMedia).length > 0) {
    channels.push('Social media presence');
  }
  
  if (product.price > 1500) {
    channels.push('Premium retail partnerships');
  }
  
  return channels;
}

function generateMarketSummary(input: RecommendationAgentInput): MarketSummary {
  const totalMarketSize = input.marketAnalysis.marketSize;
  const addressableMarket = Math.round(totalMarketSize * 0.1); // 10% addressable
  const marketGrowthRate = 0.15; // 15% growth rate
  
  const keyTrends = input.trendInsights.emergingTrends;
  
  const competitiveLandscape = {
    directCompetitors: Math.floor(input.marketAnalysis.competition * 50),
    marketLeaders: ['Amazon', 'Flipkart', 'Meesho'],
    competitiveGaps: input.trendInsights.marketGaps
  };
  
  const opportunityScore = calculateOpportunityScore(input);
  
  return {
    totalMarketSize,
    addressableMarket,
    marketGrowthRate,
    keyTrends,
    competitiveLandscape,
    opportunityScore
  };
}

function calculateOpportunityScore(input: RecommendationAgentInput): number {
  const avgProductScore = input.filteredProducts.reduce((sum, p) => sum + p.overallScore, 0) / input.filteredProducts.length;
  const marketGrowth = input.marketAnalysis.opportunities.length;
  const trendStrength = input.trendInsights.emergingTrends.length;
  
  return Math.round((avgProductScore + marketGrowth + trendStrength) * 10) / 10;
}

function generateActionableInsights(input: RecommendationAgentInput): ActionableInsight[] {
  const insights: ActionableInsight[] = [];
  
  // Product insights
  insights.push({
    category: 'product',
    insight: 'Focus on high-rated, trending products in your category',
    impact: 'high',
    effort: 'medium',
    priority: 1,
    actionItems: [
      'Research top-performing products in your category',
      'Develop similar products with your unique touch',
      'Test market response with small batches'
    ],
    expectedOutcome: 'Increased sales and market presence',
    timeline: '2-3 months'
  });
  
  // Marketing insights
  insights.push({
    category: 'marketing',
    insight: 'Leverage social media for product promotion',
    impact: 'high',
    effort: 'low',
    priority: 2,
    actionItems: [
      'Create Instagram account showcasing your work',
      'Post regular content showing your process',
      'Engage with potential customers online'
    ],
    expectedOutcome: 'Increased brand awareness and direct sales',
    timeline: '1-2 months'
  });
  
  // Pricing insights
  insights.push({
    category: 'pricing',
    insight: 'Implement dynamic pricing based on market trends',
    impact: 'medium',
    effort: 'low',
    priority: 3,
    actionItems: [
      'Monitor competitor pricing regularly',
      'Adjust prices based on demand and season',
      'Offer bundle deals for multiple items'
    ],
    expectedOutcome: 'Optimized revenue and competitive positioning',
    timeline: '1 month'
  });
  
  return insights;
}

function generateNextSteps(input: RecommendationAgentInput, recommendations: ProductRecommendation[]): string[] {
  return [
    'Review top 5 product recommendations and select 2-3 to focus on',
    'Research materials and suppliers for selected products',
    'Create prototypes and test market response',
    'Set up online presence and social media accounts',
    'Develop pricing strategy based on market analysis',
    'Plan production schedule and inventory management',
    'Launch marketing campaigns for selected products',
    'Monitor performance and adjust strategy based on results'
  ];
}

function generateStrategicRecommendations(
  input: RecommendationAgentInput, 
  insights: ActionableInsight[]
): {
  shortTerm: string[];
  mediumTerm: string[];
  longTerm: string[];
} {
  return {
    shortTerm: [
      'Focus on 2-3 high-potential products',
      'Set up basic online presence',
      'Start with local market testing'
    ],
    mediumTerm: [
      'Expand product line based on market response',
      'Build strong social media following',
      'Establish partnerships with local retailers'
    ],
    longTerm: [
      'Develop signature product line',
      'Scale production capabilities',
      'Explore export opportunities'
    ]
  };
}

function assessRisks(
  input: RecommendationAgentInput, 
  marketSummary: MarketSummary
): {
  marketRisks: string[];
  competitiveRisks: string[];
  operationalRisks: string[];
  mitigationStrategies: string[];
} {
  return {
    marketRisks: [
      'Market saturation in popular categories',
      'Economic downturn affecting luxury purchases',
      'Changing consumer preferences'
    ],
    competitiveRisks: [
      'Large retailers entering handmade market',
      'Price competition from mass producers',
      'New artisan competitors'
    ],
    operationalRisks: [
      'Supply chain disruptions',
      'Quality control challenges',
      'Scaling production difficulties'
    ],
    mitigationStrategies: [
      'Diversify product categories',
      'Focus on unique value proposition',
      'Build strong customer relationships',
      'Maintain quality standards',
      'Develop reliable supplier network'
    ]
  };
}
