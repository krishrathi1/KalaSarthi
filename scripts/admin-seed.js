/**
 * Admin SDK seeding script for Firestore
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('../key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

// Simple artisan data
const artisans = [
  {
    uid: 'artisan_001',
    email: 'rajesh.pottery@example.com',
    name: 'Rajesh Kumar',
    phone: '+91-9876543210',
    role: 'artisan',
    artisticProfession: 'pottery',
    description: 'Master potter with 20+ years experience in traditional Indian pottery'
  },
  {
    uid: 'artisan_002',
    email: 'priya.jewelry@example.com',
    name: 'Priya Sharma',
    phone: '+91-9876543211',
    role: 'artisan',
    artisticProfession: 'jewelry',
    description: 'Traditional jewelry maker specializing in Kundan and Meenakari work'
  },
  {
    uid: 'artisan_003',
    email: 'amit.woodwork@example.com',
    name: 'Amit Kumar',
    phone: '+91-9876543212',
    role: 'artisan',
    artisticProfession: 'woodworking',
    description: 'Master carpenter specializing in custom wooden doors, furniture, and commercial woodwork for hotels and restaurants'
  },
  {
    uid: 'artisan_004',
    email: 'ravi.carpenter@example.com',
    name: 'Ravi Singh',
    phone: '+91-9876543213',
    role: 'artisan',
    artisticProfession: 'woodworking',
    description: 'Expert in traditional and modern woodworking, specializing in hotel furniture and commercial doors with traditional Indian carving'
  },
  {
    uid: 'artisan_005',
    email: 'maya.textiles@example.com',
    name: 'Maya Devi',
    phone: '+91-9876543214',
    role: 'artisan',
    artisticProfession: 'textiles',
    description: 'Traditional weaver specializing in handwoven sarees, fabrics, and textile art'
  }
];

async function seedWithAdmin() {
  console.log('🌱 Starting Admin SDK seeding...');
  
  try {
    const batch = db.batch();
    
    for (const artisan of artisans) {
      const docRef = db.collection('users').doc(artisan.uid);
      const data = {
        uid: artisan.uid,
        email: artisan.email,
        name: artisan.name,
        phone: artisan.phone,
        role: artisan.role,
        artisticProfession: artisan.artisticProfession,
        description: artisan.description,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      batch.set(docRef, data);
      console.log(`📝 Prepared: ${artisan.name} (${artisan.artisticProfession})`);
    }
    
    await batch.commit();
    console.log('✅ Batch write completed successfully!');
    
    console.log('🎉 Successfully seeded Firestore with Admin SDK!');
    console.log('📊 Summary:');
    console.log(`   - Artisans: ${artisans.length}`);
    console.log(`   - Woodworking artisans: ${artisans.filter(a => a.artisticProfession === 'woodworking').length}`);
    
  } catch (error) {
    console.error('❌ Error seeding with Admin SDK:', error);
    throw error;
  }
}

// Run the seeding
if (require.main === module) {
  seedWithAdmin()
    .then(() => {
      console.log('✅ Admin seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedWithAdmin };