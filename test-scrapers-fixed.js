const { scrapeMeesho } = require('./src/lib/scrapers/scrape-meesho');
const { scrapeFlipkartSamarth } = require('./src/lib/scrapers/scrape-flipkart');
const { scrapeAmazon } = require('./src/lib/scrapers/scrape-amazon');

async function testAllScrapers() {
    console.log('🧪 Testing Fixed Scrapers...\n');

    const testQuery = 'wooden chairs';
    const options = {
        minPrice: 2500,
        maxPrice: 5000,
        maxResults: 3,
        maxPages: 1,
        headless: true,
        saveDebugFiles: true
    };

    // Test Meesho
    console.log('🛍️ Testing Meesho Scraper...');
    try {
        const meeshoResults = await scrapeMeesho(testQuery, options);
        console.log(`✅ Meesho: Found ${meeshoResults.length} products`);
        meeshoResults.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.title?.substring(0, 50)}... - ₹${product.price}`);
        });
    } catch (error) {
        console.log(`❌ Meesho Error: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test Flipkart
    console.log('🛒 Testing Flipkart Scraper...');
    try {
        const flipkartResults = await scrapeFlipkartSamarth(testQuery, options);
        console.log(`✅ Flipkart: Found ${flipkartResults.length} products`);
        flipkartResults.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.title?.substring(0, 50)}... - ₹${product.price}`);
        });
    } catch (error) {
        console.log(`❌ Flipkart Error: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test Amazon
    console.log('📦 Testing Amazon Scraper...');
    try {
        const amazonResults = await scrapeAmazon(testQuery, options);
        console.log(`✅ Amazon: Found ${amazonResults.length} products`);
        amazonResults.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.title?.substring(0, 50)}... - ₹${product.price}`);
        });
    } catch (error) {
        console.log(`❌ Amazon Error: ${error.message}`);
    }

    console.log('\n🎉 Scraper Testing Complete!');
}

// Run the test
if (require.main === module) {
    testAllScrapers().catch(console.error);
}

module.exports = { testAllScrapers };
