# Artisan Buddy Knowledge Base

## Overview

The Knowledge Base service provides curated information about Indian arts and crafts, including craft techniques, materials, market insights, and pricing guidance. It uses vector embeddings and semantic search to deliver contextually relevant information to artisans.

## Architecture

### Components

1. **VectorStore**: Manages vector embeddings and semantic search
2. **KnowledgeBaseService**: High-level API for accessing knowledge
3. **RAGPipelineService**: Retrieval-Augmented Generation for context-aware responses
4. **KnowledgeBaseSeeder**: Populates the knowledge base with curated data

### Data Flow

```
User Query → RAG Pipeline → Vector Search → Retrieve Documents → Generate Response
                ↓
         Knowledge Base
                ↓
         Vector Store (Firestore)
```

## Features

### 1. Vector Embeddings

- Uses Google Gemini `embedding-001` model
- 768-dimensional embeddings
- Automatic embedding generation on document storage
- Fallback mechanism for rate limiting

### 2. Semantic Search

- Cosine similarity-based search
- Configurable relevance threshold
- Category and craft-type filtering
- Multi-language support

### 3. Knowledge Categories

- **craft_info**: General information about crafts
- **technique**: Step-by-step technique guides
- **material**: Material information and sourcing
- **market_insights**: Market trends and pricing
- **pricing**: Pricing guidance and formulas

### 4. RAG Pipeline

- Context-aware response generation
- Artisan profile integration
- Conversation history awareness
- Source attribution
- Confidence scoring

## Usage

### Basic Search

```typescript
import { KnowledgeBaseService } from '@/lib/services/artisan-buddy';

const knowledgeBase = KnowledgeBaseService.getInstance();

// Search for pottery information
const results = await knowledgeBase.search('pottery techniques', {
  category: 'technique',
  craftType: 'pottery',
  language: 'en'
});

console.log(results);
```

### Get Craft Information

```typescript
const craftInfo = await knowledgeBase.getCraftInfo('pottery');
console.log(craftInfo.history);
console.log(craftInfo.techniques);
console.log(craftInfo.materials);
```

### Get Market Insights

```typescript
const insights = await knowledgeBase.getMarketInsights('weaving');
console.log(insights.demand);
console.log(insights.averagePrice);
console.log(insights.topBuyerRegions);
```

### RAG-based Response Generation

```typescript
import { RAGPipelineService } from '@/lib/services/artisan-buddy';

const ragPipeline = RAGPipelineService.getInstance();

const response = await ragPipeline.generateWithContext({
  query: 'How can I improve my pottery glazing technique?',
  context: {
    userId: 'user123',
    name: 'Ramesh Kumar',
    profession: 'Potter',
    specializations: ['terracotta', 'blue pottery'],
    location: 'Jaipur, Rajasthan'
  },
  conversationHistory: previousMessages,
  filters: {
    category: 'technique',
    craftType: 'pottery'
  }
});

console.log(response.response);
console.log(response.sources);
console.log(response.confidence);
```

## Seeding the Knowledge Base

### Using the Script

```bash
# Seed all knowledge data
node scripts/seed-knowledge-base.js seed

# Clear all data
node scripts/seed-knowledge-base.js clear

# Update (clear and re-seed)
node scripts/seed-knowledge-base.js update

# Verify integrity
node scripts/seed-knowledge-base.js verify

# Seed specific category
node scripts/seed-knowledge-base.js seed-category craft_info

# Seed specific craft type
node scripts/seed-knowledge-base.js seed-craft pottery
```

### Programmatic Seeding

```typescript
import { KnowledgeBaseSeeder } from '@/lib/services/artisan-buddy';

const seeder = new KnowledgeBaseSeeder();

// Seed all data
await seeder.seedAll();

// Seed specific category
await seeder.seedCategory('technique');

// Verify
const verification = await seeder.verify();
console.log(verification.isValid);
```

## Adding New Knowledge

### 1. Create Knowledge Document

```typescript
import { KnowledgeDocument } from '@/lib/services/artisan-buddy';

const newDocument: Omit<KnowledgeDocument, 'id' | 'embedding' | 'createdAt' | 'updatedAt'> = {
  content: `Your detailed content here...`,
  metadata: {
    category: 'technique',
    craftType: 'pottery',
    language: 'en',
    source: 'Expert Interview',
    region: 'Rajasthan',
    tags: ['pottery', 'glazing', 'technique'],
    lastUpdated: new Date()
  }
};
```

