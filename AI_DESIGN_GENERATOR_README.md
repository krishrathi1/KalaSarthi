# AI Design Generator

## Overview

The AI Design Generator is a powerful feature that allows artisans to generate color variations of their products using Google's Vertex AI Imagen model. This tool helps artisans visualize their products in different colors before production, enabling better design decisions and customer presentations.

## Features

### 1. Product Selection
- Artisans can view all their published products
- Only products with images are available for design generation
- Easy-to-use grid interface for product selection

### 2. Style Selection
Choose from 6 different artistic styles:
- **Traditional**: Classic Indian handicraft style
- **Modern**: Contemporary minimalist design
- **Vibrant**: Bold and energetic patterns
- **Elegant**: Sophisticated and refined
- **Rustic**: Natural and earthy
- **Festive**: Celebratory and decorative

### 3. Color Variations
- Select up to 6 colors at once
- 10 pre-defined colors available:
  - Red, Blue, Green, Yellow, Purple
  - Pink, Orange, Teal, Indigo, Brown
- Visual color picker with hex color display

### 4. AI-Powered Generation
- Uses Google Vertex AI Imagen model
- Generates high-quality design variations
- Maintains product structure while changing colors
- Professional product photography quality

### 5. Download & Save
- Download generated variations
- Save for future reference
- Use in product listings

## Technical Implementation

### Authentication & Authorization
- Uses `auth-context` to get current user profile
- Only accessible to artisans (role check)
- Fetches products using artisan's UID

### API Endpoints

#### GET `/api/products?artisanId={uid}`
Fetches all products for the authenticated artisan.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "productId": "string",
      "name": "string",
      "images": ["string"],
      "price": number,
      "status": "published" | "draft" | "archived"
    }
  ]
}
```

#### POST `/api/ai-design/generate-variations`
Generates color variations using Vertex AI Imagen.

**Request:**
```json
{
  "productId": "string",
  "productName": "string",
  "originalImageUrl": "string",
  "colors": ["red", "blue", "green"],
  "style": "traditional"
}
```

**Response:**
```json
{
  "success": true,
  "productId": "string",
  "productName": "string",
  "variations": [
    {
      "color": "red",
      "imageUrl": "string",
      "prompt": "string"
    }
  ],
  "count": 3,
  "message": "Successfully generated 3 design variations"
}
```

### Vertex AI Configuration

The service uses `key.json` for authentication:

```typescript
// Location: src/lib/vertex-ai-service.ts
const keyPath = path.join(process.cwd(), 'key.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
```

**Key Configuration:**
- Project ID: `kalamitra-470611`
- Location: `us-central1`
- Model: `imagegeneration@006`
- Service Account: `vertex-ai-user@kalamitra-470611.iam.gserviceaccount.com`

### Prompt Engineering

The service builds intelligent prompts based on:
1. Product name
2. Target color
3. Selected style
4. Quality requirements

Example prompt:
```
Create a beautiful red colored variation of this Handwoven Saree design 
with traditional Indian handicraft patterns and motifs. Keep the same 
product structure and form, only change the color scheme to red. 
High quality, professional product photography, well-lit, clean background.
```

## User Flow

1. **Navigate to AI Design Generator**
   - From Profile page: Click "AI Design Generator" button
   - From Dashboard: Click "AI Design Generator" card

2. **Select Product**
   - Browse published products
   - Click on desired product
   - Product image and details displayed

3. **Choose Style**
   - Select artistic style (Traditional, Modern, etc.)
   - Style affects the generation prompt

4. **Select Colors**
   - Click on color swatches to select/deselect
   - Maximum 6 colors per generation
   - Counter shows selected colors

5. **Generate Variations**
   - Click "Generate Design Variations" button
   - AI processes the request (may take 10-30 seconds)
   - Progress indicator shown

6. **View & Download Results**
   - Generated variations appear in grid
   - Each variation shows the color name
   - Download button for each variation
   - Images saved with descriptive names

## Access Points

### From Profile Page
```tsx
// Button added to profile header for artisans
<Button onClick={() => router.push('/ai-design-generator')}>
  <Sparkles className="h-4 w-4 mr-2" />
  AI Design Generator
</Button>
```

### From Dashboard
```tsx
// Feature card in main dashboard
{
  title: 'AI Design Generator',
  description: 'Generate color variations of your products...',
  icon: Palette,
  path: '/ai-design-generator',
  color: 'text-purple-500'
}
```

## Error Handling

The system handles various error scenarios:

1. **No Products**: Shows message to publish products first
2. **No Colors Selected**: Toast notification to select colors
3. **API Errors**: Detailed error messages with retry option
4. **Generation Failures**: Graceful fallback with error details
5. **Network Issues**: Timeout handling and retry logic

## Performance Considerations

- **Lazy Loading**: Products loaded only when needed
- **Optimized Images**: Next.js Image component for optimization
- **Batch Processing**: Multiple colors processed efficiently
- **Caching**: Generated variations can be cached
- **Rate Limiting**: Maximum 6 colors per request

## Security

- **Authentication Required**: Only logged-in artisans can access
- **Authorization Check**: Role-based access control
- **Product Ownership**: Only artisan's own products shown
- **API Key Security**: Credentials stored in key.json (not in code)
- **Input Validation**: All inputs validated before processing

## Future Enhancements

1. **Save Variations**: Save generated variations to product
2. **Batch Generation**: Generate for multiple products at once
3. **Custom Colors**: Allow custom hex color input
4. **Style Transfer**: Upload reference images for style
5. **A/B Testing**: Compare variations with analytics
6. **Social Sharing**: Share variations on social media
7. **Customer Feedback**: Let customers vote on variations
8. **Inventory Integration**: Link variations to inventory

## Troubleshooting

### Issue: No products showing
**Solution**: Ensure you have published products with images

### Issue: Generation fails
**Solution**: 
- Check Vertex AI credentials in key.json
- Verify project ID and permissions
- Check API quotas in Google Cloud Console

### Issue: Slow generation
**Solution**:
- Reduce number of colors selected
- Check network connection
- Vertex AI may be under load (retry later)

### Issue: Poor quality results
**Solution**:
- Use high-quality original images
- Try different style options
- Adjust prompt in vertex-ai-service.ts

## Dependencies

```json
{
  "@google-cloud/vertexai": "^1.10.0",
  "next": "latest",
  "react": "latest",
  "lucide-react": "latest"
}
```

## File Structure

```
KalaBandhu/
├── src/
│   ├── app/
│   │   ├── ai-design-generator/
│   │   │   └── page.tsx                    # Main UI component
│   │   └── api/
│   │       └── ai-design/
│   │           └── generate-variations/
│   │               └── route.ts            # API endpoint
│   ├── lib/
│   │   ├── vertex-ai-service.ts           # Vertex AI integration
│   │   └── i18n.ts                        # Feature registration
│   └── context/
│       └── auth-context.tsx               # Authentication
└── key.json                               # Vertex AI credentials
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Vertex AI documentation
3. Check Google Cloud Console for API status
4. Contact development team

## License

This feature is part of KalaBandhu platform and follows the same license terms.
