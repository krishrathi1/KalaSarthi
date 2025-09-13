'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { IntelligentVoiceAssistant, VoiceAction } from '@/lib/service/IntelligentVoiceAssistant';
import { GeminiSpeechService } from '@/lib/service/GeminiSpeechService';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface IntelligentVoiceButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  context?: string;
  onAction?: (action: VoiceAction) => void;
}

export function IntelligentVoiceButton({
  className,
  size = 'md',
  context = 'general',
  onAction
}: IntelligentVoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceAssistantRef = useRef<IntelligentVoiceAssistant | null>(null);
  const speechServiceRef = useRef<GeminiSpeechService | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  useEffect(() => {
    // Initialize services
    const initServices = async () => {
      try {
        voiceAssistantRef.current = IntelligentVoiceAssistant.getInstance();
        speechServiceRef.current = GeminiSpeechService.getInstance();

        // Check if speech recognition is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setIsSupported(false);
          console.warn('Media devices not supported');
        }
      } catch (error) {
        console.error('Failed to initialize voice services:', error);
        setIsSupported(false);
      }
    };

    initServices();

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startListening = async () => {
    if (!isSupported) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice input. Please try a different browser.",
        variant: "destructive"
      });
      return;
    }

    // Check if we're on artisan buddy page before starting
    const currentPath = window.location.pathname;
    console.log('Starting voice listening on path:', currentPath);

    try {
      setIsListening(true);
      setLastTranscript('');
      audioChunksRef.current = [];

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
        title: "Listening...",
        description: "Speak naturally about what you'd like to do.",
      });

    } catch (error) {
      console.error('Failed to start voice recording:', error);
      setIsListening(false);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use voice commands.",
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

      // Check if we're on special pages that need different handling
      const currentPath = window.location.pathname;
      console.log('Processing audio on path:', currentPath);
      
      if (currentPath === '/artisan-buddy') {
        console.log('On Artisan Buddy page - skipping voice assistant processing');
        
        // Combine audio chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        // On artisan buddy page, emit voice input event for chat to handle
        try {
          // Get transcription for display
          const transcription = await voiceAssistantRef.current?.speechService?.speechToText(arrayBuffer, { language: 'en-US' });
          if (transcription?.text) {
            // Emit voice input event for the chat
            const voiceInputEvent = new CustomEvent('voiceInput', {
              detail: {
                transcript: transcription.text,
                isVoice: true,
                timestamp: new Date()
              }
            });
            window.dispatchEvent(voiceInputEvent);
            
            // Update UI
            setLastTranscript(transcription.text);
            setIsProcessing(false);
            
            // Show feedback that voice was captured
            toast({
              title: "Voice Captured",
              description: `"${transcription.text}" - Processing in chat...`,
            });
          }
        } catch (error) {
          console.error('Failed to transcribe audio for chat:', error);
          setIsProcessing(false);
          toast({
            title: "Transcription Error",
            description: "Failed to process your voice. Please try again.",
            variant: "destructive"
          });
        }
        return;
      }

      if (currentPath === '/smart-product-creator') {
        console.log('On Smart Product Creator page - using dedicated story mic instead');
        
        // On smart product creator page, show message to use dedicated story mic
        setIsProcessing(false);
        toast({
          title: "Use Story Microphone",
          description: "Please use the dedicated story recording microphone on this page for recording your product story.",
          variant: "destructive"
        });
        return;
      }

      // For other pages, process with intelligent voice assistant
      console.log('Not on special pages - processing with voice assistant for navigation');
      
      // Combine audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Process with intelligent voice assistant for other pages
      if (voiceAssistantRef.current) {
        voiceAssistantRef.current.setContext(context);
        const action = await voiceAssistantRef.current.processVoiceCommand(arrayBuffer, context);

        // Update UI
        setLastTranscript(action.message || 'Command processed');
        setIsProcessing(false);

        // Execute the action
        await executeAction(action);

        // Show feedback
        toast({
          title: "Voice Command Processed",
          description: action.message,
        });

        // Call onAction callback if provided
        if (onAction) {
          onAction(action);
        }
      }

    } catch (error) {
      console.error('Failed to process audio:', error);
      setIsProcessing(false);
      toast({
        title: "Processing Error",
        description: "Failed to process your voice command. Please try again.",
        variant: "destructive"
      });
    }
  };

  const executeAction = async (action: VoiceAction) => {
    try {
      switch (action.type) {
        case 'navigate':
          if (action.payload?.path) {
            router.push(action.payload.path);
          }
          break;

        case 'search':
          if (action.payload?.query) {
            // Navigate to marketplace with search query
            router.push(`/marketplace?search=${encodeURIComponent(action.payload.query)}`);
          }
          break;

        case 'help':
          // Show help dialog or navigate to help page
          toast({
            title: "Help",
            description: action.message,
            duration: 5000,
          });
          break;

        case 'add_to_cart':
        case 'add_to_wishlist':
          // These would need additional context about current product
          toast({
            title: "Action Required",
            description: "Please navigate to a product page first, then use voice commands to add to cart or wishlist.",
          });
          break;

        default:
          console.log('Action executed:', action);
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
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
      <Button
        onClick={handleClick}
        disabled={isProcessing}
        className={cn(
          sizeClasses[size],
          'rounded-full transition-all duration-200 relative',
          isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/25'
            : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25',
          isProcessing && 'opacity-50'
        )}
        title={
          isProcessing
            ? 'Processing your voice command...'
            : isListening
            ? 'Listening... Click to stop'
            : 'Click to speak - Try saying "Help me create a product" or "Show me my sales"'
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
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Listening...
            </div>
          )}
        </div>
      )}

      {/* Last command display */}
      {lastTranscript && !isListening && !isProcessing && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg px-3 py-2 text-xs max-w-64 shadow-lg">
          <div className="font-medium text-muted-foreground mb-1">Last command:</div>
          <div className="truncate">{lastTranscript}</div>
        </div>
      )}
    </div>
  );
}