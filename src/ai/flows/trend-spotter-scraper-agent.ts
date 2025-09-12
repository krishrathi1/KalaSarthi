'use server';

/**
 * @fileOverview Web Scraping Agent for Trend Spotter
 * Handles scraping of ecommerce platforms for product data
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScraperAgentInputSchema = z.object({
  searchQueries: z.array(z.object({
    query: z.string(),
    category: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    rationale: z.string(),
  })),
  targetPlatforms: z.array(z.object({
    platform: z.string(),
    relevance: z.number(),
    searchStrategy: z.string(),
  })),
  limit: z.number().default(20).describe('Maximum products to scrape per platform'),
});

export type ScraperAgentInput = z.infer<typeof ScraperAgentInputSchema>;

const ScraperAgentOutputSchema = z.object({
  scrapedProducts: z.array(z.any()), // Using any to match ScrapedProductData
  scrapingSummary: z.object({
    totalProducts: z.number(),
    platformsScraped: z.array(z.string()),
    successRate: z.number(),
    errors: z.array(z.string()),
    executionTime: z.number(),
  }),
  platformStats: z.array(z.object({
    platform: z.string(),
    productsFound: z.number(),
    success: z.boolean(),
    error: z.string().optional(),
  })),
});

export type ScraperAgentOutput = z.infer<typeof ScraperAgentOutputSchema>;

export async function scrapeTrendProducts(input: ScraperAgentInput): Promise<ScraperAgentOutput> {
  return scraperAgentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scraperAgentPrompt',
  input: { schema: ScraperAgentInputSchema },
  output: { schema: ScraperAgentOutputSchema },
  prompt: `You are a Web Scraping Strategy Agent for the Trend Spotter feature.

Your task is to coordinate and optimize the scraping of ecommerce platforms to collect trending product data.

**Search Queries to Execute:**
{{searchQueries}}

**Target Platforms:**
{{targetPlatforms}}

**Scraping Parameters:**
- Limit per platform: {{limit}} products
- Focus on high-priority queries first
- Ensure diverse product coverage

**Scraping Strategy:**
1. Prioritize platforms by relevance score
2. Execute high-priority queries first
3. Distribute queries across platforms to avoid rate limits
4. Handle errors gracefully and retry failed requests
5. Ensure data quality and deduplication

**Output Requirements:**
- Comprehensive product data collection
- Platform performance statistics
- Error handling and recovery information
- Execution time tracking
- Success rate calculation

Focus on collecting high-quality, relevant product data that represents current market trends.`,
});

const scraperAgentFlow = ai.defineFlow(
  {
    name: 'scraperAgentFlow',
    inputSchema: ScraperAgentInputSchema,
    outputSchema: ScraperAgentOutputSchema,
  },
  async (input) => {
    const startTime = Date.now();

    try {
      // Sort queries by priority
      const sortedQueries = input.searchQueries.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Sort platforms by relevance
      const sortedPlatforms = input.targetPlatforms.sort((a, b) => b.relevance - a.relevance);

      const allProducts: any[] = [];
      const platformStats = [];
      const errors = [];

      // Execute scraping for each platform
      for (const platform of sortedPlatforms) {
        if (platform.relevance < 3) continue; // Skip low-relevance platforms

        try {
          let platformProducts: any[] = [];

          // Select queries for this platform (limit to 3 queries per platform)
          const platformQueries = sortedQueries
            .filter(q => q.priority === 'high' || q.priority === 'medium')
            .slice(0, 3);

          for (const query of platformQueries) {
            try {
              let products: any[] = [];
              const searchTerm = query.query;

              switch (platform.platform.toLowerCase()) {
                case 'amazon':
                  const { scrapeAmazon } = await import('@/lib/scrapers/scrape-amazon');
                  products = await scrapeAmazon(searchTerm, {
                    minPrice: 2500,
                    maxPrice: 5000,
                    maxResults: Math.ceil(input.limit / 3),
                    maxPages: 3,
                    headless: true,
                    saveDebugFiles: false
                  });
                  break;
                case 'flipkart':
                  const { scrapeFlipkartSamarth } = await import('@/lib/scrapers/scrape-flipkart');
                  products = await scrapeFlipkartSamarth(searchTerm, {
                    minPrice: 2500,
                    maxPrice: 5000,
                    maxResults: Math.ceil(input.limit / 3),
                    maxPages: 2,
                    headless: true,
                    saveDebugFiles: false
                  });
                  break;
                case 'meesho':
                  const { scrapeMeesho } = await import('@/lib/scrapers/scrape-meesho');
                  products = await scrapeMeesho(searchTerm, {
                    minPrice: 2500,
                    maxPrice: 5000,
                    maxResults: Math.ceil(input.limit / 3),
                    maxPages: 2,
                    headless: true,
                    saveDebugFiles: false
                  });
                  break;
                default:
                  continue;
              }

              if (products && products.length > 0) {
                // Add search query and enhanced data to products
                const enhancedProducts = products.map((product: any) => ({
                  ...product,
                  searchQuery: query.query,
                  category: query.category,
                  id: `${platform.platform.toLowerCase()}_${product.title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
                }));
                platformProducts.push(...enhancedProducts);
              } else {
                errors.push(`${platform.platform}: No products found`);
              }

              // Rate limiting delay
              await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (queryError) {
              errors.push(`${platform.platform} - ${query.query}: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`);
            }
          }

          platformStats.push({
            platform: platform.platform,
            productsFound: platformProducts.length,
            success: platformProducts.length > 0,
            error: platformProducts.length === 0 ? errors[errors.length - 1] : undefined,
          });

          allProducts.push(...platformProducts);

        } catch (platformError) {
          errors.push(`${platform.platform}: ${platformError instanceof Error ? platformError.message : 'Unknown error'}`);
          platformStats.push({
            platform: platform.platform,
            productsFound: 0,
            success: false,
            error: platformError instanceof Error ? platformError.message : 'Unknown error',
          });
        }
      }

      const executionTime = Date.now() - startTime;
      const successRate = (platformStats.filter(p => p.success).length / platformStats.length) * 100;

      const output = {
        scrapedProducts: allProducts.slice(0, input.limit * 2), // Allow some buffer
        scrapingSummary: {
          totalProducts: allProducts.length,
          platformsScraped: platformStats.map(p => p.platform),
          successRate,
          errors,
          executionTime,
        },
        platformStats,
      };

      return output;

    } catch (error) {
      // Return error response
      return {
        scrapedProducts: [],
        scrapingSummary: {
          totalProducts: 0,
          platformsScraped: [],
          successRate: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          executionTime: Date.now() - startTime,
        },
        platformStats: [],
      };
    }
  }
);