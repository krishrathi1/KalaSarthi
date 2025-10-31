/**
 * Generate Historical Sales Data for Dev Bulchandani
 * Creates 12 months of realistic sales events with seasonal patterns
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDocs, collection, query, where, Timestamp, writeBatch } = require('firebase/firestore');

// Firebase config (using environment variables)
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

// Sales Pattern Configuration
const salesPattern = {
  pattern: 'seasonal_growth',
  baseMonthlyRevenue: 180000, // Base monthly revenue for Dev Bulchandani
  growthRate: 0.12, // 12% annual growth
  seasonalMultipliers: {
    0: 0.8,  // January - Post-holiday slowdown
    1: 0.9,  // February - Valentine's Day boost
    2: 1.1,  // March - Spring season
    3: 1.2,  // April - Wedding season starts
    4: 1.0,  // May - Steady
    5: 0.9,  // June - Summer slowdown
    6: 0.8,  // July - Monsoon impact
    7: 0.9,  // August - Festival preparations
    8: 1.1,  // September - Post-monsoon recovery
    9: 1.3,  // October - Festival season (Diwali)
    10: 1.4, // November - Wedding season peak
    11: 1.2  // December - Holiday season
  },
  productMix: {
    furniture: 0.65,      // 65% furniture (main business)
    doors: 0.20,          // 20% doors (high value)
    decorative_items: 0.15 // 15% decorative items
  }
};

// Buyer profiles for realistic transactions
const buyerProfiles = [
  { id: 'buyer_hotel_001', name: 'Rajmahal Palace Hotel', type: 'business' },
  { id: 'buyer_individual_001', name: 'Priya Sharma', type: 'individual' },
  { id: 'buyer_individual_002', name: 'Amit Gupta', type: 'individual' },
  { id: 'buyer_business_001', name: 'Heritage Homes Pvt Ltd', type: 'business' },
  { id: 'buyer_individual_003', name: 'Sunita Agarwal', type: 'individual' },
  { id: 'buyer_business_002', name: 'Royal Interiors', type: 'business' },
  { id: 'buyer_individual_004', name: 'Vikram Singh', type: 'individual' },
  { id: 'buyer_individual_005', name: 'Meera Joshi', type: 'individual' },
  { id: 'buyer_business_003', name: 'Luxury Resorts Group', type: 'business' },
  { id: 'buyer_individual_006', name: 'Rahul Mehta', type: 'individual' },
  { id: 'buyer_business_004', name: 'Boutique Hotels Chain', type: 'business' },
  { id: 'buyer_individual_007', name: 'Kavita Patel', type: 'individual' },
  { id: 'buyer_individual_008', name: 'Arjun Reddy', type: 'individual' },
  { id: 'buyer_business_005', name: 'Premium Residences', type: 'business' },
  { id: 'buyer_individual_009', name: 'Deepika Iyer', type: 'individual' }
];

// Get products by category for realistic sales distribution
function getProductsByCategory(products) {
  return products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {});
}

// Generate random sales event
function generateSalesEvent(products, buyers, date, pattern) {
  const productsByCategory = getProductsByCategory(products);
  
  // Select category based on product mix
  const rand = Math.random();
  let selectedCategory = 'furniture';
  let cumulative = 0;
  
  for (const [category, percentage] of Object.entries(pattern.productMix)) {
    cumulative += percentage;
    if (rand <= cumulative) {
      selectedCategory = category;
      break;
    }
  }

  // Select random product from category
  const categoryProducts = productsByCategory[selectedCategory] || products;
  const product = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
  
  // Select random buyer
  const buyer = buyers[Math.floor(Math.random() * buyers.length)];
  
  // Generate quantity (business buyers tend to order more)
  const quantity = buyer.type === 'business' 
    ? Math.floor(Math.random() * 3) + 1  // 1-3 for business
    : 1; // Usually 1 for individuals
  
  // Add some price variation (±15%)
  const priceVariation = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
  const unitPrice = Math.round(product.price * priceVariation);
  const totalAmount = unitPrice * quantity;

  // Payment methods distribution
  const paymentMethods = ['bank_transfer', 'upi', 'cash', 'card'];
  const paymentWeights = [0.4, 0.3, 0.2, 0.1]; // Bank transfer most common for high-value items
  
  let paymentMethod = 'bank_transfer';
  const paymentRand = Math.random();
  let paymentCumulative = 0;
  
  for (let i = 0; i < paymentMethods.length; i++) {
    paymentCumulative += paymentWeights[i];
    if (paymentRand <= paymentCumulative) {
      paymentMethod = paymentMethods[i];
      break;
    }
  }

  // Channel distribution
  const channels = ['web', 'mobile', 'marketplace', 'direct'];
  const channelWeights = [0.4, 0.2, 0.1, 0.3]; // Direct sales common for custom furniture
  
  let channel = 'web';
  const channelRand = Math.random();
  let channelCumulative = 0;
  
  for (let i = 0; i < channels.length; i++) {
    channelCumulative += channelWeights[i];
    if (channelRand <= channelCumulative) {
      channel = channels[i];
      break;
    }
  }

  // Generate unique IDs
  const timestamp = date.getTime();
  const randomSuffix = Math.random().toString(36).substr(2, 9);

  return {
    artisanId: 'dev_bulchandani_001',
    productId: product.id,
    productName: product.name,
    category: product.category,
    buyerId: buyer.id,
    buyerName: buyer.name,
    quantity,
    unitPrice,
    totalAmount,
    currency: 'INR',
    paymentStatus: Math.random() > 0.05 ? 'completed' : 'pending', // 95% completed
    paymentMethod,
    channel,
    timestamp: Timestamp.fromDate(date),
    metadata: {
      orderId: `ORD_${timestamp}_${randomSuffix}`,
      transactionId: `TXN_${timestamp}_${randomSuffix}`,
      location: 'Jodhpur, Rajasthan',
      notes: buyer.type === 'business' ? 'Bulk order for commercial project' : 'Custom order as per specifications'
    }
  };
}

// Generate sales events for a specific month
function generateMonthSales(products, buyers, year, month, pattern) {
  const monthMultiplier = pattern.seasonalMultipliers[month];
  const baseRevenue = pattern.baseMonthlyRevenue;
  const targetRevenue = baseRevenue * monthMultiplier;
  
  // Calculate growth factor based on month (assuming linear growth throughout the year)
  const monthsFromStart = month;
  const growthFactor = 1 + (pattern.growthRate * monthsFromStart / 12);
  const adjustedTargetRevenue = targetRevenue * growthFactor;
  
  const salesEvents = [];
  let currentRevenue = 0;
  let attempts = 0;
  const maxAttempts = 200; // Prevent infinite loops
  
  // Generate sales events until we reach target revenue or max attempts
  while (currentRevenue < adjustedTargetRevenue && attempts < maxAttempts) {
    // Generate random date within the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const randomDay = Math.floor(Math.random() * daysInMonth) + 1;
    const randomHour = Math.floor(Math.random() * 24);
    const randomMinute = Math.floor(Math.random() * 60);
    
    const saleDate = new Date(year, month, randomDay, randomHour, randomMinute);
    
    // Generate sales event
    const salesEvent = generateSalesEvent(products, buyers, saleDate, pattern);
    salesEvents.push(salesEvent);
    currentRevenue += salesEvent.totalAmount;
    attempts++;
  }
  
  // Sort events by date
  salesEvents.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
  
  return {
    events: salesEvents,
    totalRevenue: currentRevenue,
    targetRevenue: adjustedTargetRevenue,
    eventCount: salesEvents.length
  };
}

// Fetch Dev Bulchandani's products
async function fetchDevBulchandaniProducts() {
  console.log('📦 Fetching Dev Bulchandani products...');
  
  const q = query(
    collection(db, 'products'),
    where('artisanId', '==', 'dev_bulchandani_001')
  );
  
  const snapshot = await getDocs(q);
  const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  console.log(`✅ Found ${products.length} products for Dev Bulchandani`);
  return products;
}

// Save sales events to Firestore in batches
async function saveSalesEvents(salesEvents) {
  console.log(`💾 Saving ${salesEvents.length} sales events to Firestore...`);
  
  const batchSize = 500; // Firestore batch limit
  const batches = [];
  
  for (let i = 0; i < salesEvents.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchEvents = salesEvents.slice(i, i + batchSize);
    
    batchEvents.forEach(event => {
      const docRef = doc(collection(db, 'sales_events'));
      const eventData = {
        ...event,
        id: docRef.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      batch.set(docRef, eventData);
    });
    
    batches.push(batch);
  }
  
  // Execute all batches
  for (let i = 0; i < batches.length; i++) {
    await batches[i].commit();
    console.log(`✅ Saved batch ${i + 1}/${batches.length}`);
  }
  
  console.log(`✅ All ${salesEvents.length} sales events saved successfully`);
}

// Main function to generate historical sales data
async function generateHistoricalSalesData() {
  console.log('📈 Starting historical sales data generation for Dev Bulchandani...');
  
  try {
    // Fetch products
    const products = await fetchDevBulchandaniProducts();
    
    if (products.length === 0) {
      throw new Error('No products found for Dev Bulchandani. Please run generate-dev-bulchandani-data.js first.');
    }
    
    const allSalesEvents = [];
    const monthlySummary = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Generate sales for the last 12 months
    for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
      const targetDate = new Date(currentYear, currentDate.getMonth() - monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      console.log(`📅 Generating sales for ${targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}...`);
      
      const monthData = generateMonthSales(products, buyerProfiles, year, month, salesPattern);
      allSalesEvents.push(...monthData.events);
      
      monthlySummary.push({
        month: targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        eventCount: monthData.eventCount,
        totalRevenue: monthData.totalRevenue,
        targetRevenue: monthData.targetRevenue,
        achievementRate: ((monthData.totalRevenue / monthData.targetRevenue) * 100).toFixed(1)
      });
      
      console.log(`✅ Generated ${monthData.eventCount} sales events (₹${monthData.totalRevenue.toLocaleString()})`);
    }
    
    // Save all sales events to Firestore
    await saveSalesEvents(allSalesEvents);
    
    // Print summary
    console.log('\n🎉 Historical sales data generation completed successfully!');
    console.log('\n📊 Monthly Summary:');
    console.log('Month\t\t\tEvents\tRevenue\t\tTarget\t\tAchievement');
    console.log('─'.repeat(80));
    
    let totalEvents = 0;
    let totalRevenue = 0;
    let totalTarget = 0;
    
    monthlySummary.forEach(month => {
      totalEvents += month.eventCount;
      totalRevenue += month.totalRevenue;
      totalTarget += month.targetRevenue;
      
      console.log(
        `${month.month.padEnd(20)}\t${month.eventCount}\t₹${(month.totalRevenue/1000).toFixed(0)}K\t\t₹${(month.targetRevenue/1000).toFixed(0)}K\t\t${month.achievementRate}%`
      );
    });
    
    console.log('─'.repeat(80));
    console.log(`Total\t\t\t${totalEvents}\t₹${(totalRevenue/100000).toFixed(1)}L\t\t₹${(totalTarget/100000).toFixed(1)}L\t\t${((totalRevenue/totalTarget)*100).toFixed(1)}%`);
    
    console.log('\n📈 Key Statistics:');
    console.log(`• Total Sales Events: ${totalEvents}`);
    console.log(`• Total Revenue Generated: ₹${totalRevenue.toLocaleString()}`);
    console.log(`• Average Monthly Revenue: ₹${(totalRevenue/12).toLocaleString()}`);
    console.log(`• Average Order Value: ₹${(totalRevenue/totalEvents).toLocaleString()}`);
    console.log(`• Revenue Achievement: ${((totalRevenue/totalTarget)*100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Error generating historical sales data:', error);
    throw error;
  }
}

// Export the function
module.exports = { generateHistoricalSalesData };

// Run the generation if this file is executed directly
if (require.main === module) {
  generateHistoricalSalesData()
    .then(() => {
      console.log('✅ Historical sales data generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Historical sales data generation failed:', error);
      process.exit(1);
    });
}