'use server';
/**
 * @fileOverview Implements the Profile Matching Agent flow for matching schemes to artisans.
 *
 * - matchSchemesToProfile - A function that matches schemes to an artisan's profile.
 * - MatchSchemesToProfileInput - The input type for the matchSchemesToProfile function.
 * - MatchSchemesToProfileOutput - The return type for the matchSchemesToProfile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ArtisanProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  skills: z.array(z.string()),
  location: z.string(),
  income: z.string(),
  businessType: z.string(),
  experience: z.string(),
});

const ProcessedSchemeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  eligibility: z.string(),
  link: z.string(),
  category: z.string(),
  publishedDate: z.string(),
  enrichedDescription: z.string(),
  keywords: z.array(z.string()),
  priority: z.enum(['high', 'medium', 'low']),
});

const MatchSchemesToProfileInputSchema = z.object({
  artisanProfile: ArtisanProfileSchema,
  processedSchemes: z.array(ProcessedSchemeSchema),
});
export type MatchSchemesToProfileInput = z.infer<typeof MatchSchemesToProfileInputSchema>;

const MatchedSchemeSchema = ProcessedSchemeSchema.extend({
  matchScore: z.number(),
  eligibilityMatch: z.boolean(),
  reasons: z.array(z.string()),
});

const MatchSchemesToProfileOutputSchema = z.object({
  matchedSchemes: z.array(MatchedSchemeSchema).describe('Schemes matched to the artisan profile.'),
});
export type MatchSchemesToProfileOutput = z.infer<typeof MatchSchemesToProfileOutputSchema>;

export async function matchSchemesToProfile(input: MatchSchemesToProfileInput): Promise<MatchSchemesToProfileOutput> {
  return matchSchemesToProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'profileMatchingPrompt',
  input: {schema: MatchSchemesToProfileInputSchema},
  output: {schema: MatchSchemesToProfileOutputSchema},
  prompt: `You are a profile matching agent for government schemes and artisans.
  Your task is to match relevant schemes to an artisan's profile based on eligibility and relevance.

  Artisan Profile: {{{artisanProfile}}}
  Processed Schemes: {{{processedSchemes}}}

  For each scheme, determine:
  - matchScore: 0-100 based on how well it matches
  - eligibilityMatch: true if the artisan meets eligibility criteria
  - reasons: array of reasons for the match or non-match

  Only include schemes with matchScore > 50 or high priority.

  Output the matched schemes.`,
});

const matchSchemesToProfileFlow = ai.defineFlow(
  {
    name: 'matchSchemesToProfileFlow',
    inputSchema: MatchSchemesToProfileInputSchema,
    outputSchema: MatchSchemesToProfileOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);