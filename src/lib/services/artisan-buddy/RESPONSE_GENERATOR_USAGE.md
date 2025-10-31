# Response Generator Service - Usage Guide

## Overview

The Response Generator service is a core component of the Artisan Buddy chatbot that generates contextually appropriate, personalized responses using RAG (Retrieval-Augmented Generation) pipeline and LLM. It implements advanced features including context-aware generation, response caching, quality monitoring, and optimization.

## Features

### ✅ Implemented (Task 7 Complete)

1. **Response Generation Pipeline**
   - RAG-based response generation with knowledge retrieval
   - Context-enriched prompt engineering
   - Multi-source information synthesis

2. **Context-Aware Response Generation (Subtask 7.1)**
   - Artisan profile context injection
   - Conversation history for coherence
   - Personalization based on user preferences
   - Multi-turn conversation handling
   - Intent-specific context adaptation

3. **Response Caching and Optimization (Subtask 7.2)**
   - Redis-based response caching
   - Common query detection with extended TTL
   - Streaming responses for long content
   - Response quality monitoring
   - Fallback responses for errors

4. **Response Formatting and Styling**
   - Length-based truncation (short/medium/long)
   - Style adaptation (formal/casual)
   - Clean formatting and artifact removal
   - Language-specific formatting

5. **Suggested Actions Generation**
   - Intent-based action recommendations
   - Navigation suggestions
   - Quick action buttons

6. **Follow-up Questions Generation**
   - Context-aware question suggestions
   - Conversation flow guidance
   - Engagement enhancement

## Installation

The Response Generator is part of the Artisan Buddy services and is automatically available when you import from the services directory:

```typescript
import { responseGenerator } from '@/lib/services/artisan-buddy';
```

## Basic Usage

### 1. Simple Response Generation

```typescript
import { responseGenerator } from '@/lib/services/artisan-buddy';
import { contextEngine } from '@/lib/services/artisan-buddy';
import { intentClassifier } from '@/lib/services/artisan-buddy';

// Load artisan context
const context = await contextEngine.loadArtisanContext(userId);

// Classify user intent
const intent = await intentClassifier.classifyIntent(userMessage, conversationContext);

// Generate response
const response = await responseGenerator.generateResponse({
  intent,
  context,
  history: conversationHistory,
  userMessage,
  language: 'en',
  sessionId,
});

console.log(response.text);
console.log(response.suggestedActions);
console.log(response.followUpQuestions);
```

### 2. Response with Options

```typescript
const response = await responseGenerator.generateResponse(
  {
    intent,
    context,
    history,
    userMessage,
    language: 'en',
    sessionId,
  },
  {
    useCache: true,           // Enable caching
    streamResponse: false,    // Disable streaming
    maxLength: 500,          // Maximum response length
    includeActions: true,    // Include suggested actions
    includeFollowUps: true,  // Include follow-up questions
  }
);
```

### 3. Streaming Response

For long-form content, use streaming to improve perceived performance:

```typescript
for await (const chunk of responseGenerator.streamResponse(request)) {
  process.stdout.write(chunk);
  // Or send chunk to client via WebSocket/SSE
}
```

## Advanced Features

### Context-Aware Generation

The Response Generator automatically injects multiple layers of context:

1. **Artisan Profile Context**
   - Name, profession, specializations
   - Location and experience
   - Products and inventory status
   - Sales metrics and business performance

2. **Conversation History**
   - Last 5 messages for coherence
   - Topic continuity
   - Reference resolution

3. **User Preferences**
   - Response length (short/medium/long)
   - Communication style (formal/casual)
   - Language preference

4. **Intent-Specific Context**
   - Relevant data based on intent type
   - Entity-specific information
   - Action-oriented context

### Response Caching

Responses are automatically cached in Redis with intelligent TTL:

```typescript
// Common queries (greetings, help) - 24 hour cache
"Hello" → Cached for 24 hours

// Specific queries - 1 hour cache
"Show my products" → Cached for 1 hour

// Disable caching for real-time data
const response = await responseGenerator.generateResponse(request, {
  useCache: false
});
```

### Response Quality Monitoring

Track response quality metrics per session:

```typescript
// Generate multiple responses
await responseGenerator.generateResponse(request1);
await responseGenerator.generateResponse(request2);
await responseGenerator.generateResponse(request3);

// Get metrics
const metrics = responseGenerator.getResponseMetrics(sessionId);

console.log('Total Responses:', metrics.totalResponses);
console.log('Avg Processing Time:', metrics.averageProcessingTime);
console.log('Avg Confidence:', metrics.averageConfidence);
console.log('Cache Hit Rate:', metrics.cacheHitRate);
console.log('Avg Sources Used:', metrics.averageSourcesUsed);
```

### Personalization

Responses are automatically personalized based on user preferences:

```typescript
// Formal, short responses
context.preferences.communicationStyle = 'formal';
context.preferences.responseLength = 'short';

// Casual, detailed responses
context.preferences.communicationStyle = 'casual';
context.preferences.responseLength = 'long';
```

### Suggested Actions

Actions are automatically generated based on intent:

```typescript
// For product queries
{
  type: 'navigate',
  label: 'View All Products',
  route: '/inventory'
}

// For sales queries
{
  type: 'navigate',
  label: 'View Sales Dashboard',
  route: '/finance/dashboard'
}

// For scheme queries
{
  type: 'navigate',
  label: 'Explore Schemes',
  route: '/scheme-sahayak'
}
```

### Follow-up Questions

Contextual follow-up questions are generated to guide conversation:

```typescript
// After product query
[
  "Would you like to add a new product?",
  "How can I help you improve your product listings?",
  "Do you want to see your best-selling products?"
]
```

## API Reference

### ResponseGenerator Class

#### Methods

##### `generateResponse(request, options?)`

Generate a response for user query.

**Parameters:**
- `request: ResponseGenerationRequest` - Request object containing:
  - `intent: Intent` - Classified user intent
  - `context: ArtisanContext` - Artisan profile and business data
  - `history: Message[]` - Conversation history
  - `userMessage: string` - User's message
  - `language: string` - Response language
  - `sessionId: string` - Session identifier

- `options?: ResponseGenerationOptions` - Optional configuration:
  - `useCache?: boolean` - Enable caching (default: true)
  - `streamResponse?: boolean` - Enable streaming (default: false)
  - `maxLength?: number` - Maximum response length (default: 500)
  - `includeActions?: boolean` - Include suggested actions (default: true)
  - `includeFollowUps?: boolean` - Include follow-up questions (default: true)

**Returns:** `Promise<GeneratedResponse>`

##### `streamResponse(request)`

Stream response chunks for long content.

**Parameters:**
- `request: ResponseGenerationRequest` - Request object

**Returns:** `AsyncGenerator<string, void, unknown>`

##### `getResponseMetrics(sessionId)`

Get response quality metrics for a session.

**Parameters:**
- `sessionId: string` - Session identifier

**Returns:** `ResponseMetrics | null`

##### `clearMetrics(sessionId)`

Clear metrics for a session.

**Parameters:**
- `sessionId: string` - Session identifier

**Returns:** `void`

### Types

#### GeneratedResponse

```typescript
interface GeneratedResponse {
  text: string;                      // Generated response text
  language: string;                  // Response language
  confidence: number;                // Confidence score (0-1)
  sources: Source[];                 // Information sources
  suggestedActions: Action[];        // Suggested actions
  followUpQuestions: string[];       // Follow-up questions
}
```

#### ResponseMetrics

```typescript
interface ResponseMetrics {
  totalResponses: number;            // Total responses generated
  averageProcessingTime: number;     // Average time in ms
  averageConfidence: number;         // Average confidence score
  cacheHitRate: number;             // Cache hit rate (0-1)
  averageSourcesUsed: number;       // Average sources per response
}
```

## Integration with Other Services

### With Conversation Manager

```typescript
import { conversationManager, responseGenerator } from '@/lib/services/artisan-buddy';

// Initialize session
const session = await conversationManager.initializeSession(userId, language);

// Get history
const history = await conversationManager.getHistory(session.id);

// Generate response
const response = await responseGenerator.generateResponse({
  intent,
  context,
  history,
  userMessage,
  language,
  sessionId: session.id,
});

// Store assistant message
await conversationManager.processMessage(session.id, {
  id: generateId(),
  sessionId: session.id,
  role: 'assistant',
  content: response.text,
  language,
  timestamp: new Date(),
});
```

