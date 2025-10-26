import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, story, language = 'hi' } = await request.json();

    console.log('Product details generation request:', {
      story: story?.substring(0, 100) + '...',
      language,
      hasImageUrl: !!imageUrl
    });

    if (!story || !imageUrl) {
      return NextResponse.json({
        success: false,
        error: 'Story and image are required'
      }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.log('No API key found, returning fallback response');
      return NextResponse.json({
        success: true,
        productDetails: {
          name: "Handcrafted Product",
          category: "handicrafts",
          description: story,
          materials: ["Traditional materials"],
          tags: ["handmade", "artisan", "traditional"],
          dimensions: "Various sizes available",
          weight: "Varies by size",
          careInstructions: "Handle with care, store in dry place"
        },
        isFallback: true
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Detailed prompt for product details generation
    const prompt = `You are a professional product catalog specialist. Analyze the provided product image and artisan story to generate comprehensive product details.

IMPORTANT GUIDELINES:
- Extract accurate information from the image and story
- Generate realistic and appropriate product details
- Use the same language as the story (Hindi/English)
- Be specific and detailed but not overly promotional
- Focus on authentic craftsmanship and materials

Product Image: [Image will be provided]
Artisan Story: "${story}"

Generate the following product details in JSON format:

{
  "name": "Product name based on image and story",
  "category": "One of: textiles, jewelry, pottery, handicrafts, metalwork, woodwork",
  "description": "Detailed product description highlighting craftsmanship, materials, and cultural significance",
  "materials": ["List of materials used"],
  "tags": ["Relevant tags for search and categorization"],
  "dimensions": "Size information if visible or estimated",
  "weight": "Weight information if applicable",
  "careInstructions": "How to care for and maintain the product"
}

Requirements:
1. **Name**: Create an appealing, descriptive product name
2. **Category**: Choose the most appropriate category
3. **Description**: 2-3 sentences highlighting key features, craftsmanship, and cultural value
4. **Materials**: List actual materials visible in image or mentioned in story
5. **Tags**: 5-8 relevant tags for search and discovery
6. **Dimensions**: Estimate size if visible, or provide general size info
7. **Weight**: Estimate weight if applicable
8. **Care Instructions**: Practical care advice for the product

Return only the JSON object, no additional text.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageUrl.split(',')[1], // Remove data:image/jpeg;base64, prefix
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    console.log('Gemini response:', text);

    try {
      // Try to parse the JSON response
      const productDetails = JSON.parse(text);

      return NextResponse.json({
        success: true,
        productDetails,
        isFallback: false
      });
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);

      // Fallback: extract information using text processing
      const fallbackDetails = {
        name: extractProductName(text) || "Handcrafted Product",
        category: extractCategory(text) || "handicrafts",
        description: extractDescription(text) || story,
        materials: extractMaterials(text) || ["Traditional materials"],
        tags: extractTags(text) || ["handmade", "artisan", "traditional"],
        dimensions: extractDimensions(text) || "Various sizes available",
        weight: extractWeight(text) || "Varies by size",
        careInstructions: extractCareInstructions(text) || "Handle with care, store in dry place"
      };

      return NextResponse.json({
        success: true,
        productDetails: fallbackDetails,
        isFallback: true
      });
    }

  } catch (error) {
    console.error('Error generating product details:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to generate product details',
      productDetails: {
        name: "Handcrafted Product",
        category: "handicrafts",
        description: "A beautiful handcrafted product",
        materials: ["Traditional materials"],
        tags: ["handmade", "artisan", "traditional"],
        dimensions: "Various sizes available",
        weight: "Varies by size",
        careInstructions: "Handle with care, store in dry place"
      },
      isFallback: true
    });
  }
}

// Helper functions to extract information from text
function extractProductName(text: string): string | null {
  const nameMatch = text.match(/"name":\s*"([^"]+)"/i);
  return nameMatch ? nameMatch[1] : null;
}

function extractCategory(text: string): string | null {
  const categoryMatch = text.match(/"category":\s*"([^"]+)"/i);
  return categoryMatch ? categoryMatch[1] : null;
}

function extractDescription(text: string): string | null {
  const descMatch = text.match(/"description":\s*"([^"]+)"/i);
  return descMatch ? descMatch[1] : null;
}

function extractMaterials(text: string): string[] {
  const materialsMatch = text.match(/"materials":\s*\[(.*?)\]/i);
  if (materialsMatch) {
    const materialsStr = materialsMatch[1];
    const materials = materialsStr.match(/"([^"]+)"/g);
    return materials ? materials.map(m => m.replace(/"/g, '')) : ["Traditional materials"];
  }
  return ["Traditional materials"];
}

function extractTags(text: string): string[] {
  const tagsMatch = text.match(/"tags":\s*\[(.*?)\]/i);
  if (tagsMatch) {
    const tagsStr = tagsMatch[1];
    const tags = tagsStr.match(/"([^"]+)"/g);
    return tags ? tags.map(t => t.replace(/"/g, '')) : ["handmade", "artisan", "traditional"];
  }
  return ["handmade", "artisan", "traditional"];
}

function extractDimensions(text: string): string | null {
  const dimMatch = text.match(/"dimensions":\s*"([^"]+)"/i);
  return dimMatch ? dimMatch[1] : null;
}

function extractWeight(text: string): string | null {
  const weightMatch = text.match(/"weight":\s*"([^"]+)"/i);
  return weightMatch ? weightMatch[1] : null;
}

function extractCareInstructions(text: string): string | null {
  const careMatch = text.match(/"careInstructions":\s*"([^"]+)"/i);
  return careMatch ? careMatch[1] : null;
}
