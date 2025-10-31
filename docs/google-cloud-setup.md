# Google Cloud APIs Setup Guide

This guide explains how to enable the required Google Cloud APIs for the multilingual audio features.

## Required APIs

The multilingual chat system requires the following Google Cloud APIs:

1. **Cloud Speech-to-Text API** - For voice recognition
2. **Cloud Text-to-Speech API** - For voice synthesis  
3. **Cloud Translation API** - For text translation

## Current Status

The system is currently using **fallback mock services** because the Google Cloud APIs are not enabled for project `525551372559`.

## How to Enable APIs

### 1. Enable Cloud Speech-to-Text API

Visit: https://console.developers.google.com/apis/api/speech.googleapis.com/overview?project=525551372559

Click "Enable" to activate the API.

### 2. Enable Cloud Text-to-Speech API

Visit: https://console.developers.google.com/apis/api/texttospeech.googleapis.com/overview?project=525551372559

Click "Enable" to activate the API.

### 3. Enable Cloud Translation API

Visit: https://console.developers.google.com/apis/api/translate.googleapis.com/overview?project=525551372559

Click "Enable" to activate the API.

## Fallback Behavior

When the APIs are not enabled, the system automatically falls back to mock services:

### STT Fallback
- Returns predefined responses in multiple languages
- Maintains the same API interface
- Provides realistic confidence scores
- Includes audio quality analysis

### TTS Fallback  
- Generates silent audio buffers
- Maintains voice selection logic
- Provides duration estimates
- Includes cultural context metadata

### Translation Fallback
- Uses built-in craft terminology database
- Provides basic translations for common phrases
- Maintains cultural preservation features
- Returns lower confidence scores

## Benefits of Enabling APIs

Once the Google Cloud APIs are enabled, you'll get:

### Enhanced STT
- Real speech recognition from audio
- Support for 13+ Indian languages
- Accurate transcription with timing
- Advanced noise filtering

### Enhanced TTS
- Natural voice synthesis
- Cultural voice selection
- Regional accent support
- High-quality audio output

### Enhanced Translation
- Professional translation quality
- Context-aware translations
- Glossary integration
- Higher confidence scores

## Testing

You can test the current fallback implementation:

1. **Voice Input**: The system will return predefined responses
2. **Voice Output**: The system will generate silent audio
3. **Translation**: The system will use craft terminology database

## Cost Considerations

Google Cloud APIs have usage-based pricing:

- **Speech-to-Text**: ~$0.006 per 15 seconds
- **Text-to-Speech**: ~$4.00 per 1M characters  
- **Translation**: ~$20 per 1M characters

For development and testing, the free tier provides:
- Speech-to-Text: 60 minutes/month free
- Text-to-Speech: 1M characters/month free
- Translation: 500K characters/month free

## Environment Variables

Ensure these are set in your `.env` file:

```env
GOOGLE_CLOUD_PROJECT_ID=525551372559
GOOGLE_APPLICATION_CREDENTIALS=./key.json
```

## Verification

After enabling the APIs, restart the application. You should see:

```
✅ Google Cloud TTS and STT services available via API routes
🎵 Natural voice synthesis and advanced speech recognition enabled
```

Instead of:

```
⚠️ STT using fallback service
⚠️ TTS using fallback service
```

## Support

If you encounter issues:

1. Verify the APIs are enabled in the Google Cloud Console
2. Check that billing is enabled for the project
3. Ensure the service account has proper permissions
4. Wait a few minutes after enabling APIs for propagation

The fallback services ensure the application continues to work while you set up the APIs.