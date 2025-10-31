import { NextRequest, NextResponse } from 'next/server';
import { EnhancedSchemeService } from '@/lib/services/EnhancedSchemeService';

interface SchemeQueryParams {
  action?: 'list' | 'recommend' | 'assess' | 'apply' | 'track' | 'analytics';
  category?: string;
  state?: string;
  minBenefit?: string;
  maxBenefit?: string;
  search?: string;
  limit?: string;
  offset?: string;
  artisanId?: string;
  schemeId?: string;
  applicationId?: string;
}

/**
 * GET method for various scheme operations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: SchemeQueryParams = {
      action: (searchParams.get('action') as any) || 'list',
      category: searchParams.get('category') || undefined,
      state: searchParams.get('state') || undefined,
      minBenefit: searchParams.get('minBenefit') || undefined,
      maxBenefit: searchParams.get('maxBenefit') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0',
      artisanId: searchParams.get('artisanId') || undefined,
      schemeId: searchParams.get('schemeId') || undefined,
      applicationId: searchParams.get('applicationId') || undefined,
    };

    console.log('🏛️ Enhanced Schemes API called with params:', params);

    const schemeService = EnhancedSchemeService.getInstance();

    switch (params.action) {
      case 'list':
        const filters = {
          category: params.category,
          state: params.state,
          minBenefit: params.minBenefit ? parseInt(params.minBenefit) : undefined,
          maxBenefit: params.maxBenefit ? parseInt(params.maxBenefit) : undefined,
          search: params.search,
          limit: parseInt(params.limit || '20'),
          offset: parseInt(params.offset || '0'),
        };

        const schemesResult = await schemeService.getSchemes(filters);
        
        return NextResponse.json({
          success: true,
          data: schemesResult.schemes,
          pagination: {
            total: schemesResult.total,
            limit: filters.limit,
            offset: filters.offset,
            hasMore: filters.offset + filters.limit < schemesResult.total
          },
          timestamp: new Date().toISOString()
        });

      case 'analytics':
        const analytics = await schemeService.getSchemeAnalytics();
        
        return NextResponse.json({
          success: true,
          data: analytics,
          timestamp: new Date().toISOString()
        });

      case 'track':
        if (!params.applicationId) {
          return NextResponse.json(
            { success: false, error: 'applicationId is required for tracking' },
            { status: 400 }
          );
        }

        const application = await schemeService.trackApplication(params.applicationId);
        
        if (!application) {
          return NextResponse.json(
            { success: false, error: 'Application not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: application,
          timestamp: new Date().toISOString()
        });

      case 'recommend':
        if (!params.artisanId) {
          return NextResponse.json(
            { success: false, error: 'artisanId is required for recommendations' },
            { status: 400 }
          );
        }

        // Mock artisan profile - in real implementation, fetch from database
        const mockProfile = {
          id: params.artisanId,
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
            employeeCount: 3,
            registrationNumber: 'REG123456'
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

        const recommendations = await schemeService.getRecommendations(
          mockProfile,
          parseInt(params.limit || '10')
        );

        return NextResponse.json({
          success: true,
          data: recommendations,
          profile: mockProfile,
          timestamp: new Date().toISOString()
        });

      case 'assess':
        if (!params.schemeId || !params.artisanId) {
          return NextResponse.json(
            { success: false, error: 'schemeId and artisanId are required for assessment' },
            { status: 400 }
          );
        }

        // Use same mock profile as above
        const assessmentProfile = {
          id: params.artisanId,
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

        const assessment = await schemeService.assessEligibility(params.schemeId, assessmentProfile);

        return NextResponse.json({
          success: true,
          data: assessment,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${params.action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Enhanced Schemes API error:', error);
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
 * POST method for scheme applications and updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, artisanId, schemeId, formData, documents, applicationId } = body;

    console.log('🏛️ Enhanced Schemes API POST called with action:', action);

    const schemeService = EnhancedSchemeService.getInstance();

    switch (action) {
      case 'apply':
        if (!artisanId || !schemeId || !formData) {
          return NextResponse.json(
            { success: false, error: 'artisanId, schemeId, and formData are required' },
            { status: 400 }
          );
        }

        const application = await schemeService.submitApplication(
          schemeId,
          artisanId,
          formData,
          documents || []
        );

        return NextResponse.json({
          success: true,
          data: application,
          message: 'Application submitted successfully',
          timestamp: new Date().toISOString()
        });

      case 'get_applications':
        if (!artisanId) {
          return NextResponse.json(
            { success: false, error: 'artisanId is required' },
            { status: 400 }
          );
        }

        const applications = await schemeService.getApplicationsByArtisan(artisanId);

        return NextResponse.json({
          success: true,
          data: applications,
          count: applications.length,
          timestamp: new Date().toISOString()
        });

      case 'update_profile':
        // In a real implementation, this would update the artisan profile
        return NextResponse.json({
          success: true,
          message: 'Profile updated successfully',
          timestamp: new Date().toISOString()
        });

      case 'save_preferences':
        // In a real implementation, this would save user preferences
        return NextResponse.json({
          success: true,
          message: 'Preferences saved successfully',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Enhanced Schemes API POST error:', error);
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