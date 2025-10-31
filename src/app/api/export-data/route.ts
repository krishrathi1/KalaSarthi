import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const format = new URL(request.url).searchParams.get('format') || 'csv';

    console.log('📊 Exporting sales data:', {
      format,
      summary: data.summary,
      productsCount: data.topProducts?.length,
      salesCount: data.recentSales?.length
    });

    let content = '';
    let filename = '';
    let contentType = '';

    if (format === 'csv') {
      // Generate CSV content
      content = generateCSV(data);
      filename = `digital-khata-export-${new Date().toISOString().split('T')[0]}.csv`;
      contentType = 'text/csv';
    } else if (format === 'json') {
      // Generate JSON content
      content = JSON.stringify({
        exportInfo: {
          exportedAt: new Date().toISOString(),
          period: data.summary.period,
          generatedBy: 'Digital Khata System'
        },
        summary: data.summary,
        topProducts: data.topProducts,
        recentSales: data.recentSales,
        monthlyTrend: data.monthlyTrend
      }, null, 2);
      filename = `digital-khata-export-${new Date().toISOString().split('T')[0]}.json`;
      contentType = 'application/json';
    } else if (format === 'excel') {
      // Generate Excel-compatible CSV with better formatting
      content = generateExcelCSV(data);
      filename = `digital-khata-export-${new Date().toISOString().split('T')[0]}.csv`;
      contentType = 'text/csv';
    }

    // Return the file content as a downloadable response
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ Export error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    }, { status: 500 });
  }
}

function generateCSV(data: any): string {
  let csv = '';
  
  // Summary section
  csv += 'DIGITAL KHATA SALES REPORT\\n';
  csv += `Export Date,${new Date().toLocaleString('en-IN')}\\n`;
  csv += `Period,${data.summary.period}\\n`;
  csv += '\\n';
  
  // Summary metrics
  csv += 'SUMMARY METRICS\\n';
  csv += 'Metric,Value\\n';
  csv += `Total Revenue,₹${data.summary.totalRevenue.toLocaleString('en-IN')}\\n`;
  csv += `Total Orders,${data.summary.totalOrders}\\n`;
  csv += `Total Units,${data.summary.totalUnits}\\n`;
  csv += `Average Order Value,₹${data.summary.averageOrderValue.toLocaleString('en-IN')}\\n`;
  csv += '\\n';
  
  // Top products section
  if (data.topProducts && data.topProducts.length > 0) {
    csv += 'TOP PRODUCTS\\n';
    csv += 'Rank,Product Name,Revenue,Units Sold,% of Total Revenue\\n';
    data.topProducts.forEach((product: any, index: number) => {
      const percentage = ((product.revenue / data.summary.totalRevenue) * 100).toFixed(1);
      csv += `${index + 1},"${product.productName}",₹${product.revenue.toLocaleString('en-IN')},${product.units},${percentage}%\\n`;
    });
    csv += '\\n';
  }
  
  // Recent sales section
  if (data.recentSales && data.recentSales.length > 0) {
    csv += 'RECENT SALES\\n';
    csv += 'Product,Customer,Quantity,Amount,Status,Date\\n';
    data.recentSales.forEach((sale: any) => {
      const date = new Date(sale.timestamp).toLocaleString('en-IN');
      csv += `"${sale.productName}","${sale.buyerName}",${sale.quantity},₹${sale.totalAmount.toLocaleString('en-IN')},${sale.paymentStatus},"${date}"\\n`;
    });
    csv += '\\n';
  }
  
  // Monthly trend section
  if (data.monthlyTrend && data.monthlyTrend.length > 0) {
    csv += 'MONTHLY TREND\\n';
    csv += 'Month,Revenue,Orders\\n';
    data.monthlyTrend.forEach((trend: any) => {
      csv += `"${trend.month}",₹${trend.revenue.toLocaleString('en-IN')},${trend.orders}\\n`;
    });
  }
  
  return csv;
}

function generateExcelCSV(data: any): string {
  let csv = '';
  
  // Add BOM for proper UTF-8 encoding in Excel
  csv = '\\uFEFF';
  
  // Summary section with better Excel formatting
  csv += 'DIGITAL KHATA SALES REPORT\\n';
  csv += `Export Date,${new Date().toLocaleString('en-IN')}\\n`;
  csv += `Period,${data.summary.period}\\n`;
  csv += '\\n';
  
  // Summary metrics
  csv += 'SUMMARY METRICS\\n';
  csv += 'Metric,Value\\n';
  csv += `Total Revenue,${data.summary.totalRevenue}\\n`;
  csv += `Total Orders,${data.summary.totalOrders}\\n`;
  csv += `Total Units,${data.summary.totalUnits}\\n`;
  csv += `Average Order Value,${data.summary.averageOrderValue}\\n`;
  csv += '\\n';
  
  // Top products section
  if (data.topProducts && data.topProducts.length > 0) {
    csv += 'TOP PRODUCTS\\n';
    csv += 'Rank,Product Name,Revenue,Units Sold,Percentage\\n';
    data.topProducts.forEach((product: any, index: number) => {
      const percentage = (product.revenue / data.summary.totalRevenue) * 100;
      csv += `${index + 1},"${product.productName}",${product.revenue},${product.units},${percentage.toFixed(1)}\\n`;
    });
    csv += '\\n';
  }
  
  // Recent sales section
  if (data.recentSales && data.recentSales.length > 0) {
    csv += 'RECENT SALES\\n';
    csv += 'Product,Customer,Quantity,Amount,Status,Date\\n';
    data.recentSales.forEach((sale: any) => {
      const date = new Date(sale.timestamp).toISOString().split('T')[0];
      csv += `"${sale.productName}","${sale.buyerName}",${sale.quantity},${sale.totalAmount},"${sale.paymentStatus}","${date}"\\n`;
    });
    csv += '\\n';
  }
  
  // Monthly trend section
  if (data.monthlyTrend && data.monthlyTrend.length > 0) {
    csv += 'MONTHLY TREND\\n';
    csv += 'Month,Revenue,Orders\\n';
    data.monthlyTrend.forEach((trend: any) => {
      csv += `"${trend.month}",${trend.revenue},${trend.orders}\\n`;
    });
  }
  
  return csv;
}