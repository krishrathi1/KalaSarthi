/**
 * Simple Matching Test
 * Tests the intelligent matching with very low thresholds to see if it works
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9003';

async function testSimpleMatching() {
  console.log('🧪 Testing Simple Matching with Low Thresholds...\n');

  const testCases = [
    {
      name: "Pottery Test (Very Low Threshold)",
      requirements: "pottery",
      filters: {
        maxDistance: undefined, // No distance limit
        minRelevanceScore: 0.1, // Very low threshold
        maxResults: 20
      }
    },
    {
      name: "Wood Test (Very Low Threshold)",
      requirements: "wood",
      filters: {
        maxDistance: undefined,
        minRelevanceScore: 0.1,
        maxResults: 20
      }
    },
    {
      name: "Any Craft (Lowest Threshold)",
      requirements: "handmade",
      filters: {
        maxDistance: undefined,
        minRelevanceScore: 0.01, // Extremely low
        maxResults: 20
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`🔍 ${testCase.name}`);
    console.log(`   Query: "${testCase.requirements}"`);
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
          buyerId: 'simple_test_buyer',
          sessionId: `simple_test_${Date.now()}`
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`   ✅ SUCCESS: Found ${data.data.matches.length} matches`);
        console.log(`   ⚡ Processing time: ${data.data.metadata.processingTime}ms`);
        
        if (data.data.matches.length > 0) {
          console.log(`   🏆 Top matches:`);
          data.data.matches.slice(0, 3).forEach((match, idx) => {
            console.log(`      ${idx + 1}. ${match.artisan.name} - ${(match.relevanceScore.overall * 100).toFixed(1)}% relevance`);
            console.log(`         Skills: ${match.artisan.artisanConnectProfile?.matchingData?.skills?.join(', ') || 'N/A'}`);
            console.log(`         Distance: ${match.locationData.distance}km`);
          });
        }
        
        // Show requirement analysis
        if (data.data.requirementAnalysis) {
          console.log(`   🧠 AI Analysis:`);
          console.log(`      Confidence: ${(data.data.requirementAnalysis.confidence * 100).toFixed(1)}%`);
          console.log(`      Product Types: ${data.data.requirementAnalysis.extractedCriteria.productType.join(', ')}`);
          console.log(`      Materials: ${data.data.requirementAnalysis.extractedCriteria.materials.join(', ')}`);
        }
        
      } else {
        console.log(`   ❌ FAILED: ${data.error?.message || 'Unknown error'}`);
        console.log(`   Code: ${data.error?.code || 'N/A'}`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    console.log(''); // Empty line
  }

  // Test direct database query
  console.log('🔍 Testing Direct Database Query...');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/analytics/matching-performance?metric=overview&timeRange=1d`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('   ✅ Database connection working');
      console.log(`   📊 Analytics data available: ${Object.keys(data.data.analytics).length} metrics`);
    } else {
      console.log('   ❌ Database query failed');
    }
  } catch (error) {
    console.log(`   ❌ Database query error: ${error.message}`);
  }
}

// Run the test
if (require.main === module) {
  testSimpleMatching()
    .then(() => {
      console.log('✨ Simple matching test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Simple matching test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSimpleMatching };