import { Firestore, Timestamp, FieldValue } from '@google-cloud/firestore';

export interface CachedTrendResult {
  id: string;
  artisanProfession: string;
  query: string;
  trends: any[];
  analysis: string;
  recommendations: string[];
  dataSources: string[];
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
}

export interface ArtisanProfile {
  uid: string;
  artisticProfession: string;
  preferences: {
    geo: string;
    categories: string[];
    priceRange: {
      min: number;
      max: number;
    };
  };
  lastQueryAt: Date;
  queryCount: number;
}

export class FirestoreService {
  private firestore: Firestore;
  private collectionName = 'trend_cache';
  private artisanCollection = 'artisan_profiles';

  constructor() {
    this.firestore = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0314311341',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json'
    });
  }

  /**
   * Cache trend analysis result
   */
  async cacheTrendResult(result: Omit<CachedTrendResult, 'id' | 'createdAt' | 'expiresAt' | 'hitCount'>): Promise<string> {
    const id = this.generateCacheKey(result.artisanProfession, result.query);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const cacheData: CachedTrendResult = {
      ...result,
      id,
      createdAt: now,
      expiresAt,
      hitCount: 0
    };

    const docRef = this.firestore.collection(this.collectionName).doc(id);
    await docRef.set({
      ...cacheData,
      createdAt: Timestamp.fromDate(cacheData.createdAt),
      expiresAt: Timestamp.fromDate(cacheData.expiresAt)
    });

    return id;
  }

  /**
   * Get cached trend result
   */
  async getCachedTrendResult(artisanProfession: string, query: string): Promise<CachedTrendResult | null> {
    const id = this.generateCacheKey(artisanProfession, query);
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) return null;

    // Check if cache is expired
    const expiresAt = data.expiresAt.toDate();
    if (expiresAt < new Date()) {
      // Clean up expired cache
      await this.deleteExpiredCache();
      return null;
    }

    // Update hit count
    await docRef.update({
      hitCount: FieldValue.increment(1)
    });

    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      expiresAt: data.expiresAt.toDate()
    } as CachedTrendResult;
  }

  /**
   * Get artisan profile
   */
  async getArtisanProfile(uid: string): Promise<ArtisanProfile | null> {
    const docRef = this.firestore.collection(this.artisanCollection).doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) return null;

    return {
      ...data,
      lastQueryAt: data.lastQueryAt.toDate()
    } as ArtisanProfile;
  }

  /**
   * Update artisan profile
   */
  async updateArtisanProfile(profile: ArtisanProfile): Promise<void> {
    const docRef = this.firestore.collection(this.artisanCollection).doc(profile.uid);

    await docRef.set({
      ...profile,
      lastQueryAt: Timestamp.fromDate(profile.lastQueryAt)
    }, { merge: true });
  }

  /**
   * Create or update artisan profile
   */
  async createArtisanProfile(uid: string, artisticProfession: string): Promise<void> {
    const existingProfile = await this.getArtisanProfile(uid);

    if (existingProfile) {
      // Update existing profile
      existingProfile.artisticProfession = artisticProfession;
      existingProfile.lastQueryAt = new Date();
      existingProfile.queryCount += 1;
      await this.updateArtisanProfile(existingProfile);
    } else {
      // Create new profile
      const newProfile: ArtisanProfile = {
        uid,
        artisticProfession,
        preferences: {
          geo: 'IN',
          categories: [],
          priceRange: {
            min: 100,
            max: 10000
          }
        },
        lastQueryAt: new Date(),
        queryCount: 1
      };
      await this.updateArtisanProfile(newProfile);
    }
  }

  /**
   * Get popular cached results for profession
   */
  async getPopularResultsForProfession(profession: string, limit: number = 5): Promise<CachedTrendResult[]> {
    const collectionRef = this.firestore.collection(this.collectionName);
    const query = collectionRef
      .where('artisanProfession', '==', profession)
      .where('expiresAt', '>', Timestamp.fromDate(new Date()))
      .orderBy('hitCount', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    const snapshot = await query.get();
    const results: CachedTrendResult[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      results.push({
        ...data,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate()
      } as CachedTrendResult);
    });

    return results;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    activeEntries: number;
    totalHits: number;
    averageHitCount: number;
  }> {
    const collectionRef = this.firestore.collection(this.collectionName);
    const allDocs = await collectionRef.get();
    const activeDocs = await collectionRef
      .where('expiresAt', '>', Timestamp.fromDate(new Date()))
      .get();

    let totalHits = 0;
    let totalEntries = 0;

    allDocs.forEach(doc => {
      const data = doc.data();
      totalHits += data.hitCount || 0;
      totalEntries += 1;
    });

    return {
      totalEntries,
      activeEntries: activeDocs.size,
      totalHits,
      averageHitCount: totalEntries > 0 ? totalHits / totalEntries : 0
    };
  }

  /**
   * Clean up expired cache entries
   */
  async deleteExpiredCache(): Promise<number> {
    const collectionRef = this.firestore.collection(this.collectionName);
    const expiredQuery = collectionRef.where('expiresAt', '<', Timestamp.fromDate(new Date()));

    const snapshot = await expiredQuery.get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = this.firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }

  /**
   * Clean up old artisan profiles (inactive for 6+ months)
   */
  async cleanupInactiveProfiles(): Promise<number> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const collectionRef = this.firestore.collection(this.artisanCollection);
    const inactiveQuery = collectionRef.where('lastQueryAt', '<', Timestamp.fromDate(sixMonthsAgo));

    const snapshot = await inactiveQuery.get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = this.firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }

  /**
   * Generate cache key from profession and query
   */
  private generateCacheKey(profession: string, query: string): string {
    const normalizedProfession = profession.toLowerCase().replace(/\s+/g, '_');
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, '_');
    return `${normalizedProfession}_${normalizedQuery}_${Date.now()}`;
  }

  /**
   * Batch update multiple cache entries
   */
  async batchUpdateCacheEntries(updates: Array<{ id: string; data: Partial<CachedTrendResult> }>): Promise<void> {
    const batch = this.firestore.batch();

    for (const update of updates) {
      const docRef = this.firestore.collection(this.collectionName).doc(update.id);
      const updateData: any = { ...update.data };

      if (updateData.createdAt) {
        updateData.createdAt = Timestamp.fromDate(updateData.createdAt);
      }
      if (updateData.expiresAt) {
        updateData.expiresAt = Timestamp.fromDate(updateData.expiresAt);
      }

      batch.update(docRef, updateData);
    }

    await batch.commit();
  }
}

export const firestoreService = new FirestoreService();
