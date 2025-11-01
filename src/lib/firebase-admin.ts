import admin from 'firebase-admin';

// Lazy initialization function
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return; // Already initialized
  }

  // Skip initialization during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('⏭️  Skipping Firebase Admin initialization during build');
    return;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('⚠️  Firebase Admin credentials not configured');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
  }
}

// Getter functions that initialize on first access
export function getAdminDb() {
  initializeFirebaseAdmin();
  return admin.firestore();
}

export function getAdminAuth() {
  initializeFirebaseAdmin();
  return admin.auth();
}

export function getAdminStorage() {
  initializeFirebaseAdmin();
  return admin.storage();
}

// Legacy exports for backward compatibility (will initialize on access)
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(target, prop) {
    return getAdminDb()[prop as keyof admin.firestore.Firestore];
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(target, prop) {
    return getAdminAuth()[prop as keyof admin.auth.Auth];
  }
});

export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(target, prop) {
    return getAdminStorage()[prop as keyof admin.storage.Storage];
  }
});

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
