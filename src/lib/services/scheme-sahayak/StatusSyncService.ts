/**
 * Status Synchronization Service
 * Handles real-time application status synchronization with government systems
 * 
 * Features:
 * - 4-hour sync scheduler with government systems
 * - Visual timeline generation with progress tracking
 * - Officer contact information extraction
 * 
 * Requirements: 3.1, 3.3, 3.4, 3.5
 */

import { adminDb } from '@/lib/firebase-admin';
import {
  SchemeApplication,
  ApplicationStatus,
  ApplicationTimeline,
  ApplicationStage,
  SyncResult,
  SCHEME_SAHAYAK_COLLECTIONS
} from '@/lib/types/scheme-sahayak';
import { GovernmentAPIConnector } from './GovernmentAPIConnector';

/**
 * Status Sync Service Interface
 */
export interface IStatusSyncService {
  syncApplicationStatus(applicationId: string): Promise<ApplicationStatus>;
  syncAllApplications(artisanId: string): Promise<SyncResult>;
  scheduleSync(applicationId: string): Promise<void>;
  getApplicationTimeline(applicationId: string): Promise<ApplicationTimeline>;
  extractOfficerContact(applicationId: string): Promise<OfficerContact | null>;
}

/**
 * Officer contact information
 */
export interface OfficerContact {
  name: string;
  designation: string;
  phone: string;
  email: string;
  office: string;
  availableHours?: string;
}

/**
 * Sync configuration
 */
interface SyncConfig {
  intervalHours: number;
  maxRetries: number;
  batchSize: number;
  notifyOnStatusChange: boolean;
}

/**
 * Status Synchronization Service Implementation
 */
