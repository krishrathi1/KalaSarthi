# 🎯 Enhanced TrendSpotter Feature - TODO List (Updated)

## 📋 **Project Overview**
Create an intelligent TrendSpotter that combines:
- **AI-generated product suggestions** (Gemini)
- **E-commerce trend detection** (Amazon - Free tier)
- **Social media trends** (Instagram - Free scraping)
- **Weekly real-time updates** (Automated pipeline)
- **Fallback links** when scraping fails

## 🎯 **Focus Areas (Based on Requirements)**
- ✅ **E-commerce Trends**: Amazon Best Sellers, Trending Products
- ✅ **Social Media Trends**: Instagram hashtags, popular posts
- ✅ **Weekly Updates**: Automated weekly trend refresh
- ✅ **Free Tier Only**: No paid APIs, use scraping + free services

---

## 🏗️ **Phase 1: Foundation & Setup**

### **1.1 Create New Route & Component Structure**
- [ ] Create `/trending` route (`src/app/trending/page.tsx`)
- [ ] Create main `TrendingSpotter` component (`src/components/trending-spotter.tsx`)
- [ ] Set up component architecture with proper TypeScript interfaces
- [ ] Add navigation link to trending page in main navigation

### **1.2 Define Data Interfaces**
- [ ] Create `TrendingProduct` interface with scraping data + fallback links
- [ ] Create `ProfessionAnalysis` interface for Gemini AI responses
- [ ] Create `ScrapingResult` interface with success/failure states
- [ ] Create `ArtisanProfile` interface for user data

---

## 🤖 **Phase 2: AI Integration + Trend Detection (Free Tier)**

### **2.1 Profession Analysis Service**
- [ ] Create `ProfessionAnalyzer` service (`src/lib/services/profession-analyzer.ts`)
- [ ] Implement Gemini AI integration for product suggestion
- [ ] Create prompts for different artisan professions:
  - [ ] Wood Working → wooden toys, furniture, decor, utensils
  - [ ] Pottery → ceramic bowls, vases, planters, dinnerware
  - [ ] Jewelry → necklaces, earrings, bracelets, rings
  - [ ] Textiles → sarees, fabrics, cushions, rugs
  - [ ] Metalwork → brass items, copper utensils, decorative pieces
  - [ ] Leather → bags, wallets, belts, accessories
  - [ ] Basketry → baskets, plant hangers, storage solutions

### **2.2 Amazon Trend Detection (Free Scraping)**
- [ ] Create `AmazonTrendScraper` service (`src/lib/services/amazon-trend-scraper.ts`)
- [ ] Scrape Amazon Best Sellers by category (free)
- [ ] Scrape Amazon "Movers & Shakers" (trending up products)
- [ ] Scrape Amazon "New Releases" in craft categories
- [ ] Implement category mapping for artisan professions
- [ ] Add price trend analysis from scraped data
- [ ] Cache results for 7 days (weekly updates)

### **2.3 Instagram Trend Detection (Free Scraping)**
- [ ] Create `InstagramTrendScraper` service (`src/lib/services/instagram-trend-scraper.ts`)
- [ ] Scrape trending hashtags (#handmade, #artisan, #pottery, etc.)
- [ ] Scrape popular posts by hashtag (engagement metrics)
- [ ] Extract product mentions from post captions
- [ ] Analyze visual trends from post images (using AI)
- [ ] Track hashtag growth rates (weekly comparison)
- [ ] Cache results for 7 days

### **2.4 Enhanced Google Trends Integration**
- [ ] Enhance existing Google Trends service
- [ ] Add weekly trend comparison (this week vs last week)
- [ ] Implement trend velocity calculations
- [ ] Add seasonal pattern detection
- [ ] Create profession-specific trend scoring

---

## 🔍 **Phase 3: Free-Tier Trend Analysis & Integration**

### **3.1 Trend Data Aggregation Service**
- [ ] Create `TrendAggregator` service (`src/lib/services/trend-aggregator.ts`)
- [ ] Combine data from Google Trends + Amazon + Instagram
- [ ] Implement trend scoring algorithm (0-100 scale)
- [ ] Add trend velocity calculations (weekly growth rate)
- [ ] Create profession-specific trend filtering
- [ ] Implement trend correlation analysis across platforms

### **3.2 Weekly Trend Update Pipeline**
- [ ] Create `WeeklyTrendUpdater` service
- [ ] Schedule weekly trend data refresh (every Sunday)
- [ ] Implement data comparison (this week vs last week)
- [ ] Add trend change notifications (rising/falling)
- [ ] Store historical trend data for pattern analysis
- [ ] Create trend report generation

### **3.3 Free-Tier Social Media Analysis**
- [ ] Create `SocialMediaAnalyzer` service
- [ ] Analyze Instagram post engagement patterns
- [ ] Extract trending product types from captions
- [ ] Identify viral craft techniques/styles
- [ ] Track influencer mentions of craft products
- [ ] Generate social media trend reports

### **3.4 Enhanced Fallback System**
- [ ] Create `SmartLinkGenerator` service
- [ ] Generate trending-aware search links
- [ ] Include trend data in link parameters
- [ ] Add "Why this is trending" explanations
- [ ] Create social media discovery links
- [ ] Implement trend-based product suggestions

---

## 👤 **Phase 4: Profile & Inventory Integration**

### **4.1 Profile Data Fetching**
- [ ] Create `ProfileService` to fetch artisan details
- [ ] Extract profession, skills, location, experience
- [ ] Get artisan's existing product categories
- [ ] Fetch recent sales data for trend analysis

### **4.2 Inventory Integration**
- [ ] Create `InventoryService` to fetch existing products
- [ ] Analyze existing product categories and gaps
- [ ] Identify underperforming products for trend suggestions
- [ ] Suggest complementary products based on current inventory

---

## 🎨 **Phase 5: Trending-Focused UI/UX Implementation**

### **5.1 Trending Dashboard Interface**
- [ ] Create trending dashboard with real-time indicators
- [ ] Add trend categories: 🔥 Hot, 📈 Rising, 🎄 Seasonal, 📱 Social
- [ ] Implement weekly trend comparison view
- [ ] Add profession-specific trending sections
- [ ] Create trend velocity indicators (speed of growth)

### **5.2 Enhanced Product Display Components**
- [ ] Create `TrendingProductCard` with trend indicators
- [ ] Show trend source (Amazon Best Seller, Instagram Viral, etc.)
- [ ] Add trend score visualization (0-100 scale)
- [ ] Include "Why it's trending" AI explanations
- [ ] Show weekly growth percentage
- [ ] Add social media engagement metrics

### **5.3 Trend Discovery Features**
- [ ] Add "Trending Now" real-time feed
- [ ] Implement trend search and filtering
- [ ] Create "Weekly Trend Report" view
- [ ] Add trend comparison tools (this week vs last week)
- [ ] Include "Trending on Instagram" section
- [ ] Add "Amazon Best Sellers" integration

### **5.4 Social Media Integration UI**
- [ ] Create Instagram trend visualization
- [ ] Show trending hashtags for profession
- [ ] Display viral craft posts and techniques
- [ ] Add "Social Media Inspiration" section
- [ ] Include influencer trend mentions

---

## 🔄 **Phase 6: Workflow Implementation**

### **6.1 Main Workflow Orchestrator**
- [ ] Create `TrendingWorkflow` service to coordinate all steps
- [ ] Implement step-by-step execution:
  ```typescript
  Step 1: fetchArtisanProfile()
  Step 2: analyzeInventoryGaps()
  Step 3: generateAIProductSuggestions()
  Step 4: searchAndScrapeProducts()
  Step 5: generateFallbackLinks()
  Step 6: presentResults()
  ```

### **6.2 Error Handling & Fallbacks**
- [ ] Implement graceful degradation at each step
- [ ] Add comprehensive error logging
- [ ] Create user-friendly error messages
- [ ] Implement automatic fallback to links when scraping fails

---

## 📊 **Phase 7: Analytics & Optimization**

### **7.1 Performance Tracking**
- [ ] Track AI response times
- [ ] Monitor scraping success rates per platform
- [ ] Measure user engagement with suggestions
- [ ] Track click-through rates on fallback links

### **7.2 Learning & Improvement**
- [ ] Store successful product suggestions for future reference
- [ ] Learn from user interactions (saves, clicks, dismissals)
- [ ] Improve AI prompts based on user feedback
- [ ] Optimize scraping strategies per platform

---

## 🧪 **Phase 8: Testing & Quality Assurance**

### **8.1 Unit Testing**
- [ ] Test AI integration with mock responses
- [ ] Test scraping functions with mock data
- [ ] Test fallback link generation
- [ ] Test error handling scenarios

### **8.2 Integration Testing**
- [ ] Test complete workflow end-to-end
- [ ] Test with different artisan professions
- [ ] Test with various network conditions
- [ ] Test fallback mechanisms

### **8.3 User Testing**
- [ ] Test with real artisan profiles
- [ ] Validate AI suggestions quality
- [ ] Test UI responsiveness and usability
- [ ] Gather feedback on suggestion relevance

---

## 🚀 **Phase 9: Deployment & Monitoring**

### **9.1 Production Deployment**
- [ ] Set up environment variables for AI API keys
- [ ] Configure caching strategies
- [ ] Set up monitoring and alerting
- [ ] Deploy to production environment

### **9.2 Post-Launch Monitoring**
- [ ] Monitor AI API usage and costs
- [ ] Track scraping success rates
- [ ] Monitor user adoption and engagement
- [ ] Collect user feedback for improvements

---

## 📁 **File Structure**

```
src/
├── app/trending/
│   └── page.tsx                    # Main trending route
├── components/
│   ├── trending-spotter.tsx        # Main component
│   ├── trending-product-card.tsx   # Product display
│   └── trending-workflow.tsx       # Workflow UI
├── lib/services/
│   ├── profession-analyzer.ts      # AI product suggestions
│   ├── search-query-builder.ts     # Search query generation
│   ├── link-generator.ts           # Fallback link creation
│   ├── trending-workflow.ts        # Main orchestrator
│   ├── profile-service.ts          # Profile data fetching
│   └── inventory-service.ts        # Inventory integration
└── types/
    └── trending.ts                  # TypeScript interfaces
```

---

## 🎯 **Success Criteria**

### **MVP (Minimum Viable Product)**
- [ ] AI generates 5-10 relevant product suggestions per profession
- [ ] At least 1 platform scraping works reliably
- [ ] Fallback links are generated for all suggestions
- [ ] Basic UI shows suggestions with scraping status

### **Full Feature**
- [ ] 90%+ relevant AI suggestions based on user feedback
- [ ] 70%+ scraping success rate across all platforms
- [ ] <5 second response time for AI suggestions
- [ ] <30 second total workflow completion time

---

## 💡 **Future Enhancements (Post-MVP)**

- [ ] **Seasonal Trends**: Festival-specific product suggestions
- [ ] **Competitor Analysis**: Compare with similar artisans
- [ ] **Price Optimization**: Suggest optimal pricing based on market data
- [ ] **Trend Forecasting**: Predict upcoming trends using historical data
- [ ] **Social Media Integration**: Include Instagram/Pinterest trending products
- [ ] **Export Features**: Export suggestions as PDF/Excel reports
- [ ] **Collaboration**: Share suggestions with other artisans
- [ ] **Mobile App**: Native mobile experience

---

## ⏱️ **Updated Timeline (Free-Tier Focus)**

- **Phase 1**: 1 day (Foundation + Routes)
- **Phase 2**: 3-4 days (AI + Amazon + Instagram Scraping)
- **Phase 3**: 2-3 days (Trend Analysis + Weekly Updates)
- **Phase 4**: 1 day (Profile Integration)
- **Phase 5**: 2-3 days (Trending UI/UX)
- **Phase 6**: 1-2 days (Workflow Integration)
- **Phase 7**: 1-2 days (Testing)
- **Phase 8**: 1 day (Deployment)

**Total Estimated Time**: 12-17 days

## 💰 **Cost Analysis (Free Tier)**

| Service | Cost | Usage | Notes |
|---------|------|-------|-------|
| **Google Gemini** | Free | 15 req/min | Free tier sufficient |
| **Amazon Scraping** | Free | Unlimited | Web scraping only |
| **Instagram Scraping** | Free | Rate limited | Public data only |
| **Google Trends** | Free | Rate limited | Existing integration |
| **Database Storage** | Free | MongoDB existing | No additional cost |
| **Hosting** | Free | Current server | No additional cost |
| **Total Monthly** | **$0** | | 100% Free Implementation |

---

## 🔧 **Free-Tier Technical Implementation**

### **Amazon Trend Detection (Free)**
```typescript
// Amazon Best Sellers Scraping (Free)
class AmazonTrendScraper {
  async scrapeBestSellers(category: string): Promise<TrendingProduct[]> {
    // Scrape: https://amazon.in/gp/bestsellers/[category]
    // Extract: product titles, prices, ratings, rank changes
    // No API costs - pure web scraping
  }
  
  async scrapeMoversAndShakers(): Promise<TrendingProduct[]> {
    // Scrape: https://amazon.in/gp/movers-and-shakers/
    // Extract: products with biggest sales rank improvements
    // Identify rapidly trending items
  }
}
```

### **Instagram Trend Detection (Free)**
```typescript
// Instagram Hashtag Scraping (Free)
class InstagramTrendScraper {
  async scrapeHashtagTrends(hashtags: string[]): Promise<HashtagTrend[]> {
    // Scrape public Instagram pages (no API needed)
    // Extract: post counts, engagement rates, recent posts
    // Track: #handmade, #pottery, #woodworking, etc.
  }
  
  async scrapePopularPosts(hashtag: string): Promise<InstagramPost[]> {
    // Scrape top posts for craft hashtags
    // Extract: likes, comments, captions, product mentions
    // Identify viral craft techniques and products
  }
}
```

### **Google Trends Enhancement (Free)**
```typescript
// Enhanced Google Trends (Already Free)
class EnhancedGoogleTrends extends GoogleTrendsService {
  async getWeeklyTrendComparison(keywords: string[]): Promise<WeeklyTrend[]> {
    // Compare this week vs last week
    // Calculate trend velocity and growth rate
    // Identify breakout trends
  }
}
```

### **Weekly Update System (Free)**
```typescript
// Automated Weekly Updates
class WeeklyTrendUpdater {
  // Run every Sunday at midnight
  @Cron('0 0 * * 0')
  async updateWeeklyTrends() {
    await this.updateAmazonTrends();
    await this.updateInstagramTrends();
    await this.updateGoogleTrends();
    await this.generateTrendReports();
    await this.notifyArtisans();
  }
}
```

### **Free-Tier Architecture**
- **AI Service**: Google Gemini API (free tier: 15 requests/minute)
- **Database**: MongoDB (existing) for trend data storage
- **Caching**: In-memory caching (no Redis needed)
- **Scraping**: Puppeteer (existing) for Amazon + Instagram
- **Scheduling**: Node-cron for weekly updates
- **Storage**: Local file system for trend reports

---

**Ready for approval! 🚀**

Please review this TODO list and let me know:
1. Any modifications or additions needed
2. Priority changes for any phases
3. Timeline adjustments
4. Technical approach concerns

Once approved, we'll start with Phase 1! 💪