import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

export interface SalesOrder {
  timestamp: string;
  orderId: string;
  artisanId: string;
  artisanName: string;
  productId: string;
  productName: string;
  category: string;
  buyerId: string;
  buyerName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  discount: number;
  tax: number;
  shippingCost: number;
  netAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  region: string;
  artisanLanguage: string;
  buyerLanguage: string;
  deliveryDate?: string;
  notes?: string;
}

export interface SalesQuery {
  artisanId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  region?: string;
  limit?: number;
  offset?: number;
}

export interface ArtisanPerformance {
  artisanId: string;
  totalOrders: number;
  totalRevenue: number;
  totalQuantity: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalRevenue: number;
    totalQuantity: number;
    orderCount: number;
  }>;
  monthlyRevenue: Record<string, number>;
  region: string;
  language: string;
}

export class GoogleSheetsService {
  private static instance: GoogleSheetsService;
  private sheets: any;
  private spreadsheetId: string;
  private jwtClient!: JWT;

  private constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is required');
    }

    this.initializeAuth();
  }

  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }

  private initializeAuth(): void {
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
    };

    this.jwtClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.jwtClient });
  }

  /**
   * Add a new sales order to Google Sheets
   */
  public async addSalesOrder(orderData: SalesOrder): Promise<{ success: boolean; orderId: string; message: string }> {
    try {
      const timestamp = new Date().toISOString();
      const rowData = [
        timestamp,
        orderData.orderId,
        orderData.artisanId,
        orderData.artisanName,
        orderData.productId,
        orderData.productName,
        orderData.category,
        orderData.buyerId,
        orderData.buyerName,
        orderData.quantity,
        orderData.unitPrice,
        orderData.totalAmount,
        orderData.discount,
        orderData.tax,
        orderData.shippingCost,
        orderData.netAmount,
        orderData.paymentMethod,
        orderData.paymentStatus,
        orderData.orderStatus,
        orderData.region,
        orderData.artisanLanguage,
        orderData.buyerLanguage,
        orderData.deliveryDate || '',
        orderData.notes || ''
      ];

      const request = {
        spreadsheetId: this.spreadsheetId,
        range: 'SalesData!A:A', // Append to the end
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [rowData]
        }
      };

      await this.sheets.spreadsheets.values.append(request);

      return {
        success: true,
        orderId: orderData.orderId,
        message: 'Order added successfully to Google Sheets'
      };

    } catch (error) {
      console.error('Error adding sales order to Google Sheets:', error);
      return {
        success: false,
        orderId: orderData.orderId,
        message: `Failed to add order: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`
      };
    }
  }

  /**
   * Get sales data with filtering
   */
  public async getSalesData(query: SalesQuery = {}): Promise<{
    success: boolean;
    data: SalesOrder[];
    summary: {
      totalOrders: number;
      totalRevenue: number;
      totalQuantity: number;
      averageOrderValue: number;
    };
    count: number;
  }> {
    try {
      // Get all data from SalesData sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'SalesData!A:Z'
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) { // Only header or empty
        return {
          success: true,
          data: [],
          summary: { totalOrders: 0, totalRevenue: 0, totalQuantity: 0, averageOrderValue: 0 },
          count: 0
        };
      }

      // Convert rows to objects
      const headers = rows[0];
      let orders: SalesOrder[] = rows.slice(1).map((row: string[]) => {
        const order: any = {};
        headers.forEach((header: string, index: number) => {
          const value = row[index] || '';
          switch (header) {
            case 'Quantity':
            case 'UnitPrice':
            case 'TotalAmount':
            case 'Discount':
            case 'Tax':
            case 'ShippingCost':
            case 'NetAmount':
              order[this.toCamelCase(header)] = parseFloat(value) || 0;
              break;
            default:
              order[this.toCamelCase(header)] = value;
          }
        });
        return order as SalesOrder;
      });

      // Apply filters
      if (query.artisanId) {
        orders = orders.filter(order => order.artisanId === query.artisanId);
      }

      if (query.startDate) {
        const startDate = new Date(query.startDate);
        orders = orders.filter(order => new Date(order.timestamp) >= startDate);
      }

      if (query.endDate) {
        const endDate = new Date(query.endDate);
        orders = orders.filter(order => new Date(order.timestamp) <= endDate);
      }

      if (query.status) {
        orders = orders.filter(order => order.orderStatus === query.status);
      }

      if (query.region) {
        orders = orders.filter(order => order.region === query.region);
      }

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || orders.length;
      orders = orders.slice(offset, offset + limit);

      // Calculate summary
      const summary = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
        totalQuantity: orders.reduce((sum, order) => sum + order.quantity, 0),
        averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length : 0
      };

      return {
        success: true,
        data: orders,
        summary,
        count: orders.length
      };

    } catch (error) {
      console.error('Error fetching sales data from Google Sheets:', error);
      return {
        success: false,
        data: [],
        summary: { totalOrders: 0, totalRevenue: 0, totalQuantity: 0, averageOrderValue: 0 },
        count: 0
      };
    }
  }

  /**
   * Get artisan performance metrics
   */
  public async getArtisanPerformance(artisanId: string, query: SalesQuery = {}): Promise<{
    success: boolean;
    data: ArtisanPerformance | null;
  }> {
    try {
      const salesData = await this.getSalesData({ ...query, artisanId });

      if (!salesData.success || salesData.data.length === 0) {
        return {
          success: false,
          data: null
        };
      }

      const orders = salesData.data;

      // Calculate top products
      const productStats: Record<string, any> = {};
      orders.forEach(order => {
        const productId = order.productId;
        if (!productStats[productId]) {
          productStats[productId] = {
            productId,
            productName: order.productName,
            totalRevenue: 0,
            totalQuantity: 0,
            orderCount: 0
          };
        }
        productStats[productId].totalRevenue += order.totalAmount;
        productStats[productId].totalQuantity += order.quantity;
        productStats[productId].orderCount += 1;
      });

      const topProducts = Object.values(productStats)
        .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5);

      // Calculate monthly revenue
      const monthlyRevenue: Record<string, number> = {};
      orders.forEach(order => {
        const date = new Date(order.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = 0;
        }
        monthlyRevenue[monthKey] += order.totalAmount;
      });

      const performance: ArtisanPerformance = {
        artisanId,
        totalOrders: salesData.summary.totalOrders,
        totalRevenue: salesData.summary.totalRevenue,
        totalQuantity: salesData.summary.totalQuantity,
        averageOrderValue: salesData.summary.averageOrderValue,
        topProducts,
        monthlyRevenue,
        region: orders[0]?.region || '',
        language: orders[0]?.artisanLanguage || 'hi'
      };

      return {
        success: true,
        data: performance
      };

    } catch (error) {
      console.error('Error fetching artisan performance:', error);
      return {
        success: false,
        data: null
      };
    }
  }

  /**
   * Get sales statistics
   */
  public async getSalesStats(): Promise<{
    success: boolean;
    data: {
      totalOrders: number;
      totalRevenue: number;
      activeArtisans: number;
      lastUpdated: string;
    };
  }> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Config!A:B'
      });

      const rows = response.data.values || [];
      const stats: any = {};

      rows.forEach((row: string[]) => {
        if (row[0] && row[1]) {
          stats[row[0]] = row[1];
        }
      });

      return {
        success: true,
        data: {
          totalOrders: parseInt(stats.TotalOrders) || 0,
          totalRevenue: parseFloat(stats.TotalRevenue) || 0,
          activeArtisans: parseInt(stats.ActiveArtisans) || 0,
          lastUpdated: stats.LastUpdated || new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error fetching sales stats:', error);
      return {
        success: false,
        data: {
          totalOrders: 0,
          totalRevenue: 0,
          activeArtisans: 0,
          lastUpdated: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Export sales data
   */
  public async exportSalesData(format: 'csv' | 'json' = 'json'): Promise<{
    success: boolean;
    data: string;
    format: string;
  }> {
    try {
      const salesData = await this.getSalesData();

      if (!salesData.success) {
        return {
          success: false,
          data: '',
          format
        };
      }

      let content = '';

      if (format === 'csv') {
        // Create CSV content
        const headers = [
          'Timestamp', 'OrderID', 'ArtisanID', 'ArtisanName', 'ProductID', 'ProductName',
          'Category', 'BuyerID', 'BuyerName', 'Quantity', 'UnitPrice', 'TotalAmount',
          'Discount', 'Tax', 'ShippingCost', 'NetAmount', 'PaymentMethod', 'PaymentStatus',
          'OrderStatus', 'Region', 'ArtisanLanguage', 'BuyerLanguage', 'DeliveryDate', 'Notes'
        ];

        content = headers.join(',') + '\n';
        salesData.data.forEach(order => {
          const values = [
            order.timestamp, order.orderId, order.artisanId, order.artisanName,
            order.productId, order.productName, order.category, order.buyerId,
            order.buyerName, order.quantity, order.unitPrice, order.totalAmount,
            order.discount, order.tax, order.shippingCost, order.netAmount,
            order.paymentMethod, order.paymentStatus, order.orderStatus,
            order.region, order.artisanLanguage, order.buyerLanguage,
            order.deliveryDate || '', order.notes || ''
          ];

          // Escape CSV values
          const escapedValues = values.map(value => {
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          });

          content += escapedValues.join(',') + '\n';
        });

      } else if (format === 'json') {
        content = JSON.stringify(salesData.data, null, 2);
      }

      return {
        success: true,
        data: content,
        format
      };

    } catch (error) {
      console.error('Error exporting sales data:', error);
      return {
        success: false,
        data: '',
        format
      };
    }
  }

  /**
   * Utility method to convert string to camelCase
   */
  private toCamelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, '');
  }

  /**
   * Test connection to Google Sheets
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      return {
        success: true,
        message: 'Successfully connected to Google Sheets'
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to Google Sheets: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`
      };
    }
  }
}
