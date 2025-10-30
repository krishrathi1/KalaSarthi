import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GeminiImageService } from '@/lib/gemini-image-service';
import { GoogleCloudService } from '@/lib/google-cloud-service';

const ImageAnalysisInputSchema = z.object({
  imageData: z.string().describe('Base64 encoded image data'),
});

const StoryWeavingInputSchema = z.object({
  transcription: z.string().describe('Artisan\'s spoken story from speech-to-text'),
  imageAnalysis: z.object({
    productType: z.string(),
    category: z.string(),
    materials: z.array(z.string()),
    craftsmanship: z.array(z.string()),
    colors: z.array(z.string()),
    patterns: z.array(z.string()),
    culturalSignificance: z.string(),
    estimatedValue: z.string(),
    description: z.string(),
    keywords: z.array(z.string()),
    targetAudience: z.string(),
    occasion: z.array(z.string()),
    careInstructions: z.array(z.string()),
    storyElements: z.object({
      heritage: z.string(),
      artisanJourney: z.string(),
      uniqueness: z.string(),
      sustainability: z.string()
    })
  }).describe('Image analysis results'),
  enhanceStory: z.boolean().optional().describe('Whether to enhance the story')
});

const ImageAnalysisOutputSchema = z.object({
  productType: z.string().describe('Specific product type (e.g., Banarasi Saree, Terracotta Pot)'),
  category: z.string().describe('Broad product category (e.g., Textiles, Pottery, Jewelry)'),
  materials: z.array(z.string()).describe('Materials used in the product'),
  craftsmanship: z.array(z.string()).describe('Craftsmanship techniques identified'),
  colors: z.array(z.string()).describe('Dominant colors in the product'),
  patterns: z.array(z.string()).describe('Patterns or motifs identified'),
  culturalSignificance: z.string().describe('Cultural or traditional significance'),
  estimatedValue: z.string().describe('Estimated market value range'),
  description: z.string().describe('Detailed product description for marketplace'),
  keywords: z.array(z.string()).describe('SEO keywords for the product'),
  targetAudience: z.string().describe('Target customer demographic'),
  occasion: z.array(z.string()).describe('Suitable occasions for the product'),
  careInstructions: z.array(z.string()).describe('Product care instructions'),
  storyElements: z.object({
    heritage: z.string().describe('Historical background'),
    artisanJourney: z.string().describe('Typical artisan background'),
    uniqueness: z.string().describe('What makes this product special'),
    sustainability: z.string().describe('Environmental and ethical aspects')
  })
});

const StoryWeavingOutputSchema = z.object({
  enhancedStory: z.string().describe('Artisan story enhanced with visual insights'),
  combinedDescription: z.string().describe('Complete product description weaving both sources'),
  authenticityScore: z.number().describe('How authentic the final story feels'),
  marketAppeal: z.number().describe('Market appeal rating of the combined story'),
  culturalElements: z.array(z.string()).describe('Cultural elements identified and preserved'),
  visualStoryElements: z.array(z.string()).describe('Story elements derived from visual analysis')
});

// Story weaving function to combine transcription and image analysis
async function handleStoryWeaving(data: any) {
  try {
    const { transcription, imageAnalysis } = data;

    // Extract key product information for consistency
    const productType = imageAnalysis.productType || 'handcrafted product';
    const category = imageAnalysis.category || 'handicrafts';
    const materials = imageAnalysis.materials || ['traditional materials'];
    const colors = imageAnalysis.colors || ['natural colors'];
    const patterns = imageAnalysis.patterns || ['traditional patterns'];

    // Mock implementation - in real scenario, this would use AI for story weaving
    return {
      enhancedStory: transcription || 'This beautiful handcrafted product represents traditional craftsmanship passed down through generations.',
      combinedDescription: `A stunning ${productType} in the ${category} category, crafted using ${materials.join(', ')} with beautiful ${colors.join(', ')} colors and ${patterns.join(', ')} patterns. ${transcription || 'This piece showcases the artisan\'s dedication to preserving traditional techniques.'}`,
      authenticityScore: 0.9,
      marketAppeal: 0.85,
      culturalElements: ['Traditional craftsmanship', 'Cultural heritage', 'Artisan skills'],
      visualStoryElements: [`${productType} design`, 'Traditional patterns', 'Handcrafted quality']
    };

  } catch (error) {
    console.error('Story weaving error:', error);
    // Fallback response
    return {
      enhancedStory: data.transcription || 'This beautiful handcrafted product represents traditional craftsmanship.',
      combinedDescription: `A stunning handcrafted product showcasing traditional techniques and cultural heritage. ${data.transcription || 'This piece represents the artisan\'s dedication to preserving traditional craftsmanship.'}`,
      authenticityScore: 0.8,
      marketAppeal: 0.75,
      culturalElements: ['Traditional craftsmanship', 'Cultural heritage'],
      visualStoryElements: ['Handcrafted quality', 'Traditional design']
    };
  }
}

