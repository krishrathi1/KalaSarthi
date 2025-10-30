/**
 * Scheme Sahayak Integration Service for Artisan Buddy
 * 
 * Integrates with Scheme Sahayak (Government Scheme Discovery System) to provide:
 * - Scheme recommendations
 * - Application status checking
 * - Scheme eligibility information
 * - Scheme comparison
 * 
 * Requirements: 7.5, 14.2
 */

import { SchemeDiscoveryService } from '../scheme-sahayak/SchemeDiscoveryService';
import { EnhancedSchemeService } from '../scheme-sahayak/EnhancedSchemeService';
import { ApplicationService } from '../scheme-sahayak/ApplicationService';
import { GovernmentScheme, ArtisanProfile } from '@/lib/types/scheme-sahayak';
import { firestoreRepository } from './FirestoreRepository';

// ============================================================================
// INTERFACES
// ============================================================================

export interface SchemeRecommendation {
  scheme: GovernmentScheme;
  eligibilityScore: number;
  matchReasons: string[];
  estimatedBenefit: string;
  applicationComplexity: 'low' | 'medium' | 'high';
  recommendedAction: string;
}

export interface ApplicationStatus {
  applicationId: string;
  schemeId: string;
  schemeName: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed';
  submittedDate?: Date;
  lastUpdated: Date;
  currentStage: string;
  nextSteps: string[];
  estimatedCompletionDate?: Date;
  documents: Array<{
    name: string;
    status: 'pending' | 'uploaded' | 'verified' | 'rejected';
    rejectionReason?: string;
  }>;
}

export interface EligibilityCheck {
  schemeId: string;
  schemeName: string;
  isEligible: boolean;
  eligibilityScore: number;
  matchedCriteria: string[];
  missingCriteria: string[];
  recommendations: string[];
  estimatedBenefit: string;
}

export interface SchemeComparison {
  schemes: Array<{
    scheme: GovernmentScheme;
    eligibilityScore: number;
    benefits: string[];
    requirements: string[];
    processingTime: string;
    successRate: number;
    pros: string[];
    cons: string[];
  }>;
  recommendation: string;
  bestMatch: string; // scheme ID
}

// ============================================================================
// SCHEME SAHAYAK INTEGRATION SERVICE
// ============================================================================

export class SchemeSahayakIntegration {
  private static instance: SchemeSahayakIntegration;
  private discoveryService: SchemeDiscoveryService;
  private schemeService: EnhancedSchemeService;
  private applicationService: ApplicationService;

  private constructor() {
    this.discoveryService = new SchemeDiscoveryService();
    this.schemeService = new EnhancedSchemeService();
    this.applicationService = new ApplicationService();
  }

  public static getInstance(): SchemeSahayakIntegration {
    if (!SchemeSahayakIntegration.instance) {
      SchemeSahayakIntegration.instance = new SchemeSahayakIntegration();
    }
    return SchemeSahayakIntegration.instance;
  }

  // ============================================================================
  // SCHEME RECOMMENDATIONS (Requirement 7.5, 14.2)
  // ============================================================================

