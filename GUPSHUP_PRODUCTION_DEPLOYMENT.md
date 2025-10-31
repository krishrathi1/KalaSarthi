# Gupshup Notification System - Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Gupshup Notification System to production with proper security, monitoring, and configuration.

## Prerequisites

- Gupshup account with API access
- WhatsApp Business API approval (if using WhatsApp)
- Production domain with HTTPS
- Environment variables configured
- Database access configured

## 1. Environment Configuration

### Step 1: Copy Environment Template

```bash
cp .env.production.example .env.production
```

### Step 2: Configure Gupshup Credentials

Update the following variables in `.env.production`:

```bash
# Required Gupshup API Credentials
GUPSHUP_API_KEY=your_actual_gupshup_api_key_from_dashboard
GUPSHUP_APP_ID=your_actual_gupshup_app_id_from_dashboard

# WhatsApp Business API Configuration
GUPSHUP_WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
GUPSHUP_WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_business_account_id

# Generate secure webhook secret (minimum 32 characters)
GUPSHUP_WEBHOOK_SECRET=$(openssl rand -hex 32)

# Production webhook URL
GUPSHUP_WEBHOOK_URL=https://your-production-domain.com/api/notifications/gupshup/webhook
```

### Step 3: Configure Rate Limits and Quotas

Adjust based on your Gupshup plan:

```bash
# Production Rate Limits (adjust based on your plan)
GUPSHUP_WHATSAPP_RATE_LIMIT_PER_SECOND=20
GUPSHUP_SMS_RATE_LIMIT_PER_SECOND=200
GUPSHUP_DAILY_MESSAGE_LIMIT=50000
GUPSHUP_MONTHLY_MESSAGE_LIMIT=1000000

# Cost Monitoring (amounts in your currency)
GUPSHUP_COST_ALERT_THRESHOLD=5000
GUPSHUP_DAILY_COST_LIMIT=1000
```

## 2. Webhook Configuration

### Step 1: Validate Configuration

Run the configuration validation script:

```bash
node scripts/configure-production-webhooks.js
```

### Step 2: Test Webhook Endpoint

Test webhook accessibility:

```bash
node scripts/configure-production-webhooks.js --test-security
```

### Step 3: Configure Gupshup Dashboard

1. Log into your Gupshup dashboard
2. Navigate to App Settings > Webhooks
3. Set webhook URL: `https://your-domain.com/api/notifications/gupshup/webhook`
4. Enable events:
   - Message Events
   - Delivery Events
   - Read Events
   - Failed Events

## 3. Security Configuration

### Step 1: Webhook Security

The system includes comprehensive security features:

- **Signature Validation**: HMAC-SHA256 signature verification
- **Timestamp Validation**: Prevents replay attacks
- **Rate Limiting**: Protects against abuse
- **IP Validation**: Optional IP whitelist support
- **Content Validation**: Payload size and format validation

### Step 2: Production Security Headers

Security headers are automatically applied:

```typescript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

### Step 3: Environment Security

Ensure production environment variables:

```bash
NODE_ENV=production
GUPSHUP_ENVIRONMENT=production
GUPSHUP_DEBUG_MODE=false
```

## 4. Monitoring and Health Checks

### Health Check Endpoint

Monitor system health at:
```
GET https://your-domain.com/api/notifications/gupshup/health
```

Response includes:
- Configuration validation
- Database connectivity
- Webhook configuration
- Service status
- Performance metrics

### Analytics Endpoint

Access delivery analytics at:
```
GET https://your-domain.com/api/notifications/gupshup/analytics
```

### Monitoring Alerts

Set up monitoring for:

1. **Health Check Failures**
   ```bash
   curl -f https://your-domain.com/api/notifications/gupshup/health || alert
   ```

2. **High Error Rates**
   - Monitor webhook processing errors
   - Alert on >5% error rate

3. **Cost Thresholds**
   - Daily cost limit alerts
   - Monthly budget warnings

4. **Rate Limit Violations**
   - API rate limit hits
   - Quota utilization alerts

## 5. Deployment Steps

### Step 1: Pre-deployment Validation

```bash
# Validate configuration
npm run validate-config

# Run tests
npm test

# Check for security issues
npm audit
```

### Step 2: Deploy Application

```bash
# Build for production
npm run build

