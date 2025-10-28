#!/usr/bin/env node

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

async function testSearch(query, expectedCategory) {
  console.log(`\n🔍 Testing: "${query}"`);
  
  const searchData = {
    buyerId: 'test_buyer_' + Date.now(),
    userInput: query,
    sessionId: 'test_session_' + Date.now(),
    filters: {},
    preferences: {
      maxResults: 5,
      minConfidenceScore: 0.1,
      sortBy: 'confidence',
      includeAlternatives: true
    }
  };
  
  try {
    const result = await makeRequest('POST', '/api/buyer-connect/match', searchData);
    
    if (result.status === 200 && result.body.success) {
      const matches = result.body.data.matches;
      console.log(`✅ Found ${matches.length} matches`);
      
      if (matches.length > 0) {
        matches.forEach((match, index) => {
          console.log(`  ${index + 1}. ${match.artisanProfile.name} - ${match.artisanProfile.artisticProfession}`);
          console.log(`     Location: ${match.artisanProfile.location?.city}, ${match.artisanProfile.location?.state}`);
          console.log(`     Confidence: ${(match.confidenceScore * 100).toFixed(1)}%`);
          console.log(`     Specializations: ${match.artisanProfile.specializations?.join(', ')}`);
        });
      }
      
      const categories = result.body.data.searchMetadata.categories;
      console.log(`📋 Categories detected: ${categories.join(', ')}`);
      
    } else {
      console.log(`❌ Search failed: ${result.body.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Testing Multiple Search Queries');
  console.log('=' .repeat(50));
  
  await testSearch('I need pottery for my restaurant', 'pottery');
  await testSearch('Looking for handloom textiles', 'textiles');
  await testSearch('Need silver jewelry for wedding', 'jewelry');
  await testSearch('Want wood carving for temple', 'wood carving');
  await testSearch('Traditional embroidery work needed', 'embroidery');
  await testSearch('Block printing on fabric', 'block printing');
  await testSearch('Metal craft items for home', 'metal craft');
  await testSearch('Traditional painting art', 'painting');
  
  console.log('\n✅ All tests completed!');
}

runTests();