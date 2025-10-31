import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  let data: any;
  
  try {
    data = await request.json();

    console.log('📊 Google Sheets Export Request:', {
      summary: data.summary,
      productsCount: data.topProducts?.length,
      salesCount: data.recentSales?.length
    });

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

    console.log('🔑 Using Google Cloud credentials:', {
      project_id: credentials.project_id,
      client_email: credentials.client_email,
      has_private_key: !!credentials.private_key
    });

    // Initialize Google Sheets API with service account
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Create a new spreadsheet
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `Digital Khata - ${data.summary.period} - ${new Date().toLocaleDateString('en-IN')}`,
        },
        sheets: [
          { properties: { title: 'Summary' } },
          { properties: { title: 'Top Products' } },
          { properties: { title: 'Recent Sales' } },
          { properties: { title: 'Monthly Trend' } },
        ],
      },
    });

    const spreadsheetId = createResponse.data.spreadsheetId!;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    // Prepare data for sheets
    const summaryData = [
      ['Digital Khata Sales Report'],
      ['Period', data.summary.period],
      ['Export Date', new Date().toLocaleString('en-IN')],
      [''],
      ['Metric', 'Value'],
      ['Total Revenue', `₹${data.summary.totalRevenue.toLocaleString('en-IN')}`],
      ['Total Orders', data.summary.totalOrders.toString()],
      ['Total Units', data.summary.totalUnits.toString()],
      ['Average Order Value', `₹${data.summary.averageOrderValue.toLocaleString('en-IN')}`],
    ];

    const productsData = [
      ['Rank', 'Product Name', 'Revenue', 'Units Sold', '% of Total'],
      ...data.topProducts.map((p: any, i: number) => [
        (i + 1).toString(),
        p.productName,
        `₹${p.revenue.toLocaleString('en-IN')}`,
        p.units.toString(),
        `${Math.round((p.revenue / data.summary.totalRevenue) * 100)}%`,
      ]),
    ];

    const salesData = [
      ['Product', 'Buyer', 'Quantity', 'Amount', 'Status', 'Date'],
      ...data.recentSales.map((s: any) => [
        s.productName,
        s.buyerName,
        s.quantity.toString(),
        `₹${s.totalAmount.toLocaleString('en-IN')}`,
        s.paymentStatus,
        new Date(s.timestamp).toLocaleString('en-IN'),
      ]),
    ];

    const trendData = [
      ['Month', 'Revenue', 'Orders'],
      ...data.monthlyTrend.map((m: any) => [
        m.month,
        `₹${m.revenue.toLocaleString('en-IN')}`,
        m.orders.toString(),
      ]),
    ];

    // Write data to sheets
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        data: [
          { range: 'Summary!A1', values: summaryData },
          { range: 'Top Products!A1', values: productsData },
          { range: 'Recent Sales!A1', values: salesData },
          { range: 'Monthly Trend!A1', values: trendData },
        ],
        valueInputOption: 'RAW',
      },
    });

    // Format the sheets (bold headers, etc.)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Bold first row in all sheets
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: 'userEnteredFormat.textFormat.bold',
            },
          },
          {
            repeatCell: {
              range: { sheetId: 1, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: 'userEnteredFormat.textFormat.bold',
            },
          },
          {
            repeatCell: {
              range: { sheetId: 2, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: 'userEnteredFormat.textFormat.bold',
            },
          },
          {
            repeatCell: {
              range: { sheetId: 3, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: 'userEnteredFormat.textFormat.bold',
            },
          },
          // Auto-resize columns
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 5 },
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 1, dimension: 'COLUMNS', startIndex: 0, endIndex: 5 },
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 2, dimension: 'COLUMNS', startIndex: 0, endIndex: 6 },
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 3, dimension: 'COLUMNS', startIndex: 0, endIndex: 3 },
            },
          },
        ],
      },
    });

    // Share the spreadsheet with the service account email (so it's accessible)
    // Note: The sheet will be owned by the service account
    // To make it accessible to users, you'd need to share it with their email

    console.log('✅ Google Sheet created:', spreadsheetUrl);

    return NextResponse.json({
      success: true,
      message: 'Data exported to Google Sheets successfully',
      sheetsUrl: spreadsheetUrl,
      spreadsheetId,
      data: {
        exportedAt: new Date().toISOString(),
        recordCount: {
          products: data.topProducts?.length || 0,
          sales: data.recentSales?.length || 0,
          trends: data.monthlyTrend?.length || 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Google Sheets export error:', error);
    
    // If it's an authentication error, provide helpful guidance
    if (error.message?.includes('invalid_grant') || error.message?.includes('account not found')) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets API authentication failed',
        message: 'The Google Cloud service account needs proper setup. Please ensure the Google Sheets API is enabled and the service account has the necessary permissions.',
        troubleshooting: {
          steps: [
            '1. Enable Google Sheets API in Google Cloud Console',
            '2. Ensure the service account has Editor permissions',
            '3. Create a test spreadsheet and share it with the service account email',
            '4. Update GOOGLE_SHEETS_SPREADSHEET_ID with the test spreadsheet ID'
          ],
          serviceAccountEmail: process.env.GOOGLE_CLOUD_CLIENT_EMAIL
        },
        mockExport: {
          message: 'Here\'s what would be exported to Google Sheets:',
          summary: data.summary,
          productCount: data.topProducts?.length || 0,
          salesCount: data.recentSales?.length || 0,
          trendCount: data.monthlyTrend?.length || 0
        }
      }, { status: 200 }); // Return 200 so the frontend can show the mock data
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Export failed',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
