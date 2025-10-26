const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

// Enhanced logging system
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

// Utility functions for parsing Meesho data
function parseIndianPrice(text) {
    if (!text) return null;
    try {
        const normalized = text
            .replace(/[\s,]/g, '')
            .replace(/\u20B9/g, '')
            .replace(/₹/g, '')
            .replace(/\.(?=\d{3})/g, '');
        const match = normalized.match(/(\d+(?:\.\d+)?)/);
        return match ? Number(match[1]) : null;
    } catch (error) {
        Logger.warn('Price parsing failed', { text, error: error.message });
        return null;
    }
}

function parseRating(text) {
    if (!text) return null;
    try {
        const match = text.match(/([0-9]+(?:\.[0-9]+)?)/);
        const rating = match ? Number(match[1]) : null;
        return (rating && rating >= 0 && rating <= 5) ? rating : null;
    } catch (error) {
        Logger.warn('Rating parsing failed', { text, error: error.message });
        return null;
    }
}

function parseReviewCount(text) {
    if (!text) return 0;
    try {
        // Handle formats like "1,234", "5.2K", "1.1M", "(123)", "123 reviews"
        const cleanText = text.replace(/[^\d.KkMm]/g, '');
        if (cleanText.includes('K') || cleanText.includes('k')) {
            const num = parseFloat(cleanText.replace(/[Kk]/g, ''));
            return Math.round(num * 1000);
        }
        if (cleanText.includes('M') || cleanText.includes('m')) {
            const num = parseFloat(cleanText.replace(/[Mm]/g, ''));
            return Math.round(num * 1000000);
        }
        const digits = text.replace(/[^0-9]/g, '');
        return digits ? Number(digits) : 0;
    } catch (error) {
        Logger.warn('Review count parsing failed', { text, error: error.message });
        return 0;
    }
}

// Retry mechanism
async function retryOperation(operation, maxRetries = 3, baseDelay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            Logger.warn(`Operation failed, attempt ${attempt}/${maxRetries}`, { error: error.message });
            if (attempt === maxRetries) {
                throw new Error(`Operation failed after ${maxRetries} attempts: ${error.message}`);
            }
            const delay = baseDelay * attempt + Math.random() * 1000;
            Logger.info(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Enhanced page setup for Meesho
async function setupPage(browser) {
    const page = await browser.newPage();

    await page.setViewport({ width: 1366, height: 864 });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({
        'accept-language': 'en-IN,en-US;q=0.9,en;q=0.8,hi;q=0.7',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        'upgrade-insecure-requests': '1',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"'
    });

    // Block unnecessary resources for faster loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const resourceType = req.resourceType();
        const url = req.url();

        // Block specific resource types and analytics
        if (['stylesheet', 'font', 'media'].includes(resourceType) ||
            url.includes('google-analytics') ||
            url.includes('facebook') ||
            url.includes('doubleclick')) {
            req.abort();
        } else {
            req.continue();
        }
    });

    // Handle dialogs
    page.on('dialog', async dialog => {
        Logger.warn('Dialog detected', { message: dialog.message() });
        await dialog.accept();
    });

    return page;
}

