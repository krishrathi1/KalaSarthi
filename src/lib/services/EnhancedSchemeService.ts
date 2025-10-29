/**
 * Enhanced Scheme Sahayak Service
 * Comprehensive government scheme discovery, eligibility assessment, and application management
 */

import { FirestoreService, COLLECTIONS } from '@/lib/firestore';

// Enhanced scheme interfaces
export interface GovernmentScheme {
  id: string;
  title: string;
  titleHi: string;
  titleTa: string;
  description: string;
  descriptionHi: string;
  descriptionTa: string;
  category: 'loan' | 'subsidy' | 'training' | 'cluster' | 'export' | 'technology' | 'insurance' | 'pension';
  subCategory: string;
  ministry: string;
  department: string;
  launchDate: Date;
  lastUpdated: Date;
  status: 'active' | 'inactive' | 'suspended' | 'modified';
  
  // Eligibility criteria
  eligibility: {
    age: { min?: number; max?: number };
    income: { min?: number; max?: number; currency: string };
    businessType: string[];
    location: {
      states?: string[];
      districts?: string[];
      rural?: boolean;
      urban?: boolean;
    };
    experience: { min?: number; max?: number };
    education: string[];
    caste: string[];
    gender: string[];
    disability: boolean;
    minority: boolean;
    customCriteria: Record<string, any>;
  };
  
  // Benefits and features
  benefits: {
    loanAmount?: { min: number; max: number; currency: string };
    subsidyPercentage?: number;
    subsidyAmount?: { min: number; max: number; currency: string };
    interestRate?: { min: number; max: number };
    trainingDuration?: number;
    certificationProvided?: boolean;
    toolkitProvided?: boolean;
    marketLinkage?: boolean;
    customBenefits: string[];
  };
  
  // Application process
  application: {
    mode: 'online' | 'offline' | 'both';
    website?: string;
    mobileApp?: string;
    officeAddress?: string;
    processingTime: { min: number; max: number; unit: 'days' | 'weeks' | 'months' };
    applicationFee?: number;
    documentsRequired: string[];
    steps: string[];
    helplineNumber?: string;
    emailSupport?: string;
  };
  
  // Important dates
  dates: {
    applicationStart?: Date;
    applicationEnd?: Date;
    implementationStart?: Date;
    implementationEnd?: Date;
    renewalRequired?: boolean;
    renewalPeriod?: number;
  };
  
  // Performance metrics
  metrics: {
    totalBeneficiaries?: number;
    budgetAllocated?: number;
    budgetUtilized?: number;
    successRate?: number;
    averageProcessingTime?: number;
    userRating?: number;
    reviewCount?: number;
  };
  
  // Additional metadata
  metadata: {
    tags: string[];
    relatedSchemes: string[];
    supersededBy?: string;
    supersedes?: string[];
    officialNotifications: string[];
    faqs: Array<{ question: string; answer: string; questionHi: string; answerHi: string }>;
  };
}

export interface ArtisanProfile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  location: {
    state: string;
    district: string;
    pincode: string;
    rural: boolean;
  };
  contact: {
    phone: string;
    email: string;
    address: string;
  };
  business: {
    type: string;
    category: string;
    experience: number;
    monthlyIncome: number;
    employeeCount: number;
    registrationNumber?: string;
    gstNumber?: string;
  };
  personal: {
    education: string;
    caste: string;
    minority: boolean;
    disability: boolean;
    bankAccount: {
      accountNumber: string;
      ifscCode: string;
      bankName: string;
    };
  };
  documents: {
    aadhaar: { number: string; verified: boolean; url?: string };
    pan: { number: string; verified: boolean; url?: string };
    bankPassbook: { verified: boolean; url?: string };
    businessLicense: { verified: boolean; url?: string };
    incomeCertificate: { verified: boolean; url?: string };
    casteCertificate: { verified: boolean; url?: string };
    disabilityCertificate: { verified: boolean; url?: string };
    customDocuments: Record<string, { verified: boolean; url?: string }>;
  };
  preferences: {
    language: string;
    notificationMethods: string[];
    interestedCategories: string[];
  };
}

