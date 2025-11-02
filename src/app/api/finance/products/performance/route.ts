import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const sort = searchParams.get('sort') || 'best'; // 'best' or 'worst'
    const limitCount = parseInt(searchParams.get('limit') || '10');
    const artisanId = searchParams.get('artisanId') || 'dev_bulchandani_001';

    console.log(`📊 Fetching product performance - Range: ${range}, Sort: ${sort}, Limit: ${limitCount}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (range) {
      case 'week':
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'quarter':
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'year':
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
      orderBy('eventTimestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const salesEvents = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        eventTimestamp: data.eventTimestamp?.toDate ? data.eventTimestamp.toDate() : new Date()
      };
    });

    console.log(`📈 Found ${salesEvents.length} sales events for product analysis`);

    // Aggregate by product
    const productPerformance = new Map();

    salesEvents.forEach(event => {
      const productId = (event as any).productId;
      const productName = (event as any).productName;
      const category = (event as any).category;

      if (!productPerformance.has(productId)) {
        productPerformance.set(productId, {
          productId,
          productName,
          category,
          revenue: 0,
          units: 0,
          orders: 0,
          totalCost: 0,
          totalProfit: 0,
          marginPercentage: 0
        });
      }

      const product = productPerformance.get(productId);
      const eventData = event as any;
      product.revenue += eventData.totalAmount || 0;
      product.units += eventData.quantity || 0;
      product.orders += 1;
      product.totalCost += eventData.totalCost || 0;
      product.totalProfit += eventData.profit || 0;
    });

    // Calculate margins and add rankings
    const products = Array.from(productPerformance.values()).map(product => ({
      ...product,
      marginPercentage: product.revenue > 0 ? (product.totalProfit / product.revenue) * 100 : 0,
      averageOrderValue: product.orders > 0 ? product.revenue / product.orders : 0,
      averageUnitPrice: product.units > 0 ? product.revenue / product.units : 0
    }));

    // Sort products
    const sortedProducts = products.sort((a, b) => {
      if (sort === 'best') {
        return b.revenue - a.revenue; // Highest revenue first
      } else {
        return a.revenue - b.revenue; // Lowest revenue first
      }
    });

    // Add rankings and limit results
    const rankedProducts = sortedProducts.slice(0, limitCount).map((product, index) => ({
      rank: index + 1,
      ...product,
      revenueGrowth: Math.random() * 20 - 10 // Mock growth rate for now
    }));

    console.log(`🏆 Top ${rankedProducts.length} products by ${sort} performance`);

    return NextResponse.json({
      success: true,
      data: rankedProducts,
      metadata: {
        range,
        sort,
        limit: limitCount,
        artisanId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalProducts: products.length,
        totalEvents: salesEvents.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching product performance:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch product performance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}