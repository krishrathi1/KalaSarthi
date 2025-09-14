import { ProcessedScheme } from './scheme-agent';

export interface ArtisanProfile {
  id: string;
  name: string;
  category: string;
  location: string;
  contactInfo: any;
}

export interface MatchedScheme extends ProcessedScheme {
  matchScore: number;
  matchReasons: string[];
}

export async function matchSchemesToProfile({
  artisanProfile,
  processedSchemes
}: {
  artisanProfile: ArtisanProfile;
  processedSchemes: ProcessedScheme[];
}) {
  const matchedSchemes: MatchedScheme[] = processedSchemes.map(scheme => ({
    ...scheme,
    matchScore: 0.8, // Mock score
    matchReasons: ['Category match', 'Eligibility criteria met']
  }));

  return { matchedSchemes };
}
