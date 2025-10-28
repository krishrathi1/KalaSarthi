#!/usr/bin/env node

/**
 * End-to-End Workflow Testing Script
 * Tests complete user workflows to ensure everything works together
 */

const http = require('http');

const BASE_URL = 'http://localhost:9003';
const TEST_RESULTS = [];

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
        'User-Agent': 'Workflow-Test-Script/1.0',
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

function logWorkflowStep(stepName, success, details = '') {
  const icon = success ? '✅' : '❌';
  console.log(`  ${icon} ${stepName}${details ? ': ' + details : ''}`);
  return success;
}

async function testBuyerConnectWorkflow() {
  console.log('\n🛒 Testing Buyer Connect Workflow...');
  
  let workflowSuccess = true;
  
  try {
    // Step 1: Search for artisans
    console.log('Step 1: Searching for artisans...');
    const searchData = {
      buyerId: 'workflow_buyer_' + Date.now(),
      userInput: 'I need traditional pottery for my restaurant',
      sessionId: 'workflow_session_' + Date.now(),
      filters: {
        priceRange: { min: 500, max: 5000 },
        specializations: ['pottery'],
        availability: 'available'
      },
      preferences: {
        maxResults: 3,
        minConfidenceScore: 0.3,
        sortBy: 'confidence'
      }
    };
    
    const searchResult = await makeRequest('POST', '/api/buyer-connect/match', searchData);
    const searchSuccess = searchResult.status === 200 && searchResult.body.success;
    logWorkflowStep('Search for artisans', searchSuccess, 
      searchSuccess ? `Found ${searchResult.body.data.totalMatches} matches` : 'Search failed');
    workflowSuccess = workflowSuccess && searchSuccess;
    
    if (searchSuccess && searchResult.body.data.matches.length > 0) {
      // Step 2: Start chat with first artisan
      console.log('Step 2: Starting chat with artisan...');
      const artisan = searchResult.body.data.matches[0];
      const chatData = {
        sessionId: 'chat_' + Date.now(),
        senderId: searchData.buyerId,
        receiverId: artisan.artisanId,
        message: 'Hello, I am interested in your pottery work for my restaurant',
        senderLanguage: 'en',
        receiverLanguage: 'hi'
      };
      
      const chatResult = await makeRequest('POST', '/api/buyer-connect/chat', chatData);
      const chatSuccess = chatResult.status === 200 && chatResult.body.success;
      logWorkflowStep('Start chat conversation', chatSuccess,
        chatSuccess ? 'Message sent successfully' : 'Chat failed');
      workflowSuccess = workflowSuccess && chatSuccess;
    }
    
  } catch (error) {
    logWorkflowStep('Buyer Connect Workflow', false, error.message);
    workflowSuccess = false;
  }
  
  return workflowSuccess;
}

async function testTrendSpotterWorkflow() {
  console.log('\n📈 Testing Trend Spotter Workflow...');
  
  let workflowSuccess = true;
  
  try {
    // Step 1: Get trend analysis
    console.log('Step 1: Getting trend analysis...');
    const trendData = {
      userId: 'workflow_artisan_' + Date.now(),
      forceRefresh: false
    };
    
    const trendResult = await makeRequest('POST', '/api/trend-spotter', trendData);
    const trendSuccess = trendResult.status === 200 && trendResult.body.success;
    logWorkflowStep('Get trend analysis', trendSuccess,
      trendSuccess ? 'Analysis completed' : 'Analysis failed');
    workflowSuccess = workflowSuccess && trendSuccess;
    
    // Step 2: Get detailed trend analysis
    console.log('Step 2: Getting detailed analysis...');
    const detailData = {
      artisanProfession: 'pottery',
      forceRefresh: false
    };
    
    const detailResult = await makeRequest('POST', '/api/trend-analysis', detailData);
    const detailSuccess = detailResult.status === 200 && detailResult.body.success;
    logWorkflowStep('Get detailed analysis', detailSuccess,
      detailSuccess ? 'Detailed analysis completed' : 'Detailed analysis failed');
    workflowSuccess = workflowSuccess && detailSuccess;
    
  } catch (error) {
    logWorkflowStep('Trend Spotter Workflow', false, error.message);
    workflowSuccess = false;
  }
  
  return workflowSuccess;
}