  /**
   * Get personalized scheme recommendations for an artisan
   */
  async getSchemeRecommendations(
    artisanId: string,
    limit: number = 5
  ): Promise<SchemeRecommendation[]> {
    try {
      // Get artisan profile
      const profile = await this.getArtisanProfile(artisanId);

      // Get recommended schemes
      const schemes = await this.discoveryService.discoverSchemes({
        mode: 'recommended',
        userProfile: profile,
        limitCount: limit * 2, // Get more for filtering
        excludeApplied: true,
      });

      // Convert to recommendations with detailed analysis
      const recommendations: SchemeRecommendation[] = [];

      for (const scheme of schemes.slice(0, limit)) {
        const eligibility = await this.checkEligibility(artisanId, scheme.id);
        
        recommendations.push({
          scheme,
          eligibilityScore: eligibility.eligibilityScore,
          matchReasons: eligibility.matchedCriteria,
          estimatedBenefit: eligibility.estimatedBenefit,
          applicationComplexity: this.assessComplexity(scheme),
          recommendedAction: this.getRecommendedAction(scheme, eligibility),
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error fetching scheme recommendations:', error);
      throw new Error('Failed to fetch scheme recommendations');
    }
  }

  /**
   * Get trending schemes that might interest the artisan
   */
  async getTrendingSchemes(artisanId: string, limit: number = 5): Promise<GovernmentScheme[]> {
    try {
      const profile = await this.getArtisanProfile(artisanId);

      const schemes = await this.discoveryService.discoverSchemes({
        mode: 'trending',
        userProfile: profile,
        limitCount: limit,
      });

      return schemes.map(s => s as GovernmentScheme);
    } catch (error) {
      console.error('Error fetching trending schemes:', error);
      throw new Error('Failed to fetch trending schemes');
    }
  }

  /**
   * Get schemes with urgent deadlines
   */
  async getUrgentDeadlineSchemes(artisanId: string, limit: number = 5): Promise<GovernmentScheme[]> {
    try {
      const profile = await this.getArtisanProfile(artisanId);

      const schemes = await this.discoveryService.discoverSchemes({
        mode: 'deadline_urgent',
        userProfile: profile,
        limitCount: limit,
      });

      return schemes.map(s => s as GovernmentScheme);
    } catch (error) {
      console.error('Error fetching urgent deadline schemes:', error);
      throw new Error('Failed to fetch urgent deadline schemes');
    }
  }

  // ============================================================================
  // APPLICATION STATUS (Requirement 14.2)
  // ============================================================================

  /**
   * Check application status for all schemes
   */
  async getApplicationStatuses(artisanId: string): Promise<ApplicationStatus[]> {
    try {
      const applications = await this.applicationService.getArtisanApplications(artisanId);

      const statuses: ApplicationStatus[] = [];

      for (const app of applications) {
        const scheme = await this.schemeService.getSchemeById(app.schemeId);
        
        statuses.push({
          applicationId: app.id,
          schemeId: app.schemeId,
          schemeName: scheme?.title || 'Unknown Scheme',
          status: app.status,
          submittedDate: app.submittedAt,
          lastUpdated: app.updatedAt,
          currentStage: this.getCurrentStage(app.status),
          nextSteps: this.getNextSteps(app.status),
          estimatedCompletionDate: this.estimateCompletionDate(app),
          documents: app.documents.map(doc => ({
            name: doc.name,
            status: doc.verificationStatus || 'pending',
            rejectionReason: doc.rejectionReason,
          })),
        });
      }

      return statuses;
    } catch (error) {
      console.error('Error fetching application statuses:', error);
      throw new Error('Failed to fetch application statuses');
    }
  }

  /**
   * Get status for a specific application
   */
  async getApplicationStatus(applicationId: string): Promise<ApplicationStatus | null> {
    try {
      const app = await this.applicationService.getApplicationById(applicationId);
      if (!app) return null;

      const scheme = await this.schemeService.getSchemeById(app.schemeId);

      return {
        applicationId: app.id,
        schemeId: app.schemeId,
        schemeName: scheme?.title || 'Unknown Scheme',
        status: app.status,
        submittedDate: app.submittedAt,
        lastUpdated: app.updatedAt,
        currentStage: this.getCurrentStage(app.status),
        nextSteps: this.getNextSteps(app.status),
        estimatedCompletionDate: this.estimateCompletionDate(app),
        documents: app.documents.map(doc => ({
          name: doc.name,
          status: doc.verificationStatus || 'pending',
          rejectionReason: doc.rejectionReason,
        })),
      };
    } catch (error) {
      console.error('Error fetching application status:', error);
      throw new Error('Failed to fetch application status');
    }
  }

  // ============================================================================
  // ELIGIBILITY CHECKING (Requirement 7.5)
  // ============================================================================

  /**
   * Check eligibility for a specific scheme
   */
  async checkEligibility(artisanId: string, schemeId: string): Promise<EligibilityCheck> {
    try {
      const profile = await this.getArtisanProfile(artisanId);
      const scheme = await this.schemeService.getSchemeById(schemeId);

      if (!scheme) {
        throw new Error('Scheme not found');
      }

      // Perform eligibility check
      const eligibilityResult = await this.schemeService.checkEligibility(profile, scheme);

      return {
        schemeId: scheme.id,
        schemeName: scheme.title,
        isEligible: eligibilityResult.isEligible,
        eligibilityScore: eligibilityResult.score,
        matchedCriteria: eligibilityResult.matchedCriteria,
        missingCriteria: eligibilityResult.missingCriteria,
        recommendations: this.generateEligibilityRecommendations(eligibilityResult),
        estimatedBenefit: this.calculateEstimatedBenefit(scheme, profile),
      };
    } catch (error) {
      console.error('Error checking eligibility:', error);
      throw new Error('Failed to check eligibility');
    }
  }

  /**
   * Batch check eligibility for multiple schemes
   */
  async checkMultipleEligibility(
    artisanId: string,
    schemeIds: string[]
  ): Promise<EligibilityCheck[]> {
    try {
      const checks = await Promise.all(
        schemeIds.map(schemeId => this.checkEligibility(artisanId, schemeId))
      );

      return checks;
    } catch (error) {
      console.error('Error checking multiple eligibility:', error);
      throw new Error('Failed to check multiple eligibility');
    }
  }

  // ============================================================================
  // SCHEME COMPARISON (Requirement 14.2)
  // ============================================================================

  /**
   * Compare multiple schemes side by side
   */
  async compareSchemes(
    artisanId: string,
    schemeIds: string[]
  ): Promise<SchemeComparison> {
    try {
      if (schemeIds.length < 2) {
        throw new Error('At least 2 schemes required for comparison');
      }

      const profile = await this.getArtisanProfile(artisanId);
      const schemes = await Promise.all(
        schemeIds.map(id => this.schemeService.getSchemeById(id))
      );

      const validSchemes = schemes.filter(s => s !== null) as GovernmentScheme[];

      if (validSchemes.length < 2) {
        throw new Error('Not enough valid schemes for comparison');
      }

      // Get eligibility for each scheme
      const eligibilityChecks = await Promise.all(
        validSchemes.map(scheme => this.checkEligibility(artisanId, scheme.id))
      );

      // Build comparison
      const comparison: SchemeComparison['schemes'] = validSchemes.map((scheme, index) => {
        const eligibility = eligibilityChecks[index];
        
        return {
          scheme,
          eligibilityScore: eligibility.eligibilityScore,
          benefits: this.extractBenefits(scheme),
          requirements: this.extractRequirements(scheme),
          processingTime: this.formatProcessingTime(scheme),
          successRate: scheme.metadata?.successRate || 0,
          pros: this.identifyPros(scheme, eligibility),
          cons: this.identifyCons(scheme, eligibility),
        };
      });

      // Determine best match
      const bestMatch = comparison.reduce((best, current) =>
        current.eligibilityScore > best.eligibilityScore ? current : best
      );

      return {
        schemes: comparison,
        recommendation: this.generateComparisonRecommendation(comparison),
        bestMatch: bestMatch.scheme.id,
      };
    } catch (error) {
      console.error('Error comparing schemes:', error);
      throw new Error('Failed to compare schemes');
    }
  }

  /**
   * Get quick summary for chatbot responses
   */
  async getQuickSchemeSummary(artisanId: string): Promise<string> {
    try {
      const recommendations = await this.getSchemeRecommendations(artisanId, 3);
      const applications = await this.getApplicationStatuses(artisanId);

      const activeApplications = applications.filter(
        app => app.status !== 'completed' && app.status !== 'rejected'
      );

      let summary = '🎯 Scheme Sahayak Summary:\n\n';

      // Recommendations
      if (recommendations.length > 0) {
        summary += '💡 Top Recommendations:\n';
        recommendations.forEach((rec, index) => {
          summary += `${index + 1}. ${rec.scheme.title}\n`;
          summary += `   - Eligibility: ${rec.eligibilityScore}%\n`;
          summary += `   - Benefit: ${rec.estimatedBenefit}\n`;
          summary += `   - ${rec.recommendedAction}\n\n`;
        });
      } else {
        summary += '💡 No new scheme recommendations at this time.\n\n';
      }

      // Active applications
      if (activeApplications.length > 0) {
        summary += '📋 Active Applications:\n';
        activeApplications.forEach(app => {
          summary += `- ${app.schemeName}: ${app.status}\n`;
          summary += `  Current Stage: ${app.currentStage}\n`;
        });
      } else {
        summary += '📋 No active applications.\n';
      }

      return summary.trim();
    } catch (error) {
      console.error('Error generating quick scheme summary:', error);
      return 'Unable to fetch scheme information at this time.';
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getArtisanProfile(artisanId: string): Promise<ArtisanProfile> {
    // Get profile from Firestore
    const userProfile = await firestoreRepository.getArtisanProfile(artisanId);

    // Convert to ArtisanProfile format expected by Scheme Sahayak
    return {
      id: artisanId,
      name: userProfile.name,
      age: userProfile.age || 30,
      gender: userProfile.gender || 'other',
      contact: {
        phone: userProfile.phone || '',
        email: userProfile.email || '',
        preferredLanguage: userProfile.languages?.[0] || 'en',
      },
      location: {
        state: userProfile.location?.state || '',
        district: userProfile.location?.city || '',
        pincode: userProfile.location?.pincode || '',
        address: userProfile.location?.address || '',
      },
      business: {
        type: userProfile.profession || 'artisan',
        category: userProfile.specializations?.[0] || 'handicrafts',
        yearsOfExperience: userProfile.experience || 0,
        numberOfEmployees: 1,
        annualTurnover: 0,
        monthlyIncome: 0,
        hasGSTRegistration: false,
        hasMSMERegistration: false,
      },
      documents: [],
      preferences: {
        language: userProfile.languages?.[0] || 'en',
        notificationChannels: ['in_app'],
      },
    } as ArtisanProfile;
  }

  private assessComplexity(scheme: GovernmentScheme): 'low' | 'medium' | 'high' {
    const docCount = scheme.application.requiredDocuments?.length || 0;
    const hasInterview = scheme.application.process?.some(step => 
      step.toLowerCase().includes('interview')
    );

    if (docCount <= 3 && !hasInterview) return 'low';
    if (docCount <= 6) return 'medium';
    return 'high';
  }

  private getRecommendedAction(scheme: GovernmentScheme, eligibility: EligibilityCheck): string {
    if (eligibility.isEligible) {
      if (scheme.application.deadline) {
        const daysLeft = Math.ceil(
          (new Date(scheme.application.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 7) {
          return `Apply immediately! Deadline in ${daysLeft} days.`;
        }
        return `Apply soon. Deadline: ${new Date(scheme.application.deadline).toLocaleDateString()}`;
      }
      return 'You can apply for this scheme now.';
    } else {
      if (eligibility.missingCriteria.length > 0) {
        return `Complete: ${eligibility.missingCriteria[0]} to become eligible.`;
      }
      return 'Review eligibility requirements.';
    }
  }

  private getCurrentStage(status: string): string {
    const stageMap: Record<string, string> = {
      draft: 'Application Draft',
      submitted: 'Under Initial Review',
      under_review: 'Document Verification',
      approved: 'Approved - Awaiting Disbursement',
      rejected: 'Application Rejected',
      completed: 'Completed',
    };

    return stageMap[status] || 'Unknown Stage';
  }

  private getNextSteps(status: string): string[] {
    const stepsMap: Record<string, string[]> = {
      draft: ['Complete application form', 'Upload required documents', 'Submit application'],
      submitted: ['Wait for initial review', 'Check for any queries from officials'],
      under_review: ['Respond to any document queries', 'Upload additional documents if requested'],
      approved: ['Wait for disbursement', 'Check bank account for credit'],
      rejected: ['Review rejection reason', 'Consider reapplying after addressing issues'],
      completed: ['No further action required'],
    };

    return stepsMap[status] || ['Check application status regularly'];
  }

  private estimateCompletionDate(app: any): Date | undefined {
    if (app.status === 'completed' || app.status === 'rejected') {
      return undefined;
    }

    // Estimate based on average processing time (30-60 days)
    const submittedDate = app.submittedAt || app.createdAt;
    if (submittedDate) {
      const estimatedDays = 45;
      const completionDate = new Date(submittedDate);
      completionDate.setDate(completionDate.getDate() + estimatedDays);
      return completionDate;
    }

    return undefined;
  }

  private generateEligibilityRecommendations(eligibilityResult: any): string[] {
    const recommendations: string[] = [];

    if (!eligibilityResult.isEligible) {
      eligibilityResult.missingCriteria.forEach((criteria: string) => {
        recommendations.push(`Complete: ${criteria}`);
      });
    } else {
      recommendations.push('You meet all eligibility criteria');
      recommendations.push('Gather required documents before applying');
      recommendations.push('Review application process carefully');
    }

    return recommendations;
  }

  private calculateEstimatedBenefit(scheme: GovernmentScheme, profile: ArtisanProfile): string {
    if (scheme.benefits.amount) {
      const min = scheme.benefits.amount.min || 0;
      const max = scheme.benefits.amount.max || 0;
      
      if (min > 0 && max > 0) {
        return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
      } else if (max > 0) {
        return `Up to ₹${max.toLocaleString('en-IN')}`;
      }
    }

    return 'Varies based on application';
  }

  private extractBenefits(scheme: GovernmentScheme): string[] {
    const benefits: string[] = [];

    if (scheme.benefits.coverageDetails) {
      benefits.push(scheme.benefits.coverageDetails);
    }

    if (scheme.benefits.amount?.max) {
      benefits.push(`Financial assistance up to ₹${scheme.benefits.amount.max.toLocaleString('en-IN')}`);
    }

    if (scheme.benefits.type) {
      benefits.push(`Type: ${scheme.benefits.type}`);
    }

    return benefits.length > 0 ? benefits : ['Details available in scheme description'];
  }

  private extractRequirements(scheme: GovernmentScheme): string[] {
    const requirements: string[] = [];

    if (scheme.eligibility.businessType) {
      requirements.push(`Business Type: ${scheme.eligibility.businessType.join(', ')}`);
    }

    if (scheme.eligibility.ageRange) {
      requirements.push(`Age: ${scheme.eligibility.ageRange.min}-${scheme.eligibility.ageRange.max} years`);
    }

    if (scheme.application.requiredDocuments) {
      requirements.push(`Documents: ${scheme.application.requiredDocuments.length} required`);
    }

    return requirements.length > 0 ? requirements : ['See scheme details for requirements'];
  }

  private formatProcessingTime(scheme: GovernmentScheme): string {
    const days = scheme.metadata?.averageProcessingTime || 30;
    
    if (days <= 7) return `${days} days (Fast)`;
    if (days <= 30) return `${days} days (Normal)`;
    return `${days} days (Slow)`;
  }

  private identifyPros(scheme: GovernmentScheme, eligibility: EligibilityCheck): string[] {
    const pros: string[] = [];

    if (eligibility.eligibilityScore >= 80) {
      pros.push('High eligibility match');
    }

    if (scheme.metadata?.successRate && scheme.metadata.successRate >= 70) {
      pros.push('High success rate');
    }

    if (scheme.application.onlineApplication) {
      pros.push('Online application available');
    }

    if (scheme.metadata?.averageProcessingTime && scheme.metadata.averageProcessingTime <= 30) {
      pros.push('Quick processing');
    }

    return pros.length > 0 ? pros : ['Review scheme details'];
  }

  private identifyCons(scheme: GovernmentScheme, eligibility: EligibilityCheck): string[] {
    const cons: string[] = [];

    if (eligibility.eligibilityScore < 50) {
      cons.push('Low eligibility match');
    }

    if (eligibility.missingCriteria.length > 0) {
      cons.push(`Missing ${eligibility.missingCriteria.length} criteria`);
    }

    if (scheme.application.requiredDocuments && scheme.application.requiredDocuments.length > 6) {
      cons.push('Many documents required');
    }

    if (scheme.metadata?.averageProcessingTime && scheme.metadata.averageProcessingTime > 60) {
      cons.push('Long processing time');
    }

    return cons.length > 0 ? cons : ['No major concerns'];
  }

  private generateComparisonRecommendation(comparison: SchemeComparison['schemes']): string {
    const bestScheme = comparison.reduce((best, current) =>
      current.eligibilityScore > best.eligibilityScore ? current : best
    );

    return `Based on your profile, ${bestScheme.scheme.title} is the best match with ${bestScheme.eligibilityScore}% eligibility. ${bestScheme.pros[0] || 'Consider applying soon.'}`;
  }
}

export const schemeSahayakIntegration = SchemeSahayakIntegration.getInstance();
