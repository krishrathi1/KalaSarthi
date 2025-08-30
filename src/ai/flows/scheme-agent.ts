'use server';
/**
 * @fileOverview Implements the Scheme Agent flow for processing and enriching scheme data.
 *
 * - processSchemes - A function that processes new schemes from monitoring.
 * - ProcessSchemesInput - The input type for the processSchemes function.
 * - ProcessSchemesOutput - The return type for the processSchemes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SchemeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  eligibility: z.string(),
  link: z.string(),
  category: z.string(),
  publishedDate: z.string(),
});

const ProcessSchemesInputSchema = z.object({
  newSchemes: z.array(SchemeSchema).describe('List of new schemes from monitoring.'),
});
export type ProcessSchemesInput = z.infer<typeof ProcessSchemesInputSchema>;

const ProcessSchemesOutputSchema = z.object({
  processedSchemes: z.array(SchemeSchema.extend({
    enrichedDescription: z.string(),
    keywords: z.array(z.string()),
    priority: z.enum(['high', 'medium', 'low']),
  })).describe('Processed and enriched schemes.'),
});
export type ProcessSchemesOutput = z.infer<typeof ProcessSchemesOutputSchema>;

export async function processSchemes(input: ProcessSchemesInput): Promise<ProcessSchemesOutput> {
  return processSchemesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'schemeProcessingPrompt',
  input: {schema: ProcessSchemesInputSchema},
  output: {schema: ProcessSchemesOutputSchema},
  prompt: `You are a scheme processing agent for artisan schemes.
  Your task is to enrich and categorize the new schemes discovered.

  For each scheme, provide:
  - enrichedDescription: A more detailed and clear description
  - keywords: Array of relevant keywords for matching
  - priority: high/medium/low based on relevance to artisans

  Schemes: {{{newSchemes}}}

  Output the processed schemes with the additional fields.`,
});

const processSchemesFlow = ai.defineFlow(
  {
    name: 'processSchemesFlow',
    inputSchema: ProcessSchemesInputSchema,
    outputSchema: ProcessSchemesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);