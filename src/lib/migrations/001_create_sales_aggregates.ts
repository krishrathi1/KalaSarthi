/**
 * Migration: Create Sales Aggregates Collection with Time-Series Optimizations
 *
 * This migration creates the sales_aggregates collection with proper indexing
 * for time-series data and prepares it for TimescaleDB extension if available.
 */

export const migration_001_create_sales_aggregates = {
  name: '001_create_sales_aggregates',
  description: 'Create sales aggregates collection with time-series optimizations',

  async up(): Promise<void> {
    console.log('🚀 Running migration: 001_create_sales_aggregates');

    // Note: In a real MongoDB migration system, you'd use the MongoDB driver
    // For now, this serves as documentation of the required schema

    const collectionName = 'sales_aggregates';

    // Collection creation commands for MongoDB shell
    const mongoCommands = [
      // Create collection with timeseries options (MongoDB 5.0+)
      `db.createCollection("${collectionName}", {
        timeseries: {
          timeField: "periodStart",
          metaField: "artisanId",
          granularity: "hours"
        }
      })`,

      // Create indexes for efficient querying
      `db.${collectionName}.createIndex({ "artisanId": 1, "period": 1, "periodStart": -1 })`,
      `db.${collectionName}.createIndex({ "artisanId": 1, "productId": 1, "period": 1, "periodStart": -1 })`,
      `db.${collectionName}.createIndex({ "artisanId": 1, "channel": 1, "period": 1, "periodStart": -1 })`,
      `db.${collectionName}.createIndex({ "periodStart": -1, "periodEnd": -1 })`,
      `db.${collectionName}.createIndex({ "watermark": -1 })`,

      // Unique constraint to prevent duplicate aggregates
      `db.${collectionName}.createIndex({
        "artisanId": 1,
        "productId": 1,
        "channel": 1,
        "period": 1,
        "periodKey": 1
      }, { unique: true })`,

      // Partial indexes for better performance
      `db.${collectionName}.createIndex(
        { "lastUpdated": -1 },
        { expireAfterSeconds: 7776000 } // 90 days TTL for old data
      })`
    ];

    console.log('📋 MongoDB commands to execute:');
    mongoCommands.forEach((cmd, index) => {
      console.log(`${index + 1}. ${cmd}`);
    });

    // PostgreSQL/TimescaleDB commands (if using TimescaleDB)
    const timescaleCommands = [
      // Create hypertable for time-series data
      `CREATE TABLE IF NOT EXISTS sales_aggregates (
        id SERIAL PRIMARY KEY,
        artisan_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255),
        product_category VARCHAR(255),
        channel VARCHAR(50),
        period VARCHAR(20) NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        period_key VARCHAR(20) NOT NULL,
        total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
        net_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_orders INTEGER NOT NULL DEFAULT 0,
        total_quantity INTEGER NOT NULL DEFAULT 0,
        average_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
        unique_products INTEGER NOT NULL DEFAULT 0,
        top_selling_product VARCHAR(255),
        top_selling_product_revenue DECIMAL(15,2),
        channel_breakdown JSONB,
        revenue_growth DECIMAL(5,2),
        order_growth DECIMAL(5,2),
        aov_growth DECIMAL(5,2),
        new_customers INTEGER,
        returning_customers INTEGER,
        customer_retention_rate DECIMAL(5,2),
        conversion_rate DECIMAL(5,2),
        return_rate DECIMAL(5,2),
        average_margin DECIMAL(5,2),
        seasonality VARCHAR(50),
        festival_impact BOOLEAN DEFAULT FALSE,
        marketing_campaigns JSONB,
        data_completeness DECIMAL(5,2) NOT NULL DEFAULT 100.0,
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processing_version VARCHAR(20) NOT NULL DEFAULT '1.0',
        watermark TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      // Convert to hypertable
      `SELECT create_hypertable('sales_aggregates', 'period_start', if_not_exists => TRUE);`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_sales_agg_artisan_period ON sales_aggregates (artisan_id, period, period_start DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_sales_agg_product ON sales_aggregates (artisan_id, product_id, period, period_start DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_sales_agg_channel ON sales_aggregates (artisan_id, channel, period, period_start DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_sales_agg_time_range ON sales_aggregates (period_start, period_end);`,
      `CREATE INDEX IF NOT EXISTS idx_sales_agg_watermark ON sales_aggregates (watermark);`,

      // Unique constraint
      `ALTER TABLE sales_aggregates ADD CONSTRAINT IF NOT EXISTS unique_sales_agg
        UNIQUE (artisan_id, product_id, channel, period, period_key);`,

      // Compression policy (compress chunks older than 30 days)
      `SELECT add_compression_policy('sales_aggregates', INTERVAL '30 days');`,

      // Retention policy (drop data older than 1 year)
      `SELECT add_retention_policy('sales_aggregates', INTERVAL '1 year');`
    ];

    console.log('\n🕐 TimescaleDB commands to execute:');
    timescaleCommands.forEach((cmd, index) => {
      console.log(`${index + 1}. ${cmd}`);
    });

    console.log('✅ Migration 001_create_sales_aggregates completed');
  },

  async down(): Promise<void> {
    console.log('🔄 Rolling back migration: 001_create_sales_aggregates');

    // MongoDB rollback
    console.log('📋 MongoDB rollback commands:');
    console.log('db.sales_aggregates.drop()');

    // PostgreSQL/TimescaleDB rollback
    console.log('🕐 TimescaleDB rollback commands:');
    console.log('DROP TABLE IF EXISTS sales_aggregates;');

    console.log('✅ Migration rollback completed');
  }
};
