# Business Intelligence Integration Guide

## Overview

This guide covers the integration of three major business intelligence systems with Artisan Buddy chatbot:

1. **Digital Khata** - Financial tracking and sales analytics
2. **Scheme Sahayak** - Government scheme discovery and application management
3. **Buyer Connect** - Buyer inquiry and matching system

These integrations enable artisans to access comprehensive business insights through natural conversation with the chatbot.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Artisan Buddy Chatbot                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Response Generator                                │  │
│  │  - Handles business queries                              │  │
│  │  - Formats insights                                      │  │
│  │  - Generates recommendations                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Business Intelligence Integration Layer             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Digital     │  │  Scheme      │  │  Buyer       │          │
│  │  Khata       │  │  Sahayak     │  │  Connect     │          │
│  │  Integration │  │  Integration │  │  Integration │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Core Services Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Enhanced    │  │  Scheme      │  │  Matching    │          │
│  │  Digital     │  │  Discovery   │  │  Orchestrator│          │
│  │  Khata       │  │  Service     │  │  Agent       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Digital Khata Integration

### Features

- **Sales Metrics**: Real-time sales performance tracking
- **Financial Insights**: Revenue analysis, profit margins, cash flow
- **Inventory Status**: Stock levels, alerts, recommendations
- **Trend Analysis**: Historical patterns, predictions, insights

### Usage

```typescript
import { digitalKhataIntegration } from '@/lib/services/artisan-buddy/DigitalKhataIntegration';

// Get quick summary
const summary = await digitalKhataIntegration.getQuickFinancialSummary('artisan_001');

// Get detailed sales metrics
const metrics = await digitalKhataIntegration.getSalesMetrics('artisan_001', 'month');

// Get financial insights
const insights = await digitalKhataIntegration.getFinancialInsights('artisan_001');

// Check inventory
const inventory = await digitalKhataIntegration.getInventoryInsights('artisan_001');

// Analyze trends
const trends = await digitalKhataIntegration.analyzeSalesTrends('artisan_001', 'month');
```

### Chatbot Integration

The chatbot automatically fetches Digital Khata data when users ask:
- "How are my sales?"
- "Show me my revenue"
- "Check my inventory"
- "What are my top products?"
- "Analyze my sales trends"

### Response Format

```
📊 Financial Summary:

💰 Sales Performance:
- Today: ₹5,200
- This Week: ₹28,400
- This Month: ₹125,000
- Growth: +12.5% (increasing)

📦 Inventory Status:
- Total Products: 45
- Low Stock: 3 items
- Out of Stock: 1 items
- Inventory Value: ₹450,000

💡 Top Insight: Your sales are growing by 12.5%. Keep up the momentum!
```

## 2. Scheme Sahayak Integration

### Features

- **Scheme Recommendations**: Personalized government scheme suggestions
- **Application Status**: Track application progress
- **Eligibility Checking**: Verify eligibility for schemes
- **Scheme Comparison**: Compare multiple schemes side-by-side

### Usage

```typescript
import { schemeSahayakIntegration } from '@/lib/services/artisan-buddy/SchemeSahayakIntegration';

// Get recommendations
const recommendations = await schemeSahayakIntegration.getSchemeRecommendations('artisan_001', 5);

// Check application status
const statuses = await schemeSahayakIntegration.getApplicationStatuses('artisan_001');

// Check eligibility
const eligibility = await schemeSahayakIntegration.checkEligibility('artisan_001', 'scheme_123');

// Compare schemes
const comparison = await schemeSahayakIntegration.compareSchemes('artisan_001', ['scheme_1', 'scheme_2']);

// Get quick summary
const summary = await schemeSahayakIntegration.getQuickSchemeSummary('artisan_001');
```

### Chatbot Integration

The chatbot responds to queries like:
- "What schemes am I eligible for?"
- "Check my scheme application status"
- "Compare these schemes"
- "Show me government schemes"
- "Help me find loans"

### Response Format

