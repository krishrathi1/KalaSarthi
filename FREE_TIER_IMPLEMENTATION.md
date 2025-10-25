# 🆓 Free-Tier Trending Implementation Guide

## 🎯 **Overview**
Implement comprehensive trending detection using **100% free services** with focus on **Amazon e-commerce trends** and **Instagram social media trends** with **weekly updates**.

---

## 🛒 **Amazon Trend Detection (Free Scraping)**

### **1. Amazon Best Sellers Scraping**
```typescript
// src/lib/services/amazon-trend-scraper.ts
export class AmazonTrendScraper {
  private baseUrl = 'https://www.amazon.in';
  
  async scrapeBestSellers(category: string): Promise<AmazonTrendingProduct[]> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // Amazon Best Sellers URL (Free to scrape)
      const url = `${this.baseUrl}/gp/bestsellers/${this.getCategoryId(category)}`;
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-component-type="s-search-result"]');
        return Array.from(items).map((item, index) => ({
          title: item.querySelector('h2 a span')?.textContent?.trim(),
          price: item.querySelector('.a-price-whole')?.textContent?.trim(),
          rating: item.querySelector('.a-icon-star-small .a-icon-alt')?.textContent?.trim(),
          rank: index + 1,
          url: item.querySelector('h2 a')?.getAttribute('href'),
          imageUrl: item.querySelector('img.s-image')?.getAttribute('src'),
          category: category,
          trendSource: 'amazon-bestsellers',
          scrapedAt: new Date().toISOString()
        }));
      });
      
      return products.filter(p => p.title && p.price);
    } finally {
      await browser.close();
    }
  }
  
  async scrapeMoversAndShakers(): Promise<AmazonTrendingProduct[]> {
    // Scrape Amazon Movers & Shakers (products with biggest rank improvements)
    const url = `${this.baseUrl}/gp/movers-and-shakers/`;
    // Similar scraping logic but focus on rank change indicators
  }
  
  private getCategoryId(profession: string): string {
    const categoryMap = {
      'pottery': 'home-garden/1380442031',
      'woodworking': 'home-garden/1380442031', 
      'jewelry': 'jewelry/1951048031',
      'textiles': 'clothing-shoes-jewelry/1571271031',
      'metalwork': 'home-garden/1380442031',
      'leather': 'luggage/2454178031'
    };
    return categoryMap[profession] || 'home-garden/1380442031';
  }
}
```

### **2. Amazon Trending Categories**
```typescript
// Free Amazon trend detection
const AMAZON_TREND_URLS = {
  bestSellers: '/gp/bestsellers/',
  moversShakers: '/gp/movers-and-shakers/',
  newReleases: '/gp/new-releases/',
  mostWishedFor: '/gp/most-wished-for/',
  giftIdeas: '/gp/most-gifted/'
};

// Scrape each category weekly
async scrapeAllAmazonTrends(profession: string): Promise<TrendData> {
  const results = await Promise.all([
    this.scrapeBestSellers(profession),
    this.scrapeMoversAndShakers(),
    this.scrapeNewReleases(profession),
    this.scrapeMostWishedFor(profession)
  ]);
  
  return this.aggregateAmazonTrends(results);
}
```

---

## 📱 **Instagram Trend Detection (Free Scraping)**

### **1. Instagram Hashtag Scraping**
```typescript
// src/lib/services/instagram-trend-scraper.ts
export class InstagramTrendScraper {
  private baseUrl = 'https://www.instagram.com';
  
  async scrapeHashtagTrends(profession: string): Promise<InstagramTrend[]> {
    const hashtags = this.getProfessionHashtags(profession);
    const trends: InstagramTrend[] = [];
    
    for (const hashtag of hashtags) {
      try {
        const trendData = await this.scrapeHashtagData(hashtag);
        trends.push(trendData);
      } catch (error) {
        console.warn(`Failed to scrape hashtag ${hashtag}:`, error);
      }
    }
    
    return trends;
  }
  
  private async scrapeHashtagData(hashtag: string): Promise<InstagramTrend> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // Instagram hashtag page (public, no login required)
      const url = `${this.baseUrl}/explore/tags/${hashtag}/`;
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Extract hashtag metrics
      const hashtagData = await page.evaluate(() => {
        const postCountElement = document.querySelector('span[title]');
        const postCount = postCountElement?.getAttribute('title')?.replace(/,/g, '');
        
        // Get recent posts
        const posts = Array.from(document.querySelectorAll('article a')).slice(0, 9).map(link => ({
          url: link.getAttribute('href'),
          imageUrl: link.querySelector('img')?.getAttribute('src')
        }));
        
        return {
          postCount: parseInt(postCount) || 0,
          recentPosts: posts
        };
      });
      
      return {
        hashtag,
        postCount: hashtagData.postCount,
        recentPosts: hashtagData.recentPosts,
        trendScore: this.calculateTrendScore(hashtagData.postCount),
        scrapedAt: new Date().toISOString()
      };
    } finally {
      await browser.close();
    }
  }
  
  private getProfessionHashtags(profession: string): string[] {
    const hashtagMap = {
      'pottery': ['pottery', 'ceramics', 'handmadepottery', 'clayart', 'potterswheel'],
      'woodworking': ['woodworking', 'handmadewood', 'woodcraft', 'carpentry', 'woodart'],
      'jewelry': ['handmadejewelry', 'artisanjewelry', 'handcraftedjewelry', 'jewelrymaking'],
      'textiles': ['handwoven', 'textileart', 'handmadefabric', 'weaving', 'embroidery'],
      'metalwork': ['metalwork', 'handmademetal', 'brasswork', 'coppercraft', 'metalart'],
      'leather': ['leathercraft', 'handmadeleather', 'leatherwork', 'leathergoods']
    };
    
    return hashtagMap[profession] || ['handmade', 'artisan', 'craft', 'handcrafted'];
  }
  
  private calculateTrendScore(postCount: number): number {
    // Simple trend scoring based on post volume
    if (postCount > 1000000) return 100;
    if (postCount > 500000) return 80;
    if (postCount > 100000) return 60;
    if (postCount > 50000) return 40;
    return 20;
  }
}
```

### **2. Instagram Popular Posts Analysis**
```typescript
async scrapePopularPosts(hashtag: string): Promise<InstagramPost[]> {
  // Scrape top posts for engagement analysis
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = `${this.baseUrl}/explore/tags/${hashtag}/`;
    await page.goto(url);
    
    // Click on first few posts to get engagement data
    const posts = await page.evaluate(() => {
      const postElements = document.querySelectorAll('article a');
      return Array.from(postElements).slice(0, 6).map(post => ({
        url: post.getAttribute('href'),
        imageUrl: post.querySelector('img')?.getAttribute('src')
      }));
    });
    
    // Get detailed engagement for each post
    const detailedPosts = [];
    for (const post of posts.slice(0, 3)) { // Limit to avoid rate limiting
      const postData = await this.scrapePostDetails(page, post.url);
      detailedPosts.push(postData);
    }
    
    return detailedPosts;
  } finally {
    await browser.close();
  }
}
```

---

## 📊 **Weekly Trend Analysis System**

### **1. Trend Aggregation Service**
```typescript
// src/lib/services/trend-aggregator.ts
export class TrendAggregator {
  async aggregateWeeklyTrends(profession: string): Promise<WeeklyTrendReport> {
    const [amazonTrends, instagramTrends, googleTrends] = await Promise.all([
      this.amazonScraper.scrapeAllAmazonTrends(profession),
      this.instagramScraper.scrapeHashtagTrends(profession),
      this.googleTrendsService.getComprehensiveTrends(profession)
    ]);
    
    return {
      profession,
      week: this.getCurrentWeek(),
      amazonTrends: this.processAmazonTrends(amazonTrends),
      instagramTrends: this.processInstagramTrends(instagramTrends),
      googleTrends: this.processGoogleTrends(googleTrends),
      combinedScore: this.calculateCombinedTrendScore(amazonTrends, instagramTrends, googleTrends),
      topTrendingProducts: this.identifyTopTrends(amazonTrends, instagramTrends),
      weeklyGrowth: await this.calculateWeeklyGrowth(profession),
      generatedAt: new Date().toISOString()
    };
  }
  
  private calculateCombinedTrendScore(amazon: any, instagram: any, google: any): number {
    // Weighted scoring: Amazon 40%, Instagram 35%, Google 25%
    const amazonScore = this.normalizeAmazonScore(amazon);
    const instagramScore = this.normalizeInstagramScore(instagram);
    const googleScore = this.normalizeGoogleScore(google);
    
    return (amazonScore * 0.4) + (instagramScore * 0.35) + (googleScore * 0.25);
  }
}
```

### **2. Weekly Update Scheduler**
```typescript
// src/lib/services/weekly-trend-updater.ts
import cron from 'node-cron';

export class WeeklyTrendUpdater {
  constructor(
    private trendAggregator: TrendAggregator,
    private trendStorage: TrendStorage
  ) {}
  
  startWeeklyUpdates() {
    // Run every Sunday at 2 AM
    cron.schedule('0 2 * * 0', async () => {
      console.log('🔄 Starting weekly trend update...');
      await this.updateAllProfessionTrends();
    });
  }
  
  private async updateAllProfessionTrends() {
    const professions = ['pottery', 'woodworking', 'jewelry', 'textiles', 'metalwork', 'leather'];
    
    for (const profession of professions) {
      try {
        const trendReport = await this.trendAggregator.aggregateWeeklyTrends(profession);
        await this.trendStorage.saveWeeklyReport(trendReport);
        
        // Notify artisans of significant trend changes
        await this.notifyTrendChanges(profession, trendReport);
        
        console.log(`✅ Updated trends for ${profession}`);
      } catch (error) {
        console.error(`❌ Failed to update trends for ${profession}:`, error);
      }
    }
  }
  
  private async notifyTrendChanges(profession: string, report: WeeklyTrendReport) {
    const significantChanges = report.topTrendingProducts.filter(p => p.weeklyGrowth > 50);
    
    if (significantChanges.length > 0) {
      // Send notifications to artisans in this profession
      await this.sendTrendNotifications(profession, significantChanges);
    }
  }
}
```

---

## 🎨 **Trending UI Components**

### **1. Trending Dashboard**
```typescript
// src/components/trending-dashboard.tsx
export function TrendingDashboard({ profession }: { profession: string }) {
  const [trendData, setTrendData] = useState<WeeklyTrendReport | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadTrendingData();
  }, [profession]);
  
  const loadTrendingData = async () => {
    try {
      const response = await fetch(`/api/trending/${profession}`);
      const data = await response.json();
      setTrendData(data);
    } catch (error) {
      console.error('Failed to load trending data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Trending Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending This Week - {profession}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <TrendMetric
              label="Amazon Best Sellers"
              value={trendData?.amazonTrends?.length || 0}
              change={trendData?.amazonTrends?.weeklyGrowth}
            />
            <TrendMetric
              label="Instagram Buzz"
              value={trendData?.instagramTrends?.totalPosts || 0}
              change={trendData?.instagramTrends?.weeklyGrowth}
            />
            <TrendMetric
              label="Google Interest"
              value={trendData?.googleTrends?.averageInterest || 0}
              change={trendData?.googleTrends?.weeklyGrowth}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Top Trending Products */}
      <Card>
        <CardHeader>
          <CardTitle>🔥 Hot Trending Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendData?.topTrendingProducts?.map(product => (
              <TrendingProductCard key={product.id} product={product} />
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Social Media Trends */}
      <Card>
        <CardHeader>
          <CardTitle>📱 Instagram Trending</CardTitle>
        </CardHeader>
        <CardContent>
          <InstagramTrendGrid trends={trendData?.instagramTrends} />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🔄 **API Endpoints**

### **1. Trending Data API**
```typescript
// src/app/api/trending/[profession]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { profession: string } }
) {
  try {
    const { profession } = params;
    
    // Get latest weekly trend report
    const trendReport = await trendStorage.getLatestReport(profession);
    
    if (!trendReport) {
      // Generate on-demand if no recent data
      const freshReport = await trendAggregator.aggregateWeeklyTrends(profession);
      await trendStorage.saveWeeklyReport(freshReport);
      return NextResponse.json(freshReport);
    }
    
    return NextResponse.json(trendReport);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch trending data' },
      { status: 500 }
    );
  }
}
```

### **2. Manual Trend Refresh API**
```typescript
// src/app/api/trending/refresh/route.ts
export async function POST(request: NextRequest) {
  try {
    const { profession } = await request.json();
    
    // Force refresh trend data
    const trendReport = await trendAggregator.aggregateWeeklyTrends(profession);
    await trendStorage.saveWeeklyReport(trendReport);
    
    return NextResponse.json({
      success: true,
      message: 'Trends refreshed successfully',
      data: trendReport
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to refresh trends' },
      { status: 500 }
    );
  }
}
```

---

## 📦 **Data Storage (Free)**

### **1. MongoDB Trend Storage**
```typescript
// src/lib/models/trend-report.ts
import mongoose from 'mongoose';

const TrendReportSchema = new mongoose.Schema({
  profession: { type: String, required: true },
  week: { type: String, required: true }, // "2024-W42"
  amazonTrends: [{
    title: String,
    price: String,
    rank: Number,
    category: String,
    trendScore: Number,
    weeklyGrowth: Number
  }],
  instagramTrends: [{
    hashtag: String,
    postCount: Number,
    trendScore: Number,
    weeklyGrowth: Number,
    popularPosts: [String]
  }],
  googleTrends: [{
    keyword: String,
    interest: Number,
    weeklyGrowth: Number
  }],
  combinedScore: Number,
  topTrendingProducts: [String],
  generatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(+new Date() + 7*24*60*60*1000) } // 7 days
});