export interface SchemeApplication {
  id: string;
  schemeId: string;
  artisanId: string;
  applicationNumber: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'on_hold' | 'completed';
  submittedAt?: Date;
  lastUpdated: Date;
  
  // Application data
  formData: Record<string, any>;
  documentsSubmitted: string[];
  documentsVerified: string[];
  
  // Processing information
  processing: {
    currentStage: string;
    stageHistory: Array<{
      stage: string;
      timestamp: Date;
      officer?: string;
      remarks?: string;
    }>;
    expectedCompletionDate?: Date;
    actualCompletionDate?: Date;
  };
  
  // Communication
  communications: Array<{
    id: string;
    type: 'email' | 'sms' | 'call' | 'letter' | 'notification';
    direction: 'inbound' | 'outbound';
    content: string;
    timestamp: Date;
    read: boolean;
  }>;
  
  // Disbursement (for loan/subsidy schemes)
  disbursement?: {
    approvedAmount: number;
    disbursedAmount: number;
    disbursementDate?: Date;
    installments: Array<{
      amount: number;
      dueDate: Date;
      paidDate?: Date;
      status: 'pending' | 'paid' | 'overdue';
    }>;
  };
}

export interface EligibilityAssessment {
  schemeId: string;
  artisanId: string;
  eligible: boolean;
  score: number; // 0-100
  matchedCriteria: string[];
  failedCriteria: string[];
  recommendations: string[];
  missingDocuments: string[];
  estimatedBenefit: {
    amount?: number;
    description: string;
  };
  applicationComplexity: 'easy' | 'medium' | 'complex';
  successProbability: number; // 0-100
}

export interface SchemeRecommendation {
  scheme: GovernmentScheme;
  eligibility: EligibilityAssessment;
  priority: 'high' | 'medium' | 'low';
  reasoning: string[];
  actionItems: string[];
  deadline?: Date;
  estimatedTimeToApply: number; // in hours
}

/**
 * Enhanced Scheme Service with comprehensive features
 */
export class EnhancedSchemeService {
  private static instance: EnhancedSchemeService;

  private constructor() {}

  public static getInstance(): EnhancedSchemeService {
    if (!EnhancedSchemeService.instance) {
      EnhancedSchemeService.instance = new EnhancedSchemeService();
    }
    return EnhancedSchemeService.instance;
  }

