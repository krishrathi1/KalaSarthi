/**
 * Update Existing Artisans for Intelligent Matching
 * Adds the required matching data fields to existing artisan profiles
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kalasarthi';

// Enhanced artisan data for intelligent matching
const artisanEnhancements = {
  'Rajesh Kumar': {
    matchingData: {
      skills: ['pottery', 'ceramics', 'clay work', 'glazing'],
      specializations: ['traditional pottery', 'decorative vases', 'kitchen ceramics'],
      materials: ['clay', 'ceramic', 'glaze', 'terracotta'],
      techniques: ['wheel throwing', 'hand building', 'glazing', 'firing'],
      portfolioKeywords: ['handmade', 'traditional', 'decorative', 'functional'],
      averageProjectSize: { min: 500, max: 5000 },
      typicalTimeline: '1-2 weeks',
      experienceLevel: 'expert',
      lastProfileUpdate: new Date()
    },
    locationData: {
      coordinates: { latitude: 19.0760, longitude: 72.8777 },
      address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
      deliveryRadius: 100,
      serviceAreas: ['Mumbai', 'Pune', 'Nashik'],
      deliveryOptions: ['pickup', 'local_delivery', 'shipping']
    },
    performanceMetrics: {
      responseTime: 4,
      completionRate: 0.95,
      customerSatisfaction: 4.7,
      repeatCustomerRate: 0.3,
      totalOrders: 45,
      lastActiveDate: new Date()
    },
    availabilityStatus: 'available'
  },
  
  'Priya Sharma': {
    matchingData: {
      skills: ['textile', 'embroidery', 'fabric work', 'stitching'],
      specializations: ['silk sarees', 'traditional embroidery', 'bridal wear'],
      materials: ['silk', 'cotton', 'thread', 'beads', 'sequins'],
      techniques: ['hand embroidery', 'machine embroidery', 'block printing'],
      portfolioKeywords: ['elegant', 'traditional', 'bridal', 'festive'],
      averageProjectSize: { min: 2000, max: 15000 },
      typicalTimeline: '2-4 weeks',
      experienceLevel: 'expert',
      lastProfileUpdate: new Date()
    },
    locationData: {
      coordinates: { latitude: 28.7041, longitude: 77.1025 },
      address: { city: 'Delhi', state: 'Delhi', country: 'India' },
      deliveryRadius: 150,
      serviceAreas: ['Delhi', 'Gurgaon', 'Noida', 'Faridabad'],
      deliveryOptions: ['pickup', 'local_delivery', 'shipping']
    },
    performanceMetrics: {
      responseTime: 6,
      completionRate: 0.92,
      customerSatisfaction: 4.8,
      repeatCustomerRate: 0.4,
      totalOrders: 38,
      lastActiveDate: new Date()
    },
    availabilityStatus: 'available'
  },
  
  'Amit Patel': {
    matchingData: {
      skills: ['woodwork', 'carpentry', 'furniture making', 'carving'],
      specializations: ['dining furniture', 'decorative items', 'custom furniture'],
      materials: ['teak', 'oak', 'pine', 'bamboo', 'rosewood'],
      techniques: ['hand carving', 'joinery', 'polishing', 'inlay work'],
      portfolioKeywords: ['custom', 'handcrafted', 'durable', 'traditional'],
      averageProjectSize: { min: 5000, max: 50000 },
      typicalTimeline: '3-6 weeks',
      experienceLevel: 'master',
      lastProfileUpdate: new Date()
    },
    locationData: {
      coordinates: { latitude: 12.9716, longitude: 77.5946 },
      address: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
      deliveryRadius: 200,
      serviceAreas: ['Bangalore', 'Mysore', 'Mangalore'],
      deliveryOptions: ['pickup', 'local_delivery', 'shipping']
    },
    performanceMetrics: {
      responseTime: 8,
      completionRate: 0.88,
      customerSatisfaction: 4.6,
      repeatCustomerRate: 0.5,
      totalOrders: 28,
      lastActiveDate: new Date()
    },
    availabilityStatus: 'available'
  },
  
  'Lakshmi Devi': {
    matchingData: {
      skills: ['jewelry making', 'metalwork', 'stone setting', 'design'],
      specializations: ['traditional jewelry', 'wedding jewelry', 'silver work'],
      materials: ['silver', 'gold', 'copper', 'gemstones', 'pearls'],
      techniques: ['hand forging', 'stone setting', 'engraving', 'polishing'],
      portfolioKeywords: ['elegant', 'traditional', 'wedding', 'handcrafted'],
      averageProjectSize: { min: 3000, max: 25000 },
      typicalTimeline: '2-3 weeks',
      experienceLevel: 'expert',
      lastProfileUpdate: new Date()
    },
    locationData: {
      coordinates: { latitude: 17.3850, longitude: 78.4867 },
      address: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
      deliveryRadius: 100,
      serviceAreas: ['Hyderabad', 'Secunderabad', 'Warangal'],
      deliveryOptions: ['pickup', 'local_delivery', 'shipping']
    },
    performanceMetrics: {
      responseTime: 5,
      completionRate: 0.94,
      customerSatisfaction: 4.9,
      repeatCustomerRate: 0.6,
      totalOrders: 52,
      lastActiveDate: new Date()
    },
    availabilityStatus: 'available'
  },
  
  'Ravi Shankar': {
    matchingData: {
      skills: ['leather work', 'bag making', 'stitching', 'design'],
      specializations: ['leather bags', 'wallets', 'belts', 'accessories'],
      materials: ['leather', 'fabric', 'thread', 'hardware', 'zippers'],
      techniques: ['hand stitching', 'machine stitching', 'embossing', 'dyeing'],
      portfolioKeywords: ['durable', 'stylish', 'functional', 'custom'],
      averageProjectSize: { min: 1000, max: 8000 },
      typicalTimeline: '1-2 weeks',
      experienceLevel: 'intermediate',
      lastProfileUpdate: new Date()
    },
    locationData: {
      coordinates: { latitude: 13.0827, longitude: 80.2707 },
      address: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
      deliveryRadius: 75,
      serviceAreas: ['Chennai', 'Coimbatore', 'Madurai'],
      deliveryOptions: ['pickup', 'local_delivery', 'shipping']
    },
    performanceMetrics: {
      responseTime: 3,
      completionRate: 0.91,
      customerSatisfaction: 4.5,
      repeatCustomerRate: 0.25,
      totalOrders: 33,
      lastActiveDate: new Date()
    },
    availabilityStatus: 'available'
  }
};

async function updateArtisansForIntelligentMatching() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import User model
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    console.log('🔧 Updating artisans with intelligent matching data...');

    let updatedCount = 0;
    let errorCount = 0;

    for (const [artisanName, enhancements] of Object.entries(artisanEnhancements)) {
      try {
        const result = await User.updateOne(
          { name: artisanName, role: 'artisan' },
          {
            $set: {
              'artisanConnectProfile.matchingData': enhancements.matchingData,
              'artisanConnectProfile.locationData': enhancements.locationData,
              'artisanConnectProfile.performanceMetrics': enhancements.performanceMetrics,
              'artisanConnectProfile.availabilityStatus': enhancements.availabilityStatus
            }
          }
        );

        if (result.matchedCount > 0) {
          console.log(`✅ Updated ${artisanName}`);
          updatedCount++;
        } else {
          console.log(`⚠️ Artisan not found: ${artisanName}`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${artisanName}:`, error.message);
        errorCount++;
      }
    }

    // Update remaining artisans with basic data
    console.log('🔧 Adding basic matching data to remaining artisans...');
    
    const remainingArtisans = await User.find({
      role: 'artisan',
      'artisanConnectProfile.matchingData': { $exists: false }
    });

    for (const artisan of remainingArtisans) {
      try {
        const basicMatchingData = {
          matchingData: {
            skills: [artisan.artisticProfession || 'crafts'],
            specializations: ['handmade items'],
            materials: ['various'],
            techniques: ['traditional'],
            portfolioKeywords: ['handmade', 'traditional'],
            averageProjectSize: { min: 1000, max: 10000 },
            typicalTimeline: '1-3 weeks',
            experienceLevel: 'intermediate',
            lastProfileUpdate: new Date()
          },
          locationData: {
            coordinates: { latitude: 19.0760, longitude: 72.8777 }, // Default to Mumbai
            address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
            deliveryRadius: 50,
            serviceAreas: ['Mumbai'],
            deliveryOptions: ['pickup', 'shipping']
          },
          performanceMetrics: {
            responseTime: 12,
            completionRate: 0.85,
            customerSatisfaction: 4.0,
            repeatCustomerRate: 0.2,
            totalOrders: 10,
            lastActiveDate: new Date()
          },
          availabilityStatus: 'available'
        };

        await User.updateOne(
          { _id: artisan._id },
          { $set: { 'artisanConnectProfile': basicMatchingData } }
        );

        console.log(`✅ Added basic data to ${artisan.name}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating ${artisan.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} artisans`);
    console.log(`❌ Errors: ${errorCount}`);

    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const artisansWithMatchingData = await User.countDocuments({
      role: 'artisan',
      'artisanConnectProfile.matchingData': { $exists: true }
    });

    console.log(`📊 Artisans with matching data: ${artisansWithMatchingData}`);

    console.log('\n🎉 Artisan update completed successfully!');
    console.log('🚀 Your artisans are now ready for intelligent matching!');

  } catch (error) {
    console.error('💥 Error updating artisans:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the update script
if (require.main === module) {
  updateArtisansForIntelligentMatching()
    .then(() => {
      console.log('✨ Update script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Update script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateArtisansForIntelligentMatching };