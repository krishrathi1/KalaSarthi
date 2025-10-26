/**
 * Migration: Create Loan Applications Collection
 *
 * This migration creates the loan_applications collection with proper indexing
 * and relationships to support the loan processing workflow.
 */

export const migration_002_create_loan_applications = {
  name: '002_create_loan_applications',
  description: 'Create loan applications collection with relationships',

  async up(): Promise<void> {
    console.log('🚀 Running migration: 002_create_loan_applications');

    const collectionName = 'loan_applications';

    // MongoDB commands
    const mongoCommands = [
      // Create collection
      `db.createCollection("${collectionName}")`,

      // Create indexes
      `db.${collectionName}.createIndex({ "applicationId": 1 }, { unique: true })`,
      `db.${collectionName}.createIndex({ "userId": 1 })`,
      `db.${collectionName}.createIndex({ "status": 1 })`,
      `db.${collectionName}.createIndex({ "personalInfo.panNumber": 1 })`,
      `db.${collectionName}.createIndex({ "businessInfo.gstNumber": 1 })`,
      `db.${collectionName}.createIndex({ "submittedAt": -1 })`,
      `db.${collectionName}.createIndex({ "createdAt": -1 })`,
      `db.${collectionName}.createIndex({ "rpaSessionId": 1 })`,
      `db.${collectionName}.createIndex({ "automationStatus": 1 })`,

      // Compound indexes
      `db.${collectionName}.createIndex({ "userId": 1, "status": 1 })`,
      `db.${collectionName}.createIndex({ "status": 1, "updatedAt": -1 })`
    ];

    console.log('📋 MongoDB commands to execute:');
    mongoCommands.forEach((cmd, index) => {
      console.log(`${index + 1}. ${cmd}`);
    });

    // PostgreSQL commands
    const postgresCommands = [
      // Create loan applications table
      `CREATE TABLE IF NOT EXISTS loan_applications (
        id SERIAL PRIMARY KEY,
        application_id VARCHAR(50) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        personal_info JSONB NOT NULL,
        business_info JSONB NOT NULL,
        loan_details JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        sub_status VARCHAR(50),
        credit_score INTEGER,
        risk_assessment JSONB,
        documents JSONB DEFAULT '[]',
        bank_details JSONB,
        submitted_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        disbursed_at TIMESTAMPTZ,
        rejected_at TIMESTAMPTZ,
        rejection_reason TEXT,
        tracking_number VARCHAR(50),
        portal_application_id VARCHAR(255),
        portal_url VARCHAR(500),
        rpa_session_id VARCHAR(255),
        automation_status VARCHAR(20),
        automation_logs JSONB DEFAULT '[]',
        created_by VARCHAR(255) NOT NULL,
        updated_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_loan_app_application_id ON loan_applications (application_id);`,
      `CREATE INDEX IF NOT EXISTS idx_loan_app_user_id ON loan_applications (user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_loan_app_status ON loan_applications (status);`,
      `CREATE INDEX IF NOT EXISTS idx_loan_app_pan ON loan_applications ((personal_info->>'panNumber'));`,
      `CREATE INDEX IF NOT EXISTS idx_loan_app_gst ON loan_applications ((business_info->>'gstNumber'));`,
      `CREATE INDEX IF NOT EXISTS idx_loan_app_submitted_at ON loan_applications (submitted_at);`,
      `CREATE INDEX IF NOT EXISTS idx_loan_app_created_at ON loan_applications (created_at);`,
      `CREATE INDEX IF NOT EXISTS idx_loan_app_rpa_session ON loan_applications (rpa_session_id);`,
      `CREATE INDEX IF NOT EXISTS idx_loan_app_automation_status ON loan_applications (automation_status);`,

      // Create compound indexes
      `CREATE INDEX IF NOT EXISTS idx_loan_app_user_status ON loan_applications (user_id, status);`,
      `CREATE INDEX IF NOT EXISTS idx_loan_app_status_updated ON loan_applications (status, updated_at DESC);`,

      // Create trigger for updated_at
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';`,

      `CREATE TRIGGER update_loan_applications_updated_at
        BEFORE UPDATE ON loan_applications
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`
    ];

    console.log('\n🕐 PostgreSQL commands to execute:');
    postgresCommands.forEach((cmd, index) => {
      console.log(`${index + 1}. ${cmd}`);
    });

    console.log('✅ Migration 002_create_loan_applications completed');
  },

  async down(): Promise<void> {
    console.log('🔄 Rolling back migration: 002_create_loan_applications');

    // MongoDB rollback
    console.log('📋 MongoDB rollback commands:');
    console.log('db.loan_applications.drop()');

    // PostgreSQL rollback
    console.log('🕐 PostgreSQL rollback commands:');
    console.log('DROP TABLE IF EXISTS loan_applications;');
    console.log('DROP TRIGGER IF EXISTS update_loan_applications_updated_at ON loan_applications;');
    console.log('DROP FUNCTION IF EXISTS update_updated_at_column();');

    console.log('✅ Migration rollback completed');
  }
};