// Helper function to create consistent stories based on detected product type
function createConsistentStory(transcription: string, imageAnalysis: any): string {
  const productType = imageAnalysis.productType || 'handcrafted product';
  const category = imageAnalysis.category || 'handicrafts';
  const materials = imageAnalysis.materials || ['traditional materials'];
  const colors = imageAnalysis.colors || ['natural colors'];

  let baseStory = '';

  // Create product-specific stories
  if (productType.toLowerCase().includes('saree') || category.toLowerCase().includes('textile')) {
    baseStory = `This exquisite handwoven ${productType} represents the rich tradition of Indian textile craftsmanship. Crafted using ${materials.join(' and ')} with ${colors.join(' and ')} hues, this piece carries the legacy of generations of skilled weavers.`;
  } else if (productType.toLowerCase().includes('jewelry') || category.toLowerCase().includes('metalwork')) {
    baseStory = `This beautiful ${productType} showcases exceptional ${category} craftsmanship. Meticulously crafted from ${materials.join(' and ')} with ${colors.join(' and ')} accents, this piece represents months of dedicated artisanal work.`;
  } else if (productType.toLowerCase().includes('pottery') || category.toLowerCase().includes('ceramics')) {
    baseStory = `This handcrafted ${productType} embodies the ancient art of ${category}. Shaped from ${materials.join(' and ')} with ${colors.join(' and ')} glazes, this piece tells the story of traditional ceramic craftsmanship.`;
  } else {
    baseStory = `This beautiful ${productType} represents the finest in ${category} craftsmanship. Created using ${materials.join(' and ')} with ${colors.join(' and ')} elements, this piece showcases traditional artisanal techniques.`;
  }

  // Combine with artisan's transcription if available
  if (transcription) {
    return `${baseStory} ${transcription}`;
  }

  return baseStory;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required', success: false },
        { status: 400 }
      );
    }

    // Validate image format and size
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validFormats.includes(imageFile.type)) {
      return NextResponse.json(
        {
          error: 'Invalid image format. Please use JPEG, PNG, or WebP.',
          success: false
        },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        {
          error: 'Image file too large. Please use an image smaller than 10MB.',
          success: false
        },
        { status: 400 }
      );
    }

    // Convert image to base64 for Gemini analysis
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`;

    let analysisResult;
    let retryCount = 0;
    const maxRetries = 3;

    // Retry logic with exponential backoff
    while (retryCount < maxRetries) {
      try {
        // Use Gemini for detailed image analysis
        console.log(`🔍 Attempting image analysis (attempt ${retryCount + 1}/${maxRetries})`);

        const geminiAnalysis = await GeminiImageService.analyzeImageForProduct(imageDataUrl);

        // Parse the Gemini response to extract structured data
        const structuredAnalysis = await parseGeminiAnalysis(geminiAnalysis, imageDataUrl);

        analysisResult = structuredAnalysis;
        break;

      } catch (error) {
        retryCount++;
        console.error(`❌ Image analysis attempt ${retryCount} failed:`, error);

        if (retryCount >= maxRetries) {
          // Final fallback - try Google Cloud Vision as backup
          try {
            console.log('🔄 Falling back to Google Cloud Vision...');
            const cloudAnalysis = await GoogleCloudService.analyzeProductImage(Buffer.from(imageBuffer));
            analysisResult = convertCloudAnalysisToFormat(cloudAnalysis);
          } catch (cloudError) {
            console.error('❌ Google Cloud Vision also failed:', cloudError);
            throw new Error('All image analysis services failed');
          }
        } else {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }

    if (!analysisResult) {
      throw new Error('Failed to analyze image after all retries');
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult
    });

  } catch (error) {
    console.error('❌ Image analysis error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to analyze image',
        success: false
      },
      { status: 500 }
    );
  }
}

// Helper function to parse Gemini analysis into structured format
async function parseGeminiAnalysis(geminiText: string, imageUrl: string) {
  try {
    // Use Gemini to structure the analysis
    const structuredPrompt = `
    Based on this image analysis: "${geminiText}"
    
    Please extract and format the information as a JSON object with these exact fields:
    {
      "productType": "specific product name",
      "category": "broad category",
      "materials": ["material1", "material2"],
      "colors": ["color1", "color2"],
      "description": "detailed description",
      "culturalElements": ["element1", "element2"],
      "craftTechniques": ["technique1", "technique2"]
    }
    
    Return only the JSON object, no other text.
    `;

    const structuredResult = await GeminiImageService.generateStructuredAnalysis(structuredPrompt);

    try {
      const parsed = JSON.parse(structuredResult);
      return {
        productType: parsed.productType || 'Handcrafted Product',
        category: parsed.category || 'Handicrafts',
        materials: Array.isArray(parsed.materials) ? parsed.materials : ['Traditional materials'],
        colors: Array.isArray(parsed.colors) ? parsed.colors : ['Natural colors'],
        description: parsed.description || geminiText,
        culturalElements: Array.isArray(parsed.culturalElements) ? parsed.culturalElements : ['Traditional craftsmanship'],
        craftTechniques: Array.isArray(parsed.craftTechniques) ? parsed.craftTechniques : ['Handmade techniques']
      };
    } catch (parseError) {
      console.warn('⚠️ Failed to parse structured JSON, using fallback format');
      return createFallbackAnalysis(geminiText);
    }

  } catch (error) {
    console.error('❌ Failed to structure analysis:', error);
    return createFallbackAnalysis(geminiText);
  }
}

// Helper function to convert Google Cloud Vision analysis to expected format
function convertCloudAnalysisToFormat(cloudAnalysis: any) {
  return {
    productType: cloudAnalysis.productType || 'Handcrafted Product',
    category: cloudAnalysis.category || 'Handicrafts',
    materials: cloudAnalysis.materials || ['Traditional materials'],
    colors: cloudAnalysis.colors || ['Natural colors'],
    description: cloudAnalysis.description || 'A beautiful handcrafted product',
    culturalElements: ['Traditional craftsmanship'],
    craftTechniques: ['Handmade techniques']
  };
}

// Fallback analysis format
function createFallbackAnalysis(analysisText: string) {
  return {
    productType: 'Handcrafted Product',
    category: 'Handicrafts',
    materials: ['Traditional materials'],
    colors: ['Natural colors'],
    description: analysisText || 'A beautiful handcrafted product showcasing traditional craftsmanship',
    culturalElements: ['Traditional craftsmanship', 'Cultural heritage'],
    craftTechniques: ['Handmade techniques', 'Traditional methods']
  };
}
