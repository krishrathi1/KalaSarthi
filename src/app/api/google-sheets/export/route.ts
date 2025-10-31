import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    console.log('📊 Google Sheets Export Request:', {
      summary: data.summary,
      productsCount: data.topProducts?.length,
      salesCount: data.recentSales?.length
    });

    // Load service account credentials
    const serviceAccount = require('../../../../../key.json');

    // Initialize Google Sheets API with service account
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
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
