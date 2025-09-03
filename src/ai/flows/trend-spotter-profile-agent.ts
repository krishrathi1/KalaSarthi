'use server';

/**
 * @fileOverview Profile Fetcher Agent for Trend Spotter
 * Automatically retrieves and analyzes artisan profile data
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProfileFetcherInputSchema = z.object({
  userId: z.string().describe('The user ID of the artisan'),
  includeProducts: z.boolean().default(true).describe('Whether to include product listings'),
  includeSales: z.boolean().default(true).describe('Whether to include sales data'),
  profileData: z.string().optional().describe('JSON string of profile data for analysis'),
  checkCompleteness: z.boolean().default(true).describe('Whether to check profile completeness'),
});

export type ProfileFetcherInput = z.infer<typeof ProfileFetcherInputSchema>;

const ProfileFetcherOutputSchema = z.object({
  // Profile completeness check
  profileDataAvailable: z.boolean(),
  completenessSummary: z.string(),

  // Profile data (when available)
  profile: z.object({
    profession: z.string(),
    experience: z.string(),
    location: z.string(),
    skills: z.array(z.string()),
    description: z.string(),
  }).optional(),

  products: z.array(z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    price: z.number(),
    materials: z.array(z.string()),
    tags: z.array(z.string()),
  })).optional(),

  sales: z.object({
    totalRevenue: z.number(),
    totalOrders: z.number(),
    topCategories: z.array(z.string()),
    recentTrends: z.array(z.string()),
  }).optional(),

  analysis: z.object({
    professionCategory: z.string(),
    marketPosition: z.string(),
    growthPotential: z.string(),
    recommendedFocus: z.array(z.string()),
  }).optional(),

  // Profile Completion Flow (when profile is incomplete)
  profileUpdatePrompt: z.string().optional(),
  missingFields: z.array(z.string()).optional(),
  searchQueries: z.array(z.object({
    query: z.string(),
    rationale: z.string(),
    category: z.string(),
    priority: z.number(),
  })).optional(),
});

export type ProfileFetcherOutput = z.infer<typeof ProfileFetcherOutputSchema>;

export async function getArtisanProfile(input: ProfileFetcherInput): Promise<ProfileFetcherOutput> {
  return profileFetcherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'profileFetcherPrompt',
  input: { schema: ProfileFetcherInputSchema },
  output: { schema: ProfileFetcherOutputSchema },
  prompt: `You are a Profile Analysis Agent for the Trend Spotter feature.

Your task is to analyze an artisan's profile and extract key information that will be used to identify trending products in their profession.

Artisan User ID: {{userId}}
Include Products: {{includeProducts}}
Include Sales: {{includeSales}}

Based on the artisan's profile data, extract and analyze:

1. **Profile Information:**
   - Primary profession/craft
   - Years of experience
   - Location (city/state)
   - Key skills and techniques
   - Business description

2. **Product Analysis:**
   - Current product listings
   - Product categories
   - Price ranges
   - Materials used
   - Product tags/keywords

3. **Sales Performance:**
   - Total revenue
   - Number of orders
   - Best-selling categories
   - Recent sales trends

4. **Market Analysis:**
   - Profession category classification
   - Current market position
   - Growth potential assessment
   - Recommended focus areas

Provide structured output that will help identify relevant product trends for this artisan's profession.`,
});

const profileFetcherFlow = ai.defineFlow(
  {
    name: 'profileFetcherFlow',
    inputSchema: ProfileFetcherInputSchema,
    outputSchema: ProfileFetcherOutputSchema,
  },
  async (input) => {
    // In a real implementation, this would fetch from your database
    // For now, we'll simulate profile data based on the user ID
    const mockProfileData = await simulateProfileFetch(input.userId);

    // Check profile completeness if requested
    if (input.checkCompleteness) {
      const completenessCheck = checkProfileCompleteness(mockProfileData);

      if (!completenessCheck.isComplete) {
        // Profile is incomplete - trigger Profile Completion Flow
        const completionFlow = await generateProfileCompletionFlow(mockProfileData, completenessCheck.missingFields);

        return {
          profileDataAvailable: false,
          completenessSummary: completenessCheck.summary,
          profileUpdatePrompt: completionFlow.profileUpdatePrompt,
          missingFields: completenessCheck.missingFields,
          searchQueries: completionFlow.searchQueries,
        };
      }
    }

    // Profile is complete - proceed with normal flow
    const { output } = await prompt({
      ...input,
      profileData: JSON.stringify(mockProfileData)
    });

    return {
      profileDataAvailable: true,
      completenessSummary: "Profile is complete and ready for analysis",
      profile: output!.profile,
      products: output!.products,
      sales: output!.sales,
      analysis: output!.analysis,
    };
  }
);

// Mock function to simulate profile fetching
// Replace this with actual database/API calls
async function simulateProfileFetch(userId: string) {
  // Simulate different artisan profiles based on userId
  const profiles: Record<string, any> = {
    'weaver123': {
      profession: 'Handloom Weaver',
      experience: '15 years',
      location: 'Varanasi, Uttar Pradesh',
      skills: ['Traditional weaving', 'Block printing', 'Natural dyes', 'Saree making'],
      description: 'Specializing in traditional Banarasi silk sarees and handwoven fabrics',
      products: [
        { id: 'saree1', title: 'Banarasi Silk Saree', category: 'Sarees', price: 2500, materials: ['Silk', 'Zari'], tags: ['traditional', 'wedding', 'luxury'] },
        { id: 'dupatta1', title: 'Silk Dupatta', category: 'Dupattas', price: 800, materials: ['Silk'], tags: ['traditional', 'festive'] },
        { id: 'scarf1', title: 'Handwoven Scarf', category: 'Scarves', price: 400, materials: ['Cotton'], tags: ['casual', 'handmade'] }
      ],
      sales: {
        totalRevenue: 150000,
        totalOrders: 120,
        topCategories: ['Sarees', 'Dupattas'],
        recentTrends: ['Silk products', 'Traditional motifs']
      }
    },
    'potter456': {
      profession: 'Ceramic Potter',
      experience: '12 years',
      location: 'Khurja, Uttar Pradesh',
      skills: ['Wheel throwing', 'Glazing', 'Kiln firing', 'Traditional motifs'],
      description: 'Creating traditional ceramic pottery with modern designs',
      products: [
        { id: 'bowl1', title: 'Ceramic Bowl Set', category: 'Tableware', price: 1200, materials: ['Clay'], tags: ['kitchen', 'traditional'] },
        { id: 'vase1', title: 'Decorative Vase', category: 'Decor', price: 800, materials: ['Clay'], tags: ['home decor', 'modern'] },
        { id: 'plate1', title: 'Ceramic Dinner Plate', category: 'Tableware', price: 600, materials: ['Clay'], tags: ['dining', 'handmade'] }
      ],
      sales: {
        totalRevenue: 95000,
        totalOrders: 85,
        topCategories: ['Tableware', 'Decor'],
        recentTrends: ['Kitchenware', 'Home decor']
      }
    }
  };

  return profiles[userId] || profiles['weaver123']; // Default fallback
}

// Helper function to check profile completeness
function checkProfileCompleteness(profileData: any) {
  const missingFields: string[] = [];
  let isComplete = true;

  // Check required fields
  if (!profileData.profession || profileData.profession === '') {
    missingFields.push('profession');
    isComplete = false;
  }

  if (!profileData.location || profileData.location === '') {
    missingFields.push('location');
    isComplete = false;
  }

  if (!profileData.skills || profileData.skills.length === 0) {
    missingFields.push('skills');
    isComplete = false;
  }

  if (!profileData.products || profileData.products.length === 0) {
    missingFields.push('products');
    isComplete = false;
  }

  const summary = isComplete
    ? "Profile is complete with all required information"
    : `Profile is incomplete. Missing: ${missingFields.join(', ')}`;

  return {
    isComplete,
    missingFields,
    summary
  };
}

// Helper function to generate Profile Completion Flow
async function generateProfileCompletionFlow(profileData: any, missingFields: string[]) {
  const profileUpdatePrompt = `Your artisan profile needs completion to provide accurate trend recommendations.

Missing Information:
${missingFields.map(field => `• ${field.charAt(0).toUpperCase() + field.slice(1)}`).join('\n')}

Please provide the following details to improve your trend analysis:

1. **Primary Profession**: What is your main craft/artisan skill?
2. **Location**: Your city and state for local market insights
3. **Skills & Techniques**: List your key craftsmanship skills
4. **Materials**: What materials do you work with?
5. **Target Price Range**: What price range do you typically sell in?
6. **Style Preferences**: Traditional, modern, fusion, or contemporary?
7. **Market Focus**: Local, regional, national, or international?

This information will help us find the most relevant trending products for your specific craft and market.`;

  // Generate search queries based on available data
  const searchQueries = [];

  if (profileData.profession) {
    searchQueries.push({
      query: profileData.profession.toLowerCase(),
      rationale: `Base search for artisan's primary profession`,
      category: 'primary',
      priority: 1
    });

    // Add related terms
    if (profileData.profession.toLowerCase().includes('weaver')) {
      searchQueries.push(
        { query: 'handwoven textiles', rationale: 'Related textile products', category: 'materials', priority: 2 },
        { query: 'traditional sarees', rationale: 'Cultural product category', category: 'cultural', priority: 2 }
      );
    } else if (profileData.profession.toLowerCase().includes('potter')) {
      searchQueries.push(
        { query: 'ceramic pottery', rationale: 'Related ceramic products', category: 'materials', priority: 2 },
        { query: 'traditional ceramics', rationale: 'Cultural product category', category: 'cultural', priority: 2 }
      );
    }
  }

  return {
    profileUpdatePrompt,
    searchQueries
  };
}