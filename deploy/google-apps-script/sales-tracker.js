/**
 * Google Apps Script for KalaBandhu Sales Data Automation
 * This script automates sales data storage and retrieval for the DigitalKhata
 */

// Global variables
const SHEET_NAME = 'SalesData';
const CONFIG_SHEET = 'Config';
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Replace with actual spreadsheet ID

/**
 * Initialize the spreadsheet with required sheets and headers
 */
function initializeSpreadsheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // Create SalesData sheet if it doesn't exist
  let salesSheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!salesSheet) {
    salesSheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  // Set up headers for SalesData sheet
  const salesHeaders = [
    'Timestamp',
    'OrderID',
    'ArtisanID',
    'ArtisanName',
    'ProductID',
    'ProductName',
    'Category',
    'BuyerID',
    'BuyerName',
    'Quantity',
    'UnitPrice',
    'TotalAmount',
    'Discount',
    'Tax',
    'ShippingCost',
    'NetAmount',
    'PaymentMethod',
    'PaymentStatus',
    'OrderStatus',
    'Region',
    'ArtisanLanguage',
    'BuyerLanguage',
    'DeliveryDate',
    'Notes'
  ];

  salesSheet.getRange(1, 1, 1, salesHeaders.length).setValues([salesHeaders]);
  salesSheet.getRange(1, 1, 1, salesHeaders.length).setFontWeight('bold');

  // Create Config sheet for metadata
  let configSheet = spreadsheet.getSheetByName(CONFIG_SHEET);
  if (!configSheet) {
    configSheet = spreadsheet.insertSheet(CONFIG_SHEET);
  }

  const configHeaders = ['Key', 'Value', 'Description'];
  configSheet.getRange(1, 1, 1, configHeaders.length).setValues([configHeaders]);
  configSheet.getRange(1, 1, 1, configHeaders.length).setFontWeight('bold');

  // Initialize config values
  const configData = [
    ['LastUpdated', new Date().toISOString(), 'Last data update timestamp'],
    ['TotalOrders', '0', 'Total number of orders'],
    ['TotalRevenue', '0', 'Total revenue amount'],
    ['ActiveArtisans', '0', 'Number of active artisans'],
    ['DataVersion', '1.0', 'Data schema version']
  ];

  configSheet.getRange(2, 1, configData.length, 3).setValues(configData);

  return {
    success: true,
    message: 'Spreadsheet initialized successfully',
    spreadsheetId: spreadsheet.getId()
  };
}

/**
 * Add new sales order to the spreadsheet
 */
function addSalesOrder(orderData) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error('SalesData sheet not found. Please run initializeSpreadsheet() first.');
  }

  // Prepare order data
  const timestamp = new Date();
  const rowData = [
    timestamp.toISOString(),
    orderData.orderId || generateOrderId(),
    orderData.artisanId || '',
    orderData.artisanName || '',
    orderData.productId || '',
    orderData.productName || '',
    orderData.category || '',
    orderData.buyerId || '',
    orderData.buyerName || '',
    orderData.quantity || 1,
    orderData.unitPrice || 0,
    orderData.totalAmount || 0,
    orderData.discount || 0,
    orderData.tax || 0,
    orderData.shippingCost || 0,
    orderData.netAmount || orderData.totalAmount || 0,
    orderData.paymentMethod || 'COD',
    orderData.paymentStatus || 'pending',
    orderData.orderStatus || 'pending',
    orderData.region || '',
    orderData.artisanLanguage || 'hi',
    orderData.buyerLanguage || 'hi',
    orderData.deliveryDate || '',
    orderData.notes || ''
  ];

  // Append to sheet
  sheet.appendRow(rowData);

  // Update config sheet with latest stats
  updateSalesStats();

  return {
    success: true,
    orderId: rowData[1],
    timestamp: rowData[0],
    message: 'Order added successfully'
  };
}

/**
 * Update sales statistics in config sheet
 */
function updateSalesStats() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const salesSheet = spreadsheet.getSheetByName(SHEET_NAME);
  const configSheet = spreadsheet.getSheetByName(CONFIG_SHEET);

  if (!salesSheet || !configSheet) return;

  const data = salesSheet.getDataRange().getValues();
  const orders = data.slice(1); // Skip header

  // Calculate stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, row) => sum + (parseFloat(row[11]) || 0), 0);
  const activeArtisans = new Set(orders.map(row => row[2]).filter(id => id)).size;

  // Update config values
  const configData = configSheet.getDataRange().getValues();
  const updates = [
    ['LastUpdated', new Date().toISOString()],
    ['TotalOrders', totalOrders.toString()],
    ['TotalRevenue', totalRevenue.toString()],
    ['ActiveArtisans', activeArtisans.toString()]
  ];

  updates.forEach(([key, value]) => {
    const rowIndex = configData.findIndex(row => row[0] === key);
    if (rowIndex > -1) {
      configSheet.getRange(rowIndex + 1, 2).setValue(value);
    }
  });
}

/**
 * Get sales data with filtering options
 */
