/**
 * Simple script to run the Firestore seeding
 * Loads environment variables and executes the seeding function
 */

require('dotenv').config();
const { seedFirestoreUsers } = require('./seed-firestore-users-fixed');

console.log('🚀 Starting Firestore seeding process...');
console.log('📋 Environment check:');
console.log(`   - Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅' : '❌'}`);
console.log(`   - API Key: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅' : '❌'}`);
console.log(`   - Auth Domain: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅' : '❌'}`);

if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.error('❌ Missing required Firebase environment variables!');
  console.error('Please check your .env file and ensure all Firebase config variables are set.');
  process.exit(1);
}

seedFirestoreUsers()
  .then(() => {
    console.log('🎉 All done! Your Firestore database now has test users for enhanced chat testing.');
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error.message);
    process.exit(1);
  });