import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ImageAnalysisInputSchema = z.object({
  imageData: z.string().describe('Base64 encoded image data'),
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

export async function POST(request: NextRequest) {
  try {
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

Product Image: {{media url=${imageDataUrl}}}

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