/**
 * Debug Script for Intelligent Artisan Matching System
 * Tests all components of the new AI-powered matching system
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9003';

// Test data
const testRequirements = [
  "I need a handmade pottery vase for my living room",
  "Looking for custom wooden furniture for dining room",
  "Want a silk scarf with traditional Indian patterns",
  "Need leather bags for my boutique store",
  "Custom metal jewelry with modern design"
];

const testLocations = [
  { latitude: 19.0760, longitude: 72.8777, city: "Mumbai" },
  { latitude: 28.7041, longitude: 77.1025, city: "Delhi" },
  { latitude: 12.9716, longitude: 77.5946, city: "Bangalore" }
];

const testFilters = [
  { maxDistance: 25, minRelevanceScore: 0.3 },
  { maxDistance: 50, minRelevanceScore: 0.5 },
  { maxDistance: 100, minRelevanceScore: 0.4 },
  { maxDistance: undefined, minRelevanceScore: 0.3 } // No distance limit
];

async function debugIntelligentMatching() {
  console.log('🚀 Starting Intelligent Matching System Debug...\n');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Health Check
  console.log('📋 Test 1: API Health Check');
  try {
    const response = await fetch(`${BASE_URL}/api/intelligent-match`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check passed:', data);
      passedTests++;
    } else {
      console.log('❌ Health check failed:', response.status);
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    failedTests++;
    totalTests++;
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: Basic Intelligent Matching
  console.log('📋 Test 2: Basic Intelligent Matching');
  for (let i = 0; i < testRequirements.length; i++) {
    const requirement = testRequirements[i];
    const location = testLocations[i % testLocations.length];
    
    console.log(`\n🔍 Testing: "${requirement}" in ${location.city}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/intelligent-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: requirement,
          buyerLocation: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: 100,
            source: 'gps'
          },
          filters: {
            maxDistance: 50,
            minRelevanceScore: 0.3,
            maxResults: 10
          },
          buyerId: `test_buyer_${i + 1}`,
          sessionId: `debug_session_${Date.now()}_${i}`
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Intelligent matching successful');
        console.log(`   📊 Found ${data.data.matches.length} matches`);
        console.log(`   ⚡ Processing time: ${data.data.metadata.processingTime}ms`);
        console.log(`   🎯 Average relevance: ${data.data.metadata.averageRelevanceScore?.toFixed(2) || 'N/A'}`);
        
        // Show top 3 matches
        if (data.data.matches.length > 0) {
          console.log('   🏆 Top matches:');
          data.data.matches.slice(0, 3).forEach((match, idx) => {
            console.log(`      ${idx + 1}. ${match.artisan.name} - ${(match.relevanceScore.overall * 100).toFixed(1)}% relevance, ${match.locationData.distance}km away`);
          });
        }
        
        passedTests++;
      } else {
        console.log('❌ Intelligent matching failed');
        console.log('   Error:', data.error || 'Unknown error');
        failedTests++;
      }
      totalTests++;
    } catch (error) {
      console.log('❌ Request error:', error.message);
      failedTests++;
      totalTests++;
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 3: Filter Variations
  console.log('📋 Test 3: Filter Variations');
  const testReq = "handmade pottery items";
  const testLoc = testLocations[0];

  for (let i = 0; i < testFilters.length; i++) {
    const filter = testFilters[i];
    
    console.log(`\n🔧 Testing filter: ${filter.maxDistance || 'No limit'}km, ${filter.minRelevanceScore} min relevance`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/intelligent-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: testReq,
          buyerLocation: {
            latitude: testLoc.latitude,
            longitude: testLoc.longitude,
            accuracy: 100,
            source: 'gps'
          },
          filters: {
            ...filter,
            maxResults: 20
          },
          buyerId: `filter_test_buyer`,
          sessionId: `filter_session_${Date.now()}_${i}`
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Filter test successful');
        console.log(`   📊 Results: ${data.data.matches.length} matches`);
        console.log(`   🎯 Relevance range: ${data.data.matches.length > 0 ? 
          `${Math.min(...data.data.matches.map(m => m.relevanceScore.overall * 100)).toFixed(1)}% - ${Math.max(...data.data.matches.map(m => m.relevanceScore.overall * 100)).toFixed(1)}%` : 'N/A'}`);
        
        if (data.data.matches.length > 0) {
          const distances = data.data.matches.map(m => m.locationData.distance);
          console.log(`   📍 Distance range: ${Math.min(...distances).toFixed(1)}km - ${Math.max(...distances).toFixed(1)}km`);
        }
        
        passedTests++;
      } else {
        console.log('❌ Filter test failed');
        console.log('   Error:', data.error || 'Unknown error');
        failedTests++;
      }
      totalTests++;
    } catch (error) {
      console.log('❌ Filter test error:', error.message);
      failedTests++;
      totalTests++;
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 4: Location Services
  console.log('📋 Test 4: Location Services');
  
  // Test geocoding
  console.log('\n🌍 Testing Geocoding API');
  try {
    const response = await fetch(`${BASE_URL}/api/location/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: "Mumbai, Maharashtra, India"
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Geocoding successful');
      console.log(`   📍 Coordinates: ${data.location.coordinates.latitude}, ${data.location.coordinates.longitude}`);
      console.log(`   🏙️ Address: ${data.location.address.city}, ${data.location.address.state}`);
      passedTests++;
    } else {
      console.log('❌ Geocoding failed:', data.error);
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Geocoding error:', error.message);
    failedTests++;
    totalTests++;
  }

  // Test reverse geocoding
  console.log('\n🔄 Testing Reverse Geocoding API');
  try {
    const response = await fetch(`${BASE_URL}/api/location/reverse-geocode?lat=19.0760&lng=72.8777`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Reverse geocoding successful');
      console.log(`   🏙️ Address: ${data.address.city}, ${data.address.state}`);
      passedTests++;
    } else {
      console.log('❌ Reverse geocoding failed:', data.error);
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Reverse geocoding error:', error.message);
    failedTests++;
    totalTests++;
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 5: Interaction Tracking
  console.log('📋 Test 5: Interaction Tracking');
  try {
    const response = await fetch(`${BASE_URL}/api/interaction-tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        buyerId: 'debug_buyer_1',
        artisanId: 'debug_artisan_1',
        searchQuery: 'handmade pottery',
        relevanceScore: 0.85,
        action: 'viewed',
        sessionId: `debug_interaction_${Date.now()}`,
        locationData: {
          distance: 25,
          category: 'Local'
        }
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Interaction tracking successful');
      console.log(`   📝 Interaction ID: ${data.data.interactionId}`);
      console.log(`   📊 Learning updated: ${data.data.learningUpdated}`);
      console.log(`   📈 Analytics tracked: ${data.data.analyticsTracked}`);
      passedTests++;
    } else {
      console.log('❌ Interaction tracking failed:', data.error);
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Interaction tracking error:', error.message);
    failedTests++;
    totalTests++;
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 6: Cache Management
  console.log('📋 Test 6: Cache Management');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/cache?action=stats`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Cache stats retrieved');
      console.log(`   📊 Cache configured: ${data.data.config.configured}`);
      console.log(`   🔗 Cache connected: ${data.data.config.connected}`);
      console.log(`   📈 Hit rate: ${(data.data.stats.hitRate * 100).toFixed(1)}%`);
      console.log(`   🗂️ Total keys: ${data.data.stats.totalKeys}`);
      passedTests++;
    } else {
      console.log('❌ Cache stats failed:', data.error);
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Cache stats error:', error.message);
    failedTests++;
    totalTests++;
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 7: Database Indexes
  console.log('📋 Test 7: Database Index Validation');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/database/indexes?action=validate`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Index validation completed');
      console.log(`   ✅ Valid indexes: ${data.data.validation.valid}`);
      console.log(`   📊 Existing: ${data.data.validation.existing.length}`);
      console.log(`   ❌ Missing: ${data.data.validation.missing.length}`);
      
      if (data.data.validation.missing.length > 0) {
        console.log('   🔧 Missing indexes:', data.data.validation.missing.join(', '));
      }
      
      passedTests++;
    } else {
      console.log('❌ Index validation failed:', data.error);
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Index validation error:', error.message);
    failedTests++;
    totalTests++;
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 8: Analytics Dashboard
  console.log('📋 Test 8: Analytics Dashboard');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/analytics/matching-performance?metric=overview&timeRange=7d`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Analytics dashboard accessible');
      console.log(`   📊 Metric: ${data.data.metric}`);
      console.log(`   📅 Time range: ${data.data.timeRange}`);
      console.log(`   📈 Analytics data available: ${Object.keys(data.data.analytics).length} metrics`);
      passedTests++;
    } else {
      console.log('❌ Analytics dashboard failed:', data.error);
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Analytics dashboard error:', error.message);
    failedTests++;
    totalTests++;
  }

  // Final Results
  console.log('\n' + '🎯 INTELLIGENT MATCHING DEBUG RESULTS'.padStart(40) + '\n');
  console.log('='.repeat(60));
  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (failedTests === 0) {
    console.log('🎉 ALL TESTS PASSED! Intelligent Matching System is working perfectly!');
  } else if (passedTests > failedTests) {
    console.log('⚠️  Most tests passed, but some issues need attention.');
  } else {
    console.log('🚨 Multiple failures detected. System needs debugging.');
  }

  console.log('\n🔧 Next Steps:');
  console.log('1. Check server logs for detailed error information');
  console.log('2. Verify database connection and seeded data');
  console.log('3. Ensure all environment variables are configured');
  console.log('4. Test individual components if issues persist');
  
  return {
    totalTests,
    passedTests,
    failedTests,
    successRate: (passedTests / totalTests) * 100
  };
}

// Run the debug script
if (require.main === module) {
  debugIntelligentMatching()
    .then(results => {
      console.log('\n✨ Debug script completed successfully!');
      process.exit(results.failedTests === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Debug script failed:', error);
      process.exit(1);
    });
}

module.exports = { debugIntelligentMatching };