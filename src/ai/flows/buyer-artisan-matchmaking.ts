'use server';
/**
 * @fileOverview Connects buyers with artisans based on product preferences and cultural interests.
 *
 * - matchBuyersWithArtisans - A function that handles the matchmaking process.
 * - MatchBuyersWithArtisansInput - The input type for the matchBuyersWithArtisans function.
 * - MatchBuyersWithArtisansOutput - The return type for the matchBuyersWithArtisans function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MatchBuyersWithArtisansInputSchema = z.object({
  buyerPreferences: z
    .string()
    .describe('The buyer\'s preferences and cultural interests.'),
  artisanProductDescriptions: z
    .array(z.string())
    .describe('A list of descriptions for artisan products.'),
});
export type MatchBuyersWithArtisansInput = z.infer<
  typeof MatchBuyersWithArtisansInputSchema
>;

const MatchBuyersWithArtisansOutputSchema = z.object({
  matches: z
    .array(z.string())
    .describe(
      'A list of artisan product descriptions that match the buyer\'s preferences.'
    ),
});
export type MatchBuyersWithArtisansOutput = z.infer<
  typeof MatchBuyersWithArtisansOutputSchema
>;

export async function matchBuyersWithArtisans(
  input: MatchBuyersWithArtisansInput
): Promise<MatchBuyersWithArtisansOutput> {
  return matchBuyersWithArtisansFlow(input);
}

const prompt = ai.definePrompt({
  name: 'matchBuyersWithArtisansPrompt',
  input: {schema: MatchBuyersWithArtisansInputSchema},
  output: {schema: MatchBuyersWithArtisansOutputSchema},
  prompt: `You are an AI assistant that matches buyers with artisans based on their preferences.

Buyer Preferences: {{{buyerPreferences}}}

Artisan Products: {{#each artisanProductDescriptions}}{{{this}}}\n{{/each}}

Based on the buyer's preferences, identify the artisan products that are most relevant. Return a list of the product descriptions that match the buyer's preferences.`,
});

const matchBuyersWithArtisansFlow = ai.defineFlow(
  {
    name: 'matchBuyersWithArtisansFlow',
    inputSchema: MatchBuyersWithArtisansInputSchema,
    outputSchema: MatchBuyersWithArtisansOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
