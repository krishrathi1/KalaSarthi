import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, Timestamp, setDoc } from 'firebase/firestore';

// Product categories and names for realistic data
const productCategories = [
  {
    category: 'Handicrafts',
    products: [
      'Handwoven Silk Scarf',
      'Ceramic Pottery Set',
      'Wooden Jewelry Box',
      'Embroidered Wall Hanging',
      'Brass Decorative Plate'
    ]
  },
  {
    category: 'Textiles',
    products: [
      'Cotton Kurta Set',
      'Block Print Bedsheet',
      'Handloom Saree',
      'Woolen Shawl',
      'Tie-Dye Dupatta'
    ]
  },
  {
    category: 'Jewelry',
    products: [
      'Silver Oxidized Earrings',
      'Beaded Necklace Set',
      'Brass Bangles',
      'Gemstone Ring',
      'Traditional Anklets'
    ]
  },
  {
    category: 'Home Decor',
    products: [
      'Bamboo Wind Chimes',
      'Marble Coaster Set',
      'Jute Table Runner',
      'Clay Oil Lamps',
      'Wooden Photo Frame'
    ]
  }
];

// Simple random functions (no faker dependency)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateRandomName(): string {
  const firstNames = ['Amit', 'Priya', 'Raj', 'Sunita', 'Vikram', 'Meera', 'Arjun', 'Kavya', 'Rohit', 'Anita'];
  const lastNames = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Jain', 'Agarwal', 'Verma', 'Yadav', 'Mishra'];
  return `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
}

function generateRandomPhone(): string {
  return `+91${randomInt(7000000000, 9999999999)}`;
}

function generateRandomLocation(): string {
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
  const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Telangana', 'Maharashtra', 'Gujarat', 'Rajasthan', 'Uttar Pradesh'];
  const cityIndex = randomInt(0, cities.length - 1);
  return `${cities[cityIndex]}, ${states[cityIndex]}`;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting November 2024 sales data generation...');
    
    const startDate = new Date('2024-11-01');
    const endDate = new Date('2024-11-30');
    const totalEvents = randomInt(150, 200);
    
    const salesEvents = [];
    
    for (let i = 0; i < totalEvents; i++) {
      // Random date in November
      const eventDate = randomDate(startDate, endDate);
      
      // Select random product
      const categoryData = randomChoice(productCategories);
      const productName = randomChoice(categoryData.products);
      
      // Generate realistic pricing based on category
      let basePrice: number, quantity: number;
      switch (categoryData.category) {
        case 'Handicrafts':
          basePrice = randomInt(800, 3500);
          quantity = randomInt(1, 3);
          break;
        case 'Textiles':
          basePrice = randomInt(1200, 4500);
          quantity = randomInt(1, 2);
          break;
        case 'Jewelry':
          basePrice = randomInt(500, 2500);
          quantity = randomInt(1, 4);
          break;
        case 'Home Decor':
          basePrice = randomInt(300, 1800);
          quantity = randomInt(1, 5);
          break;
        default:
          basePrice = randomInt(500, 2000);
          quantity = randomInt(1, 3);
      }
      
      const unitPrice = basePrice;
      const totalAmount = unitPrice * quantity;
      
      // Calculate cost and profit (realistic margins: 30-60%)
      const marginPercentage = randomFloat(30, 60);
      const costPerUnit = unitPrice * (1 - marginPercentage / 100);
      const totalCost = costPerUnit * quantity;
      const profit = totalAmount - totalCost;
      
      const salesEvent = {
        // Event identification
        eventId: `sale_${Date.now()}_${i}`,
        eventType: randomChoice(['order_placed', 'order_paid', 'order_fulfilled']),
        eventTimestamp: Timestamp.fromDate(eventDate),
        
        // Product information
        productId: `${categoryData.category.toLowerCase()}_${productName.toLowerCase().replace(/\s+/g, '_')}`,
        productName: productName,
        category: categoryData.category,
        
        // Sales details
        quantity: quantity,
        unitPrice: unitPrice,
        totalAmount: totalAmount,
        
        // Cost and profit analysis
        costPerUnit: Math.round(costPerUnit),
        totalCost: Math.round(totalCost),
        profit: Math.round(profit),
        marginPercentage: Math.round(marginPercentage * 100) / 100,
        
        // Customer information
        buyerName: generateRandomName(),
        buyerPhone: generateRandomPhone(),
        buyerLocation: generateRandomLocation(),
        
        // Payment information
        paymentMethod: randomChoice(['UPI', 'Cash', 'Bank Transfer', 'Card']),
        paymentStatus: randomChoice(['Paid', 'Pending', 'Fulfilled']),
        
        // Artisan information
        artisanId: 'dev_bulchandani_001',
        artisanName: 'Dev Bulchandani',
        
        // Metadata
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        source: 'sample_data_generation',
        
        // Additional fields for analytics
        dayOfWeek: eventDate.toLocaleDateString('en-US', { weekday: 'long' }),
        weekOfMonth: Math.ceil(eventDate.getDate() / 7),
        isWeekend: eventDate.getDay() === 0 || eventDate.getDay() === 6,
        
        // Seasonal factors
        seasonalFactor: randomFloat(0.8, 1.3), // November is festival season
        festivalBonus: Math.random() < 0.3 // 30% chance of festival-related sale
      };
      
      salesEvents.push(salesEvent);
    }
    
    console.log(`📊 Generated ${salesEvents.length} sales events for November 2024`);
    
    // Calculate summary statistics
    const totalRevenue = salesEvents.reduce((sum, event) => sum + event.totalAmount, 0);
    const totalProfit = salesEvents.reduce((sum, event) => sum + event.profit, 0);
    const totalUnits = salesEvents.reduce((sum, event) => sum + event.quantity, 0);
    const avgOrderValue = totalRevenue / salesEvents.length;
    
    console.log(`💰 Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`);
    console.log(`📈 Total Profit: ₹${totalProfit.toLocaleString('en-IN')}`);
    console.log(`📦 Total Units: ${totalUnits}`);
    console.log(`🛒 Average Order Value: ₹${Math.round(avgOrderValue).toLocaleString('en-IN')}`);
    
    // Write to Firestore in batches (max 500 per batch)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < salesEvents.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchEvents = salesEvents.slice(i, i + batchSize);
      
      batchEvents.forEach(event => {
        const docRef = doc(collection(db, 'sales_events'), event.eventId);
        batch.set(docRef, event);
      });
      
      batches.push(batch);
    }
    
    console.log(`📝 Writing ${batches.length} batches to Firestore...`);
    
    // Execute all batches
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`✅ Batch ${i + 1}/${batches.length} completed`);
    }
    
    // Create summary document
    const summaryDoc = {
      month: 'November 2024',
      totalEvents: salesEvents.length,
      totalRevenue: totalRevenue,
      totalProfit: totalProfit,
      totalUnits: totalUnits,
      averageOrderValue: avgOrderValue,
      profitMargin: (totalProfit / totalRevenue) * 100,
      topCategories: productCategories.map(cat => ({
        category: cat.category,
        events: salesEvents.filter(e => e.category === cat.category).length,
        revenue: salesEvents.filter(e => e.category === cat.category).reduce((sum, e) => sum + e.totalAmount, 0)
      })).sort((a, b) => b.revenue - a.revenue),
      createdAt: Timestamp.now(),
      artisanId: 'dev_bulchandani_001'
    };
    
    const summaryDocRef = doc(collection(db, 'monthly_summaries'), 'november_2024');
    await setDoc(summaryDocRef, summaryDoc);
    console.log('📋 Monthly summary created');
    
    console.log('🎉 November 2024 sales data generation completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'November 2024 sales data generated successfully',
      summary: {
        totalEvents: salesEvents.length,
        totalRevenue: totalRevenue,
        totalProfit: totalProfit,
        totalUnits: totalUnits,
        averageOrderValue: avgOrderValue,
        profitMargin: (totalProfit / totalRevenue) * 100,
        categoryBreakdown: summaryDoc.topCategories
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating sample data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate sample data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Sample data generation endpoint is ready. Use POST to generate November 2024 sales data.',
    endpoint: '/api/generate-sample-data',
    method: 'POST'
  });
}