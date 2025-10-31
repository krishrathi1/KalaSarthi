# Knowledge Base Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Seed the Knowledge Base

```bash
node scripts/seed-knowledge-base.js seed
```

This will populate the knowledge base with 13 curated documents about Indian arts and crafts.

### Step 2: Verify the Setup

```bash
node scripts/seed-knowledge-base.js verify
```

You should see:
```
✅ Knowledge base is valid
Total Documents: 13
Documents by Category: { craft_info: 4, technique: 3, material: 1, market_insights: 3, pricing: 2 }
```

### Step 3: Use in Your Code

```typescript
import { KnowledgeBaseService, RAGPipelineService } from '@/lib/services/artisan-buddy';

// Simple search
const kb = KnowledgeBaseService.getInstance();
const results = await kb.search('pottery techniques');

// RAG-based response
const rag = RAGPipelineService.getInstance();
const response = await rag.generateWithContext({
  query: 'How can I improve my pottery?',
  context: {
    userId: 'user123',
    name: 'Artisan Name',
    profession: 'Potter',
    location: 'Jaipur'
  }
});

console.log(response.response);
```

## 📚 Common Use Cases

### 1. Answer Craft Questions

```typescript
const kb = KnowledgeBaseService.getInstance();

// Get craft information
const craftInfo = await kb.getCraftInfo('pottery');
console.log(craftInfo.history);
console.log(craftInfo.techniques);

// Get technique details
const technique = await kb.getTechniqueInfo('wheel throwing');
console.log(technique.steps);
```

### 2. Provide Market Insights

```typescript
const insights = await kb.getMarketInsights('weaving');
console.log(`Demand: ${insights.demand}`);
console.log(`Price Range: ₹${insights.averagePrice.min} - ₹${insights.averagePrice.max}`);
console.log(`Top Regions: ${insights.topBuyerRegions.join(', ')}`);
```

### 3. Generate Contextual Responses

```typescript
const rag = RAGPipelineService.getInstance();

const response = await rag.generateWithContext({
  query: 'What materials should I use for blue pottery?',
  context: artisanProfile,
  conversationHistory: previousMessages,
  filters: {
    category: 'material',
    craftType: 'pottery'
  }
});

console.log(response.response);
console.log(`Confidence: ${response.confidence}`);
console.log(`Sources: ${response.sources.join(', ')}`);
```

### 4. Multilingual Support

```typescript
// Search in Hindi
const hindiResults = await kb.search('कुम्हारी तकनीक', {
  language: 'hi'
});

// RAG in Hindi
const hindiResponse = await rag.generateWithContext({
  query: 'मिट्टी के बर्तन कैसे बनाएं?',
  context: { ...artisanProfile, language: 'hi' }
});
```

## 🔧 Maintenance Commands

```bash
# Seed all data
node scripts/seed-knowledge-base.js seed

# Clear all data
node scripts/seed-knowledge-base.js clear

# Update (clear + re-seed)
node scripts/seed-knowledge-base.js update

# Verify integrity
node scripts/seed-knowledge-base.js verify

# Seed specific category
node scripts/seed-knowledge-base.js seed-category technique

# Seed specific craft
node scripts/seed-knowledge-base.js seed-craft pottery
```

## 📊 Check Statistics

```typescript
import { VectorStore } from '@/lib/services/artisan-buddy';

const vectorStore = VectorStore.getInstance();
const stats = await vectorStore.getStatistics();

console.log('Total Documents:', stats.totalDocuments);
console.log('By Category:', stats.documentsByCategory);
console.log('By Craft Type:', stats.documentsByCraftType);
```

## 🎯 Integration with Chatbot

```typescript
// In your chatbot message handler
async function handleMessage(userId: string, message: string) {
  const rag = RAGPipelineService.getInstance();
  const contextEngine = ContextEngine.getInstance();
  const conversationManager = ConversationManager.getInstance();

  // Get artisan context
  const context = await contextEngine.loadArtisanContext(userId);
  
  // Get conversation history
  const history = await conversationManager.getHistory(sessionId, 10);

  // Generate response
  const response = await rag.generateWithContext({
    query: message,
    context,
    conversationHistory: history
  });

  return response.response;
}
```

## 🐛 Troubleshooting

### Rate Limit Errors
```typescript
// The system automatically handles rate limits with fallback embeddings
// Add delays between batch operations:
await new Promise(resolve => setTimeout(resolve, 100));
```

### Low Relevance Scores
```typescript
// Adjust the threshold
const results = await kb.search(query, {
  minRelevance: 0.2  // Lower threshold for more results
});
```

### No Results Found
```typescript
// Check if data is seeded
const stats = await vectorStore.getStatistics();
if (stats.totalDocuments === 0) {
  // Run seeding
  const seeder = new KnowledgeBaseSeeder();
  await seeder.seedAll();
}
```

## 📖 More Information

- Full Documentation: `KNOWLEDGE_BASE_README.md`
- Implementation Details: `KNOWLEDGE_BASE_IMPLEMENTATION_SUMMARY.md`
- Usage Examples: `examples/knowledge-base-usage.ts`

## 🎉 You're Ready!

The Knowledge Base is now set up and ready to power your Artisan Buddy chatbot with intelligent, context-aware responses about Indian arts and crafts!
