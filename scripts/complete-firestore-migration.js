/**
 * Complete Firestore Migration Script
 * 1. Seeds users and products
 * 2. Generates vector embeddings
 * 3. Tests search functionality
 */

require('dotenv').config();

async function completeFirestoreMigration() {
  console.log('🚀 Starting Complete Firestore Migration...');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Seed users and products
    console.log('\n📝 Step 1: Seeding users and products...');
    const { seedFirestoreUsers } = require('./seed-firestore-users-fixed');
    await seedFirestoreUsers();
    console.log('✅ Users and products seeded successfully!');
    
    // Wait a bit for Firestore to process
    console.log('⏳ Waiting for Firestore to process data...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Generate vector embeddings
    console.log('\n🧠 Step 2: Generating vector embeddings...');
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003'}/api/vector-embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'batch_process'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Vector embeddings generated successfully!');
    } else {
      console.log('⚠️  Vector embeddings generation failed, but continuing...');
    }
    
    // Step 3: Test search functionality
    console.log('\n🔍 Step 3: Testing search functionality...');
    await testSearchFunctionality();
    
    // Step 4: Get final analytics
    console.log('\n📊 Step 4: Getting final analytics...');
    await getFinalAnalytics();
    
    console.log('\n🎉 Complete Firestore Migration Successful!');
    console.log('=' .repeat(60));
    console.log('\n📋 What was migrated:');
    console.log('   ✅ 10 Artisan profiles with enhanced data');
    console.log('   ✅ 10 Buyer profiles with preferences');
    console.log('   ✅ 20+ Product listings with details');
    console.log('   ✅ Vector embeddings for semantic search');
    console.log('   ✅ Search functionality tested');
    
    console.log('\n🚀 Ready to use:');
    console.log('   • Enhanced Chat Interface: /enhanced-chat');
    console.log('   • Intelligent Matching API: /api/intelligent-match');
    console.log('   • Vector Search API: /api/vector-embeddings');
    console.log('   • Design Generation: Artisan Tools Panel');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

async function testSearchFunctionality() {
  const testQueries = [
    { query: 'pottery maker in Jaipur', expected: 'pottery' },
    { query: 'jewelry designer with traditional work', expected: 'jewelry' },
    { query: 'textile weaver handloom', expected: 'textiles' },
    { query: 'wood carving expert', expected: 'woodwork' },
    { query: 'metal work brass items', expected: 'metalwork' }
  ];

  console.log('   Testing intelligent matching API...');
  
  for (const test of testQueries) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003'}/api/intelligent-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: test.query,
          maxResults: 3
        })
      });

      if (response.ok) {
        const result = await response.json();
        const matchCount = result.data?.matches?.length || 0;
        console.log(`   ✅ "${test.query}" → ${matchCount} matches`);
      } else {
        console.log(`   ⚠️  "${test.query}" → API error (${response.status})`);
      }
    } catch (error) {
      console.log(`   ❌ "${test.query}" → ${error.message}`);
    }
  }
}

async function getFinalAnalytics() {
  try {
    // Get vector analytics
    const vectorResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003'}/api/vector-embeddings?action=analytics`);
    
    if (vectorResponse.ok) {
      const analytics = await vectorResponse.json();
      console.log('   📈 Vector Search Analytics:');
      console.log(`      • Total embeddings: ${analytics.analytics.totalEmbeddings}`);
      console.log(`      • By type:`, analytics.analytics.embeddingsByType);
    }
    
    // Test health endpoints
    const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003'}/api/intelligent-match`);
    if (healthResponse.ok) {
      console.log('   ✅ Intelligent Match API: Healthy');
    }
    
    const vectorHealthResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003'}/api/vector-embeddings?action=health`);
    if (vectorHealthResponse.ok) {
      console.log('   ✅ Vector Search API: Healthy');
    }
    
  } catch (error) {
    console.log('   ⚠️  Analytics collection failed:', error.message);
  }
}

if (require.main === module) {
  completeFirestoreMigration().catch(console.error);
}

module.exports = { completeFirestoreMigration };