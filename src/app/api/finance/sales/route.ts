import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const resolution = searchParams.get('resolution') || 'daily';
    const artisanId = searchParams.get('artisanId') || 'dev_bulchandani_001';

    console.log(`📊 Fetching sales data - Range: ${range}, Resolution: ${resolution}, Artisan: ${artisanId}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Query Firestore for sales events
    const salesEventsRef = collection(db, 'sales_events');
    const q = query(
      salesEventsRef,
      where('artisanId', '==', artisanId),
      where('eventTimestamp', '>=', Timestamp.fromDate(startDate)),
      where('eventTimestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('eventTimestamp', 'desc'),
      limit(1000)
    );

    const querySnapshot = await getDocs(q);
    const salesEvents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      eventTimestamp: doc.data().eventTimestamp.toDate()
    }));

    console.log(`📈 Found ${salesEvents.length} sales events`);

    // Aggregate data by resolution
    const aggregatedData = aggregateSalesData(salesEvents, resolution);
    
    // Calculate summary
    const totalRevenue = salesEvents.reduce((sum, event) => sum + (event.totalAmount || 0), 0);
    const totalOrders = salesEvents.length;
    const totalUnits = salesEvents.reduce((sum, event) => sum + (event.quantity || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate growth rate (simplified - compare with previous period)
    const previousPeriodStart = new Date(startDate);
    const previousPeriodEnd = new Date(startDate);
    const periodDuration = endDate.getTime() - startDate.getTime();
    previousPeriodStart.setTime(startDate.getTime() - periodDuration);

    const previousQuery = query(
      salesEventsRef,
      where('artisanId', '==', artisanId),
      where('eventTimestamp', '>=', Timestamp.fromDate(previousPeriodStart)),
      where('eventTimestamp', '<', Timestamp.fromDate(previousPeriodEnd)),
      orderBy('eventTimestamp', 'desc')
    );

    const previousSnapshot = await getDocs(previousQuery);
    const previousRevenue = previousSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().totalAmount || 0);
    }, 0);

    const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const summary = {
      totalRevenue,
      totalOrders,
      totalUnits,
      averageOrderValue,
      growthRate
    };

    console.log(`💰 Summary - Revenue: ₹${totalRevenue.toLocaleString('en-IN')}, Orders: ${totalOrders}, Growth: ${growthRate.toFixed(1)}%`);

    return NextResponse.json({
      success: true,
      data: aggregatedData,
      summary,
      metadata: {
        range,
        resolution,
        artisanId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalEvents: salesEvents.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sales data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch sales data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function aggregateSalesData(salesEvents: any[], resolution: string) {
  const aggregated = new Map();

  salesEvents.forEach(event => {
    const date = new Date(event.eventTimestamp);
    let periodKey: string;

    switch (resolution) {
      case 'daily':
        periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        periodKey = date.toISOString().split('T')[0];
    }

    if (!aggregated.has(periodKey)) {
      aggregated.set(periodKey, {
        periodKey,
        revenue: 0,
        units: 0,
        orders: 0,
        averageOrderValue: 0,
        averageUnitPrice: 0
      });
    }

    const period = aggregated.get(periodKey);
    period.revenue += event.totalAmount || 0;
    period.units += event.quantity || 0;
    period.orders += 1;
  });

  // Calculate averages
  aggregated.forEach(period => {
    period.averageOrderValue = period.orders > 0 ? period.revenue / period.orders : 0;
    period.averageUnitPrice = period.units > 0 ? period.revenue / period.units : 0;
  });

  // Convert to array and sort by period
  return Array.from(aggregated.values()).sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}