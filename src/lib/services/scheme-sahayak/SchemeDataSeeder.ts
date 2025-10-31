/**
 * Scheme Data Seeder for AI-Powered Scheme Sahayak v2.0
 * Seeds sample government scheme data for development and testing
 */

import { GovernmentScheme } from '../../types/scheme-sahayak';
import { GovernmentSchemeModel } from '../../models/scheme-sahayak/GovernmentScheme';
import { SchemeService } from './SchemeService';

/**
 * Sample government schemes data
 */
export const SAMPLE_SCHEMES: Partial<GovernmentScheme>[] = [
  // Central Government Schemes
  {
    title: 'Pradhan Mantri Mudra Yojana (PMMY)',
    description: 'Provides loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises for income generating activities.',
    category: 'loan',
    subCategory: 'mudra_loan',
    provider: {
      name: 'Ministry of Micro, Small and Medium Enterprises',
      department: 'Government of India',
      level: 'central',
      website: 'https://www.mudra.org.in/',
      contactInfo: {
        phone: '011-23061568',
        email: 'info@mudra.org.in',
        helplineNumber: '1800-180-1111'
      }
    },
    eligibility: {
      age: { min: 18, max: 65 },
      income: { max: 1000000 },
      businessType: ['handicrafts', 'textiles', 'food_processing', 'manufacturing', 'services', 'retail'],
      location: {
        states: ['All States']
      },
      otherCriteria: [
        'Non-corporate, non-farm small/micro enterprises',
        'Income generating activities',
        'First time borrowers get preference'
      ]
    },
    benefits: {
      amount: { min: 50000, max: 1000000, currency: 'INR' },
      type: 'loan',
      interestRate: 8.5,
      coverageDetails: 'Collateral-free loans for micro enterprises'
    },
    application: {
      onlineApplication: true,
      requiredDocuments: [
        'Aadhaar Card',
        'PAN Card',
        'Business Registration Certificate',
        'Bank Statements (6 months)',
        'Income Proof',
        'Project Report'
      ],
      applicationSteps: [
        { id: '1', name: 'Online Registration', description: 'Register on MUDRA portal', order: 1, required: true, estimatedTime: 15 },
        { id: '2', name: 'Document Upload', description: 'Upload required documents', order: 2, required: true, estimatedTime: 30 },
        { id: '3', name: 'Bank Selection', description: 'Choose lending bank', order: 3, required: true, estimatedTime: 10 },
        { id: '4', name: 'Application Submission', description: 'Submit complete application', order: 4, required: true, estimatedTime: 5 }
      ],
      processingTime: { min: 15, max: 30 },
      website: 'https://www.mudra.org.in/apply'
    },
    metadata: {
      popularity: 95,
      successRate: 78,
      averageProcessingTime: 22,
      aiFeatures: {},
      lastUpdated: new Date()
    },
    status: 'active'
  },

  {
    title: 'Stand Up India Scheme',
    description: 'Facilitates bank loans between ₹10 lakh and ₹1 crore to SC/ST and women entrepreneurs for setting up greenfield enterprises.',
    category: 'loan',
    subCategory: 'business_loan',
    provider: {
      name: 'Department of Financial Services',
      department: 'Ministry of Finance',
      level: 'central',
      website: 'https://www.standupmitra.in/',
      contactInfo: {
        phone: '011-20742000',
        email: 'info@standupmitra.in',
        helplineNumber: '1800-180-1111'
      }
    },
    eligibility: {
      age: { min: 18, max: 65 },
      businessType: ['manufacturing', 'services', 'handicrafts', 'textiles', 'food_processing'],
      location: {
        states: ['All States']
      },
      otherCriteria: [
        'SC/ST or Women entrepreneurs',
        'Greenfield enterprises only',
        'First time borrowers'
      ]
    },
    benefits: {
      amount: { min: 1000000, max: 10000000, currency: 'INR' },
      type: 'loan',
      interestRate: 9.25,
      coverageDetails: 'Composite loan for setting up greenfield enterprises'
    },
    application: {
      onlineApplication: true,
      requiredDocuments: [
        'Aadhaar Card',
        'PAN Card',
        'Caste Certificate (for SC/ST)',
        'Project Report',
        'Land Documents',
        'Educational Certificates',
        'Experience Certificates'
      ],
      applicationSteps: [
        { id: '1', name: 'Eligibility Check', description: 'Verify eligibility criteria', order: 1, required: true, estimatedTime: 10 },
        { id: '2', name: 'Project Preparation', description: 'Prepare detailed project report', order: 2, required: true, estimatedTime: 120 },
        { id: '3', name: 'Bank Approach', description: 'Approach designated bank', order: 3, required: true, estimatedTime: 30 },
        { id: '4', name: 'Application Processing', description: 'Bank processes application', order: 4, required: true, estimatedTime: 60 }
      ],
      processingTime: { min: 45, max: 90 },
      website: 'https://www.standupmitra.in/apply'
    },
    metadata: {
      popularity: 72,
      successRate: 65,
      averageProcessingTime: 67,
      aiFeatures: {},
      lastUpdated: new Date()
    },
    status: 'active'
  },

  {
    title: 'PM Vishwakarma Scheme',
    description: 'Provides skill training, toolkit incentive, and credit support to traditional artisans and craftspeople.',
    category: 'training',
    subCategory: 'skill_training',
    provider: {
      name: 'Ministry of Micro, Small and Medium Enterprises',
      department: 'Government of India',
      level: 'central',
      website: 'https://pmvishwakarma.gov.in/',
      contactInfo: {
        phone: '011-23061568',
        email: 'pmvishwakarma@gov.in',
        helplineNumber: '1800-267-4545'
      }
    },
    eligibility: {
      age: { min: 18, max: 60 },
      businessType: ['handicrafts', 'woodwork', 'metalwork', 'pottery', 'textiles', 'leather_goods'],
      location: {
        states: ['All States']
      },
      otherCriteria: [
        'Traditional artisans and craftspeople',
        'Engaged in 18 specified trades',
        'Working with hands and local tools'
      ]
    },
    benefits: {
      amount: { min: 15000, max: 300000, currency: 'INR' },
      type: 'training',
      coverageDetails: 'Skill training + Toolkit incentive + Credit support'
    },
    application: {
      onlineApplication: true,
      requiredDocuments: [
        'Aadhaar Card',
        'Bank Account Details',
        'Mobile Number',
        'Skill Certificate (if any)',
        'Work Experience Proof'
      ],
      applicationSteps: [
        { id: '1', name: 'Registration', description: 'Register on PM Vishwakarma portal', order: 1, required: true, estimatedTime: 15 },
        { id: '2', name: 'Skill Assessment', description: 'Undergo skill assessment', order: 2, required: true, estimatedTime: 60 },
        { id: '3', name: 'Training Enrollment', description: 'Enroll in skill training program', order: 3, required: true, estimatedTime: 30 },
        { id: '4', name: 'Certification', description: 'Complete training and get certified', order: 4, required: true, estimatedTime: 240 }
      ],
      processingTime: { min: 30, max: 60 },
      website: 'https://pmvishwakarma.gov.in/apply'
    },
    metadata: {
      popularity: 88,
      successRate: 82,
      averageProcessingTime: 45,
      aiFeatures: {},
      lastUpdated: new Date()
    },
    status: 'active'
  },

  {
    title: 'Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE)',
    description: 'Provides collateral-free credit to micro and small enterprises through credit guarantee.',
    category: 'loan',
    subCategory: 'business_loan',
    provider: {
      name: 'Small Industries Development Bank of India (SIDBI)',
      department: 'Ministry of MSME',
      level: 'central',
      website: 'https://www.cgtmse.in/',
      contactInfo: {
        phone: '0522-2288546',
        email: 'cgtmse@sidbi.in',
        helplineNumber: '1800-180-1111'
      }
    },
    eligibility: {
      age: { min: 18, max: 70 },
      businessType: ['manufacturing', 'services', 'handicrafts', 'textiles', 'food_processing'],
      location: {
        states: ['All States']
      },
      otherCriteria: [
        'Micro and Small Enterprises',
        'New or existing enterprises',
        'Credit facility up to ₹2 crore'
      ]
    },
    benefits: {
      amount: { min: 100000, max: 20000000, currency: 'INR' },
      type: 'loan',
      coverageDetails: 'Collateral-free credit guarantee for MSEs'
    },
    application: {
      onlineApplication: true,
      requiredDocuments: [
        'Aadhaar Card',
        'PAN Card',
        'Business Registration',
        'Project Report',
        'Financial Statements',
        'Bank Statements'
      ],
      applicationSteps: [
        { id: '1', name: 'Bank Selection', description: 'Choose CGTMSE member bank', order: 1, required: true, estimatedTime: 15 },
        { id: '2', name: 'Loan Application', description: 'Apply for loan at selected bank', order: 2, required: true, estimatedTime: 45 },
        { id: '3', name: 'Bank Processing', description: 'Bank processes and approves loan', order: 3, required: true, estimatedTime: 60 },
        { id: '4', name: 'Guarantee Coverage', description: 'CGTMSE provides guarantee coverage', order: 4, required: true, estimatedTime: 15 }
      ],
      processingTime: { min: 20, max: 45 },
      website: 'https://www.cgtmse.in/apply'
    },
    metadata: {
      popularity: 75,
      successRate: 70,
      averageProcessingTime: 32,
      aiFeatures: {},
      lastUpdated: new Date()
    },
    status: 'active'
  },

  // State Government Schemes
  {
    title: 'Maharashtra Artisan Credit Card Scheme',
    description: 'Provides easy credit access to traditional artisans in Maharashtra for working capital and equipment purchase.',
    category: 'loan',
    subCategory: 'working_capital',
    provider: {
      name: 'Maharashtra State Khadi and Village Industries Board',
      department: 'Government of Maharashtra',
      level: 'state',
      website: 'https://mskvib.org/',
      contactInfo: {
        phone: '022-22621856',
        email: 'info@mskvib.org',
        helplineNumber: '1800-233-4567'
      }
    },
    eligibility: {
      age: { min: 18, max: 65 },
      income: { max: 500000 },
      businessType: ['handicrafts', 'textiles', 'pottery', 'woodwork', 'metalwork'],
      location: {
        states: ['Maharashtra']
      },
      otherCriteria: [
        'Traditional artisans',
        'Resident of Maharashtra',
        'Engaged in handicrafts for at least 2 years'
      ]
    },
    benefits: {
      amount: { min: 25000, max: 200000, currency: 'INR' },
      type: 'loan',
      interestRate: 7.0,
      coverageDetails: 'Working capital and equipment purchase loans'
    },
    application: {
      onlineApplication: true,
      requiredDocuments: [
        'Aadhaar Card',
        'Domicile Certificate',
        'Artisan Registration Certificate',
        'Income Certificate',
        'Bank Account Details'
      ],
      applicationSteps: [
        { id: '1', name: 'Online Registration', description: 'Register on MSKVIB portal', order: 1, required: true, estimatedTime: 20 },
        { id: '2', name: 'Document Verification', description: 'Submit and verify documents', order: 2, required: true, estimatedTime: 30 },
        { id: '3', name: 'Field Verification', description: 'Field officer verification', order: 3, required: true, estimatedTime: 120 },
        { id: '4', name: 'Approval', description: 'Final approval and disbursement', order: 4, required: true, estimatedTime: 60 }
      ],
      processingTime: { min: 15, max: 30 },
      website: 'https://mskvib.org/artisan-credit'
    },
    metadata: {
      popularity: 68,
      successRate: 75,
      averageProcessingTime: 22,
      aiFeatures: {},
      lastUpdated: new Date()
    },
    status: 'active'
  },

  {
    title: 'Tamil Nadu Artisan Development Scheme',
    description: 'Comprehensive scheme for skill development, marketing support, and financial assistance to artisans in Tamil Nadu.',
    category: 'grant',
    subCategory: 'skill_development',
    provider: {
      name: 'Tamil Nadu Handicrafts Development Corporation',
      department: 'Government of Tamil Nadu',
      level: 'state',
      website: 'https://tnhdc.gov.in/',
      contactInfo: {
        phone: '044-28335245',
        email: 'info@tnhdc.gov.in',
        helplineNumber: '1800-425-4567'
      }
    },
    eligibility: {
      age: { min: 18, max: 55 },
      income: { max: 300000 },
      businessType: ['handicrafts', 'textiles', 'pottery', 'woodwork', 'metalwork', 'jewelry'],
      location: {
        states: ['Tamil Nadu']
      },
      otherCriteria: [
        'Traditional artisans',
        'Resident of Tamil Nadu for at least 5 years',
        'Willing to undergo skill training'
      ]
    },
    benefits: {
      amount: { min: 50000, max: 500000, currency: 'INR' },
      type: 'grant',
      coverageDetails: 'Skill training + Equipment subsidy + Marketing support'
    },
    application: {
      onlineApplication: true,
      requiredDocuments: [
        'Aadhaar Card',
        'Domicile Certificate',
        'Income Certificate',
        'Caste Certificate (if applicable)',
        'Skill Certificate',
        'Bank Account Details'
      ],
      applicationSteps: [
        { id: '1', name: 'Application Submission', description: 'Submit online application', order: 1, required: true, estimatedTime: 25 },
        { id: '2', name: 'Document Review', description: 'Review submitted documents', order: 2, required: true, estimatedTime: 45 },
        { id: '3', name: 'Skill Assessment', description: 'Assess current skill level', order: 3, required: true, estimatedTime: 90 },
        { id: '4', name: 'Training Enrollment', description: 'Enroll in appropriate training program', order: 4, required: true, estimatedTime: 30 }
      ],
      processingTime: { min: 20, max: 40 },
      website: 'https://tnhdc.gov.in/artisan-scheme'
    },
    metadata: {
      popularity: 71,
      successRate: 80,
      averageProcessingTime: 30,
      aiFeatures: {},
      lastUpdated: new Date()
    },
    status: 'active'
  },

  // Insurance Schemes
  {
    title: 'Pradhan Mantri Suraksha Bima Yojana (PMSBY)',
    description: 'Accidental death and disability insurance scheme for all bank account holders.',
    category: 'insurance',
    subCategory: 'accident_insurance',
    provider: {
      name: 'Department of Financial Services',
      department: 'Ministry of Finance',
      level: 'central',
      website: 'https://pmsby.gov.in/',
      contactInfo: {
        phone: '011-20742000',
        email: 'pmsby@gov.in',
        helplineNumber: '1800-180-1111'
      }
    },
    eligibility: {
      age: { min: 18, max: 70 },
      businessType: ['All'],
      location: {
        states: ['All States']
      },
      otherCriteria: [
        'Bank account holder',
        'Auto-debit consent required',
        'Annual premium of ₹20'
      ]
    },
    benefits: {
      amount: { min: 200000, max: 200000, currency: 'INR' },
      type: 'insurance',
      coverageDetails: '₹2 lakh for accidental death and permanent total disability, ₹1 lakh for partial disability'
    },
    application: {
      onlineApplication: true,
      requiredDocuments: [
        'Aadhaar Card',
        'Bank Account Details',
        'Auto-debit Consent Form'
      ],
      applicationSteps: [
        { id: '1', name: 'Bank Visit', description: 'Visit participating bank', order: 1, required: true, estimatedTime: 30 },
        { id: '2', name: 'Form Filling', description: 'Fill application form', order: 2, required: true, estimatedTime: 15 },
        { id: '3', name: 'Auto-debit Setup', description: 'Set up auto-debit for premium', order: 3, required: true, estimatedTime: 10 },
        { id: '4', name: 'Enrollment', description: 'Complete enrollment process', order: 4, required: true, estimatedTime: 5 }
      ],
      processingTime: { min: 1, max: 7 },
      website: 'https://pmsby.gov.in/apply'
    },
    metadata: {
      popularity: 85,
      successRate: 95,
      averageProcessingTime: 3,
      aiFeatures: {},
      lastUpdated: new Date()
    },
    status: 'active'
  },

  // Subsidy Schemes
  {
    title: 'Technology Upgradation Fund Scheme (TUFS)',
    description: 'Provides capital investment subsidy for technology upgradation in textile and jute industries.',
    category: 'subsidy',
    subCategory: 'technology_subsidy',
    provider: {
      name: 'Ministry of Textiles',
      department: 'Government of India',
      level: 'central',
      website: 'https://texmin.nic.in/tufs',
      contactInfo: {
        phone: '011-23384827',
        email: 'tufs@gov.in',
        helplineNumber: '1800-267-7777'
      }
    },
    eligibility: {
      businessType: ['textiles', 'handicrafts'],
      location: {
        states: ['All States']
      },
      otherCriteria: [
        'Textile and jute industry units',
        'Technology upgradation projects',
        'Minimum investment of ₹10 lakh'
      ]
    },
    benefits: {
      amount: { min: 100000, max: 50000000, currency: 'INR' },
      type: 'subsidy',
      coverageDetails: '15% capital investment subsidy for technology upgradation'
    },
    application: {
      onlineApplication: true,
      requiredDocuments: [
        'Project Report',
        'Investment Details',
        'Technology Specifications',
        'Environmental Clearance',
        'Financial Statements',
        'Registration Certificates'
      ],
      applicationSteps: [
        { id: '1', name: 'Project Preparation', description: 'Prepare detailed project report', order: 1, required: true, estimatedTime: 240 },
        { id: '2', name: 'Online Application', description: 'Submit application online', order: 2, required: true, estimatedTime: 60 },
        { id: '3', name: 'Technical Evaluation', description: 'Technical committee evaluation', order: 3, required: true, estimatedTime: 180 },
        { id: '4', name: 'Approval', description: 'Final approval and sanction', order: 4, required: true, estimatedTime: 120 }
      ],
      processingTime: { min: 90, max: 180 },
      website: 'https://texmin.nic.in/tufs/apply'
    },
    metadata: {
      popularity: 62,
      successRate: 58,
      averageProcessingTime: 135,
      aiFeatures: {},
      lastUpdated: new Date()
    },
    status: 'active'
  }
];

