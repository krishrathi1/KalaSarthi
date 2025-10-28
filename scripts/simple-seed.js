/**
 * Simple Firestore seeding script for testing intelligent profession matching
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');

// Firebase config
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

// Simple artisan data
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
      street: 'Pottery Lane',
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
    email: 'amit.woodwork@example.com',
    name: 'Amit Kumar',
    phone: '+91-9876543212',
    role: 'artisan',
    artisticProfession: 'woodworking',
    description: 'Master carpenter specializing in custom wooden doors, furniture, and commercial woodwork for hotels and restaurants',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Carpenter Street',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India'
    }
  },
  {
    uid: 'artisan_004',
    email: 'ravi.carpenter@example.com',
    name: 'Ravi Singh',
    phone: '+91-9876543213',
    role: 'artisan',
    artisticProfession: 'woodworking',
    description: 'Expert in traditional and modern woodworking, specializing in hotel furniture and commercial doors with traditional Indian carving',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Wood Market',
      city: 'Gurgaon',
      state: 'Haryana',
      zipCode: '122001',
      country: 'India'
    }
  },
  {
    uid: 'artisan_005',
    email: 'maya.textiles@example.com',
    name: 'Maya Devi',
    phone: '+91-9876543214',
    role: 'artisan',
    artisticProfession: 'textiles',
    description: 'Traditional weaver specializing in handwoven sarees, fabrics, and textile art',
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Weaver Colony',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      zipCode: '221001',
      country: 'India'
    }
  }
];

async function seedSimpleData() {
  console.log('🌱 Starting simple Firestore seeding...');
  
  try {
    // Seed artisans with enhanced profiles
    console.log('📝 Creating artisan profiles...');
    for (const artisan of artisans) {
      const enhancedArtisan = {
        ...artisan,
        createdAt: new Date(),
        updatedAt: new Date(),
        artisanConnectProfile: {
          availabilityStatus: 'available',
          specializations: [artisan.artisticProfession, 'traditional', 'handmade'],
          performanceMetrics: {
            customerSatisfaction: 4.5,
            completionRate: 0.9,
            totalOrders: 50,
            responseTime: 60
          },
          matchingData: {
            skills: [artisan.artisticProfession, 'traditional_crafts', 'handmade'],
            materials: artisan.artisticProfession === 'woodworking' ? ['wood', 'teak', 'oak', 'timber'] :
                       artisan.artisticProfession === 'pottery' ? ['clay', 'ceramic', 'terracotta'] :
                       artisan.artisticProfession === 'jewelry' ? ['gold', 'silver', 'precious_stones'] :
                       artisan.artisticProfession === 'textiles' ? ['silk', 'cotton', 'wool'] :
                       ['traditional_materials'],
            techniques: [artisan.artisticProfession, 'handcrafted', 'traditional_methods']
          }
        }
      };
      
      await setDoc(doc(db, 'users', artisan.uid), enhancedArtisan);
      console.log(`✅ Created artisan: ${artisan.name} (${artisan.artisticProfession})`);
    }
    
    console.log('🎉 Successfully seeded Firestore with simple test data!');
    console.log('📊 Summary:');
    console.log(`   - Artisans: ${artisans.length}`);
    console.log(`   - Woodworking artisans: ${artisans.filter(a => a.artisticProfession === 'woodworking').length}`);
    
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    throw error;
  }
}

// Run the seeding
if (require.main === module) {
  seedSimpleData()
    .then(() => {
      console.log('✅ Simple seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Simple seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedSimpleData };