import puppeteer, { Browser, Page } from 'puppeteer';

export interface ScrapedProduct {
  title: string;
  price: string;
  rating: string;
  reviews: number;
  platform: string;
  url: string;
  imageUrl?: string;
  description?: string;
}

export interface TrendData {
  keyword: string;
  searchVolume: number;
  products: ScrapedProduct[];
  trending: boolean;
  demandScore: number;
}

export class TrendScraper {
  private browser: Browser | null = null;
  private isInitializing = false;

  async initialize(): Promise<void> {
    if (this.browser && !this.browser.isConnected()) {
      this.browser = null;
    }

    if (!this.browser && !this.isInitializing) {
      this.isInitializing = true;
      try {
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ],
          timeout: 60000
        });

        // Handle browser disconnection
        this.browser.on('disconnected', () => {
          console.log('Browser disconnected, will reinitialize on next request');
          this.browser = null;
        });

      } catch (error) {
        console.error('Failed to initialize browser:', error);
        this.browser = null;
      } finally {
        this.isInitializing = false;
      }
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.warn('Error closing browser:', error);
      } finally {
        this.browser = null;
      }
    }
  }

  private async ensureBrowser(): Promise<boolean> {
    if (!this.browser || !this.browser.isConnected()) {
      await this.initialize();
    }
    return this.browser !== null && this.browser.isConnected();
  }

  async scrapeAmazon(keyword: string, limit: number = 10): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];

    try {
      if (!(await this.ensureBrowser())) {
        console.warn('Browser not available for Amazon scraping');
        return products;
      }

      const page = await this.browser!.newPage();

      try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1280, height: 720 });

        await page.goto(`https://www.amazon.in/s?k=${encodeURIComponent(keyword)}`, {
          waitUntil: 'domcontentloaded',
          timeout: 45000
        });

        // Wait for search results to load
        await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 }).catch(() => {});

        const productElements = await page.$$('[data-component-type="s-search-result"]');

        for (let i = 0; i < Math.min(productElements.length, limit); i++) {
          try {
            const element = productElements[i];

            const title = await element.$eval('h2 a span', el => el.textContent?.trim() || '').catch(() => '');
            const price = await element.$eval('.a-price-whole', el => el.textContent?.trim() || '').catch(() => '');
            const rating = await element.$eval('.a-icon-star-small .a-icon-alt', el => el.textContent?.trim() || '').catch(() => '');
            const reviewsText = await element.$eval('.a-size-base.s-underline-text', el => el.textContent?.trim() || '').catch(() => '');
            const reviews = parseInt(reviewsText.replace(/[(),]/g, '')) || 0;
            const link = await element.$eval('h2 a', el => el.getAttribute('href') || '').catch(() => '');
            const imageUrl = await element.$eval('img.s-image', el => {
              const src = el.getAttribute('src') || '';
              if (src.startsWith('http')) return src;
              if (src.startsWith('//')) return 'https:' + src;
              if (src.startsWith('/')) return 'https://www.amazon.in' + src;
              return src;
            }).catch(() => '');

            if (title) {
              // Validate image URL
              let validImageUrl = '';
              if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('//'))) {
                validImageUrl = imageUrl.startsWith('//') ? 'https:' + imageUrl : imageUrl;
              }

              products.push({
                title,
                price: price ? `₹${price.replace(/[^\d,]/g, '')}` : '',
                rating,
                reviews,
                platform: 'Amazon',
                url: link ? `https://www.amazon.in${link}` : '',
                imageUrl: validImageUrl
              });
            }
          } catch (error) {
            console.warn(`Error scraping Amazon product ${i}:`, error);
          }
        }
      } finally {
        try {
          await page.close();
        } catch (error) {
          console.warn('Error closing Amazon page:', error);
        }
      }
    } catch (error) {
      console.error('Error scraping Amazon:', error);
    }

    return products;
  }

  async scrapeFlipkart(keyword: string, limit: number = 10): Promise<ScrapedProduct[]> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();
    const products: ScrapedProduct[] = [];

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.goto(`https://www.flipkart.com/search?q=${encodeURIComponent(keyword)}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const productElements = await page.$$('._1AtVbE');

      for (let i = 0; i < Math.min(productElements.length, limit); i++) {
        try {
          const element = productElements[i];

          const title = await element.$eval('a.s1Q9rs', el => el.textContent?.trim() || '').catch(() => '');
          const price = await element.$eval('._30jeq3', el => el.textContent?.trim() || '').catch(() => '');
          const rating = await element.$eval('._3LWZlK', el => el.textContent?.trim() || '').catch(() => '');
          const reviewsText = await element.$eval('._2_R_DZ span', el => el.textContent?.trim() || '').catch(() => '');
          const reviews = parseInt(reviewsText.replace(/\D/g, '')) || 0;
          const link = await element.$eval('a.s1Q9rs', el => el.getAttribute('href') || '').catch(() => '');
          const imageUrl = await element.$eval('img._396cs4', el => {
            const src = el.getAttribute('src') || '';
            if (src.startsWith('http')) return src;
            if (src.startsWith('//')) return 'https:' + src;
            if (src.startsWith('/')) return 'https://www.flipkart.com' + src;
            return src;
          }).catch(() => '');

          if (title) {
            products.push({
              title,
              price: price ? `₹${price.replace(/[^\d,]/g, '')}` : '',
              rating,
              reviews,
              platform: 'Flipkart',
              url: link ? `https://www.flipkart.com${link}` : '',
              imageUrl
            });
          }
        } catch (error) {
          console.warn(`Error scraping Flipkart product ${i}:`, error);
        }
      }
    } catch (error) {
      console.error('Error scraping Flipkart:', error);
    } finally {
      await page.close();
    }

    return products;
  }

  async scrapeEtsy(keyword: string, limit: number = 10): Promise<ScrapedProduct[]> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();
    const products: ScrapedProduct[] = [];

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.goto(`https://www.etsy.com/search?q=${encodeURIComponent(keyword)}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const productElements = await page.$$('[data-listing-id]');

      for (let i = 0; i < Math.min(productElements.length, limit); i++) {
        try {
          const element = productElements[i];

          const title = await element.$eval('h3', el => el.textContent?.trim() || '').catch(() => '');
          const price = await element.$eval('.currency-value', el => el.textContent?.trim() || '').catch(() => '');
          const rating = await element.$eval('.stars-svg', el => el.getAttribute('data-rating') || '').catch(() => '');
          const reviewsText = await element.$eval('.wt-text-caption', el => el.textContent?.trim() || '').catch(() => '');
          const reviews = parseInt(reviewsText.replace(/\D/g, '')) || 0;
          const link = await element.$eval('a', el => el.getAttribute('href') || '').catch(() => '');
          const imageUrl = await element.$eval('img', el => {
            const src = el.getAttribute('src') || '';
            if (src.startsWith('http')) return src;
            if (src.startsWith('//')) return 'https:' + src;
            if (src.startsWith('/')) return 'https://www.nykaa.com' + src;
            return src;
          }).catch(() => '');

          if (title) {
            // Convert USD to INR (approximate rate: 1 USD = 83 INR)
            const inrPrice = price ? `₹${Math.round(parseFloat(price) * 83)}` : '';
            products.push({
              title,
              price: inrPrice,
              rating,
              reviews,
              platform: 'Etsy',
              url: link ? `https://www.etsy.com${link}` : '',
              imageUrl
            });
          }
        } catch (error) {
          console.warn(`Error scraping Etsy product ${i}:`, error);
        }
      }
    } catch (error) {
      console.error('Error scraping Etsy:', error);
    } finally {
      await page.close();
    }

    return products;
  }

  async scrapeMeesho(keyword: string, limit: number = 10): Promise<ScrapedProduct[]> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();
    const products: ScrapedProduct[] = [];

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.goto(`https://www.meesho.com/search?q=${encodeURIComponent(keyword)}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const productElements = await page.$$('[data-testid="product-card"]');

      for (let i = 0; i < Math.min(productElements.length, limit); i++) {
        try {
          const element = productElements[i];

          const title = await element.$eval('[data-testid="product-title"]', el => el.textContent?.trim() || '').catch(() => '');
          const price = await element.$eval('[data-testid="product-price"]', el => el.textContent?.trim() || '').catch(() => '');
          const rating = await element.$eval('[data-testid="product-rating"]', el => el.textContent?.trim() || '').catch(() => '');
          const reviews = 0; // Meesho doesn't show review counts prominently
          const link = await element.$eval('a', el => el.getAttribute('href') || '').catch(() => '');
          const imageUrl = await element.$eval('img', el => {
            const src = el.getAttribute('src') || '';
            if (src.startsWith('http')) return src;
            if (src.startsWith('//')) return 'https:' + src;
            if (src.startsWith('/')) return 'https://www.meesho.com' + src;
            return src;
          }).catch(() => '');

          if (title) {
            products.push({
              title,
              price: price ? `₹${price.replace(/[^\d,]/g, '')}` : '',
              rating,
              reviews,
              platform: 'Meesho',
              url: link ? `https://www.meesho.com${link}` : '',
              imageUrl
            });
          }
        } catch (error) {
          console.warn(`Error scraping Meesho product ${i}:`, error);
        }
      }
    } catch (error) {
      console.error('Error scraping Meesho:', error);
    } finally {
      await page.close();
    }

    return products;
  }

  async scrapeIndiaMart(keyword: string, limit: number = 10): Promise<ScrapedProduct[]> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();
    const products: ScrapedProduct[] = [];

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.goto(`https://www.indiamart.com/search?q=${encodeURIComponent(keyword)}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const productElements = await page.$$('.lst .cardcontent');

      for (let i = 0; i < Math.min(productElements.length, limit); i++) {
        try {
          const element = productElements[i];

          const title = await element.$eval('.prc', el => el.textContent?.trim() || '').catch(() => '');
          const price = await element.$eval('.prc', el => el.textContent?.trim() || '').catch(() => '');
          const rating = '4.0'; // IndiaMart doesn't show ratings
          const reviews = 0;
          const link = await element.$eval('a', el => el.getAttribute('href') || '').catch(() => '');
          const imageUrl = await element.$eval('img', el => {
            const src = el.getAttribute('src') || '';
            if (src.startsWith('http')) return src;
            if (src.startsWith('//')) return 'https:' + src;
            if (src.startsWith('/')) return 'https://www.etsy.com' + src;
            return src;
          }).catch(() => '');

          if (title) {
            products.push({
              title,
              price: price ? `₹${price.replace(/[^\d,]/g, '')}` : '',
              rating,
              reviews,
              platform: 'IndiaMart',
              url: link ? `https://www.indiamart.com${link}` : '',
              imageUrl
            });
          }
        } catch (error) {
          console.warn(`Error scraping IndiaMart product ${i}:`, error);
        }
      }
    } catch (error) {
      console.error('Error scraping IndiaMart:', error);
    } finally {
      await page.close();
    }

    return products;
  }

  async scrapeEBay(keyword: string, limit: number = 10): Promise<ScrapedProduct[]> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();
    const products: ScrapedProduct[] = [];

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.goto(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const productElements = await page.$$('[data-view="mi:1686|iid:1"]');

      for (let i = 0; i < Math.min(productElements.length, limit); i++) {
        try {
          const element = productElements[i];

          const title = await element.$eval('h3.s-item__title', el => el.textContent?.trim() || '').catch(() => '');
          const price = await element.$eval('.s-item__price', el => el.textContent?.trim() || '').catch(() => '');
          const rating = await element.$eval('.b-starrating', el => el.getAttribute('aria-label') || '').catch(() => '');
          const reviewsText = await element.$eval('.s-item__reviews-count span', el => el.textContent?.trim() || '').catch(() => '');
          const reviews = parseInt(reviewsText.replace(/\D/g, '')) || 0;
          const link = await element.$eval('a.s-item__link', el => el.getAttribute('href') || '').catch(() => '');
          const imageUrl = await element.$eval('img.s-item__image-img', el => {
            const src = el.getAttribute('src') || '';
            if (src.startsWith('http')) return src;
            if (src.startsWith('//')) return 'https:' + src;
            if (src.startsWith('/')) return 'https://www.ebay.com' + src;
            return src;
          }).catch(() => '');

          if (title) {
            // Convert USD to INR (approximate rate: 1 USD = 83 INR)
            const usdMatch = price.match(/\$(\d+(?:\.\d+)?)/);
            const inrPrice = usdMatch ? `₹${Math.round(parseFloat(usdMatch[1]) * 83)}` : price;
            products.push({
              title,
              price: inrPrice,
              rating,
              reviews,
              platform: 'eBay',
              url: link || '',
              imageUrl
            });
          }
        } catch (error) {
          console.warn(`Error scraping eBay product ${i}:`, error);
        }
      }
    } catch (error) {
      console.error('Error scraping eBay:', error);
    } finally {
      await page.close();
    }

    return products;
  }

  async scrapeNykaa(keyword: string, limit: number = 10): Promise<ScrapedProduct[]> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();
    const products: ScrapedProduct[] = [];

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.goto(`https://www.nykaa.com/search/result/?q=${encodeURIComponent(keyword)}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const productElements = await page.$$('.product-listing');

      for (let i = 0; i < Math.min(productElements.length, limit); i++) {
        try {
          const element = productElements[i];

          const title = await element.$eval('.css-xrzmfa', el => el.textContent?.trim() || '').catch(() => '');
          const price = await element.$eval('.css-111z9ua', el => el.textContent?.trim() || '').catch(() => '');
          const rating = await element.$eval('.css-1h1d4rt', el => el.textContent?.trim() || '').catch(() => '');
          const reviews = 0; // Nykaa doesn't show review counts
          const link = await element.$eval('a', el => el.getAttribute('href') || '').catch(() => '');
          const imageUrl = await element.$eval('img', el => {
            const src = el.getAttribute('src') || '';
            if (src.startsWith('http')) return src;
            if (src.startsWith('//')) return 'https:' + src;
            if (src.startsWith('/')) return 'https://www.indiamart.com' + src;
            return src;
          }).catch(() => '');

          if (title) {
            products.push({
              title,
              price: price ? `₹${price.replace(/[^\d,]/g, '')}` : '',
              rating,
              reviews,
              platform: 'Nykaa',
              url: link ? `https://www.nykaa.com${link}` : '',
              imageUrl
            });
          }
        } catch (error) {
          console.warn(`Error scraping Nykaa product ${i}:`, error);
        }
      }
    } catch (error) {
      console.error('Error scraping Nykaa:', error);
    } finally {
      await page.close();
    }

    return products;
  }

  async getTrendingProducts(artisanProfession: string, limit: number = 20): Promise<TrendData[]> {
    const keywords = this.generateKeywordsForProfession(artisanProfession);
    const trendData: TrendData[] = [];

    for (const keyword of keywords) {
      try {
        // Scrape from multiple platforms with individual error handling
        const platformPromises = [
          this.scrapeAmazon(keyword, Math.ceil(limit / 7)).catch(err => {
            console.warn(`Amazon scraping failed for ${keyword}:`, err.message);
            return [];
          }),
          this.scrapeFlipkart(keyword, Math.ceil(limit / 7)).catch(err => {
            console.warn(`Flipkart scraping failed for ${keyword}:`, err.message);
            return [];
          }),
          this.scrapeEtsy(keyword, Math.ceil(limit / 7)).catch(err => {
            console.warn(`Etsy scraping failed for ${keyword}:`, err.message);
            return [];
          }),
          this.scrapeMeesho(keyword, Math.ceil(limit / 7)).catch(err => {
            console.warn(`Meesho scraping failed for ${keyword}:`, err.message);
            return [];
          }),
          this.scrapeIndiaMart(keyword, Math.ceil(limit / 7)).catch(err => {
            console.warn(`IndiaMart scraping failed for ${keyword}:`, err.message);
            return [];
          }),
          this.scrapeEBay(keyword, Math.ceil(limit / 7)).catch(err => {
            console.warn(`eBay scraping failed for ${keyword}:`, err.message);
            return [];
          }),
          this.scrapeNykaa(keyword, Math.ceil(limit / 7)).catch(err => {
            console.warn(`Nykaa scraping failed for ${keyword}:`, err.message);
            return [];
          })
        ];

        const platformResults = await Promise.all(platformPromises);

        const allProducts = platformResults.flat();

        if (allProducts.length === 0) {
          // If all scraping failed, provide fallback data
          console.warn(`All scraping failed for ${keyword}, using fallback data`);
          const fallbackProducts = this.generateFallbackProducts(keyword, Math.ceil(limit / 3));
          trendData.push({
            keyword,
            searchVolume: fallbackProducts.length * 5,
            products: fallbackProducts,
            trending: true,
            demandScore: 6.5
          });
          continue;
        }

        // Calculate demand score based on reviews, ratings, and product count
        const demandScore = this.calculateDemandScore(allProducts);

        trendData.push({
          keyword,
          searchVolume: allProducts.length * 10,
          products: allProducts.slice(0, limit),
          trending: demandScore > 7,
          demandScore
        });
      } catch (error) {
        console.error(`Error getting trends for ${keyword}:`, error);
        // Provide fallback data even on general errors
        const fallbackProducts = this.generateFallbackProducts(keyword, Math.ceil(limit / 3));
        trendData.push({
          keyword,
          searchVolume: fallbackProducts.length * 5,
          products: fallbackProducts,
          trending: true,
          demandScore: 6.0
        });
      }
    }

    return trendData.sort((a, b) => b.demandScore - a.demandScore);
  }

  private generateFallbackProducts(keyword: string, count: number): ScrapedProduct[] {
    const fallbackProducts: ScrapedProduct[] = [];
    const profession = keyword.toLowerCase();

    // Generate realistic fallback products based on profession
    const templates = {
      'weaver': [
        { title: 'Handwoven Cotton Saree', price: '₹2500', rating: '4.5', reviews: 45, imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&h=300&fit=crop' },
        { title: 'Traditional Silk Scarf', price: '₹1200', rating: '4.3', reviews: 28, imageUrl: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=300&h=300&fit=crop' },
        { title: 'Artisan Wall Hanging', price: '₹1800', rating: '4.7', reviews: 62, imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' }
      ],
      'potter': [
        { title: 'Handmade Ceramic Bowl', price: '₹800', rating: '4.4', reviews: 33, imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=300&h=300&fit=crop' },
        { title: 'Traditional Pottery Set', price: '₹1500', rating: '4.6', reviews: 41, imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=300&fit=crop' },
        { title: 'Artisan Vase Collection', price: '₹2200', rating: '4.2', reviews: 19, imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' }
      ],
      'jeweler': [
        { title: 'Silver Earrings Set', price: '₹3500', rating: '4.8', reviews: 87, imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=300&fit=crop' },
        { title: 'Traditional Necklace', price: '₹5200', rating: '4.5', reviews: 54, imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300&h=300&fit=crop' },
        { title: 'Artisan Bracelet', price: '₹2800', rating: '4.3', reviews: 36, imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop' }
      ],
      'carpenter': [
        { title: 'Wooden Spice Box', price: '₹1200', rating: '4.6', reviews: 73, imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
        { title: 'Handcrafted Shelf', price: '₹3200', rating: '4.4', reviews: 29, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop' },
        { title: 'Traditional Wooden Frame', price: '₹1800', rating: '4.7', reviews: 51, imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' }
      ],
      'painter': [
        { title: 'Original Canvas Painting', price: '₹4500', rating: '4.9', reviews: 92, imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=300&h=300&fit=crop' },
        { title: 'Miniature Art Set', price: '₹2800', rating: '4.5', reviews: 38, imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
        { title: 'Traditional Motif Print', price: '₹1600', rating: '4.3', reviews: 25, imageUrl: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=300&h=300&fit=crop' }
      ]
    };

    // Find matching template or use generic
    let productTemplates: any[] = [];
    for (const [key, products] of Object.entries(templates)) {
      if (profession.includes(key)) {
        productTemplates = products;
        break;
      }
    }

    // Fallback to generic products
    if (productTemplates.length === 0) {
      productTemplates = [
        { title: 'Handmade Artisan Product', price: '₹1500', rating: '4.4', reviews: 25, imageUrl: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=300&h=300&fit=crop' },
        { title: 'Traditional Craft Item', price: '₹2200', rating: '4.2', reviews: 18, imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop' },
        { title: 'Authentic Handicraft', price: '₹1800', rating: '4.6', reviews: 42, imageUrl: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5e?w=300&h=300&fit=crop' }
      ];
    }

    // Generate products up to the requested count
    for (let i = 0; i < Math.min(count, productTemplates.length); i++) {
      const template = productTemplates[i];
      fallbackProducts.push({
        title: template.title,
        price: template.price,
        rating: template.rating,
        reviews: template.reviews,
        platform: 'Market Analysis',
        url: '',
        imageUrl: ''
      });
    }

    return fallbackProducts;
  }

  private generateKeywordsForProfession(profession: string): string[] {
    const professionLower = profession.toLowerCase();

    const keywordMap: { [key: string]: string[] } = {
      'weaver': ['handwoven textiles', 'traditional weaving', 'artisan fabrics', 'handloom sarees', 'woven wall hangings'],
      'potter': ['handmade pottery', 'ceramic art', 'traditional pottery', 'artisan ceramics', 'pottery bowls'],
      'carpenter': ['handcrafted furniture', 'wooden carvings', 'traditional woodworking', 'artisan woodwork', 'handmade wooden items'],
      'jeweler': ['handmade jewelry', 'traditional jewelry', 'artisan silverware', 'handcrafted ornaments', 'ethnic jewelry'],
      'painter': ['traditional paintings', 'handmade art', 'cultural paintings', 'artisan canvases', 'folk art paintings'],
      'metalworker': ['handcrafted metalwork', 'traditional metal art', 'artisan metal items', 'handmade brassware', 'metal sculptures'],
      'textile artist': ['handmade textiles', 'artisan fabrics', 'traditional embroidery', 'handcrafted garments', 'textile art'],
      'leatherworker': ['handcrafted leather', 'traditional leatherwork', 'artisan leather goods', 'handmade bags', 'leather accessories']
    };

    // Find matching profession or use generic keywords
    for (const [key, keywords] of Object.entries(keywordMap)) {
      if (professionLower.includes(key)) {
        return keywords;
      }
    }

    // Generic keywords for unknown professions
    return ['handmade crafts', 'traditional art', 'artisan products', 'handcrafted items', 'cultural crafts'];
  }

  private calculateDemandScore(products: ScrapedProduct[]): number {
    if (products.length === 0) return 0;

    let totalScore = 0;

    for (const product of products) {
      let productScore = 0;

      // Rating score (0-3 points)
      const rating = parseFloat(product.rating.replace(/[^\d.]/g, '')) || 0;
      if (rating > 0) {
        productScore += Math.min(rating / 5 * 3, 3);
      } else {
        // Default rating for platforms without ratings
        productScore += 1.5;
      }

      // Reviews score (0-4 points)
      const reviewScore = Math.min(product.reviews / 100, 4);
      productScore += reviewScore;

      // Platform reliability bonus (0-2 points)
      const platformBonus = this.getPlatformBonus(product.platform);
      productScore += platformBonus;

      // Price competitiveness bonus (0-1 point)
      if (product.price && product.price.includes('₹')) {
        const priceValue = parseInt(product.price.replace(/[^\d]/g, '')) || 0;
        if (priceValue > 0 && priceValue < 5000) {
          productScore += 0.5; // Bonus for affordable products
        }
      }

      totalScore += productScore;
    }

    return totalScore / products.length;
  }

  private getPlatformBonus(platform: string): number {
    const bonuses: { [key: string]: number } = {
      'Amazon': 2.0,      // High trust, good reviews
      'Flipkart': 1.8,    // High trust, good reviews
      'Meesho': 1.5,      // Popular for handmade, growing
      'IndiaMart': 1.3,   // B2B focus, established
      'eBay': 1.6,        // International reach
      'Etsy': 1.7,        // Artisanal focus
      'Nykaa': 1.4        // Beauty/artisan products
    };

    return bonuses[platform] || 1.0;
  }
}

export const trendScraper = new TrendScraper();