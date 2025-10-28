/**
 * Intelligent Matching System Validation Script
 * 
 * This script validates the intelligent matching system deployment
 * by running comprehensive tests and health checks.
 */

const fetch = require('node-fetch');

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const TEST_QUERIES = [
  {
    query: "wooden doors for my hotel",
    expectedProfession: "woodworking",
    expectedMaterials: ["wood"],
    expectedProducts: ["doors"]
  },
  {
    query: "silver oxidizing earrings",
    expectedProfession: "jewelry",
    expectedMaterials: ["silver"],
    expectedTechniques: ["oxidizing"]
  },
  {
    query: "handwoven silk sarees for wedding",
    expectedProfession: "textiles",
    expectedMaterials: ["silk"],
    expectedTechniques: ["handwoven", "weaving"]
  },
  {
    query: "clay pots for kitchen",
    expectedProfession: "pottery",
    expectedMaterials: ["clay"],
    expectedProducts: ["pots"]
  },
  {
    query: "carved wooden furniture",
    expectedProfession: "woodworking",
    expectedMaterials: ["wood"],
    expectedTechniques: ["carved", "carving"]
  }
];

class ValidationRunner {
  constructor() {
    this.results = {
      healthChecks: {},
      apiTests: {},
      intelligentMatching: {},
      analytics: {},
      performance: {},
      overall: { passed: 0, failed: 0, warnings: 0 }
    };
  }

  async runValidation() {
    console.log('🚀 Starting Intelligent Matching System Validation\n');
    
    try {
      await this.runHealthChecks();
      await this.runAPITests();
      await this.runIntelligentMatchingTests();
      await this.runAnalyticsTests();
      await this.runPerformanceTests();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Validation failed with error:', error);
      process.exit(1);
    }
  }

  async runHealthChecks() {
    console.log('🏥 Running Health Checks...');
    
    // Check search-artisans endpoint
    try {
      const response = await fetch(`${BASE_URL}/api/search-artisans`);
      const data = await response.json();
      
      this.results.healthChecks.searchArtisans = {
        status: response.ok ? 'healthy' : 'unhealthy',
        capabilities: data.capabilities || {},
        systemHealth: data.systemHealth || {}
      };
      
      if (response.ok) {
        console.log('  ✅ Search Artisans API: Healthy');
        this.results.overall.passed++;
      } else {
        console.log('  ❌ Search Artisans API: Unhealthy');
        this.results.overall.failed++;
      }
    } catch (error) {
      console.log('  ❌ Search Artisans API: Connection failed');
      this.results.healthChecks.searchArtisans = { status: 'error', error: error.message };
      this.results.overall.failed++;
    }

    // Check intelligent-match endpoint
    try {
      const response = await fetch(`${BASE_URL}/api/intelligent-match`);
      const data = await response.json();
      
      this.results.healthChecks.intelligentMatch = {
        status: response.ok ? 'healthy' : 'unhealthy',
        capabilities: data.capabilities || {},
        systemHealth: data.systemHealth || {}
      };
      
      if (response.ok) {
        console.log('  ✅ Intelligent Match API: Healthy');
        this.results.overall.passed++;
      } else {
        console.log('  ❌ Intelligent Match API: Unhealthy');
        this.results.overall.failed++;
      }
    } catch (error) {
      console.log('  ❌ Intelligent Match API: Connection failed');
      this.results.healthChecks.intelligentMatch = { status: 'error', error: error.message };
      this.results.overall.failed++;
    }

    // Check analytics endpoint
    try {
      const response = await fetch(`${BASE_URL}/api/intelligent-match/analytics?type=health`);
      const data = await response.json();
      
      this.results.healthChecks.analytics = {
        status: response.ok ? 'healthy' : 'unhealthy',
        data: data.data || {}
      };
      
      if (response.ok) {
        console.log('  ✅ Analytics API: Healthy');
        this.results.overall.passed++;
      } else {
        console.log('  ❌ Analytics API: Unhealthy');
        this.results.overall.failed++;
      }
    } catch (error) {
      console.log('  ❌ Analytics API: Connection failed');
      this.results.healthChecks.analytics = { status: 'error', error: error.message };
      this.results.overall.failed++;
    }

    console.log('');
  }

  async runAPITests() {
    console.log('🔧 Running API Tests...');
    
    // Test search-artisans with intelligent matching
    try {
      const testQuery = "wooden furniture for hotel";
      const response = await fetch(`${BASE_URL}/api/search-artisans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery,
          useIntelligentMatching: true,
          enableExplanations: true,
          maxResults: 5
        })
      });
      
      const data = await response.json();
      
      this.results.apiTests.searchArtisans = {
        status: response.ok ? 'passed' : 'failed',
        query: testQuery,
        responseTime: data.data?.processingTime || 0,
        matchCount: data.data?.matches?.length || 0,
        searchType: data.data?.searchType || 'unknown',
        hasExplanations: data.data?.matches?.[0]?.explanation ? true : false
      };
      
      if (response.ok && data.success) {
        console.log(`  ✅ Search API Test: ${data.data.matches.length} matches in ${data.data.processingTime}ms`);
        this.results.overall.passed++;
      } else {
        console.log('  ❌ Search API Test: Failed');
        this.results.overall.failed++;
      }
    } catch (error) {
      console.log('  ❌ Search API Test: Error');
      this.results.apiTests.searchArtisans = { status: 'error', error: error.message };
      this.results.overall.failed++;
    }

    // Test intelligent-match endpoint
    try {
      const testQuery = "silver jewelry with traditional designs";
      const response = await fetch(`${BASE_URL}/api/intelligent-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery,
          enableExplanations: true,
          enableAnalytics: true,
          maxResults: 5
        })
      });
      
      const data = await response.json();
      
      this.results.apiTests.intelligentMatch = {
        status: response.ok ? 'passed' : 'failed',
        query: testQuery,
        responseTime: data.data?.processingTime || 0,
        matchCount: data.data?.matches?.length || 0,
        searchMethod: data.data?.searchMethod || 'unknown',
        hasAnalytics: data.data?.analytics ? true : false,
        systemHealth: data.data?.systemHealth || {}
      };
      
      if (response.ok && data.success) {
        console.log(`  ✅ Intelligent Match Test: ${data.data.matches.length} matches via ${data.data.searchMethod}`);
        this.results.overall.passed++;
      } else {
        console.log('  ❌ Intelligent Match Test: Failed');
        this.results.overall.failed++;
      }
    } catch (error) {
      console.log('  ❌ Intelligent Match Test: Error');
      this.results.apiTests.intelligentMatch = { status: 'error', error: error.message };
      this.results.overall.failed++;
    }

    console.log('');
  }

  async runIntelligentMatchingTests() {
    console.log('🧠 Running Intelligent Matching Tests...');
    
    const testResults = [];
    
    for (const testCase of TEST_QUERIES) {
      try {
        console.log(`  Testing: "${testCase.query}"`);
        
        const response = await fetch(`${BASE_URL}/api/intelligent-match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: testCase.query,
            enableExplanations: true,
            enableAnalytics: true,
            maxResults: 3
          })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          console.log(`    ❌ API call failed`);
          testResults.push({ ...testCase, status: 'failed', reason: 'API call failed' });
          continue;
        }

        const queryAnalysis = data.data.queryAnalysis;
        const matches = data.data.matches || [];
        
        // Validate profession detection
        const professionMatch = queryAnalysis.detectedProfession?.toLowerCase().includes(testCase.expectedProfession.toLowerCase()) ||
                               testCase.expectedProfession.toLowerCase().includes(queryAnalysis.detectedProfession?.toLowerCase());
        
        // Validate material extraction
        const materialMatch = testCase.expectedMaterials?.some(expectedMaterial =>
          queryAnalysis.extractedMaterials?.some(extractedMaterial =>
            extractedMaterial.toLowerCase().includes(expectedMaterial.toLowerCase()) ||
            expectedMaterial.toLowerCase().includes(extractedMaterial.toLowerCase())
          )
        ) || !testCase.expectedMaterials;
        
        // Validate technique extraction
        const techniqueMatch = testCase.expectedTechniques?.some(expectedTechnique =>
          queryAnalysis.extractedSkills?.some(extractedSkill =>
            extractedSkill.toLowerCase().includes(expectedTechnique.toLowerCase()) ||
            expectedTechnique.toLowerCase().includes(extractedSkill.toLowerCase())
          )
        ) || !testCase.expectedTechniques;
        
        // Validate product extraction
        const productMatch = testCase.expectedProducts?.some(expectedProduct =>
          queryAnalysis.extractedProducts?.some(extractedProduct =>
            extractedProduct.toLowerCase().includes(expectedProduct.toLowerCase()) ||
            expectedProduct.toLowerCase().includes(extractedProduct.toLowerCase())
          )
        ) || !testCase.expectedProducts;

        const overallMatch = professionMatch && materialMatch && techniqueMatch && productMatch;
        
        testResults.push({
          ...testCase,
          status: overallMatch ? 'passed' : 'partial',
          results: {
            detectedProfession: queryAnalysis.detectedProfession,
            extractedMaterials: queryAnalysis.extractedMaterials,
            extractedSkills: queryAnalysis.extractedSkills,
            extractedProducts: queryAnalysis.extractedProducts,
            confidence: queryAnalysis.confidence,
            matchCount: matches.length,
            processingTime: data.data.processingTime
          },
          validation: {
            professionMatch,
            materialMatch,
            techniqueMatch,
            productMatch
          }
        });
        
        if (overallMatch) {
          console.log(`    ✅ Passed: ${queryAnalysis.detectedProfession} (${(queryAnalysis.confidence * 100).toFixed(0)}% confidence)`);
          this.results.overall.passed++;
        } else {
          console.log(`    ⚠️  Partial: Some validations failed`);
          this.results.overall.warnings++;
        }
        
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
        testResults.push({ ...testCase, status: 'error', error: error.message });
        this.results.overall.failed++;
      }
    }
    
    this.results.intelligentMatching = {
      testCases: testResults,
      summary: {
        total: testResults.length,
        passed: testResults.filter(t => t.status === 'passed').length,
        partial: testResults.filter(t => t.status === 'partial').length,
        failed: testResults.filter(t => t.status === 'failed').length,
        errors: testResults.filter(t => t.status === 'error').length
      }
    };
    
    console.log('');
  }

  async runAnalyticsTests() {
    console.log('📊 Running Analytics Tests...');
    
    try {
      // Test analytics overview
      const overviewResponse = await fetch(`${BASE_URL}/api/intelligent-match/analytics?type=overview`);
      const overviewData = await overviewResponse.json();
      
      if (overviewResponse.ok && overviewData.success) {
        console.log('  ✅ Analytics Overview: Available');
        this.results.overall.passed++;
      } else {
        console.log('  ❌ Analytics Overview: Failed');
        this.results.overall.failed++;
      }
      
      // Test metrics endpoint
      const metricsResponse = await fetch(`${BASE_URL}/api/intelligent-match/analytics?type=metrics`);
      const metricsData = await metricsResponse.json();
      
      if (metricsResponse.ok && metricsData.success) {
        console.log('  ✅ Analytics Metrics: Available');
        this.results.overall.passed++;
      } else {
        console.log('  ❌ Analytics Metrics: Failed');
        this.results.overall.failed++;
      }
      
      this.results.analytics = {
        overview: overviewResponse.ok,
        metrics: metricsResponse.ok,
        data: overviewData.data || {}
      };
      
    } catch (error) {
      console.log('  ❌ Analytics Tests: Error');
      this.results.analytics = { status: 'error', error: error.message };
      this.results.overall.failed++;
    }
    
    console.log('');
  }

  async runPerformanceTests() {
    console.log('⚡ Running Performance Tests...');
    
    const performanceResults = [];
    const testQuery = "traditional pottery for home decoration";
    
    // Run multiple requests to test performance
    for (let i = 0; i < 5; i++) {
      try {
        const startTime = Date.now();
        
        const response = await fetch(`${BASE_URL}/api/intelligent-match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: testQuery,
            maxResults: 10
          })
        });
        
        const endTime = Date.now();
        const data = await response.json();
        
        performanceResults.push({
          requestTime: endTime - startTime,
          processingTime: data.data?.processingTime || 0,
          matchCount: data.data?.matches?.length || 0,
          success: response.ok && data.success,
          cacheHit: data.data?.systemHealth?.cacheHit || false
        });
        
      } catch (error) {
        performanceResults.push({
          requestTime: 0,
          processingTime: 0,
          matchCount: 0,
          success: false,
          error: error.message
        });
      }
    }
    
    const successfulRequests = performanceResults.filter(r => r.success);
    const averageRequestTime = successfulRequests.length > 0 ?
      successfulRequests.reduce((sum, r) => sum + r.requestTime, 0) / successfulRequests.length : 0;
    
    const averageProcessingTime = successfulRequests.length > 0 ?
      successfulRequests.reduce((sum, r) => sum + r.processingTime, 0) / successfulRequests.length : 0;
    
    this.results.performance = {
      totalRequests: performanceResults.length,
      successfulRequests: successfulRequests.length,
      averageRequestTime,
      averageProcessingTime,
      successRate: successfulRequests.length / performanceResults.length,
      results: performanceResults
    };
    
    if (averageRequestTime < 5000 && this.results.performance.successRate > 0.8) {
      console.log(`  ✅ Performance: ${averageRequestTime.toFixed(0)}ms avg (${(this.results.performance.successRate * 100).toFixed(0)}% success)`);
      this.results.overall.passed++;
    } else {
      console.log(`  ⚠️  Performance: ${averageRequestTime.toFixed(0)}ms avg (${(this.results.performance.successRate * 100).toFixed(0)}% success)`);
      this.results.overall.warnings++;
    }
    
    console.log('');
  }

  generateReport() {
    console.log('📋 Validation Report');
    console.log('='.repeat(50));
    
    const total = this.results.overall.passed + this.results.overall.failed + this.results.overall.warnings;
    const passRate = total > 0 ? (this.results.overall.passed / total * 100).toFixed(1) : 0;
    
    console.log(`Overall Status: ${this.results.overall.failed === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Pass Rate: ${passRate}% (${this.results.overall.passed}/${total})`);
    console.log(`Warnings: ${this.results.overall.warnings}`);
    console.log(`Failures: ${this.results.overall.failed}`);
    console.log('');
    
    // Health Checks Summary
    console.log('Health Checks:');
    Object.entries(this.results.healthChecks).forEach(([service, result]) => {
      const status = result.status === 'healthy' ? '✅' : result.status === 'error' ? '❌' : '⚠️';
      console.log(`  ${status} ${service}: ${result.status}`);
    });
    console.log('');
    
    // Intelligent Matching Summary
    if (this.results.intelligentMatching.summary) {
      const summary = this.results.intelligentMatching.summary;
      console.log('Intelligent Matching Tests:');
      console.log(`  Total: ${summary.total}`);
      console.log(`  Passed: ${summary.passed}`);
      console.log(`  Partial: ${summary.partial}`);
      console.log(`  Failed: ${summary.failed}`);
      console.log(`  Errors: ${summary.errors}`);
      console.log('');
    }
    
    // Performance Summary
    if (this.results.performance.averageRequestTime) {
      console.log('Performance:');
      console.log(`  Average Request Time: ${this.results.performance.averageRequestTime.toFixed(0)}ms`);
      console.log(`  Average Processing Time: ${this.results.performance.averageProcessingTime.toFixed(0)}ms`);
      console.log(`  Success Rate: ${(this.results.performance.successRate * 100).toFixed(1)}%`);
      console.log('');
    }
    
    // Recommendations
    console.log('Recommendations:');
    if (this.results.overall.failed > 0) {
      console.log('  ❌ Fix failed tests before deployment');
    }
    if (this.results.overall.warnings > 0) {
      console.log('  ⚠️  Review warnings and consider improvements');
    }
    if (this.results.performance.averageRequestTime > 3000) {
      console.log('  ⚡ Consider performance optimizations');
    }
    if (this.results.overall.failed === 0 && this.results.overall.warnings === 0) {
      console.log('  🚀 System ready for deployment!');
    }
    
    // Exit with appropriate code
    process.exit(this.results.overall.failed > 0 ? 1 : 0);
  }
}

// Run validation
const validator = new ValidationRunner();
validator.runValidation().catch(error => {
  console.error('Validation runner failed:', error);
  process.exit(1);
});