/**
 * Seed Firestore with test users for Enhanced Multilingual Chat
 * Creates 10 artisans and 10 buyers with realistic data
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
    email: 'amit.woodwork@example.com',
    name: 'Amit Kumar',
    phone: '+91-9876543212',
    role: 'artisan',
    artisticProfession: 'woodworking',
    description: 'Master carpenter specializing in custom wooden doors, furniture, and commercial woodwork for hotels and restaurants',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Carpenter Street, Vishwakarma Colony',
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
    description: 'Expert in traditional and modern woodworking, specializing in hotel furniture and commercial doors',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Wood Market, Sector 15',
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
      street: 'Weaver Colony, Handloom Street',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      zipCode: '221001',
      country: 'India'
    }
  }
];

// Buyer data
const buyers = [
  {
    uid: 'buyer_001',
    email: 'hotel.manager@example.com',
    name: 'Rajesh Gupta',
    phone: '+91-9876543220',
    role: 'buyer',
    artisticProfession: 'Hotel Manager',
    description: 'Hotel manager looking for traditional Indian handicrafts and furniture for luxury hotel',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Hotel District',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India'
    }
  },
  {
    uid: 'buyer_002',
    email: 'interior.designer@example.com',
    name: 'Priya Mehta',
    phone: '+91-9876543221',
    role: 'buyer',
    artisticProfession: 'Interior Designer',
    description: 'Interior designer specializing in traditional Indian decor for commercial spaces',
    profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    address: {
      street: 'Design District',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India'
    }
  }
];

// Helper functions
const getArtisanProfile = (artisan) => {
  const now = new Date();
  return {
    uid: artisan.uid,
    email: artisan.email,
    name: artisan.name,
    phone: artisan.phone,
    role: artisan.role,
    artisticProfession: artisan.artisticProfession,
    description: artisan.description,
    profileImage: artisan.profileImage,
    address: artisan.address,
    createdAt: now,
    updatedAt: now,
    artisanConnectProfile: {
      availabilityStatus: 'available',
      specializations: [artisan.artisticProfession, 'traditional', 'handmade'],
      performanceMetrics: {
        customerSatisfaction: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10, // 3.5-5.0
        completionRate: Math.round((Math.random() * 0.3 + 0.7) * 100) / 100, // 0.7-1.0
        totalOrders: Math.floor(Math.random() * 100) + 20, // 20-120
        responseTime: Math.floor(Math.random() * 60) + 30 // 30-90 minutes
      },
      matchingData: {
        skills: [artisan.artisticProfession, 'traditional_crafts', 'handmade'],
        materials: artisan.artisticProfession === 'woodworking' ? ['wood', 'teak', 'oak', 'timber'] :
                   artisan.artisticProfession === 'pottery' ? ['clay', 'ceramic', 'terracotta'] :
                   artisan.artisticProfession === 'jewelry' ? ['gold', 'silver', 'precious_stones'] :
                   artisan.artisticProfession === 'textiles' ? ['silk', 'cotton', 'wool'] :
                   ['traditional_materials'],
        techniques: [artisan.artisticProfession, 'handcrafted', 'traditional_methods'],
        verificationStatus: {
          skillsVerified: true,
          portfolioVerified: true,
          identityVerified: true
        }
      }
    }
  };
};

const getBuyerProfile = (buyer) => {
  const now = new Date();
  return {
    uid: buyer.uid,
    email: buyer.email,
    name: buyer.name,
    phone: buyer.phone,
    role: buyer.role,
    artisticProfession: buyer.artisticProfession,
    description: buyer.description,
    profileImage: buyer.profileImage,
    address: buyer.address,
    createdAt: now,
    updatedAt: now,
    buyerProfile: {
      preferences: ['traditional', 'handmade', 'authentic'],
      budget: { min: 1000, max: 50000, currency: 'INR' },
      previousOrders: Math.floor(Math.random() * 10),
      favoriteCategories: ['furniture', 'decor', 'traditional_crafts']
    }
  };
};

// Product data for artisans
const getProductsForArtisan = (artisan) => {
  const productsByProfession = {
    pottery: [
      {
        id: `${artisan.uid}_product_1`,
        name: 'Traditional Terracotta Water Pot',
        description: 'Handcrafted terracotta water pot with traditional designs, perfect for keeping water cool naturally.',
        price: 850,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'],
        category: 'kitchenware',
        materials: ['terracotta', 'natural_clay'],
        dimensions: '25cm x 25cm x 30cm',
        weight: '2.5kg',
        customizable: true,
        inStock: true,
        craftingTime: '5-7 days'
      },
      {
        id: `${artisan.uid}_product_2`,
        name: 'Decorative Ceramic Vase',
        description: 'Beautiful glazed ceramic vase with intricate patterns, ideal for home decoration.',
        price: 1200,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop'],
        category: 'home_decor',
        materials: ['ceramic', 'glaze'],
        dimensions: '15cm x 15cm x 25cm',
        weight: '1.2kg',
        customizable: true,
        inStock: true,
        craftingTime: '7-10 days'
      },
      {
        id: `${artisan.uid}_product_3`,
        name: 'Set of Clay Dinner Plates',
        description: 'Set of 6 handmade clay dinner plates with natural finish, eco-friendly and durable.',
        price: 2400,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop'],
        category: 'kitchenware',
        materials: ['clay', 'natural_finish'],
        dimensions: '25cm diameter each',
        weight: '3kg (set)',
        customizable: false,
        inStock: true,
        craftingTime: '10-12 days'
      }
    ],
    jewelry: [
      {
        id: `${artisan.uid}_product_1`,
        name: 'Traditional Kundan Necklace',
        description: 'Exquisite Kundan necklace with precious stones, perfect for weddings and special occasions.',
        price: 15000,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop'],
        category: 'necklaces',
        materials: ['gold_plated', 'kundan', 'precious_stones'],
        dimensions: '40cm length',
        weight: '150g',
        customizable: true,
        inStock: true,
        craftingTime: '15-20 days'
      },
      {
        id: `${artisan.uid}_product_2`,
        name: 'Silver Tribal Earrings',
        description: 'Handcrafted silver earrings with traditional tribal designs, lightweight and elegant.',
        price: 3500,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=400&h=400&fit=crop'],
        category: 'earrings',
        materials: ['sterling_silver', 'tribal_motifs'],
        dimensions: '6cm length',
        weight: '25g',
        customizable: true,
        inStock: true,
        craftingTime: '7-10 days'
      },
      {
        id: `${artisan.uid}_product_3`,
        name: 'Meenakari Bracelet',
        description: 'Beautiful Meenakari bracelet with colorful enamel work and traditional patterns.',
        price: 4500,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400&h=400&fit=crop'],
        category: 'bracelets',
        materials: ['brass', 'enamel', 'meenakari_work'],
        dimensions: '18cm length, adjustable',
        weight: '80g',
        customizable: true,
        inStock: true,
        craftingTime: '12-15 days'
      }
    ],
    textiles: [
      {
        id: `${artisan.uid}_product_1`,
        name: 'Handwoven Silk Saree',
        description: 'Pure silk saree with traditional handwoven patterns and gold border, perfect for special occasions.',
        price: 8500,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop'],
        category: 'sarees',
        materials: ['pure_silk', 'gold_thread', 'natural_dyes'],
        dimensions: '6 meters length',
        weight: '800g',
        customizable: true,
        inStock: true,
        craftingTime: '20-25 days'
      },
      {
        id: `${artisan.uid}_product_2`,
        name: 'Block Printed Cotton Fabric',
        description: 'Hand block printed cotton fabric with traditional motifs, perfect for clothing and home decor.',
        price: 450,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1582639590180-5d5c5c2a8f8c?w=400&h=400&fit=crop'],
        category: 'fabrics',
        materials: ['cotton', 'natural_dyes', 'block_print'],
        dimensions: '1 meter length x 110cm width',
        weight: '200g per meter',
        customizable: true,
        inStock: true,
        craftingTime: '5-7 days'
      },
      {
        id: `${artisan.uid}_product_3`,
        name: 'Embroidered Cushion Covers',
        description: 'Set of 4 cushion covers with intricate hand embroidery and traditional patterns.',
        price: 2800,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400&h=400&fit=crop'],
        category: 'home_textiles',
        materials: ['cotton', 'silk_thread', 'hand_embroidery'],
        dimensions: '40cm x 40cm each',
        weight: '600g (set)',
        customizable: true,
        inStock: true,
        craftingTime: '15-18 days'
      }
    ],
    woodworking: [
      {
        id: `${artisan.uid}_product_1`,
        name: 'Custom Wooden Hotel Doors',
        description: 'Premium quality wooden doors for hotels and commercial spaces. Durable teak construction with modern hardware.',
        price: 25000,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'],
        category: 'doors',
        materials: ['teak_wood', 'brass_hardware', 'commercial_grade_finish'],
        dimensions: '210cm x 90cm x 4cm',
        weight: '45kg',
        customizable: true,
        inStock: false,
        craftingTime: '20-25 days'
      },
      {
        id: `${artisan.uid}_product_2`,
        name: 'Restaurant Wooden Furniture Set',
        description: 'Complete dining set for restaurants including tables and chairs. Solid wood construction for commercial use.',
        price: 45000,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop'],
        category: 'furniture',
        materials: ['oak_wood', 'commercial_finish', 'steel_reinforcement'],
        dimensions: 'Table: 120cm x 80cm, Chairs: 45cm x 45cm',
        weight: '80kg (set)',
        customizable: true,
        inStock: false,
        craftingTime: '30-35 days'
      },
      {
        id: `${artisan.uid}_product_3`,
        name: 'Wooden Reception Desk',
        description: 'Elegant wooden reception desk for hotels and offices. Modern design with storage compartments.',
        price: 35000,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop'],
        category: 'furniture',
        materials: ['mahogany_wood', 'modern_hardware', 'laminate_top'],
        dimensions: '180cm x 60cm x 75cm',
        weight: '65kg',
        customizable: true,
        inStock: false,
        craftingTime: '25-30 days'
      }
    ],
    textiles: [
      {
        id: `${artisan.uid}_product_1`,
        name: 'Handwoven Silk Saree',
        description: 'Exquisite handwoven silk saree with traditional patterns, perfect for weddings and special occasions.',
        price: 12000,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop'],
        category: 'clothing',
        materials: ['pure_silk', 'gold_thread', 'handwoven'],
        dimensions: '6 meters length',
        weight: '800g',
        customizable: true,
        inStock: true,
        craftingTime: '25-30 days'
      },
      {
        id: `${artisan.uid}_product_2`,
        name: 'Traditional Cotton Fabric',
        description: 'Hand-spun and handwoven cotton fabric with natural dyes, ideal for clothing and home textiles.',
        price: 450,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop'],
        category: 'fabric',
        materials: ['organic_cotton', 'natural_dyes', 'handwoven'],
        dimensions: '1 meter x 110cm width',
        weight: '200g per meter',
        customizable: true,
        inStock: true,
        craftingTime: '15-20 days'
      },
      {
        id: `${artisan.uid}_product_3`,
        name: 'Handwoven Carpet',
        description: 'Beautiful handwoven carpet with traditional motifs, perfect for home decoration.',
        price: 8500,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=400&h=400&fit=crop'],
        category: 'home_decor',
        materials: ['wool', 'cotton_base', 'natural_dyes'],
        dimensions: '180cm x 120cm',
        weight: '4.5kg',
        customizable: true,
        inStock: true,
        craftingTime: '40-45 days'
      }
    ],
    metalwork: [
      {
        id: `${artisan.uid}_product_1`,
        name: 'Brass Traditional Lamp',
        description: 'Handcrafted brass oil lamp with intricate engravings, perfect for festivals and daily worship.',
        price: 1800,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'],
        category: 'religious_items',
        materials: ['brass', 'hand_engraving'],
        dimensions: '15cm height x 12cm diameter',
        weight: '600g',
        customizable: true,
        inStock: true,
        craftingTime: '8-10 days'
      },
      {
        id: `${artisan.uid}_product_2`,
        name: 'Copper Water Bottle',
        description: 'Pure copper water bottle with health benefits, handcrafted with traditional techniques.',
        price: 1200,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop'],
        category: 'kitchenware',
        materials: ['pure_copper', 'food_grade'],
        dimensions: '25cm height x 8cm diameter',
        weight: '400g',
        customizable: false,
        inStock: true,
        craftingTime: '5-7 days'
      },
      {
        id: `${artisan.uid}_product_3`,
        name: 'Decorative Metal Wall Art',
        description: 'Artistic metal wall hanging with contemporary design and traditional craftsmanship.',
        price: 4200,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop'],
        category: 'wall_art',
        materials: ['iron', 'brass_accents', 'powder_coating'],
        dimensions: '50cm x 35cm',
        weight: '2.1kg',
        customizable: true,
        inStock: true,
        craftingTime: '15-18 days'
      }
    ],
    painting: [
      {
        id: `${artisan.uid}_product_1`,
        name: 'Madhubani Folk Art Painting',
        description: 'Traditional Madhubani painting on handmade paper with natural colors and authentic motifs.',
        price: 2500,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'],
        category: 'wall_art',
        materials: ['handmade_paper', 'natural_pigments', 'traditional_brushes'],
        dimensions: '40cm x 30cm',
        weight: '200g',
        customizable: true,
        inStock: true,
        craftingTime: '10-12 days'
      },
      {
        id: `${artisan.uid}_product_2`,
        name: 'Warli Art Canvas',
        description: 'Authentic Warli tribal art on canvas depicting village life and traditional stories.',
        price: 3800,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop'],
        category: 'canvas_art',
        materials: ['canvas', 'acrylic_colors', 'traditional_motifs'],
        dimensions: '50cm x 40cm',
        weight: '400g',
        customizable: true,
        inStock: true,
        craftingTime: '8-10 days'
      },
      {
        id: `${artisan.uid}_product_3`,
        name: 'Miniature Portrait Painting',
        description: 'Detailed miniature painting in traditional Indian style with fine brushwork and gold accents.',
        price: 6500,
        currency: 'INR',
        images: ['https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop'],
        category: 'portraits',
        materials: ['ivory_paper', 'natural_pigments', 'gold_leaf'],
        dimensions: '20cm x 15cm',
        weight: '100g',
        customizable: true,
        inStock: true,
        craftingTime: '20-25 days'
      }
    ]
  };

  const products = productsByProfession[artisan.artisticProfession] || [];
  const now = new Date();
  return products.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    currency: product.currency,
    images: product.images,
    category: product.category,
    materials: product.materials,
    dimensions: product.dimensions,
    weight: product.weight,
    customizable: product.customizable,
    inStock: product.inStock,
    craftingTime: product.craftingTime,
    artisanId: artisan.uid,
    artisanName: artisan.name,
    artisanLocation: `${artisan.address.city}, ${artisan.address.state}`,
    createdAt: now,
    updatedAt: now,
    tags: [...product.materials, artisan.artisticProfession, 'handmade', 'traditional'],
    rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10, // 3.5-5.0
    reviewCount: Math.floor(Math.random() * 50) + 5, // 5-55 reviews
    featured: Math.random() > 0.7, // 30% chance of being featured
    shippingInfo: {
      freeShipping: product.price > 2000,
      estimatedDays: Math.floor(Math.random() * 5) + 3, // 3-8 days
      shippingCost: product.price > 2000 ? 0 : Math.floor(Math.random() * 200) + 50
    }
  }));
};

// Enhanced seeding function with products
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
      console.log(`✅ Created buyer: ${buyer.name} (${buyer.artisticProfession})`);
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
    
    // Create some sample chat sessions
    console.log('💬 Creating sample chat sessions...');
    const now = new Date();
    const sampleSessions = [
      {
        sessionId: 'session_001',
        participants: [
          {
            id: 'artisan_001',
            role: 'artisan',
            language: 'hi',
            isOnline: true,
            lastSeen: now
          },
          {
            id: 'buyer_001',
            role: 'buyer', 
            language: 'hi',
            isOnline: true,
            lastSeen: now
          }
        ],
        conversationContext: {
          summary: {
            mainTopics: ['pottery', 'water_pot', 'traditional_design'],
            requirements: ['eco-friendly water storage', 'traditional patterns', 'medium size'],
            preferences: ['terracotta material', 'natural cooling', 'decorative elements'],
            agreedTerms: []
          },
          currentSentiment: 'positive',
          dealStatus: 'negotiating',
          dealConfidence: 0.6,
          sharedDesigns: [],
          designPreferences: {
            style: 'traditional',
            colors: ['brown', 'terracotta'],
            materials: ['clay', 'terracotta'],
            size: 'medium'
          }
        },
        status: 'active',
        createdAt: new Date(now.getTime() - 7200000),
        updatedAt: new Date(now.getTime() - 300000)
      },
      {
        sessionId: 'session_002',
        participants: [
          {
            id: 'artisan_002',
            role: 'artisan',
            language: 'en',
            isOnline: true,
            lastSeen: now
          },
          {
            id: 'buyer_002',
            role: 'buyer',
            language: 'en', 
            isOnline: false,
            lastSeen: new Date(now.getTime() - 1800000)
          }
        ],
        conversationContext: {
          summary: {
            mainTopics: ['jewelry', 'wedding', 'kundan_necklace'],
            requirements: ['bridal jewelry set', 'traditional design', 'gold plated'],
            preferences: ['kundan work', 'precious stones', 'matching earrings'],
            agreedTerms: []
          },
          currentSentiment: 'positive',
          dealStatus: 'near_completion',
          dealConfidence: 0.85,
          sharedDesigns: [
            {
              id: 'design_001',
              imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
              prompt: 'Traditional Kundan bridal necklace with precious stones',
              sharedAt: new Date(now.getTime() - 3600000),
              feedback: 'Beautiful design! Can we add matching earrings?'
            }
          ],
          designPreferences: {
            style: 'traditional',
            colors: ['gold', 'red', 'green'],
            materials: ['gold_plated', 'kundan', 'precious_stones']
          },
          orderInProgress: {
            selectedDesign: {
              id: 'design_001',
              imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
              customizations: ['matching_earrings', 'adjustable_length']
            },
            agreedPrice: 18000,
            currency: 'INR',
            deliveryTimeline: '20-25 days',
            specialRequirements: ['gift_wrapping', 'authenticity_certificate']
          }
        },
        status: 'active',
        createdAt: new Date(now.getTime() - 10800000),
        updatedAt: new Date(now.getTime() - 600000)
      }
    ];
    
    for (const session of sampleSessions) {
      await setDoc(doc(db, 'enhanced_chat_sessions', session.sessionId), session);
      console.log(`✅ Created chat session: ${session.sessionId}`);
    }
    
    console.log('🎉 Successfully seeded Firestore with comprehensive test data!');
    console.log('📊 Summary:');
    console.log(`   - Artisans: ${artisans.length}`);
    console.log(`   - Buyers: ${buyers.length}`);
    console.log(`   - Products: ${totalProducts}`);
    console.log(`   - Chat Sessions: ${sampleSessions.length}`);
    console.log(`   - Total documents: ${artisans.length + buyers.length + totalProducts + sampleSessions.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    throw error;
  }
}

// Export the enhanced function
module.exports = { 
  seedFirestoreUsers: seedFirestoreUsersWithProducts,
  seedFirestoreUsersWithProducts 
};

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedFirestoreUsersWithProducts()
    .then(() => {
      console.log('✅ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}