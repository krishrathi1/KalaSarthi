# AI Design Generator - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                  (ai-design-generator/page.tsx)                 │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Product    │  │    Style     │  │    Color     │        │
│  │  Selection   │  │  Selection   │  │  Selection   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │          Generate Variations Button                   │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │          Results Grid with Download                   │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                               │
│            (api/ai-design/generate-variations/route.ts)         │
│                                                                 │
│  1. Validate Request                                            │
│  2. Check Authentication                                        │
│  3. Validate Colors & Style                                     │
│  4. Call Vertex AI Service                                      │
│  5. Return Results                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Function Call
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vertex AI Service                            │
│                  (lib/vertex-ai-service.ts)                     │
│                                                                 │
│  1. Load Credentials (key.json)                                 │
│  2. Initialize Vertex AI Client                                 │
│  3. Build Prompts                                               │
│  4. Generate Variations                                         │
│  5. Process Results                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API Call
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Vertex AI                             │
│                      (Imagen Model)                             │
│                                                                 │
│  - Project: kalamitra-470611                                    │
│  - Location: us-central1                                        │
│  - Model: imagegeneration@006                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────┐
│  Artisan │
└────┬─────┘
     │
     │ 1. Login
     ▼
┌──────────────┐
│ Auth Context │ ◄─── Firebase Auth
└────┬─────────┘
     │
     │ 2. Get userProfile.uid
     ▼
┌──────────────────┐
│ Product API      │
│ GET /api/products│
│ ?artisanId={uid} │
└────┬─────────────┘
     │
     │ 3. Return Products
     ▼
┌──────────────────┐
│ UI: Product Grid │
└────┬─────────────┘
     │
     │ 4. Select Product, Style, Colors
     ▼
┌──────────────────────────┐
│ POST /api/ai-design/     │
│ generate-variations      │
│                          │
│ Body:                    │
│ - productId              │
│ - productName            │
│ - originalImageUrl       │
│ - colors: [...]          │
│ - style                  │
└────┬─────────────────────┘
     │
     │ 5. Process Request
     ▼
┌──────────────────────────┐
│ Vertex AI Service        │
│                          │
│ For each color:          │
│ - Build prompt           │
│ - Call Imagen API        │
│ - Process response       │
└────┬─────────────────────┘
     │
     │ 6. Return Variations
     ▼
┌──────────────────────────┐
│ Response:                │
│ {                        │
│   success: true,         │
│   variations: [          │
│     {                    │
│       color: "red",      │
│       imageUrl: "...",   │
│       prompt: "..."      │
│     }                    │
│   ]                      │
│ }                        │
└────┬─────────────────────┘
     │
     │ 7. Display Results
     ▼
┌──────────────────────────┐
│ UI: Results Grid         │
│ - Show variations        │
│ - Enable download        │
└──────────────────────────┘
```

## Component Hierarchy

```
AIDesignGeneratorPage
│
├── AuthGuard
│   └── Authentication Check
│
├── Header
│   ├── Back Button
│   └── Title & Description
│
├── Left Column
│   │
│   ├── Product Selection Card
│   │   ├── Card Header
│   │   └── Product Grid
│   │       └── Product Items
│   │           ├── Image
│   │           ├── Name
│   │           └── Price
│   │
│   ├── Style Selection Card (if product selected)
│   │   ├── Card Header
│   │   └── Style Grid
│   │       └── Style Buttons
│   │
│   └── Color Selection Card (if product selected)
│       ├── Card Header
│       ├── Color Grid
│       │   └── Color Buttons
│       └── Generate Button
│
└── Right Column
    └── Results Card
        ├── Card Header
        └── Variations Grid
            └── Variation Items
                ├── Image
                ├── Color Name
                └── Download Button
```

## State Management

```
Component State
│
├── products: IProductDocument[]
│   └── Fetched from API on mount
│
├── selectedProduct: IProductDocument | null
│   └── Updated on product click
│
├── selectedColors: string[]
│   └── Updated on color toggle
│
├── selectedStyle: string
│   └── Updated on style click
│
├── generating: boolean
│   └── True during API call
│
└── variations: ColorVariation[]
    └── Updated on API response
```

## Authentication Flow

```
┌──────────────┐
│ Page Load    │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ useAuth() Hook   │
└──────┬───────────┘
       │
       ├─── loading: true ──► Show Loader
       │
       ├─── userProfile: null ──► Show "Access Denied"
       │
       └─── userProfile.role !== 'artisan' ──► Show "Access Denied"
       │
       └─── userProfile.role === 'artisan' ──► Show Page
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │ Fetch        │
                                         │ Products     │
                                         └──────────────┘
```

## API Request/Response Flow

```
Client Request
│
├── Headers
│   └── Content-Type: application/json
│
└── Body
    ├── productId: string
    ├── productName: string
    ├── originalImageUrl: string
    ├── colors: string[]
    └── style: string
    
    ▼
    
Server Processing
│
├── 1. Parse Request
├── 2. Validate Fields
├── 3. Check Color Limit
├── 4. Initialize Vertex AI
├── 5. For Each Color:
│   ├── Build Prompt
│   ├── Call Imagen API
│   └── Process Response
└── 6. Return Results

    ▼
    
Server Response
│
├── Success
│   ├── success: true
│   ├── productId: string
│   ├── productName: string
│   ├── variations: Array
│   ├── count: number
│   └── message: string
│
└── Error
    ├── success: false
    ├── error: string
    └── details: string (optional)
```

## Vertex AI Integration

```
Vertex AI Service
│
├── Constructor
│   ├── Load key.json
│   ├── Set GOOGLE_APPLICATION_CREDENTIALS
│   ├── Initialize VertexAI client
│   │   ├── project: kalamitra-470611
│   │   └── location: us-central1
│   └── Get Imagen model
│       └── model: imagegeneration@006
│
├── generateDesignVariations()
│   ├── Input
│   │   ├── originalImageUrl
│   │   ├── productName
│   │   ├── colors[]
│   │   └── style
│   │
│   ├── Process
│   │   └── For each color:
│   │       ├── buildPrompt()
│   │       ├── Create request
│   │       │   ├── prompt
│   │       │   ├── referenceImages
│   │       │   └── parameters
│   │       ├── Call model.generateContent()
│   │       └── Extract image data
│   │
│   └── Output
│       └── variations[]
│           ├── color
│           ├── imageUrl
│           └── prompt
│
└── buildPrompt()
    ├── Base prompt
    ├── Style description
    └── Quality requirements
```

## Error Handling Flow

```
Error Occurs
│
├── Network Error
│   └── Show: "Network error. Check connection."
│
├── Authentication Error
│   └── Show: "Authentication failed. Please login."
│
├── Validation Error
│   └── Show: "Invalid input. Check selections."
│
├── Quota Error
│   └── Show: "API quota exceeded. Try later."
│
├── Safety Filter
│   └── Show: "Content blocked. Try different prompt."
│
└── Unknown Error
    └── Show: "Generation failed. Please retry."
    
    ▼
    
User Action
│
├── Retry Button
├── Change Selections
└── Contact Support
```

## Security Layers

```
┌─────────────────────────────────────┐
│ Layer 1: Route Protection           │
│ - AuthGuard component               │
│ - Redirects unauthenticated users   │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Layer 2: Role Check                 │
│ - Verify userProfile.role           │
│ - Only allow artisans               │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Layer 3: Product Ownership          │
│ - Fetch by artisanId                │
│ - Only show own products            │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Layer 4: Input Validation           │
│ - Validate colors                   │
│ - Validate style                    │
│ - Limit to 6 colors                 │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Layer 5: API Security               │
│ - Credentials in key.json           │
│ - Not exposed to client             │
│ - Server-side only                  │
└─────────────────────────────────────┘
```

## Performance Optimization

```
Optimization Strategy
│
├── Frontend
│   ├── Lazy load products
│   ├── Next.js Image optimization
│   ├── Efficient state updates
│   └── Debounced interactions
│
├── API
│   ├── Batch color processing
│   ├── Parallel generation
│   ├── Response caching
│   └── Error recovery
│
└── Vertex AI
    ├── Optimized prompts
    ├── Efficient parameters
    ├── Retry logic
    └── Timeout handling
```

## Deployment Architecture

```
Production Environment
│
├── Frontend (Next.js)
│   ├── Static pages
│   ├── Client components
│   └── API routes
│
├── Backend Services
│   ├── Authentication (Firebase)
│   ├── Database (MongoDB)
│   └── File Storage
│
├── Google Cloud
│   ├── Vertex AI
│   ├── Service Account
│   └── API Keys
│
└── Monitoring
    ├── Error tracking
    ├── Performance metrics
    └── Usage analytics
```

## File Structure

```
KalaBandhu/
│
├── src/
│   ├── app/
│   │   ├── ai-design-generator/
│   │   │   └── page.tsx ..................... Main UI
│   │   └── api/
│   │       └── ai-design/
│   │           └── generate-variations/
│   │               └── route.ts ............. API endpoint
│   │
│   ├── lib/
│   │   ├── vertex-ai-service.ts ............ Vertex AI integration
│   │   ├── models/
│   │   │   └── Product.ts .................. Product model
│   │   └── i18n.ts ......................... Feature config
│   │
│   ├── context/
│   │   └── auth-context.tsx ................ Authentication
│   │
│   └── components/
│       ├── ui/ ............................. UI components
│       └── auth/
│           └── AuthGuard.tsx ............... Route protection
│
├── key.json ................................ Vertex AI credentials
│
└── Documentation/
    ├── AI_DESIGN_GENERATOR_README.md
    ├── AI_DESIGN_GENERATOR_IMPLEMENTATION.md
    ├── AI_DESIGN_GENERATOR_GUIDE.md
    ├── AI_DESIGN_GENERATOR_DEV_REFERENCE.md
    ├── AI_DESIGN_GENERATOR_SUMMARY.md
    ├── AI_DESIGN_GENERATOR_CHECKLIST.md
    └── AI_DESIGN_GENERATOR_ARCHITECTURE.md ... This file
```

---

**Last Updated**: October 25, 2025
**Version**: 1.0.0
