# Hugging Face API Setup Guide

## Quick Setup (5 minutes)

### 1. Create Hugging Face Account
1. Go to [huggingface.co](https://huggingface.co)
2. Sign up for a free account
3. Verify your email

### 2. Get API Token
1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Click "New token"
3. Name it "KalaSarthi AI"
4. Select "Read" permission
5. Copy the token

### 3. Add to Environment
Create or update `.env.local` file in your project root:

```bash
# Hugging Face API (Free tier available)
HUGGINGFACE_API_KEY=your_token_here
```

### 4. Restart Server
```bash
npm run dev
```

## How It Works

### Models Used
- **Stable Diffusion v1.5** - High quality general images
- **Stable Diffusion XL** - Ultra high quality
- **Realistic Vision** - Photorealistic images
- **Anime/Cartoon** - Stylized variations

### Features
- ✅ **Free Tier** - 1000 requests/month
- ✅ **No Credit Card** required
- ✅ **Multiple Models** - Automatic model selection
- ✅ **Real AI Generation** - Creates actual new images
- ✅ **Fallback Support** - Falls back to Google Cloud or demo mode

### API Limits
- **Free Tier**: 1000 requests/month
- **Paid Tier**: $9/month for 10,000 requests
- **Rate Limit**: 1 request per second

## Testing

1. Upload an image
2. Add description: "Show this product in different colors"
3. Click "Generate Variations"
4. You should see **real AI-generated images**!

## Troubleshooting

### "API key not configured"
- Make sure `HUGGINGFACE_API_KEY` is in `.env.local`
- Restart the server after adding the key

### "Rate limit exceeded"
- Wait a few seconds between requests
- Consider upgrading to paid tier

### "Model loading" delay
- First request to a model takes 30-60 seconds
- Subsequent requests are faster

## Alternative: Google Cloud Setup

If you prefer Google Cloud (more complex but higher quality):

1. Follow `AI_IMAGE_SETUP.md`
2. Set up `GOOGLE_APPLICATION_CREDENTIALS`
3. Set up `GCP_PROJECT_ID`

The system will automatically try Hugging Face first, then Google Cloud, then demo mode.
