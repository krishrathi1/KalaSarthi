/**
 * Application Guidance Service
 * Provides step-by-step assistance, validation, and strength analysis
 * 
 * Features:
 * - Step-by-step application assistance
 * - Completeness validation and error flagging
 * - Application strength analysis with recommendations
 * 
 * Requirements: 5.2, 5.3, 5.4
 */

import { adminDb } from '@/lib/firebase-admin';
import {
  SchemeApplication,
  GovernmentScheme,
  ArtisanProfile,
  SCHEME_SAHAYAK_COLLECTIONS
} from '@/lib/types/scheme-sahayak';
import { ApplicationService, ValidationResult } from './ApplicationService';

/**
 * Application step interface
 */
export interface ApplicationStep {
  id: string;
  title: string;
  description: string;
  order: number;
  required: boolean;
  completed: boolean;
  fields: StepField[];
  validationRules: ValidationRule[];
  helpText: string;
  estimatedTime: number; // minutes
}

export interface StepField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'file' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: string;
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
}

/**
 * Application strength analysis result
 */
export interface StrengthAnalysis {
  overallScore: number; // 0-100
  category: 'weak' | 'moderate' | 'strong' | 'excellent';
  strengths: string[];
  weaknesses: string[];
  recommendations: PrioritizedRecommendation[];
  successProbability: number; // 0-1
  comparisonWithSimilar: {
    averageScore: number;
    yourPosition: 'below_average' | 'average' | 'above_average';
  };
}

export interface PrioritizedRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'documentation' | 'eligibility' | 'presentation' | 'timing';
  recommendation: string;
  impact: string;
  actionable: boolean;
}

/**
 * Guidance progress tracking
 */
export interface GuidanceProgress {
  applicationId: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  percentComplete: number;
  estimatedTimeRemaining: number; // minutes
  nextStep?: ApplicationStep;
}

/**
 * Application Guidance Service Implementation
 */
export class ApplicationGuidanceService {
  private applicationService: ApplicationService;

  constructor() {
    this.applicationService = new ApplicationService();
  }

