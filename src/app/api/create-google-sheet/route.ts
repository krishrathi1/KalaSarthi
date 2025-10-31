import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    console.log('📊 Creating new Google Sheet for Digital Khata...');
    
    // Load service account credentials from environment variables
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

    // Validate required environment variables
    if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
      throw new Error('Missing required Google Cloud credentials. Please check your environment variables.');
    }

    // Initialize Google Sheets API with service account
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Create a new spreadsheet
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `Digital Khata - Sales Data - ${new Date().toLocaleDateString('en-IN')}`,
        },
        sheets: [
          { 
            properties: { 
              title: 'SalesData',
              gridProperties: {
                rowCount: 1000,
                columnCount: 26
              }
            } 
          },
          { 
            properties: { 
              title: 'Config',
              gridProperties: {
                rowCount: 100,
                columnCount: 10
              }
            } 
          },
          { 
            properties: { 
              title: 'Summary',
              gridProperties: {
                rowCount: 100,
                columnCount: 10
              }
            } 
          }
        ],
      },
    });

    const spreadsheetId = createResponse.data.spreadsheetId!;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    console.log('✅ Created spreadsheet:', spreadsheetId);

    // Set up the SalesData sheet with headers
    const salesHeaders = [
      'Timestamp', 'OrderID', 'ArtisanID', 'ArtisanName', 'ProductID', 'ProductName',
      'Category', 'BuyerID', 'BuyerName', 'Quantity', 'UnitPrice', 'TotalAmount',
      'Discount', 'Tax', 'ShippingCost', 'NetAmount', 'PaymentMethod', 'PaymentStatus',
      'OrderStatus', 'Region', 'ArtisanLanguage', 'BuyerLanguage', 'DeliveryDate', 'Notes'
    ];

    // Set up the Config sheet with initial values
    const configData = [
      ['Key', 'Value'],
      ['TotalOrders', '0'],
      ['TotalRevenue', '0'],
      ['ActiveArtisans', '0'],
      ['LastUpdated', new Date().toISOString()]
    ];

    // Write headers and initial data
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        data: [
          { range: 'SalesData!A1:X1', values: [salesHeaders] },
          { range: 'Config!A1:B5', values: configData },
          { range: 'Summary!A1', values: [['Digital Khata Sales Summary']] }
        ],
        valueInputOption: 'RAW',
      },
    });

    // Format the headers (bold)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Bold headers in SalesData sheet
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
              cell: { 
                userEnteredFormat: { 
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                } 
              },
              fields: 'userEnteredFormat.textFormat.bold,userEnteredFormat.backgroundColor',
            },
          },
          // Bold headers in Config sheet
          {
            repeatCell: {
              range: { sheetId: 1, startRowIndex: 0, endRowIndex: 1 },
              cell: { 
                userEnteredFormat: { 
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                } 
              },
              fields: 'userEnteredFormat.textFormat.bold,userEnteredFormat.backgroundColor',
            },
          },
          // Auto-resize columns
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 24 },
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 1, dimension: 'COLUMNS', startIndex: 0, endIndex: 2 },
            },
          },
        ],
      },
    });

    // Make the spreadsheet publicly viewable (optional)
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });
      console.log('✅ Made spreadsheet publicly viewable');
    } catch (permError) {
      console.log('⚠️ Could not make spreadsheet public, but it\'s still accessible to the service account');
    }

    console.log('✅ Google Sheet setup completed:', spreadsheetUrl);

    return NextResponse.json({
      success: true,
      message: 'Google Sheet created and configured successfully',
      spreadsheetId,
      spreadsheetUrl,
      serviceAccountEmail: credentials.client_email,
      instructions: [
        '1. The spreadsheet has been created and configured',
        '2. Update your .env file with the new GOOGLE_SHEETS_SPREADSHEET_ID',
        '3. The service account has full access to this spreadsheet',
        '4. You can now export data from the dashboard'
      ]
    });

  } catch (error: any) {
    console.error('❌ Error creating Google Sheet:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create Google Sheet',
      details: error.toString()
    }, { status: 500 });
  }
}