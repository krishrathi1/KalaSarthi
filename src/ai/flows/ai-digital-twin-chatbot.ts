'use server';
/**
 * @fileOverview Implements the AI Digital Twin chatbot flow for interacting with artisans.
 *
 * - interactWithArtisanDigitalTwin - A function that handles the interaction with the artisan's digital twin.
 * - InteractWithArtisanDigitalTwinInput - The input type for the interactWithArtisanDigitalTwin function.
 * - InteractWithArtisanDigitalTwinOutput - The return type for the interactWithArtisanDigitalTwin function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InteractWithArtisanDigitalTwinInputSchema = z.object({
  artisanId: z.string().describe('The unique identifier of the artisan.'),
  buyerQuery: z.string().describe('The buyer\s question about the artisan or their products.'),
});
export type InteractWithArtisanDigitalTwinInput = z.infer<typeof InteractWithArtisanDigitalTwinInputSchema>;

const InteractWithArtisanDigitalTwinOutputSchema = z.object({
  response: z.string().describe('The AI-generated response to the buyer\s query.'),
});
export type InteractWithArtisanDigitalTwinOutput = z.infer<typeof InteractWithArtisanDigitalTwinOutputSchema>;

export async function interactWithArtisanDigitalTwin(input: InteractWithArtisanDigitalTwinInput): Promise<InteractWithArtisanDigitalTwinOutput> {
  return interactWithArtisanDigitalTwinFlow(input);
}

const prompt = ai.definePrompt({
  name: 'artisanDigitalTwinPrompt',
  input: {schema: InteractWithArtisanDigitalTwinInputSchema},
  output: {schema: InteractWithArtisanDigitalTwinOutputSchema},
  prompt: `You are a multilingual AI agent representing artisan with id: {{{artisanId}}}.
  Your purpose is to answer buyer queries about the artisan's products, stories, and style.
  Use the information available to provide personalized responses and build trust with the buyer.

  Buyer Query: {{{buyerQuery}}}
  Response:`, //The prompt should include artisan details in future implementations.
});

const interactWithArtisanDigitalTwinFlow = ai.defineFlow(
  {
    name: 'interactWithArtisanDigitalTwinFlow',
    inputSchema: InteractWithArtisanDigitalTwinInputSchema,
    outputSchema: InteractWithArtisanDigitalTwinOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
