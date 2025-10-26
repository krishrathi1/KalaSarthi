# 🛒 E-commerce Scraper Test Page

## Overview

A comprehensive testing interface for scraping products from major Indian e-commerce platforms (Amazon, Flipkart, and Meesho) based on artisan professions.

## Features

### 🎯 **Profession-Based Scraping**
- **8 Artisan Professions**: Weaver, Potter, Jeweler, Carpenter, Metalworker, Painter, Leather Worker, Basket Maker
- **Smart Keywords**: Each profession has optimized search keywords for better results
- **Targeted Results**: Products relevant to specific artisan crafts

### 🏪 **Multi-Platform Support**
- **Amazon**: Global marketplace with Prime shipping
- **Flipkart**: India's largest online marketplace  
- **Meesho**: Reseller-focused social commerce platform
- **Individual Testing**: Test each platform separately
- **Bulk Testing**: Scrape all platforms simultaneously

### 📊 **Detailed Product Information**
- **Product Images**: Thumbnail display with error handling
- **Pricing**: Current price, original price, discount percentage
- **Ratings & Reviews**: Star ratings and review counts
- **Platform Badges**: Clear platform identification
- **Product Details**: Page numbers, Prime status, sponsored tags
- **Direct Links**: Click to view products on original platforms

### ⚡ **Real-Time Performance Metrics**
- **Response Times**: Track scraping duration for each platform
- **Success Rates**: Monitor successful vs failed scrapes
- **Product Counts**: Real-time count of scraped products
- **Error Handling**: Detailed error messages with retry options

## How to Use

### 1. **Access the Test Page**
Navigate to: `/ecommerce-scraper-test`

### 2. **Select Artisan Profession**
Choose from 8 available professions:
- **Weaver** → searches for "handwoven textiles sarees fabrics"
- **Potter** → searches for "handmade pottery ceramic clay"
- **Jeweler** → searches for "handmade jewelry silver ornaments"
- **Carpenter** → searches for "handcrafted wooden furniture"
- **Metalworker** → searches for "handcrafted metal brass copper"
- **Painter** → searches for "traditional paintings art canvas"
- **Leather Worker** → searches for "handcrafted leather bags"
- **Basket Maker** → searches for "handwoven baskets bamboo"

### 3. **Scrape Products**
- **Individual Platform**: Click "Scrape" button next to each platform
- **All Platforms**: Click "Scrape All Platforms" for bulk testing
- **Real-time Results**: View products as they're scraped

### 4. **Analyze Results**
- **Product Cards**: Detailed product information with images
- **Performance Metrics**: Response times and success rates
- **Summary Statistics**: Total products, successful scrapes, failures
- **Direct Access**: Click "View on [Platform]" to visit product pages

## Technical Details

### **API Endpoint Used**
```
GET /api/scrape-products?query={keywords}&platform={platform}
```

### **Supported Platforms**
- `amazon` - Amazon India
- `flipkart` - Flipkart
- `meesho` - Meesho
- `all` - All platforms (bulk scraping)

### **Scraping Parameters**
- **Price Range**: ₹500 - ₹50,000
- **Max Results**: 20 products per platform
- **Max Pages**: 2 pages per platform
- **Timeout**: 30 seconds per platform

### **Product Data Structure**
```typescript
interface Product {
  title: string;           // Product name
  url: string;            // Product URL
  price: number;          // Current price in INR
  originalPrice?: number; // Original price (if discounted)
  rating?: number;        // Star rating (1-5)
  reviewCount?: number;   // Number of reviews
  discount?: number;      // Discount percentage
  image?: string;         // Product image URL
  platform: string;      // Source platform
  page?: number;          // Page number where found
  isPrime?: boolean;      // Amazon Prime eligible
  isSponsored?: boolean;  // Sponsored product
}
```

## Use Cases

### **For Developers**
- **API Testing**: Validate scraping functionality
- **Performance Monitoring**: Track response times and success rates
- **Error Debugging**: Identify and fix scraping issues
- **Data Quality**: Verify scraped product information

### **For Artisans**
- **Market Research**: Discover trending products in their craft
- **Price Analysis**: Compare pricing across platforms
- **Competition Study**: Analyze similar products and their performance
- **Platform Selection**: Choose best platforms for their products

### **For Business Analysis**
- **Market Trends**: Identify popular products by profession
- **Platform Comparison**: Compare product availability across platforms
- **Pricing Strategies**: Analyze pricing patterns
- **Performance Metrics**: Monitor scraping system health

## Error Handling

### **Common Issues**
- **Network Timeouts**: Retry mechanism with exponential backoff
- **Anti-Bot Protection**: Graceful handling with fallback data
- **Rate Limiting**: Automatic throttling and retry logic
- **Invalid Responses**: Data validation and error reporting

### **Error Display**
- **Visual Indicators**: Red error cards with detailed messages
- **Retry Options**: One-click retry for failed scrapes
- **Fallback Behavior**: Graceful degradation when scraping fails
- **Performance Impact**: Minimal impact on successful platforms

## Performance Optimization

### **Concurrent Scraping**
- **Parallel Execution**: All platforms scraped simultaneously
- **Independent Failures**: One platform failure doesn't affect others
- **Resource Management**: Efficient memory and CPU usage
- **Timeout Handling**: Prevents hanging requests

### **Caching Strategy**
- **Response Caching**: Cache successful responses for faster subsequent requests
- **Image Optimization**: Lazy loading and error handling for product images
- **State Management**: Efficient React state updates
- **Memory Management**: Cleanup of unused data

## Future Enhancements

### **Planned Features**
- **Export Functionality**: Download scraped data as CSV/JSON
- **Advanced Filtering**: Filter by price range, ratings, reviews
- **Historical Data**: Track product trends over time
- **Comparison Tools**: Side-by-side product comparison
- **Notification System**: Alerts for price drops or new products

### **Technical Improvements**
- **Real-time Updates**: WebSocket-based live updates
- **Advanced Analytics**: Detailed performance metrics and charts
- **A/B Testing**: Test different scraping strategies
- **Machine Learning**: Intelligent product categorization
- **API Rate Limiting**: Smart throttling based on platform limits

## Troubleshooting

### **No Products Found**
- Check if the selected profession has relevant products
- Try different profession or broader search terms
- Verify internet connection and API availability

### **Slow Performance**
- Individual platform scraping is faster than bulk scraping
- Network conditions affect scraping speed
- Some platforms may have anti-bot measures causing delays

### **Scraping Failures**
- Platforms may block requests temporarily
- Retry after a few minutes
- Check browser console for detailed error messages

---

**Built for KalaSarthi** - Empowering artisans with AI-powered market intelligence