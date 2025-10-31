# Translation System Deployment Guide

## Pre-Deployment Checklist

### ✅ **Environment Setup**
- [ ] Google Cloud Project created
- [ ] Translation API enabled
- [ ] Service account configured
- [ ] API credentials downloaded
- [ ] Environment variables set
- [ ] Dependencies installed

### ✅ **Code Verification**
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] No console errors
- [ ] Translation components integrated
- [ ] Error boundaries in place

### ✅ **Performance Validation**
- [ ] Translation speed < 2 seconds
- [ ] Cache hit rate > 80%
- [ ] Memory usage < 10MB
- [ ] No memory leaks detected

## Deployment Steps

### 1. Environment Configuration

#### Production Environment Variables

```bash
# .env.production
GOOGLE_CLOUD_PROJECT_ID=kalasarthi-production
GOOGLE_APPLICATION_CREDENTIALS=key.json
NODE_ENV=production

# Translation Configuration
TRANSLATION_CACHE_SIZE=10485760  # 10MB for production
TRANSLATION_BATCH_SIZE=100
TRANSLATION_RATE_LIMIT=200
TRANSLATION_MAX_TEXT_LENGTH=5000

# Monitoring
ENABLE_TRANSLATION_ANALYTICS=true
TRANSLATION_ERROR_REPORTING=true
```

#### Google Cloud Production Setup

```bash
# 1. Create production project
gcloud projects create kalasarthi-production
gcloud config set project kalasarthi-production

# 2. Enable required APIs
gcloud services enable translate.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com

# 3. Create production service account
gcloud iam service-accounts create translation-prod \
  --display-name="Translation Service Production"

# 4. Grant necessary permissions
gcloud projects add-iam-policy-binding kalasarthi-production \
  --member="serviceAccount:translation-prod@kalasarthi-production.iam.gserviceaccount.com" \
  --role="roles/translate.user"

gcloud projects add-iam-policy-binding kalasarthi-production \
  --member="serviceAccount:translation-prod@kalasarthi-production.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

# 5. Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=translation-prod@kalasarthi-production.iam.gserviceaccount.com
```

### 2. Build and Test

```bash
# 1. Install dependencies
npm ci --production

# 2. Run type checking
npm run typecheck

# 3. Run tests
npm test -- --testPathPattern=translation --coverage

# 4. Build application
npm run build

# 5. Test production build
npm start
```

### 3. Deployment Platforms

#### Vercel Deployment

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Configure environment variables
vercel env add GOOGLE_CLOUD_PROJECT_ID
vercel env add GOOGLE_APPLICATION_CREDENTIALS

# 3. Upload service account key
# Upload key.json through Vercel dashboard

# 4. Deploy
vercel --prod
```

#### Netlify Deployment

```bash
# 1. Build application
npm run build

# 2. Configure environment variables in Netlify dashboard
# - GOOGLE_CLOUD_PROJECT_ID
# - GOOGLE_APPLICATION_CREDENTIALS (base64 encoded key.json)

# 3. Deploy
netlify deploy --prod --dir=.next
```

#### AWS Amplify Deployment

```bash
# 1. Install Amplify CLI
npm install -g @aws-amplify/cli

# 2. Initialize Amplify
amplify init

# 3. Add environment variables
amplify env add production

# 4. Deploy
amplify publish
```

#### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY . .

# Copy Google Cloud credentials
COPY key.json ./

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

```bash
# Build and deploy
docker build -t kalasarthi-translation .
docker run -p 3000:3000 \
  -e GOOGLE_CLOUD_PROJECT_ID=kalasarthi-production \
  -e GOOGLE_APPLICATION_CREDENTIALS=key.json \
  kalasarthi-translation
```

### 4. Post-Deployment Verification

#### Health Checks

```bash
# 1. API Health Check
curl https://your-domain.com/api/translate

# Expected response:
# {
#   "status": "healthy",
#   "service": "translation-api",
#   "timestamp": "2024-10-28T14:30:00Z"
# }

# 2. Translation Test
curl -X POST https://your-domain.com/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "sourceLanguage": "en",
    "targetLanguage": "hi"
  }'

# Expected response:
# {
#   "translatedText": "नमस्ते दुनिया",
#   "originalText": "Hello world",
#   "sourceLanguage": "en",
#   "targetLanguage": "hi",
#   "confidence": 0.95
# }
```

#### Frontend Verification

1. **Language Selector**: Verify dropdown works
2. **Translation Toggle**: Test enable/disable functionality
3. **Page Translation**: Verify DOM elements translate
4. **Error Handling**: Test with invalid inputs
5. **Cache Performance**: Verify cache hit rates
6. **Mobile Responsiveness**: Test on mobile devices

#### Performance Testing

```bash
# Load testing with Apache Bench
ab -n 100 -c 10 -H "Content-Type: application/json" \
  -p test-payload.json \
  https://your-domain.com/api/translate

# Monitor response times
# - Average: < 2000ms
# - 95th percentile: < 3000ms
# - Error rate: < 1%
```

## Monitoring Setup

### 1. Google Cloud Monitoring

```bash
# Enable monitoring
gcloud services enable monitoring.googleapis.com

# Create alert policies
gcloud alpha monitoring policies create \
  --policy-from-file=translation-alerts.yaml
```

```yaml
# translation-alerts.yaml
displayName: "Translation API Errors"
conditions:
  - displayName: "High error rate"
    conditionThreshold:
      filter: 'resource.type="cloud_function" AND metric.type="cloudfunctions.googleapis.com/function/execution_count"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 10
      duration: 300s
notificationChannels:
  - projects/kalasarthi-production/notificationChannels/YOUR_CHANNEL_ID
```

### 2. Application Monitoring

```typescript
// Add to your monitoring service
export const trackTranslationMetrics = (metrics: {
  translationTime: number;
  cacheHitRate: number;
  errorRate: number;
  language: string;
}) => {
  // Send to your analytics service
  analytics.track('translation_metrics', metrics);
};
```

### 3. Error Tracking

```typescript
// Add to error boundary
export const reportTranslationError = (error: Error, context: {
  text: string;
  targetLanguage: string;
  userId?: string;
}) => {
  // Send to error tracking service (Sentry, Bugsnag, etc.)
  errorTracker.captureException(error, {
    tags: {
      component: 'translation',
      language: context.targetLanguage
    },
    extra: context
  });
};
```

## Security Configuration

### 1. API Security

```typescript
// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // requests per window
  message: 'Too many translation requests',
  standardHeaders: true,
  legacyHeaders: false
};

// CORS configuration
const corsConfig = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://kalasarthi.com', 'https://www.kalasarthi.com']
    : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### 2. Content Security Policy

```typescript
// Add to your security headers
const cspConfig = {
  'default-src': ["'self'"],
  'connect-src': ["'self'", 'https://translate.googleapis.com'],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:']
};
```

### 3. Environment Security

```bash
# Secure file permissions
chmod 600 key.json

# Use environment variables for sensitive data
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

# Rotate keys regularly (every 90 days)
gcloud iam service-accounts keys create new-key.json \
  --iam-account=translation-prod@kalasarthi-production.iam.gserviceaccount.com

# Delete old keys
gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account=translation-prod@kalasarthi-production.iam.gserviceaccount.com
```

## Scaling Configuration

### 1. Horizontal Scaling

```yaml
# kubernetes-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kalasarthi-translation
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kalasarthi-translation
  template:
    metadata:
      labels:
        app: kalasarthi-translation
    spec:
      containers:
      - name: app
        image: kalasarthi-translation:latest
        ports:
        - containerPort: 3000
        env:
        - name: GOOGLE_CLOUD_PROJECT_ID
          value: "kalasarthi-production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### 2. Caching Strategy

```typescript
// Redis configuration for distributed caching
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  keyPrefix: 'translation:',
  ttl: 24 * 60 * 60, // 24 hours
  maxRetriesPerRequest: 3
};
```

### 3. Load Balancing

```nginx
# nginx.conf
upstream kalasarthi_translation {
    server app1.kalasarthi.com:3000;
    server app2.kalasarthi.com:3000;
    server app3.kalasarthi.com:3000;
}

