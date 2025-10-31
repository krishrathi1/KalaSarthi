/**
 * Seed Firestore with mock sales data for Digital Khata
 * Creates realistic sales transactions for artisans with craft items
 */

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, Timestamp } = require('firebase/firestore');

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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Artisan IDs from seed script
const artisanIds = [
  'artisan_001', // Pottery
  'artisan_002', // Jewelry
  'artisan_003', // Woodworking
  'artisan_004', // Woodworking
  'artisan_005'  // Textiles
];

// Product catalog for each artisan
const productCatalog = {
  'artisan_001': [ // Pottery
    { name: 'Traditional Terracotta Water Pot', price: 850, category: 'kitchenware' },
    { name: 'Decorative Ceramic Vase', price: 1200, category: 'home_decor' },
    { name: 'Set of Clay Dinner Plates', price: 2400, category: 'kitchenware' },
    { name: 'Handmade Clay Cups', price: 600, category: 'kitchenware' },
    { name: 'Terracotta Plant Pots', price: 450, category: 'garden' }
  ],
  'artisan_002': [ // Jewelry
    { name: 'Traditional Kundan Necklace', price: 15000, category: 'necklaces' },
    { name: 'Silver Tribal Earrings', price: 3500, category: 'earrings' },
    { name: 'Meenakari Bracelet', price: 4500, category: 'bracelets' },
    { name: 'Gold Plated Bangles Set', price: 8000, category: 'bangles' },
    { name: 'Traditional Nose Ring', price: 2500, category: 'nose_rings' }
  ],
  'artisan_003': [ // Woodworking
    { name: 'Custom Wooden Hotel Doors', price: 25000, category: 'doors' },
    { name: 'Restaurant Wooden Furniture Set', price: 45000, category: 'furniture' },
    { name: 'Wooden Reception Desk', price: 35000, category: 'furniture' },
    { name: 'Handcrafted Dining Table', price: 28000, category: 'furniture' },
    { name: 'Wooden Bookshelf', price: 12000, category: 'furniture' }
  ],
  'artisan_004': [ // Woodworking
    { name: 'Carved Wooden Door Set', price: 32000, category: 'doors' },
    { name: 'Office Desk with Drawers', price: 18000, category: 'furniture' },
    { name: 'Wooden Wall Panels', price: 15000, category: 'decor' },
    { name: 'Custom Wardrobe', price: 42000, category: 'furniture' },
    { name: 'Wooden Coffee Table', price: 8500, category: 'furniture' }
  ],
  'artisan_005': [ // Textiles
    { name: 'Handwoven Silk Saree', price: 8500, category: 'sarees' },
    { name: 'Block Printed Cotton Fabric', price: 450, category: 'fabrics' },
    { name: 'Embroidered Cushion Covers', price: 2800, category: 'home_textiles' },
    { name: 'Traditional Shawl', price: 3200, category: 'clothing' },
    { name: 'Handwoven Carpet', price: 12000, category: 'home_decor' }
  ]
};

// Generate random date within last N days
function getRandomDate(daysAgo) {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysAgo);
  const randomHours = Math.floor(Math.random() * 24);
  const randomMinutes = Math.floor(Math.random() * 60);
  
  const date = new Date(now);
  date.setDate(date.getDate() - randomDays);
  date.setHours(randomHours, randomMinutes, 0, 0);
  
  return date;
}

// Generate sales events for an artisan
function generateSalesEvents(artisanId, numEvents = 50) {
  const products = productCatalog[artisanId] || [];
  if (products.length === 0) return [];
  
  const events = [];
  const paymentMethods = ['cash', 'upi', 'card', 'bank_transfer', 'online'];
  const channels = ['direct', 'marketplace', 'web', 'mobile'];
  const buyerNames = [
    'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Gupta', 'Vikram Singh',
    'Anita Desai', 'Rahul Verma', 'Pooja Mehta', 'Sanjay Reddy', 'Kavita Joshi'
  ];
  
  for (let i = 0; i < numEvents; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 units
    const totalAmount = product.price * quantity;
    const timestamp = getRandomDate(90); // Last 90 days
    
    const event = {
      id: `${artisanId}_sale_${Date.now()}_${i}`,
      artisanId,
      productId: `${artisanId}_product_${products.indexOf(product) + 1}`,
      productName: product.name,
      category: product.category,
      buyerName: buyerNames[Math.floor(Math.random() * buyerNames.length)],
      quantity,
      unitPrice: product.price,
      totalAmount,
      currency: 'INR',
      paymentStatus: Math.random() > 0.1 ? 'completed' : 'pending', // 90% completed
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      channel: channels[Math.floor(Math.random() * channels.length)],
      timestamp: Timestamp.fromDate(timestamp),
      metadata: {
        orderId: `ORD${Date.now()}${i}`,
        transactionId: `TXN${Date.now()}${i}`,
        location: 'India',
        notes: `Sale of ${product.name}`
      },
      createdAt: Timestamp.fromDate(timestamp),
      updatedAt: Timestamp.fromDate(timestamp)
    };
    
    events.push(event);
  }
  
  return events.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
}

