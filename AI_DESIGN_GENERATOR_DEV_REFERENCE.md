# AI Design Generator - Developer Reference

## Quick Reference

### File Locations

```
src/
├── app/
│   ├── ai-design-generator/
│   │   └── page.tsx                          # Main UI
│   └── api/
│       └── ai-design/
│           └── generate-variations/
│               └── route.ts                  # API endpoint
├── lib/
│   ├── vertex-ai-service.ts                 # Vertex AI service
│   └── i18n.ts                              # Feature config
└── context/
    └── auth-context.tsx                     # Auth (existing)
```

### Key Components

#### 1. Vertex AI Service

```typescript
// src/lib/vertex-ai-service.ts
import { getVertexAIService } from "@/lib/vertex-ai-service";

const service = getVertexAIService();
const variations = await service.generateDesignVariations(
  imageUrl,
  productName,
  ["red", "blue"],
  "traditional"
);
```

#### 2. API Endpoint

```typescript
// POST /api/ai-design/generate-variations
const response = await fetch("/api/ai-design/generate-variations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productId: "prod_123",
    productName: "Saree",
    originalImageUrl: "https://...",
    colors: ["red", "blue"],
    style: "traditional",
  }),
});
```

#### 3. UI Component

```typescript
// src/app/ai-design-generator/page.tsx
import { useAuth } from "@/context/auth-context";

const { userProfile } = useAuth();
// Fetch products
const response = await fetch(`/api/products?artisanId=${userProfile.uid}`);
```

### Authentication Flow

```typescript
// 1. Get user from auth context
const { userProfile, loading } = useAuth();

// 2. Check role
if (userProfile?.role !== "artisan") {
  // Show access denied
}

// 3. Fetch artisan's products
const products = await fetch(`/api/products?artisanId=${userProfile.uid}`);
```

### Data Models

#### Product (from existing model)

```typescript
interface IProductDocument {
  productId: string;
  artisanId: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  status: "published" | "draft" | "archived";
  // ... other fields
}
```

#### Color Variation

```typescript
interface ColorVariation {
  color: string;
  imageUrl: string;
  prompt: string;
}
```

#### API Request

```typescript
interface GenerateVariationsRequest {
  productId: string;
  productName: string;
  originalImageUrl: string;
  colors: string[];
  style: string;
}
```

#### API Response

```typescript
interface GenerateVariationsResponse {
  success: boolean;
  productId: string;
  productName: string;
  variations: ColorVariation[];
  count: number;
  message: string;
}
```

### Environment Setup

#### Required Files

```bash
# Project root
key.json                    # Vertex AI credentials
```

#### Credentials Structure

```json
{
  "type": "service_account",
  "project_id": "kalamitra-470611",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "vertex-ai-user@kalamitra-470611.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### Vertex AI Configuration

```typescript
// Model Configuration
const config = {
  project: "kalamitra-470611",
  location: "us-central1",
  model: "imagegeneration@006",
};

// Request Parameters
const params = {
  sampleCount: 1,
  aspectRatio: "1:1",
  safetySetting: "block_some",
  personGeneration: "allow_adult",
};
```

### Prompt Templates

```typescript
const promptTemplate = `
Create a beautiful ${color} colored variation of this ${productName} design.
${styleDescription}.
Keep the same product structure and form, only change the color scheme to ${color}.
High quality, professional product photography, well-lit, clean background.
`;

const styleDescriptions = {
  traditional: "with traditional Indian handicraft patterns and motifs",
  modern: "with contemporary, minimalist aesthetic",
  vibrant: "with bold, vibrant colors and energetic patterns",
  elegant: "with sophisticated, elegant details",
  rustic: "with natural, rustic textures",
  festive: "with festive, celebratory decorations",
};
```

### Error Handling

```typescript
try {
  const variations = await generateVariations(...);
} catch (error) {
  if (error.message.includes('quota')) {
    // Handle quota exceeded
  } else if (error.message.includes('permission')) {
    // Handle permission denied
  } else if (error.message.includes('safety')) {
    // Handle safety filter
  } else {
    // Generic error
  }
}
```

### State Management

```typescript
// Component State
const [products, setProducts] = useState<IProductDocument[]>([]);
const [selectedProduct, setSelectedProduct] = useState<IProductDocument | null>(
  null
);
const [selectedColors, setSelectedColors] = useState<string[]>([]);
const [selectedStyle, setSelectedStyle] = useState("traditional");
const [generating, setGenerating] = useState(false);
const [variations, setVariations] = useState<ColorVariation[]>([]);
```

### API Integration

```typescript
// Fetch Products
const fetchProducts = async () => {
  const response = await fetch(`/api/products?artisanId=${userProfile.uid}`);
  const result = await response.json();
  if (result.success) {
    setProducts(
      result.data.filter(
        (p) => p.status === "published" && p.images?.length > 0
      )
    );
  }
};

// Generate Variations
const generateVariations = async () => {
  setGenerating(true);
  try {
    const response = await fetch("/api/ai-design/generate-variations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selectedProduct.productId,
        productName: selectedProduct.name,
        originalImageUrl: selectedProduct.images[0],
        colors: selectedColors,
        style: selectedStyle,
      }),
    });
    const result = await response.json();
    if (result.success) {
      setVariations(result.variations);
    }
  } finally {
    setGenerating(false);
  }
};
```

### Testing

#### Unit Tests

```typescript
// Test Vertex AI Service
describe("VertexAIImageService", () => {
  it("should generate variations", async () => {
    const service = getVertexAIService();
    const variations = await service.generateDesignVariations(
      "https://example.com/image.jpg",
      "Test Product",
      ["red", "blue"],
      "traditional"
    );
    expect(variations).toHaveLength(2);
  });
});
```

#### Integration Tests

```typescript
// Test API Endpoint
describe("POST /api/ai-design/generate-variations", () => {
  it("should return variations", async () => {
    const response = await fetch("/api/ai-design/generate-variations", {
      method: "POST",
      body: JSON.stringify({
        productName: "Test",
        originalImageUrl: "https://...",
        colors: ["red"],
        style: "traditional",
      }),
    });
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

### Performance Optimization

```typescript
// Lazy load products
useEffect(() => {
  if (userProfile?.uid) {
    fetchProducts();
  }
}, [userProfile]);

// Debounce color selection
const debouncedColorSelect = useMemo(() => debounce(toggleColor, 300), []);

// Optimize images
<Image
  src={product.images[0]}
  alt={product.name}
  fill
  className="object-cover"
  loading="lazy"
/>;
```

### Security Checklist

- [x] Authentication required (AuthGuard)
- [x] Role-based access (artisan only)
- [x] Product ownership validation
- [x] Input validation (colors, style)
- [x] Rate limiting (max 6 colors)
- [x] API key security (key.json)
- [x] Error message sanitization

### Monitoring

```typescript
// Log generation requests
console.log(`Generating ${colors.length} variations for ${productName}`);

// Track errors
console.error("Generation failed:", error);

// Monitor performance
const startTime = Date.now();
// ... generation ...
const duration = Date.now() - startTime;
console.log(`Generation took ${duration}ms`);
```

### Debugging

```typescript
// Enable debug mode
const DEBUG = process.env.NODE_ENV === "development";

if (DEBUG) {
  console.log("Request:", request);
  console.log("Response:", response);
  console.log("Variations:", variations);
}

// Check Vertex AI credentials
console.log("Project ID:", credentials.project_id);
console.log("Service Account:", credentials.client_email);
```

### Common Issues

#### Issue: Module not found

```bash
# Install dependencies
npm install @google-cloud/vertexai
```

#### Issue: Authentication failed

```bash
# Check key.json exists
ls -la key.json

# Verify credentials
cat key.json | jq .project_id
```

#### Issue: API quota exceeded

```typescript
// Check quotas in Google Cloud Console
// Implement exponential backoff
const retryWithBackoff = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
};
```

### Deployment

```bash
# Build
npm run build

# Check for errors
npm run typecheck

# Deploy
npm run deploy
```

### Useful Commands

```bash
# Start dev server
npm run dev

# Check types
npm run typecheck

# Lint code
npm run lint

# Test API
curl -X POST http://localhost:9003/api/ai-design/generate-variations \
  -H "Content-Type: application/json" \
  -d '{"productName":"Test","originalImageUrl":"https://...","colors":["red"],"style":"traditional"}'
```

### Resources

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Imagen API Reference](https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [React Hooks](https://react.dev/reference/react)

### Support

For issues:

1. Check console logs
2. Verify credentials
3. Test API endpoint
4. Check Google Cloud Console
5. Contact team lead

---

**Last Updated:** 2025-01-XX
**Version:** 1.0.0
**Maintainer:** Development Team
