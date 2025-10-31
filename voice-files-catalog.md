# Voice-Related Files Catalog

## Summary
This document catalogs all files containing TTS/STT imports, usage, and voice-related functionality that need to be removed or modified according to the TTS/STT removal specification.

## Files to Remove Completely

### Service Layer Files
- `src/lib/services/TTSProcessor.ts` - Complete TTS processing service with Google Cloud integration
- `src/lib/services/STTProcessor.ts` - Complete STT processing service with Google Cloud integration
- `src/lib/voice-mapping.ts` - Voice configuration and mapping utilities

### Additional Service Files (from src/lib/service/)
- `src/lib/service/ActionAwareTTSService.ts` - Action-aware TTS service
- `src/lib/service/ConversationalVoiceProcessor.ts` - Conversational voice processing
- `src/lib/service/EnhancedRecordingService.ts` - Enhanced recording service (universal mic workflow)
- `src/lib/service/EnhancedSpeechToTextService.ts` - Enhanced STT service
- `src/lib/service/EnhancedTextToSpeechService.ts` - Enhanced TTS service
- `src/lib/service/GeminiSpeechService.ts` - Gemini speech service
- `src/lib/service/IntelligentVoiceAssistant.ts` - Intelligent voice assistant
- `src/lib/service/SpeechRecognitionService.ts` - Speech recognition service
- `src/lib/service/SpeechToTextService.ts` - Speech to text service
- `src/lib/service/TextToSpeechService.ts` - Text to speech service
- `src/lib/service/VoiceCommandProcessor.ts` - Voice command processing
- `src/lib/service/VoiceFeedbackService.ts` - Voice feedback service
- `src/lib/service/VoiceInteractionStateService.ts` - Voice interaction state management
- `src/lib/service/VoiceNavigationService.ts` - Voice navigation service
- `src/lib/service/VoiceOptimizationService.ts` - Voice optimization service
- `src/lib/service/AIAssistedNavigationService.ts` - AI-assisted navigation (imports voice services)
- `src/lib/service/NavigationRouter.ts` - Navigation router (imports voice services)

### API Endpoint Files
- `src/app/api/text-to-speech/route.ts` - TTS API endpoint
- `src/app/api/speech-to-text/route.ts` - STT API endpoint
- `src/app/api/google-cloud-tts/route.ts` - Google Cloud TTS endpoint
- `src/app/api/google-cloud-stt/route.ts` - Google Cloud STT endpoint
- `src/app/api/tts/enhanced/route.ts` - Enhanced TTS endpoint
- `src/app/api/enhanced-artisan-buddy/voice/stt/route.ts` - Artisan Buddy STT endpoint
- `src/app/api/enhanced-artisan-buddy/voice/tts/route.ts` - Artisan Buddy TTS endpoint
- `src/app/api/enhanced-chat/voice-to-text/route.ts` - Chat voice-to-text endpoint
- `src/app/api/enhanced-chat/text-to-voice/route.ts` - Chat text-to-voice endpoint
- `src/app/api/enhanced-chat/detect-language/route.ts` - Language detection (uses Google Cloud Speech)
- `src/app/api/voices/[language]/route.ts` - Voice language endpoint
- `src/app/api/voices/languages/route.ts` - Voice languages endpoint
- `src/app/api/voice-enrollment/route.ts` - Voice enrollment endpoint
- `src/app/api/communication/voice/route.ts` - Communication voice endpoint

### Component Files
- `src/components/voice/` - Entire voice components directory
  - `src/components/voice/README.md`
  - `src/components/voice/VoiceDemo.tsx`
  - `src/components/voice/VoiceExample.tsx`
  - `src/components/voice/VoiceIntegration.tsx`
  - `src/components/voice/VoiceManager.tsx`
  - `src/components/voice/VoiceOnboarding.tsx`

### Hook Files
- `src/hooks/useAudioRecording.ts` - Audio recording hook
- `src/hooks/use-voice-navigation.ts` - Voice navigation hook

### UI Component Files
- `src/components/ui/IntelligentVoiceButton.tsx` - Intelligent voice button
- `src/components/ui/StoryRecordingMic.tsx` - Story recording microphone
- `src/components/ui/VoiceControl.tsx` - Voice control component
- `src/components/ui/VoiceStatus.tsx` - Voice status component

### Test Files
- `src/__tests__/api/stt-api.test.ts` - STT API tests
- `src/__tests__/api/tts-api.test.ts` - TTS API tests
- `src/__tests__/multilingual-audio.test.ts` - Multilingual audio tests

### Page Files
- `src/app/voice-example/page.tsx` - Voice example page
- `src/app/voice-assistant-demo/page.tsx` - Voice assistant demo page
- `src/app/voice-enrollment/page.tsx` - Voice enrollment page
- `src/app/voice-demo/page.tsx` - Voice demo page

### AI Flow Files
- `src/ai/flows/voice-scheme-enrollment.ts` - Voice scheme enrollment flow

### Other Component Files
- `src/components/voice-scheme-enrollment.tsx` - Voice scheme enrollment component

### Standalone Files
- `multilingual_tts.ts` - Multilingual TTS implementation (root level)

### Legacy Artisan Buddy Files (to be removed)
- `src/app/artisan-buddy/` - Legacy artisan buddy directory (entire directory)

