/**
 * Populate Firestore with Real Sales Data for Enhanced Digital Khata
 * This script creates actual products and sales events in Firestore
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, writeBatch, Timestamp } = require('firebase/firestore');

// Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Dev Bulchandani's product catalog
const products = [
  {
    id: 'prod_terracotta_pot_001',
    artisanId: 'dev_bulchandani_001',
    name: 'Traditional Terracotta Water Pot',
    category: 'pottery',
    description: 'Handcrafted traditional water pot with natural cooling properties',
    price: 1500,
    costPrice: 800,
    images: ['https://example.com/terracotta-pot.jpg'],
    tags: ['traditional', 'eco-friendly', 'handmade'],
    isActive: true,
    stock: 25,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod_ceramic_vase_002',
    artisanId: 'dev_bulchandani_001',
    name: 'Decorative Ceramic Vase',
    category: 'pottery',
    description: 'Beautiful hand-painted ceramic vase for home decoration',
    price: 2000,
    costPrice: 1200,
    images: ['https://example.com/ceramic-vase.jpg'],
    tags: ['decorative', 'ceramic', 'artistic'],
    isActive: true,
    stock: 15,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod_dinner_plates_003',
    artisanId: 'dev_bulchandani_001',
    name: 'Set of Clay Dinner Plates (6 pieces)',
    category: 'pottery',
    description: 'Set of 6 handmade clay dinner plates, perfect for traditional dining',
    price: 800,
    costPrice: 400,
    images: ['https://example.com/clay-plates.jpg'],
    tags: ['dinnerware', 'set', 'traditional'],
    isActive: true,
    stock: 30,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod_wooden_chair_004',
    artisanId: 'dev_bulchandani_001',
    name: 'Handcrafted Wooden Chair',
    category: 'furniture',
    description: 'Solid wood chair with intricate carving and comfortable design',
    price: 3500,
    costPrice: 2000,
    images: ['https://example.com/wooden-chair.jpg'],
    tags: ['furniture', 'wood', 'carved'],
    isActive: true,
    stock: 8,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod_wooden_table_005',
    artisanId: 'dev_bulchandani_001',
    name: 'Carved Wooden Dining Table',
    category: 'furniture',
    description: 'Elegant dining table with traditional Rajasthani wood carving',
    price: 5000,
    costPrice: 3000,
    images: ['https://example.com/wooden-table.jpg'],
    tags: ['furniture', 'dining', 'carved'],
    isActive: true,
    stock: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod_brass_lamp_006',
    artisanId: 'dev_bulchandani_001',
    name: 'Brass Decorative Lamp',
    category: 'metalwork',
    description: 'Traditional brass lamp with intricate patterns and warm lighting',
    price: 1500,
    costPrice: 900,
    images: ['https://example.com/brass-lamp.jpg'],
    tags: ['brass', 'lighting', 'traditional'],
    isActive: true,
    stock: 12,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Customer profiles for realistic sales
const customers = [
  { id: 'cust_001', name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '+91-9876543210', type: 'individual' },
  { id: 'cust_002', name: 'Amit Gupta', email: 'amit.gupta@example.com', phone: '+91-9876543211', type: 'individual' },
  { id: 'cust_003', name: 'Sunita Agarwal', email: 'sunita.agarwal@example.com', phone: '+91-9876543212', type: 'individual' },
  { id: 'cust_004', name: 'Heritage Homes Pvt Ltd', email: 'orders@heritagehomes.com', phone: '+91-9876543213', type: 'business' },
  { id: 'cust_005', name: 'Royal Interiors', email: 'purchase@royalinteriors.com', phone: '+91-9876543214', type: 'business' },
  { id: 'cust_006', name: 'Vikram Singh', email: 'vikram.singh@example.com', phone: '+91-9876543215', type: 'individual' },
  { id: 'cust_007', name: 'Meera Joshi', email: 'meera.joshi@example.com', phone: '+91-9876543216', type: 'individual' },
  { id: 'cust_008', name: 'Luxury Resorts Group', email: 'procurement@luxuryresorts.com', phone: '+91-9876543217', type: 'business' }
];

// Generate realistic sales events
function generateSalesEvents() {
  const events = [];
  const now = new Date();
  
  // Generate sales over the last 30 days
  for (let day = 0; day < 30; day++) {
    const salesDate = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
    
    // Generate 1-3 sales per day (more realistic)
    const salesPerDay = Math.floor(Math.random() * 3) + 1;
    
    for (let sale = 0; sale < salesPerDay; sale++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const customer = customers[Math.floor(Math.random() * customers.length)];
      
      // Business customers tend to buy more quantity
      const quantity = customer.type === 'business' ? Math.floor(Math.random() * 3) + 1 : 1;
      
      // Add some price variation (±10%)
      const priceVariation = 0.9 + Math.random() * 0.2;
      const unitPrice = Math.round(product.price * priceVariation);
      const totalAmount = unitPrice * quantity;
      
      // Random time during the day
      const eventTime = new Date(salesDate);
      eventTime.setHours(Math.floor(Math.random() * 12) + 9); // 9 AM to 9 PM
      eventTime.setMinutes(Math.floor(Math.random() * 60));
      
      const eventId = `sales_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      events.push({
        id: eventId,
        artisanId: 'dev_bulchandani_001',
        productId: product.id,
        productName: product.name,
        productCategory: product.category,
        customerId: customer.id,
        customerName: customer.name,
        customerType: customer.type,
        quantity,
        unitPrice,
        totalAmount,
        costPrice: product.costPrice * quantity,
        profitAmount: (unitPrice - product.costPrice) * quantity,
        currency: 'INR',
        paymentStatus: Math.random() > 0.05 ? 'completed' : 'pending', // 95% completed
        paymentMethod: ['bank_transfer', 'upi', 'cash', 'card'][Math.floor(Math.random() * 4)],
        channel: ['web', 'mobile', 'marketplace', 'direct'][Math.floor(Math.random() * 4)],
        eventType: 'order_paid',
        eventTimestamp: Timestamp.fromDate(eventTime),
        orderDate: Timestamp.fromDate(eventTime),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        metadata: {
          orderId: `ORD_${eventTime.getTime()}_${Math.random().toString(36).substr(2, 6)}`,
          transactionId: `TXN_${eventTime.getTime()}_${Math.random().toString(36).substr(2, 6)}`,
          location: 'Jodhpur, Rajasthan',
          notes: customer.type === 'business' ? 'Bulk order for commercial project' : 'Custom handcrafted piece',
          source: 'enhanced_digital_khata'
        }
      });
    }
  }
  
  return events.sort((a, b) => b.eventTimestamp.toDate().getTime() - a.eventTimestamp.toDate().getTime());
}

// Save products to Firestore
async function saveProducts() {
  console.log('📦 Saving products to Firestore...');
  
  const batch = writeBatch(db);
  
  products.forEach(product => {
    const productRef = doc(db, 'products', product.id);
    batch.set(productRef, product);
  });
  
  await batch.commit();
  console.log(`✅ Saved ${products.length} products to Firestore`);
}

// Save customers to Firestore
async function saveCustomers() {
  console.log('👥 Saving customers to Firestore...');
  
  const batch = writeBatch(db);
  
  customers.forEach(customer => {
    const customerRef = doc(db, 'customers', customer.id);
    batch.set(customerRef, {
      ...customer,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  });
  
  await batch.commit();
  console.log(`✅ Saved ${customers.length} customers to Firestore`);
}

// Save sales events to Firestore in batches
async function saveSalesEvents(events) {
  console.log(`💰 Saving ${events.length} sales events to Firestore...`);
  
  const batchSize = 500; // Firestore batch limit
  const batches = [];
  
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchEvents = events.slice(i, i + batchSize);
    
    batchEvents.forEach(event => {
      const eventRef = doc(db, 'sales_events', event.id);
      batch.set(eventRef, event);
    });
    
    batches.push(batch);
  }
  
  // Execute all batches
  for (let i = 0; i < batches.length; i++) {
    await batches[i].commit();
    console.log(`✅ Saved batch ${i + 1}/${batches.length}`);
  }
  
  console.log(`✅ All ${events.length} sales events saved to Firestore`);
}

// Generate sales aggregates for quick dashboard queries
async function generateSalesAggregates(events) {
  console.log('📊 Generating sales aggregates...');
  
  const aggregates = {};
  
  events.forEach(event => {
    const eventDate = event.eventTimestamp.toDate();
    const dateKey = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!aggregates[dateKey]) {
      aggregates[dateKey] = {
        date: dateKey,
        artisanId: event.artisanId,
        totalRevenue: 0,
        totalOrders: 0,
        totalQuantity: 0,
        totalProfit: 0,
        uniqueCustomers: new Set(),
        uniqueProducts: new Set(),
        paymentMethods: {},
        channels: {},
        categories: {}
      };
    }
    
    const agg = aggregates[dateKey];
    agg.totalRevenue += event.totalAmount;
    agg.totalOrders += 1;
    agg.totalQuantity += event.quantity;
    agg.totalProfit += event.profitAmount;
    agg.uniqueCustomers.add(event.customerId);
    agg.uniqueProducts.add(event.productId);
    
    // Count payment methods
    agg.paymentMethods[event.paymentMethod] = (agg.paymentMethods[event.paymentMethod] || 0) + 1;
    
    // Count channels
    agg.channels[event.channel] = (agg.channels[event.channel] || 0) + 1;
    
    // Count categories
    agg.categories[event.productCategory] = (agg.categories[event.productCategory] || 0) + 1;
  });
  
  // Convert sets to counts and save to Firestore
  const batch = writeBatch(db);
  
  Object.values(aggregates).forEach(agg => {
    const aggData = {
      ...agg,
      uniqueCustomers: agg.uniqueCustomers.size,
      uniqueProducts: agg.uniqueProducts.size,
      averageOrderValue: agg.totalRevenue / agg.totalOrders,
      profitMargin: (agg.totalProfit / agg.totalRevenue) * 100,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const aggRef = doc(db, 'sales_aggregates', `daily_${agg.artisanId}_${agg.date}`);
    batch.set(aggRef, aggData);
  });
  
  await batch.commit();
  console.log(`✅ Generated ${Object.keys(aggregates).length} daily aggregates`);
}

// Main function to populate Firestore
async function populateFirestoreData() {
  console.log('🚀 Starting Firestore data population for Enhanced Digital Khata...');
  console.log('👨‍🎨 Target Artisan: Dev Bulchandani (dev_bulchandani_001)');
  console.log('─'.repeat(80));
  
  try {
    // Step 1: Save products
    await saveProducts();
    
    // Step 2: Save customers
    await saveCustomers();
    
    // Step 3: Generate and save sales events
    const salesEvents = generateSalesEvents();
    await saveSalesEvents(salesEvents);
    
    // Step 4: Generate sales aggregates
    await generateSalesAggregates(salesEvents);
    
    // Calculate summary statistics
    const totalRevenue = salesEvents.reduce((sum, event) => sum + event.totalAmount, 0);
    const totalProfit = salesEvents.reduce((sum, event) => sum + event.profitAmount, 0);
    const profitMargin = (totalProfit / totalRevenue) * 100;
    
    console.log('\n🎉 FIRESTORE DATA POPULATION COMPLETED!');
    console.log('═'.repeat(80));
    console.log('✅ Products created:', products.length);
    console.log('✅ Customers created:', customers.length);
    console.log('✅ Sales events created:', salesEvents.length);
    console.log('✅ Daily aggregates created:', Object.keys(salesEvents.reduce((acc, e) => {
      const date = e.eventTimestamp.toDate().toISOString().split('T')[0];
      acc[date] = true;
      return acc;
    }, {})).length);
    
    console.log('\n📊 BUSINESS SUMMARY:');
    console.log(`• Total Revenue: ₹${totalRevenue.toLocaleString()}`);
    console.log(`• Total Profit: ₹${totalProfit.toLocaleString()}`);
    console.log(`• Profit Margin: ${profitMargin.toFixed(1)}%`);
    console.log(`• Average Order Value: ₹${(totalRevenue / salesEvents.length).toLocaleString()}`);
    console.log(`• Sales Period: Last 30 days`);
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Open the Enhanced Digital Khata dashboard');
    console.log('2. Navigate to Real-time Analytics tab');
    console.log('3. View Product Rankings with real Firestore data');
    console.log('4. Explore sales trends and performance metrics');
    
    console.log('\n✨ Real Firestore data is now available for Product Rankings!');
    
  } catch (error) {
    console.error('❌ Error populating Firestore data:', error);
    throw error;
  }
}

// Export the function
module.exports = { populateFirestoreData };

// Run if executed directly
if (require.main === module) {
  populateFirestoreData()
    .then(() => {
      console.log('\n🎊 Firestore data population completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Firestore data population failed:', error);
      process.exit(1);
    });
}