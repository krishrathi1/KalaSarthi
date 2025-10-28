/**
 * Test script to verify the intelligent matching API works
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testIntelligentMatchAPI() {
  console.log('🧪 Testing Intelligent Match API...');
  
  try {
    const response = await fetch('http://localhost:9003/api/intelligent-match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'wooden doors for my hotel with traditional Indian carving',
        maxResults: 10
      })
    });

    if (!response.ok) {
      console.error(`❌ API returned status: ${response.status}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('\n📋 API Response:');
    console.log('================');
    console.log(`Success: ${data.success}`);
    
    if (data.success) {
      console.log(`Total matches: ${data.data.totalFound}`);
      console.log(`Processing time: ${data.data.processingTime}ms`);
      console.log(`Detected profession: ${data.data.queryAnalysis.detectedProfession}`);
      console.log(`Confidence: ${data.data.queryAnalysis.confidence}`);
      
      console.log('\n🎯 Matches:');
      data.data.matches.forEach((match, index) => {
        console.log(`\n${index + 1}. ${match.artisan.name}`);
        console.log(`   Profession: ${match.artisan.artisticProfession}`);
        console.log(`   Relevance: ${match.relevanceScore}`);
        console.log(`   Reason: ${match.explanation.primaryReason}`);
        console.log(`   Location: ${match.artisan.address?.city}, ${match.artisan.address?.state}`);
      });
    } else {
      console.log(`Error: ${data.error.message}`);
    }
    
    console.log('\n✅ API test completed!');
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Run the test
testIntelligentMatchAPI();