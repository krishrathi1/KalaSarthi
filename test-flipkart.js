const { scrapeFlipkartSamarth } = require('./src/lib/scrapers/scrape-flipkart.js');

(async () => {
  try {
    console.log('Testing Flipkart scraper with updated selectors...');
    const results = await scrapeFlipkartSamarth('wooden handicrafts', {
      minPrice: 2500,
      maxPrice: 5000,
      maxResults: 3,
      maxPages: 1,
      headless: true,
      saveDebugFiles: false
    });

    console.log(`Found ${results.length} products:`);
    results.forEach((product, index) => {
      console.log(`${index + 1}. ${product.title}`);
      console.log(`   Price: ₹${product.price}`);
      console.log(`   URL: ${product.url}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
})();