# Trend Analysis Architecture Deployment Guide

This document provides instructions for deploying the comprehensive trend analysis architecture for KalaBandhu.

## Architecture Overview

The trend analysis system consists of:

1. **Data Sources Layer**
   - Google Trends API (Primary)
   - Puppeteer Scrapers (Backup)
   - Marketplace APIs (when available)

2. **Processing Layer**
   - Trend Analysis Orchestrator
   - Vertex AI (Gemini Pro) for insights
   - BigQuery for data storage
   - Firestore for caching

3. **API Layer**
   - Next.js API routes
   - Cloud Functions (alternative deployment)

4. **Deployment Options**
   - Cloud Run (recommended)
   - Cloud Functions
   - Local development

## Prerequisites

### Google Cloud Setup

1. **Enable Required APIs:**
   ```bash
   gcloud services enable bigquery.googleapis.com
   gcloud services enable firestore.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable aiplatform.googleapis.com
   ```

2. **Create Service Account:**
   ```bash
   gcloud iam service-accounts create trend-analysis-sa \
     --description="Service account for trend analysis" \
     --display-name="Trend Analysis Service Account"
   ```

3. **Grant Permissions:**
   ```bash
   gcloud projects add-iam-policy-binding gen-lang-client-0314311341 \
     --member="serviceAccount:trend-analysis-sa@gen-lang-client-0314311341.iam.gserviceaccount.com" \
     --role="roles/bigquery.admin"

   gcloud projects add-iam-policy-binding gen-lang-client-0314311341 \
     --member="serviceAccount:trend-analysis-sa@gen-lang-client-0314311341.iam.gserviceaccount.com" \
     --role="roles/datastore.user"

   gcloud projects add-iam-policy-binding gen-lang-client-0314311341 \
     --member="serviceAccount:trend-analysis-sa@gen-lang-client-0314311341.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   ```

4. **Create Secrets:**
   ```bash
   echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key --data-file=-
   gcloud secrets add-iam-policy-binding gemini-api-key \
     --member="serviceAccount:trend-analysis-sa@gen-lang-client-0314311341.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

## Deployment Options

### Option 1: Cloud Run (Recommended)

1. **Build and Push Docker Image:**
   ```bash
   gcloud builds submit --tag gcr.io/gen-lang-client-0314311341/trend-analysis-service:latest .
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy trend-analysis-service \
     --image gcr.io/gen-lang-client-0314311341/trend-analysis-service:latest \
     --platform managed \
     --region asia-south1 \
     --service-account trend-analysis-sa@gen-lang-client-0314311341.iam.gserviceaccount.com \
     --set-env-vars "GOOGLE_CLOUD_PROJECT=gen-lang-client-0314311341" \
     --set-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
     --memory 4Gi \
     --cpu 2 \
     --max-instances 10 \
     --timeout 900 \
     --port 8080
   ```

### Option 2: Cloud Functions

1. **Deploy Functions:**
   ```bash
   cd deploy/cloud-functions/trend-scraper
   firebase deploy --only functions
   ```

2. **Set Environment Variables:**
   ```bash
   firebase functions:config:set \
     google_cloud.project="gen-lang-client-0314311341" \
     gemini.api_key="your-api-key"
   ```

### Option 3: Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Set Environment Variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize BigQuery Tables:**
   ```bash
   node -e "
   const { bigQueryService } = require('./src/lib/bigquery-service');
   bigQueryService.initializeDataset().then(() => console.log('BigQuery initialized'));
   "
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLOUD_PROJECT` | Google Cloud Project ID | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key | Yes |
| `GEMINI_API_KEY` | Google AI API Key | Yes |
| `BIGQUERY_DATASET` | BigQuery dataset name | No (default: trend_analysis) |
| `FIRESTORE_CACHE_COLLECTION` | Firestore cache collection | No (default: trend_cache) |
| `MONITORING_DATASET` | Monitoring dataset name | No (default: monitoring) |
| `TREND_ANALYSIS_TIMEOUT` | Request timeout in ms | No (default: 180000) |
| `CACHE_TTL_HOURS` | Cache TTL in hours | No (default: 24) |

### BigQuery Schema

The system automatically creates the following tables:

- `trend_analysis.scraped_products`
- `trend_analysis.trend_data`
- `trend_analysis.market_insights`
- `monitoring.trend_analysis_logs`
- `monitoring.performance_metrics`

## Monitoring and Maintenance

### Health Checks

- **Cloud Run:** Automatic health checks configured
- **Cloud Functions:** Health check endpoint available
- **Local:** Health endpoint at `/api/health`

### Monitoring

The system provides:

1. **Performance Metrics:**
   - Request latency
   - Success/error rates
   - Cache hit rates
   - Data source usage

2. **Error Tracking:**
   - Failed requests
   - Service outages
   - Data quality issues

3. **Usage Analytics:**
   - User activity
   - Popular professions
   - System utilization

### Maintenance Tasks

1. **Daily Cleanup:**
   ```bash
   # Remove old data (>90 days)
   gcloud scheduler jobs create http cleanup-job \
     --schedule="0 2 * * *" \
     --uri="https://your-service-url/cleanup" \
     --http-method=POST
   ```

2. **Cache Management:**
   - Automatic cleanup of expired cache entries
   - Manual cache invalidation available

3. **Performance Optimization:**
   - Monitor BigQuery costs
   - Optimize query performance
   - Scale resources based on usage

## API Usage

### Trend Analysis Endpoint

```bash
POST /api/trend-analysis
Content-Type: application/json

{
  "artisanProfession": "weaver",
  "uid": "user-id",
  "forceRefresh": false
}
```

**Response:**
```json
{
  "success": true,
  "trends": [...],
  "analysis": "Market analysis summary...",
  "recommendations": [...],
  "cached": false,
  "dataSources": ["Google Trends", "Amazon"],
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Health Check Endpoint

```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "bigquery": true,
    "firestore": true,
    "googleTrends": true,
    "vertexAI": true
  }
}
```

## Troubleshooting

### Common Issues

1. **BigQuery Permission Errors:**
   ```bash
   gcloud iam service-accounts add-iam-policy-binding trend-analysis-sa@gen-lang-client-0314311341.iam.gserviceaccount.com \
     --member="user:your-email@example.com" \
     --role="roles/iam.serviceAccountTokenCreator"
   ```

2. **Puppeteer Chromium Issues:**
   ```bash
   # For local development
   export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
   npm install puppeteer
   ```

3. **Memory Issues:**
   - Increase Cloud Run memory allocation
   - Implement streaming for large datasets
   - Use BigQuery pagination for large queries

### Logs and Debugging

1. **Cloud Run Logs:**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=trend-analysis-service" --limit=50
   ```

2. **BigQuery Audit Logs:**
   ```bash
   gcloud logging read "resource.type=bigquery_resource" --filter="protoPayload.methodName=google.cloud.bigquery.v2.JobService.InsertJob" --limit=20
   ```

3. **Application Logs:**
   - Available in BigQuery `monitoring.trend_analysis_logs` table
   - Structured logging with levels: INFO, WARN, ERROR

## Cost Optimization

### BigQuery Costs
- Use partitioned tables
- Implement data lifecycle policies
- Monitor query costs regularly

### Cloud Run Costs
- Set appropriate CPU/memory limits
- Use spot instances for non-critical workloads
- Implement auto-scaling based on load

### Caching Strategy
- 24-hour cache TTL for trend data
- Cache frequently accessed results
- Implement cache warming for popular queries

## Security Considerations

1. **Service Account Keys:**
   - Rotate keys regularly
   - Use minimal required permissions
   - Store keys securely

2. **Data Privacy:**
   - Implement data retention policies
   - Encrypt sensitive data
   - Comply with GDPR requirements

3. **API Security:**
   - Rate limiting implemented
   - Input validation
   - Error handling without data leakage

## Support and Maintenance

### Regular Tasks
- Monitor system health daily
- Review performance metrics weekly
- Update dependencies monthly
- Security patches as needed

### Contact
For support and maintenance inquiries, refer to the main KalaBandhu project documentation.