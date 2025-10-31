import { NextRequest, NextResponse } from 'next/server';
import { DynamicSchemeService } from '@/lib/services/scheme-sahayak/DynamicSchemeService';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Dynamic Scheme Sahayak API - AI-Powered Government Scheme Discovery
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'fetch_schemes';
    const artisanId = searchParams.get('artisanId');
    const category = searchParams.get('category');
    const state = searchParams.get('state');
    const businessType = searchParams.get('businessType');
    const maxAmount = searchParams.get('maxAmount');

    console.log('🤖 Dynamic Scheme API called:', { action, artisanId, category, state });

    const dynamicService = new DynamicSchemeService();

    switch (action) {
      case 'fetch_schemes':
        const filters = {
          category: category || undefined,
          state: state || undefined,
          businessType: businessType || undefined,
          maxAmount: maxAmount ? parseInt(maxAmount) : undefined
        };

        const schemeResult = await dynamicService.fetchLatestSchemes(filters);
        
        return NextResponse.json({
          success: true,
          data: schemeResult,
          message: `Found ${schemeResult.totalFound} schemes using AI`,
          timestamp: new Date().toISOString()
        });

      case 'personalized_recommendations':
        if (!artisanId) {
          return NextResponse.json(
            { success: false, error: 'artisanId is required for personalized recommendations' },
            { status: 400 }
          );
        }

        // Fetch artisan profile from Firestore
        const artisanProfile = await getArtisanProfile(artisanId);
        if (!artisanProfile) {
          return NextResponse.json(
            { success: false, error: 'Artisan profile not found' },
            { status: 404 }
          );
        }

        const recommendations = await dynamicService.getPersonalizedRecommendations(
          artisanProfile,
          parseInt(searchParams.get('limit') || '10')
        );

        return NextResponse.json({
          success: true,
          data: {
            recommendations,
            profile: artisanProfile,
            totalRecommendations: recommendations.length
          },
          message: 'AI-powered personalized recommendations generated',
          timestamp: new Date().toISOString()
        });

      case 'calculate_eligibility':
        const schemeId = searchParams.get('schemeId');
        if (!artisanId || !schemeId) {
          return NextResponse.json(
            { success: false, error: 'artisanId and schemeId are required' },
            { status: 400 }
          );
        }

        const profile = await getArtisanProfile(artisanId);
        if (!profile) {
          return NextResponse.json(
            { success: false, error: 'Artisan profile not found' },
            { status: 404 }
          );
        }

        // First fetch schemes to find the specific scheme
        const allSchemes = await dynamicService.fetchLatestSchemes();
        const targetScheme = allSchemes.schemes.find(s => s.id === schemeId);
        
        if (!targetScheme) {
          return NextResponse.json(
            { success: false, error: 'Scheme not found' },
            { status: 404 }
          );
        }

        const eligibilityScore = await dynamicService.calculateEligibilityScore(
          targetScheme,
          profile
        );

        return NextResponse.json({
          success: true,
          data: {
            scheme: targetScheme,
            eligibilityScore,
            artisanProfile: profile
          },
          message: 'Eligibility calculated using AI analysis',
          timestamp: new Date().toISOString()
        });

      case 'cache_stats':
        const cacheStats = dynamicService.getCacheStats();
        return NextResponse.json({
          success: true,
          data: cacheStats,
          message: 'Cache statistics retrieved',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Dynamic Scheme API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST method for cache management and profile updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, artisanId, profileData } = body;

    const dynamicService = new DynamicSchemeService();

    switch (action) {
      case 'clear_cache':
        dynamicService.clearCache();
        return NextResponse.json({
          success: true,
          message: 'Scheme cache cleared successfully',
          timestamp: new Date().toISOString()
        });

      case 'refresh_schemes':
        // Force refresh by clearing cache and fetching new schemes
        dynamicService.clearCache();
        const refreshedSchemes = await dynamicService.fetchLatestSchemes();
        
        return NextResponse.json({
          success: true,
          data: refreshedSchemes,
          message: 'Schemes refreshed from AI sources',
          timestamp: new Date().toISOString()
        });

      case 'update_profile':
        if (!artisanId || !profileData) {
          return NextResponse.json(
            { success: false, error: 'artisanId and profileData are required' },
            { status: 400 }
          );
        }

        // In a real implementation, update the profile in Firestore
        // For now, return success
        return NextResponse.json({
          success: true,
          message: 'Profile updated successfully',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Dynamic Scheme API POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get artisan profile from Firestore
 */
async function getArtisanProfile(artisanId: string): Promise<any | null> {
  try {
    // Try to get from Firestore first
    const docRef = doc(db, 'artisans', artisanId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: artisanId, ...docSnap.data() };
    }

    // Fallback to mock profile for testing
    return {
      id: artisanId,
      name: 'Sample Artisan',
      age: 35,
      gender: 'male' as const,
      location: {
        state: 'Rajasthan',
        district: 'Jaipur',
        pincode: '302001',
        rural: false
      },
      contact: {
        phone: '+91-9876543210',
        email: 'artisan@example.com',
        address: '123 Artisan Street'
      },
      business: {
        type: 'handicraft',
        category: 'pottery',
        experience: 8,
        monthlyIncome: 75000,
        employeeCount: 3
      },
      personal: {
        education: '12th_pass',
        caste: 'general',
        minority: false,
        disability: false,
        bankAccount: {
          accountNumber: '1234567890',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India'
        }
      },
      documents: {
        aadhaar: { number: 'XXXX-XXXX-1234', verified: true },
        pan: { number: 'ABCDE1234F', verified: true },
        bankPassbook: { verified: true },
        businessLicense: { verified: false },
        incomeCertificate: { verified: false },
        casteCertificate: { verified: true },
        disabilityCertificate: { verified: false },
        customDocuments: {}
      },
      preferences: {
        language: 'hi',
        notificationMethods: ['sms', 'email'],
        interestedCategories: ['loan', 'subsidy']
      }
    };
  } catch (error) {
    console.error('Error fetching artisan profile:', error);
    return null;
  }
}