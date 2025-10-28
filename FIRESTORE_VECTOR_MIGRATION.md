# Firestore Vector Migration Guide

This guide covers the complete migration from MongoDB to Firestore with vector embeddings support for the Enhanced Multilingual Chat feature.

## 🚀 Quick Start

Run the complete migration with one command:

```bash
npm run migrate:complete
```

This will:
1. ✅ Seed 10 artisans and 10 buyers with products
2. ✅ Generate vector embeddings for semantic search
3. ✅ Test all search functionality
4. ✅ Provide analytics and health checks

## 📋 What Changed

### Database Migration
- **From**: MongoDB with Mongoose models
- **To**: Firestore with FirestoreService
- **Added**: Vector embeddings storage in Firestore
- **Enhanced**: Semantic search with AI-powered matching

### Key Features Added

#### 1. Vector Embeddings Storage
- Store user profile embeddings in Firestore
- Support for multiple embedding types (profile, skills, products)
- Cosine similarity search for semantic matching
- Batch processing for all users

#### 2. Enhanced Search Capabilities
- **Semantic Search**: Natural language queries
- **Vector Similarity**: AI-powered matching
- **Fallback Support**: Traditional search if vector fails
- **Real-time Results**: Fast Firestore queries

#### 3. Improved APIs
- `/api/intelligent-match` - Enhanced with vector search
- `/api/vector-embeddings` - New endpoint for embedding management
- `/api/design/*` - Updated for Firestore compatibility

## 🔧 Manual Migration Steps

If you prefer to run steps individually:

### Step 1: Seed Data
```bash
npm run seed:firestore
```

### Step 2: Generate Embeddings
```bash
npm run migrate:vectors
```

### Step 3: Test Search
```bash
curl -X POST http://localhost:9003/api/intelligent-match \
  -H "Content-Type: application/json" \
  -d '{"query": "pottery maker in Jaipur", "maxResults": 5}'
```

## 📊 Data Structure

### Users Collection (`users`)
```typescript
interface IUser {
  uid: string;
  name: string;
  role: 'artisan' | 'buyer';
  artisticProfession: string;
  // ... enhanced profiles
}
```

### Products Collection (`products`)
```typescript
interface IProduct {
  id: string;
  artisanId: string;
  name: string;
  description: string;
  price: number;
  // ... product details
}
```

### Vector Embeddings Collection (`user_embeddings`)
```typescript
interface VectorEmbedding {
  id: string;
  userId: string;
  type: 'profile' | 'skills' | 'products' | 'description';
  text: string;
  embedding: number[]; // 768-dimensional vector
  metadata: {
    profession?: string;
    skills?: string[];
    // ... contextual data
  };
}
```

### Chat Sessions Collection (`enhanced_chat_sessions`)
```typescript
interface IEnhancedChatSession {
  sessionId: string;
  participants: ChatParticipant[];
  conversationContext: ConversationContext;
  status: 'active' | 'paused' | 'completed';
  // ... session data
}
```

## 🔍 Search Capabilities

### 1. Vector Semantic Search
```javascript
// Natural language queries
"pottery maker in Jaipur"
"jewelry designer with traditional work"
"textile weaver handloom fabrics"
"wood carving expert sandalwood"
```

### 2. Filtered Search
```javascript
// Search with filters
{
  query: "traditional jewelry",
  profession: "jewelry",
  location: "Rajasthan",
  maxResults: 10
}
```

### 3. Similarity Matching
- Uses Gemini AI embeddings (768 dimensions)
- Cosine similarity calculation
- Configurable similarity threshold
- Ranked results by relevance

## 🛠️ API Endpoints

### Intelligent Match API
```bash
POST /api/intelligent-match
{
  "query": "pottery maker traditional designs",
  "maxResults": 10,
  "includeUnavailable": false
}
```

### Vector Embeddings API
```bash
# Generate embeddings for a user
POST /api/vector-embeddings
{
  "action": "store_user_embeddings",
  "userId": "artisan_001"
}

# Search using vectors
POST /api/vector-embeddings
{
  "action": "search_artisans",
  "query": "traditional pottery",
  "options": { "maxResults": 5 }
}

# Get analytics
GET /api/vector-embeddings?action=analytics
```

### Design Generation API
```bash
POST /api/design/generate
{
  "prompt": "traditional pottery water pot",
  "artisanSpecialization": "pottery",
  "conversationContext": { ... }
}
```

## 🧪 Testing

### Test Data Available
- **10 Artisans**: Different specializations across India
- **10 Buyers**: Various professions and preferences
- **20+ Products**: Realistic pricing and descriptions
- **Vector Embeddings**: AI-generated for semantic search

### Test Queries
```javascript
const testQueries = [
  "pottery maker in Jaipur",
  "jewelry designer with kundan work", 
  "textile weaver traditional fabrics",
  "wood carving expert",
  "metal work brass items"
];
```

### Expected Results
- Each query should return relevant artisans
- Similarity scores between 0.3-1.0
- Results ranked by relevance
- Fallback to traditional search if needed

## 📈 Performance

### Vector Search Benefits
- **Semantic Understanding**: Matches intent, not just keywords
- **Cultural Context**: Understands craft terminology
- **Multilingual Support**: Works across languages
- **Scalable**: Efficient similarity calculations

### Firestore Advantages
- **Real-time Updates**: Live data synchronization
- **Scalability**: Auto-scaling with usage
- **Security**: Built-in security rules
- **Offline Support**: Client-side caching

## 🔧 Configuration

### Environment Variables
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config

# AI Services
GEMINI_API_KEY=your_gemini_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:9003
```

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    // Products collection
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Vector embeddings
    match /user_embeddings/{embeddingId} {
      allow read, write: if request.auth != null;
    }
    
    // Chat sessions
    match /enhanced_chat_sessions/{sessionId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Embedding Generation Fails**
   ```bash
   # Check Gemini API key
   echo $GEMINI_API_KEY
   
   # Test API directly
   curl -X POST /api/vector-embeddings -d '{"action":"health"}'
   ```

2. **Search Returns No Results**
   ```bash
   # Check if embeddings exist
   curl -X GET /api/vector-embeddings?action=analytics
   
   # Regenerate embeddings
   npm run migrate:vectors
   ```

3. **Firestore Permission Errors**
   - Check Firebase project configuration
   - Verify security rules
   - Ensure authentication is set up

### Debug Mode
```javascript
// Enable debug logging
localStorage.setItem('debug', 'firestore,vector,search');
```

## 🎯 Next Steps

After successful migration:

1. **Test Enhanced Chat**: Visit `/enhanced-chat`
2. **Try Artisan Tools**: Use design generation features
3. **Monitor Performance**: Check analytics regularly
4. **Optimize Queries**: Adjust similarity thresholds
5. **Scale Up**: Add more users and products

## 📚 Additional Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Gemini AI Embeddings](https://ai.google.dev/docs/embeddings_guide)
- [Vector Search Best Practices](https://cloud.google.com/blog/topics/developers-practitioners/find-anything-blazingly-fast-googles-vector-search-technology)

## 🤝 Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set
3. Ensure Firebase project is properly configured
4. Test individual API endpoints
5. Check Firestore security rules

The migration provides a robust, scalable foundation for the Enhanced Multilingual Chat feature with AI-powered semantic search capabilities.