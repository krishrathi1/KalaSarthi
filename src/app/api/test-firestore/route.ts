import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';

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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Firestore connection...');
    
    // Test products query
    const productsQuery = query(
      collection(db, 'products'),
      where('artisanId', '==', 'dev_bulchandani_001'),
      limit(5)
    );
    
    const productsSnapshot = await getDocs(productsQuery);
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Test sales events query
    const salesQuery = query(
      collection(db, 'sales_events'),
      where('artisanId', '==', 'dev_bulchandani_001'),
      limit(5)
    );
    
    const salesSnapshot = await getDocs(salesQuery);
    const salesEvents = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({
      success: true,
      message: 'Firestore connection successful',
      data: {
        products: {
          count: products.length,
          items: products
        },
        salesEvents: {
          count: salesEvents.length,
          items: salesEvents
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Firestore test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Firestore connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}