import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

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

    // Create a more specific and consistent prompt
    const storyWeavingPrompt = ai.definePrompt({
      name: 'storyWeavingPrompt',
      input: { schema: StoryWeavingInputSchema },
      output: { schema: StoryWeavingOutputSchema },
      prompt: `You are a master storyteller specializing in Indian handicrafts. Your task is to create a compelling, authentic product description that specifically matches the detected product type.

CRITICAL REQUIREMENTS:
- Product Type: ${productType}
- Category: ${category}
- Materials: ${materials.join(', ')}
- Colors: ${colors.join(', ')}
- Patterns: ${patterns.join(', ')}

Artisan's Story: "${transcription || 'No voice recording provided'}"

Visual Analysis: ${JSON.stringify(imageAnalysis, null, 2)}

Your mission is to:
1. **Match Product Type Exactly**: The story MUST be about a ${productType}, not jewelry or any other product type
2. **Use Correct Materials**: Reference ${materials.join(' and ')} specifically
3. **Incorporate Colors**: Mention ${colors.join(' and ')} naturally
4. **Preserve Authenticity**: Keep the artisan's voice as the foundation
5. **Create Emotional Connection**: Weave in cultural significance and heritage
6. **Be Specific**: Use the exact product type "${productType}" throughout the description

IMPORTANT: If the product is a saree, talk about saree weaving, silk threads, traditional motifs, etc. If it's jewelry, talk about metalwork, stones, etc. NEVER mix product types.

Return a natural, engaging product description that combines both sources seamlessly while staying true to the detected product type.`
    });

    const weavingResult = await storyWeavingPrompt({
      transcription: transcription || `This is a beautiful ${productType} showcasing traditional ${category} craftsmanship.`,
      imageAnalysis: imageAnalysis,
      enhanceStory: true
    });

    // Access the result correctly from the AI response
    const result = (weavingResult as any);

    // Ensure the story matches the detected product type
    let enhancedStory = result.enhancedStory || result.combinedDescription || transcription;

    // Fallback to create a consistent story if AI doesn't match product type
    if (enhancedStory && !enhancedStory.toLowerCase().includes(productType.toLowerCase().split(' ')[0])) {
      console.log('AI generated story does not match product type, creating fallback...');
      enhancedStory = createConsistentStory(transcription, imageAnalysis);
    }

    return NextResponse.json({
      success: true,
      enhancedStory: enhancedStory,
      combinedDescription: enhancedStory,
      authenticityScore: result.authenticityScore || 0.8,
      marketAppeal: result.marketAppeal || 0.7,
      culturalElements: result.culturalElements || ['Traditional craftsmanship'],
      visualStoryElements: result.visualStoryElements || ['Visual appeal'],
      productType: productType,
      category: category
    });

  } catch (error) {
    console.error('Story weaving failed:', error);

    // Create a consistent fallback story
    const fallbackStory = createConsistentStory(data.transcription, data.imageAnalysis);

    return NextResponse.json({
      success: true,
      enhancedStory: fallbackStory,
      combinedDescription: fallbackStory,
      authenticityScore: 0.7,
      marketAppeal: 0.6,
      culturalElements: ['Traditional craftsmanship'],
      visualStoryElements: ['Visual appeal', 'Artisan details'],
      productType: data.imageAnalysis.productType,
      category: data.imageAnalysis.category
    });
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

  // Add transcription if available
  if (transcription) {
    baseStory += ` ${transcription}`;
  }

  return baseStory;
}

export async function POST(request: NextRequest) {
  try {
    // Check if this is a story weaving request
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      // Handle story weaving request
      const jsonData = await request.json();

      if (jsonData.transcription && jsonData.imageAnalysis && jsonData.enhanceStory) {
        return await handleStoryWeaving(jsonData);
      }
    }

    // Handle regular image analysis
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64 for Gemini processing
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`;

    // Use Gemini Vision for comprehensive product analysis
    const analysisPrompt = ai.definePrompt({
      name: 'productAnalysisPrompt',
      input: { schema: ImageAnalysisInputSchema },
      output: { schema: ImageAnalysisOutputSchema },
      prompt: `You are an expert in Indian handicrafts and artisan products. Analyze this product image and provide comprehensive details for marketplace listing.

Product Image: {{media url="${imageDataUrl}"}}

Provide detailed analysis including:
1. **Product Identification**: Exact product type and category
2. **Material Analysis**: What materials are used
3. **Craftsmanship**: Techniques and skills involved
4. **Visual Elements**: Colors, patterns, design elements
5. **Cultural Context**: Traditional significance and heritage
6. **Market Value**: Realistic price range based on quality
7. **Target Market**: Who would buy this product
8. **Usage**: Occasions and purposes
9. **Care**: How to maintain the product
10. **Story Elements**: Background, uniqueness, sustainability

Be specific and authentic to Indian craftsmanship traditions. Focus on accuracy and market relevance.`
    });

    try {
      const analysisResult = await analysisPrompt({
        imageData: imageDataUrl
      });

      return NextResponse.json({
        success: true,
        analysis: analysisResult
      });

    } catch (aiError) {
      console.error('AI Analysis failed:', aiError);

      // Fallback analysis for common Indian handicrafts
      const fallbackAnalysis = {
        productType: 'Handcrafted Product',
        category: 'Handicrafts',
        materials: ['Natural materials', 'Traditional techniques'],
        craftsmanship: ['Handmade', 'Traditional methods'],
        colors: ['Natural', 'Earth tones'],
        patterns: ['Traditional', 'Cultural motifs'],
        culturalSignificance: 'Represents Indian artisanal heritage and traditional craftsmanship',
        estimatedValue: '₹500 - ₹5,000',
        description: 'Beautiful handcrafted product made with traditional Indian techniques, representing the rich cultural heritage of Indian artisans.',
        keywords: ['handmade', 'traditional', 'indian', 'craft', 'artisanal'],
        targetAudience: 'Art and culture enthusiasts, gift buyers, interior decorators',
        occasion: ['Festivals', 'Weddings', 'Home decor', 'Cultural events', 'Gifts'],
        careInstructions: [
          'Keep away from direct sunlight',
          'Clean with soft cloth',
          'Avoid harsh chemicals',
          'Store in cool, dry place'
        ],
        storyElements: {
          heritage: 'Part of India\'s rich handicraft tradition spanning centuries',
          artisanJourney: 'Crafted by skilled artisans who have inherited these techniques through generations',
          uniqueness: 'Each piece is unique with slight variations that reflect the artisan\'s individual touch',
          sustainability: 'Made from natural, eco-friendly materials using traditional, sustainable methods'
        }
      };

      return NextResponse.json({
        success: true,
        analysis: fallbackAnalysis
      });
    }

  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
}