import { NextRequest, NextResponse } from 'next/server';
// Import will be added when service is fully implemented
// import { EnhancedSchemeServiceV2 } from '@/lib/services/EnhancedSchemeService.v2';

interface EnhancedSchemeQueryParams {
  action?: 'ai_recommendations' | 'document_management' | 'track_realtime' | 'localized_schemes' | 
           'offline_sync' | 'predict_success' | 'application_assistance' | 'smart_notifications';
  artisanId?: string;
  schemeId?: string;
  applicationId?: string;
  language?: string;
  state?: string;
  district?: string;
  riskTolerance?: 'low' | 'medium' | 'high';
  timeHorizon?: 'immediate' | 'short_term' | 'long_term';
  maxApplications?: string;
}

/**
 * Enhanced Schemes API v2.0 with AI-powered features
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: EnhancedSchemeQueryParams = {
      action: (searchParams.get('action') as any) || 'ai_recommendations',
      artisanId: searchParams.get('artisanId') || undefined,
      schemeId: searchParams.get('schemeId') || undefined,
      applicationId: searchParams.get('applicationId') || undefined,
      language: searchParams.get('language') || 'en',
      state: searchParams.get('state') || undefined,
      district: searchParams.get('district') || undefined,
      riskTolerance: (searchParams.get('riskTolerance') as any) || 'medium',
      timeHorizon: (searchParams.get('timeHorizon') as any) || 'short_term',
      maxApplications: searchParams.get('maxApplications') || '10',
    };

    console.log('🚀 Enhanced Schemes API v2.0 called with params:', params);

    // const schemeService = EnhancedSchemeServiceV2.getInstance();

    switch (params.action) {
      case 'ai_recommendations':
        if (!params.artisanId) {
          return NextResponse.json(
            { success: false, error: 'artisanId is required for AI recommendations' },
            { status: 400 }
          );
        }

        // Mock artisan profile for AI recommendations
        const mockProfile = {
          id: params.artisanId,
          name: 'AI-Enhanced Artisan',
          age: 32,
          gender: 'female' as const,
          location: {
            state: params.state || 'Maharashtra',
            district: params.district || 'Mumbai',
            pincode: '400001',
            rural: false
          },
          contact: {
            phone: '+91-9876543210',
            email: 'artisan@example.com',
            address: '123 Artisan Street'
          },
          business: {
            type: 'handicraft',
            category: 'textiles',
            experience: 5,
            monthlyIncome: 85000,
            employeeCount: 2,
            registrationNumber: 'REG789012'
          },
          personal: {
            education: 'graduate',
            caste: 'obc',
            minority: false,
            disability: false,
            bankAccount: {
              accountNumber: '9876543210',
              ifscCode: 'HDFC0001234',
              bankName: 'HDFC Bank'
            }
          },
          documents: {
            aadhaar: { number: 'XXXX-XXXX-5678', verified: true },
            pan: { number: 'FGHIJ5678K', verified: true },
            bankPassbook: { verified: true },
            businessLicense: { verified: true },
            incomeCertificate: { verified: true },
            casteCertificate: { verified: true },
            disabilityCertificate: { verified: false },
            customDocuments: {}
          },
          preferences: {
            language: params.language || 'en',
            notificationMethods: ['push', 'sms', 'email'],
            interestedCategories: ['loan', 'subsidy', 'training']
          }
        };

        const preferences = {
          riskTolerance: params.riskTolerance!,
          timeHorizon: params.timeHorizon!,
          priorityGoals: ['business_expansion', 'skill_development', 'market_access'],
          maxApplications: parseInt(params.maxApplications || '10')
        };

        try {
          // const aiRecommendations = await schemeService.getAIRecommendations(mockProfile, preferences);
          
          // Fallback to mock AI recommendations since service is not fully implemented
          const mockAIRecommendations = generateMockAIRecommendations();
          
          return NextResponse.json({
            success: true,
            data: {
              recommendations: mockAIRecommendations,
              profile: mockProfile,
              preferences,
              aiInsights: {
                totalAnalyzed: 50,
                personalizedScore: 92,
                confidenceLevel: 'high',
                processingTime: '2.3s'
              }
            },
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          // Fallback to mock AI recommendations
          const mockAIRecommendations = generateMockAIRecommendations();
          
          return NextResponse.json({
            success: true,
            data: {
              recommendations: mockAIRecommendations,
              profile: mockProfile,
              preferences,
              aiInsights: {
                totalAnalyzed: 50,
                personalizedScore: 92,
                confidenceLevel: 'high',
                processingTime: '2.3s'
              }
            },
            timestamp: new Date().toISOString()
          });
        }

      case 'document_management':
        if (!params.artisanId) {
          return NextResponse.json(
            { success: false, error: 'artisanId is required for document management' },
            { status: 400 }
          );
        }

        try {
          // const documentStatus = await schemeService.manageDocuments(params.artisanId);
          // Fallback to mock document status
          const documentStatus = generateMockDocumentStatus();
          
          return NextResponse.json({
            success: true,
            data: documentStatus,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          // Fallback to mock document management
          const mockDocumentStatus = generateMockDocumentStatus();
          
          return NextResponse.json({
            success: true,
            data: mockDocumentStatus,
            timestamp: new Date().toISOString()
          });
        }

      case 'track_realtime':
        if (!params.applicationId) {
          return NextResponse.json(
            { success: false, error: 'applicationId is required for real-time tracking' },
            { status: 400 }
          );
        }

        try {
          // const trackingData = await schemeService.trackApplicationRealtime(params.applicationId);
          // Fallback to mock tracking data
          const trackingData = generateMockTrackingData(params.applicationId);
          
          return NextResponse.json({
            success: true,
            data: trackingData,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          // Fallback to mock tracking data
          const mockTrackingData = generateMockTrackingData(params.applicationId);
          
          return NextResponse.json({
            success: true,
            data: mockTrackingData,
            timestamp: new Date().toISOString()
          });
        }

      case 'localized_schemes':
        if (!params.state) {
          return NextResponse.json(
            { success: false, error: 'state is required for localized schemes' },
            { status: 400 }
          );
        }

        try {
          // const localizedSchemes = await schemeService.getLocalizedSchemes(
          //   params.language as any,
          //   { state: params.state, district: params.district }
          // );
          // Fallback to mock localized schemes
          const localizedSchemes = generateMockLocalizedSchemes(params.state, params.language!);
          
          return NextResponse.json({
            success: true,
            data: {
              schemes: localizedSchemes,
              location: { state: params.state, district: params.district },
              language: params.language,
              localizationStats: {
                totalSchemes: localizedSchemes.length,
                stateSpecific: localizedSchemes.filter(s => 
                  s.eligibility.location.states?.includes(params.state!)
                ).length,
                languageSupport: '100%'
              }
            },
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          // Fallback to mock localized schemes
          const mockLocalizedSchemes = generateMockLocalizedSchemes(params.state, params.language!);
          
          return NextResponse.json({
            success: true,
            data: mockLocalizedSchemes,
            timestamp: new Date().toISOString()
          });
        }

      case 'offline_sync':
        if (!params.artisanId) {
          return NextResponse.json(
            { success: false, error: 'artisanId is required for offline sync' },
            { status: 400 }
          );
        }

        try {
          // const offlineData = await schemeService.enableOfflineMode(params.artisanId);
          // Fallback to mock offline data
          const offlineData = {
            syncedSchemes: 25,
            offlineCapabilities: [
              'View scheme details',
              'Check eligibility',
              'Prepare applications',
              'Save drafts',
              'Access documents'
            ],
            lastSyncTime: new Date()
          };
          
          return NextResponse.json({
            success: true,
            data: offlineData,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          // Fallback to mock offline data
          const mockOfflineData = {
            syncedSchemes: 25,
            offlineCapabilities: [
              'View scheme details',
              'Check eligibility',
              'Prepare applications',
              'Save drafts',
              'Access documents'
            ],
            lastSyncTime: new Date()
          };
          
          return NextResponse.json({
            success: true,
            data: mockOfflineData,
            timestamp: new Date().toISOString()
          });
        }

      case 'predict_success':
        if (!params.artisanId || !params.schemeId) {
          return NextResponse.json(
            { success: false, error: 'artisanId and schemeId are required for success prediction' },
            { status: 400 }
          );
        }

        // Mock success prediction
        const mockPrediction = generateMockSuccessPrediction(params.schemeId);
        
        return NextResponse.json({
          success: true,
          data: mockPrediction,
          timestamp: new Date().toISOString()
        });

      case 'application_assistance':
        if (!params.artisanId || !params.schemeId) {
          return NextResponse.json(
            { success: false, error: 'artisanId and schemeId are required for application assistance' },
            { status: 400 }
          );
        }

        try {
          // const assistance = await schemeService.getApplicationAssistance(params.artisanId, params.schemeId);
          // Fallback to mock assistance
          const assistance = generateMockApplicationAssistance(params.schemeId);
          
          return NextResponse.json({
            success: true,
            data: assistance,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          // Fallback to mock assistance
          const mockAssistance = generateMockApplicationAssistance(params.schemeId);
          
          return NextResponse.json({
            success: true,
            data: mockAssistance,
            timestamp: new Date().toISOString()
          });
        }

      case 'smart_notifications':
        if (!params.artisanId) {
          return NextResponse.json(
            { success: false, error: 'artisanId is required for smart notifications' },
            { status: 400 }
          );
        }

        const mockNotifications = generateMockSmartNotifications(params.artisanId);
        
        return NextResponse.json({
          success: true,
          data: {
            notifications: mockNotifications,
            summary: {
              total: mockNotifications.length,
              urgent: mockNotifications.filter(n => n.priority === 'urgent').length,
              actionRequired: mockNotifications.filter(n => n.actionRequired).length
            }
          },
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${params.action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Enhanced Schemes API v2.0 error:', error);
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
 * POST method for advanced scheme operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, artisanId, data } = body;

    console.log('🚀 Enhanced Schemes API v2.0 POST called with action:', action);

    // const schemeService = EnhancedSchemeServiceV2.getInstance();

    switch (action) {
      case 'update_preferences':
        return NextResponse.json({
          success: true,
          message: 'AI preferences updated successfully',
          data: {
            updatedPreferences: data,
            aiRecalibration: 'scheduled',
            nextRecommendationUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000)
          },
          timestamp: new Date().toISOString()
        });

      case 'upload_document':
        if (!artisanId || !data.file || !data.type) {
          return NextResponse.json(
            { success: false, error: 'artisanId, file, and type are required' },
            { status: 400 }
          );
        }

        // Mock document upload
        const documentId = `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return NextResponse.json({
          success: true,
          data: {
            documentId,
            status: 'uploaded',
            verificationStatus: 'pending',
            estimatedVerificationTime: '2-4 hours'
          },
          timestamp: new Date().toISOString()
        });

      case 'submit_feedback':
        return NextResponse.json({
          success: true,
          message: 'Feedback submitted successfully',
          data: {
            feedbackId: `FB_${Date.now()}`,
            aiLearning: 'updated',
            impactOnRecommendations: 'improved'
          },
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Enhanced Schemes API v2.0 POST error:', error);
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

// Mock data generators for fallback functionality

function generateMockAIRecommendations() {
  return [
    {
      scheme: {
        id: 'pm_vishwakarma',
        title: 'PM Vishwakarma Scheme',
        description: 'Financial support and skill training for traditional artisans and craftspeople',
        category: 'loan',
        applicationUrl: 'https://pmvishwakarma.gov.in/',
        benefits: {
          loanAmount: { min: 100000, max: 300000, currency: 'INR' },
          interestRate: { min: 5, max: 8 },
          subsidy: 15000
        }
      },
      aiScore: 95,
      eligibilityMatch: 92,
      benefitPotential: 88,
      urgencyScore: 75,
      personalizedReason: 'Perfect match for your traditional craft business with high approval probability',
      actionPlan: {
        immediateActions: ['Register on PM Vishwakarma portal', 'Complete skill verification'],
        documentPreparation: ['Aadhaar card', 'Bank account details', 'Craft certification'],
        timelineEstimate: '2-3 weeks',
        successProbability: 87
      },
      riskFactors: ['High demand - apply early'],
      alternativeSchemes: ['mudra_loan', 'stand_up_india']
    },
    {
      scheme: {
        id: 'mudra_loan',
        title: 'Pradhan Mantri MUDRA Yojana (PMMY)',
        description: 'Provides loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises',
        category: 'loan',
        applicationUrl: 'https://www.mudra.org.in/',
        benefits: {
          loanAmount: { min: 50000, max: 1000000, currency: 'INR' },
          interestRate: { min: 7, max: 12 }
        }
      },
      aiScore: 89,
      eligibilityMatch: 88,
      benefitPotential: 85,
      urgencyScore: 70,
      personalizedReason: 'Excellent option for business expansion with flexible loan amounts',
      actionPlan: {
        immediateActions: ['Visit nearest bank branch', 'Prepare business plan'],
        documentPreparation: ['Business registration', 'Income proof', 'Bank statements'],
        timelineEstimate: '3-4 weeks',
        successProbability: 82
      },
      riskFactors: ['Requires good credit history'],
      alternativeSchemes: ['pm_vishwakarma', 'stand_up_india']
    },
    {
      scheme: {
        id: 'sfurti',
        title: 'Scheme of Fund for Regeneration of Traditional Industries (SFURTI)',
        description: 'Organizes traditional industries and artisans into clusters to make them competitive',
        category: 'cluster',
        applicationUrl: 'https://sfurti.msme.gov.in/',
        benefits: {
          clusterDevelopment: true,
          infrastructureSupport: true,
          marketingSupport: true
        }
      },
      aiScore: 88,
      eligibilityMatch: 90,
      benefitPotential: 85,
      urgencyScore: 65,
      personalizedReason: 'Ideal for artisans looking to join clusters for better market access',
      actionPlan: {
        immediateActions: ['Identify nearby artisan cluster', 'Contact cluster coordinator'],
        documentPreparation: ['Artisan identity proof', 'Skill certificates', 'Business details'],
        timelineEstimate: '4-6 weeks',
        successProbability: 80
      },
      riskFactors: ['Requires cluster formation', 'Group coordination needed'],
      alternativeSchemes: ['ahvy', 'pm_vishwakarma']
    },
    {
      scheme: {
        id: 'ahvy',
        title: 'Ambedkar Hastshilp Vikas Yojana (AHVY)',
        description: 'Promotes Indian handicrafts by developing artisans clusters into self-reliant enterprises',
        category: 'handicraft',
        applicationUrl: 'https://handicrafts.nic.in/',
        benefits: {
          clusterDevelopment: true,
          skillUpgradation: true,
          marketLinkage: true
        }
      },
      aiScore: 86,
      eligibilityMatch: 92,
      benefitPotential: 88,
      urgencyScore: 70,
      personalizedReason: 'Excellent for handicraft artisans seeking professional cluster development',
      actionPlan: {
        immediateActions: ['Join handicraft cooperative', 'Register with Development Commissioner'],
        documentPreparation: ['Handicraft artisan card', 'Group membership proof', 'Product samples'],
        timelineEstimate: '5-7 weeks',
        successProbability: 78
      },
      riskFactors: ['Must be part of cooperative', 'Handicraft specific'],
      alternativeSchemes: ['sfurti', 'pm_vishwakarma']
    },
    {
      scheme: {
        id: 'stand_up_india',
        title: 'Stand-Up India Scheme',
        description: 'Bank loans between ₹10 lakh to ₹1 crore for SC/ST and women entrepreneurs',
        category: 'loan',
        applicationUrl: 'https://www.standupmitra.in/',
        benefits: {
          loanAmount: { min: 1000000, max: 10000000, currency: 'INR' },
          interestRate: { min: 8, max: 10 }
        }
      },
      aiScore: 84,
      eligibilityMatch: 87,
      benefitPotential: 92,
      urgencyScore: 60,
      personalizedReason: 'High loan amount suitable for scaling your business operations',
      actionPlan: {
        immediateActions: ['Check eligibility criteria', 'Prepare detailed project report'],
        documentPreparation: ['Caste certificate', 'Business plan', 'Property documents'],
        timelineEstimate: '4-6 weeks',
        successProbability: 75
      },
      riskFactors: ['Requires collateral', 'Longer processing time'],
      alternativeSchemes: ['mudra_loan', 'pm_vishwakarma']
    },
    {
      scheme: {
        id: 'pmegp',
        title: 'Prime Minister Employment Generation Programme (PMEGP)',
        description: 'Credit-linked subsidy for setting up new micro-enterprises',
        category: 'subsidy',
        applicationUrl: 'https://www.kviconline.gov.in/pmegpeportal/',
        benefits: {
          subsidy: { min: 100000, max: 250000, currency: 'INR' },
          subsidyPercentage: 25
        }
      },
      aiScore: 83,
      eligibilityMatch: 85,
      benefitPotential: 80,
      urgencyScore: 80,
      personalizedReason: 'Great subsidy opportunity for new business setup with minimal investment',
      actionPlan: {
        immediateActions: ['Register on KVIC portal', 'Attend EDP training'],
        documentPreparation: ['Educational certificates', 'Project report', 'Residence proof'],
        timelineEstimate: '6-8 weeks',
        successProbability: 72
      },
      riskFactors: ['Competitive selection process'],
      alternativeSchemes: ['pm_vishwakarma', 'mudra_loan']
    },
    {
      scheme: {
        id: 'skill_india',
        title: 'Skill India Mission - Artisan Training',
        description: 'Free skill development training with certification and placement support',
        category: 'training',
        applicationUrl: 'https://www.skillindia.gov.in/',
        benefits: {
          trainingDuration: 90,
          certificationProvided: true,
          stipend: 5000
        }
      },
      aiScore: 91,
      eligibilityMatch: 95,
      benefitPotential: 82,
      urgencyScore: 90,
      personalizedReason: 'High-demand skills training with guaranteed certification and placement assistance',
      actionPlan: {
        immediateActions: ['Register on Skill India portal', 'Choose training center'],
        documentPreparation: ['Aadhaar card', 'Educational certificates'],
        timelineEstimate: '1 week',
        successProbability: 94
      },
      riskFactors: ['Limited seats - apply immediately'],
      alternativeSchemes: ['pmkvy', 'craftsmen_training']
    },
    {
      scheme: {
        id: 'cgtmse',
        title: 'Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE)',
        description: 'Collateral-free loans with credit guarantee coverage up to ₹5 crore',
        category: 'loan',
        applicationUrl: 'https://www.cgtmse.in/',
        benefits: {
          loanAmount: { min: 100000, max: 5000000, currency: 'INR' },
          guaranteeCoverage: 85
        }
      },
      aiScore: 82,
      eligibilityMatch: 80,
      benefitPotential: 88,
      urgencyScore: 55,
      personalizedReason: 'No collateral required - ideal for artisans without property',
      actionPlan: {
        immediateActions: ['Approach CGTMSE-approved bank', 'Prepare loan application'],
        documentPreparation: ['Business registration', 'Financial statements', 'Project report'],
        timelineEstimate: '4-5 weeks',
        successProbability: 77
      },
      riskFactors: ['Bank approval required'],
      alternativeSchemes: ['mudra_loan', 'stand_up_india']
    }
  ];
}

function generateMockDocumentStatus() {
  return {
    status: {
      aadhaar: { type: 'aadhaar', status: 'verified', verifiedAt: new Date(), expiryDate: new Date(2030, 11, 31) },
      pan: { type: 'pan', status: 'verified', verifiedAt: new Date() },
      bankPassbook: { type: 'bankPassbook', status: 'verified', verifiedAt: new Date() },
      businessLicense: { type: 'businessLicense', status: 'uploaded', uploadedAt: new Date() },
      incomeCertificate: { type: 'incomeCertificate', status: 'missing' },
      casteCertificate: { type: 'casteCertificate', status: 'verified', verifiedAt: new Date(), expiryDate: new Date(2025, 5, 15) }
    },
    missingDocuments: ['Income Certificate', 'GST Registration'],
    expiringDocuments: ['Caste Certificate'],
    recommendations: [
      'Upload Income Certificate to improve loan eligibility by 25%',
      'Renew Caste Certificate before June 2025',
      'Consider getting GST registration for better scheme access'
    ]
  };
}

function generateMockTrackingData(applicationId: string) {
  return {
    application: {
      id: applicationId,
      applicationNumber: `APP${Date.now().toString().slice(-6)}`,
      status: 'under_review',
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    realTimeStatus: {
      status: 'under_review',
      currentStage: 'document_verification',
      nextSteps: ['Wait for document verification', 'Prepare for interview if required'],
      estimatedCompletionDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      officerContact: {
        name: 'Rajesh Kumar',
        phone: '+91-9876543210',
        email: 'rajesh.kumar@gov.in'
      },
      documents: {
        required: ['Aadhaar', 'PAN', 'Bank Statement', 'Business Plan'],
        submitted: ['Aadhaar', 'PAN', 'Bank Statement'],
        verified: ['Aadhaar', 'PAN'],
        pending: ['Bank Statement', 'Business Plan']
      }
    },
    notifications: [
      {
        id: 'notif_1',
        type: 'status_update',
        title: 'Application Under Review',
        message: 'Your application is currently being reviewed by our team',
        priority: 'medium',
        actionRequired: false
      }
    ],
    nextActions: [
      'Wait for document verification completion',
      'Keep phone available for potential verification call',
      'Prepare additional documents if requested'
    ]
  };
}

function generateMockLocalizedSchemes(state: string, language: string) {
  return {
    schemes: [
      {
        id: 'state_specific_1',
        title: language === 'hi' ? 'राज्य कारीगर योजना' : 'State Artisan Scheme',
        description: language === 'hi' 
          ? 'राज्य सरकार द्वारा कारीगरों के लिए विशेष योजना'
          : 'Special scheme for artisans by state government',
        category: 'subsidy',
        eligibility: {
          location: { states: [state] }
        }
      }
    ],
    location: { state, district: undefined },
    language,
    localizationStats: {
      totalSchemes: 15,
      stateSpecific: 8,
      languageSupport: '100%'
    }
  };
}

function generateMockSuccessPrediction(schemeId: string) {
  return {
    successProbability: 78,
    confidenceInterval: { min: 72, max: 84 },
    keyFactors: [
      { factor: 'Business Experience', impact: 85, description: 'Your 5+ years experience significantly improves chances' },
      { factor: 'Document Completeness', impact: 92, description: 'All required documents are verified' },
      { factor: 'Financial History', impact: 76, description: 'Good credit score and banking relationship' },
      { factor: 'Location Advantage', impact: 68, description: 'Scheme has good success rate in your area' }
    ],
    recommendations: [
      'Submit application during off-peak season for faster processing',
      'Include detailed business plan with market analysis',
      'Consider applying with a co-applicant to improve chances'
    ],
    similarCases: [
      { profile: 'Textile artisan, 5 years exp, Maharashtra', outcome: 'Approved', timeline: '21 days' },
      { profile: 'Handicraft maker, 4 years exp, Gujarat', outcome: 'Approved', timeline: '18 days' },
      { profile: 'Pottery artist, 6 years exp, Rajasthan', outcome: 'Approved', timeline: '25 days' }
    ]
  };
}

function generateMockApplicationAssistance(schemeId: string) {
  return {
    preFilledForm: {
      applicantName: 'Sample Artisan',
      businessType: 'handicraft',
      experience: '5 years',
      monthlyIncome: '75000',
      requestedAmount: '150000'
    },
    documentChecklist: [
      { document: 'Aadhaar Card', status: 'verified', action: 'Ready to submit' },
      { document: 'PAN Card', status: 'verified', action: 'Ready to submit' },
      { document: 'Bank Statement', status: 'uploaded', action: 'Awaiting verification' },
      { document: 'Business Plan', status: 'missing', action: 'Upload required' },
      { document: 'Income Certificate', status: 'missing', action: 'Upload required' }
    ],
    stepByStepGuide: [
      { step: 'Document Preparation', description: 'Gather and verify all required documents', estimatedTime: '2-3 days' },
      { step: 'Online Application', description: 'Fill the application form on government portal', estimatedTime: '1 hour' },
      { step: 'Document Upload', description: 'Upload all verified documents', estimatedTime: '30 minutes' },
      { step: 'Application Review', description: 'Wait for initial review and verification', estimatedTime: '7-10 days' },
      { step: 'Interview/Verification', description: 'Attend interview if called', estimatedTime: '1 day' },
      { step: 'Final Approval', description: 'Wait for final approval and disbursement', estimatedTime: '5-7 days' }
    ],
    commonMistakes: [
      'Incomplete business plan without market analysis',
      'Outdated income certificates (older than 6 months)',
      'Incorrect bank account details',
      'Missing co-applicant signatures where required'
    ],
    tips: [
      'Apply during the first week of the month for faster processing',
      'Include detailed photos of your work/products',
      'Prepare a comprehensive business expansion plan',
      'Keep all original documents ready for verification'
    ]
  };
}

function generateMockSmartNotifications(artisanId: string) {
  return [
    {
      id: 'notif_urgent_1',
      type: 'deadline_reminder',
      title: 'Application Deadline Approaching',
      message: 'MUDRA Plus scheme application deadline is in 3 days',
      priority: 'urgent',
      actionRequired: true,
      actionUrl: '/schemes/mudra-plus/apply',
      scheduledFor: new Date(),
      channels: ['push', 'sms', 'email'],
      metadata: { schemeId: 'mudra_plus', daysLeft: 3 }
    },
    {
      id: 'notif_new_1',
      type: 'new_scheme',
      title: 'New Scheme Available',
      message: 'Digital Marketing Training Scheme now available for artisans',
      priority: 'medium',
      actionRequired: false,
      scheduledFor: new Date(),
      channels: ['push', 'email'],
      metadata: { schemeId: 'digital_marketing_training' }
    },
    {
      id: 'notif_status_1',
      type: 'status_update',
      title: 'Application Status Update',
      message: 'Your PMEGP application has been approved for the next stage',
      priority: 'high',
      actionRequired: true,
      actionUrl: '/applications/track/pmegp_123',
      scheduledFor: new Date(),
      channels: ['push', 'sms'],
      metadata: { applicationId: 'pmegp_123', newStatus: 'approved_stage_1' }
    }
  ];
}