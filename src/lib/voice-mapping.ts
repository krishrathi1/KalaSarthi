export interface VoiceConfig {
  name: string;
  gender: 'MALE' | 'FEMALE';
  quality: 'Standard' | 'Wavenet' | 'Neural2' | 'Chirp3-HD';
  description?: string;
  accent?: string;
  age?: 'young' | 'adult' | 'senior';
  personality?: 'professional' | 'friendly' | 'warm' | 'authoritative';
}

export interface LanguageVoiceMap {
  [languageCode: string]: {
    voices: VoiceConfig[];
    defaultVoice: string;
    fallbackVoice: string;
  };
}

// Comprehensive voice mapping with enhanced Google Cloud TTS voices
export const VOICE_MAPPING: LanguageVoiceMap = {
  'hi-IN': {
    voices: [
      { name: 'hi-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice', accent: 'Indian', age: 'adult', personality: 'warm' },
      { name: 'hi-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice', accent: 'Indian', age: 'adult', personality: 'professional' },
      { name: 'hi-IN-Neural2-C', gender: 'MALE', quality: 'Neural2', description: 'Alternative male voice', accent: 'Indian', age: 'young', personality: 'friendly' },
      { name: 'hi-IN-Neural2-D', gender: 'FEMALE', quality: 'Neural2', description: 'Alternative female voice', accent: 'Indian', age: 'young', personality: 'warm' },
      { name: 'hi-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice', accent: 'Indian', age: 'adult', personality: 'professional' },
      { name: 'hi-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice', accent: 'Indian', age: 'adult', personality: 'authoritative' },
      { name: 'hi-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice', accent: 'Indian', age: 'adult', personality: 'friendly' },
      { name: 'hi-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice', accent: 'Indian', age: 'adult', personality: 'professional' }
    ],
    defaultVoice: 'hi-IN-Neural2-A',
    fallbackVoice: 'hi-IN-Standard-A'
  },
  'HI-IN': {
    voices: [
      { name: 'hi-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice', accent: 'Indian', age: 'adult', personality: 'warm' },
      { name: 'hi-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice', accent: 'Indian', age: 'adult', personality: 'professional' },
      { name: 'hi-IN-Neural2-C', gender: 'MALE', quality: 'Neural2', description: 'Alternative male voice', accent: 'Indian', age: 'young', personality: 'friendly' },
      { name: 'hi-IN-Neural2-D', gender: 'FEMALE', quality: 'Neural2', description: 'Alternative female voice', accent: 'Indian', age: 'young', personality: 'warm' },
      { name: 'hi-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice', accent: 'Indian', age: 'adult', personality: 'professional' },
      { name: 'hi-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice', accent: 'Indian', age: 'adult', personality: 'authoritative' },
      { name: 'hi-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice', accent: 'Indian', age: 'adult', personality: 'friendly' },
      { name: 'hi-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice', accent: 'Indian', age: 'adult', personality: 'professional' }
    ],
    defaultVoice: 'hi-IN-Neural2-A',
    fallbackVoice: 'hi-IN-Standard-A'
  },
  'en-IN': {
    voices: [
      { name: 'en-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice', accent: 'Indian', age: 'adult', personality: 'warm' },
      { name: 'en-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice', accent: 'Indian', age: 'adult', personality: 'professional' },
      { name: 'en-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice', accent: 'Indian', age: 'adult', personality: 'friendly' },
      { name: 'en-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice', accent: 'Indian', age: 'adult', personality: 'authoritative' },
      { name: 'en-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice', accent: 'Indian', age: 'adult', personality: 'professional' },
      { name: 'en-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice', accent: 'Indian', age: 'adult', personality: 'friendly' },
      { name: 'en-IN-Standard-C', gender: 'MALE', quality: 'Standard', description: 'Alternative male voice', accent: 'Indian', age: 'young', personality: 'warm' },
      { name: 'en-IN-Standard-D', gender: 'FEMALE', quality: 'Standard', description: 'Alternative female voice', accent: 'Indian', age: 'young', personality: 'friendly' }
    ],
    defaultVoice: 'en-IN-Neural2-A',
    fallbackVoice: 'en-IN-Standard-A'
  },
  'en-US': {
    voices: [
      { name: 'en-US-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice', accent: 'American', age: 'adult', personality: 'professional' },
      { name: 'en-US-Neural2-C', gender: 'FEMALE', quality: 'Neural2', description: 'Alternative female voice', accent: 'American', age: 'young', personality: 'friendly' },
      { name: 'en-US-Neural2-D', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice', accent: 'American', age: 'adult', personality: 'authoritative' },
      { name: 'en-US-Neural2-E', gender: 'MALE', quality: 'Neural2', description: 'Alternative male voice', accent: 'American', age: 'young', personality: 'warm' },
      { name: 'en-US-Neural2-F', gender: 'FEMALE', quality: 'Neural2', description: 'Professional female voice', accent: 'American', age: 'adult', personality: 'professional' },
      { name: 'en-US-Neural2-G', gender: 'FEMALE', quality: 'Neural2', description: 'Friendly female voice', accent: 'American', age: 'young', personality: 'friendly' },
      { name: 'en-US-Neural2-H', gender: 'FEMALE', quality: 'Neural2', description: 'Warm female voice', accent: 'American', age: 'adult', personality: 'warm' },
      { name: 'en-US-Neural2-I', gender: 'MALE', quality: 'Neural2', description: 'Professional male voice', accent: 'American', age: 'adult', personality: 'professional' },
      { name: 'en-US-Neural2-J', gender: 'MALE', quality: 'Neural2', description: 'Friendly male voice', accent: 'American', age: 'young', personality: 'friendly' },
      { name: 'en-US-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice', accent: 'American', age: 'adult', personality: 'professional' },
      { name: 'en-US-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice', accent: 'American', age: 'adult', personality: 'authoritative' },
      { name: 'en-US-Wavenet-C', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice', accent: 'American', age: 'young', personality: 'friendly' },
      { name: 'en-US-Wavenet-D', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice', accent: 'American', age: 'adult', personality: 'professional' },
      { name: 'en-US-Wavenet-E', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice', accent: 'American', age: 'adult', personality: 'warm' },
      { name: 'en-US-Wavenet-F', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice', accent: 'American', age: 'young', personality: 'friendly' },
      { name: 'en-US-Wavenet-G', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice', accent: 'American', age: 'adult', personality: 'professional' },
      { name: 'en-US-Wavenet-H', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice', accent: 'American', age: 'adult', personality: 'warm' },
      { name: 'en-US-Wavenet-I', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice', accent: 'American', age: 'adult', personality: 'professional' },
      { name: 'en-US-Wavenet-J', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice', accent: 'American', age: 'young', personality: 'friendly' }
    ],
    defaultVoice: 'en-US-Neural2-A',
    fallbackVoice: 'en-US-Standard-A'
  },
  'en-GB': {
    voices: [
      { name: 'en-GB-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice', accent: 'British', age: 'adult', personality: 'professional' },
      { name: 'en-GB-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice', accent: 'British', age: 'adult', personality: 'authoritative' },
      { name: 'en-GB-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice', accent: 'British', age: 'adult', personality: 'warm' },
      { name: 'en-GB-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice', accent: 'British', age: 'adult', personality: 'professional' },
      { name: 'en-GB-Wavenet-C', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice', accent: 'British', age: 'young', personality: 'friendly' },
      { name: 'en-GB-Wavenet-D', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice', accent: 'British', age: 'adult', personality: 'authoritative' },
      { name: 'en-GB-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice', accent: 'British', age: 'adult', personality: 'professional' },
      { name: 'en-GB-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice', accent: 'British', age: 'adult', personality: 'authoritative' }
    ],
    defaultVoice: 'en-GB-Neural2-A',
    fallbackVoice: 'en-GB-Standard-A'
  },
  'bn-IN': {
    voices: [
      { name: 'bn-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'bn-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'bn-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'bn-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'bn-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'bn-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'bn-IN-Neural2-A',
    fallbackVoice: 'bn-IN-Standard-A'
  },
  'gu-IN': {
    voices: [
      { name: 'gu-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'gu-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'gu-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'gu-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'gu-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'gu-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'gu-IN-Neural2-A',
    fallbackVoice: 'gu-IN-Standard-A'
  },
  'ta-IN': {
    voices: [
      { name: 'ta-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'ta-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'ta-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'ta-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'ta-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'ta-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'ta-IN-Neural2-A',
    fallbackVoice: 'ta-IN-Standard-A'
  },
  'te-IN': {
    voices: [
      { name: 'te-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'te-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'te-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'te-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'te-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'te-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'te-IN-Neural2-A',
    fallbackVoice: 'te-IN-Standard-A'
  },
  'kn-IN': {
    voices: [
      { name: 'kn-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'kn-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'kn-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'kn-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'kn-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'kn-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'kn-IN-Neural2-A',
    fallbackVoice: 'kn-IN-Standard-A'
  },
  'ml-IN': {
    voices: [
      { name: 'ml-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'ml-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'ml-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'ml-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'ml-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'ml-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'ml-IN-Neural2-A',
    fallbackVoice: 'ml-IN-Standard-A'
  },
  'mr-IN': {
    voices: [
      { name: 'mr-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'mr-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'mr-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'mr-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'mr-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'mr-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'mr-IN-Neural2-A',
    fallbackVoice: 'mr-IN-Standard-A'
  },
  'pa-IN': {
    voices: [
      { name: 'pa-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'pa-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'pa-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'pa-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'pa-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'pa-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'pa-IN-Neural2-A',
    fallbackVoice: 'pa-IN-Standard-A'
  },
  'or-IN': {
    voices: [
      { name: 'or-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'or-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'or-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'or-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'or-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'or-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'or-IN-Neural2-A',
    fallbackVoice: 'or-IN-Standard-A'
  },
  'as-IN': {
    voices: [
      { name: 'as-IN-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'as-IN-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'as-IN-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'as-IN-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'as-IN-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'as-IN-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'as-IN-Neural2-A',
    fallbackVoice: 'as-IN-Standard-A'
  },
  'ur-PK': {
    voices: [
      { name: 'ur-PK-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'ur-PK-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'ur-PK-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'ur-PK-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'ur-PK-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'ur-PK-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'ur-PK-Neural2-A',
    fallbackVoice: 'ur-PK-Standard-A'
  },
  'ne-NP': {
    voices: [
      { name: 'ne-NP-Neural2-A', gender: 'FEMALE', quality: 'Neural2', description: 'High-quality female voice' },
      { name: 'ne-NP-Neural2-B', gender: 'MALE', quality: 'Neural2', description: 'High-quality male voice' },
      { name: 'ne-NP-Wavenet-A', gender: 'FEMALE', quality: 'Wavenet', description: 'Wavenet female voice' },
      { name: 'ne-NP-Wavenet-B', gender: 'MALE', quality: 'Wavenet', description: 'Wavenet male voice' },
      { name: 'ne-NP-Standard-A', gender: 'FEMALE', quality: 'Standard', description: 'Standard female voice' },
      { name: 'ne-NP-Standard-B', gender: 'MALE', quality: 'Standard', description: 'Standard male voice' }
    ],
    defaultVoice: 'ne-NP-Neural2-A',
    fallbackVoice: 'ne-NP-Standard-A'
  }
};

// Language display names
export const LANGUAGE_NAMES: { [key: string]: string } = {
  'hi-IN': 'हिन्दी',
  'en-IN': 'English (India)',
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'bn-IN': 'বাংলা',
  'gu-IN': 'ગુજરાતી',
  'ta-IN': 'தமிழ்',
  'te-IN': 'తెలుగు',
  'kn-IN': 'ಕನ್ನಡ',
  'ml-IN': 'മലയാളം',
  'mr-IN': 'मराठी',
  'pa-IN': 'ਪੰਜਾਬੀ',
  'or-IN': 'ଓଡ଼ିଆ',
  'as-IN': 'অসমীয়া',
  'ur-PK': 'اردو',
  'ne-NP': 'नेपाली'
};

// Utility functions
export function getAvailableLanguages(): string[] {
  return Object.keys(VOICE_MAPPING);
}

export function getVoicesForLanguage(languageCode: string): VoiceConfig[] {
  return VOICE_MAPPING[languageCode]?.voices || [];
}

export function getDefaultVoice(languageCode: string): string {
  return VOICE_MAPPING[languageCode]?.defaultVoice || 'en-IN-Neural2-A';
}

export function getFallbackVoice(languageCode: string): string {
  return VOICE_MAPPING[languageCode]?.fallbackVoice || 'en-IN-Standard-A';
}

export function getLanguageName(languageCode: string): string {
  return LANGUAGE_NAMES[languageCode] || languageCode;
}

export function getBestVoiceForLanguage(
  languageCode: string, 
  gender: 'MALE' | 'FEMALE' = 'FEMALE',
  quality: 'Neural2' | 'Wavenet' | 'Standard' = 'Neural2'
): VoiceConfig | null {
  const voices = getVoicesForLanguage(languageCode);
  
  // First try to find exact match
  let bestVoice = voices.find(v => v.gender === gender && v.quality === quality);
  
  // If not found, try any voice with same gender
  if (!bestVoice) {
    bestVoice = voices.find(v => v.gender === gender);
  }
  
  // If still not found, try any voice with same quality
  if (!bestVoice) {
    bestVoice = voices.find(v => v.quality === quality);
  }
  
  // If still not found, return first available voice
  if (!bestVoice && voices.length > 0) {
    bestVoice = voices[0];
  }
  
  return bestVoice || null;
}

export function isLanguageSupported(languageCode: string): boolean {
  return languageCode in VOICE_MAPPING;
}

export function getSupportedLanguagesWithNames(): Array<{ code: string; name: string }> {
  return getAvailableLanguages().map(code => ({
    code,
    name: getLanguageName(code)
  }));
}
