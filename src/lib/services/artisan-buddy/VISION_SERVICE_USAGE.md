# Vision Service Usage Guide

## Overview

The Vision Service provides comprehensive image analysis capabilities for the Artisan Buddy chatbot, including:

- Image upload handling and validation
- Image preprocessing and optimization
- Craft-specific image analysis
- Material and technique identification
- Quality assessment and improvement suggestions
- Text extraction from images (OCR)
- Multilingual text handling
- Structured data extraction

## Requirements

This service implements the following requirements:
- **5.1**: Image upload and analysis using Google Cloud Vision API
- **5.2**: Craft type, material, and quality identification
- **5.3**: Quality assessment and improvement suggestions
- **5.4**: Text extraction and multilingual handling
- **5.5**: Poor image quality detection and guidance

## Installation

The Vision Service is part of the Artisan Buddy services and requires:

```bash
npm install @google-cloud/vision
```

## Configuration

Set the following environment variables:

```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PRIVATE_KEY=your-private-key
GOOGLE_CLOUD_CLIENT_EMAIL=your-client-email
REDIS_URL=redis://localhost:6379
```

## Basic Usage

### 1. Import the Service

```typescript
import { visionService } from '@/lib/services/artisan-buddy';
```

### 2. Analyze an Image

```typescript
const result = await visionService.analyzeImage(imageUrl, {
  includeCraftDetection: true,
  includeTextExtraction: false,
});

console.log('Craft Type:', result.craftDetection?.craftType);
console.log('Materials:', result.craftDetection?.materials);
console.log('Quality Score:', result.imageAnalysis.quality.overallScore);
```

### 3. Extract Text from Image

```typescript
const textResult = await visionService.extractText(imageUrl);
console.log('Extracted Text:', textResult.text);
console.log('Language:', textResult.language);
```

### 4. Get Improvement Suggestions

```typescript
const suggestions = visionService.generateImprovementSuggestions(
  result.imageAnalysis,
  result.craftDetection
);

console.log('Suggestions:', suggestions);
```

## API Endpoint

### POST /api/artisan-buddy/vision

Analyze an image with full pipeline.

**Request Body:**

```json
{
  "imageUrl": "https://example.com/image.jpg",
  "options": {
    "includeCraftDetection": true,
    "includeTextExtraction": false,
    "craftAnalysisOptions": {
      "detectMaterials": true,
      "detectTechniques": true,
      "detectRegion": true,
      "generateSuggestions": true
    }
  }
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "imageAnalysis": {
      "labels": [...],
      "colors": [...],
      "objects": [...],
      "quality": {
        "sharpness": 0.8,
        "brightness": 0.7,
        "composition": 0.8,
        "overallScore": 0.77,
        "improvements": [...]
      },
      "suggestions": [...]
    },
    "craftDetection": {
      "craftType": "pottery",
      "confidence": 0.85,
      "materials": ["clay", "ceramic"],
      "techniques": ["handmade", "molded"],
      "region": "Rajasthan"
    },
    "processingTime": 1234,
    "cached": false,
    "suggestions": [...]
  }
}
```

## Advanced Features

### Image Upload Validation

```typescript
const validation = visionService.validateImageUpload(file, {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
});

if (!validation.valid) {
  console.error('Validation error:', validation.error);
}
```

### Image Preprocessing

```typescript
const processedUrl = await visionService.preprocessImage(imageUrl, {
  resize: { width: 1024, height: 1024 },
  compress: true,
  quality: 85,
  format: 'jpeg',
});
```

### Craft-Specific Analysis

```typescript
const craftDetection = await visionService.detectCraftType(imageAnalysis, {
  detectMaterials: true,
  detectTechniques: true,
  detectRegion: true,
  generateSuggestions: true,
});
```

### Material Identification

```typescript
const materials = visionService.identifyMaterials(imageAnalysis);
console.log('Identified materials:', materials);
```

### Quality Assessment

```typescript
const quality = visionService.assessQuality(imageAnalysis);
console.log('Quality score:', quality.overallScore);
console.log('Improvements:', quality.improvements);
```

### Text Extraction Features

#### Extract Product Labels

```typescript
const textExtraction = await visionService.extractText(imageUrl);
const labels = visionService.extractProductLabels(textExtraction);
console.log('Product labels:', labels);
```

#### Extract Handwritten Notes

```typescript
const handwrittenNotes = visionService.extractHandwrittenNotes(textExtraction);
console.log('Handwritten notes:', handwrittenNotes);
```

#### Multilingual Text Extraction

```typescript
const multilingualResult = await visionService.extractMultilingualText(imageUrl);
console.log('Text:', multilingualResult.text);
console.log('Language:', multilingualResult.language);
```

#### Create Structured Data

```typescript
const structuredData = visionService.createStructuredData(textExtraction);
console.log('Structured data:', structuredData);
// Output: { fullText, language, confidence, labels, price, dimensions, weight }
```

## Supported Craft Types

