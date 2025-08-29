'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating multilingual product stories from a product photo.
 *
 * The flow takes a photo and a product description as input and returns a set of product stories and captions in multiple languages.
 *
 * @module ai/flows/generate-product-story
 *
 * @interface GenerateProductStoryInput - The input type for the generateProductStory function.
 *
 * @interface GenerateProductStoryOutput - The output type for the generateProductStory function.
 *
 * @function generateProductStory - A function that generates multilingual product stories from a product photo.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductStoryInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  productDescription: z.string().describe('A description of the product.'),
});

export type GenerateProductStoryInput = z.infer<typeof GenerateProductStoryInputSchema>;

const GenerateProductStoryOutputSchema = z.object({
  englishStory: z.string().describe('A compelling product story in English.'),
  spanishStory: z.string().describe('A compelling product story in Spanish.'),
  frenchStory: z.string().describe('A compelling product story in French.'),
  englishCaption: z.string().describe('A short product caption in English.'),
  spanishCaption: z.string().describe('A short product caption in Spanish.'),
  frenchCaption: z.string().describe('A short product caption in French.'),
});

export type GenerateProductStoryOutput = z.infer<typeof GenerateProductStoryOutputSchema>;

export async function generateProductStory(
  input: GenerateProductStoryInput
): Promise<GenerateProductStoryOutput> {
  return generateProductStoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductStoryPrompt',
  input: {schema: GenerateProductStoryInputSchema},
  output: {schema: GenerateProductStoryOutputSchema},
  prompt: `You are an AI assistant that specializes in generating compelling product stories and captions for artisans.

  Given a photo of the product and a product description, you will generate a product story and a short caption in English, Spanish, and French.

  Product Description: {{{productDescription}}}
  Photo: {{media url=photoDataUri}}

  English Story:
  Spanish Story:
  French Story:
  English Caption:
  Spanish Caption:
  French Caption:`,
});

const generateProductStoryFlow = ai.defineFlow(
  {
    name: 'generateProductStoryFlow',
    inputSchema: GenerateProductStoryInputSchema,
    outputSchema: GenerateProductStoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
