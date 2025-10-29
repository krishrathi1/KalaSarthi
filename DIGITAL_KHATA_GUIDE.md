# Digital Khata - Complete Guide

## 🎯 Overview

Digital Khata is a comprehensive financial tracking system for artisans to manage their sales, track revenue, and analyze business performance. All amounts are displayed in Indian Rupees (₹).

## ✅ What's Been Implemented

### 1. **Mock Sales Data** ✅
- Created 50 sales transactions per artisan
- Realistic product catalog for each craft type:
  - **Pottery**: Water pots, vases, dinner plates, cups, plant pots
  - **Jewelry**: Kundan necklaces, tribal earrings, Meenakari bracelets
  - **Woodworking**: Hotel doors, restaurant furniture, reception desks
  - **Textiles**: Silk sarees, cotton fabric, cushion covers, carpets

### 2. **Craft Items Registered** ✅
- Each artisan has 5 unique products
- Products include:
  - Name, description, price (in ₹)
  - Category, materials, dimensions
  - Crafting time, stock status
  - Realistic pricing (₹450 - ₹45,000)

### 3. **Sales Analytics** ✅
- **Total Revenue**: Sum of all completed sales
- **Total Orders**: Number of transactions
- **Average Order Value**: Revenue per transaction
- **Top Products**: Best sellers by revenue
- **Monthly Trends**: Revenue growth over time
- **Recent Sales**: Latest transactions with buyer info

### 4. **Indian Rupee (₹) Integration** ✅
- All currency displays use ₹ symbol
- Indian number formatting (e.g., ₹1,25,000)
- Proper locale formatting for dates and numbers

## 📁 Files Created

### Components
- `src/components/DigitalKhata.tsx` - Main dashboard component

### API Routes
- `src/app/api/finance/sales/route.ts` - Sales data API

### Pages
- `src/app/digital-khata/page.tsx` - Digital Khata page

### Scripts
- `scripts/seed-sales-data.js` - Seed mock sales data
- `scripts/seed-firestore-users.js` - Seed artisan profiles and products

## 🚀 How to Use

### 1. Seed the Data

First, make sure you have artisan profiles:
```bash
node scripts/seed-firestore-users.js
```

Then, seed the sales data:
```bash
node scripts/seed-sales-data.js
```

### 2. Access the Dashboard

Visit: `http://localhost:9003/digital-khata`

### 3. View Different Artisans

The component accepts an `artisanId` prop:
```tsx
<DigitalKhata artisanId="artisan_001" /> // Pottery
<DigitalKhata artisanId="artisan_002" /> // Jewelry
<DigitalKhata artisanId="artisan_003" /> // Woodworking
```

## 📊 Features

### Key Metrics Cards
1. **Total Revenue** - Shows growth percentage
2. **Total Orders** - With units sold
3. **Average Order Value** - Per transaction
4. **Top Product** - Best seller by revenue

### Tabs
1. **Overview** - Monthly revenue trend
2. **Top Products** - Best sellers ranked by revenue
3. **Recent Sales** - Latest transactions

### Period Filters
- Week
- Month
- Year

### Actions
- **Refresh** - Reload data
- **Export** - Download reports (placeholder)

## 💾 Data Structure

### Sales Event
```typescript
{
  id: string;
  artisanId: string;
  productId: string;
  productName: string;
  category: string;
  buyerName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: 'INR';
  paymentStatus: 'completed' | 'pending';
  paymentMethod: string;
  channel: string;
  timestamp: Date;
}
```

### Product
```typescript
{
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'INR';
  category: string;
  materials: string[];
  dimensions: string;
  weight: string;
  craftingTime: string;
  inStock: boolean;
}
```

## 📈 Sample Data

### Artisan 001 (Pottery)
- **Products**: 5 items (₹450 - ₹2,400)
- **Sales**: 50 transactions
- **Revenue**: ~₹125,000/month
- **Top Product**: Traditional Terracotta Water Pot

### Artisan 002 (Jewelry)
- **Products**: 5 items (₹2,500 - ₹15,000)
- **Sales**: 50 transactions
- **Revenue**: ~₹280,000/month
- **Top Product**: Traditional Kundan Necklace

### Artisan 003 (Woodworking)
- **Products**: 5 items (₹12,000 - ₹45,000)
- **Sales**: 50 transactions
- **Revenue**: ~₹850,000/month
- **Top Product**: Restaurant Wooden Furniture Set

## 🎨 UI Features

### Responsive Design
- Mobile-first approach
- Adapts to all screen sizes
- Touch-friendly buttons

### Visual Indicators
- Growth arrows (↑ green, ↓ red)
- Status badges (completed/pending)
- Product rankings (1, 2, 3...)
- Loading states

### Indian Formatting
- Currency: ₹1,25,000 (Indian style)
- Dates: "30 Oct, 02:30 PM"
- Numbers: Comma-separated Indian format

## 🔧 Customization

### Change Currency Display
In `DigitalKhata.tsx`:
```typescript
const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString('en-IN')}`;
};
```

### Add More Metrics
Add new cards in the metrics grid:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Your Metric</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">Value</div>
  </CardContent>
</Card>
```

### Customize Products
Edit `productCatalog` in `scripts/seed-sales-data.js`:
```javascript
const productCatalog = {
  'artisan_001': [
    { 
      name: 'Your Product', 
      price: 1000, 
      category: 'category' 
    }
  ]
};
```

## 📱 API Endpoints

### GET /api/finance/sales
Fetch sales data for an artisan

**Query Parameters:**
- `artisanId` - Artisan ID (default: 'artisan_001')
- `period` - Time period ('week', 'month', 'year')

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 125000,
    "totalOrders": 45,
    "totalUnits": 78,
    "averageOrderValue": 2778,
    "topProducts": [...],
    "recentSales": [...],
    "monthlyTrend": [...]
  }
}
```

## 🐛 Troubleshooting

### No Data Showing
1. Check if Firestore is initialized
2. Run seed scripts
3. Check browser console for errors
4. Verify artisanId exists

### Currency Not Showing ₹
1. Check locale settings
2. Verify formatCurrency function
3. Clear browser cache

### Sales Data Not Loading
1. Check Firebase credentials in `.env`
2. Verify Firestore collections exist
3. Check API route logs
4. Falls back to mock data automatically

## 🎯 Next Steps

### Enhancements You Can Add:
1. **Expense Tracking** - Add expense management
2. **Profit Calculation** - Revenue - Expenses
3. **Charts** - Visual graphs for trends
4. **Filters** - Filter by product, date, payment status
5. **Export** - Download CSV/PDF reports
6. **Notifications** - Alert on new sales
7. **Multi-currency** - Support other currencies
8. **Tax Calculations** - GST calculations
9. **Invoice Generation** - Create invoices
10. **Payment Integration** - Accept online payments

## 📞 Support

If you encounter issues:
1. Check Firestore console for data
2. Verify all environment variables
3. Check browser console for errors
4. Review API logs

## 🎉 Success Checklist

- [x] Mock sales data created
- [x] Craft items registered for artisans
- [x] Indian Rupee (₹) symbol used
- [x] Sales analytics dashboard
- [x] Top products ranking
- [x] Recent transactions list
- [x] Monthly revenue trends
- [x] Responsive design
- [x] API endpoints working
- [x] Firestore integration

---

**Your Digital Khata is ready to use!** 🚀

Visit: http://localhost:9003/digital-khata
