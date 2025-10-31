# Artisan Buddy Chat API

Simplified chat API endpoint for the Artisan Buddy chatbot UI.

## Endpoint

```
POST /api/artisan-buddy/chat
```

## Request Body

```json
{
  "message": "User message text",
  "sessionId": "optional-session-id",
  "userId": "user-id",
  "language": "en",
  "imageUrl": "optional-image-url"
}
```

### Parameters

- `message` (string, optional): The user's message text. Required if no imageUrl.
- `sessionId` (string, optional): Existing session ID. If not provided, a new session is created.
- `userId` (string, required): The user's unique identifier.
- `language` (string, optional): User's preferred language. Default: "en"
- `imageUrl` (string, optional): URL or base64 data of uploaded image.

## Response

```json
{
  "response": "Assistant response text",
  "sessionId": "session-id",
  "messageId": "message-id",
  "language": "en",
  "suggestedActions": [
    {
      "type": "navigate",
      "label": "View Dashboard",
      "route": "/finance/dashboard"
    }
  ],
  "followUpQuestions": [
    "What were my sales last month?",
    "Show me my best sellers"
  ],
  "shouldNavigate": false,
  "navigationTarget": "/route",
  "metadata": {
    "intent": "general_chat",
    "confidence": 0.85,
    "responseTime": 123
  }
}
```

### Response Fields

- `response` (string): The assistant's response text
- `sessionId` (string): Session ID for conversation continuity
- `messageId` (string): Unique message identifier
- `language` (string): Response language
- `suggestedActions` (array): Action buttons to display
- `followUpQuestions` (array): Quick reply suggestions
- `shouldNavigate` (boolean): Whether to trigger navigation
- `navigationTarget` (string): Route to navigate to (if shouldNavigate is true)
- `metadata` (object): Additional metadata about the response

## Supported Intents

The API detects user intent and provides contextual responses for:

### 1. Product & Inventory
**Keywords:** product, inventory, stock

**Example Response:**
- Product count and inventory value
- Top-selling items
- Suggested actions to view/create products

### 2. Sales & Finance
**Keywords:** sales, revenue, finance, money

**Example Response:**
- Sales summary (total, orders, average)
- Trend analysis
- Links to financial dashboard

### 3. Government Schemes
**Keywords:** scheme, government, loan

**Example Response:**
- Eligible schemes with match scores
- Loan details and benefits
- Application links

### 4. Buyer Connections
**Keywords:** buyer, customer, connect

**Example Response:**
- Active connections count
- New inquiries
- Recent buyer interests

### 5. Digital Khata
**Keywords:** digital khata, khata, ledger

**Example Response:**
- Current balance
- Pending payments
- Transaction management links

### 6. Craft Knowledge
**Keywords:** craft, technique, how to

**Example Response:**
- Craft information
- Technique guides
- Learning resources

### 7. Image Analysis
**Trigger:** imageUrl provided

**Example Response:**
- Image quality assessment
- Improvement suggestions
- Product listing creation prompt

### 8. Greetings
**Keywords:** hello, hi, hey, namaste

**Example Response:**
- Welcome message
- Feature overview
- Quick action suggestions

## Example Requests

### Text Message
```bash
curl -X POST http://localhost:3000/api/artisan-buddy/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are my top selling products?",
    "userId": "user123",
    "language": "en"
  }'
```

### Image Upload
```bash
curl -X POST http://localhost:3000/api/artisan-buddy/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What do you think of this design?",
    "userId": "user123",
    "language": "en",
    "imageUrl": "data:image/jpeg;base64,..."
  }'
```

### With Session
```bash
curl -X POST http://localhost:3000/api/artisan-buddy/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me more details",
    "sessionId": "existing-session-id",
    "userId": "user123",
    "language": "en"
  }'
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Message or image is required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Error details"
}
```

## Session Management

- Sessions are stored in-memory (for demo purposes)
- Each session tracks:
  - User ID
  - Language preference
  - Message history
  - Creation timestamp
- Sessions persist for the lifetime of the server process
- In production, use Redis or database for session storage

## Features

✅ Simple intent detection
✅ Contextual responses
✅ Suggested actions
✅ Follow-up questions
✅ Image analysis support
✅ Session management
✅ Error handling
✅ Response time tracking

## Future Enhancements

- [ ] Persistent session storage (Redis/Database)
- [ ] Advanced NLP for intent classification
- [ ] Integration with actual data sources
- [ ] Real-time updates via WebSocket
- [ ] Multi-turn conversation context
- [ ] Personalized responses based on user history
- [ ] A/B testing for response variations
- [ ] Analytics and monitoring

## Integration with Chat UI

The chat UI component automatically uses this endpoint:

```typescript
import { ArtisanBuddyChatUI } from '@/components/artisan-buddy';

<ArtisanBuddyChatUI
  userId="user123"
  initialLanguage="en"
  onNavigate={(route) => router.push(route)}
/>
```

The component handles:
- Message sending
- Session management
- Error handling
- UI updates
- Navigation triggers

## Testing

Test the endpoint at:
- **Chat UI**: http://localhost:3000/artisan-buddy
- **Test Page**: http://localhost:3000/artisan-buddy/test

Try these example queries:
- "What are my top selling products?"
- "Show me government schemes"
- "How can I connect with buyers?"
- "Tell me about pottery techniques"
- Upload an image and ask for feedback

## Notes

- This is a simplified implementation for demo purposes
- In production, integrate with actual services:
  - ConversationManager
  - IntentClassifier
  - ResponseGenerator
  - TranslationService
  - VisionService
  - ContextEngine
- Add authentication and rate limiting
- Implement proper error tracking
- Use environment-specific configurations
