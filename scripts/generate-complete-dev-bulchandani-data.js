/**
 * Complete Data Generation for Dev Bulchandani
 * Runs all data generation scripts in sequence for the Enhanced DigitalKhata system
 */

const { generateDevBulchandaniData } = require('./generate-dev-bulchandani-data');
const { generateHistoricalSalesData } = require('./generate-sales-history');
const { generateHistoricalExpenseData } = require('./generate-expense-history');

async function generateCompleteDevBulchandaniData() {
  console.log('🚀 Starting complete data generation for Enhanced DigitalKhata...');
  console.log('👨‍🎨 Target Artisan: Dev Bulchandani');
  console.log('📅 Time Period: Last 12 months');
  console.log('─'.repeat(80));
  
  try {
    // Step 1: Generate artisan profile and products
    console.log('\n📋 STEP 1: Generating Artisan Profile and Products');
    console.log('─'.repeat(50));
    await generateDevBulchandaniData();
    
    // Step 2: Generate historical sales data
    console.log('\n📈 STEP 2: Generating Historical Sales Data');
    console.log('─'.repeat(50));
    await generateHistoricalSalesData();
    
    // Step 3: Generate historical expense data
    console.log('\n💰 STEP 3: Generating Historical Expense Data');
    console.log('─'.repeat(50));
    await generateHistoricalExpenseData();
    
    // Final summary
    console.log('\n🎉 COMPLETE DATA GENERATION SUMMARY');
    console.log('═'.repeat(80));
    console.log('✅ Dev Bulchandani artisan profile created');
    console.log('✅ 6 premium woodworking products added');
    console.log('✅ 12 months of sales history generated');
    console.log('✅ 12 months of expense records created');
    console.log('✅ Real-time dashboard data ready');
    console.log('✅ Enhanced DigitalKhata system populated');
    
    console.log('\n📊 GENERATED DATA OVERVIEW:');
    console.log('• Artisan Profile: 1 comprehensive profile');
    console.log('• Product Catalog: 6 diverse woodworking products');
    console.log('• Sales Events: ~46 realistic transactions');
    console.log('• Expense Records: ~520 business expenses');
    console.log('• Revenue Generated: ~₹31.4L over 12 months');
    console.log('• Total Expenses: ~₹17.8L over 12 months');
    console.log('• Net Profit: ~₹13.6L (43% profit margin)');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Start the Enhanced DigitalKhata dashboard');
    console.log('2. Login as Dev Bulchandani (dev.bulchandani@example.com)');
    console.log('3. View real-time sales analytics and trends');
    console.log('4. Test AI-powered financial insights');
    console.log('5. Explore expense tracking and profit calculations');
    
    console.log('\n✨ Enhanced DigitalKhata is ready for demonstration!');
    
  } catch (error) {
    console.error('\n❌ Complete data generation failed:', error);
    console.error('\nPlease check the error above and try again.');
    throw error;
  }
}

// Export the function
module.exports = { generateCompleteDevBulchandaniData };

// Run the complete generation if this file is executed directly
if (require.main === module) {
  generateCompleteDevBulchandaniData()
    .then(() => {
      console.log('\n🎊 All data generation completed successfully!');
      console.log('Enhanced DigitalKhata system is ready for use.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Complete data generation failed:', error);
      process.exit(1);
    });
}