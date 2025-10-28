#!/usr/bin/env node

/**
 * Comprehensive API Testing and Debugging Script
 * Tests all critical API endpoints and identifies errors
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:9003';
const TEST_RESULTS = [];

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Debug-Script/1.0',
        ...headers
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
            headers: res.headers,
            body: jsonBody,
            rawBody: body
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            rawBody: body,
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

// Test result logger
function logTest(testName, endpoint, method, result, expectedStatus = 200) {
  const success = result.status === expectedStatus;
  const testResult = {
    test: testName,
    endpoint: `${method} ${endpoint}`,
    status: result.status,
    success: success,
    error: !success ? result.body : null,
    timestamp: new Date().toISOString()
  };
  
  TEST_RESULTS.push(testResult);
  
  const statusIcon = success ? '✅' : '❌';
  console.log(`${statusIcon} ${testName}: ${method} ${endpoint} - Status: ${result.status}`);
  
  if (!success) {
    console.log(`   Error: ${JSON.stringify(result.body, null, 2)}`);
  }
  
  return testResult;
}

// Test suite functions
async function testHealthEndpoints() {
  console.log('\n🔍 Testing Health Endpoints...');
  
  try {
    const healthResult = await makeRequest('GET', '/api/ai/health');
    logTest('AI Health Check', '/api/ai/health', 'GET', healthResult);
  } catch (error) {
    console.log('❌ AI Health Check failed:', error.message);
  }
}

async function testBuyerConnectEndpoints() {
  console.log('\n🔍 Testing Buyer Connect Endpoints...');
  
  // Test buyer-connect match endpoint
  try {
    const matchData = {
      buyerId: 'test_buyer_123',
      userInput: 'I need traditional pottery for my restaurant',
      sessionId: 'test_session_' + Date.now(),
      filters: {
        priceRange: { min: 500, max: 5000 },
        location: 'India',
        specializations: ['pottery'],
        availability: 'available',
        rating: 4.0
      },
      preferences: {
        maxResults: 5,
        minConfidenceScore: 0.3,
        sortBy: 'confidence',
        includeAlternatives: true
      }
    };
    
    const matchResult = await makeRequest('POST', '/api/buyer-connect/match', matchData);
    logTest('Buyer Connect Match', '/api/buyer-connect/match', 'POST', matchResult);
    
    if (matchResult.status === 200 && matchResult.body.success) {
      console.log(`   Found ${matchResult.body.data.totalMatches} matches`);
    }
  } catch (error) {
    console.log('❌ Buyer Connect Match failed:', error.message);
  }
  
  // Test buyer-connect chat endpoint
  try {
    const chatData = {
      sessionId: 'test_chat_session_' + Date.now(),
      senderId: 'test_buyer_123',
      receiverId: 'test_artisan_456',
      message: 'Hello, I am interested in your pottery work',
      senderLanguage: 'en',
      receiverLanguage: 'hi'
    };
    
    const chatResult = await makeRequest('POST', '/api/buyer-connect/chat', chatData);
    logTest('Buyer Connect Chat', '/api/buyer-connect/chat', 'POST', chatResult);
  } catch (error) {
    console.log('❌ Buyer Connect Chat failed:', error.message);
  }
}

async function testTrendSpotterEndpoints() {
  console.log('\n🔍 Testing Trend Spotter Endpoints...');
  
  // Test trend spotter main endpoint
  try {
    const trendData = {
      userId: 'test_artisan_789',
      forceRefresh: false
    };
    
    const trendResult = await makeRequest('POST', '/api/trend-spotter', trendData);
    logTest('Trend Spotter Analysis', '/api/trend-spotter', 'POST', trendResult);
  } catch (error) {
    console.log('❌ Trend Spotter Analysis failed:', error.message);
  }
  
  // Test trend analysis endpoint
  try {
    const analysisData = {
      artisanProfession: 'pottery',
      location: 'India',
      forceRefresh: false
    };
    
    const analysisResult = await makeRequest('POST', '/api/trend-analysis', analysisData);
    logTest('Trend Analysis', '/api/trend-analysis', 'POST', analysisResult);
  } catch (error) {
    console.log('❌ Trend Analysis failed:', error.message);
  }
}

async function testAIEndpoints() {
  console.log('\n🔍 Testing AI Endpoints...');
  
  // Test artisan buddy chat
  try {
    const buddyData = {
      message: 'How can I improve my pottery business?',
      userId: 'test_user_123',
      sessionId: 'test_buddy_session_' + Date.now()
    };
    
    const buddyResult = await makeRequest('POST', '/api/artisan-buddy/chat', buddyData);
    logTest('Artisan Buddy Chat', '/api/artisan-buddy/chat', 'POST', buddyResult);
  } catch (error) {
    console.log('❌ Artisan Buddy Chat failed:', error.message);
  }
  
  // Test image analysis
  try {
    const imageData = {
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
    };
    
    const imageResult = await makeRequest('POST', '/api/analyze-image', imageData);
    logTest('Image Analysis', '/api/analyze-image', 'POST', imageResult);
  } catch (error) {
    console.log('❌ Image Analysis failed:', error.message);
  }
}

async function testEcommerceEndpoints() {
  console.log('\n🔍 Testing E-commerce Endpoints...');
  
  // Test cart endpoints
  try {
    const cartResult = await makeRequest('GET', '/api/cart?userId=test_user_123');
    logTest('Get Cart', '/api/cart', 'GET', cartResult);
  } catch (error) {
    console.log('❌ Get Cart failed:', error.message);
  }
  
  // Test wishlist endpoints
  try {
    const wishlistResult = await makeRequest('GET', '/api/wishlist?userId=test_user_123');
    logTest('Get Wishlist', '/api/wishlist', 'GET', wishlistResult);
  } catch (error) {
    console.log('❌ Get Wishlist failed:', error.message);
  }
  
  // Test products endpoint
  try {
    const productsResult = await makeRequest('GET', '/api/products?limit=5');
    logTest('Get Products', '/api/products', 'GET', productsResult);
  } catch (error) {
    console.log('❌ Get Products failed:', error.message);
  }
}

async function testFinanceEndpoints() {
  console.log('\n🔍 Testing Finance Endpoints...');
  
  // Test finance advisor
  try {
    const advisorData = {
      tool: 'sales_summary',
      parameters: {
        userId: 'test_artisan_123',
        period: 'month'
      }
    };
    
    const advisorResult = await makeRequest('POST', '/api/finance/advisor', advisorData);
    logTest('Finance Advisor', '/api/finance/advisor', 'POST', advisorResult);
  } catch (error) {
    console.log('❌ Finance Advisor failed:', error.message);
  }
  
  // Test sales data
  try {
    const salesResult = await makeRequest('GET', '/api/finance/sales?userId=test_artisan_123&period=month');
    logTest('Sales Data', '/api/finance/sales', 'GET', salesResult);
  } catch (error) {
    console.log('❌ Sales Data failed:', error.message);
  }
}

async function testVoiceEndpoints() {
  console.log('\n🔍 Testing Voice Endpoints...');
  
  // Test text-to-speech
  try {
    const ttsData = {
      text: 'Hello, this is a test message',
      language: 'en',
      voice: 'female'
    };
    
    const ttsResult = await makeRequest('POST', '/api/text-to-speech', ttsData);
    logTest('Text to Speech', '/api/text-to-speech', 'POST', ttsResult);
  } catch (error) {
    console.log('❌ Text to Speech failed:', error.message);
  }
  
  // Test available voices
  try {
    const voicesResult = await makeRequest('GET', '/api/voices/languages');
    logTest('Available Voices', '/api/voices/languages', 'GET', voicesResult);
  } catch (error) {
    console.log('❌ Available Voices failed:', error.message);
  }
}

async function testTranslationEndpoints() {
  console.log('\n🔍 Testing Translation Endpoints...');
  
  // Test translation
  try {
    const translateData = {
      text: 'Hello, how are you?',
      targetLanguage: 'hi',
      sourceLanguage: 'en'
    };
    
    const translateResult = await makeRequest('POST', '/api/translate', translateData);
    logTest('Translation', '/api/translate', 'POST', translateResult);
  } catch (error) {
    console.log('❌ Translation failed:', error.message);
  }
  
  // Test bulk translation
  try {
    const bulkData = {
      texts: ['Hello', 'How are you?', 'Thank you'],
      targetLanguage: 'hi',
      sourceLanguage: 'en'
    };
    
    const bulkResult = await makeRequest('POST', '/api/bulk-translate', bulkData);
    logTest('Bulk Translation', '/api/bulk-translate', 'POST', bulkResult);
  } catch (error) {
    console.log('❌ Bulk Translation failed:', error.message);
  }
}

// Generate summary report
function generateSummaryReport() {
  console.log('\n📊 TEST SUMMARY REPORT');
  console.log('=' .repeat(50));
  
  const totalTests = TEST_RESULTS.length;
  const passedTests = TEST_RESULTS.filter(t => t.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.log('\n❌ FAILED TESTS:');
    TEST_RESULTS.filter(t => !t.success).forEach(test => {
      console.log(`   ${test.test}: ${test.endpoint} - Status: ${test.status}`);
      if (test.error) {
        console.log(`      Error: ${JSON.stringify(test.error, null, 6)}`);
      }
    });
  }
  
  // Save detailed report to file
  const report = {
    summary: {
      totalTests,
      passedTests,
      failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
      timestamp: new Date().toISOString()
    },
    results: TEST_RESULTS
  };
  
  require('fs').writeFileSync('api-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: api-test-report.json');
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive API Testing...');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('=' .repeat(50));
  
  try {
    await testHealthEndpoints();
    await testBuyerConnectEndpoints();
    await testTrendSpotterEndpoints();
    await testAIEndpoints();
    await testEcommerceEndpoints();
    await testFinanceEndpoints();
    await testVoiceEndpoints();
    await testTranslationEndpoints();
    
    generateSummaryReport();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().then(() => {
    console.log('\n✅ Test suite completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, makeRequest, logTest };