export class StatusSyncService implements IStatusSyncService {
  private governmentAPI: GovernmentAPIConnector;
  private syncConfig: SyncConfig;
  private syncTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.governmentAPI = new GovernmentAPIConnector();
    this.syncConfig = {
      intervalHours: 4, // Requirement: 3.1 - Sync every 4 hours
      maxRetries: 3,
      batchSize: 50,
      notifyOnStatusChange: true
    };
  }

  /**
   * Sync application status with government portal
   * Requirement: 3.1 - Synchronize with government portals every 4 hours
   */
  async syncApplicationStatus(applicationId: string): Promise<ApplicationStatus> {
    try {
      const application = await this.getApplication(applicationId);
      
      if (!application) {
        throw new Error('Application not found');
      }

      // Skip sync for draft applications
      if (application.status === 'draft') {
        return this.buildApplicationStatus(application);
      }

      // Fetch status from government portal
      const governmentStatus = await this.fetchGovernmentStatus(application);
      
      // Update application with new status
      const updatedApplication = await this.updateApplicationStatus(
        application,
        governmentStatus
      );

      // Build and return application status
      const status = this.buildApplicationStatus(updatedApplication);

      // Send notification if status changed
      if (governmentStatus.statusChanged && this.syncConfig.notifyOnStatusChange) {
        await this.sendStatusChangeNotification(updatedApplication, status);
      }

      return status;
    } catch (error) {
      throw this.handleError(error, 'syncApplicationStatus');
    }
  }

  /**
   * Sync all applications for an artisan
   * Requirement: 3.5 - Maintain 99.5% accuracy in status synchronization
   */
  async syncAllApplications(artisanId: string): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      applicationsUpdated: 0,
      errors: [],
      lastSyncTime: new Date(),
      nextSyncTime: new Date(Date.now() + this.syncConfig.intervalHours * 60 * 60 * 1000)
    };

    try {
      // Get all non-draft applications for artisan
      const applications = await this.getArtisanApplications(artisanId);
      const activeApplications = applications.filter(
        app => app.status !== 'draft' && app.status !== 'approved' && app.status !== 'rejected'
      );

      // Sync in batches
      for (let i = 0; i < activeApplications.length; i += this.syncConfig.batchSize) {
        const batch = activeApplications.slice(i, i + this.syncConfig.batchSize);
        
        await Promise.allSettled(
          batch.map(async (app) => {
            try {
              await this.syncApplicationStatus(app.id);
              result.applicationsUpdated++;
            } catch (error: any) {
              result.errors.push(`Failed to sync ${app.id}: ${error.message}`);
            }
          })
        );
      }

      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Schedule automatic sync for an application
   * Requirement: 3.1 - Sync every 4 hours
   */
  async scheduleSync(applicationId: string): Promise<void> {
    try {
      // Clear existing timer if any
      const existingTimer = this.syncTimers.get(applicationId);
      if (existingTimer) {
        clearInterval(existingTimer);
      }

      // Schedule new sync
      const intervalMs = this.syncConfig.intervalHours * 60 * 60 * 1000;
      const timer = setInterval(async () => {
        try {
          await this.syncApplicationStatus(applicationId);
          console.log(`Auto-synced application ${applicationId}`);
        } catch (error) {
          console.error(`Auto-sync failed for ${applicationId}:`, error);
        }
      }, intervalMs);

      this.syncTimers.set(applicationId, timer);

      // Perform initial sync
      await this.syncApplicationStatus(applicationId);
    } catch (error) {
      throw this.handleError(error, 'scheduleSync');
    }
  }

  /**
   * Get application timeline with visual progress tracking
   * Requirement: 3.3 - Display visual timeline of application progress
   */
  async getApplicationTimeline(applicationId: string): Promise<ApplicationTimeline> {
    try {
      const application = await this.getApplication(applicationId);
      
      if (!application) {
        throw new Error('Application not found');
      }

      const scheme = await this.getScheme(application.schemeId);
      if (!scheme) {
        throw new Error('Scheme not found');
      }

      // Build timeline stages
      const stages = this.buildTimelineStages(application, scheme);
      
      // Calculate current stage index
      const currentStageIndex = this.getCurrentStageIndex(stages);
      
      // Calculate durations
      const estimatedDuration = stages.reduce((sum, stage) => sum + stage.estimatedDuration, 0);
      const actualDuration = application.submittedAt 
        ? Math.ceil((Date.now() - new Date(application.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      return {
        stages,
        currentStageIndex,
        estimatedDuration,
        actualDuration
      };
    } catch (error) {
      throw this.handleError(error, 'getApplicationTimeline');
    }
  }

  /**
   * Extract officer contact information
   * Requirement: 3.4 - Provide officer contact information
   */
  async extractOfficerContact(applicationId: string): Promise<OfficerContact | null> {
    try {
      const application = await this.getApplication(applicationId);
      
      if (!application) {
        throw new Error('Application not found');
      }

      // Check if officer is already assigned
      if (application.officerAssigned) {
        // Fetch officer details from government portal
        const officerDetails = await this.fetchOfficerDetails(
          application.governmentApplicationId || '',
          application.officerAssigned
        );
        
        if (officerDetails) {
          return officerDetails;
        }
      }

      // Try to extract from application notes or metadata
      const extractedContact = this.extractContactFromNotes(application);
      if (extractedContact) {
        return extractedContact;
      }

      return null;
    } catch (error) {
      console.error('Error extracting officer contact:', error);
      return null;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Fetch status from government portal
   */
  private async fetchGovernmentStatus(
    application: SchemeApplication
  ): Promise<{
    status: SchemeApplication['status'];
    currentStage: string;
    progress: number;
    statusChanged: boolean;
    officerAssigned?: string;
    estimatedCompletion?: Date;
    notes?: string[];
  }> {
    try {
      // If no government application ID, return current status
      if (!application.governmentApplicationId) {
        return {
          status: application.status,
          currentStage: 'Submitted',
          progress: 10,
          statusChanged: false
        };
      }

      // Fetch from government API
      const response = await this.governmentAPI.checkApplicationStatus(
        application.governmentApplicationId
      );

      // Map government status to our status
      const mappedStatus = this.mapGovernmentStatus(response.status);
      const statusChanged = mappedStatus !== application.status;

      return {
        status: mappedStatus,
        currentStage: response.currentStage || 'Under Review',
        progress: response.progress || this.calculateProgress(mappedStatus),
        statusChanged,
        officerAssigned: response.officerAssigned,
        estimatedCompletion: response.estimatedCompletion 
          ? new Date(response.estimatedCompletion)
          : undefined,
        notes: response.notes
      };
    } catch (error) {
      console.error('Error fetching government status:', error);
      // Return current status if fetch fails
      return {
        status: application.status,
        currentStage: 'Status check failed',
        progress: 0,
        statusChanged: false
      };
    }
  }

  /**
   * Update application with new status
   */
  private async updateApplicationStatus(
    application: SchemeApplication,
    governmentStatus: any
  ): Promise<SchemeApplication> {
    const updates: Partial<SchemeApplication> = {
      status: governmentStatus.status,
      lastUpdated: new Date()
    };

    if (governmentStatus.officerAssigned) {
      updates.officerAssigned = governmentStatus.officerAssigned;
    }

    if (governmentStatus.estimatedCompletion) {
      updates.estimatedDecisionDate = governmentStatus.estimatedCompletion;
    }

    if (governmentStatus.notes && governmentStatus.notes.length > 0) {
      updates.notes = [
        ...(application.notes || []),
        ...governmentStatus.notes
      ];
    }

    // Update in Firestore
    await adminDb
      .collection(SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS)
      .doc(application.id)
      .update(updates);

    return {
      ...application,
      ...updates
    };
  }

  /**
   * Build application status object
   */
  private buildApplicationStatus(application: SchemeApplication): ApplicationStatus {
    const progress = this.calculateProgress(application.status);
    const currentStage = this.getCurrentStageName(application.status);
    
    // Calculate estimated completion
    const estimatedCompletion = application.estimatedDecisionDate || 
      this.calculateEstimatedCompletion(application);

    // Determine next actions
    const nextActions = this.determineNextActions(application);

    // Get document status
    const documentStatus = this.getDocumentStatus(application);

    return {
      id: `status_${application.id}`,
      applicationId: application.id,
      schemeId: application.schemeId,
      status: application.status,
      currentStage,
      progress,
      estimatedCompletion,
      lastUpdated: application.lastUpdated,
      nextActions,
      documents: documentStatus
    };
  }

  /**
   * Build timeline stages
   */
  private buildTimelineStages(
    application: SchemeApplication,
    scheme: any
  ): ApplicationStage[] {
    const stages: ApplicationStage[] = [
      {
        name: 'Application Submitted',
        description: 'Your application has been submitted successfully',
        status: application.status === 'draft' ? 'pending' : 'completed',
        startDate: application.submittedAt,
        completionDate: application.submittedAt,
        estimatedDuration: 0,
        requirements: []
      },
      {
        name: 'Document Verification',
        description: 'Verifying submitted documents',
        status: this.getStageStatus(application.status, ['submitted']),
        startDate: application.submittedAt,
        estimatedDuration: 7,
        requirements: ['All required documents', 'Valid document formats']
      },
      {
        name: 'Eligibility Check',
        description: 'Checking eligibility criteria',
        status: this.getStageStatus(application.status, ['submitted', 'under_review']),
        estimatedDuration: 5,
        requirements: ['Meet age criteria', 'Meet income criteria', 'Business type match']
      },
      {
        name: 'Review by Officer',
        description: 'Application under review by assigned officer',
        status: this.getStageStatus(application.status, ['under_review']),
        estimatedDuration: 14,
        requirements: ['Complete application', 'All verifications passed']
      },
      {
        name: 'Final Decision',
        description: 'Final approval or rejection decision',
        status: this.getStageStatus(application.status, ['approved', 'rejected']),
        estimatedDuration: 7,
        requirements: []
      }
    ];

    // Add completion dates for completed stages
    if (application.status === 'approved' || application.status === 'rejected') {
      stages[stages.length - 1].completionDate = application.lastUpdated;
      stages[stages.length - 1].status = 'completed';
    }

    return stages;
  }

  /**
   * Get current stage index
   */
  private getCurrentStageIndex(stages: ApplicationStage[]): number {
    for (let i = stages.length - 1; i >= 0; i--) {
      if (stages[i].status === 'completed' || stages[i].status === 'in_progress') {
        return i;
      }
    }
    return 0;
  }

  /**
   * Get stage status based on application status
   */
  private getStageStatus(
    applicationStatus: SchemeApplication['status'],
    relevantStatuses: string[]
  ): ApplicationStage['status'] {
    if (applicationStatus === 'draft') {
      return 'pending';
    }

    if (relevantStatuses.includes(applicationStatus)) {
      return 'in_progress';
    }

    const statusOrder = ['draft', 'submitted', 'under_review', 'approved', 'rejected'];
    const currentIndex = statusOrder.indexOf(applicationStatus);
    const maxRelevantIndex = Math.max(...relevantStatuses.map(s => statusOrder.indexOf(s)));

    if (currentIndex > maxRelevantIndex) {
      return 'completed';
    }

    return 'pending';
  }

  /**
   * Map government status to our status
   */
  private mapGovernmentStatus(govStatus: string): SchemeApplication['status'] {
    const statusMap: Record<string, SchemeApplication['status']> = {
      'pending': 'submitted',
      'in_review': 'under_review',
      'under_review': 'under_review',
      'processing': 'under_review',
      'approved': 'approved',
      'sanctioned': 'approved',
      'rejected': 'rejected',
      'declined': 'rejected',
      'on_hold': 'on_hold',
      'hold': 'on_hold'
    };

    return statusMap[govStatus.toLowerCase()] || 'under_review';
  }

  /**
   * Calculate progress percentage
   */
  private calculateProgress(status: SchemeApplication['status']): number {
    const progressMap: Record<SchemeApplication['status'], number> = {
      'draft': 0,
      'submitted': 25,
      'under_review': 50,
      'on_hold': 50,
      'approved': 100,
      'rejected': 100
    };

    return progressMap[status] || 0;
  }

  /**
   * Get current stage name
   */
  private getCurrentStageName(status: SchemeApplication['status']): string {
    const stageMap: Record<SchemeApplication['status'], string> = {
      'draft': 'Draft',
      'submitted': 'Document Verification',
      'under_review': 'Under Review',
      'on_hold': 'On Hold',
      'approved': 'Approved',
      'rejected': 'Rejected'
    };

    return stageMap[status] || 'Unknown';
  }

  /**
   * Calculate estimated completion date
   */
  private calculateEstimatedCompletion(application: SchemeApplication): Date {
    const submittedDate = application.submittedAt || new Date();
    const estimatedDays = 30; // Default 30 days
    
    return new Date(submittedDate.getTime() + estimatedDays * 24 * 60 * 60 * 1000);
  }

  /**
   * Determine next actions for artisan
   */
  private determineNextActions(application: SchemeApplication): string[] {
    const actions: string[] = [];

    switch (application.status) {
      case 'draft':
        actions.push('Complete and submit your application');
        break;
      case 'submitted':
        actions.push('Wait for document verification');
        actions.push('Check status regularly');
        break;
      case 'under_review':
        actions.push('Application is under review');
        actions.push('Be ready to provide additional information if requested');
        break;
      case 'on_hold':
        actions.push('Contact the assigned officer for more information');
        actions.push('Check if additional documents are required');
        break;
      case 'approved':
        actions.push('Congratulations! Your application has been approved');
        actions.push('Follow the disbursement process');
        break;
      case 'rejected':
        actions.push('Review rejection reasons');
        actions.push('Consider reapplying after addressing issues');
        break;
    }

    return actions;
  }

  /**
   * Get document status for application
   */
  private getDocumentStatus(application: SchemeApplication): {
    required: string[];
    submitted: string[];
    pending: string[];
  } {
    // This would be populated from scheme requirements
    return {
      required: [],
      submitted: application.submittedDocuments || [],
      pending: []
    };
  }

  /**
   * Fetch officer details from government portal
   */
  private async fetchOfficerDetails(
    governmentApplicationId: string,
    officerId: string
  ): Promise<OfficerContact | null> {
    try {
      // This would call the government API to get officer details
      // For now, return null as we don't have actual API integration
      return null;
    } catch (error) {
      console.error('Error fetching officer details:', error);
      return null;
    }
  }

  /**
   * Extract contact information from application notes
   */
  private extractContactFromNotes(application: SchemeApplication): OfficerContact | null {
    if (!application.notes || application.notes.length === 0) {
      return null;
    }

    // Try to extract contact info from notes using regex
    const notes = application.notes.join(' ');
    
    const phoneMatch = notes.match(/(?:phone|contact|mobile)[\s:]+(\+?[\d\s-]{10,15})/i);
    const emailMatch = notes.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const nameMatch = notes.match(/(?:officer|contact person)[\s:]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i);

    if (phoneMatch || emailMatch || nameMatch) {
      return {
        name: nameMatch ? nameMatch[1] : 'Officer',
        designation: 'Application Officer',
        phone: phoneMatch ? phoneMatch[1] : '',
        email: emailMatch ? emailMatch[1] : '',
        office: 'Government Office'
      };
    }

    return null;
  }

  /**
   * Send status change notification
   * Requirement: 3.2 - Send notifications within 15 minutes of status change
   */
  private async sendStatusChangeNotification(
    application: SchemeApplication,
    status: ApplicationStatus
  ): Promise<void> {
    try {
      await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS)
        .add({
          type: 'status_update',
          userId: application.artisanId,
          priority: 'high',
          scheduledFor: new Date(),
          data: {
            applicationId: application.id,
            schemeId: application.schemeId,
            oldStatus: application.status,
            newStatus: status.status,
            currentStage: status.currentStage,
            progress: status.progress
          },
          status: 'pending',
          createdAt: new Date()
        });
    } catch (error) {
      console.error('Error creating status change notification:', error);
      // Don't throw - notification failure shouldn't block sync
    }
  }

  /**
   * Helper methods for data access
   */
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

  private async getArtisanApplications(artisanId: string): Promise<SchemeApplication[]> {
    try {
      const snapshot = await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS)
        .where('artisanId', '==', artisanId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SchemeApplication));
    } catch (error) {
      console.error('Error fetching artisan applications:', error);
      return [];
    }
  }

  private async getScheme(schemeId: string): Promise<any> {
    try {
      const doc = await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.SCHEMES)
        .doc(schemeId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error fetching scheme:', error);
      return null;
    }
  }

  private handleError(error: any, operation: string): Error {
    console.error(`StatusSyncService.${operation} error:`, error);
    
    if (error.message) {
      return new Error(`${operation} failed: ${error.message}`);
    }
    
    return new Error(`${operation} failed: Unknown error`);
  }
}

// Export singleton instance
export const statusSyncService = new StatusSyncService();
