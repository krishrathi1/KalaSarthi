/**
 * @fileOverview Generic Product Classifier Agent for Trend Spotter
 * Classifies products for ANY artisan profession dynamically
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductClassifierInputSchema = z.object({
  profession: z.string().describe('The artisan profession (e.g., woodworking, weaving, pottery)'),
  professionDetails: z.object({
    skills: z.array(z.string()),
    materials: z.array(z.string()),
    experience: z.string(),
    location: z.string(),
  }).describe('Detailed profession information'),
  existingProducts: z.array(z.object({
    title: z.string(),
    category: z.string(),
    materials: z.array(z.string()),
  })).optional().describe('Existing products from the artisan'),
});

export type ProductClassifierInput = z.infer<typeof ProductClassifierInputSchema>;

const ProductClassifierOutputSchema = z.object({
  professionCategory: z.string().describe('Main category classification'),
  productClassifications: z.array(z.object({
    category: z.string(),
    subcategories: z.array(z.string()),
    description: z.string(),
    marketSize: z.string(),
    growthPotential: z.string(),
  })).describe('Detailed product classifications'),
  searchQueries: z.array(z.object({
    query: z.string(),
    category: z.string(),
    priority: z.number(),
    rationale: z.string(),
    platforms: z.array(z.string()),
    expectedResults: z.string(),
  })).describe('Optimized search queries for the profession'),
  marketInsights: z.object({
    targetPlatforms: z.array(z.string()),
    priceRanges: z.object({
      entry: z.string(),
      mid: z.string(),
      premium: z.string(),
    }),
    seasonalTrends: z.array(z.string()),
    regionalDemand: z.array(z.string()),
  }).describe('Market intelligence for the profession'),
  competitiveAnalysis: z.object({
    mainCompetitors: z.array(z.string()),
    uniqueSellingPoints: z.array(z.string()),
    marketGaps: z.array(z.string()),
    differentiationStrategy: z.string(),
  }).describe('Competitive positioning'),
});

export type ProductClassifierOutput = z.infer<typeof ProductClassifierOutputSchema>;

export async function classifyProductsForProfession(input: ProductClassifierInput): Promise<ProductClassifierOutput> {
  return productClassifierFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productClassifierPrompt',
  input: { schema: ProductClassifierInputSchema },
  output: { schema: ProductClassifierOutputSchema },
  prompt: `You are a Product Classification Expert for artisan professions. Your task is to analyze ANY artisan profession and create a comprehensive product classification system that will guide ecommerce searches and trend analysis.

**Artisan Profession:** {{profession}}

**Profession Details:**
- Skills: {{professionDetails.skills}}
- Materials: {{professionDetails.materials}}
- Experience: {{professionDetails.experience}}
- Location: {{professionDetails.location}}

**Existing Products (if any):**
{{existingProducts}}

**Your Mission:**
1. **Classify the Profession**: Determine the main category and subcategories
2. **Product Classification**: Create detailed product categories that artisans in this profession would create
3. **Search Query Generation**: Create optimized search queries for ecommerce platforms
4. **Market Intelligence**: Provide platform recommendations, price ranges, seasonal trends
5. **Competitive Analysis**: Identify market positioning and differentiation strategies

**Guidelines:**
- Be specific and actionable
- Include local/regional terms and variations
- Consider seasonal and cultural factors
- Focus on products that can be created by individual artisans
- Include both traditional and contemporary variations
- Provide realistic market insights

**Output Structure:**
- professionCategory: Main classification (e.g., "Woodworking", "Textiles", "Ceramics")
- productClassifications: Array of categories with subcategories, descriptions, market size, growth potential
- searchQueries: Array of optimized queries with rationale and expected results
- marketInsights: Platform recommendations, price ranges, seasonal trends, regional demand
- competitiveAnalysis: Competitors, USPs, market gaps, differentiation strategy

Make this comprehensive and profession-specific!`,
});

const productClassifierFlow = ai.defineFlow(
  {
    name: 'productClassifierFlow',
    inputSchema: ProductClassifierInputSchema,
    outputSchema: ProductClassifierOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

// Helper function to get profession-specific examples
export function getProfessionExamples(profession: string): string[] {
  const examples: Record<string, string[]> = {
    woodworking: [
      'handcrafted wooden chairs',
      'traditional wooden spice boxes',
      'artisan wooden wall shelves',
      'wooden cutting boards',
      'wooden jewelry boxes',
      'wooden photo frames',
      'wooden key holders',
      'wooden carvings',
      'wooden inlay boxes',
      'wooden toys',
      'wooden decorative panels',
      'wooden furniture'
    ],
    weaving: [
      'handwoven cotton sarees',
      'traditional silk dupattas',
      'artisan wall hangings',
      'table runners',
      'cushion covers',
      'scarves',
      'bedspreads',
      'tapestries',
      'textile wall art',
      'traditional fabrics'
    ],
    pottery: [
      'ceramic bowls',
      'traditional pottery sets',
      'vases',
      'ceramic plates',
      'teapots',
      'ceramic figurines',
      'planters',
      'ceramic tiles',
      'decorative ceramics',
      'kitchenware'
    ],
    jewelry: [
      'silver earrings',
      'traditional necklaces',
      'bracelets',
      'gold-plated rings',
      'maang tikkas',
      'jewelry sets',
      'traditional ornaments',
      'artisan jewelry',
      'cultural jewelry',
      'handmade accessories'
    ],
    painting: [
      'acrylic paintings',
      'madhubani art',
      'canvas art',
      'miniature paintings',
      'warli art',
      'traditional paintings',
      'contemporary art',
      'cultural art',
      'folk art',
      'art prints'
    ]
  };

  return examples[profession.toLowerCase()] || [
    'handmade crafts',
    'traditional art',
    'artisan products',
    'cultural items',
    'handcrafted goods'
  ];
}