server {
    listen 80;
    server_name kalasarthi.com;

    location /api/translate {
        proxy_pass http://kalasarthi_translation;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Rate limiting
        limit_req zone=translation burst=20 nodelay;
    }
}
```

## Backup and Recovery

### 1. Configuration Backup

```bash
# Backup Google Cloud configuration
gcloud config configurations export production-config \
  --file=gcloud-config-backup.yaml

# Backup service account keys
cp key.json backups/key-$(date +%Y%m%d).json

# Backup environment variables
env | grep TRANSLATION > backups/env-$(date +%Y%m%d).txt
```

### 2. Cache Backup

```typescript
// Backup translation cache
export const backupTranslationCache = async () => {
  const cache = await redis.keys('translation:*');
  const backup = {};
  
  for (const key of cache) {
    backup[key] = await redis.get(key);
  }
  
  fs.writeFileSync(
    `backups/cache-${new Date().toISOString().split('T')[0]}.json`,
    JSON.stringify(backup, null, 2)
  );
};
```

### 3. Disaster Recovery

```bash
# Recovery procedure
# 1. Restore Google Cloud configuration
gcloud config configurations activate production-config

# 2. Restore service account
cp backups/key-20241028.json key.json

# 3. Restore environment variables
source backups/env-20241028.txt

# 4. Redeploy application
npm run build
npm start

# 5. Verify functionality
curl https://your-domain.com/api/translate
```

## Maintenance

### 1. Regular Tasks

```bash
# Weekly maintenance script
#!/bin/bash

# Update dependencies
npm audit fix

# Run tests
npm test

# Check API quota usage
gcloud logging read "resource.type=cloud_function" \
  --limit=1000 --format="value(timestamp,severity,textPayload)"

# Clean old cache entries
redis-cli --scan --pattern "translation:*" | \
  xargs -L 1000 redis-cli DEL

# Rotate logs
logrotate /etc/logrotate.d/kalasarthi-translation
```

### 2. Performance Optimization

```typescript
// Monitor and optimize performance
export const optimizeTranslationPerformance = () => {
  // 1. Analyze cache hit rates
  const cacheStats = getCacheStats();
  if (cacheStats.hitRate < 0.8) {
    console.warn('Low cache hit rate:', cacheStats.hitRate);
  }

  // 2. Monitor API response times
  const avgResponseTime = getAverageResponseTime();
  if (avgResponseTime > 2000) {
    console.warn('High API response time:', avgResponseTime);
  }

  // 3. Check memory usage
  const memoryUsage = process.memoryUsage();
  if (memoryUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
    console.warn('High memory usage:', memoryUsage);
  }
};
```

### 3. Updates and Patches

```bash
# Update deployment script
#!/bin/bash

# 1. Backup current version
cp -r . backups/version-$(date +%Y%m%d)

# 2. Pull latest changes
git pull origin main

# 3. Install dependencies
npm ci

# 4. Run tests
npm test

# 5. Build application
npm run build

# 6. Deploy with zero downtime
pm2 reload kalasarthi-translation

# 7. Verify deployment
sleep 10
curl -f https://your-domain.com/api/translate || {
  echo "Deployment failed, rolling back..."
  pm2 reload kalasarthi-translation --update-env
  exit 1
}

echo "Deployment successful!"
```

## Troubleshooting

### Common Deployment Issues

#### 1. API Key Issues
```bash
# Verify API key
gcloud auth application-default print-access-token

# Test API access
curl -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=hello"
```

#### 2. Network Issues
```bash
# Test connectivity
curl -I https://translate.googleapis.com

# Check DNS resolution
nslookup translate.googleapis.com

# Test from server
telnet translate.googleapis.com 443
```

#### 3. Memory Issues
```bash
# Monitor memory usage
top -p $(pgrep -f "node.*kalasarthi")

# Check for memory leaks
node --inspect app.js
# Open chrome://inspect in Chrome
```

#### 4. Performance Issues
```bash
# Profile API calls
curl -w "@curl-format.txt" -X POST https://your-domain.com/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"hello","sourceLanguage":"en","targetLanguage":"hi"}'

# Monitor cache performance
redis-cli info stats
```

---

**Last Updated**: October 28, 2024  
**Version**: 1.0.0  
**Status**: Production Ready ✅