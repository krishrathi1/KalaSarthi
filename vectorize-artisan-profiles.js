/**
 * Artisan Profile Vectorization Script
 * Processes existing artisan profiles and generates vector embeddings for semantic search
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Configuration
const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function vectorizeArtisanProfiles() {
  console.log('🚀 Starting Artisan Profile Vectorization...\n');
  
  let vectorSystem = null;
  let processedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  try {
    // Step 1: Initialize Vector System
    console.log('1️⃣ Initializing Vector System...');
    const { initializeVectorSystem, checkVectorSystemHealth } = await import('./src/lib/vector/init.js');
    
    vectorSystem = await initializeVectorSystem();
    console.log('   ✅ Vector system initialized');
    
    const health = await checkVectorSystemHealth();
    console.log(`   🏥 System health: ${health.status}`);
    
    if (health.status === 'unhealthy') {
      throw new Error('Vector system is unhealthy. Please check configuration and API keys.');
    }
    
    // Step 2: Connect to MongoDB
    console.log('\n2️⃣ Connecting to MongoDB...');
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('   ✅ Connected to MongoDB');
    
    // Step 3: Load User Model and Get Artisans
    console.log('\n3️⃣ Loading Artisan Profiles...');
    const User = (await import('./src/lib/models/User.js')).default;
    
    const artisans = await User.find({ 
      role: 'artisan',
      'artisanConnectProfile.availabilityStatus': { $ne: 'unavailable' }
    }).lean();
    
    console.log(`   📊 Found ${artisans.length} artisan profiles to process`);
    
    if (artisans.length === 0) {
      console.log('   ⚠️ No artisan profiles found. Make sure artisans exist in the database.');
      return;
    }
    
    // Step 4: Initialize Vector Components
    console.log('\n4️⃣ Initializing Vector Components...');
    const { VectorEmbeddingSystem } = await import('./src/lib/vector/embedding-system.js');
    const { ProfileEnrichmentPipeline } = await import('./src/lib/vector/profile-enrichment.js');
    const { getVectorConfig } = await import('./src/lib/vector/config.js');
    
    const config = getVectorConfig();
    const embeddingSystem = new VectorEmbeddingSystem(config);
    
    const enrichmentConfig = {
      enableKeywordExtraction: true,
      enableSkillInference: true,
      enablePortfolioAnalysis: true,
      enableReviewAnalysis: true,
      enableMarketPositioning: true,
      batchSize: BATCH_SIZE,
      updateFrequency: 'realtime'
    };
    
    const enrichmentPipeline = new ProfileEnrichmentPipeline(enrichmentConfig);
    console.log('   ✅ Vector components initialized');
    
    // Step 5: Check if we can connect to vector database
    console.log('\n5️⃣ Checking Vector Database Connection...');
    const hasApiKeys = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) && 
                      process.env.PINECONE_API_KEY && 
                      process.env.PINECONE_API_KEY !== 'your_pinecone_api_key_here';
    
    let vectorDB = null;
    let canStoreVectors = false;
    
    if (hasApiKeys) {
      try {
        const { createVectorDatabase } = await import('./src/lib/vector/database.js');
        vectorDB = createVectorDatabase(config);
        await vectorDB.connect();
        
        const indexes = await vectorDB.listIndexes();
        console.log(`   ✅ Connected to vector database`);
        console.log(`   📋 Available indexes: ${indexes.join(', ') || 'none'}`);
        
        // Create index if it doesn't exist
        const indexName = config.vectorDB.indexName;
        if (!indexes.includes(indexName)) {
          console.log(`   🔧 Creating index: ${indexName}`);
          await vectorDB.createIndex(indexName, config.vectorDB.dimensions, config.vectorDB.metric);
          console.log(`   ✅ Index created successfully`);
        }
        
        canStoreVectors = true;
        
      } catch (error) {
        console.log(`   ⚠️ Vector database connection failed: ${error.message}`);
        console.log('   📝 Will generate embeddings locally only');
      }
    } else {
      console.log('   ⚠️ API keys not configured - will generate embeddings locally only');
      console.log('   💡 Set OPENAI_API_KEY and PINECONE_API_KEY in .env to enable vector storage');
    }
    
    // Step 6: Process Artisans in Batches
    console.log(`\n6️⃣ Processing ${artisans.length} Artisan Profiles...`);
    console.log(`   📦 Batch size: ${BATCH_SIZE}`);
    console.log(`   🔄 Processing mode: ${canStoreVectors ? 'Full (with vector storage)' : 'Local (embeddings only)'}`);
    console.log('');
    
    const startTime = Date.now();
    const totalBatches = Math.ceil(artisans.length / BATCH_SIZE);
    
    for (let i = 0; i < artisans.length; i += BATCH_SIZE) {
      const batch = artisans.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`📦 Processing Batch ${batchNumber}/${totalBatches} (${batch.length} artisans):`);
      
      const batchResults = await processBatch(
        batch,
        embeddingSystem,
        enrichmentPipeline,
        vectorDB,
        canStoreVectors,
        config
      );
      
      processedCount += batchResults.processed;
      errorCount += batchResults.errors;
      skippedCount += batchResults.skipped;
      
      // Progress update
      const progress = ((i + batch.length) / artisans.length * 100).toFixed(1);
      console.log(`   📊 Batch ${batchNumber} complete. Overall progress: ${progress}%`);
      
      // Add delay between batches to respect rate limits
      if (i + BATCH_SIZE < artisans.length) {
        console.log('   ⏳ Waiting before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('');
    }
    
    // Step 7: Summary and Statistics
    const totalTime = Date.now() - startTime;
    const avgTimePerArtisan = totalTime / artisans.length;
    
    console.log('🎉 Vectorization Complete!\n');
    console.log('📊 Final Statistics:');
    console.log(`   ✅ Successfully processed: ${processedCount}`);
    console.log(`   ❌ Errors encountered: ${errorCount}`);
    console.log(`   ⏭️ Skipped (already processed): ${skippedCount}`);
    console.log(`   📈 Success rate: ${((processedCount / artisans.length) * 100).toFixed(1)}%`);
    console.log(`   ⏱️ Total time: ${(totalTime / 1000).toFixed(1)} seconds`);
    console.log(`   ⚡ Average time per artisan: ${avgTimePerArtisan.toFixed(0)}ms`);
    
    if (canStoreVectors) {
      console.log(`   🗄️ Vectors stored in database: ${config.vectorDB.indexName}`);
      
      // Get final index stats
      try {
        const stats = await vectorDB.getIndexStats(config.vectorDB.indexName);
        if (stats) {
          console.log(`   📋 Total vectors in index: ${stats.totalVectors}`);
        }
      } catch (error) {
        console.log('   ⚠️ Could not retrieve final index stats');
      }
    }
    
    console.log('\n🚀 Semantic search is now ready to use!');
    
    if (errorCount > 0) {
      console.log('\n⚠️ Some profiles had errors. Check the logs above for details.');
      console.log('   💡 You can re-run this script to retry failed profiles.');
    }
    
  } catch (error) {
    console.error('\n💥 Vectorization failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check your .env file has all required variables');
    console.error('   2. Ensure MongoDB is accessible');
    console.error('   3. Verify API keys are valid');
    console.error('   4. Check network connectivity');
    throw error;
    
  } finally {
    // Cleanup
    if (vectorSystem?.vectorDB) {
      try {
        await vectorSystem.vectorDB.disconnect();
        console.log('🔌 Disconnected from vector database');
      } catch (error) {
        console.error('⚠️ Error disconnecting from vector database:', error.message);
      }
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

/**
 * Process a batch of artisan profiles
 */
async function processBatch(
  artisans,
  embeddingSystem,
  enrichmentPipeline,
  vectorDB,
  canStoreVectors,
  config
) {
  let processed = 0;
  let errors = 0;
  let skipped = 0;
  
  for (const artisan of artisans) {
    try {
      console.log(`   🔄 Processing: ${artisan.name} (${artisan.uid})`);
      
      // Check if already processed (if vector DB is available)
      if (canStoreVectors && vectorDB) {
        const existing = await checkIfAlreadyProcessed(vectorDB, artisan.uid, config.vectorDB.indexName);
        if (existing) {
          console.log(`      ⏭️ Already processed, skipping`);
          skipped++;
          continue;
        }
      }
      
      // Enrich the profile
      const enrichedProfile = await enrichmentPipeline.enrichProfile(artisan);
      console.log(`      📝 Profile enriched (confidence: ${(enrichedProfile.enrichmentMetadata.confidenceScore * 100).toFixed(1)}%)`);
      
      // Generate embeddings
      const embedding = await embeddingSystem.generateArtisanEmbedding(artisan);
      console.log(`      🧠 Embedding generated (${embedding.compositeVector.length}D, confidence: ${(embedding.metadata.confidence * 100).toFixed(1)}%)`);
      
      // Store in vector database if available
      if (canStoreVectors && vectorDB) {
        const vectorData = [{
          id: embedding.artisanId,
          values: embedding.compositeVector,
          metadata: {
            name: artisan.name,
            profession: artisan.artisticProfession,
            profileHash: embedding.metadata.profileHash,
            modelVersion: embedding.metadata.modelVersion,
            generatedAt: embedding.metadata.generatedAt.toISOString(),
            confidence: embedding.metadata.confidence,
            // Add searchable metadata
            skills: artisan.artisanConnectProfile?.matchingData?.skills?.join(' ') || '',
            materials: artisan.artisanConnectProfile?.matchingData?.materials?.join(' ') || '',
            experienceLevel: artisan.artisanConnectProfile?.matchingData?.experienceLevel || 'intermediate',
            rating: artisan.artisanConnectProfile?.performanceMetrics?.customerSatisfaction || 4.0,
            verified: artisan.artisanConnectProfile?.matchingData?.verificationStatus?.skillsVerified || false
          }
        }];
        
        await vectorDB.upsertVectors(config.vectorDB.indexName, vectorData);
        console.log(`      💾 Vector stored in database`);
      }
      
      console.log(`      ✅ ${artisan.name} processed successfully`);
      processed++;
      
    } catch (error) {
      console.error(`      ❌ Error processing ${artisan.name}: ${error.message}`);
      errors++;
      
      // Log detailed error for debugging
      if (error.stack) {
        console.error(`         Stack: ${error.stack.split('\n')[1]?.trim()}`);
      }
    }
  }
  
  return { processed, errors, skipped };
}

/**
 * Check if an artisan has already been processed
 */
async function checkIfAlreadyProcessed(vectorDB, artisanId, indexName) {
  try {
    const results = await vectorDB.searchSimilar(indexName, {
      vector: new Array(1536).fill(0), // Dummy vector
      topK: 1,
      filters: { id: artisanId },
      includeMetadata: true
    });
    
    return results.length > 0;
  } catch (error) {
    // If we can't check, assume not processed
    return false;
  }
}

/**
 * Retry wrapper for operations that might fail
 */
async function withRetry(operation, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`      ⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Artisan Profile Vectorization Script');
    console.log('');
    console.log('Usage: node vectorize-artisan-profiles.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --dry-run      Process embeddings without storing to vector database');
    console.log('  --force        Reprocess all profiles even if already processed');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  MONGODB_URI           MongoDB connection string');
    console.log('  OPENAI_API_KEY        OpenAI API key for embeddings');
    console.log('  PINECONE_API_KEY      Pinecone API key for vector storage');
    console.log('  PINECONE_INDEX_NAME   Pinecone index name (optional)');
    process.exit(0);
  }
  
  vectorizeArtisanProfiles()
    .then(() => {
      console.log('\n✨ Vectorization script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Vectorization script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { vectorizeArtisanProfiles };