import { GoogleGenerativeAI } from '@google/generative-ai';

export async function testGeminiAPI(): Promise<{
    success: boolean;
    error?: string;
    response?: string;
    apiKeyExists: boolean;
    details?: any;
}> {
    try {
        const apiKeyExists = !!process.env.GEMINI_API_KEY;
        console.log('API Key exists:', apiKeyExists);
        console.log('API Key (first 10 chars):', process.env.GEMINI_API_KEY?.substring(0, 10));

        if (!apiKeyExists) {
            return {
                success: false,
                error: 'GEMINI_API_KEY not found in environment variables',
                apiKeyExists: false
            };
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 512,
            }
        });

        console.log('Testing simple prompt...');
        const prompt = "Hello, can you tell me about cotton fabric in one sentence?";

        const startTime = Date.now();
        const result = await model.generateContent(prompt);
        const endTime = Date.now();

        const response = result.response.text();
        console.log('Response received in', endTime - startTime, 'ms');
        console.log('Response:', response);

        return {
            success: true,
            response,
            apiKeyExists: true,
            details: {
                responseTime: endTime - startTime,
                responseLength: response.length
            }
        };

    } catch (error: any) {
        console.error('Gemini API test failed:', error);

        let errorMessage = error.message || 'Unknown error';
        let errorDetails: any = {};

        // Check for specific error types
        if (error.message?.includes('API_KEY_INVALID')) {
            errorMessage = 'Invalid API key';
        } else if (error.message?.includes('QUOTA_EXCEEDED')) {
            errorMessage = 'API quota exceeded';
        } else if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
            errorMessage = 'Rate limit exceeded';
        } else if (error.message?.includes('PERMISSION_DENIED')) {
            errorMessage = 'Permission denied - check API key permissions';
        } else if (error.message?.includes('RESOURCE_EXHAUSTED')) {
            errorMessage = 'Resource exhausted - rate limit or quota issue';
        }

        // Capture error details
        if (error.status) errorDetails.status = error.status;
        if (error.statusText) errorDetails.statusText = error.statusText;
        if (error.code) errorDetails.code = error.code;

        return {
            success: false,
            error: errorMessage,
            apiKeyExists: !!process.env.GEMINI_API_KEY,
            details: errorDetails
        };
    }
}

export async function testMultipleRequests(count: number = 3): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    errors: string[];
}> {
    const results = [];
    const errors: string[] = [];
    let totalTime = 0;

    for (let i = 0; i < count; i++) {
        console.log(`Testing request ${i + 1}/${count}...`);
        const result = await testGeminiAPI();
        results.push(result);

        if (result.success) {
            totalTime += result.details?.responseTime || 0;
        } else {
            errors.push(`Request ${i + 1}: ${result.error}`);
        }

        // Add delay between requests to avoid rate limiting
        if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.filter(r => !r.success).length;
    const averageResponseTime = successfulRequests > 0 ? totalTime / successfulRequests : 0;

    return {
        totalRequests: count,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        errors
    };
}