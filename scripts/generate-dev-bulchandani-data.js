/**
 * Generate Dev Bulchandani Profile and Products
 * Creates comprehensive artisan profile and product catalog for Dev Bulchandani
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');

// Firebase config (using environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Dev Bulchandani Profile Data
const devBulchandaniProfile = {
  uid: 'dev_bulchandani_001',
  email: 'dev.bulchandani@example.com',
  name: 'Dev Bulchandani',
  phone: '+91-9876543299',
  role: 'artisan',
  artisticProfession: 'woodworking',
  description: 'Master craftsman specializing in traditional and contemporary wooden furniture, doors, and decorative items with 15+ years of experience. Known for exceptional quality and innovative designs that blend traditional Rajasthani craftsmanship with modern aesthetics.',
  profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  address: {
    street: 'Craftsman Colony, Workshop Lane, Sector 12',
    city: 'Jodhpur',
    state: 'Rajasthan',
    zipCode: '342001',
    country: 'India'
  },
  businessInfo: {
    gstNumber: '08ABCDE1234F1Z5',
    businessName: 'Bulchandani Woodworks',
    establishedYear: 2009,
    specializations: ['furniture', 'doors', 'decorative_items', 'custom_woodwork', 'restoration']
  },
  createdAt: Timestamp.fromDate(new Date('2023-01-15')),
  updatedAt: Timestamp.now(),
  // Enhanced artisan profile fields
  artisanConnectProfile: {
    availabilityStatus: 'available',
    specializations: ['woodworking', 'furniture', 'doors', 'traditional', 'handmade'],
    performanceMetrics: {
      customerSatisfaction: 4.8,
      completionRate: 0.95,
      totalOrders: 156,
      responseTime: 45 // minutes
    },
    matchingData: {
      skills: ['woodworking', 'furniture_making', 'door_crafting', 'traditional_crafts', 'handmade'],
      materials: ['teak_wood', 'sheesham_wood', 'mango_wood', 'oak_wood', 'pine_wood', 'brass_hardware'],
      techniques: ['woodworking', 'carving', 'joinery', 'finishing', 'traditional_methods'],
      verificationStatus: {
        skillsVerified: true,
        portfolioVerified: true,
        identityVerified: true
      }
    }
  }
};

// Dev Bulchandani Products Data
const devBulchandaniProducts = [
  {
    id: 'dev_bulchandani_product_1',
    artisanId: 'dev_bulchandani_001',
    artisanName: 'Dev Bulchandani',
    name: 'Handcrafted Teak Dining Table',
    description: 'Premium teak wood dining table with traditional joinery techniques, seats 6 people comfortably. Features intricate carved legs and a smooth, durable finish that highlights the natural wood grain.',
    price: 45000,
    currency: 'INR',
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop'
    ],
    category: 'furniture',
    materials: ['teak_wood', 'brass_hardware', 'natural_finish'],
    dimensions: '180cm x 90cm x 75cm',
    weight: '65kg',
    customizable: true,
    inStock: true,
    craftingTime: '25-30 days',
    tags: ['dining_table', 'teak', 'handcrafted', 'traditional', 'premium'],
    rating: 4.8,
    reviewCount: 23,
    featured: true,
    shippingInfo: {
      freeShipping: true,
      estimatedDays: 7,
      shippingCost: 0
    },
    artisanLocation: 'Jodhpur, Rajasthan',
    createdAt: Timestamp.fromDate(new Date('2023-03-15')),
    updatedAt: Timestamp.now()
  },
  {
    id: 'dev_bulchandani_product_2',
    artisanId: 'dev_bulchandani_001',
    artisanName: 'Dev Bulchandani',
    name: 'Carved Wooden Door Set',
    description: 'Traditional Rajasthani carved wooden doors with brass fittings, perfect for heritage homes. Features intricate peacock and floral motifs with antique brass hardware.',
    price: 85000,
    currency: 'INR',
    images: [
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'
    ],
    category: 'doors',
    materials: ['sheesham_wood', 'brass_fittings', 'traditional_carving'],
    dimensions: '210cm x 120cm x 5cm (pair)',
    weight: '120kg',
    customizable: true,
    inStock: false,
    craftingTime: '40-45 days',
    tags: ['doors', 'carved', 'traditional', 'rajasthani', 'heritage'],
    rating: 4.9,
    reviewCount: 15,
    featured: true,
    shippingInfo: {
      freeShipping: true,
      estimatedDays: 10,
      shippingCost: 0
    },
    artisanLocation: 'Jodhpur, Rajasthan',
    createdAt: Timestamp.fromDate(new Date('2023-02-20')),
    updatedAt: Timestamp.now()
  },
  {
    id: 'dev_bulchandani_product_3',
    artisanId: 'dev_bulchandani_001',
    artisanName: 'Dev Bulchandani',
    name: 'Wooden Coffee Table with Storage',
    description: 'Contemporary coffee table with hidden storage compartments. Made from sustainable mango wood with a rich walnut finish.',
    price: 18000,
    currency: 'INR',
    images: [
      'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop'
    ],
    category: 'furniture',
    materials: ['mango_wood', 'walnut_finish', 'soft_close_hinges'],
    dimensions: '120cm x 60cm x 45cm',
    weight: '25kg',
    customizable: true,
    inStock: true,
    craftingTime: '15-20 days',
    tags: ['coffee_table', 'storage', 'contemporary', 'mango_wood'],
    rating: 4.6,
    reviewCount: 31,
    featured: false,
    shippingInfo: {
      freeShipping: true,
      estimatedDays: 5,
      shippingCost: 0
    },
    artisanLocation: 'Jodhpur, Rajasthan',
    createdAt: Timestamp.fromDate(new Date('2023-04-10')),
    updatedAt: Timestamp.now()
  },
  {
    id: 'dev_bulchandani_product_4',
    artisanId: 'dev_bulchandani_001',
    artisanName: 'Dev Bulchandani',
    name: 'Decorative Wall Shelf Set',
    description: 'Set of 3 floating wall shelves with traditional Rajasthani motifs. Perfect for displaying decorative items and books.',
    price: 8500,
    currency: 'INR',
    images: [
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop'
    ],
    category: 'decorative_items',
    materials: ['pine_wood', 'carved_details', 'wall_brackets'],
    dimensions: 'Large: 80cm, Medium: 60cm, Small: 40cm',
    weight: '8kg (set)',
    customizable: true,
    inStock: true,
    craftingTime: '10-12 days',
    tags: ['wall_shelf', 'decorative', 'floating', 'set_of_3'],
    rating: 4.4,
    reviewCount: 18,
    featured: false,
    shippingInfo: {
      freeShipping: false,
      estimatedDays: 4,
      shippingCost: 250
    },
    artisanLocation: 'Jodhpur, Rajasthan',
    createdAt: Timestamp.fromDate(new Date('2023-05-05')),
    updatedAt: Timestamp.now()
  },
  {
    id: 'dev_bulchandani_product_5',
    artisanId: 'dev_bulchandani_001',
    artisanName: 'Dev Bulchandani',
    name: 'Custom Wooden Wardrobe',
    description: 'Large custom wardrobe with multiple compartments, drawers, and hanging space. Made to order with premium quality wood and fittings.',
    price: 125000,
    currency: 'INR',
    images: [
      'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=400&h=400&fit=crop'
    ],
    category: 'furniture',
    materials: ['teak_wood', 'plywood_backing', 'premium_hardware'],
    dimensions: '240cm x 60cm x 220cm',
    weight: '180kg',
    customizable: true,
    inStock: false,
    craftingTime: '45-60 days',
    tags: ['wardrobe', 'custom', 'large', 'storage', 'premium'],
    rating: 4.9,
    reviewCount: 8,
    featured: true,
    shippingInfo: {
      freeShipping: true,
      estimatedDays: 14,
      shippingCost: 0
    },
    artisanLocation: 'Jodhpur, Rajasthan',
    createdAt: Timestamp.fromDate(new Date('2023-01-30')),
    updatedAt: Timestamp.now()
  },
  {
    id: 'dev_bulchandani_product_6',
    artisanId: 'dev_bulchandani_001',
    artisanName: 'Dev Bulchandani',
    name: 'Wooden Study Desk',
    description: 'Ergonomic study desk with built-in drawers and cable management. Perfect for home office or student use.',
    price: 22000,
    currency: 'INR',
    images: [
      'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400&h=400&fit=crop'
    ],
    category: 'furniture',
    materials: ['oak_wood', 'metal_legs', 'drawer_slides'],
    dimensions: '140cm x 70cm x 75cm',
    weight: '35kg',
    customizable: true,
    inStock: true,
    craftingTime: '18-22 days',
    tags: ['study_desk', 'office', 'ergonomic', 'drawers'],
    rating: 4.5,
    reviewCount: 27,
    featured: false,
    shippingInfo: {
      freeShipping: true,
      estimatedDays: 6,
      shippingCost: 0
    },
    artisanLocation: 'Jodhpur, Rajasthan',
    createdAt: Timestamp.fromDate(new Date('2023-06-12')),
    updatedAt: Timestamp.now()
  }
];

// Main function to generate all data
async function generateDevBulchandaniData() {
  console.log('🎨 Starting Dev Bulchandani data generation...');
  
  try {
    // Create artisan profile
    console.log('📝 Creating Dev Bulchandani artisan profile...');
    await setDoc(doc(db, 'users', devBulchandaniProfile.uid), devBulchandaniProfile);
    console.log('✅ Dev Bulchandani profile created successfully');
    
    // Create products
    console.log('🛍️ Creating Dev Bulchandani product catalog...');
    for (const product of devBulchandaniProducts) {
      await setDoc(doc(db, 'products', product.id), product);
      console.log(`✅ Created product: ${product.name}`);
    }
    
    console.log('🎉 Dev Bulchandani data generation completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Artisan Profile: 1`);
    console.log(`   - Products: ${devBulchandaniProducts.length}`);
    console.log(`   - Total Documents: ${1 + devBulchandaniProducts.length}`);
    
  } catch (error) {
    console.error('❌ Error generating Dev Bulchandani data:', error);
    throw error;
  }
}

// Export the function
module.exports = { generateDevBulchandaniData };

// Run the generation if this file is executed directly
if (require.main === module) {
  generateDevBulchandaniData()
    .then(() => {
      console.log('✅ Dev Bulchandani data generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Dev Bulchandani data generation failed:', error);
      process.exit(1);
    });
}