  /**
   * Get all available schemes with filtering and pagination
   */
  public async getSchemes(filters?: {
    category?: string;
    state?: string;
    minBenefit?: number;
    maxBenefit?: number;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ schemes: GovernmentScheme[]; total: number }> {
    try {
      // In a real implementation, this would query a comprehensive database
      // For now, return enhanced mock data
      const schemes = await this.getMockSchemes();
      
      let filteredSchemes = schemes;
      
      if (filters) {
        if (filters.category) {
          filteredSchemes = filteredSchemes.filter(s => s.category === filters.category);
        }
        if (filters.state) {
          filteredSchemes = filteredSchemes.filter(s => 
            !s.eligibility.location.states || s.eligibility.location.states.includes(filters.state!)
          );
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredSchemes = filteredSchemes.filter(s => 
            s.title.toLowerCase().includes(searchLower) ||
            s.description.toLowerCase().includes(searchLower) ||
            s.titleHi.includes(filters.search!) ||
            s.descriptionHi.includes(filters.search!)
          );
        }
        if (filters.minBenefit && filters.maxBenefit) {
          filteredSchemes = filteredSchemes.filter(s => {
            const maxBenefit = s.benefits.loanAmount?.max || s.benefits.subsidyAmount?.max || 0;
            return maxBenefit >= filters.minBenefit! && maxBenefit <= filters.maxBenefit!;
          });
        }
      }
      
      const offset = filters?.offset || 0;
      const limit = filters?.limit || 50;
      
      return {
        schemes: filteredSchemes.slice(offset, offset + limit),
        total: filteredSchemes.length
      };
    } catch (error) {
      console.error('Error fetching schemes:', error);
      throw new Error('Failed to fetch schemes');
    }
  }

  /**
   * Assess eligibility for a specific scheme
   */
  public async assessEligibility(
    schemeId: string, 
    artisanProfile: ArtisanProfile
  ): Promise<EligibilityAssessment> {
    try {
      const schemes = await this.getMockSchemes();
      const scheme = schemes.find(s => s.id === schemeId);
      
      if (!scheme) {
        throw new Error('Scheme not found');
      }

      return this.calculateEligibility(scheme, artisanProfile);
    } catch (error) {
      console.error('Error assessing eligibility:', error);
      throw new Error('Failed to assess eligibility');
    }
  }

  /**
   * Get personalized scheme recommendations
   */
  public async getRecommendations(
    artisanProfile: ArtisanProfile,
    limit: number = 10
  ): Promise<SchemeRecommendation[]> {
    try {
      const { schemes } = await this.getSchemes();
      const recommendations: SchemeRecommendation[] = [];

      for (const scheme of schemes) {
        const eligibility = this.calculateEligibility(scheme, artisanProfile);
        
        if (eligibility.eligible || eligibility.score > 60) {
          const priority = this.calculatePriority(scheme, eligibility, artisanProfile);
          const reasoning = this.generateReasoning(scheme, eligibility, artisanProfile);
          const actionItems = this.generateActionItems(scheme, eligibility);
          
          recommendations.push({
            scheme,
            eligibility,
            priority,
            reasoning,
            actionItems,
            deadline: scheme.dates.applicationEnd,
            estimatedTimeToApply: this.estimateApplicationTime(scheme, eligibility)
          });
        }
      }

      // Sort by priority and eligibility score
      recommendations.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityWeight[a.priority];
        const bPriority = priorityWeight[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return b.eligibility.score - a.eligibility.score;
      });

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw new Error('Failed to get recommendations');
    }
  }

  /**
   * Submit application for a scheme
   */
  public async submitApplication(
    schemeId: string,
    artisanId: string,
    formData: Record<string, any>,
    documents: string[]
  ): Promise<SchemeApplication> {
    try {
      const applicationId = `APP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const applicationNumber = `${schemeId.toUpperCase()}_${Date.now().toString().slice(-6)}`;

      const application: SchemeApplication = {
        id: applicationId,
        schemeId,
        artisanId,
        applicationNumber,
        status: 'submitted',
        submittedAt: new Date(),
        lastUpdated: new Date(),
        formData,
        documentsSubmitted: documents,
        documentsVerified: [],
        processing: {
          currentStage: 'document_verification',
          stageHistory: [{
            stage: 'submitted',
            timestamp: new Date(),
            remarks: 'Application submitted successfully'
          }],
          expectedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        communications: []
      };

      // Store in Firestore
      await FirestoreService.create('scheme_applications', application);

      // Send confirmation notification
      await this.sendApplicationConfirmation(application);

      return application;
    } catch (error) {
      console.error('Error submitting application:', error);
      throw new Error('Failed to submit application');
    }
  }

  /**
   * Track application status
   */
  public async trackApplication(applicationId: string): Promise<SchemeApplication | null> {
    try {
      return await FirestoreService.get<SchemeApplication>('scheme_applications', applicationId);
    } catch (error) {
      console.error('Error tracking application:', error);
      return null;
    }
  }

  /**
   * Get applications by artisan
   */
  public async getApplicationsByArtisan(artisanId: string): Promise<SchemeApplication[]> {
    try {
      return await FirestoreService.query<SchemeApplication>(
        'scheme_applications',
        [['artisanId', '==', artisanId]]
      );
    } catch (error) {
      console.error('Error fetching applications:', error);
      return [];
    }
  }

  /**
   * Get scheme statistics and analytics
   */
  public async getSchemeAnalytics(): Promise<{
    totalSchemes: number;
    activeSchemes: number;
    totalBeneficiaries: number;
    totalBudget: number;
    categoryDistribution: Record<string, number>;
    stateDistribution: Record<string, number>;
    successRates: Record<string, number>;
  }> {
    try {
      const { schemes } = await this.getSchemes();
      
      const analytics = {
        totalSchemes: schemes.length,
        activeSchemes: schemes.filter(s => s.status === 'active').length,
        totalBeneficiaries: schemes.reduce((sum, s) => sum + (s.metrics.totalBeneficiaries || 0), 0),
        totalBudget: schemes.reduce((sum, s) => sum + (s.metrics.budgetAllocated || 0), 0),
        categoryDistribution: {} as Record<string, number>,
        stateDistribution: {} as Record<string, number>,
        successRates: {} as Record<string, number>
      };

      // Calculate distributions
      schemes.forEach(scheme => {
        analytics.categoryDistribution[scheme.category] = 
          (analytics.categoryDistribution[scheme.category] || 0) + 1;
        
        if (scheme.metrics.successRate) {
          analytics.successRates[scheme.category] = 
            (analytics.successRates[scheme.category] || 0) + scheme.metrics.successRate;
        }
      });

      return analytics;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw new Error('Failed to get analytics');
    }
  }

  // Private helper methods

  private calculateEligibility(scheme: GovernmentScheme, profile: ArtisanProfile): EligibilityAssessment {
    let score = 0;
    const matchedCriteria: string[] = [];
    const failedCriteria: string[] = [];
    const missingDocuments: string[] = [];
    const recommendations: string[] = [];

    // Age check
    if (scheme.eligibility.age.min && profile.age < scheme.eligibility.age.min) {
      failedCriteria.push(`Minimum age requirement: ${scheme.eligibility.age.min}`);
    } else if (scheme.eligibility.age.max && profile.age > scheme.eligibility.age.max) {
      failedCriteria.push(`Maximum age limit: ${scheme.eligibility.age.max}`);
    } else {
      score += 15;
      matchedCriteria.push('Age requirement met');
    }

    // Income check
    if (scheme.eligibility.income.min && profile.business.monthlyIncome < scheme.eligibility.income.min) {
      failedCriteria.push(`Minimum income requirement: ₹${scheme.eligibility.income.min}`);
    } else if (scheme.eligibility.income.max && profile.business.monthlyIncome > scheme.eligibility.income.max) {
      failedCriteria.push(`Maximum income limit: ₹${scheme.eligibility.income.max}`);
    } else {
      score += 20;
      matchedCriteria.push('Income criteria met');
    }

    // Business type check
    if (scheme.eligibility.businessType.length > 0) {
      if (scheme.eligibility.businessType.includes(profile.business.type)) {
        score += 20;
        matchedCriteria.push('Business type matches');
      } else {
        failedCriteria.push(`Business type must be one of: ${scheme.eligibility.businessType.join(', ')}`);
      }
    }

    // Location check
    if (scheme.eligibility.location.states && scheme.eligibility.location.states.length > 0) {
      if (scheme.eligibility.location.states.includes(profile.location.state)) {
        score += 15;
        matchedCriteria.push('Location requirement met');
      } else {
        failedCriteria.push(`Scheme available only in: ${scheme.eligibility.location.states.join(', ')}`);
      }
    }

    // Document verification
    const requiredDocs = scheme.application.documentsRequired;
    requiredDocs.forEach(doc => {
      const docKey = doc.toLowerCase().replace(/\s+/g, '');
      if (profile.documents[docKey as keyof typeof profile.documents]?.verified) {
        score += 5;
        matchedCriteria.push(`${doc} verified`);
      } else {
        missingDocuments.push(doc);
        recommendations.push(`Get ${doc} verified`);
      }
    });

    // Experience check
    if (scheme.eligibility.experience?.min && profile.business.experience < scheme.eligibility.experience.min) {
      failedCriteria.push(`Minimum experience required: ${scheme.eligibility.experience.min} years`);
    } else {
      score += 10;
      matchedCriteria.push('Experience requirement met');
    }

    const eligible = failedCriteria.length === 0 && missingDocuments.length <= 2;
    
    return {
      schemeId: scheme.id,
      artisanId: profile.id,
      eligible,
      score: Math.min(score, 100),
      matchedCriteria,
      failedCriteria,
      recommendations,
      missingDocuments,
      estimatedBenefit: {
        amount: scheme.benefits.loanAmount?.max || scheme.benefits.subsidyAmount?.max,
        description: this.generateBenefitDescription(scheme)
      },
      applicationComplexity: this.assessComplexity(scheme),
      successProbability: this.calculateSuccessProbability(scheme, score)
    };
  }

  private calculatePriority(
    scheme: GovernmentScheme, 
    eligibility: EligibilityAssessment, 
    profile: ArtisanProfile
  ): 'high' | 'medium' | 'low' {
    let priorityScore = 0;

    // High eligibility score
    if (eligibility.score > 80) priorityScore += 3;
    else if (eligibility.score > 60) priorityScore += 2;
    else priorityScore += 1;

    // High benefit amount
    const maxBenefit = scheme.benefits.loanAmount?.max || scheme.benefits.subsidyAmount?.max || 0;
    if (maxBenefit > 500000) priorityScore += 3;
    else if (maxBenefit > 100000) priorityScore += 2;
    else priorityScore += 1;

    // Deadline urgency
    if (scheme.dates.applicationEnd) {
      const daysLeft = Math.ceil((scheme.dates.applicationEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 30) priorityScore += 3;
      else if (daysLeft < 90) priorityScore += 2;
      else priorityScore += 1;
    }

    // User preferences
    if (profile.preferences.interestedCategories.includes(scheme.category)) {
      priorityScore += 2;
    }

    if (priorityScore >= 8) return 'high';
    if (priorityScore >= 5) return 'medium';
    return 'low';
  }

  private generateReasoning(
    scheme: GovernmentScheme, 
    eligibility: EligibilityAssessment, 
    profile: ArtisanProfile
  ): string[] {
    const reasoning: string[] = [];

    if (eligibility.eligible) {
      reasoning.push(`You are fully eligible for this scheme with ${eligibility.score}% match`);
    } else {
      reasoning.push(`You have ${eligibility.score}% eligibility match - some requirements need attention`);
    }

    const maxBenefit = scheme.benefits.loanAmount?.max || scheme.benefits.subsidyAmount?.max;
    if (maxBenefit) {
      reasoning.push(`Potential benefit up to ₹${maxBenefit.toLocaleString()}`);
    }

    if (scheme.dates.applicationEnd) {
      const daysLeft = Math.ceil((scheme.dates.applicationEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 30) {
        reasoning.push(`⚠️ Application deadline in ${daysLeft} days - apply soon!`);
      }
    }

    if (eligibility.successProbability > 70) {
      reasoning.push(`High success probability (${eligibility.successProbability}%) based on your profile`);
    }

    return reasoning;
  }

  private generateActionItems(scheme: GovernmentScheme, eligibility: EligibilityAssessment): string[] {
    const actions: string[] = [];

    if (eligibility.missingDocuments.length > 0) {
      actions.push(`Prepare documents: ${eligibility.missingDocuments.join(', ')}`);
    }

    if (eligibility.failedCriteria.length > 0) {
      actions.push('Address eligibility gaps before applying');
    }

    actions.push(`Visit ${scheme.application.website || 'government office'} to apply`);

    if (scheme.application.helplineNumber) {
      actions.push(`Call helpline ${scheme.application.helplineNumber} for assistance`);
    }

    return actions;
  }

  private generateBenefitDescription(scheme: GovernmentScheme): string {
    const benefits: string[] = [];

    if (scheme.benefits.loanAmount) {
      benefits.push(`Loan up to ₹${scheme.benefits.loanAmount.max.toLocaleString()}`);
    }

    if (scheme.benefits.subsidyAmount) {
      benefits.push(`Subsidy up to ₹${scheme.benefits.subsidyAmount.max.toLocaleString()}`);
    }

    if (scheme.benefits.subsidyPercentage) {
      benefits.push(`${scheme.benefits.subsidyPercentage}% subsidy`);
    }

    if (scheme.benefits.trainingDuration) {
      benefits.push(`${scheme.benefits.trainingDuration} days training`);
    }

    return benefits.join(', ') || 'Various benefits available';
  }

  private assessComplexity(scheme: GovernmentScheme): 'easy' | 'medium' | 'complex' {
    let complexityScore = 0;

    // Document requirements
    if (scheme.application.documentsRequired.length > 5) complexityScore += 2;
    else if (scheme.application.documentsRequired.length > 3) complexityScore += 1;

    // Application steps
    if (scheme.application.steps.length > 8) complexityScore += 2;
    else if (scheme.application.steps.length > 5) complexityScore += 1;

    // Processing time
    if (scheme.application.processingTime.max > 60) complexityScore += 2;
    else if (scheme.application.processingTime.max > 30) complexityScore += 1;

    // Application mode
    if (scheme.application.mode === 'offline') complexityScore += 1;

    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'medium';
    return 'easy';
  }

  private calculateSuccessProbability(scheme: GovernmentScheme, eligibilityScore: number): number {
    let probability = eligibilityScore;

    // Adjust based on scheme success rate
    if (scheme.metrics.successRate) {
      probability = (probability + scheme.metrics.successRate) / 2;
    }

    // Adjust based on processing time (faster = higher probability)
    if (scheme.application.processingTime.max < 30) {
      probability += 10;
    } else if (scheme.application.processingTime.max > 90) {
      probability -= 10;
    }

    return Math.min(Math.max(probability, 0), 100);
  }

  private estimateApplicationTime(scheme: GovernmentScheme, eligibility: EligibilityAssessment): number {
    let hours = 2; // Base time

    // Add time for missing documents
    hours += eligibility.missingDocuments.length * 0.5;

    // Add time based on complexity
    if (eligibility.applicationComplexity === 'complex') hours += 3;
    else if (eligibility.applicationComplexity === 'medium') hours += 1.5;

    // Add time for application steps
    hours += scheme.application.steps.length * 0.25;

    return Math.ceil(hours);
  }

  private async sendApplicationConfirmation(application: SchemeApplication): Promise<void> {
    // In a real implementation, this would send SMS/email notifications
    console.log(`Application confirmation sent for ${application.applicationNumber}`);
  }

  private async getMockSchemes(): Promise<GovernmentScheme[]> {
    // Enhanced mock data with comprehensive scheme information
    return [
      {
        id: 'mudra_shishu',
        title: 'Pradhan Mantri MUDRA Yojana - Shishu',
        titleHi: 'प्रधानमंत्री मुद्रा योजना - शिशु',
        titleTa: 'பிரதம மந்திரி முத்ரா யோஜனா - சிசு',
        description: 'Provides loans up to ₹50,000 for micro enterprises and small businesses',
        descriptionHi: 'सूक्ष्म उद्यमों और छोटे व्यवसायों के लिए ₹50,000 तक का ऋण प्रदान करता है',
        descriptionTa: 'நுண்ணிய நிறுவனங்கள் மற்றும் சிறு வணிகங்களுக்கு ₹50,000 வரை கடன் வழங்குகிறது',
        category: 'loan',
        subCategory: 'micro_finance',
        ministry: 'Ministry of Finance',
        department: 'Department of Financial Services',
        launchDate: new Date('2015-04-08'),
        lastUpdated: new Date(),
        status: 'active',
        eligibility: {
          age: { min: 18, max: 65 },
          income: { max: 100000, currency: 'INR' },
          businessType: ['handicraft', 'manufacturing', 'trading', 'service'],
          location: { rural: true, urban: true },
          experience: { min: 0 },
          education: ['any'],
          caste: ['any'],
          gender: ['any'],
          disability: false,
          minority: false,
          customCriteria: {}
        },
        benefits: {
          loanAmount: { min: 10000, max: 50000, currency: 'INR' },
          interestRate: { min: 8, max: 12 },
          customBenefits: ['No collateral required', 'Flexible repayment terms']
        },
        application: {
          mode: 'both',
          website: 'https://www.mudra.org.in/',
          processingTime: { min: 7, max: 15, unit: 'days' },
          documentsRequired: [
            'Aadhaar Card',
            'PAN Card',
            'Bank Statement',
            'Business Plan',
            'Income Proof'
          ],
          steps: [
            'Visit bank or apply online',
            'Fill application form',
            'Submit documents',
            'Bank verification',
            'Loan approval',
            'Disbursement'
          ],
          helplineNumber: '1800-180-1111'
        },
        dates: {
          applicationStart: new Date('2015-04-08'),
          renewalRequired: true,
          renewalPeriod: 12
        },
        metrics: {
          totalBeneficiaries: 28000000,
          budgetAllocated: 3500000000000,
          successRate: 85,
          averageProcessingTime: 10,
          userRating: 4.2,
          reviewCount: 15000
        },
        metadata: {
          tags: ['loan', 'micro-finance', 'no-collateral', 'artisan-friendly'],
          relatedSchemes: ['mudra_kishor', 'mudra_tarun'],
          officialNotifications: [],
          faqs: [
            {
              question: 'What is the maximum loan amount?',
              answer: '₹50,000 for Shishu category',
              questionHi: 'अधिकतम ऋण राशि क्या है?',
              answerHi: 'शिशु श्रेणी के लिए ₹50,000'
            }
          ]
        }
      },
      // Add more comprehensive schemes...
      {
        id: 'pmegp',
        title: 'Prime Minister Employment Generation Programme',
        titleHi: 'प्रधानमंत्री रोजगार सृजन कार्यक्रम',
        titleTa: 'பிரதம மந்திரி வேலைவாய்ப்பு உருவாக்கல் திட்டம்',
        description: 'Provides financial assistance for setting up new self-employment ventures',
        descriptionHi: 'नए स्वरोजगार उद्यम स्थापित करने के लिए वित्तीय सहायता प्रदान करता है',
        descriptionTa: 'புதிய சுய வேலைவாய்ப்பு நிறுவனங்களை நிறுவுவதற்கு நிதி உதவி வழங்குகிறது',
        category: 'subsidy',
        subCategory: 'self_employment',
        ministry: 'Ministry of Micro, Small and Medium Enterprises',
        department: 'Khadi and Village Industries Commission',
        launchDate: new Date('2008-08-15'),
        lastUpdated: new Date(),
        status: 'active',
        eligibility: {
          age: { min: 18, max: 35 },
          income: { max: 200000, currency: 'INR' },
          businessType: ['manufacturing', 'service', 'trading'],
          location: { rural: true, urban: true },
          experience: { min: 0 },
          education: ['8th_pass'],
          caste: ['any'],
          gender: ['any'],
          disability: false,
          minority: false,
          customCriteria: {}
        },
        benefits: {
          loanAmount: { min: 100000, max: 2500000, currency: 'INR' },
          subsidyPercentage: 25,
          customBenefits: ['25% subsidy on project cost', 'Training provided', 'Marketing support']
        },
        application: {
          mode: 'both',
          website: 'https://kviconline.gov.in/',
          processingTime: { min: 30, max: 60, unit: 'days' },
          documentsRequired: [
            'Aadhaar Card',
            'Educational Certificate',
            'Caste Certificate',
            'Project Report',
            'Bank Account Details'
          ],
          steps: [
            'Register on KVIC portal',
            'Submit project proposal',
            'Document verification',
            'Technical evaluation',
            'Financial approval',
            'Training completion',
            'Loan disbursement'
          ],
          helplineNumber: '1800-180-6763'
        },
        dates: {
          applicationStart: new Date('2008-08-15'),
          renewalRequired: false
        },
        metrics: {
          totalBeneficiaries: 750000,
          budgetAllocated: 75000000000,
          successRate: 78,
          averageProcessingTime: 45,
          userRating: 4.0,
          reviewCount: 8500
        },
        metadata: {
          tags: ['subsidy', 'self-employment', 'training', 'manufacturing'],
          relatedSchemes: ['mudra_shishu', 'sfurti'],
          officialNotifications: [],
          faqs: []
        }
      }
      // Additional schemes would be added here...
    ];
  }
}

export default EnhancedSchemeService;