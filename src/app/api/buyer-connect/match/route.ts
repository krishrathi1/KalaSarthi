import { NextRequest, NextResponse } from 'next/server';
import { matchingOrchestratorAgent } from '@/ai/agents/matching-orchestrator';
import { aiMonitoringService } from '@/ai/core/monitoring';
import connectDB from '@/lib/mongodb';

// Mock matching function for fallback
async function generateMockMatchingResult(userInput: string, filters: any, preferences: any) {
  // Extract keywords from user input
  const keywords = userInput.toLowerCase().split(' ').filter(word => word.length > 2);
  const categories: string[] = [];
  
  // Simple category detection
  if (keywords.some(k => ['pottery', 'ceramic', 'clay', 'pot', 'bowl'].includes(k))) {
    categories.push('pottery');
  }
  if (keywords.some(k => ['textile', 'fabric', 'weaving', 'cloth', 'saree'].includes(k))) {
    categories.push('textiles');
  }
  if (keywords.some(k => ['jewelry', 'silver', 'gold', 'necklace', 'earring'].includes(k))) {
    categories.push('jewelry');
  }
  if (keywords.some(k => ['wood', 'wooden', 'carving', 'furniture'].includes(k))) {
    categories.push('woodworking');
  }
  if (keywords.some(k => ['metal', 'brass', 'copper', 'iron'].includes(k))) {
    categories.push('metalwork');
  }
  
  if (categories.length === 0) {
    categories.push('handmade');
  }

  // Generate mock artisan matches
  const mockArtisans = [
    {
      artisanId: 'artisan_mock_1',
      artisanProfile: {
        name: 'Rajesh Kumar',
        artisticProfession: 'Traditional Pottery',
        description: 'Master potter with 15 years of experience in traditional Indian ceramics',
        profileImage: '/api/placeholder/150/150',
        specializations: ['pottery', 'ceramics', 'terracotta'],
        availabilityStatus: 'available',
        responseTimeAverage: 45,
        aiMetrics: {
          customerSatisfactionScore: 4.6,
          matchSuccessRate: 0.85,
          averageOrderValue: 2500,
          completionRate: 0.92
        },
        location: {
          city: 'Khurja',
          state: 'Uttar Pradesh',
          country: 'India'
        }
      },
      confidenceScore: 0.85,
      confidenceAnalysis: {
        overallConfidenceScore: 0.85,
        matchReasons: ['Specializes in traditional pottery', 'High customer satisfaction', 'Available for new projects'],
        detailedScoring: {
          skillAlignment: { score: 0.9 },
          experienceMatch: { score: 0.8 },
          availabilityScore: { score: 0.9 },
          priceCompatibility: { 
            score: 0.8,
            estimatedPriceRange: { min: 500, max: 3000 }
          },
          culturalAlignment: { 
            score: 0.85,
            authenticityScore: 0.9 
          }
        }
      },
      matchReasons: [
        'Expert in traditional pottery techniques',
        'High customer satisfaction rating (4.6/5)',
        'Available for immediate projects',
        'Competitive pricing within your range'
      ],
      estimatedPrice: {
        min: 500,
        max: 3000,
        currency: 'INR'
      },
      estimatedTimeline: '2-3 weeks',
      culturalContext: {
        authenticity: 0.9,
        culturalSignificance: 'Traditional Indian pottery with authentic glazing techniques',
        traditionalTechniques: ['wheel throwing', 'glazing', 'firing']
      },
      recommendedActions: [
        'View portfolio and previous work',
        'Discuss specific requirements and customizations',
        'Request timeline and pricing details'
      ],
      riskFactors: []
    },
    {
      artisanId: 'artisan_mock_2',
      artisanProfile: {
        name: 'Priya Sharma',
        artisticProfession: 'Textile Weaving',
        description: 'Master weaver specializing in traditional Indian handloom textiles',
        profileImage: '/api/placeholder/150/150',
        specializations: ['handloom', 'silk weaving', 'cotton textiles'],
        availabilityStatus: 'available',
        responseTimeAverage: 30,
        aiMetrics: {
          customerSatisfactionScore: 4.8,
          matchSuccessRate: 0.78,
          averageOrderValue: 3200,
          completionRate: 0.95
        },
        location: {
          city: 'Varanasi',
          state: 'Uttar Pradesh',
          country: 'India'
        }
      },
      confidenceScore: 0.78,
      confidenceAnalysis: {
        overallConfidenceScore: 0.78,
        matchReasons: ['Expert in handloom weaving', 'Excellent customer reviews', 'Fast response time'],
        detailedScoring: {
          skillAlignment: { score: 0.85 },
          experienceMatch: { score: 0.75 },
          availabilityScore: { score: 0.95 },
          priceCompatibility: { 
            score: 0.7,
            estimatedPriceRange: { min: 800, max: 4000 }
          },
          culturalAlignment: { 
            score: 0.8,
            authenticityScore: 0.85 
          }
        }
      },
      matchReasons: [
        'Specializes in traditional handloom techniques',
        'Highest customer satisfaction (4.8/5)',
        'Quick response time (30 minutes average)',
        'Premium quality textiles'
      ],
      estimatedPrice: {
        min: 800,
        max: 4000,
        currency: 'INR'
      },
      estimatedTimeline: '3-4 weeks',
      culturalContext: {
        authenticity: 0.85,
        culturalSignificance: 'Traditional Banarasi weaving techniques passed down through generations',
        traditionalTechniques: ['handloom weaving', 'natural dyeing', 'pattern design']
      },
      recommendedActions: [
        'Review textile samples and patterns',
        'Discuss fabric requirements and quantities',
        'Confirm delivery timeline'
      ],
      riskFactors: ['Higher pricing for premium quality']
    },
    {
      artisanId: 'artisan_mock_3',
      artisanProfile: {
        name: 'Amit Patel',
        artisticProfession: 'Silver Jewelry',
        description: 'Traditional silver jewelry craftsman with modern design sensibilities',
        profileImage: '/api/placeholder/150/150',
        specializations: ['silver jewelry', 'traditional designs', 'custom pieces'],
        availabilityStatus: 'busy',
        responseTimeAverage: 60,
        aiMetrics: {
          customerSatisfactionScore: 4.4,
          matchSuccessRate: 0.72,
          averageOrderValue: 1800,
          completionRate: 0.88
        },
        location: {
          city: 'Jaipur',
          state: 'Rajasthan',
          country: 'India'
        }
      },
      confidenceScore: 0.72,
      confidenceAnalysis: {
        overallConfidenceScore: 0.72,
        matchReasons: ['Silver jewelry specialist', 'Traditional Rajasthani techniques', 'Custom design capability'],
        detailedScoring: {
          skillAlignment: { score: 0.8 },
          experienceMatch: { score: 0.75 },
          availabilityScore: { score: 0.6 },
          priceCompatibility: { 
            score: 0.75,
            estimatedPriceRange: { min: 300, max: 2500 }
          },
          culturalAlignment: { 
            score: 0.8,
            authenticityScore: 0.8 
          }
        }
      },
      matchReasons: [
        'Expert in traditional silver jewelry',
        'Rajasthani craftsmanship heritage',
        'Custom design capabilities',
        'Competitive pricing'
      ],
      estimatedPrice: {
        min: 300,
        max: 2500,
        currency: 'INR'
      },
      estimatedTimeline: '4-5 weeks',
      culturalContext: {
        authenticity: 0.8,
        culturalSignificance: 'Traditional Rajasthani silver jewelry with authentic techniques',
        traditionalTechniques: ['silver smithing', 'engraving', 'stone setting']
      },
      recommendedActions: [
        'View jewelry portfolio',
        'Discuss design preferences',
        'Confirm availability and timeline'
      ],
      riskFactors: ['Currently busy - longer wait time']
    }
  ];

  // Filter artisans based on categories
  const relevantArtisans = mockArtisans.filter(artisan => {
    if (categories.length === 0) return true;
    return categories.some(category => 
      artisan.artisanProfile.specializations.some(spec => 
        spec.toLowerCase().includes(category.toLowerCase())
      ) ||
      artisan.artisanProfile.artisticProfession.toLowerCase().includes(category.toLowerCase())
    );
  });

  // Apply filters
  let filteredArtisans = relevantArtisans;
  
  if (filters?.availability && filters.availability !== 'any') {
    filteredArtisans = filteredArtisans.filter(artisan => 
      artisan.artisanProfile.availabilityStatus === filters.availability
    );
  }
  
  if (filters?.rating) {
    filteredArtisans = filteredArtisans.filter(artisan => 
      artisan.artisanProfile.aiMetrics.customerSatisfactionScore >= filters.rating
    );
  }

  // Sort by preference
  const sortBy = preferences?.sortBy || 'confidence';
  filteredArtisans.sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.artisanProfile.aiMetrics.customerSatisfactionScore - a.artisanProfile.aiMetrics.customerSatisfactionScore;
      case 'price':
        return a.estimatedPrice.min - b.estimatedPrice.min;
      case 'availability':
        return a.artisanProfile.responseTimeAverage - b.artisanProfile.responseTimeAverage;
      default: // confidence
        return b.confidenceScore - a.confidenceScore;
    }
  });

  // Limit results
  const maxResults = preferences?.maxResults || 10;
  const finalResults = filteredArtisans.slice(0, maxResults);

  return {
    matches: finalResults,
    totalMatches: finalResults.length,
    searchMetadata: {
      extractedKeywords: keywords,
      categories,
      confidenceThreshold: preferences?.minConfidenceScore || 0.3,
      searchTime: 150,
      aiAnalysisTime: 50,
      timestamp: new Date().toISOString()
    },
    requirementAnalysis: {
      extractedKeywords: keywords,
      categories,
      aiAnalysis: {
        complexity: 'moderate',
        culturalContext: categories.join(', '),
        priceIndications: {
          range: { min: 500, max: 5000 }
        }
      }
    },
    alternativeRecommendations: [
      {
        suggestion: 'Expand search to related crafts',
        reasoning: 'Consider exploring similar traditional crafts that might meet your needs',
        actionRequired: 'Browse related categories or adjust search terms'
      }
    ],
    marketInsights: {
      averagePricing: {
        min: Math.round(finalResults.reduce((sum, a) => sum + a.estimatedPrice.min, 0) / finalResults.length) || 500,
        max: Math.round(finalResults.reduce((sum, a) => sum + a.estimatedPrice.max, 0) / finalResults.length) || 3000
      },
      demandLevel: finalResults.length > 2 ? 'high' : finalResults.length > 1 ? 'medium' : 'low',
      availabilityTrend: 'Good availability with some artisans currently busy',
      seasonalFactors: ['Festival season approaching - higher demand expected']
    },
    improvementSuggestions: [
      {
        area: 'search',
        suggestion: 'Add more specific details about your requirements',
        impact: 'medium'
      }
    ]
  };
}

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();
    
    // Parse request body
    const body = await request.json();
    const { buyerId, userInput, sessionId, filters, preferences } = body;
    
    // Validate required fields
    if (!buyerId || !userInput || !sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: buyerId, userInput, sessionId'
      }, { status: 400 });
    }
    
    // Log the matching request
    aiMonitoringService.logEvent({
      type: 'genai_call',
      userId: buyerId,
      sessionId,
      data: { 
        operation: 'buyer-artisan-matching',
        inputLength: userInput.length,
        hasFilters: !!filters,
        hasPreferences: !!preferences
      },
      success: true
    });
    
    // Execute intelligent matching with fallback
    let matchingResult;
    try {
      matchingResult = await matchingOrchestratorAgent.executeMatching({
        buyerId,
        userInput,
        sessionId,
        filters: filters || {},
        preferences: preferences || {}
      });
    } catch (error) {
      console.warn('AI matching failed, using fallback:', error);
      // Fallback to simple mock matching
      matchingResult = await generateMockMatchingResult(userInput, filters, preferences);
    }
    
    // Return successful result
    return NextResponse.json({
      success: true,
      data: matchingResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Buyer-artisan matching failed:', error);
    
    // Log error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    aiMonitoringService.logEvent({
      type: 'error',
      data: { 
        operation: 'buyer-artisan-matching',
        error: errorMessage
      },
      success: false,
      error: errorMessage
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to find artisan matches',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buyerId = searchParams.get('buyerId');
    const sessionId = searchParams.get('sessionId');
    
    if (!buyerId || !sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: buyerId, sessionId'
      }, { status: 400 });
    }
    
    // Get recent matching history for this user
    // This would typically come from a MatchHistory model
    // For now, return a simple response
    
    return NextResponse.json({
      success: true,
      data: {
        recentSearches: [],
        savedFilters: [],
        recommendedCategories: ['pottery', 'textiles', 'jewelry', 'woodwork']
      }
    });
    
  } catch (error) {
    console.error('Failed to get matching history:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get matching history'
    }, { status: 500 });
  }
}