async function testArtisanBuddyWorkflow() {
  console.log('\n🤖 Testing Artisan Buddy Workflow...');
  
  let workflowSuccess = true;
  
  try {
    // Step 1: Ask for business advice
    console.log('Step 1: Asking for business advice...');
    const buddyData = {
      message: 'How can I improve my pottery business and increase sales?',
      userId: 'workflow_artisan_' + Date.now(),
      sessionId: 'buddy_session_' + Date.now()
    };
    
    const buddyResult = await makeRequest('POST', '/api/artisan-buddy/chat', buddyData);
    const buddySuccess = buddyResult.status === 200 && buddyResult.body.success;
    logWorkflowStep('Get business advice', buddySuccess,
      buddySuccess ? 'Advice received' : 'Advice request failed');
    workflowSuccess = workflowSuccess && buddySuccess;
    
    // Step 2: Analyze product image
    console.log('Step 2: Analyzing product image...');
    const imageData = {
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
    };
    
    const imageResult = await makeRequest('POST', '/api/analyze-image', imageData);
    const imageSuccess = imageResult.status === 200;
    logWorkflowStep('Analyze product image', imageSuccess,
      imageSuccess ? 'Image analyzed' : 'Image analysis failed');
    workflowSuccess = workflowSuccess && imageSuccess;
    
  } catch (error) {
    logWorkflowStep('Artisan Buddy Workflow', false, error.message);
    workflowSuccess = false;
  }
  
  return workflowSuccess;
}

async function testEcommerceWorkflow() {
  console.log('\n🛍️ Testing E-commerce Workflow...');
  
  let workflowSuccess = true;
  
  try {
    const userId = 'workflow_user_' + Date.now();
    
    // Step 1: Browse products
    console.log('Step 1: Browsing products...');
    const productsResult = await makeRequest('GET', '/api/products?limit=5');
    const productsSuccess = productsResult.status === 200;
    logWorkflowStep('Browse products', productsSuccess,
      productsSuccess ? `Found ${productsResult.body.products?.length || 0} products` : 'Product browsing failed');
    workflowSuccess = workflowSuccess && productsSuccess;
    
    // Step 2: Check cart
    console.log('Step 2: Checking cart...');
    const cartResult = await makeRequest('GET', `/api/cart?userId=${userId}`);
    const cartSuccess = cartResult.status === 200;
    logWorkflowStep('Check cart', cartSuccess,
      cartSuccess ? 'Cart accessed' : 'Cart access failed');
    workflowSuccess = workflowSuccess && cartSuccess;
    
    // Step 3: Check wishlist
    console.log('Step 3: Checking wishlist...');
    const wishlistResult = await makeRequest('GET', `/api/wishlist?userId=${userId}`);
    const wishlistSuccess = wishlistResult.status === 200;
    logWorkflowStep('Check wishlist', wishlistSuccess,
      wishlistSuccess ? 'Wishlist accessed' : 'Wishlist access failed');
    workflowSuccess = workflowSuccess && wishlistSuccess;
    
  } catch (error) {
    logWorkflowStep('E-commerce Workflow', false, error.message);
    workflowSuccess = false;
  }
  
  return workflowSuccess;
}

async function testFinanceWorkflow() {
  console.log('\n💰 Testing Finance Workflow...');
  
  let workflowSuccess = true;
  
  try {
    const userId = 'workflow_artisan_' + Date.now();
    
    // Step 1: Get sales summary
    console.log('Step 1: Getting sales summary...');
    const salesData = {
      tool: 'sales_summary',
      parameters: {
        userId: userId,
        period: 'month'
      }
    };
    
    const salesResult = await makeRequest('POST', '/api/finance/advisor', salesData);
    const salesSuccess = salesResult.status === 200;
    logWorkflowStep('Get sales summary', salesSuccess,
      salesSuccess ? 'Sales data retrieved' : 'Sales data failed');
    workflowSuccess = workflowSuccess && salesSuccess;
    
    // Step 2: Get sales data
    console.log('Step 2: Getting detailed sales data...');
    const detailSalesResult = await makeRequest('GET', `/api/finance/sales?userId=${userId}&period=month`);
    const detailSalesSuccess = detailSalesResult.status === 200;
    logWorkflowStep('Get detailed sales', detailSalesSuccess,
      detailSalesSuccess ? 'Detailed sales retrieved' : 'Detailed sales failed');
    workflowSuccess = workflowSuccess && detailSalesSuccess;
    
  } catch (error) {
    logWorkflowStep('Finance Workflow', false, error.message);
    workflowSuccess = false;
  }
  
  return workflowSuccess;
}

