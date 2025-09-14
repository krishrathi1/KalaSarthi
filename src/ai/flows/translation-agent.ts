import { MatchedScheme } from './profile-matching-agent';

export interface TranslatedScheme extends MatchedScheme {
  translatedTitle: string;
  translatedDescription: string;
  translatedEligibility: string;
  language: string;
}

export async function translateSchemes({
  matchedSchemes,
  targetLanguage
}: {
  matchedSchemes: MatchedScheme[];
  targetLanguage: string;
}) {
  const translatedSchemes: TranslatedScheme[] = matchedSchemes.map(scheme => ({
    ...scheme,
    translatedTitle: scheme.title, // Mock - add actual translation
    translatedDescription: scheme.description,
    translatedEligibility: scheme.eligibility,
    language: targetLanguage
  }));

  return { translatedSchemes };
}
