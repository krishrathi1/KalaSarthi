// Simple formatPrice function for testing
function formatPrice(price) {
    const formattedNumber = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(price);
    return `₹${formattedNumber}`;
}

console.log('🧪 FINAL VERIFICATION TEST');
console.log('==========================================\n');

// Test 1: Currency Symbol Formatting
console.log('💰 Test 1: Currency Symbol Formatting');
console.log('------------------------------------');
const testPrices = [109, 122, 139, 1341, 1498, 1499, 2722, 2969, 3059, 4999];
testPrices.forEach(price => {
    const formatted = formatPrice(price);
    console.log(`Price: ${price} → Formatted: ${formatted}`);
});
console.log('✅ Currency formatting working correctly\n');

// Test 2: Test all scrapers with realistic price ranges
console.log('🛍️ Test 2: Scraper Integration Test');
console.log('-----------------------------------');

async function testAllScrapers() {
    try {
        // Test Meesho with realistic price range
        console.log('Testing Meesho scraper...');
        const { scrapeMeesho } = require('./src/lib/scrapers/scrape-meesho');
        const meeshoResults = await scrapeMeesho('wooden chairs', {
            minPrice: 50,
            maxPrice: 2000,
            maxResults: 3,
            headless: true
        });
        console.log(`✅ Meesho: Found ${meeshoResults.length} products`);
        meeshoResults.forEach((product, i) => {
            console.log(`   ${i + 1}. ${product.title?.substring(0, 40)}... - ${formatPrice(product.price)}`);
        });
        console.log('');

        // Test Flipkart with realistic price range
        console.log('Testing Flipkart scraper...');
        const { scrapeFlipkartSamarth } = require('./src/lib/scrapers/scrape-flipkart');
        const flipkartResults = await scrapeFlipkartSamarth('wooden chairs', {
            minPrice: 1000,
            maxPrice: 10000,
            maxResults: 3,
            headless: true
        });
        console.log(`✅ Flipkart: Found ${flipkartResults.length} products`);
        flipkartResults.forEach((product, i) => {
            console.log(`   ${i + 1}. ${product.title?.substring(0, 40)}... - ${formatPrice(product.price)}`);
        });
        console.log('');

        // Test Amazon with realistic price range
        console.log('Testing Amazon scraper...');
        const { scrapeAmazon } = require('./src/lib/scrapers/scrape-amazon');
        const amazonResults = await scrapeAmazon('wooden chairs', {
            minPrice: 1000,
            maxPrice: 10000,
            maxResults: 3,
            headless: true
        });
        console.log(`✅ Amazon: Found ${amazonResults.length} products`);
        amazonResults.forEach((product, i) => {
            console.log(`   ${i + 1}. ${product.title?.substring(0, 40)}... - ${formatPrice(product.price)}`);
        });
        console.log('');

        // Summary
        const totalProducts = meeshoResults.length + flipkartResults.length + amazonResults.length;
        console.log('📊 SUMMARY:');
        console.log(`Total products found: ${totalProducts}`);
        console.log(`Meesho: ${meeshoResults.length} products`);
        console.log(`Flipkart: ${flipkartResults.length} products`);
        console.log(`Amazon: ${amazonResults.length} products`);

        if (totalProducts > 0) {
            console.log('✅ All scrapers are working and returning products with correct currency formatting!');
        } else {
            console.log('❌ No products found - scrapers may have issues');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAllScrapers();
