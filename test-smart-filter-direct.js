/**
 * Direct SmartFilter Test
 * Test the SmartFilter logic directly to see why it's not finding matches
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9003';

async function testSmartFilterDirect() {
  console.log('🧪 Testing SmartFilter Logic Directly...\n');

  // Test with very simple requirements and low thresholds
  const testCases = [
    {
      name: "Pottery with 0.1 threshold",
      requirements: "pottery",
      filters: {
        minRelevanceScore: 0.1,
        maxResults: 20,
        maxDistance: undefined
      }
    },
    {
      name: "Wood with 0.1 threshold",
      requirements: "wood",
      filters: {
        minRelevanceScore: 0.1,
        maxResults: 20,
        maxDistance: undefined
      }
    },
    {
      name: "Jewelry with 0.1 threshold",
      requirements: "jewelry",
      filters: {
        minRelevanceScore: 0.1,
        maxResults: 20,
        maxDistance: undefined
      }
    },
    {
      name: "Any craft with 0.05 threshold",
      requirements: "craft",
      filters: {
        minRelevanceScore: 0.05,
        maxResults: 20,
        maxDistance: undefined
      }
    },
    {
      name: "Single letter with 0.01 threshold",
      requirements: "a",
      filters: {
        minRelevanceScore: 0.01,
        maxResults: 20,
        maxDistance: undefined
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`🔍 ${testCase.name}`);
    console.log(`   Requirements: "${testCase.requirements}"`);
    console.log(`   Min Relevance: ${testCase.filters.minRelevanceScore}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/intelligent-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: testCase.requirements,
          buyerLocation: {
            latitude: 19.0760,
            longitude: 72.8777,
            accuracy: 100,
            source: 'gps'
          },
          filters: testCase.filters,
          buyerId: 'direct_test_buyer',
          sessionId: `direct_test_${Date.now()}`
        })
      });

      const data = await response.json();
      
      console.log(`   Status: ${response.status}`);
      
      if (response.ok && data.success) {
        console.log(`   ✅ SUCCESS: Found ${data.data.matches.length} matches`);
        console.log(`   ⚡ Processing time: ${data.data.metadata.processingTime}ms`);
        
        if (data.data.matches.length > 0) {
          console.log(`   🏆 Sample match: ${data.data.matches[0].artisan.name} - ${(data.data.matches[0].relevanceScore.overall * 100).toFixed(1)}%`);
        }
        
        // Show requirement analysis details
        if (data.data.requirementAnalysis) {
          console.log(`   🧠 Analysis confidence: ${(data.data.requirementAnalysis.confidence * 100).toFixed(1)}%`);
          console.log(`   📝 Extracted: ${data.data.requirementAnalysis.extractedCriteria.productType.join(', ') || 'None'}`);
        }
        
      } else {
        console.log(`   ❌ FAILED: ${data.error?.message || 'Unknown error'}`);
        console.log(`   📋 Code: ${data.error?.code || 'N/A'}`);
        
        // If it's a relaxed search, show that info
        if (data.data?.metadata?.relaxedSearch) {
          console.log(`   🔄 Relaxed search attempted`);
          console.log(`   📊 Relaxed matches: ${data.data.matches?.length || 0}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    console.log(''); // Empty line
  }

  // Test with a very specific match that should work
  console.log('🎯 Testing Specific Known Match:');
  console.log('   Looking for "Rajesh Kumar" who specializes in pottery...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/intelligent-match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requirements: "pottery ceramics clay vase",
        buyerLocation: {
          latitude: 19.0760, // Mumbai - same as Rajesh Kumar
          longitude: 72.8777,
          accuracy: 100,
          source: 'gps'
        },
        filters: {
          minRelevanceScore: 0.01, // Very low threshold
          maxResults: 20,
          maxDistance: undefined
        },
        buyerId: 'specific_test_buyer',
        sessionId: `specific_test_${Date.now()}`
      })
    });

    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok && data.success) {
      console.log(`   ✅ SUCCESS: Found ${data.data.matches.length} matches`);
      
      if (data.data.matches.length > 0) {
        console.log(`   🏆 Matches found:`);
        data.data.matches.forEach((match, idx) => {
          console.log(`      ${idx + 1}. ${match.artisan.name} - ${(match.relevanceScore.overall * 100).toFixed(1)}% relevance`);
          console.log(`         Skills: ${match.artisan.artisanConnectProfile?.matchingData?.skills?.join(', ') || 'N/A'}`);
        });
      }
    } else {
      console.log(`   ❌ FAILED: Even specific pottery search failed`);
      console.log(`   📋 This suggests an issue with the SmartFilter logic`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
}

// Run the test
if (require.main === module) {
  testSmartFilterDirect()
    .then(() => {
      console.log('✨ SmartFilter direct test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 SmartFilter direct test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSmartFilterDirect };