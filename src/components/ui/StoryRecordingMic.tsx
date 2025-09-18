'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Mic, MicOff, Volume2, Loader2, Play, Pause, Trash2 } from 'lucide-react';
import { GeminiSpeechService } from '@/lib/service/GeminiSpeechService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface StoryRecordingMicProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onStoryRecorded?: (transcript: string, audioBlob: Blob) => void;
  onStoryCleared?: () => void;
  disabled?: boolean;
  showVoiceOptions?: boolean;
  enhancedStory?: string; // Enhanced story from AI
  setEnhancedStory?: (story: string) => void; // Setter for enhanced story
  onFinalizedStory?: (finalStory: string, audioBlob: Blob, summary?: string) => void; // Callback when story is finalized
  finalizedStoryFromParent?: string; // Finalized story from parent component
}

export function StoryRecordingMic({
  className,
  size = 'md',
  onStoryRecorded,
  onStoryCleared,
  disabled = false,
  showVoiceOptions = true,
  enhancedStory,
  setEnhancedStory,
  onFinalizedStory,
  finalizedStoryFromParent
}: StoryRecordingMicProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('default');
  const [showVoiceSelector, setShowVoiceSelector] = useState(true);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPlayingGenerated, setIsPlayingGenerated] = useState(false);
  const [showEditStory, setShowEditStory] = useState(false);
  const [editedStory, setEditedStory] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('hi-IN');
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [finalizedStory, setFinalizedStory] = useState<string>('');
  const [storyChoice, setStoryChoice] = useState<'original' | 'enhanced' | null>(null);
  const [showVoiceSelection, setShowVoiceSelection] = useState(false);
  const [selectedVoiceForAudio, setSelectedVoiceForAudio] = useState<string>('');
  const [availableVoicesForLanguage, setAvailableVoicesForLanguage] = useState<any[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechServiceRef = useRef<GeminiSpeechService | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generatedAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const sizeClasses = {
    sm: 'h-8 w-8 sm:h-10 sm:w-10',
    md: 'h-10 w-10 sm:h-12 sm:w-12',
    lg: 'h-12 w-12 sm:h-14 sm:w-14'
  };

  const iconSizes = {
    sm: 'h-4 w-4 sm:h-5 sm:w-5',
    md: 'h-5 w-5 sm:h-6 sm:w-6',
    lg: 'h-6 w-6 sm:h-7 sm:w-7'
  };

  // Voice options for story narration
  // Voice options will be populated from available voices
  const getVoiceOptions = () => {
    // Always provide fallback voices to prevent errors
    const fallbackVoices = [
      { id: 'default', name: 'Default Voice', description: 'Clear and natural', voiceName: 'en-US-Neural2-A' },
      { id: 'warm', name: 'Warm Voice', description: 'Friendly and inviting', voiceName: 'en-US-Neural2-C' },
      { id: 'professional', name: 'Professional Voice', description: 'Authoritative and clear', voiceName: 'en-US-Neural2-D' }
    ];

    // If no voices loaded yet, return fallbacks
    if (availableVoices.length === 0) {
      return fallbackVoices;
    }

    const languageVoices = getVoicesForLanguage(detectedLanguage);

    if (languageVoices.length === 0) {
      // Return fallback voices if no voices for detected language
      return fallbackVoices;
    }

    // Map available voices to options
    return languageVoices.slice(0, 5).map((voice, index) => ({
      id: `voice-${index}`,
      name: `${voice.name || 'Voice'} ${voice.ssmlGender === 'MALE' ? '(Male)' : '(Female)'}`,
      description: `${voice.languageCode} - ${voice.ssmlGender}`,
      voiceName: voice.name,
      languageCode: voice.languageCode,
      gender: voice.ssmlGender
    }));
  };

  useEffect(() => {
    // Initialize speech service
    const initServices = async () => {
      try {
        speechServiceRef.current = GeminiSpeechService.getInstance();

        // Check if speech recognition is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setIsSupported(false);
          console.warn('Media devices not supported');
        }

        // Load available voices
        await loadAvailableVoices();
      } catch (error) {
        console.error('Failed to initialize speech service:', error);
        setIsSupported(false);
      }
    };

    initServices();

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (generatedAudioUrl) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
    };
  }, []);

  // Handle finalized story from parent component
  useEffect(() => {
    if (finalizedStoryFromParent && finalizedStoryFromParent !== finalizedStory) {
      setFinalizedStory(finalizedStoryFromParent);
      setLastTranscript(finalizedStoryFromParent);
      setStoryChoice('original'); // Assume it's the original choice when passed from parent

      // Detect language from the finalized story
      const detectedLang = detectLanguage(finalizedStoryFromParent);
      setDetectedLanguage(detectedLang);

      console.log('📝 Story finalized from parent:', finalizedStoryFromParent);
      console.log('🌍 Detected language:', detectedLang);
    }
  }, [finalizedStoryFromParent, finalizedStory]);

  // Load available voices from the speech service
  const loadAvailableVoices = async () => {
    if (speechServiceRef.current) {
      try {
        const voices = await speechServiceRef.current.getAvailableVoices();
        setAvailableVoices(voices);
      } catch (error) {
        console.error('Failed to load voices:', error);
      }
    }
  };

  // Detect language from text
  const detectLanguage = (text: string): string => {
    // Enhanced language detection based on character patterns
    const hindiPattern = /[\u0900-\u097F]/;
    const englishPattern = /[a-zA-Z]/;

    // Count Hindi vs English characters
    const hindiMatches = (text.match(/[\u0900-\u097F]/g) || []).length;
    const englishMatches = (text.match(/[a-zA-Z]/g) || []).length;

    console.log('🔍 Language detection:', {
      text: text.substring(0, 50),
      hindiMatches,
      englishMatches,
      environment: process.env.NODE_ENV,
      defaulting: hindiMatches === 0 && englishMatches === 0 ? 'to English' : 'based on content'
    });

    // If Hindi characters are present, prioritize Hindi
    if (hindiMatches > 0) {
      return 'hi-IN';
    } else if (englishMatches > 0) {
      return 'en-US';
    }

    // Default to Hindi for better story enhancement
    return 'hi-IN';
  };

  // Get display name for language code
  const getLanguageDisplayName = (languageCode: string): string => {
    const languageNames: Record<string, string> = {
      'en-US': 'English',
      'hi-IN': 'Hindi',
      'es-ES': 'Spanish',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-BR': 'Portuguese',
      'ru-RU': 'Russian',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese',
      'ar-SA': 'Arabic',
      'th-TH': 'Thai',
      'vi-VN': 'Vietnamese',
      'id-ID': 'Indonesian',
      'ms-MY': 'Malay',
      'ta-IN': 'Tamil',
      'te-IN': 'Telugu',
      'bn-IN': 'Bengali',
      'gu-IN': 'Gujarati',
      'kn-IN': 'Kannada',
      'ml-IN': 'Malayalam',
      'mr-IN': 'Marathi',
      'pa-IN': 'Punjabi'
    };
    return languageNames[languageCode] || languageCode;
  };

  // Get voices for the detected language
  const getVoicesForLanguage = (language: string) => {
    return availableVoices.filter(voice =>
      voice.languageCode?.startsWith(language.split('-')[0]) ||
      voice.languageCode === language
    );
  };

  // Debug function to check Google Cloud availability
  const checkGoogleCloudStatus = async () => {
    if (speechServiceRef.current) {
      console.log('🔍 Checking Google Cloud STT/TTS availability...');
      
      const isAvailable = speechServiceRef.current.isGoogleCloudAvailable();
      console.log('Current Google Cloud status:', isAvailable);
      
      // Test direct API calls
      console.log('🧪 Testing direct API calls...');
      
      try {
        // Test STT API directly
        const sttResponse = await fetch('/api/google-cloud-stt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioData: 'dGVzdA==', language: 'en-US' })
        });
        
        console.log('Direct STT API test:', {
          ok: sttResponse.ok,
          status: sttResponse.status,
          statusText: sttResponse.statusText
        });
        
        if (!sttResponse.ok) {
          const errorText = await sttResponse.text();
          console.error('STT API Error:', errorText);
        }
        
        // Test TTS API directly
        const ttsResponse = await fetch('/api/google-cloud-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'test', language: 'en-US' })
        });
        
        console.log('Direct TTS API test:', {
          ok: ttsResponse.ok,
          status: ttsResponse.status,
          statusText: ttsResponse.statusText
        });
        
        if (!ttsResponse.ok) {
          const errorText = await ttsResponse.text();
          console.error('TTS API Error:', errorText);
        }
        
      } catch (error) {
        console.error('Direct API test failed:', error);
      }
      
      // Force recheck
      const newStatus = await speechServiceRef.current.recheckGoogleCloudAvailability();
      console.log('After recheck Google Cloud status:', newStatus);
      
      toast({
        title: "Google Cloud Status",
        description: `Google Cloud STT/TTS is ${newStatus ? 'available' : 'not available'}. Check console for details.`,
        variant: newStatus ? "default" : "destructive"
      });
    }
  };

  const startListening = async () => {
    if (!isSupported || disabled) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice input. Please try a different browser.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsListening(true);
      setLastTranscript('');
      audioChunksRef.current = [];
      setRecordingStartTime(Date.now());

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      // Create media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Process the recorded audio
        await processAudio();
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setIsListening(false);
        setIsProcessing(false);
        toast({
          title: "Recording Error",
          description: "There was an error recording your voice. Please try again.",
          variant: "destructive"
        });
      };

      // Start recording
      mediaRecorderRef.current.start();

      toast({
        title: "Recording Story...",
        description: "Speak naturally about your product's story and craftsmanship.",
      });

    } catch (error) {
      console.error('Failed to start voice recording:', error);
      setIsListening(false);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record your story.",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async () => {
    try {
      if (audioChunksRef.current.length === 0) {
        setIsProcessing(false);
        return;
      }

      // Combine audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Only reject completely empty recordings
      if (audioBlob.size < 10) { // Less than 10 bytes is definitely empty
        console.log('Audio recording too small, likely no speech');
        toast({
          title: "Recording Too Short",
          description: "Please record for at least 1 second and try again.",
          variant: "default"
        });
        setIsProcessing(false);
        setRecordingStartTime(null);
        return;
      }

      // Create audio URL for playback
      const newAudioUrl = URL.createObjectURL(audioBlob);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(newAudioUrl);
      setRecordedAudio(audioBlob);

      // Get transcription
      if (speechServiceRef.current) {
        try {
          console.log('🎤 Calling speechToText with:', {
            arrayBufferSize: arrayBuffer.byteLength,
            detectedLanguage,
            googleCloudAvailable: speechServiceRef.current.isGoogleCloudAvailable()
          });
          
          const transcription = await speechServiceRef.current.speechToText(arrayBuffer, { language: detectedLanguage });
          
          console.log('🎤 STT Response:', {
            hasText: !!transcription?.text,
            textLength: transcription?.text?.length || 0,
            confidence: transcription?.confidence,
            language: transcription?.language
          });

          if (transcription?.text && !transcription.text.includes('Speech recognition failed')) {
            console.log('✅ Speech recognition successful:', transcription.text);
            console.log('🌍 Detected language:', transcription.language);

            // Use detected language from STT or fallback to our detection
            const detectedLang = detectLanguage(transcription.text);
            setDetectedLanguage(detectedLang);

            // Store raw transcript without voice styling
            setLastTranscript(transcription.text);
            console.log('✅ lastTranscript set to:', transcription.text);

            // Call the callback with the raw transcript and audio
            if (onStoryRecorded) {
              onStoryRecorded(transcription.text, audioBlob);
            }

            // Get language display name
            const languageName = getLanguageDisplayName(detectedLang);

            toast({
              title: "Story Recorded!",
              description: `Captured ${transcription.text.length} characters. Language detected: ${languageName}`,
            });
          } else {
            // Handle speech recognition errors - check if it's a real error or just no speech
            const errorMessage = transcription?.text || 'No speech detected';

            // Only show error if it's not just "no speech detected"
            if (errorMessage !== 'No speech detected' && !errorMessage.includes('Speech recognition not available')) {
              console.warn('Speech recognition warning:', errorMessage);
              toast({
                title: "Speech Recognition Failed",
                description: "Could not process your recording. Please try again or check your microphone.",
                variant: "destructive"
              });
            } else {
              // Just no speech detected - show helpful message
              console.log('No speech detected in recording');
              toast({
                title: "No Speech Detected",
                description: "Please speak clearly into the microphone and try again.",
                variant: "default"
              });
            }
          }
        } catch (error) {
          // Handle different types of errors more gracefully
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          if (errorMessage.includes('No speech detected') || errorMessage.includes('Speech recognition not available')) {
            console.log('Speech recognition not available or no speech detected');
            toast({
              title: "Voice Input Not Available",
              description: "Please use text input instead, or check your microphone permissions.",
              variant: "default"
            });
          } else {
            console.warn('Speech recognition error:', error);
            toast({
              title: "Recording Failed",
              description: "Could not process your recording. Please try again.",
              variant: "destructive"
            });
          }
        }
      }

      setIsProcessing(false);
      setRecordingStartTime(null);

    } catch (error) {
      console.error('Failed to process audio:', error);
      setIsProcessing(false);
      setRecordingStartTime(null);
      toast({
        title: "Processing Error",
        description: "Failed to process your story recording. Please try again.",
        variant: "destructive"
      });
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const enhanceStory = async () => {
    if (!lastTranscript) {
      toast({
        title: "No Story to Enhance",
        description: "Please record a story first.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      toast({
        title: "Enhancing Story",
        description: "AI is analyzing your story and image...",
      });

      // Call the parent component's enhance function if available
      if (onStoryRecorded) {
        // For now, we'll create a simple enhancement
        // In a real implementation, this would call an AI service
        const enhancedText = await enhanceStoryWithAI(lastTranscript);
        if (setEnhancedStory) {
          setEnhancedStory(enhancedText);
        }

        toast({
          title: "Story Enhanced!",
          description: "Your story has been enhanced with AI. Check the enhanced version below.",
        });
      }
    } catch (error) {
      console.error('Error enhancing story:', error);
      toast({
        title: "Enhancement Failed",
        description: "Could not enhance your story. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const enhanceStoryWithAI = async (story: string): Promise<string> => {
    // This is a placeholder - in real implementation, call AI service
    // For now, return a simple enhancement
    return `✨ Enhanced Version:\n\n${story}\n\nThis story has been enhanced with AI to make it more engaging and descriptive. The AI analyzed your original story and added creative elements while preserving your unique voice and perspective.`;
  };

  const fetchGoogleVoices = async (language: string) => {
    try {
      // Normalize language code to uppercase (e.g., hi-in -> hi-IN)
      const normalizedLanguage = language.toUpperCase();
      const response = await fetch(`/api/voices/${normalizedLanguage}`);
      const data = await response.json();

      if (data.success) {
        setAvailableVoicesForLanguage(data.voices);
        return data.voices;
      } else {
        throw new Error(data.error || 'Failed to fetch voices');
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
      toast({
        title: "Voice Loading Failed",
        description: "Could not load available voices. Using default voice.",
        variant: "destructive"
      });
      return [];
    }
  };

  const finalizeStoryChoice = async (choice: 'original' | 'enhanced') => {
    setStoryChoice(choice);
    const storyToFinalize = choice === 'original' ? lastTranscript : enhancedStory;
    setFinalizedStory(storyToFinalize ?? '');

    // Fetch voices for the detected language
    const voices = await fetchGoogleVoices(detectedLanguage);
    if (voices.length > 0) {
      setSelectedVoiceForAudio(voices[0].name);
      setShowVoiceSelection(true);
    } else {
      // Fallback to default voice
      setSelectedVoiceForAudio('en-US-Neural2-A');
      setShowVoiceSelection(true);
    }

    toast({
      title: "Story Finalized!",
      description: `You chose the ${choice} story. Now select a voice for audio generation.`,
    });
  };

  const generateAudioStory = async () => {
    if (!finalizedStory || !selectedVoiceForAudio) {
      toast({
        title: "Missing Information",
        description: "Please select a voice and ensure story is finalized.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGeneratingAudio(true);
      toast({
        title: "Generating Audio",
        description: "Creating audio story with selected voice...",
      });

      const response = await fetch('/api/tts/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: finalizedStory,
          language: detectedLanguage || 'en-US',
          voice: selectedVoiceForAudio,
          speed: 1.0,
          pitch: 0.0,
          volume: 1.0
        })
      });

      const data = await response.json();
      console.log('🎵 TTS Response:', data);

      if (data.success && data.audio?.data) {
        console.log('🎵 Audio generation successful');
        console.log('Audio data length:', data.audio.data.length);

        // Convert base64 to blob
        const audioBlob = new Blob([Uint8Array.from(atob(data.audio.data), c => c.charCodeAt(0))], {
          type: 'audio/mpeg'
        });
        console.log('Audio blob size:', audioBlob.size, 'bytes');

        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('Generated audio URL:', audioUrl);
        setGeneratedAudioUrl(audioUrl);

        // Create audio element for playback
        const audio = new Audio(audioUrl);
        console.log('Created audio element:', audio);
        setCurrentAudio(audio);

        // Generate summary for product description
        const summary = await generateStorySummary(finalizedStory);

        toast({
          title: "🎵 Audio Generated!",
          description: "Your story is ready to play!",
        });

        // Call parent callback with final story, audio, and summary
        if (onFinalizedStory) {
          onFinalizedStory(finalizedStory, audioBlob, summary);
        }
      } else {
        console.error('❌ TTS API Error:', data);
        throw new Error(data.error || data.message || 'Audio generation failed');
      }
    } catch (error) {
      console.error('❌ Error generating audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Audio Generation Failed",
        description: `TTS Error: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const generateStorySummary = async (story: string): Promise<string> => {
    try {
      // For now, create a simple summary
      // In a real implementation, this would call an AI service
      const words = story.split(' ');
      const summary = words.slice(0, 20).join(' ');
      return summary + (words.length > 20 ? '...' : '');
    } catch (error) {
      console.error('Error generating summary:', error);
      return story.substring(0, 100) + '...';
    }
  };

  const clearRecording = () => {
    setLastTranscript('');
    setRecordedAudio(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsPlaying(false);

    if (onStoryCleared) {
      onStoryCleared();
    }

    toast({
      title: "Recording Cleared",
      description: "Your story recording has been removed.",
    });
  };


  // Generate audio preview with selected voice using existing TTS system
  const generateAudioPreview = async () => {
    if (!lastTranscript) {
      toast({
        title: "No Story Available",
        description: "Please record a story first before generating audio preview.",
        variant: "destructive"
      });
      return;
    }

    if (!speechServiceRef.current) {
      toast({
        title: "TTS Not Available",
        description: "Text-to-speech service is not available. Please try again later.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAudio(true);

    try {
      const voiceOptions = getVoiceOptions();
      const selectedVoiceOption = voiceOptions.find(v => v.id === selectedVoice);

      if (!selectedVoiceOption) {
        throw new Error('Selected voice not found');
      }

      // Use the existing TTS service
      const audioBuffer = await speechServiceRef.current.textToSpeech(lastTranscript, {
        language: detectedLanguage,
        voice: selectedVoiceOption.voiceName,
        speed: 1.0,
        pitch: 0.0
      });

      // Convert to WAV format for browser compatibility
      const wavBlob = createWavBlob(new Uint8Array(audioBuffer), 24000);
      const audioUrl = URL.createObjectURL(wavBlob);
      setGeneratedAudioUrl(audioUrl);

      toast({
        title: "Audio Generated!",
        description: `Preview ready with ${selectedVoiceOption.name}.`,
      });
    } catch (error) {
      console.error('Error generating audio preview:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate audio preview. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };


  // Convert LINEAR16 audio buffer to WAV format for browser compatibility
  const createWavBlob = (audioBuffer: Uint8Array, sampleRate: number): Blob => {
    const length = audioBuffer.length;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Copy audio data
    const audioData = new Uint8Array(buffer, 44);
    audioData.set(audioBuffer);

    return new Blob([buffer], { type: 'audio/wav' });
  };

  // Play/pause generated audio
  const toggleGeneratedAudio = () => {
    console.log('🎵 Toggle generated audio clicked');
    console.log('Generated audio URL:', generatedAudioUrl);
    console.log('Current audio:', currentAudio);

    if (!generatedAudioUrl) {
      console.log('❌ No generated audio URL');
      toast({
        title: "No Audio",
        description: "Please generate audio first.",
        variant: "destructive"
      });
      return;
    }

    // If we have a current audio playing, pause it
    if (currentAudio && !currentAudio.paused) {
      console.log('⏸️ Pausing current audio');
      currentAudio.pause();
      setIsPlayingGenerated(false);
      setCurrentAudio(null);
      return;
    }

    // If we have a current audio paused, resume it
    if (currentAudio && currentAudio.paused) {
      console.log('▶️ Resuming paused audio');
      currentAudio.play()
        .then(() => {
          console.log('✅ Audio resumed successfully');
          setIsPlayingGenerated(true);
        })
        .catch((error) => {
          console.error('❌ Audio resume failed:', error);
          toast({
            title: "Audio Resume Failed",
            description: "Could not resume the audio. Please try again.",
            variant: "destructive"
          });
        });
      return;
    }

    // Create new audio instance
    console.log('🆕 Creating new audio instance');
    const audio = new Audio(generatedAudioUrl);
    setCurrentAudio(audio);

    // Add error handling for audio loading
    audio.onerror = (e) => {
      console.error('❌ Audio playback error:', e);
      setIsPlayingGenerated(false);
      setCurrentAudio(null);
      toast({
        title: "Audio Playback Error",
        description: "Could not play the generated audio. Please try generating again.",
        variant: "destructive"
      });
    };

    audio.onloadstart = () => {
      console.log('🔄 Audio loading started');
    };

    audio.oncanplay = () => {
      console.log('✅ Audio can play');
    };

    audio.onended = () => {
      console.log('🏁 Audio ended');
      setIsPlayingGenerated(false);
      setCurrentAudio(null);
    };

    audio.play()
      .then(() => {
        console.log('🎵 Audio playing successfully');
        setIsPlayingGenerated(true);
      })
      .catch((error) => {
        console.error('Audio play failed:', error);
        setIsPlayingGenerated(false);
        setCurrentAudio(null);
        toast({
          title: "Audio Playback Failed",
          description: "Could not play the audio. Please try again.",
          variant: "destructive"
        });
      });
  };

  // Save edited story
  const saveEditedStory = () => {
    if (editedStory.trim()) {
      // Determine which story is being edited based on current state
      if (showEditStory && editedStory === lastTranscript) {
        // Editing original story
        setLastTranscript(editedStory);
      } else if (showEditStory && editedStory === enhancedStory) {
        // Editing enhanced story
        if (setEnhancedStory) {
          setEnhancedStory(editedStory);
        }
      } else {
        // Default to original story
        setLastTranscript(editedStory);
      }

      setShowEditStory(false);
      // Clear generated audio since story changed
      if (generatedAudioUrl) {
        URL.revokeObjectURL(generatedAudioUrl);
        setGeneratedAudioUrl(null);
      }
      // Reset story choice when editing
      setStoryChoice(null);
      setFinalizedStory('');
      toast({
        title: "Story Updated",
        description: "Your story has been updated successfully.",
      });
    }
  };

  // Generate final audio with finalized story
  const generateFinalAudio = async () => {
    if (!finalizedStory) {
      toast({
        title: "No Story Finalized",
        description: "Please choose between original or enhanced story first.",
        variant: "destructive"
      });
      return;
    }

    if (!speechServiceRef.current) {
      toast({
        title: "TTS Not Available",
        description: "Text-to-speech service is not available. Please try again later.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAudio(true);

    try {
      const voiceOptions = getVoiceOptions();
      const selectedVoiceOption = voiceOptions.find(v => v.id === selectedVoice);

      if (!selectedVoiceOption) {
        throw new Error('Selected voice not found');
      }

      // Use the existing TTS service with finalized story
      const audioBuffer = await speechServiceRef.current.textToSpeech(finalizedStory, {
        language: detectedLanguage,
        voice: selectedVoiceOption.voiceName,
        speed: 1.0,
        pitch: 0.0
      });

      // Convert to WAV format for browser compatibility
      const wavBlob = createWavBlob(new Uint8Array(audioBuffer), 24000);
      const audioUrl = URL.createObjectURL(wavBlob);
      setGeneratedAudioUrl(audioUrl);

      // Call the finalized story callback
      if (onFinalizedStory) {
        onFinalizedStory(finalizedStory, wavBlob);
      }

      toast({
        title: "Final Audio Generated!",
        description: `Your ${storyChoice} story is ready with ${selectedVoiceOption.name}.`,
      });
    } catch (error) {
      console.error('Error generating final audio:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate final audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <Button
        variant="outline"
        size="icon"
        className={cn(sizeClasses[size], className)}
        disabled
        title="Voice input not supported in this browser"
      >
        <MicOff className={iconSizes[size]} />
      </Button>
    );
  }

  return (
    <div className="relative">
      {/* Debug button for Google Cloud status */}
      {(process.env.NODE_ENV === 'development' || !speechServiceRef.current?.isGoogleCloudAvailable()) && (
        <Button
          onClick={checkGoogleCloudStatus}
          size="sm"
          variant="outline"
          className="absolute -top-10 sm:-top-12 left-0 text-xs px-2 py-1"
        >
          🔍 Debug
        </Button>
      )}
      
      {/* Main recording button */}
      <Button
        onClick={handleClick}
        disabled={isProcessing || disabled}
        className={cn(
          sizeClasses[size],
          'rounded-full transition-all duration-200 relative',
          isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/25'
            : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/25',
          isProcessing && 'opacity-50'
        )}
        title={
          isProcessing
            ? 'Processing your story...'
            : isListening
              ? 'Recording... Click to stop'
              : 'Click to record your product story'
        }
      >
        {isProcessing ? (
          <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
        ) : isListening ? (
          <MicOff className={iconSizes[size]} />
        ) : (
          <Mic className={iconSizes[size]} />
        )}

        {/* Listening indicator */}
        {isListening && (
          <div className="absolute -inset-1 rounded-full border-2 border-red-400 animate-ping opacity-20" />
        )}
      </Button>

      {/* Status indicator */}
      {(isListening || isProcessing) && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg">
          {isProcessing ? (
            <div className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              Processing story...
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Recording story...
            </div>
          )}
        </div>
      )}

      {/* Debug info - remove this later */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Debug: lastTranscript={lastTranscript ? 'set' : 'null'}, isListening={isListening.toString()}, isProcessing={isProcessing.toString()}
        </div>
      )} */}

      {/* Recording controls */}
      {recordedAudio && audioUrl && (
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg px-3 py-2 text-xs shadow-lg flex items-center gap-2">
          <Button
            onClick={playRecording}
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button
            onClick={clearRecording}
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <span className="text-muted-foreground">Story recorded</span>
        </div>
      )}

      {/* Voice Selector - REMOVED FOR SIMPLICITY */}
      {false && showVoiceOptions && (
        <div className="mt-6 w-full max-w-lg mx-auto">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-800">Voice Style Selection</span>
              </div>
              <Button
                onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                variant={showVoiceSelector ? "secondary" : "outline"}
                size="sm"
                className="h-8 px-4 text-xs font-medium"
              >
                {showVoiceSelector ? '✓ Done' : '🎤 Choose Voice'}
              </Button>
            </div>

            {showVoiceSelector ? (
              <div className="space-y-4">
                {/* Language Detection Display */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-800">
                      Language Detected: {getLanguageDisplayName(detectedLanguage)}
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Available voices will be shown for your language
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getVoiceOptions().map((voice) => (
                    <div
                      key={voice.id}
                      onClick={() => {
                        setSelectedVoice(voice.id);
                        // Clear generated audio when switching voices
                        if (generatedAudioUrl) {
                          URL.revokeObjectURL(generatedAudioUrl);
                          setGeneratedAudioUrl(null);
                        }
                      }}
                      className={cn(
                        "p-4 rounded-xl cursor-pointer transition-all duration-200 border-2",
                        selectedVoice === voice.id
                          ? "bg-green-100 border-green-400 shadow-md transform scale-105"
                          : "bg-white border-gray-200 hover:border-purple-300 hover:shadow-md hover:scale-102"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          selectedVoice === voice.id ? "bg-green-500" : "bg-gray-300"
                        )}></div>
                        <div className="font-semibold text-sm text-gray-800">{voice.name}</div>
                      </div>
                      <div className="text-xs text-gray-600 leading-relaxed">{voice.description}</div>
                    </div>
                  ))}
                </div>

                {/* Audio Preview Section - Only show when story is finalized */}
                {finalizedStory && storyChoice && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-gray-800">Generate Final Audio</span>
                      </div>
                      <Button
                        onClick={generateFinalAudio}
                        disabled={isGeneratingAudio}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isGeneratingAudio ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            🎵 Generate Audio
                          </>
                        )}
                      </Button>
                    </div>

                    {generatedAudioUrl && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Button
                          onClick={toggleGeneratedAudio}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          {isPlayingGenerated ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <div className="flex-1">
                          <div className="text-sm text-gray-700">
                            Final audio with <span className="font-semibold">{getVoiceOptions().find(v => v.id === selectedVoice)?.name}</span> voice
                          </div>
                          <div className="text-xs text-gray-500">Click play to hear your finalized story</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      {getVoiceOptions().find(v => v.id === selectedVoice)?.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {getVoiceOptions().find(v => v.id === selectedVoice)?.description}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-purple-600 font-medium">
                  ✨ Active
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Story Display Section - Two Boxes Only */}
      {lastTranscript && !isListening && !isProcessing && (
        <div className="mt-6 w-full max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Original Story Box - Hide when story is finalized */}
            {!finalizedStory && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-semibold text-gray-800">Your Original Story</span>
                    <span className="text-xs text-gray-500">({lastTranscript.length} chars)</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setEditedStory(lastTranscript);
                        setShowEditStory(true);
                      }}
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs"
                    >
                      ✏️ Edit
                    </Button>
                    {!enhancedStory && (
                      <Button
                        onClick={enhanceStory}
                        size="sm"
                        className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        ✨ Enhance It
                      </Button>
                    )}
                    <Button
                      onClick={clearRecording}
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs text-red-600 hover:text-red-700"
                    >
                      🗑️ Clear
                    </Button>
                  </div>
                </div>

                {showEditStory ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedStory}
                      onChange={(e) => setEditedStory(e.target.value)}
                      className="w-full text-sm resize-none"
                      rows={6}
                      placeholder="Edit your story..."
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={saveEditedStory}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        💾 Save Changes
                      </Button>
                      <Button
                        onClick={() => setShowEditStory(false)}
                        size="sm"
                        variant="outline"
                      >
                        ❌ Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-700 text-sm leading-relaxed max-h-32 overflow-y-auto">
                    {lastTranscript}
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Story Box - REMOVED TO AVOID DUPLICATION */}


            {/* Finalized Story Display - Only show when story is finalized */}
            {finalizedStory && storyChoice && (
              <div className="lg:col-span-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-green-800">
                        Finalized: {storyChoice === 'original' ? 'Original Story' : 'Enhanced Story'}
                      </span>
                    </div>
                    <Button
                      onClick={() => {
                        setStoryChoice(null);
                        setFinalizedStory('');
                      }}
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                    >
                      Change
                    </Button>
                  </div>
                  <p className="text-sm text-green-700 leading-relaxed">{finalizedStory}</p>
                </div>
              </div>
            )}

            {/* Finalize Story Button - Show when there's a story but no choice made */}
            {lastTranscript && !storyChoice && (
              <div className="lg:col-span-2">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-orange-800 mb-2">Ready to Finalize Your Story?</h3>
                    <p className="text-sm text-orange-600 mb-4">
                      {enhancedStory
                        ? "Choose between your original or enhanced story, then select a voice for audio generation"
                        : "Finalize your story and select a voice for audio generation"
                      }
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={() => finalizeStoryChoice('original')}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6"
                      >
                        🎯 Finalize Original Story
                      </Button>
                      {enhancedStory && (
                        <Button
                          onClick={() => finalizeStoryChoice('enhanced')}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                        >
                          ✨ Finalize Enhanced Story
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Selection - Only show when story is finalized */}
            {showVoiceSelection && finalizedStory && (
              <div className="lg:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-semibold text-blue-800">Select Voice for Audio Generation</span>
                      <span className="text-xs text-blue-600">(Language: {detectedLanguage})</span>
                    </div>
                    <Button
                      onClick={() => setShowVoiceSelection(false)}
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableVoicesForLanguage.slice(0, 6).map((voice, index) => (
                        <div
                          key={voice.name}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedVoiceForAudio === voice.name
                              ? 'border-blue-500 bg-blue-100'
                              : 'border-gray-200 hover:border-blue-300'
                            }`}
                          onClick={() => setSelectedVoiceForAudio(voice.name)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{voice.name}</div>
                              <div className="text-xs text-gray-600">
                                {voice.gender} • {voice.quality}
                              </div>
                            </div>
                            {selectedVoiceForAudio === voice.name && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={generateAudioStory}
                        disabled={isGeneratingAudio || !selectedVoiceForAudio}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isGeneratingAudio ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Audio...
                          </>
                        ) : (
                          <>
                            🎵 Generate Audio Story
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Audio Player */}
            {generatedAudioUrl && (
              <div className="lg:col-span-2">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="font-semibold text-purple-800">Generated Audio Story</span>
                    </div>
                    <Button
                      onClick={() => {
                        setGeneratedAudioUrl(null);
                        URL.revokeObjectURL(generatedAudioUrl);
                      }}
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={toggleGeneratedAudio}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isPlayingGenerated ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {isPlayingGenerated ? 'Pause' : 'Play'} Audio
                    </Button>
                    <span className="text-sm text-purple-700">
                      Voice: {selectedVoiceForAudio}
                    </span>
                  </div>

                  {currentAudio && (
                    <audio
                      ref={generatedAudioRef}
                      src={generatedAudioUrl}
                      onEnded={() => setIsPlayingGenerated(false)}
                      onPause={() => setIsPlayingGenerated(false)}
                      onPlay={() => setIsPlayingGenerated(true)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}
    </div>
  );
}
