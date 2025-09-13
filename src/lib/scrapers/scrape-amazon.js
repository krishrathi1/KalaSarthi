const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

// Enhanced logging system
class Logger {
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] AMAZON ${level.toUpperCase()}: ${message}`;
        console.log(logMessage);
        if (data) console.log(JSON.stringify(data, null, 2));
    }

    static info(message, data = null) { this.log('info', message, data); }
    static warn(message, data = null) { this.log('warn', message, data); }
    static error(message, data = null) { this.log('error', message, data); }
    static debug(message, data = null) { this.log('debug', message, data); }
}

// Utility functions with enhanced parsing
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
        // Handle formats like "1,234", "5.2K", "1.1M"
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

// Retry mechanism for operations
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

// Enhanced page setup with better stealth
async function setupPage(browser) {
    const page = await browser.newPage();

    // Enhanced stealth setup
    await page.setViewport({ width: 1366, height: 864 });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({
        'accept-language': 'en-IN,en-US;q=0.9,en;q=0.8',
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

        if (['stylesheet', 'font', 'media'].includes(resourceType) ||
            url.includes('google-analytics') ||
            url.includes('amazon-adsystem') ||
            url.includes('doubleclick')) {
            req.abort();
        } else {
            req.continue();
        }
    });

    // Handle dialog boxes
    page.on('dialog', async dialog => {
        Logger.warn('Dialog detected', { message: dialog.message() });
        await dialog.accept();
    });

    return page;
}

// Check for various Amazon blocks/CAPTCHAs
async function checkForBlocks(page, pageNum, saveDebugFiles) {
    const blockSelectors = [
        'form[action*="validateCaptcha"]',
        '#captchacharacters',
        '.g-recaptcha',
        'img[alt*="captcha"]',
        '[data-cy="captcha"]',
        '#auth-captcha-image',
        'input[id*="captcha"]',
        '.cvf-widget-wrapper',
        '[data-testid="captcha"]'
    ];

    for (const selector of blockSelectors) {
        const blockElement = await page.$(selector);
        if (blockElement) {
            if (saveDebugFiles) {
                const html = await page.content();
                const timestamp = Date.now();
                fs.writeFileSync(
                    path.join(process.cwd(), `amazon_block_page${pageNum}_${timestamp}.html`),
                    html,
                    'utf8'
                );
                try {
                    await page.screenshot({
                        path: path.join(process.cwd(), `amazon_block_page${pageNum}_${timestamp}.png`),
                        fullPage: true
                    });
                } catch (e) {
                    Logger.warn('Screenshot failed', { error: e.message });
                }
            }
            throw new Error(`Amazon block/CAPTCHA detected on page ${pageNum}. Selector: ${selector}`);
        }
    }
}

// Advanced scrolling to load all lazy content
async function performSmartScroll(page) {
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let totalHeight = 0;
            let distance = 300;
            const maxScrolls = 15;
            let scrollCount = 0;

            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                scrollCount++;

                // Slow down scrolling as we go deeper
                if (scrollCount > 5) distance = 150;
                if (scrollCount > 10) distance = 100;

                if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
                    clearInterval(timer);
                    // Scroll back to top slowly to trigger any remaining lazy loading
                    window.scrollTo(0, 0);
                    setTimeout(resolve, 500);
                }
            }, 200);
        });
    });
}

// Enhanced product extraction with comprehensive selectors
async function extractProducts(page) {
    await page.waitForSelector('[data-component-type="s-search-result"], .s-result-item', { timeout: 25000 });

    return await page.evaluate(() => {
        const selectors = {
            // Amazon frequently changes selectors, so we have extensive fallbacks
            container: [
                'div[data-component-type="s-search-result"]',
                '.s-result-item',
                '[data-index]',
                '.sg-col-inner'
            ],
            title: [
                'h2 span[aria-label]',
                'h2 a span',
                'h2 span',
                '[data-cy="title-recipe-faceout"] span',
                '.s-link-style span',
                '.a-size-medium span',
                '.a-size-base-plus span'
            ],
            link: [
                'h2 a[href*="/dp/"]',
                'a.a-link-normal[href*="/dp/"]',
                'a[href*="/dp/"]',
                'a.s-link-style[href]',
                '.a-link-normal[href]'
            ],
            price: [
                'span.a-price > span.a-offscreen',
                '.a-price .a-offscreen',
                'span.a-price-whole',
                '.a-price-whole',
                '[data-cy="secondary-offer-recipe"] .a-color-base',
                '.a-color-price'
            ],
            originalPrice: [
                'span.a-price.a-text-price > .a-offscreen',
                '.a-text-strike .a-offscreen',
                '.a-price.a-text-price .a-offscreen'
            ],
            rating: [
                'span.a-icon-alt',
                'i.a-icon-star-small span.a-icon-alt',
                'i.a-icon-star span.a-icon-alt',
                '.a-icon-alt',
                '[aria-label*="stars"]'
            ],
            reviewCount: [
                'span[aria-label$="ratings"]',
                'span[aria-label$="rating"]',
                'span.a-size-base.s-underline-text',
                'span.s-underline-text',
                'a[href*="#customerReviews"] span',
                '.a-link-normal span'
            ],
            image: [
                'img.s-image',
                '.s-product-image-container img',
                'img[data-image-latency]',
                '.a-dynamic-image'
            ],
            prime: [
                '[aria-label*="Prime"]',
                '.a-icon-prime',
                '[data-cy*="prime"]'
            ],
            sponsored: [
                'span[data-component-type*="sp-sponsored-result"]',
                '.s-sponsored-list-header',
                '[data-cy="sponsored-product"]'
            ]
        };

        function getTextBySelectorArray(card, selectorArray) {
            for (const selector of selectorArray) {
                const element = card.querySelector(selector);
                if (element) {
                    return element.textContent?.trim() ||
                        element.getAttribute('aria-label')?.trim() ||
                        element.getAttribute('alt')?.trim() ||
                        element.getAttribute('title')?.trim() || null;
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

        function hasElementBySelector(card, selectorArray) {
            return selectorArray.some(selector => card.querySelector(selector) !== null);
        }

        // Find product containers
        let cards = [];
        for (const containerSelector of selectors.container) {
            cards = document.querySelectorAll(containerSelector);
            if (cards.length > 0) {
                console.log(`Found ${cards.length} product cards using: ${containerSelector}`);
                break;
            }
        }

        if (cards.length === 0) {
            console.warn('No product cards found with any selector');
            return [];
        }

        return Array.from(cards).map((card, index) => {
            const title = getTextBySelectorArray(card, selectors.title);
            let href = getAttributeBySelectorArray(card, selectors.link, 'href');

            // Ensure full URL
            if (href && !href.startsWith('http')) {
                href = 'https://www.amazon.in' + href;
            }

            const priceText = getTextBySelectorArray(card, selectors.price);
            const originalPriceText = getTextBySelectorArray(card, selectors.originalPrice);
            const ratingText = getTextBySelectorArray(card, selectors.rating);
            const reviewCountText = getTextBySelectorArray(card, selectors.reviewCount);
            const image = getAttributeBySelectorArray(card, selectors.image, 'src');

            // Additional metadata
            const isPrime = hasElementBySelector(card, selectors.prime);
            const isSponsored = hasElementBySelector(card, selectors.sponsored);

            return {
                title: title || '',
                url: href,
                priceText: priceText || '',
                originalPriceText: originalPriceText || '',
                ratingText: ratingText || '',
                reviewCountText: reviewCountText || '',
                image: image,
                isPrime,
                isSponsored,
                cardIndex: index
            };
        }).filter(p => p.url && p.title && p.priceText);
    });
}

// Build Amazon Karigar search URL with advanced filters
function buildKarigarSearchUrl(categoryQuery, options, pageNum = 1) {
    const { minPrice, maxPrice, sortBy = 'price-asc-rank' } = options;

    // Convert prices to paise (Amazon uses paise for price filtering)
    const minPricePaise = minPrice * 100;
    const maxPricePaise = maxPrice * 100;

    const params = new URLSearchParams({
        k: `${categoryQuery} karigar handmade handicraft`,
        s: sortBy,
        rh: `p_36:${minPricePaise}-${maxPricePaise}`, // Price filter
        page: pageNum.toString(),
        ref: 'sr_pg_' + pageNum
    });

    // Add additional filters for better Karigar targeting
    params.append('rh', 'p_85:2470955031'); // Handmade products category if available

    return `https://www.amazon.in/s?${params.toString()}`;
}

