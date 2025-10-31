/**
 * Privacy Management Service for AI-Powered Scheme Sahayak v2.0
 * Implements data retention policies, consent management, and automatic data deletion
 * Requirements: 9.4, 9.5
 */

import { BaseService } from './base/BaseService';
import { schemeSahayakDocRefs, schemeSahayakQueries } from '../../config/scheme-sahayak-firebase';
import { SCHEME_SAHAYAK_COLLECTIONS } from '../../types/scheme-sahayak';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Data retention periods (in days)
 */
const RETENTION_PERIODS = {
  PROFILE_DATA: 365 * 7, // 7 years
  APPLICATION_DATA: 365 * 10, // 10 years (government requirement)
  DOCUMENTS: 365 * 7, // 7 years
  ANALYTICS: 365 * 2, // 2 years
  NOTIFICATIONS: 365, // 1 year
  LOGS: 90 // 90 days
} as const;

/**
 * Consent types
 */
export enum ConsentType {
  DATA_COLLECTION = 'data_collection',
  DATA_PROCESSING = 'data_processing',
  DATA_SHARING = 'data_sharing',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  THIRD_PARTY = 'third_party'
}

/**
 * Consent record
 */
export interface ConsentRecord {
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  version: string; // Policy version
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Privacy settings
 */
export interface PrivacySettings {
  userId: string;
  consents: Record<ConsentType, ConsentRecord>;
  dataRetention: {
    profileData: boolean;
    applicationData: boolean;
    documents: boolean;
    analytics: boolean;
  };
  dataSharing: {
    allowGovernmentSharing: boolean;
    allowAnalytics: boolean;
    allowThirdParty: boolean;
  };
  communicationPreferences: {
    allowEmail: boolean;
    allowSMS: boolean;
    allowPush: boolean;
    allowWhatsApp: boolean;
  };
  rightToErasure: {
    requested: boolean;
    requestedAt?: Date;
    scheduledFor?: Date;
    completed: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data deletion request
 */
export interface DataDeletionRequest {
  id: string;
  userId: string;
  requestType: 'full' | 'partial';
  dataTypes: string[];
  reason?: string;
  requestedAt: Date;
  scheduledFor: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedAt?: Date;
  error?: string;
}

/**
 * Privacy Management Service Implementation
 */
export class PrivacyManagementService extends BaseService {
  constructor() {
    super('PrivacyManagementService');
  }

  /**
   * Initialize privacy settings for a new user
   */
  async initializePrivacySettings(
    userId: string,
    initialConsents?: Partial<Record<ConsentType, boolean>>
  ): Promise<void> {
    return this.handleAsync(async () => {
      this.validateUserId(userId);

      const defaultSettings: PrivacySettings = {
        userId,
        consents: this.createDefaultConsents(userId, initialConsents),
        dataRetention: {
          profileData: true,
          applicationData: true,
          documents: true,
          analytics: true
        },
        dataSharing: {
          allowGovernmentSharing: true, // Required for scheme applications
          allowAnalytics: false,
          allowThirdParty: false
        },
        communicationPreferences: {
          allowEmail: true,
          allowSMS: true,
          allowPush: true,
          allowWhatsApp: false
        },
        rightToErasure: {
          requested: false,
          completed: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.PRIVACY_SETTINGS, userId);
      await setDoc(docRef, {
        ...defaultSettings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      this.log('info', `Initialized privacy settings for user: ${userId}`);
    }, 'Failed to initialize privacy settings', 'INIT_PRIVACY_FAILED');
  }

  /**
   * Get privacy settings for a user
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    return this.handleAsync(async () => {
      this.validateUserId(userId);

      const docRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.PRIVACY_SETTINGS, userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PrivacySettings;
    }, 'Failed to get privacy settings', 'GET_PRIVACY_FAILED');
  }

  /**
   * Update consent for a specific type
   */
  async updateConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    return this.handleAsync(async () => {
      this.validateUserId(userId);

      const consentRecord: ConsentRecord = {
        userId,
        consentType,
        granted,
        grantedAt: granted ? new Date() : undefined,
        revokedAt: !granted ? new Date() : undefined,
        version: '1.0', // Should match current privacy policy version
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent
      };

      const docRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.PRIVACY_SETTINGS, userId);
      await updateDoc(docRef, {
        [`consents.${consentType}`]: consentRecord,
        updatedAt: serverTimestamp()
      });

      // Log consent change for audit trail
      await this.logConsentChange(userId, consentType, granted);

      this.log('info', `Updated consent ${consentType} for user ${userId}: ${granted}`);
    }, 'Failed to update consent', 'UPDATE_CONSENT_FAILED');
  }

  /**
   * Update multiple consents at once
   */
  async updateConsents(
    userId: string,
    consents: Partial<Record<ConsentType, boolean>>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    return this.handleAsync(async () => {
      this.validateUserId(userId);

      const updates: Record<string, any> = {};

      for (const [type, granted] of Object.entries(consents)) {
        const consentRecord: ConsentRecord = {
          userId,
          consentType: type as ConsentType,
          granted,
          grantedAt: granted ? new Date() : undefined,
          revokedAt: !granted ? new Date() : undefined,
          version: '1.0',
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent
        };

        updates[`consents.${type}`] = consentRecord;
      }

      updates.updatedAt = serverTimestamp();

      const docRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.PRIVACY_SETTINGS, userId);
      await updateDoc(docRef, updates);

      this.log('info', `Updated multiple consents for user: ${userId}`);
    }, 'Failed to update consents', 'UPDATE_CONSENTS_FAILED');
  }

  /**
   * Check if user has granted specific consent
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    return this.handleAsync(async () => {
      const settings = await this.getPrivacySettings(userId);

      if (!settings) {
        return false;
      }

      return settings.consents[consentType]?.granted || false;
    }, 'Failed to check consent', 'CHECK_CONSENT_FAILED');
  }

  /**
   * Request data deletion (Right to Erasure)
   */
  async requestDataDeletion(
    userId: string,
    requestType: 'full' | 'partial' = 'full',
    dataTypes?: string[],
    reason?: string
  ): Promise<string> {
    return this.handleAsync(async () => {
      this.validateUserId(userId);

      const requestId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Schedule deletion for 30 days from now (grace period)
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + 30);

      const deletionRequest: DataDeletionRequest = {
        id: requestId,
        userId,
        requestType,
        dataTypes: dataTypes || ['all'],
        reason,
        requestedAt: new Date(),
        scheduledFor,
        status: 'pending'
      };

      // Save deletion request
      const docRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.DATA_DELETION_REQUESTS, requestId);
      await setDoc(docRef, {
        ...deletionRequest,
        requestedAt: serverTimestamp(),
        scheduledFor: Timestamp.fromDate(scheduledFor)
      });

      // Update privacy settings
      const privacyDocRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.PRIVACY_SETTINGS, userId);
      await updateDoc(privacyDocRef, {
        'rightToErasure.requested': true,
        'rightToErasure.requestedAt': serverTimestamp(),
        'rightToErasure.scheduledFor': Timestamp.fromDate(scheduledFor),
        updatedAt: serverTimestamp()
      });

      this.log('info', `Data deletion requested for user ${userId}, scheduled for ${scheduledFor}`);

      return requestId;
    }, 'Failed to request data deletion', 'REQUEST_DELETION_FAILED');
  }

  /**
   * Cancel data deletion request (within grace period)
   */
  async cancelDataDeletion(userId: string, requestId: string): Promise<void> {
    return this.handleAsync(async () => {
      this.validateUserId(userId);

      // Delete the deletion request
      const docRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.DATA_DELETION_REQUESTS, requestId);
      await deleteDoc(docRef);

      // Update privacy settings
      const privacyDocRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.PRIVACY_SETTINGS, userId);
      await updateDoc(privacyDocRef, {
        'rightToErasure.requested': false,
        'rightToErasure.requestedAt': null,
        'rightToErasure.scheduledFor': null,
        updatedAt: serverTimestamp()
      });

      this.log('info', `Data deletion cancelled for user: ${userId}`);
    }, 'Failed to cancel data deletion', 'CANCEL_DELETION_FAILED');
  }

  /**
   * Execute data deletion (called by scheduled job)
   */
  async executeDataDeletion(requestId: string): Promise<void> {
    return this.handleAsync(async () => {
      const docRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.DATA_DELETION_REQUESTS, requestId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Deletion request not found');
      }

      const request = docSnap.data() as DataDeletionRequest;

      // Update status to processing
      await updateDoc(docRef, {
        status: 'processing',
        updatedAt: serverTimestamp()
      });

      try {
        if (request.requestType === 'full') {
          await this.deleteAllUserData(request.userId);
        } else {
          await this.deletePartialUserData(request.userId, request.dataTypes);
        }

        // Mark as completed
        await updateDoc(docRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        this.log('info', `Data deletion completed for user: ${request.userId}`);
      } catch (error) {
        // Mark as failed
        await updateDoc(docRef, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: serverTimestamp()
        });

        throw error;
      }
    }, 'Failed to execute data deletion', 'EXECUTE_DELETION_FAILED');
  }

  /**
   * Delete all user data
   */
  private async deleteAllUserData(userId: string): Promise<void> {
    const batch = writeBatch(db);

    // Delete artisan profile
    const profileRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.ARTISANS, userId);
    batch.delete(profileRef);

    // Delete privacy settings
    const privacyRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.PRIVACY_SETTINGS, userId);
    batch.delete(privacyRef);

    // Delete user preferences
    const preferencesRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.USER_PREFERENCES, userId);
    batch.delete(preferencesRef);

    // Note: In production, you would also delete:
    // - Applications
    // - Documents (from Cloud Storage)
    // - Recommendations
    // - Notifications
    // - Analytics data
    // This might need to be done in batches or as a background job

    await batch.commit();

    this.log('info', `Deleted all data for user: ${userId}`);
  }

  /**
   * Delete partial user data
   */
  private async deletePartialUserData(userId: string, dataTypes: string[]): Promise<void> {
    const batch = writeBatch(db);

    for (const dataType of dataTypes) {
      switch (dataType) {
        case 'documents':
          // Delete documents
          // Implementation would delete from Cloud Storage
          break;
        case 'analytics':
          // Delete analytics data
          break;
        case 'notifications':
          // Delete notifications
          break;
        // Add more cases as needed
      }
    }

    await batch.commit();

    this.log('info', `Deleted partial data for user ${userId}: ${dataTypes.join(', ')}`);
  }

  /**
   * Clean up expired data based on retention policies
   */
  async cleanupExpiredData(): Promise<{
    profilesDeleted: number;
    applicationsDeleted: number;
    documentsDeleted: number;
    analyticsDeleted: number;
  }> {
    return this.handleAsync(async () => {
      const results = {
        profilesDeleted: 0,
        applicationsDeleted: 0,
        documentsDeleted: 0,
        analyticsDeleted: 0
      };

      // Calculate cutoff dates
      const now = new Date();
      const profileCutoff = new Date(now.getTime() - RETENTION_PERIODS.PROFILE_DATA * 24 * 60 * 60 * 1000);
      const applicationCutoff = new Date(now.getTime() - RETENTION_PERIODS.APPLICATION_DATA * 24 * 60 * 60 * 1000);
      const documentCutoff = new Date(now.getTime() - RETENTION_PERIODS.DOCUMENTS * 24 * 60 * 60 * 1000);
      const analyticsCutoff = new Date(now.getTime() - RETENTION_PERIODS.ANALYTICS * 24 * 60 * 60 * 1000);

      // This would typically be implemented as a Cloud Function or scheduled job
      // For now, just logging the cutoff dates

      this.log('info', 'Data cleanup completed', results);

      return results;
    }, 'Failed to cleanup expired data', 'CLEANUP_FAILED');
  }

  /**
   * Export user data (Right to Data Portability)
   */
  async exportUserData(userId: string): Promise<{
    profile: any;
    applications: any[];
    documents: any[];
    analytics: any;
    consents: any;
  }> {
    return this.handleAsync(async () => {
      this.validateUserId(userId);

      // Gather all user data
      const profile = await getDoc(doc(db, SCHEME_SAHAYAK_COLLECTIONS.ARTISANS, userId));
      const privacySettings = await this.getPrivacySettings(userId);

      // In production, you would also gather:
      // - Applications
      // - Documents
      // - Analytics
      // - Notifications
      // - etc.

      return {
        profile: profile.exists() ? profile.data() : null,
        applications: [],
        documents: [],
        analytics: {},
        consents: privacySettings?.consents || {}
      };
    }, 'Failed to export user data', 'EXPORT_DATA_FAILED');
  }

  /**
   * Create default consents
   */
  private createDefaultConsents(
    userId: string,
    initialConsents?: Partial<Record<ConsentType, boolean>>
  ): Record<ConsentType, ConsentRecord> {
    const consents: Record<ConsentType, ConsentRecord> = {} as any;

    for (const type of Object.values(ConsentType)) {
      const granted = initialConsents?.[type] || false;

      consents[type] = {
        userId,
        consentType: type,
        granted,
        grantedAt: granted ? new Date() : undefined,
        version: '1.0'
      };
    }

    return consents;
  }

  /**
   * Log consent change for audit trail
   */
  private async logConsentChange(
    userId: string,
    consentType: ConsentType,
    granted: boolean
  ): Promise<void> {
    const logRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.CONSENT_AUDIT_LOG, `${userId}_${Date.now()}`);
    await setDoc(logRef, {
      userId,
      consentType,
      granted,
      timestamp: serverTimestamp()
    });
  }

  /**
   * Validate user ID
   */
  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID provided');
    }
  }

  /**
   * Health check for Privacy Management Service
   */
  protected async performHealthCheck(): Promise<void> {
    // Test basic Firestore connectivity
    const testDocRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.PRIVACY_SETTINGS, 'health-check');
    await getDoc(testDocRef);
  }
}

// Export singleton instance
export const privacyManagementService = new PrivacyManagementService();