// Handle location popup that often appears on Meesho
async function handleLocationPopup(page) {
    try {
        const locationPopupSelectors = [
            '[data-testid="close-button"]',
            'button[aria-label="close"]',
            '.close-btn',
            '[class*="close"]',
            'svg[class*="close"]'
        ];

        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for popup to appear

        for (const selector of locationPopupSelectors) {
            const element = await page.$(selector);
            if (element) {
                await element.click();
                Logger.info(`Closed location popup using selector: ${selector}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return true;
            }
        }

        // Try pressing Escape key as fallback
        await page.keyboard.press('Escape');
        Logger.info('Attempted to close popup with Escape key');

    } catch (error) {
        Logger.debug('No location popup found or failed to close', { error: error.message });
    }
    return false;
}

// Extract products from Meesho
async function extractProducts(page) {
    // Wait for product grid to load
    await page.waitForSelector('div[data-testid], .ProductList__GridCol, [class*="product"], [class*="card"]', { timeout: 25000 });

    // Wait a bit more for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    return await page.evaluate(() => {
        const selectors = {
            container: [
                'div[data-testid*="product"]',
                '.ProductList__GridCol',
                '[class*="product-card"]',
                '[class*="ProductCard"]',
                'div[class*="Card"]'
            ],
            title: [
                'p[data-testid="product-title"]',
                '[class*="product-title"]',
                '[class*="ProductTitle"]',
                'h3',
                'h4',
                '[data-testid="title"]'
            ],
            link: [
                'a[href*="/product/"]',
                'a[data-testid*="product"]',
                'a[href*="/p/"]'
            ],
            price: [
                'h4[data-testid="product-price"]',
                '[class*="product-price"]',
                '[class*="Price"]',
                '[data-testid="price"]',
                'span[class*="price"]'
            ],
            originalPrice: [
                '[data-testid="striked-price"]',
                '[class*="striked-price"]',
                '[class*="original-price"]',
                'span[class*="strikethrough"]'
            ],
            rating: [
                'span[data-testid="product-rating"]',
                '[class*="rating"]',
                '[data-testid="rating"]'
            ],
            reviewCount: [
                'span[data-testid="product-review-count"]',
                '[class*="review-count"]',
                '[data-testid="review-count"]'
            ],
            image: [
                'img[data-testid="product-image"]',
                'img[alt*="product"]',
                '.ProductImage img',
                'img[src*="product"]'
            ],
            discount: [
                'span[data-testid="discount-percentage"]',
                '[class*="discount"]',
                '[data-testid="discount"]'
            ]
        };

        function getTextBySelectorArray(card, selectorArray) {
            for (const selector of selectorArray) {
                const element = card.querySelector(selector);
                if (element) {
                    return element.textContent?.trim() ||
                        element.getAttribute('title')?.trim() ||
                        element.getAttribute('alt')?.trim() || null;
                }
            }
            return null;
        }

        function getAttributeBySelectorArray(card, selectorArray, attribute) {
            for (const selector of selectorArray) {
                const element = card.querySelector(selector);
                if (element) {
                    return element.getAttribute(attribute);
                }
            }
            return null;
        }

        // Find product containers
        let cards = [];
        for (const containerSelector of selectors.container) {
            cards = document.querySelectorAll(containerSelector);
            if (cards.length > 0) {
                console.log(`Found ${cards.length} products using selector: ${containerSelector}`);
                break;
            }
        }

        return Array.from(cards).map((card, index) => {
            const title = getTextBySelectorArray(card, selectors.title);
            let href = getAttributeBySelectorArray(card, selectors.link, 'href');

            if (href && !href.startsWith('http')) {
                href = 'https://www.meesho.com' + href;
            }

            const priceText = getTextBySelectorArray(card, selectors.price);
            const originalPriceText = getTextBySelectorArray(card, selectors.originalPrice);
            const ratingText = getTextBySelectorArray(card, selectors.rating);
            const reviewCountText = getTextBySelectorArray(card, selectors.reviewCount);
            const image = getAttributeBySelectorArray(card, selectors.image, 'src');
            const discountText = getTextBySelectorArray(card, selectors.discount);

            return {
                title: title || '',
                url: href,
                priceText: priceText || '',
                originalPriceText: originalPriceText || '',
                ratingText: ratingText || '',
                reviewCountText: reviewCountText || '',
                discountText: discountText || '',
                image: image
            };
        }).filter(p => p.url && p.title && p.priceText);
    });
}

// Main scraping function for Meesho
async function scrapeMeesho(categoryQuery, options = {}) {
    const {
        minPrice = 2500,
        maxPrice = 5000,
        maxResults = 10,
        maxPages = 2,
        headless = true,
        saveDebugFiles = true
    } = options;

    Logger.info('Starting Meesho scrape', { categoryQuery, minPrice, maxPrice, maxResults });

    // Auto-detect browser executable path based on platform
    const getBrowserExecutablePath = () => {
        const os = require('os');
        const platform = os.platform();
        
        if (platform === 'win32') {
            // Windows paths for Chrome and Edge
            const possiblePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
                'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
            ];
            
            for (const path of possiblePaths) {
                try {
                    if (require('fs').existsSync(path)) {
                        Logger.info('Found browser executable', { path });
                        return path;
                    }
                } catch (e) {
                    // Continue to next path
                }
            }
            Logger.warn('No browser executable found in common Windows paths');
        } else if (platform === 'darwin') {
            // macOS path
            const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
            if (require('fs').existsSync(chromePath)) {
                return chromePath;
            }
        }
        
        // Linux or fallback - let Puppeteer auto-detect
        return undefined;
    };

    const executablePath = getBrowserExecutablePath();
    const launchOptions = {
        headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=VizDisplayCompositor'
        ]
    };

    if (executablePath) {
        launchOptions.executablePath = executablePath;
        Logger.info('Using browser executable path', { executablePath });
    } else {
        Logger.info('Using default browser detection');
    }

    const browser = await puppeteer.launch(launchOptions);

    let allProducts = [];

    try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            Logger.info(`Processing page ${pageNum}/${maxPages}`);

            const page = await setupPage(browser);

            try {
                // Navigate to Meesho search
                await retryOperation(async () => {
                    // Meesho search URL structure
                    const searchQuery = `${categoryQuery} handicraft handmade`;
                    const url = `https://www.meesho.com/search?q=${encodeURIComponent(searchQuery)}&searchType=manual&searchIdentifier=text_search`;

                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                    Logger.info(`Loaded page ${pageNum}`, { url: page.url() });
                });

                // Handle location popup
                await handleLocationPopup(page);

                // Add random delay
                await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

                // Apply price filters if available
                try {
                    // Look for price filter options
                    const priceFilterSelectors = [
                        'input[placeholder*="min"]',
                        'input[placeholder*="Min"]',
                        '[data-testid*="price-min"]'
                    ];

                    for (const selector of priceFilterSelectors) {
                        const minPriceInput = await page.$(selector);
                        if (minPriceInput) {
                            await minPriceInput.click();
                            await minPriceInput.type(minPrice.toString());
                            Logger.info(`Set minimum price filter: ${minPrice}`);
                            break;
                        }
                    }

                    const maxPriceFilterSelectors = [
                        'input[placeholder*="max"]',
                        'input[placeholder*="Max"]',
                        '[data-testid*="price-max"]'
                    ];

                    for (const selector of maxPriceFilterSelectors) {
                        const maxPriceInput = await page.$(selector);
                        if (maxPriceInput) {
                            await maxPriceInput.click();
                            await maxPriceInput.type(maxPrice.toString());
                            Logger.info(`Set maximum price filter: ${maxPrice}`);

                            // Look for apply/submit button
                            const applyButtonSelectors = [
                                'button[data-testid*="apply"]',
                                'button[type="submit"]',
                                'button:contains("Apply")'
                            ];

                            for (const btnSelector of applyButtonSelectors) {
                                const applyBtn = await page.$(btnSelector);
                                if (applyBtn) {
                                    await applyBtn.click();
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    Logger.info('Applied price filters');
                                    break;
                                }
                            }
                            break;
                        }
                    }
                } catch (filterError) {
                    Logger.debug('Price filter application failed', { error: filterError.message });
                }

                // Infinite scroll to load more products
                await page.evaluate(async () => {
                    await new Promise(resolve => {
                        let totalHeight = 0;
                        const distance = 400;
                        const scrollDelay = 500;
                        let scrollCount = 0;
                        const maxScrolls = 10;

                        const timer = setInterval(() => {
                            const scrollHeight = document.body.scrollHeight;
                            window.scrollBy(0, distance);
                            totalHeight += distance;
                            scrollCount++;

                            if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, scrollDelay);
                    });
                });

                // Wait for dynamic content to load after scrolling
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Navigate to specific page if not first page
                if (pageNum > 1) {
                    try {
                        // Look for pagination
                        const nextPageSelectors = [
                            `a[aria-label="Page ${pageNum}"]`,
                            `button[aria-label="Page ${pageNum}"]`,
                            `a:contains("${pageNum}")`,
                            'a[aria-label="Next"]'
                        ];

                        for (const selector of nextPageSelectors) {
                            const pageLink = await page.$(selector);
                            if (pageLink) {
                                await pageLink.click();
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                Logger.info(`Navigated to page ${pageNum}`);
                                break;
                            }
                        }
                    } catch (paginationError) {
                        Logger.debug('Pagination failed', { error: paginationError.message });
                    }
                }

                // Extract products
                const products = await extractProducts(page);
                Logger.info(`Found ${products.length} raw products on page ${pageNum}`);

                if (products.length === 0 && saveDebugFiles) {
                    const html = await page.content();
                    fs.writeFileSync(
                        path.join(process.cwd(), `meesho_debug_page${pageNum}.html`),
                        html,
                        'utf8'
                    );
                    Logger.warn(`No products found on page ${pageNum}, debug file saved`);
                }

                // Parse and enrich products
                const enrichedProducts = products.map(p => ({
                    ...p,
                    price: parseIndianPrice(p.priceText),
                    originalPrice: parseIndianPrice(p.originalPriceText),
                    rating: parseRating(p.ratingText),
                    reviewCount: parseReviewCount(p.reviewCountText),
                    discount: p.discountText,
                    page: pageNum,
                    platform: 'meesho'
                })).filter(p =>
                    p.price !== null &&
                    p.price >= minPrice &&
                    p.price <= maxPrice &&
                    p.title.length > 0
                );

                Logger.info(`Page ${pageNum}: ${enrichedProducts.length} products after filtering`);
                allProducts.push(...enrichedProducts);

                await page.close();

                // Break if we have enough products
                if (allProducts.length >= maxResults * 2) {
                    Logger.info('Sufficient products found, stopping pagination');
                    break;
                }

                // Add delay between pages
                if (pageNum < maxPages) {
                    const delay = 4000 + Math.random() * 3000;
                    Logger.info(`Waiting ${Math.round(delay)}ms before next page...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

            } catch (pageError) {
                Logger.error(`Error on page ${pageNum}`, { error: pageError.message });
                if (page && !page.isClosed()) {
                    await page.close();
                }
                continue;
            }
        }

        // Sort by rating (desc), then by review count (desc), then by price (asc)
        allProducts.sort((a, b) => {
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;

            if (ratingB !== ratingA) return ratingB - ratingA;

            const reviewsA = a.reviewCount || 0;
            const reviewsB = b.reviewCount || 0;

            if (reviewsB !== reviewsA) return reviewsB - reviewsA;

            return (a.price || 0) - (b.price || 0);
        });

        // Remove duplicates based on URL
        const uniqueProducts = allProducts.filter((product, index, array) =>
            array.findIndex(p => p.url === product.url) === index
        );

        const finalProducts = uniqueProducts.slice(0, maxResults);

        Logger.info('Meesho scraping completed', {
            totalFound: allProducts.length,
            afterDeduplication: uniqueProducts.length,
            returned: finalProducts.length
        });

        return finalProducts;

    } catch (error) {
        Logger.error('Meesho scraping failed', { error: error.message });
        throw error;
    } finally {
        await browser.close();
    }
}

// Helper function for bulk scraping
async function scrapeMultipleCategories(categories, options = {}) {
    const results = {};

    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        Logger.info(`Processing category ${i + 1}/${categories.length}: ${category}`);

        try {
            results[category] = await scrapeMeesho(category, options);

            if (i < categories.length - 1) {
                const delay = 12000 + Math.random() * 8000; // Longer delay for Meesho
                Logger.info(`Waiting ${Math.round(delay)}ms before next category...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        } catch (error) {
            Logger.error(`Failed to scrape category: ${category}`, { error: error.message });
            results[category] = [];
        }
    }

    return results;
}

module.exports = {
    scrapeMeesho,
    scrapeMultipleCategories,
    Logger
};

// Example usage
if (require.main === module) {
    (async () => {
        try {
            const results = await scrapeMeesho('wooden handicrafts', {
                minPrice: 2500,
                maxPrice: 5000,
                maxResults: 10,
                maxPages: 2,
                headless: true,
                saveDebugFiles: true
            });

            console.log('\nMeesho Results:');
            results.forEach((product, index) => {
                console.log(`\n${index + 1}. ${product.title}`);
                console.log(`   Price: ₹${product.price}`);
                if (product.originalPrice && product.originalPrice > product.price) {
                    console.log(`   Original Price: ₹${product.originalPrice}`);
                }
                console.log(`   Rating: ${product.rating || 'N/A'} (${product.reviewCount || 0} reviews)`);
                if (product.discount) {
                    console.log(`   Discount: ${product.discount}`);
                }
                console.log(`   URL: ${product.url}`);
            });
        } catch (error) {
            console.error('Error:', error.message);
        }
    })();
}