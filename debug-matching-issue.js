/**
 * Debug Matching Issue
 * Investigates why no matches are being found
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Define User schema
const userSchema = new mongoose.Schema({}, { strict: false });

async function debugMatching() {
  console.log('🔍 Debugging Matching Issue...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const User = mongoose.model('User', userSchema);
    
    // Get all artisans
    const artisans = await User.find({ role: 'artisan' });
    console.log(`📊 Total artisans: ${artisans.length}`);
    
    // Check artisan data structure
    console.log('\n🔍 Sample Artisan Data:');
    const sample = artisans[0];
    console.log('Name:', sample.name);
    console.log('Profession:', sample.artisticProfession);
    console.log('Description:', sample.description);
    console.log('Skills:', sample.artisanConnectProfile?.matchingData?.skills);
    console.log('Materials:', sample.artisanConnectProfile?.matchingData?.materials);
    console.log('Availability:', sample.artisanConnectProfile?.availabilityStatus);
    
    // Check for pottery-related artisans
    console.log('\n🏺 Pottery-related Artisans:');
    const potteryArtisans = artisans.filter(a => 
      a.artisticProfession?.toLowerCase().includes('pottery') ||
      a.description?.toLowerCase().includes('pottery') ||
      a.artisanConnectProfile?.matchingData?.skills?.some(s => s.toLowerCase().includes('pottery'))
    );
    
    potteryArtisans.forEach(artisan => {
      console.log(`   - ${artisan.name}: ${artisan.artisticProfession}`);
      console.log(`     Skills: ${artisan.artisanConnectProfile?.matchingData?.skills?.join(', ') || 'None'}`);
      console.log(`     Available: ${artisan.artisanConnectProfile?.availabilityStatus}`);
    });
    
    // Check for wood-related artisans
    console.log('\n🪵 Wood-related Artisans:');
    const woodArtisans = artisans.filter(a => 
      a.artisticProfession?.toLowerCase().includes('wood') ||
      a.description?.toLowerCase().includes('wood') ||
      a.artisanConnectProfile?.matchingData?.skills?.some(s => s.toLowerCase().includes('wood'))
    );
    
    woodArtisans.forEach(artisan => {
      console.log(`   - ${artisan.name}: ${artisan.artisticProfession}`);
      console.log(`     Skills: ${artisan.artisanConnectProfile?.matchingData?.skills?.join(', ') || 'None'}`);
      console.log(`     Available: ${artisan.artisanConnectProfile?.availabilityStatus}`);
    });
    
    // Test the SmartFilter directly
    console.log('\n🧪 Testing SmartFilter Logic...');
    
    // Simulate requirement analysis
    const mockRequirements = {
      originalText: 'pottery',
      extractedCriteria: {
        productType: ['pottery'],
        materials: ['clay'],
        style: [],
        techniques: [],
        priceRange: null,
        timeline: null,
        customRequirements: []
      },
      confidence: 0.8,
      processingTime: 100
    };
    
    // Test basic filtering
    const availableArtisans = artisans.filter(a => 
      a.artisanConnectProfile?.availabilityStatus !== 'unavailable'
    );
    console.log(`   📊 Available artisans: ${availableArtisans.length}`);
    
    // Test skill matching
    const skillMatches = availableArtisans.filter(artisan => {
      const skills = artisan.artisanConnectProfile?.matchingData?.skills || [];
      const profession = artisan.artisticProfession?.toLowerCase() || '';
      const description = artisan.description?.toLowerCase() || '';
      
      return skills.some(skill => skill.toLowerCase().includes('pottery')) ||
             profession.includes('pottery') ||
             description.includes('pottery');
    });
    
    console.log(`   🎯 Pottery skill matches: ${skillMatches.length}`);
    skillMatches.forEach(artisan => {
      console.log(`      - ${artisan.name} (${artisan.artisticProfession})`);
    });
    
    // Check if the issue is in the API call
    console.log('\n🌐 Testing API Call...');
    
    try {
      const response = await fetch('http://localhost:9003/api/intelligent-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requirements: 'pottery',
          filters: {
            minRelevanceScore: 0.1,
            maxResults: 10
          }
        })
      });
      
      const result = await response.json();
      console.log('   API Response:', result.success ? 'SUCCESS' : 'FAILED');
      if (!result.success) {
        console.log('   Error:', result.error);
      } else {
        console.log('   Matches found:', result.data?.matches?.length || 0);
      }
      
    } catch (error) {
      console.log('   ❌ API call failed:', error.message);
      console.log('   💡 Make sure the development server is running: npm run dev');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugMatching();