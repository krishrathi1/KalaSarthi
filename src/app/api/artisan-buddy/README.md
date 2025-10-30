# Artisan Buddy API Endpoints

This directory contains the API endpoints for the Artisan Buddy chatbot system.

## Endpoints

### 1. POST /api/artisan-buddy
**Main message handling endpoint**

Processes incoming messages and generates AI-powered responses.

**Request Body:**
```json
{
  "message": "string (required)",
  "userId": "string (required)",
  "sessionId": "string (optional)",
  "language": "string (optional, default: 'en')",
  "imageUrl": "string (optional)",
  "metadata": "object (optional)"
}
```

**Response:**
```json
{
  "response": "string",
  "sessionId": "string",
  "messageId": "string",
  "language": "string",
  "suggestedActions": "array",
  "followUpQuestions": "array",
  "shouldNavigate": "boolean (optional)",
  "navigationTarget": "string (optional)",
  "degraded": "boolean (optional)",
  "metadata": {
    "intent": "string",
    "confidence": "number",
    "responseTime": "number",
    "sources": "array"
  }
}
```

**Features:**
- Automatic language detection
- Intent classification
- RAG-based response generation
- Image analysis support
- Navigation routing
- Translation support
- Graceful degradation

---

### 2. GET /api/artisan-buddy/history
**Conversation history retrieval**

Retrieves conversation history with pagination, search, and export capabilities.

**Query Parameters:**
- `sessionId` (required): Session identifier
- `limit` (optional): Number of messages to retrieve (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `search` (optional): Search query
- `role` (optional): Filter by role ('user' or 'assistant')
- `language` (optional): Filter by language
- `format` (optional): Export format ('json' or 'text')

**Response:**
```json
{
  "messages": "array",
  "pagination": {
    "limit": "number",
    "offset": "number",
    "total": "number",
    "hasMore": "boolean"
  },
  "statistics": {
    "totalMessages": "number",
    "contextWindowSize": "number",
    "hasSummary": "boolean",
    "lastActivity": "date",
    "qualityScore": "number"
  },
  "sessionInfo": {
    "id": "string",
    "userId": "string",
    "language": "string",
    "startedAt": "date",
    "lastActivityAt": "date"
  }
}
```

**Features:**
- Pagination support
- Message search
- Role and language filtering
- Export to JSON or text
- Context statistics

---

### 3. POST /api/artisan-buddy/session
**Session management**

Creates new sessions or retrieves session information.

**Request Body:**
```json
{
  "userId": "string (required)",
  "language": "string (optional, default: 'en')",
  "action": "string (optional: 'create', 'info', 'refresh')",
  "sessionId": "string (required for 'info' and 'refresh' actions)"
}
```

**Response (create):**
```json
{
  "session": {
    "id": "string",
    "userId": "string",
    "language": "string",
    "startedAt": "date",
    "lastActivityAt": "date"
  },
  "profile": {
    "name": "string",
    "profession": "string",
    "specializations": "array",
    "location": "object"
  },
  "contextSummary": "string",
  "message": "string"
}
```

**Actions:**
- `create`: Create new session
- `info`: Get session information
- `refresh`: Refresh session context

---

### 4. DELETE /api/artisan-buddy/session
**Session cleanup**

Ends a session and cleans up resources.

**Query Parameters:**
- `sessionId` (required): Session identifier

**Response:**
```json
{
  "message": "string",
  "sessionId": "string",
  "finalStatistics": {
    "totalMessages": "number",
    "contextWindowSize": "number",
    "hasSummary": "boolean",
    "lastActivity": "date",
    "qualityScore": "number"
  }
}
```

---

### 5. GET /api/artisan-buddy/session
**Session information**

Gets active session count or triggers cleanup of expired sessions.

**Query Parameters:**
- `action` (optional): 'cleanup' to clean expired sessions

**Response:**
```json
{
  "activeSessionCount": "number"
}
```

**Response (cleanup):**
```json
{
  "message": "string",
  "cleanedCount": "number"
}
```

---

## Authentication & Authorization

All endpoints support authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

**Features:**
- JWT token validation
- User role checking
- Rate limiting (60 requests per minute)
- Request logging

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

---

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": {
    "type": "ERROR_TYPE",
    "message": "Technical error message",
    "userMessage": "User-friendly error message",
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "details": {},
    "timestamp": "ISO date string",
    "requestId": "string",
    "suggestions": ["array of suggestions"]
  }
}
```

**Error Types:**
- `AUTHENTICATION_ERROR`: Authentication failed
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `VALIDATION_ERROR`: Invalid input
- `SESSION_NOT_FOUND`: Session expired or not found
- `USER_NOT_FOUND`: User profile not found
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `TRANSLATION_ERROR`: Translation service error
- `VISION_ERROR`: Image analysis error
- `DATABASE_ERROR`: Database access error
- `CACHE_ERROR`: Cache access error
- `UNKNOWN_ERROR`: Unexpected error

**Graceful Degradation:**
- Translation failures: Continue in original language
- Vision service failures: Provide basic response
- Cache failures: Fetch from source
- Intent classification failures: Use keyword-based fallback
- Response generation failures: Provide fallback message

---

## Request/Response Headers

**Request Headers:**
- `Authorization`: Bearer token (optional)
- `Content-Type`: application/json

**Response Headers:**
- `X-Request-ID`: Unique request identifier
- `X-RateLimit-Limit`: Rate limit maximum
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Rate limit reset time

---

## Usage Examples

### Create Session and Send Message

```javascript
// 1. Create session
const sessionResponse = await fetch('/api/artisan-buddy/session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    userId: 'user123',
    language: 'en',
    action: 'create'
  })
});

const { session } = await sessionResponse.json();

// 2. Send message
const messageResponse = await fetch('/api/artisan-buddy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    message: 'Show me my sales data',
    userId: 'user123',
    sessionId: session.id,
    language: 'en'
  })
});

const { response, suggestedActions } = await messageResponse.json();
```

### Get Conversation History

```javascript
const historyResponse = await fetch(
  '/api/artisan-buddy/history?sessionId=session123&limit=20&offset=0',
  {
    headers: {
      'Authorization': 'Bearer <token>'
    }
  }
);

const { messages, pagination, statistics } = await historyResponse.json();
```

### End Session

```javascript
const deleteResponse = await fetch(
  '/api/artisan-buddy/session?sessionId=session123',
  {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer <token>'
    }
  }
);

const { message, finalStatistics } = await deleteResponse.json();
```

---

## Performance

- **Response Time**: < 2 seconds for 95% of requests
- **Concurrent Users**: Supports 1000+ simultaneous conversations
- **Rate Limiting**: 60 requests per minute per user
- **Session TTL**: 24 hours
- **Cache TTL**: 1 hour for context, 7 days for translations

---

## Dependencies

- ConversationManager: Session and message management
- ContextEngine: Artisan profile and context loading
- IntentClassifier: Intent classification and entity extraction
- ResponseGenerator: RAG-based response generation
- NavigationRouter: Navigation intent handling
- TranslationService: Multilingual support
- VisionService: Image analysis
- Redis: Conversation history and caching
- Firestore: User profiles and business data

---

## Security

- JWT token validation
- Rate limiting per user
- Input validation and sanitization
- Request logging with PII protection
- Error message sanitization
- CORS configuration
- TLS encryption in transit
- Data encryption at rest

---

## Monitoring

All endpoints log:
- Request ID
- User ID
- Endpoint
- Method
- Response time
- Status code
- Errors with stack traces

Use request ID for debugging and tracing requests across services.