// Main enhanced scraping function for Amazon Karigar
async function scrapeAmazon(categoryQuery, options = {}) {
    const {
        minPrice = 2500,
        maxPrice = 5000,
        maxResults = 10,
        maxPages = 3,
        headless = true,
        saveDebugFiles = true,
        sortBy = 'price-asc-rank',
        excludeSponsored = true,
        requireRating = false
    } = options;

    Logger.info('Starting Amazon Karigar scrape', {
        categoryQuery,
        minPrice,
        maxPrice,
        maxResults,
        sortBy
    });

    const browser = await puppeteer.launch({
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
    });

    let allProducts = [];
    let consecutiveEmptyPages = 0;

    try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            Logger.info(`Processing page ${pageNum}/${maxPages}`);

            const page = await setupPage(browser);

            try {
                // Navigate with retry mechanism
                await retryOperation(async () => {
                    const url = buildKarigarSearchUrl(categoryQuery, options, pageNum);

                    await page.goto(url, {
                        waitUntil: 'networkidle2',
                        timeout: 30000
                    });

                    Logger.info(`Loaded page ${pageNum}`, { url: page.url() });

                    // Check page title for validation
                    const title = await page.title();
                    if (title.toLowerCase().includes('robot') || title.toLowerCase().includes('sorry')) {
                        throw new Error('Page indicates bot detection');
                    }
                });

                // Add random human-like delay
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

                // Check for blocks/CAPTCHAs
                await checkForBlocks(page, pageNum, saveDebugFiles);

                // Perform smart scrolling to load all content
                await performSmartScroll(page);

                // Wait a bit more for dynamic content
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Extract products
                const products = await extractProducts(page);
                Logger.info(`Found ${products.length} raw products on page ${pageNum}`);

                // Handle empty results
                if (products.length === 0) {
                    consecutiveEmptyPages++;
                    if (saveDebugFiles) {
                        const html = await page.content();
                        const timestamp = Date.now();
                        fs.writeFileSync(
                            path.join(process.cwd(), `amazon_empty_page${pageNum}_${timestamp}.html`),
                            html,
                            'utf8'
                        );
                        Logger.warn(`Empty page ${pageNum}, debug file saved`);
                    }

                    if (consecutiveEmptyPages >= 2) {
                        Logger.warn('Two consecutive empty pages, stopping pagination');
                        await page.close();
                        break;
                    }
                } else {
                    consecutiveEmptyPages = 0;
                }

                // Parse and enrich products
                let enrichedProducts = products.map(p => ({
                    ...p,
                    price: parseIndianPrice(p.priceText),
                    originalPrice: parseIndianPrice(p.originalPriceText),
                    rating: parseRating(p.ratingText),
                    reviewCount: parseReviewCount(p.reviewCountText),
                    discount: p.originalPrice && p.price ?
                        Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : null,
                    page: pageNum,
                    platform: 'amazon'
                }));

                // Apply filters
                enrichedProducts = enrichedProducts.filter(p => {
                    // Basic price and title filter
                    if (!p.price || p.price < minPrice || p.price > maxPrice || !p.title.length) {
                        return false;
                    }

                    // Exclude sponsored if requested
                    if (excludeSponsored && p.isSponsored) {
                        return false;
                    }

                    // Require rating if requested
                    if (requireRating && !p.rating) {
                        return false;
                    }

                    return true;
                });

                Logger.info(`Page ${pageNum}: ${enrichedProducts.length} products after filtering`);
                allProducts.push(...enrichedProducts);

                await page.close();

                // Break if we have enough products
                if (allProducts.length >= maxResults * 1.5) {
                    Logger.info('Sufficient products found, stopping pagination');
                    break;
                }

                // Add delay between pages
                if (pageNum < maxPages) {
                    const delay = 3000 + Math.random() * 4000;
                    Logger.info(`Waiting ${Math.round(delay)}ms before next page...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

            } catch (pageError) {
                Logger.error(`Error on page ${pageNum}`, { error: pageError.message });
                if (page && !page.isClosed()) {
                    await page.close();
                }

                // If it's a block/CAPTCHA, stop scraping
                if (pageError.message.includes('block') || pageError.message.includes('CAPTCHA')) {
                    Logger.error('Scraping blocked by Amazon, stopping');
                    break;
                }
                continue;
            }
        }

        // Enhanced sorting with multiple criteria
        allProducts.sort((a, b) => {
            // Primary: Rating (desc)
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            if (Math.abs(ratingB - ratingA) > 0.1) return ratingB - ratingA;

            // Secondary: Review count (desc)
            const reviewsA = a.reviewCount || 0;
            const reviewsB = b.reviewCount || 0;
            if (reviewsB !== reviewsA) return reviewsB - reviewsA;

            // Tertiary: Price (asc) 
            const priceA = a.price || Infinity;
            const priceB = b.price || Infinity;
            if (Math.abs(priceA - priceB) > 50) return priceA - priceB;

            // Quaternary: Prime preference
            if (a.isPrime !== b.isPrime) return b.isPrime - a.isPrime;

            return 0;
        });

        // Remove duplicates based on URL
        const uniqueProducts = allProducts.filter((product, index, array) =>
            array.findIndex(p => p.url === product.url) === index
        );

        const finalProducts = uniqueProducts.slice(0, maxResults);

        // Generate summary statistics
        const stats = {
            totalScraped: allProducts.length,
            afterDeduplication: uniqueProducts.length,
            returned: finalProducts.length,
            averagePrice: finalProducts.length > 0 ?
                Math.round(finalProducts.reduce((sum, p) => sum + p.price, 0) / finalProducts.length) : 0,
            withRating: finalProducts.filter(p => p.rating).length,
            primeProducts: finalProducts.filter(p => p.isPrime).length,
            averageRating: finalProducts.filter(p => p.rating).length > 0 ?
                (finalProducts.filter(p => p.rating).reduce((sum, p) => sum + p.rating, 0) /
                    finalProducts.filter(p => p.rating).length).toFixed(1) : 'N/A'
        };

        Logger.info('Amazon Karigar scraping completed', stats);

        return finalProducts;

    } catch (error) {
        Logger.error('Amazon scraping failed', { error: error.message, stack: error.stack });
        throw error;
    } finally {
        await browser.close();
    }
}

// Enhanced helper function for bulk scraping
async function scrapeMultipleCategories(categories, options = {}) {
    const results = {};

    Logger.info('Starting bulk Amazon Karigar scraping', { categories: categories.length });

    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        Logger.info(`Processing category ${i + 1}/${categories.length}: ${category}`);

        try {
            results[category] = await scrapeAmazon(category, options);

            // Add delay between categories
            if (i < categories.length - 1) {
                const delay = 15000 + Math.random() * 10000;
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
    scrapeAmazon,
    scrapeMultipleCategories,
    Logger
};

// Example usage with advanced options
if (require.main === module) {
    (async () => {
        try {
            const results = await scrapeAmazon('wooden handicrafts', {
                minPrice: 2500,
                maxPrice: 5000,
                maxResults: 15,
                maxPages: 3,
                headless: true,
                saveDebugFiles: true,
                sortBy: 'price-asc-rank', // Options: 'relevanceblender', 'price-asc-rank', 'price-desc-rank', 'review-rank'
                excludeSponsored: true,
                requireRating: false
            });

            console.log('\n🎯 AMAZON KARIGAR RESULTS 🎯');
            console.log('='.repeat(50));

            results.forEach((product, index) => {
                console.log(`\n${index + 1}. ${product.title}`);
                console.log(`   💰 Price: ₹${product.price}`);
                if (product.originalPrice && product.originalPrice > product.price) {
                    console.log(`   💸 Original: ₹${product.originalPrice} (${product.discount}% off)`);
                }
                console.log(`   ⭐ Rating: ${product.rating || 'N/A'} (${product.reviewCount || 0} reviews)`);
                if (product.isPrime) console.log(`   🚚 Prime Available`);
                if (product.isSponsored) console.log(`   📢 Sponsored`);
                console.log(`   🔗 URL: ${product.url}`);
            });

        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    })();
}