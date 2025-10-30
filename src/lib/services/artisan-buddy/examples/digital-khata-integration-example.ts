/**
 * Digital Khata Integration Usage Examples
 * 
 * Demonstrates how to use the Digital Khata integration service
 * with Artisan Buddy chatbot.
 */

import { digitalKhataIntegration } from '../DigitalKhataIntegration';
import { responseGenerator } from '../ResponseGenerator';

// ============================================================================
// Example 1: Get Quick Financial Summary
// ============================================================================

async function example1_QuickSummary() {
  console.log('=== Example 1: Quick Financial Summary ===\n');

  const artisanId = 'artisan_001';
  const summary = await digitalKhataIntegration.getQuickFinancialSummary(artisanId);

  console.log(summary);
  console.log('\n');
}

// ============================================================================
// Example 2: Get Detailed Sales Metrics
// ============================================================================

async function example2_SalesMetrics() {
  console.log('=== Example 2: Detailed Sales Metrics ===\n');

  const artisanId = 'artisan_001';
  
  // Get monthly sales metrics
  const monthlyMetrics = await digitalKhataIntegration.getSalesMetrics(artisanId, 'month');
  console.log('Monthly Sales Metrics:');
  console.log(`- Period: ${monthlyMetrics.period}`);
  console.log(`- Total Orders: ${monthlyMetrics.sales.count}`);
  console.log(`- Total Revenue: ₹${monthlyMetrics.sales.revenue.toLocaleString('en-IN')}`);
  console.log(`- Average Order Value: ₹${monthlyMetrics.sales.averageValue.toLocaleString('en-IN')}`);
  console.log('\nTop Products:');
  monthlyMetrics.topProducts.forEach((product, index) => {
    console.log(`${index + 1}. ${product.productName} - ₹${product.revenue.toLocaleString('en-IN')}`);
  });
  console.log('\n');
}

// ============================================================================
// Example 3: Get Financial Insights
// ============================================================================

async function example3_FinancialInsights() {
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

// ============================================================================
// Example 4: Check Inventory Status
// ============================================================================

async function example4_InventoryStatus() {
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
      console.log(`${index + 1}. [${alert.type}] ${alert.productName}`);
      console.log(`   ${alert.recommendedAction}`);
    });
  }
  console.log('\n');
}

// ============================================================================
// Example 5: Analyze Sales Trends
// ============================================================================

async function example5_SalesTrends() {
  console.log('=== Example 5: Sales Trends Analysis ===\n');

  const artisanId = 'artisan_001';
  const trends = await digitalKhataIntegration.analyzeSalesTrends(artisanId, 'month');

  console.log(`Trend Analysis (${trends.period}):`);
  console.log('\nKey Insights:');
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
// Example 6: Get Current Sales Performance
// ============================================================================

async function example6_CurrentPerformance() {
  console.log('=== Example 6: Current Sales Performance ===\n');

  const artisanId = 'artisan_001';
  const performance = await digitalKhataIntegration.getCurrentSalesPerformance(artisanId);

  console.log('Current Sales:');
  console.log(`- Today: ₹${performance.today.toLocaleString('en-IN')}`);
  console.log(`- This Week: ₹${performance.thisWeek.toLocaleString('en-IN')}`);
  console.log(`- This Month: ₹${performance.thisMonth.toLocaleString('en-IN')}`);
  console.log(`- This Year: ₹${performance.thisYear.toLocaleString('en-IN')}`);
  console.log('\n');
}

// ============================================================================
// Example 7: Integration with Response Generator
// ============================================================================

async function example7_ResponseGeneratorIntegration() {
  console.log('=== Example 7: Response Generator Integration ===\n');

  const artisanId = 'artisan_001';

  // Get different types of insights
  console.log('1. Sales Summary:');
  const salesInsights = await responseGenerator.getDigitalKhataInsights(artisanId, 'sales');
  console.log(salesInsights);
  console.log('\n');

  console.log('2. Financial Insights:');
  const financialInsights = await responseGenerator.getDigitalKhataInsights(artisanId, 'financial');
  console.log(financialInsights);
  console.log('\n');

  console.log('3. Inventory Status:');
  const inventoryInsights = await responseGenerator.getDigitalKhataInsights(artisanId, 'inventory');
  console.log(inventoryInsights);
  console.log('\n');

  console.log('4. Trend Analysis:');
  const trendInsights = await responseGenerator.getDigitalKhataInsights(artisanId, 'trends');
  console.log(trendInsights);
  console.log('\n');
}

// ============================================================================
// Example 8: Chatbot Query Simulation
// ============================================================================

async function example8_ChatbotSimulation() {
  console.log('=== Example 8: Chatbot Query Simulation ===\n');

  const artisanId = 'artisan_001';

  // Simulate different user queries
  const queries = [
    { query: 'How are my sales doing?', type: 'summary' as const },
    { query: 'Show me my financial performance', type: 'financial' as const },
    { query: 'What is my inventory status?', type: 'inventory' as const },
    { query: 'Analyze my sales trends', type: 'trends' as const },
  ];

  for (const { query, type } of queries) {
    console.log(`User: "${query}"`);
    console.log('Assistant:');
    const response = await responseGenerator.getDigitalKhataInsights(artisanId, type);
    console.log(response);
    console.log('\n---\n');
  }
}

// ============================================================================
// Run All Examples
// ============================================================================

async function runAllExamples() {
  try {
    await example1_QuickSummary();
    await example2_SalesMetrics();
    await example3_FinancialInsights();
    await example4_InventoryStatus();
    await example5_SalesTrends();
    await example6_CurrentPerformance();
    await example7_ResponseGeneratorIntegration();
    await example8_ChatbotSimulation();

    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Export examples
export {
  example1_QuickSummary,
  example2_SalesMetrics,
  example3_FinancialInsights,
  example4_InventoryStatus,
  example5_SalesTrends,
  example6_CurrentPerformance,
  example7_ResponseGeneratorIntegration,
  example8_ChatbotSimulation,
  runAllExamples,
};

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
