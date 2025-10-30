# Intent Classifier Service

## Overview

The Intent Classifier is a sophisticated service that analyzes user messages to determine their intent and extract relevant entities. It uses a hybrid approach combining:

1. **Google Cloud Natural Language API** - For entity recognition, sentiment analysis, and syntax analysis
2. **Custom ML Model** - TF-IDF based classification trained on artisan-specific queries
3. **Keyword Matching** - Fallback pattern matching for reliability

## Features

### Core Capabilities

- **Intent Classification**: Identifies user intent from 11 different intent types
- **Entity Extraction**: Extracts entities like locations, dates, prices, products, etc.
- **Sentiment Analysis**: Determines if the message is positive, neutral, or negative
- **Syntax Analysis**: Analyzes sentence structure to detect questions and commands
- **Multilingual Support**: Works with 22+ Indian languages
- **Context-Aware**: Uses conversation context to improve accuracy
- **Batch Processing**: Classify multiple messages efficiently

### Intent Types

The classifier recognizes the following intent types:

1. **navigation** - Navigate to different app features
2. **query_profile** - Ask about artisan profile information
3. **query_products** - Ask about products and inventory
4. **query_sales** - Ask about sales and revenue
5. **query_schemes** - Ask about government schemes and benefits
6. **query_craft_knowledge** - Ask about craft techniques and knowledge
7. **image_analysis** - Request image analysis
8. **create_product** - Create new product listings
9. **connect_buyer** - Connect with buyers
10. **general_chat** - General conversation
11. **help** - Request help or guidance

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Intent Classifier                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Custom ML Model (TF-IDF)                         │  │
│  │     - Trained on artisan-specific queries            │  │
│  │     - Confidence threshold: 0.7                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  2. Google Cloud Natural Language API                │  │
│  │     - Entity extraction                              │  │
│  │     - Sentiment analysis                             │  │
│  │     - Syntax analysis                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3. Keyword Pattern Matching (Fallback)              │  │
│  │     - Multilingual patterns                          │  │
│  │     - Context-based inference                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Intent Classification

```typescript
import { intentClassifier } from '@/lib/services/artisan-buddy';

// Initialize the classifier
await intentClassifier.initialize();

// Classify a message
const intent = await intentClassifier.classifyIntent('show my products');

console.log(intent.type);        // 'query_products'
console.log(intent.confidence);  // 0.85
console.log(intent.entities);    // []
console.log(intent.parameters);  // {}
```

### Entity Extraction

```typescript
// Extract entities from a message
const entities = await intentClassifier.extractEntities(
  'Show me products from Mumbai that cost less than 5000 rupees'
);

// entities = [
//   { type: 'LOCATION', value: 'Mumbai', confidence: 0.9, ... },
//   { type: 'PRICE', value: '5000 rupees', confidence: 0.85, ... }
// ]
```

### Multilingual Entity Extraction

```typescript
// Extract entities from non-English text
const entities = await intentClassifier.extractEntitiesMultilingual(
  'मुंबई से उत्पाद दिखाओ',
  'hi'  // Hindi
);
```

### Sentiment Analysis

```typescript
const sentiment = await intentClassifier.analyzeSentiment(
  'I love this platform, it helps me so much!'
);

console.log(sentiment.sentiment);  // 'positive'
console.log(sentiment.score);      // 0.8
console.log(sentiment.magnitude);  // 0.9
```

### Syntax Analysis

```typescript
const syntax = await intentClassifier.analyzeSyntax(
  'How can I improve my pottery techniques?'
);

console.log(syntax.isQuestion);  // true
console.log(syntax.isCommand);   // false
console.log(syntax.tokens);      // Array of tokens with POS tags
```

### Context-Aware Classification

```typescript
import { conversationContext, artisanContext } from './contexts';

const intent = await intentClassifier.classifyWithContext(
  'show my sales',
  conversationContext,
  artisanContext
);

// Intent is enhanced with sentiment, syntax, and artisan-specific context
console.log(intent.parameters.sentiment);
console.log(intent.parameters.artisanProfession);
```

