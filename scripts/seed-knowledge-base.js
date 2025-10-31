/**
 * Script to seed the Artisan Buddy Knowledge Base
 * Run with: node scripts/seed-knowledge-base.js
 */

const { KnowledgeBaseSeeder } = require('../src/lib/services/artisan-buddy/KnowledgeBaseSeeder');

async function main() {
  console.log('🚀 Artisan Buddy Knowledge Base Seeder\n');

  const seeder = new KnowledgeBaseSeeder();

  try {
    // Get command line argument
    const command = process.argv[2] || 'seed';

    switch (command) {
      case 'seed':
        console.log('📝 Seeding knowledge base...\n');
        await seeder.seedAll();
        break;

      case 'clear':
        console.log('🗑️  Clearing knowledge base...\n');
        await seeder.clearAll();
        break;

      case 'update':
        console.log('🔄 Updating knowledge base...\n');
        await seeder.updateAll();
        break;

      case 'verify':
        console.log('🔍 Verifying knowledge base...\n');
        const result = await seeder.verify();
        console.log('\nVerification Result:', result.isValid ? '✅ PASSED' : '❌ FAILED');
        if (result.issues.length > 0) {
          console.log('\nIssues:');
          result.issues.forEach(issue => console.log(`  - ${issue}`));
        }
        console.log('\nStatistics:', result.stats);
        break;

      case 'seed-category':
        const category = process.argv[3];
        if (!category) {
          console.error('❌ Please provide a category name');
          process.exit(1);
        }
        console.log(`📝 Seeding category: ${category}\n`);
        await seeder.seedCategory(category);
        break;

      case 'seed-craft':
        const craftType = process.argv[3];
        if (!craftType) {
          console.error('❌ Please provide a craft type');
          process.exit(1);
        }
        console.log(`📝 Seeding craft type: ${craftType}\n`);
        await seeder.seedCraftType(craftType);
        break;

      default:
        console.log('❌ Unknown command:', command);
        console.log('\nAvailable commands:');
        console.log('  seed              - Seed all knowledge data');
        console.log('  clear             - Clear all knowledge data');
        console.log('  update            - Clear and re-seed all data');
        console.log('  verify            - Verify knowledge base integrity');
        console.log('  seed-category     - Seed specific category (requires category name)');
        console.log('  seed-craft        - Seed specific craft type (requires craft type)');
        process.exit(1);
    }

    console.log('\n✅ Operation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Operation failed:', error);
    process.exit(1);
  }
}

main();
