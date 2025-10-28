/**
 * Test GenAI Semantic Search
 * Verifies the new clean approach works correctly
 */

require('dotenv').config();

async function testGenAISearch() {
  console.log('🧪 Testing GenAI Semantic Search...\n');
  
  const testQueries = [
    'pottery',
    'wooden furniture',
    'handmade jewelry',
    'leather bags',
    'traditional textiles',
    'ceramic bowls',
    'custom woodwork',
    'embroidered scarves'
  ];
  
  for (const query of testQueries) {
    console.log(`🔍 Testing: "${query}"`);
    
    try {
      const response = await fetch('http://localhost:9003/api/intelligent-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          maxResults: 5
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`   ✅ SUCCESS: Found ${result.data.matches.length} matches`);
        console.log(`   🧠 Detected: ${result.data.queryAnalysis.detectedProfession}`);
        console.log(`   🎯 Skills: ${result.data.queryAnalysis.extractedSkills.join(', ')}`);
        console.log(`   ⚡ Time: ${result.data.processingTime}ms`);
        
        if (result.data.matches.length > 0) {
          const topMatch = result.data.matches[0];
          console.log(`   🏆 Top match: ${topMatch.artisan.name} (${(topMatch.relevanceScore * 100).toFixed(1)}%)`);
          console.log(`   💡 Reason: ${topMatch.matchReason}`);
        }
      } else {
        console.log(`   ❌ FAILED: ${result.error.message}`);
        if (result.error.suggestion) {
          console.log(`   💡 Suggestion: ${result.error.suggestion}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Test health endpoint
  console.log('🏥 Testing Health Endpoint...');
  try {
    const healthResponse = await fetch('http://localhost:9003/api/intelligent-match');
    const healthResult = await healthResponse.json();
    
    console.log(`   Status: ${healthResult.status}`);
    console.log(`   Service: ${healthResult.service}`);
    console.log(`   Cache size: ${healthResult.cacheStats?.size || 0}`);
    
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
  }
  
  console.log('\n✨ GenAI Search test completed!');
}

// Run test if server is available
testGenAISearch().catch(error => {
  console.error('💥 Test failed:', error.message);
  console.log('\n💡 Make sure the development server is running:');
  console.log('   npm run dev');
});