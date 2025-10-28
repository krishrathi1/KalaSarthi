/**
 * Enhanced Artisan Search API
 * Intelligent profession matching with AI-powered analysis and fallback support
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService, where } from '@/lib/firestore';
import { IUser } from '@/lib/models/User';
import { IntelligentMatchingOrchestrator } from '@/lib/services/IntelligentMatchingOrchestrator';
import { OptimizedArtisanRetrievalService } from '@/lib/services/OptimizedArtisanRetrievalService';
import { FallbackMatchingService } from '@/lib/services/FallbackMatchingService';

interface SearchRequest {
  query: string;
  profession?: string;
  location?: string;
  maxResults?: number;
  useIntelligentMatching?: boolean;
  enableExplanations?: boolean;
  minScore?: number;
  sortBy?: 'relevance' | 'rating' | 'experience' | 'location' | 'recent';
  materials?: string[];
  techniques?: string[];
  experienceLevel?: string[];
  availabilityStatus?: string[];
  qualityLevel?: string[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: SearchRequest = await request.json();
    
    if (!body.query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Enhanced search: "${body.query}" (intelligent: ${body.useIntelligentMatching !== false})`);

    // Initialize services
    const orchestrator = IntelligentMatchingOrchestrator.getInstance();
    const retrievalService = OptimizedArtisanRetrievalService.getInstance();
    const fallbackService = FallbackMatchingService.getInstance();

    // Determine if we should use intelligent matching (default: true)
    const useIntelligentMatching = body.useIntelligentMatching !== false;

    if (useIntelligentMatching) {
      try {
        // Get system status to check AI service health
        const systemStatus = await orchestrator.getSystemStatus();
        const aiHealthy = systemStatus.aiService?.healthy || false;

        // Retrieve artisans using optimized queries
        const retrievalOptions = {
          professions: body.profession ? [body.profession] : undefined,
          materials: body.materials,
          techniques: body.techniques,
          location: body.location ? { city: body.location } : undefined,
          experienceLevel: body.experienceLevel,
          availabilityStatus: body.availabilityStatus || ['available', 'busy'],
          qualityLevel: body.qualityLevel,
          maxResults: Math.min(body.maxResults || 20, 50),
          sortBy: body.sortBy || 'relevance'
        };

        const { artisans: retrievedArtisans, metrics } = await retrievalService.retrieveArtisans(retrievalOptions);
        console.log(`📊 Retrieved ${retrievedArtisans.length} artisans (cache hit: ${metrics.cacheHit})`);

        if (aiHealthy) {
          // Use intelligent matching
          const matchingOptions = {
            maxResults: body.maxResults || 20,
            minScore: body.minScore || 0.2,
            location: body.location
          };

          const matchingConfig = {
            enableExplanations: body.enableExplanations !== false,
            enableAnalytics: true,
            maxResults: body.maxResults || 20,
            minScore: body.minScore || 0.2
          };

          const result = await orchestrator.findMatchingArtisans(
            body.query,
            retrievedArtisans,
            matchingOptions,
            matchingConfig
          );

          console.log(`✅ Intelligent matching: ${result.matches.length} matches (confidence: ${result.confidence.toFixed(2)})`);

          return NextResponse.json({
            success: true,
            data: {
              matches: result.enhancedMatches.map(match => ({
                artisan: match.artisan,
                relevanceScore: match.relevanceScore,
                rank: match.rank,
                qualityLevel: match.relevanceScore > 0.7 ? 'high' : 
                             match.relevanceScore > 0.4 ? 'medium' : 'low',
                matchReasons: match.explanation.detailedReasons,
                professionMatch: match.professionMatch,
                materialMatch: match.materialMatch,
                techniqueMatch: match.techniqueMatch,
                explanation: body.enableExplanations !== false ? match.userFriendlyExplanation : undefined
              })),
              totalFound: result.totalFound,
              processingTime: Date.now() - startTime,
              queryAnalysis: {
                detectedProfession: result.queryAnalysis.professionMapping.professions[0]?.name || 'unknown',
                extractedSkills: result.queryAnalysis.extractedRequirements.techniques,
                extractedMaterials: result.queryAnalysis.extractedRequirements.materials,
                extractedProducts: result.queryAnalysis.extractedRequirements.products,
                sentiment: 'neutral',
                confidence: result.confidence,
                intent: result.queryAnalysis.detectedIntent,
                contextualFactors: result.queryAnalysis.contextualFactors
              },
              systemHealth: result.systemHealth,
              analytics: result.analytics,
              searchId: `intelligent_${Date.now()}`,
              searchType: 'intelligent'
            }
          });

        } else {
          // Use fallback matching when AI is unavailable
          console.log('⚠️ AI service unavailable, using fallback matching');
          
          const fallbackResult = await fallbackService.performFallbackMatching(
            body.query,
            retrievedArtisans,
            {
              maxResults: body.maxResults || 20,
              minScore: body.minScore || 0.1,
              enableFuzzyMatching: true,
              enableSynonymMatching: true,
              location: body.location
            }
          );

          console.log(`✅ Fallback matching: ${fallbackResult.matches.length} matches`);

          return NextResponse.json({
            success: true,
            data: {
              matches: fallbackResult.matches.map(match => ({
                artisan: match.artisan,
                relevanceScore: match.relevanceScore,
                rank: match.rank,
                qualityLevel: match.relevanceScore > 0.6 ? 'high' : 
                             match.relevanceScore > 0.3 ? 'medium' : 'low',
                matchReasons: match.explanation.detailedReasons,
                professionMatch: match.professionMatch,
                materialMatch: match.materialMatch,
                techniqueMatch: match.techniqueMatch
              })),
              totalFound: fallbackResult.totalFound,
              processingTime: fallbackResult.processingTime,
              queryAnalysis: {
                detectedProfession: fallbackResult.queryAnalysis.professionMapping.professions[0]?.name || 'unknown',
                extractedSkills: fallbackResult.queryAnalysis.extractedRequirements.techniques,
                extractedMaterials: fallbackResult.queryAnalysis.extractedRequirements.materials,
                sentiment: 'neutral',
                confidence: fallbackResult.confidence
              },
              searchId: `fallback_${Date.now()}`,
              searchType: 'fallback',
              fallbackUsed: true
            }
          });
        }

      } catch (intelligentError) {
        console.error('Intelligent matching failed, falling back to simple search:', intelligentError);
        // Fall through to simple search
      }
    }

    // Simple search (legacy mode or fallback)
    console.log('🔄 Using simple search mode');
    return await performSimpleSearch(body, startTime);

  } catch (error) {
    console.error('Enhanced search error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Search failed',
          suggestion: 'Try a simpler query or check your connection',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

async function performSimpleSearch(body: SearchRequest, startTime: number) {
  // Get all artisans
  const allArtisans = await FirestoreService.query<IUser>('users', [
    where('role', '==', 'artisan')
  ]);

  console.log(`📊 Found ${allArtisans.length} artisans in database`);

  // Filter and score artisans
  const queryWords = body.query.toLowerCase().split(/\s+/);
  const matches: any[] = [];

  for (const artisan of allArtisans) {
    let score = 0;
    const matchReasons: string[] = [];

    // Skip unavailable artisans unless specifically requested
    if (!body.availabilityStatus?.includes('unavailable') && 
        artisan.artisanConnectProfile?.availabilityStatus === 'unavailable') {
      continue;
    }

    // Profession matching
    if (artisan.artisticProfession) {
      const professionMatch = queryWords.some(word => 
        artisan.artisticProfession.toLowerCase().includes(word) ||
        word.includes(artisan.artisticProfession.toLowerCase())
      );
      if (professionMatch) {
        score += 0.8;
        matchReasons.push(`Profession: ${artisan.artisticProfession}`);
      }
    }

    // Name matching
    if (queryWords.some(word => artisan.name.toLowerCase().includes(word))) {
      score += 0.3;
      matchReasons.push(`Name: ${artisan.name}`);
    }

    // Description matching
    if (artisan.description) {
      const descriptionMatch = queryWords.some(word => 
        artisan.description.toLowerCase().includes(word)
      );
      if (descriptionMatch) {
        score += 0.5;
        matchReasons.push('Description match');
      }
    }

    // Location matching
    if (artisan.address) {
      const locationMatch = queryWords.some(word => 
        artisan.address.city?.toLowerCase().includes(word) ||
        artisan.address.state?.toLowerCase().includes(word)
      );
      if (locationMatch) {
        score += 0.4;
        matchReasons.push(`Location: ${artisan.address.city}, ${artisan.address.state}`);
      }
    }

    // Enhanced location matching
    if (artisan.artisanConnectProfile?.locationData?.address) {
      const locationData = artisan.artisanConnectProfile.locationData.address;
      const locationMatch = queryWords.some(word => 
        locationData.city?.toLowerCase().includes(word) ||
        locationData.state?.toLowerCase().includes(word)
      );
      if (locationMatch) {
        score += 0.4;
        matchReasons.push(`Location: ${locationData.city}, ${locationData.state}`);
      }
    }

    // Specialization matching
    if (artisan.artisanConnectProfile?.specializations) {
      const specializationMatch = artisan.artisanConnectProfile.specializations.some(spec =>
        queryWords.some(word => spec.toLowerCase().includes(word))
      );
      if (specializationMatch) {
        score += 0.6;
        matchReasons.push('Specialization match');
      }
    }

    // Skills and materials matching
    const matchingData = artisan.artisanConnectProfile?.matchingData;
    if (matchingData) {
      // Skills matching
      const skillMatch = matchingData.skills?.some(skill =>
        queryWords.some(word => skill.toLowerCase().includes(word))
      );
      if (skillMatch) {
        score += 0.5;
        matchReasons.push('Skill match');
      }

      // Materials matching
      const materialMatch = matchingData.materials?.some(material =>
        queryWords.some(word => material.toLowerCase().includes(word))
      );
      if (materialMatch) {
        score += 0.4;
        matchReasons.push('Material expertise');
      }

      // Techniques matching
      const techniqueMatch = matchingData.techniques?.some(technique =>
        queryWords.some(word => technique.toLowerCase().includes(word))
      );
      if (techniqueMatch) {
        score += 0.4;
        matchReasons.push('Technique expertise');
      }
    }

    // Enhanced keyword bonuses
    const enhancedKeywordBonuses = {
      'silver': () => {
        if (artisan.artisticProfession === 'jewelry' || 
            artisan.description?.toLowerCase().includes('silver') ||
            matchingData?.materials?.some(m => m.toLowerCase().includes('silver'))) {
          score += 0.7;
          matchReasons.push('Silver jewelry specialist');
        }
      },
      'wooden': () => {
        if (artisan.artisticProfession === 'woodworking' || 
            matchingData?.materials?.some(m => m.toLowerCase().includes('wood'))) {
          score += 0.7;
          matchReasons.push('Wood specialist');
        }
      },
      'handwoven': () => {
        if (artisan.artisticProfession === 'textiles' || 
            matchingData?.techniques?.some(t => t.toLowerCase().includes('weav'))) {
          score += 0.7;
          matchReasons.push('Handweaving specialist');
        }
      }
    };

    // Apply enhanced keyword bonuses
    queryWords.forEach(word => {
      if (enhancedKeywordBonuses[word as keyof typeof enhancedKeywordBonuses]) {
        enhancedKeywordBonuses[word as keyof typeof enhancedKeywordBonuses]();
      }
    });

    // Add to matches if score is above threshold
    const minScore = body.minScore || 0.2;
    if (score > minScore) {
      matches.push({
        artisan,
        relevanceScore: Math.min(score, 1.0),
        matchReasons,
        rank: 0,
        professionMatch: matchReasons.some(r => r.includes('Profession')),
        materialMatch: matchReasons.some(r => r.includes('Material')),
        techniqueMatch: matchReasons.some(r => r.includes('Technique'))
      });
    }
  }

  // Sort by relevance and limit results
  const sortedMatches = matches
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, body.maxResults || 20)
    .map((match, index) => ({
      ...match,
      rank: index + 1,
      qualityLevel: match.relevanceScore > 0.7 ? 'high' : 
                   match.relevanceScore > 0.4 ? 'medium' : 'low'
    }));

  console.log(`✅ Simple search: ${sortedMatches.length} matches`);

  return NextResponse.json({
    success: true,
    data: {
      matches: sortedMatches,
      totalFound: matches.length,
      processingTime: Date.now() - startTime,
      queryAnalysis: {
        detectedProfession: detectProfession(body.query),
        extractedSkills: queryWords,
        sentiment: 'neutral',
        confidence: 0.6
      },
      searchId: `simple_${Date.now()}`,
      searchType: 'simple'
    }
  });
}

function detectProfession(query: string): string {
  const professionKeywords = {
    'pottery': ['pottery', 'ceramic', 'clay', 'pot', 'vase'],
    'jewelry': ['jewelry', 'jewellery', 'necklace', 'ring', 'bracelet', 'earring', 'silver', 'gold'],
    'textiles': ['textile', 'fabric', 'weaving', 'saree', 'cloth'],
    'woodwork': ['wood', 'carving', 'furniture', 'sculpture'],
    'metalwork': ['metal', 'brass', 'copper', 'iron'],
    'painting': ['painting', 'art', 'canvas', 'folk']
  };

  const queryLower = query.toLowerCase();
  
  for (const [profession, keywords] of Object.entries(professionKeywords)) {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      return profession;
    }
  }
  
  return 'unknown';
}

export async function GET() {
  try {
    // Get system status
    const orchestrator = IntelligentMatchingOrchestrator.getInstance();
    const systemStatus = await orchestrator.getSystemStatus();
    
    return NextResponse.json({
      success: true,
      status: 'healthy',
      service: 'Enhanced Artisan Search with Intelligent Matching',
      timestamp: new Date().toISOString(),
      capabilities: {
        intelligentMatching: true,
        fallbackMatching: true,
        caching: true,
        explanations: true,
        analytics: true
      },
      systemHealth: systemStatus
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      status: 'healthy',
      service: 'Enhanced Artisan Search (Basic Mode)',
      timestamp: new Date().toISOString(),
      capabilities: {
        intelligentMatching: false,
        fallbackMatching: true,
        caching: false,
        explanations: false,
        analytics: false
      },
      error: 'Intelligent matching services unavailable'
    });
  }
}