/**
 * Migration Runner
 *
 * This script runs database migrations for the finance system.
 * Supports both MongoDB and PostgreSQL/TimescaleDB.
 */

import { migration_001_create_sales_aggregates } from './001_create_sales_aggregates';
import { migration_002_create_loan_applications } from './002_create_loan_applications';

interface MigrationResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
}

export class MigrationRunner {
  private migrations = [
    migration_001_create_sales_aggregates,
    migration_002_create_loan_applications
  ];

  /**
   * Run all pending migrations
   */
  async runMigrations(direction: 'up' | 'down' = 'up'): Promise<MigrationResult[]> {
    console.log(`🚀 Starting migration runner (${direction})`);

    const results: MigrationResult[] = [];

    for (const migration of this.migrations) {
      console.log(`\n📋 Running migration: ${migration.name}`);
      const startTime = Date.now();

      try {
        if (direction === 'up') {
          await migration.up();
        } else {
          await migration.down();
        }

        const duration = Date.now() - startTime;
        results.push({
          name: migration.name,
          success: true,
          duration
        });

        console.log(`✅ Migration ${migration.name} completed in ${duration}ms`);

      } catch (error: any) {
        const duration = Date.now() - startTime;
        results.push({
          name: migration.name,
          success: false,
          duration,
          error: error.message
        });

        console.error(`❌ Migration ${migration.name} failed:`, error.message);

        // Stop on first failure
        break;
      }
    }

    const successful = results.filter(r => r.success).length;
    const total = results.length;

    console.log(`\n📊 Migration summary: ${successful}/${total} successful`);

    return results;
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): any {
    return {
      totalMigrations: this.migrations.length,
      migrations: this.migrations.map(m => ({
        name: m.name,
        description: m.description
      }))
    };
  }

  /**
   * Run specific migration
   */
  async runMigration(migrationName: string, direction: 'up' | 'down' = 'up'): Promise<MigrationResult | null> {
    const migration = this.migrations.find(m => m.name === migrationName);

    if (!migration) {
      console.error(`❌ Migration ${migrationName} not found`);
      return null;
    }

    console.log(`🚀 Running specific migration: ${migrationName} (${direction})`);
    const startTime = Date.now();

    try {
      if (direction === 'up') {
        await migration.up();
      } else {
        await migration.down();
      }

      const duration = Date.now() - startTime;

      console.log(`✅ Migration ${migrationName} completed in ${duration}ms`);

      return {
        name: migrationName,
        success: true,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      console.error(`❌ Migration ${migrationName} failed:`, error.message);

      return {
        name: migrationName,
        success: false,
        duration,
        error: error.message
      };
    }
  }
}

/**
 * CLI interface for running migrations
 */
export async function runMigrationsCLI() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const migrationName = args[1];
  const direction = args[2] as 'up' | 'down' || 'up';

  const runner = new MigrationRunner();

  switch (command) {
    case 'up':
      const upResults = await runner.runMigrations('up');
      console.log('Migration results:', upResults);
      break;

    case 'down':
      const downResults = await runner.runMigrations('down');
      console.log('Migration results:', downResults);
      break;

    case 'run':
      if (!migrationName) {
        console.error('Migration name required for run command');
        process.exit(1);
      }
      const result = await runner.runMigration(migrationName, direction);
      console.log('Migration result:', result);
      break;

    case 'status':
    default:
      const status = runner.getMigrationStatus();
      console.log('Migration status:', status);
      break;
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  runMigrationsCLI().catch(console.error);
}