The Vision Service can detect the following craft types:

- **Pottery**: ceramic, clay, terracotta, earthenware
- **Weaving**: textile, fabric, loom, handloom
- **Metalwork**: brass, copper, bronze, silver, gold
- **Woodcarving**: wood carving, wooden sculpture
- **Painting**: art, canvas, miniature, madhubani, warli
- **Embroidery**: chikankari, needlework, stitching
- **Jewelry**: necklace, bracelet, earring, ornament
- **Leather**: hide, suede, bag, wallet, belt
- **Bamboo**: cane, rattan, basket, wicker
- **Stone**: marble, granite, sculpture

## Supported Materials

- Cotton, Silk, Wool, Jute
- Clay, Ceramic, Terracotta
- Wood, Bamboo
- Metal, Brass, Copper, Silver, Gold
- Leather
- Stone, Marble
- Glass
- Fabric, Thread, Yarn

## Supported Techniques

- Handmade, Hand-woven, Hand-painted
- Carved, Engraved, Etched
- Embroidered, Stitched
- Molded, Cast, Forged
- Dyed, Printed, Block-printed, Tie-dyed

## Regional Styles

The service can identify regional craft styles from:

- Rajasthan (Jaipur, Jodhpur, block print)
- Gujarat (Kutch, bandhani, patola)
- West Bengal (terracotta, dokra)
- Tamil Nadu (Tanjore, Kanchipuram)
- Kashmir (pashmina, papier-mache)
- Uttar Pradesh (Lucknow, chikankari, zardozi)
- Maharashtra (Warli, Kolhapuri)

## Caching

The Vision Service uses Redis caching with a 7-day TTL to improve performance:

- Image analysis results are cached by image URL hash
- Text extraction results are cached separately
- Cache can be cleared using `visionService.clearCache()`

## Error Handling

The service provides comprehensive error handling:

```typescript
try {
  const result = await visionService.analyzeImage(imageUrl);
} catch (error) {
  if (error.message.includes('Image analysis failed')) {
    // Handle analysis error
  } else if (error.message.includes('Image upload failed')) {
    // Handle upload error
  }
}
```

## Performance Considerations

- **Caching**: Results are cached for 7 days to reduce API calls
- **Preprocessing**: Images are preprocessed to optimize analysis
- **Batch Processing**: Not yet implemented (future enhancement)
- **Rate Limiting**: Handled by Google Cloud Vision API

## Integration with Artisan Buddy

The Vision Service integrates with other Artisan Buddy components:

1. **Conversation Manager**: Handles image messages
2. **Intent Classifier**: Detects image analysis intents
3. **Response Generator**: Generates responses based on analysis
4. **Translation Service**: Translates extracted text

## Example: Complete Workflow

```typescript
// 1. User uploads image
const imageUrl = await visionService.handleImageUpload(file, userId);

// 2. Analyze image
const analysis = await visionService.analyzeImage(imageUrl, {
  includeCraftDetection: true,
  includeTextExtraction: true,
});

// 3. Generate suggestions
const suggestions = visionService.generateImprovementSuggestions(
  analysis.imageAnalysis,
  analysis.craftDetection!
);

// 4. Extract structured data if text found
let structuredData = {};
if (analysis.textExtraction) {
  structuredData = visionService.createStructuredData(analysis.textExtraction);
}

// 5. Generate response
const response = {
  craftType: analysis.craftDetection?.craftType,
  materials: analysis.craftDetection?.materials,
  quality: analysis.imageAnalysis.quality.overallScore,
  suggestions,
  extractedData: structuredData,
};
```

## Testing

Run the test script:

```bash
node test-vision-service.js
```

Or use the API endpoint:

```bash
curl -X POST http://localhost:9003/api/artisan-buddy/vision \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "options": {
      "includeCraftDetection": true,
      "includeTextExtraction": false
    }
  }'
```

## Future Enhancements

- [ ] Batch image processing
- [ ] Real image preprocessing with Sharp library
- [ ] Cloud storage integration for uploads
- [ ] Advanced handwriting recognition
- [ ] Product similarity matching
- [ ] Defect detection
- [ ] Style transfer suggestions
- [ ] AR visualization integration

## Troubleshooting

### Common Issues

1. **Google Cloud credentials not found**
   - Ensure environment variables are set correctly
   - Check that the service account has Vision API permissions

2. **Image URL not accessible**
   - Verify the image URL is publicly accessible
   - Check for CORS issues

3. **Low confidence scores**
   - Improve image quality (lighting, focus, composition)
   - Use higher resolution images
   - Ensure the subject is clearly visible

4. **Text extraction fails**
   - Check if the image contains readable text
   - Improve image quality and contrast
   - Ensure text is not too small or blurry

## Support

For issues or questions, refer to:
- [Google Cloud Vision API Documentation](https://cloud.google.com/vision/docs)
- [Artisan Buddy Design Document](./design.md)
- [Requirements Document](./requirements.md)
