# Demo Login Guide for Judges

## Quick Access to KalaSarthi Platform

We've implemented a **Demo Login** feature to make it easy for judges and evaluators to explore the KalaSarthi platform without going through the full authentication process.

## How to Use Demo Login

### Option 1: Demo Login from Header (Fastest!)

1. When not logged in, look at the top-right corner of any page
2. Click the blue **"Demo Login"** button next to "Sign In"
3. You'll be instantly logged in with a test artisan profile
4. Works from any page in the application!

### Option 2: Demo Login from Auth Page

1. Navigate to the authentication page at `/auth`
2. Look for the **"Quick Access for Judges"** section
3. Click the **"Enter as Demo Artisan"** button
4. You'll be instantly logged in with a test artisan profile

### Option 3: Regular Login with Test Credentials

If you prefer to test the full authentication flow:

1. Navigate to the authentication page at `/auth`
2. Use the following test credentials:
   - **Phone Number:** `+919876543210`
   - **OTP:** `123456`

## Demo Profile Details

The demo profile is a fully functional artisan account with:
- **Name:** Test Artisan
- **Phone:** +919876543210
- **Role:** Artisan
- **Profession:** Pottery/Ceramics (or as configured)
- Access to all artisan features including:
  - Product creation and management
  - Trend Spotter
  - AI Design Generator
  - Market insights
  - Profile management
  - And more...

## Demo Mode Indicator

When logged in via demo mode, you'll see a **"DEMO"** badge in the header (top-left corner) to remind you that you're using a test account.

## Quick Access from Anywhere

The **Demo Login** button is available in the header on every page when you're not logged in, making it incredibly easy to access the platform from anywhere in the application without navigating to the auth page.

## Features Available in Demo Mode

All features work exactly the same as with regular authentication:
- ✅ Full dashboard access
- ✅ Product creation and editing
- ✅ Marketplace browsing
- ✅ AI-powered tools
- ✅ Trend analysis
- ✅ Profile management
- ✅ Offline mode support
- ✅ Voice navigation
- ✅ Multi-language support

## Logging Out

To log out from demo mode:
1. Click on your profile avatar in the header
2. Select "Logout" from the dropdown menu
3. You'll be redirected back to the authentication page

## Technical Implementation

The demo login feature:
- **Bypasses Firebase authentication** for quick access
- **Fetches the real user profile** from the database
- **Maintains session persistence** using localStorage
- **Does not affect** regular authentication functionality
- **Is completely isolated** from production authentication flows

## Security Note

This demo login is designed specifically for evaluation purposes and should be disabled or restricted in production environments.

## Support

If you encounter any issues with demo login, please contact the development team or use the regular authentication method as a fallback.

---

**Happy Exploring! 🎨**
