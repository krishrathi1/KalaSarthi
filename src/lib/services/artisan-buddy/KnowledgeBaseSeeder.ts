/**
 * Knowledge Base Seeder
 * Populates the knowledge base with curated arts and crafts data
 */

import { VectorStore } from './VectorStore';
import { allKnowledgeData } from './data/crafts-knowledge';

export class KnowledgeBaseSeeder {
  private vectorStore: VectorStore;

  constructor() {
    this.vectorStore = VectorStore.getInstance();
  }

  /**
   * Seed the knowledge base with all data
   */
  async seedAll(): Promise<void> {
    try {
      console.log('🌱 Starting knowledge base seeding...');
      console.log(`📊 Total documents to seed: ${allKnowledgeData.length}`);

      const ids = await this.vectorStore.batchStoreDocuments(allKnowledgeData);

      console.log(`✅ Successfully seeded ${ids.length} documents`);
      
      // Display statistics
      const stats = await this.vectorStore.getStatistics();
      console.log('\n📈 Knowledge Base Statistics:');
      console.log(`Total Documents: ${stats.totalDocuments}`);
      console.log('Documents by Category:', stats.documentsByCategory);
      console.log('Documents by Craft Type:', stats.documentsByCraftType);
      console.log(`Last Updated: ${stats.lastUpdated.toISOString()}`);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }

  /**
   * Seed specific category
   */
  async seedCategory(category: string): Promise<void> {
    try {
      const documents = allKnowledgeData.filter(
        doc => doc.metadata.category === category
      );

      console.log(`🌱 Seeding ${documents.length} documents for category: ${category}`);
      
      const ids = await this.vectorStore.batchStoreDocuments(documents);
      
      console.log(`✅ Successfully seeded ${ids.length} documents`);
    } catch (error) {
      console.error(`❌ Failed to seed category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Seed specific craft type
   */
  async seedCraftType(craftType: string): Promise<void> {
    try {
      const documents = allKnowledgeData.filter(
        doc => doc.metadata.craftType === craftType
      );

      console.log(`🌱 Seeding ${documents.length} documents for craft type: ${craftType}`);
      
      const ids = await this.vectorStore.batchStoreDocuments(documents);
      
      console.log(`✅ Successfully seeded ${ids.length} documents`);
    } catch (error) {
      console.error(`❌ Failed to seed craft type ${craftType}:`, error);
      throw error;
    }
  }

  /**
   * Clear all knowledge base data
   */
  async clearAll(): Promise<void> {
    try {
      console.log('🗑️  Clearing knowledge base...');
      
      const documents = await this.vectorStore.getAllDocuments();
      
      for (const doc of documents) {
        await this.vectorStore.deleteDocument(doc.id);
      }
      
      console.log(`✅ Cleared ${documents.length} documents`);
    } catch (error) {
      console.error('❌ Failed to clear knowledge base:', error);
      throw error;
    }
  }

  /**
   * Update existing documents
   */
  async updateAll(): Promise<void> {
    try {
      console.log('🔄 Updating knowledge base...');
      
      // Clear existing data
      await this.clearAll();
      
      // Seed fresh data
      await this.seedAll();
      
      console.log('✅ Knowledge base updated successfully');
    } catch (error) {
      console.error('❌ Failed to update knowledge base:', error);
      throw error;
    }
  }

  /**
   * Verify knowledge base integrity
   */
  async verify(): Promise<{
    isValid: boolean;
    issues: string[];
    stats: any;
  }> {
    try {
      console.log('🔍 Verifying knowledge base...');
      
      const issues: string[] = [];
      const stats = await this.vectorStore.getStatistics();
      
      // Check if documents exist
      if (stats.totalDocuments === 0) {
        issues.push('No documents found in knowledge base');
      }
      
      // Check category distribution
      const expectedCategories = ['craft_info', 'technique', 'material', 'market_insights', 'pricing'];
      for (const category of expectedCategories) {
        if (!stats.documentsByCategory[category]) {
          issues.push(`Missing documents for category: ${category}`);
        }
      }
      
      // Check for documents with embeddings
      const documents = await this.vectorStore.getAllDocuments();
      const documentsWithoutEmbeddings = documents.filter(doc => !doc.embedding || doc.embedding.length === 0);
      
      if (documentsWithoutEmbeddings.length > 0) {
        issues.push(`${documentsWithoutEmbeddings.length} documents missing embeddings`);
      }
      
      const isValid = issues.length === 0;
      
      console.log(isValid ? '✅ Knowledge base is valid' : '⚠️  Knowledge base has issues');
      if (issues.length > 0) {
        console.log('Issues found:');
        issues.forEach(issue => console.log(`  - ${issue}`));
      }
      
      return { isValid, issues, stats };
    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    }
  }
}