# Deploy to your hosting platform
# (specific steps depend on your deployment method)
```

### Step 3: Post-deployment Verification

```bash
# Test health endpoint
curl https://your-domain.com/api/notifications/gupshup/health

# Test webhook endpoint
curl -X GET https://your-domain.com/api/notifications/gupshup/webhook

# Validate configuration
node scripts/configure-production-webhooks.js --configure-gupshup
```

## 6. Testing in Production

### Step 1: Send Test Message

```bash
curl -X POST https://your-domain.com/api/notifications/gupshup/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "templateName": "test_template",
    "templateParams": {
      "name": "Test User"
    },
    "language": "en"
  }'
```

### Step 2: Verify Webhook Processing

Check logs for webhook delivery confirmations:

```bash
# Check application logs
tail -f /var/log/your-app/application.log | grep "webhook_processed"
```

### Step 3: Monitor Analytics

```bash
# Get delivery report
curl https://your-domain.com/api/notifications/gupshup/analytics?days=1
```

## 7. Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Verify webhook URL is publicly accessible
   - Check Gupshup dashboard configuration
   - Validate webhook secret

2. **Authentication Errors**
   - Verify API key and App ID
   - Check account permissions
   - Validate WhatsApp Business setup

3. **Rate Limit Errors**
   - Check current usage in Gupshup dashboard
   - Adjust rate limit configuration
   - Implement message queuing

4. **Template Errors**
   - Verify templates are approved in Gupshup
   - Check template parameter mapping
   - Validate message content

### Debug Mode

Enable debug logging temporarily:

```bash
GUPSHUP_DEBUG_MODE=true
LOG_LEVEL=debug
```

### Health Check Debugging

Get detailed health information:

```bash
curl "https://your-domain.com/api/notifications/gupshup/health?metrics=true"
```

## 8. Maintenance

### Regular Tasks

1. **Monitor Costs**
   - Review daily/monthly usage
   - Check cost analytics
   - Optimize message routing

2. **Update Templates**
   - Keep WhatsApp templates current
   - Test template changes
   - Monitor approval status

3. **Review Analytics**
   - Check delivery success rates
   - Analyze error patterns
   - Optimize performance

4. **Security Updates**
   - Rotate webhook secrets regularly
   - Update dependencies
   - Review access logs

### Backup and Recovery

1. **Configuration Backup**
   ```bash
   # Backup environment configuration
   cp .env.production .env.production.backup.$(date +%Y%m%d)
   ```

2. **Database Backup**
   - Regular backups of notification logs
   - User preference data
   - Analytics data

## 9. Scaling Considerations

### High Volume Deployment

For high message volumes (>100k/day):

1. **Message Queue**
   - Implement Redis-based queue
   - Add queue workers
   - Monitor queue depth

2. **Database Optimization**
   - Index notification tables
   - Implement data archiving
   - Consider read replicas

3. **Caching**
   - Cache user preferences
   - Cache template data
   - Implement rate limit caching

### Multi-Region Deployment

For global deployment:

1. **Regional Endpoints**
   - Deploy in multiple regions
   - Use regional Gupshup endpoints
   - Implement failover logic

2. **Data Compliance**
   - Respect data residency requirements
   - Implement GDPR compliance
   - Handle user consent properly

## 10. Support and Monitoring

### Log Monitoring

Key log patterns to monitor:

```bash
# Successful webhook processing
grep "webhook_processed_successfully" /var/log/app.log

# Failed deliveries
grep "delivery_failed" /var/log/app.log

# Rate limit hits
grep "rate_limit_exceeded" /var/log/app.log

# Cost alerts
grep "cost_alert" /var/log/app.log
```

### Performance Metrics

Monitor these key metrics:

- Message delivery success rate (target: >95%)
- Average delivery time (target: <30 seconds)
- Webhook processing time (target: <1 second)
- Error rate (target: <2%)
- Cost per message (monitor trends)

### Alerting Setup

Configure alerts for:

- Health check failures
- High error rates (>5%)
- Cost threshold breaches
- Rate limit violations
- Webhook processing delays

## Contact and Support

For issues with this deployment:

1. Check application logs
2. Review health check endpoint
3. Consult Gupshup documentation
4. Contact system administrator

---

**Note**: This guide assumes a standard web application deployment. Adjust steps based on your specific hosting platform (AWS, GCP, Azure, etc.).