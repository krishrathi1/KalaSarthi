/**
 * Application Tracker Service for AI-Powered Scheme Sahayak v2.0
 * Real-time application status monitoring with government portal integration
 * Requirements: 3.1, 3.3, 3.4, 3.5
 */

import { BaseService } from './base/BaseService';
import { PortalIntegrationService } from './PortalIntegrationService';
import {
  SchemeApplication,
  ApplicationStatus,
  ApplicationTimeline,
  ApplicationStage,
  ApplicationSubmissionResult,
  SyncResult
} from '../../types/scheme-sahayak';

// ============================================================================
// SYNC CONFIGURATION
// ============================================================================

export interface SyncConfig {
  interval: number; // milliseconds
  batchSize: number;
  maxRetries: number;
  enabled: boolean;
}

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  interval: 4 * 60 * 60 * 1000, // 4 hours as per requirement 3.1
  batchSize: 50,
  maxRetries: 3,
  enabled: true
};

// ============================================================================
// APPLICATION TRACKER SERVICE
// ============================================================================

/**
 * Application Tracker Service - Monitors and tracks scheme applications
 */
export class ApplicationTracker extends BaseService {
  private portalIntegration: PortalIntegrationService;
  private syncConfig: SyncConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: Map<string, Date> = new Map();

  constructor(syncConfig: Partial<SyncConfig> = {}) {
    super('ApplicationTracker');
    this.portalIntegration = new PortalIntegrationService();
    this.syncConfig = { ...DEFAULT_SYNC_CONFIG, ...syncConfig };
    
    // Start automatic sync if enabled
    if (this.syncConfig.enabled) {
      this.startAutomaticSync();
    }
  }

  // ============================================================================
  // APPLICATION SUBMISSION
  // ============================================================================

  /**
   * Submit application to government portal
   * Requirement 5.1: Auto-populate from artisan profiles
   */
  async submitApplication(
    application: SchemeApplication
  ): Promise<ApplicationSubmissionResult> {
    return this.handleAsync(async () => {
      this.log('info', 'Submitting application', {
        applicationId: application.id,
        schemeId: application.schemeId
      });

      // Validate application data
      this.validateApplication(application);

      // Submit via portal integration (with automatic fallback)
      const result = await this.portalIntegration.submitApplication(
        application.schemeId,
        application
      );

      // Store submission result
      await this.storeSubmissionResult(application.id, result);

      // Register webhook for real-time updates if available
      if (result.status === 'submitted') {
        try {
          await this.registerApplicationWebhook(
            application.id,
            result.governmentApplicationId!
          );
        } catch (error) {
          this.log('warn', 'Failed to register webhook, will use polling', error);
        }
      }

      return result;
    }, 'Failed to submit application', 'SUBMIT_APPLICATION_FAILED');
  }

  // ============================================================================
  // STATUS TRACKING
  // ============================================================================

  /**
   * Track application status
   * Requirement 3.1: Real-time application tracking
   */
  async trackApplication(applicationId: string): Promise<ApplicationStatus> {
    return this.handleAsync(async () => {
      this.log('info', 'Tracking application', { applicationId });

      // Get application details
      const application = await this.getApplicationDetails(applicationId);
      
      if (!application.governmentApplicationId) {
        throw new Error('Application not yet submitted to government portal');
      }

      // Check status via portal integration
      const status = await this.portalIntegration.checkApplicationStatus(
        application.governmentApplicationId,
        application.schemeId,
        application.submissionMethod
      );

      // Update local database
      await this.updateApplicationStatus(applicationId, status);

      // Send notification if status changed
      if (this.hasStatusChanged(application.status, status.status)) {
        await this.sendStatusChangeNotification(applicationId, status);
      }

      return status;
    }, 'Failed to track application', 'TRACK_APPLICATION_FAILED');
  }

  /**
   * Get application timeline with progress tracking
   * Requirement 3.3: Visual timeline with progress tracking
   */
  async getApplicationTimeline(applicationId: string): Promise<ApplicationTimeline> {
    return this.handleAsync(async () => {
      this.log('info', 'Getting application timeline', { applicationId });

      const application = await this.getApplicationDetails(applicationId);
      const status = await this.trackApplication(applicationId);

      // Generate timeline stages
      const stages = this.generateTimelineStages(application, status);

      // Calculate current stage index
      const currentStageIndex = stages.findIndex(
        stage => stage.status === 'in_progress'
      );

      // Calculate durations
      const estimatedDuration = stages.reduce(
        (sum, stage) => sum + stage.estimatedDuration,
        0
      );

      const actualDuration = application.submittedAt
        ? Math.floor((Date.now() - application.submittedAt.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      return {
        stages,
        currentStageIndex: currentStageIndex >= 0 ? currentStageIndex : 0,
        estimatedDuration,
        actualDuration
      };
    }, 'Failed to get application timeline', 'GET_TIMELINE_FAILED');
  }

  // ============================================================================
  // SYNCHRONIZATION
  // ============================================================================

  /**
   * Sync all applications for an artisan
   * Requirement 3.1: 4-hour sync with government systems
   */
  async syncAllApplications(artisanId: string): Promise<SyncResult> {
    return this.handleAsync(async () => {
      this.log('info', 'Syncing all applications', { artisanId });

      const startTime = Date.now();
      const result: SyncResult = {
        success: true,
        applicationsUpdated: 0,
        errors: [],
        lastSyncTime: new Date(),
        nextSyncTime: new Date(Date.now() + this.syncConfig.interval)
      };

      try {
        // Get all submitted applications for artisan
        const applications = await this.getArtisanApplications(artisanId);
        const submittedApplications = applications.filter(
          app => app.status !== 'draft' && app.governmentApplicationId
        );

        // Sync in batches
        for (let i = 0; i < submittedApplications.length; i += this.syncConfig.batchSize) {
          const batch = submittedApplications.slice(i, i + this.syncConfig.batchSize);
          
          await Promise.all(
            batch.map(async (application) => {
              try {
                await this.trackApplication(application.id);
                result.applicationsUpdated++;
              } catch (error) {
                result.errors.push(
                  `Failed to sync application ${application.id}: ${
                    error instanceof Error ? error.message : 'Unknown error'
                  }`
                );
              }
            })
          );
        }

        // Update last sync time
        this.lastSyncTime.set(artisanId, result.lastSyncTime);

        this.log('info', 'Sync completed', {
          artisanId,
          updated: result.applicationsUpdated,
          errors: result.errors.length,
          duration: Date.now() - startTime
        });

      } catch (error) {
        result.success = false;
        result.errors.push(
          error instanceof Error ? error.message : 'Unknown sync error'
        );
      }

      return result;
    }, 'Failed to sync applications', 'SYNC_APPLICATIONS_FAILED');
  }

  /**
   * Start automatic synchronization
   */
  startAutomaticSync(): void {
    if (this.syncInterval) {
      this.log('warn', 'Automatic sync already running');
      return;
    }

    this.log('info', 'Starting automatic sync', {
      interval: this.syncConfig.interval
    });

    this.syncInterval = setInterval(async () => {
      try {
        await this.performScheduledSync();
      } catch (error) {
        this.log('error', 'Scheduled sync failed', error);
      }
    }, this.syncConfig.interval);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutomaticSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.log('info', 'Automatic sync stopped');
    }
  }

  // ============================================================================
  // WEBHOOK MANAGEMENT
  // ============================================================================

  /**
   * Setup status webhooks for real-time updates
   * Requirement 3.1: Real-time updates via webhooks
   */
  async setupStatusWebhooks(applicationId: string): Promise<void> {
    return this.handleAsync(async () => {
      const application = await this.getApplicationDetails(applicationId);
      
      if (!application.governmentApplicationId) {
        throw new Error('Application not yet submitted');
      }

      await this.registerApplicationWebhook(
        applicationId,
        application.governmentApplicationId
      );

      this.log('info', 'Webhooks setup successfully', { applicationId });
    }, 'Failed to setup webhooks', 'SETUP_WEBHOOKS_FAILED');
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate application before submission
   */
  private validateApplication(application: SchemeApplication): void {
    const required = ['id', 'artisanId', 'schemeId', 'formData'];
    this.validateRequired(application, required);

    if (!application.formData || Object.keys(application.formData).length === 0) {
      throw new Error('Application form data is empty');
    }
  }

  /**
   * Get application details from database
   */
  private async getApplicationDetails(applicationId: string): Promise<SchemeApplication> {
    // In a real implementation, this would fetch from Firestore
    // For now, return mock data
    return {
      id: applicationId,
      artisanId: 'artisan_123',
      schemeId: 'scheme_456',
      status: 'submitted',
      formData: {},
      submittedDocuments: [],
      lastUpdated: new Date(),
      governmentApplicationId: 'GOV_APP_789',
      submissionMethod: 'api' as const
    } as any;
  }

  /**
   * Get all applications for an artisan
   */
  private async getArtisanApplications(artisanId: string): Promise<SchemeApplication[]> {
    // In a real implementation, this would fetch from Firestore
    // For now, return empty array
    return [];
  }

  /**
   * Store submission result
   */
  private async storeSubmissionResult(
    applicationId: string,
    result: ApplicationSubmissionResult
  ): Promise<void> {
    // In a real implementation, this would update Firestore
    this.log('info', 'Storing submission result', { applicationId, result });
  }

  /**
   * Update application status in database
   */
  private async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus
  ): Promise<void> {
    // In a real implementation, this would update Firestore
    this.log('info', 'Updating application status', { applicationId, status: status.status });
  }

  /**
   * Check if status has changed
   */
  private hasStatusChanged(
    oldStatus: string,
    newStatus: string
  ): boolean {
    return oldStatus !== newStatus;
  }

  /**
   * Send status change notification
   * Requirement 3.2: Send notifications within 15 minutes
   */
  private async sendStatusChangeNotification(
    applicationId: string,
    status: ApplicationStatus
  ): Promise<void> {
    // In a real implementation, this would trigger notification service
    this.log('info', 'Sending status change notification', {
      applicationId,
      status: status.status
    });
  }

  /**
   * Register webhook for application updates
   */
  private async registerApplicationWebhook(
    applicationId: string,
    governmentApplicationId: string
  ): Promise<void> {
    try {
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/application-status`;
      
      await this.portalIntegration.registerWebhook(
        'government_portal',
        [
          'application.status_changed',
          'application.approved',
          'application.rejected',
          'document.required'
        ],
        callbackUrl
      );

      this.log('info', 'Webhook registered', { applicationId, governmentApplicationId });
    } catch (error) {
      this.log('warn', 'Failed to register webhook', error);
      throw error;
    }
  }

  /**
   * Generate timeline stages for application
   */
  private generateTimelineStages(
    application: SchemeApplication,
    status: ApplicationStatus
  ): ApplicationStage[] {
    const stages: ApplicationStage[] = [
      {
        name: 'Application Submitted',
        description: 'Your application has been submitted to the government portal',
        status: application.submittedAt ? 'completed' : 'pending',
        startDate: application.submittedAt,
        completionDate: application.submittedAt,
        estimatedDuration: 0,
        requirements: ['Complete application form', 'Submit required documents']
      },
      {
        name: 'Document Verification',
        description: 'Government officials are verifying your submitted documents',
        status: this.getStageStatus(status.status, 'document_verification'),
        estimatedDuration: 7,
        requirements: ['All documents must be valid', 'Documents must be legible']
      },
      {
        name: 'Eligibility Assessment',
        description: 'Your eligibility for the scheme is being assessed',
        status: this.getStageStatus(status.status, 'eligibility'),
        estimatedDuration: 10,
        requirements: ['Meet age criteria', 'Meet income criteria', 'Meet business criteria']
      },
      {
        name: 'Officer Review',
        description: 'A government officer is reviewing your application',
        status: this.getStageStatus(status.status, 'review'),
        estimatedDuration: 7,
        requirements: ['Application completeness', 'Supporting documentation']
      },
      {
        name: 'Final Decision',
        description: 'Final decision on your application',
        status: this.getStageStatus(status.status, 'decision'),
        estimatedDuration: 5,
        requirements: ['All previous stages completed']
      }
    ];

    return stages;
  }

  /**
   * Determine stage status based on application status
   */
  private getStageStatus(
    applicationStatus: string,
    stageName: string
  ): 'completed' | 'in_progress' | 'pending' | 'failed' {
    const statusStageMap: Record<string, string[]> = {
      'submitted': ['document_verification'],
      'under_review': ['document_verification', 'eligibility', 'review'],
      'approved': ['document_verification', 'eligibility', 'review', 'decision'],
      'rejected': ['document_verification', 'eligibility', 'review', 'decision']
    };

    const currentStages = statusStageMap[applicationStatus] || [];
    
    if (applicationStatus === 'rejected' && stageName === 'decision') {
      return 'failed';
    }

    if (currentStages.includes(stageName)) {
      const lastStage = currentStages[currentStages.length - 1];
      return stageName === lastStage ? 'in_progress' : 'completed';
    }

    return 'pending';
  }

  /**
   * Perform scheduled sync for all active applications
   */
  private async performScheduledSync(): Promise<void> {
    this.log('info', 'Performing scheduled sync');

    // In a real implementation, this would:
    // 1. Get all artisans with active applications
    // 2. Sync applications for each artisan
    // 3. Handle errors gracefully
    
    // For now, just log
    this.log('info', 'Scheduled sync completed');
  }

  /**
   * Health check for Application Tracker
   */
  protected async performHealthCheck(): Promise<void> {
    // Check portal integration health
    await this.portalIntegration.performHealthCheck();

    // Check sync status
    if (this.syncConfig.enabled && !this.syncInterval) {
      throw new Error('Automatic sync is enabled but not running');
    }

    this.log('info', 'Application Tracker health check passed');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopAutomaticSync();
    this.log('info', 'Application Tracker cleanup completed');
  }
}

// Export default instance
export default ApplicationTracker;
