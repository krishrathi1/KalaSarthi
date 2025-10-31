/**
 * Business Intelligence Integration Examples
 * 
 * Demonstrates how to use Digital Khata, Scheme Sahayak, and Buyer Connect integrations
 */

import {
  digitalKhataIntegration,
  schemeSahayakIntegration,
  buyerConnectIntegration,
} from '../index';

// ============================================================================
// DIGITAL KHATA EXAMPLES
// ============================================================================

/**
 * Example 1: Get Quick Financial Summary
 */
export async function example1_QuickFinancialSummary() {
  console.log('=== Example 1: Quick Financial Summary ===\n');
  
  const artisanId = 'artisan_001';
  const summary = await digitalKhataIntegration.getQuickFinancialSummary(artisanId);
  
  console.log(summary);
  console.log('\n');
}

/**
 * Example 2: Get Detailed Sales Metrics
 */
export async function example2_DetailedSalesMetrics() {
  console.log('=== Example 2: Detailed Sales Metrics ===\n');
  
  const artisanId = 'artisan_001';
  const metrics = await digitalKhataIntegration.getSalesMetrics(artisanId, 'month');
  
  console.log('Sales Metrics:');
  console.log(`- Total Sales: ${metrics.sales.count}`);
  console.log(`- Total Revenue: ₹${metrics.sales.revenue.toLocaleString('en-IN')}`);
  console.log(`- Average Order Value: ₹${metrics.sales.averageValue.toLocaleString('en-IN')}`);
  console.log('\nTop Products:');
  metrics.topProducts.forEach((product, index) => {
    console.log(`${index + 1}. ${product.productName} - ₹${product.revenue.toLocaleString('en-IN')} (${product.salesCount} sales)`);
  });
  console.log('\n');
}

/**
 * Example 3: Get Financial Insights
 */
export async function example3_FinancialInsights() {
  console.log('=== Example 3: Financial Insights ===\n');
  
  const artisanId = 'artisan_001';
  const insights = await digitalKhataIntegration.getFinancialInsights(artisanId);
  
  console.log('Sales Performance:');
  console.log(`- Current Month: ₹${insights.salesPerformance.currentMonth.toLocaleString('en-IN')}`);
  console.log(`- Previous Month: ₹${insights.salesPerformance.previousMonth.toLocaleString('en-IN')}`);
  console.log(`- Growth Rate: ${insights.salesPerformance.growthRate}%`);
  console.log(`- Trend: ${insights.salesPerformance.trend}`);
  
  console.log('\nProfitability:');
  console.log(`- Estimated Profit: ₹${insights.profitability.estimatedProfit.toLocaleString('en-IN')}`);
  console.log(`- Profit Margin: ${insights.profitability.profitMargin}%`);
  
  console.log('\nRecommendations:');
  insights.profitability.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
  console.log('\n');
}

/**
 * Example 4: Check Inventory Status
 */
export async function example4_InventoryStatus() {
  console.log('=== Example 4: Inventory Status ===\n');
  
  const artisanId = 'artisan_001';
  const inventory = await digitalKhataIntegration.getInventoryInsights(artisanId);
  
  console.log('Inventory Overview:');
  console.log(`- Total Products: ${inventory.overview.totalProducts}`);
  console.log(`- Active Products: ${inventory.overview.activeProducts}`);
  console.log(`- Low Stock: ${inventory.overview.lowStockCount} items`);
  console.log(`- Out of Stock: ${inventory.overview.outOfStockCount} items`);
  console.log(`- Total Value: ₹${inventory.overview.totalValue.toLocaleString('en-IN')}`);
  
  if (inventory.alerts.length > 0) {
    console.log('\nAlerts:');
    inventory.alerts.forEach((alert, index) => {
      console.log(`${index + 1}. [${alert.type.toUpperCase()}] ${alert.productName}`);
      console.log(`   ${alert.recommendedAction}`);
    });
  }
  console.log('\n');
}

/**
 * Example 5: Analyze Sales Trends
 */
export async function example5_SalesTrends() {
  console.log('=== Example 5: Sales Trends ===\n');
  
  const artisanId = 'artisan_001';
  const trends = await digitalKhataIntegration.analyzeSalesTrends(artisanId, 'month');
  
  console.log('Trend Insights:');
  console.log(`- Best Performing Day: ${trends.insights.bestPerformingDay}`);
  console.log(`- Worst Performing Day: ${trends.insights.worstPerformingDay}`);
  console.log(`- Average Daily Sales: ${trends.insights.averageDailySales}`);
  console.log(`- Peak Sales Time: ${trends.insights.peakSalesTime}`);
  console.log(`- Seasonal Pattern: ${trends.insights.seasonalPattern}`);
  
  console.log('\nPredictions:');
  console.log(`- Next Week Sales: ₹${trends.predictions.nextWeekSales.toLocaleString('en-IN')}`);
  console.log(`- Next Month Sales: ₹${trends.predictions.nextMonthSales.toLocaleString('en-IN')}`);
  console.log(`- Confidence: ${trends.predictions.confidence}%`);
  console.log('\n');
}

// ============================================================================
// SCHEME SAHAYAK EXAMPLES
// ============================================================================

/**
 * Example 6: Get Scheme Recommendations
 */
export async function example6_SchemeRecommendations() {
  console.log('=== Example 6: Scheme Recommendations ===\n');
  
  const artisanId = 'artisan_001';
  const recommendations = await schemeSahayakIntegration.getSchemeRecommendations(artisanId, 3);
  
  console.log('Top Scheme Recommendations:');
  recommendations.forEach((rec, index) => {
    console.log(`\n${index + 1}. ${rec.scheme.title}`);
    console.log(`   Eligibility Score: ${rec.eligibilityScore}%`);
    console.log(`   Estimated Benefit: ${rec.estimatedBenefit}`);
    console.log(`   Complexity: ${rec.applicationComplexity}`);
    console.log(`   Action: ${rec.recommendedAction}`);
    console.log(`   Match Reasons:`);
    rec.matchReasons.forEach(reason => {
      console.log(`   - ${reason}`);
    });
  });
  console.log('\n');
}

/**
 * Example 7: Check Application Status
 */
export async function example7_ApplicationStatus() {
  console.log('=== Example 7: Application Status ===\n');
  
  const artisanId = 'artisan_001';
  const statuses = await schemeSahayakIntegration.getApplicationStatuses(artisanId);
  
  console.log('Application Statuses:');
  statuses.forEach((status, index) => {
    console.log(`\n${index + 1}. ${status.schemeName}`);
    console.log(`   Status: ${status.status}`);
    console.log(`   Current Stage: ${status.currentStage}`);
    console.log(`   Last Updated: ${status.lastUpdated.toLocaleDateString()}`);
    console.log(`   Next Steps:`);
    status.nextSteps.forEach(step => {
      console.log(`   - ${step}`);
    });
  });
  console.log('\n');
}

/**
 * Example 8: Check Eligibility
 */
export async function example8_CheckEligibility() {
  console.log('=== Example 8: Check Eligibility ===\n');
  
  const artisanId = 'artisan_001';
  const schemeId = 'scheme_pm_vishwakarma';
  
  const eligibility = await schemeSahayakIntegration.checkEligibility(artisanId, schemeId);
  
  console.log(`Eligibility Check for: ${eligibility.schemeName}`);
  console.log(`Is Eligible: ${eligibility.isEligible ? 'Yes' : 'No'}`);
  console.log(`Eligibility Score: ${eligibility.eligibilityScore}%`);
  console.log(`Estimated Benefit: ${eligibility.estimatedBenefit}`);
  
  console.log('\nMatched Criteria:');
  eligibility.matchedCriteria.forEach(criteria => {
    console.log(`✓ ${criteria}`);
  });
  
  if (eligibility.missingCriteria.length > 0) {
    console.log('\nMissing Criteria:');
    eligibility.missingCriteria.forEach(criteria => {
      console.log(`✗ ${criteria}`);
    });
  }
  
  console.log('\nRecommendations:');
  eligibility.recommendations.forEach(rec => {
    console.log(`- ${rec}`);
  });
  console.log('\n');
}

/**
 * Example 9: Compare Schemes
 */
export async function example9_CompareSchemes() {
  console.log('=== Example 9: Compare Schemes ===\n');
  
  const artisanId = 'artisan_001';
  const schemeIds = ['scheme_pm_vishwakarma', 'scheme_mudra_loan'];
  
  const comparison = await schemeSahayakIntegration.compareSchemes(artisanId, schemeIds);
  
  console.log('Scheme Comparison:');
  comparison.schemes.forEach((scheme, index) => {
    console.log(`\n${index + 1}. ${scheme.scheme.title}`);
    console.log(`   Eligibility Score: ${scheme.eligibilityScore}%`);
    console.log(`   Success Rate: ${scheme.successRate}%`);
    console.log(`   Processing Time: ${scheme.processingTime}`);
    console.log(`   Pros: ${scheme.pros.join(', ')}`);
    console.log(`   Cons: ${scheme.cons.join(', ')}`);
  });
  
  console.log(`\nRecommendation: ${comparison.recommendation}`);
  console.log(`Best Match: ${comparison.schemes.find(s => s.scheme.id === comparison.bestMatch)?.scheme.title}`);
  console.log('\n');
}

/**
 * Example 10: Get Quick Scheme Summary
 */
export async function example10_QuickSchemeSummary() {
  console.log('=== Example 10: Quick Scheme Summary ===\n');
  
  const artisanId = 'artisan_001';
  const summary = await schemeSahayakIntegration.getQuickSchemeSummary(artisanId);
  
  console.log(summary);
  console.log('\n');
}

// ============================================================================
// BUYER CONNECT EXAMPLES
// ============================================================================

/**
 * Example 11: Get Buyer Inquiries
 */
export async function example11_BuyerInquiries() {
  console.log('=== Example 11: Buyer Inquiries ===\n');
  
  const artisanId = 'artisan_001';
  const inquiries = await buyerConnectIntegration.getBuyerInquiries(artisanId, { limit: 5 });
  
  console.log('Recent Buyer Inquiries:');
  inquiries.forEach((inquiry, index) => {
    console.log(`\n${index + 1}. ${inquiry.buyerName} - ${inquiry.inquiryType}`);
    console.log(`   Status: ${inquiry.status}`);
    console.log(`   Priority: ${inquiry.priority}`);
    console.log(`   Message: ${inquiry.message.substring(0, 100)}...`);
    console.log(`   Created: ${inquiry.createdAt.toLocaleDateString()}`);
  });
  console.log('\n');
}

/**
 * Example 12: Get Inquiry Summary
 */
export async function example12_InquirySummary() {
  console.log('=== Example 12: Inquiry Summary ===\n');
  
  const artisanId = 'artisan_001';
  const summary = await buyerConnectIntegration.getInquirySummary(artisanId);
  
  console.log('Inquiry Summary:');
  console.log(`- Total Inquiries: ${summary.total}`);
  console.log(`- New: ${summary.new}`);
  console.log(`- Responded: ${summary.responded}`);
  console.log(`- Converted: ${summary.converted}`);
  console.log(`- Urgent: ${summary.urgent}`);
  
  if (summary.topBuyers.length > 0) {
    console.log('\nTop Buyers:');
    summary.topBuyers.forEach((buyer, index) => {
      console.log(`${index + 1}. ${buyer.buyerName} - ${buyer.inquiryCount} inquiries (${buyer.conversionRate.toFixed(1)}% conversion)`);
    });
  }
  console.log('\n');
}

/**
 * Example 13: Get Buyer Matching Suggestions
 */
export async function example13_BuyerMatching() {
  console.log('=== Example 13: Buyer Matching Suggestions ===\n');
  
  const artisanId = 'artisan_001';
  const matches = await buyerConnectIntegration.getBuyerMatchingSuggestions(artisanId, 3);
  
  console.log('Potential Buyer Matches:');
  matches.forEach((match, index) => {
    console.log(`\n${index + 1}. ${match.buyer.name} (${match.matchScore}% match)`);
    console.log(`   Type: ${match.buyer.type}`);
    console.log(`   Location: ${match.buyer.location.city}, ${match.buyer.location.state}`);
    console.log(`   Potential Value: ₹${match.potentialValue.toLocaleString('en-IN')}`);
    console.log(`   Match Reasons:`);
    match.matchReasons.forEach(reason => {
      console.log(`   - ${reason}`);
    });
    console.log(`   Suggested Approach: ${match.suggestedApproach}`);
  });
  console.log('\n');
}

/**
 * Example 14: Draft Response Template
 */
export async function example14_ResponseTemplate() {
  console.log('=== Example 14: Draft Response Template ===\n');
  
  const inquiryId = 'inquiry_001';
  const template = await buyerConnectIntegration.draftResponseTemplate(inquiryId);
  
  console.log('Response Template:');
  console.log(`Tone: ${template.tone}`);
  console.log(`Estimated Response Time: ${template.estimatedResponseTime}`);
  console.log('\nTemplate:');
  console.log(template.template);
  console.log('\nKey Points:');
  template.keyPoints.forEach((point, index) => {
    console.log(`${index + 1}. ${point}`);
  });
  console.log('\nNext Steps:');
  template.nextSteps.forEach((step, index) => {
    console.log(`${index + 1}. ${step}`);
  });
  console.log('\n');
}

/**
 * Example 15: Get Quick Buyer Connect Summary
 */
export async function example15_QuickBuyerConnectSummary() {
  console.log('=== Example 15: Quick Buyer Connect Summary ===\n');
  
  const artisanId = 'artisan_001';
  const summary = await buyerConnectIntegration.getQuickBuyerConnectSummary(artisanId);
  
  console.log(summary);
  console.log('\n');
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Business Intelligence Integration Examples               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Digital Khata Examples
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('DIGITAL KHATA INTEGRATION EXAMPLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await example1_QuickFinancialSummary();
    await example2_DetailedSalesMetrics();
    await example3_FinancialInsights();
    await example4_InventoryStatus();
    await example5_SalesTrends();
    
    // Scheme Sahayak Examples
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SCHEME SAHAYAK INTEGRATION EXAMPLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await example6_SchemeRecommendations();
    await example7_ApplicationStatus();
    await example8_CheckEligibility();
    await example9_CompareSchemes();
    await example10_QuickSchemeSummary();
    
    // Buyer Connect Examples
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('BUYER CONNECT INTEGRATION EXAMPLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await example11_BuyerInquiries();
    await example12_InquirySummary();
    await example13_BuyerMatching();
    await example14_ResponseTemplate();
    await example15_QuickBuyerConnectSummary();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('All examples completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
