"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Square, Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputHandlerProps {
  onTranscription: (text: string, language: string, confidence: number) => void;
  userLanguage: string;
  isRecording: boolean;
  onRecordingStateChange: (recording: boolean) => void;
  disabled?: boolean;
}

interface AudioVisualizationData {
  volume: number;
  frequency: number[];
}

export function VoiceInputHandler({
  onTranscription,
  userLanguage,
  isRecording,
  onRecordingStateChange,
  disabled = false
}: VoiceInputHandlerProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { toast } = useToast();
  
  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
    return () => {
      cleanup();
    };
  }, []);
  
  // Update recording duration
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRecordingDuration(0);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);
  
  const checkMicrophonePermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setHasPermission(permission.state === 'granted');
      
      permission.addEventListener('change', () => {
        setHasPermission(permission.state === 'granted');
      });
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
    }
  };
  
  const requestMicrophoneAccess = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      
      setHasPermission(true);
      return stream;
    } catch (error) {
      console.error('Microphone access denied:', error);
      setHasPermission(false);
      
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive"
      });
      
      return null;
    }
  };
  
  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      startAudioVisualization();
    } catch (error) {
      console.error('Audio analysis setup failed:', error);
    }
  };
  
  const startAudioVisualization = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateVisualization = () => {
      if (!analyserRef.current || !isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 255) * 100));
      
      animationRef.current = requestAnimationFrame(updateVisualization);
    };
    
    updateVisualization();
  };
  
  const startRecording = async () => {
    if (disabled || isRecording) return;
    
    try {
      const stream = await requestMicrophoneAccess();
      if (!stream) return;
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Setup audio analysis
      setupAudioAnalysis(stream);
      
      // Setup MediaRecorder
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      };
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        await processRecording();
      };
      
      mediaRecorderRef.current.start(100); // Collect data every 100ms
      onRecordingStateChange(true);
      
      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone",
      });
      
    } catch (error) {
      console.error('Recording start failed:', error);
      toast({
        title: "Recording Failed",
        description: "Could not start recording. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.stop();
    onRecordingStateChange(false);
    cleanup();
  };
  
  const processRecording = async () => {
    if (chunksRef.current.length === 0) {
      toast({
        title: "No Audio Recorded",
        description: "Please try recording again.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Create audio blob
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
      
      // Create audio URL for playback
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Convert to base64 for API
      const base64Audio = await blobToBase64(audioBlob);
      
      // Send to speech-to-text API
      const response = await fetch('/api/enhanced-chat/voice-to-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio.split(',')[1], // Remove data:audio/webm;base64, prefix
          language: userLanguage,
          sessionId: 'current-session', // TODO: Get from context
          userId: 'current-user' // TODO: Get from auth
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.result.text) {
        onTranscription(
          result.result.text,
          result.result.language,
          result.result.confidence
        );
        
        toast({
          title: "Voice Transcribed",
          description: `Confidence: ${Math.round(result.result.confidence * 100)}%`,
        });
      } else {
        throw new Error(result.error || 'Transcription failed');
      }
      
    } catch (error) {
      console.error('Processing failed:', error);
      toast({
        title: "Transcription Failed",
        description: "Could not convert speech to text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const playRecording = () => {
    if (!audioUrl) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    audioRef.current = new Audio(audioUrl);
    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onpause = () => setIsPlaying(false);
    audioRef.current.onended = () => setIsPlaying(false);
    
    audioRef.current.play().catch(error => {
      console.error('Playback failed:', error);
      toast({
        title: "Playback Failed",
        description: "Could not play recording.",
        variant: "destructive"
      });
    });
  };
  
  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };
  
  const cleanup = () => {
    // Stop animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset states
    setAudioLevel(0);
    analyserRef.current = null;
  };
  
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getRecordingButtonColor = () => {
    if (isRecording) return 'destructive';
    if (isProcessing) return 'secondary';
    return 'default';
  };
  
  const getRecordingButtonIcon = () => {
    if (isProcessing) return <Square className="h-4 w-4" />;
    if (isRecording) return <MicOff className="h-4 w-4" />;
    return <Mic className="h-4 w-4" />;
  };
  
  if (hasPermission === false) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
        <MicOff className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Microphone access required for voice input
        </span>
        <Button size="sm" variant="outline" onClick={checkMicrophonePermission}>
          Grant Access
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-2">
      {/* Recording Button */}
      <Button
        variant={getRecordingButtonColor()}
        size="sm"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className="relative"
      >
        {getRecordingButtonIcon()}
        {isRecording && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>
      
      {/* Audio Level Visualization */}
      {isRecording && (
        <div className="flex items-center space-x-2">
          <Progress value={audioLevel} className="w-16 h-2" />
          <Badge variant="secondary" className="text-xs">
            {formatDuration(recordingDuration)}
          </Badge>
        </div>
      )}
      
      {/* Processing Indicator */}
      {isProcessing && (
        <Badge variant="secondary" className="text-xs animate-pulse">
          Processing...
        </Badge>
      )}
      
      {/* Playback Controls */}
      {audioUrl && !isRecording && !isProcessing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={isPlaying ? pausePlayback : playRecording}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      )}
      
      {/* Language Indicator */}
      <Badge variant="outline" className="text-xs">
        <Volume2 className="h-3 w-3 mr-1" />
        {userLanguage.toUpperCase()}
      </Badge>
    </div>
  );
}