### Batch Classification

```typescript
const messages = [
  'show my profile',
  'what products do i sell',
  'how much did i earn'
];

const intents = await intentClassifier.classifyBatch(messages);

intents.forEach((intent, i) => {
  console.log(`${messages[i]} → ${intent.type}`);
});
```

## Custom ML Model

### Training Data

The custom model is trained on 80+ examples covering all intent types in multiple languages (English, Hindi, Tamil). The training data includes:

- Navigation commands
- Profile queries
- Product queries
- Sales queries
- Scheme queries
- Craft knowledge queries
- Image analysis requests
- Product creation requests
- Buyer connection requests
- General chat
- Help requests

### Model Architecture

The custom model uses:

1. **TF-IDF Vectorization**: Converts text to numerical vectors
2. **Cosine Similarity**: Measures similarity between input and intent vectors
3. **Confidence Scoring**: Returns confidence score for predictions

### Model Statistics

```typescript
const stats = intentClassifier.getModelStatistics();

console.log(stats.totalExamples);      // 80+
console.log(stats.vocabularySize);     // 200+
console.log(stats.intentCount);        // 11
console.log(stats.examplesPerIntent);  // Distribution of examples
```

### Model Evaluation

```typescript
const evaluation = intentClassifier.evaluateModel();

console.log(evaluation.accuracy);         // 0.85+ (85%+)
console.log(evaluation.confusionMatrix);  // Confusion matrix
```

### Online Learning

Add new training examples to improve the model:

```typescript
intentClassifier.addTrainingExample(
  'मेरी दुकान कहाँ है',  // Where is my shop
  'query_profile',
  'hi'
);
```

## Hybrid Classification Strategy

The classifier uses a three-tier approach:

### Tier 1: Custom ML Model (Primary)
- Confidence threshold: **0.7**
- If confidence > 0.7, use ML prediction
- Fast and accurate for trained patterns

### Tier 2: Keyword Pattern Matching (Fallback)
- Used when ML confidence < 0.7
- Multilingual pattern matching
- Context-based inference
- Reliable for common patterns

### Tier 3: ML Model (Final Fallback)
- Confidence threshold: **0.3**
- If keyword matching fails and ML confidence > 0.3
- Better than random guessing

### Default
- If all methods fail: **general_chat**

## Multilingual Support

The classifier supports 22+ Indian languages:

- Hindi (hi)
- Tamil (ta)
- Telugu (te)
- Bengali (bn)
- Marathi (mr)
- Gujarati (gu)
- Kannada (kn)
- Malayalam (ml)
- Punjabi (pa)
- Odia (or)
- Assamese (as)
- Urdu (ur)
- And more...

### Language Detection

```typescript
const detection = await googleCloudAI.detectLanguage('नमस्ते');

console.log(detection.language);    // 'hi'
console.log(detection.confidence);  // 0.95
```

## Performance

### Response Times

- **Intent Classification**: < 200ms (with ML model)
- **Entity Extraction**: < 300ms (Google Cloud API)
- **Sentiment Analysis**: < 200ms (Google Cloud API)
- **Syntax Analysis**: < 250ms (Google Cloud API)
- **Batch Classification**: ~150ms per message

### Accuracy

- **Custom ML Model**: 85%+ on training data
- **Hybrid Approach**: 90%+ overall accuracy
- **Entity Extraction**: 85%+ (Google Cloud API)

## Error Handling

The classifier implements graceful degradation:

1. If Google Cloud API fails → Use custom ML model only
2. If custom ML model fails → Use keyword matching
3. If all methods fail → Return 'general_chat' intent

```typescript
try {
  const intent = await intentClassifier.classifyIntent(message);
} catch (error) {
  // Automatically falls back to keyword matching
  console.error('Classification error:', error);
}
```

## Best Practices

### 1. Initialize Once

```typescript
// Initialize at application startup
await intentClassifier.initialize();

// Reuse the same instance
const intent1 = await intentClassifier.classifyIntent(msg1);
const intent2 = await intentClassifier.classifyIntent(msg2);
```

### 2. Use Context When Available

```typescript
// Better accuracy with context
const intent = await intentClassifier.classifyWithContext(
  message,
  conversationContext,
  artisanContext
);
```

### 3. Batch Process When Possible

```typescript
// More efficient than individual calls
const intents = await intentClassifier.classifyBatch(messages);
```

### 4. Monitor Confidence Scores

```typescript
const intent = await intentClassifier.classifyIntent(message);

if (intent.confidence < 0.5) {
  // Low confidence - ask for clarification
  console.log('Could you please rephrase that?');
}
```

### 5. Add Training Examples

```typescript
// Improve model over time
if (userConfirmedIntent) {
  intentClassifier.addTrainingExample(
    message,
    confirmedIntent,
    language
  );
}
```

## Integration with Other Services

### With Conversation Manager

```typescript
import { conversationManager, intentClassifier } from '@/lib/services/artisan-buddy';

// Process message with intent classification
const session = await conversationManager.getSession(sessionId);
const intent = await intentClassifier.classifyIntent(
  message.content,
  session.context
);

// Store intent in message metadata
message.metadata = {
  intent: intent.type,
  confidence: intent.confidence,
};

await conversationManager.processMessage(sessionId, message);
```

### With Response Generator

```typescript
import { intentClassifier, responseGenerator } from '@/lib/services/artisan-buddy';

// Classify intent
const intent = await intentClassifier.classifyIntent(message);

// Generate response based on intent
const response = await responseGenerator.generateResponse(
  intent,
  artisanContext,
  conversationHistory
);
```

### With Navigation Router

```typescript
import { intentClassifier, navigationRouter } from '@/lib/services/artisan-buddy';

// Classify intent
const intent = await intentClassifier.classifyIntent(message);

// If navigation intent, get route
if (intent.type === 'navigation') {
  const route = await navigationRouter.getRoute(intent, artisanContext);
  // Navigate to route
}
```

## Testing

Run the example file to test the classifier:

```bash
npx ts-node src/lib/services/artisan-buddy/examples/intent-classifier-example.ts
```

## Troubleshooting

### Issue: Low Accuracy

**Solution**: Add more training examples for the specific intent

```typescript
intentClassifier.addTrainingExample(text, intent, language);
```

### Issue: Google Cloud API Errors

**Solution**: Check credentials and API enablement

```bash
# Verify environment variables
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PRIVATE_KEY=your-private-key
GOOGLE_CLOUD_CLIENT_EMAIL=your-client-email
```

### Issue: Slow Response Times

**Solution**: Use batch processing for multiple messages

```typescript
const intents = await intentClassifier.classifyBatch(messages);
```

## Future Enhancements

1. **Deep Learning Model**: Replace TF-IDF with BERT or similar
2. **Active Learning**: Automatically identify low-confidence predictions for labeling
3. **Intent Hierarchies**: Support sub-intents for more granular classification
4. **Contextual Embeddings**: Use conversation history for better embeddings
5. **Multi-Intent Detection**: Detect multiple intents in a single message

## References

- [Google Cloud Natural Language API](https://cloud.google.com/natural-language/docs)
- [TF-IDF Vectorization](https://en.wikipedia.org/wiki/Tf%E2%80%93idf)
- [Cosine Similarity](https://en.wikipedia.org/wiki/Cosine_similarity)
- [Intent Classification Best Practices](https://rasa.com/docs/rasa/nlu-training-data/)

## Support

For issues or questions, please refer to:
- Design Document: `.kiro/specs/artisan-buddy-chatbot/design.md`
- Requirements: `.kiro/specs/artisan-buddy-chatbot/requirements.md`
- Implementation Plan: `.kiro/specs/artisan-buddy-chatbot/tasks.md`
