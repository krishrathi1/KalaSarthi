'use server';
/**
 * @fileOverview Implements the Translation Agent flow for translating scheme details.
 *
 * - translateSchemes - A function that translates matched schemes to user's language.
 * - TranslateSchemesInput - The input type for the translateSchemes function.
 * - TranslateSchemesOutput - The return type for the translateSchemes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { translationService } from '@/lib/translation-service';
import { LanguageCode } from '@/lib/i18n';

const MatchedSchemeSchema = z.object({
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
  matchScore: z.number(),
  eligibilityMatch: z.boolean(),
  reasons: z.array(z.string()),
});

const TranslateSchemesInputSchema = z.object({
  matchedSchemes: z.array(MatchedSchemeSchema),
  targetLanguage: z.string().describe('Target language code (e.g., hi, ta, bn)'),
});
export type TranslateSchemesInput = z.infer<typeof TranslateSchemesInputSchema>;

const TranslatedSchemeSchema = MatchedSchemeSchema.extend({
  translatedTitle: z.string(),
  translatedDescription: z.string(),
  translatedEligibility: z.string(),
  translatedEnrichedDescription: z.string(),
});

const TranslateSchemesOutputSchema = z.object({
  translatedSchemes: z.array(TranslatedSchemeSchema).describe('Schemes translated to target language.'),
});
export type TranslateSchemesOutput = z.infer<typeof TranslateSchemesOutputSchema>;

export async function translateSchemes(input: TranslateSchemesInput): Promise<TranslateSchemesOutput> {
  const { matchedSchemes, targetLanguage } = input;

  const translatedSchemes = await Promise.all(
    matchedSchemes.map(async (scheme) => {
      const [translatedTitle, translatedDescription, translatedEligibility, translatedEnrichedDescription] = await Promise.all([
        translationService.translateText(scheme.title, targetLanguage as LanguageCode),
        translationService.translateText(scheme.description, targetLanguage as LanguageCode),
        translationService.translateText(scheme.eligibility, targetLanguage as LanguageCode),
        translationService.translateText(scheme.enrichedDescription, targetLanguage as LanguageCode),
      ]);

      return {
        ...scheme,
        translatedTitle,
        translatedDescription,
        translatedEligibility,
        translatedEnrichedDescription,
      };
    })
  );

  return { translatedSchemes };
}