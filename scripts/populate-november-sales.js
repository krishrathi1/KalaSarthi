const admin = require('firebase-admin');
const { faker } = require('@faker-js/faker');

// Initialize Firebase Admin (make sure to set your service account key)
if (!admin.apps.length) {
  try {
    // Try to initialize with service account key
    const serviceAccount = require('../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  } catch (error) {
    console.log('Service account not found, using default credentials');
    admin.initializeApp();
  }
}

const db = admin.firestore();

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

// Generate realistic sales data for November 2024
function generateNovemberSalesData() {
  const salesEvents = [];
  const startDate = new Date('2024-11-01');
  const endDate = new Date('2024-11-30');
  
  // Generate 150-200 sales events throughout November
  const totalEvents = faker.number.int({ min: 150, max: 200 });
  
  for (let i = 0; i < totalEvents; i++) {
    // Random date in November
    const eventDate = faker.date.between({ from: startDate, to: endDate });
    
    // Select random product
    const categoryData = faker.helpers.arrayElement(productCategories);
    const productName = faker.helpers.arrayElement(categoryData.products);
    
    // Generate realistic pricing based on category
    let basePrice, quantity;
    switch (categoryData.category) {
      case 'Handicrafts':
        basePrice = faker.number.int({ min: 800, max: 3500 });
        quantity = faker.number.int({ min: 1, max: 3 });
        break;
      case 'Textiles':
        basePrice = faker.number.int({ min: 1200, max: 4500 });
        quantity = faker.number.int({ min: 1, max: 2 });
        break;
      case 'Jewelry':
        basePrice = faker.number.int({ min: 500, max: 2500 });
        quantity = faker.number.int({ min: 1, max: 4 });
        break;
      case 'Home Decor':
        basePrice = faker.number.int({ min: 300, max: 1800 });
        quantity = faker.number.int({ min: 1, max: 5 });
        break;
      default:
        basePrice = faker.number.int({ min: 500, max: 2000 });
        quantity = faker.number.int({ min: 1, max: 3 });
    }
    
    const unitPrice = basePrice;
    const totalAmount = unitPrice * quantity;
    
    // Calculate cost and profit (realistic margins: 30-60%)
    const marginPercentage = faker.number.float({ min: 30, max: 60 });
    const costPerUnit = unitPrice * (1 - marginPercentage / 100);
    const totalCost = costPerUnit * quantity;
    const profit = totalAmount - totalCost;
    
    const salesEvent = {
      // Event identification
      eventId: `sale_${Date.now()}_${i}`,
      eventType: faker.helpers.arrayElement(['order_placed', 'order_paid', 'order_fulfilled']),
      eventTimestamp: admin.firestore.Timestamp.fromDate(eventDate),
      
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
      buyerName: faker.person.fullName(),
      buyerPhone: faker.phone.number('+91##########'),
      buyerLocation: faker.location.city() + ', ' + faker.location.state(),
      
      // Payment information
      paymentMethod: faker.helpers.arrayElement(['UPI', 'Cash', 'Bank Transfer', 'Card']),
      paymentStatus: faker.helpers.arrayElement(['Paid', 'Pending', 'Fulfilled']),
      
      // Artisan information
      artisanId: 'dev_bulchandani_001',
      artisanName: 'Dev Bulchandani',
      
      // Metadata
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      source: 'manual_entry',
      
      // Additional fields for analytics
      dayOfWeek: eventDate.toLocaleDateString('en-US', { weekday: 'long' }),
      weekOfMonth: Math.ceil(eventDate.getDate() / 7),
      isWeekend: eventDate.getDay() === 0 || eventDate.getDay() === 6,
      
      // Seasonal factors
      seasonalFactor: faker.number.float({ min: 0.8, max: 1.3 }), // November is festival season
      festivalBonus: faker.datatype.boolean(0.3) // 30% chance of festival-related sale
    };
    
    salesEvents.push(salesEvent);
  }
  
  return salesEvents;
}

// Function to batch write to Firestore
async function populateFirestore() {
  try {
    console.log('🚀 Starting November 2024 sales data population...');
    
    const salesEvents = generateNovemberSalesData();
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
    
    // Batch write to Firestore (max 500 per batch)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < salesEvents.length; i += batchSize) {
      const batch = db.batch();
      const batchEvents = salesEvents.slice(i, i + batchSize);
      
      batchEvents.forEach(event => {
        const docRef = db.collection('sales_events').doc(event.eventId);
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
      createdAt: admin.firestore.Timestamp.now(),
      artisanId: 'dev_bulchandani_001'
    };
    
    await db.collection('monthly_summaries').doc('november_2024').set(summaryDoc);
    console.log('📋 Monthly summary created');
    
    console.log('🎉 November 2024 sales data population completed successfully!');
    
    // Display category breakdown
    console.log('\n📊 Category Breakdown:');
    summaryDoc.topCategories.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.events} sales, ₹${cat.revenue.toLocaleString('en-IN')} revenue`);
    });
    
  } catch (error) {
    console.error('❌ Error populating Firestore:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  populateFirestore()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateFirestore, generateNovemberSalesData };