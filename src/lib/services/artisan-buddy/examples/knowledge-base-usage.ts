/**
 * Knowledge Base Usage Examples
 * Demonstrates how to use the Knowledge Base and RAG Pipeline services
 */

import { 
  KnowledgeBaseService, 
  RAGPipelineService,
  KnowledgeBaseSeeder,
  VectorStore 
} from '../index';

/**
 * Example 1: Basic Knowledge Search
 */
export async function searchKnowledgeExample() {
  const knowledgeBase = KnowledgeBaseService.getInstance();

  // Search for pottery techniques
  const results = await knowledgeBase.search('pottery wheel throwing techniques', {
    category: 'technique',
    craftType: 'pottery',
    language: 'en'
  });

  console.log('Search Results:');
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.title}`);
    console.log(`   Relevance: ${(result.relevance * 100).toFixed(1)}%`);
    console.log(`   Category: ${result.category}`);
    console.log(`   Content: ${result.content.substring(0, 200)}...`);
  });

  return results;
}

/**
 * Example 2: Get Craft Information
 */
export async function getCraftInfoExample() {
  const knowledgeBase = KnowledgeBaseService.getInstance();

  const craftInfo = await knowledgeBase.getCraftInfo('pottery');

  if (craftInfo) {
    console.log('\nPottery Craft Information:');
    console.log('Name:', craftInfo.name);
    console.log('Description:', craftInfo.description);
    console.log('History:', craftInfo.history);
    console.log('Regions:', craftInfo.regions.join(', '));
    console.log('Techniques:', craftInfo.techniques.join(', '));
    console.log('Market Demand:', craftInfo.marketDemand);
  }

  return craftInfo;
}

/**
 * Example 3: Get Market Insights
 */
export async function getMarketInsightsExample() {
  const knowledgeBase = KnowledgeBaseService.getInstance();

  const insights = await knowledgeBase.getMarketInsights('weaving');

  if (insights) {
    console.log('\nWeaving Market Insights:');
    console.log('Demand Level:', insights.demand);
    console.log('Average Price:', `₹${insights.averagePrice.min} - ₹${insights.averagePrice.max}`);
    console.log('Top Buyer Regions:', insights.topBuyerRegions.join(', '));
    console.log('Growth Rate:', `${(insights.growthRate * 100).toFixed(1)}%`);
  }

  return insights;
}

/**
 * Example 4: RAG-based Response Generation
 */
export async function ragResponseExample() {
  const ragPipeline = RAGPipelineService.getInstance();

  const response = await ragPipeline.generateWithContext({
    query: 'How can I improve the quality of my pottery products?',
    context: {
      userId: 'user123',
      name: 'Ramesh Kumar',
      profession: 'Potter',
      specializations: ['terracotta', 'blue pottery'],
      location: 'Jaipur, Rajasthan'
    },
    conversationHistory: [
      {
        role: 'user',
        content: 'I want to learn about pottery glazing',
        timestamp: new Date(Date.now() - 300000)
      },
      {
        role: 'assistant',
        content: 'Glazing is an important technique for pottery...',
        timestamp: new Date(Date.now() - 240000)
      }
    ],
    filters: {
      category: 'technique',
      craftType: 'pottery'
    },
    maxDocuments: 5
  });

  console.log('\nRAG Response:');
  console.log('Response:', response.response);
  console.log('Confidence:', `${(response.confidence * 100).toFixed(1)}%`);
  console.log('Sources:', response.sources.join(', '));
  console.log('Reasoning:', response.reasoning);
  console.log('\nRetrieved Documents:', response.retrievedDocuments.length);

  return response;
}

/**
 * Example 5: Generate Follow-up Questions
 */
export async function generateFollowUpExample() {
  const ragPipeline = RAGPipelineService.getInstance();

  const questions = await ragPipeline.generateFollowUpQuestions(
    'How do I price my pottery products?',
    'You should consider material costs, labor hours, and market demand when pricing...',
    {
      userId: 'user123',
      name: 'Ramesh Kumar',
      profession: 'Potter',
      location: 'Jaipur, Rajasthan'
    }
  );

  console.log('\nFollow-up Questions:');
  questions.forEach((question, index) => {
    console.log(`${index + 1}. ${question}`);
  });

  return questions;
}

/**
 * Example 6: Multilingual Search
 */
export async function multilingualSearchExample() {
  const knowledgeBase = KnowledgeBaseService.getInstance();

  // Search in Hindi
  const hindiResults = await knowledgeBase.search('कुम्हारी तकनीक', {
    language: 'hi'
  });

  console.log('\nHindi Search Results:');
  hindiResults.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.title}`);
    console.log(`   Relevance: ${(result.relevance * 100).toFixed(1)}%`);
    console.log(`   Content: ${result.content.substring(0, 150)}...`);
  });

  return hindiResults;
}

