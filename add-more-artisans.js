/**
 * Add More Diverse Artisan Data
 * Creates comprehensive artisan profiles with detailed skills and materials
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Define User schema
const userSchema = new mongoose.Schema({
  uid: String,
  name: String,
  email: String,
  phone: String,
  role: String,
  artisticProfession: String,
  description: String,
  profileImage: String,
  artisanConnectProfile: {
    specializations: [String],
    availabilityStatus: String,
    matchingData: {
      skills: [String],
      materials: [String],
      techniques: [String],
      portfolioKeywords: [String],
      categoryTags: [String],
      experienceLevel: String,
      averageProjectSize: {
        min: Number,
        max: Number
      },
      typicalTimeline: String,
      lastProfileUpdate: Date,
      verificationStatus: {
        skillsVerified: Boolean,
        portfolioVerified: Boolean,
        identityVerified: Boolean
      }
    },
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
    },
    performanceMetrics: {
      responseTime: Number,
      completionRate: Number,
      customerSatisfaction: Number,
      repeatCustomerRate: Number,
      totalOrders: Number,
      successfulDeliveries: Number,
      averageOrderValue: Number,
      lastActiveDate: Date,
      profileViews: Number,
      contactRequests: Number
    }
  }
}, { strict: false });

// Comprehensive artisan data
const newArtisans = [
  {
    uid: 'artisan_pottery_001',
    name: 'Ramesh Kumhar',
    email: 'ramesh.kumhar@example.com',
    phone: '+91-9123456780',
    role: 'artisan',
    artisticProfession: 'pottery',
    description: 'Master potter specializing in traditional Indian ceramics, terracotta, and glazed pottery. Expert in wheel throwing and hand building techniques.',
    profileImage: 'https://example.com/ramesh.jpg',
    artisanConnectProfile: {
      specializations: ['traditional pottery', 'terracotta', 'ceramic glazing', 'decorative pots'],
      availabilityStatus: 'available',
      matchingData: {
        skills: ['pottery', 'ceramics', 'wheel throwing', 'hand building', 'glazing', 'terracotta work', 'clay modeling'],
        materials: ['clay', 'ceramic', 'terracotta', 'glaze', 'earthenware', 'stoneware'],
        techniques: ['wheel throwing', 'hand building', 'coil building', 'slab construction', 'glazing', 'firing'],
        portfolioKeywords: ['pots', 'vases', 'bowls', 'decorative items', 'planters', 'traditional designs'],
        categoryTags: ['pottery', 'ceramics', 'home decor', 'garden accessories'],
        experienceLevel: 'expert',
        averageProjectSize: { min: 500, max: 5000 },
        typicalTimeline: '1-2 weeks',
        lastProfileUpdate: new Date(),
        verificationStatus: {
          skillsVerified: true,
          portfolioVerified: true,
          identityVerified: true
        }
      },
      performanceMetrics: {
        responseTime: 4,
        completionRate: 0.95,
        customerSatisfaction: 4.8,
        repeatCustomerRate: 0.4,
        totalOrders: 150,
        successfulDeliveries: 142,
        averageOrderValue: 2500,
        lastActiveDate: new Date(),
        profileViews: 320,
        contactRequests: 45
      }
    }
  },
  {
    uid: 'artisan_wood_001',
    name: 'Suresh Carpenter',
    email: 'suresh.carpenter@example.com',
    phone: '+91-9123456781',
    role: 'artisan',
    artisticProfession: 'woodworking',
    description: 'Skilled woodworker and furniture maker with expertise in traditional and modern designs. Specializes in custom furniture and wooden handicrafts.',
    artisanConnectProfile: {
      specializations: ['furniture making', 'wood carving', 'custom carpentry', 'wooden handicrafts'],
      availabilityStatus: 'available',
      matchingData: {
        skills: ['woodworking', 'carpentry', 'furniture making', 'wood carving', 'joinery', 'finishing', 'design'],
        materials: ['teak', 'oak', 'pine', 'mahogany', 'bamboo', 'plywood', 'wood stain', 'varnish'],
        techniques: ['hand carving', 'machine cutting', 'joinery', 'sanding', 'polishing', 'assembly'],
        portfolioKeywords: ['furniture', 'tables', 'chairs', 'cabinets', 'decorative items', 'custom designs'],
        categoryTags: ['furniture', 'woodwork', 'home decor', 'custom carpentry'],
        experienceLevel: 'expert',
        averageProjectSize: { min: 2000, max: 25000 },
        typicalTimeline: '2-4 weeks',
        lastProfileUpdate: new Date(),
        verificationStatus: {
          skillsVerified: true,
          portfolioVerified: true,
          identityVerified: true
        }
      },
      performanceMetrics: {
        responseTime: 6,
        completionRate: 0.92,
        customerSatisfaction: 4.7,
        repeatCustomerRate: 0.35,
        totalOrders: 89,
        successfulDeliveries: 82,
        averageOrderValue: 8500,
        lastActiveDate: new Date(),
        profileViews: 280,
        contactRequests: 38
      }
    }
  },
  {
    uid: 'artisan_textile_001',
    name: 'Meera Weaver',
    email: 'meera.weaver@example.com',
    phone: '+91-9123456782',
    role: 'artisan',
    artisticProfession: 'textiles',
    description: 'Traditional textile artist specializing in handloom weaving, block printing, and embroidery. Creates beautiful fabrics and garments.',
    artisanConnectProfile: {
      specializations: ['handloom weaving', 'block printing', 'embroidery', 'fabric dyeing'],
      availabilityStatus: 'available',
      matchingData: {
        skills: ['weaving', 'embroidery', 'block printing', 'fabric dyeing', 'pattern design', 'handloom operation'],
        materials: ['cotton', 'silk', 'wool', 'linen', 'natural dyes', 'threads', 'fabric'],
        techniques: ['handloom weaving', 'block printing', 'hand embroidery', 'natural dyeing', 'pattern making'],
        portfolioKeywords: ['fabrics', 'sarees', 'scarves', 'cushion covers', 'table runners', 'traditional patterns'],
        categoryTags: ['textiles', 'fabrics', 'clothing', 'home textiles'],
        experienceLevel: 'expert',
        averageProjectSize: { min: 800, max: 8000 },
        typicalTimeline: '1-3 weeks',
        lastProfileUpdate: new Date(),
        verificationStatus: {
          skillsVerified: true,
          portfolioVerified: true,
          identityVerified: true
        }
      },
      performanceMetrics: {
        responseTime: 8,
        completionRate: 0.94,
        customerSatisfaction: 4.6,
        repeatCustomerRate: 0.42,
        totalOrders: 120,
        successfulDeliveries: 113,
        averageOrderValue: 3200,
        lastActiveDate: new Date(),
        profileViews: 195,
        contactRequests: 32
      }
    }
  },
  {
    uid: 'artisan_jewelry_001',
    name: 'Vikram Goldsmith',
    email: 'vikram.goldsmith@example.com',
    phone: '+91-9123456783',
    role: 'artisan',
    artisticProfession: 'jewelry',
    description: 'Master jeweler with expertise in traditional and contemporary jewelry design. Specializes in gold, silver, and gemstone jewelry.',
    artisanConnectProfile: {
      specializations: ['gold jewelry', 'silver jewelry', 'gemstone setting', 'custom designs'],
      availabilityStatus: 'available',
      matchingData: {
        skills: ['jewelry making', 'metalworking', 'gem setting', 'engraving', 'polishing', 'design', 'repair'],
        materials: ['gold', 'silver', 'platinum', 'gemstones', 'pearls', 'copper', 'brass'],
        techniques: ['casting', 'soldering', 'stone setting', 'engraving', 'polishing', 'chain making'],
        portfolioKeywords: ['necklaces', 'earrings', 'rings', 'bracelets', 'pendants', 'custom jewelry'],
        categoryTags: ['jewelry', 'accessories', 'precious metals', 'gemstones'],
        experienceLevel: 'master',
        averageProjectSize: { min: 3000, max: 50000 },
        typicalTimeline: '1-4 weeks',
        lastProfileUpdate: new Date(),
        verificationStatus: {
          skillsVerified: true,
          portfolioVerified: true,
          identityVerified: true
        }
      },
      performanceMetrics: {
        responseTime: 12,
        completionRate: 0.96,
        customerSatisfaction: 4.9,
        repeatCustomerRate: 0.55,
        totalOrders: 75,
        successfulDeliveries: 72,
        averageOrderValue: 15000,
        lastActiveDate: new Date(),
        profileViews: 420,
        contactRequests: 28
      }
    }
  },
  {
    uid: 'artisan_leather_001',
    name: 'Arjun Leather Craftsman',
    email: 'arjun.leather@example.com',
    phone: '+91-9123456784',
    role: 'artisan',
    artisticProfession: 'leather work',
    description: 'Skilled leather craftsman creating high-quality leather goods including bags, wallets, belts, and accessories.',
    artisanConnectProfile: {
      specializations: ['leather bags', 'wallets', 'belts', 'leather accessories'],
      availabilityStatus: 'available',
      matchingData: {
        skills: ['leather working', 'stitching', 'tooling', 'dyeing', 'pattern making', 'finishing'],
        materials: ['leather', 'suede', 'canvas', 'thread', 'hardware', 'dyes', 'wax'],
        techniques: ['hand stitching', 'machine stitching', 'tooling', 'embossing', 'dyeing', 'finishing'],
        portfolioKeywords: ['bags', 'wallets', 'belts', 'purses', 'laptop bags', 'accessories'],
        categoryTags: ['leather goods', 'accessories', 'bags', 'fashion'],
        experienceLevel: 'expert',
        averageProjectSize: { min: 1200, max: 12000 },
        typicalTimeline: '1-2 weeks',
        lastProfileUpdate: new Date(),
        verificationStatus: {
          skillsVerified: true,
          portfolioVerified: true,
          identityVerified: true
        }
      },
      performanceMetrics: {
        responseTime: 6,
        completionRate: 0.93,
        customerSatisfaction: 4.5,
        repeatCustomerRate: 0.38,
        totalOrders: 95,
        successfulDeliveries: 88,
        averageOrderValue: 4500,
        lastActiveDate: new Date(),
        profileViews: 240,
        contactRequests: 35
      }
    }
  },
  {
    uid: 'artisan_painting_001',
    name: 'Kavita Artist',
    email: 'kavita.artist@example.com',
    phone: '+91-9123456785',
    role: 'artisan',
    artisticProfession: 'painting',
    description: 'Traditional and contemporary painter specializing in canvas paintings, wall art, and custom artwork.',
    artisanConnectProfile: {
      specializations: ['canvas painting', 'wall art', 'portraits', 'landscape painting'],
      availabilityStatus: 'available',
      matchingData: {
        skills: ['painting', 'drawing', 'color mixing', 'composition', 'portrait painting', 'landscape painting'],
        materials: ['acrylic paints', 'oil paints', 'watercolors', 'canvas', 'brushes', 'palette knives'],
        techniques: ['brush painting', 'palette knife', 'layering', 'blending', 'texture work'],
        portfolioKeywords: ['paintings', 'portraits', 'landscapes', 'abstract art', 'custom artwork'],
        categoryTags: ['art', 'paintings', 'wall decor', 'custom art'],
        experienceLevel: 'expert',
        averageProjectSize: { min: 1500, max: 15000 },
        typicalTimeline: '1-3 weeks',
        lastProfileUpdate: new Date(),
        verificationStatus: {
          skillsVerified: true,
          portfolioVerified: true,
          identityVerified: true
        }
      },
      performanceMetrics: {
        responseTime: 10,
        completionRate: 0.91,
        customerSatisfaction: 4.4,
        repeatCustomerRate: 0.32,
        totalOrders: 68,
        successfulDeliveries: 62,
        averageOrderValue: 6200,
        lastActiveDate: new Date(),
        profileViews: 180,
        contactRequests: 25
      }
    }
  }
];

// Indian cities for location assignment
const cities = [
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 }
];

async function addMoreArtisans() {
  console.log('🔄 Adding More Diverse Artisan Data...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const User = mongoose.model('User', userSchema);
    
    let addedCount = 0;
    
    for (let i = 0; i < newArtisans.length; i++) {
      const artisanData = newArtisans[i];
      const city = cities[i % cities.length];
      
      // Check if artisan already exists
      const existing = await User.findOne({ uid: artisanData.uid });
      if (existing) {
        console.log(`⏭️ ${artisanData.name} already exists, skipping`);
        continue;
      }
      
      // Add location data
      artisanData.artisanConnectProfile.locationData = {
        coordinates: {
          latitude: city.lat,
          longitude: city.lng
        },
        address: {
          city: city.name,
          state: city.state,
          country: 'India'
        },
        deliveryRadius: 100,
        deliveryOptions: ['pickup', 'local_delivery', 'shipping'],
        locationAccuracy: 100,
        lastLocationUpdate: new Date()
      };
      
      console.log(`🔄 Adding ${artisanData.name} (${artisanData.artisticProfession}) - ${city.name}`);
      
      const newArtisan = new User(artisanData);
      await newArtisan.save();
      
      addedCount++;
      console.log(`   ✅ Added successfully`);
    }
    
    console.log(`\n🎉 Added ${addedCount} new artisans!`);
    
    // Show summary
    const totalArtisans = await User.countDocuments({ role: 'artisan' });
    console.log(`📊 Total artisans in database: ${totalArtisans}`);
    
    // Show breakdown by profession
    const professions = await User.aggregate([
      { $match: { role: 'artisan' } },
      { $group: { _id: '$artisticProfession', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📋 Artisans by Profession:');
    professions.forEach(prof => {
      console.log(`   ${prof._id}: ${prof.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding artisans:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

addMoreArtisans();