import { NextRequest, NextResponse } from 'next/server';
import { EnhancedDigitalKhataService } from '@/lib/services/EnhancedDigitalKhataService';
import { RedisCacheService } from '@/lib/services/RedisCacheService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId') || 'dev_bulchandani_001';
    const mode = searchParams.get('mode') || 'realtime'; // 'realtime' or 'offline'
    const forceRefresh = searchParams.get('refresh') === 'true';

    console.log(`📊 Dashboard API called - Mode: ${mode}, ArtisanId: ${artisanId}, ForceRefresh: ${forceRefresh}`);

    const cacheService = RedisCacheService.getInstance();
    
    // Try to connect to Redis (non-blocking)
    try {
      await cacheService.connect();
    } catch (error) {
      console.warn('Redis connection failed, continuing without cache:', error);
    }

    let dashboardData = null;
    let dataSource = 'unknown';

    // In offline mode or when real-time fails, try cache first
    if (mode === 'offline' || !forceRefresh) {
      const cachedData = await cacheService.getCachedDashboardData(artisanId);
      if (cachedData) {
        dashboardData = cachedData.dashboardData;
        dataSource = 'cache';
        console.log(`✅ Using cached data (age: ${Date.now() - cachedData.timestamp}ms)`);
      }
    }

    // If no cached data or in real-time mode, fetch fresh data
    if (!dashboardData || mode === 'realtime' || forceRefresh) {
      try {
        console.log('🔄 Fetching fresh dashboard data...');
        
        // Fetch sales events directly from Firestore
        const { db } = await import('@/lib/firebase');
        const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
        
        const salesEventsRef = collection(db, 'sales_events');
        const q = query(
          salesEventsRef,
          where('artisanId', '==', artisanId),
          orderBy('eventTimestamp', 'desc'),
          limit(50)
        );

        const querySnapshot = await getDocs(q);
        const salesEvents = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (salesEvents.length > 0) {
          // Process the sales data
          const events = salesEvents.map((event: any) => ({
            ...event,
            eventTimestamp: event.eventTimestamp?.toDate ? event.eventTimestamp.toDate() : new Date(event.eventTimestamp),
            createdAt: event.createdAt?.toDate ? event.createdAt.toDate() : new Date(event.createdAt),
            updatedAt: event.updatedAt?.toDate ? event.updatedAt.toDate() : new Date(event.updatedAt)
          }));

          // Calculate current sales periods
          const now = new Date();
          const today = {
            start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
          };
          const thisWeek = {
            start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()),
            end: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 6, 23, 59, 59)
          };
          const thisMonth = {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
          };
          const thisYear = {
            start: new Date(now.getFullYear(), 0, 1),
            end: new Date(now.getFullYear(), 11, 31, 23, 59, 59)
          };

          // Calculate sales for each period
          const calculateSalesForPeriod = (events: any[], startDate: Date, endDate: Date): number => {
            return events
              .filter(event => {
                const eventDate = new Date(event.eventTimestamp);
                return eventDate >= startDate && 
                       eventDate <= endDate &&
                       (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled');
              })
              .reduce((total, event) => total + event.totalAmount, 0);
          };

          const currentSales = {
            today: calculateSalesForPeriod(events, today.start, today.end),
            thisWeek: calculateSalesForPeriod(events, thisWeek.start, thisWeek.end),
            thisMonth: calculateSalesForPeriod(events, thisMonth.start, thisMonth.end),
            thisYear: calculateSalesForPeriod(events, thisYear.start, thisYear.end)
          };

          // Generate aggregates (simplified)
          const aggregates = {
            daily: [],
            weekly: [],
            monthly: [],
            yearly: []
          };

          dashboardData = {
            currentSales,
            recentEvents: events.slice(0, 20),
            aggregates,
            connectionState: 'online',
            lastUpdated: new Date(),
            totalEvents: events.length,
            dataSource: 'realtime'
          };

          dataSource = 'realtime';
          console.log(`✅ Fresh data fetched - ${events.length} events, ₹${currentSales.thisYear} total revenue`);

          // Cache the fresh data
          await cacheService.cacheDashboardData(artisanId, dashboardData);

        } else {
          throw new Error('No sales data available from API');
        }

      } catch (error) {
        console.error('❌ Failed to fetch real-time data:', error);
        
        // Fallback to cache if real-time fails
        if (!dashboardData) {
          const cachedData = await cacheService.getCachedDashboardData(artisanId);
          if (cachedData) {
            dashboardData = cachedData.dashboardData;
            dataSource = 'cache_fallback';
            console.log('⚠️ Using cached data as fallback');
          } else {
            // Last resort: return empty data structure
            dashboardData = {
              currentSales: { today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 },
              recentEvents: [],
              aggregates: { daily: [], weekly: [], monthly: [], yearly: [] },
              connectionState: 'offline',
              lastUpdated: new Date(),
              totalEvents: 0,
              dataSource: 'empty'
            };
            dataSource = 'empty';
            console.log('⚠️ No data available, returning empty structure');
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
      metadata: {
        artisanId,
        mode,
        dataSource,
        timestamp: new Date().toISOString(),
        cacheAvailable: cacheService.isRedisConnected()
      }
    });

  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}