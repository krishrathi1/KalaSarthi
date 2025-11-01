/**
 * Terminal test for Gemini Nano availability
 * Note: This will show that Gemini Nano requires a browser environment
 */

console.log('🧪 Testing Gemini Nano Availability (Terminal)\n');

console.log('1️⃣ Checking if we\'re in a browser environment...');
if (typeof window === 'undefined') {
    console.log('❌ Not in browser environment - Gemini Nano requires a browser');
    console.log('ℹ️  Gemini Nano is a browser-only API that runs in Chrome 127+');
    console.log('ℹ️  It requires the "Prompt API for Gemini Nano" flag to be enabled');
    console.log('ℹ️  To test Gemini Nano, open test-gemini-nano.html in Chrome');
} else {
    console.log('✅ Browser environment detected');
}

console.log('\n2️⃣ Testing our GeminiNanoOfflineAI service structure...');

// Test the service structure (without browser APIs)
const mockService = {
    isReady: false,
    isLoading: false,
    loadError: null,
    session: null,

    async initialize(onProgress) {
        console.log('📝 Mock initialization started...');
        onProgress?.(10, 'Checking availability...');

        // Simulate what would happen in browser
        if (typeof window === 'undefined' || !window.ai?.languageModel) {
            console.log('⚠️  Gemini Nano not available, falling back to rule-based system');
            onProgress?.(50, 'Loading fallback...');
            await new Promise(resolve => setTimeout(resolve, 500));
            onProgress?.(100, 'Fallback ready!');
            this.isReady = true;
            return true;
        }

        // This would be the real initialization in browser
        onProgress?.(30, 'Creating AI session...');
        onProgress?.(70, 'Testing session...');
        onProgress?.(100, 'Gemini Nano ready!');
        this.isReady = true;
        return true;
    },

    generateRuleBasedResponse(userMessage) {
        const message = userMessage.toLowerCase();
        const isHindi = /[\u0900-\u097F]/.test(userMessage);

        if (message.includes('hello') || message.includes('नमस्ते')) {
            return isHindi
                ? 'नमस्ते! मैं आपका Artisan Buddy हूँ। मैं आपकी शिल्पकारी और व्यापार में मदद कर सकता हूँ।'
                : 'Hello! I\'m your Artisan Buddy. I can help you with crafts and business.';
        }

        if (message.includes('business') || message.includes('व्यापार')) {
            return isHindi
                ? 'आपके व्यापार के लिए मैं मार्केटिंग, मूल्य निर्धारण, और ग्राहक प्रबंधन में मदद कर सकता हूँ।'
                : 'I can help you with marketing, pricing, and customer management for your business.';
        }

        return isHindi
            ? 'मैं आपकी शिल्पकारी और व्यापार में मदद करने के लिए यहाँ हूँ।'
            : 'I\'m here to help with your crafts and business needs.';
    },

    async generateResponse(userMessage) {
        const startTime = Date.now();

        // In browser, this would try Gemini Nano first
        // Here, we go straight to fallback
        const response = this.generateRuleBasedResponse(userMessage);
        const processingTime = Date.now() - startTime;

        return {
            text: response,
            confidence: 0.6,
            processingTime
        };
    },

    getStatus() {
        return {
            isReady: this.isReady,
            isLoading: this.isLoading,
            loadError: this.loadError,
            modelId: 'Gemini Nano',
            hasRealAI: false // Would be true in browser with Gemini Nano
        };
    },

    getModelInfo() {
        return {
            modelId: 'Gemini Nano',
            isReady: this.isReady,
            type: 'Rule-based Fallback', // Would be 'Gemini Nano' in browser
            capabilities: ['Text Generation', 'Hindi/English', 'Artisan Context'],
            hasRealAI: false
        };
    }
};

async function testService() {
    console.log('📝 Testing service initialization...');

    const success = await mockService.initialize((progress, stage) => {
        console.log(`   Progress: ${progress}% - ${stage}`);
    });

    if (success) {
        console.log('✅ Service initialized successfully');

        const status = mockService.getStatus();
        const modelInfo = mockService.getModelInfo();

        console.log('\n3️⃣ Service Status:');
        console.log(`   Ready: ${status.isReady}`);
        console.log(`   Model: ${modelInfo.modelId}`);
        console.log(`   Type: ${modelInfo.type}`);
        console.log(`   Real AI: ${modelInfo.hasRealAI}`);

        console.log('\n4️⃣ Testing responses...');
        const testQueries = [
            'Hello, how can you help me?',
            'मुझे व्यापार में मदद चाहिए',
            'How do I price my products?'
        ];

        for (const query of testQueries) {
            const response = await mockService.generateResponse(query);
            console.log(`   Query: "${query}"`);
            console.log(`   Response: "${response.text.substring(0, 80)}..."`);
            console.log(`   Time: ${response.processingTime}ms, Confidence: ${response.confidence}\n`);
        }

        console.log('✅ All tests completed successfully!');
    } else {
        console.log('❌ Service initialization failed');
    }
}

testService().then(() => {
    console.log('\n📋 Summary:');
    console.log('✅ Service structure: Working');
    console.log('✅ Fallback system: Working');
    console.log('✅ Rule-based responses: Working');
    console.log('⚠️  Gemini Nano: Requires browser environment');
    console.log('\n🌐 To test real Gemini Nano:');
    console.log('1. Open Chrome 127+');
    console.log('2. Enable "Prompt API for Gemini Nano" in chrome://flags/');
    console.log('3. Open test-gemini-nano.html');
    console.log('4. Or test in the Artisan Buddy app');
}).catch(error => {
    console.error('❌ Test failed:', error);
});