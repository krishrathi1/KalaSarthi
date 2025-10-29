# Analytics and Insights System

## Overview

The Analytics and Insights System provides comprehensive analytics, comparative metrics, and personalized recommendations for artisans using the Scheme Sahayak platform. This system fulfills Requirements 8.1-8.5 from the requirements document.

## Features

### 1. Personal Analytics Dashboard (Requirement 8.1)

Track and display personal application success rate over time with:

- **Application Success Rate**: Overall approval rate with trend analysis
- **Total Applications**: Count of all applications (approved, rejected, pending)
- **Average Processing Time**: Time from submission to decision
- **Monthly Trends**: Historical data showing applications and approvals by month
- **Top Categories**: Most applied scheme categories with success rates

**API Endpoint**: `GET /api/scheme-sahayak/analytics?artisanId={id}&type=personal`

**Component**: `AnalyticsDashboard`

### 2. Comparative Analytics (Requirement 8.2)

Compare performance with similar artisan profiles:

- **Similarity Matching**: Find artisans with same business type and location
- **Percentile Ranking**: Your position among similar artisans
- **Performance Comparison**: Compare applications, processing time, and approval rates
- **Benchmarking**: Against average and top 10% performers

**API Endpoint**: `GET /api/scheme-sahayak/analytics?artisanId={id}&type=comparative`

**Component**: Part of `AnalyticsDashboard`

### 3. Success Factor Identification (Requirement 8.3)

Identify factors contributing to application success or failure:

- **Positive Factors**: What's working well (e.g., complete documentation, timely submission)
- **Negative Factors**: Areas for improvement (e.g., missing documents, late submissions)
- **Impact Analysis**: High/medium/low impact classification
- **Correlation Scores**: Statistical correlation with success
- **Actionable Recommendations**: Specific steps to improve

**API Endpoint**: `GET /api/scheme-sahayak/analytics?artisanId={id}&type=success-factors`

**Component**: Part of `AnalyticsDashboard`

### 4. Improvement Recommendations (Requirement 8.4)

Generate personalized monthly improvement recommendations:

- **Overall Performance Score**: 0-100 score based on success rate and percentile
- **Prioritized Recommendations**: High/medium/low priority actions
- **Category-based**: Documentation, profile, timing, scheme selection, application quality
- **Expected Impact**: Potential success rate increase for each recommendation
- **Action Steps**: Detailed steps to implement each recommendation
- **Quick Wins**: Easy improvements with high impact
- **Long-term Goals**: Strategic objectives for sustained success

**API Endpoint**: `GET /api/scheme-sahayak/analytics?artisanId={id}&type=recommendations`

**Component**: `ImprovementRecommendations`

### 5. Scheme Opportunity Prediction (Requirement 8.5)

Predict future scheme opportunities based on business growth patterns:

- **Predicted Opportunities**: Schemes you haven't applied to yet with high match scores
- **Eligibility Probability**: Likelihood of meeting eligibility criteria
- **Success Probability**: Predicted approval chance based on historical data
- **Preparation Requirements**: What you need to do before applying
- **Upcoming Deadlines**: Schemes with deadlines in the next 30 days
- **Readiness Score**: How prepared you are for each deadline
- **Seasonal Trends**: Historical patterns of scheme availability by month

**API Endpoint**: `GET /api/scheme-sahayak/analytics?artisanId={id}&type=opportunities`

**Component**: `SchemeOpportunities`

### 6. Business Growth Analysis (Requirement 8.5)

Analyze business growth patterns and projections:

- **Growth Metrics**: Revenue and employee growth trends
- **Scheme Utilization**: How effectively you're using government schemes
- **Pattern Identification**: Consistent growth, active participation, etc.
- **Projections**: Next quarter and next year revenue estimates
- **Benchmarking**: Compare against industry averages
- **Strategic Recommendations**: Long-term growth strategies

**API Endpoint**: `GET /api/scheme-sahayak/analytics?artisanId={id}&type=growth`

## Architecture

### Service Layer

**AnalyticsService** (`src/lib/services/scheme-sahayak/AnalyticsService.ts`)

Main service implementing `IAnalyticsService` interface with methods:

- `getPersonalAnalytics(artisanId, period?)`: Get comprehensive personal analytics
- `calculateComparativeAnalytics(artisanId)`: Compare with similar profiles
- `identifySuccessFactors(artisanId)`: Analyze success and failure factors
- `generateImprovementRecommendations(artisanId)`: Create monthly recommendations
- `predictSchemeOpportunities(artisanId)`: Predict future opportunities
- `analyzeBusinessGrowth(artisanId)`: Analyze growth patterns
- `trackUserAction(artisanId, action, metadata?)`: Track user actions

### API Layer

**Analytics API Route** (`src/app/api/scheme-sahayak/analytics/route.ts`)

RESTful API endpoints:

- `GET /api/scheme-sahayak/analytics?artisanId={id}&type={type}`: Fetch analytics
- `POST /api/scheme-sahayak/analytics`: Track user actions

Supported types:
- `personal`: Personal analytics dashboard
- `recommendations`: Improvement recommendations
- `opportunities`: Scheme opportunities
- `growth`: Business growth analysis
- `comparative`: Comparative analytics
- `success-factors`: Success factor identification

### Component Layer

**React Components** (`src/components/scheme-sahayak/`)

1. **AnalyticsDashboard**: Main analytics dashboard with overview cards, trends, comparisons
2. **ImprovementRecommendations**: Display personalized recommendations with action steps
3. **SchemeOpportunities**: Show predicted opportunities and upcoming deadlines

## Data Models

### PersonalAnalytics

```typescript
interface PersonalAnalytics {
  artisanId: string;
  period: { start: Date; end: Date };
  applicationSuccessRate: number;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  averageProcessingTime: number;
  topCategories: Array<{
    category: string;
    count: number;
    successRate: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    year: number;
    applications: number;
    approvals: number;
    rejections: number;
    successRate: number;
  }>;
  comparativeAnalytics: ComparativeAnalytics;
  successFactors: SuccessFactors;
  lastUpdated: Date;
}
```

### ImprovementRecommendations

```typescript
interface ImprovementRecommendations {
  artisanId: string;
  generatedAt: Date;
  period: 'monthly' | 'quarterly' | 'yearly';
  overallScore: number;
  recommendations: Array<{
    id: string;
    category: 'documentation' | 'profile' | 'timing' | 'scheme_selection' | 'application_quality';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: string;
    actionSteps: string[];
    estimatedTimeToImplement: number;
    potentialSuccessRateIncrease: number;
  }>;
  quickWins: string[];
  longTermGoals: string[];
}
```

### SchemeOpportunityPrediction

```typescript
interface SchemeOpportunityPrediction {
  artisanId: string;
  predictedOpportunities: Array<{
    schemeId: string;
    schemeName: string;
    category: string;
    predictedAvailability: Date;
    eligibilityProbability: number;
    successProbability: number;
    estimatedBenefit: {
      min: number;
      max: number;
      currency: string;
    };
    preparationRequired: string[];
    timeToPrep: number;
    confidence: number;
    reasoning: string;
  }>;
  upcomingDeadlines: Array<{
    schemeId: string;
    schemeName: string;
    deadline: Date;
    daysRemaining: number;
    readinessScore: number;
    missingRequirements: string[];
  }>;
  seasonalTrends: Array<{
    month: string;
    typicalSchemeCount: number;
    categories: string[];
    historicalSuccessRate: number;
  }>;
}
```

## Usage Examples

### Fetch Personal Analytics

```typescript
import { getAnalyticsService } from '@/lib/services/scheme-sahayak';

const analyticsService = getAnalyticsService();

// Get analytics for last 12 months
const analytics = await analyticsService.getPersonalAnalytics('artisan123');

// Get analytics for specific period
const customAnalytics = await analyticsService.getPersonalAnalytics('artisan123', {
  start: new Date('2024-01-01'),
  end: new Date('2024-12-31')
});
```

### Generate Recommendations

```typescript
const recommendations = await analyticsService.generateImprovementRecommendations('artisan123');

console.log(`Overall Score: ${recommendations.overallScore}/100`);
console.log(`Quick Wins: ${recommendations.quickWins.join(', ')}`);
```

### Predict Opportunities

```typescript
const opportunities = await analyticsService.predictSchemeOpportunities('artisan123');

console.log(`Found ${opportunities.predictedOpportunities.length} opportunities`);
console.log(`Upcoming deadlines: ${opportunities.upcomingDeadlines.length}`);
```

### Use in React Components

```tsx
import { AnalyticsDashboard } from '@/components/scheme-sahayak/AnalyticsDashboard';
import { ImprovementRecommendations } from '@/components/scheme-sahayak/ImprovementRecommendations';
import { SchemeOpportunities } from '@/components/scheme-sahayak/SchemeOpportunities';

function ArtisanDashboard({ artisanId }: { artisanId: string }) {
  return (
    <div>
      <AnalyticsDashboard artisanId={artisanId} />
      <ImprovementRecommendations artisanId={artisanId} />
      <SchemeOpportunities artisanId={artisanId} />
    </div>
  );
}
```

## Performance Considerations

### Caching Strategy

- Personal analytics: Cache for 15 minutes
- Recommendations: Cache for 1 day (regenerate monthly)
- Opportunities: Cache for 1 hour
- Comparative analytics: Cache for 1 hour

### Query Optimization

- Use Firestore composite indexes for complex queries
- Limit similar artisan queries to 100 profiles
- Paginate large result sets
- Use batch reads where possible

### Computation Optimization

- Calculate metrics incrementally
- Pre-compute common aggregations
- Use background jobs for heavy computations
- Implement progressive loading for UI

## Future Enhancements

1. **Machine Learning Integration**
   - Train ML models on historical data for better predictions
   - Personalized success probability models
   - Anomaly detection for unusual patterns

2. **Real-time Analytics**
   - WebSocket connections for live updates
   - Real-time dashboard updates
   - Instant notification on metric changes

3. **Advanced Visualizations**
   - Interactive charts and graphs
   - Trend analysis with forecasting
   - Heatmaps for seasonal patterns

4. **Export and Reporting**
   - PDF report generation
   - Excel export for detailed analysis
   - Scheduled email reports

5. **Collaborative Features**
   - Share insights with mentors
   - Community benchmarking
   - Success story sharing

## Testing

Run tests for the analytics system:

```bash
npm test -- AnalyticsService.test.ts
```

## Support

For issues or questions about the analytics system:
- Check the main documentation
- Review the API route implementation
- Examine component examples
- Contact the development team

## License

Part of the AI-Powered Scheme Sahayak v2.0 system.
