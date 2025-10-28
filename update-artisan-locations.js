/**
 * Update Artisan Locations with Different Indian Cities
 * Sets diverse locations across India for all artisans
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Indian cities with coordinates
const indianCities = [
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { name: 'Thane', state: 'Maharashtra', lat: 19.2183, lng: 72.9781 },
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  { name: 'Pimpri-Chinchwad', state: 'Maharashtra', lat: 18.6298, lng: 73.7997 },
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { name: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812 },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6692, lng: 77.4538 },
  { name: 'Ludhiana', state: 'Punjab', lat: 30.9010, lng: 75.8573 },
  { name: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081 },
  { name: 'Nashik', state: 'Maharashtra', lat: 19.9975, lng: 73.7898 },
  { name: 'Faridabad', state: 'Haryana', lat: 28.4089, lng: 77.3178 },
  { name: 'Meerut', state: 'Uttar Pradesh', lat: 28.9845, lng: 77.7064 },
  { name: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022 },
  { name: 'Kalyan-Dombivli', state: 'Maharashtra', lat: 19.2403, lng: 73.1305 },
  { name: 'Vasai-Virar', state: 'Maharashtra', lat: 19.4912, lng: 72.8054 },
  { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 }
];

async function updateArtisanLocations() {
  console.log('🔄 Updating Artisan Locations with Indian Cities...\n');
  
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Load User Model
    const User = (await import('./src/lib/models/User.ts')).default;
    
    // Get all artisans
    const artisans = await User.find({ role: 'artisan' });
    console.log(`📊 Found ${artisans.length} artisans to update`);
    
    if (artisans.length === 0) {
      console.log('⚠️ No artisans found in database');
      return;
    }
    
    // Update each artisan with a different city
    let updatedCount = 0;
    
    for (let i = 0; i < artisans.length; i++) {
      const artisan = artisans[i];
      const city = indianCities[i % indianCities.length]; // Cycle through cities
      
      console.log(`🔄 Updating ${artisan.name} -> ${city.name}, ${city.state}`);
      
      // Update location data
      const updateData = {
        'artisanConnectProfile.locationData.coordinates.latitude': city.lat,
        'artisanConnectProfile.locationData.coordinates.longitude': city.lng,
        'artisanConnectProfile.locationData.address.city': city.name,
        'artisanConnectProfile.locationData.address.state': city.state,
        'artisanConnectProfile.locationData.address.country': 'India',
        'artisanConnectProfile.locationData.deliveryRadius': 100, // 100km delivery radius
        'artisanConnectProfile.locationData.deliveryOptions': ['pickup', 'local_delivery', 'shipping'],
        'artisanConnectProfile.locationData.locationAccuracy': 100,
        'artisanConnectProfile.locationData.lastLocationUpdate': new Date()
      };
      
      await User.updateOne({ _id: artisan._id }, { $set: updateData });
      updatedCount++;
      
      console.log(`   ✅ Updated to ${city.name}, ${city.state}`);
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} artisan locations!`);
    
    // Verify updates
    console.log('\n📋 Verification - Updated Locations:');
    const updatedArtisans = await User.find({ role: 'artisan' }).select('name artisanConnectProfile.locationData.address');
    
    updatedArtisans.forEach((artisan, index) => {
      const location = artisan.artisanConnectProfile?.locationData?.address;
      console.log(`   ${index + 1}. ${artisan.name} - ${location?.city || 'Unknown'}, ${location?.state || 'Unknown'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to update artisan locations:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the update
if (require.main === module) {
  updateArtisanLocations()
    .then(() => {
      console.log('\n✨ Artisan location update completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateArtisanLocations };