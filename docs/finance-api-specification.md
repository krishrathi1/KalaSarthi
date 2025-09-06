# Finance API Specification

## Overview

The Finance API provides comprehensive financial analytics, loan processing, and real-time insights for the KalaBandhu platform. This API enables users to monitor sales performance, manage loans, and receive intelligent financial recommendations.

## Base URL

```
https://api.kalabandhu.com/finance
```

## Authentication

All API requests require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Core Endpoints

### Sales Analytics

#### Get Sales Data

```http
GET /api/finance/sales
```

**Query Parameters:**
- `range` (string): Time range - `7d`, `30d`, `90d`, `1y`, `all`
- `resolution` (string): Data resolution - `daily`, `weekly`, `monthly`, `yearly`
- `productId` (string): Filter by specific product
- `artisanId` (string): Filter by specific artisan
- `channel` (string): Filter by sales channel

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "periodKey": "2024-01-15",
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-01-15T23:59:59.999Z",
      "revenue": 50000,
      "units": 100,
      "orders": 25,
      "averageOrderValue": 2000,
      "averageUnitPrice": 500
    }
  ],
  "summary": {
    "totalRevenue": 50000,
    "totalUnits": 100,
    "totalOrders": 25,
    "averageOrderValue": 2000,
    "growthRate": 12.5
  },
  "metadata": {
    "resolution": "daily",
    "timeRange": "30d",
    "dataPoints": 30,
    "lastUpdated": "2024-01-15T10:30:00.000Z",
    "cacheStatus": "fresh"
  }
}
```

#### Create Sales Event

```http
POST /api/finance/sales
```

**Request Body:**
```json
{
  "orderId": "order_123",
  "artisanId": "artisan_456",
  "productId": "product_789",
  "revenue": 2500,
  "units": 5,
  "channel": "web",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Product Performance

#### Get Product Performance

```http
GET /api/finance/products/performance
```

**Query Parameters:**
- `range` (string): Time range
- `sort` (string): Sort by - `revenue`, `units`, `growth`, `margin`
- `limit` (number): Number of results to return

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "productId": "prod_123",
        "productName": "Handwoven Saree",
        "category": "Textiles",
        "revenue": 50000,
        "units": 25,
        "averagePrice": 2000,
        "growth": 15.5,
        "margin": 35.0,
        "rank": 1
      }
    ]
  }
}
```

### Forecasting

#### Get Revenue Forecast

```http
GET /api/finance/forecasts
```

**Query Parameters:**
- `horizon` (number): Forecast horizon in days
- `metric` (string): Metric to forecast - `revenue`, `orders`, `quantity`
- `confidence` (number): Confidence level - `80`, `90`, `95`, `99`

**Response:**
```json
{
  "success": true,
  "data": {
    "forecast": [
      {
        "date": "2024-01-16",
        "predicted": 55000,
        "upperBound": 60000,
        "lowerBound": 50000,
        "isHistorical": false
      }
    ],
    "confidence": {
      "level": 95,
      "accuracy": 0.87
    },
    "trend": {
      "direction": "up",
      "strength": 0.75
    }
  }
}
```

### Loan Management

#### Create Loan Application

```http
POST /api/loans
```

**Request Body:**
```json
{
  "userId": "user_123",
  "personalInfo": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+91-9876543210",
    "dateOfBirth": "1990-01-01",
    "panNumber": "ABCDE1234F",
    "aadhaarNumber": "123456789012",
    "address": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    }
  },
  "businessInfo": {
    "businessType": "Retail",
    "businessName": "Doe Enterprises",
    "annualTurnover": 500000,
    "businessExperience": 5,
    "gstNumber": "22ABCDE1234F1Z5"
  },
  "loanDetails": {
    "amount": 100000,
    "tenure": 12,
    "purpose": "Working Capital"
  }
}
```

#### Get Loan Applications

```http
GET /api/loans
```

**Query Parameters:**
- `userId` (string): Filter by user
- `status` (string): Filter by status
- `limit` (number): Number of results

#### Update Loan Status

```http
PUT /api/loans/{applicationId}
```

**Request Body:**
```json
{
  "status": "approved",
  "approvedAmount": 100000,
  "interestRate": 12.5,
  "tenure": 12,
  "comments": "Application approved after review"
}
```

### Document Management

#### Upload Document

```http
POST /api/loans/{applicationId}/documents
```

**Request Body (Form Data):**
- `file`: Document file
- `type`: Document type (aadhaar, pan, bank_statement, etc.)
- `name`: Document name

#### Process Document

```http
POST /api/documents/prepare
```

**Request Body:**
```json
{
  "applicationId": "loan_123",
  "documentType": "loan_application",
  "sourceDocuments": [
    {
      "url": "https://storage.example.com/docs/aadhaar.pdf",
      "type": "aadhaar"
    }
  ]
}
```

### Notifications

#### Send Notification

```http
POST /api/notifications
```

**Request Body:**
```json
{
  "type": "loan_status",
  "recipient": {
    "userId": "user_123",
    "email": "user@example.com",
    "phone": "+91-9876543210",
    "preferences": {
      "email": true,
      "sms": true,
      "push": false,
      "inApp": true
    }
  },
  "data": {
    "applicationId": "loan_123",
    "oldStatus": "under_review",
    "newStatus": "approved"
  }
}
```

### Observability

#### Get System Metrics

```http
GET /api/observability?type=health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "systemHealth": {
      "uptime": 3600,
      "memoryUsage": {
        "rss": 104857600,
        "heapTotal": 67108864,
        "heapUsed": 45000000
      },
      "activeConnections": 150,
      "errorRate": 0.02
    },
    "apiStats": {
      "totalRequests": 1250,
      "averageResponseTime": 245,
      "p95ResponseTime": 500,
      "errorRate": 0.02,
      "requestsPerSecond": 0.35
    },
    "aggregationStats": {
      "totalJobs": 24,
      "successRate": 0.96,
      "averageProcessingTime": 1250,
      "totalRecordsProcessed": 50000
    }
  }
}
```

## Error Handling

All API responses follow a consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes:**
- `AUTHENTICATION_FAILED`: Invalid or missing authentication
- `AUTHORIZATION_FAILED`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid request data
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate limited based on user tier:

- **Free Tier**: 100 requests/hour
- **Basic Tier**: 1000 requests/hour
- **Premium Tier**: 10000 requests/hour

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Webhooks

The API supports webhooks for real-time notifications:

### Configure Webhook

```http
POST /api/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/finance",
  "events": ["loan.status_changed", "payment.received"],
  "secret": "your_webhook_secret"
}
```

### Supported Events

- `loan.application_submitted`
- `loan.status_changed`
- `loan.approved`
- `loan.rejected`
- `payment.received`
- `payment.overdue`
- `sales.anomaly_detected`
- `forecast.generated`

## SDKs and Libraries

### JavaScript SDK

```javascript
import { FinanceAPI } from '@kalabandhu/finance-sdk';

const client = new FinanceAPI({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.kalabandhu.com'
});

// Get sales data
const sales = await client.sales.get({
  range: '30d',
  resolution: 'daily'
});

// Create loan application
const loan = await client.loans.create({
  personalInfo: { /* ... */ },
  businessInfo: { /* ... */ },
  loanDetails: { /* ... */ }
});
```

## Changelog

### v1.0.0 (Current)
- Initial release with core finance functionality
- Sales analytics and forecasting
- Loan application processing
- Document management
- Real-time notifications
- Comprehensive observability

## Support

For API support, please contact:
- Email: api-support@kalabandhu.com
- Documentation: https://docs.kalabandhu.com
- Status Page: https://status.kalabandhu.com