/**
 * User Preference Service
 * Manages notification preferences, opt-in/opt-out tracking, and compliance features
 */

import { FirestoreService } from '../FirestoreService';
import { NotificationPreferences } from '../../types/scheme-sahayak';
import { getGupshupLogger } from './GupshupLogger';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';

export interface UserPreferenceRecord {
  userId: string;
  preferences: NotificationPreferences;
  consentHistory: ConsentRecord[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface ConsentRecord {
  action: 'opt_in' | 'opt_out' | 'preference_update';
  timestamp: Date;
  channel?: 'whatsapp' | 'sms' | 'email' | 'push';
  notificationType?: string;
  ipAddress?: string;
  userAgent?: string;
  source: 'web' | 'mobile' | 'api' | 'admin';
  details?: Record<string, any>;
}

export interface OptOutRequest {
  userId: string;
  channel?: 'whatsapp' | 'sms' | 'email' | 'push' | 'all';
  notificationType?: string;
  reason?: string;
  source: 'web' | 'mobile' | 'sms_reply' | 'whatsapp_reply' | 'api';
  metadata?: Record<string, any>;
}

export interface PreferenceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PreferenceUpdateRequest {
  userId: string;
  preferences: Partial<NotificationPreferences>;
  source: 'web' | 'mobile' | 'api' | 'admin';
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Default notification preferences for new users
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channels: {
    sms: true,
    email: false,
    push: false,
    whatsapp: true,
  },
  timing: {
    preferredHours: [9, 18], // 9 AM to 6 PM
    timezone: 'Asia/Kolkata',
    frequency: 'immediate',
  },
  types: {
    newSchemes: true,
    deadlineReminders: true,
    statusUpdates: true,
    documentRequests: true,
    rejectionNotices: true,
  },
};

/**
 * User Preference Service Implementation
 */
export class UserPreferenceService {
  private firestoreService: FirestoreService;
  private logger: ReturnType<typeof getGupshupLogger>;
  private readonly COLLECTION_NAME = 'notification_preferences';

  constructor(firestoreService?: FirestoreService) {
    this.firestoreService = firestoreService || new FirestoreService();
    this.logger = getGupshupLogger();
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserPreferenceRecord;
        
        // Convert Firestore timestamps to Date objects
        const preferences = this.convertTimestamps(data.preferences);
        
        this.logger.debug('preferences_retrieved', 'Retrieved user preferences', {
          userId,
          hasPreferences: true,
          version: data.version,
        });

        return preferences;
      } else {
        // Return default preferences for new users
        this.logger.debug('preferences_default', 'Using default preferences for new user', {
          userId,
        });

        return { ...DEFAULT_NOTIFICATION_PREFERENCES };
      }
    } catch (error) {
      this.logger.error('preferences_get_failed', 'Failed to get user preferences', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return default preferences on error
      return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(request: PreferenceUpdateRequest): Promise<boolean> {
    try {
      // Validate preferences
      const validation = this.validatePreferences(request.preferences);
      if (!validation.isValid) {
        this.logger.warn('preferences_validation_failed', 'Preference validation failed', {
          userId: request.userId,
          errors: validation.errors,
        });
        throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
      }

      // Get current preferences
      const currentPreferences = await this.getUserPreferences(request.userId);
      
      // Merge with updates
      const updatedPreferences = this.mergePreferences(currentPreferences, request.preferences);

      // Create consent record
      const consentRecord: ConsentRecord = {
        action: 'preference_update',
        timestamp: new Date(),
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        source: request.source,
        details: {
          updatedFields: Object.keys(request.preferences),
          previousPreferences: currentPreferences,
          newPreferences: updatedPreferences,
        },
      };

      // Get current record or create new one
      const docRef = doc(db, this.COLLECTION_NAME, request.userId);
      const docSnap = await getDoc(docRef);
      
      let currentRecord: UserPreferenceRecord;
      
      if (docSnap.exists()) {
        currentRecord = docSnap.data() as UserPreferenceRecord;
      } else {
        currentRecord = {
          userId: request.userId,
          preferences: DEFAULT_NOTIFICATION_PREFERENCES,
          consentHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 0,
        };
      }

      // Update record
      const updatedRecord: UserPreferenceRecord = {
        ...currentRecord,
        preferences: updatedPreferences,
        consentHistory: [...currentRecord.consentHistory, consentRecord],
        updatedAt: new Date(),
        version: currentRecord.version + 1,
      };

      // Save to Firestore
      await setDoc(docRef, {
        ...updatedRecord,
        createdAt: currentRecord.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        consentHistory: updatedRecord.consentHistory.map(record => ({
          ...record,
          timestamp: record.timestamp instanceof Date ? Timestamp.fromDate(record.timestamp) : record.timestamp,
        })),
      });

      this.logger.info('preferences_updated', 'User preferences updated successfully', {
        userId: request.userId,
        version: updatedRecord.version,
        source: request.source,
        updatedFields: Object.keys(request.preferences),
      });

      return true;

    } catch (error) {
      this.logger.error('preferences_update_failed', 'Failed to update user preferences', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  /**
   * Handle opt-out request
   */
  async handleOptOut(request: OptOutRequest): Promise<boolean> {
    try {
      const currentPreferences = await this.getUserPreferences(request.userId);
      let updatedPreferences = { ...currentPreferences };

      // Apply opt-out based on request
      if (request.channel === 'all') {
        // Opt out of all channels
        updatedPreferences.channels = {
          sms: false,
          email: false,
          push: false,
          whatsapp: false,
        };
      } else if (request.channel) {
        // Opt out of specific channel
        updatedPreferences.channels[request.channel] = false;
      }

      // If notification type is specified, disable that type
      if (request.notificationType && request.notificationType in updatedPreferences.types) {
        (updatedPreferences.types as any)[request.notificationType] = false;
      }

      // Create consent record
      const consentRecord: ConsentRecord = {
        action: 'opt_out',
        timestamp: new Date(),
        channel: request.channel,
        notificationType: request.notificationType,
        source: request.source,
        details: {
          reason: request.reason,
          metadata: request.metadata,
        },
      };

      // Update preferences
      const updateRequest: PreferenceUpdateRequest = {
        userId: request.userId,
        preferences: updatedPreferences,
        source: request.source,
      };

      const success = await this.updateUserPreferences(updateRequest);

      if (success) {
        this.logger.info('opt_out_processed', 'Opt-out request processed successfully', {
          userId: request.userId,
          channel: request.channel,
          notificationType: request.notificationType,
          source: request.source,
          reason: request.reason,
        });
      }

      return success;

    } catch (error) {
      this.logger.error('opt_out_failed', 'Failed to process opt-out request', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  /**
   * Handle opt-in request
   */
  async handleOptIn(
    userId: string,
    channel: 'whatsapp' | 'sms' | 'email' | 'push',
    source: 'web' | 'mobile' | 'api' | 'admin',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const currentPreferences = await this.getUserPreferences(userId);
      
      // Enable the specified channel
      const updatedPreferences = {
        ...currentPreferences,
        channels: {
          ...currentPreferences.channels,
          [channel]: true,
        },
      };

      // Create consent record
      const consentRecord: ConsentRecord = {
        action: 'opt_in',
        timestamp: new Date(),
        channel,
        source,
        details: {
          metadata,
        },
      };

      // Update preferences
      const updateRequest: PreferenceUpdateRequest = {
        userId,
        preferences: updatedPreferences,
        source,
      };

      const success = await this.updateUserPreferences(updateRequest);

      if (success) {
        this.logger.info('opt_in_processed', 'Opt-in request processed successfully', {
          userId,
          channel,
          source,
        });
      }

      return success;

    } catch (error) {
      this.logger.error('opt_in_failed', 'Failed to process opt-in request', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  /**
   * Check if user has opted in for specific channel and notification type
   */
  async isOptedIn(
    userId: string,
    channel: 'whatsapp' | 'sms' | 'email' | 'push',
    notificationType?: keyof NotificationPreferences['types']
  ): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);

      // Check channel preference
      if (!preferences.channels[channel]) {
        return false;
      }

      // Check notification type preference if specified
      if (notificationType && !preferences.types[notificationType]) {
        return false;
      }

      return true;

    } catch (error) {
      this.logger.error('opt_in_check_failed', 'Failed to check opt-in status', {
        userId,
        channel,
        notificationType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Default to false on error for compliance
      return false;
    }
  }

  /**
   * Get consent history for a user
   */
  async getConsentHistory(userId: string): Promise<ConsentRecord[]> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserPreferenceRecord;
        
        // Convert Firestore timestamps to Date objects
        return data.consentHistory.map(record => ({
          ...record,
          timestamp: record.timestamp instanceof Timestamp ? 
            record.timestamp.toDate() : 
            new Date(record.timestamp),
        }));
      }

      return [];

    } catch (error) {
      this.logger.error('consent_history_failed', 'Failed to get consent history', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return [];
    }
  }

  /**
   * Create default preferences for a new user
   */
  async createDefaultPreferences(
    userId: string,
    source: 'web' | 'mobile' | 'api' | 'admin' = 'api'
  ): Promise<boolean> {
    try {
      // Check if preferences already exist
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.logger.debug('preferences_already_exist', 'Preferences already exist for user', {
          userId,
        });
        return true;
      }

      // Create consent record for initial opt-in
      const consentRecord: ConsentRecord = {
        action: 'opt_in',
        timestamp: new Date(),
        source,
        details: {
          reason: 'Initial user registration',
          defaultPreferences: true,
        },
      };

      // Create new preference record
      const newRecord: UserPreferenceRecord = {
        userId,
        preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
        consentHistory: [consentRecord],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      // Save to Firestore
      await setDoc(docRef, {
        ...newRecord,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        consentHistory: newRecord.consentHistory.map(record => ({
          ...record,
          timestamp: Timestamp.fromDate(record.timestamp),
        })),
      });

      this.logger.info('preferences_created', 'Default preferences created for new user', {
        userId,
        source,
      });

      return true;

    } catch (error) {
      this.logger.error('preferences_create_failed', 'Failed to create default preferences', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  /**
   * Delete user preferences (for GDPR compliance)
   */
  async deleteUserPreferences(userId: string, reason?: string): Promise<boolean> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      await deleteDoc(docRef);

      this.logger.info('preferences_deleted', 'User preferences deleted', {
        userId,
        reason,
      });

      return true;

    } catch (error) {
      this.logger.error('preferences_delete_failed', 'Failed to delete user preferences', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  /**
   * Validate notification preferences
   */
  private validatePreferences(preferences: Partial<NotificationPreferences>): PreferenceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate channels
    if (preferences.channels) {
      const channels = preferences.channels;
      
      // At least one channel should be enabled for notifications to work
      const hasEnabledChannel = Object.values(channels).some(enabled => enabled);
      if (!hasEnabledChannel) {
        warnings.push('No notification channels are enabled. User will not receive any notifications.');
      }
    }

    // Validate timing
    if (preferences.timing) {
      const timing = preferences.timing;
      
      if (timing.preferredHours) {
        const [start, end] = timing.preferredHours;
        
        if (start < 0 || start > 23 || end < 0 || end > 23) {
          errors.push('Preferred hours must be between 0 and 23');
        }
        
        if (start >= end) {
          errors.push('Start hour must be less than end hour');
        }
      }
      
      if (timing.frequency && !['immediate', 'daily', 'weekly'].includes(timing.frequency)) {
        errors.push('Frequency must be one of: immediate, daily, weekly');
      }
    }

    // Validate types
    if (preferences.types) {
      const types = preferences.types;
      
      // Check if all notification types are disabled
      const hasEnabledType = Object.values(types).some(enabled => enabled);
      if (!hasEnabledType) {
        warnings.push('All notification types are disabled. User will not receive any notifications.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Merge current preferences with updates
   */
  private mergePreferences(
    current: NotificationPreferences,
    updates: Partial<NotificationPreferences>
  ): NotificationPreferences {
    return {
      channels: {
        ...current.channels,
        ...updates.channels,
      },
      timing: {
        ...current.timing,
        ...updates.timing,
      },
      types: {
        ...current.types,
        ...updates.types,
      },
    };
  }

  /**
   * Convert Firestore timestamps to Date objects
   */
  private convertTimestamps(preferences: any): NotificationPreferences {
    // Handle any timestamp conversion if needed
    return preferences as NotificationPreferences;
  }
}

/**
 * Singleton instance for global use
 */
let userPreferenceServiceInstance: UserPreferenceService | null = null;

export function getUserPreferenceService(): UserPreferenceService {
  if (!userPreferenceServiceInstance) {
    userPreferenceServiceInstance = new UserPreferenceService();
  }
  return userPreferenceServiceInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearUserPreferenceServiceInstance(): void {
  userPreferenceServiceInstance = null;
}