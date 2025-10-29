/**
 * Generate Historical Expense Data for Dev Bulchandani
 * Creates 12 months of realistic business expenses with proper categorization
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, Timestamp, writeBatch } = require('firebase/firestore');

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

// Expense Categories and Templates
const expenseTemplates = {
  materials: [
    { description: 'Teak wood planks - Premium grade', baseAmount: 15000, variance: 0.3, frequency: 'monthly' },
    { description: 'Sheesham wood logs for carving', baseAmount: 12000, variance: 0.25, frequency: 'monthly' },
    { description: 'Mango wood boards - Sustainable sourcing', baseAmount: 8000, variance: 0.2, frequency: 'monthly' },
    { description: 'Oak wood panels - Imported quality', baseAmount: 18000, variance: 0.4, frequency: 'bi-monthly' },
    { description: 'Pine wood for decorative items', baseAmount: 5000, variance: 0.3, frequency: 'monthly' },
    { description: 'Brass hardware and fittings', baseAmount: 3500, variance: 0.2, frequency: 'monthly' },
    { description: 'Wood stain and finishing materials', baseAmount: 2500, variance: 0.15, frequency: 'monthly' },
    { description: 'Sandpaper and abrasives', baseAmount: 800, variance: 0.2, frequency: 'monthly' },
    { description: 'Wood glue and adhesives', baseAmount: 1200, variance: 0.15, frequency: 'monthly' },
    { description: 'Varnish and protective coatings', baseAmount: 3000, variance: 0.2, frequency: 'monthly' }
  ],
  tools: [
    { description: 'Circular saw blade replacement', baseAmount: 2500, variance: 0.2, frequency: 'quarterly' },
    { description: 'Chisel set - Professional grade', baseAmount: 8000, variance: 0.1, frequency: 'yearly' },
    { description: 'Router bits and accessories', baseAmount: 3500, variance: 0.15, frequency: 'bi-monthly' },
    { description: 'Drill bits and cutting tools', baseAmount: 1500, variance: 0.2, frequency: 'monthly' },
    { description: 'Measuring tools and squares', baseAmount: 2000, variance: 0.1, frequency: 'yearly' },
    { description: 'Safety equipment and gear', baseAmount: 1800, variance: 0.15, frequency: 'quarterly' },
    { description: 'Workshop lighting upgrade', baseAmount: 5000, variance: 0.2, frequency: 'yearly' },
    { description: 'Tool maintenance and sharpening', baseAmount: 1200, variance: 0.1, frequency: 'monthly' },
    { description: 'Power tool servicing', baseAmount: 3000, variance: 0.2, frequency: 'quarterly' },
    { description: 'Workbench accessories', baseAmount: 2500, variance: 0.15, frequency: 'bi-monthly' }
  ],
  marketing: [
    { description: 'Social media advertising - Facebook/Instagram', baseAmount: 2000, variance: 0.3, frequency: 'monthly' },
    { description: 'Photography for product catalog', baseAmount: 5000, variance: 0.2, frequency: 'quarterly' },
    { description: 'Website maintenance and hosting', baseAmount: 1500, variance: 0.1, frequency: 'monthly' },
    { description: 'Business cards and brochures', baseAmount: 1200, variance: 0.15, frequency: 'quarterly' },
    { description: 'Trade show participation fees', baseAmount: 8000, variance: 0.2, frequency: 'yearly' },
    { description: 'Google Ads campaign', baseAmount: 3000, variance: 0.4, frequency: 'monthly' },
    { description: 'Local newspaper advertisement', baseAmount: 2500, variance: 0.2, frequency: 'quarterly' },
    { description: 'Portfolio printing and binding', baseAmount: 1800, variance: 0.15, frequency: 'bi-monthly' },
    { description: 'SEO and digital marketing services', baseAmount: 4000, variance: 0.25, frequency: 'monthly' },
    { description: 'Craft fair booth rental', baseAmount: 3500, variance: 0.2, frequency: 'quarterly' }
  ],
  shipping: [
    { description: 'Local delivery charges', baseAmount: 1500, variance: 0.3, frequency: 'monthly' },
    { description: 'Interstate shipping costs', baseAmount: 3500, variance: 0.4, frequency: 'monthly' },
    { description: 'Packaging materials and boxes', baseAmount: 2000, variance: 0.2, frequency: 'monthly' },
    { description: 'Bubble wrap and protective padding', baseAmount: 800, variance: 0.15, frequency: 'monthly' },
    { description: 'Courier service charges', baseAmount: 2500, variance: 0.3, frequency: 'monthly' },
    { description: 'Insurance for shipped items', baseAmount: 1200, variance: 0.2, frequency: 'monthly' },
    { description: 'Freight charges for bulk orders', baseAmount: 5000, variance: 0.5, frequency: 'bi-monthly' },
    { description: 'Warehouse storage fees', baseAmount: 1800, variance: 0.1, frequency: 'monthly' },
    { description: 'Loading and unloading charges', baseAmount: 1000, variance: 0.2, frequency: 'monthly' },
    { description: 'Tracking and logistics software', baseAmount: 800, variance: 0.1, frequency: 'monthly' }
  ],
  other: [
    { description: 'Workshop rent', baseAmount: 12000, variance: 0.05, frequency: 'monthly' },
    { description: 'Electricity bill for workshop', baseAmount: 3500, variance: 0.3, frequency: 'monthly' },
    { description: 'Internet and phone charges', baseAmount: 1500, variance: 0.1, frequency: 'monthly' },
    { description: 'Business insurance premium', baseAmount: 8000, variance: 0.05, frequency: 'yearly' },
    { description: 'GST and tax consultant fees', baseAmount: 5000, variance: 0.1, frequency: 'quarterly' },
    { description: 'Bank charges and transaction fees', baseAmount: 800, variance: 0.2, frequency: 'monthly' },
    { description: 'Office supplies and stationery', baseAmount: 1200, variance: 0.15, frequency: 'monthly' },
    { description: 'Professional development course', baseAmount: 15000, variance: 0.2, frequency: 'yearly' },
    { description: 'Business license renewal', baseAmount: 2500, variance: 0.05, frequency: 'yearly' },
    { description: 'Equipment maintenance contract', baseAmount: 6000, variance: 0.1, frequency: 'yearly' }
  ]
};

// Vendor information for realistic expense records
const vendors = {
  materials: [
    'Rajasthan Timber Mart',
    'Premium Wood Suppliers',
    'Jodhpur Lumber Co.',
    'Heritage Wood Works',
    'Sustainable Timber Ltd.'
  ],
  tools: [
    'Professional Tools India',
    'Craftsman Equipment Store',
    'Industrial Tool Supply',
    'Precision Instruments Co.',
    'Workshop Solutions Pvt Ltd'
  ],
  marketing: [
    'Digital Marketing Pro',
    'Creative Advertising Agency',
    'Social Media Experts',
    'Brand Building Solutions',
    'Online Promotion Services'
  ],
  shipping: [
    'Express Logistics',
    'Reliable Courier Services',
    'Fast Track Delivery',
    'Secure Shipping Solutions',
    'Professional Packers'
  ],
  other: [
    'Jodhpur Properties',
    'Rajasthan Electricity Board',
    'Airtel Business',
    'HDFC Bank',
    'CA Sharma & Associates'
  ]
};

// Generate expense for a specific template and date
function generateExpense(template, category, date) {
  // Calculate amount with variance
  const variance = template.variance;
  const multiplier = 1 + (Math.random() - 0.5) * 2 * variance;
  const amount = Math.round(template.baseAmount * multiplier);
  
  // Select random vendor
  const categoryVendors = vendors[category];
  const vendor = categoryVendors[Math.floor(Math.random() * categoryVendors.length)];
  
  // Generate tags based on category and description
  const tags = [category];
  if (template.description.toLowerCase().includes('wood')) tags.push('wood');
  if (template.description.toLowerCase().includes('tool')) tags.push('tools');
  if (template.description.toLowerCase().includes('digital') || template.description.toLowerCase().includes('online')) tags.push('digital');
  if (template.description.toLowerCase().includes('premium') || template.description.toLowerCase().includes('professional')) tags.push('premium');
  
  // Determine if it's recurring
  const isRecurring = template.frequency === 'monthly' || template.frequency === 'quarterly';
  
  return {
    artisanId: 'dev_bulchandani_001',
    category,
    description: template.description,
    amount,
    currency: 'INR',
    date: Timestamp.fromDate(date),
    vendor,
    isRecurring,
    tags
  };
}

// Check if expense should occur based on frequency
function shouldGenerateExpense(template, monthOffset) {
  switch (template.frequency) {
    case 'monthly':
      return true; // Every month
    case 'bi-monthly':
      return monthOffset % 2 === 0; // Every 2 months
    case 'quarterly':
      return monthOffset % 3 === 0; // Every 3 months
    case 'yearly':
      return monthOffset === 0; // Only once in the year
    default:
      return Math.random() > 0.5; // Random for undefined frequencies
  }
}

// Generate expenses for a specific month
function generateMonthExpenses(year, month, monthOffset) {
  const expenses = [];
  
  // Iterate through all categories
  for (const [category, templates] of Object.entries(expenseTemplates)) {
    for (const template of templates) {
      if (shouldGenerateExpense(template, monthOffset)) {
        // Generate 1-3 expenses per template per applicable month
        const expenseCount = template.frequency === 'monthly' ? 
          (Math.random() > 0.7 ? 2 : 1) : 1; // Sometimes 2 for monthly expenses
        
        for (let i = 0; i < expenseCount; i++) {
          // Generate random date within the month
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const randomDay = Math.floor(Math.random() * daysInMonth) + 1;
          const randomHour = Math.floor(Math.random() * 24);
          const randomMinute = Math.floor(Math.random() * 60);
          
          const expenseDate = new Date(year, month, randomDay, randomHour, randomMinute);
          
          const expense = generateExpense(template, category, expenseDate);
          expenses.push(expense);
        }
      }
    }
  }
  
  // Sort expenses by date
  expenses.sort((a, b) => a.date.toDate() - b.date.toDate());
  
  return expenses;
}

// Save expenses to Firestore in batches
async function saveExpenses(expenses) {
  console.log(`💾 Saving ${expenses.length} expense records to Firestore...`);
  
  const batchSize = 500; // Firestore batch limit
  const batches = [];
  
  for (let i = 0; i < expenses.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchExpenses = expenses.slice(i, i + batchSize);
    
    batchExpenses.forEach(expense => {
      const docRef = doc(collection(db, 'expenses'));
      const expenseData = {
        ...expense,
        id: docRef.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      batch.set(docRef, expenseData);
    });
    
    batches.push(batch);
  }
  
  // Execute all batches
  for (let i = 0; i < batches.length; i++) {
    await batches[i].commit();
    console.log(`✅ Saved batch ${i + 1}/${batches.length}`);
  }
  
  console.log(`✅ All ${expenses.length} expense records saved successfully`);
}

// Main function to generate historical expense data
async function generateHistoricalExpenseData() {
  console.log('💰 Starting historical expense data generation for Dev Bulchandani...');
  
  try {
    const allExpenses = [];
    const monthlySummary = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Generate expenses for the last 12 months
    for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
      const targetDate = new Date(currentYear, currentDate.getMonth() - monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      console.log(`📅 Generating expenses for ${targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}...`);
      
      const monthExpenses = generateMonthExpenses(year, month, monthOffset);
      allExpenses.push(...monthExpenses);
      
      // Calculate monthly totals by category
      const categoryTotals = monthExpenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {});
      
      const totalAmount = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      monthlySummary.push({
        month: targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        expenseCount: monthExpenses.length,
        totalAmount,
        categoryTotals
      });
      
      console.log(`✅ Generated ${monthExpenses.length} expense records (₹${totalAmount.toLocaleString()})`);
    }
    
    // Save all expenses to Firestore
    await saveExpenses(allExpenses);
    
    // Print summary
    console.log('\n🎉 Historical expense data generation completed successfully!');
    console.log('\n📊 Monthly Summary:');
    console.log('Month\t\t\tExpenses\tTotal Amount\tMaterials\tTools\t\tMarketing\tShipping\tOther');
    console.log('─'.repeat(120));
    
    let totalExpenses = 0;
    let totalAmount = 0;
    const categoryGrandTotals = {};
    
    monthlySummary.forEach(month => {
      totalExpenses += month.expenseCount;
      totalAmount += month.totalAmount;
      
      // Update grand totals by category
      Object.entries(month.categoryTotals).forEach(([category, amount]) => {
        categoryGrandTotals[category] = (categoryGrandTotals[category] || 0) + amount;
      });
      
      console.log(
        `${month.month.padEnd(20)}\t${month.expenseCount}\t\t₹${(month.totalAmount/1000).toFixed(0)}K\t\t₹${((month.categoryTotals.materials || 0)/1000).toFixed(0)}K\t\t₹${((month.categoryTotals.tools || 0)/1000).toFixed(0)}K\t\t₹${((month.categoryTotals.marketing || 0)/1000).toFixed(0)}K\t\t₹${((month.categoryTotals.shipping || 0)/1000).toFixed(0)}K\t\t₹${((month.categoryTotals.other || 0)/1000).toFixed(0)}K`
      );
    });
    
    console.log('─'.repeat(120));
    console.log(`Total\t\t\t${totalExpenses}\t\t₹${(totalAmount/100000).toFixed(1)}L\t\t₹${((categoryGrandTotals.materials || 0)/1000).toFixed(0)}K\t\t₹${((categoryGrandTotals.tools || 0)/1000).toFixed(0)}K\t\t₹${((categoryGrandTotals.marketing || 0)/1000).toFixed(0)}K\t\t₹${((categoryGrandTotals.shipping || 0)/1000).toFixed(0)}K\t\t₹${((categoryGrandTotals.other || 0)/1000).toFixed(0)}K`);
    
    console.log('\n📈 Key Statistics:');
    console.log(`• Total Expense Records: ${totalExpenses}`);
    console.log(`• Total Expenses: ₹${totalAmount.toLocaleString()}`);
    console.log(`• Average Monthly Expenses: ₹${(totalAmount/12).toLocaleString()}`);
    console.log(`• Average Expense Amount: ₹${(totalAmount/totalExpenses).toLocaleString()}`);
    
    console.log('\n📊 Category Breakdown:');
    Object.entries(categoryGrandTotals).forEach(([category, amount]) => {
      const percentage = ((amount / totalAmount) * 100).toFixed(1);
      console.log(`• ${category.charAt(0).toUpperCase() + category.slice(1)}: ₹${amount.toLocaleString()} (${percentage}%)`);
    });
    
  } catch (error) {
    console.error('❌ Error generating historical expense data:', error);
    throw error;
  }
}

// Export the function
module.exports = { generateHistoricalExpenseData };

// Run the generation if this file is executed directly
if (require.main === module) {
  generateHistoricalExpenseData()
    .then(() => {
      console.log('✅ Historical expense data generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Historical expense data generation failed:', error);
      process.exit(1);
    });
}