  /**
   * Get step-by-step guidance for application
   * Requirement: 5.2 - Provide step-by-step guidance with progress indicators
   */
  async getApplicationSteps(applicationId: string): Promise<ApplicationStep[]> {
    try {
      const application = await this.getApplication(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      const scheme = await this.getScheme(application.schemeId);
      if (!scheme) {
        throw new Error('Scheme not found');
      }

      return this.buildApplicationSteps(application, scheme);
    } catch (error) {
      throw this.handleError(error, 'getApplicationSteps');
    }
  }

  /**
   * Get current guidance progress
   */
  async getGuidanceProgress(applicationId: string): Promise<GuidanceProgress> {
    try {
      const steps = await this.getApplicationSteps(applicationId);
      const completedSteps = steps.filter(s => s.completed).length;
      const currentStepIndex = steps.findIndex(s => !s.completed);
      
      const totalTime = steps.reduce((sum, s) => sum + s.estimatedTime, 0);
      const completedTime = steps
        .filter(s => s.completed)
        .reduce((sum, s) => sum + s.estimatedTime, 0);
      
      return {
        applicationId,
        currentStep: currentStepIndex >= 0 ? currentStepIndex : steps.length - 1,
        totalSteps: steps.length,
        completedSteps,
        percentComplete: Math.round((completedSteps / steps.length) * 100),
        estimatedTimeRemaining: totalTime - completedTime,
        nextStep: currentStepIndex >= 0 ? steps[currentStepIndex] : undefined
      };
    } catch (error) {
      throw this.handleError(error, 'getGuidanceProgress');
    }
  }

  /**
   * Validate application completeness with detailed error flagging
   * Requirement: 5.3 - Validate application completeness and flag potential errors
   */
  async validateCompleteness(applicationId: string): Promise<ValidationResult> {
    try {
      return await this.applicationService.validateApplication(applicationId);
    } catch (error) {
      throw this.handleError(error, 'validateCompleteness');
    }
  }

  /**
   * Analyze application strength and provide recommendations
   * Requirement: 5.4 - Provide application strength analysis with improvement recommendations
   */
  async analyzeApplicationStrength(applicationId: string): Promise<StrengthAnalysis> {
    try {
      const application = await this.getApplication(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      const scheme = await this.getScheme(application.schemeId);
      if (!scheme) {
        throw new Error('Scheme not found');
      }

      const profile = await this.getArtisanProfile(application.artisanId);
      if (!profile) {
        throw new Error('Artisan profile not found');
      }

      const validation = await this.validateCompleteness(applicationId);

      // Calculate overall score
      const scores = {
        completeness: validation.completeness,
        eligibility: this.calculateEligibilityScore(profile, scheme),
        documentation: this.calculateDocumentationScore(application, scheme),
        presentation: this.calculatePresentationScore(application)
      };

      const overallScore = Math.round(
        (scores.completeness * 0.3 +
         scores.eligibility * 0.3 +
         scores.documentation * 0.25 +
         scores.presentation * 0.15)
      );

      // Determine category
      const category = this.determineStrengthCategory(overallScore);

      // Identify strengths and weaknesses
      const strengths = this.identifyStrengths(scores, validation, profile, scheme);
      const weaknesses = this.identifyWeaknesses(scores, validation, profile, scheme);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        scores,
        validation,
        weaknesses,
        profile,
        scheme
      );

      // Calculate success probability
      const successProbability = this.calculateSuccessProbability(
        overallScore,
        profile,
        scheme
      );

      // Compare with similar applications
      const comparisonWithSimilar = await this.compareWithSimilarApplications(
        overallScore,
        profile,
        scheme
      );

      return {
        overallScore,
        category,
        strengths,
        weaknesses,
        recommendations,
        successProbability,
        comparisonWithSimilar
      };
    } catch (error) {
      throw this.handleError(error, 'analyzeApplicationStrength');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Build application steps based on scheme requirements
   */
  private buildApplicationSteps(
    application: SchemeApplication,
    scheme: GovernmentScheme
  ): ApplicationStep[] {
    const steps: ApplicationStep[] = [
      {
        id: 'personal_info',
        title: 'Personal Information',
        description: 'Provide your basic personal details',
        order: 1,
        required: true,
        completed: this.isStepCompleted(application, ['applicantName', 'phone', 'email', 'dateOfBirth']),
        fields: [
          { name: 'applicantName', label: 'Full Name', type: 'text', required: true },
          { name: 'phone', label: 'Phone Number', type: 'text', required: true },
          { name: 'email', label: 'Email Address', type: 'text', required: true },
          { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true }
        ],
        validationRules: [],
        helpText: 'Enter your personal information as it appears on your official documents',
        estimatedTime: 5
      },
      {
        id: 'location',
        title: 'Location Details',
        description: 'Provide your address and location information',
        order: 2,
        required: true,
        completed: this.isStepCompleted(application, ['address', 'state', 'district', 'pincode']),
        fields: [
          { name: 'address', label: 'Full Address', type: 'textarea', required: true },
          { name: 'state', label: 'State', type: 'select', required: true },
          { name: 'district', label: 'District', type: 'select', required: true },
          { name: 'pincode', label: 'PIN Code', type: 'text', required: true }
        ],
        validationRules: [],
        helpText: 'Provide your current residential address',
        estimatedTime: 5
      },
      {
        id: 'business_info',
        title: 'Business Information',
        description: 'Details about your business or craft',
        order: 3,
        required: true,
        completed: this.isStepCompleted(application, ['businessType', 'businessCategory']),
        fields: [
          { name: 'businessType', label: 'Business Type', type: 'select', required: true },
          { name: 'businessCategory', label: 'Category', type: 'select', required: true },
          { name: 'registrationNumber', label: 'Registration Number', type: 'text', required: false }
        ],
        validationRules: [],
        helpText: 'Provide details about your business or artisan work',
        estimatedTime: 10
      }
    ];

    // Add scheme-specific steps
    if (scheme.category === 'loan' || scheme.category === 'grant') {
      steps.push({
        id: 'financial_info',
        title: 'Financial Information',
        description: 'Income and financial details',
        order: 4,
        required: true,
        completed: this.isStepCompleted(application, ['monthlyIncome', 'requestedAmount']),
        fields: [
          { name: 'monthlyIncome', label: 'Monthly Income', type: 'number', required: true },
          { name: 'requestedAmount', label: 'Requested Amount', type: 'number', required: true }
        ],
        validationRules: [],
        helpText: 'Provide accurate financial information',
        estimatedTime: 10
      });
    }

    steps.push({
      id: 'documents',
      title: 'Document Upload',
      description: 'Upload required documents',
      order: steps.length + 1,
      required: true,
      completed: (application.submittedDocuments?.length || 0) > 0,
      fields: [],
      validationRules: [],
      helpText: 'Upload all required documents in clear, readable format',
      estimatedTime: 15
    });

    steps.push({
      id: 'review',
      title: 'Review & Submit',
      description: 'Review your application before submission',
      order: steps.length + 1,
      required: true,
      completed: application.status !== 'draft',
      fields: [],
      validationRules: [],
      helpText: 'Carefully review all information before submitting',
      estimatedTime: 5
    });

    return steps;
  }

  /**
   * Check if step is completed
   */
  private isStepCompleted(application: SchemeApplication, requiredFields: string[]): boolean {
    return requiredFields.every(field => 
      application.formData[field] !== undefined && 
      application.formData[field] !== null &&
      application.formData[field] !== ''
    );
  }

  /**
   * Calculate eligibility score
   */
  private calculateEligibilityScore(
    profile: ArtisanProfile,
    scheme: GovernmentScheme
  ): number {
    let score = 100;
    const penalties: number[] = [];

    // Check age eligibility
    if (scheme.eligibility.age) {
      const age = this.calculateAge(profile.personalInfo.dateOfBirth);
      if (scheme.eligibility.age.min && age < scheme.eligibility.age.min) {
        penalties.push(30);
      }
      if (scheme.eligibility.age.max && age > scheme.eligibility.age.max) {
        penalties.push(30);
      }
    }

    // Check income eligibility
    if (scheme.eligibility.income) {
      const annualIncome = profile.business.monthlyIncome * 12;
      if (scheme.eligibility.income.min && annualIncome < scheme.eligibility.income.min) {
        penalties.push(25);
      }
      if (scheme.eligibility.income.max && annualIncome > scheme.eligibility.income.max) {
        penalties.push(25);
      }
    }

    // Check business type
    if (scheme.eligibility.businessType && scheme.eligibility.businessType.length > 0) {
      if (!scheme.eligibility.businessType.includes(profile.business.type)) {
        penalties.push(20);
      }
    }

    // Check location
    if (scheme.eligibility.location.states && scheme.eligibility.location.states.length > 0) {
      if (!scheme.eligibility.location.states.includes(profile.location.state)) {
        penalties.push(15);
      }
    }

    // Apply penalties
    penalties.forEach(penalty => {
      score -= penalty;
    });

    return Math.max(0, score);
  }

  /**
   * Calculate documentation score
   */
  private calculateDocumentationScore(
    application: SchemeApplication,
    scheme: GovernmentScheme
  ): number {
    const requiredDocs = scheme.application.requiredDocuments || [];
    const submittedDocs = application.submittedDocuments || [];

    if (requiredDocs.length === 0) {
      return 100;
    }

    const score = (submittedDocs.length / requiredDocs.length) * 100;
    return Math.min(100, score);
  }

  /**
   * Calculate presentation score
   */
  private calculatePresentationScore(application: SchemeApplication): number {
    let score = 100;

    // Check for empty or minimal fields
    const formData = application.formData;
    const fieldCount = Object.keys(formData).length;

    if (fieldCount < 5) {
      score -= 30;
    } else if (fieldCount < 10) {
      score -= 15;
    }

    // Check for detailed responses
    const textFields = Object.values(formData).filter(
      v => typeof v === 'string' && v.length > 50
    );

    if (textFields.length === 0) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  /**
   * Determine strength category
   */
  private determineStrengthCategory(score: number): StrengthAnalysis['category'] {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'strong';
    if (score >= 50) return 'moderate';
    return 'weak';
  }

  /**
   * Identify application strengths
   */
  private identifyStrengths(
    scores: any,
    validation: ValidationResult,
    profile: ArtisanProfile,
    scheme: GovernmentScheme
  ): string[] {
    const strengths: string[] = [];

    if (scores.completeness >= 90) {
      strengths.push('Application is highly complete with all required information');
    }

    if (scores.eligibility >= 90) {
      strengths.push('You meet all eligibility criteria for this scheme');
    }

    if (scores.documentation >= 80) {
      strengths.push('Most required documents have been submitted');
    }

    if (profile.business.experienceYears >= 5) {
      strengths.push(`${profile.business.experienceYears} years of business experience demonstrates stability`);
    }

    if (profile.applicationHistory.length > 0) {
      const successfulApps = profile.applicationHistory.filter(
        app => app.outcome === 'approved'
      ).length;
      if (successfulApps > 0) {
        strengths.push(`Previous successful applications (${successfulApps}) show good track record`);
      }
    }

    return strengths;
  }

  /**
   * Identify application weaknesses
   */
  private identifyWeaknesses(
    scores: any,
    validation: ValidationResult,
    profile: ArtisanProfile,
    scheme: GovernmentScheme
  ): string[] {
    const weaknesses: string[] = [];

    if (scores.completeness < 70) {
      weaknesses.push('Application is incomplete - several required fields are missing');
    }

    if (scores.eligibility < 70) {
      weaknesses.push('Some eligibility criteria may not be fully met');
    }

    if (scores.documentation < 50) {
      weaknesses.push('Many required documents are missing');
    }

    if (validation.errors.length > 0) {
      weaknesses.push(`${validation.errors.length} validation errors need to be fixed`);
    }

    if (validation.missingDocuments.length > 0) {
      weaknesses.push(`${validation.missingDocuments.length} required documents are missing`);
    }

    return weaknesses;
  }

  /**
   * Generate prioritized recommendations
   */
  private generateRecommendations(
    scores: any,
    validation: ValidationResult,
    weaknesses: string[],
    profile: ArtisanProfile,
    scheme: GovernmentScheme
  ): PrioritizedRecommendation[] {
    const recommendations: PrioritizedRecommendation[] = [];

    // High priority recommendations
    if (validation.errors.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'presentation',
        recommendation: `Fix ${validation.errors.length} validation errors before submission`,
        impact: 'Critical - Application cannot be submitted with errors',
        actionable: true
      });
    }

    if (validation.missingDocuments.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'documentation',
        recommendation: `Upload ${validation.missingDocuments.length} missing required documents`,
        impact: 'High - Missing documents will delay or reject application',
        actionable: true
      });
    }

    // Medium priority recommendations
    if (scores.eligibility < 80) {
      recommendations.push({
        priority: 'medium',
        category: 'eligibility',
        recommendation: 'Review eligibility criteria and ensure all requirements are met',
        impact: 'Medium - May affect approval chances',
        actionable: true
      });
    }

    if (scores.presentation < 70) {
      recommendations.push({
        priority: 'medium',
        category: 'presentation',
        recommendation: 'Provide more detailed information in application fields',
        impact: 'Medium - Better presentation improves evaluation',
        actionable: true
      });
    }

    // Low priority recommendations
    if (scheme.application.deadline) {
      const daysUntilDeadline = Math.ceil(
        (new Date(scheme.application.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilDeadline <= 7) {
        recommendations.push({
          priority: 'high',
          category: 'timing',
          recommendation: `Submit soon - only ${daysUntilDeadline} days until deadline`,
          impact: 'Critical - Application will be rejected after deadline',
          actionable: true
        });
      } else if (daysUntilDeadline <= 30) {
        recommendations.push({
          priority: 'medium',
          category: 'timing',
          recommendation: `${daysUntilDeadline} days remaining until deadline`,
          impact: 'Medium - Plan to submit well before deadline',
          actionable: false
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  /**
   * Calculate success probability
   */
  private calculateSuccessProbability(
    overallScore: number,
    profile: ArtisanProfile,
    scheme: GovernmentScheme
  ): number {
    let probability = overallScore / 100;

    // Adjust based on scheme success rate
    if (scheme.metadata.successRate) {
      probability = (probability + scheme.metadata.successRate) / 2;
    }

    // Adjust based on profile success history
    if (profile.applicationHistory.length > 0) {
      const successRate = profile.applicationHistory.filter(
        app => app.outcome === 'approved'
      ).length / profile.applicationHistory.length;
      
      probability = (probability * 0.7) + (successRate * 0.3);
    }

    return Math.min(1, Math.max(0, probability));
  }

  /**
   * Compare with similar applications
   */
  private async compareWithSimilarApplications(
    overallScore: number,
    profile: ArtisanProfile,
    scheme: GovernmentScheme
  ): Promise<StrengthAnalysis['comparisonWithSimilar']> {
    // In a real implementation, this would query similar applications
    // For now, use scheme metadata
    const averageScore = 65; // Default average

    let position: 'below_average' | 'average' | 'above_average';
    if (overallScore < averageScore - 10) {
      position = 'below_average';
    } else if (overallScore > averageScore + 10) {
      position = 'above_average';
    } else {
      position = 'average';
    }

    return {
      averageScore,
      yourPosition: position
    };
  }

  /**
   * Helper methods
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private async getApplication(applicationId: string): Promise<SchemeApplication | null> {
    try {
      const doc = await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS)
        .doc(applicationId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as SchemeApplication;
    } catch (error) {
      console.error('Error fetching application:', error);
      return null;
    }
  }

  private async getScheme(schemeId: string): Promise<GovernmentScheme | null> {
    try {
      const doc = await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.SCHEMES)
        .doc(schemeId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as GovernmentScheme;
    } catch (error) {
      console.error('Error fetching scheme:', error);
      return null;
    }
  }

  private async getArtisanProfile(artisanId: string): Promise<ArtisanProfile | null> {
    try {
      const doc = await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.ARTISANS)
        .doc(artisanId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as ArtisanProfile;
    } catch (error) {
      console.error('Error fetching artisan profile:', error);
      return null;
    }
  }

  private handleError(error: any, operation: string): Error {
    console.error(`ApplicationGuidanceService.${operation} error:`, error);
    
    if (error.message) {
      return new Error(`${operation} failed: ${error.message}`);
    }
    
    return new Error(`${operation} failed: Unknown error`);
  }
}

// Export singleton instance
export const applicationGuidanceService = new ApplicationGuidanceService();
