import { NextRequest, NextResponse } from 'next/server';
import { OptimizedArtisanRetrievalService } from '@/lib/services/OptimizedArtisanRetrievalService';

// Simple profession-based intelligent matching API

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const startTime = Date.now();
    
    console.log('🔍 Intelligent Match API called with query:', body.query);

    // Enhanced profession detection with Gemini AI fallback
    const { SimpleProfessionMatcher } = await import('@/lib/services/SimpleProfessionMatcher');
    const matcher = SimpleProfessionMatcher.getInstance();
    let professionMatch = matcher.detectProfession(body.query);
    
    // If confidence is low, try Gemini AI for better detection
    if (professionMatch.confidence < 0.6) {
      try {
        const { GoogleGenerativeAIService } = await import('@/lib/services/GoogleGenerativeAIService');
        const aiService = GoogleGenerativeAIService.getInstance();
        
        const requirements = await aiService.extractRequirements(body.query);
        const aiProfessionDetection = await aiService.detectProfessions(requirements);
        
        // Use AI result if it has higher confidence
        if (aiProfessionDetection.confidence > professionMatch.confidence) {
          professionMatch = {
            profession: aiProfessionDetection.primaryProfession,
            confidence: aiProfessionDetection.confidence,
            matchedKeywords: [...requirements.products, ...requirements.materials, ...requirements.techniques]
          };
          console.log(`🤖 Enhanced with Gemini AI: ${professionMatch.profession} (confidence: ${professionMatch.confidence.toFixed(2)})`);
        }
      } catch (aiError) {
        console.log('⚠️ Gemini AI fallback failed, using simple detection:', aiError instanceof Error ? aiError.message : 'Unknown error');
      }
    }
    
    console.log(`🎯 Final detected profession: ${professionMatch.profession} (confidence: ${professionMatch.confidence.toFixed(2)})`);
    console.log(`🔍 Matched keywords: ${professionMatch.matchedKeywords.join(', ')}`);
    
    // Get artisan retrieval service
    const retrievalService = OptimizedArtisanRetrievalService.getInstance();
    
    // Retrieve artisans using detected profession
    const retrievalOptions = {
      professions: [professionMatch.profession],
      maxResults: Math.min(body.maxResults || 20, 100),
      sortBy: body.sortBy || 'relevance'
    };

    // Get artisans for detected profession
    let { artisans, metrics } = await retrievalService.retrieveArtisans(retrievalOptions);
    
    // If no artisans found with exact profession match, try broader search for exact matches only
    if (artisans.length === 0) {
      console.log('⚠️ No artisans found for detected profession, trying broader search for exact matches...');
      
      // Try without profession filter to get all artisans, then filter manually for EXACT matches only
      const allOptions = { maxResults: 100 }; // Get more artisans to ensure we find matches
      const allResult = await retrievalService.retrieveArtisans(allOptions);
      
      // Filter manually by profession - ONLY exact matches, no partial matches
      const exactMatches = allResult.artisans.filter(artisan => {
        const profession = artisan.artisticProfession?.toLowerCase().trim();
        const detected = professionMatch.profession.toLowerCase().trim();
        return profession === detected;
      });
      
      // Only use exact matches - no partial matches to ensure strict profession filtering
      artisans = exactMatches.slice(0, body.maxResults || 20);
      
      console.log(`🔍 Exact profession filtering found ${artisans.length} artisans for ${professionMatch.profession}`);
    }

    console.log(`📊 Retrieved ${artisans.length} artisans for profession: ${professionMatch.profession}`);
    
    // Log artisan professions for debugging
    if (artisans.length > 0) {
      const professionCounts = artisans.reduce((acc, artisan) => {
        const profession = artisan.artisticProfession || 'unknown';
        acc[profession] = (acc[profession] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📊 Artisan professions found:', professionCounts);
    }

    if (artisans.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_ARTISANS_AVAILABLE',
          message: 'No artisans found matching your criteria',
          suggestion: 'Try broadening your search criteria or removing filters'
        }
      }, { status: 404 });
    }

    // Strict profession filtering - only include exact profession matches
    const matches = artisans
      .filter(artisan => {
        // Only include artisans with exact profession match
        const artisanProfession = artisan.artisticProfession?.toLowerCase().trim();
        const detectedProfession = professionMatch.profession.toLowerCase().trim();
        return artisanProfession === detectedProfession;
      })
      .map((artisan, index) => {
        const artisanProfession = artisan.artisticProfession?.toLowerCase().trim();
        const detectedProfession = professionMatch.profession.toLowerCase().trim();
        
        // Since we filtered for exact matches, all should have perfect profession score
        const professionScore = artisanProfession === detectedProfession ? 1.0 : 0;
        
        // Calculate performance score
        const performanceMetrics = artisan.artisanConnectProfile?.performanceMetrics;
        const performanceScore = performanceMetrics ? 
          (performanceMetrics.customerSatisfaction / 5 * 0.4 + 
           performanceMetrics.completionRate * 0.3 + 
           Math.min(performanceMetrics.totalOrders / 100, 1) * 0.3) : 0.5;
        
        // Combined relevance score (profession match is guaranteed, so focus on performance)
        const relevanceScore = (professionScore * 0.7 + performanceScore * 0.3);
        
        return {
          artisan: {
            uid: artisan.uid,
            name: artisan.name,
            artisticProfession: artisan.artisticProfession,
            description: artisan.description,
            profileImage: artisan.profileImage,
            address: artisan.address
          },
          relevanceScore: Math.round(relevanceScore * 100) / 100,
          explanation: {
            primaryReason: `Exact match for ${artisan.artisticProfession}`,
            detailedReasons: [
              `Perfect profession match: ${professionMatch.profession}`,
              `Customer satisfaction: ${performanceMetrics?.customerSatisfaction?.toFixed(1) || 'N/A'}/5`,
              `Completion rate: ${Math.round((performanceMetrics?.completionRate || 0) * 100)}%`
            ],
            matchedKeywords: professionMatch.matchedKeywords,
            confidenceLevel: professionMatch.confidence > 0.5 ? 'high' : 'medium'
          },
          professionScore,
          performanceScore
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore) // Sort by performance since profession is guaranteed match
      .map((match, index) => ({ ...match, rank: index + 1 })); // Add rank after sorting

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Intelligent matching: ${matches.length} matches`);

    // Return successful result
    return NextResponse.json({
      success: true,
      data: {
        matches,
        totalFound: matches.length,
        processingTime,
        queryAnalysis: {
          detectedProfession: professionMatch.profession,
          extractedSkills: professionMatch.matchedKeywords,
          confidence: professionMatch.confidence,
          sentiment: 'neutral'
        },
        systemHealth: {
          aiServiceHealthy: true,
          fallbackUsed: false,
          cacheHit: false
        },
        searchId: `intelligent_${Date.now()}`,
        searchMethod: 'intelligent'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        suggestion: 'Please try again later'
      }
    }, { status: 500 });
  }
}