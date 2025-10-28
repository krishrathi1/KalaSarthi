// Check all artisans in database
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function checkAllArtisans() {
  console.log('🔍 Checking all artisans by profession...');
  
  const professions = ['pottery', 'woodwork', 'jewelry', 'textiles', 'metalwork', 'painting'];
  
  for (const profession of professions) {
    console.log(`\n📝 ${profession.toUpperCase()} artisans:`);
    
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'artisan'),
        where('artisticProfession', '==', profession)
      );
      
      const snapshot = await getDocs(q);
      console.log(`📊 Found ${snapshot.size} ${profession} artisans`);
      
      snapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ${data.name} - ${data.address?.city || 'Unknown city'}`);
      });
      
    } catch (error) {
      console.error(`❌ Error querying ${profession}:`, error.message);
    }
  }
}

checkAllArtisans();