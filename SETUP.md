# KalaBandhu Setup Guide

## Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

### Required for Image Upload (Cloudinary)
```bash
# Get these from https://cloudinary.com/
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_here
```

### Optional - For Full Functionality
```bash
# MongoDB (for user data, cart, wishlist)
MONGODB_URI=mongodb://localhost:27017/kalabandhu

# Firebase (for authentication)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Google AI (for AI features)
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

## Quick Setup Steps

1. **Clone and Install**
   ```bash
   git clone https://github.com/ArnavGoel28/KalaBandhu.git
   cd KalaBandhu
   npm install
   ```

2. **Set up Cloudinary (Required for image uploads)**
   - Go to [cloudinary.com](https://cloudinary.com/) and create a free account
   - Get your Cloud Name from the dashboard
   - Create an Upload Preset (Settings > Upload > Upload presets)
   - Add these to your `.env.local` file

3. **Run the Application**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Open [http://localhost:9002](http://localhost:9002)

## Current Status

✅ **Fixed Issues:**
- Next.js 15 async params compatibility
- Cloudinary configuration with fallback for development
- Mongoose duplicate index warnings
- AI analysis error handling with fallback responses

⚠️ **Development Mode:**
- The app runs in development mode with mock responses for missing services
- Image uploads will work with proper Cloudinary setup
- AI features have fallback responses when API keys are missing

## Features Working

- ✅ Basic application structure
- ✅ Image upload (with Cloudinary setup)
- ✅ Product creation and management
- ✅ Cart and wishlist functionality
- ✅ User authentication (with Firebase setup)
- ✅ AI-powered product analysis (with Google AI setup)

## Troubleshooting

### Cloudinary Errors
If you see "Upload preset not found" errors:
1. Make sure you've created an upload preset in Cloudinary
2. Set `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` in your `.env.local`
3. For development, the app will use mock responses if Cloudinary isn't configured

### AI Analysis Errors
If AI analysis fails:
- The app will return fallback analysis data
- Set up Google AI API key for full AI functionality

### Database Errors
- MongoDB is optional for basic functionality
- Cart and wishlist data will be stored in browser localStorage as fallback
