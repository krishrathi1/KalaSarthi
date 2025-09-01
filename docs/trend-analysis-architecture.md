# Trend Analysis Architecture for KalaBandhu

## Overview

This document outlines the comprehensive architecture for the Trend Analysis feature in KalaBandhu, designed to help artisans discover market trends and optimize their product offerings.

## Architecture Components

### 1. Data Sources Layer

#### Primary Sources
- **Google Trends API**: Real-time search interest data and trending keywords
- **Marketplace APIs**: Direct API access to platforms (when available)
  - Etsy API
  - Amazon Product Advertising API
  - eBay API

#### Secondary Sources (Backup)
- **Puppeteer Scrapers**: Web scraping for platforms without APIs
  - Amazon, Flipkart, Meesho, IndiaMart, Nykaa
- **Social Media APIs**: Twitter, Instagram trending topics
- **News APIs**: Industry news and fashion trends

### 2. Scraping Layer

#### Technology Stack
- **Puppeteer**: Headless browser automation for web scraping
- **Node.js**: Runtime environment
- **Cloud Run/Cloud Functions**: Serverless deployment

#### Scraping Services
- `src/lib/trend-scraper.ts`: Main scraper implementation
- Individual scrapers for each platform
- Error handling and retry mechanisms
- Rate limiting and anti-detection measures

### 3. Data Storage Layer

#### BigQuery (Primary Storage)
- **Dataset**: `trend_analysis`
- **Tables**:
  - `scraped_products`: Raw product data
  - `trend_data`: Processed trend information
  - `market_insights`: AI-generated insights
  - `artisan_queries`: Query history and caching

#### Firestore (Caching & Real-time)
- **Collections**:
  - `artisan_trends`: Cached trend results per artisan
  - `market_data`: Frequently accessed market data
  - `ai_insights`: Cached AI-generated insights

### 4. AI Layer

#### Vertex AI (Gemini Pro)
- **Trend Summarization**: Convert raw data into actionable insights
- **Sentiment Analysis**: Analyze customer reviews and feedback
- **Recommendation Engine**: Generate personalized suggestions
- **Cultural Context**: Understand regional preferences

#### AI Flows
- `cultural-trend-suggestions.ts`: Cultural trend analysis
- Enhanced trend analysis with Vertex AI integration

### 5. API Layer

#### REST APIs
- `POST /api/trend-analysis`: Main trend analysis endpoint
- `GET /api/trend-analysis/history`: Query history
- `POST /api/trend-analysis/cache`: Cache management

#### Data Processing Pipeline
1. Receive artisan query
2. Check cache (Firestore)
3. Fetch data from multiple sources
4. Store raw data in BigQuery
5. Process with Vertex AI
6. Cache results
7. Return insights

### 6. Frontend Layer

#### Components
- `TrendMapper`: Main trend analysis interface
- Real-time data visualization
- Interactive trend charts
- Recommendation display

#### Features
- Artisan profession input
- Real-time trend updates
- Historical trend comparison
- Export functionality

## Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Artisan UI    │────│   Next.js API    │────│  Cloud Function │
│                 │    │   Route          │    │   (Scraping)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Firestore     │    │    BigQuery      │    │  Google Trends  │
│   (Cache)       │    │   (Storage)      │    │     API         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Vertex AI      │────│  Data Pipeline   │────│  Marketplace    │
│  (Gemini Pro)   │    │  Orchestration   │    │    APIs         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Deployment Architecture

### Cloud Run (Scraping Service)
```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: trend-scraper-service
spec:
  template:
    spec:
      containers:
      - image: gcr.io/PROJECT-ID/trend-scraper:latest
        env:
        - name: GOOGLE_CLOUD_PROJECT
          value: "gen-lang-client-0314311341"
        resources:
          limits:
            cpu: "2"
            memory: "2Gi"
```

### Cloud Functions (API Endpoints)
```javascript
// functions/src/index.js
const functions = require('firebase-functions');
const { trendScraper } = require('./trend-scraper');

exports.analyzeTrends = functions
  .runWith({ memory: '2GB', timeoutSeconds: 540 })
  .https.onCall(async (data, context) => {
    return await trendScraper.getTrendingProducts(data.profession);
  });
```

## Security & Compliance

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Access Control**: IAM roles for BigQuery and Firestore
- **Rate Limiting**: Prevent abuse of scraping services
- **GDPR Compliance**: Data retention policies

### Monitoring & Logging
- **Cloud Logging**: Centralized logging
- **Cloud Monitoring**: Performance metrics
- **Error Tracking**: Sentry integration
- **Alerting**: Automated alerts for failures

## Performance Optimization

### Caching Strategy
- **Firestore**: Cache frequently accessed data
- **CDN**: Static assets and images
- **Redis**: Session data and temporary results

### Scalability
- **Auto-scaling**: Cloud Run instances based on load
- **BigQuery Optimization**: Partitioned tables, clustering
- **Async Processing**: Background jobs for heavy computations

## Cost Optimization

### Resource Management
- **Spot Instances**: Use preemptible VMs for scraping
- **BigQuery Slots**: Reserved slots for predictable costs
- **Firestore**: Optimize read/write operations

### Data Lifecycle
- **Retention Policies**: Automatic cleanup of old data
- **Archival**: Move historical data to cheaper storage
- **Compression**: Compress large datasets

## Future Enhancements

### Advanced Features
- **Real-time Trends**: WebSocket connections for live updates
- **Predictive Analytics**: ML models for trend forecasting
- **Multi-language Support**: Global market analysis
- **AR/VR Integration**: Virtual product visualization

### Integration Points
- **ERP Systems**: Direct integration with artisan management
- **E-commerce Platforms**: Automated product listing
- **Social Media**: Trend analysis from social platforms
- **IoT Devices**: Real-time market data from sensors