// Generate expense records for an artisan
function generateExpenseRecords(artisanId, numRecords = 30) {
  const expenses = [];
  const categories = ['materials', 'tools', 'marketing', 'shipping', 'other'];
  const descriptions = {
    materials: ['Wood purchase', 'Clay and ceramic materials', 'Fabric and thread', 'Metal sheets', 'Paint and varnish'],
    tools: ['New chisel set', 'Power drill', 'Sewing machine repair', 'Pottery wheel maintenance', 'Tool sharpening'],
    marketing: ['Social media ads', 'Business cards', 'Website hosting', 'Photography', 'Exhibition fees'],
    shipping: ['Courier charges', 'Packaging materials', 'Transport costs', 'Delivery fees', 'Shipping boxes'],
    other: ['Electricity bill', 'Workshop rent', 'Insurance', 'License renewal', 'Miscellaneous']
  };
  
  for (let i = 0; i < numRecords; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const descList = descriptions[category];
    const description = descList[Math.floor(Math.random() * descList.length)];
    const amount = Math.floor(Math.random() * 5000) + 500; // ₹500-₹5500
    const timestamp = getRandomDate(90);
    
    const expense = {
      id: `${artisanId}_expense_${Date.now()}_${i}`,
      artisanId,
      category,
      description,
      amount,
      currency: 'INR',
      date: Timestamp.fromDate(timestamp),
      vendor: `Vendor ${Math.floor(Math.random() * 10) + 1}`,
      isRecurring: category === 'other' && Math.random() > 0.7,
      tags: [category, 'business_expense'],
      createdAt: Timestamp.fromDate(timestamp),
      updatedAt: Timestamp.fromDate(timestamp)
    };
    
    expenses.push(expense);
  }
  
  return expenses.sort((a, b) => a.date.toDate() - b.date.toDate());
}

// Calculate and store aggregates
function calculateAggregates(artisanId, salesEvents) {
  const aggregates = {
    daily: {},
    weekly: {},
    monthly: {},
    yearly: {}
  };
  
  salesEvents.forEach(event => {
    if (event.paymentStatus !== 'completed') return;
    
    const date = event.timestamp.toDate();
    const dayKey = date.toISOString().split('T')[0];
    const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getDate() + date.getDay()) / 7)}`;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const yearKey = `${date.getFullYear()}`;
    
    // Update daily
    if (!aggregates.daily[dayKey]) {
      aggregates.daily[dayKey] = {
        totalRevenue: 0,
        totalUnits: 0,
        totalOrders: 0,
        products: {}
      };
    }
    aggregates.daily[dayKey].totalRevenue += event.totalAmount;
    aggregates.daily[dayKey].totalUnits += event.quantity;
    aggregates.daily[dayKey].totalOrders += 1;
    
    if (!aggregates.daily[dayKey].products[event.productName]) {
      aggregates.daily[dayKey].products[event.productName] = {
        revenue: 0,
        units: 0
      };
    }
    aggregates.daily[dayKey].products[event.productName].revenue += event.totalAmount;
    aggregates.daily[dayKey].products[event.productName].units += event.quantity;
    
    // Similar for weekly, monthly, yearly
    ['weekly', 'monthly', 'yearly'].forEach(period => {
      const key = period === 'weekly' ? weekKey : period === 'monthly' ? monthKey : yearKey;
      if (!aggregates[period][key]) {
        aggregates[period][key] = {
          totalRevenue: 0,
          totalUnits: 0,
          totalOrders: 0,
          products: {}
        };
      }
      aggregates[period][key].totalRevenue += event.totalAmount;
      aggregates[period][key].totalUnits += event.quantity;
      aggregates[period][key].totalOrders += 1;
      
      if (!aggregates[period][key].products[event.productName]) {
        aggregates[period][key].products[event.productName] = {
          revenue: 0,
          units: 0
        };
      }
      aggregates[period][key].products[event.productName].revenue += event.totalAmount;
      aggregates[period][key].products[event.productName].units += event.quantity;
    });
  });
  
  return aggregates;
}

// Main seeding function
async function seedSalesData() {
  console.log('🌱 Starting Digital Khata sales data seeding...\n');
  
  try {
    let totalSales = 0;
    let totalExpenses = 0;
    
    for (const artisanId of artisanIds) {
      console.log(`📊 Processing ${artisanId}...`);
      
      // Generate and store sales events
      const salesEvents = generateSalesEvents(artisanId, 50);
      for (const event of salesEvents) {
        await setDoc(doc(db, 'sales_events', event.id), event);
      }
      totalSales += salesEvents.length;
      console.log(`  ✅ Created ${salesEvents.length} sales events`);
      
      // Generate and store expenses
      const expenses = generateExpenseRecords(artisanId, 30);
      for (const expense of expenses) {
        await setDoc(doc(db, 'expenses', expense.id), expense);
      }
      totalExpenses += expenses.length;
      console.log(`  ✅ Created ${expenses.length} expense records`);
      
      // Calculate and store aggregates
      const aggregates = calculateAggregates(artisanId, salesEvents);
      
      // Store monthly aggregates (most commonly used)
      for (const [monthKey, data] of Object.entries(aggregates.monthly)) {
        const topProducts = Object.entries(data.products)
          .map(([name, stats]) => ({ productName: name, ...stats }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
        
        const aggregate = {
          id: `${artisanId}_monthly_${monthKey}`,
          artisanId,
          periodType: 'monthly',
          periodKey: monthKey,
          metrics: {
            totalRevenue: data.totalRevenue,
            totalUnits: data.totalUnits,
            totalOrders: data.totalOrders,
            averageOrderValue: Math.round(data.totalRevenue / data.totalOrders),
            topProducts
          },
          lastUpdated: Timestamp.now()
        };
        
        await setDoc(doc(db, 'sales_aggregates', aggregate.id), aggregate);
      }
      console.log(`  ✅ Created ${Object.keys(aggregates.monthly).length} monthly aggregates\n`);
    }
    
    console.log('🎉 Successfully seeded Digital Khata data!');
    console.log('📊 Summary:');
    console.log(`   - Total Sales Events: ${totalSales}`);
    console.log(`   - Total Expense Records: ${totalExpenses}`);
    console.log(`   - Artisans with data: ${artisanIds.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding sales data:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedSalesData()
    .then(() => {
      console.log('✅ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedSalesData };
