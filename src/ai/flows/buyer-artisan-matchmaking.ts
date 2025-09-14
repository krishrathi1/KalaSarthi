export interface BuyerProfile {
  id: string;
  name: string;
  preferences: {
    categories: string[];
    priceRange: {
      min: number;
      max: number;
    };
    styles: string[];
    occasions: string[];
  };
  location: string;
  budget: 'low' | 'medium' | 'high';
  experience: 'beginner' | 'intermediate' | 'expert';
  interests: string[];
}

export interface ArtisanProfile {
  id: string;
  name: string;
  profession: string;
  specialties: string[];
  location: string;
  experience: number;
  rating: number;
  priceRange: {
    min: number;
    max: number;
  };
  availability: 'available' | 'busy' | 'unavailable';
  portfolio: string[];
  certifications: string[];
  languages: string[];
}

export interface MatchmakingInput {
  buyerProfile: BuyerProfile;
  artisanProfiles: ArtisanProfile[];
  preferences?: {
    maxDistance?: number;
    minRating?: number;
    maxPrice?: number;
    requiredSpecialties?: string[];
  };
}

export interface MatchResult {
  artisan: ArtisanProfile;
  matchScore: number;
  compatibilityFactors: {
    categoryMatch: number;
    priceCompatibility: number;
    locationProximity: number;
    styleAlignment: number;
    experienceLevel: number;
  };
  recommendations: string[];
  potentialProjects: string[];
  estimatedTimeline: string;
  communicationTips: string[];
}

export interface MatchmakingResult {
  matches: MatchResult[];
  topMatches: MatchResult[];
  alternativeMatches: MatchResult[];
  insights: {
    marketAnalysis: string;
    pricingInsights: string;
    availabilityInsights: string;
    recommendations: string[];
  };
  metadata: {
    totalArtisans: number;
    matchedArtisans: number;
    averageMatchScore: number;
    processingTime: number;
  };
}

export async function matchBuyersWithArtisans(input: MatchmakingInput): Promise<MatchmakingResult> {
  try {
    console.log('🎯 Starting buyer-artisan matchmaking for buyer:', input.buyerProfile.name);

    const startTime = Date.now();
    
    // Calculate matches for each artisan
    const matches: MatchResult[] = [];
    
    for (const artisan of input.artisanProfiles) {
      const matchResult = calculateMatch(input.buyerProfile, artisan, input.preferences);
      if (matchResult.matchScore > 0.3) { // Only include reasonable matches
        matches.push(matchResult);
      }
    }

    // Sort matches by score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Categorize matches
    const topMatches = matches.slice(0, 5);
    const alternativeMatches = matches.slice(5, 10);

    // Generate insights
    const insights = generateMatchmakingInsights(matches, input);

    const processingTime = Date.now() - startTime;

    return {
      matches,
      topMatches,
      alternativeMatches,
      insights,
      metadata: {
        totalArtisans: input.artisanProfiles.length,
        matchedArtisans: matches.length,
        averageMatchScore: matches.length > 0 ? matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length : 0,
        processingTime
      }
    };

  } catch (error) {
    console.error('Matchmaking error:', error);
    throw new Error(`Matchmaking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function calculateMatch(
  buyer: BuyerProfile, 
  artisan: ArtisanProfile, 
  preferences?: MatchmakingInput['preferences']
): MatchResult {
  // Calculate compatibility factors
  const categoryMatch = calculateCategoryMatch(buyer.preferences.categories, artisan.specialties);
  const priceCompatibility = calculatePriceCompatibility(buyer.preferences.priceRange, artisan.priceRange);
  const locationProximity = calculateLocationProximity(buyer.location, artisan.location);
  const styleAlignment = calculateStyleAlignment(buyer.preferences.styles, artisan.specialties);
  const experienceLevel = calculateExperienceMatch(buyer.experience, artisan.experience);

  // Calculate overall match score
  const matchScore = (
    categoryMatch * 0.3 +
    priceCompatibility * 0.25 +
    locationProximity * 0.15 +
    styleAlignment * 0.2 +
    experienceLevel * 0.1
  );

  // Generate recommendations
  const recommendations = generateRecommendations(buyer, artisan, {
    categoryMatch,
    priceCompatibility,
    locationProximity,
    styleAlignment,
    experienceLevel
  });

  // Generate potential projects
  const potentialProjects = generatePotentialProjects(buyer, artisan);

  // Estimate timeline
  const estimatedTimeline = estimateTimeline(artisan.experience, buyer.preferences.categories);

  // Communication tips
  const communicationTips = generateCommunicationTips(buyer, artisan);

  return {
    artisan,
    matchScore: Math.round(matchScore * 100) / 100,
    compatibilityFactors: {
      categoryMatch: Math.round(categoryMatch * 100) / 100,
      priceCompatibility: Math.round(priceCompatibility * 100) / 100,
      locationProximity: Math.round(locationProximity * 100) / 100,
      styleAlignment: Math.round(styleAlignment * 100) / 100,
      experienceLevel: Math.round(experienceLevel * 100) / 100
    },
    recommendations,
    potentialProjects,
    estimatedTimeline,
    communicationTips
  };
}

function calculateCategoryMatch(buyerCategories: string[], artisanSpecialties: string[]): number {
  const matches = buyerCategories.filter(category => 
    artisanSpecialties.some(specialty => 
      specialty.toLowerCase().includes(category.toLowerCase()) ||
      category.toLowerCase().includes(specialty.toLowerCase())
    )
  );
  return matches.length / Math.max(buyerCategories.length, 1);
}

function calculatePriceCompatibility(buyerRange: {min: number, max: number}, artisanRange: {min: number, max: number}): number {
  const buyerMid = (buyerRange.min + buyerRange.max) / 2;
  const artisanMid = (artisanRange.min + artisanRange.max) / 2;
  
  const overlap = Math.max(0, Math.min(buyerRange.max, artisanRange.max) - Math.max(buyerRange.min, artisanRange.min));
  const totalRange = Math.max(buyerRange.max, artisanRange.max) - Math.min(buyerRange.min, artisanRange.min);
  
  return totalRange > 0 ? overlap / totalRange : 0;
}

function calculateLocationProximity(buyerLocation: string, artisanLocation: string): number {
  // Simple location matching - in real implementation, would use geolocation
  const buyerCity = buyerLocation.toLowerCase();
  const artisanCity = artisanLocation.toLowerCase();
  
  if (buyerCity === artisanCity) return 1.0;
  if (buyerCity.includes(artisanCity) || artisanCity.includes(buyerCity)) return 0.8;
  
  // Check for same state/region
  const commonRegions = ['north', 'south', 'east', 'west', 'central'];
  const buyerRegion = commonRegions.find(region => buyerCity.includes(region));
  const artisanRegion = commonRegions.find(region => artisanCity.includes(region));
  
  if (buyerRegion && artisanRegion && buyerRegion === artisanRegion) return 0.6;
  
  return 0.3; // Default for different regions
}

function calculateStyleAlignment(buyerStyles: string[], artisanSpecialties: string[]): number {
  const styleMatches = buyerStyles.filter(style => 
    artisanSpecialties.some(specialty => 
      specialty.toLowerCase().includes(style.toLowerCase())
    )
  );
  return styleMatches.length / Math.max(buyerStyles.length, 1);
}

function calculateExperienceMatch(buyerExperience: string, artisanExperience: number): number {
  const experienceLevels = {
    'beginner': 1,
    'intermediate': 2,
    'expert': 3
  };
  
  const buyerLevel = experienceLevels[buyerExperience as keyof typeof experienceLevels] || 1;
  const artisanLevel = Math.min(3, Math.max(1, Math.floor(artisanExperience / 5))); // 5 years per level
  
  // Prefer artisans with slightly more experience than buyer
  const diff = Math.abs(artisanLevel - buyerLevel);
  return Math.max(0, 1 - diff * 0.3);
}

function generateRecommendations(
  buyer: BuyerProfile, 
  artisan: ArtisanProfile, 
  factors: MatchResult['compatibilityFactors']
): string[] {
  const recommendations: string[] = [];
  
  if (factors.categoryMatch > 0.8) {
    recommendations.push('Excellent category match - this artisan specializes in exactly what you\'re looking for');
  }
  
  if (factors.priceCompatibility > 0.7) {
    recommendations.push('Price range aligns well with your budget');
  }
  
  if (factors.locationProximity > 0.8) {
    recommendations.push('Local artisan - easy to meet and collaborate in person');
  }
  
  if (artisan.rating > 4.5) {
    recommendations.push('Highly rated artisan with excellent customer feedback');
  }
  
  if (artisan.experience > 10) {
    recommendations.push('Experienced artisan with extensive portfolio');
  }
  
  return recommendations;
}

function generatePotentialProjects(buyer: BuyerProfile, artisan: ArtisanProfile): string[] {
  const projects: string[] = [];
  
  buyer.preferences.categories.forEach(category => {
    if (artisan.specialties.some(specialty => specialty.toLowerCase().includes(category.toLowerCase()))) {
      projects.push(`${category} project tailored to your preferences`);
    }
  });
  
  buyer.preferences.occasions.forEach(occasion => {
    projects.push(`Custom ${occasion} piece`);
  });
  
  return projects.slice(0, 5); // Limit to 5 projects
}

function estimateTimeline(artisanExperience: number, categories: string[]): string {
  const baseTime = artisanExperience > 10 ? '2-3 weeks' : artisanExperience > 5 ? '3-4 weeks' : '4-6 weeks';
  const complexityMultiplier = categories.length > 2 ? '1-2 weeks additional' : '';
  
  return `${baseTime}${complexityMultiplier ? ` (${complexityMultiplier} for complex requirements)` : ''}`;
}

function generateCommunicationTips(buyer: BuyerProfile, artisan: ArtisanProfile): string[] {
  const tips: string[] = [];
  
  if (artisan.languages.includes('English')) {
    tips.push('Artisan speaks English - easy communication');
  } else {
    tips.push('Consider using translation tools for communication');
  }
  
  if (buyer.experience === 'beginner') {
    tips.push('Ask for detailed explanations and guidance throughout the process');
  }
  
  if (artisan.availability === 'busy') {
    tips.push('Artisan is currently busy - discuss timeline expectations early');
  }
  
  tips.push('Share reference images and detailed requirements');
  tips.push('Discuss payment terms and delivery options upfront');
  
  return tips;
}

function generateMatchmakingInsights(
  matches: MatchResult[], 
  input: MatchmakingInput
): {
  marketAnalysis: string;
  pricingInsights: string;
  availabilityInsights: string;
  recommendations: string[];
} {
  const availableArtisans = matches.filter(m => m.artisan.availability === 'available').length;
  const highRatedArtisans = matches.filter(m => m.artisan.rating > 4.0).length;
  const avgPrice = matches.length > 0 ? 
    matches.reduce((sum, m) => sum + (m.artisan.priceRange.min + m.artisan.priceRange.max) / 2, 0) / matches.length : 0;

  const marketAnalysis = `Found ${matches.length} compatible artisans out of ${input.artisanProfiles.length} total. ${highRatedArtisans} have ratings above 4.0, and ${availableArtisans} are currently available.`;

  const pricingInsights = `Average price range is ₹${Math.round(avgPrice)}. ${matches.filter(m => m.compatibilityFactors.priceCompatibility > 0.7).length} artisans have good price compatibility with your budget.`;

  const availabilityInsights = `${availableArtisans} artisans are available for immediate projects. Consider booking early for popular artisans.`;

  const recommendations = [
    'Contact top 3 matches to discuss your project requirements',
    'Ask for portfolios and previous work samples',
    'Discuss timeline and delivery expectations',
    'Consider local artisans for easier collaboration',
    'Review customer feedback and ratings before finalizing'
  ];

  return {
    marketAnalysis,
    pricingInsights,
    availabilityInsights,
    recommendations
  };
}