/**
 * Example 7: Get Pricing Guidance
 */
export async function getPricingGuidanceExample() {
  const knowledgeBase = KnowledgeBaseService.getInstance();

  const pricing = await knowledgeBase.getPricingGuidance('pottery', 'decorative vase');

  if (pricing) {
    console.log('\nPricing Guidance:');
    console.log(`Price Range: ₹${pricing.min} - ₹${pricing.max} per ${pricing.unit}`);
  }

  return pricing;
}

/**
 * Example 8: Seed Knowledge Base
 */
export async function seedKnowledgeBaseExample() {
  const seeder = new KnowledgeBaseSeeder();

  console.log('\nSeeding Knowledge Base...');
  await seeder.seedAll();

  // Verify
  const verification = await seeder.verify();
  console.log('\nVerification:', verification.isValid ? '✅ PASSED' : '❌ FAILED');
  
  if (verification.issues.length > 0) {
    console.log('Issues:', verification.issues);
  }

  console.log('\nStatistics:');
  console.log('Total Documents:', verification.stats.totalDocuments);
  console.log('By Category:', verification.stats.documentsByCategory);
  console.log('By Craft Type:', verification.stats.documentsByCraftType);

  return verification;
}

/**
 * Example 9: Get Knowledge Base Statistics
 */
export async function getStatisticsExample() {
  const vectorStore = VectorStore.getInstance();

  const stats = await vectorStore.getStatistics();

  console.log('\nKnowledge Base Statistics:');
  console.log('Total Documents:', stats.totalDocuments);
  console.log('Documents by Category:', stats.documentsByCategory);
  console.log('Documents by Craft Type:', stats.documentsByCraftType);
  console.log('Last Updated:', stats.lastUpdated.toISOString());

  return stats;
}

/**
 * Example 10: Craft Recommendations
 */
export async function getCraftRecommendationsExample() {
  const knowledgeBase = KnowledgeBaseService.getInstance();

  const recommendations = await knowledgeBase.getCraftRecommendations(
    'pottery',
    ['clay work', 'wheel throwing', 'glazing'],
    'Rajasthan'
  );

  console.log('\nCraft Recommendations:');
  recommendations.forEach((rec, index) => {
    console.log(`\n${index + 1}. ${rec.title}`);
    console.log(`   Relevance: ${(rec.relevance * 100).toFixed(1)}%`);
    console.log(`   Category: ${rec.category}`);
  });

  return recommendations;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('ARTISAN BUDDY KNOWLEDGE BASE - USAGE EXAMPLES');
  console.log('='.repeat(60));

  try {
    // Example 1
    console.log('\n' + '='.repeat(60));
    console.log('EXAMPLE 1: Basic Knowledge Search');
    console.log('='.repeat(60));
    await searchKnowledgeExample();

    // Example 2
    console.log('\n' + '='.repeat(60));
    console.log('EXAMPLE 2: Get Craft Information');
    console.log('='.repeat(60));
    await getCraftInfoExample();

    // Example 3
    console.log('\n' + '='.repeat(60));
    console.log('EXAMPLE 3: Get Market Insights');
    console.log('='.repeat(60));
    await getMarketInsightsExample();

    // Example 4
    console.log('\n' + '='.repeat(60));
    console.log('EXAMPLE 4: RAG-based Response Generation');
    console.log('='.repeat(60));
    await ragResponseExample();

    // Example 5
    console.log('\n' + '='.repeat(60));
    console.log('EXAMPLE 5: Generate Follow-up Questions');
    console.log('='.repeat(60));
    await generateFollowUpExample();

    // Example 6
    console.log('\n' + '='.repeat(60));
    console.log('EXAMPLE 6: Multilingual Search');
    console.log('='.repeat(60));
    await multilingualSearchExample();

    // Example 7
    console.log('\n' + '='.repeat(60));
    console.log('EXAMPLE 7: Get Pricing Guidance');
    console.log('='.repeat(60));
    await getPricingGuidanceExample();

    // Example 9
    console.log('\n' + '='.repeat(60));
    console.log('EXAMPLE 9: Get Statistics');
    console.log('='.repeat(60));
    await getStatisticsExample();

    // Example 10
    console.log('\n' + '='.repeat(60));
    console.log('EXAMPLE 10: Craft Recommendations');
    console.log('='.repeat(60));
    await getCraftRecommendationsExample();

    console.log('\n' + '='.repeat(60));
    console.log('ALL EXAMPLES COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Export for use in other files
export default {
  searchKnowledgeExample,
  getCraftInfoExample,
  getMarketInsightsExample,
  ragResponseExample,
  generateFollowUpExample,
  multilingualSearchExample,
  getPricingGuidanceExample,
  seedKnowledgeBaseExample,
  getStatisticsExample,
  getCraftRecommendationsExample,
  runAllExamples
};
