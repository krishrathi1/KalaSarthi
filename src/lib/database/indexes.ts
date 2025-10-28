/**
 * Database Indexes for Intelligent Artisan Matching
 * Optimizes queries for geospatial searches, text matching, and filtering
 */

import connectDB from '../mongodb';
import { IUser } from '../models/User';

export interface IndexCreationResult {
  success: boolean;
  indexesCreated: string[];
  errors: string[];
  executionTime: number;
}

export class DatabaseIndexManager {
  private static instance: DatabaseIndexManager;

  static getInstance(): DatabaseIndexManager {
    if (!DatabaseIndexManager.instance) {
      DatabaseIndexManager.instance = new DatabaseIndexManager();
    }
    return DatabaseIndexManager.instance;
  }

  /**
   * Create all indexes required for intelligent matching
   */
  async createAllIndexes(): Promise<IndexCreationResult> {
    const startTime = Date.now();
    const indexesCreated: string[] = [];
    const errors: string[] = [];

    try {
      await connectDB();
      
      // Import models to ensure they're registered
      const User = (await import('../models/User')).default;
      const { BuyerInteractionHistory, MatchHistory } = await import('../models/IntelligentMatching');

      console.log('Creating database indexes for intelligent matching...');

      // Create User/Artisan indexes
      await this.createUserIndexes(User, indexesCreated, errors);
      
      // Create Interaction History indexes
      await this.createInteractionIndexes(BuyerInteractionHistory, indexesCreated, errors);
      
      // Create Match History indexes
      await this.createMatchHistoryIndexes(MatchHistory, indexesCreated, errors);

      const executionTime = Date.now() - startTime;
      
      console.log(`Index creation completed in ${executionTime}ms`);
      console.log(`Created ${indexesCreated.length} indexes`);
      if (errors.length > 0) {
        console.warn(`${errors.length} errors occurred:`, errors);
      }

      return {
        success: errors.length === 0,
        indexesCreated,
        errors,
        executionTime
      };

    } catch (error) {
      console.error('Error creating indexes:', error);
      errors.push(`Global error: ${(error as Error).message}`);
      
      return {
        success: false,
        indexesCreated,
        errors,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Create indexes for User/Artisan collection
   */
  private async createUserIndexes(UserModel: any, indexesCreated: string[], errors: string[]): Promise<void> {
    const indexes = [
      // Geospatial index for location-based queries
      {
        name: 'location_2dsphere',
        spec: { 'artisanConnectProfile.locationData.coordinates': '2dsphere' },
        options: { 
          name: 'location_2dsphere',
          background: true,
          sparse: true // Only index documents that have location data
        }
      },

      // Text search index for skills, specializations, and materials
      {
        name: 'artisan_text_search',
        spec: {
          'artisticProfession': 'text',
          'artisanConnectProfile.specializations': 'text',
          'artisanConnectProfile.matchingData.skills': 'text',
          'artisanConnectProfile.matchingData.materials': 'text',
          'artisanConnectProfile.matchingData.techniques': 'text',
          'artisanConnectProfile.matchingData.portfolioKeywords': 'text',
          'description': 'text'
        },
        options: {
          name: 'artisan_text_search',
          background: true,
          weights: {
            'artisticProfession': 10,
            'artisanConnectProfile.specializations': 8,
            'artisanConnectProfile.matchingData.skills': 6,
            'artisanConnectProfile.matchingData.materials': 4,
            'artisanConnectProfile.matchingData.techniques': 4,
            'artisanConnectProfile.matchingData.portfolioKeywords': 3,
            'description': 2
          },
          default_language: 'english'
        }
      },

      // Compound index for filtering by performance metrics
      {
        name: 'performance_filtering',
        spec: {
          'role': 1,
          'artisanConnectProfile.performanceMetrics.customerSatisfaction': -1,
          'artisanConnectProfile.performanceMetrics.completionRate': -1,
          'artisanConnectProfile.availabilityStatus': 1
        },
        options: {
          name: 'performance_filtering',
          background: true,
          partialFilterExpression: { role: 'artisan' }
        }
      },

      // Index for delivery radius and service areas
      {
        name: 'delivery_capabilities',
        spec: {
          'role': 1,
          'artisanConnectProfile.locationData.deliveryRadius': 1,
          'artisanConnectProfile.locationData.serviceAreas': 1
        },
        options: {
          name: 'delivery_capabilities',
          background: true,
          partialFilterExpression: { role: 'artisan' }
        }
      },

      // Index for experience and pricing
      {
        name: 'experience_pricing',
        spec: {
          'role': 1,
          'artisanConnectProfile.matchingData.experienceLevel': 1,
          'artisanConnectProfile.matchingData.averageProjectSize.min': 1,
          'artisanConnectProfile.matchingData.averageProjectSize.max': 1
        },
        options: {
          name: 'experience_pricing',
          background: true,
          partialFilterExpression: { role: 'artisan' }
        }
      },

      // Index for last activity and profile updates
      {
        name: 'activity_tracking',
        spec: {
          'role': 1,
          'artisanConnectProfile.performanceMetrics.lastActiveDate': -1,
          'artisanConnectProfile.matchingData.lastProfileUpdate': -1
        },
        options: {
          name: 'activity_tracking',
          background: true,
          partialFilterExpression: { role: 'artisan' }
        }
      },

      // Basic role and UID index
      {
        name: 'role_uid',
        spec: {
          'role': 1,
          'uid': 1
        },
        options: {
          name: 'role_uid',
          background: true
        }
      }
    ];

    for (const index of indexes) {
      try {
        await UserModel.collection.createIndex(index.spec, index.options);
        indexesCreated.push(`User.${index.name}`);
        console.log(`✓ Created User index: ${index.name}`);
      } catch (error) {
        const errorMsg = `Failed to create User index ${index.name}: ${(error as Error).message}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }
  }

  /**
   * Create indexes for BuyerInteractionHistory collection
   */
  private async createInteractionIndexes(InteractionModel: any, indexesCreated: string[], errors: string[]): Promise<void> {
    const indexes = [
      // Primary buyer lookup
      {
        name: 'buyer_lookup',
        spec: { 'buyerId': 1 },
        options: { name: 'buyer_lookup', background: true }
      },

      // Interaction timestamp for time-based queries
      {
        name: 'interaction_timeline',
        spec: {
          'buyerId': 1,
          'interactions.timestamp': -1
        },
        options: { name: 'interaction_timeline', background: true }
      },

      // Interaction actions for success rate analysis
      {
        name: 'interaction_actions',
        spec: {
          'buyerId': 1,
          'interactions.action': 1,
          'interactions.relevanceScore': -1
        },
        options: { name: 'interaction_actions', background: true }
      },

      // Success metrics for performance analysis
      {
        name: 'success_metrics',
        spec: {
          'successMetrics.contactRate': -1,
          'successMetrics.hireRate': -1,
          'successMetrics.satisfactionScore': -1
        },
        options: { name: 'success_metrics', background: true }
      },

      // Search patterns text index
      {
        name: 'search_patterns_text',
        spec: {
          'searchPatterns.commonKeywords': 'text',
          'searchPatterns.preferredCategories': 'text'
        },
        options: {
          name: 'search_patterns_text',
          background: true,
          default_language: 'english'
        }
      },

      // Learning weights update tracking
      {
        name: 'learning_updates',
        spec: {
          'buyerId': 1,
          'learningWeights.lastUpdated': -1
        },
        options: { name: 'learning_updates', background: true }
      }
    ];

    for (const index of indexes) {
      try {
        await InteractionModel.collection.createIndex(index.spec, index.options);
        indexesCreated.push(`BuyerInteractionHistory.${index.name}`);
        console.log(`✓ Created BuyerInteractionHistory index: ${index.name}`);
      } catch (error) {
        const errorMsg = `Failed to create BuyerInteractionHistory index ${index.name}: ${(error as Error).message}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }
  }

  /**
   * Create indexes for MatchHistory collection
   */
  private async createMatchHistoryIndexes(MatchHistoryModel: any, indexesCreated: string[], errors: string[]): Promise<void> {
    const indexes = [
      // Primary buyer and timestamp lookup
      {
        name: 'buyer_search_history',
        spec: {
          'buyerId': 1,
          'searchMetadata.timestamp': -1
        },
        options: { name: 'buyer_search_history', background: true }
      },

      // Geospatial index for search locations
      {
        name: 'search_location_2dsphere',
        spec: {
          'searchMetadata.userLocation.coordinates': '2dsphere'
        },
        options: {
          name: 'search_location_2dsphere',
          background: true,
          sparse: true
        }
      },

      // Text search for search queries and requirements
      {
        name: 'search_content_text',
        spec: {
          'searchQuery': 'text',
          'requirementAnalysis.extractedCriteria.productType': 'text',
          'requirementAnalysis.extractedCriteria.materials': 'text',
          'requirementAnalysis.extractedCriteria.style': 'text',
          'requirementAnalysis.extractedCriteria.techniques': 'text'
        },
        options: {
          name: 'search_content_text',
          background: true,
          weights: {
            'searchQuery': 10,
            'requirementAnalysis.extractedCriteria.productType': 8,
            'requirementAnalysis.extractedCriteria.materials': 6,
            'requirementAnalysis.extractedCriteria.style': 4,
            'requirementAnalysis.extractedCriteria.techniques': 4
          },
          default_language: 'english'
        }
      },

      // Results relevance and performance
      {
        name: 'results_performance',
        spec: {
          'buyerId': 1,
          'results.relevanceScore.overall': -1,
          'searchMetadata.resultsCount': -1
        },
        options: { name: 'results_performance', background: true }
      },

      // Filter analysis
      {
        name: 'filter_analysis',
        spec: {
          'filters.maxDistance': 1,
          'filters.minRelevanceScore': 1,
          'searchMetadata.timestamp': -1
        },
        options: { name: 'filter_analysis', background: true }
      },

      // Artisan performance in searches
      {
        name: 'artisan_search_performance',
        spec: {
          'results.artisanId': 1,
          'results.relevanceScore.overall': -1,
          'results.finalRank': 1
        },
        options: { name: 'artisan_search_performance', background: true }
      }
    ];

    for (const index of indexes) {
      try {
        await MatchHistoryModel.collection.createIndex(index.spec, index.options);
        indexesCreated.push(`MatchHistory.${index.name}`);
        console.log(`✓ Created MatchHistory index: ${index.name}`);
      } catch (error) {
        const errorMsg = `Failed to create MatchHistory index ${index.name}: ${(error as Error).message}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }
  }

  /**
   * Drop all intelligent matching indexes
   */
  async dropAllIndexes(): Promise<IndexCreationResult> {
    const startTime = Date.now();
    const indexesDropped: string[] = [];
    const errors: string[] = [];

    try {
      await connectDB();
      
      const User = (await import('../models/User')).default;
      const { BuyerInteractionHistory, MatchHistory } = await import('../models/IntelligentMatching');

      console.log('Dropping intelligent matching indexes...');

      // Drop User indexes
      const userIndexes = [
        'location_2dsphere', 'artisan_text_search', 'performance_filtering',
        'delivery_capabilities', 'experience_pricing', 'activity_tracking', 'role_uid'
      ];

      for (const indexName of userIndexes) {
        try {
          await User.collection.dropIndex(indexName);
          indexesDropped.push(`User.${indexName}`);
          console.log(`✓ Dropped User index: ${indexName}`);
        } catch (error) {
          if (!(error as Error).message.includes('index not found')) {
            errors.push(`Failed to drop User index ${indexName}: ${(error as Error).message}`);
          }
        }
      }

      // Drop BuyerInteractionHistory indexes
      const interactionIndexes = [
        'buyer_lookup', 'interaction_timeline', 'interaction_actions',
        'success_metrics', 'search_patterns_text', 'learning_updates'
      ];

      for (const indexName of interactionIndexes) {
        try {
          await BuyerInteractionHistory.collection.dropIndex(indexName);
          indexesDropped.push(`BuyerInteractionHistory.${indexName}`);
          console.log(`✓ Dropped BuyerInteractionHistory index: ${indexName}`);
        } catch (error) {
          if (!(error as Error).message.includes('index not found')) {
            errors.push(`Failed to drop BuyerInteractionHistory index ${indexName}: ${(error as Error).message}`);
          }
        }
      }

      // Drop MatchHistory indexes
      const matchHistoryIndexes = [
        'buyer_search_history', 'search_location_2dsphere', 'search_content_text',
        'results_performance', 'filter_analysis', 'artisan_search_performance'
      ];

      for (const indexName of matchHistoryIndexes) {
        try {
          await MatchHistory.collection.dropIndex(indexName);
          indexesDropped.push(`MatchHistory.${indexName}`);
          console.log(`✓ Dropped MatchHistory index: ${indexName}`);
        } catch (error) {
          if (!(error as Error).message.includes('index not found')) {
            errors.push(`Failed to drop MatchHistory index ${indexName}: ${(error as Error).message}`);
          }
        }
      }

      const executionTime = Date.now() - startTime;
      
      return {
        success: errors.length === 0,
        indexesCreated: indexesDropped,
        errors,
        executionTime
      };

    } catch (error) {
      console.error('Error dropping indexes:', error);
      errors.push(`Global error: ${(error as Error).message}`);
      
      return {
        success: false,
        indexesCreated: indexesDropped,
        errors,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      await connectDB();
      
      const User = (await import('../models/User')).default;
      const { BuyerInteractionHistory, MatchHistory } = await import('../models/IntelligentMatching');

      const stats = {
        User: await User.collection.indexInformation(),
        BuyerInteractionHistory: await BuyerInteractionHistory.collection.indexInformation(),
        MatchHistory: await MatchHistory.collection.indexInformation()
      };

      return stats;
    } catch (error) {
      console.error('Error getting index stats:', error);
      return null;
    }
  }

  /**
   * Validate that all required indexes exist
   */
  async validateIndexes(): Promise<{ valid: boolean; missing: string[]; existing: string[] }> {
    try {
      const stats = await this.getIndexStats();
      if (!stats) {
        return { valid: false, missing: [], existing: [] };
      }

      const requiredIndexes = [
        'User.location_2dsphere',
        'User.artisan_text_search',
        'User.performance_filtering',
        'BuyerInteractionHistory.buyer_lookup',
        'BuyerInteractionHistory.interaction_timeline',
        'MatchHistory.buyer_search_history',
        'MatchHistory.search_location_2dsphere'
      ];

      const existing: string[] = [];
      const missing: string[] = [];

      for (const requiredIndex of requiredIndexes) {
        const [collection, indexName] = requiredIndex.split('.');
        const collectionStats = stats[collection];
        
        if (collectionStats && collectionStats[indexName]) {
          existing.push(requiredIndex);
        } else {
          missing.push(requiredIndex);
        }
      }

      return {
        valid: missing.length === 0,
        missing,
        existing
      };
    } catch (error) {
      console.error('Error validating indexes:', error);
      return { valid: false, missing: [], existing: [] };
    }
  }
}

export default DatabaseIndexManager;