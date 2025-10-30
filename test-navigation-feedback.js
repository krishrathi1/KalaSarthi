/**
 * Test script for NavigationFeedbackService
 * Tests the audio feedback generation functionality
 */

async function testNavigationFeedback() {
    console.log('🧪 Testing Navigation Feedback Service...\n');

    const testCases = [
        {
            name: 'English Confirmation',
            request: {
                type: 'confirmation',
                language: 'en-US',
                variables: { destination: 'dashboard' }
            }
        },
        {
            name: 'Hindi Navigation',
            request: {
                type: 'navigation',
                language: 'hi-IN',
                variables: { destination: 'प्रोफाइल' }
            }
        },
        {
            name: 'Error Message',
            request: {
                type: 'error',
                language: 'en-US',
                templateId: 'nav_error_not_found',
                variables: { command: 'unknown page' }
            }
        },
        {
            name: 'Help Command',
            request: {
                type: 'help',
                language: 'en-US',
                templateId: 'nav_help_commands'
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n📋 Testing: ${testCase.name}`);
        console.log(`Request:`, JSON.stringify(testCase.request, null, 2));

        try {
            const response = await fetch('http://localhost:3000/api/navigation-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testCase.request)
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Success!');
                console.log(`Text: "${result.textContent}"`);
                console.log(`Audio Format: ${result.audioFormat}`);
                console.log(`Duration: ${result.duration}s`);
                console.log(`Voice: ${result.voiceName}`);
                console.log(`Cached: ${result.cached}`);
                console.log(`Audio Size: ${result.audioBase64 ? result.audioBase64.length : 0} bytes (base64)`);
            } else {
                console.log('❌ Failed!');
                console.log(`Error: ${result.error}`);
                console.log(`Text Fallback: "${result.textContent}"`);
            }

        } catch (error) {
            console.log('❌ Request Failed!');
            console.log(`Error: ${error.message}`);
        }
    }

    // Test service health
    console.log('\n🏥 Testing Service Health...');
    try {
        const response = await fetch('http://localhost:3000/api/navigation-feedback');
        const health = await response.json();

        console.log('✅ Health Check Result:');
        console.log(`Status: ${health.status}`);
        console.log(`Supported Languages: ${health.supportedLanguages?.length || 0}`);
        console.log(`Cache Stats:`, health.cacheStats);
        console.log(`Configuration:`, health.config);

    } catch (error) {
        console.log('❌ Health Check Failed!');
        console.log(`Error: ${error.message}`);
    }

    console.log('\n🎯 Navigation Feedback Service Test Complete!');
}

// Run the test
testNavigationFeedback().catch(console.error);