/**
 * Scheme Data Seeder Class
 */
export class SchemeDataSeeder {
  private schemeService: SchemeService;

  constructor(schemeService: SchemeService) {
    this.schemeService = schemeService;
  }

  /**
   * Seed all sample schemes
   */
  async seedAllSchemes(): Promise<{
    success: boolean;
    seededCount: number;
    errors: string[];
    schemeIds: string[];
  }> {
    const result = {
      success: true,
      seededCount: 0,
      errors: [] as string[],
      schemeIds: [] as string[]
    };

    console.log('🌱 Starting scheme data seeding...');

    for (const [index, schemeData] of SAMPLE_SCHEMES.entries()) {
      try {
        console.log(`📄 Seeding scheme ${index + 1}/${SAMPLE_SCHEMES.length}: ${schemeData.title}`);
        
        // Validate scheme data
        const validation = await this.schemeService.validateSchemeData(schemeData);
        if (!validation.isValid) {
          const errorMessage = `Validation failed for ${schemeData.title}: ${validation.errors.map(e => e.message).join(', ')}`;
          result.errors.push(errorMessage);
          console.error(`❌ ${errorMessage}`);
          continue;
        }

        // Create scheme
        const schemeId = await this.schemeService.createScheme(schemeData);
        result.schemeIds.push(schemeId);
        result.seededCount++;
        
        console.log(`✅ Successfully seeded: ${schemeData.title} (ID: ${schemeId})`);
        
        // Add some delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        const errorMessage = `Failed to seed ${schemeData.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMessage);
        result.success = false;
        console.error(`❌ ${errorMessage}`);
      }
    }

    console.log(`🎉 Scheme seeding completed: ${result.seededCount}/${SAMPLE_SCHEMES.length} schemes seeded`);
    
    if (result.errors.length > 0) {
      console.log('⚠️ Errors encountered:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    return result;
  }

  /**
   * Seed schemes by category
   */
  async seedSchemesByCategory(category: string): Promise<{
    success: boolean;
    seededCount: number;
    errors: string[];
    schemeIds: string[];
  }> {
    const categorySchemes = SAMPLE_SCHEMES.filter(scheme => scheme.category === category);
    
    const result = {
      success: true,
      seededCount: 0,
      errors: [] as string[],
      schemeIds: [] as string[]
    };

    console.log(`🌱 Seeding ${categorySchemes.length} schemes for category: ${category}`);

    for (const schemeData of categorySchemes) {
      try {
        const schemeId = await this.schemeService.createScheme(schemeData);
        result.schemeIds.push(schemeId);
        result.seededCount++;
        console.log(`✅ Seeded: ${schemeData.title}`);
      } catch (error) {
        const errorMessage = `Failed to seed ${schemeData.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMessage);
        result.success = false;
        console.error(`❌ ${errorMessage}`);
      }
    }

    return result;
  }

  /**
   * Update existing schemes with sample performance data
   */
  async updateSchemesWithPerformanceData(): Promise<{
    success: boolean;
    updatedCount: number;
    errors: string[];
  }> {
    const result = {
      success: true,
      updatedCount: 0,
      errors: [] as string[]
    };

    console.log('📊 Updating schemes with sample performance data...');

    try {
      const schemes = await this.schemeService.getActiveSchemes();
      
      for (const scheme of schemes) {
        try {
          // Generate sample performance data
          const performanceData = {
            totalApplications: Math.floor(Math.random() * 1000) + 100,
            approvedApplications: Math.floor(Math.random() * 500) + 50,
            rejectedApplications: Math.floor(Math.random() * 200) + 20,
            averageProcessingTime: Math.floor(Math.random() * 60) + 15,
            userRating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 to 5.0
            viewCount: Math.floor(Math.random() * 5000) + 500
          };

          await this.schemeService.updateSchemeMetadata(scheme.id, performanceData);
          result.updatedCount++;
          console.log(`📈 Updated performance data for: ${scheme.title}`);
          
        } catch (error) {
          const errorMessage = `Failed to update ${scheme.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);
          console.error(`❌ ${errorMessage}`);
        }
      }
      
    } catch (error) {
      result.success = false;
      const errorMessage = `Failed to fetch schemes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      console.error(`❌ ${errorMessage}`);
    }

    console.log(`📊 Performance data update completed: ${result.updatedCount} schemes updated`);
    return result;
  }

  /**
   * Clear all seeded schemes (development only)
   */
  async clearAllSchemes(): Promise<{
    success: boolean;
    deletedCount: number;
    errors: string[];
  }> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear schemes in production environment');
    }

    const result = {
      success: true,
      deletedCount: 0,
      errors: [] as string[]
    };

    console.log('🗑️ Clearing all schemes (development only)...');

    try {
      const schemes = await this.schemeService.getActiveSchemes();
      
      for (const scheme of schemes) {
        try {
          await this.schemeService.deleteScheme(scheme.id);
          result.deletedCount++;
          console.log(`🗑️ Deleted: ${scheme.title}`);
        } catch (error) {
          const errorMessage = `Failed to delete ${scheme.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);
          console.error(`❌ ${errorMessage}`);
        }
      }
      
    } catch (error) {
      result.success = false;
      const errorMessage = `Failed to fetch schemes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      console.error(`❌ ${errorMessage}`);
    }

    console.log(`🗑️ Scheme clearing completed: ${result.deletedCount} schemes deleted`);
    return result;
  }

  /**
   * Get seeding statistics
   */
  getSeedingStatistics(): {
    totalSampleSchemes: number;
    schemesByCategory: Record<string, number>;
    schemesByGovernmentLevel: Record<string, number>;
    averageBenefitAmount: number;
  } {
    const stats = {
      totalSampleSchemes: SAMPLE_SCHEMES.length,
      schemesByCategory: {} as Record<string, number>,
      schemesByGovernmentLevel: {} as Record<string, number>,
      averageBenefitAmount: 0
    };

    let totalBenefitAmount = 0;

    SAMPLE_SCHEMES.forEach(scheme => {
      // Count by category
      if (scheme.category) {
        stats.schemesByCategory[scheme.category] = (stats.schemesByCategory[scheme.category] || 0) + 1;
      }

      // Count by government level
      if (scheme.provider?.level) {
        stats.schemesByGovernmentLevel[scheme.provider.level] = (stats.schemesByGovernmentLevel[scheme.provider.level] || 0) + 1;
      }

      // Calculate average benefit amount
      if (scheme.benefits?.amount?.max) {
        totalBenefitAmount += scheme.benefits.amount.max;
      }
    });

    stats.averageBenefitAmount = Math.round(totalBenefitAmount / SAMPLE_SCHEMES.length);

    return stats;
  }
}

/**
 * Utility function to create and use seeder
 */
export async function seedSchemeData(schemeService: SchemeService): Promise<void> {
  const seeder = new SchemeDataSeeder(schemeService);
  
  console.log('📊 Seeding statistics:');
  const stats = seeder.getSeedingStatistics();
  console.log(`  Total schemes: ${stats.totalSampleSchemes}`);
  console.log(`  By category:`, stats.schemesByCategory);
  console.log(`  By government level:`, stats.schemesByGovernmentLevel);
  console.log(`  Average benefit amount: ₹${stats.averageBenefitAmount.toLocaleString()}`);
  
  const result = await seeder.seedAllSchemes();
  
  if (result.success) {
    console.log('🎉 Scheme data seeding completed successfully!');
    
    // Update with performance data
    await seeder.updateSchemesWithPerformanceData();
  } else {
    console.error('❌ Scheme data seeding completed with errors');
  }
}