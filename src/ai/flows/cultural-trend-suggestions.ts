'use server';

/**
 * @fileOverview An AI agent that suggests modern variations of traditional crafts based on current trends.
 *
 * - getCulturalTrendSuggestions - A function that suggests modern variations of traditional crafts.
 * - CulturalTrendSuggestionsInput - The input type for the getCulturalTrendSuggestions function.
 * - CulturalTrendSuggestionsOutput - The return type for the getCulturalTrendSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CulturalTrendSuggestionsInputSchema = z.object({
  craftDescription: z
    .string()
    .describe('A description of the traditional craft, including its origin, materials, and techniques.'),
  currentTrends: z
    .string()
    .describe('A description of current fashion and home decor trends.'),
});
export type CulturalTrendSuggestionsInput = z.infer<typeof CulturalTrendSuggestionsInputSchema>;

const CulturalTrendSuggestionsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe('A list of suggestions for modern variations of the traditional craft, based on current trends.'),
});
export type CulturalTrendSuggestionsOutput = z.infer<typeof CulturalTrendSuggestionsOutputSchema>;

export async function getCulturalTrendSuggestions(
  input: CulturalTrendSuggestionsInput
): Promise<CulturalTrendSuggestionsOutput> {
  return culturalTrendSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'culturalTrendSuggestionsPrompt',
  input: {schema: CulturalTrendSuggestionsInputSchema},
  output: {schema: CulturalTrendSuggestionsOutputSchema},
  prompt: `You are a cultural trend expert, skilled at identifying opportunities to modernize traditional crafts.

  An artisan has described their craft as follows:
  {{craftDescription}}

  Current fashion and home decor trends are:
  {{currentTrends}}

  Based on this information, suggest some modern variations of the traditional craft that would appeal to contemporary buyers.  Be specific and actionable.  Provide at least three suggestions.
  `,
});

const culturalTrendSuggestionsFlow = ai.defineFlow(
  {
    name: 'culturalTrendSuggestionsFlow',
    inputSchema: CulturalTrendSuggestionsInputSchema,
    outputSchema: CulturalTrendSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
