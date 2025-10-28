/**
 * Seed Firestore with test users and products for Enhanced Multilingual Chat
 * Creates 10 artisans and 10 buyers with realistic data plus product listings
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');

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

// Artisan data
const artisans = [
  {
    uid: 'artisan_001',
    email: 'rajesh.pottery@example.com',
    name: 'Rajesh Kumar',
    phone: '+91-9876543210',
    role: 'artisan',
    artisticProfession: 'pottery',
    description: 'Master potter with 20+ years experience in traditional Indian pottery',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Pottery Lane, Kumhar Gali',
      city: 'Jaipur',
      state: 'Rajasthan',
      zipCode: '302001',
      country: 'India'
    }
  },
  {
    uid: 'artisan_002',
    email: 'priya.jewelry@example.com',
    name: 'Priya Sharma',
    phone: '+91-9876543211',
    role: 'artisan',
    artisticProfession: 'jewelry',
    description: 'Traditional jewelry maker specializing in Kundan and Meenakari work',
    profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Johari Bazaar',
      city: 'Jaipur',
      state: 'Rajasthan',
      zipCode: '302003',
      country: 'India'
    }
  },
  {
    uid: 'artisan_003',
    email: 'amit.textiles@example.com',
    name: 'Amit Verma',
    phone: '+91-9876543212',
    role: 'artisan',
    artisticProfession: 'textiles',
    description: 'Handloom weaver creating beautiful traditional fabrics and sarees',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Weaver Colony',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      zipCode: '221001',
      country: 'India'
    }
  },
  {
    uid: 'artisan_004',
    email: 'lakshmi.woodwork@example.com',
    name: 'Lakshmi Devi',
    phone: '+91-9876543213',
    role: 'artisan',
    artisticProfession: 'woodwork',
    description: 'Expert wood carver creating intricate sculptures and furniture',
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Carpenter Street',
      city: 'Mysore',
      state: 'Karnataka',
      zipCode: '570001',
      country: 'India'
    }
  },
  {
    uid: 'artisan_005',
    email: 'ravi.metalwork@example.com',
    name: 'Ravi Patel',
    phone: '+91-9876543214',
    role: 'artisan',
    artisticProfession: 'metalwork',
    description: 'Traditional metalworker specializing in brass and copper items',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Metal Market',
      city: 'Moradabad',
      state: 'Uttar Pradesh',
      zipCode: '244001',
      country: 'India'
    }
  },
  {
    uid: 'artisan_006',
    email: 'sunita.painting@example.com',
    name: 'Sunita Singh',
    phone: '+91-9876543215',
    role: 'artisan',
    artisticProfession: 'painting',
    description: 'Madhubani painting artist creating traditional folk art',
    profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Artist Colony',
      city: 'Madhubani',
      state: 'Bihar',
      zipCode: '847211',
      country: 'India'
    }
  },
  {
    uid: 'artisan_007',
    email: 'kiran.pottery@example.com',
    name: 'Kiran Joshi',
    phone: '+91-9876543216',
    role: 'artisan',
    artisticProfession: 'pottery',
    description: 'Contemporary potter blending traditional and modern techniques',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Pottery Village',
      city: 'Khurja',
      state: 'Uttar Pradesh',
      zipCode: '203131',
      country: 'India'
    }
  },
  {
    uid: 'artisan_008',
    email: 'meera.jewelry@example.com',
    name: 'Meera Agarwal',
    phone: '+91-9876543217',
    role: 'artisan',
    artisticProfession: 'jewelry',
    description: 'Silver jewelry designer with expertise in tribal and contemporary designs',
    profileImage: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Silver Market',
      city: 'Pushkar',
      state: 'Rajasthan',
      zipCode: '305022',
      country: 'India'
    }
  },
  {
    uid: 'artisan_009',
    email: 'deepak.textiles@example.com',
    name: 'Deepak Gupta',
    phone: '+91-9876543218',
    role: 'artisan',
    artisticProfession: 'textiles',
    description: 'Block printing expert creating beautiful patterns on fabrics',
    profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Block Print Colony',
      city: 'Bagru',
      state: 'Rajasthan',
      zipCode: '303007',
      country: 'India'
    }
  },
  {
    uid: 'artisan_010',
    email: 'kavita.woodwork@example.com',
    name: 'Kavita Reddy',
    phone: '+91-9876543219',
    role: 'artisan',
    artisticProfession: 'woodwork',
    description: 'Sandalwood carving specialist creating religious and decorative items',
    profileImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Sandalwood Street',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    }
  }
];

// Buyer data
const buyers = [
  {
    uid: 'buyer_001',
    email: 'anita.buyer@example.com',
    name: 'Anita Mehta',
    phone: '+91-8765432101',
    role: 'buyer',
    artisticProfession: 'collector',
    description: 'Art collector interested in traditional Indian crafts',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400050',
      country: 'India'
    }
  },
  {
    uid: 'buyer_002',
    email: 'rohit.buyer@example.com',
    name: 'Rohit Kapoor',
    phone: '+91-8765432102',
    role: 'buyer',
    artisticProfession: 'interior_designer',
    description: 'Interior designer looking for unique handcrafted items',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India'
    }
  },
  {
    uid: 'buyer_003',
    email: 'sneha.buyer@example.com',
    name: 'Sneha Iyer',
    phone: '+91-8765432103',
    role: 'buyer',
    artisticProfession: 'fashion_designer',
    description: 'Fashion designer seeking traditional textiles and jewelry',
    profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560034',
      country: 'India'
    }
  },
  {
    uid: 'buyer_004',
    email: 'vikram.buyer@example.com',
    name: 'Vikram Singh',
    phone: '+91-8765432104',
    role: 'buyer',
    artisticProfession: 'hotel_owner',
    description: 'Hotel owner looking for authentic decor items',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'City Palace Road',
      city: 'Udaipur',
      state: 'Rajasthan',
      zipCode: '313001',
      country: 'India'
    }
  },
  {
    uid: 'buyer_005',
    email: 'pooja.buyer@example.com',
    name: 'Pooja Nair',
    phone: '+91-8765432105',
    role: 'buyer',
    artisticProfession: 'event_planner',
    description: 'Event planner specializing in traditional Indian weddings',
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Marine Drive',
      city: 'Kochi',
      state: 'Kerala',
      zipCode: '682031',
      country: 'India'
    }
  },
  {
    uid: 'buyer_006',
    email: 'arjun.buyer@example.com',
    name: 'Arjun Malhotra',
    phone: '+91-8765432106',
    role: 'buyer',
    artisticProfession: 'architect',
    description: 'Architect incorporating traditional elements in modern designs',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Sector 17',
      city: 'Chandigarh',
      state: 'Punjab',
      zipCode: '160017',
      country: 'India'
    }
  },
  {
    uid: 'buyer_007',
    email: 'divya.buyer@example.com',
    name: 'Divya Sharma',
    phone: '+91-8765432107',
    role: 'buyer',
    artisticProfession: 'boutique_owner',
    description: 'Boutique owner curating traditional and contemporary fashion',
    profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Khan Market',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110003',
      country: 'India'
    }
  },
  {
    uid: 'buyer_008',
    email: 'rajesh.buyer@example.com',
    name: 'Rajesh Agarwal',
    phone: '+91-8765432108',
    role: 'buyer',
    artisticProfession: 'gallery_owner',
    description: 'Art gallery owner promoting traditional Indian crafts',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Linking Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400050',
      country: 'India'
    }
  },
  {
    uid: 'buyer_009',
    email: 'nisha.buyer@example.com',
    name: 'Nisha Patel',
    phone: '+91-8765432109',
    role: 'buyer',
    artisticProfession: 'home_decorator',
    description: 'Home decorator with passion for handcrafted items',
    profileImage: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Satellite',
      city: 'Ahmedabad',
      state: 'Gujarat',
      zipCode: '380015',
      country: 'India'
    }
  },
  {
    uid: 'buyer_010',
    email: 'suresh.buyer@example.com',
    name: 'Suresh Kumar',
    phone: '+91-8765432110',
    role: 'buyer',
    artisticProfession: 'export_business',
    description: 'Export business owner dealing in Indian handicrafts',
    profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Export House',
      city: 'Chennai',
      state: 'Tamil Nadu',
      zipCode: '600001',
      country: 'India'
    }
  }
];

// Enhanced profiles for artisans
const getArtisanProfile = (artisan) => ({
  ...artisan,
  artisanConnectProfile: {
    virtualShowroomId: `showroom_${artisan.uid}`,
    businessHours: {
      timezone: 'Asia/Kolkata',
      schedule: [
        { day: 'Monday', start: '09:00', end: '18:00', available: true },
        { day: 'Tuesday', start: '09:00', end: '18:00', available: true },
        { day: 'Wednesday', start: '09:00', end: '18:00', available: true },
        { day: 'Thursday', start: '09:00', end: '18:00', available: true },
        { day: 'Friday', start: '09:00', end: '18:00', available: true },
        { day: 'Saturday', start: '10:00', end: '16:00', available: true },
        { day: 'Sunday', start: '10:00', end: '14:00', available: false }
      ]
    },
    responseTimeAverage: Math.floor(Math.random() * 120) + 30,
    acceptsCustomOrders: true,
    minimumOrderValue: Math.floor(Math.random() * 2000) + 500,
    specializations: [artisan.artisticProfession],
    availabilityStatus: Math.random() > 0.3 ? 'available' : 'busy',
    performanceMetrics: {
      responseTime: Math.floor(Math.random() * 48) + 2,
      completionRate: Math.random() * 0.15 + 0.85,
      customerSatisfaction: Math.random() * 1.5 + 3.5,
      totalOrders: Math.floor(Math.random() * 200) + 10
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

// Enhanced profiles for buyers
const getBuyerProfile = (buyer) => ({
  ...buyer,
  buyerConnectProfile: {
    preferredLanguage: 'en',
    communicationPreferences: {
      emailNotifications: true,
      pushNotifications: true,
      translationEnabled: true
    },
    purchaseHistory: [],
    favoriteArtisans: [],
    culturalInterests: ['traditional_art', 'handicrafts'],
    behaviorAnalytics: {
      sessionCount: Math.floor(Math.random() * 50) + 1,
      averageSessionDuration: Math.floor(Math.random() * 1800) + 300,
      lastActivity: new Date(),
      engagementScore: Math.random() * 0.8 + 0.2
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

// Product data for artisans
const getProductsForArtisan = (artisan) => {
  const baseProducts = [
    {
      id: `${artisan.uid}_product_1`,
      name: `Traditional ${artisan.artisticProfession} Item 1`,
      description: `Handcrafted ${artisan.artisticProfession} piece with traditional designs`,
      price: Math.floor(Math.random() * 5000) + 1000,
      currency: 'INR',
      images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'],
      category: artisan.artisticProfession,
      materials: ['traditional_materials'],
      customizable: true,
      inStock: true,
      craftingTime: '7-10 days'
    },
    {
      id: `${artisan.uid}_product_2`,
      name: `Decorative ${artisan.artisticProfession} Item 2`,
      description: `Beautiful ${artisan.artisticProfession} piece for home decoration`,
      price: Math.floor(Math.random() * 3000) + 800,
      currency: 'INR',
      images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop'],
      category: artisan.artisticProfession,
      materials: ['traditional_materials'],
      customizable: true,
      inStock: true,
      craftingTime: '5-7 days'
    }
  ];

  return baseProducts.map(product => ({
    ...product,
    artisanId: artisan.uid,
    artisanName: artisan.name,
    artisanLocation: `${artisan.address.city}, ${artisan.address.state}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    rating: Math.random() * 1.5 + 3.5,
    reviewCount: Math.floor(Math.random() * 50) + 5
  }));
};

// Main seeding function
async function seedFirestoreUsersWithProducts() {
  console.log('🌱 Starting comprehensive Firestore seeding...');
  
  try {
    // Seed artisans
    console.log('📝 Creating artisan profiles...');
    for (const artisan of artisans) {
      const enhancedArtisan = getArtisanProfile(artisan);
      await setDoc(doc(db, 'users', artisan.uid), enhancedArtisan);
      console.log(`✅ Created artisan: ${artisan.name} (${artisan.artisticProfession})`);
    }
    
    // Seed buyers
    console.log('📝 Creating buyer profiles...');
    for (const buyer of buyers) {
      const enhancedBuyer = getBuyerProfile(buyer);
      await setDoc(doc(db, 'users', buyer.uid), enhancedBuyer);
      console.log(`✅ Created buyer: ${buyer.name}`);
    }
    
    // Seed products
    console.log('🛍️ Creating product listings...');
    let totalProducts = 0;
    for (const artisan of artisans) {
      const products = getProductsForArtisan(artisan);
      for (const product of products) {
        await setDoc(doc(db, 'products', product.id), product);
        totalProducts++;
      }
      console.log(`✅ Created ${products.length} products for ${artisan.name}`);
    }
    
    console.log('🎉 Successfully seeded Firestore with comprehensive test data!');
    console.log('📊 Summary:');
    console.log(`   - Artisans: ${artisans.length}`);
    console.log(`   - Buyers: ${buyers.length}`);
    console.log(`   - Products: ${totalProducts}`);
    console.log(`   - Total documents: ${artisans.length + buyers.length + totalProducts}`);
    
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    throw error;
  }
}

// Export the function
module.exports = { 
  seedFirestoreUsers: seedFirestoreUsersWithProducts,
  seedFirestoreUsersWithProducts 
};

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedFirestoreUsersWithProducts()
    .then(() => {
      console.log('✨ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}