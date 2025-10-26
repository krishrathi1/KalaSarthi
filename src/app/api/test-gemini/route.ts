import { NextRequest, NextResponse } from 'next/server';
import { testGeminiAPI, testMultipleRequests } from '@/lib/utils/gemini-diagnostics';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'single';
    const count = parseInt(searchParams.get('count') || '3');

    try {
        if (testType === 'multiple') {
            console.log(`Running ${count} test requests...`);
            const results = await testMultipleRequests(count);
            return NextResponse.json({
                testType: 'multiple',
                ...results
            });
        } else {
            console.log('Running single test request...');
            const result = await testGeminiAPI();
            return NextResponse.json({
                testType: 'single',
                ...result
            });
        }

    } catch (error: any) {
        console.error('Test API error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            apiKeyExists: !!process.env.GEMINI_API_KEY
        }, { status: 500 });
    }
}