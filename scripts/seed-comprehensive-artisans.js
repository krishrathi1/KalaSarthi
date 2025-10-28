/**
 * Comprehensive Artisan Seeding Script
 * Creates 10 artisans for each profession with Indian photos
 */

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Indian artisan photos (diverse, professional)
const indianPhotos = {
  male: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150&h=150&fit=crop&crop=face'
  ],
  female: [
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1567532900872-f4e906cbf06a?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1596815064285-45ed8a9c0463?w=150&h=150&fit=crop&crop=face'
  ]
};

// Comprehensive artisan data by profession
const artisansByProfession = {
  pottery: [
    { name: 'Rajesh Kumar', gender: 'male', city: 'Jaipur', state: 'Rajasthan', description: 'Master potter with 25+ years experience in traditional Rajasthani pottery and blue pottery' },
    { name: 'Meera Devi', gender: 'female', city: 'Khurja', state: 'Uttar Pradesh', description: 'Expert in Khurja pottery and ceramic glazing techniques' },
    { name: 'Kiran Joshi', gender: 'male', city: 'Pune', state: 'Maharashtra', description: 'Contemporary ceramic artist specializing in functional pottery' },
    { name: 'Sunita Sharma', gender: 'female', city: 'Bikaner', state: 'Rajasthan', description: 'Traditional terracotta and clay work specialist' },
    { name: 'Ramesh Patel', gender: 'male', city: 'Ahmedabad', state: 'Gujarat', description: 'Innovative potter creating modern designs with traditional techniques' },
    { name: 'Kavita Singh', gender: 'female', city: 'Varanasi', state: 'Uttar Pradesh', description: 'Sacred pottery and ritual ceramic items creator' },
    { name: 'Deepak Gupta', gender: 'male', city: 'Delhi', state: 'Delhi', description: 'Urban pottery studio owner specializing in home decor ceramics' },
    { name: 'Priya Agarwal', gender: 'female', city: 'Jodhpur', state: 'Rajasthan', description: 'Blue pottery and decorative ceramic specialist' },
    { name: 'Suresh Yadav', gender: 'male', city: 'Lucknow', state: 'Uttar Pradesh', description: 'Traditional clay pot maker and water storage specialist' },
    { name: 'Anita Kumari', gender: 'female', city: 'Kolkata', state: 'West Bengal', description: 'Bengal pottery and Durga idol creation expert' }
  ],
  
  woodwork: [
    { name: 'Amit Kumar', gender: 'male', city: 'Saharanpur', state: 'Uttar Pradesh', description: 'Master wood carver specializing in intricate furniture and doors' },
    { name: 'Lakshmi Devi', gender: 'female', city: 'Mysore', state: 'Karnataka', description: 'Sandalwood carving expert and traditional sculpture artist' },
    { name: 'Ravi Singh', gender: 'male', city: 'Jodhpur', state: 'Rajasthan', description: 'Antique furniture restoration and custom woodwork specialist' },
    { name: 'Kavita Reddy', gender: 'female', city: 'Bangalore', state: 'Karnataka', description: 'Modern furniture designer with traditional woodworking skills' },
    { name: 'Manoj Sharma', gender: 'male', city: 'Hoshiarpur', state: 'Punjab', description: 'Sheesham wood furniture and decorative items craftsman' },
    { name: 'Geeta Nair', gender: 'female', city: 'Kochi', state: 'Kerala', description: 'Traditional Kerala woodwork and boat building expert' },
    { name: 'Vinod Jain', gender: 'male', city: 'Udaipur', state: 'Rajasthan', description: 'Palace furniture and royal woodwork restoration specialist' },
    { name: 'Sushma Devi', gender: 'female', city: 'Chandigarh', state: 'Punjab', description: 'Contemporary wood art and sculpture creator' },
    { name: 'Prakash Rao', gender: 'male', city: 'Mangalore', state: 'Karnataka', description: 'Coastal woodwork and traditional door carving expert' },
    { name: 'Rekha Gupta', gender: 'female', city: 'Agra', state: 'Uttar Pradesh', description: 'Inlay woodwork and Mughal-style furniture specialist' }
  ],
  
  jewelry: [
    { name: 'Priya Sharma', gender: 'female', city: 'Jaipur', state: 'Rajasthan', description: 'Kundan and Meenakari jewelry expert with royal heritage' },
    { name: 'Suresh Soni', gender: 'male', city: 'Mumbai', state: 'Maharashtra', description: 'Contemporary gold and diamond jewelry designer' },
    { name: 'Meera Agarwal', gender: 'female', city: 'Kolkata', state: 'West Bengal', description: 'Traditional Bengali gold jewelry and filigree work specialist' },
    { name: 'Rohit Jeweller', gender: 'male', city: 'Delhi', state: 'Delhi', description: 'Bridal jewelry and custom design expert' },
    { name: 'Nisha Patel', gender: 'female', city: 'Surat', state: 'Gujarat', description: 'Diamond cutting and precious stone setting specialist' },
    { name: 'Karan Singh', gender: 'male', city: 'Amritsar', state: 'Punjab', description: 'Traditional Punjabi jewelry and Sikh ceremonial items creator' },
    { name: 'Deepika Rao', gender: 'female', city: 'Hyderabad', state: 'Telangana', description: 'South Indian temple jewelry and antique reproduction expert' },
    { name: 'Vikram Joshi', gender: 'male', city: 'Pune', state: 'Maharashtra', description: 'Silver jewelry and oxidized ornament specialist' },
    { name: 'Anjali Gupta', gender: 'female', city: 'Lucknow', state: 'Uttar Pradesh', description: 'Chikankari-inspired jewelry and delicate goldwork artist' },
    { name: 'Arjun Malhotra', gender: 'male', city: 'Chandigarh', state: 'Punjab', description: 'Modern fusion jewelry combining traditional and contemporary styles' }
  ],
  
  textiles: [
    { name: 'Maya Devi', gender: 'female', city: 'Varanasi', state: 'Uttar Pradesh', description: 'Master weaver of Banarasi silk sarees and brocades' },
    { name: 'Amit Verma', gender: 'male', city: 'Bhuj', state: 'Gujarat', description: 'Kutch embroidery and mirror work textile specialist' },
    { name: 'Deepak Gupta', gender: 'male', city: 'Chanderi', state: 'Madhya Pradesh', description: 'Chanderi silk and cotton weaving expert' },
    { name: 'Sunita Kumari', gender: 'female', city: 'Kanchipuram', state: 'Tamil Nadu', description: 'Traditional Kanjeevaram silk saree weaver' },
    { name: 'Rajesh Handloom', gender: 'male', city: 'Pochampally', state: 'Telangana', description: 'Ikat weaving and geometric pattern specialist' },
    { name: 'Geeta Sharma', gender: 'female', city: 'Jaipur', state: 'Rajasthan', description: 'Block printing and natural dye textile expert' },
    { name: 'Mohan Weaver', gender: 'male', city: 'Salem', state: 'Tamil Nadu', description: 'Cotton handloom and traditional South Indian textiles' },
    { name: 'Kamala Devi', gender: 'female', city: 'Imphal', state: 'Manipur', description: 'Traditional Manipuri textile and Phanek weaving specialist' },
    { name: 'Suresh Dyer', gender: 'male', city: 'Sanganer', state: 'Rajasthan', description: 'Natural indigo dyeing and traditional printing techniques' },
    { name: 'Lata Weaver', gender: 'female', city: 'Maheshwar', state: 'Madhya Pradesh', description: 'Maheshwari silk and cotton saree weaving expert' }
  ],
  
  metalwork: [
    { name: 'Ravi Patel', gender: 'male', city: 'Moradabad', state: 'Uttar Pradesh', description: 'Brass and copper metalwork specialist, traditional utensils expert' },
    { name: 'Kamala Singh', gender: 'female', city: 'Jaipur', state: 'Rajasthan', description: 'Silver metalwork and decorative items craftsperson' },
    { name: 'Suresh Lohar', gender: 'male', city: 'Jodhpur', state: 'Rajasthan', description: 'Iron and steel work, traditional weapons and tools maker' },
    { name: 'Meera Metalcraft', gender: 'female', city: 'Thanjavur', state: 'Tamil Nadu', description: 'Bronze casting and traditional South Indian metal sculptures' },
    { name: 'Prakash Kumar', gender: 'male', city: 'Aligarh', state: 'Uttar Pradesh', description: 'Lock making and precision metal work specialist' },
    { name: 'Sunita Brass', gender: 'female', city: 'Hathras', state: 'Uttar Pradesh', description: 'Brass jewelry and decorative metalwork artist' },
    { name: 'Deepak Ironwork', gender: 'male', city: 'Ludhiana', state: 'Punjab', description: 'Agricultural tools and modern metal fabrication expert' },
    { name: 'Kavita Metal', gender: 'female', city: 'Nashik', state: 'Maharashtra', description: 'Warli-inspired metal art and contemporary designs' },
    { name: 'Rajesh Coppersmith', gender: 'male', city: 'Almora', state: 'Uttarakhand', description: 'Traditional copper vessels and Himalayan metalwork' },
    { name: 'Anita Silverwork', gender: 'female', city: 'Cuttack', state: 'Odisha', description: 'Filigree silver work and traditional Odishan metal art' }
  ],
  
  painting: [
    { name: 'Sunita Singh', gender: 'female', city: 'Madhubani', state: 'Bihar', description: 'Traditional Madhubani painting and folk art specialist' },
    { name: 'Ramesh Artist', gender: 'male', city: 'Udaipur', state: 'Rajasthan', description: 'Miniature painting and Rajasthani art expert' },
    { name: 'Geeta Painter', gender: 'female', city: 'Mysore', state: 'Karnataka', description: 'Mysore painting and traditional South Indian art forms' },
    { name: 'Suresh Muralist', gender: 'male', city: 'Kochi', state: 'Kerala', description: 'Kerala mural painting and temple art specialist' },
    { name: 'Meera Canvas', gender: 'female', city: 'Kolkata', state: 'West Bengal', description: 'Contemporary Indian art and traditional Bengali painting' },
    { name: 'Prakash Warli', gender: 'male', city: 'Mumbai', state: 'Maharashtra', description: 'Warli tribal art and folk painting expert' },
    { name: 'Kavita Tanjore', gender: 'female', city: 'Thanjavur', state: 'Tamil Nadu', description: 'Tanjore painting with gold leaf and precious stones' },
    { name: 'Deepak Pattachitra', gender: 'male', city: 'Puri', state: 'Odisha', description: 'Traditional Pattachitra scroll painting artist' },
    { name: 'Sushma Phad', gender: 'female', city: 'Bhilwara', state: 'Rajasthan', description: 'Phad painting and narrative scroll art specialist' },
    { name: 'Vinod Kalamkari', gender: 'male', city: 'Machilipatnam', state: 'Andhra Pradesh', description: 'Kalamkari hand-painted textile and art expert' }
  ]
};

// Enhanced artisan profile generator
function createArtisanProfile(artisanData, profession, index) {
  const uid = `${profession}_artisan_${String(index + 1).padStart(3, '0')}`;
  const photos = artisanData.gender === 'male' ? indianPhotos.male : indianPhotos.female;
  const photoIndex = index % photos.length;
  
  return {
    uid,
    email: `${artisanData.name.toLowerCase().replace(/\s+/g, '.')}.${profession}@example.com`,
    name: artisanData.name,
    displayName: artisanData.name,
    phone: `+91-${9000000000 + Math.floor(Math.random() * 999999999)}`,
    role: 'artisan',
    artisticProfession: profession,
    description: artisanData.description,
    profileImage: photos[photoIndex],
    address: {
      street: `${profession.charAt(0).toUpperCase() + profession.slice(1)} Street, Artisan Colony`,
      city: artisanData.city,
      state: artisanData.state,
      zipCode: `${Math.floor(Math.random() * 900000) + 100000}`,
      country: 'India'
    },
    artisanConnectProfile: {
      matchingData: {
        skills: generateSkills(profession),
        materials: generateMaterials(profession),
        techniques: generateTechniques(profession),
        experienceLevel: ['beginner', 'intermediate', 'expert', 'master'][Math.floor(Math.random() * 4)],
        portfolioKeywords: generatePortfolioKeywords(profession),
        categoryTags: [profession, 'handmade', 'traditional', 'indian']
      },
      specializations: generateSpecializations(profession),
      performanceMetrics: {
        customerSatisfaction: 3.5 + Math.random() * 1.5, // 3.5-5.0
        completionRate: 0.7 + Math.random() * 0.3, // 0.7-1.0
        responseTime: Math.floor(Math.random() * 24) + 1, // 1-24 hours
        totalOrders: Math.floor(Math.random() * 200) + 10, // 10-210
        repeatCustomerRate: 0.3 + Math.random() * 0.5 // 0.3-0.8
      },
      availabilityStatus: ['available', 'busy', 'available'][Math.floor(Math.random() * 3)],
      locationData: {
        address: {
          city: artisanData.city,
          state: artisanData.state,
          country: 'India'
        },
        serviceAreas: [artisanData.city, artisanData.state, 'India']
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Skill generators for each profession
function generateSkills(profession) {
  const skillSets = {
    pottery: ['wheel throwing', 'hand building', 'glazing', 'kiln firing', 'ceramic painting', 'clay preparation'],
    woodwork: ['wood carving', 'joinery', 'furniture making', 'door crafting', 'wood finishing', 'inlay work'],
    jewelry: ['metal casting', 'stone setting', 'wire work', 'engraving', 'polishing', 'design sketching'],
    textiles: ['handloom weaving', 'dyeing', 'block printing', 'embroidery', 'spinning', 'pattern design'],
    metalwork: ['forging', 'casting', 'engraving', 'welding', 'polishing', 'tool making'],
    painting: ['brush work', 'color mixing', 'canvas preparation', 'traditional techniques', 'gold leafing', 'mural painting']
  };
  return skillSets[profession] || [];
}

function generateMaterials(profession) {
  const materialSets = {
    pottery: ['clay', 'terracotta', 'ceramic', 'glaze', 'porcelain'],
    woodwork: ['teak', 'rosewood', 'sandalwood', 'oak', 'bamboo'],
    jewelry: ['gold', 'silver', 'copper', 'gemstones', 'pearls'],
    textiles: ['silk', 'cotton', 'wool', 'natural dyes', 'metallic threads'],
    metalwork: ['brass', 'copper', 'iron', 'steel', 'bronze'],
    painting: ['natural pigments', 'canvas', 'paper', 'gold leaf', 'brushes']
  };
  return materialSets[profession] || [];
}

function generateTechniques(profession) {
  const techniqueSets = {
    pottery: ['wheel throwing', 'coil building', 'slab construction', 'glazing', 'raku firing'],
    woodwork: ['hand carving', 'machine cutting', 'joinery', 'inlay', 'lacquering'],
    jewelry: ['lost wax casting', 'hammering', 'filigree', 'granulation', 'repoussé'],
    textiles: ['handloom weaving', 'block printing', 'tie-dye', 'embroidery', 'appliqué'],
    metalwork: ['forging', 'casting', 'chasing', 'repoussé', 'patination'],
    painting: ['brush painting', 'finger painting', 'gold leafing', 'natural dyeing', 'fresco']
  };
  return techniqueSets[profession] || [];
}

function generatePortfolioKeywords(profession) {
  const keywordSets = {
    pottery: ['bowls', 'vases', 'plates', 'decorative', 'functional', 'traditional'],
    woodwork: ['furniture', 'doors', 'sculptures', 'decorative', 'custom', 'handcrafted'],
    jewelry: ['necklaces', 'earrings', 'bracelets', 'rings', 'traditional', 'contemporary'],
    textiles: ['sarees', 'fabrics', 'carpets', 'clothing', 'home textiles', 'traditional'],
    metalwork: ['utensils', 'decorative', 'sculptures', 'tools', 'traditional', 'functional'],
    painting: ['portraits', 'landscapes', 'traditional', 'folk art', 'murals', 'decorative']
  };
  return keywordSets[profession] || [];
}

function generateSpecializations(profession) {
  const specializationSets = {
    pottery: ['blue pottery', 'terracotta work', 'ceramic glazing'],
    woodwork: ['furniture making', 'door carving', 'inlay work'],
    jewelry: ['bridal jewelry', 'traditional designs', 'contemporary pieces'],
    textiles: ['silk weaving', 'block printing', 'natural dyeing'],
    metalwork: ['brass work', 'copper crafting', 'decorative items'],
    painting: ['folk art', 'traditional painting', 'contemporary art']
  };
  return specializationSets[profession] || [];
}

// Main seeding function
async function seedComprehensiveArtisans() {
  console.log('🌱 Starting comprehensive artisan seeding...');
  
  let totalCreated = 0;
  
  for (const [profession, artisans] of Object.entries(artisansByProfession)) {
    console.log(`\n📝 Creating ${profession} artisans...`);
    
    for (let i = 0; i < artisans.length; i++) {
      const artisanProfile = createArtisanProfile(artisans[i], profession, i);
      
      try {
        await setDoc(doc(db, 'users', artisanProfile.uid), artisanProfile);
        console.log(`✅ Created ${artisanProfile.name} (${profession}) from ${artisanProfile.address.city}`);
        totalCreated++;
      } catch (error) {
        console.error(`❌ Failed to create ${artisanProfile.name}:`, error.message);
      }
    }
  }
  
  console.log(`\n🎉 Successfully created ${totalCreated} artisans across ${Object.keys(artisansByProfession).length} professions!`);
  console.log('📊 Summary:');
  Object.keys(artisansByProfession).forEach(profession => {
    console.log(`   - ${profession}: 10 artisans`);
  });
}

// Run the seeding
seedComprehensiveArtisans()
  .then(() => {
    console.log('🎉 Comprehensive artisan seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });