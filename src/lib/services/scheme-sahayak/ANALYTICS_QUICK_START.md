# Analytics System - Quick Start Guide

## 🚀 Getting Started

### 1. Import the Service

```typescript
import { getAnalyticsService } from '@/lib/services/scheme-sahayak';

const analyticsService = getAnalyticsService();
```

### 2. Fetch Personal Analytics

```typescript
// Get analytics for an artisan
const analytics = await analyticsService.getPersonalAnalytics('artisan123');

console.log(`Success Rate: ${analytics.applicationSuccessRate}%`);
console.log(`Total Applications: ${analytics.totalApplications}`);
console.log(`Your Ranking: ${analytics.comparativeAnalytics.position}`);
```

### 3. Get Improvement Recommendations

```typescript
const recommendations = await analyticsService.generateImprovementRecommendations('artisan123');

console.log(`Overall Score: ${recommendations.overallScore}/100`);
recommendations.recommendations.forEach(rec => {
  console.log(`- ${rec.title} (${rec.priority})`);
});
```

### 4. Predict Scheme Opportunities

```typescript
const opportunities = await analyticsService.predictSchemeOpportunities('artisan123');

console.log(`Found ${opportunities.predictedOpportunities.length} opportunities`);
opportunities.predictedOpportunities.forEach(opp => {
  console.log(`- ${opp.schemeName}: ${(opp.confidence * 100).toFixed(0)}% confidence`);
});
```

### 5. Analyze Business Growth

```typescript
const growth = await analyticsService.analyzeBusinessGrowth('artisan123');

console.log(`Revenue Growth: ${growth.growthMetrics.revenueGrowth.percentageChange}%`);
console.log(`Position: ${growth.benchmarking.yourPosition}`);
```

## 🎨 Using React Components

### Analytics Dashboard

```tsx
import { AnalyticsDashboard } from '@/components/scheme-sahayak/AnalyticsDashboard';

function MyPage() {
  return <AnalyticsDashboard artisanId="artisan123" />;
}
```

### Improvement Recommendations

```tsx
import { ImprovementRecommendations } from '@/components/scheme-sahayak/ImprovementRecommendations';

function MyPage() {
  return <ImprovementRecommendations artisanId="artisan123" />;
}
```

### Scheme Opportunities

```tsx
import { SchemeOpportunities } from '@/components/scheme-sahayak/SchemeOpportunities';

function MyPage() {
  return <SchemeOpportunities artisanId="artisan123" />;
}
```

## 🌐 Using API Endpoints

### Fetch Personal Analytics

```javascript
const response = await fetch('/api/scheme-sahayak/analytics?artisanId=artisan123&type=personal');
const { data } = await response.json();
```

### Get Recommendations

```javascript
const response = await fetch('/api/scheme-sahayak/analytics?artisanId=artisan123&type=recommendations');
const { data } = await response.json();
```

### Get Opportunities

```javascript
const response = await fetch('/api/scheme-sahayak/analytics?artisanId=artisan123&type=opportunities');
const { data } = await response.json();
```

### Track User Action

```javascript
await fetch('/api/scheme-sahayak/analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    artisanId: 'artisan123',
    action: 'viewed_recommendations',
    metadata: { timestamp: new Date() }
  })
});
```

## 📊 Available Analytics Types

| Type | Description | Endpoint Parameter |
|------|-------------|-------------------|
| Personal Analytics | Success rates, trends, comparisons | `type=personal` |
| Recommendations | Monthly improvement suggestions | `type=recommendations` |
| Opportunities | Predicted scheme opportunities | `type=opportunities` |
| Growth Analysis | Business growth patterns | `type=growth` |
| Comparative | Compare with similar artisans | `type=comparative` |
| Success Factors | Identify success/failure factors | `type=success-factors` |

## 🎯 Key Metrics

### Personal Analytics
- `applicationSuccessRate`: Overall approval rate (0-100)
- `totalApplications`: Count of all applications
- `averageProcessingTime`: Days from submission to decision
- `comparativeAnalytics.percentile`: Your ranking (0-100)

### Recommendations
- `overallScore`: Performance score (0-100)
- `recommendations`: Array of prioritized actions
- `quickWins`: Easy high-impact improvements
- `longTermGoals`: Strategic objectives

### Opportunities
- `predictedOpportunities`: Schemes you should consider
- `upcomingDeadlines`: Schemes closing soon
- `seasonalTrends`: Historical patterns by month

### Growth Analysis
- `growthMetrics`: Revenue and employee trends
- `patterns`: Identified business patterns
- `projections`: Future revenue estimates
- `benchmarking`: Industry comparison

## 🔧 Common Use Cases

### 1. Display Artisan Dashboard

```tsx
function ArtisanDashboard({ artisanId }: { artisanId: string }) {
  return (
    <div className="space-y-6">
      <AnalyticsDashboard artisanId={artisanId} />
      <ImprovementRecommendations artisanId={artisanId} />
      <SchemeOpportunities artisanId={artisanId} />
    </div>
  );
}
```

### 2. Show Quick Stats

```tsx
function QuickStats({ artisanId }: { artisanId: string }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetch(`/api/scheme-sahayak/analytics?artisanId=${artisanId}&type=personal`)
      .then(res => res.json())
      .then(data => setAnalytics(data.data));
  }, [artisanId]);

  if (!analytics) return <div>Loading...</div>;

  return (
    <div>
      <h3>Success Rate: {analytics.applicationSuccessRate.toFixed(1)}%</h3>
      <p>Total Applications: {analytics.totalApplications}</p>
      <p>Ranking: {analytics.comparativeAnalytics.position}</p>
    </div>
  );
}
```

### 3. Generate Monthly Report

```typescript
async function generateMonthlyReport(artisanId: string) {
  const [analytics, recommendations, opportunities] = await Promise.all([
    analyticsService.getPersonalAnalytics(artisanId),
    analyticsService.generateImprovementRecommendations(artisanId),
    analyticsService.predictSchemeOpportunities(artisanId)
  ]);

  return {
    summary: {
      successRate: analytics.applicationSuccessRate,
      totalApplications: analytics.totalApplications,
      ranking: analytics.comparativeAnalytics.position
    },
    recommendations: recommendations.recommendations.slice(0, 5),
    opportunities: opportunities.predictedOpportunities.slice(0, 3)
  };
}
```

## 🐛 Troubleshooting

### No Data Available
- Ensure artisan has submitted applications
- Check if artisanId exists in database
- Verify Firestore permissions

### Slow Performance
- Implement caching for frequently accessed data
- Use pagination for large result sets
- Consider pre-computing metrics

### Incorrect Calculations
- Verify application data is complete
- Check date formats in Firestore
- Ensure status values are correct

## 📚 Additional Resources

- [Full Documentation](./ANALYTICS_SYSTEM.md)
- [Implementation Summary](./ANALYTICS_IMPLEMENTATION_SUMMARY.md)
- [Demo Page](/scheme-sahayak/analytics)

## 💡 Tips

1. **Cache Results**: Analytics data doesn't change frequently, cache for 15-60 minutes
2. **Progressive Loading**: Load dashboard first, then recommendations and opportunities
3. **Error Handling**: Always handle errors gracefully with user-friendly messages
4. **Mobile Optimization**: Ensure components are responsive and touch-friendly
5. **Accessibility**: Use semantic HTML and ARIA labels for screen readers

## 🎉 You're Ready!

Start using the analytics system to provide valuable insights to your artisans. For more details, check the full documentation.
