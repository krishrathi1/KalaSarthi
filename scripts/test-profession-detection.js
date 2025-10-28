/**
 * Test script to verify profession detection is working
 */

// Import the SimpleProfessionMatcher
const { SimpleProfessionMatcher } = require('../src/lib/services/SimpleProfessionMatcher.ts');

async function testProfessionDetection() {
  console.log('🧪 Testing profession detection...');
  
  try {
    const matcher = SimpleProfessionMatcher.getInstance();
    
    const testQueries = [
      'wooden doors for my hotel with traditional Indian carving',
      'silver jewelry for wedding',
      'clay pots for kitchen',
      'handwoven sarees',
      'brass sculptures',
      'traditional paintings'
    ];
    
    console.log('\n📋 Test Results:');
    console.log('================');
    
    for (const query of testQueries) {
      const result = matcher.detectProfession(query);
      console.log(`\n🔍 Query: "${query}"`);
      console.log(`   Profession: ${result.profession}`);
      console.log(`   Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`   Keywords: ${result.matchedKeywords.join(', ')}`);
    }
    
    console.log('\n✅ Profession detection test completed!');
    
  } catch (error) {
    console.error('❌ Error testing profession detection:', error);
  }
}

// Run the test
testProfessionDetection();