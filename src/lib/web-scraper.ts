/**
 * Web scraping service for ecommerce platforms
 * Uses Puppeteer to scrape product data from various platforms
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface ScrapedProductData {
  title: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  platform: string;
  url: string;
  imageUrl: string;
  availability: boolean;
  seller?: string;
  category?: string;
  description?: string;
}

export interface ScrapingResult {
  success: boolean;
  products: ScrapedProductData[];
  totalFound: number;
  error?: string;
}

class WebScraperService {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async createPage(): Promise<Page> {
    if (!this.browser) {
      await this.initialize();
    }
    const page = await this.browser!.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    return page;
  }

  async scrapeAmazon(searchTerm: string, limit: number = 10): Promise<ScrapingResult> {
    const page = await this.createPage();

    try {
      const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(searchTerm)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for search results to load
      await page.waitForSelector('.s-result-item', { timeout: 10000 });

      const products = await page.evaluate((limit) => {
        const items = document.querySelectorAll('.s-result-item[data-component-type="s-search-result"]');
        const results: ScrapedProductData[] = [];

        for (let i = 0; i < Math.min(items.length, limit); i++) {
          const item = items[i] as HTMLElement;

          try {
            const titleElement = item.querySelector('h2 a span') || item.querySelector('.a-text-normal');
            const title = titleElement?.textContent?.trim() || '';

            const priceElement = item.querySelector('.a-price-whole');
            const priceFraction = item.querySelector('.a-price-fraction');
            const priceText = priceElement?.textContent + (priceFraction?.textContent || '');
            const price = parseFloat(priceText?.replace(/[^\d.]/g, '') || '0');

            const originalPriceElement = item.querySelector('.a-text-price .a-offscreen');
            const originalPrice = originalPriceElement ? parseFloat(originalPriceElement.textContent?.replace(/[^\d.]/g, '') || '0') : undefined;

            const ratingElement = item.querySelector('.a-icon-star-small .a-icon-alt');
            const ratingText = ratingElement?.textContent || '';
            const rating = parseFloat(ratingText.replace(/[^\d.]/g, '')) || 0;

            const reviewElement = item.querySelector('.a-size-base.s-underline-text');
            const reviewCount = parseInt(reviewElement?.textContent?.replace(/[^\d]/g, '') || '0');

            const linkElement = item.querySelector('h2 a') as HTMLAnchorElement;
            const url = linkElement ? 'https://www.amazon.in' + linkElement.getAttribute('href') : '';

            const imageElement = item.querySelector('.s-image') as HTMLImageElement;
            const imageUrl = imageElement?.src || '';

            if (title && price > 0) {
              results.push({
                title,
                price,
                originalPrice,
                discount: originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined,
                rating,
                reviewCount,
                platform: 'Amazon',
                url,
                imageUrl,
                availability: true,
                category: searchTerm
              });
            }
          } catch (error) {
            console.error('Error parsing Amazon product:', error);
          }
        }

        return results;
      }, limit);

      return {
        success: true,
        products,
        totalFound: products.length
      };

    } catch (error) {
      console.error('Amazon scraping error:', error);
      return {
        success: false,
        products: [],
        totalFound: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      await page.close();
    }
  }

  async scrapeFlipkart(searchTerm: string, limit: number = 10): Promise<ScrapingResult> {
    const page = await this.createPage();

    try {
      const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerm)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for search results
      await page.waitForSelector('._1AtVbE', { timeout: 10000 });

      const products = await page.evaluate((limit) => {
        const items = document.querySelectorAll('._1AtVbE');
        const results: ScrapedProductData[] = [];

        for (let i = 0; i < Math.min(items.length, limit); i++) {
          const item = items[i] as HTMLElement;

          try {
            const titleElement = item.querySelector('a.s1Q9rs') || item.querySelector('.IRpwTa');
            const title = titleElement?.textContent?.trim() || '';

            const priceElement = item.querySelector('._30jeq3');
            const price = parseFloat(priceElement?.textContent?.replace(/[^\d.]/g, '') || '0');

            const originalPriceElement = item.querySelector('._3I9_wc');
            const originalPrice = originalPriceElement ? parseFloat(originalPriceElement.textContent?.replace(/[^\d.]/g, '') || '0') : undefined;

            const discountElement = item.querySelector('._3Ay6Sb');
            const discountText = discountElement?.textContent || '';
            const discount = parseInt(discountText.replace(/[^\d]/g, '')) || undefined;

            const ratingElement = item.querySelector('._3LWZlK');
            const rating = parseFloat(ratingElement?.textContent || '0');

            const reviewElement = item.querySelector('._2_R_DZ span span');
            const reviewText = reviewElement?.textContent || '';
            const reviewCount = parseInt(reviewText.replace(/[^\d]/g, '')) || 0;

            const linkElement = item.querySelector('a.s1Q9rs') as HTMLAnchorElement;
            const url = linkElement ? 'https://www.flipkart.com' + linkElement.getAttribute('href') : '';

            const imageElement = item.querySelector('img._396cs4') as HTMLImageElement;
            const imageUrl = imageElement?.src || '';

            if (title && price > 0) {
              results.push({
                title,
                price,
                originalPrice,
                discount,
                rating,
                reviewCount,
                platform: 'Flipkart',
                url,
                imageUrl,
                availability: true,
                category: searchTerm
              });
            }
          } catch (error) {
            console.error('Error parsing Flipkart product:', error);
          }
        }

        return results;
      }, limit);

      return {
        success: true,
        products,
        totalFound: products.length
      };

    } catch (error) {
      console.error('Flipkart scraping error:', error);
      return {
        success: false,
        products: [],
        totalFound: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      await page.close();
    }
  }

  async scrapeMeesho(searchTerm: string, limit: number = 10): Promise<ScrapingResult> {
    const page = await this.createPage();

    try {
      const searchUrl = `https://www.meesho.com/search?q=${encodeURIComponent(searchTerm)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for products to load
      await page.waitForSelector('.sc-dkzDqf', { timeout: 10000 });

      const products = await page.evaluate((limit) => {
        const items = document.querySelectorAll('.sc-dkzDqf');
        const results: ScrapedProductData[] = [];

        for (let i = 0; i < Math.min(items.length, limit); i++) {
          const item = items[i] as HTMLElement;

          try {
            const titleElement = item.querySelector('.sc-eDvSVe') || item.querySelector('p');
            const title = titleElement?.textContent?.trim() || '';

            const priceElement = item.querySelector('.sc-kDvujY');
            const price = parseFloat(priceElement?.textContent?.replace(/[^\d.]/g, '') || '0');

            const originalPriceElement = item.querySelector('.sc-jSUZER');
            const originalPrice = originalPriceElement ? parseFloat(originalPriceElement.textContent?.replace(/[^\d.]/g, '') || '0') : undefined;

            const discountElement = item.querySelector('.sc-jSUZER + span');
            const discountText = discountElement?.textContent || '';
            const discount = parseInt(discountText.replace(/[^\d]/g, '')) || undefined;

            const ratingElement = item.querySelector('.sc-iqseJM');
            const rating = parseFloat(ratingElement?.textContent || '0');

            const reviewElement = item.querySelector('.sc-iqseJM + span');
            const reviewCount = parseInt(reviewElement?.textContent?.replace(/[^\d]/g, '') || '0');

            const linkElement = item.querySelector('a') as HTMLAnchorElement;
            const url = linkElement ? 'https://www.meesho.com' + linkElement.getAttribute('href') : '';

            const imageElement = item.querySelector('img') as HTMLImageElement;
            const imageUrl = imageElement?.src || '';

            if (title && price > 0) {
              results.push({
                title,
                price,
                originalPrice,
                discount,
                rating,
                reviewCount,
                platform: 'Meesho',
                url,
                imageUrl,
                availability: true,
                category: searchTerm
              });
            }
          } catch (error) {
            console.error('Error parsing Meesho product:', error);
          }
        }

        return results;
      }, limit);

      return {
        success: true,
        products,
        totalFound: products.length
      };

    } catch (error) {
      console.error('Meesho scraping error:', error);
      return {
        success: false,
        products: [],
        totalFound: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      await page.close();
    }
  }

  async scrapeMultiplePlatforms(searchTerm: string, limit: number = 10): Promise<ScrapingResult> {
    const platforms = ['amazon', 'flipkart', 'meesho'];
    const allProducts: ScrapedProductData[] = [];
    const errors: string[] = [];

    for (const platform of platforms) {
      try {
        let result: ScrapingResult;

        switch (platform) {
          case 'amazon':
            result = await this.scrapeAmazon(searchTerm, limit);
            break;
          case 'flipkart':
            result = await this.scrapeFlipkart(searchTerm, limit);
            break;
          case 'meesho':
            result = await this.scrapeMeesho(searchTerm, limit);
            break;
          default:
            continue;
        }

        if (result.success) {
          allProducts.push(...result.products);
        } else {
          errors.push(`${platform}: ${result.error}`);
        }

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        errors.push(`${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: allProducts.length > 0,
      products: allProducts,
      totalFound: allProducts.length,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }
}

export const webScraper = new WebScraperService();