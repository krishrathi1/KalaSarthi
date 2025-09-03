'use server';

/**
 * @fileOverview Recommendation Agent for Trend Spotter
 * Curates and presents final product recommendations to artisans
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecommendationAgentInputSchema = z.object({
  filteredProducts: z.array(z.object({
    product: z.any(),
    popularityScore: z.number(),
    trendScore: z.number(),
    relevanceScore: z.number(),
    overallScore: z.number(),
    rankingReason: z.string(),
    category: z.string(),
  })),
  artisanProfile: z.object({
    profession: z.string(),
    experience: z.string(),
    location: z.string(),
    skills: z.array(z.string()),
    description: z.string(),
  }),
  marketAnalysis: z.object({
    professionCategory: z.string(),
    marketPosition: z.string(),
    growthPotential: z.string(),
    recommendedFocus: z.array(z.string()),
  }),
  trendInsights: z.object({
    mostClickedProducts: z.array(z.string()),
    highestRatedProducts: z.array(z.string()),
    bestSellingCategories: z.array(z.string()),
    priceSweetSpot: z.object({
      min: z.number(),
      max: z.number(),
      optimal: z.number(),
    }),
  }),
});

export type RecommendationAgentInput = z.infer<typeof RecommendationAgentInputSchema>;

const RecommendationAgentOutputSchema = z.object({
  topRecommendations: z.array(z.object({
    product: z.any(),
    recommendationScore: z.number(),
    inspirationType: z.enum(['direct_copy', 'variation', 'fusion', 'innovation']),
    businessPotential: z.enum(['high', 'medium', 'low']),
    timeToImplement: z.enum(['quick', 'medium', 'long']),
    skillMatch: z.number(),
    marketGap: z.string(),
    suggestedImprovements: z.array(z.string()),
  })),
  marketSummary: z.object({
    trendOverview: z.string(),
    opportunityAssessment: z.string(),
    competitiveLandscape: z.string(),
    recommendedStrategy: z.string(),
  }),
  actionableInsights: z.array(z.object({
    insight: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
    effort: z.enum(['low', 'medium', 'high']),
    timeline: z.string(),
  })),
  nextSteps: z.array(z.string()),
});

export type RecommendationAgentOutput = z.infer<typeof RecommendationAgentOutputSchema>;

export async function generateTrendRecommendations(input: RecommendationAgentInput): Promise<RecommendationAgentOutput> {
  return recommendationAgentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendationAgentPrompt',
  input: { schema: RecommendationAgentInputSchema },
  output: { schema: RecommendationAgentOutputSchema },
  prompt: `You are a Recommendation Agent for the Trend Spotter feature.

Your task is to analyze filtered product data and create personalized, actionable recommendations for artisans based on current market trends.

**Artisan Profile:**
- Profession: {{artisanProfile.profession}}
- Experience: {{artisanProfile.experience}}
- Location: {{artisanProfile.location}}
- Skills: {{artisanProfile.skills}}
- Description: {{artisanProfile.description}}

**Market Context:**
- Category: {{marketAnalysis.professionCategory}}
- Position: {{marketAnalysis.marketPosition}}
- Growth Potential: {{marketAnalysis.growthPotential}}
- Recommended Focus: {{marketAnalysis.recommendedFocus}}

**Trend Insights:**
- Most Clicked: {{trendInsights.mostClickedProducts}}
- Highest Rated: {{trendInsights.highestRatedProducts}}
- Best Categories: {{trendInsights.bestSellingCategories}}
- Price Sweet Spot: ₹{{trendInsights.priceSweetSpot.min}} - ₹{{trendInsights.priceSweetSpot.max}} (optimal: ₹{{trendInsights.priceSweetSpot.optimal}})

**Recommendation Strategy:**
1. **Inspiration Types:**
   - Direct Copy: Similar products they can create
   - Variation: Modified versions with their unique touch
   - Fusion: Combining their skills with trending elements
   - Innovation: New products inspired by trends

2. **Business Potential Assessment:**
   - High: Strong market demand, good profit margins
   - Medium: Moderate demand, steady income potential
   - Low: Niche demand, supplementary income

3. **Implementation Factors:**
   - Skill Match: How well it aligns with their current abilities
   - Time to Implement: Quick wins vs. long-term projects
   - Market Gap: Unfilled needs they can address

**Output Requirements:**
- Top 10-15 curated recommendations with detailed analysis
- Market summary with strategic insights
- Actionable insights prioritized by impact and effort
- Clear next steps for implementation

Create recommendations that are inspiring, realistic, and aligned with the artisan's capabilities and market opportunities.`,
});

const recommendationAgentFlow = ai.defineFlow(
  {
    name: 'recommendationAgentFlow',
    inputSchema: RecommendationAgentInputSchema,
    outputSchema: RecommendationAgentOutputSchema,
  },
  async (input) => {
    const { filteredProducts, artisanProfile, marketAnalysis, trendInsights } = input;

    // Sort products by overall score for top recommendations
    const sortedProducts = filteredProducts.sort((a, b) => b.overallScore - a.overallScore);
    const topProducts = sortedProducts.slice(0, 15);

    // Generate recommendations with detailed analysis
    const topRecommendations = topProducts.map(product => {
      const recommendation = analyzeProductForArtisan(product, artisanProfile, marketAnalysis);

      return {
        product: product.product,
        recommendationScore: calculateRecommendationScore(product, artisanProfile, marketAnalysis),
        inspirationType: determineInspirationType(product, artisanProfile),
        businessPotential: assessBusinessPotential(product, trendInsights),
        timeToImplement: estimateImplementationTime(product, artisanProfile),
        skillMatch: calculateSkillMatch(product, artisanProfile),
        marketGap: identifyMarketGap(product, marketAnalysis),
        suggestedImprovements: generateImprovementSuggestions(product, artisanProfile, trendInsights),
      };
    });

    // Sort recommendations by recommendation score
    topRecommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // Generate market summary
    const marketSummary = {
      trendOverview: generateTrendOverview(trendInsights, marketAnalysis),
      opportunityAssessment: assessMarketOpportunities(topRecommendations, artisanProfile),
      competitiveLandscape: analyzeCompetition(filteredProducts, artisanProfile),
      recommendedStrategy: formulateStrategy(topRecommendations, artisanProfile, marketAnalysis),
    };

    // Generate actionable insights
    const actionableInsights = generateActionableInsights(topRecommendations, artisanProfile, marketAnalysis, trendInsights);

    // Generate next steps
    const nextSteps = generateNextSteps(topRecommendations, artisanProfile);

    return {
      topRecommendations: topRecommendations.slice(0, 10), // Top 10 recommendations
      marketSummary,
      actionableInsights,
      nextSteps,
    };
  }
);

// Helper functions for analysis
function analyzeProductForArtisan(product: any, artisanProfile: any, marketAnalysis: any) {
  // Analyze how this product relates to the artisan's work
  const productTitle = product.product.title.toLowerCase();
  const artisanProfession = artisanProfile.profession.toLowerCase();
  const artisanSkills = artisanProfile.skills.map((s: string) => s.toLowerCase());

  // Check for direct matches
  const directMatch = productTitle.includes(artisanProfession) ||
                     artisanProfession.includes(product.category.toLowerCase());

  // Check for skill matches
  const skillMatch = artisanSkills.some((skill: string) =>
    productTitle.includes(skill) || product.category.toLowerCase().includes(skill)
  );

  return {
    directMatch,
    skillMatch,
    category: product.category,
    price: product.product.price,
    rating: product.product.rating,
  };
}

function calculateRecommendationScore(product: any, artisanProfile: any, marketAnalysis: any): number {
  let score = product.overallScore; // Base score from filtering

  // Boost for profession relevance
  const professionMatch = artisanProfile.profession.toLowerCase().includes(product.category.toLowerCase()) ? 2 : 0;
  score += professionMatch;

  // Boost for skill alignment
  const skillMatch = artisanProfile.skills.some((skill: string) =>
    product.category.toLowerCase().includes(skill.toLowerCase())
  ) ? 1.5 : 0;
  score += skillMatch;

  // Boost for market focus alignment
  const focusMatch = marketAnalysis.recommendedFocus.some((focus: string) =>
    product.category.toLowerCase().includes(focus.toLowerCase())
  ) ? 1 : 0;
  score += focusMatch;

  return Math.min(score, 10);
}

function determineInspirationType(product: any, artisanProfile: any): 'direct_copy' | 'variation' | 'fusion' | 'innovation' {
  const productCategory = product.category.toLowerCase();
  const artisanProfession = artisanProfile.profession.toLowerCase();

  if (productCategory === artisanProfession) return 'direct_copy';
  if (productCategory.includes(artisanProfession) || artisanProfession.includes(productCategory)) return 'variation';

  // Check if it combines artisan's skills with new elements
  const hasArtisanSkill = artisanProfile.skills.some((skill: string) =>
    productCategory.includes(skill.toLowerCase())
  );

  if (hasArtisanSkill) return 'fusion';

  return 'innovation';
}

function assessBusinessPotential(product: any, trendInsights: any): 'high' | 'medium' | 'low' {
  const price = product.product.price;
  const rating = product.product.rating;
  const reviewCount = product.product.reviewCount;

  // High potential: High ratings, good review volume, reasonable price
  if (rating >= 4.5 && reviewCount > 50 && price > 200 && price < 5000) return 'high';

  // Medium potential: Good ratings, decent volume
  if (rating >= 4.0 && reviewCount > 20) return 'medium';

  // Low potential: Everything else
  return 'low';
}

function estimateImplementationTime(product: any, artisanProfile: any): 'quick' | 'medium' | 'long' {
  const inspirationType = determineInspirationType(product, artisanProfile);

  switch (inspirationType) {
    case 'direct_copy': return 'quick';
    case 'variation': return 'medium';
    case 'fusion': return 'medium';
    case 'innovation': return 'long';
    default: return 'medium';
  }
}

function calculateSkillMatch(product: any, artisanProfile: any): number {
  const productCategory = product.category.toLowerCase();
  const matchingSkills = artisanProfile.skills.filter((skill: string) =>
    productCategory.includes(skill.toLowerCase())
  );

  return Math.min((matchingSkills.length / artisanProfile.skills.length) * 10, 10);
}

function identifyMarketGap(product: any, marketAnalysis: any): string {
  const category = product.category;
  const focusAreas = marketAnalysis.recommendedFocus;

  if (focusAreas.includes(category)) {
    return `Strong demand in ${category} market with growth potential`;
  }

  return `Opportunity to expand into ${category} with your unique ${marketAnalysis.professionCategory} perspective`;
}

function generateImprovementSuggestions(product: any, artisanProfile: any, trendInsights: any): string[] {
  const suggestions = [];

  // Price optimization
  if (product.product.price > trendInsights.priceSweetSpot.optimal * 1.5) {
    suggestions.push('Consider competitive pricing strategy');
  }

  // Quality enhancement
  if (product.product.rating < 4.5) {
    suggestions.push('Focus on quality improvements to match top-rated products');
  }

  // Unique value proposition
  suggestions.push(`Incorporate your ${artisanProfile.experience} years of ${artisanProfile.profession} expertise`);
  suggestions.push('Add personal storytelling to differentiate from mass-produced items');

  // Local adaptation
  if (artisanProfile.location) {
    suggestions.push(`Adapt design for ${artisanProfile.location} market preferences`);
  }

  return suggestions.slice(0, 3);
}

function generateTrendOverview(trendInsights: any, marketAnalysis: any): string {
  return `Current market trends show strong demand for ${trendInsights.bestSellingCategories.join(', ')} products. The ${marketAnalysis.professionCategory} category demonstrates ${marketAnalysis.growthPotential} growth potential, with optimal pricing in the ₹${trendInsights.priceSweetSpot.min}-₹${trendInsights.priceSweetSpot.max} range.`;
}

function assessMarketOpportunities(recommendations: any[], artisanProfile: any): string {
  const highPotentialCount = recommendations.filter(r => r.businessPotential === 'high').length;
  const quickWinsCount = recommendations.filter(r => r.timeToImplement === 'quick').length;

  return `Analysis reveals ${highPotentialCount} high-potential opportunities and ${quickWinsCount} quick implementation options. Your ${artisanProfile.profession} background positions you well for ${recommendations.length} trending product categories.`;
}

function analyzeCompetition(products: any[], artisanProfile: any): string {
  const platformCount = products.reduce((acc: Record<string, number>, p) => {
    acc[p.product.platform] = (acc[p.product.platform] || 0) + 1;
    return acc;
  }, {});

  const topPlatform = Object.entries(platformCount).sort(([,a], [,b]) => b - a)[0]?.[0] || 'various platforms';

  return `Competition is strongest on ${topPlatform}, but your authentic ${artisanProfile.profession} craftsmanship and ${artisanProfile.location} location provide unique differentiation opportunities.`;
}

function formulateStrategy(recommendations: any[], artisanProfile: any, marketAnalysis: any): string {
  const quickWins = recommendations.filter(r => r.timeToImplement === 'quick');
  const highPotential = recommendations.filter(r => r.businessPotential === 'high');

  return `Start with ${quickWins.length} quick wins to build momentum, then focus on ${highPotential.length} high-potential products. Leverage your ${marketAnalysis.professionCategory} expertise while incorporating trending elements from ${marketAnalysis.recommendedFocus.join(', ')}.`;
}

function generateActionableInsights(recommendations: any[], artisanProfile: any, marketAnalysis: any, trendInsights: any) {
  return [
    {
      insight: `Focus on ${marketAnalysis.recommendedFocus[0]} products for maximum market impact`,
      impact: 'high' as const,
      effort: 'medium' as const,
      timeline: '1-2 months'
    },
    {
      insight: 'Incorporate trending design elements into your traditional craftsmanship',
      impact: 'high' as const,
      effort: 'low' as const,
      timeline: 'Immediate'
    },
    {
      insight: `Target ₹${trendInsights.priceSweetSpot.optimal} price point for optimal market reach`,
      impact: 'medium' as const,
      effort: 'low' as const,
      timeline: 'Immediate'
    },
    {
      insight: 'Develop product stories highlighting your artisan journey',
      impact: 'medium' as const,
      effort: 'medium' as const,
      timeline: '1 month'
    }
  ];
}

function generateNextSteps(recommendations: any[], artisanProfile: any): string[] {
  const quickRecommendations = recommendations.filter(r => r.timeToImplement === 'quick');

  return [
    `Start with ${quickRecommendations[0]?.product.title || 'top trending product'} as your first project`,
    'Research materials and suppliers for trending products',
    'Create mood boards and design sketches inspired by trends',
    'Test small batch production of 2-3 trending items',
    'Gather customer feedback on new product concepts',
    'Scale successful products based on market response'
  ];
}