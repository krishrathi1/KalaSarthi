/**
 * User Service for AI-Powered Scheme Sahayak v2.0
 * Manages artisan profiles and user data
 */

import { BaseService } from './base/BaseService';
import { FirestoreService, timestampToDate } from '../../firestore';
import {
  schemeSahayakCollections,
  schemeSahayakQueries,
  schemeSahayakDocRefs
} from '../../config/scheme-sahayak-firebase';
import {
  ArtisanProfile,
  NotificationPreferences,
  SCHEME_SAHAYAK_COLLECTIONS,
  SchemeSahayakErrorType
} from '../../types/scheme-sahayak';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';
import { encryptionService } from './EncryptionService';

/**
 * User Service Implementation
 * Note: Some IUserService methods are delegated to PrivacyManagementService
 */
export class UserService extends BaseService {
  constructor() {
    super('UserService');
  }

  /**
   * Create a new artisan profile
   */
  async createArtisanProfile(
    profile: Omit<ArtisanProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    return this.handleAsync(async () => {
      this.validateRequired(profile, ['personalInfo', 'location', 'business', 'preferences']);
      this.validateRequired(profile.personalInfo, ['name', 'phone', 'email']);
      this.validateRequired(profile.location, ['state', 'district', 'pincode']);
      this.validateRequired(profile.business, ['type', 'category']);

      // Check if artisan with this phone already exists
      const existingArtisan = await this.getArtisanByPhone(profile.personalInfo.phone);
      if (existingArtisan) {
        throw new Error('Artisan with this phone number already exists');
      }

      // Generate unique ID
      const artisanId = `artisan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create complete profile
      const completeProfile: ArtisanProfile = {
        ...profile,
        id: artisanId,
        documents: profile.documents || {},
        applicationHistory: profile.applicationHistory || [],
        aiProfile: profile.aiProfile || {
          features: {},
          successProbability: 0.5,
          lastUpdated: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Encrypt sensitive fields before saving
      const encryptedProfile = await encryptionService.encryptFields(completeProfile, [
        'personalInfo.phone',
        'personalInfo.email',
        'personalInfo.aadhaarHash',
        'personalInfo.panNumber',
        'location.address',
        'business.monthlyIncome'
      ]);

      // Save to Firestore
      const docRef = schemeSahayakDocRefs.artisan(artisanId);
      await setDoc(docRef, {
        ...encryptedProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create default user preferences
      await this.createDefaultUserPreferences(artisanId);

      this.log('info', `Created new artisan profile: ${artisanId}`);
      return artisanId;
    }, 'Failed to create artisan profile', 'CREATE_PROFILE_FAILED');
  }

  /**
   * Get artisan profile by ID
   */
  async getArtisanProfile(artisanId: string): Promise<ArtisanProfile | null> {
    return this.handleAsync(async () => {
      this.validateArtisanId(artisanId);

      const docRef = schemeSahayakDocRefs.artisan(artisanId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      
      // Decrypt sensitive fields
      const decryptedData = await encryptionService.decryptFields(data);
      
      return {
        ...decryptedData,
        id: docSnap.id,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        aiProfile: {
          ...decryptedData.aiProfile,
          lastUpdated: timestampToDate(data.aiProfile?.lastUpdated)
        }
      } as ArtisanProfile;
    }, 'Failed to get artisan profile', 'GET_PROFILE_FAILED');
  }

  /**
   * Update artisan profile
   */
  async updateArtisanProfile(
    artisanId: string,
    updates: Partial<ArtisanProfile>
  ): Promise<void> {
    return this.handleAsync(async () => {
      this.validateArtisanId(artisanId);

      // Remove fields that shouldn't be updated directly
      const { id, createdAt, ...allowedUpdates } = updates;

      // Encrypt sensitive fields in updates
      const encryptedUpdates = await encryptionService.encryptFields(allowedUpdates, [
        'personalInfo.phone',
        'personalInfo.email',
        'personalInfo.aadhaarHash',
        'personalInfo.panNumber',
        'location.address',
        'business.monthlyIncome'
      ]);

      const docRef = schemeSahayakDocRefs.artisan(artisanId);
      await updateDoc(docRef, {
        ...encryptedUpdates,
        updatedAt: serverTimestamp()
      });

      this.log('info', `Updated artisan profile: ${artisanId}`);
    }, 'Failed to update artisan profile', 'UPDATE_PROFILE_FAILED');
  }

  /**
   * Delete artisan profile and all associated data
   */
  async deleteArtisanProfile(artisanId: string): Promise<void> {
    return this.handleAsync(async () => {
      this.validateArtisanId(artisanId);

      const batch = writeBatch(db);

      // Delete main profile
      const profileRef = schemeSahayakDocRefs.artisan(artisanId);
      batch.delete(profileRef);

      // Delete user preferences
      const preferencesRef = schemeSahayakDocRefs.userPreferences(artisanId);
      batch.delete(preferencesRef);

      // Note: In a production system, you might want to:
      // 1. Archive data instead of deleting
      // 2. Delete related documents (applications, recommendations, etc.)
      // 3. Handle this as a background job for large datasets

      await batch.commit();

      this.log('info', `Deleted artisan profile: ${artisanId}`);
    }, 'Failed to delete artisan profile', 'DELETE_PROFILE_FAILED');
  }

  /**
   * Get artisan by phone number
   */
  async getArtisanByPhone(phone: string): Promise<ArtisanProfile | null> {
    return this.handleAsync(async () => {
      if (!phone || typeof phone !== 'string') {
        throw new Error('Invalid phone number provided');
      }

      const q = schemeSahayakQueries.getArtisanByPhone(phone);
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      // Decrypt sensitive fields
      const decryptedData = await encryptionService.decryptFields(data);

      return {
        ...decryptedData,
        id: doc.id,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        aiProfile: {
          ...decryptedData.aiProfile,
          lastUpdated: timestampToDate(data.aiProfile?.lastUpdated)
        }
      } as ArtisanProfile;
    }, 'Failed to get artisan by phone', 'GET_ARTISAN_BY_PHONE_FAILED');
  }

  /**
   * Update AI profile features
   */
  async updateAIProfile(
    artisanId: string,
    features: Record<string, number>,
    successProbability: number
  ): Promise<void> {
    return this.handleAsync(async () => {
      this.validateArtisanId(artisanId);

      if (successProbability < 0 || successProbability > 1) {
        throw new Error('Success probability must be between 0 and 1');
      }

      const docRef = schemeSahayakDocRefs.artisan(artisanId);
      await updateDoc(docRef, {
        'aiProfile.features': features,
        'aiProfile.successProbability': successProbability,
        'aiProfile.lastUpdated': serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      this.log('info', `Updated AI profile for artisan: ${artisanId}`);
    }, 'Failed to update AI profile', 'UPDATE_AI_PROFILE_FAILED');
  }

  /**
   * Get artisans by location
   */
  async getArtisansByLocation(
    state: string,
    district?: string
  ): Promise<ArtisanProfile[]> {
    return this.handleAsync(async () => {
      if (!state || typeof state !== 'string') {
        throw new Error('Invalid state provided');
      }

      const q = schemeSahayakQueries.getArtisansByLocation(state, district);
      const querySnapshot = await getDocs(q);

      const profiles = await Promise.all(
        querySnapshot.docs.map(async doc => {
          const data = doc.data();
          
          // Decrypt sensitive fields
          const decryptedData = await encryptionService.decryptFields(data);
          
          return {
            ...decryptedData,
            id: doc.id,
            createdAt: timestampToDate(data.createdAt),
            updatedAt: timestampToDate(data.updatedAt),
            aiProfile: {
              ...decryptedData.aiProfile,
              lastUpdated: timestampToDate(data.aiProfile?.lastUpdated)
            }
          } as ArtisanProfile;
        })
      );

      return profiles;
    }, 'Failed to get artisans by location', 'GET_ARTISANS_BY_LOCATION_FAILED');
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(artisanId: string): Promise<NotificationPreferences> {
    return this.handleAsync(async () => {
      this.validateArtisanId(artisanId);

      const docRef = schemeSahayakDocRefs.userPreferences(artisanId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Return default preferences if none exist
        return this.getDefaultUserPreferences();
      }

      return docSnap.data() as NotificationPreferences;
    }, 'Failed to get user preferences', 'GET_PREFERENCES_FAILED');
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    artisanId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    return this.handleAsync(async () => {
      this.validateArtisanId(artisanId);

      const docRef = schemeSahayakDocRefs.userPreferences(artisanId);
      await updateDoc(docRef, {
        ...preferences,
        updatedAt: serverTimestamp()
      });

      this.log('info', `Updated user preferences for artisan: ${artisanId}`);
    }, 'Failed to update user preferences', 'UPDATE_PREFERENCES_FAILED');
  }

  /**
   * Create default user preferences
   */
  private async createDefaultUserPreferences(artisanId: string): Promise<void> {
    const defaultPreferences = this.getDefaultUserPreferences();

    const docRef = schemeSahayakDocRefs.userPreferences(artisanId);
    await setDoc(docRef, {
      ...defaultPreferences,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Get default user preferences
   */
  private getDefaultUserPreferences(): NotificationPreferences {
    return {
      channels: {
        sms: true,
        email: true,
        push: true,
        whatsapp: false
      },
      timing: {
        preferredHours: [9, 18], // 9 AM to 6 PM
        timezone: 'Asia/Kolkata',
        frequency: 'immediate'
      },
      types: {
        newSchemes: true,
        deadlineReminders: true,
        statusUpdates: true,
        documentRequests: true,
        rejectionNotices: true
      }
    };
  }

  /**
   * Health check for User Service
   */
  protected async performHealthCheck(): Promise<void> {
    // Test basic Firestore connectivity
    const testDocRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.ARTISANS, 'health-check');
    await getDoc(testDocRef);
  }

  /**
   * Get service-specific metrics
   */
  async getServiceMetrics(): Promise<{
    totalArtisans: number;
    newArtisansToday: number;
    activeArtisans: number;
    averageProfileCompleteness: number;
  }> {
    return this.handleAsync(async () => {
      // This would typically involve aggregation queries
      // For now, returning placeholder values
      return {
        totalArtisans: 0,
        newArtisansToday: 0,
        activeArtisans: 0,
        averageProfileCompleteness: 0
      };
    }, 'Failed to get service metrics', 'GET_METRICS_FAILED');
  }
}