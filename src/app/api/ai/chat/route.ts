import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple AI Chat API endpoint
 * Provides basic responses for artisan-related queries
 */

interface ChatRequest {
    message: string;
    context?: any;
    language?: string;
}

interface ChatResponse {
    response: string;
    confidence: number;
    intent: string;
    processingTime: number;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body: ChatRequest = await request.json();
        const { message, context, language } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Detect language if not provided
        const detectedLanguage = language || detectLanguage(message);

        // Classify intent
        const intent = classifyIntent(message);

        // Generate response
        const response = generateResponse(message, intent, detectedLanguage, context);

        const processingTime = Date.now() - startTime;

        const result: ChatResponse = {
            response: response.text,
            confidence: response.confidence,
            intent,
            processingTime
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('AI Chat API error:', error);

        return NextResponse.json(
            {
                error: 'Internal server error',
                response: 'I apologize, but I\'m having trouble processing your request right now. Please try again.',
                confidence: 0.1,
                intent: 'error',
                processingTime: Date.now() - startTime
            },
            { status: 500 }
        );
    }
}

/**
 * Detect language from text
 */
function detectLanguage(text: string): string {
    const hindiPattern = /[\u0900-\u097F]/;
    const hindiMatches = (text.match(/[\u0900-\u097F]/g) || []).length;
    const englishMatches = (text.match(/[a-zA-Z]/g) || []).length;

    if (hindiMatches > englishMatches) return 'hi';
    if (englishMatches > 0) return 'en';
    return 'hi'; // Default to Hindi for Indian artisans
}

/**
 * Classify user intent
 */
function classifyIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Business & Finance
    if (matchesKeywords(lowerMessage, [
        'business', 'व्यापार', 'बिजनेस', 'money', 'पैसा', 'profit', 'मुनाफा',
        'sell', 'बेचना', 'price', 'कीमत', 'cost', 'लागत', 'income', 'आय'
    ])) {
        return 'business_finance';
    }

    // Product Creation
    if (matchesKeywords(lowerMessage, [
        'craft', 'शिल्प', 'product', 'उत्पाद', 'make', 'बनाना', 'create', 'design',
        'डिज़ाइन', 'material', 'सामग्री', 'technique', 'तकनीक'
    ])) {
        return 'product_creation';
    }

    // Marketing & Sales
    if (matchesKeywords(lowerMessage, [
        'market', 'बाज़ार', 'customer', 'ग्राहक', 'online', 'ऑनलाइन', 'social media',
        'facebook', 'instagram', 'whatsapp', 'website', 'वेबसाइट'
    ])) {
        return 'marketing_sales';
    }

    // Government Schemes
    if (matchesKeywords(lowerMessage, [
        'scheme', 'योजना', 'government', 'सरकार', 'loan', 'लोन', 'subsidy',
        'सब्सिडी', 'support', 'सहायता'
    ])) {
        return 'government_schemes';
    }

    // Greetings
    if (matchesKeywords(lowerMessage, [
        'hello', 'hi', 'नमस्ते', 'हैलो', 'good morning', 'good evening'
    ])) {
        return 'greeting';
    }

    return 'general';
}

/**
 * Check if message matches keywords
 */
function matchesKeywords(message: string, keywords: string[]): boolean {
    return keywords.some(keyword => message.includes(keyword.toLowerCase()));
}

/**
 * Generate response based on intent
 */
function generateResponse(
    message: string,
    intent: string,
    language: string,
    context?: any
): { text: string; confidence: number } {

    const isHindi = language === 'hi';

    switch (intent) {
        case 'business_finance':
            return getBusinessResponse(message, isHindi);

        case 'product_creation':
            return getProductResponse(message, isHindi);

        case 'marketing_sales':
            return getMarketingResponse(message, isHindi);

        case 'government_schemes':
            return getGovernmentResponse(message, isHindi);

        case 'greeting':
            return getGreetingResponse(isHindi, context);

        default:
            return getGeneralResponse(message, isHindi);
    }
}

/**
 * Business & Finance responses
 */
function getBusinessResponse(message: string, isHindi: boolean): { text: string; confidence: number } {
    if (message.includes('price') || message.includes('कीमत')) {
        return {
            text: isHindi
                ? `उत्पाद की कीमत तय करने के लिए:
📊 सामग्री की लागत + श्रम लागत + 30-50% मार्जिन
💡 बाज़ार में समान उत्पादों की कीमत देखें
🎯 अपने ग्राहकों की खरीदारी क्षमता समझें
📈 शुरुआत में कम मार्जिन रखें, बाद में बढ़ाएं`
                : `For product pricing:
📊 Material cost + Labor cost + 30-50% margin
💡 Research similar products in the market
🎯 Understand your customers' buying capacity
📈 Start with lower margins, increase gradually`,
            confidence: 0.9
        };
    }

    return {
        text: isHindi
            ? `व्यापार में सफलता के लिए:
💰 हमेशा अपना हिसाब-किताब रखें
📱 डिजिटल पेमेंट का उपयोग करें
🤝 ग्राहकों से अच्छे रिश्ते बनाएं
📊 महीने भर की बिक्री का रिकॉर्ड रखें`
            : `For business success:
💰 Always maintain proper accounts
📱 Use digital payments for transparency
🤝 Build good relationships with customers
📊 Keep monthly sales records`,
        confidence: 0.8
    };
}

/**
 * Product Creation responses
 */
function getProductResponse(message: string, isHindi: boolean): { text: string; confidence: number } {
    return {
        text: isHindi
            ? `नए प्रोडक्ट बनाने के लिए:
🎨 ट्रेंडिंग कलर्स और पैटर्न देखें
📱 Pinterest, Instagram से आइडिया लें
🌟 ट्रेडिशनल और मॉडर्न का मिक्स करें
👥 ग्राहकों से फीडबैक लें
🔄 छोटे-छोटे बदलाव करके टेस्ट करें`
            : `For creating new products:
🎨 Follow trending colors and patterns
📱 Get ideas from Pinterest, Instagram
🌟 Mix traditional with modern elements
👥 Get customer feedback regularly
🔄 Test small changes before full production`,
        confidence: 0.8
    };
}

/**
 * Marketing & Sales responses
 */
function getMarketingResponse(message: string, isHindi: boolean): { text: string; confidence: number } {
    return {
        text: isHindi
            ? `ऑनलाइन मार्केटिंग के तरीके:
📱 Facebook पेज बनाएं और रेगुलर पोस्ट करें
📸 Instagram पर अपने प्रोडक्ट की अच्छी फोटो डालें
💬 WhatsApp Business का उपयोग करें
🛒 Amazon Karigar पर अपना स्टोर बनाएं
🎯 अपनी कहानी शेयर करें`
            : `Online marketing strategies:
📱 Create Facebook page and post regularly
📸 Share high-quality product photos on Instagram
💬 Use WhatsApp Business for customer communication
🛒 Set up store on Amazon Karigar
🎯 Share your story and journey`,
        confidence: 0.9
    };
}

/**
 * Government Schemes responses
 */
function getGovernmentResponse(message: string, isHindi: boolean): { text: string; confidence: number } {
    return {
        text: isHindi
            ? `सरकारी योजनाएं जो आपकी मदद कर सकती हैं:
🏛️ PM Vishwakarma Yojana - कारीगरों के लिए स्पेशल
💰 Mudra Loan - बिजनेस लोन (10 लाख तक)
👩‍💼 Stand Up India - महिला उद्यमियों के लिए
📋 PMEGP - नया बिजनेस शुरू करने के लिए
🔗 pmvishwakarma.gov.in पर जाकर अप्लाई करें`
            : `Government schemes that can help you:
🏛️ PM Vishwakarma Yojana - Special for artisans
💰 Mudra Loan - Business loan (up to 10 lakhs)
👩‍💼 Stand Up India - For women entrepreneurs
📋 PMEGP - For starting new business
🔗 Apply at pmvishwakarma.gov.in`,
        confidence: 0.9
    };
}

/**
 * Greeting responses
 */
function getGreetingResponse(isHindi: boolean, context?: any): { text: string; confidence: number } {
    const name = context?.name ? ` ${context.name}` : '';

    return {
        text: isHindi
            ? `🙏 नमस्ते${name}! मैं आपका Artisan Buddy हूँ।

मैं आपकी इन चीजों में मदद कर सकता हूँ:
🎨 नए प्रोडक्ट डिज़ाइन करना
💰 बिजनेस और पैसों का हिसाब
📱 ऑनलाइन मार्केटिंग और सेलिंग
🏛️ सरकारी योजनाओं की जानकारी

आप मुझसे हिंदी या अंग्रेजी में कुछ भी पूछ सकते हैं!`
            : `👋 Hello${name}! I'm your Artisan Buddy.

I can help you with:
🎨 Creating new product designs
💰 Business and financial management
📱 Online marketing and selling
🏛️ Government scheme information

Feel free to ask me anything in Hindi or English!`,
        confidence: 0.9
    };
}

/**
 * General responses
 */
function getGeneralResponse(message: string, isHindi: boolean): { text: string; confidence: number } {
    return {
        text: isHindi
            ? `मैं आपका Artisan Buddy हूँ। आप मुझसे पूछ सकते हैं:
• अपने प्रोडक्ट कैसे बेचें
• नए डिज़ाइन कैसे बनाएं
• बिजनेस कैसे बढ़ाएं
• डिजिटल मार्केटिंग कैसे करें
• सरकारी योजनाओं के बारे में

कृपया अपना सवाल स्पष्ट रूप से पूछें।`
            : `I'm your Artisan Buddy. You can ask me about:
• How to sell your products
• Creating new designs
• Growing your business
• Digital marketing strategies
• Government schemes and support

Please ask your question clearly.`,
        confidence: 0.7
    };
}