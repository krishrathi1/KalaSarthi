# Environment Variables Setup

## 📝 **Create .env.local file**

Create a `.env.local` file in your project root with these variables:

```env
# Google Cloud Configuration for AI Image Generation
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/kala-sarthi-ai-service-key.json
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

## 🔧 **How to Fill in the Values:**

### **1. GOOGLE_APPLICATION_CREDENTIALS**
- Path to your downloaded JSON key file
- Example: `/Users/amishapaliwal/Downloads/kala-sarthi-ai-service-key.json`
- Or: `./keys/kala-sarthi-ai-service-key.json` (if you put it in a keys folder)

### **2. GCP_PROJECT_ID**
- Your Google Cloud Project ID
- Found in: Google Cloud Console → Project Settings
- Example: `my-awesome-project-123456`

### **3. GCP_BUCKET_NAME**
- The bucket name you created
- Example: `kala-sarthi-images`

### **4. GCP_REGION**
- The region where your bucket is located
- Example: `us-central1`, `us-east1`, `europe-west1`

## 🚨 **Important Security Notes:**

1. **Never commit .env.local to git**
2. **Keep your JSON key file secure**
3. **Don't share these credentials**
4. **Use absolute paths for GOOGLE_APPLICATION_CREDENTIALS**

## ✅ **Test Your Setup:**

After setting up the environment variables, test with:

```bash
npm run dev
```

Then visit: `  http://localhost:9002/ai-image-generator`
