import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/service/GoogleSheetsService';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Google Sheets credentials...');
    
    // Check if all required environment variables are present
    const requiredEnvVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_PRIVATE_KEY',
      'GOOGLE_CLOUD_CLIENT_EMAIL',
      'GOOGLE_SHEETS_SPREADSHEET_ID'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required environment variables: ${missingVars.join(', ')}`,
        availableVars: requiredEnvVars.filter(varName => !!process.env[varName])
      }, { status: 500 });
    }
    
    console.log('✅ All required environment variables are present');
    
    // Test basic Google Auth without accessing sheets
    const { google } = require('googleapis');
    
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL
    };
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Test authentication
    const authClient = await auth.getClient();
    console.log('✅ Google Auth client created successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Google Sheets credentials are valid!',
      details: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        clientEmail: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
        hasPrivateKey: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY
      }
    });
    
  } catch (error) {
    console.error('🚨 Google Sheets credentials test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Google Sheets export...');
    
    // Sample export data
    const testData = {
      summary: {
        period: 'test',
        totalRevenue: 50000,
        totalOrders: 25,
        totalUnits: 100,
        averageOrderValue: 2000
      },
      topProducts: [
        { productName: 'Test Product 1', revenue: 20000, units: 40 },
        { productName: 'Test Product 2', revenue: 15000, units: 30 },
        { productName: 'Test Product 3', revenue: 10000, units: 20 }
      ],
      recentSales: [
        {
          productName: 'Test Product 1',
          buyerName: 'Test Customer 1',
          quantity: 2,
          totalAmount: 4000,
          paymentStatus: 'Paid',
          timestamp: new Date().toISOString()
        },
        {
          productName: 'Test Product 2',
          buyerName: 'Test Customer 2',
          quantity: 1,
          totalAmount: 2000,
          paymentStatus: 'Fulfilled',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      monthlyTrend: [
        { month: 'Jan 2024', revenue: 45000, orders: 20 },
        { month: 'Feb 2024', revenue: 50000, orders: 25 },
        { month: 'Mar 2024', revenue: 55000, orders: 30 }
      ]
    };
    
    // Test the export endpoint
    const exportResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/google-sheets/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    let exportResult;
    try {
      exportResult = await exportResponse.json();
    } catch (parseError) {
      exportResult = {
        success: false,
        error: `Failed to parse response (status: ${exportResponse.status})`,
        rawResponse: await exportResponse.text()
      };
    }
    
    return NextResponse.json({
      success: true,
      message: 'Google Sheets export test completed',
      exportResult
    });
    
  } catch (error) {
    console.error('🚨 Google Sheets export test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}