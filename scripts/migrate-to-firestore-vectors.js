/**
 * Migration script to generate vector embeddings for existing Firestore users
 */

require('dotenv').config();

async function migrateToFirestoreVectors() {
  console.log('🚀 Starting Firestore vector migration...');
  
  try {
    // Call the vector embeddings API to batch process all users
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003'}/api/vector-embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'batch_process'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Vector embeddings migration completed successfully!');
      
      // Get analytics
      const analyticsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003'}/api/vector-embeddings?action=analytics`);
      
      if (analyticsResponse.ok) {
        const analytics = await analyticsResponse.json();
        console.log('📊 Migration Summary:');
        console.log(`   - Total embeddings: ${analytics.analytics.totalEmbeddings}`);
        console.log(`   - By type:`, analytics.analytics.embeddingsByType);
        console.log(`   - Last updated: ${analytics.analytics.lastUpdated}`);
      }
    } else {
      console.error('❌ Migration failed:', result.error);
    }

  } catch (error) {
    console.error('💥 Migration error:', error.message);
    process.exit(1);
  }
}

// Test vector search
async function testVectorSearch() {
  console.log('🧪 Testing vector search...');
  
  try {
    const testQueries = [
      'pottery maker in Jaipur',
      'jewelry designer with kundan work',
      'textile weaver traditional fabrics',
      'wood carving expert',
      'metal work brass items'
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 Testing query: "${query}"`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003'}/api/vector-embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'search_artisans',
          query,
          options: {
            maxResults: 3
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`   ✅ Found ${result.count} matches`);
        
        result.results.forEach((match, index) => {
          console.log(`   ${index + 1}. ${match.user.name} (${match.user.artisticProfession}) - Similarity: ${(match.similarity * 100).toFixed(1)}%`);
        });
      } else {
        console.log(`   ❌ Search failed: ${response.status}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🌟 Firestore Vector Migration & Testing');
  console.log('=====================================\n');

  // Step 1: Migrate embeddings
  await migrateToFirestoreVectors();
  
  // Step 2: Test search functionality
  console.log('\n' + '='.repeat(50));
  await testVectorSearch();
  
  console.log('\n🎉 Migration and testing completed!');
  console.log('\n📝 Next steps:');
  console.log('   1. Test the enhanced chat interface at /enhanced-chat');
  console.log('   2. Try searching for artisans using natural language');
  console.log('   3. Check vector search analytics at /api/vector-embeddings?action=analytics');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { migrateToFirestoreVectors, testVectorSearch };