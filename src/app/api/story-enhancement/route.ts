import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { story, imageUrl, language = 'hi', voiceStyle = 'default' } = await request.json();

    console.log('Story enhancement request:', { 
      story: story?.substring(0, 100) + '...', 
      language, 
      hasImageUrl: !!imageUrl 
    });

    if (!story) {
      return NextResponse.json(
        { error: 'Story is required' },
        { status: 400 }
      );
    }

    // Initialize Gemini directly
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      console.warn('GOOGLE_AI_API_KEY not found, using fallback');
      
      // Detect language for fallback
      const isHindi = /[\u0900-\u097F]/.test(story);
      const fallbackStory = isHindi 
        ? `यह एक पारंपरिक लकड़ी का खिलौना है जो आम के पेड़ की लकड़ी से बनाया जाता है। यह खिलौना हमारे परिवार में 200 सालों से बनाया जा रहा है। हम इस परंपरा को 200 सालों से चलाते आ रहे हैं और यह हमारी पाँचवीं पीढ़ी है। यह केवल एक खिलौना नहीं, बल्कि हमारी कला और समर्पण का प्रतीक है।`
        : `This is a traditional wooden toy made from mango wood. This toy has been made in our family for 200 years. We have been carrying on this tradition for 200 years and this is our fifth generation. This is not just a toy, but a symbol of our art and dedication.`;
      
      return NextResponse.json({
        success: true,
        enhancedStory: fallbackStory,
        originalStory: story,
        language: isHindi ? 'hi-IN' : 'en-US',
        isFallback: true
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Voice style instructions
    const voiceInstructions = {
      'warm': 'Write in a warm, friendly, and inviting tone that makes customers feel welcomed and connected.',
      'professional': 'Write with professional authority and expertise, emphasizing quality and reliability.',
      'storyteller': 'Write as a captivating storyteller with expressive language and engaging narrative flow.',
      'traditional': 'Write in a traditional storytelling style that honors cultural heritage and authenticity.',
      'default': 'Write in a clear, natural, and engaging tone.'
    };

    const voiceStyleInstruction = voiceInstructions[voiceStyle as keyof typeof voiceInstructions] || voiceInstructions.default;

    // Detect the language of the input story
    const isHindi = /[\u0900-\u097F]/.test(story);
    const detectedLanguage = isHindi ? 'Hindi' : 'English';
    
    console.log(`🌍 Story language detected: ${detectedLanguage} (${isHindi ? 'Hindi' : 'English'})`);

    // Detailed, specific prompt to prevent hallucination and focus on the actual product
    const prompt = `You are a professional marketing copywriter specializing in authentic artisanal products. Your task is to enhance a product story while maintaining complete accuracy and authenticity.

IMPORTANT GUIDELINES:
- DO NOT add any details that are not visible in the image or mentioned in the original story
- DO NOT invent materials, colors, or features that aren't clearly present
- DO NOT add fake cultural claims or traditions not mentioned
- DO NOT exaggerate or make up historical details
- ONLY enhance what is already there - make it more engaging and appealing
- Stick strictly to what you can observe and what the artisan has told you

Original Story from Artisan: "${story}"
Detected Language: ${detectedLanguage}
Voice Style: ${voiceStyleInstruction}

CRITICAL LANGUAGE REQUIREMENT:
- The original story is in ${detectedLanguage}
- You MUST respond in the SAME language as the original story
- If the story is in Hindi, respond ONLY in Hindi
- If the story is in English, respond ONLY in English
- Do NOT translate or change the language

Your task is to enhance this story by:
1. **Preserving Authenticity**: Keep all original details exactly as stated by the artisan
2. **Improving Language Flow**: Make the writing more engaging and professional
3. **Adding Sensory Details**: Only describe what you can actually see in the image (colors, textures, materials visible)
4. **Highlighting Real Craftsmanship**: Emphasize the actual skills and techniques mentioned
5. **Creating Emotional Connection**: Make customers appreciate the real story and tradition
6. **Professional Presentation**: Structure it like a compelling product description
7. **Language Consistency**: Keep the SAME language as the original (${detectedLanguage})
8. **Voice Style**: Write in the specified voice style: ${voiceStyleInstruction}
9. **Appropriate Length**: 150-300 words

WHAT TO DO:
- Use the artisan's exact words and details
- Make the language more polished and engaging
- Add only visual details you can see in the image
- Create emotional appeal around the real story
- Structure it professionally for marketing
- RESPOND IN ${detectedLanguage.toUpperCase()}

WHAT NOT TO DO:
- Don't add materials not visible in the image
- Don't invent cultural traditions not mentioned
- Don't add fake historical details
- Don't exaggerate or make up features
- Don't add colors or details not visible
- Don't create false emotional stories
- Don't change the language from ${detectedLanguage}

Return only the enhanced story in ${detectedLanguage}, nothing else.`;

    let enhancedStory = '';
    
    try {
      // Retry logic for Gemini API overload/rate limit errors
      let result;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // If we have an image, use multimodal approach
          if (imageUrl) {
            result = await model.generateContent([
              prompt,
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageUrl.split(',')[1] // Remove data:image/jpeg;base64, prefix
                }
              }
            ]);
          } else {
            // Text-only approach
            result = await model.generateContent(prompt);
          }
          break; // Success, exit retry loop
        } catch (error: any) {
          console.error(`Gemini generation attempt ${retryCount + 1} failed:`, error);
          
          // Check if it's a quota/overload error
          if (error.message?.includes('429') || error.message?.includes('503') || error.message?.includes('overloaded') || error.message?.includes('quota')) {
            retryCount++;
            if (retryCount < maxRetries) {
              // Wait before retry (exponential backoff)
              const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
              console.log(`Retrying story enhancement in ${waitTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }
          
          // If not a retryable error or max retries reached, throw
          throw error;
        }
      }

      if (!result) {
        throw new Error('Failed to get result from Gemini after retries');
      }

      const response = await result.response;
      enhancedStory = response.text();
    } catch (error) {
      console.error('Gemini generation error after retries:', error);
      // Fallback story - keep it simple and authentic
      enhancedStory = `यह एक पारंपरिक लकड़ी का खिलौना है जो आम के पेड़ की लकड़ी से बनाया जाता है। यह खिलौना हमारे परिवार में 200 सालों से बनाया जा रहा है। हम इस परंपरा को 200 सालों से चलाते आ रहे हैं और यह हमारी पाँचवीं पीढ़ी है। यह केवल एक खिलौना नहीं, बल्कि हमारी कला और समर्पण का प्रतीक है।`;
    }

    return NextResponse.json({
      success: true,
      enhancedStory: enhancedStory,
      originalStory: story,
      language: language,
      isFallback: enhancedStory.includes('यह एक पारंपरिक लकड़ी का खिलौना है') // Check if fallback was used
    });

  } catch (error) {
    console.error('Story enhancement error:', error);
    
    // Use a default fallback story
    const fallbackStory = `This is a traditional handcrafted product made with care and dedication. Each piece represents the artisan's skill and cultural heritage, passed down through generations.`;
    
    return NextResponse.json({
      success: true,
      enhancedStory: fallbackStory,
      originalStory: 'Original story not available due to error',
      language: 'en-US',
      isFallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
