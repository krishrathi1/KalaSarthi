/**
 * Test GenAI Semantic Search
 * Tests the new clean GenAI-based approach
 */

const testQueries = [
  {
    name: 'Pottery Test',
    query: 'pottery'
  },
  {
    name: 'Wood Test',
    query: 'wooden furniture'
  },
  {
    name: 'Jewelry Test',
    query: 'handmade jewelry'
  },
  {
    name: 'Leather Test',
    query: 'leather bags'
  },
  {
    name: 'Textile Test',
    query: 'traditional textiles'
  }
];

async function testGenAISearch() {
  console.log('🧪 Testing GenAI Semantic Search...\n');
  
  for (const test of testQueries) {
    console.log(`🔍 ${test.name}`);
    console.log(`   Query: "${test.query}"`);
    
    try {
      const response = await fetch('http://localhost:9003/api/intelligent-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: test.query,
          maxResults: 5
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.data.matches.length > 0) {
        console.log(`   ✅ SUCCESS: Found ${result.data.matches.length} matches`);
        console.log(`   ⚡ Processing time: ${result.data.processingTime}ms`);
        
        console.log('   🏆 Top matches:');
        result.data.matches.slice(0, 3).forEach((match, index) => {
          const relevance = (match.relevanceScore * 100).toFixed(1);
          console.log(`      ${index + 1}. ${match.artisan.name} - ${relevance}% relevance`);
          console.log(`         Profession: ${match.artisan.artisticProfession}`);
          console.log(`         Reason: ${match.matchReason}`);
          console.log(`         Skills: ${match.skillsMatch.join(', ') || 'N/A'}`);
        });
        
        if (result.data.queryAnalysis) {
          console.log(`   🧠 Query Analysis:`);
          console.log(`      Detected Profession: ${result.data.queryAnalysis.detectedProfession}`);
          console.log(`      Extracted Skills: ${result.data.queryAnalysis.extractedSkills.join(', ') || 'none'}`);
          console.log(`      Sentiment: ${result.data.queryAnalysis.sentiment}`);
          console.log(`      Confidence: ${(result.data.queryAnalysis.confidence * 100).toFixed(1)}%`);
        }
        
      } else {
        console.log(`   ❌ FAILED: ${result.error?.message || 'Unknown error'}`);
        console.log(`   Code: ${result.error?.code || 'UNKNOWN'}`);
        if (result.error?.suggestion) {
          console.log(`   💡 Suggestion: ${result.error.suggestion}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      console.log('   💡 Make sure the development server is running: npm run dev');
    }
    
    console.log('');
  }
  
  // Test service health
  console.log('🏥 Testing Service Health...');
  try {
    const healthResponse = await fetch('http://localhost:9003/api/intelligent-match');
    const healthResult = await healthResponse.json();
    
    if (healthResult.success) {
      console.log('   ✅ Service is healthy');
      console.log(`   🔧 Service: ${healthResult.service}`);
      console.log(`   📊 Cache size: ${healthResult.cacheStats?.size || 0}`);
    } else {
      console.log('   ❌ Service is unhealthy');
    }
    
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
  }
  
  console.log('\n✨ GenAI Search test completed!');
}

// Run the test
testGenAISearch().catch(error => {
  console.error('💥 Test failed:', error.message);
});