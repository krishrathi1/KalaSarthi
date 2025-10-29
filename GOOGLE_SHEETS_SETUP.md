# Google Sheets API Setup Guide

## ✅ YES! You Can Use Your Existing Service Account!

You already have `key.json` for Firebase/Firestore. You can use the **SAME** service account for Google Sheets!

## 🚀 Quick Setup (3 Steps)

### Step 1: Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: **`kalamitra-470611`** (or your project)
3. Go to **APIs & Services** → **Library**
4. Search for **"Google Sheets API"**
5. Click **Enable**

That's it! Your existing `key.json` will work!

### Step 2: Install googleapis Package

```bash
npm install googleapis
```

### Step 3: Test It!

```bash
# Visit Digital Khata
http://localhost:9003/digital-khata

# Click "Quick Actions" tab
# Click "Export to Google Sheets"
# Sheet will be created automatically!
```

## 📊 How It Works

### Using Your Existing Service Account

```typescript
// The API uses your key.json
const serviceAccount = require('../../../../../key.json');

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
```

### What Gets Created

When you export, a new Google Sheet is created with:

**4 Tabs:**
1. **Summary** - Total revenue, orders, units, avg order value
2. **Top Products** - Best sellers ranked by revenue
3. **Recent Sales** - Latest transactions with buyer info
4. **Monthly Trend** - Revenue and orders by month

**Formatting:**
- ✅ Bold headers
- ✅ Auto-resized columns
- ✅ Indian Rupee (₹) formatting
- ✅ Professional layout

### Sheet Ownership

- Sheet is created by the service account
- Owned by: `tts-658@gen-lang-client-0314311341.iam.gserviceaccount.com`
- You can access it via the URL returned
- To share with others, use Google Sheets sharing

## 🔧 Configuration

### Your Existing key.json

```json
{
  "type": "service_account",
  "project_id": "gen-lang-client-0314311341",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "tts-658@gen-lang-client-0314311341.iam.gserviceaccount.com",
  ...
}
```

This already works! No changes needed!

### Required Scopes

The API needs this scope (automatically handled):
```
https://www.googleapis.com/auth/spreadsheets
```

## 📱 Usage

### From Digital Khata

```typescript
// Click "Export to Google Sheets" button
// System will:
1. Load your key.json
2. Authenticate with Google
3. Create new spreadsheet
4. Write data to 4 tabs
5. Format the sheets
6. Return URL to open
```

### API Endpoint

```typescript
POST /api/google-sheets/export

Body:
{
  summary: {
    totalRevenue: 125000,
    totalOrders: 45,
    totalUnits: 78,
    averageOrderValue: 2778,
    period: "month"
  },
  topProducts: [...],
  recentSales: [...],
  monthlyTrend: [...]
}

Response:
{
  success: true,
  sheetsUrl: "https://docs.google.com/spreadsheets/d/...",
  spreadsheetId: "...",
  message: "Data exported successfully"
}
```

## 🎯 Features

### Automatic Formatting

- **Bold Headers** - First row in each sheet
- **Auto-resize** - Columns fit content
- **Currency** - ₹ symbol with Indian formatting
- **Dates** - Indian locale format

### Multiple Sheets

Each export creates 4 organized tabs:

```
📊 Summary
   - Key metrics
   - Period info
   - Export date

📦 Top Products
   - Ranked by revenue
   - Units sold
   - % of total

💰 Recent Sales
   - Transaction details
   - Buyer names
   - Payment status

📈 Monthly Trend
   - Revenue by month
   - Order counts
   - Growth tracking
```

## 🔐 Security

### Service Account Permissions

Your service account needs:
- ✅ Google Sheets API enabled
- ✅ Spreadsheets scope access

### Data Privacy

- Sheets are created in service account's Drive
- Not publicly accessible by default
- Share manually if needed

### Best Practices

```typescript
// Sheets are owned by service account
// To share with users:
1. Get the sheet URL
2. Click "Share" in Google Sheets
3. Add user emails
4. Set permissions (view/edit)
```

## 🐛 Troubleshooting

### Error: "Google Sheets API has not been enabled"

**Solution:**
```
1. Go to Google Cloud Console
2. APIs & Services → Library
3. Search "Google Sheets API"
4. Click Enable
```

### Error: "Permission denied"

**Solution:**
```
1. Check key.json is in project root
2. Verify service account has Sheets API enabled
3. Check scopes in auth configuration
```

### Error: "Cannot find module 'googleapis'"

**Solution:**
```bash
npm install googleapis
```

### Sheet Created But Can't Access

**Solution:**
```
1. Copy the sheet URL from response
2. Open in browser
3. You'll see it (owned by service account)
4. Click Share to add your email
```

## 📊 Example Output

### Sheet URL Format
```
https://docs.google.com/spreadsheets/d/1ABC...XYZ/edit
```

### Sheet Title Format
```
Digital Khata - month - 30/10/2024
```

### Data Format

**Summary Tab:**
```
Digital Khata Sales Report
Period          month
Export Date     30/10/2024, 3:45:00 PM

Metric                  Value
Total Revenue          ₹1,25,000
Total Orders           45
Total Units            78
Average Order Value    ₹2,778
```

**Top Products Tab:**
```
Rank  Product Name                        Revenue    Units  % of Total
1     Traditional Terracotta Water Pot    ₹34,000    40     27%
2     Decorative Ceramic Vase             ₹28,800    24     23%
3     Set of Clay Dinner Plates           ₹26,400    11     21%
```

## 🎉 Benefits

### Why Use Google Sheets?

✅ **Collaborative** - Share with team
✅ **Familiar** - Everyone knows Sheets
✅ **Powerful** - Built-in formulas & charts
✅ **Accessible** - Access from anywhere
✅ **Automated** - No manual data entry
✅ **Professional** - Clean formatting
✅ **Integrated** - Works with other Google tools

### vs CSV Export

| Feature | Google Sheets | CSV |
|---------|--------------|-----|
| Multiple tabs | ✅ | ❌ |
| Formatting | ✅ | ❌ |
| Formulas | ✅ | ❌ |
| Collaboration | ✅ | ❌ |
| Auto-update | ✅ | ❌ |
| Charts | ✅ | ❌ |

## 🚀 Next Steps

### 1. Enable API (1 minute)
```
Google Cloud Console → APIs & Services → Enable Google Sheets API
```

### 2. Install Package (30 seconds)
```bash
npm install googleapis
```

### 3. Test Export (10 seconds)
```
Digital Khata → Quick Actions → Export to Google Sheets
```

### 4. Access Your Sheet
```
Click the URL in the success message
```

## 📞 Support

### Common Questions

**Q: Do I need a new service account?**
A: No! Use your existing `key.json`

**Q: Will this cost money?**
A: No! Google Sheets API is free for normal usage

**Q: Can I automate exports?**
A: Yes! Call the API endpoint programmatically

**Q: Can multiple users access the sheet?**
A: Yes! Share it from Google Sheets

**Q: What if API is not enabled?**
A: System falls back to CSV export automatically

## ✅ Checklist

- [ ] Google Sheets API enabled in Cloud Console
- [ ] `googleapis` package installed
- [ ] `key.json` file in project root
- [ ] Tested export from Digital Khata
- [ ] Successfully opened created sheet
- [ ] Shared sheet with team (if needed)

---

**You're ready to use Google Sheets export!** 🎉

Just enable the API and install the package - your existing `key.json` handles everything else!
