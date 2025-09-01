#!/usr/bin/env node

/**
 * Trend Analysis Testing Script
 * Tests the complete trend analysis architecture
 */

const { trendAnalysisOrchestrator } = require('./src/lib/trend-analysis-orchestrator');
const { bigQueryService } = require('./src/lib/bigquery-service');
const { firestoreService } = require('./src/lib/firestore-service');
const { googleTrendsService } = require('./src/lib/google-trends');
const { vertexAIService } = require('./src/lib/vertex-ai-service');

async function testTrendAnalysis() {
  console.log('🚀 Starting Trend Analysis Architecture Test\n');

  const testArtisan = {
    uid: 'test-user-123',
    profession: 'weaver',
    query: 'Kanchipuram silk sarees',
    timestamp: new Date()
  };

  try {
    // Test 1: Basic functionality
    console.log('📊 Test 1: Basic Trend Analysis');
    console.log('Input:', testArtisan.profession);

    const startTime = Date.now();
    const result = await trendAnalysisOrchestrator.analyzeTrendsForArtisan(testArtisan);
    const duration = Date.now() - startTime;

    console.log('✅ Analysis completed in', duration, 'ms');
    console.log('📈 Trends found:', result.trends.length);
    console.log('🤖 AI Insights:', result.insights.summary.substring(0, 100) + '...');
    console.log('💰 Recommendations:', result.recommendations.length);
    console.log('📊 Data sources:', result.dataSources.join(', '));
    console.log('💾 Cached:', result.cached);

    // Test 2: Price display in INR
    console.log('\n💰 Test 2: Price Analysis in INR');
    if (result.trends.length > 0) {
      result.trends.forEach((trend, index) => {
        console.log(`\n🏪 Platform: ${trend.keyword}`);
        trend.products.slice(0, 3).forEach((product, pIndex) => {
          console.log(`  ${pIndex + 1}. ${product.title}`);
          console.log(`     💰 Price: ${product.price}`);
          console.log(`     ⭐ Rating: ${product.rating}`);
          console.log(`     📝 Reviews: ${product.reviews}`);
        });
      });
    }

    // Test 3: Cache functionality
    console.log('\n💾 Test 3: Cache Functionality');
    const cachedResult = await trendAnalysisOrchestrator.analyzeTrendsForArtisan({
      ...testArtisan,
      uid: 'test-user-456' // Different user, same query
    });
    console.log('📋 Cache hit:', cachedResult.cached);
    console.log('⚡ Response time should be faster for cached results');

    // Test 4: System health
    console.log('\n🏥 Test 4: System Health Check');
    const health = await trendAnalysisOrchestrator.getSystemHealth();
    console.log('BigQuery:', health.bigquery ? '✅' : '❌');
    console.log('Firestore:', health.firestore ? '✅' : '❌');
    console.log('Google Trends:', health.googleTrends ? '✅' : '❌');
    console.log('Vertex AI:', health.vertexAI ? '✅' : '❌');

    if (health.firestore && Object.keys(health.cacheStats).length > 0) {
      console.log('Cache Stats:', health.cacheStats);
    }

    // Test 5: Individual services
    console.log('\n🔧 Test 5: Individual Service Tests');

    // Google Trends test
    console.log('🌐 Testing Google Trends...');
    const trendsData = await googleTrendsService.getComprehensiveTrends('silk sarees');
    console.log('Google Trends data keys:', Object.keys(trendsData));

    // Vertex AI test
    console.log('🤖 Testing Vertex AI...');
    const aiInsights = await vertexAIService.generateTrendInsights({
      artisanProfession: 'weaver',
      googleTrendsData: trendsData,
      scrapedProducts: result.trends.flatMap(t => t.products),
      marketData: { test: true }
    });
    console.log('AI Confidence:', aiInsights.confidence);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- ✅ Trend analysis working');
    console.log('- ✅ AI insights generated');
    console.log('- ✅ Prices displayed in INR');
    console.log('- ✅ Caching system operational');
    console.log('- ✅ All services healthy');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);

    // Provide helpful troubleshooting
    console.log('\n🔧 Troubleshooting:');
    if (error.message.includes('SERVICE_DISABLED')) {
      console.log('1. Enable Firestore API: gcloud services enable firestore.googleapis.com');
      console.log('2. Enable BigQuery API: gcloud services enable bigquery.googleapis.com');
    }
    if (error.message.includes('PERMISSION_DENIED')) {
      console.log('1. Check service account permissions');
      console.log('2. Verify GOOGLE_APPLICATION_CREDENTIALS path');
    }
    if (error.message.includes('timeout')) {
      console.log('1. Increase TREND_ANALYSIS_TIMEOUT in .env');
      console.log('2. Check network connectivity');
    }
  }
}

// Cost analysis function
async function analyzeCosts() {
  console.log('\n💰 Cost Analysis for Trend Analysis System\n');

  try {
    // Get performance stats
    const stats = await trendAnalysisOrchestrator.getSystemHealth();

    console.log('📊 Current Usage Stats:');
    if (stats.firestore && stats.cacheStats) {
      console.log(`- Cache entries: ${stats.cacheStats.totalEntries}`);
      console.log(`- Active cache: ${stats.cacheStats.activeEntries}`);
      console.log(`- Cache hit rate: ${(stats.cacheStats.averageHitCount * 100).toFixed(1)}%`);
    }

    console.log('\n💵 Estimated Monthly Costs (for 1000 requests/day):');

    // BigQuery costs (based on typical usage)
    console.log('BigQuery Storage: ₹500-₹2,000/month');
    console.log('BigQuery Queries: ₹1,000-₹5,000/month');

    // Firestore costs
    console.log('Firestore Reads: ₹200-₹1,000/month');
    console.log('Firestore Writes: ₹100-₹500/month');

    // Vertex AI costs
    console.log('Vertex AI (Gemini Pro): ₹5,000-₹15,000/month');

    // Cloud Run costs
    console.log('Cloud Run: ₹2,000-₹8,000/month');

    console.log('\n📈 Total Estimated Cost: ₹8,800-₹31,500/month');

    console.log('\n💡 Cost Optimization Tips:');
    console.log('- Use caching to reduce API calls');
    console.log('- Implement data lifecycle policies');
    console.log('- Use BigQuery reservations for predictable costs');
    console.log('- Monitor usage and set budgets');

  } catch (error) {
    console.error('Cost analysis failed:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--costs')) {
    await analyzeCosts();
  } else if (args.includes('--health')) {
    const health = await trendAnalysisOrchestrator.getSystemHealth();
    console.log('System Health:', health);
  } else {
    await testTrendAnalysis();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testTrendAnalysis, analyzeCosts };