#!/usr/bin/env node

/**
 * Frontend Page Testing Script
 * Tests all major pages for loading and basic functionality
 */

const http = require('http');

const BASE_URL = 'http://localhost:9003';
const TEST_RESULTS = [];

function makeRequest(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'User-Agent': 'Frontend-Test-Script/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body,
          size: body.length
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
    
    req.end();
  });
}

function logTest(testName, path, result, expectedStatus = 200) {
  const success = result.status === expectedStatus;
  const testResult = {
    test: testName,
    path: path,
    status: result.status,
    success: success,
    size: result.size,
    timestamp: new Date().toISOString()
  };
  
  TEST_RESULTS.push(testResult);
  
  const statusIcon = success ? '✅' : '❌';
  const sizeInfo = result.size ? `(${(result.size / 1024).toFixed(1)}KB)` : '';
  console.log(`${statusIcon} ${testName}: ${path} - Status: ${result.status} ${sizeInfo}`);
  
  if (!success) {
    console.log(`   Error: Status ${result.status}`);
  }
  
  return testResult;
}

async function testMainPages() {
  console.log('\n🔍 Testing Main Pages...');
  
  const pages = [
    { name: 'Home Page', path: '/' },
    { name: 'Buyer Connect', path: '/buyer-connect' },
    { name: 'Trend Spotter', path: '/trend-spotter' },
    { name: 'Artisan Buddy', path: '/artisan-buddy' },
    { name: 'Marketplace', path: '/marketplace' },
    { name: 'Profile', path: '/profile' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Finance Dashboard', path: '/finance/dashboard' },
    { name: 'Finance Advisor', path: '/finance/advisor' },
    { name: 'Smart Product Creator', path: '/smart-product-creator' },
    { name: 'Voice Demo', path: '/voice-demo' },
    { name: 'Voice Assistant Demo', path: '/voice-assistant-demo' },
    { name: 'Voice Enrollment', path: '/voice-enrollment' },
    { name: 'Auth Page', path: '/auth' },
    { name: 'Yojana Mitra', path: '/yojana-mitra' }
  ];
  
  for (const page of pages) {
    try {
      const result = await makeRequest('GET', page.path);
      logTest(page.name, page.path, result);
    } catch (error) {
      console.log(`❌ ${page.name}: ${page.path} - Error: ${error.message}`);
      TEST_RESULTS.push({
        test: page.name,
        path: page.path,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

async function testMarketplacePages() {
  console.log('\n🔍 Testing Marketplace Pages...');
  
  const marketplacePages = [
    { name: 'Marketplace Cart', path: '/marketplace/cart' },
    { name: 'Marketplace Wishlist', path: '/marketplace/wishlist' }
  ];
  
  for (const page of marketplacePages) {
    try {
      const result = await makeRequest('GET', page.path);
      logTest(page.name, page.path, result);
    } catch (error) {
      console.log(`❌ ${page.name}: ${page.path} - Error: ${error.message}`);
      TEST_RESULTS.push({
        test: page.name,
        path: page.path,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

async function testDashboardPages() {
  console.log('\n🔍 Testing Dashboard Pages...');
  
  const dashboardPages = [
    { name: 'Inventory Dashboard', path: '/dashboard/inventory' }
  ];
  
  for (const page of dashboardPages) {
    try {
      const result = await makeRequest('GET', page.path);
      logTest(page.name, page.path, result);
    } catch (error) {
      console.log(`❌ ${page.name}: ${page.path} - Error: ${error.message}`);
      TEST_RESULTS.push({
        test: page.name,
        path: page.path,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

async function testUtilityPages() {
  console.log('\n🔍 Testing Utility Pages...');
  
  const utilityPages = [
    { name: 'AI Design Generator', path: '/ai-design-generator' },
    { name: 'AI Image Generator', path: '/ai-image-generator' },
    { name: 'Advanced Features', path: '/advanced-features' },
    { name: 'Multi Marketplace', path: '/multi-marketplace' },
    { name: 'Trust Layer', path: '/trust-layer' },
    { name: 'Matchmaking', path: '/matchmaking' },
    { name: 'Test Upload', path: '/test-upload' },
    { name: 'Simple AI Test', path: '/simple-ai-test' },
    { name: 'Scraper Diagnostic', path: '/scraper-diagnostic' },
    { name: 'Ecommerce Scraper Test', path: '/ecommerce-scraper-test' }
  ];
  
  for (const page of utilityPages) {
    try {
      const result = await makeRequest('GET', page.path);
      logTest(page.name, page.path, result);
    } catch (error) {
      console.log(`❌ ${page.name}: ${page.path} - Error: ${error.message}`);
      TEST_RESULTS.push({
        test: page.name,
        path: page.path,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

async function testStaticAssets() {
  console.log('\n🔍 Testing Static Assets...');
  
  const assets = [
    { name: 'Favicon', path: '/favicon.ico' }
  ];
  
  for (const asset of assets) {
    try {
      const result = await makeRequest('GET', asset.path);
      logTest(asset.name, asset.path, result);
    } catch (error) {
      console.log(`❌ ${asset.name}: ${asset.path} - Error: ${error.message}`);
      TEST_RESULTS.push({
        test: asset.name,
        path: asset.path,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

function generateSummaryReport() {
  console.log('\n📊 FRONTEND TEST SUMMARY REPORT');
  console.log('=' .repeat(50));
  
  const totalTests = TEST_RESULTS.length;
  const passedTests = TEST_RESULTS.filter(t => t.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total Pages Tested: ${totalTests}`);
  console.log(`Loaded Successfully: ${passedTests} ✅`);
  console.log(`Failed to Load: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.log('\n❌ FAILED PAGES:');
    TEST_RESULTS.filter(t => !t.success).forEach(test => {
      console.log(`   ${test.test}: ${test.path} - ${test.error || 'Status: ' + test.status}`);
    });
  }
  
  // Calculate total page size
  const totalSize = TEST_RESULTS
    .filter(t => t.success && t.size)
    .reduce((sum, t) => sum + t.size, 0);
  
  console.log(`\n📊 Total Content Size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  
  // Save detailed report
  const report = {
    summary: {
      totalTests,
      passedTests,
      failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      timestamp: new Date().toISOString()
    },
    results: TEST_RESULTS
  };
  
  require('fs').writeFileSync('frontend-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: frontend-test-report.json');
}

async function runAllTests() {
  console.log('🚀 Starting Frontend Page Testing...');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('=' .repeat(50));
  
  try {
    await testMainPages();
    await testMarketplacePages();
    await testDashboardPages();
    await testUtilityPages();
    await testStaticAssets();
    
    generateSummaryReport();
    
  } catch (error) {
    console.error('❌ Frontend test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests().then(() => {
    console.log('\n✅ Frontend test suite completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Frontend test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };