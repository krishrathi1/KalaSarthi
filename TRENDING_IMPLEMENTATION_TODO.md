# 🚀 Trending Feature - Implementation TODO

## 📋 **Immediate Implementation Plan**

### **🎯 Goal**: Build trending detection system with Amazon + Instagram trends, weekly updates, 100% free tier

---

## **Phase 1: Foundation (Day 1)**

### **1.1 Create Route Structure**
- [ ] Create `/trending` route (`src/app/trending/page.tsx`)
- [ ] Create basic trending component (`src/components/trending-dashboard.tsx`)
- [ ] Add navigation link to trending page
- [ ] Set up TypeScript interfaces for trending data

### **1.2 Define Core Interfaces**
```typescript
interface TrendingProduct {
  id: string;
  title: string;
  price: string;
  rating: number;
  rank: number;
  platform: 'amazon' | 'instagram';
  trendScore: number;
  weeklyGrowth: number;
  imageUrl: string;
  url: string;
  category: string;
  scrapedAt: string;
}

interface WeeklyTrendReport {
  profession: string;
  week: string;
  amazonTrends: TrendingProduct[];
  instagramTrends: InstagramTrend[];
  combinedScore: number;
  topProducts: TrendingProduct[];
  generatedAt: string;
}
```

---

## **Phase 2: Amazon Trend Scraper (Day 2-3)**

### **2.1 Amazon Best Sellers Scraper**
- [ ] Create `AmazonTrendScraper` service (`src/lib/services/amazon-trend-scraper.ts`)
- [ ] Implement `scrapeBestSellers(category)` function
- [ ] Add category mapping for artisan professions
- [ ] Extract: title, price, rating, rank, image, URL
- [ ] Add error handling and retry logic

### **2.2 Amazon Movers & Shakers**
- [ ] Implement `scrapeMoversAndShakers()` function
- [ ] Track products with biggest rank improvements
- [ ] Calculate trend velocity (rank change speed)
- [ ] Add weekly growth percentage calculation

### **2.3 Amazon Integration**
- [ ] Create API endpoint `/api/trending/amazon/[profession]`
- [ ] Add caching (7-day cache for weekly updates)
- [ ] Test with different artisan professions
- [ ] Add fallback data for scraping failures

---

## **Phase 3: Instagram Trend Scraper (Day 4-5)**

### **3.1 Instagram Hashtag Scraper**
- [ ] Create `InstagramTrendScraper` service (`src/lib/services/instagram-trend-scraper.ts`)
- [ ] Implement `scrapeHashtagTrends(profession)` function
- [ ] Map professions to relevant hashtags
- [ ] Extract: hashtag, post count, recent posts, engagement

### **3.2 Instagram Popular Posts**
- [ ] Implement `scrapePopularPosts(hashtag)` function
- [ ] Extract viral craft posts and techniques
- [ ] Analyze captions for product mentions
- [ ] Calculate social media trend scores

### **3.3 Instagram Integration**
- [ ] Create API endpoint `/api/trending/instagram/[profession]`
- [ ] Add rate limiting to avoid Instagram blocks
- [ ] Implement graceful error handling
- [ ] Cache results for weekly updates

---

## **Phase 4: Trend Analysis Engine (Day 6-7)**

### **4.1 Trend Aggregation Service**
- [ ] Create `TrendAggregator` service (`src/lib/services/trend-aggregator.ts`)
- [ ] Combine Amazon + Instagram + Google Trends data
- [ ] Implement weighted scoring algorithm
- [ ] Calculate combined trend scores (0-100)
- [ ] Identify top trending products

### **4.2 Weekly Comparison System**
- [ ] Store historical trend data in MongoDB
- [ ] Calculate week-over-week growth percentages
- [ ] Identify breakout trends (>50% growth)
- [ ] Generate trend change notifications

### **4.3 AI Enhancement Integration**
- [ ] Use existing Gemini AI to explain "why trending"
- [ ] Generate product suggestions based on trends
- [ ] Add seasonal/festival trend predictions
- [ ] Create actionable insights for artisans

---

## **Phase 5: Weekly Update System (Day 8)**

### **5.1 Automated Scheduler**
- [ ] Create `WeeklyTrendUpdater` service (`src/lib/services/weekly-trend-updater.ts`)
- [ ] Set up cron job for Sunday 2 AM updates
- [ ] Update all profession trends automatically
- [ ] Send notifications for significant changes

### **5.2 Data Storage**
- [ ] Create MongoDB schema for trend reports
- [ ] Add indexes for efficient queries
- [ ] Implement data expiration (30 days)
- [ ] Add backup and recovery system

---

## **Phase 6: Trending Dashboard UI (Day 9-10)**

### **6.1 Main Dashboard**
- [ ] Create responsive trending dashboard
- [ ] Add trend categories: 🔥 Hot, 📈 Rising, 🎄 Seasonal
- [ ] Show weekly growth indicators
- [ ] Display combined trend scores

### **6.2 Product Cards**
- [ ] Create `TrendingProductCard` component
- [ ] Show trend source (Amazon/Instagram)
- [ ] Add "Why trending" explanations
- [ ] Include direct links to products

### **6.3 Interactive Features**
- [ ] Add profession filter dropdown
- [ ] Implement trend search functionality
- [ ] Create "Refresh Trends" button
- [ ] Add trend comparison tools

---

## **Phase 7: Profile Integration (Day 11)**

### **7.1 Artisan Profile Connection**
- [ ] Fetch artisan profession from profile
- [ ] Load profession-specific trends
- [ ] Integrate with existing inventory system
- [ ] Show personalized trend recommendations

### **7.2 Smart Suggestions**
- [ ] Compare trends with existing products
- [ ] Identify market gaps and opportunities
- [ ] Suggest complementary products
- [ ] Add "Create Similar Product" actions

---

## **Phase 8: Testing & Optimization (Day 12)**

### **8.1 Comprehensive Testing**
- [ ] Test Amazon scraping with all professions
- [ ] Test Instagram scraping reliability
- [ ] Validate trend scoring accuracy
- [ ] Test weekly update system

### **8.2 Performance Optimization**
- [ ] Optimize scraping speed and reliability
- [ ] Add proper error handling and fallbacks
- [ ] Implement request rate limiting
- [ ] Add monitoring and health checks

---

## **Phase 9: Deployment (Day 13)**

### **9.1 Production Setup**
- [ ] Configure environment variables
- [ ] Set up weekly cron jobs
- [ ] Deploy trending system
- [ ] Monitor initial performance

### **9.2 User Testing**
- [ ] Test with real artisan profiles
- [ ] Gather feedback on trend relevance
- [ ] Validate UI/UX experience
- [ ] Make final adjustments

---

## 📁 **File Structure to Create**

```
src/
├── app/trending/
│   └── page.tsx                           # Main trending route
├── app/api/trending/
│   ├── [profession]/route.ts              # Get trends by profession
│   ├── amazon/[profession]/route.ts       # Amazon trends API
│   ├── instagram/[profession]/route.ts    # Instagram trends API
│   └── refresh/route.ts                   # Manual refresh API
├── components/
│   ├── trending-dashboard.tsx             # Main dashboard
│   ├── trending-product-card.tsx          # Product display
│   ├── trend-metrics.tsx                  # Metrics display
│   └── instagram-trend-grid.tsx           # Social media trends
├── lib/services/
│   ├── amazon-trend-scraper.ts            # Amazon scraping
│   ├── instagram-trend-scraper.ts         # Instagram scraping
│   ├── trend-aggregator.ts                # Data combination
│   └── weekly-trend-updater.ts            # Automated updates
├── lib/models/
│   └── trend-report.ts                    # MongoDB schema
└── types/
    └── trending.ts                        # TypeScript interfaces
```

---

## 🎯 **Success Criteria**

### **MVP Requirements**
- [ ] Amazon Best Sellers scraping works for all professions
- [ ] Instagram hashtag trends are tracked accurately
- [ ] Weekly automated updates run successfully
- [ ] Trending dashboard shows relevant data
- [ ] System runs 100% on free tier

### **Quality Metrics**
- [ ] 90%+ scraping success rate
- [ ] <5 second page load time
- [ ] Trends update weekly without manual intervention
- [ ] Mobile-responsive UI
- [ ] Error handling for all failure scenarios

---

## ⚡ **Quick Start Checklist**

### **Day 1 - Foundation**
1. Create `/trending` route
2. Set up basic UI components
3. Define TypeScript interfaces
4. Add navigation links

### **Day 2-3 - Amazon Scraping**
1. Build Amazon trend scraper
2. Test with pottery/woodworking categories
3. Create API endpoints
4. Add error handling

### **Day 4-5 - Instagram Scraping**
1. Build Instagram hashtag scraper
2. Test with craft hashtags
3. Extract engagement metrics
4. Create social media API

### **Day 6-7 - Trend Analysis**
1. Combine all data sources
2. Implement scoring algorithm
3. Add weekly comparisons
4. Generate insights

### **Day 8 - Automation**
1. Set up weekly cron jobs
2. Test automated updates
3. Add notification system
4. Monitor performance

### **Day 9-10 - UI/UX**
1. Build trending dashboard
2. Create product cards
3. Add interactive features
4. Test mobile experience

### **Day 11-13 - Integration & Deployment**
1. Connect to user profiles
2. Test end-to-end system
3. Deploy to production
4. Monitor and optimize

---

## 💰 **Budget Confirmation**
- **Total Cost**: $0/month (100% free tier)
- **Google Gemini**: Free tier (sufficient for our usage)
- **Scraping**: Free web scraping only
- **Storage**: Existing MongoDB
- **Hosting**: Current server

---

## 🚨 **Risk Mitigation**

### **Scraping Risks**
- **Amazon blocks**: Use rotating user agents, respect rate limits
- **Instagram blocks**: Limit requests, add delays between scrapes
- **Data accuracy**: Validate scraped data, add fallback mechanisms

### **Performance Risks**
- **Slow scraping**: Implement parallel processing, optimize selectors
- **Memory usage**: Clean up browser instances, limit concurrent scrapes
- **Storage growth**: Implement data expiration, compress old data

---

**Ready for approval! 🚀**

**Questions for approval:**
1. Is the 13-day timeline acceptable?
2. Should we start with Amazon scraping first?
3. Any specific professions to prioritize for testing?
4. Any UI/UX preferences for the trending dashboard?

**Once approved, I'll start with Phase 1 immediately!** 💪