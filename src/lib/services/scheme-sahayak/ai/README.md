# AI Recommendation Engine - Profile Analysis & Feature Extraction

## Overview

This module implements the profile analysis and feature extraction components for the AI-Powered Scheme Sahayak recommendation engine. It extracts 50+ features from artisan profiles, engineers them for ML model consumption, and ensures data quality through comprehensive preprocessing.

## Components

### 1. ProfileAnalyzer

**Purpose**: Extracts comprehensive features from artisan profiles for ML model input.

**Key Features**:
- Extracts 50+ features across 5 categories:
  - Demographic features (10): age, gender, education, location, etc.
  - Business features (15): business age, size, income, type, growth potential, etc.
  - Financial features (8): income stability, creditworthiness, debt ratios, etc.
  - Digital & Social features (7): digital literacy, network strength, document readiness, etc.
  - Behavioral features (10): risk tolerance, proactiveness, learning orientation, etc.

- All features normalized to [0, 1] range
- Feature importance calculation with configurable weights
- Consistent feature ordering for ML model input

**Usage**:
```typescript
import { ProfileAnalyzer } from '@/lib/services/scheme-sahayak/ai';

const analyzer = new ProfileAnalyzer();
const features = await analyzer.extractFeatures(artisanProfile);
const featureArray = analyzer.preprocessFeatures(features);
const importance = analyzer.calculateFeatureImportance(features);
```

### 2. FeatureEngineeringPipeline

**Purpose**: Transforms extracted features into engineered features optimized for ML models.

**Key Features**:
- Generates multiple feature types:
  - Profile features: Base features from artisan profile
  - Scheme compatibility features: Eligibility and alignment scores
  - Interaction features: Cross-product features between profile and scheme
  - Temporal features: Time-based patterns and trends
  - Contextual features: External factors (economic, market, technology)

- Feature caching for performance (1-hour TTL)
- Multiple scaling methods: MinMax, Standard (Z-score), Robust
- Feature statistics tracking for normalization
- Feature importance and naming for interpretability

**Usage**:
```typescript
import { FeatureEngineeringPipeline } from '@/lib/services/scheme-sahayak/ai';

const pipeline = new FeatureEngineeringPipeline({
  scalingMethod: 'minmax',
  interactionDepth: 2
});

const engineered = await pipeline.engineerFeatures(
  artisanProfile,
  allSchemes,
  targetScheme
);

// Update statistics periodically
await pipeline.updateStatistics(profiles, schemes);
```

### 3. DataPreprocessor

**Purpose**: Ensures data quality through cleaning, validation, and preprocessing.

**Key Features**:
- Data cleaning:
  - Phone number normalization
  - Email standardization
  - Text field trimming and case normalization
  - Numeric field validation

- Data validation:
  - Schema validation
  - Range validation
  - Format validation (phone, email, pincode)
  - Consistency checks

- Data quality assessment:
  - Completeness scoring
  - Consistency scoring
  - Accuracy scoring
  - Validity scoring
  - Timeliness scoring
  - Overall quality score with detailed issues

- Missing value handling:
  - Default value imputation
  - Forward fill
  - Median/mean imputation

- Outlier handling:
  - Clipping
  - Removal
  - Transformation

**Usage**:
```typescript
import { DataPreprocessor } from '@/lib/services/scheme-sahayak/ai';

const preprocessor = new DataPreprocessor({
  handleMissingValues: 'median',
  handleOutliers: 'clip',
  validateSchema: true
});

// Preprocess single profile
const cleaned = await preprocessor.preprocessProfile(profile);

// Assess data quality
const quality = await preprocessor.assessDataQuality(profile);
console.log(`Quality Score: ${quality.overallScore}`);
console.log(`Issues: ${quality.issues.length}`);

// Batch processing
const cleanedProfiles = await preprocessor.batchPreprocessProfiles(profiles);
```

## Feature Categories

### Demographic Features (10)
- Age (normalized)
- Gender (encoded)
- Education level (estimated)
- Marital status (estimated)
- Family size (normalized)
- Dependents (normalized)
- Location tier (rural/urban)
- State economic index
- District development index
- Population density

### Business Features (15)
- Business age (years)
- Business size (employees)
- Monthly income (normalized)
- Business type (encoded)
- Business category (encoded)
- Business sub-category (encoded)
- Has registration (binary)
- Experience years (normalized)
- Seasonality factor
- Growth potential
- Market reach
- Technology adoption
- Competition level
- Supply chain integration
- Export potential

### Financial Features (8)
- Income stability
- Creditworthiness (estimated)
- Asset base (estimated)
- Debt-to-income ratio
- Savings rate (estimated)
- Financial literacy (estimated)
- Banking relationship
- Previous loan history

