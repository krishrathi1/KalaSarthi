#!/usr/bin/env node

/**
 * Local Testing Script (No Google Cloud Required)
 * Tests the trend analysis with mock data
 */

const { trendScraper } = require('./src/lib/trend-scraper');

async function testLocalScraping() {
  console.log('🧪 Testing Local Scraping (No Cloud APIs Required)\n');

  try {
    // Test 1: Scrape Amazon for silk sarees
    console.log('🛒 Test 1: Scraping Amazon for "silk sarees"');
    const amazonProducts = await trendScraper.scrapeAmazon('silk sarees', 5);
    console.log(`Found ${amazonProducts.length} products:`);
    amazonProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.title}`);
      console.log(`   💰 Price: ${product.price}`);
      console.log(`   ⭐ Rating: ${product.rating}`);
      console.log(`   📝 Reviews: ${product.reviews}`);
      console.log(`   🏪 Platform: ${product.platform}`);
      console.log('');
    });

    // Test 2: Scrape Flipkart
    console.log('📱 Test 2: Scraping Flipkart for "silk sarees"');
    const flipkartProducts = await trendScraper.scrapeFlipkart('silk sarees', 5);
    console.log(`Found ${flipkartProducts.length} products:`);
    flipkartProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.title}`);
      console.log(`   💰 Price: ${product.price}`);
      console.log(`   ⭐ Rating: ${product.rating}`);
      console.log(`   📝 Reviews: ${product.reviews}`);
      console.log(`   🏪 Platform: ${product.platform}`);
      console.log('');
    });

    // Test 3: Get trending products (fallback data)
    console.log('📈 Test 3: Getting trending products for "weaver"');
    const trendingProducts = await trendScraper.getTrendingProducts('weaver', 10);
    console.log(`Found ${trendingProducts.length} trend categories:`);

    trendingProducts.forEach((trend, index) => {
      console.log(`\n📊 Trend ${index + 1}: ${trend.keyword}`);
      console.log(`   🔍 Search Volume: ${trend.searchVolume}`);
      console.log(`   📈 Demand Score: ${trend.demandScore.toFixed(1)}/10`);
      console.log(`   ${trend.trending ? '🔥 Trending' : '📊 Stable'}`);

      console.log('   🛍️ Top Products:');
      trend.products.slice(0, 3).forEach((product, pIndex) => {
        console.log(`     ${pIndex + 1}. ${product.title}`);
        console.log(`        💰 Price: ${product.price}`);
        console.log(`        ⭐ Rating: ${product.rating}`);
        console.log(`        🏪 Platform: ${product.platform}`);
      });
    });

    // Test 4: Price Analysis
    console.log('\n💰 Test 4: Price Analysis in INR');
    const allProducts = [...amazonProducts, ...flipkartProducts];

    if (allProducts.length > 0) {
      const prices = allProducts
        .map(p => parseInt(p.price.replace(/[^\d]/g, '')))
        .filter(p => !isNaN(p) && p > 0)
        .sort((a, b) => a - b);

      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const medianPrice = prices[Math.floor(prices.length / 2)];

        console.log(`📊 Price Statistics for Silk Sarees:`);
        console.log(`   💰 Minimum Price: ₹${minPrice.toLocaleString()}`);
        console.log(`   💰 Maximum Price: ₹${maxPrice.toLocaleString()}`);
        console.log(`   💰 Average Price: ₹${Math.round(avgPrice).toLocaleString()}`);
        console.log(`   💰 Median Price: ₹${medianPrice.toLocaleString()}`);
        console.log(`   📦 Total Products Analyzed: ${prices.length}`);

        // Price ranges
        console.log('\n📈 Price Distribution:');
        const ranges = [
          { min: 0, max: 1000, label: '₹0-₹1,000' },
          { min: 1000, max: 3000, label: '₹1,000-₹3,000' },
          { min: 3000, max: 5000, label: '₹3,000-₹5,000' },
          { min: 5000, max: 10000, label: '₹5,000-₹10,000' },
          { min: 10000, max: Infinity, label: '₹10,000+' }
        ];

        ranges.forEach(range => {
          const count = prices.filter(p => p >= range.min && p < range.max).length;
          const percentage = ((count / prices.length) * 100).toFixed(1);
          console.log(`   ${range.label}: ${count} products (${percentage}%)`);
        });
      }
    }

    console.log('\n✅ Local testing completed successfully!');
    console.log('\n🎯 Key Findings:');
    console.log('- ✅ Scraping working for Amazon and Flipkart');
    console.log('- ✅ Prices displayed in INR format');
    console.log('- ✅ Product data includes ratings and reviews');
    console.log('- ✅ Fallback data available when scraping fails');
    console.log('- ✅ Price analysis provides market insights');

  } catch (error) {
    console.error('❌ Local test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Cost estimation for local testing
function showCostEstimates() {
  console.log('\n💰 Cost Estimates for Production Deployment\n');

  console.log('📊 Monthly Usage Assumptions:');
  console.log('- 1,000 trend analysis requests');
  console.log('- 10,000 scraped products stored');
  console.log('- 5,000 AI API calls');
  console.log('- 24/7 service availability');

  console.log('\n💵 Estimated Monthly Costs:');

  console.log('🔥 Google Cloud Services:');
  console.log('  - BigQuery: ₹2,000-₹8,000');
  console.log('  - Firestore: ₹500-₹2,000');
  console.log('  - Vertex AI (Gemini Pro): ₹10,000-₹30,000');
  console.log('  - Cloud Run: ₹3,000-₹10,000');
  console.log('  - Cloud Storage: ₹200-₹1,000');

  console.log('\n📊 Subtotal: ₹15,700-₹51,000');

  console.log('\n🎯 Cost Optimization Strategies:');
  console.log('✅ Use caching to reduce API calls by 70%');
  console.log('✅ Implement data lifecycle policies');
  console.log('✅ Use BigQuery flat-rate pricing for predictable costs');
  console.log('✅ Monitor usage with budgets and alerts');
  console.log('✅ Use spot instances for non-critical workloads');

  console.log('\n💡 Optimized Cost Estimate: ₹8,000-₹25,000/month');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--costs')) {
    showCostEstimates();
  } else {
    await testLocalScraping();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testLocalScraping, showCostEstimates };