async function testTranslationWorkflow() {
  console.log('\n🌐 Testing Translation Workflow...');
  
  let workflowSuccess = true;
  
  try {
    // Step 1: Single translation
    console.log('Step 1: Single text translation...');
    const translateData = {
      text: 'Hello, how are you?',
      targetLanguage: 'hi',
      sourceLanguage: 'en'
    };
    
    const translateResult = await makeRequest('POST', '/api/translate', translateData);
    const translateSuccess = translateResult.status === 200;
    logWorkflowStep('Single translation', translateSuccess,
      translateSuccess ? `Translated: "${translateResult.body.translation}"` : 'Translation failed');
    workflowSuccess = workflowSuccess && translateSuccess;
    
    // Step 2: Bulk translation
    console.log('Step 2: Bulk translation...');
    const bulkData = {
      texts: ['Hello', 'Thank you', 'Goodbye'],
      targetLanguage: 'hi',
      sourceLanguage: 'en'
    };
    
    const bulkResult = await makeRequest('POST', '/api/bulk-translate', bulkData);
    const bulkSuccess = bulkResult.status === 200;
    logWorkflowStep('Bulk translation', bulkSuccess,
      bulkSuccess ? `Translated ${bulkData.texts.length} texts` : 'Bulk translation failed');
    workflowSuccess = workflowSuccess && bulkSuccess;
    
  } catch (error) {
    logWorkflowStep('Translation Workflow', false, error.message);
    workflowSuccess = false;
  }
  
  return workflowSuccess;
}

function generateWorkflowReport(results) {
  console.log('\n📊 WORKFLOW TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const totalWorkflows = results.length;
  const passedWorkflows = results.filter(r => r.success).length;
  const failedWorkflows = totalWorkflows - passedWorkflows;
  
  console.log(`Total Workflows Tested: ${totalWorkflows}`);
  console.log(`Successful Workflows: ${passedWorkflows} ✅`);
  console.log(`Failed Workflows: ${failedWorkflows} ❌`);
  console.log(`Success Rate: ${((passedWorkflows / totalWorkflows) * 100).toFixed(1)}%`);
  
  if (failedWorkflows > 0) {
    console.log('\n❌ FAILED WORKFLOWS:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   ${result.name}`);
    });
  }
  
  // Save report
  const report = {
    summary: {
      totalWorkflows,
      passedWorkflows,
      failedWorkflows,
      successRate: ((passedWorkflows / totalWorkflows) * 100).toFixed(1) + '%',
      timestamp: new Date().toISOString()
    },
    workflows: results
  };
  
  require('fs').writeFileSync('workflow-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: workflow-test-report.json');
}

async function runAllWorkflowTests() {
  console.log('🚀 Starting End-to-End Workflow Testing...');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('=' .repeat(50));
  
  const results = [];
  
  try {
    // Test all workflows
    const buyerConnectSuccess = await testBuyerConnectWorkflow();
    results.push({ name: 'Buyer Connect Workflow', success: buyerConnectSuccess });
    
    const trendSpotterSuccess = await testTrendSpotterWorkflow();
    results.push({ name: 'Trend Spotter Workflow', success: trendSpotterSuccess });
    
    const artisanBuddySuccess = await testArtisanBuddyWorkflow();
    results.push({ name: 'Artisan Buddy Workflow', success: artisanBuddySuccess });
    
    const ecommerceSuccess = await testEcommerceWorkflow();
    results.push({ name: 'E-commerce Workflow', success: ecommerceSuccess });
    
    const financeSuccess = await testFinanceWorkflow();
    results.push({ name: 'Finance Workflow', success: financeSuccess });
    
    const translationSuccess = await testTranslationWorkflow();
    results.push({ name: 'Translation Workflow', success: translationSuccess });
    
    generateWorkflowReport(results);
    
  } catch (error) {
    console.error('❌ Workflow test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllWorkflowTests().then(() => {
    console.log('\n✅ Workflow test suite completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Workflow test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllWorkflowTests };