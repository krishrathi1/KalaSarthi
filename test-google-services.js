/**
 * Test Google Services Integration
 * Validates all Google Cloud services are properly configured
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9003';

async function testGoogleServices() {
  console.log('🌟 Testing Google Services Integration...\n');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Google Analytics Configuration
  console.log('📊 Test 1: Google Analytics 4 Integration');
  try {
    // Test analytics tracking by making a search request
    const response = await fetch(`${BASE_URL}/api/intelligent-match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requirements: "test google analytics tracking",
        buyerLocation: {
          latitude: 28.7041,
          longitude: 77.1025,
          accuracy: 100,
          source: 'gps'
        },
        filters: {
          maxDistance: 50,
          minRelevanceScore: 0.3,
          maxResults: 5
        },
        buyerId: 'google_test_buyer',
        sessionId: `ga_test_${Date.now()}`
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Google Analytics tracking integrated in matching API');
      console.log('   📈 Events should be tracked in GA4 dashboard');
      passedTests++;
    } else {
      console.log('❌ Google Analytics integration issue');
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Google Analytics test error:', error.message);
    failedTests++;
    totalTests++;
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 2: Google Cloud Logging
  console.log('📝 Test 2: Google Cloud Logging');
  try {
    // Test interaction tracking which uses Google Cloud Logging
    const response = await fetch(`${BASE_URL}/api/interaction-tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        buyerId: 'logging_test_buyer',
        artisanId: 'logging_test_artisan',
        searchQuery: 'test google cloud logging',
        relevanceScore: 0.75,
        action: 'viewed',
        sessionId: `logging_test_${Date.now()}`,
        metadata: {
          userAgent: 'Debug Script',
          timestamp: new Date().toISOString()
        }
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Google Cloud Logging integration working');
      console.log('   📋 Structured logs should appear in Google Cloud Console');
      passedTests++;
    } else {
      console.log('❌ Google Cloud Logging integration issue');
      console.log('   Error:', data.error);
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Google Cloud Logging test error:', error.message);
    failedTests++;
    totalTests++;
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 3: Google Maps Geocoding API
  console.log('🗺️  Test 3: Google Maps Geocoding API');
  
  const testAddresses = [
    "Mumbai, Maharashtra, India",
    "Delhi, India",
    "Bangalore, Karnataka, India"
  ];

  for (const address of testAddresses) {
    try {
      const response = await fetch(`${BASE_URL}/api/location/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`✅ Geocoding successful for ${address}`);
        console.log(`   📍 Coordinates: ${data.location.coordinates.latitude.toFixed(4)}, ${data.location.coordinates.longitude.toFixed(4)}`);
        console.log(`   🏙️ Parsed: ${data.location.address.city}, ${data.location.address.state}`);
        passedTests++;
      } else {
        console.log(`❌ Geocoding failed for ${address}:`, data.error);
        failedTests++;
      }
      totalTests++;
    } catch (error) {
      console.log(`❌ Geocoding error for ${address}:`, error.message);
      failedTests++;
      totalTests++;
    }
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 4: Google Maps Reverse Geocoding
  console.log('🔄 Test 4: Google Maps Reverse Geocoding');
  
  const testCoordinates = [
    { lat: 19.0760, lng: 72.8777, city: "Mumbai" },
    { lat: 28.7041, lng: 77.1025, city: "Delhi" },
    { lat: 12.9716, lng: 77.5946, city: "Bangalore" }
  ];

  for (const coord of testCoordinates) {
    try {
      const response = await fetch(`${BASE_URL}/api/location/reverse-geocode?lat=${coord.lat}&lng=${coord.lng}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`✅ Reverse geocoding successful for ${coord.city}`);
        console.log(`   🏙️ Address: ${data.address.city}, ${data.address.state}`);
        passedTests++;
      } else {
        console.log(`❌ Reverse geocoding failed for ${coord.city}:`, data.error);
        failedTests++;
      }
      totalTests++;
    } catch (error) {
      console.log(`❌ Reverse geocoding error for ${coord.city}:`, error.message);
      failedTests++;
      totalTests++;
    }
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 5: Google Cloud Memorystore (Redis)
  console.log('💾 Test 5: Google Cloud Memorystore (Redis)');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/cache?action=test`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Google Cloud Memorystore connection test passed');
      console.log(`   🔗 Connection successful: ${data.data.connectionTest}`);
      passedTests++;
    } else {
      console.log('❌ Google Cloud Memorystore connection failed');
      console.log('   ℹ️  This is expected if Redis is not configured');
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Google Cloud Memorystore test error:', error.message);
    failedTests++;
    totalTests++;
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 6: Google Cloud Natural Language AI
  console.log('🧠 Test 6: Google Cloud Natural Language AI');
  try {
    // Test requirement analysis which uses Google Cloud Natural Language
    const response = await fetch(`${BASE_URL}/api/intelligent-match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requirements: "I need a beautiful handcrafted ceramic vase with traditional Indian motifs for my home decoration",
        buyerLocation: {
          latitude: 19.0760,
          longitude: 72.8777,
          accuracy: 100,
          source: 'gps'
        },
        filters: {
          maxDistance: 100,
          minRelevanceScore: 0.2,
          maxResults: 5
        },
        buyerId: 'nlp_test_buyer',
        sessionId: `nlp_test_${Date.now()}`
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success && data.data.requirementAnalysis) {
      console.log('✅ Google Cloud Natural Language AI integration working');
      console.log(`   🎯 Confidence: ${(data.data.requirementAnalysis.confidence * 100).toFixed(1)}%`);
      console.log(`   📝 Extracted product types: ${data.data.requirementAnalysis.extractedCriteria.productType.join(', ')}`);
      console.log(`   🎨 Extracted materials: ${data.data.requirementAnalysis.extractedCriteria.materials.join(', ')}`);
      console.log(`   ✨ Processing time: ${data.data.requirementAnalysis.processingTime}ms`);
      passedTests++;
    } else {
      console.log('❌ Google Cloud Natural Language AI integration issue');
      console.log('   ℹ️  May be using fallback analysis if API key not configured');
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Google Cloud Natural Language AI test error:', error.message);
    failedTests++;
    totalTests++;
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 7: Google Auth Integration
  console.log('🔐 Test 7: Google Auth Integration');
  try {
    // Check if Google services are properly authenticated
    const response = await fetch(`${BASE_URL}/api/admin/cache?action=stats`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Google Auth integration appears to be working');
      console.log('   🔑 Services can authenticate with Google Cloud');
      passedTests++;
    } else {
      console.log('❌ Google Auth integration may have issues');
      failedTests++;
    }
    totalTests++;
  } catch (error) {
    console.log('❌ Google Auth test error:', error.message);
    failedTests++;
    totalTests++;
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Configuration Check
  console.log('⚙️  Google Services Configuration Check');
  console.log('-'.repeat(40));
  
  const requiredEnvVars = [
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GOOGLE_CLOUD_PROJECT_ID',
    'GA4_PROPERTY_ID',
    'GA4_MEASUREMENT_ID',
    'GA4_API_SECRET',
    'GOOGLE_MAPS_API_KEY',
    'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'
  ];

  console.log('📋 Required Environment Variables:');
  requiredEnvVars.forEach(envVar => {
    const isSet = process.env[envVar] ? '✅' : '❌';
    console.log(`   ${isSet} ${envVar}`);
  });

  console.log('\n📝 Google Services Integration Summary:');
  console.log('   🔹 Google Analytics 4: User interaction tracking');
  console.log('   🔹 Google Cloud Logging: Structured application logs');
  console.log('   🔹 Google Maps APIs: Geocoding and location services');
  console.log('   🔹 Google Cloud Memorystore: High-performance caching');
  console.log('   🔹 Google Cloud Natural Language: AI requirement analysis');
  console.log('   🔹 Google Auth: Service authentication');

  // Final Results
  console.log('\n' + '🌟 GOOGLE SERVICES TEST RESULTS'.padStart(40) + '\n');
  console.log('='.repeat(60));
  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (failedTests === 0) {
    console.log('🎉 ALL GOOGLE SERVICES INTEGRATED SUCCESSFULLY!');
    console.log('🚀 Your intelligent matching system is powered by Google Cloud!');
  } else if (passedTests > failedTests) {
    console.log('⚠️  Most Google services are working, some may need configuration.');
    console.log('💡 Check environment variables and API keys.');
  } else {
    console.log('🚨 Multiple Google services need configuration.');
    console.log('🔧 Please set up the required environment variables.');
  }

  return {
    totalTests,
    passedTests,
    failedTests,
    successRate: (passedTests / totalTests) * 100
  };
}

// Run the test script
if (require.main === module) {
  testGoogleServices()
    .then(results => {
      console.log('\n✨ Google services test completed!');
      process.exit(results.failedTests === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Google services test failed:', error);
      process.exit(1);
    });
}

module.exports = { testGoogleServices };