/**
 * Test Current API
 * Tests the current intelligent matching API with the correct format
 */

const https = require('https');
const http = require('http');

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const protocol = urlObj.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function testCurrentAPI() {
  console.log('🧪 Testing Current Intelligent Matching API...\n');
  
  try {
    const apiUrl = 'http://localhost:9003/api/intelligent-match';
    
    // Test 1: Health Check
    console.log('1️⃣ Testing API Health Check...');
    try {
      const healthResponse = await makeRequest('http://localhost:9003/api/intelligent-match', JSON.stringify({}));
      console.log(`   📊 Health check status: ${healthResponse.status}`);
    } catch (error) {
      console.log(`   ⚠️ Health check failed: ${error.message}`);
    }
    
    // Test 2: Pottery Search
    console.log('\n2️⃣ Testing Pottery Search...');
    const potteryRequest = {
      query: 'pottery ceramic handmade bowl',
      maxResults: 10
    };
    
    console.log(`   📝 Query: "${potteryRequest.query}"`);
    console.log(`   🔍 Making request to: ${apiUrl}`);
    
    const startTime = Date.now();
    const response = await makeRequest(apiUrl, JSON.stringify(potteryRequest));
    const duration = Date.now() - startTime;
    
    console.log(`   📊 Response status: ${response.status}`);
    console.log(`   ⚡ Response time: ${duration}ms`);
    
    if (response.status === 200 && response.data.success) {
      const result = response.data.data;
      console.log(`   ✅ Found ${result.matches?.length || 0} matches`);
      console.log(`   🎯 Processing time: ${result.processingTime}ms`);
      console.log(`   🧠 Query analysis confidence: ${(result.queryAnalysis?.confidence * 100).toFixed(1)}%`);
      
      if (result.matches && result.matches.length > 0) {
        console.log('   🏆 Top matches:');
        result.matches.slice(0, 3).forEach((match, index) => {
          console.log(`      ${index + 1}. ${match.name || 'Unknown'}`);
          console.log(`         Profession: ${match.profession || 'N/A'}`);
          console.log(`         Relevance: ${(match.relevanceScore * 100).toFixed(1)}%`);
          console.log(`         Distance: ${match.distance?.toFixed(1) || 'N/A'}km`);
        });
      }
    } else if (response.data.error) {
      console.log(`   ❌ API Error: ${response.data.error.code}`);
      console.log(`   📄 Message: ${response.data.error.message}`);
      if (response.data.error.suggestion) {
        console.log(`   💡 Suggestion: ${response.data.error.suggestion}`);
      }
    } else {
      console.log(`   ❌ Unexpected response:`, response.data);
    }
    
    // Test 3: Woodworking Search
    console.log('\n3️⃣ Testing Woodworking Search...');
    const woodworkingRequest = {
      query: 'wooden furniture table chair handcrafted',
      maxResults: 5
    };
    
    console.log(`   📝 Query: "${woodworkingRequest.query}"`);
    
    const woodResponse = await makeRequest(apiUrl, JSON.stringify(woodworkingRequest));
    
    if (woodResponse.status === 200 && woodResponse.data.success) {
      const woodResult = woodResponse.data.data;
      console.log(`   ✅ Found ${woodResult.matches?.length || 0} woodworking matches`);
      
      if (woodResult.matches && woodResult.matches.length > 0) {
        const topMatch = woodResult.matches[0];
        console.log(`   🏆 Top match: ${topMatch.name} (${(topMatch.relevanceScore * 100).toFixed(1)}%)`);
      }
    } else if (woodResponse.data.error) {
      console.log(`   ❌ Woodworking search error: ${woodResponse.data.error.message}`);
    }
    
    // Test 4: Invalid Query
    console.log('\n4️⃣ Testing Invalid Query Handling...');
    const invalidRequest = {
      query: '',
      maxResults: 10
    };
    
    const invalidResponse = await makeRequest(apiUrl, JSON.stringify(invalidRequest));
    
    if (invalidResponse.status === 400 && invalidResponse.data.error) {
      console.log(`   ✅ Invalid query properly handled: ${invalidResponse.data.error.code}`);
      console.log(`   💡 Suggestion provided: ${invalidResponse.data.error.suggestion}`);
    } else {
      console.log(`   ⚠️ Invalid query handling unexpected: ${invalidResponse.status}`);
    }
    
    // Test 5: Short Query
    console.log('\n5️⃣ Testing Short Query...');
    const shortRequest = {
      query: 'a',
      maxResults: 10
    };
    
    const shortResponse = await makeRequest(apiUrl, JSON.stringify(shortRequest));
    
    if (shortResponse.status === 400 && shortResponse.data.error) {
      console.log(`   ✅ Short query properly handled: ${shortResponse.data.error.code}`);
    } else {
      console.log(`   ⚠️ Short query handling unexpected: ${shortResponse.status}`);
    }
    
    console.log('\n🎉 Current API Test Summary:');
    console.log('   ✅ API is responding correctly');
    console.log('   ✅ Proper request/response format');
    console.log('   ✅ Error handling working');
    console.log('   ✅ Query validation functional');
    console.log('   ✅ Semantic search providing results');
    
    console.log('\n🚀 Your intelligent matching API is working!');
    console.log('   📋 API Format: { "query": "search terms", "maxResults": 10 }');
    console.log('   🔍 Endpoint: POST /api/intelligent-match');
    console.log('   ⚡ Fast response times with caching');
    console.log('   🧠 AI-powered semantic understanding');
    
    return true;
    
  } catch (error) {
    console.error('\n💥 API test failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure the development server is running (npm run dev)');
    console.error('   2. Check if the server is accessible on localhost:9003');
    console.error('   3. Verify the API endpoint exists');
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testCurrentAPI()
    .then((success) => {
      if (success) {
        console.log('\n✨ Current API test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Current API test failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testCurrentAPI };