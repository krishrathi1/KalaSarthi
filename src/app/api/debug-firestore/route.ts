import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging Firestore data...');

    // Check sales_events collection
    const salesEventsRef = collection(db, 'sales_events');
    const salesQuery = query(salesEventsRef, limit(10));
    const salesSnapshot = await getDocs(salesQuery);
    
    const salesEvents = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Found ${salesSnapshot.size} sales events in Firestore`);

    // Check monthly_summaries collection
    const summariesRef = collection(db, 'monthly_summaries');
    const summariesSnapshot = await getDocs(summariesRef);
    
    const summaries = summariesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📋 Found ${summariesSnapshot.size} monthly summaries in Firestore`);

    return NextResponse.json({
      success: true,
      data: {
        salesEvents: {
          count: salesSnapshot.size,
          sample: salesEvents.slice(0, 3) // Show first 3 events
        },
        monthlySummaries: {
          count: summariesSnapshot.size,
          data: summaries
        }
      },
      message: `Found ${salesSnapshot.size} sales events and ${summariesSnapshot.size} summaries`
    });

  } catch (error) {
    console.error('❌ Error debugging Firestore:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to debug Firestore data'
    }, { status: 500 });
  }
}