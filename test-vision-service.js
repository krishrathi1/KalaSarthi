/**
 * Test script for Vision Service
 * 
 * Tests the Vision Service implementation
 */

const testVisionService = async () => {
  console.log('Testing Vision Service...\n');

  // Test 1: Analyze a sample image URL
  console.log('Test 1: Image Analysis');
  try {
    const response = await fetch('http://localhost:9003/api/artisan-buddy/vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: 'https://storage.googleapis.com/artisan-buddy-images/sample/pottery.jpg',
        options: {
          includeCraftDetection: true,
          includeTextExtraction: false,
        },
      }),
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✓ Test 1 passed\n');
  } catch (error) {
    console.error('✗ Test 1 failed:', error.message);
  }

  // Test 2: Get API info
  console.log('Test 2: API Info');
  try {
    const response = await fetch('http://localhost:9003/api/artisan-buddy/vision');
    const data = await response.json();
    console.log('API Info:', JSON.stringify(data, null, 2));
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('✗ Test 2 failed:', error.message);
  }

  // Test 3: Error handling - missing imageUrl
  console.log('Test 3: Error Handling');
  try {
    const response = await fetch('http://localhost:9003/api/artisan-buddy/vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    if (data.error) {
      console.log('Expected error:', data.error);
      console.log('✓ Test 3 passed\n');
    } else {
      console.error('✗ Test 3 failed: Expected error but got success');
    }
  } catch (error) {
    console.error('✗ Test 3 failed:', error.message);
  }

  console.log('Vision Service tests completed!');
};

// Run tests
testVisionService().catch(console.error);
