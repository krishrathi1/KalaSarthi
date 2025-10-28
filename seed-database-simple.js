#!/usr/bin/env node

/**
 * Simple Database Seeding Script
 * Creates 10 artisans and 10 buyers using direct MongoDB operations
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kalasarthi');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Define User schema directly
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: String,
  name: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['artisan', 'buyer'], required: true },
  artisticProfession: String,
  description: String,
  profileImage: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  artisanConnectProfile: {
    specializations: [String],
    skillTags: [{
      skill: String,
      proficiency: String,
      yearsOfExperience: Number
    }],
    portfolioHighlights: [String],
    availabilityStatus: String,
    responseTimeAverage: Number,
    aiMetrics: {
      customerSatisfactionScore: Number,
      matchSuccessRate: Number,
      averageOrderValue: Number,
      completionRate: Number,
      communicationScore: Number
    },
    culturalAuthenticity: {
      traditionalTechniques: [String],
      culturalSignificance: String,
      authenticityScore: Number
    }
  },
  buyerProfile: {
    businessType: String,
    interests: [String],
    budgetRange: {
      min: Number,
      max: Number
    },
    preferredCategories: [String],
    purchaseHistory: [String],
    communicationPreferences: {
      language: String,
      preferredTime: String,
      notificationEnabled: Boolean
    }
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

// Sample data
const artisanProfiles = [
  {
    uid: 'artisan_001',
    name: 'Rajesh Kumar',
    email: 'rajesh.potter@example.com',
    phone: '+91-9876543210',
    role: 'artisan',
    artisticProfession: 'Traditional Pottery',
    description: 'Master potter with 15+ years of experience in traditional Indian ceramics.',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Pottery Lane, Kumhar Mohalla',
      city: 'Khurja',
      state: 'Uttar Pradesh',
      zipCode: '203131',
      country: 'India'
    },
    artisanConnectProfile: {
      specializations: ['pottery', 'ceramics', 'terracotta', 'glazing'],
      skillTags: [
        { skill: 'wheel throwing', proficiency: 'expert', yearsOfExperience: 15 },
        { skill: 'glazing', proficiency: 'expert', yearsOfExperience: 12 }
      ],
      portfolioHighlights: ['Traditional Khurja pottery', 'Custom restaurant dinnerware'],
      availabilityStatus: 'available',
      responseTimeAverage: 45,
      aiMetrics: {
        customerSatisfactionScore: 4.6,
        matchSuccessRate: 0.85,
        averageOrderValue: 2500,
        completionRate: 0.92,
        communicationScore: 4.5
      },
      culturalAuthenticity: {
        traditionalTechniques: ['wheel throwing', 'natural glazing'],
        culturalSignificance: 'Khurja pottery tradition dating back to Mughal era',
        authenticityScore: 0.9
      }
    }
  },
  {
    uid: 'artisan_002',
    name: 'Priya Sharma',
    email: 'priya.weaver@example.com',
    phone: '+91-9876543211',
    role: 'artisan',
    artisticProfession: 'Handloom Weaving',
    description: 'Expert handloom weaver specializing in Banarasi silk and cotton textiles.',
    profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Weaver Colony, Sadar Bazaar',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      zipCode: '221001',
      country: 'India'
    },
    artisanConnectProfile: {
      specializations: ['handloom', 'silk weaving', 'cotton textiles'],
      skillTags: [
        { skill: 'handloom weaving', proficiency: 'expert', yearsOfExperience: 18 },
        { skill: 'silk processing', proficiency: 'advanced', yearsOfExperience: 15 }
      ],
      portfolioHighlights: ['Banarasi silk sarees', 'Traditional cotton fabrics'],
      availabilityStatus: 'available',
      responseTimeAverage: 30,
      aiMetrics: {
        customerSatisfactionScore: 4.8,
        matchSuccessRate: 0.78,
        averageOrderValue: 3200,
        completionRate: 0.95,
        communicationScore: 4.7
      },
      culturalAuthenticity: {
        traditionalTechniques: ['handloom weaving', 'natural dyeing'],
        culturalSignificance: 'Banarasi weaving tradition with Mughal influences',
        authenticityScore: 0.85
      }
    }
  },
  {
    uid: 'artisan_003',
    name: 'Amit Patel',
    email: 'amit.silversmith@example.com',
    phone: '+91-9876543212',
    role: 'artisan',
    artisticProfession: 'Silver Jewelry',
    description: 'Traditional silver jewelry craftsman with expertise in Rajasthani designs.',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Johari Bazaar, Old City',
      city: 'Jaipur',
      state: 'Rajasthan',
      zipCode: '302003',
      country: 'India'
    },
    artisanConnectProfile: {
      specializations: ['silver jewelry', 'traditional designs', 'custom pieces'],
      skillTags: [
        { skill: 'silver smithing', proficiency: 'expert', yearsOfExperience: 12 },
        { skill: 'stone setting', proficiency: 'advanced', yearsOfExperience: 8 }
      ],
      portfolioHighlights: ['Traditional Rajasthani jewelry', 'Custom wedding sets'],
      availabilityStatus: 'busy',
      responseTimeAverage: 60,
      aiMetrics: {
        customerSatisfactionScore: 4.4,
        matchSuccessRate: 0.72,
        averageOrderValue: 1800,
        completionRate: 0.88,
        communicationScore: 4.2
      },
      culturalAuthenticity: {
        traditionalTechniques: ['silver smithing', 'kundan work'],
        culturalSignificance: 'Rajasthani jewelry making tradition',
        authenticityScore: 0.8
      }
    }
  },
  {
    uid: 'artisan_004',
    name: 'Lakshmi Devi',
    email: 'lakshmi.embroidery@example.com',
    phone: '+91-9876543213',
    role: 'artisan',
    artisticProfession: 'Embroidery',
    description: 'Master embroiderer specializing in Chikankari and Phulkari work.',
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Chikan Mohalla, Aminabad',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      zipCode: '226018',
      country: 'India'
    },
    artisanConnectProfile: {
      specializations: ['chikankari', 'phulkari', 'hand embroidery'],
      skillTags: [
        { skill: 'chikankari', proficiency: 'expert', yearsOfExperience: 20 },
        { skill: 'phulkari', proficiency: 'advanced', yearsOfExperience: 15 }
      ],
      portfolioHighlights: ['Chikankari kurtas and sarees', 'Phulkari dupattas'],
      availabilityStatus: 'available',
      responseTimeAverage: 40,
      aiMetrics: {
        customerSatisfactionScore: 4.9,
        matchSuccessRate: 0.88,
        averageOrderValue: 2800,
        completionRate: 0.96,
        communicationScore: 4.8
      },
      culturalAuthenticity: {
        traditionalTechniques: ['chikankari stitches', 'phulkari patterns'],
        culturalSignificance: 'Lucknowi chikankari and Punjabi phulkari traditions',
        authenticityScore: 0.92
      }
    }
  },
  {
    uid: 'artisan_005',
    name: 'Ravi Shankar',
    email: 'ravi.woodcarver@example.com',
    phone: '+91-9876543214',
    role: 'artisan',
    artisticProfession: 'Wood Carving',
    description: 'Skilled wood carver specializing in traditional South Indian temple carvings.',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Carvers Street, Kumbakonam',
      city: 'Thanjavur',
      state: 'Tamil Nadu',
      zipCode: '613001',
      country: 'India'
    },
    artisanConnectProfile: {
      specializations: ['wood carving', 'temple art', 'furniture'],
      skillTags: [
        { skill: 'wood carving', proficiency: 'expert', yearsOfExperience: 16 },
        { skill: 'temple art', proficiency: 'expert', yearsOfExperience: 14 }
      ],
      portfolioHighlights: ['Temple door carvings', 'Decorative furniture'],
      availabilityStatus: 'available',
      responseTimeAverage: 50,
      aiMetrics: {
        customerSatisfactionScore: 4.5,
        matchSuccessRate: 0.80,
        averageOrderValue: 4500,
        completionRate: 0.90,
        communicationScore: 4.3
      },
      culturalAuthenticity: {
        traditionalTechniques: ['temple carving', 'relief work'],
        culturalSignificance: 'South Indian temple art tradition',
        authenticityScore: 0.88
      }
    }
  },
  {
    uid: 'artisan_006',
    name: 'Meera Joshi',
    email: 'meera.blockprint@example.com',
    phone: '+91-9876543215',
    role: 'artisan',
    artisticProfession: 'Block Printing',
    description: 'Expert in traditional Rajasthani block printing with natural dyes.',
    profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Block Printers Colony, Sanganer',
      city: 'Jaipur',
      state: 'Rajasthan',
      zipCode: '303902',
      country: 'India'
    },
    artisanConnectProfile: {
      specializations: ['block printing', 'natural dyes', 'textile design'],
      skillTags: [
        { skill: 'block printing', proficiency: 'expert', yearsOfExperience: 14 },
        { skill: 'natural dyeing', proficiency: 'expert', yearsOfExperience: 12 }
      ],
      portfolioHighlights: ['Sanganer block prints', 'Natural dyed fabrics'],
      availabilityStatus: 'available',
      responseTimeAverage: 35,
      aiMetrics: {
        customerSatisfactionScore: 4.7,
        matchSuccessRate: 0.82,
        averageOrderValue: 2200,
        completionRate: 0.93,
        communicationScore: 4.6
      },
      culturalAuthenticity: {
        traditionalTechniques: ['hand block printing', 'natural dyeing'],
        culturalSignificance: 'Rajasthani block printing tradition',
        authenticityScore: 0.86
      }
    }
  },
  {
    uid: 'artisan_007',
    name: 'Suresh Reddy',
    email: 'suresh.metalcraft@example.com',
    phone: '+91-9876543216',
    role: 'artisan',
    artisticProfession: 'Metal Craft',
    description: 'Traditional metalworker specializing in brass and copper utensils.',
    profileImage: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Metal Workers Street, Moradabad',
      city: 'Moradabad',
      state: 'Uttar Pradesh',
      zipCode: '244001',
      country: 'India'
    },
    artisanConnectProfile: {
      specializations: ['brass work', 'copper craft', 'metal engraving'],
      skillTags: [
        { skill: 'brass working', proficiency: 'expert', yearsOfExperience: 18 },
        { skill: 'metal engraving', proficiency: 'expert', yearsOfExperience: 15 }
      ],
      portfolioHighlights: ['Brass decorative items', 'Copper kitchen utensils'],
      availabilityStatus: 'available',
      responseTimeAverage: 55,
      aiMetrics: {
        customerSatisfactionScore: 4.3,
        matchSuccessRate: 0.75,
        averageOrderValue: 3100,
        completionRate: 0.87,
        communicationScore: 4.1
      },
      culturalAuthenticity: {
        traditionalTechniques: ['brass casting', 'metal engraving'],
        culturalSignificance: 'Moradabad metalwork tradition',
        authenticityScore: 0.83
      }
    }
  },
  {
    uid: 'artisan_008',
    name: 'Kavita Singh',
    email: 'kavita.painter@example.com',
    phone: '+91-9876543217',
    role: 'artisan',
    artisticProfession: 'Traditional Painting',
    description: 'Madhubani and Warli painting artist with expertise in traditional folk art.',
    profileImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Artists Colony, Madhubani',
      city: 'Madhubani',
      state: 'Bihar',
      zipCode: '847211',
      country: 'India'
    },
    artisanConnectProfile: {
      specializations: ['madhubani painting', 'warli art', 'folk painting'],
      skillTags: [
        { skill: 'madhubani painting', proficiency: 'expert', yearsOfExperience: 16 },
        { skill: 'warli art', proficiency: 'advanced', yearsOfExperience: 10 }
      ],
      portfolioHighlights: ['Traditional Madhubani paintings', 'Warli wall art'],
      availabilityStatus: 'available',
      responseTimeAverage: 42,
      aiMetrics: {
        customerSatisfactionScore: 4.6,
        matchSuccessRate: 0.84,
        averageOrderValue: 1900,
        completionRate: 0.91,
        communicationScore: 4.5
      },
      culturalAuthenticity: {
        traditionalTechniques: ['natural pigments', 'traditional motifs'],
        culturalSignificance: 'Madhubani and Warli folk art traditions',
        authenticityScore: 0.90
      }
    }
  },
  {
    uid: 'artisan_009',
    name: 'Deepak Agarwal',
    email: 'deepak.glasswork@example.com',
    phone: '+91-9876543218',
    role: 'artisan',
    artisticProfession: 'Glass Work',
    description: 'Traditional glassworker specializing in decorative glass items.',
    profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Glass Workers Lane, Firozabad',
      city: 'Firozabad',
      state: 'Uttar Pradesh',
      zipCode: '283203',
      country: 'India'
    },
    artisanConnectProfile: {
      specializations: ['glass blowing', 'decorative glass', 'custom designs'],
      skillTags: [
        { skill: 'glass blowing', proficiency: 'expert', yearsOfExperience: 13 },
        { skill: 'glass cutting', proficiency: 'advanced', yearsOfExperience: 11 }
      ],
      portfolioHighlights: ['Decorative glass vases', 'Custom glass designs'],
      availabilityStatus: 'busy',
      responseTimeAverage: 65,
      aiMetrics: {
        customerSatisfactionScore: 4.2,
        matchSuccessRate: 0.70,
        averageOrderValue: 2600,
        completionRate: 0.85,
        communicationScore: 4.0
      },
      culturalAuthenticity: {
        traditionalTechniques: ['glass blowing', 'traditional shaping'],
        culturalSignificance: 'Firozabad glass making tradition',
        authenticityScore: 0.78
      }
    }
  },
  {
    uid: 'artisan_010',
    name: 'Anita Kumari',
    email: 'anita.leatherwork@example.com',
    phone: '+91-9876543219',
    role: 'artisan',
    artisticProfession: 'Leather Work',
    description: 'Skilled leather craftsperson specializing in traditional bags and shoes.',
    profileImage: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Leather Craft Street, Kanpur',
      city: 'Kanpur',
      state: 'Uttar Pradesh',
      zipCode: '208001',
      country: 'India'
    },
    artisanConnectProfile: {
      specializations: ['leather bags', 'footwear', 'decorative items'],
      skillTags: [
        { skill: 'leather crafting', proficiency: 'expert', yearsOfExperience: 14 },
        { skill: 'bag making', proficiency: 'expert', yearsOfExperience: 12 }
      ],
      portfolioHighlights: ['Handcrafted leather bags', 'Traditional footwear'],
      availabilityStatus: 'available',
      responseTimeAverage: 48,
      aiMetrics: {
        customerSatisfactionScore: 4.4,
        matchSuccessRate: 0.76,
        averageOrderValue: 2400,
        completionRate: 0.89,
        communicationScore: 4.3
      },
      culturalAuthenticity: {
        traditionalTechniques: ['hand stitching', 'leather tooling'],
        culturalSignificance: 'Traditional Indian leather craftsmanship',
        authenticityScore: 0.81
      }
    }
  }
];

const buyerProfiles = [
  {
    uid: 'buyer_001',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@example.com',
    phone: '+91-9876543220',
    role: 'buyer',
    description: 'Restaurant owner looking for authentic traditional pottery and tableware.',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'MG Road, Commercial Complex',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    },
    buyerProfile: {
      businessType: 'restaurant',
      interests: ['pottery', 'tableware', 'traditional crafts'],
      budgetRange: { min: 5000, max: 50000 },
      preferredCategories: ['pottery', 'ceramics', 'metalwork'],
      purchaseHistory: [],
      communicationPreferences: {
        language: 'en',
        preferredTime: 'business_hours',
        notificationEnabled: true
      }
    }
  },
  {
    uid: 'buyer_002',
    name: 'Sneha Gupta',
    email: 'sneha.gupta@example.com',
    phone: '+91-9876543221',
    role: 'buyer',
    description: 'Interior designer specializing in traditional Indian home decor.',
    profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Design District, Sector 18',
      city: 'Gurgaon',
      state: 'Haryana',
      zipCode: '122015',
      country: 'India'
    },
    buyerProfile: {
      businessType: 'interior_design',
      interests: ['home decor', 'textiles', 'wall art', 'furniture'],
      budgetRange: { min: 10000, max: 100000 },
      preferredCategories: ['textiles', 'painting', 'wood carving', 'metal craft'],
      purchaseHistory: [],
      communicationPreferences: {
        language: 'en',
        preferredTime: 'flexible',
        notificationEnabled: true
      }
    }
  },
  {
    uid: 'buyer_003',
    name: 'Vikram Singh',
    email: 'vikram.singh@example.com',
    phone: '+91-9876543222',
    role: 'buyer',
    description: 'Boutique owner looking for traditional textiles and embroidered garments.',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Fashion Street, Linking Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400050',
      country: 'India'
    },
    buyerProfile: {
      businessType: 'retail',
      interests: ['textiles', 'embroidery', 'traditional clothing'],
      budgetRange: { min: 15000, max: 200000 },
      preferredCategories: ['textiles', 'embroidery', 'block printing'],
      purchaseHistory: [],
      communicationPreferences: {
        language: 'hi',
        preferredTime: 'business_hours',
        notificationEnabled: true
      }
    }
  },
  {
    uid: 'buyer_004',
    name: 'Priyanka Sharma',
    email: 'priyanka.sharma@example.com',
    phone: '+91-9876543223',
    role: 'buyer',
    description: 'Wedding planner seeking traditional jewelry and decorative items.',
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Wedding Planners Hub, CP',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India'
    },
    buyerProfile: {
      businessType: 'event_planning',
      interests: ['jewelry', 'decorative items', 'traditional crafts'],
      budgetRange: { min: 20000, max: 300000 },
      preferredCategories: ['jewelry', 'metal craft', 'pottery', 'textiles'],
      purchaseHistory: [],
      communicationPreferences: {
        language: 'en',
        preferredTime: 'flexible',
        notificationEnabled: true
      }
    }
  },
  {
    uid: 'buyer_005',
    name: 'Rohit Agarwal',
    email: 'rohit.agarwal@example.com',
    phone: '+91-9876543224',
    role: 'buyer',
    description: 'Art collector interested in traditional paintings and sculptures.',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Art Gallery District, Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500034',
      country: 'India'
    },
    buyerProfile: {
      businessType: 'art_collection',
      interests: ['paintings', 'sculptures', 'traditional art'],
      budgetRange: { min: 25000, max: 500000 },
      preferredCategories: ['painting', 'wood carving', 'metal craft'],
      purchaseHistory: [],
      communicationPreferences: {
        language: 'en',
        preferredTime: 'evening',
        notificationEnabled: true
      }
    }
  },
  {
    uid: 'buyer_006',
    name: 'Kavya Reddy',
    email: 'kavya.reddy@example.com',
    phone: '+91-9876543225',
    role: 'buyer',
    description: 'Hotel owner looking for traditional decor and functional items.',
    profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Hospitality District, MG Road',
      city: 'Pune',
      state: 'Maharashtra',
      zipCode: '411001',
      country: 'India'
    },
    buyerProfile: {
      businessType: 'hospitality',
      interests: ['decor', 'functional items', 'traditional crafts'],
      budgetRange: { min: 30000, max: 400000 },
      preferredCategories: ['pottery', 'textiles', 'wood carving', 'metal craft'],
      purchaseHistory: [],
      communicationPreferences: {
        language: 'en',
        preferredTime: 'business_hours',
        notificationEnabled: true
      }
    }
  },
  {
    uid: 'buyer_007',
    name: 'Manish Kumar',
    email: 'manish.kumar@example.com',
    phone: '+91-9876543226',
    role: 'buyer',
    description: 'Export business owner specializing in Indian handicrafts.',
    profileImage: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Export House, Sector 8',
      city: 'Noida',
      state: 'Uttar Pradesh',
      zipCode: '201301',
      country: 'India'
    },
    buyerProfile: {
      businessType: 'export',
      interests: ['handicrafts', 'traditional items', 'bulk orders'],
      budgetRange: { min: 50000, max: 1000000 },
      preferredCategories: ['pottery', 'textiles', 'jewelry', 'wood carving', 'metal craft'],
      purchaseHistory: [],
      communicationPreferences: {
        language: 'en',
        preferredTime: 'business_hours',
        notificationEnabled: true
      }
    }
  },
  {
    uid: 'buyer_008',
    name: 'Deepika Jain',
    email: 'deepika.jain@example.com',
    phone: '+91-9876543227',
    role: 'buyer',
    description: 'Fashion designer looking for traditional textiles and embroidery work.',
    profileImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Fashion District, Karol Bagh',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110005',
      country: 'India'
    },
    buyerProfile: {
      businessType: 'fashion_design',
      interests: ['textiles', 'embroidery', 'traditional patterns'],
      budgetRange: { min: 20000, max: 250000 },
      preferredCategories: ['textiles', 'embroidery', 'block printing'],
      purchaseHistory: [],
      communicationPreferences: {
        language: 'hi',
        preferredTime: 'flexible',
        notificationEnabled: true
      }
    }
  },
  {
    uid: 'buyer_009',
    name: 'Rajesh Khanna',
    email: 'rajesh.khanna@example.com',
    phone: '+91-9876543228',
    role: 'buyer',
    description: 'Corporate gift company owner seeking unique traditional items.',
    profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Corporate Hub, Cyber City',
      city: 'Gurgaon',
      state: 'Haryana',
      zipCode: '122002',
      country: 'India'
    },
    buyerProfile: {
      businessType: 'corporate_gifts',
      interests: ['unique items', 'traditional crafts', 'customizable products'],
      budgetRange: { min: 15000, max: 150000 },
      preferredCategories: ['pottery', 'metal craft', 'wood carving', 'leather work'],
      purchaseHistory: [],
      communicationPreferences: {
        language: 'en',
        preferredTime: 'business_hours',
        notificationEnabled: true
      }
    }
  },
  {
    uid: 'buyer_010',
    name: 'Sunita Devi',
    email: 'sunita.devi@example.com',
    phone: '+91-9876543229',
    role: 'buyer',
    description: 'Home decor store owner specializing in traditional Indian items.',
    profileImage: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Home Decor Market, Sadar Bazaar',
      city: 'Jaipur',
      state: 'Rajasthan',
      zipCode: '302006',
      country: 'India'
    },
    buyerProfile: {
      businessType: 'retail',
      interests: ['home decor', 'traditional items', 'decorative pieces'],
      budgetRange: { min: 10000, max: 80000 },
      preferredCategories: ['pottery', 'painting', 'textiles', 'glass work'],
      purchaseHistory: [],
      communicationPreferences: {
        language: 'hi',
        preferredTime: 'business_hours',
        notificationEnabled: true
      }
    }
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Insert artisans
    console.log('👨‍🎨 Creating artisan profiles...');
    for (const artisan of artisanProfiles) {
      try {
        const existingArtisan = await User.findOne({ uid: artisan.uid });
        if (!existingArtisan) {
          await User.create(artisan);
          console.log(`✅ Created artisan: ${artisan.name} (${artisan.artisticProfession})`);
        } else {
          console.log(`⚠️ Artisan already exists: ${artisan.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create artisan ${artisan.name}:`, error.message);
      }
    }
    
    // Insert buyers
    console.log('\n🛒 Creating buyer profiles...');
    for (const buyer of buyerProfiles) {
      try {
        const existingBuyer = await User.findOne({ uid: buyer.uid });
        if (!existingBuyer) {
          await User.create(buyer);
          console.log(`✅ Created buyer: ${buyer.name} (${buyer.buyerProfile.businessType})`);
        } else {
          console.log(`⚠️ Buyer already exists: ${buyer.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create buyer ${buyer.name}:`, error.message);
      }
    }
    
    // Verify seeding
    const artisanCount = await User.countDocuments({ role: 'artisan' });
    const buyerCount = await User.countDocuments({ role: 'buyer' });
    
    console.log('\n📊 Database Seeding Summary:');
    console.log(`👨‍🎨 Total Artisans: ${artisanCount}`);
    console.log(`🛒 Total Buyers: ${buyerCount}`);
    console.log(`📝 Total Users: ${artisanCount + buyerCount}`);
    
    console.log('\n✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    await seedDatabase();
    console.log('\n🎉 All done! Your database now has artisans and buyers for testing.');
  } catch (error) {
    console.error('❌ Seeding process failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the seeding
if (require.main === module) {
  main();
}

module.exports = { seedDatabase, artisanProfiles, buyerProfiles };