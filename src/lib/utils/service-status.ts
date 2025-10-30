/**
 * Service Status Utilities
 * Helper functions to check and display service status
 */

export interface ServiceStatus {
  stt: 'google-cloud' | 'fallback-mock';
  tts: 'google-cloud' | 'fallback-mock';
  translation: 'google-cloud' | 'fallback-mock';
}

export interface ServiceCapabilities {
  stt: {
    realSpeechRecognition: boolean;
    multilingualSupport: boolean;
    audioQualityAnalysis: boolean;
    craftSpecificVocabulary: boolean;
  };
  tts: {
    naturalVoiceSynthesis: boolean;
    culturalVoiceSelection: boolean;
    audioPlayback: boolean;
    voiceCustomization: boolean;
  };
  translation: {
    professionalQuality: boolean;
    contextAwareTranslation: boolean;
    culturalPreservation: boolean;
    glossaryIntegration: boolean;
  };
}

/**
 * Check the current status of all services
 */
export async function checkServiceStatus(): Promise<ServiceStatus> {
  try {
    // TTS/STT APIs have been removed - use fallback mode only
    console.log('TTS/STT APIs removed - using fallback mode');

    // Check translation service (if it still exists)
    let translationStatus = 'fallback-mock';
    try {
      const translationResponse = await fetch('/api/cultural-translate', { method: 'GET' });
      const translationData = await translationResponse.json();
      translationStatus = translationData.status === 'healthy' ? 'google-cloud' : 'fallback-mock';
    } catch (error) {
      console.warn('Translation service check failed:', error);
    }

    return {
      stt: 'fallback-mock', // TTS/STT APIs removed
      tts: 'fallback-mock', // TTS/STT APIs removed
      translation: translationStatus
    };
  } catch (error) {
    console.error('Failed to check service status:', error);
    // Assume fallback if we can't check
    return {
      stt: 'fallback-mock',
      tts: 'fallback-mock',
      translation: 'fallback-mock'
    };
  }
}

/**
 * Get capabilities based on current service status
 */
export function getServiceCapabilities(status: ServiceStatus): ServiceCapabilities {
  return {
    stt: {
      realSpeechRecognition: status.stt === 'google-cloud',
      multilingualSupport: true, // Both services support this
      audioQualityAnalysis: true, // Both services provide this
      craftSpecificVocabulary: true // Both services have this
    },
    tts: {
      naturalVoiceSynthesis: status.tts === 'google-cloud',
      culturalVoiceSelection: true, // Both services support this
      audioPlayback: status.tts === 'google-cloud', // Only real service can play audio
      voiceCustomization: status.tts === 'google-cloud'
    },
    translation: {
      professionalQuality: status.translation === 'google-cloud',
      contextAwareTranslation: true, // Both services support this
      culturalPreservation: true, // Both services have this
      glossaryIntegration: status.translation === 'google-cloud'
    }
  };
}

/**
 * Get user-friendly status messages
 */
export function getStatusMessages(status: ServiceStatus, language: 'en' | 'hi' = 'en') {
  const messages = {
    en: {
      allEnabled: 'All services running with Google Cloud APIs - Full features available!',
      someEnabled: 'Some services using demo mode - Enable Google Cloud APIs for full features.',
      allDemo: 'All services in demo mode - Enable Google Cloud APIs for enhanced experience.',
      sttDemo: 'Voice recognition in demo mode - Returns sample responses.',
      ttsDemo: 'Voice synthesis in demo mode - Audio playback not available.',
      translationDemo: 'Translation using built-in terminology database.'
    },
    hi: {
      allEnabled: 'सभी सेवाएं Google Cloud APIs के साथ चल रही हैं - पूर्ण सुविधाएं उपलब्ध!',
      someEnabled: 'कुछ सेवाएं डेमो मोड में - पूर्ण सुविधाओं के लिए Google Cloud APIs सक्षम करें।',
      allDemo: 'सभी सेवाएं डेमो मोड में - बेहतर अनुभव के लिए Google Cloud APIs सक्षम करें।',
      sttDemo: 'आवाज़ पहचान डेमो मोड में - नमूना प्रतिक्रियाएं देता है।',
      ttsDemo: 'आवाज़ संश्लेषण डेमो मोड में - ऑडियो प्लेबैक उपलब्ध नहीं।',
      translationDemo: 'अनुवाद अंतर्निहित शब्दावली डेटाबेस का उपयोग कर रहा है।'
    }
  };

  const msgs = messages[language];
  const hasAnyFallback = status.stt === 'fallback-mock' ||
    status.tts === 'fallback-mock' ||
    status.translation === 'fallback-mock';

  if (!hasAnyFallback) {
    return {
      overall: msgs.allEnabled,
      details: []
    };
  }

  const allFallback = status.stt === 'fallback-mock' &&
    status.tts === 'fallback-mock' &&
    status.translation === 'fallback-mock';

  const details = [];
  if (status.stt === 'fallback-mock') details.push(msgs.sttDemo);
  if (status.tts === 'fallback-mock') details.push(msgs.ttsDemo);
  if (status.translation === 'fallback-mock') details.push(msgs.translationDemo);

  return {
    overall: allFallback ? msgs.allDemo : msgs.someEnabled,
    details
  };
}

/**
 * Get setup instructions for enabling services
 */
export function getSetupInstructions(status: ServiceStatus) {
  const instructions = [];

  if (status.stt === 'fallback-mock') {
    instructions.push({
      service: 'Speech-to-Text',
      url: 'https://console.developers.google.com/apis/api/speech.googleapis.com/overview?project=525551372559',
      description: 'Enable real voice recognition with 13+ Indian languages'
    });
  }

  if (status.tts === 'fallback-mock') {
    instructions.push({
      service: 'Text-to-Speech',
      url: 'https://console.developers.google.com/apis/api/texttospeech.googleapis.com/overview?project=525551372559',
      description: 'Enable natural voice synthesis with cultural voice selection'
    });
  }

  if (status.translation === 'fallback-mock') {
    instructions.push({
      service: 'Translation',
      url: 'https://console.developers.google.com/apis/api/translate.googleapis.com/overview?project=525551372559',
      description: 'Enable professional translation with glossary integration'
    });
  }

  return instructions;
}

/**
 * Estimate monthly costs for enabled services (in USD)
 */
export function estimateMonthlyCosts(usage: {
  audioMinutesPerMonth?: number;
  charactersPerMonth?: number;
  translationCharactersPerMonth?: number;
}) {
  const costs = {
    stt: (usage.audioMinutesPerMonth || 60) * 0.006, // $0.006 per 15 seconds
    tts: ((usage.charactersPerMonth || 10000) / 1000000) * 4.00, // $4 per 1M chars
    translation: ((usage.translationCharactersPerMonth || 50000) / 1000000) * 20.00 // $20 per 1M chars
  };

  const total = costs.stt + costs.tts + costs.translation;

  return {
    stt: costs.stt,
    tts: costs.tts,
    translation: costs.translation,
    total,
    freeTierCovered: total < 5.00 // Most usage under $5/month is covered by free tier
  };
}