### Digital & Social Features (7)
- Digital literacy
- Social media presence
- Network strength
- Community involvement
- Government interaction history
- Document readiness
- Application history success rate

### Behavioral Features (10)
- Risk tolerance (from preferences)
- Time horizon (from preferences)
- Proactiveness (estimated)
- Learning orientation
- Innovation index
- Collaboration score
- Persistence level
- Adaptability score
- Communication skills (estimated)
- Leadership potential (estimated)

## Data Quality Metrics

The DataPreprocessor assesses data quality across 5 dimensions:

1. **Completeness** (0-1): Percentage of required fields populated
2. **Consistency** (0-1): Logical consistency between related fields
3. **Accuracy** (0-1): Format and pattern validation
4. **Validity** (0-1): Value range and type validation
5. **Timeliness** (0-1): Recency of data updates

Each dimension generates specific issues with:
- Field name
- Issue type (missing, invalid, inconsistent, outdated, outlier)
- Severity (low, medium, high, critical)
- Description
- Suggested fix (when applicable)

## Performance Considerations

### Caching
- Feature engineering results cached for 1 hour
- Data quality metrics cached for 1 hour
- Cache can be cleared manually when needed

### Batch Processing
- Use batch methods for processing multiple profiles
- Handles errors gracefully without stopping entire batch
- Configurable error handling (keep or remove invalid records)

### Feature Statistics
- Update statistics periodically (e.g., weekly)
- Uses sample of up to 1000 profiles for performance
- Statistics used for normalization and scaling

## Testing

Comprehensive test suite with 42 tests covering:
- Feature extraction accuracy
- Feature normalization
- Data cleaning and validation
- Quality assessment
- Edge cases and error handling
- Batch processing
- Caching behavior

Run tests:
```bash
npm test -- src/__tests__/services/scheme-sahayak/ai --no-watch
```

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **Requirement 1.1**: AI-powered scheme recommendations with 50+ data points
- **Requirement 1.2**: Profile analysis for scheme matching
- Feature extraction from comprehensive artisan profiles
- Data preprocessing and normalization
- Feature engineering pipeline for ML models
- Data quality assessment and validation

## Next Steps

The next tasks in the AI Recommendation Engine implementation are:

1. **Task 4.2**: Create ML-powered scheme matching system
   - Implement hybrid recommendation algorithm
   - Build Scheme Matcher with compatibility scoring
   - Create Success Predictor for application probability

2. **Task 4.3**: Build recommendation ranking and personalization
   - Implement Recommendation Ranker with urgency scoring
   - Create personalized explanation generation
   - Add confidence interval calculations

## Integration Example

```typescript
import { 
  ProfileAnalyzer, 
  FeatureEngineeringPipeline, 
  DataPreprocessor 
} from '@/lib/services/scheme-sahayak/ai';

// Initialize components
const preprocessor = new DataPreprocessor();
const analyzer = new ProfileAnalyzer();
const pipeline = new FeatureEngineeringPipeline();

// Process artisan profile
async function processArtisanForRecommendations(
  profile: ArtisanProfile,
  schemes: GovernmentScheme[]
) {
  // 1. Clean and validate data
  const cleanedProfile = await preprocessor.preprocessProfile(profile);
  
  // 2. Assess data quality
  const quality = await preprocessor.assessDataQuality(cleanedProfile);
  if (quality.overallScore < 0.6) {
    console.warn('Low data quality:', quality.issues);
  }
  
  // 3. Extract features
  const features = await analyzer.extractFeatures(cleanedProfile);
  
  // 4. Engineer features for ML
  const engineered = await pipeline.engineerFeatures(
    cleanedProfile,
    schemes
  );
  
  // 5. Use engineered features for ML model prediction
  // (To be implemented in Task 4.2)
  
  return {
    features,
    engineered,
    quality
  };
}
```

## Configuration

### ProfileAnalyzer Configuration
- Feature weights (configurable per feature)
- Normalization ranges
- Categorical mappings

### FeatureEngineeringPipeline Configuration
- Scaling method: 'minmax' | 'standard' | 'robust'
- Encoding method: 'onehot' | 'label' | 'target'
- Interaction depth: 1-3
- Temporal window: days
- Contextual factors: array of factor names

### DataPreprocessor Configuration
- Handle missing values: 'drop' | 'mean' | 'median' | 'mode' | 'forward_fill' | 'zero'
- Handle outliers: 'clip' | 'remove' | 'transform' | 'keep'
- Outlier threshold: standard deviations (default: 3)
- Normalization method: 'minmax' | 'zscore' | 'robust' | 'none'
- Validate schema: boolean
- Enforce data types: boolean
- Remove invalid records: boolean

## License

Part of the AI-Powered Scheme Sahayak v2.0 system.
