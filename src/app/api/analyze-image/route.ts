import { NextRequest, NextResponse } from 'next/server';
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
    const body = await request.json();
    const { imageData, transcription } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Mock image analysis - in real scenario, this would use AI vision
    const mockImageAnalysis = {
      productType: 'Handcrafted Pottery Bowl',
      category: 'Ceramics',
      materials: ['Clay', 'Natural pigments'],
      craftsmanship: ['Hand-thrown', 'Traditional glazing'],
      colors: ['Earth tones', 'Natural brown'],
      patterns: ['Traditional motifs'],
      culturalSignificance: 'Represents traditional pottery techniques',
      estimatedValue: '₹500 - ₹1500',
      description: 'A beautiful handcrafted pottery bowl with traditional designs',
      keywords: ['handmade', 'pottery', 'traditional', 'ceramics'],
      targetAudience: 'Home decor enthusiasts',
      occasion: ['Daily use', 'Gifting'],
      careInstructions: ['Hand wash only', 'Avoid extreme temperatures'],
      storyElements: {
        heritage: 'Traditional pottery techniques passed down through generations',
        artisanJourney: 'Skilled artisan with years of experience',
        uniqueness: 'Each piece is unique due to hand-crafting',
        sustainability: 'Made from natural, eco-friendly materials'
      }
    };

    // Handle story weaving
    const storyResult = await handleStoryWeaving({
      transcription,
      imageAnalysis: mockImageAnalysis
    });

    return NextResponse.json({
      success: true,
      imageAnalysis: mockImageAnalysis,
      storyWeaving: storyResult
    });

  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
}