### With Intent Classifier

```typescript
import { intentClassifier, responseGenerator } from '@/lib/services/artisan-buddy';

// Classify intent
const intent = await intentClassifier.classifyIntent(userMessage, conversationContext);

// Generate response based on intent
const response = await responseGenerator.generateResponse({
  intent,
  context,
  history,
  userMessage,
  language,
  sessionId,
});
```

### With RAG Pipeline

The Response Generator automatically uses the RAG Pipeline for knowledge retrieval:

```typescript
// RAG Pipeline is used internally
// No direct integration needed
const response = await responseGenerator.generateResponse(request);

// Access retrieved documents
console.log(response.sources);
```

## Performance Optimization

### Caching Strategy

1. **Common Queries**: 24-hour cache for greetings, help messages
2. **Specific Queries**: 1-hour cache for data-driven responses
3. **Real-time Data**: No caching for live metrics

### Response Length Optimization

```typescript
// Short responses (2-3 sentences)
context.preferences.responseLength = 'short';

// Medium responses (4-6 sentences)
context.preferences.responseLength = 'medium';

// Long responses (7+ sentences)
context.preferences.responseLength = 'long';
```

### Streaming for Long Content

```typescript
// Use streaming for detailed explanations
if (intent.type === 'query_craft_knowledge') {
  for await (const chunk of responseGenerator.streamResponse(request)) {
    sendToClient(chunk);
  }
}
```

## Error Handling

The Response Generator provides automatic fallback responses:

```typescript
try {
  const response = await responseGenerator.generateResponse(request);
  
  if (response.confidence < 0.7) {
    console.warn('Low confidence response');
    // Show disclaimer or ask for clarification
  }
} catch (error) {
  // Fallback response is automatically returned
  console.error('Response generation failed:', error);
}
```

## Best Practices

1. **Always Load Context**: Ensure artisan context is loaded before generating responses
2. **Include History**: Provide conversation history for coherent multi-turn conversations
3. **Use Caching**: Enable caching for better performance
4. **Monitor Metrics**: Track response quality metrics to identify issues
5. **Handle Errors**: Always handle potential errors gracefully
6. **Personalize**: Use user preferences for better engagement
7. **Limit History**: Keep conversation history to last 5-10 messages
8. **Stream Long Content**: Use streaming for detailed explanations

## Examples

See `examples/response-generator-example.ts` for comprehensive usage examples including:

1. Basic response generation
2. Context-aware responses with personalization
3. Response caching
4. Multi-turn conversations
5. Response quality monitoring
6. Streaming responses
7. Fallback responses

## Requirements Fulfilled

This implementation fulfills the following requirements from the design document:

- ✅ **Requirement 6.1**: RAG-based response generation with knowledge retrieval
- ✅ **Requirement 6.2**: Context-aware responses using artisan profile
- ✅ **Requirement 6.3**: Knowledge base integration for craft information
- ✅ **Requirement 6.4**: Market insights and business advice
- ✅ **Requirement 6.5**: Personalized recommendations
- ✅ **Requirement 1.1**: Artisan profile awareness
- ✅ **Requirement 1.2**: Product and business data integration
- ✅ **Requirement 3.2**: Conversation history for coherence
- ✅ **Requirement 3.3**: Context window management
- ✅ **Requirement 13.1**: User preference tracking
- ✅ **Requirement 13.2**: Adaptive response system
- ✅ **Requirement 13.3**: Personalized content
- ✅ **Requirement 10.1**: Performance optimization with caching
- ✅ **Requirement 10.2**: Response time < 2 seconds
- ✅ **Requirement 10.3**: Graceful degradation on errors

## Next Steps

After implementing the Response Generator, you can proceed to:

1. **Task 8**: Navigation Router service
2. **Task 9**: Vision Service for image analysis
3. **Task 10**: Business Intelligence integration
4. **Task 11**: Proactive assistance features

## Support

For issues or questions about the Response Generator service, please refer to:
- Design document: `.kiro/specs/artisan-buddy-chatbot/design.md`
- Requirements: `.kiro/specs/artisan-buddy-chatbot/requirements.md`
- Task list: `.kiro/specs/artisan-buddy-chatbot/tasks.md`
