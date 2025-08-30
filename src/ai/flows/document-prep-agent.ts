'use server';
/**
 * @fileOverview Implements the Document Prep Agent flow for preparing application documents.
 *
 * - prepareDocuments - A function that prepares documents for scheme applications.
 * - PrepareDocumentsInput - The input type for the prepareDocuments function.
 * - PrepareDocumentsOutput - The return type for the prepareDocuments function.
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
  contactInfo: z.object({
    phone: z.string(),
    email: z.string(),
    address: z.string(),
  }),
  documents: z.object({
    aadhaar: z.string().optional(),
    pan: z.string().optional(),
    bankAccount: z.string().optional(),
  }),
});

const PrepareDocumentsInputSchema = z.object({
  artisanProfile: ArtisanProfileSchema,
  schemeId: z.string(),
  documentsNeeded: z.array(z.string()),
  ocrRequirements: z.object({
    requirements: z.array(z.string()),
    eligibilityCriteria: z.array(z.string()),
    documentsNeeded: z.array(z.string()),
    applicationSteps: z.array(z.string()),
  }),
});
export type PrepareDocumentsInput = z.infer<typeof PrepareDocumentsInputSchema>;

const PreparedDocumentSchema = z.object({
  documentType: z.string(),
  content: z.string(),
  format: z.enum(['pdf', 'text', 'json']),
  status: z.enum(['prepared', 'missing_data', 'error']),
});

const PrepareDocumentsOutputSchema = z.object({
  preparedDocuments: z.array(PreparedDocumentSchema).describe('Prepared documents for application.'),
  missingDocuments: z.array(z.string()),
});
export type PrepareDocumentsOutput = z.infer<typeof PrepareDocumentsOutputSchema>;

export async function prepareDocuments(input: PrepareDocumentsInput): Promise<PrepareDocumentsOutput> {
  const { artisanProfile, documentsNeeded, ocrRequirements } = input;

  const preparedDocuments: z.infer<typeof PreparedDocumentSchema>[] = [];
  const missingDocuments: string[] = [];

  for (const docType of documentsNeeded) {
    try {
      const preparedDoc = await generateDocument(docType, artisanProfile, ocrRequirements);
      if (preparedDoc) {
        preparedDocuments.push(preparedDoc);
      } else {
        missingDocuments.push(docType);
      }
    } catch (error) {
      preparedDocuments.push({
        documentType: docType,
        content: '',
        format: 'text',
        status: 'error',
      });
    }
  }

  return {
    preparedDocuments,
    missingDocuments,
  };
}

async function generateDocument(
  docType: string,
  profile: z.infer<typeof ArtisanProfileSchema>,
  requirements: z.infer<typeof PrepareDocumentsInputSchema>['ocrRequirements']
): Promise<z.infer<typeof PreparedDocumentSchema> | null> {
  const prompt = ai.definePrompt({
    name: 'documentGeneratorPrompt',
    input: {
      schema: z.object({
        docType: z.string(),
        profile: ArtisanProfileSchema,
        requirements: z.object({
          requirements: z.array(z.string()),
          eligibilityCriteria: z.array(z.string()),
          documentsNeeded: z.array(z.string()),
          applicationSteps: z.array(z.string()),
        }),
      })
    },
    output: {
      schema: z.object({
        content: z.string(),
        format: z.enum(['pdf', 'text', 'json']),
      })
    },
    prompt: `Generate a {{{docType}}} document for artisan {{{profile.name}}} based on their profile and scheme requirements.

    Artisan Profile: {{{profile}}}
    Requirements: {{{requirements}}}

    Generate appropriate content for the {{{docType}}} in the required format.`,
  });

  try {
    const { output } = await prompt({ docType, profile, requirements });

    return {
      documentType: docType,
      content: output!.content,
      format: output!.format,
      status: 'prepared',
    };
  } catch (error) {
    console.error(`Error generating ${docType}:`, error);
    return null;
  }
}