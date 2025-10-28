/**
 * Simple script to update artisan locations
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Define User schema directly
const userSchema = new mongoose.Schema({
  uid: String,
  name: String,
  role: String,
  artisticProfession: String,
  artisanConnectProfile: {
    locationData: {
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      address: {
        city: String,
        state: String,
        country: String
      },
      deliveryRadius: Number,
      deliveryOptions: [String],
      locationAccuracy: Number,
      lastLocationUpdate: Date
    }
  }
}, { strict: false });

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
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { name: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812 },
  { name: 'Ludhiana', state: 'Punjab', lat: 30.9010, lng: 75.8573 },
  { name: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081 }
];

async function updateLocations() {
  console.log('🔄 Updating Artisan Locations...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const User = mongoose.model('User', userSchema);
    
    const artisans = await User.find({ role: 'artisan' });
    console.log(`📊 Found ${artisans.length} artisans`);
    
    let updated = 0;
    
    for (let i = 0; i < artisans.length; i++) {
      const artisan = artisans[i];
      const city = indianCities[i % indianCities.length];
      
      console.log(`🔄 ${artisan.name} -> ${city.name}, ${city.state}`);
      
      await User.updateOne(
        { _id: artisan._id },
        {
          $set: {
            'artisanConnectProfile.locationData.coordinates.latitude': city.lat,
            'artisanConnectProfile.locationData.coordinates.longitude': city.lng,
            'artisanConnectProfile.locationData.address.city': city.name,
            'artisanConnectProfile.locationData.address.state': city.state,
            'artisanConnectProfile.locationData.address.country': 'India',
            'artisanConnectProfile.locationData.deliveryRadius': 100,
            'artisanConnectProfile.locationData.deliveryOptions': ['pickup', 'local_delivery', 'shipping'],
            'artisanConnectProfile.locationData.locationAccuracy': 100,
            'artisanConnectProfile.locationData.lastLocationUpdate': new Date()
          }
        }
      );
      
      updated++;
      console.log(`   ✅ Updated`);
    }
    
    console.log(`\n🎉 Updated ${updated} artisans!`);
    
    // Verify
    const verification = await User.find({ role: 'artisan' }).select('name artisanConnectProfile.locationData.address');
    console.log('\n📋 Updated Locations:');
    verification.forEach((artisan, index) => {
      const addr = artisan.artisanConnectProfile?.locationData?.address;
      console.log(`   ${index + 1}. ${artisan.name} - ${addr?.city}, ${addr?.state}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected');
  }
}

updateLocations();