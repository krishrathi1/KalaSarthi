/**
 * Test Database Artisans
 * Check if artisans exist and have the required matching data
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kalasarthi';

async function testDatabaseArtisans() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import User model
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    console.log('🔍 Checking artisan data...\n');

    // Check total artisans
    const totalArtisans = await User.countDocuments({ role: 'artisan' });
    console.log(`📊 Total artisans: ${totalArtisans}`);

    // Check artisans with matching data
    const artisansWithMatchingData = await User.countDocuments({
      role: 'artisan',
      'artisanConnectProfile.matchingData': { $exists: true }
    });
    console.log(`🎯 Artisans with matching data: ${artisansWithMatchingData}`);

    // Check artisans with location data
    const artisansWithLocation = await User.countDocuments({
      role: 'artisan',
      'artisanConnectProfile.locationData.coordinates': { $exists: true }
    });
    console.log(`📍 Artisans with location data: ${artisansWithLocation}`);

    // Get sample artisan data
    console.log('\n🔍 Sample artisan data:');
    const sampleArtisans = await User.find(
      { role: 'artisan' },
      {
        name: 1,
        artisticProfession: 1,
        'artisanConnectProfile.matchingData.skills': 1,
        'artisanConnectProfile.matchingData.materials': 1,
        'artisanConnectProfile.locationData.coordinates': 1,
        'artisanConnectProfile.availabilityStatus': 1
      }
    ).limit(5);

    sampleArtisans.forEach((artisan, index) => {
      console.log(`\n${index + 1}. ${artisan.name}`);
      console.log(`   Profession: ${artisan.artisticProfession || 'N/A'}`);
      console.log(`   Skills: ${artisan.artisanConnectProfile?.matchingData?.skills?.join(', ') || 'N/A'}`);
      console.log(`   Materials: ${artisan.artisanConnectProfile?.matchingData?.materials?.join(', ') || 'N/A'}`);
      console.log(`   Location: ${artisan.artisanConnectProfile?.locationData?.coordinates ? 'Yes' : 'No'}`);
      console.log(`   Status: ${artisan.artisanConnectProfile?.availabilityStatus || 'N/A'}`);
    });

    // Test specific queries that should match
    console.log('\n🧪 Testing specific queries:');
    
    // Test pottery query
    const potteryArtisans = await User.find({
      role: 'artisan',
      $or: [
        { 'artisanConnectProfile.matchingData.skills': { $regex: 'pottery', $options: 'i' } },
        { 'artisanConnectProfile.matchingData.materials': { $regex: 'clay', $options: 'i' } },
        { artisticProfession: { $regex: 'pottery', $options: 'i' } }
      ]
    });
    console.log(`🏺 Pottery-related artisans: ${potteryArtisans.length}`);

    // Test wood query
    const woodArtisans = await User.find({
      role: 'artisan',
      $or: [
        { 'artisanConnectProfile.matchingData.skills': { $regex: 'wood', $options: 'i' } },
        { 'artisanConnectProfile.matchingData.materials': { $regex: 'wood', $options: 'i' } },
        { artisticProfession: { $regex: 'wood', $options: 'i' } }
      ]
    });
    console.log(`🪵 Wood-related artisans: ${woodArtisans.length}`);

    // Test jewelry query
    const jewelryArtisans = await User.find({
      role: 'artisan',
      $or: [
        { 'artisanConnectProfile.matchingData.skills': { $regex: 'jewelry', $options: 'i' } },
        { 'artisanConnectProfile.matchingData.materials': { $regex: 'silver|gold', $options: 'i' } },
        { artisticProfession: { $regex: 'jewelry', $options: 'i' } }
      ]
    });
    console.log(`💍 Jewelry-related artisans: ${jewelryArtisans.length}`);

    // Test basic availability
    const availableArtisans = await User.find({
      role: 'artisan',
      'artisanConnectProfile.availabilityStatus': 'available'
    });
    console.log(`✅ Available artisans: ${availableArtisans.length}`);

    console.log('\n📋 Summary:');
    if (totalArtisans === 0) {
      console.log('❌ No artisans found in database');
    } else if (artisansWithMatchingData === 0) {
      console.log('❌ Artisans exist but have no matching data');
    } else if (artisansWithLocation === 0) {
      console.log('❌ Artisans have matching data but no location data');
    } else {
      console.log('✅ Artisans are properly configured for intelligent matching');
      console.log(`   📊 ${totalArtisans} total artisans`);
      console.log(`   🎯 ${artisansWithMatchingData} with matching data`);
      console.log(`   📍 ${artisansWithLocation} with location data`);
      console.log(`   ✅ ${availableArtisans.length} available`);
    }

  } catch (error) {
    console.error('💥 Error testing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testDatabaseArtisans()
    .then(() => {
      console.log('✨ Database test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Database test failed:', error);
      process.exit(1);
    });
}

module.exports = { testDatabaseArtisans };