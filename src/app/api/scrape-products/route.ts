import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query') || 'handicraft';
        const platform = searchParams.get('platform') || 'all'; // amazon, flipkart, meesho, or all

        const results: any = {};

        if (platform === 'all' || platform === 'amazon') {
            try {
                const { scrapeAmazon } = await import('@/lib/scrapers/scrape-amazon');
                const amazonProducts = await scrapeAmazon(query, {
                    minPrice: 2500,
                    maxPrice: 5000,
                    maxResults: 10,
                    maxPages: 3,
                    headless: true,
                    saveDebugFiles: false
                });
                results.amazon = amazonProducts;
            } catch (error) {
                console.error('Amazon scraping error:', error);
                results.amazon = [];
            }
        }

        if (platform === 'all' || platform === 'flipkart') {
            try {
                const { scrapeFlipkartSamarth } = await import('@/lib/scrapers/scrape-flipkart');
                const flipkartProducts = await scrapeFlipkartSamarth(query, {
                    minPrice: 2500,
                    maxPrice: 5000,
                    maxResults: 10,
                    maxPages: 2,
                    headless: true,
                    saveDebugFiles: false
                });
                results.flipkart = flipkartProducts;
            } catch (error) {
                console.error('Flipkart scraping error:', error);
                results.flipkart = [];
            }
        }

        if (platform === 'all' || platform === 'meesho') {
            try {
                const { scrapeMeesho } = await import('@/lib/scrapers/scrape-meesho');
                const meeshoProducts = await scrapeMeesho(query, {
                    minPrice: 2500,
                    maxPrice: 5000,
                    maxResults: 10,
                    maxPages: 2,
                    headless: true,
                    saveDebugFiles: false
                });
                results.meesho = meeshoProducts;
            } catch (error) {
                console.error('Meesho scraping error:', error);
                results.meesho = [];
            }
        }

        return NextResponse.json({
            success: true,
            data: results,
            query,
            platform
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