### 2. Add to Data File

Add your document to `src/lib/services/artisan-buddy/data/crafts-knowledge.ts`:

```typescript
export const craftsKnowledge = [
  // ... existing documents
  newDocument
];
```

### 3. Re-seed the Database

```bash
node scripts/seed-knowledge-base.js update
```

## Multilingual Support

The knowledge base supports multiple languages. Currently includes:

- English (en)
- Hindi (hi)

### Adding Content in Other Languages

```typescript
{
  content: `தமிழ் மொழியில் உள்ளடக்கம்...`,
  metadata: {
    category: 'craft_info',
    craftType: 'pottery',
    language: 'ta', // Tamil
    source: 'Traditional Knowledge',
    region: 'Tamil Nadu',
    tags: ['pottery', 'tamil'],
    lastUpdated: new Date()
  }
}
```

## Performance Considerations

### Caching

- Vector embeddings are cached in Firestore
- Search results can be cached in Redis
- Embedding generation has rate limit fallback

### Optimization Tips

1. **Batch Operations**: Use `batchStoreDocuments` for multiple documents
2. **Filtering**: Apply filters to reduce search space
3. **Relevance Threshold**: Set appropriate threshold to limit results
4. **Embedding Reuse**: Don't regenerate embeddings unnecessarily

### Rate Limits

- Gemini API: 60 requests per minute (free tier)
- Add delays between batch operations
- Implement exponential backoff for retries

## Data Structure

### Knowledge Document Schema

```typescript
interface KnowledgeDocument {
  id: string;                    // Auto-generated
  content: string;               // Main content
  embedding?: number[];          // 768-dim vector
  metadata: {
    category: KnowledgeCategory; // craft_info, technique, etc.
    craftType?: string;          // pottery, weaving, etc.
    language: string;            // en, hi, ta, etc.
    source: string;              // Source attribution
    region?: string;             // Geographic region
    tags?: string[];             // Searchable tags
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Best Practices

### Content Guidelines

1. **Be Specific**: Include detailed, actionable information
2. **Structure Well**: Use clear sections and formatting
3. **Cite Sources**: Always attribute information sources
4. **Update Regularly**: Keep market insights current
5. **Multilingual**: Provide content in multiple languages

### Search Optimization

1. **Use Filters**: Narrow search with category and craft type
2. **Set Thresholds**: Adjust relevance threshold based on use case
3. **Limit Results**: Request only needed number of results
4. **Cache Results**: Cache frequently accessed information

### RAG Pipeline

1. **Provide Context**: Include artisan profile for personalization
2. **Include History**: Add conversation history for coherence
3. **Filter Relevantly**: Use appropriate filters for query type
4. **Handle Errors**: Implement fallbacks for service failures

## Monitoring

### Statistics

```typescript
const stats = await vectorStore.getStatistics();
console.log(stats.totalDocuments);
console.log(stats.documentsByCategory);
console.log(stats.documentsByCraftType);
```

### Verification

```typescript
const verification = await seeder.verify();
if (!verification.isValid) {
  console.log('Issues:', verification.issues);
}
```

## Troubleshooting

### Common Issues

1. **Rate Limit Errors**
   - Solution: Add delays between requests, use fallback embeddings

2. **Low Relevance Scores**
   - Solution: Improve content quality, adjust threshold, add more context

3. **Missing Documents**
   - Solution: Run verification, re-seed if needed

4. **Slow Search**
   - Solution: Add filters, reduce result count, implement caching

## Future Enhancements

1. **Advanced Search**: Faceted search, filters, sorting
2. **User Feedback**: Learn from user interactions
3. **Auto-Updates**: Automatic content updates from trusted sources
4. **Image Support**: Store and search craft images
5. **Video Tutorials**: Link to video demonstrations
6. **Community Content**: Allow artisans to contribute knowledge
7. **Recommendation Engine**: Suggest relevant content proactively

## References

- [Google Gemini API](https://ai.google.dev/docs)
- [Vector Embeddings Guide](https://developers.google.com/machine-learning/crash-course/embeddings/video-lecture)
- [RAG Architecture](https://arxiv.org/abs/2005.11401)
- [Indian Handicrafts](https://www.handicrafts.nic.in/)
