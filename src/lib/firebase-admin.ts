// Firebase Admin SDK initialization for server-side operations

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  try {
    // Try to initialize with service account key from environment
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccount) {
      // Parse the service account key from environment variable
      const serviceAccountKey = JSON.parse(serviceAccount);
      
      initializeApp({
        credential: cert(serviceAccountKey),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log('Firebase Admin initialized with service account');
    } else {
      // Fallback: Initialize with default credentials (for development)
      // This will work if running on Google Cloud or with GOOGLE_APPLICATION_CREDENTIALS
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kala-sarthi-dev';
      
      initializeApp({
        projectId: projectId,
      });
      console.log('Firebase Admin initialized with default credentials for project:', projectId);
    }
    
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    
    // For development, create a minimal initialization without credentials
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using development Firebase Admin setup without authentication');
      try {
        initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kala-sarthi-dev',
        });
        console.log('Firebase Admin initialized in development mode');
      } catch (devError) {
        console.error('Failed to initialize Firebase Admin in development:', devError);
        // Create a mock auth for development
        console.warn('Firebase Admin will not work properly without proper initialization');
      }
    }
  }
}

// Export the auth instance with error handling
let adminAuth: any;

try {
  adminAuth = getAuth();
} catch (error) {
  console.error('Failed to get Firebase Admin Auth:', error);
  // Create a mock auth for development
  adminAuth = {
    verifyIdToken: async (token: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using mock Firebase Admin Auth in development');
        // Return a mock decoded token for development
        return {
          uid: 'dev-user-' + Math.random().toString(36).substr(2, 9),
          email: 'dev@example.com'
        };
      }
      throw new Error('Firebase Admin Auth not properly initialized');
    }
  };
}

export { adminAuth };
export default adminAuth;