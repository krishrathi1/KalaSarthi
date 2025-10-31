# Conversation Manager - Implementation Guide

## Overview

The Conversation Manager is a core service for the Artisan Buddy chatbot that orchestrates conversation flow, manages sessions, and coordinates between components. It provides Redis-based message storage with pagination, search capabilities, and intelligent context management.

## Architecture

### Components

1. **ConversationManager** - Main orchestrator for conversation flow
2. **ConversationContextManager** - Manages conversation state and context window
3. **RedisClient** - Handles Redis operations for session and message storage
4. **ContextEngine** - Fetches and maintains artisan profile data

### Data Flow

```
User Message → ConversationManager → Process & Store → Update Context → Response
                      ↓                      ↓                ↓
                 RedisClient        ContextEngine    ContextManager
```

## Features Implemented

### 1. Session Management

- **Initialize Session**: Creates new conversation sessions with user context
- **Get Session**: Retrieves existing session data
- **End Session**: Cleans up session data and conversation history
- **Session Cleanup**: Automatically removes expired sessions

```typescript
// Initialize a new session
const session = await conversationManager.initializeSession(userId, 'en');

// Get existing session
const session = await conversationManager.getSession(sessionId);

// End session
await conversationManager.endSession(sessionId);
```

### 2. Message Processing Pipeline

- **Process Message**: Handles incoming messages with metadata tracking
- **Store Message**: Persists messages in Redis Streams
- **Update Activity**: Tracks session activity timestamps

```typescript
// Process a user message
const message: Message = {
  id: uuidv4(),
  sessionId,
  role: 'user',
  content: 'Show me my sales data',
  language: 'en',
  timestamp: new Date(),
  metadata: {
    intent: 'query_sales',
    confidence: 0.95,
  },
};

const processedMessage = await conversationManager.processMessage(sessionId, message);
```

### 3. Conversation History Retrieval

- **Get History**: Retrieves conversation messages with configurable limit
- **Paginated History**: Supports pagination for large conversations
- **Search Messages**: Full-text search across conversation history
- **Export Messages**: Export conversation in JSON or text format

```typescript
// Get last 20 messages
const messages = await conversationManager.getHistory(sessionId, 20);

// Get paginated history
const { messages, total, hasMore } = await conversationManager.getPaginatedHistory(
  sessionId,
  20,  // limit
  0    // offset
);

// Search messages
const results = await conversationManager.searchMessages(
  sessionId,
  'sales',
  { role: 'user', limit: 10 }
);

// Export conversation
const jsonExport = await conversationManager.exportMessages(sessionId, 'json');
const textExport = await conversationManager.exportMessages(sessionId, 'text');
```

### 4. Context Window Management

- **Context Window**: Maintains last N messages for AI context
- **Effective Context**: Combines summary with recent messages
- **Context Overflow**: Handles large conversations gracefully

```typescript
// Get context window (last 20 messages)
const contextWindow = await conversationManager.getContextWindow(sessionId);

// Get effective context (summary + recent messages)
const { summary, recentMessages, totalMessages } = 
  await conversationManager.getEffectiveContext(sessionId);

// Handle context overflow
await conversationManager.handleContextOverflow(sessionId);
```

### 5. Conversation Summarization

- **Auto-Summarization**: Automatically summarizes after 50 messages
- **Manual Summarization**: On-demand conversation summarization
- **Extractive Summary**: Groups messages by topic/intent

```typescript
// Summarize conversation
const summary = await conversationManager.summarizeConversation(sessionId);
```

### 6. Conversation State Tracking

- **Flow State**: Tracks conversation flow (greeting, query, action, etc.)
- **Topic Tracking**: Monitors current conversation topic
- **Quality Metrics**: Calculates context quality scores

```typescript
// Get context statistics
const stats = await conversationManager.getContextStatistics(sessionId);
// Returns: {
//   totalMessages: 45,
//   contextWindowSize: 20,
//   hasSummary: true,
//   lastActivity: Date,
//   qualityScore: 0.85
// }
```

## Redis Data Structures

### Session Storage

```
Key: session:{sessionId}
Type: String (JSON)
TTL: 24 hours
Data: {
  userId: string,
  language: string,
  startedAt: number,
  lastActivityAt: number,
  contextHash: string
}
```

### Message Storage

```
Key: messages:{sessionId}
Type: Redis Stream
TTL: 24 hours
Entries: {
  id: auto-generated,
  role: 'user' | 'assistant',
  content: string,
  language: string,
  timestamp: number,
  metadata: JSON string
}
```

### Conversation State

```
Key: conversation_state:{sessionId}
Type: String (JSON)
TTL: 1 hour
Data: {
  sessionId: string,
  currentTopic: string,
  conversationFlow: ConversationFlowState,
  contextWindow: Message[],
  summary: string,
  messageCount: number,
  lastSummarizedAt: Date
}
```

### Archived Messages

```
Key: archived_messages:{sessionId}
Type: String (JSON)
TTL: 7 days
Data: Message[]
```

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password

# Session Configuration
ARTISAN_BUDDY_SESSION_TTL=86400  # 24 hours in seconds
ARTISAN_BUDDY_CACHE_TTL=3600     # 1 hour in seconds
```

### Constants

```typescript
MAX_CONVERSATION_HISTORY = 20      // Max messages in context window
SUMMARIZATION_THRESHOLD = 50       // Summarize after N messages
DEFAULT_SESSION_TTL = 86400        // 24 hours
DEFAULT_CACHE_TTL = 3600           // 1 hour
```

## Usage Examples

### Complete Conversation Flow

```typescript
import { conversationManager } from '@/lib/services/artisan-buddy';

// 1. Initialize session
const session = await conversationManager.initializeSession(userId, 'hi');

// 2. Process user message
const userMessage: Message = {
  id: uuidv4(),
  sessionId: session.id,
  role: 'user',
  content: 'मेरे उत्पाद दिखाओ',
  language: 'hi',
  timestamp: new Date(),
};

await conversationManager.processMessage(session.id, userMessage);

// 3. Get context for AI processing
const context = await conversationManager.getEffectiveContext(session.id);

// 4. Store assistant response
const assistantMessage: Message = {
  id: uuidv4(),
  sessionId: session.id,
  role: 'assistant',
  content: 'आपके पास 15 उत्पाद हैं...',
  language: 'hi',
  timestamp: new Date(),
  metadata: {
    intent: 'query_products',
    confidence: 0.92,
  },
};

await conversationManager.processMessage(session.id, assistantMessage);

// 5. Get conversation history
const history = await conversationManager.getHistory(session.id);

// 6. End session when done
await conversationManager.endSession(session.id);
```

### Background Cleanup

```typescript
// Run periodic cleanup (e.g., via cron job)
setInterval(async () => {
  const cleanedCount = await conversationManager.cleanupExpiredSessions();
  console.log(`Cleaned up ${cleanedCount} expired sessions`);
}, 60 * 60 * 1000); // Every hour
```

## Error Handling

The Conversation Manager implements comprehensive error handling:

- **Connection Errors**: Gracefully handles Redis connection failures
- **Session Not Found**: Returns null or throws appropriate errors
- **Message Storage Failures**: Logs errors and continues operation
- **Context Overflow**: Automatically handles with summarization or archival

```typescript
try {
  const session = await conversationManager.getSession(sessionId);
  if (!session) {
    // Handle session not found
    console.error('Session not found');
    return;
  }
} catch (error) {
  console.error('Error getting session:', error);
  // Implement fallback logic
}
```

## Performance Considerations

### Optimization Strategies

1. **Connection Pooling**: Redis client uses connection pooling
2. **Caching**: Session data and context cached in Redis
3. **Lazy Loading**: Context loaded only when needed
4. **Batch Operations**: Multiple Redis operations batched when possible
5. **TTL Management**: Automatic cleanup of expired data

### Scalability

- **Horizontal Scaling**: Multiple API instances can share Redis
- **Redis Cluster**: Supports Redis Cluster for distributed caching
- **Message Pagination**: Handles large conversations efficiently
- **Archive Strategy**: Old messages archived with longer TTL

## Testing

### Unit Tests

```typescript
describe('ConversationManager', () => {
  it('should initialize session', async () => {
    const session = await conversationManager.initializeSession(userId);
    expect(session.id).toBeDefined();
    expect(session.userId).toBe(userId);
  });

  it('should store and retrieve messages', async () => {
    const message = { /* ... */ };
    await conversationManager.processMessage(sessionId, message);
    const history = await conversationManager.getHistory(sessionId);
    expect(history).toHaveLength(1);
  });

  it('should handle context overflow', async () => {
    // Add 100 messages
    for (let i = 0; i < 100; i++) {
      await conversationManager.processMessage(sessionId, message);
    }
    
    const stats = await conversationManager.getContextStatistics(sessionId);
    expect(stats.hasSummary).toBe(true);
  });
});
```

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- ✅ **Requirement 3.1**: Session initialization and management
- ✅ **Requirement 3.2**: Conversation history storage and retrieval
- ✅ **Requirement 3.3**: Context awareness across interactions
- ✅ **Requirement 3.4**: Message persistence with 24-hour retention
- ✅ **Requirement 3.5**: Session cleanup and data privacy

## Next Steps

The Conversation Manager is now ready for integration with:

1. **Intent Classifier** (Task 4) - For intent detection and entity extraction
2. **Response Generator** (Task 7) - For generating contextual responses
3. **Translation Service** (Task 5) - For multilingual support
4. **API Layer** (Task 12) - For exposing REST endpoints

## Troubleshooting

### Common Issues

**Issue**: Redis connection errors
**Solution**: Check REDIS_URL and ensure Redis is running

**Issue**: Session not found
**Solution**: Sessions expire after 24 hours; reinitialize if needed

**Issue**: Context window too large
**Solution**: Adjust MAX_CONVERSATION_HISTORY constant

**Issue**: Memory usage high
**Solution**: Reduce session TTL or implement more aggressive cleanup

## Support

For questions or issues, refer to:
- Design Document: `.kiro/specs/artisan-buddy-chatbot/design.md`
- Requirements: `.kiro/specs/artisan-buddy-chatbot/requirements.md`
- Tasks: `.kiro/specs/artisan-buddy-chatbot/tasks.md`
