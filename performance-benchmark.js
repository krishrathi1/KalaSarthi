/**
 * Performance Benchmark for Intelligent Matching System
 * Tests response times, throughput, and system performance
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9003';

// Performance test configurations
const PERFORMANCE_TESTS = {
  SINGLE_REQUEST: {
    name: 'Single Request Performance',
    iterations: 1,
    concurrent: 1
  },
  LOAD_TEST: {
    name: 'Load Test (10 concurrent)',
    iterations: 10,
    concurrent: 10
  },
  STRESS_TEST: {
    name: 'Stress Test (20 concurrent)',
    iterations: 20,
    concurrent: 20
  },
  ENDURANCE_TEST: {
    name: 'Endurance Test (50 requests)',
    iterations: 50,
    concurrent: 5
  }
};

const TEST_SCENARIOS = [
  {
    name: "Simple pottery search",
    requirements: "handmade pottery vase",
    location: { latitude: 19.0760, longitude: 72.8777 },
    filters: { maxDistance: 50, minRelevanceScore: 0.3, maxResults: 10 }
  },
  {
    name: "Complex furniture search",
    requirements: "custom wooden dining table with traditional Indian carvings for 6 people",
    location: { latitude: 28.7041, longitude: 77.1025 },
    filters: { maxDistance: 100, minRelevanceScore: 0.4, maxResults: 15 }
  },
  {
    name: "Jewelry search with materials",
    requirements: "silver jewelry with gemstones for wedding ceremony",
    location: { latitude: 12.9716, longitude: 77.5946 },
    filters: { maxDistance: 75, minRelevanceScore: 0.5, maxResults: 20 }
  },
  {
    name: "Textile search",
    requirements: "silk sarees with hand embroidery work",
    location: { latitude: 22.5726, longitude: 88.3639 },
    filters: { maxDistance: 200, minRelevanceScore: 0.3, maxResults: 25 }
  }
];

async function performanceTest(scenario, testConfig) {
  const results = {
    testName: testConfig.name,
    scenario: scenario.name,
    iterations: testConfig.iterations,
    concurrent: testConfig.concurrent,
    responseTimes: [],
    errors: [],
    successCount: 0,
    errorCount: 0,
    totalTime: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    throughput: 0,
    successRate: 0
  };

  console.log(`\n🚀 Running ${testConfig.name} - ${scenario.name}`);
  console.log(`   📊 ${testConfig.iterations} requests, ${testConfig.concurrent} concurrent`);

  const startTime = Date.now();

  // Create batches for concurrent execution
  const batches = [];
  for (let i = 0; i < testConfig.iterations; i += testConfig.concurrent) {
    const batchSize = Math.min(testConfig.concurrent, testConfig.iterations - i);
    const batch = [];
    
    for (let j = 0; j < batchSize; j++) {
      batch.push(executeSingleRequest(scenario, i + j));
    }
    
    batches.push(batch);
  }

  // Execute batches
  for (const batch of batches) {
    const batchResults = await Promise.allSettled(batch);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { responseTime, success, error } = result.value;
        results.responseTimes.push(responseTime);
        
        if (success) {
          results.successCount++;
          results.minResponseTime = Math.min(results.minResponseTime, responseTime);
          results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);
        } else {
          results.errorCount++;
          results.errors.push(error);
        }
      } else {
        results.errorCount++;
        results.errors.push(result.reason.message);
      }
    });
  }

  const endTime = Date.now();
  results.totalTime = endTime - startTime;

  // Calculate metrics
  if (results.responseTimes.length > 0) {
    results.averageResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  }
  
  results.throughput = (results.successCount / results.totalTime) * 1000; // requests per second
  results.successRate = (results.successCount / testConfig.iterations) * 100;

  // Display results
  console.log(`   ✅ Success: ${results.successCount}/${testConfig.iterations} (${results.successRate.toFixed(1)}%)`);
  console.log(`   ⚡ Avg Response: ${results.averageResponseTime.toFixed(0)}ms`);
  console.log(`   📈 Throughput: ${results.throughput.toFixed(2)} req/sec`);
  console.log(`   ⏱️  Total Time: ${results.totalTime}ms`);
  
  if (results.responseTimes.length > 0) {
    console.log(`   📊 Response Range: ${results.minResponseTime}ms - ${results.maxResponseTime}ms`);
  }
  
  if (results.errorCount > 0) {
    console.log(`   ❌ Errors: ${results.errorCount}`);
    console.log(`   🔍 Sample errors: ${results.errors.slice(0, 3).join(', ')}`);
  }

  return results;
}

async function executeSingleRequest(scenario, requestId) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/intelligent-match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requirements: scenario.requirements,
        buyerLocation: {
          latitude: scenario.location.latitude,
          longitude: scenario.location.longitude,
          accuracy: 100,
          source: 'gps'
        },
        filters: scenario.filters,
        buyerId: `perf_test_buyer_${requestId}`,
        sessionId: `perf_session_${Date.now()}_${requestId}`
      })
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    if (response.ok && data.success) {
      return {
        responseTime,
        success: true,
        matchCount: data.data.matches.length,
        processingTime: data.data.metadata.processingTime
      };
    } else {
      return {
        responseTime,
        success: false,
        error: data.error?.message || 'Unknown error'
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      responseTime,
      success: false,
      error: error.message
    };
  }
}

async function runPerformanceBenchmark() {
  console.log('⚡ Starting Performance Benchmark for Intelligent Matching System\n');
  console.log('🎯 Testing AI-powered matching with location-based filtering');
  console.log('🌟 Powered by Google Cloud technologies\n');
  console.log('='.repeat(70));

  const allResults = [];

  // Run performance tests for each scenario and configuration
  for (const [configKey, testConfig] of Object.entries(PERFORMANCE_TESTS)) {
    console.log(`\n📋 ${testConfig.name.toUpperCase()}`);
    console.log('='.repeat(50));

    for (const scenario of TEST_SCENARIOS) {
      const result = await performanceTest(scenario, testConfig);
      allResults.push(result);
      
      // Small delay between tests to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Generate comprehensive report
  console.log('\n' + '📊 PERFORMANCE BENCHMARK REPORT'.padStart(45));
  console.log('='.repeat(70));

  // Overall statistics
  const totalRequests = allResults.reduce((sum, result) => sum + result.iterations, 0);
  const totalSuccessful = allResults.reduce((sum, result) => sum + result.successCount, 0);
  const totalErrors = allResults.reduce((sum, result) => sum + result.errorCount, 0);
  const overallSuccessRate = (totalSuccessful / totalRequests) * 100;

  console.log(`\n🎯 Overall Performance Summary:`);
  console.log(`   📊 Total Requests: ${totalRequests}`);
  console.log(`   ✅ Successful: ${totalSuccessful} (${overallSuccessRate.toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${totalErrors}`);

  // Performance by test type
  console.log(`\n⚡ Performance by Test Type:`);
  for (const [configKey, testConfig] of Object.entries(PERFORMANCE_TESTS)) {
    const testResults = allResults.filter(r => r.testName === testConfig.name);
    const avgResponseTime = testResults.reduce((sum, r) => sum + r.averageResponseTime, 0) / testResults.length;
    const avgThroughput = testResults.reduce((sum, r) => sum + r.throughput, 0) / testResults.length;
    const avgSuccessRate = testResults.reduce((sum, r) => sum + r.successRate, 0) / testResults.length;

    console.log(`   🔹 ${testConfig.name}:`);
    console.log(`      ⏱️  Avg Response: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`      📈 Avg Throughput: ${avgThroughput.toFixed(2)} req/sec`);
    console.log(`      ✅ Avg Success Rate: ${avgSuccessRate.toFixed(1)}%`);
  }

  // Performance by scenario complexity
  console.log(`\n🎨 Performance by Search Complexity:`);
  for (const scenario of TEST_SCENARIOS) {
    const scenarioResults = allResults.filter(r => r.scenario === scenario.name);
    const avgResponseTime = scenarioResults.reduce((sum, r) => sum + r.averageResponseTime, 0) / scenarioResults.length;
    const avgSuccessRate = scenarioResults.reduce((sum, r) => sum + r.successRate, 0) / scenarioResults.length;

    console.log(`   🔹 ${scenario.name}:`);
    console.log(`      ⏱️  Avg Response: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`      ✅ Success Rate: ${avgSuccessRate.toFixed(1)}%`);
  }

  // Performance benchmarks
  console.log(`\n🏆 Performance Benchmarks:`);
  const bestResponseTime = Math.min(...allResults.map(r => r.minResponseTime));
  const worstResponseTime = Math.max(...allResults.map(r => r.maxResponseTime));
  const bestThroughput = Math.max(...allResults.map(r => r.throughput));

  console.log(`   🚀 Best Response Time: ${bestResponseTime}ms`);
  console.log(`   🐌 Worst Response Time: ${worstResponseTime}ms`);
  console.log(`   📈 Peak Throughput: ${bestThroughput.toFixed(2)} req/sec`);

  // Performance analysis
  console.log(`\n🔍 Performance Analysis:`);
  
  if (overallSuccessRate >= 95) {
    console.log(`   ✅ Excellent reliability (${overallSuccessRate.toFixed(1)}% success rate)`);
  } else if (overallSuccessRate >= 90) {
    console.log(`   ⚠️  Good reliability (${overallSuccessRate.toFixed(1)}% success rate)`);
  } else {
    console.log(`   🚨 Reliability needs improvement (${overallSuccessRate.toFixed(1)}% success rate)`);
  }

  const avgResponseTime = allResults.reduce((sum, r) => sum + r.averageResponseTime, 0) / allResults.length;
  if (avgResponseTime <= 2000) {
    console.log(`   ✅ Excellent response time (${avgResponseTime.toFixed(0)}ms average)`);
  } else if (avgResponseTime <= 5000) {
    console.log(`   ⚠️  Acceptable response time (${avgResponseTime.toFixed(0)}ms average)`);
  } else {
    console.log(`   🚨 Response time needs optimization (${avgResponseTime.toFixed(0)}ms average)`);
  }

  const avgThroughput = allResults.reduce((sum, r) => sum + r.throughput, 0) / allResults.length;
  if (avgThroughput >= 10) {
    console.log(`   ✅ Excellent throughput (${avgThroughput.toFixed(2)} req/sec)`);
  } else if (avgThroughput >= 5) {
    console.log(`   ⚠️  Good throughput (${avgThroughput.toFixed(2)} req/sec)`);
  } else {
    console.log(`   🚨 Throughput needs improvement (${avgThroughput.toFixed(2)} req/sec)`);
  }

  // Recommendations
  console.log(`\n💡 Performance Recommendations:`);
  
  if (avgResponseTime > 3000) {
    console.log(`   🔧 Consider optimizing database queries and indexes`);
    console.log(`   🚀 Enable Google Cloud Memorystore caching`);
  }
  
  if (overallSuccessRate < 95) {
    console.log(`   🔧 Review error handling and fallback mechanisms`);
    console.log(`   📊 Monitor Google Cloud services availability`);
  }
  
  if (avgThroughput < 10) {
    console.log(`   🔧 Consider horizontal scaling with load balancers`);
    console.log(`   ⚡ Optimize Google Cloud service configurations`);
  }

  console.log(`\n🌟 Google Cloud Integration Benefits:`);
  console.log(`   🧠 AI-powered requirement analysis with Google Natural Language`);
  console.log(`   📊 Real-time analytics with Google Analytics 4`);
  console.log(`   💾 High-performance caching with Google Cloud Memorystore`);
  console.log(`   📝 Structured logging with Google Cloud Logging`);
  console.log(`   🗺️  Accurate location services with Google Maps APIs`);

  console.log('\n='.repeat(70));
  console.log('✨ Performance benchmark completed successfully!');
  
  return {
    totalRequests,
    totalSuccessful,
    totalErrors,
    overallSuccessRate,
    averageResponseTime: avgResponseTime,
    averageThroughput: avgThroughput,
    results: allResults
  };
}

// Run the benchmark
if (require.main === module) {
  runPerformanceBenchmark()
    .then(results => {
      console.log('\n🎉 Benchmark completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Benchmark failed:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceBenchmark };