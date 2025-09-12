#!/usr/bin/env node

/**
 * Test script for Vertex AI Imagen integration
 * This script tests the API endpoints and validates the integration
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
    baseUrl: 'http://localhost:3000',
    testImagePath: './test-image.jpg', // Place a test image here
    testStyles: ['vibrant', 'pastel', 'modern'],
    testColors: ['Red', 'Blue', 'Green']
};

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
    const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
    const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';

    log(`${statusSymbol} ${testName}: ${status}`, statusColor);
    if (details) {
        log(`   ${details}`, 'blue');
    }
}

async function testImageAnalysis() {
    log('\n🔍 Testing Image Analysis...', 'bold');

    try {
        // Check if test image exists
        if (!fs.existsSync(TEST_CONFIG.testImagePath)) {
            logTest('Image Analysis', 'SKIP', 'No test image found. Create test-image.jpg to test analysis.');
            return null;
        }

        const formData = new FormData();
        const imageBuffer = fs.readFileSync(TEST_CONFIG.testImagePath);
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append('image', blob, 'test-image.jpg');

        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/ai-image/analyze`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            logTest('Image Analysis', 'PASS', `Analyzed image with ${data.analysis.labels.length} labels`);
            return data.originalImageUrl;
        } else {
            logTest('Image Analysis', 'FAIL', data.error);
            return null;
        }
    } catch (error) {
        logTest('Image Analysis', 'FAIL', error.message);
        return null;
    }
}

async function testImageGeneration(originalImageUrl) {
    log('\n🎨 Testing Image Generation...', 'bold');

    if (!originalImageUrl) {
        logTest('Image Generation', 'SKIP', 'No original image URL available');
        return;
    }

    const testCases = [
        {
            name: 'Single Color Generation',
            style: 'vibrant',
            colors: ['Red']
        },
        {
            name: 'Multiple Colors Generation',
            style: 'pastel',
            colors: ['Blue', 'Green']
        },
        {
            name: 'All Colors Generation',
            style: 'modern',
            colors: TEST_CONFIG.testColors
        }
    ];

    for (const testCase of testCases) {
        try {
            const startTime = Date.now();

            const response = await fetch(`${TEST_CONFIG.baseUrl}/api/ai-image/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    originalImageUrl,
                    style: testCase.style,
                    colors: testCase.colors
                })
            });

            const data = await response.json();
            const processingTime = Date.now() - startTime;

            if (data.success) {
                logTest(
                    testCase.name,
                    'PASS',
                    `Generated ${data.count} images in ${processingTime}ms`
                );
            } else {
                logTest(
                    testCase.name,
                    'FAIL',
                    `${data.error} (Code: ${data.code})`
                );
            }
        } catch (error) {
            logTest(testCase.name, 'FAIL', error.message);
        }
    }
}

async function testErrorHandling() {
    log('\n🚨 Testing Error Handling...', 'bold');

    const errorTestCases = [
        {
            name: 'Invalid Style',
            payload: {
                originalImageUrl: 'data:image/jpeg;base64,test',
                style: 'invalid-style',
                colors: ['Red']
            },
            expectedCode: 'INVALID_STYLE'
        },
        {
            name: 'Invalid Colors',
            payload: {
                originalImageUrl: 'data:image/jpeg;base64,test',
                style: 'vibrant',
                colors: ['InvalidColor']
            },
            expectedCode: 'INVALID_COLORS'
        },
        {
            name: 'Too Many Colors',
            payload: {
                originalImageUrl: 'data:image/jpeg;base64,test',
                style: 'vibrant',
                colors: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange']
            },
            expectedCode: 'TOO_MANY_COLORS'
        },
        {
            name: 'Missing Parameters',
            payload: {
                originalImageUrl: 'data:image/jpeg;base64,test'
            },
            expectedCode: 'MISSING_PARAMETERS'
        }
    ];

    for (const testCase of errorTestCases) {
        try {
            const response = await fetch(`${TEST_CONFIG.baseUrl}/api/ai-image/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testCase.payload)
            });

            const data = await response.json();

            if (!data.success && data.code === testCase.expectedCode) {
                logTest(testCase.name, 'PASS', `Correctly returned ${data.code}`);
            } else {
                logTest(
                    testCase.name,
                    'FAIL',
                    `Expected ${testCase.expectedCode}, got ${data.code || 'SUCCESS'}`
                );
            }
        } catch (error) {
            logTest(testCase.name, 'FAIL', error.message);
        }
    }
}

async function testConfiguration() {
    log('\n⚙️ Testing Configuration...', 'bold');

    try {
        // Test if the app is running
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/ai-image/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                originalImageUrl: 'data:image/jpeg;base64,test',
                style: 'vibrant',
                colors: ['Red']
            })
        });

        if (response.status === 400) {
            logTest('API Endpoint', 'PASS', 'API is responding correctly');
        } else {
            logTest('API Endpoint', 'FAIL', `Unexpected status: ${response.status}`);
        }
    } catch (error) {
        logTest('API Endpoint', 'FAIL', `Cannot connect to API: ${error.message}`);
    }
}

async function runAllTests() {
    log('🧪 Starting Vertex AI Imagen Integration Tests', 'bold');
    log('='.repeat(50), 'blue');

    // Test configuration first
    await testConfiguration();

    // Test image analysis
    const originalImageUrl = await testImageAnalysis();

    // Test image generation
    await testImageGeneration(originalImageUrl);

    // Test error handling
    await testErrorHandling();

    log('\n' + '='.repeat(50), 'blue');
    log('✨ Test suite completed!', 'bold');
    log('\nTo run this test:');
    log('1. Start your Next.js development server: npm run dev');
    log('2. Place a test image as test-image.jpg in the project root');
    log('3. Run: node test-vertex-ai-integration.js');
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testImageAnalysis,
    testImageGeneration,
    testErrorHandling,
    testConfiguration
};
