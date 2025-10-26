import { BigQuery } from '@google-cloud/bigquery';

export interface ScrapedProductData {
  id: string;
  keyword: string;
  title: string;
  price: string;
  rating: string;
  reviews: number;
  platform: string;
  url: string;
  imageUrl?: string;
  description?: string;
  scrapedAt: Date;
  artisanProfession: string;
}

export interface TrendDataRecord {
  id: string;
  keyword: string;
  searchVolume: number;
  trendIndex: number;
  relatedQueries: string[];
  rising: boolean;
  geo: string;
  timeRange: string;
  createdAt: Date;
  artisanProfession: string;
}

export interface MarketInsightRecord {
  id: string;
  artisanProfession: string;
  insights: string;
  recommendations: string[];
  dataSources: string[];
  confidence: number;
  createdAt: Date;
  expiresAt: Date;
}

export class BigQueryService {
  private bigquery: BigQuery;
  private datasetId = 'trend_analysis';
  private projectId: string;

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0314311341';
    this.bigquery = new BigQuery({
      projectId: this.projectId,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json'
    });
  }

  /**
   * Initialize BigQuery dataset and tables
   */
  async initializeDataset(): Promise<void> {
    try {
      // Create dataset if it doesn't exist
      const dataset = this.bigquery.dataset(this.datasetId);
      const [datasetExists] = await dataset.exists();

      if (!datasetExists) {
        await this.bigquery.createDataset(this.datasetId, {
          location: 'US', // Choose appropriate region
          description: 'Trend analysis data for KalaBandhu artisans'
        });
        console.log(`Dataset ${this.datasetId} created.`);
      }

      // Create tables
      await this.createTables();
    } catch (error) {
      console.error('Error initializing BigQuery dataset:', error);
      throw error;
    }
  }

  /**
   * Create necessary tables
   */
  private async createTables(): Promise<void> {
    const tables = [
      {
        name: 'scraped_products',
        schema: [
          { name: 'id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'keyword', type: 'STRING', mode: 'REQUIRED' },
          { name: 'title', type: 'STRING', mode: 'REQUIRED' },
          { name: 'price', type: 'STRING', mode: 'NULLABLE' },
          { name: 'rating', type: 'STRING', mode: 'NULLABLE' },
          { name: 'reviews', type: 'INTEGER', mode: 'NULLABLE' },
          { name: 'platform', type: 'STRING', mode: 'REQUIRED' },
          { name: 'url', type: 'STRING', mode: 'NULLABLE' },
          { name: 'imageUrl', type: 'STRING', mode: 'NULLABLE' },
          { name: 'description', type: 'STRING', mode: 'NULLABLE' },
          { name: 'scrapedAt', type: 'TIMESTAMP', mode: 'REQUIRED' },
          { name: 'artisanProfession', type: 'STRING', mode: 'REQUIRED' }
        ]
      },
      {
        name: 'trend_data',
        schema: [
          { name: 'id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'keyword', type: 'STRING', mode: 'REQUIRED' },
          { name: 'searchVolume', type: 'INTEGER', mode: 'NULLABLE' },
          { name: 'trendIndex', type: 'INTEGER', mode: 'NULLABLE' },
          { name: 'relatedQueries', type: 'STRING', mode: 'REPEATED' },
          { name: 'rising', type: 'BOOLEAN', mode: 'NULLABLE' },
          { name: 'geo', type: 'STRING', mode: 'REQUIRED' },
          { name: 'timeRange', type: 'STRING', mode: 'REQUIRED' },
          { name: 'createdAt', type: 'TIMESTAMP', mode: 'REQUIRED' },
          { name: 'artisanProfession', type: 'STRING', mode: 'REQUIRED' }
        ]
      },
      {
        name: 'market_insights',
        schema: [
          { name: 'id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'artisanProfession', type: 'STRING', mode: 'REQUIRED' },
          { name: 'insights', type: 'STRING', mode: 'REQUIRED' },
          { name: 'recommendations', type: 'STRING', mode: 'REPEATED' },
          { name: 'dataSources', type: 'STRING', mode: 'REPEATED' },
          { name: 'confidence', type: 'FLOAT', mode: 'NULLABLE' },
          { name: 'createdAt', type: 'TIMESTAMP', mode: 'REQUIRED' },
          { name: 'expiresAt', type: 'TIMESTAMP', mode: 'REQUIRED' }
        ]
      }
    ];

    for (const table of tables) {
      await this.createTable(table.name, table.schema);
    }
  }

  /**
   * Create a table with given schema
   */
  private async createTable(tableName: string, schema: any[]): Promise<void> {
    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table(tableName);

    const [tableExists] = await table.exists();

    if (!tableExists) {
      await table.create({
        schema: {
          fields: schema
        },
        timePartitioning: {
          type: 'DAY',
          field: 'createdAt'
        }
      });
      console.log(`Table ${tableName} created.`);
    }
  }

  /**
   * Insert scraped product data
   */
  async insertScrapedProducts(products: ScrapedProductData[]): Promise<void> {
    if (products.length === 0) return;

    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table('scraped_products');

    const rows = products.map(product => ({
      id: product.id,
      keyword: product.keyword,
      title: product.title,
      price: product.price,
      rating: product.rating,
      reviews: product.reviews,
      platform: product.platform,
      url: product.url,
      imageUrl: product.imageUrl || null,
      description: product.description || null,
      scrapedAt: product.scrapedAt.toISOString(),
      artisanProfession: product.artisanProfession
    }));

    await table.insert(rows);
    console.log(`Inserted ${products.length} scraped products into BigQuery.`);
  }

  /**
   * Insert trend data
   */
  async insertTrendData(trends: TrendDataRecord[]): Promise<void> {
    if (trends.length === 0) return;

    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table('trend_data');

    const rows = trends.map(trend => ({
      id: trend.id,
      keyword: trend.keyword,
      searchVolume: trend.searchVolume,
      trendIndex: trend.trendIndex,
      relatedQueries: trend.relatedQueries,
      rising: trend.rising,
      geo: trend.geo,
      timeRange: trend.timeRange,
      createdAt: trend.createdAt.toISOString(),
      artisanProfession: trend.artisanProfession
    }));

    await table.insert(rows);
    console.log(`Inserted ${trends.length} trend records into BigQuery.`);
  }

  /**
   * Insert market insights
   */
  async insertMarketInsights(insights: MarketInsightRecord[]): Promise<void> {
    if (insights.length === 0) return;

    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table('market_insights');

    const rows = insights.map(insight => ({
      id: insight.id,
      artisanProfession: insight.artisanProfession,
      insights: insight.insights,
      recommendations: insight.recommendations,
      dataSources: insight.dataSources,
      confidence: insight.confidence,
      createdAt: insight.createdAt.toISOString(),
      expiresAt: insight.expiresAt.toISOString()
    }));

    await table.insert(rows);
    console.log(`Inserted ${insights.length} market insights into BigQuery.`);
  }

  /**
   * Query trend data for artisan profession
   */
  async getTrendDataForProfession(profession: string, days: number = 30): Promise<any[]> {
    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table('trend_data');

    const query = `
      SELECT *
      FROM \`${this.projectId}.${this.datasetId}.trend_data\`
      WHERE artisanProfession = @profession
      AND createdAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
      ORDER BY createdAt DESC
    `;

    const options = {
      query,
      params: {
        profession,
        days
      }
    };

    const [rows] = await this.bigquery.query(options);
    return rows;
  }

  /**
   * Query scraped products for keywords
   */
  async getScrapedProductsForKeywords(keywords: string[], days: number = 7): Promise<any[]> {
    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table('scraped_products');

    const keywordList = keywords.map(k => `'${k}'`).join(', ');

    const query = `
      SELECT *
      FROM \`${this.projectId}.${this.datasetId}.scraped_products\`
      WHERE keyword IN (${keywordList})
      AND scrapedAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
      ORDER BY scrapedAt DESC
    `;

    const options = {
      query,
      params: {
        days
      }
    };

    const [rows] = await this.bigquery.query(options);
    return rows;
  }

  /**
   * Get market insights for profession
   */
  async getMarketInsightsForProfession(profession: string): Promise<any[]> {
    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table('market_insights');

    const query = `
      SELECT *
      FROM \`${this.projectId}.${this.datasetId}.market_insights\`
      WHERE artisanProfession = @profession
      AND expiresAt > CURRENT_TIMESTAMP()
      ORDER BY createdAt DESC
      LIMIT 10
    `;

    const options = {
      query,
      params: {
        profession
      }
    };

    const [rows] = await this.bigquery.query(options);
    return rows;
  }

  /**
   * Clean up old data
   */
  async cleanupOldData(daysToKeep: number = 90): Promise<void> {
    const tables = ['scraped_products', 'trend_data', 'market_insights'];

    for (const tableName of tables) {
      const query = `
        DELETE FROM \`${this.projectId}.${this.datasetId}.${tableName}\`
        WHERE createdAt < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
      `;

      const options = {
        query,
        params: {
          days: daysToKeep
        }
      };

      await this.bigquery.query(options);
      console.log(`Cleaned up old data from ${tableName}.`);
    }
  }
}

export const bigQueryService = new BigQueryService();
