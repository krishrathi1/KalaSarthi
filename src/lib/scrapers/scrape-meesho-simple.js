const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class Logger {
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] MEESHO ${level.toUpperCase()}: ${message}`;
        console.log(logMessage);
        if (data) console.log(JSON.stringify(data, null, 2));
    }

    static info(message, data = null) { this.log('info', message, data); }
    static warn(message, data = null) { this.log('warn', message, data); }
    static error(message, data = null) { this.log('error', message, data); }
    static debug(message, data = null) { this.log('debug', message, data); }
}

function parseIndianPrice(text) {
    if (!text) return null;
    try {
        // Look for price patterns like ₹280, ₹2,049, etc.
        const pricePatterns = [
            /₹\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,  // ₹2,049 or ₹280
            /₹\s*(\d+(?:\.\d{2})?)/g,                  // ₹280.50
            /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*₹/g,  // 2,049₹
        ];

        for (const pattern of pricePatterns) {
            const matches = [...text.matchAll(pattern)];
            if (matches.length > 0) {
                // Take the first match and clean it
                let priceStr = matches[0][1];
                priceStr = priceStr.replace(/,/g, ''); // Remove commas
                const price = parseFloat(priceStr);
                if (!isNaN(price) && price > 0) {
                    return price;
                }
            }
        }

        // Fallback: extract all numbers and take the largest reasonable one
        const numbers = text.match(/\d+(?:,\d{3})*(?:\.\d{2})?/g);
        if (numbers) {
            const parsedNumbers = numbers
                .map(n => parseFloat(n.replace(/,/g, '')))
                .filter(n => n > 0 && n < 1000000); // Reasonable price range

            if (parsedNumbers.length > 0) {
                // Return the largest number that could be a price
                return Math.max(...parsedNumbers);
            }
        }

        return null;
    } catch (error) {
        Logger.warn('Price parsing failed', { text, error: error.message });
        return null;
    }
}

async function scrapeMeeshoSimple(categoryQuery, options = {}) {
    const {
        minPrice = 2500,
        maxPrice = 5000,
        maxResults = 10,
        headless = true
    } = options;

    Logger.info('Starting Simple Meesho scrape', { categoryQuery, minPrice, maxPrice, maxResults });

    const browser = await puppeteer.launch({
        headless,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--allow-running-insecure-content'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 864 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Navigate to Meesho
        const url = `https://www.meesho.com/search?q=${encodeURIComponent(categoryQuery)}`;
        Logger.info('Navigating to Meesho', { url });

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 15000
        });

        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Handle popup
        try {
            await page.keyboard.press('Escape');
            Logger.info('Attempted to close popup');
        } catch (e) {
            Logger.debug('No popup to close');
        }

        // Extract products using simple selectors
        const products = await page.evaluate(() => {
            const results = [];

            // Try multiple selectors for product links
            const selectors = [
                'a[href*="/product/"]',
                'a[href*="/p/"]',
                '[class*="ProductCard"]',
                '[class*="product-card"]',
                '[data-testid*="product"]'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`Found ${elements.length} elements with selector: ${selector}`);

                    elements.forEach((element, index) => {
                        if (index >= 10) return; // Limit to first 10

                        let title = '';
                        let url = '';
                        let price = '';

                        // Try to get title
                        const titleSelectors = ['h3', 'h4', 'p', 'span', '[class*="title"]'];
                        for (const titleSel of titleSelectors) {
                            const titleEl = element.querySelector(titleSel);
                            if (titleEl && titleEl.textContent.trim()) {
                                title = titleEl.textContent.trim();
                                break;
                            }
                        }

                        // Try to get URL
                        if (element.tagName === 'A') {
                            url = element.href;
                        } else {
                            const linkEl = element.querySelector('a[href*="/product/"], a[href*="/p/"]');
                            if (linkEl) {
                                url = linkEl.href;
                            }
                        }

                        // Try to get price
                        const priceSelectors = ['[class*="price"]', 'span', 'p', 'div'];
                        for (const priceSel of priceSelectors) {
                            const priceEl = element.querySelector(priceSel);
                            if (priceEl && priceEl.textContent.includes('₹')) {
                                price = priceEl.textContent.trim();
                                break;
                            }
                        }

                        if (title && url) {
                            results.push({
                                title: title.substring(0, 100),
                                url: url,
                                priceText: price,
                                platform: 'meesho'
                            });
                        }
                    });

                    if (results.length > 0) break;
                }
            }

            return results;
        });

        Logger.info(`Found ${products.length} raw products`);

        // Debug: Log sample products with their price parsing
        if (products.length > 0) {
            Logger.info('Sample products with price parsing:', products.slice(0, 3).map(p => ({
                title: p.title?.substring(0, 50),
                priceText: p.priceText,
                parsedPrice: parseIndianPrice(p.priceText)
            })));
        }

        // Parse and filter products
        const enrichedProducts = products.map(p => ({
            ...p,
            price: parseIndianPrice(p.priceText),
            platform: 'meesho'
        })).filter(p => {
            const hasValidPrice = p.price !== null && p.price >= minPrice && p.price <= maxPrice;
            const hasValidTitle = p.title.length > 0;

            if (!hasValidPrice) {
                Logger.debug(`Product filtered out - price: ${p.price}, priceText: ${p.priceText}, title: ${p.title?.substring(0, 30)}`);
            }

            return hasValidPrice && hasValidTitle;
        });

        const finalProducts = enrichedProducts.slice(0, maxResults);

        Logger.info('Simple Meesho scraping completed', {
            totalFound: products.length,
            afterFiltering: enrichedProducts.length,
            returned: finalProducts.length
        });

        await page.close();
        return finalProducts;

    } catch (error) {
        Logger.error('Simple Meesho scraping failed', { error: error.message });
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = {
    scrapeMeeshoSimple,
    Logger
};

// Test usage
if (require.main === module) {
    (async () => {
        try {
            const results = await scrapeMeeshoSimple('wooden chairs', {
                minPrice: 2500,
                maxPrice: 5000,
                maxResults: 5,
                headless: true
            });

            console.log('\nSimple Meesho Results:');
            results.forEach((product, index) => {
                console.log(`\n${index + 1}. ${product.title}`);
                console.log(`   Price: ₹${product.price}`);
                console.log(`   URL: ${product.url}`);
            });
        } catch (error) {
            console.error('Error:', error.message);
        }
    })();
}
