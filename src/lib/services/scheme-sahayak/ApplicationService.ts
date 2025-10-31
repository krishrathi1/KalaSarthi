/**
 * Application Submission Service
 * Handles scheme application creation, submission, and management
 * 
 * Features:
 * - Auto-population from artisan profiles
 * - Application draft management with auto-save
 * - Form validation and completeness checking
 * - Application submission to government portals
 * 
 * Requirements: 5.1, 5.5
 */

import { adminDb } from '@/lib/firebase-admin';
import {
  SchemeApplication,
  ApplicationSubmissionResult,
  ArtisanProfile,
  GovernmentScheme,
  SCHEME_SAHAYAK_COLLECTIONS
} from '@/lib/types/scheme-sahayak';

/**
 * Application Service Interface
 */
export interface IApplicationService {
  createDraft(artisanId: string, schemeId: string): Promise<SchemeApplication>;
  updateDraft(applicationId: string, formData: Record<string, any>): Promise<void>;
  autoSaveDraft(applicationId: string, formData: Record<string, any>): Promise<void>;
  validateApplication(applicationId: string): Promise<ValidationResult>;
  submitApplication(applicationId: string): Promise<ApplicationSubmissionResult>;
  getApplication(applicationId: string): Promise<SchemeApplication | null>;
  listApplications(artisanId: string, filters?: ApplicationFilters): Promise<SchemeApplication[]>;
  deleteApplication(applicationId: string): Promise<void>;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  completeness: number; // 0-100
  errors: ValidationError[];
  warnings: ValidationWarning[];
  missingFields: string[];
  missingDocuments: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

export interface ApplicationFilters {
  status?: SchemeApplication['status'];
  schemeId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
}

/**
 * Application Service Implementation
 */
export class ApplicationService implements IApplicationService {
  private autoSaveInterval: number = 30000; // 30 seconds
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new application draft with auto-populated data
   * Requirement: 5.1 - Auto-populate application forms using verified Artisan_Profile data
   */
  async createDraft(artisanId: string, schemeId: string): Promise<SchemeApplication> {
    try {
      // Get artisan profile
      const profile = await this.getArtisanProfile(artisanId);
      if (!profile) {
        throw new Error('Artisan profile not found');
      }

      // Get scheme details
      const scheme = await this.getScheme(schemeId);
      if (!scheme) {
        throw new Error('Scheme not found');
      }

      // Auto-populate form data from profile
      const formData = this.autoPopulateFormData(profile, scheme);

      // Create application draft
      const application: SchemeApplication = {
        id: this.generateApplicationId(artisanId, schemeId),
        artisanId,
        schemeId,
        status: 'draft',
        formData,
        submittedDocuments: [],
        lastUpdated: new Date(),
        notes: []
      };

      // Save to Firestore
      await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS)
        .doc(application.id)
        .set(application);

      return application;
    } catch (error) {
      throw this.handleError(error, 'createDraft');
    }
  }

  /**
   * Update application draft
   */
  async updateDraft(
    applicationId: string,
    formData: Record<string, any>
  ): Promise<void> {
    try {
      const application = await this.getApplication(applicationId);
      
      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'draft') {
        throw new Error('Cannot update submitted application');
      }

      // Merge form data
      const updatedFormData = {
        ...application.formData,
        ...formData
      };

      // Update in Firestore
      await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS)
        .doc(applicationId)
        .update({
          formData: updatedFormData,
          lastUpdated: new Date()
        });
    } catch (error) {
      throw this.handleError(error, 'updateDraft');
    }
  }

  /**
   * Auto-save draft with debouncing
   * Requirement: 5.5 - Maintain application drafts with auto-save functionality every 30 seconds
   */
  async autoSaveDraft(
    applicationId: string,
    formData: Record<string, any>
  ): Promise<void> {
    try {
      // Clear existing timer for this application
      const existingTimer = this.autoSaveTimers.get(applicationId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer for auto-save
      const timer = setTimeout(async () => {
        try {
          await this.updateDraft(applicationId, formData);
          console.log(`Auto-saved application ${applicationId}`);
        } catch (error) {
          console.error(`Auto-save failed for ${applicationId}:`, error);
        } finally {
          this.autoSaveTimers.delete(applicationId);
        }
      }, this.autoSaveInterval);

      this.autoSaveTimers.set(applicationId, timer);
    } catch (error) {
      throw this.handleError(error, 'autoSaveDraft');
    }
  }

  /**
   * Validate application completeness and correctness
   * Requirement: 5.3 - Validate application completeness and flag potential errors
   */
  async validateApplication(applicationId: string): Promise<ValidationResult> {
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

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const missingFields: string[] = [];
      const missingDocuments: string[] = [];

      // Validate required fields
      const requiredFields = this.getRequiredFields(scheme);
      for (const field of requiredFields) {
        if (!application.formData[field] || application.formData[field] === '') {
          missingFields.push(field);
          errors.push({
            field,
            message: `${this.formatFieldName(field)} is required`,
            severity: 'error'
          });
        }
      }

      // Validate field formats
      const formatErrors = this.validateFieldFormats(application.formData);
      errors.push(...formatErrors);

      // Validate eligibility criteria
      const eligibilityWarnings = this.validateEligibility(profile, scheme);
      warnings.push(...eligibilityWarnings);

      // Check required documents
      const requiredDocs = scheme.application.requiredDocuments || [];
      const submittedDocs = application.submittedDocuments || [];
      
      for (const docType of requiredDocs) {
        const hasDoc = submittedDocs.some(docId => {
          const doc = profile.documents?.[docId];
          return doc && this.normalizeDocumentType(doc.type) === this.normalizeDocumentType(docType);
        });
        
        if (!hasDoc) {
          missingDocuments.push(docType);
          warnings.push({
            field: 'documents',
            message: `Missing required document: ${docType}`,
            severity: 'warning'
          });
        }
      }

      // Calculate completeness
      const totalFields = requiredFields.length + requiredDocs.length;
      const completedFields = requiredFields.length - missingFields.length + 
                             (requiredDocs.length - missingDocuments.length);
      const completeness = totalFields > 0 
        ? Math.round((completedFields / totalFields) * 100)
        : 100;

      return {
        isValid: errors.length === 0,
        completeness,
        errors,
        warnings,
        missingFields,
        missingDocuments
      };
    } catch (error) {
      throw this.handleError(error, 'validateApplication');
    }
  }

  /**
   * Submit application to government portal
   * Requirement: 5.1 - Create SchemeApplication interface and validation
   */
  async submitApplication(applicationId: string): Promise<ApplicationSubmissionResult> {
    try {
      const application = await this.getApplication(applicationId);
      
      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'draft') {
        throw new Error('Application has already been submitted');
      }

      // Validate before submission
      const validation = await this.validateApplication(applicationId);
      
      if (!validation.isValid) {
        return {
          applicationId,
          status: 'failed',
          submissionMethod: 'manual',
          estimatedProcessingTime: 0,
          nextSteps: ['Fix validation errors and resubmit'],
          errors: validation.errors.map(e => e.message)
        };
      }

      // Get scheme details
      const scheme = await this.getScheme(application.schemeId);
      if (!scheme) {
        throw new Error('Scheme not found');
      }

      // Update application status
      await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS)
        .doc(applicationId)
        .update({
          status: 'submitted',
          submittedAt: new Date(),
          lastUpdated: new Date()
        });

      // Generate confirmation number
      const confirmationNumber = this.generateConfirmationNumber(applicationId);

      // Prepare submission result
      const result: ApplicationSubmissionResult = {
        applicationId,
        status: 'submitted',
        submissionMethod: 'manual', // Will be updated in task 6.2 with API integration
        confirmationNumber,
        estimatedProcessingTime: scheme.application.processingTime.max || 60,
        nextSteps: [
          'Application submitted successfully',
          'You will receive updates via notifications',
          'Track your application status in the Applications section',
          `Estimated processing time: ${scheme.application.processingTime.min}-${scheme.application.processingTime.max} days`
        ]
      };

      // Create notification for submission
      await this.createSubmissionNotification(application, result);

      return result;
    } catch (error) {
      throw this.handleError(error, 'submitApplication');
    }
  }

  /**
   * Get application by ID
   */
  async getApplication(applicationId: string): Promise<SchemeApplication | null> {
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

  /**
   * List applications for an artisan with optional filters
   */
  async listApplications(
    artisanId: string,
    filters?: ApplicationFilters
  ): Promise<SchemeApplication[]> {
    try {
      let query = adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS)
        .where('artisanId', '==', artisanId);

      // Apply filters
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters?.schemeId) {
        query = query.where('schemeId', '==', filters.schemeId);
      }

      if (filters?.fromDate) {
        query = query.where('lastUpdated', '>=', filters.fromDate);
      }

      if (filters?.toDate) {
        query = query.where('lastUpdated', '<=', filters.toDate);
      }

      // Order by last updated
      query = query.orderBy('lastUpdated', 'desc');

      // Apply limit
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SchemeApplication));
    } catch (error) {
      throw this.handleError(error, 'listApplications');
    }
  }

  /**
   * Delete application (only drafts can be deleted)
   */
  async deleteApplication(applicationId: string): Promise<void> {
    try {
      const application = await this.getApplication(applicationId);
      
      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'draft') {
        throw new Error('Only draft applications can be deleted');
      }

      // Clear auto-save timer if exists
      const timer = this.autoSaveTimers.get(applicationId);
      if (timer) {
        clearTimeout(timer);
        this.autoSaveTimers.delete(applicationId);
      }

      // Delete from Firestore
      await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS)
        .doc(applicationId)
        .delete();
    } catch (error) {
      throw this.handleError(error, 'deleteApplication');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Auto-populate form data from artisan profile
   */
  private autoPopulateFormData(
    profile: ArtisanProfile,
    scheme: GovernmentScheme
  ): Record<string, any> {
    const formData: Record<string, any> = {
      // Personal information
      applicantName: profile.personalInfo.name,
      phone: profile.personalInfo.phone,
      email: profile.personalInfo.email,
      dateOfBirth: profile.personalInfo.dateOfBirth,
      aadhaarNumber: profile.personalInfo.aadhaarHash, // Will be masked
      panNumber: profile.personalInfo.panNumber,

      // Location information
      state: profile.location.state,
      district: profile.location.district,
      pincode: profile.location.pincode,
      address: profile.location.address,

      // Business information
      businessType: profile.business.type,
      businessCategory: profile.business.category,
      businessSubCategory: profile.business.subCategory,
      registrationNumber: profile.business.registrationNumber,
      establishmentYear: profile.business.establishmentYear,
      employeeCount: profile.business.employeeCount,
      monthlyIncome: profile.business.monthlyIncome,
      experienceYears: profile.business.experienceYears,

      // Scheme-specific fields
      schemeCategory: scheme.category,
      requestedAmount: scheme.benefits.amount.min, // Default to minimum
      
      // Metadata
      applicationDate: new Date(),
      language: profile.preferences.language
    };

    return formData;
  }

  /**
   * Get required fields for a scheme
   */
  private getRequiredFields(scheme: GovernmentScheme): string[] {
    const baseFields = [
      'applicantName',
      'phone',
      'email',
      'address',
      'state',
      'district',
      'pincode',
      'businessType',
      'businessCategory'
    ];

    // Add scheme-specific required fields
    const schemeSpecificFields: string[] = [];

    if (scheme.category === 'loan' || scheme.category === 'grant') {
      schemeSpecificFields.push('requestedAmount', 'monthlyIncome', 'registrationNumber');
    }

    if (scheme.eligibility.age) {
      schemeSpecificFields.push('dateOfBirth');
    }

    if (scheme.eligibility.income) {
      schemeSpecificFields.push('monthlyIncome');
    }

    return [...baseFields, ...schemeSpecificFields];
  }

  /**
   * Validate field formats
   */
  private validateFieldFormats(formData: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate email format
    if (formData.email && !this.isValidEmail(formData.email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        severity: 'error'
      });
    }

    // Validate phone format
    if (formData.phone && !this.isValidPhone(formData.phone)) {
      errors.push({
        field: 'phone',
        message: 'Invalid phone number format (should be 10 digits)',
        severity: 'error'
      });
    }

    // Validate pincode format
    if (formData.pincode && !this.isValidPincode(formData.pincode)) {
      errors.push({
        field: 'pincode',
        message: 'Invalid pincode format (should be 6 digits)',
        severity: 'error'
      });
    }

    // Validate PAN format
    if (formData.panNumber && !this.isValidPAN(formData.panNumber)) {
      errors.push({
        field: 'panNumber',
        message: 'Invalid PAN format (should be AAAAA9999A)',
        severity: 'error'
      });
    }

    // Validate amounts
    if (formData.requestedAmount && formData.requestedAmount <= 0) {
      errors.push({
        field: 'requestedAmount',
        message: 'Requested amount must be greater than 0',
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Validate eligibility criteria
   */
  private validateEligibility(
    profile: ArtisanProfile,
    scheme: GovernmentScheme
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check age eligibility
    if (scheme.eligibility.age) {
      const age = this.calculateAge(profile.personalInfo.dateOfBirth);
      
      if (scheme.eligibility.age.min && age < scheme.eligibility.age.min) {
        warnings.push({
          field: 'age',
          message: `Age (${age}) is below minimum requirement (${scheme.eligibility.age.min})`,
          severity: 'warning'
        });
      }
      
      if (scheme.eligibility.age.max && age > scheme.eligibility.age.max) {
        warnings.push({
          field: 'age',
          message: `Age (${age}) exceeds maximum limit (${scheme.eligibility.age.max})`,
          severity: 'warning'
        });
      }
    }

    // Check income eligibility
    if (scheme.eligibility.income) {
      const income = profile.business.monthlyIncome * 12; // Annual income
      
      if (scheme.eligibility.income.min && income < scheme.eligibility.income.min) {
        warnings.push({
          field: 'income',
          message: `Annual income is below minimum requirement`,
          severity: 'warning'
        });
      }
      
      if (scheme.eligibility.income.max && income > scheme.eligibility.income.max) {
        warnings.push({
          field: 'income',
          message: `Annual income exceeds maximum limit`,
          severity: 'warning'
        });
      }
    }

    // Check business type eligibility
    if (scheme.eligibility.businessType && scheme.eligibility.businessType.length > 0) {
      if (!scheme.eligibility.businessType.includes(profile.business.type)) {
        warnings.push({
          field: 'businessType',
          message: `Business type may not be eligible for this scheme`,
          severity: 'warning'
        });
      }
    }

    // Check location eligibility
    if (scheme.eligibility.location.states && scheme.eligibility.location.states.length > 0) {
      if (!scheme.eligibility.location.states.includes(profile.location.state)) {
        warnings.push({
          field: 'location',
          message: `This scheme may not be available in your state`,
          severity: 'warning'
        });
      }
    }

    return warnings;
  }

  /**
   * Create submission notification
   */
  private async createSubmissionNotification(
    application: SchemeApplication,
    result: ApplicationSubmissionResult
  ): Promise<void> {
    try {
      await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS)
        .add({
          type: 'application_submitted',
          userId: application.artisanId,
          priority: 'medium',
          scheduledFor: new Date(),
          data: {
            applicationId: application.id,
            schemeId: application.schemeId,
            confirmationNumber: result.confirmationNumber,
            estimatedProcessingTime: result.estimatedProcessingTime
          },
          status: 'pending',
          createdAt: new Date()
        });
    } catch (error) {
      console.error('Error creating submission notification:', error);
      // Don't throw - notification failure shouldn't block submission
    }
  }

  /**
   * Helper methods
   */
  private generateApplicationId(artisanId: string, schemeId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `app_${artisanId}_${schemeId}_${timestamp}_${random}`;
  }

  private generateConfirmationNumber(applicationId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CONF-${timestamp}-${random}`;
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private normalizeDocumentType(docType: string): string {
    return docType.toLowerCase().trim().replace(/\s+/g, '_');
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  }

  private isValidPincode(pincode: string): boolean {
    const pincodeRegex = /^\d{6}$/;
    return pincodeRegex.test(pincode);
  }

  private isValidPAN(pan: string): boolean {
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
    return panRegex.test(pan);
  }

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

  private handleError(error: any, operation: string): Error {
    console.error(`ApplicationService.${operation} error:`, error);
    
    if (error.message) {
      return new Error(`${operation} failed: ${error.message}`);
    }
    
    return new Error(`${operation} failed: Unknown error`);
  }
}

// Export singleton instance
export const applicationService = new ApplicationService();