## Files to Modify (Remove Voice Imports/Usage)

### Components with Voice Imports
- `src/components/header.tsx` - Imports IntelligentVoiceButton
- `src/components/debug/AudioRecordingTest.tsx` - Uses useAudioRecording hook
- `src/components/enhanced-chat/VoiceInputHandler.tsx` - Uses voice-to-text API
- `src/components/digital-twin-chat.tsx` - References universal microphone
- `src/components/smart-product-creator.tsx` - Uses ConversationalVoiceProcessor and universal mic
- `src/app/advanced-features/page.tsx` - Imports VoiceControl and VoiceStatus
- `src/app/profile/page.tsx` - Imports VoiceControl and ConversationalVoiceProcessor
- `src/app/marketplace/page.tsx` - Imports VoiceControl and ConversationalVoiceProcessor

### Service Files with Voice Dependencies
- `src/lib/service/RegionalCommunicationService.ts` - Has voice communication functionality

## Directories to Rename/Move

### Enhanced Artisan Buddy → Artisan Buddy
- `src/app/enhanced-artisan-buddy/` → `src/app/artisan-buddy/`
- `src/app/api/enhanced-artisan-buddy/` → `src/app/api/artisan-buddy/` (remove voice subdirectories)

## Dependencies to Remove

### Package.json Dependencies
- `@google-cloud/text-to-speech` - Google Cloud TTS client
- `@google-cloud/speech` - Google Cloud STT client

### Configuration Files to Update
- `next.config.js` - Remove TTS/STT externals and serverComponentsExternalPackages
- `next.config.dev.js` - Remove TTS/STT externals and serverComponentsExternalPackages
- `package.json` - Remove Google Cloud TTS/STT dependencies
- `package-lock.json` - Will be updated automatically

## Import Dependency Chain Analysis

### Files Importing Voice Services
1. **TTSProcessor.ts** imported by:
   - No direct imports found in search

2. **STTProcessor.ts** imported by:
   - No direct imports found in search

3. **voice-mapping.ts** imported by:
   - `src/app/api/tts/enhanced/route.ts`
   - `src/app/api/voices/[language]/route.ts`
   - `src/app/api/voices/languages/route.ts`

4. **useAudioRecording.ts** imported by:
   - `src/components/debug/AudioRecordingTest.tsx`

5. **Voice components** imported by:
   - `src/components/voice/VoiceExample.tsx` imports `VoiceIntegration`
   - `src/components/voice/VoiceDemo.tsx` imports `VoiceManager`
   - `src/app/voice-example/page.tsx` imports `VoiceExample`
   - `src/app/voice-demo/page.tsx` imports `VoiceDemo`

6. **Voice UI components** imported by:
   - `src/components/header.tsx` imports `IntelligentVoiceButton`
   - `src/app/advanced-features/page.tsx` imports `VoiceControl`, `VoiceStatus`
   - `src/app/voice-assistant-demo/page.tsx` imports `IntelligentVoiceButton`
   - `src/app/profile/page.tsx` imports `VoiceControl`
   - `src/app/marketplace/page.tsx` imports `VoiceControl`

7. **Voice services** imported by:
   - `src/components/voice/VoiceOnboarding.tsx` imports `ConversationalVoiceProcessor`
   - `src/components/smart-product-creator.tsx` imports `ConversationalVoiceProcessor`
   - `src/app/profile/page.tsx` imports `ConversationalVoiceProcessor`
   - `src/app/marketplace/page.tsx` imports `ConversationalVoiceProcessor`

## Universal Microphone References

Files referencing universal microphone functionality:
- `src/lib/service/EnhancedRecordingService.ts` - Applies universal mic workflow
- `src/components/digital-twin-chat.tsx` - References universal microphone in UI
- `src/components/smart-product-creator.tsx` - References universal microphone integration

## Google Cloud Dependencies

Files with Google Cloud TTS/STT imports:
- `src/lib/services/TTSProcessor.ts`
- `src/lib/services/STTProcessor.ts`
- `src/lib/service/EnhancedSpeechToTextService.ts`
- `src/lib/service/GeminiSpeechService.ts` (commented imports)
- `src/lib/service/TextToSpeechService.ts`
- `src/lib/service/EnhancedTextToSpeechService.ts`
- `src/lib/service/SpeechToTextService.ts`
- `src/__tests__/multilingual-audio.test.ts` (mocked)
- `src/app/api/tts/enhanced/route.ts`
- `src/app/api/enhanced-chat/text-to-voice/route.ts`
- `src/app/api/enhanced-chat/voice-to-text/route.ts`
- `src/app/api/enhanced-chat/detect-language/route.ts`
- `multilingual_tts.ts`

## Removal Order Recommendation

1. **Phase 1**: Remove test files and standalone files
2. **Phase 2**: Remove voice components and hooks
3. **Phase 3**: Remove API endpoints
4. **Phase 4**: Remove service layer files
5. **Phase 5**: Update components that import voice functionality
6. **Phase 6**: Remove legacy artisan buddy and rename enhanced artisan buddy
7. **Phase 7**: Remove dependencies and update configuration files
8. **Phase 8**: Final cleanup and validation