function getSalesData(options = {}) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error('SalesData sheet not found');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let orders = data.slice(1).map(row => {
    const order = {};
    headers.forEach((header, index) => {
      order[header] = row[index];
    });
    return order;
  });

  // Apply filters
  if (options.artisanId) {
    orders = orders.filter(order => order.ArtisanID === options.artisanId);
  }

  if (options.startDate) {
    const startDate = new Date(options.startDate);
    orders = orders.filter(order => new Date(order.Timestamp) >= startDate);
  }

  if (options.endDate) {
    const endDate = new Date(options.endDate);
    orders = orders.filter(order => new Date(order.Timestamp) <= endDate);
  }

  if (options.status) {
    orders = orders.filter(order => order.OrderStatus === options.status);
  }

  if (options.region) {
    orders = orders.filter(order => order.Region === options.region);
  }

  // Calculate summary
  const summary = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + (parseFloat(order.TotalAmount) || 0), 0),
    totalQuantity: orders.reduce((sum, order) => sum + (parseInt(order.Quantity) || 0), 0),
    averageOrderValue: orders.length > 0 ?
      orders.reduce((sum, order) => sum + (parseFloat(order.TotalAmount) || 0), 0) / orders.length : 0
  };

  return {
    success: true,
    data: orders,
    summary,
    count: orders.length
  };
}

/**
 * Get artisan performance metrics
 */
function getArtisanPerformance(artisanId, options = {}) {
  const salesData = getSalesData({ artisanId, ...options });

  if (!salesData.success) {
    return salesData;
  }

  const orders = salesData.data;
  const performance = {
    artisanId,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + (parseFloat(order.TotalAmount) || 0), 0),
    totalQuantity: orders.reduce((sum, order) => sum + (parseInt(order.Quantity) || 0), 0),
    averageOrderValue: orders.length > 0 ?
      orders.reduce((sum, order) => sum + (parseFloat(order.TotalAmount) || 0), 0) / orders.length : 0,
    topProducts: getTopProducts(orders),
    monthlyRevenue: calculateMonthlyRevenue(orders),
    region: orders[0]?.Region || '',
    language: orders[0]?.ArtisanLanguage || 'hi'
  };

  return {
    success: true,
    data: performance
  };
}

/**
 * Get top performing products for an artisan
 */
function getTopProducts(orders) {
  const productStats = {};

  orders.forEach(order => {
    const productId = order.ProductID;
    const productName = order.ProductName;
    const revenue = parseFloat(order.TotalAmount) || 0;
    const quantity = parseInt(order.Quantity) || 0;

    if (!productStats[productId]) {
      productStats[productId] = {
        productId,
        productName,
        totalRevenue: 0,
        totalQuantity: 0,
        orderCount: 0
      };
    }

    productStats[productId].totalRevenue += revenue;
    productStats[productId].totalQuantity += quantity;
    productStats[productId].orderCount += 1;
  });

  return Object.values(productStats)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);
}

/**
 * Calculate monthly revenue
 */
function calculateMonthlyRevenue(orders) {
  const monthlyData = {};

  orders.forEach(order => {
    const date = new Date(order.Timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const revenue = parseFloat(order.TotalAmount) || 0;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0;
    }
    monthlyData[monthKey] += revenue;
  });

  return monthlyData;
}

/**
 * Generate unique order ID
 */
function generateOrderId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

/**
 * Export data as CSV
 */
function exportSalesData(format = 'csv') {
  const salesData = getSalesData();

  if (!salesData.success) {
    return salesData;
  }

  const data = salesData.data;
  const headers = Object.keys(data[0] || {});

  let content = '';

  if (format === 'csv') {
    // CSV format
    content = headers.join(',') + '\n';
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      content += values.join(',') + '\n';
    });
  } else if (format === 'json') {
    content = JSON.stringify(data, null, 2);
  }

  return {
    success: true,
    data: content,
    format,
    count: data.length
  };
}

/**
 * Web app endpoint for API access
 */
function doGet(e) {
  const action = e.parameter.action;
  const params = e.parameters;

  try {
    let result;

    switch (action) {
      case 'getSalesData':
        result = getSalesData(params);
        break;
      case 'getArtisanPerformance':
        result = getArtisanPerformance(params.artisanId, params);
        break;
      case 'export':
        result = exportSalesData(params.format);
        break;
      case 'stats':
        result = getSalesStats();
        break;
      default:
        result = {
          success: false,
          error: 'Invalid action',
          availableActions: ['getSalesData', 'getArtisanPerformance', 'export', 'stats']
        };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Web app endpoint for POST requests (adding data)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = addSalesOrder(data);

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get sales statistics
 */
function getSalesStats() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = spreadsheet.getSheetByName(CONFIG_SHEET);

  if (!configSheet) {
    return {
      success: false,
      error: 'Config sheet not found'
    };
  }

  const configData = configSheet.getDataRange().getValues();
  const stats = {};

  configData.slice(1).forEach(row => {
    stats[row[0]] = row[1];
  });

  return {
    success: true,
    data: stats
  };
}

/**
 * Set up triggers for automatic updates
 */
function setupTriggers() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // Add daily stats update trigger
  ScriptApp.newTrigger('updateSalesStats')
    .timeBased()
    .everyDays(1)
    .atHour(1) // 1 AM daily
    .create();

  return {
    success: true,
    message: 'Triggers set up successfully'
  };
}