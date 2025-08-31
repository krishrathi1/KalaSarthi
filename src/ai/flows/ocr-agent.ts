'use server';
/**
 * @fileOverview Implements the OCR Agent flow for extracting requirements from documents.
 *
 * - extractRequirementsFromDocument - A function that extracts scheme requirements using OCR.
 * - ExtractRequirementsFromDocumentInput - The input type for the extractRequirementsFromDocument function.
 * - ExtractRequirementsFromDocumentOutput - The return type for the extractRequirementsFromDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { createWorker } from 'tesseract.js';

const ExtractRequirementsFromDocumentInputSchema = z.object({
  documentUrl: z.string().describe('URL or path to the document to process'),
  schemeId: z.string(),
});
export type ExtractRequirementsFromDocumentInput = z.infer<typeof ExtractRequirementsFromDocumentInputSchema>;

const ExtractRequirementsFromDocumentOutputSchema = z.object({
  extractedText: z.string(),
  requirements: z.array(z.string()).describe('Extracted requirements from the document'),
  eligibilityCriteria: z.array(z.string()),
  documentsNeeded: z.array(z.string()),
  applicationSteps: z.array(z.string()),
});
export type ExtractRequirementsFromDocumentOutput = z.infer<typeof ExtractRequirementsFromDocumentOutputSchema>;

export async function extractRequirementsFromDocument(input: ExtractRequirementsFromDocumentInput): Promise<ExtractRequirementsFromDocumentOutput> {
  const { documentUrl, schemeId } = input;

  const worker = await createWorker('eng');

  try {
    // For demo purposes, we'll simulate OCR on a text URL
    // In real implementation, you'd fetch the document and process it
    const { data: { text } } = await worker.recognize(documentUrl);

    // Use AI to parse the extracted text
    const parsedRequirements = await parseExtractedText(text);

    return {
      extractedText: text,
      ...parsedRequirements,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      extractedText: '',
      requirements: [],
      eligibilityCriteria: [],
      documentsNeeded: [],
      applicationSteps: [],
    };
  } finally {
    await worker.terminate();
  }
}

async function parseExtractedText(text: string): Promise<{
  requirements: string[];
  eligibilityCriteria: string[];
  documentsNeeded: string[];
  applicationSteps: string[];
}> {
  // Use AI to parse the OCR text
  const prompt = ai.definePrompt({
    name: 'ocrTextParserPrompt',
    input: { schema: z.object({ text: z.string() }) },
    output: {
      schema: z.object({
        requirements: z.array(z.string()),
        eligibilityCriteria: z.array(z.string()),
        documentsNeeded: z.array(z.string()),
        applicationSteps: z.array(z.string()),
      })
    },
    prompt: `Parse the following OCR-extracted text from a government scheme document.
    Extract:
    - requirements: General requirements
    - eligibilityCriteria: Who can apply
    - documentsNeeded: Required documents
    - applicationSteps: Steps to apply

    Text: {{{text}}}

    Output the parsed information.`,
  });

  const { output } = await prompt({ text });
  return output!;
}