```
🎯 Scheme Sahayak Summary:

💡 Top Recommendations:
1. PM Vishwakarma Scheme
   - Eligibility: 85%
   - Benefit: ₹1,00,000 - ₹3,00,000
   - Apply soon. Deadline: Dec 31, 2024

2. Mudra Loan Scheme
   - Eligibility: 92%
   - Benefit: Up to ₹10,00,000
   - You can apply for this scheme now.

📋 Active Applications:
- PM Vishwakarma: under_review
  Current Stage: Document Verification
```

## 3. Buyer Connect Integration

### Features

- **Buyer Inquiries**: Manage incoming buyer inquiries
- **Buyer Profiles**: Access detailed buyer information
- **Buyer Matching**: Get suggestions for potential buyers
- **Response Templates**: AI-generated response drafts

### Usage

```typescript
import { buyerConnectIntegration } from '@/lib/services/artisan-buddy/BuyerConnectIntegration';

// Get inquiries
const inquiries = await buyerConnectIntegration.getBuyerInquiries('artisan_001');

// Get inquiry summary
const summary = await buyerConnectIntegration.getInquirySummary('artisan_001');

// Get buyer profile
const profile = await buyerConnectIntegration.getBuyerProfile('buyer_001');

// Get matching suggestions
const matches = await buyerConnectIntegration.getBuyerMatchingSuggestions('artisan_001', 5);

// Draft response
const template = await buyerConnectIntegration.draftResponseTemplate('inquiry_123');

// Get quick summary
const quickSummary = await buyerConnectIntegration.getQuickBuyerConnectSummary('artisan_001');
```

### Chatbot Integration

The chatbot handles queries like:
- "Show me my buyer inquiries"
- "Who are my potential buyers?"
- "Help me respond to this inquiry"
- "Find buyers for my products"
- "Check buyer messages"

### Response Format

```
🤝 Buyer Connect Summary:

📬 Inquiries:
- Total: 12
- New: 3
- Urgent: 1

⚠️ You have 3 new inquiries waiting for response!

📋 Recent Inquiries:
- Rajesh Hotel: bulk_order
  Status: new, Priority: high
- Priya Boutique: product
  Status: read, Priority: medium

💡 Potential Buyer Matches:
- Mumbai Handicrafts Store (85% match)
  Strong product category match
```

## Integration with Response Generator

All three integrations are automatically used by the Response Generator when relevant intents are detected:

```typescript
// In ResponseGenerator.ts
private async injectIntentContext(intent: Intent, context: ArtisanContext): Promise<string> {
  switch (intent.type) {
    case 'query_sales':
      const financialSummary = await digitalKhataIntegration.getQuickFinancialSummary(context.profile.id);
      intentStr += `\n**Digital Khata Financial Summary:**\n${financialSummary}\n`;
      break;
      
    case 'query_schemes':
      const schemeSummary = await schemeSahayakIntegration.getQuickSchemeSummary(context.profile.id);
      intentStr += `\n**Scheme Sahayak Summary:**\n${schemeSummary}\n`;
      break;
      
    case 'query_buyers':
      const buyerSummary = await buyerConnectIntegration.getQuickBuyerConnectSummary(context.profile.id);
      intentStr += `\n**Buyer Connect Summary:**\n${buyerSummary}\n`;
      break;
  }
}
```

## API Endpoints

### Digital Khata Endpoints

```bash
# Get financial summary
GET /api/artisan-buddy/digital-khata?artisanId=xxx&type=summary

# Get sales metrics
GET /api/artisan-buddy/digital-khata?artisanId=xxx&type=sales&period=month

# Get inventory status
GET /api/artisan-buddy/digital-khata?artisanId=xxx&type=inventory
```

### Scheme Sahayak Endpoints

```bash
# Get recommendations
GET /api/artisan-buddy/scheme-sahayak?artisanId=xxx&type=recommendations

# Check application status
GET /api/artisan-buddy/scheme-sahayak?artisanId=xxx&type=applications

# Check eligibility
GET /api/artisan-buddy/scheme-sahayak?artisanId=xxx&schemeId=yyy&type=eligibility
```

