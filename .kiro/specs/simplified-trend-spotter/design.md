# Design Document

## Overview

The Simplified Trend Spotter is a consolidated, artisan-friendly application that combines the best features from existing trend analysis tools while maintaining simplicity and ease of use. The design focuses on a clean, single-page interface that displays trending products with direct links, market insights, and offline capability through comprehensive mock data fallback.

## Architecture

### Component Structure
```
SimplifiedTrendSpotter (Main Component)
├── TrendHeader (Status & Title)
├── ProfessionSelector (Simple dropdown)
├── TrendGrid (Product display)
│   └── TrendCard (Individual product)
│       ├── ProductImage
│       ├── ProductInfo
│       └── ActionButtons
└── MarketInsights (AI-generated recommendations)
```

### Data Flow
1. **Initialization**: Load user profession from auth context or localStorage
2. **Data Fetching**: Attempt API calls with automatic fallback to mock data
3. **Display**: Render trending products in responsive grid layout
4. **Interaction**: Handle product clicks and external link navigation

## Components and Interfaces

### Main Component: SimplifiedTrendSpotter
- **Purpose**: Orchestrates the entire trend spotter experience
- **State Management**: 
  - `trendingProducts`: Array of trending product data
  - `userProfession`: Current artisan's craft specialty
  - `isOnline`: Connectivity status
  - `loading`: Data loading state
  - `marketInsights`: AI-generated recommendations

### TrendHeader Component
- **Purpose**: Display connectivity status and last update time
- **Features**:
  - Online/offline indicator with appropriate icons
  - Last updated timestamp
  - Simple, clear title with profession context

### ProfessionSelector Component
- **Purpose**: Allow artisans to select or change their craft specialty
- **Features**:
  - Dropdown with common artisan professions
  - Auto-selection from user profile
  - Immediate trend refresh on change

### TrendGrid Component
- **Purpose**: Display trending products in responsive grid
- **Layout**:
  - 1 column on mobile
  - 2-3 columns on tablet
  - 3-4 columns on desktop
  - Large, touch-friendly cards

### TrendCard Component
- **Purpose**: Individual product display with all essential information
- **Elements**:
  - Product image (80x80px minimum)
  - Product title (truncated to 2 lines)
  - Price in ₹ with proper formatting
  - Star rating and review count
  - Platform badge (Amazon, Flipkart, etc.)
  - "View Product" button with external link icon
  - Trending indicator (Hot, Rising, etc.)

### MarketInsights Component
- **Purpose**: Display AI-generated market analysis and recommendations
- **Features**:
  - Simple, conversational language
  - Actionable recommendations for artisan's craft
  - Market opportunity highlights
  - Trend explanations in layman's terms

## Data Models

### TrendingProduct Interface
```typescript
interface TrendingProduct {
  id: string;
  title: string;
  price: string | number;
  rating: number;
  reviewCount: number;
  platform: string;
  url: string;
  imageUrl: string;
  category: string;
  trendType: 'hot' | 'rising' | 'seasonal' | 'stable';
  trendScore: number;
  trendingReason?: string;
  isRealTime: boolean;
}
```

### MarketInsight Interface
```typescript
interface MarketInsight {
  category: string;
  opportunity: string;
  recommendation: string;
  confidence: number;
  actionItems: string[];
}
```

### ConnectivityStatus Interface
```typescript
interface ConnectivityStatus {
  isOnline: boolean;
  lastUpdated: Date;
  dataSource: 'api' | 'mock';
}
```

## Error Handling

### API Failure Strategy
1. **Primary**: Attempt to fetch from trend APIs
2. **Fallback**: Use comprehensive mock data system
3. **User Feedback**: Clear indication of data source (live vs cached)
4. **Retry Logic**: Automatic retry on connectivity restoration

### Image Loading
- **Fallback Images**: Use placeholder icons for failed product images
- **Lazy Loading**: Implement for better performance
- **Error States**: Graceful degradation with product icons

### Network Connectivity
- **Detection**: Monitor online/offline status
- **Caching**: Store recent data for offline access
- **Sync**: Update when connectivity returns
- **User Notification**: Clear status indicators

## Testing Strategy

### Unit Testing Focus
- Mock data generation and fallback logic
- Product card rendering with various data states
- Connectivity status detection and handling
- Price formatting and display logic

### Integration Testing
- API integration with fallback behavior
- User profession selection and data filtering
- External link navigation functionality
- Responsive layout across device sizes

### User Experience Testing
- Loading states and performance
- Touch interactions on mobile devices
- Accessibility with screen readers (preparing for voice)
- Error state handling and recovery

## Performance Considerations

### Data Loading
- **Lazy Loading**: Images and non-critical content
- **Caching**: Store API responses and mock data
- **Debouncing**: Profession selection changes
- **Pagination**: Limit initial product display

### Responsive Design
- **Mobile First**: Optimize for mobile artisan users
- **Touch Targets**: Minimum 44px for buttons
- **Font Sizes**: Large, readable text throughout
- **Contrast**: High contrast for outdoor usage

### Voice Preparation
- **Semantic HTML**: Proper heading structure
- **ARIA Labels**: Comprehensive accessibility
- **Logical Flow**: Sequential navigation order
- **Simple Language**: Conversational, non-technical terms

## Integration Points

### Authentication System
- **User Profile**: Access artisan profession and preferences
- **Fallback**: localStorage for non-authenticated users
- **Sync**: Update preferences when user logs in

### Mock Data System
- **Comprehensive Coverage**: All artisan categories
- **Realistic Data**: Actual product-like information
- **Regular Updates**: Refresh mock data periodically
- **Consistency**: Maintain data quality and relevance

### External APIs
- **Trend APIs**: Existing trending and viral product endpoints
- **Scraping APIs**: Product data from multiple platforms
- **Fallback Strategy**: Seamless transition to mock data
- **Rate Limiting**: Respect API limits and quotas

## Future Voice Integration Preparation

### Interface Design
- **Clear Sections**: Named areas for voice navigation
- **Simple Commands**: "Show trending pottery", "Open first product"
- **Confirmation**: Voice feedback for actions
- **Error Handling**: Voice-friendly error messages

### Content Structure
- **Hierarchical**: Logical content organization
- **Descriptive**: Rich alt text and descriptions
- **Actionable**: Clear next steps and options
- **Conversational**: Natural language throughout