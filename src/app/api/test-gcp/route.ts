import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

export async function GET(request: NextRequest) {
  try {
    // Test Google Cloud Vision API connection
    const visionClient = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GCP_PROJECT_ID,
    });

    // Test with a simple image (1x1 pixel)
    const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

    const [result] = await visionClient.labelDetection({
      image: { content: testImage },
    });

    return NextResponse.json({
      success: true,
      message: 'Google Cloud Vision API is working',
      labels: result.labelAnnotations?.map(label => ({
        description: label.description,
        score: label.score
      })) || [],
      projectId: process.env.GCP_PROJECT_ID,
      credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

  } catch (error) {
    console.error('Google Cloud Vision API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
      details: {
        projectId: process.env.GCP_PROJECT_ID,
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    }, { status: 500 });
  }
}
