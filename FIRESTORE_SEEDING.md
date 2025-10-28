# Firestore Test Data Seeding

This document explains how to populate your Firestore database with test users for the Enhanced Multilingual Chat feature.

## Overview

The seeding script creates:
- **10 Artisans** with different specializations (pottery, jewelry, textiles, woodwork, metalwork, painting)
- **10 Buyers** with various professions (collectors, designers, hotel owners, etc.)
- **Complete user profiles** with enhanced data for AI-powered matching and chat features

## Prerequisites

1. **Firebase Project Setup**: Ensure your Firebase project is configured
2. **Environment Variables**: Make sure your `.env` file contains all required Firebase configuration
3. **Dependencies**: Install required packages (firebase, dotenv)

## Required Environment Variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Running the Seeding Script

### Option 1: Using npm script (Recommended)
```bash
npm run seed:firestore
```

### Option 2: Direct execution
```bash
node scripts/run-seed.js
```

## What Gets Created

### Artisan Profiles
Each artisan gets a complete profile with:
- **Basic Info**: Name, email, phone, address, profile image
- **Specialization**: pottery, jewelry, textiles, woodwork, metalwork, painting
- **Business Details**: Hours, response time, minimum order value
- **Skills & Certifications**: Verified skills and traditional certifications
- **Performance Metrics**: Success rates, customer satisfaction, order history
- **Location Data**: Coordinates, delivery radius, service areas
- **AI Matching Data**: Skills, materials, techniques, experience level

### Buyer Profiles
Each buyer gets:
- **Basic Info**: Name, email, phone, address, profile image
- **Profession**: collector, interior_designer, fashion_designer, hotel_owner, etc.
- **Preferences**: Language, communication settings, price range
- **Cultural Interests**: Traditional art, folk music, festivals, etc.
- **AI Preferences**: Recommendation style, quality preference
- **Behavior Analytics**: Session data, engagement scores

## Test Users Created

### Artisans
1. **Rajesh Kumar** (pottery) - Jaipur, Rajasthan
2. **Priya Sharma** (jewelry) - Jaipur, Rajasthan  
3. **Amit Verma** (textiles) - Varanasi, Uttar Pradesh
4. **Lakshmi Devi** (woodwork) - Mysore, Karnataka
5. **Ravi Patel** (metalwork) - Moradabad, Uttar Pradesh
6. **Sunita Singh** (painting) - Madhubani, Bihar
7. **Kiran Joshi** (pottery) - Khurja, Uttar Pradesh
8. **Meera Agarwal** (jewelry) - Pushkar, Rajasthan
9. **Deepak Gupta** (textiles) - Bagru, Rajasthan
10. **Kavita Reddy** (woodwork) - Bangalore, Karnataka

### Buyers
1. **Anita Mehta** (collector) - Mumbai, Maharashtra
2. **Rohit Kapoor** (interior_designer) - New Delhi, Delhi
3. **Sneha Iyer** (fashion_designer) - Bangalore, Karnataka
4. **Vikram Singh** (hotel_owner) - Udaipur, Rajasthan
5. **Pooja Nair** (event_planner) - Kochi, Kerala
6. **Arjun Malhotra** (architect) - Chandigarh, Punjab
7. **Divya Sharma** (boutique_owner) - New Delhi, Delhi
8. **Rajesh Agarwal** (gallery_owner) - Mumbai, Maharashtra
9. **Nisha Patel** (home_decorator) - Ahmedabad, Gujarat
10. **Suresh Kumar** (export_business) - Chennai, Tamil Nadu

## Features Enabled by Test Data

With this seeded data, you can test:

1. **Enhanced Chat Interface**: Real conversations between artisans and buyers
2. **Artisan Tools Panel**: Design generation based on artisan specializations
3. **AI-Powered Matching**: Intelligent artisan-buyer matching
4. **Multilingual Support**: Users with different language preferences
5. **Location-Based Services**: Geographic matching and delivery options
6. **Performance Analytics**: Metrics and ratings for artisans

## Verification

After seeding, you can verify the data by:

1. **Firebase Console**: Check the `users` collection in Firestore
2. **Enhanced Chat Page**: Visit `/enhanced-chat` to see test conversations
3. **API Testing**: Use the user IDs in API calls

## Cleanup

To remove test data (if needed):
```javascript
// Run in Firebase console or create a cleanup script
const batch = db.batch();
const usersRef = db.collection('users');
const snapshot = await usersRef.where('uid', '>=', 'artisan_001').where('uid', '<=', 'buyer_010').get();
snapshot.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Ensure all Firebase config variables are set in `.env`
   - Check variable names match exactly

2. **Permission Errors**
   - Verify Firestore security rules allow writes
   - Check Firebase project permissions

3. **Network Issues**
   - Ensure stable internet connection
   - Check Firebase project status

### Getting Help

If you encounter issues:
1. Check the console output for specific error messages
2. Verify Firebase project configuration
3. Ensure Firestore is enabled in your Firebase project
4. Check security rules allow document creation

## Next Steps

After seeding:
1. Test the Enhanced Chat interface with different user roles
2. Try the Artisan Tools Panel with various specializations
3. Test multilingual features with different language preferences
4. Explore AI-powered design generation and sharing features