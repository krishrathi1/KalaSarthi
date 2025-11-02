import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '');

// Language detection function
function detectLanguage(text: string): string {
  const hindiWords = ['मैं', 'मुझे', 'है', 'हैं', 'का', 'की', 'के', 'को', 'से', 'पर', 'में', 'नया', 'बनाना', 'चाहिए', 'करना', 'होना'];
  const englishWords = ['i', 'me', 'my', 'you', 'the', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'create', 'make', 'new', 'product'];

  const lowerText = text.toLowerCase();
  const hindiCount = hindiWords.filter(word => lowerText.includes(word)).length;
  const englishCount = englishWords.filter(word => lowerText.includes(word)).length;

  return hindiCount > englishCount ? 'hi' : 'en';
}

// Artisan-specific system prompt
const getSystemPrompt = (language: string) => {
  if (language === 'hi') {
    return `आप एक AI असिस्टेंट हैं जो भारतीय शिल्पकारों की मदद करते हैं। आप निम्नलिखित क्षेत्रों में विशेषज्ञ हैं:

🎨 शिल्प और हस्तकला: मिट्टी के बर्तन, बुनाई, लकड़ी का काम, धातु का काम, आभूषण बनाना
💼 व्यापार सलाह: मार्केटिंग, मूल्य निर्धारण, ग्राहक सेवा, ऑनलाइन बिक्री
📊 डिजिटल खाता: आय-व्यय का हिसाब, इन्वेंटरी प्रबंधन, GST की जानकारी
🌐 ऑनलाइन उपस्थिति: सोशल मीडिया, ई-कॉमर्स प्लेटफॉर्म, डिजिटल मार्केटिंग

हमेशा सहायक, दोस्ताना और व्यावहारिक सलाह दें। भारतीय संस्कृति और परंपराओं का सम्मान करें।`;
  } else {
    return `You are an AI assistant specialized in helping Indian artisans and craftspeople. You are an expert in:

🎨 Crafts & Handicrafts: Pottery, weaving, woodwork, metalwork, jewelry making
💼 Business Advice: Marketing, pricing, customer service, online sales
📊 Digital Ledger: Income-expense tracking, inventory management, GST guidance
🌐 Online Presence: Social media, e-commerce platforms, digital marketing

Always provide helpful, friendly, and practical advice. Respect Indian culture and traditions.`;
  }
};

export async function POST(request: NextRequest) {
  let detectedLanguage = 'en'; // Default language
  
  try {
    const body = await request.json();
    const { message, language, sessionId, context } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Detect language if not provided
    detectedLanguage = language || detectLanguage(message);
    
    // Get the appropriate model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      systemInstruction: getSystemPrompt(detectedLanguage)
    });

    // Build conversation context
    let conversationHistory = '';
    if (context?.previousMessages && context.previousMessages.length > 0) {
      conversationHistory = context.previousMessages
        .slice(-3) // Last 3 messages for context
        .map((msg: any) => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
    }

    // Create the full prompt
    const fullPrompt = conversationHistory 
      ? `Previous conversation:\n${conversationHistory}\n\nCurrent message: ${message}`
      : message;

    console.log('🤖 Sending to Gemini:', {
      model: 'gemini-2.0-flash-exp',
      language: detectedLanguage,
      messageLength: message.length
    });

    // Generate response
    const startTime = Date.now();
    const result = await model.generateContent(fullPrompt);
    const duration = Date.now() - startTime;
    
    const response = result.response.text();

    console.log('✅ Gemini response received:', {
      responseLength: response.length,
      duration: `${duration}ms`
    });

    // Generate suggestions based on the response
    const suggestions = generateSuggestions(message, response, detectedLanguage);

    return NextResponse.json({
      response,
      language: detectedLanguage,
      suggestions,
      sessionId: sessionId || `session_${Date.now()}`,
      intent: classifyIntent(message),
      confidence: 0.9,
      model: 'gemini-2.0-flash-exp',
      processingTime: duration
    });

  } catch (error) {
    console.error('❌ Artisan Buddy chat error:', error);
    
    // Handle specific Gemini errors
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('429')) {
        return NextResponse.json({
          response: detectedLanguage === 'hi' 
            ? 'क्षमा करें, अभी API की सीमा समाप्त हो गई है। कृपया कुछ समय बाद कोशिश करें।'
            : 'Sorry, API quota exceeded. Please try again later.',
          error: 'quota_exceeded'
        }, { status: 429 });
      }
      
      if (error.message.includes('API key')) {
        return NextResponse.json({
          response: detectedLanguage === 'hi'
            ? 'तकनीकी समस्या है। कृपया बाद में कोशिश करें।'
            : 'Technical issue. Please try again later.',
          error: 'api_key_error'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      response: detectedLanguage === 'hi'
        ? 'क्षमा करें, कुछ तकनीकी समस्या हुई है। कृपया दोबारा कोशिश करें।'
        : 'Sorry, there was a technical issue. Please try again.',
      error: 'internal_error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const test = searchParams.get('test');

    if (test === 'true') {
      // Test endpoint
      return NextResponse.json({
        status: 'Artisan Buddy API is working',
        model: 'gemini-2.0-flash-exp',
        timestamp: new Date().toISOString(),
        features: [
          'Hindi & English support',
          'Craft guidance',
          'Business advice',
          'Digital ledger help'
        ]
      });
    }

    return NextResponse.json({
      message: 'Artisan Buddy Chat API',
      endpoints: {
        POST: 'Send chat message',
        'GET?test=true': 'Test API status'
      }
    });

  } catch (error) {
    console.error('Get request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function generateSuggestions(message: string, response: string, language: string): string[] {
  const lowerMessage = message.toLowerCase();
  
  if (language === 'hi') {
    if (lowerMessage.includes('व्यापार') || lowerMessage.includes('बिजनेस')) {
      return [
        '💰 इस महीने की आय दिखाएं',
        '📊 बिक्री का विश्लेषण करें',
        '🎯 मार्केटिंग की रणनीति बताएं'
      ];
    }
    if (lowerMessage.includes('उत्पाद') || lowerMessage.includes('बनाना')) {
      return [
        '🎨 नया डिज़ाइन सुझाएं',
        '💵 मूल्य निर्धारण में मदद करें',
        '📸 उत्पाद की फोटो कैसे लें'
      ];
    }
    return [
      '🏪 अपना व्यापार कैसे बढ़ाएं',
      '💻 ऑनलाइन बिक्री शुरू करें',
      '📱 सोशल मीडिया मार्केटिंग'
    ];
  } else {
    if (lowerMessage.includes('business') || lowerMessage.includes('sales')) {
      return [
        '💰 Show monthly revenue',
        '📊 Analyze sales data',
        '🎯 Marketing strategy tips'
      ];
    }
    if (lowerMessage.includes('product') || lowerMessage.includes('craft')) {
      return [
        '🎨 Suggest new designs',
        '💵 Help with pricing',
        '📸 Product photography tips'
      ];
    }
    return [
      '🏪 How to grow your business',
      '💻 Start selling online',
      '📱 Social media marketing'
    ];
  }
}

function classifyIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('मूल्य') || lowerMessage.includes('कीमत')) {
    return 'pricing';
  }
  if (lowerMessage.includes('sell') || lowerMessage.includes('market') || lowerMessage.includes('बेचना') || lowerMessage.includes('बाजार')) {
    return 'marketing';
  }
  if (lowerMessage.includes('make') || lowerMessage.includes('create') || lowerMessage.includes('बनाना') || lowerMessage.includes('तैयार')) {
    return 'crafting';
  }
  if (lowerMessage.includes('business') || lowerMessage.includes('व्यापार') || lowerMessage.includes('धंधा')) {
    return 'business';
  }
  
  return 'general';
}