// Index for efficient queries
TrendReportSchema.index({ profession: 1, week: -1 });
TrendReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TrendReport = mongoose.model('TrendReport', TrendReportSchema);
```

---

## 🚀 **Deployment & Monitoring (Free)**

### **1. Environment Setup**
```bash
# .env additions
ENABLE_WEEKLY_TRENDS=true
TREND_UPDATE_SCHEDULE="0 2 * * 0"  # Every Sunday 2 AM
INSTAGRAM_SCRAPING_ENABLED=true
AMAZON_SCRAPING_ENABLED=true
```

### **2. Health Monitoring**
```typescript
// src/lib/services/trend-health-monitor.ts
export class TrendHealthMonitor {
  async checkTrendSystemHealth(): Promise<HealthReport> {
    const checks = await Promise.allSettled([
      this.checkAmazonScraping(),
      this.checkInstagramScraping(),
      this.checkGoogleTrends(),
      this.checkWeeklyUpdates()
    ]);
    
    return {
      overall: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
      services: {
        amazon: checks[0].status === 'fulfilled',
        instagram: checks[1].status === 'fulfilled',
        googleTrends: checks[2].status === 'fulfilled',
        weeklyUpdates: checks[3].status === 'fulfilled'
      },
      lastCheck: new Date().toISOString()
    };
  }
}
```

---

## ✅ **Implementation Checklist**

### **Week 1: Foundation**
- [ ] Create trending route and basic UI
- [ ] Set up Amazon trend scraper
- [ ] Implement Instagram hashtag scraper
- [ ] Create trend aggregation service

### **Week 2: Integration**
- [ ] Integrate with existing Google Trends
- [ ] Build weekly update scheduler
- [ ] Create trending dashboard UI
- [ ] Add trend storage system

### **Week 3: Enhancement**
- [ ] Add trend comparison features
- [ ] Implement notification system
- [ ] Create trend analytics
- [ ] Add mobile responsiveness

### **Week 4: Testing & Deployment**
- [ ] Test all scraping functions
- [ ] Validate trend accuracy
- [ ] Deploy weekly update system
- [ ] Monitor system health

---

**This free-tier implementation provides comprehensive trending detection without any API costs! 🎉**

Ready to start implementation? Which component should we build first?