### Buyer Connect Endpoints

```bash
# Get inquiries
GET /api/artisan-buddy/buyer-connect?artisanId=xxx&type=inquiries

# Get buyer matches
GET /api/artisan-buddy/buyer-connect?artisanId=xxx&type=matches

# Draft response
POST /api/artisan-buddy/buyer-connect/response
{
  "inquiryId": "inquiry_123"
}
```

## Error Handling

All integration services include comprehensive error handling:

```typescript
try {
  const summary = await digitalKhataIntegration.getQuickFinancialSummary(artisanId);
  return summary;
} catch (error) {
  console.error('Failed to fetch Digital Khata summary:', error);
  return 'Unable to fetch financial summary at this time. Please try again later.';
}
```

## Performance Considerations

- **Caching**: All summaries are cached in Redis (1-hour TTL)
- **Lazy Loading**: Large datasets loaded on-demand
- **Batch Queries**: Multiple metrics fetched in parallel
- **Graceful Degradation**: Falls back to basic data if advanced features fail

## Testing

```typescript
// Test Digital Khata integration
import { digitalKhataIntegration } from '@/lib/services/artisan-buddy/DigitalKhataIntegration';

const summary = await digitalKhataIntegration.getQuickFinancialSummary('test_artisan_001');
console.log(summary);

// Test Scheme Sahayak integration
import { schemeSahayakIntegration } from '@/lib/services/artisan-buddy/SchemeSahayakIntegration';

const schemes = await schemeSahayakIntegration.getSchemeRecommendations('test_artisan_001', 3);
console.log(schemes);

// Test Buyer Connect integration
import { buyerConnectIntegration } from '@/lib/services/artisan-buddy/BuyerConnectIntegration';

const inquiries = await buyerConnectIntegration.getInquirySummary('test_artisan_001');
console.log(inquiries);
```

## Requirements Coverage

### Task 10: Integrate with Digital Khata
- ✅ Fetch sales metrics and analytics (Requirement 1.3, 7.1)
- ✅ Retrieve financial insights (Requirement 7.2)
- ✅ Add inventory status checking (Requirement 7.3)
- ✅ Create sales trend analysis (Requirement 7.4)

### Task 10.1: Integrate with Scheme Sahayak
- ✅ Fetch scheme recommendations (Requirement 7.5, 14.2)
- ✅ Check application status (Requirement 14.2)
- ✅ Provide scheme eligibility information (Requirement 7.5)
- ✅ Create scheme comparison (Requirement 14.2)

### Task 10.2: Integrate with Buyer Connect
- ✅ Fetch buyer inquiries (Requirement 14.3)
- ✅ Retrieve buyer profiles (Requirement 14.3)
- ✅ Create buyer matching suggestions (Requirement 14.3)
- ✅ Draft response templates (Requirement 14.3)

## Future Enhancements

- [ ] Real-time notifications for new inquiries
- [ ] Predictive analytics for sales forecasting
- [ ] Automated response suggestions using GPT
- [ ] Multi-language support for buyer communication
- [ ] Integration with payment gateways
- [ ] Advanced buyer behavior analytics
- [ ] Scheme application automation
- [ ] Document verification assistance

## Related Documentation

- [Digital Khata Integration Guide](./DIGITAL_KHATA_INTEGRATION_GUIDE.md)
- [Response Generator Usage](./RESPONSE_GENERATOR_USAGE.md)
- [Intent Classifier README](./INTENT_CLASSIFIER_README.md)
- [Artisan Buddy Integration Guide](./INTEGRATION_GUIDE.md)

---

**Status**: ✅ Fully Implemented
**Last Updated**: October 30, 2024
**Requirements Covered**: 1.3, 7.1, 7.2, 7.3, 7.4, 7.5, 14.2, 14.3
