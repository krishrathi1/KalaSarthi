# Vertex AI Imagen Integration Documentation

## Overview

This document describes the comprehensive Vertex AI Imagen integration for the KalaSarthi GenAI Exchange platform. The system uses only Vertex AI Imagen model for image generation with robust error handling, fallback mechanisms, and retry logic.

## Key Features

### ✅ Vertex AI Imagen Only
- **No simplified images**: Uses only Vertex AI Imagen model (`imagegeneration@006`)
- **Production-ready**: Full integration with Google Cloud Vertex AI
- **High-quality generation**: Professional-grade image variations

### ✅ Comprehensive Error Handling
- **API Quota Management**: Handles quota exceeded errors gracefully
- **Permission Validation**: Checks for proper GCP permissions
- **Safety Filter Compliance**: Manages content blocked by safety filters
- **Network Resilience**: Handles timeouts and network issues
- **Retry Logic**: Automatic retry with exponential backoff

### ✅ Fallback Mechanisms
- **Multiple Retry Attempts**: Up to 3 attempts per generation request
- **Individual Color Fallbacks**: Continues processing other colors if one fails
- **Placeholder Images**: Fallback to placeholder service if generation fails
- **Graceful Degradation**: System continues to function even with partial failures

## Architecture

### Core Components

1. **GoogleCloudService** (`src/lib/google-cloud-service.ts`)
   - Main service class for Vertex AI integration
   - Handles image analysis and generation
   - Manages Cloud Storage uploads
   - Implements retry and fallback logic

2. **API Routes**
   - `/api/ai-image/analyze` - Image analysis endpoint
   - `/api/ai-image/generate` - Image generation endpoint

3. **Configuration** (`src/lib/ai-image-config.ts`)
   - Centralized configuration for all AI image settings
   - Vertex AI model parameters
   - Retry and fallback settings

4. **Frontend Component** (`src/components/ai-image-generator.tsx`)
   - User interface for image generation
   - Progress tracking and error display
   - Retry functionality

## Configuration

### Environment Variables Required

```bash
# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCP_PROJECT_ID=your-project-id
GCP_BUCKET_NAME=kala-sarthi-images
GCP_REGION=us-central1
```

### Vertex AI Imagen Settings

```typescript
// Vertex AI Imagen Configuration
IMAGEN_MODEL: 'imagegeneration@006',
IMAGEN_TEMPERATURE: 0.4,
IMAGEN_TOP_K: 32,
IMAGEN_TOP_P: 1,
IMAGEN_MAX_OUTPUT_TOKENS: 2048,
IMAGEN_SAFETY_THRESHOLD: 'BLOCK_MEDIUM_AND_ABOVE',
```

### Retry and Fallback Settings

```typescript
// Retry Configuration
MAX_RETRY_ATTEMPTS: 3,
RETRY_DELAY_MS: 1000,
ENABLE_FALLBACK_IMAGES: true,
FALLBACK_IMAGE_SERVICE: 'https://via.placeholder.com',
```

## Error Handling

### Error Types and Responses

| Error Code | Description | HTTP Status | Action |
|------------|-------------|-------------|---------|
| `QUOTA_EXCEEDED` | API quota exceeded | 429 | Retry later |
| `PERMISSION_DENIED` | Insufficient permissions | 403 | Check GCP setup |
| `SAFETY_VIOLATION` | Content blocked by safety filters | 400 | Try different prompt |
| `TIMEOUT` | Request timed out | 408 | Retry immediately |
| `NETWORK_ERROR` | Network connectivity issue | 503 | Check connection |
| `GENERATION_FAILED` | General generation failure | 500 | Check logs |

### Retry Logic

1. **Automatic Retries**: Up to 3 attempts for each generation request
2. **Exponential Backoff**: Increasing delay between retries (1s, 2s, 3s)
3. **Individual Color Processing**: If one color fails, others continue
4. **Partial Success**: Returns successfully generated images even if some fail

## API Endpoints

### POST /api/ai-image/analyze

Analyzes uploaded product images using Google Cloud Vision API.

**Request:**
```typescript
FormData {
  image: File
}
```

**Response:**
```typescript
{
  success: boolean,
  analysis: ProductAnalysis,
  originalImageUrl: string,
  message: string
}
```

### POST /api/ai-image/generate

Generates image variations using Vertex AI Imagen.

**Request:**
```typescript
{
  originalImageUrl: string,
  style: string,
  colors: string[]
}
```

**Response:**
```typescript
{
  success: boolean,
  generatedImages: GeneratedImage[],
  style: string,
  colors: string[],
  count: number,
  processingTimeMs: number,
  message: string
}
```

## Usage Examples

### Basic Image Generation

```typescript
// Generate images with specific style and colors
const response = await fetch('/api/ai-image/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalImageUrl: 'data:image/jpeg;base64,...',
    style: 'vibrant',
    colors: ['Red', 'Blue', 'Green']
  })
});

const data = await response.json();
if (data.success) {
  console.log(`Generated ${data.count} images in ${data.processingTimeMs}ms`);
}
```

### Error Handling

```typescript
try {
  const response = await fetch('/api/ai-image/generate', { ... });
  const data = await response.json();
  
  if (!data.success) {
    switch (data.code) {
      case 'QUOTA_EXCEEDED':
        // Show retry later message
        break;
      case 'SAFETY_VIOLATION':
        // Suggest different prompt
        break;
      default:
        // Show generic error
    }
  }
} catch (error) {
  // Handle network errors
}
```

## Monitoring and Logging

### Console Logs

The system provides comprehensive logging:

```typescript
// Generation attempts
console.log(`Attempt ${attempt}/${maxRetries} to generate images`);

// Individual image generation
console.log(`Generating image with prompt: ${prompt}`);

// Processing times
console.log(`Image generation completed in ${processingTime}ms`);

// Error details
console.error(`Error generating single image (attempt ${attempt}):`, error);
```

### Performance Metrics

- **Processing Time**: Tracked for each generation request
- **Success Rate**: Monitored per color and overall
- **Retry Count**: Tracked for debugging and optimization
- **Error Distribution**: Categorized by error type

## Best Practices

### 1. Error Handling
- Always check response success status
- Implement user-friendly error messages
- Provide retry options for recoverable errors
- Log detailed error information for debugging

### 2. Performance Optimization
- Limit concurrent generations (max 5 per request)
- Use appropriate image sizes (max 5MB)
- Implement progress tracking for long operations
- Cache generated images when possible

### 3. User Experience
- Show progress indicators during generation
- Provide clear error messages with actionable steps
- Allow retry for failed generations
- Display processing times for transparency

## Troubleshooting

### Common Issues

1. **"API quota exceeded"**
   - Check GCP billing and quotas
   - Implement rate limiting
   - Consider upgrading quota limits

2. **"Insufficient permissions"**
   - Verify service account has Vertex AI permissions
   - Check IAM roles and policies
   - Ensure proper authentication

3. **"Content blocked by safety filters"**
   - Review prompt content
   - Adjust safety threshold settings
   - Try different style/color combinations

4. **"Request timed out"**
   - Check network connectivity
   - Verify GCP region settings
   - Consider increasing timeout values

### Debug Steps

1. Check console logs for detailed error information
2. Verify environment variables are set correctly
3. Test with simple prompts first
4. Monitor GCP console for quota and billing issues
5. Validate service account permissions

## Security Considerations

### Safety Settings
- Content filtering enabled for all generations
- Harmful content blocked at medium threshold
- Safety categories: hate speech, dangerous content, sexually explicit, harassment

### Data Privacy
- Images processed through Google Cloud services
- No data stored permanently without user consent
- Generated images uploaded to secure Cloud Storage bucket

## Future Enhancements

### Planned Features
- Batch processing for multiple images
- Custom style training
- Advanced prompt engineering
- Real-time generation streaming
- Image quality scoring

### Performance Improvements
- Caching layer for repeated requests
- Background processing for large batches
- CDN integration for faster image delivery
- Optimized image compression

## Support

For technical support or questions about the Vertex AI Imagen integration:

1. Check this documentation first
2. Review console logs for error details
3. Verify GCP configuration and permissions
4. Test with minimal examples
5. Contact development team with specific error codes and logs

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: Production Ready
