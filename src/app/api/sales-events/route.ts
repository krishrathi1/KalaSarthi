import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, writeBatch, doc, Timestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { events, batchNumber, totalBatches } = await request.json();

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { success: false, error: 'Invalid events data' },
        { status: 400 }
      );
    }

    console.log(`📝 Processing batch ${batchNumber}/${totalBatches} with ${events.length} events`);

    // Use batch write for better performance
    const batch = writeBatch(db);
    const salesEventsRef = collection(db, 'sales_events');

    events.forEach((event) => {
      // Convert ISO string back to Firestore Timestamp
      const eventData = {
        ...event,
        eventTimestamp: Timestamp.fromDate(new Date(event.eventTimestamp)),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = doc(salesEventsRef, event.eventId);
      batch.set(docRef, eventData);
    });

    // Commit the batch
    await batch.commit();

    console.log(`✅ Batch ${batchNumber}/${totalBatches} written to Firestore successfully`);

    return NextResponse.json({
      success: true,
      message: `Batch ${batchNumber}/${totalBatches} processed successfully`,
      eventsProcessed: events.length,
      batchNumber,
      totalBatches
    });

  } catch (error) {
    console.error('❌ Error processing sales events batch:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process sales events batch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId') || 'dev_bulchandani_001';
    const limitCount = parseInt(searchParams.get('limit') || '50');

    // Query Firestore for sales events
    const salesEventsRef = collection(db, 'sales_events');
    const q = query(
      salesEventsRef,
      where('artisanId', '==', artisanId),
      orderBy('eventTimestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const salesEvents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Fetched ${salesEvents.length} sales events for artisan ${artisanId}`);

    return NextResponse.json({
      success: true,
      data: salesEvents,
      count: salesEvents.length,
      artisanId,
      limit
    });

  } catch (error) {
    console.error('❌ Error fetching sales events:', error);
    
    // Return empty array as fallback to prevent map errors
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: true
    });
  }
}