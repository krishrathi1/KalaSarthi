# Google Cloud Voice Integration

This directory contains comprehensive voice integration components using Google Cloud Text-to-Speech API with support for multiple languages and voices.

## Components

### 1. VoiceIntegration
A reusable component that can be integrated anywhere in the application.

```tsx
import { VoiceIntegration } from '@/components/voice/VoiceIntegration';

<VoiceIntegration
  text="Hello, world!"
  language="en-US"
  autoPlay={false}
  showControls={true}
  onVoiceChange={(voice) => console.log('Voice changed:', voice)}
  onLanguageChange={(language) => console.log('Language changed:', language)}
/>
```

### 2. VoiceManager
A comprehensive voice selection and management component.

```tsx
import { VoiceManager } from '@/components/voice/VoiceManager';

<VoiceManager
  onVoiceChange={(voice, language) => console.log('Voice:', voice, 'Language:', language)}
  initialLanguage="en-US"
  initialVoice="en-US-Neural2-A"
/>
```

### 3. VoiceDemo
A full-featured demo component showcasing all available voices and features.

```tsx
import { VoiceDemo } from '@/components/voice/VoiceDemo';

<VoiceDemo />
```

## Features

### Supported Languages
- **English**: US, UK, India
- **Hindi**: India
- **Bengali**: India
- **Gujarati**: India
- **Tamil**: India
- **Telugu**: India
- **Kannada**: India
- **Malayalam**: India
- **Marathi**: India
- **Punjabi**: India
- **Odia**: India
- **Assamese**: India
- **Urdu**: Pakistan
- **Nepali**: Nepal

### Voice Qualities
- **Neural2**: Highest quality, most natural sounding
- **Wavenet**: High quality, good balance
- **Standard**: Basic quality, faster processing

### Voice Characteristics
- **Gender**: Male, Female
- **Age**: Young, Adult, Senior
- **Personality**: Professional, Friendly, Warm, Authoritative
- **Accent**: Regional accents for different languages

## API Endpoints

### 1. Enhanced TTS API
```
POST /api/tts/enhanced
```

**Request Body:**
```json
{
  "text": "Hello, world!",
  "language": "en-US",
  "voice": "en-US-Neural2-A",
  "gender": "FEMALE",
  "quality": "Neural2",
  "speed": 1.0,
  "pitch": 0.0,
  "volume": 1.0,
  "enableTranslation": false,
  "sourceLanguage": "en"
}
```

**Response:**
```json
{
  "success": true,
  "audio": {
    "data": "base64-encoded-audio",
    "format": "MP3",
    "sampleRate": 24000
  },
  "voice": {
    "name": "en-US-Neural2-A",
    "language": "en-US",
    "gender": "FEMALE",
    "quality": "Neural2"
  },
  "text": {
    "original": "Hello, world!",
    "processed": "Hello, world!",
    "translated": false
  }
}
```

### 2. Languages API
```
GET /api/voices/languages
```

**Response:**
```json
{
  "success": true,
  "languages": [
    {
      "code": "en-US",
      "name": "English (US)"
    }
  ],
  "total": 15
}
```

### 3. Voices API
```
GET /api/voices/{language}
```

**Response:**
```json
{
  "success": true,
  "language": "en-US",
  "voices": [
    {
      "name": "en-US-Neural2-A",
      "gender": "FEMALE",
      "quality": "Neural2",
      "description": "High-quality female voice",
      "accent": "American",
      "age": "adult",
      "personality": "professional"
    }
  ],
  "defaultVoice": "en-US-Neural2-A",
  "fallbackVoice": "en-US-Standard-A",
  "total": 19
}
```

## Environment Variables

Add these to your `.env.local` file:

```env
# Google Cloud TTS
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_CLIENT_EMAIL=your-client-email
GOOGLE_CLOUD_CLIENT_ID=your-client-id
GOOGLE_CLOUD_CLIENT_X509_CERT_URL=your-cert-url

# Gemini API (for translation)
GEMINI_API_KEY=your-gemini-api-key
```

## Usage Examples

### Basic Usage
```tsx
import { VoiceIntegration } from '@/components/voice/VoiceIntegration';

function MyComponent() {
  return (
    <VoiceIntegration
      text="Welcome to our application!"
      language="en-US"
      showControls={true}
    />
  );
}
```

### Advanced Usage with Callbacks
```tsx
import { VoiceIntegration } from '@/components/voice/VoiceIntegration';
import { useState } from 'react';

function MyComponent() {
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');

  return (
    <VoiceIntegration
      text="Hello, world!"
      language={selectedLanguage}
      autoPlay={false}
      showControls={true}
      onVoiceChange={(voice) => {
        setSelectedVoice(voice);
        console.log('Voice changed:', voice);
      }}
      onLanguageChange={(language) => {
        setSelectedLanguage(language);
        console.log('Language changed:', language);
      }}
    />
  );
}
```

### Voice Manager
```tsx
import { VoiceManager } from '@/components/voice/VoiceManager';

function SettingsPage() {
  const handleVoiceChange = (voice, language) => {
    // Save voice preferences
    localStorage.setItem('preferredVoice', voice.name);
    localStorage.setItem('preferredLanguage', language);
  };

  return (
    <VoiceManager
      onVoiceChange={handleVoiceChange}
      initialLanguage="en-US"
    />
  );
}
```

## Voice Configuration

The voice system uses a comprehensive mapping of voices with the following structure:

```typescript
interface VoiceConfig {
  name: string;                    // Voice identifier
  gender: 'MALE' | 'FEMALE';      // Voice gender
  quality: 'Standard' | 'Wavenet' | 'Neural2' | 'Chirp3-HD';
  description?: string;            // Human-readable description
  accent?: string;                 // Regional accent
  age?: 'young' | 'adult' | 'senior';
  personality?: 'professional' | 'friendly' | 'warm' | 'authoritative';
}
```

## Performance Optimization

1. **Caching**: Audio responses are cached to avoid repeated API calls
2. **Lazy Loading**: Voice lists are loaded only when needed
3. **Connection Pooling**: TTS client is reused across requests
4. **Error Handling**: Graceful fallbacks for failed requests

## Browser Support

- Chrome 66+
- Firefox 60+
- Safari 11.1+
- Edge 79+

## Troubleshooting

### Common Issues

1. **"Google Cloud TTS not available"**
   - Check your environment variables
   - Verify your Google Cloud credentials
   - Ensure the Text-to-Speech API is enabled

2. **"Language not supported"**
   - Check if the language code is in the supported list
   - Verify the language mapping in `voice-mapping.ts`

3. **Audio not playing**
   - Check browser audio permissions
   - Verify the audio format is supported
   - Check for CORS issues

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will log detailed information about voice synthesis requests and responses.

## Contributing

When adding new voices or languages:

1. Update `src/lib/voice-mapping.ts`
2. Add language names to `LANGUAGE_NAMES`
3. Test with the voice demo page
4. Update this documentation

## License

This voice integration is part of the KalaBandhu project and follows the same license terms.
