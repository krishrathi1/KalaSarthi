'use server';

/**
 * @fileOverview Trend Analysis Agent for Trend Spotter
 * Analyzes artisan profession and generates targeted search queries
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ProfileFetcherOutput } from './trend-spotter-profile-agent';

const TrendAnalysisInputSchema = z.object({
  profile: z.object({
    profession: z.string(),
    experience: z.string(),
    location: z.string(),
    skills: z.array(z.string()),
    description: z.string(),
  }),
  products: z.array(z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    price: z.number(),
    materials: z.array(z.string()),
    tags: z.array(z.string()),
  })),
  sales: z.object({
    totalRevenue: z.number(),
    totalOrders: z.number(),
    topCategories: z.array(z.string()),
    recentTrends: z.array(z.string()),
  }),
  marketAnalysis: z.object({
    professionCategory: z.string(),
    marketPosition: z.string(),
    growthPotential: z.string(),
    recommendedFocus: z.array(z.string()),
  }),
});

export type TrendAnalysisInput = z.infer<typeof TrendAnalysisInputSchema>;

const TrendAnalysisOutputSchema = z.object({
  searchQueries: z.array(z.object({
    query: z.string(),
    category: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    rationale: z.string(),
  })),
  professionInsights: z.object({
    primaryCategory: z.string(),
    subCategories: z.array(z.string()),
    trendingMaterials: z.array(z.string()),
    marketGaps: z.array(z.string()),
    competitorAnalysis: z.string(),
  }),
  targetPlatforms: z.array(z.object({
    platform: z.string(),
    relevance: z.number(),
    searchStrategy: z.string(),
  })),
  analysisSummary: z.string(),
});

export type TrendAnalysisOutput = z.infer<typeof TrendAnalysisOutputSchema>;

export async function analyzeArtisanTrends(input: TrendAnalysisInput): Promise<TrendAnalysisOutput> {
  return trendAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'trendAnalysisPrompt',
  input: { schema: TrendAnalysisInputSchema },
  output: { schema: TrendAnalysisOutputSchema },
  prompt: `You are a Trend Analysis Agent for the Trend Spotter feature.

Your task is to analyze an artisan's profile and generate strategic search queries to find trending products in their profession category.

**Artisan Profile Analysis:**
- Profession: {{profile.profession}}
- Experience: {{profile.experience}}
- Location: {{profile.location}}
- Skills: {{profile.skills}}
- Description: {{profile.description}}

**Product Portfolio:**
{{products}}

**Sales Performance:**
- Total Revenue: ₹{{sales.totalRevenue}}
- Total Orders: {{sales.totalOrders}}
- Top Categories: {{sales.topCategories}}
- Recent Trends: {{sales.recentTrends}}

**Market Analysis:**
- Profession Category: {{marketAnalysis.professionCategory}}
- Market Position: {{marketAnalysis.marketPosition}}
- Growth Potential: {{marketAnalysis.growthPotential}}
- Recommended Focus: {{marketAnalysis.recommendedFocus}}

Based on this comprehensive analysis, generate:

1. **Strategic Search Queries:**
   - Create 8-12 targeted search queries
   - Categorize by priority (high/medium/low)
   - Focus on trending products in their profession
   - Include variations for different ecommerce platforms
   - Consider seasonal trends and market gaps

2. **Profession Insights:**
   - Primary category classification
   - Related sub-categories to explore
   - Trending materials and techniques
   - Market gaps and opportunities
   - Competitor analysis summary

3. **Target Platforms:**
   - Amazon, Flipkart, Meesho, IndiaMart, Etsy
   - Relevance score (1-10) for each platform
   - Platform-specific search strategies

4. **Analysis Summary:**
   - Key findings about market opportunities
   - Recommended product development directions
   - Competitive advantages to leverage

Focus on products that are similar to their current offerings but show strong market demand and growth potential.`,
});

const trendAnalysisFlow = ai.defineFlow(
  {
    name: 'trendAnalysisFlow',
    inputSchema: TrendAnalysisInputSchema,
    outputSchema: TrendAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);