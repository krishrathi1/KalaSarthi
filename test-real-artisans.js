#!/usr/bin/env node

/**
 * Test Real Artisan Matching
 * Tests if the buyer connect API can find real artisans from the database
 */

const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9003,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: body,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testRealArtisanMatching() {
  console.log('🔍 Testing Real Artisan Matching...');
  
  // Test different search queries to see if we get real artisans
  const testQueries = [
    {
      name: 'Pottery Search',
      query: 'I need traditional pottery for my restaurant',
      expectedCategories: ['pottery', 'ceramics']
    },
    {
      name: 'Textile Search', 
      query: 'Looking for handloom textiles and embroidery work',
      expectedCategories: ['textiles', 'embroidery']
    },
    {
      name: 'Jewelry Search',
      query: 'Need silver jewelry for wedding collection',
      expectedCategories: ['jewelry', 'silver']
    },
    {
      name: 'Wood Carving Search',
      query: 'Want traditional wood carvings for temple decoration',
      expectedCategories: ['wood', 'carving']
    },
    {
      name: 'General Handicraft Search',
      query: 'Looking for authentic Indian handicrafts',
      expectedCategories: ['handicrafts', 'traditional']
    }
  ];
  
  for (const testQuery of testQueries) {
    console.log(`\n🔍 Testing: ${testQuery.name}`);
    console.log(`Query: "${testQuery.query}"`);
    
    const searchData = {
      buyerId: 'test_buyer_' + Date.now(),
      userInput: testQuery.query,
      sessionId: 'test_session_' + Date.now(),
      filters: {
        priceRange: { min: 1000, max: 100000 },
        availability: 'available'
      },
      preferences: {
        maxResults: 10,
        minConfidenceScore: 0.1, // Lower threshold to see more results
        sortBy: 'confidence',
        includeAlternatives: true
      }
    };
    
    try {
      const result = await makeRequest('POST', '/api/buyer-connect/match', searchData);
      
      if (result.status === 200 && result.body.success) {
        const matches = result.body.data.matches;
        console.log(`✅ Found ${matches.length} artisan matches`);
        
        if (matches.length > 0) {
          console.log('📋 Artisan Details:');
          matches.forEach((match, index) => {
            console.log(`  ${index + 1}. ${match.artisanProfile.name} - ${match.artisanProfile.artisticProfession}`);
            console.log(`     Location: ${match.artisanProfile.location?.city}, ${match.artisanProfile.location?.state}`);
            console.log(`     Confidence: ${(match.confidenceScore * 100).toFixed(1)}%`);
            console.log(`     Specializations: ${match.artisanProfile.specializations?.join(', ') || 'N/A'}`);
            console.log(`     Availability: ${match.artisanProfile.availabilityStatus}`);
            console.log('');
          });
          
          // Check if we got real artisans (not mock data)
          const realArtisans = matches.filter(m => 
            m.artisanId.startsWith('artisan_') && 
            !m.artisanId.includes('mock')
          );
          
          if (realArtisans.length > 0) {
            console.log(`🎉 Found ${realArtisans.length} REAL artisans from database!`);
          } else {
            console.log('⚠️ Only mock artisans found - real database matching may need improvement');
          }
        } else {
          console.log('⚠️ No matches found for this query');
        }
        
        // Show market insights
        if (result.body.data.marketInsights) {
          const insights = result.body.data.marketInsights;
          console.log('💡 Market Insights:');
          console.log(`   Average Pricing: ₹${insights.averagePricing.min} - ₹${insights.averagePricing.max}`);
          console.log(`   Demand Level: ${insights.demandLevel}`);
          console.log(`   Availability: ${insights.availabilityTrend}`);
        }
        
      } else {
        console.log(`❌ Search failed: ${result.body.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
    
    console.log('-'.repeat(60));
  }
}

async function testDirectDatabaseQuery() {
  console.log('\n🗄️ Testing Direct Database Query...');
  
  // This would require connecting to MongoDB directly
  // For now, we'll just test the API's ability to find artisans
  console.log('Note: Direct database testing would require MongoDB connection');
  console.log('The API tests above show if real artisans are being matched');
}

async function main() {
  console.log('🚀 Testing Real Artisan Matching System');
  console.log('=' .repeat(60));
  
  await testRealArtisanMatching();
  await testDirectDatabaseQuery();
  
  console.log('\n✅ Real artisan matching test completed!');
  console.log('\n💡 Summary:');
  console.log('- If you see "REAL artisans from database", the system is working correctly');
  console.log('- If you only see mock artisans, the matching algorithm needs to be updated');
  console.log('- The database now has 14 artisans and 12 buyers ready for testing');
}

main().catch(console.error);