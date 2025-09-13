# AI Image Generator Setup Guide

## 🚀 **Complete Setup Instructions**

### **Step 1: Google Cloud Console Setup**

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create one if you don't have one)

2. **Enable Required APIs:**
   - Go to "APIs & Services" → "Library"
   - Search and enable these APIs:
     - **Vertex AI API**
     - **Cloud Vision API**
     - **Cloud Storage API**
     - **Cloud Functions API**

### **Step 2: Create Service Account**

1. **Go to IAM & Admin:**
   - Navigate to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"

2. **Configure Service Account:**
   - **Name**: `kala-sarthi-ai-service`
   - **Description**: `Service account for AI image generation`
   - **Roles**: Add these roles:
     - `Vertex AI User`
     - `Storage Admin`
     - `Vision API User`

3. **Download Key:**
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Download the file

### **Step 3: Create Cloud Storage Bucket**

1. **Go to Cloud Storage:**
   - Navigate to "Cloud Storage" → "Buckets"
   - Click "Create Bucket"

2. **Configure Bucket:**
   - **Name**: `kala-sarthi-images` (or your preferred name)
   - **Location**: Choose your preferred region
   - **Storage Class**: Standard
   - **Access Control**: Uniform

### **Step 4: Environment Variables**

Add these to your `.env.local` file:

```env
# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
GCP_PROJECT_ID=your-gcp-project-id
GCP_BUCKET_NAME=kala-sarthi-images
GCP_REGION=us-central1

# Image Generation Settings
MAX_IMAGE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
GENERATION_QUALITY=high

# API Limits
MAX_GENERATIONS_PER_REQUEST=5
RATE_LIMIT_PER_MINUTE=10
```

### **Step 5: Install Dependencies**

The required packages are already installed:
- `@google-cloud/vision`
- `@google-cloud/vertexai`
- `@google-cloud/storage`
- `multer`
- `sharp`

### **Step 6: Test the Setup**

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Visit the AI Image Generator:**
   - Go to: http://localhost:9002/ai-image-generator

3. **Test with a sample image:**
   - Upload a product image
   - Click "Analyze Image"
   - Select a style and colors
   - Click "Generate Variations"

## 🎯 **Features Available**

### **Image Analysis:**
- Product type detection
- Material identification
- Color extraction
- Confidence scoring

### **Style Options:**
- Vibrant Colors
- Pastel Tones
- Monochrome
- Vintage Style
- Modern Minimalist
- Traditional

### **Color Variations:**
- Red, Blue, Green, Yellow
- Purple, Orange, Pink, Brown
- Custom color combinations

### **Generation Features:**
- Multiple style variations
- Color palette changes
- High-quality output
- Download functionality

## 💰 **Cost Estimation**

With your $300 GCP credits:
- **Vision API**: ~$1.50 per 1,000 images
- **Imagen**: ~$0.02 per image generated
- **Storage**: ~$0.02 per GB per month
- **Estimated**: Should last for thousands of generations

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **"Service account not found"**
   - Check the path to your JSON key file
   - Ensure the service account has correct permissions

2. **"Bucket not found"**
   - Verify the bucket name in environment variables
   - Check if the bucket exists in your GCP project

3. **"API not enabled"**
   - Go to GCP Console and enable the required APIs
   - Wait a few minutes for activation

4. **"Permission denied"**
   - Check service account roles
   - Ensure all required permissions are granted

### **Testing Steps:**

1. **Test Vision API:**
   ```bash
   curl -X POST http://localhost:9002/api/ai-image/analyze \
     -F "image=@test-image.jpg"
   ```

2. **Test Image Generation:**
   ```bash
   curl -X POST http://localhost:9002/api/ai-image/generate \
     -H "Content-Type: application/json" \
     -d '{"originalImageUrl":"test-url","style":"vibrant","colors":["red","blue"]}'
   ```

## 📱 **Usage Instructions**

1. **Upload Image**: Select a product image (JPEG, PNG, WebP)
2. **Analyze**: Click "Analyze Image" to understand the product
3. **Customize**: Choose style and colors for variations
4. **Generate**: Click "Generate Variations" to create new images
5. **Download**: Download individual generated images

## 🎨 **Supported Product Types**

- Pottery & Ceramics
- Textiles & Fabrics
- Jewelry & Accessories
- Woodwork & Furniture
- Metalwork & Tools
- Basketry & Woven Items

## 📊 **Performance Tips**

- Use high-quality input images for better results
- Limit color selections to 3-5 for faster generation
- Choose appropriate styles for your product type
- Monitor API usage in GCP Console

## 🔒 **Security Notes**

- Keep your service account key file secure
- Don't commit the key file to version control
- Use environment variables for configuration
- Regularly rotate service account keys

---

**Ready to start generating amazing product variations!** 🚀
