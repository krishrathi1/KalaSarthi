
"use client";

import { useState, useRef, useEffect } from "react";
import { BotMessageSquare, Send, CornerDownLeft, Volume2, VolumeX, Mic, MicOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { t, translateAsync } from "@/lib/i18n";
import { GeminiSpeechService } from "@/lib/service/GeminiSpeechService";
import { EnhancedTTSService } from "@/lib/services/EnhancedTTSService";
import AudioResourceManager from "@/lib/services/AudioResourceManager";
import VoiceServiceOptimizer from "@/lib/services/VoiceServiceOptimizer";
import {
  artisanBuddyVoiceConfig,
  ArtisanBuddyVoiceConfig,
  isVoiceInputEnabled,
  isVoiceOutputEnabled,
  toggleVoiceInput,
  toggleVoiceOutput
} from "@/lib/config/artisan-buddy-voice-config";

interface EnhancedChatMessage extends ChatMessage {
  id?: string;
  timestamp?: Date;
  language?: string;
  isVoice?: boolean;
  audioUrl?: string;
  // Voice-specific properties
  isVoiceInput?: boolean;
  hasAudioResponse?: boolean;
  audioResponseUrl?: string;
  voiceProcessingTime?: number;
  // Additional metadata for mixed conversations
  inputMethod?: 'text' | 'voice';
  responseFormat?: 'text' | 'audio' | 'both';
}

export function DigitalTwinChat() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);

  // Voice configuration state
  const [voiceConfig, setVoiceConfig] = useState<ArtisanBuddyVoiceConfig>(artisanBuddyVoiceConfig.getConfig());

  // Visual feedback state
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSuccess, setVoiceSuccess] = useState<string | null>(null);
  const [showDetailedStatus, setShowDetailedStatus] = useState(false);

  // Update voice configuration
  const updateVoiceConfig = (updates: Partial<ArtisanBuddyVoiceConfig>) => {
    artisanBuddyVoiceConfig.updateConfig(updates);
    setVoiceConfig(artisanBuddyVoiceConfig.getConfig());
  };

  // Enhanced error messaging system with retry mechanisms
  const [voiceErrorDetails, setVoiceErrorDetails] = useState<{
    message: string;
    type: 'error' | 'warning' | 'info';
    retryable: boolean;
    actionable: boolean;
    helpUrl?: string;
    retryAction?: () => void;
  } | null>(null);

  // Comprehensive error messaging with categorization and guidance
  const showComprehensiveError = (
    error: Error,
    context: string,
    options: {
      retryAction?: () => void;
      helpUrl?: string;
      duration?: number;
    } = {}
  ) => {
    console.error(`❌ Comprehensive error in ${context}:`, error);

    let message = "An error occurred with voice functionality.";
    let type: 'error' | 'warning' | 'info' = 'error';
    let retryable = false;
    let actionable = false;
    let helpUrl = options.helpUrl;
    let retryAction = options.retryAction;
    let toastTitle = "Voice Error";
    let toastDescription = message;
    let duration = options.duration || 6000;

    // Categorize errors with specific messaging and actions
    const errorMessage = error.message.toLowerCase();

    // Microphone and permission errors
    if (errorMessage.includes('microphone access denied') || errorMessage.includes('notallowederror')) {
      message = "Microphone access denied. Please allow microphone access in your browser settings.";
      type = 'error';
      actionable = true;
      helpUrl = 'https://support.google.com/chrome/answer/2693767';
      toastTitle = "Microphone Access Denied";
      toastDescription = "Click 'Help' to learn how to enable microphone access in your browser.";
      duration = 10000;
    } else if (errorMessage.includes('microphone not found') || errorMessage.includes('notfounderror')) {
      message = "No microphone detected. Please connect a microphone and refresh the page.";
      type = 'error';
      actionable = true;
      toastTitle = "Microphone Not Found";
      toastDescription = "Please connect a microphone device and refresh the page.";
      duration = 8000;
    } else if (errorMessage.includes('microphone in use') || errorMessage.includes('notreadableerror')) {
      message = "Microphone is being used by another application. Please close other apps and try again.";
      type = 'warning';
      retryable = true;
      retryAction = options.retryAction || (() => startVoiceRecording());
      toastTitle = "Microphone Busy";
      toastDescription = "Close other applications using your microphone and try again.";
      duration = 8000;
    }

    // Audio settings and compatibility errors
    else if (errorMessage.includes('overconstrainederror') || errorMessage.includes('audio settings')) {
      message = "Your microphone doesn't support the required settings. Trying with basic settings.";
      type = 'warning';
      retryable = true;
      retryAction = () => startVoiceRecording(true);
      toastTitle = "Audio Settings Issue";
      toastDescription = "Retrying with compatible audio settings.";
      duration = 6000;
    } else if (errorMessage.includes('format') || errorMessage.includes('codec')) {
      message = "Audio format not supported. Please try recording again.";
      type = 'warning';
      retryable = true;
      retryAction = options.retryAction || (() => startVoiceRecording());
      toastTitle = "Audio Format Error";
      toastDescription = "Audio format issue detected. Please try recording again.";
      duration = 6000;
    }

    // Network and service errors
    else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      message = "Network connection failed. Please check your internet connection and try again.";
      type = 'warning';
      retryable = true;
      retryAction = options.retryAction;
      toastTitle = "Network Error";
      toastDescription = "Please check your internet connection and try again.";
      duration = 8000;
    } else if (errorMessage.includes('timeout')) {
      message = "Voice processing timed out. Please try a shorter recording or check your connection.";
      type = 'warning';
      retryable = true;
      retryAction = options.retryAction;
      toastTitle = "Processing Timeout";
      toastDescription = "Voice processing took too long. Please try again with a shorter recording.";
      duration = 7000;
    } else if (errorMessage.includes('service unavailable') || errorMessage.includes('quota') || errorMessage.includes('limit')) {
      message = "Voice service temporarily unavailable. Please try again later or use text input.";
      type = 'warning';
      actionable = true;
      toastTitle = "Service Unavailable";
      toastDescription = "Voice service is temporarily unavailable. Please try again later.";
      duration = 8000;
    }

    // Speech recognition errors
    else if (errorMessage.includes('no speech detected')) {
      message = "No speech was detected. Please speak clearly and try again.";
      type = 'info';
      retryable = true;
      retryAction = options.retryAction || (() => startVoiceRecording());
      toastTitle = "No Speech Detected";
      toastDescription = "Please speak more clearly and ensure your microphone is working.";
      duration = 6000;
    } else if (errorMessage.includes('recording too short')) {
      message = "Recording was too short. Please speak for at least 1 second.";
      type = 'info';
      retryable = true;
      retryAction = options.retryAction || (() => startVoiceRecording());
      toastTitle = "Recording Too Short";
      toastDescription = "Please speak for at least 1 second when recording.";
      duration = 5000;
    } else if (errorMessage.includes('speech recognition') || errorMessage.includes('stt')) {
      message = "Speech recognition failed. Please speak clearly and try again.";
      type = 'warning';
      retryable = true;
      retryAction = options.retryAction || (() => startVoiceRecording());
      toastTitle = "Speech Recognition Failed";
      toastDescription = "Please speak clearly and ensure there's no background noise.";
      duration = 6000;
    }

    // TTS and audio playback errors
    else if (errorMessage.includes('audio playback blocked') || errorMessage.includes('autoplay')) {
      message = "Audio playback blocked by browser. Click anywhere on the page to enable audio.";
      type = 'info';
      actionable = true;
      toastTitle = "Audio Playback Blocked";
      toastDescription = "Click anywhere on the page to enable audio playback.";
      duration = 10000;
    } else if (errorMessage.includes('tts') || errorMessage.includes('voice generation')) {
      message = "Voice generation failed. Text response is still available.";
      type = 'warning';
      retryable = true;
      retryAction = options.retryAction;
      toastTitle = "Voice Generation Failed";
      toastDescription = "Could not generate audio response. Text response is available.";
      duration = 6000;
    } else if (errorMessage.includes('browser tts')) {
      message = "Browser voice synthesis failed. Please try again or check browser settings.";
      type = 'warning';
      retryable = true;
      actionable = true;
      retryAction = options.retryAction;
      toastTitle = "Browser Voice Failed";
      toastDescription = "Browser voice synthesis encountered an error.";
      duration = 7000;
    }

    // Security and browser errors
    else if (errorMessage.includes('security') || errorMessage.includes('https')) {
      message = "Voice features require a secure connection (HTTPS). Please use HTTPS or check browser settings.";
      type = 'error';
      actionable = true;
      helpUrl = 'https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts';
      toastTitle = "Security Restriction";
      toastDescription = "Voice features require HTTPS. Please use a secure connection.";
      duration = 10000;
    } else if (errorMessage.includes('not supported') || errorMessage.includes('unavailable')) {
      message = "Voice features are not supported in this browser. Please try a different browser.";
      type = 'error';
      actionable = true;
      helpUrl = 'https://caniuse.com/speech-recognition';
      toastTitle = "Browser Not Supported";
      toastDescription = "Voice features are not supported in this browser.";
      duration = 10000;
    }

    // Generic fallback
    else {
      message = `Voice error: ${error.message}. Please try again or use text input.`;
      type = 'error';
      retryable = !!options.retryAction;
      retryAction = options.retryAction;
      toastTitle = "Voice Error";
      toastDescription = `An error occurred: ${error.message}`;
      duration = 6000;
    }

    // Set comprehensive error details
    setVoiceErrorDetails({
      message,
      type,
      retryable,
      actionable,
      helpUrl,
      retryAction
    });

    // Clear error after duration
    setTimeout(() => setVoiceErrorDetails(null), duration);

    // Show toast notification with appropriate actions
    const toastActions = [];

    if (retryable && retryAction) {
      toastActions.push(
        <Button
          key="retry"
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('🔄 User initiated retry from error message');
            retryAction();
          }}
        >
          Retry
        </Button>
      );
    }

    if (actionable && helpUrl) {
      toastActions.push(
        <Button
          key="help"
          variant="outline"
          size="sm"
          onClick={() => window.open(helpUrl, '_blank')}
        >
          Help
        </Button>
      );
    }

    toast({
      title: toastTitle,
      description: toastDescription,
      variant: type === 'error' ? 'destructive' : 'default',
      duration,
      action: toastActions.length > 0 ? (
        <div className="flex gap-2">
          {toastActions}
        </div>
      ) : undefined,
    });

    return { message, type, retryable, actionable };
  };

  // Service status communication
  const showServiceStatus = (status: {
    sttAvailable: boolean;
    ttsAvailable: boolean;
    microphonePermission: 'granted' | 'denied' | 'prompt';
    servicesInitialized: boolean;
  }) => {
    const issues = [];
    const suggestions = [];

    if (!status.servicesInitialized) {
      issues.push("Voice services are still initializing");
      suggestions.push("Please wait a moment for services to load");
    }

    if (!status.sttAvailable) {
      issues.push("Speech-to-text service unavailable");
      suggestions.push("Voice input will not work");
    }

    if (!status.ttsAvailable) {
      issues.push("Text-to-speech service unavailable");
      suggestions.push("Voice output will not work");
    }

    if (status.microphonePermission === 'denied') {
      issues.push("Microphone access denied");
      suggestions.push("Please allow microphone access in browser settings");
    } else if (status.microphonePermission === 'prompt') {
      issues.push("Microphone permission not granted");
      suggestions.push("You'll be prompted for microphone access when using voice input");
    }

    if (issues.length > 0) {
      const message = `Voice Status: ${issues.join(', ')}. ${suggestions.join('. ')}.`;
      showVoiceError(message, 8000);

      toast({
        title: "Voice Service Status",
        description: issues.join('. ') + '.',
        variant: status.microphonePermission === 'denied' || (!status.sttAvailable && !status.ttsAvailable) ? 'destructive' : 'default',
        duration: 8000,
        action: status.microphonePermission === 'denied' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://support.google.com/chrome/answer/2693767', '_blank')}
          >
            Help
          </Button>
        ) : undefined,
      });
    }
  };

  // Enhanced visual feedback helpers
  const showVoiceError = (message: string, duration: number = 5000) => {
    setVoiceError(message);
    setTimeout(() => setVoiceError(null), duration);
  };

  const showVoiceSuccess = (message: string, duration: number = 3000) => {
    setVoiceSuccess(message);
    setTimeout(() => setVoiceSuccess(null), duration);
  };

  const clearVoiceFeedback = () => {
    setVoiceError(null);
    setVoiceSuccess(null);
    setVoiceErrorDetails(null);
  };

  // Visual feedback components
  const RecordingIndicator = () => (
    <div className="flex justify-center mb-4">
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-center gap-3 shadow-sm">
        <div className="relative">
          <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-red-700">Recording...</span>
          <span className="text-xs text-red-600">Speak clearly into your microphone</span>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1 h-6 bg-red-400 rounded-full animate-pulse",
                `delay-${i * 100}`
              )}
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const ProcessingIndicator = () => (
    <div className="flex justify-center mb-4">
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 flex items-center gap-3 shadow-sm">
        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-blue-700">Processing voice...</span>
          <span className="text-xs text-blue-600">Converting speech to text</span>
        </div>
      </div>
    </div>
  );

  const SpeakingIndicator = () => (
    <div className="flex items-center gap-2 text-green-600">
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1 bg-green-500 rounded-full animate-pulse",
              i === 0 || i === 4 ? "h-3" : i === 1 || i === 3 ? "h-2" : "h-4"
            )}
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <span className="text-sm">AI speaking...</span>
    </div>
  );

  const GeneratingAudioIndicator = () => (
    <div className="flex items-center gap-2 text-purple-600">
      <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm">Generating audio...</span>
    </div>
  );

  const ErrorIndicator = ({ message }: { message: string }) => (
    <div className="flex justify-center mb-4">
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-center gap-3 shadow-sm max-w-md">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-red-700">Voice Error</span>
          <span className="text-xs text-red-600">{message}</span>
        </div>
      </div>
    </div>
  );

  // Comprehensive error indicator with retry and help actions
  const ComprehensiveErrorIndicator = () => {
    if (!voiceErrorDetails) return null;

    const { message, type, retryable, actionable, helpUrl, retryAction } = voiceErrorDetails;

    const bgColor = type === 'error' ? 'bg-red-50 border-red-300' :
      type === 'warning' ? 'bg-yellow-50 border-yellow-300' :
        'bg-blue-50 border-blue-300';

    const textColor = type === 'error' ? 'text-red-700' :
      type === 'warning' ? 'text-yellow-700' :
        'text-blue-700';

    const iconColor = type === 'error' ? 'text-red-500' :
      type === 'warning' ? 'text-yellow-500' :
        'text-blue-500';

    const Icon = type === 'error' ? AlertCircle :
      type === 'warning' ? AlertCircle :
        CheckCircle;

    return (
      <div className="flex justify-center mb-4">
        <div className={cn(
          "border-2 rounded-lg p-4 shadow-sm max-w-lg",
          bgColor
        )}>
          <div className="flex items-start gap-3">
            <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", iconColor)} />
            <div className="flex-1">
              <div className="flex flex-col gap-2">
                <span className={cn("text-sm font-medium", textColor)}>
                  {type === 'error' ? 'Voice Error' :
                    type === 'warning' ? 'Voice Warning' :
                      'Voice Info'}
                </span>
                <span className={cn("text-xs", textColor.replace('700', '600'))}>
                  {message}
                </span>

                {/* Action buttons */}
                {(retryable || actionable) && (
                  <div className="flex gap-2 mt-2">
                    {retryable && retryAction && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('🔄 User clicked retry from comprehensive error indicator');
                          retryAction();
                          setVoiceErrorDetails(null); // Clear error after retry
                        }}
                        className="h-7 px-3 text-xs"
                      >
                        Try Again
                      </Button>
                    )}
                    {actionable && helpUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(helpUrl, '_blank')}
                        className="h-7 px-3 text-xs"
                      >
                        Get Help
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVoiceErrorDetails(null)}
                      className="h-7 px-3 text-xs"
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SuccessIndicator = ({ message }: { message: string }) => (
    <div className="flex justify-center mb-4">
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 flex items-center gap-3 shadow-sm">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="text-sm text-green-700">{message}</span>
      </div>
    </div>
  );

  const VoiceStatusIndicator = () => {
    if (!voiceConfig.showProcessingStatus || !showDetailedStatus) return null;

    return (
      <div className="mb-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">Voice Status</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Voice Input Status */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                voiceServiceStatus.sttAvailable && voiceConfig.voiceInputEnabled
                  ? "bg-green-500"
                  : voiceServiceStatus.sttAvailable && !voiceConfig.voiceInputEnabled
                    ? "bg-yellow-500"
                    : "bg-red-500"
              )} />
              <span className="text-gray-600">
                Input: {
                  !voiceServiceStatus.sttAvailable
                    ? "Unavailable"
                    : !voiceConfig.voiceInputEnabled
                      ? "Disabled"
                      : isRecording
                        ? "Recording"
                        : isProcessingVoice
                          ? "Processing"
                          : "Ready"
                }
              </span>
            </div>

            {/* Voice Output Status */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                voiceServiceStatus.ttsAvailable && voiceConfig.voiceOutputEnabled
                  ? isGeneratingTTS
                    ? "bg-blue-500 animate-pulse"
                    : isPlayingResponse
                      ? "bg-green-500 animate-pulse"
                      : "bg-green-500"
                  : voiceServiceStatus.ttsAvailable && !voiceConfig.voiceOutputEnabled
                    ? "bg-yellow-500"
                    : "bg-red-500"
              )} />
              <span className="text-gray-600">
                Output: {
                  !voiceServiceStatus.ttsAvailable
                    ? "Unavailable"
                    : !voiceConfig.voiceOutputEnabled
                      ? "Disabled"
                      : isGeneratingTTS
                        ? "Generating"
                        : isPlayingResponse
                          ? "Playing"
                          : "Ready"
                }
              </span>
            </div>

            {/* Service Status */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                voiceServiceStatus.servicesInitialized
                  ? "bg-green-500"
                  : "bg-yellow-500 animate-pulse"
              )} />
              <span className="text-gray-600">
                Services: {voiceServiceStatus.servicesInitialized ? "Ready" : "Initializing"}
              </span>
            </div>

            {/* Microphone Permission */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                voiceServiceStatus.microphonePermission === 'granted'
                  ? "bg-green-500"
                  : voiceServiceStatus.microphonePermission === 'denied'
                    ? "bg-red-500"
                    : "bg-yellow-500"
              )} />
              <span className="text-gray-600">
                Mic: {
                  voiceServiceStatus.microphonePermission === 'granted'
                    ? "Allowed"
                    : voiceServiceStatus.microphonePermission === 'denied'
                      ? "Denied"
                      : "Pending"
                }
              </span>
            </div>
          </div>

          {/* TTS Service Info */}
          {voiceServiceStatus.ttsAvailable && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                TTS Service: {voiceServiceStatus.selectedTTSService === 'google-cloud' ? 'Google Cloud' : 'Browser'}
                {voiceConfig.preferredLanguage && ` • Language: ${voiceConfig.preferredLanguage}`}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  const [translatedTitle, setTranslatedTitle] = useState('Artisan Buddy');
  const [translatedDescription, setTranslatedDescription] = useState('Chat with your AI assistant 24/7.');
  const [translatedPlaceholder, setTranslatedPlaceholder] = useState('Ask about weaving techniques...');
  const [translatedSend, setTranslatedSend] = useState('Send');
  const [translatedYou, setTranslatedYou] = useState('You');
  const [translatedAI, setTranslatedAI] = useState('AI');
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Voice service state management
  const [voiceServiceStatus, setVoiceServiceStatus] = useState({
    sttAvailable: false,
    ttsAvailable: false,
    selectedTTSService: 'google-cloud' as 'google-cloud' | 'browser',
    microphonePermission: 'prompt' as 'granted' | 'denied' | 'prompt',
    servicesInitialized: false
  });

  // Voice input state management
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);

  // Voice output state management
  const [isPlayingResponse, setIsPlayingResponse] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);

  // Voice service references
  const speechServiceRef = useRef<GeminiSpeechService | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioResourceManagerRef = useRef<AudioResourceManager | null>(null);
  const currentAudioResourceId = useRef<string | null>(null);
  const voiceOptimizerRef = useRef<VoiceServiceOptimizer | null>(null);

  // Initialize voice services with comprehensive error handling
  const initializeVoiceServices = async () => {
    try {
      console.log('🎤 Initializing voice services...');

      // Initialize VoiceServiceOptimizer
      voiceOptimizerRef.current = VoiceServiceOptimizer.getInstance();

      // Initialize AudioResourceManager
      audioResourceManagerRef.current = AudioResourceManager.getInstance({
        maxCacheSize: 25 * 1024 * 1024, // 25MB for chat audio
        maxCacheAge: 15 * 60 * 1000, // 15 minutes
        maxItems: 50, // 50 audio items max
        cleanupInterval: 3 * 60 * 1000 // 3 minutes cleanup
      });

      // Initialize GeminiSpeechService
      speechServiceRef.current = GeminiSpeechService.getInstance();

      // Use optimizer to get cached service availability
      const cachedAvailability = await voiceOptimizerRef.current.getServiceAvailability();

      // Update voice service status from cache
      const newStatus = {
        sttAvailable: cachedAvailability.sttAvailable,
        ttsAvailable: cachedAvailability.ttsAvailable,
        selectedTTSService: cachedAvailability.selectedTTSService,
        microphonePermission: cachedAvailability.microphonePermission,
        servicesInitialized: true
      };

      setVoiceServiceStatus(newStatus);

      console.log('✅ Voice services initialized:', {
        sttAvailable: newStatus.sttAvailable,
        ttsAvailable: newStatus.ttsAvailable,
        selectedService: newStatus.selectedTTSService,
        micPermission: newStatus.microphonePermission
      });

      // Show service status if there are issues
      if (!newStatus.sttAvailable || !newStatus.ttsAvailable || micPermission === 'denied') {
        setTimeout(() => showServiceStatus(newStatus), 2000);
      }

    } catch (error) {
      console.error('❌ Failed to initialize voice services:', error);

      const errorStatus = {
        sttAvailable: false,
        ttsAvailable: false,
        selectedTTSService: 'browser' as const,
        microphonePermission: 'prompt' as const,
        servicesInitialized: true
      };

      setVoiceServiceStatus(errorStatus);

      // Show comprehensive error for initialization failure
      showComprehensiveError(
        error as Error,
        'voice-service-initialization',
        {
          retryAction: () => {
            console.log('🔄 Retrying voice service initialization');
            setTimeout(() => initializeVoiceServices(), 2000);
          },
          duration: 10000
        }
      );
    }
  };

  // Enhanced voice output error handling
  // Enhanced voice output error handling using comprehensive error messaging
  const handleVoiceOutputError = (error: Error, context: string, text?: string) => {
    // Use comprehensive error messaging system
    return showComprehensiveError(error, `voice-output-${context}`, {
      retryAction: text ? () => {
        console.log('🔄 Retrying voice output after error');
        setTimeout(() => playAIResponse(text), 1000);
      } : undefined
    });
  };

  // Enhanced TTS integration with comprehensive error handling and performance optimization
  const playAIResponse = async (text: string, retryCount = 0): Promise<void> => {
    const maxRetries = 2;
    const startTime = Date.now();

    try {
      console.log('🔊 Generating TTS for AI response:', {
        textLength: text.length,
        preview: text.substring(0, 50) + '...',
        retryCount
      });

      setIsGeneratingTTS(true);

      // Check if TTS is available and enabled
      if (!voiceServiceStatus.ttsAvailable || !voiceConfig.voiceOutputEnabled) {
        console.log('⚠️ TTS not available or disabled, skipping audio generation');
        return;
      }

      // Validate input text
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input for TTS');
      }

      const cleanText = text.trim();
      if (cleanText.length === 0) {
        console.log('⚠️ Empty text, skipping TTS generation');
        return;
      }

      if (cleanText.length > 5000) {
        console.log('⚠️ Text too long, breaking into chunks');
        await playLongTextInChunks(cleanText);
        return;
      }

      // Stop any currently playing audio
      await stopAudioPlayback();

      // Check TTS cache first
      if (voiceOptimizerRef.current) {
        const cachedTTS = voiceOptimizerRef.current.getCachedTTS(
          cleanText,
          voiceConfig.preferredLanguage || (language === 'hi' ? 'hi-IN' : 'en-IN')
        );

        if (cachedTTS) {
          console.log('🚀 Using cached TTS response');
          await playAudioFromBase64(cachedTTS.audioData, cachedTTS.mimeType);

          // Track performance
          const cacheTime = Date.now() - startTime;
          voiceOptimizerRef.current.trackTTSPerformance(cacheTime);
          return;
        }
      }

      // Generate TTS using EnhancedTTSService with enhanced settings
      const ttsSettings = artisanBuddyVoiceConfig.getTTSSettings();
      const ttsOptions = {
        languageCode: voiceConfig.preferredLanguage || (language === 'hi' ? 'hi-IN' : 'en-IN'),
        gender: 'FEMALE' as const,
        speakingRate: ttsSettings.rate,
        pitch: ttsSettings.pitch,
        fallbackEnabled: ttsSettings.enableFallback,
        preferredService: ttsSettings.preferredService,
        timeout: 15000 // 15 second timeout
      };

      console.log('🔧 TTS options:', ttsOptions);

      // Attempt TTS generation with timeout
      let ttsResult;
      try {
        const ttsPromise = EnhancedTTSService.synthesize(cleanText, ttsOptions);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TTS generation timeout')), ttsOptions.timeout);
        });

        ttsResult = await Promise.race([ttsPromise, timeoutPromise]);
      } catch (ttsError) {
        console.error('❌ TTS service error:', ttsError);
        throw ttsError;
      }

      console.log('✅ TTS generation result:', {
        success: ttsResult.success,
        serviceUsed: ttsResult.serviceUsed,
        hasAudio: !!ttsResult.audio?.content,
        error: ttsResult.error
      });

      if (ttsResult.success && ttsResult.audio?.content) {
        // Cache the TTS response for future use
        if (voiceOptimizerRef.current) {
          voiceOptimizerRef.current.cacheTTSResponse(
            cleanText,
            ttsOptions.languageCode,
            ttsResult.audio.content,
            ttsResult.audio.mimeType || 'audio/mp3'
          );
        }

        // Play the generated audio
        await playAudioFromBase64(
          ttsResult.audio.content,
          ttsResult.audio.mimeType || 'audio/mp3'
        );

        // Track performance
        const ttsTime = Date.now() - startTime;
        if (voiceOptimizerRef.current) {
          voiceOptimizerRef.current.trackTTSPerformance(ttsTime);
        }

        console.log('✅ TTS audio played successfully');

      } else if (ttsResult.fallbackAvailable) {
        console.log('🔄 Primary TTS failed, attempting browser fallback...');
        await playWithBrowserTTS(cleanText);

      } else {
        const errorMsg = ttsResult.error || 'TTS generation failed without specific error';
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('❌ TTS playback failed:', error);

      const errorResult = handleVoiceOutputError(error as Error, 'tts-generation', text);

      // Attempt retry for retryable errors
      if (errorResult.retryable && retryCount < maxRetries) {
        console.log(`🔄 Retrying TTS generation (attempt ${retryCount + 1}/${maxRetries + 1})`);
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 3000);
        setTimeout(() => {
          playAIResponse(text, retryCount + 1);
        }, retryDelay);
        return;
      }

      // Try browser TTS as fallback if available
      if (errorResult.fallbackAvailable) {
        try {
          console.log('🔄 Attempting browser TTS fallback...');
          await playWithBrowserTTS(text);
        } catch (fallbackError) {
          console.error('❌ Browser TTS fallback also failed:', fallbackError);
          handleVoiceOutputError(fallbackError as Error, 'browser-tts-fallback');
        }
      }

    } finally {
      setIsGeneratingTTS(false);
    }
  };

  // Handle long text by breaking into chunks
  const playLongTextInChunks = async (text: string): Promise<void> => {
    try {
      console.log('📝 Breaking long text into chunks for TTS');

      // Split text into sentences or chunks
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const chunks: string[] = [];
      let currentChunk = '';

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > 1000) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            // Single sentence is too long, split by commas or words
            const words = sentence.split(' ');
            let wordChunk = '';
            for (const word of words) {
              if ((wordChunk + ' ' + word).length > 1000) {
                if (wordChunk) {
                  chunks.push(wordChunk.trim());
                  wordChunk = word;
                } else {
                  chunks.push(word); // Single word is very long
                }
              } else {
                wordChunk += (wordChunk ? ' ' : '') + word;
              }
            }
            if (wordChunk) {
              currentChunk = wordChunk;
            }
          }
        } else {
          currentChunk += (currentChunk ? '. ' : '') + sentence;
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      console.log(`📝 Split text into ${chunks.length} chunks`);

      // Play chunks sequentially
      for (let i = 0; i < chunks.length; i++) {
        if (!voiceConfig.voiceOutputEnabled) {
          console.log('⏹️ Voice output disabled, stopping chunk playback');
          break;
        }

        console.log(`🔊 Playing chunk ${i + 1}/${chunks.length}`);
        await playAIResponse(chunks[i]);

        // Small delay between chunks
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

    } catch (error) {
      console.error('❌ Failed to play long text in chunks:', error);
      handleVoiceOutputError(error as Error, 'long-text-chunks', text);
    }
  };

  // Enhanced audio playback with comprehensive error handling and resource management
  const playAudioFromBase64 = async (base64Audio: string, mimeType: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      try {
        console.log('🎵 Creating audio element for playback', {
          mimeType,
          dataSize: base64Audio.length
        });

        // Validate inputs
        if (!base64Audio || typeof base64Audio !== 'string') {
          throw new Error('Invalid base64 audio data');
        }

        if (base64Audio.length === 0) {
          throw new Error('Empty audio data');
        }

        if (!mimeType || typeof mimeType !== 'string') {
          console.warn('⚠️ No MIME type provided, using default');
          mimeType = 'audio/mp3';
        }

        if (!audioResourceManagerRef.current) {
          throw new Error('Audio resource manager not initialized');
        }

        // Create audio element using resource manager
        const { audio, resourceId } = audioResourceManagerRef.current.createAudioElement(
          base64Audio,
          'tts',
          {
            mimeType,
            persistent: false // TTS audio is not persistent
          }
        );

        // Set current audio references
        setCurrentAudio(audio);
        currentAudioResourceId.current = resourceId;

        // Configure audio element for optimal playback
        audio.preload = 'auto';
        audio.volume = Math.max(0, Math.min(1, voiceConfig.audioVolume || 0.8));
        audio.crossOrigin = 'anonymous';

        // Timeout for loading
        const loadTimeout = setTimeout(() => {
          console.error('❌ Audio loading timeout');
          cleanupAudio(audio);
          reject(new Error('Audio loading timeout'));
        }, 10000);

        // Enhanced error handling for audio events
        audio.onerror = (event) => {
          clearTimeout(loadTimeout);
          console.error('❌ Audio element error:', event);

          const audioError = (audio as any).error;
          let errorMessage = 'Audio playback failed';

          if (audioError) {
            switch (audioError.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = 'Audio playback was aborted';
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = 'Network error during audio playback';
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMessage = 'Audio format not supported or corrupted';
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Audio format not supported by browser';
                break;
              default:
                errorMessage = `Audio error (code: ${audioError.code})`;
            }
          }

          cleanupCurrentAudio();
          handleVoiceOutputError(new Error(errorMessage), 'audio-playback');
          reject(new Error(errorMessage));
        };

        // Handle successful loading
        audio.onloadeddata = () => {
          clearTimeout(loadTimeout);

          // Track audio load performance
          const loadTime = Date.now() - startTime;
          if (voiceOptimizerRef.current) {
            voiceOptimizerRef.current.trackAudioLoadPerformance(loadTime);
          }

          console.log('🎵 Audio data loaded successfully', {
            duration: audio.duration,
            readyState: audio.readyState,
            loadTime: `${loadTime}ms`
          });
        };

        audio.oncanplay = () => {
          console.log('🎵 Audio ready for playback');
        };

        // Handle playback start
        audio.onplay = () => {
          console.log('▶️ Audio playback started');
          setIsPlayingResponse(true);
        };

        audio.onplaying = () => {
          console.log('▶️ Audio is actively playing');
          setIsPlayingResponse(true);
        };

        // Handle playback completion
        audio.onended = () => {
          console.log('⏹️ Audio playback completed naturally');
          cleanupCurrentAudio();
          resolve();
        };

        // Handle pause/stop
        audio.onpause = () => {
          console.log('⏸️ Audio playback paused');
          setIsPlayingResponse(false);
        };

        audio.onabort = () => {
          console.log('⏹️ Audio playback aborted');
          cleanupCurrentAudio();
          resolve();
        };

        // Handle loading issues
        audio.onstalled = () => {
          console.warn('⚠️ Audio loading stalled');
        };

        audio.onsuspend = () => {
          console.warn('⚠️ Audio loading suspended');
        };

        audio.onwaiting = () => {
          console.warn('⚠️ Audio waiting for data');
        };

        // Audio source is already set by resource manager
        audio.load();

        // Start playback with enhanced error handling
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Audio playback started successfully');
            })
            .catch(playError => {
              console.error('❌ Failed to start audio playback:', playError);
              cleanupCurrentAudio();

              // Handle specific play errors
              if (playError.name === 'NotAllowedError') {
                handleVoiceOutputError(
                  new Error('Audio playback blocked by browser policy'),
                  'autoplay-policy'
                );
              } else if (playError.name === 'NotSupportedError') {
                handleVoiceOutputError(
                  new Error('Audio format not supported'),
                  'format-not-supported'
                );
              } else {
                handleVoiceOutputError(playError, 'play-promise');
              }

              reject(playError);
            });
        }

      } catch (error) {
        console.error('❌ Failed to create audio element:', error);
        setIsPlayingResponse(false);
        setCurrentAudio(null);
        currentAudioResourceId.current = null;
        handleVoiceOutputError(error as Error, 'audio-creation');
        reject(error);
      }
    });
  };

  // Helper function to clean up current audio resources using resource manager
  const cleanupCurrentAudio = () => {
    try {
      setIsPlayingResponse(false);
      setCurrentAudio(null);

      if (currentAudioResourceId.current && audioResourceManagerRef.current) {
        audioResourceManagerRef.current.cleanupAudioResource(currentAudioResourceId.current);
        currentAudioResourceId.current = null;
        console.log('✅ Current audio resource cleaned up via resource manager');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Error during audio cleanup:', cleanupError);
    }
  };

  // Helper function to clean up all audio resources
  const cleanupAllAudioResources = () => {
    try {
      if (audioResourceManagerRef.current) {
        audioResourceManagerRef.current.stopAllAudio();
        audioResourceManagerRef.current.cleanupAllResources();
        console.log('✅ All audio resources cleaned up');
      }

      setIsPlayingResponse(false);
      setCurrentAudio(null);
      currentAudioResourceId.current = null;
    } catch (cleanupError) {
      console.warn('⚠️ Error during complete audio cleanup:', cleanupError);
    }
  };

  // Enhanced browser TTS fallback with comprehensive error handling
  const playWithBrowserTTS = async (text: string, retryCount = 0): Promise<void> => {
    const maxRetries = 2;

    return new Promise((resolve, reject) => {
      try {
        console.log('🗣️ Using browser TTS fallback', {
          textLength: text.length,
          retryCount
        });

        // Check browser support
        if (!('speechSynthesis' in window)) {
          throw new Error('Browser TTS not supported in this browser');
        }

        if (!window.speechSynthesis) {
          throw new Error('Speech synthesis API not available');
        }

        // Validate input text
        if (!text || typeof text !== 'string') {
          throw new Error('Invalid text input for browser TTS');
        }

        const cleanText = text.trim();
        if (cleanText.length === 0) {
          console.log('⚠️ Empty text, skipping browser TTS');
          resolve();
          return;
        }

        if (cleanText.length > 32767) {
          console.log('⚠️ Text too long for browser TTS, truncating');
          text = cleanText.substring(0, 32767) + '...';
        }

        // Stop any existing speech
        try {
          speechSynthesis.cancel();
          // Wait a bit for cancellation to complete
          setTimeout(() => continueWithTTS(), 100);
        } catch (cancelError) {
          console.warn('⚠️ Error canceling existing speech:', cancelError);
          continueWithTTS();
        }

        function continueWithTTS() {
          try {
            const utterance = new SpeechSynthesisUtterance(text);

            // Configure utterance with enhanced settings
            const audioSettings = artisanBuddyVoiceConfig.getAudioSettings();
            const targetLang = voiceConfig.preferredLanguage || (language === 'hi' ? 'hi-IN' : 'en-US');

            utterance.lang = targetLang;
            utterance.rate = Math.max(0.1, Math.min(10, audioSettings.rate || 1));
            utterance.pitch = Math.max(0, Math.min(2, audioSettings.pitch || 1));
            utterance.volume = Math.max(0, Math.min(1, audioSettings.volume || 0.8));

            // Enhanced voice selection
            let voices = speechSynthesis.getVoices();

            // If voices not loaded yet, wait for them
            if (voices.length === 0) {
              speechSynthesis.onvoiceschanged = () => {
                voices = speechSynthesis.getVoices();
                selectVoiceAndSpeak();
              };

              // Fallback timeout if voices don't load
              setTimeout(() => {
                if (voices.length === 0) {
                  console.warn('⚠️ No voices loaded, using default');
                  selectVoiceAndSpeak();
                }
              }, 2000);
            } else {
              selectVoiceAndSpeak();
            }

            function selectVoiceAndSpeak() {
              try {
                // Find best matching voice
                const langCode = targetLang.split('-')[0].toLowerCase();

                // Priority order: exact match, language match, default
                let selectedVoice = voices.find(voice =>
                  voice.lang.toLowerCase() === targetLang.toLowerCase()
                ) || voices.find(voice =>
                  voice.lang.toLowerCase().startsWith(langCode)
                ) || voices.find(voice =>
                  voice.default
                ) || voices[0];

                if (selectedVoice) {
                  utterance.voice = selectedVoice;
                  console.log('🎤 Selected voice:', {
                    name: selectedVoice.name,
                    lang: selectedVoice.lang,
                    default: selectedVoice.default
                  });
                } else {
                  console.warn('⚠️ No suitable voice found, using browser default');
                }

                // Set up event handlers with enhanced error handling
                utterance.onstart = () => {
                  console.log('🗣️ Browser TTS started');
                  setIsPlayingResponse(true);
                };

                utterance.onend = () => {
                  console.log('✅ Browser TTS completed successfully');
                  setIsPlayingResponse(false);
                  resolve();
                };

                utterance.onerror = (event) => {
                  console.error('❌ Browser TTS error:', event);
                  setIsPlayingResponse(false);

                  const errorType = event.error;
                  let errorMessage = `Browser TTS error: ${errorType}`;

                  switch (errorType) {
                    case 'network':
                      errorMessage = 'Network error during browser TTS';
                      break;
                    case 'synthesis-failed':
                      errorMessage = 'Speech synthesis failed';
                      break;
                    case 'synthesis-unavailable':
                      errorMessage = 'Speech synthesis unavailable';
                      break;
                    case 'text-too-long':
                      errorMessage = 'Text too long for browser TTS';
                      break;
                    case 'rate-not-supported':
                      errorMessage = 'Speech rate not supported';
                      break;
                    case 'pitch-not-supported':
                      errorMessage = 'Speech pitch not supported';
                      break;
                    case 'voice-not-supported':
                      errorMessage = 'Selected voice not supported';
                      break;
                    case 'language-not-supported':
                      errorMessage = 'Language not supported by browser TTS';
                      break;
                    case 'interrupted':
                      errorMessage = 'Speech synthesis interrupted';
                      break;
                    case 'not-allowed':
                      errorMessage = 'Speech synthesis not allowed';
                      break;
                    default:
                      errorMessage = `Browser TTS error: ${errorType}`;
                  }

                  const error = new Error(errorMessage);

                  // Retry logic for certain errors
                  const retryableErrors = ['network', 'synthesis-failed', 'interrupted'];
                  if (retryableErrors.includes(errorType) && retryCount < maxRetries) {
                    console.log(`🔄 Retrying browser TTS (attempt ${retryCount + 1}/${maxRetries + 1})`);
                    setTimeout(() => {
                      playWithBrowserTTS(text, retryCount + 1)
                        .then(resolve)
                        .catch(reject);
                    }, 1000 * (retryCount + 1));
                  } else {
                    handleVoiceOutputError(error, 'browser-tts');
                    reject(error);
                  }
                };

                utterance.onpause = () => {
                  console.log('⏸️ Browser TTS paused');
                  setIsPlayingResponse(false);
                };

                utterance.onresume = () => {
                  console.log('▶️ Browser TTS resumed');
                  setIsPlayingResponse(true);
                };

                // Add timeout for browser TTS
                const ttsTimeout = setTimeout(() => {
                  console.error('❌ Browser TTS timeout');
                  speechSynthesis.cancel();
                  setIsPlayingResponse(false);
                  reject(new Error('Browser TTS timeout'));
                }, 30000); // 30 second timeout

                // Clear timeout when speech ends
                const originalOnEnd = utterance.onend;
                utterance.onend = (event) => {
                  clearTimeout(ttsTimeout);
                  if (originalOnEnd) originalOnEnd(event);
                };

                const originalOnError = utterance.onerror;
                utterance.onerror = (event) => {
                  clearTimeout(ttsTimeout);
                  if (originalOnError) originalOnError(event);
                };

                // Start speech synthesis
                console.log('🗣️ Starting browser TTS synthesis');
                speechSynthesis.speak(utterance);

              } catch (speakError) {
                console.error('❌ Error in selectVoiceAndSpeak:', speakError);
                setIsPlayingResponse(false);
                reject(speakError);
              }
            }

          } catch (utteranceError) {
            console.error('❌ Error creating utterance:', utteranceError);
            setIsPlayingResponse(false);
            reject(utteranceError);
          }
        }

      } catch (error) {
        console.error('❌ Browser TTS setup failed:', error);
        setIsPlayingResponse(false);
        handleVoiceOutputError(error as Error, 'browser-tts-setup');
        reject(error);
      }
    });
  };

  // Enhanced audio playback stopping with comprehensive error handling and resource management
  const stopAudioPlayback = async (): Promise<void> => {
    try {
      console.log('⏹️ Stopping all audio playback...');

      let htmlAudioStopped = false;
      let browserTTSStopped = false;
      const errors: Error[] = [];

      // Stop HTML audio elements using resource manager
      if (audioResourceManagerRef.current) {
        try {
          console.log('🔇 Stopping all audio via resource manager...');
          audioResourceManagerRef.current.stopAllAudio();

          // Clean up current audio resource
          if (currentAudioResourceId.current) {
            audioResourceManagerRef.current.cleanupAudioResource(currentAudioResourceId.current);
            currentAudioResourceId.current = null;
          }

          setCurrentAudio(null);
          htmlAudioStopped = true;
          console.log('✅ All HTML audio elements stopped via resource manager');

        } catch (audioError) {
          console.error('❌ Error stopping audio via resource manager:', audioError);
          errors.push(new Error(`Resource manager audio stop failed: ${audioError.message}`));

          // Force cleanup even if error occurred
          setCurrentAudio(null);
          currentAudioResourceId.current = null;
        }
      } else {
        // Fallback to direct cleanup if resource manager not available
        if (currentAudio) {
          try {
            console.log('🔇 Stopping HTML audio element (fallback)...');

            if (!currentAudio.paused) {
              currentAudio.pause();
            }

            if (currentAudio.currentTime > 0) {
              currentAudio.currentTime = 0;
            }

            if (currentAudio.src) {
              currentAudio.src = '';
              currentAudio.load();
            }

            setCurrentAudio(null);
            htmlAudioStopped = true;
            console.log('✅ HTML audio element stopped (fallback)');

          } catch (audioError) {
            console.error('❌ Error stopping HTML audio (fallback):', audioError);
            errors.push(new Error(`HTML audio stop failed: ${audioError.message}`));
            setCurrentAudio(null);
          }
        } else {
          htmlAudioStopped = true;
          console.log('ℹ️ No HTML audio element to stop');
        }
      }

      // Stop browser TTS with error handling
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          console.log('🔇 Stopping browser TTS...');

          // Check if speech synthesis is speaking
          if (speechSynthesis.speaking) {
            speechSynthesis.cancel();

            // Wait a bit for cancellation to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify cancellation
            if (speechSynthesis.speaking) {
              console.warn('⚠️ Browser TTS still speaking after cancel');
              // Force another cancel
              speechSynthesis.cancel();
            }
          }

          browserTTSStopped = true;
          console.log('✅ Browser TTS cancelled successfully');

        } catch (ttsError) {
          console.error('❌ Error stopping browser TTS:', ttsError);
          errors.push(new Error(`Browser TTS stop failed: ${ttsError.message}`));

          // Try alternative cancellation method
          try {
            if (window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
          } catch (altError) {
            console.error('❌ Alternative TTS cancel also failed:', altError);
          }
        }
      } else {
        browserTTSStopped = true;
        console.log('ℹ️ Browser TTS not available or not in browser environment');
      }

      // Reset all playback states
      setIsPlayingResponse(false);
      setIsGeneratingTTS(false);

      // Report results
      if (htmlAudioStopped && browserTTSStopped) {
        console.log('✅ All audio playback stopped successfully');
      } else {
        console.warn('⚠️ Some audio stopping operations failed', {
          htmlAudioStopped,
          browserTTSStopped,
          errors: errors.map(e => e.message)
        });
      }

      // If there were errors but we managed to stop something, show a warning
      if (errors.length > 0 && (htmlAudioStopped || browserTTSStopped)) {
        showVoiceError("Audio stopped with some issues. Audio playback should be fully stopped.", 4000);
      }

      // If nothing could be stopped and there were errors, throw
      if (!htmlAudioStopped && !browserTTSStopped && errors.length > 0) {
        throw new Error(`Failed to stop audio: ${errors.map(e => e.message).join(', ')}`);
      }

    } catch (error) {
      console.error('❌ Critical error stopping audio playback:', error);

      // Force reset all states regardless of errors
      setIsPlayingResponse(false);
      setIsGeneratingTTS(false);
      setCurrentAudio(null);

      // Show user-friendly error
      handleVoiceOutputError(error as Error, 'stop-audio-playback');

      // Don't throw the error to prevent breaking the UI
      // The user can still continue using the application
    }
  };

  // Replay AI response audio
  const replayAIResponse = async (text: string): Promise<void> => {
    try {
      console.log('🔄 Replaying AI response audio');

      // Stop any currently playing audio
      await stopAudioPlayback();

      // Generate and play TTS for the response
      await playAIResponse(text);

    } catch (error) {
      console.error('❌ Failed to replay AI response:', error);
      toast({
        title: "Replay Failed",
        description: "Could not replay the audio response. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Replay message audio from stored URL or generate new audio
  const replayMessageAudio = async (audioUrl: string, messageText?: string): Promise<void> => {
    try {
      console.log('🔄 Replaying message audio');

      // Stop any currently playing audio
      await stopAudioPlayback();

      if (audioUrl) {
        // Play the stored audio
        console.log('Playing stored audio URL');
        await playAudioFromBase64(audioUrl, 'audio/mp3');
      } else if (messageText) {
        // Generate new audio for the message text
        console.log('Generating new audio for message text');
        await playAIResponse(messageText);
      } else {
        throw new Error('No audio URL or message text provided');
      }

    } catch (error) {
      console.error('❌ Failed to replay message audio:', error);
      toast({
        title: "Replay Failed",
        description: "Could not replay the audio. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Enhanced voice message history functionality
  const getVoiceMessageHistory = (): EnhancedChatMessage[] => {
    return messages.filter(msg =>
      msg.isVoiceInput ||
      msg.hasAudioResponse ||
      msg.audioUrl ||
      msg.audioResponseUrl
    );
  };

  const exportVoiceMessageHistory = async (): Promise<void> => {
    try {
      const voiceMessages = getVoiceMessageHistory();
      const exportData = {
        exportDate: new Date().toISOString(),
        totalMessages: voiceMessages.length,
        messages: voiceMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          language: msg.language,
          isVoiceInput: msg.isVoiceInput,
          hasAudioResponse: msg.hasAudioResponse,
          inputMethod: msg.inputMethod,
          responseFormat: msg.responseFormat,
          voiceProcessingTime: msg.voiceProcessingTime
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice-chat-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${voiceMessages.length} voice messages to JSON file.`,
        duration: 3000,
      });
    } catch (error) {
      console.error('❌ Failed to export voice message history:', error);
      toast({
        title: "Export Failed",
        description: "Could not export voice message history.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Handle audio playback control (pause/stop)
  const handleAudioPlaybackControl = async (): Promise<void> => {
    try {
      if (isPlayingResponse) {
        console.log('⏸️ Pausing/stopping audio playback');
        await stopAudioPlayback();

        toast({
          title: "Audio Stopped",
          description: "Audio playback has been stopped.",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('❌ Failed to control audio playback:', error);
    }
  };

  // Pause audio playback (without stopping completely)
  const pauseAudioPlayback = (): void => {
    try {
      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        setIsPlayingResponse(false);
        console.log('⏸️ Audio playback paused');
      }
    } catch (error) {
      console.error('❌ Failed to pause audio:', error);
    }
  };

  // Resume audio playback
  const resumeAudioPlayback = async (): Promise<void> => {
    try {
      if (currentAudio && currentAudio.paused) {
        await currentAudio.play();
        setIsPlayingResponse(true);
        console.log('▶️ Audio playback resumed');
      }
    } catch (error) {
      console.error('❌ Failed to resume audio:', error);
      toast({
        title: "Resume Failed",
        description: "Could not resume audio playback.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Check microphone permission status
  const checkMicrophonePermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
    try {
      if (typeof navigator === 'undefined' || !navigator.permissions) {
        return 'prompt';
      }

      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return permission.state as 'granted' | 'denied' | 'prompt';
    } catch (error) {
      console.warn('Could not check microphone permission:', error);
      return 'prompt';
    }
  };

  // Check if voice services are available using optimizer cache
  const checkVoiceServiceAvailability = async (forceRefresh = false) => {
    try {
      if (!voiceOptimizerRef.current) {
        throw new Error('Voice optimizer not initialized');
      }

      // Use optimizer to get cached or fresh service availability
      const availability = await voiceOptimizerRef.current.getServiceAvailability(forceRefresh);

      setVoiceServiceStatus(prev => ({
        ...prev,
        sttAvailable: availability.sttAvailable,
        ttsAvailable: availability.ttsAvailable,
        selectedTTSService: availability.selectedTTSService,
        microphonePermission: availability.microphonePermission
      }));

      return {
        sttAvailable: availability.sttAvailable,
        ttsAvailable: availability.ttsAvailable,
        microphonePermission: availability.microphonePermission
      };
    } catch (error) {
      console.error('❌ Service availability check failed:', error);
      return {
        sttAvailable: false,
        ttsAvailable: false,
        microphonePermission: 'denied' as const
      };
    }
  };

  useEffect(() => {
    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    // Initialize voice services
    initializeVoiceServices();

    // Load chat history
    loadChatHistory();

    // Load translations
    loadTranslations();

    // Voice input removed - text-only mode
    const handleVoiceInput = (event: CustomEvent) => {
      const { transcript, isVoice } = event.detail;
      console.log('Voice input disabled - text-only mode');

      if (transcript && isVoice) {
        // Voice input disabled
        const voiceMessage: EnhancedChatMessage = {
          id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: transcript,
          timestamp: new Date(),
          language: language,
          isVoice: true
        };

        console.log('Adding voice message to chat:', voiceMessage);
        setMessages(prev => {
          const newMessages = [...prev, voiceMessage];
          console.log('Updated messages:', newMessages);
          return newMessages;
        });

        // Process the voice input
        handleVoiceSubmit(transcript);
      }
    };

    // Listen for voice recognition events
    const handleVoiceStart = () => setIsListening(true);
    const handleVoiceEnd = () => setIsListening(false);

    // Add event listeners
    window.addEventListener('voiceInput' as any, handleVoiceInput);
    window.addEventListener('voiceStart' as any, handleVoiceStart);
    window.addEventListener('voiceEnd' as any, handleVoiceEnd);

    return () => {
      window.removeEventListener('voiceInput' as any, handleVoiceInput);
      window.removeEventListener('voiceStart' as any, handleVoiceStart);
      window.removeEventListener('voiceEnd' as any, handleVoiceEnd);

      // Cleanup all audio resources using resource manager
      cleanupAllAudioResources();
    };
  }, [language, user]);

  // Save message with voice data to persistent storage
  const saveMessageToHistory = async (message: EnhancedChatMessage) => {
    try {
      const userId = user?.uid || 'default-user';

      // Prepare message data for storage
      const messageData = {
        id: message.id,
        userId: userId,
        type: message.role,
        text: message.content,
        timestamp: message.timestamp?.toISOString() || new Date().toISOString(),
        language: message.language || 'en-US',
        // Voice-specific data
        isVoice: message.isVoice || false,
        isVoiceInput: message.isVoiceInput || false,
        hasAudioResponse: message.hasAudioResponse || false,
        audioUrl: message.audioUrl,
        audioResponseUrl: message.audioResponseUrl,
        voiceProcessingTime: message.voiceProcessingTime,
        inputMethod: message.inputMethod,
        responseFormat: message.responseFormat
      };

      console.log('Saving message to history:', messageData);

      const response = await fetch('/api/artisan-buddy/chat/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        console.error('Failed to save message to history:', response.status);
      } else {
        console.log('Message saved to history successfully');
      }
    } catch (error) {
      console.error('Error saving message to history:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const userId = user?.uid || 'default-user';
      console.log('Loading chat history for user:', userId);

      const response = await fetch(`/api/artisan-buddy/chat?limit=50&userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Chat history loaded:', data);

        if (data.messages && data.messages.length > 0) {
          // Convert stored messages to EnhancedChatMessage format
          const enhancedMessages: EnhancedChatMessage[] = data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.text,
            timestamp: new Date(msg.timestamp),
            language: msg.language || 'en-US',
            isVoice: msg.isVoice || false,
            audioUrl: msg.audioUrl,
            // Map new voice properties from stored data
            isVoiceInput: msg.isVoiceInput || msg.isVoice || false,
            hasAudioResponse: msg.hasAudioResponse || !!msg.audioUrl,
            audioResponseUrl: msg.audioResponseUrl || msg.audioUrl,
            voiceProcessingTime: msg.voiceProcessingTime,
            inputMethod: msg.inputMethod || (msg.isVoice ? 'voice' : 'text'),
            responseFormat: msg.responseFormat || (msg.audioUrl ? 'both' : 'text')
          }));
          setMessages(enhancedMessages);
          console.log('Enhanced messages set:', enhancedMessages);
        } else {
          // Set initial message if no history
          const initialMessage: EnhancedChatMessage = {
            role: "assistant",
            content: "Namaste! I am your Artisan Buddy. Ask me anything about your craft, business, or how I can help you today.",
            timestamp: new Date(),
            language: 'en-US',
            isVoice: false,
            hasAudioResponse: false,
            responseFormat: 'text'
          };
          setMessages([initialMessage]);
          console.log('No chat history, set initial message');
        }
      } else {
        console.error('Failed to load chat history, response not ok:', response.status);
        throw new Error('Failed to load chat history');
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Set initial message on error
      const initialMessage: EnhancedChatMessage = {
        role: "assistant",
        content: "Namaste! I am your Artisan Buddy. Ask me anything about your craft, business, or how I can help you today.",
        timestamp: new Date(),
        language: 'en-US',
        isVoice: false,
        hasAudioResponse: false,
        responseFormat: 'text'
      };
      setMessages([initialMessage]);
    }
  };

  const loadTranslations = async () => {
    try {
      const [title, description, placeholder, send, you, ai, initialMsg] = await Promise.all([
        translateAsync('chatTitle', language),
        translateAsync('chatDescription', language),
        translateAsync('chatPlaceholder', language),
        translateAsync('send', language),
        translateAsync('you', language),
        translateAsync('ai', language),
        translateAsync('chatInitialMessage', language),
      ]);

      setTranslatedTitle(title);
      setTranslatedDescription(description);
      setTranslatedPlaceholder(placeholder);
      setTranslatedSend(send);
      setTranslatedYou(you);
      setTranslatedAI(ai);
    } catch (error) {
      console.error('Chat translation loading failed:', error);
      // Fallback to static translations
      setTranslatedTitle(t('chatTitle', language) || 'Artisan Buddy');
      setTranslatedDescription(t('chatDescription', language) || 'Chat with your AI assistant 24/7.');
      setTranslatedPlaceholder(t('chatPlaceholder', language) || 'Ask about weaving techniques...');
      setTranslatedSend(t('send', language) || 'Send');
      setTranslatedYou(t('you', language) || 'You');
      setTranslatedAI(t('ai', language) || 'AI');
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const speakText = (text: string) => {
    if (synthRef.current && isVoiceEnabled) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
    }
  };

  // Simple voice message senderc (transcript: string) => {
  if (!transcript.trge = async (transcript: string) => {
    if (!transcript.trim() || loading) return;

    setLoading(true);

    try {
      const response = await fetch('/api/artisan-buddy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          language: language,
          isVoice: true,
          userId: user?.uid || 'default-user'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant' as const,
          content: data.response || 'I received your voice message!',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Speak the response
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(assistantMessage.content);
          utterance.lang = 'en-US';
          speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('❌ Voice message failed:', error);
      toast({
        title: "Message Failed",
        description: "Could not send voice message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceSubmit = async (transcript: string) => {
    if (!transcript.trim() || loading) return;

    console.log('Processing voice submit:', transcript);
    setLoading(true);

    try {
      const userId = user?.uid || 'default-user';

      // First, try to get an instant response from stream API
      try {
        const streamResponse = await fetch('/api/artisan-buddy/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: transcript,
            language: language,
            userId: userId,
            artisanId: user?.uid, // Use current user as artisan ID
            useDialogflow: true,
            useVectorSearch: true
          }),
        });

        if (streamResponse.ok) {
          const streamData = await streamResponse.json();
          console.log('Stream response received:', streamData);

          if (streamData.isFast) {
            // Show instant response
            const responseContent = typeof streamData.response === 'string'
              ? streamData.response
              : JSON.stringify(streamData.response);

            const instantMessage: EnhancedChatMessage = {
              id: `instant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              role: "assistant",
              content: responseContent,
              timestamp: new Date(),
              language: streamData.language || language,
              isVoice: false,
              hasAudioResponse: voiceConfig.voiceOutputEnabled,
              responseFormat: voiceConfig.voiceOutputEnabled ? 'both' : 'text'
            };

            setMessages((prev) => [...prev, instantMessage]);

            // Save instant response to history
            await saveMessageToHistory(instantMessage);

            // Speak the response if voice output is enabled and auto-play is on
            if (artisanBuddyVoiceConfig.shouldAutoPlayResponses() && streamData.response) {
              console.log('Speaking instant response:', streamData.response);
              await playAIResponse(streamData.response);
            }

            // Handle navigation if needed
            if (streamData.shouldNavigate && streamData.navigationTarget) {
              setTimeout(() => {
                window.location.href = streamData.navigationTarget;
              }, 1000);
            }

            setLoading(false);
            return;
          }
        }
      } catch (streamError) {
        console.log('Stream API failed, falling back to main API:', streamError);
      }

      // Fallback to main API if stream doesn't work
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch('/api/artisan-buddy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: transcript,
          language: language,
          enableTranslation: isTranslationEnabled,
          enableVoice: isVoiceEnabled,
          isVoice: true,
          userId: userId,
          artisanId: user?.uid, // Use current user as artisan ID
          fastMode: true,
          useDialogflow: true,
          useVectorSearch: true
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('AI response received:', data);
        console.log('Response type:', typeof data.response);
        console.log('Response content:', data.response);

        // Ensure response is a string
        const responseContent = typeof data.response === 'string'
          ? data.response
          : JSON.stringify(data.response);

        const assistantMessage: EnhancedChatMessage = {
          id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
          language: data.language || language,
          isVoice: false,
          audioUrl: data.audio,
          hasAudioResponse: !!data.audio,
          audioResponseUrl: data.audio,
          responseFormat: data.audio ? 'both' : 'text'
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Save AI response to history
        await saveMessageToHistory(assistantMessage);

        // Speak the response if voice output is enabled and auto-play is on
        if (artisanBuddyVoiceConfig.shouldAutoPlayResponses() && data.response) {
          console.log('Speaking response:', data.response);
          await playAIResponse(data.response);
        }

        // Handle navigation if needed
        if (data.shouldNavigate && data.navigationTarget) {
          setTimeout(() => {
            window.location.href = data.navigationTarget;
          }, 1000);
        }

        // Handle action data if available
        if (data.actionData) {
          console.log('Action data received:', data.actionData);
          // Additional action handling can be added here
        }
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(`Failed to get response: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Voice chat error:', error);

      // Add error message to chat
      const errorMessage: EnhancedChatMessage = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
        language: language,
        isVoice: false,
        hasAudioResponse: false,
        responseFormat: 'text'
      };
      setMessages((prev) => [...prev, errorMessage]);

      // Save error message to history
      await saveMessageToHistory(errorMessage);

      toast({
        title: t('chatError', language) || "Chat Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Enhanced voice input error handling
  // Enhanced voice input error handling using comprehensive error messaging
  const handleVoiceInputError = (error: Error, context: string) => {
    // Update service status for specific errors
    if (error.name === 'NotAllowedError') {
      setVoiceServiceStatus(prev => ({ ...prev, microphonePermission: 'denied' }));
    }

    // Use comprehensive error messaging system
    return showComprehensiveError(error, `voice-input-${context}`, {
      retryAction: () => {
        console.log('🔄 Retrying voice input after error');
        setTimeout(() => startVoiceRecording(), 1000);
      }
    });
  };

  // Voice recording functions with enhanced error handling
  const startVoiceRecording = async (retryWithBasicSettings = false) => {
    try {
      console.log('🎤 Starting voice recording...', { retryWithBasicSettings });

      // Clear any previous error states
      clearVoiceFeedback();
      setIsRecording(false);

      // Check if voice input is enabled
      if (!voiceConfig.voiceInputEnabled) {
        throw new Error('Voice input is disabled');
      }

      // Check service availability
      if (!voiceServiceStatus.sttAvailable) {
        throw new Error('Speech-to-text service is not available');
      }

      // Check microphone permission status first
      const permissionStatus = await checkMicrophonePermission();
      if (permissionStatus === 'denied') {
        throw new Error('Microphone access denied');
      }

      // Get optimized audio constraints from optimizer
      const audioConstraints = voiceOptimizerRef.current
        ? voiceOptimizerRef.current.getOptimizedAudioConstraints(retryWithBasicSettings)
        : retryWithBasicSettings ? {
          audio: true // Basic constraints for compatibility
        } : {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
            channelCount: 1
          }
        };

      // Request microphone permission with timeout
      const streamPromise = navigator.mediaDevices.getUserMedia(audioConstraints);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Microphone access timeout')), 10000);
      });

      const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;

      // Update permission status
      setVoiceServiceStatus(prev => ({
        ...prev,
        microphonePermission: 'granted'
      }));

      // Clear previous audio chunks
      audioChunksRef.current = [];

      // Determine best MIME type for recording
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }
      }

      // Create MediaRecorder with error handling
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log(`📊 Audio chunk received: ${event.data.size} bytes`);
        }
      };

      // Handle recording stop with enhanced error handling
      mediaRecorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing audio...');

        try {
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => {
            track.stop();
            console.log(`🔇 Stopped audio track: ${track.label}`);
          });

          // Validate audio chunks
          if (audioChunksRef.current.length === 0) {
            throw new Error('No audio data recorded');
          }

          const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          if (totalSize < 1000) { // Less than 1KB suggests very short or empty recording
            throw new Error('Recording too short or empty');
          }

          // Create audio blob from chunks
          let audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType || 'audio/webm'
          });

          // Optimize audio blob if optimizer is available
          if (voiceOptimizerRef.current) {
            audioBlob = await voiceOptimizerRef.current.optimizeAudioBlob(audioBlob);
          }

          console.log(`📊 Created audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
          setRecordedAudio(audioBlob);

          // Process the recorded audio with error handling
          await processVoiceInput(audioBlob);

        } catch (error) {
          console.error('❌ Error in recording stop handler:', error);
          setIsRecording(false);
          handleVoiceInputError(error as Error, 'recording-stop');
        }
      };

      // Handle MediaRecorder errors
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setIsRecording(false);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        const error = new Error(`Recording error: ${(event as any).error?.message || 'Unknown error'}`);
        handleVoiceInputError(error, 'media-recorder');
      };

      // Handle stream errors
      stream.getAudioTracks().forEach(track => {
        track.onerror = (event) => {
          console.error('❌ Audio track error:', event);
          const error = new Error(`Audio track error: ${(event as any).error?.message || 'Unknown error'}`);
          handleVoiceInputError(error, 'audio-track');
        };
      });

      // Start recording with data collection interval
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      console.log('✅ Voice recording started successfully');
      showVoiceSuccess("Recording started. Speak clearly into your microphone.");

      // Auto-stop recording after 30 seconds to prevent indefinite recording
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('⏰ Auto-stopping recording after 30 seconds');
          stopVoiceRecording();
        }
      }, 30000);

    } catch (error) {
      console.error('❌ Failed to start voice recording:', error);
      setIsRecording(false);

      const errorResult = handleVoiceInputError(error as Error, 'start-recording');

      // Retry with basic settings if this was the first attempt and error suggests compatibility issues
      if (!retryWithBasicSettings &&
        (error as Error).name === 'OverconstrainedError' &&
        errorResult.retryable) {
        console.log('🔄 Retrying with basic audio settings...');
        setTimeout(() => startVoiceRecording(true), 2000);
      }
    }
  };

  const stopVoiceRecording = async () => {
    try {
      console.log('🛑 Stopping voice recording...');

      if (!mediaRecorderRef.current) {
        console.warn('⚠️ No MediaRecorder available to stop');
        setIsRecording(false);
        return;
      }

      const currentState = mediaRecorderRef.current.state;
      console.log(`📊 MediaRecorder state: ${currentState}`);

      if (currentState === 'recording') {
        // Stop recording gracefully
        mediaRecorderRef.current.stop();
        console.log('✅ Recording stop initiated');
      } else if (currentState === 'paused') {
        // Resume and then stop if paused
        mediaRecorderRef.current.resume();
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, 100);
      } else {
        console.warn(`⚠️ MediaRecorder in unexpected state: ${currentState}`);
        setIsRecording(false);

        // Force cleanup if in unexpected state
        if (currentState === 'inactive') {
          // Recording already stopped, just update UI
          showVoiceError("Recording already stopped.", 3000);
        }
      }

    } catch (error) {
      console.error('❌ Failed to stop voice recording:', error);
      setIsRecording(false);

      // Force cleanup on error
      try {
        if (mediaRecorderRef.current) {
          const stream = mediaRecorderRef.current.stream;
          if (stream) {
            stream.getTracks().forEach(track => {
              track.stop();
              console.log(`🔇 Force stopped track: ${track.label}`);
            });
          }
        }
      } catch (cleanupError) {
        console.error('❌ Error during force cleanup:', cleanupError);
      }

      handleVoiceInputError(error as Error, 'stop-recording');
    }
  };

  // Enhanced STT processing with comprehensive error handling and fallbacks
  const processVoiceInput = async (audioBlob: Blob, retryCount = 0) => {
    const processingStartTime = Date.now();
    const maxRetries = 2;

    try {
      console.log('🔄 Processing voice input...', {
        size: audioBlob.size,
        type: audioBlob.type,
        retryCount
      });

      setIsProcessingVoice(true);
      setIsRecording(false);

      // Validate audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid audio data - empty recording');
      }

      if (audioBlob.size < 1000) {
        throw new Error('Recording too short - please speak for at least 1 second');
      }

      if (audioBlob.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Recording too large - please keep recordings under 30 seconds');
      }

      // Check STT service availability
      if (!speechServiceRef.current) {
        throw new Error('Speech-to-text service not available');
      }

      // Convert blob to ArrayBuffer with error handling
      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await audioBlob.arrayBuffer();
      } catch (conversionError) {
        throw new Error('Failed to process audio data - invalid format');
      }

      if (arrayBuffer.byteLength === 0) {
        throw new Error('Audio data is empty after conversion');
      }

      console.log(`📊 Audio data prepared: ${arrayBuffer.byteLength} bytes`);

      // Prepare STT options with fallback language detection
      const sttOptions = {
        language: language === 'hi' ? 'hi-IN' : 'en-US',
        model: 'gemini-2.0-flash-exp',
        timeout: 15000, // 15 second timeout
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false
      };

      // Attempt STT processing with timeout
      let result;
      try {
        const sttPromise = speechServiceRef.current.speechToText(arrayBuffer, sttOptions);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('STT processing timeout')), sttOptions.timeout);
        });

        result = await Promise.race([sttPromise, timeoutPromise]);
      } catch (sttError) {
        console.error('❌ STT service error:', sttError);

        // Handle specific STT errors
        if (sttError instanceof Error) {
          if (sttError.message.includes('timeout')) {
            throw new Error('Speech processing timed out - please try a shorter recording');
          } else if (sttError.message.includes('network')) {
            throw new Error('Network error during speech processing - check your connection');
          } else if (sttError.message.includes('quota') || sttError.message.includes('limit')) {
            throw new Error('Speech service temporarily unavailable - please try again later');
          } else if (sttError.message.includes('format') || sttError.message.includes('codec')) {
            throw new Error('Audio format not supported - please try recording again');
          }
        }

        throw sttError;
      }

      console.log('✅ STT result received:', result);

      // Validate STT result
      if (!result) {
        throw new Error('No response from speech service');
      }

      if (!result.text || typeof result.text !== 'string') {
        throw new Error('Invalid response from speech service');
      }

      const transcribedText = result.text.trim();
      if (transcribedText.length === 0) {
        throw new Error('No speech detected in the recording');
      }

      // Filter out common STT error messages and artifacts
      const errorPatterns = [
        /speech recognition/i,
        /audio recorded successfully/i,
        /please use text input/i,
        /speech recognition failed/i,
        /no speech detected/i,
        /network error/i,
        /microphone access denied/i,
        /^error:/i,
        /^failed:/i,
        /^\[.*\]$/,  // Filter bracketed system messages
        /^\.+$/,     // Filter dots only
        /^[^a-zA-Z0-9\u0900-\u097F]*$/ // Filter non-alphanumeric (including Hindi)
      ];

      const isErrorMessage = errorPatterns.some(pattern => pattern.test(transcribedText));
      if (isErrorMessage) {
        throw new Error(`STT returned error message: ${transcribedText}`);
      }

      // Check for minimum meaningful length
      if (transcribedText.length < 2) {
        throw new Error('Transcribed text too short - please speak more clearly');
      }

      // Validate language detection if available
      const detectedLanguage = result.language || language;
      const expectedLanguage = language === 'hi' ? 'hi' : 'en';

      if (detectedLanguage && !detectedLanguage.toLowerCase().startsWith(expectedLanguage)) {
        console.warn(`⚠️ Language mismatch: expected ${expectedLanguage}, detected ${detectedLanguage}`);
        // Don't throw error, just log warning
      }

      const processingTime = Date.now() - processingStartTime;
      console.log(`✅ Voice processing completed in ${processingTime}ms`);

      // Track STT performance
      if (voiceOptimizerRef.current) {
        voiceOptimizerRef.current.trackSTTPerformance(processingTime);
      }

      // Create voice message with enhanced metadata
      const voiceMessage: EnhancedChatMessage = {
        id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: transcribedText,
        timestamp: new Date(),
        language: detectedLanguage,
        isVoice: true,
        isVoiceInput: true,
        inputMethod: 'voice',
        voiceProcessingTime: processingTime
      };

      console.log('📝 Adding voice message to chat:', voiceMessage);
      setMessages(prev => [...prev, voiceMessage]);

      // Save voice message to history
      await saveMessageToHistory(voiceMessage);

      // Process the voice input through the chat system
      await handleVoiceSubmit(transcribedText);

      // Show success feedback
      const successMessage = `Recognized: "${transcribedText.substring(0, 50)}${transcribedText.length > 50 ? '...' : ''}"`;
      showVoiceSuccess(successMessage);

      toast({
        title: "Voice Input Processed",
        description: successMessage,
        duration: 3000,
      });

    } catch (error) {
      console.error('❌ Voice input processing failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Determine if error is retryable
      const retryableErrors = [
        'timeout',
        'network',
        'connection',
        'service temporarily unavailable',
        'processing timed out'
      ];

      const isRetryable = retryableErrors.some(pattern =>
        errorMessage.toLowerCase().includes(pattern)
      ) && retryCount < maxRetries;

      if (isRetryable) {
        console.log(`🔄 Retrying voice processing (attempt ${retryCount + 1}/${maxRetries + 1})`);
        showVoiceError(`Processing failed, retrying... (${retryCount + 1}/${maxRetries + 1})`, 4000);

        // Retry with exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setTimeout(() => {
          processVoiceInput(audioBlob, retryCount + 1);
        }, retryDelay);

        return; // Don't show final error message yet
      }

      // Handle non-retryable errors or max retries reached
      let friendlyMessage = "Failed to process voice input.";
      let actionable = false;

      if (errorMessage.includes('No speech detected') || errorMessage.includes('too short')) {
        friendlyMessage = "No speech was detected. Please speak clearly and try again.";
      } else if (errorMessage.includes('Recording too short')) {
        friendlyMessage = "Recording was too short. Please speak for at least 1 second.";
      } else if (errorMessage.includes('Recording too large')) {
        friendlyMessage = "Recording was too long. Please keep recordings under 30 seconds.";
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        friendlyMessage = "Network error during voice processing. Please check your connection and try again.";
        actionable = true;
      } else if (errorMessage.includes('timeout')) {
        friendlyMessage = "Voice processing timed out. Please try a shorter recording.";
      } else if (errorMessage.includes('service') || errorMessage.includes('quota')) {
        friendlyMessage = "Voice service temporarily unavailable. Please try again later or use text input.";
        actionable = true;
      } else if (errorMessage.includes('format') || errorMessage.includes('codec')) {
        friendlyMessage = "Audio format not supported. Please try recording again.";
      } else if (errorMessage.includes('Invalid audio data')) {
        friendlyMessage = "Invalid audio recording. Please try recording again.";
      } else {
        friendlyMessage = `Voice processing failed: ${errorMessage}. Please try again or use text input.`;
      }

      // Show visual error feedback
      showVoiceError(friendlyMessage, 8000);

      // Show user-friendly error message with retry option
      toast({
        title: "Voice Processing Failed",
        description: friendlyMessage,
        variant: "destructive",
        duration: actionable ? 10000 : 6000,
        action: actionable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('🔄 Manual retry requested');
              setTimeout(() => startVoiceRecording(), 1000);
            }}
          >
            Try Again
          </Button>
        ) : undefined,
      });

      // Add contextual error message to chat
      const errorChatMessage: EnhancedChatMessage = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: "I couldn't process your voice input. Please try speaking again or type your message instead.",
        timestamp: new Date(),
        language: language,
        isVoice: false,
        hasAudioResponse: false,
        responseFormat: 'text'
      };
      setMessages(prev => [...prev, errorChatMessage]);

      // Save error message to history for debugging
      await saveMessageToHistory(errorChatMessage);

    } finally {
      setIsProcessingVoice(false);
      setRecordedAudio(null);

      // Clean up audio chunks
      audioChunksRef.current = [];

      // Clean up MediaRecorder reference if still exists
      if (mediaRecorderRef.current) {
        try {
          const stream = mediaRecorderRef.current.stream;
          if (stream) {
            stream.getTracks().forEach(track => {
              if (track.readyState !== 'ended') {
                track.stop();
              }
            });
          }
        } catch (cleanupError) {
          console.warn('⚠️ Error during cleanup:', cleanupError);
        }
        mediaRecorderRef.current = null;
      }
    }
  };

  // Handle seamless input method switching
  const switchInputMethod = (method: 'text' | 'voice') => {
    console.log(`🔄 Switching input method to: ${method}`);

    if (method === 'voice') {
      // Switch to voice input
      if (!voiceConfig.voiceInputEnabled) {
        updateVoiceConfig({ voiceInputEnabled: true });
        toast({
          title: "Voice Input Enabled",
          description: "You can now use voice input. Click the microphone button to start.",
          duration: 3000,
        });
      }
    } else {
      // Switch to text input - no special action needed, text input is always available
      if (isRecording) {
        // Stop any ongoing recording when switching to text
        stopVoiceRecording();
      }
    }
  };

  // Handle simultaneous voice and text processing
  const handleSimultaneousInput = async (textInput: string, voiceInput?: string) => {
    console.log('🔄 Handling simultaneous input:', { textInput, voiceInput });

    // If both inputs are provided, prioritize the most recent one
    const finalInput = voiceInput || textInput;
    const inputMethod = voiceInput ? 'voice' : 'text';

    // Create message with appropriate input method
    const userMessage: EnhancedChatMessage = {
      id: `${inputMethod}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: "user",
      content: finalInput,
      timestamp: new Date(),
      language: language,
      isVoice: inputMethod === 'voice',
      isVoiceInput: inputMethod === 'voice',
      inputMethod: inputMethod
    };

    setMessages((prev) => [...prev, userMessage]);

    // Process the input through the appropriate handler
    if (inputMethod === 'voice') {
      await handleVoiceSubmit(finalInput);
    } else {
      // Clear text input and process
      setInput("");
      await processTextSubmit(finalInput);
    }
  };

  // Separate text processing function for better organization
  const processTextSubmit = async (textInput: string) => {
    setLoading(true);

    try {
      const userId = user?.uid || 'default-user';
      const response = await fetch('/api/artisan-buddy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: textInput,
          language: language,
          enableTranslation: isTranslationEnabled,
          enableVoice: isVoiceEnabled,
          isVoice: false,
          userId: userId,
          artisanId: user?.uid,
          useDialogflow: true,
          useVectorSearch: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('AI response received for text:', data);

        const responseContent = typeof data.response === 'string'
          ? data.response
          : JSON.stringify(data.response);

        const assistantMessage: EnhancedChatMessage = {
          id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
          language: data.language || language,
          isVoice: false,
          audioUrl: data.audio,
          hasAudioResponse: !!data.audio,
          audioResponseUrl: data.audio,
          responseFormat: data.audio ? 'both' : 'text'
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Save AI response to history
        await saveMessageToHistory(assistantMessage);

        // Speak the response if voice output is enabled and auto-play is on
        if (artisanBuddyVoiceConfig.shouldAutoPlayResponses() && data.response) {
          console.log('Speaking response:', data.response);
          await playAIResponse(data.response);
        }
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(`Failed to get response: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage: EnhancedChatMessage = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
        language: language,
        isVoice: false,
        hasAudioResponse: false,
        responseFormat: 'text'
      };
      setMessages((prev) => [...prev, errorMessage]);

      // Save error message to history
      await saveMessageToHistory(errorMessage);

      toast({
        title: t('chatError', language) || "Chat Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Voice input toggle handler with seamless switching
  const handleVoiceToggle = async () => {
    if (!voiceConfig.voiceInputEnabled) {
      toast({
        title: "Voice Input Disabled",
        description: "Voice input is disabled. Enable it using the Input button in the header.",
        duration: 3000,
      });
      return;
    }

    if (!voiceServiceStatus.sttAvailable) {
      toast({
        title: "Voice Input Unavailable",
        description: "Speech-to-text service is not available. Please type your message instead.",
        duration: 3000,
      });
      return;
    }

    if (voiceServiceStatus.microphonePermission === 'denied') {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use voice input.",
        duration: 3000,
      });
      return;
    }

    if (isRecording) {
      // Stop recording
      await stopVoiceRecording();
    } else {
      // Check if user has text input in progress
      if (input.trim()) {
        toast({
          title: "Text Input Detected",
          description: "You have text in the input field. Submit it first or clear it to use voice input.",
          duration: 4000,
        });
        return;
      }

      // Start recording
      await startVoiceRecording();
    }
  };

  // REAL voice message sender
  const sendVoiceMessage = async (transcript: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/artisan-buddy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          language: language,
          isVoice: true,
          userId: user?.uid || 'default-user'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: EnhancedChatMessage = {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content: data.response || 'I received your voice message!',
          timestamp: new Date(),
          language: language,
          isVoice: false
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Speak the response
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(assistantMessage.content);
          utterance.lang = 'en-US';
          speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('❌ Voice message failed:', error);
      toast({
        title: "Message Failed",
        description: "Could not send voice message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: EnhancedChatMessage = {
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: "user",
      content: input,
      timestamp: new Date(),
      language: language,
      isVoice: false,
      isVoiceInput: false,
      inputMethod: 'text'
    };

    console.log('Adding user text message:', userMessage);
    setMessages((prev) => [...prev, userMessage]);

    // Save text message to history
    await saveMessageToHistory(userMessage);

    const currentInput = input;
    setInput("");

    // Use the new processTextSubmit function for consistency
    await processTextSubmit(currentInput);
  };

  return (
    <Card id="chat" className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-headline flex items-center gap-2">
            <BotMessageSquare className="size-6 text-primary" />
            {translatedTitle}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Voice Input Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateVoiceConfig({ voiceInputEnabled: !voiceConfig.voiceInputEnabled })}
              disabled={!voiceServiceStatus.servicesInitialized || !voiceServiceStatus.sttAvailable}
              className={cn(
                "flex items-center gap-2",
                voiceConfig.voiceInputEnabled ? "bg-blue-500 text-white" : "",
                !voiceServiceStatus.servicesInitialized && "opacity-50"
              )}
              title={
                !voiceServiceStatus.servicesInitialized
                  ? "Initializing voice services..."
                  : !voiceServiceStatus.sttAvailable
                    ? "Voice input unavailable"
                    : `Voice input ${voiceConfig.voiceInputEnabled ? 'enabled' : 'disabled'}`
              }
            >
              {!voiceServiceStatus.servicesInitialized ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              Input
              {voiceServiceStatus.servicesInitialized && (
                <div className={cn(
                  "w-2 h-2 rounded-full ml-1",
                  voiceServiceStatus.sttAvailable
                    ? voiceConfig.voiceInputEnabled
                      ? "bg-green-500"
                      : "bg-yellow-500"
                    : "bg-red-500"
                )} />
              )}
            </Button>

            {/* Voice Output Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateVoiceConfig({ voiceOutputEnabled: !voiceConfig.voiceOutputEnabled })}
              disabled={!voiceServiceStatus.servicesInitialized || !voiceServiceStatus.ttsAvailable}
              className={cn(
                "flex items-center gap-2",
                voiceConfig.voiceOutputEnabled ? "bg-green-500 text-white" : "",
                !voiceServiceStatus.servicesInitialized && "opacity-50"
              )}
              title={
                !voiceServiceStatus.servicesInitialized
                  ? "Initializing voice services..."
                  : !voiceServiceStatus.ttsAvailable
                    ? "Voice output unavailable"
                    : `Voice output ${voiceConfig.voiceOutputEnabled ? 'enabled' : 'disabled'} (${voiceServiceStatus.selectedTTSService})`
              }
            >
              {!voiceServiceStatus.servicesInitialized ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : voiceConfig.voiceOutputEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              Output
              {voiceServiceStatus.servicesInitialized && (
                <div className={cn(
                  "w-2 h-2 rounded-full ml-1",
                  voiceServiceStatus.ttsAvailable
                    ? voiceConfig.voiceOutputEnabled
                      ? isGeneratingTTS || isPlayingResponse
                        ? "bg-blue-500 animate-pulse"
                        : "bg-green-500"
                      : "bg-yellow-500"
                    : "bg-red-500"
                )} />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTranslationEnabled(!isTranslationEnabled)}
              className={cn(
                "flex items-center gap-2",
                isTranslationEnabled ? "bg-primary text-primary-foreground" : ""
              )}
            >
              🌐 Translate
            </Button>

            {/* Voice Status Toggle */}
            {voiceServiceStatus.servicesInitialized && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetailedStatus(!showDetailedStatus)}
                className={cn(
                  "flex items-center gap-2",
                  showDetailedStatus ? "bg-gray-500 text-white" : ""
                )}
                title="Toggle detailed voice status"
              >
                📊 Status
              </Button>
            )}

            {/* Service Check Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                console.log('🔍 Manual service status check requested');
                const status = await checkVoiceServiceAvailability(true); // Force refresh
                showServiceStatus(status);
              }}
              className="flex items-center gap-2"
              title="Check voice service status (force refresh)"
            >
              🔍 Check Services
            </Button>

            {/* Performance Metrics */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (voiceOptimizerRef.current) {
                  const metrics = voiceOptimizerRef.current.getPerformanceMetrics();
                  const ttsStats = voiceOptimizerRef.current.getTTSCacheStats();
                  toast({
                    title: "Voice Performance",
                    description: `STT: ${metrics.averageSTTTime.toFixed(0)}ms avg | TTS: ${metrics.averageTTSTime.toFixed(0)}ms avg | Cache: ${ttsStats.hitRate.toFixed(1)}%`,
                    duration: 8000,
                  });
                }
              }}
              className="flex items-center gap-2"
              title="View voice performance metrics"
            >
              📊 Performance
            </Button>

            {/* Voice History Management */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportVoiceMessageHistory}
              className="flex items-center gap-2"
              title="Export voice message history"
            >
              🎤 History ({getVoiceMessageHistory().length})
            </Button>

            {/* Audio Cache Management */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (audioResourceManagerRef.current) {
                  const stats = audioResourceManagerRef.current.getCacheStats();
                  toast({
                    title: "Audio Cache Stats",
                    description: `${stats.totalItems} items, ${(stats.totalSize / 1024 / 1024).toFixed(1)}MB, ${stats.activeElements} active`,
                    duration: 5000,
                  });
                }
              }}
              className="flex items-center gap-2"
              title="View audio cache statistics"
            >
              🗂️ Cache
            </Button>

            {/* Manual Cache Cleanup */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                let cleanupMessage = "Cache cleanup completed.";

                if (audioResourceManagerRef.current) {
                  audioResourceManagerRef.current.cleanupExpiredResources();
                  audioResourceManagerRef.current.cleanupToLimits();
                  cleanupMessage += " Audio resources cleaned.";
                }

                if (voiceOptimizerRef.current) {
                  const ttsStats = voiceOptimizerRef.current.getTTSCacheStats();
                  if (ttsStats.totalItems > 0) {
                    voiceOptimizerRef.current.clearTTSCache();
                    cleanupMessage += ` ${ttsStats.totalItems} TTS cache entries cleared.`;
                  }
                }

                toast({
                  title: "Cache Cleaned",
                  description: cleanupMessage,
                  duration: 4000,
                });
              }}
              className="flex items-center gap-2"
              title="Clean up all caches"
            >
              🧹 Cleanup All
            </Button>
          </div>
        </div>
        <CardDescription>
          {translatedDescription}
          {voiceServiceStatus.servicesInitialized && (
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Voice: {voiceServiceStatus.sttAvailable ? (voiceConfig.voiceInputEnabled ? '🎤✅' : '🎤⏸️') : '🎤❌'} Input |
                {voiceServiceStatus.ttsAvailable ? (voiceConfig.voiceOutputEnabled ? '🔊✅' : '🔊⏸️') : '🔊❌'} Output
                ({voiceServiceStatus.selectedTTSService})
                {voiceServiceStatus.microphonePermission === 'denied' && ' | Mic access denied'}
              </div>

              {/* Current voice activity indicator */}
              {(isRecording || isProcessingVoice || isGeneratingTTS || isPlayingResponse) && (
                <div className="flex items-center gap-2 text-xs">
                  {isRecording && (
                    <div className="flex items-center gap-1 text-red-600">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span>Recording</span>
                    </div>
                  )}
                  {isProcessingVoice && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Processing</span>
                    </div>
                  )}
                  {isGeneratingTTS && (
                    <div className="flex items-center gap-1 text-purple-600">
                      <div className="w-2 h-2 border border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating</span>
                    </div>
                  )}
                  {isPlayingResponse && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Volume2 className="w-3 h-3" />
                      <span>Playing</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardDescription>
        {messages.length === 1 && messages[0].role === 'assistant' && (
          <div className="mt-2 space-y-2">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 <strong>Tip:</strong> Type your messages below to chat with me!
              </p>
            </div>
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                🎯 <strong>I can help with:</strong> Product creation, Sales tracking, Trend analysis, Buyer connections, and general business advice!
              </p>
            </div>
            <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-700">
                👤 <strong>Personalize me:</strong> <a href="/artisan-buddy/profile" className="underline font-semibold">Set up your artisan profile</a> for more personalized assistance!
              </p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {/* Voice status indicator */}
            {voiceServiceStatus.servicesInitialized && <VoiceStatusIndicator />}

            {/* Voice feedback indicators */}
            {voiceConfig.enableVisualFeedback && (
              <>
                {isRecording && <RecordingIndicator />}
                {isProcessingVoice && <ProcessingIndicator />}
                {voiceError && <ErrorIndicator message={voiceError} />}
                {voiceSuccess && <SuccessIndicator message={voiceSuccess} />}
                <ComprehensiveErrorIndicator />
              </>
            )}

            {/* Legacy listening indicator for backward compatibility */}
            {isListening && !voiceConfig.enableVisualFeedback && (
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-red-700">Listening... Speak now</span>
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={cn(
                  "flex items-start gap-3 mb-4",
                  message.role === "user" && "justify-end"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="size-8 border shrink-0">
                    <AvatarImage src="/api/placeholder/100/100/artisan" alt="Artisan Avatar" />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                      {translatedAI}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-xs md:max-w-md rounded-lg p-3 text-sm shadow-sm",
                    message.role === "assistant"
                      ? "bg-muted border"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {message.isVoiceInput && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Mic className="h-3 w-3" />
                        Voice Input
                        {message.voiceProcessingTime && (
                          <span className="text-xs opacity-70">
                            ({(message.voiceProcessingTime / 1000).toFixed(1)}s)
                          </span>
                        )}
                      </Badge>
                    )}
                    {message.hasAudioResponse && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Volume2 className="h-3 w-3" />
                        Audio Response
                      </Badge>
                    )}
                    {message.inputMethod && (
                      <Badge variant="default" className="text-xs">
                        {message.inputMethod === 'voice' ? '🎤' : '⌨️'} {message.inputMethod}
                      </Badge>
                    )}
                    {message.language && message.language !== language && (
                      <Badge variant="outline" className="text-xs">
                        {message.language}
                      </Badge>
                    )}
                    {(message as any).intent && (
                      <Badge variant="default" className="text-xs">
                        {(message as any).intent}
                      </Badge>
                    )}
                    {(message as any).contextUsed && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        🧠 Context
                      </Badge>
                    )}
                    {(message.audioUrl || message.audioResponseUrl || message.hasAudioResponse) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => replayMessageAudio(
                          message.audioResponseUrl || message.audioUrl || '',
                          message.content
                        )}
                        title={
                          message.audioResponseUrl || message.audioUrl
                            ? "Replay stored audio response"
                            : "Generate and play audio for this message"
                        }
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    )}
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-1">
                        {/* Replay button for AI responses */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => replayAIResponse(message.content)}
                          disabled={isGeneratingTTS}
                          title="Replay this response"
                        >
                          {isGeneratingTTS ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Volume2 className="h-3 w-3" />
                          )}
                        </Button>

                        {/* Stop/Pause button when audio is playing */}
                        {isPlayingResponse && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600"
                            onClick={handleAudioPlaybackControl}
                            title="Stop audio playback"
                          >
                            <VolumeX className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {typeof message.content === 'string'
                      ? message.content
                      : JSON.stringify(message.content)
                    }
                  </div>
                  {message.timestamp && (
                    <div className="text-xs opacity-70 mt-2 flex items-center justify-between">
                      <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-2">
                          {/* Enhanced visual feedback for voice output */}
                          {voiceConfig.enableVisualFeedback && index === messages.length - 1 && (
                            <>
                              {isGeneratingTTS && <GeneratingAudioIndicator />}
                              {isPlayingResponse && <SpeakingIndicator />}
                            </>
                          )}

                          {/* Legacy indicators for backward compatibility */}
                          {!voiceConfig.enableVisualFeedback && (
                            <>
                              {isSpeaking && index === messages.length - 1 && (
                                <div className="flex items-center gap-1 text-blue-600">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                  <span>Speaking...</span>
                                </div>
                              )}
                              {(isPlayingResponse || isGeneratingTTS) && index === messages.length - 1 && (
                                <div className="flex items-center gap-1 text-green-600">
                                  {isGeneratingTTS ? (
                                    <>
                                      <div className="w-2 h-2 border border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                      <span>Generating audio...</span>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-0.5">
                                        <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                        <div className="w-1 h-2 bg-green-500 rounded-full animate-pulse delay-75"></div>
                                        <div className="w-1 h-4 bg-green-500 rounded-full animate-pulse delay-150"></div>
                                        <div className="w-1 h-2 bg-green-500 rounded-full animate-pulse delay-225"></div>
                                        <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse delay-300"></div>
                                      </div>
                                      <span>Playing audio...</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <Avatar className="size-8 border shrink-0">
                    <AvatarFallback className="bg-green-100 text-green-600 font-semibold">
                      {translatedYou}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-3 mb-4">
                <Avatar className="size-8 border shrink-0">
                  <AvatarImage src="/api/placeholder/100/100/artisan" alt="Artisan Avatar" />
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                    {translatedAI}
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-xs md:max-w-md rounded-lg p-3 text-sm bg-muted border shadow-sm">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-0"></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-300"></span>
                    <span className="text-xs text-muted-foreground ml-2">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2 relative">
          <div className="relative flex-1">
            <Input
              id="chat-input"
              placeholder={translatedPlaceholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || isRecording}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
                // Keyboard shortcut for voice input (Ctrl/Cmd + M)
                if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                  e.preventDefault();
                  if (voiceConfig.voiceInputEnabled && voiceServiceStatus.sttAvailable) {
                    handleVoiceToggle();
                  } else {
                    switchInputMethod('voice');
                  }
                }
                // Escape key to cancel voice recording
                if (e.key === 'Escape' && isRecording) {
                  e.preventDefault();
                  stopVoiceRecording();
                }
              }}
              className={cn(
                "pr-12",
                isRecording && "border-red-300 bg-red-50",
                isProcessingVoice && "border-blue-300 bg-blue-50"
              )}
            />

            {/* Input method indicator */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {isRecording && (
                <div className="flex items-center gap-1 text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs">Recording</span>
                </div>
              )}
              {isProcessingVoice && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs">Processing</span>
                </div>
              )}
              {!isRecording && !isProcessingVoice && voiceConfig.voiceInputEnabled && voiceServiceStatus.sttAvailable && (
                <div className="text-xs text-muted-foreground">
                  Ctrl+M for voice
                </div>
              )}
            </div>
          </div>

          {/* REAL WORKING MICROPHONE BUTTON */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={async () => {
              try {
                if (isRecording) {
                  setIsRecording(fg
                  return;
                }

        eb Speech API
                const SpeechRecognition = ecognition || (wiechRecognition
                if (!Speecdingognition) {
                  toast({
                    // Usitle: "Voice Not Supporteli,
                    description: "Your browser dowindow || ort voice inpit",
                    variant: "destrnition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                  });
ition             return;
= new Spee
              }

                const recognition = nchRecognition(); tion();
              rentinuous = false;
              recognition.interimResults = false;
              recognition.lang = 'en-US';

           setIsRecrue);
          recognition.continuous = false;
                re       on.onstart = () => {recognition.interimResults = false;
          console.  g('🎤 Voice                reco;
       gnit     };

             ion.lang = 'en-US';lt = (event: any) => {
                  const transcr      event.results[0][0].        pt;
          console.log recognized:', trans;
          setInpuscript);
          setIsRecording(false);

                  // Auto-   d the       e
                     Timeout(() => {
            recogni           const userMtion.on> {
            id: `vo   console.now()}`,
          log(              role: 'us'cogas const,nition started')
          <             content script,
          set        /forcording(true);(),
          is
                    };
             };etMessages(pr=> [...prev, userMe
          setInput('');

          // Send to API
          handleVoicranscript);
                  }, 100);
         };

                recognition.onerror = (event: any) => {recognition.onresult m>ent: any) => {
            co        console.nst transcript = evor:', event.error);
          ent.rt          setIsRecording(false);
          s[0][ toast({
            title: "Voice Error",0].transc
          description   consoh recognitle. Voice re${event.error}`,
          cognized:         varia',: "destruc t
                  });
          (transcript
          set    <ording(false);
                recognition.onend = () => {
            s / Card}, 100)
          ;
      /Recording(fa/ AFooter>t tlse);
          recognit  n.start(             toast(t: "destructive",
          duration:
          console.error('❌ Voi   setup failed           
              });ion encording(false);
          ded');    toast({
            title: "Voice Seiled",
          descriptionot initialize voice input",
          variant: "destructive",
                });
              }
            }}
          disabled={loading}
          className={cn(
            "transition-colors",
            isRecording && "bg-red-500 text-white animate-pulse"
          )}
          title={isRecording ? "Recording... Click to stop" : "Click to speak"}
          >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button></form>
      seng(false);
      tart();estructive",
      on: 3000,
                });
           
            }}{loading}
      e={cn(oncording && -bg - red - 500 text - white animate - pcolo"
      )}ick to stop" :ick to staput"}
      {isRecording ? (
        title = { isrs",Name="h - 4 w
            ) : (Name = "h-4 w-4" />

        <span cl sr-only">Voice Input</span>
          </Button >/>span>
    / Button >
    <span"sr-only" > {
      translat
t.tr < Send cim()
    } > lassName="h

  ype = "submit"ze = "icon" disabled = { loading || !i

  dis
}; var    } else {ion not ",

}se);rt voice inp.Please type your message.
  t({
    browser doesn'
         t        descriptitle: "Voicupported",

    setIsRecording               console.error('❌ Voice in   }atch (error) 
                  throw ne   recog'Speecnition
     
             c       onsole.log(d = () => {

      recognition
    }; tle: "Voice Er              ition.onerror = (event:error);
                                        Could not reize speech: ${ event.error } `
            onsole.error('🎤 ce recognion
      he voice input
                    set </eout(() => Card>
           )                   const submit;nt = newit', { bubbsubmles: trancelabitEventle: true
                   }ment.querySeltor('form')?.dispatch
