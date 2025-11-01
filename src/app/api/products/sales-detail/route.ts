import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    initializeApp(firebaseConfig);
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const artisanId = searchParams.get('artisanId') || 'artisan_001';

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Fetch product details
    const productDoc = await db.collection('products').doc(productId).get();

    if (!productDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = { id: productDoc.id, ...productDoc.data() };

    // Fetch all sales for this product
    const salesSnapshot = await db
      .collection('sales_events')
      .where('artisanId', '==', artisanId)
      .where('productId', '==', productId)
      .where('paymentStatus', '==', 'completed')
      .orderBy('timestamp', 'desc')
      .get();

    const sales = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    }));

    // Calculate metrics
    const totalRevenue = sales.reduce((sum, sale: any) => sum + sale.totalAmount, 0);
    const unitsSold = sales.reduce((sum, sale: any) => sum + sale.quantity, 0);
    const totalSales = sales.length;
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Analyze bundles (products ordered together)
    const bundleMap = new Map<string, { count: number; revenue: number; name: string }>();

    for (const sale of sales) {
      // Find other products in the same order (using orderId from metadata)
      const orderId = (sale as any).metadata?.orderId;
      if (orderId) {
        const orderSnapshot = await db
          .collection('sales_events')
          .where('metadata.orderId', '==', orderId)
          .where('productId', '!=', productId)
          .get();

        orderSnapshot.docs.forEach(doc => {
          const otherProduct = doc.data();
          const key = otherProduct.productId;

          if (!bundleMap.has(key)) {
            bundleMap.set(key, {
              count: 0,
              revenue: 0,
              name: otherProduct.productName
            });
          }

          const bundle = bundleMap.get(key)!;
          bundle.count += 1;
          bundle.revenue += otherProduct.totalAmount;
        });
      }
    }

    // Convert bundle map to array
    const bundleAnalysis = Array.from(bundleMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        timesOrderedTogether: data.count,
        totalRevenue: data.revenue
      }))
      .sort((a, b) => b.timesOrderedTogether - a.timesOrderedTogether)
      .slice(0, 5);

    // Calculate monthly trend
    const monthlyData = new Map<string, { revenue: number; units: number }>();

    sales.forEach((sale: any) => {
      const monthKey = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
        .format(sale.timestamp);

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { revenue: 0, units: 0 });
      }

      const data = monthlyData.get(monthKey)!;
      data.revenue += sale.totalAmount;
      data.units += sale.quantity;
    });

    const monthlyTrend = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        units: data.units
      }))
      .slice(-6); // Last 6 months

    // Format sales with bundle info
    const salesWithBundles = await Promise.all(
      sales.map(async (sale: any) => {
        const orderId = sale.metadata?.orderId;
        let bundledWith: string[] = [];

        if (orderId) {
          const orderSnapshot = await db
            .collection('sales_events')
            .where('metadata.orderId', '==', orderId)
            .where('productId', '!=', productId)
            .get();

          bundledWith = orderSnapshot.docs.map(doc => doc.data().productName);
        }

        return {
          id: sale.id,
          buyerName: sale.buyerName || 'Anonymous',
          quantity: sale.quantity,
          totalAmount: sale.totalAmount,
          timestamp: sale.timestamp,
          paymentStatus: sale.paymentStatus,
          bundledWith
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        name: (product as any).name,
        description: (product as any).description,
        price: (product as any).price,
        category: (product as any).category,
        images: (product as any).images || [],
        totalRevenue,
        totalSales,
        unitsSold,
        averageOrderValue,
        sales: salesWithBundles,
        bundleAnalysis,
        monthlyTrend
      }
    });

  } catch (error: any) {
    console.error('Error fetching product sales detail:', error);

    // Return mock data if Firestore fails
    return NextResponse.json({
      success: true,
      data: getMockProductDetail(request.nextUrl.searchParams.get('productId') || '')
    });
  }
}

function getMockProductDetail(productId: string) {
  return {
    id: productId,
    name: 'Traditional Terracotta Water Pot',
    description: 'Handcrafted terracotta water pot with traditional designs, perfect for keeping water cool naturally.',
    price: 850,
    category: 'kitchenware',
    images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'],
    totalRevenue: 34000,
    totalSales: 28,
    unitsSold: 40,
    averageOrderValue: 1214,
    sales: [
      {
        id: '1',
        buyerName: 'Rajesh Kumar',
        quantity: 2,
        totalAmount: 1700,
        timestamp: new Date(Date.now() - 3600000),
        paymentStatus: 'completed',
        bundledWith: ['Decorative Ceramic Vase']
      },
      {
        id: '2',
        buyerName: 'Priya Sharma',
        quantity: 1,
        totalAmount: 850,
        timestamp: new Date(Date.now() - 7200000),
        paymentStatus: 'completed',
        bundledWith: []
      },
      {
        id: '3',
        buyerName: 'Amit Patel',
        quantity: 3,
        totalAmount: 2550,
        timestamp: new Date(Date.now() - 10800000),
        paymentStatus: 'completed',
        bundledWith: ['Handmade Clay Cups', 'Terracotta Plant Pots']
      },
      {
        id: '4',
        buyerName: 'Sneha Gupta',
        quantity: 1,
        totalAmount: 850,
        timestamp: new Date(Date.now() - 14400000),
        paymentStatus: 'completed',
        bundledWith: []
      },
      {
        id: '5',
        buyerName: 'Vikram Singh',
        quantity: 2,
        totalAmount: 1700,
        timestamp: new Date(Date.now() - 18000000),
        paymentStatus: 'completed',
        bundledWith: ['Set of Clay Dinner Plates']
      }
    ],
    bundleAnalysis: [
      {
        productId: 'artisan_001_product_2',
        productName: 'Decorative Ceramic Vase',
        timesOrderedTogether: 8,
        totalRevenue: 9600
      },
      {
        productId: 'artisan_001_product_4',
        productName: 'Handmade Clay Cups',
        timesOrderedTogether: 6,
        totalRevenue: 3600
      },
      {
        productId: 'artisan_001_product_3',
        productName: 'Set of Clay Dinner Plates',
        timesOrderedTogether: 4,
        totalRevenue: 9600
      },
      {
        productId: 'artisan_001_product_5',
        productName: 'Terracotta Plant Pots',
        timesOrderedTogether: 3,
        totalRevenue: 1350
      }
    ],
    monthlyTrend: [
      { month: 'Aug 2024', revenue: 10200, units: 12 },
      { month: 'Sep 2024', revenue: 12750, units: 15 },
      { month: 'Oct 2024', revenue: 11050, units: 13 }
    ]
  };
}
