import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();

// Helper function to verify if admin is initialized
export function isAdminInitialized(): boolean {
  return admin.apps.length > 0;
}

// Helper to get server timestamp
export const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

// Helper to increment/decrement
export const increment = (value: number) => admin.firestore.FieldValue.increment(value);

// Helper for array operations
export const arrayUnion = (...elements: any[]) => admin.firestore.FieldValue.arrayUnion(...elements);
export const arrayRemove = (...elements: any[]) => admin.firestore.FieldValue.arrayRemove(...elements);

export default admin;
