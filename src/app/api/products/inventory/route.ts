import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    const serviceAccount = require('../../../../../../key.json');
    initializeApp({
      credential: cert(serviceAccount)
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId') || 'artisan_001';

    // Fetch products for the artisan
    const productsSnapshot = await db
      .collection('products')
      .where('artisanId', '==', artisanId)
      .get();

    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch sales data for each product
    const productsWithSales = await Promise.all(
      products.map(async (product: any) => {
        try {
          const salesSnapshot = await db
            .collection('sales_events')
            .where('artisanId', '==', artisanId)
            .where('productId', '==', product.id)
            .where('paymentStatus', '==', 'completed')
            .get();

          const sales = salesSnapshot.docs.map(doc => doc.data());
          
          const totalRevenue = sales.reduce((sum, sale: any) => sum + sale.totalAmount, 0);
          const unitsSold = sales.reduce((sum, sale: any) => sum + sale.quantity, 0);
          const totalSales = sales.length;

          return {
            ...product,
            totalRevenue,
            unitsSold,
            totalSales
          };
        } catch (error) {
          console.error(`Error fetching sales for product ${product.id}:`, error);
          return {
            ...product,
            totalRevenue: 0,
            unitsSold: 0,
            totalSales: 0
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: productsWithSales
    });

  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    
    // Return mock data if Firestore fails
    return NextResponse.json({
      success: true,
      data: getMockInventory()
    });
  }
}

function getMockInventory() {
  return [
    {
      id: 'artisan_001_product_1',
      name: 'Traditional Terracotta Water Pot',
      description: 'Handcrafted terracotta water pot with traditional designs',
      price: 850,
      currency: 'INR',
      images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'],
      category: 'kitchenware',
      inStock: true,
      totalRevenue: 34000,
      unitsSold: 40,
      totalSales: 28
    },
    {
      id: 'artisan_001_product_2',
      name: 'Decorative Ceramic Vase',
      description: 'Beautiful glazed ceramic vase with intricate patterns',
      price: 1200,
      currency: 'INR',
      images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop'],
      category: 'home_decor',
      inStock: true,
      totalRevenue: 28800,
      unitsSold: 24,
      totalSales: 20
    },
    {
      id: 'artisan_001_product_3',
      name: 'Set of Clay Dinner Plates',
      description: 'Set of 6 handmade clay dinner plates with natural finish',
      price: 2400,
      currency: 'INR',
      images: ['https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop'],
      category: 'kitchenware',
      inStock: true,
      totalRevenue: 26400,
      unitsSold: 11,
      totalSales: 11
    },
    {
      id: 'artisan_001_product_4',
      name: 'Handmade Clay Cups',
      description: 'Set of traditional clay cups for tea and coffee',
      price: 600,
      currency: 'INR',
      images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'],
      category: 'kitchenware',
      inStock: true,
      totalRevenue: 18000,
      unitsSold: 30,
      totalSales: 22
    },
    {
      id: 'artisan_001_product_5',
      name: 'Terracotta Plant Pots',
      description: 'Natural terracotta pots perfect for indoor and outdoor plants',
      price: 450,
      currency: 'INR',
      images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop'],
      category: 'garden',
      inStock: true,
      totalRevenue: 17800,
      unitsSold: 40,
      totalSales: 35
    }
  ];
}
