/**
 * Simple Firestore Data Population for Enhanced Digital Khata
 * Creates clean, validated data for Product Rankings
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, Timestamp } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCaVVcXYZPb1vWgwB8epGh8SI2BqNnnwAE",
  authDomain: "kalabandhu-a93b0.firebaseapp.com",
  projectId: "kalabandhu-a93b0",
  storageBucket: "kalabandhu-a93b0.firebasestorage.app",
  messagingSenderId: "819900934773",
  appId: "1:819900934773:web:1b44a376a5394fbb09e63c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Clean product data
const products = [
  {
    id: 'prod_terracotta_pot_001',
    artisanId: 'dev_bulchandani_001',
    name: 'Traditional Terracotta Water Pot',
    category: 'pottery',
    description: 'Handcrafted traditional water pot with natural cooling properties',
    price: 1500,
    costPrice: 800,
    isActive: true,
    stock: 25
  },
  {
    id: 'prod_ceramic_vase_002',
    artisanId: 'dev_bulchandani_001',
    name: 'Decorative Ceramic Vase',
    category: 'pottery',
    description: 'Beautiful hand-painted ceramic vase for home decoration',
    price: 2000,
    costPrice: 1200,
    isActive: true,
    stock: 15
  },
  {
    id: 'prod_dinner_plates_003',
    artisanId: 'dev_bulchandani_001',
    name: 'Set of Clay Dinner Plates',
    category: 'pottery',
    description: 'Set of 6 handmade clay dinner plates',
    price: 800,
    costPrice: 400,
    isActive: true,
    stock: 30
  },
  {
    id: 'prod_wooden_chair_004',
    artisanId: 'dev_bulchandani_001',
    name: 'Handcrafted Wooden Chair',
    category: 'furniture',
    description: 'Solid wood chair with intricate carving',
    price: 3500,
    costPrice: 2000,
    isActive: true,
    stock: 8
  },
  {
    id: 'prod_wooden_table_005',
    artisanId: 'dev_bulchandani_001',
    name: 'Carved Wooden Dining Table',
    category: 'furniture',
    description: 'Elegant dining table with traditional carving',
    price: 5000,
    costPrice: 3000,
    isActive: true,
    stock: 5
  },
  {
    id: 'prod_brass_lamp_006',
    artisanId: 'dev_bulchandani_001',
    name: 'Brass Decorative Lamp',
    category: 'metalwork',
    description: 'Traditional brass lamp with intricate patterns',
    price: 1500,
    costPrice: 900,
    isActive: true,
    stock: 12
  }
];

// Generate clean sales events
function generateCleanSalesEvents() {
  const events = [];
  const now = new Date();
  
  // Generate 30 sales events over last 15 days
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 15);
    const eventDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    const product = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    const unitPrice = product.price;
    const totalAmount = unitPrice * quantity;
    
    const eventId = `sales_${Date.now()}_${i}`;
    
    events.push({
      id: eventId,
      artisanId: 'dev_bulchandani_001',
      productId: product.id,
      productName: product.name,
      productCategory: product.category,
      buyerId: `buyer_${i % 5 + 1}`,
      buyerName: ['Priya Sharma', 'Amit Gupta', 'Sunita Agarwal', 'Vikram Singh', 'Meera Joshi'][i % 5],
      quantity: quantity,
      unitPrice: unitPrice,
      totalAmount: totalAmount,
      currency: 'INR',
      paymentStatus: 'completed',
      paymentMethod: ['bank_transfer', 'upi', 'cash'][Math.floor(Math.random() * 3)],
      channel: ['web', 'mobile', 'direct'][Math.floor(Math.random() * 3)],
      eventType: 'order_paid',
      eventTimestamp: Timestamp.fromDate(eventDate)
    });
  }
  
  return events.sort((a, b) => b.eventTimestamp.toDate().getTime() - a.eventTimestamp.toDate().getTime());
}

// Save data to Firestore
async function saveToFirestore() {
  console.log('🚀 Starting simple Firestore data population...');
  
  try {
    // Save products
    console.log('📦 Saving products...');
    for (const product of products) {
      await setDoc(doc(db, 'products', product.id), {
        ...product,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
    console.log(`✅ Saved ${products.length} products`);
    
    // Generate and save sales events
    console.log('💰 Generating sales events...');
    const salesEvents = generateCleanSalesEvents();
    
    console.log('💾 Saving sales events...');
    for (const event of salesEvents) {
      await setDoc(doc(db, 'sales_events', event.id), {
        ...event,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
    console.log(`✅ Saved ${salesEvents.length} sales events`);
    
    // Calculate summary
    const totalRevenue = salesEvents.reduce((sum, event) => sum + event.totalAmount, 0);
    const avgOrderValue = totalRevenue / salesEvents.length;
    
    console.log('\n🎉 DATA POPULATION COMPLETED!');
    console.log('═'.repeat(50));
    console.log(`✅ Products: ${products.length}`);
    console.log(`✅ Sales Events: ${salesEvents.length}`);
    console.log(`✅ Total Revenue: ₹${totalRevenue.toLocaleString()}`);
    console.log(`✅ Avg Order Value: ₹${Math.round(avgOrderValue).toLocaleString()}`);
    
    console.log('\n🎯 Product Rankings will now show real data!');
    
  } catch (error) {
    console.error('❌ Error saving to Firestore:', error);
    throw error;
  }
}

// Run the population
if (require.main === module) {
  saveToFirestore()
    .then(() => {
      console.log('\n✨ Firestore population completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Firestore population failed:', error);
      process.exit(1);
    });
}

module.exports = { saveToFirestore };