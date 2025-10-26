import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  let story = '';
  let language = 'hi'; // Default language
  try {
    const requestBody = await request.json();
    story = requestBody.story;
    const { imageUrl, language: reqLanguage = 'hi', voiceStyle = 'default' } = requestBody;
    language = reqLanguage; // Update with request language

    console.log('Story enhancement request:', {
      story: story?.substring(0, 100) + '...',
      language,
      hasImageUrl: !!imageUrl,
      imageUrlType: typeof imageUrl,
      imageUrlLength: imageUrl?.length || 0,
      imageUrlPrefix: imageUrl?.substring(0, 50) || 'none'
    });

    if (!story) {
      return NextResponse.json(
        { error: 'Story is required' },
        { status: 400 }
      );
    }

    // Initialize Gemini directly
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;

    console.log('API Key check:', {
      hasGoogleAIKey: !!process.env.GOOGLE_AI_API_KEY,
      hasNextPublicKey: !!process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY,
      finalApiKey: apiKey ? 'Present' : 'Missing'
    });

    if (!apiKey) {
      console.warn('GOOGLE_AI_API_KEY not found, using fallback');

      // Return error when API key is missing
      return NextResponse.json({
        success: false,
        error: 'Google AI API key is required for story enhancement',
        originalStory: story,
        language: language
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log('Gemini model initialized successfully');

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
    // Use the language parameter from frontend, but fallback to detection if not provided
    const detectedLanguage = language === 'hi-IN' || language === 'hi' ? 'Hindi' :
      language === 'en-US' || language === 'en' ? 'English' :
        isHindi ? 'Hindi' : 'English';

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
      console.log('Starting Gemini API call...', {
        hasImageUrl: !!imageUrl,
        promptLength: prompt.length,
        model: 'gemini-2.5-flash'
      });

      // Retry logic for Gemini API overload/rate limit errors
      let result;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          console.log(`Gemini API attempt ${retryCount + 1}/${maxRetries}`);

          // If we have an image, use multimodal approach
          if (imageUrl && imageUrl.startsWith('data:image/')) {
            console.log('Using multimodal approach with image');

            // Extract base64 data properly
            let base64Data = imageUrl;
            if (imageUrl.includes(',')) {
              base64Data = imageUrl.split(',')[1]; // Remove data:image/jpeg;base64, prefix
            }

            console.log('Image data length:', base64Data.length);

            // Validate that we have actual image data
            if (!base64Data || base64Data.length < 100) {
              console.log('Invalid image data, falling back to text-only approach');
              console.log('Base64 data length:', base64Data?.length || 0);
              result = await model.generateContent(prompt);
            } else {
              result = await model.generateContent([
                prompt,
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data
                  }
                }
              ]);
            }
          } else if (imageUrl) {
            console.log('Image URL is not a data URL, using text-only approach');
            console.log('Image URL type:', typeof imageUrl);
            result = await model.generateContent(prompt);
          } else {
            console.log('Using text-only approach');
            result = await model.generateContent(prompt);
          }
          console.log('Gemini API call successful');
          break; // Success, exit retry loop
        } catch (error: any) {
          console.error(`Gemini generation attempt ${retryCount + 1} failed:`, error);

          // Check if it's a quota/overload error
          if (error instanceof Error ? error.message : String(error)?.includes('429') || error instanceof Error ? error.message : String(error)?.includes('503') || error instanceof Error ? error.message : String(error)?.includes('overloaded') || error instanceof Error ? error.message : String(error)?.includes('quota')) {
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
      console.error('Error details:', {
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });

      // Return more specific error information
      return NextResponse.json({
        success: false,
        error: `Failed to enhance story with AI: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`,
        originalStory: story,
        language: language,
        debugInfo: {
          errorType: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      enhancedStory: enhancedStory,
      originalStory: story,
      language: language,
      isFallback: false
    });

  } catch (error) {
    console.error('Story enhancement error:', error);

    // Return error instead of fallback story
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Story enhancement failed',
      originalStory: story,
      language: language
    }, { status: 500 });
  }
}
