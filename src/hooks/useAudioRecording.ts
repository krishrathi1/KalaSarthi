/**
 * Enhanced Audio Recording Hook
 * Provides robust audio recording with comprehensive error handling and diagnostics
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  diagnoseAudioSupport,
  requestMicrophoneAccess,
  createMediaRecorder,
  getAudioErrorMessage,
  testAudioRecording,
  logAudioDiagnostics,
  type AudioDiagnostics
} from '@/lib/utils/audioUtils';

export interface AudioRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  duration: number;
  error: string | null;
  audioBlob: Blob | null;
  audioUrl: string | null;
  diagnostics: AudioDiagnostics | null;
}

export interface AudioRecordingOptions {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
  maxDuration?: number; // in milliseconds
  minDuration?: number; // in milliseconds
}

export function useAudioRecording(options: AudioRecordingOptions = {}) {
  const {
    onRecordingComplete,
    onError,
    onStatusChange,
    maxDuration = 300000, // 5 minutes default
    minDuration = 1000 // 1 second minimum
  } = options;

  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    isProcessing: false,
    isSupported: false,
    duration: 0,
    error: null,
    audioBlob: null,
    audioUrl: null,
    diagnostics: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio support diagnostics
  useEffect(() => {
    const initializeDiagnostics = async () => {
      try {
        console.log('🔍 Initializing audio recording diagnostics...');

        const diagnostics = await diagnoseAudioSupport();

        setState(prev => ({
          ...prev,
          isSupported: diagnostics.isSupported,
          diagnostics
        }));

        if (!diagnostics.isSupported) {
          const errorMessage = 'Audio recording not supported on this device/browser';
          setState(prev => ({ ...prev, error: errorMessage }));
          onError?.(errorMessage);

          // Log detailed diagnostics for troubleshooting
          await logAudioDiagnostics();
        } else {
          console.log('✅ Audio recording is supported');
          onStatusChange?.('Audio recording ready');
        }
      } catch (error) {
        console.error('❌ Failed to initialize audio diagnostics:', error);
        const errorMessage = getAudioErrorMessage(error);
        setState(prev => ({ ...prev, error: errorMessage, isSupported: false }));
        onError?.(errorMessage);
      }
    };

    initializeDiagnostics();
  }, [onError, onStatusChange]);

  // Update duration during recording
  const updateDuration = useCallback(() => {
    if (startTimeRef.current > 0) {
      const duration = Date.now() - startTimeRef.current;
      setState(prev => ({ ...prev, duration }));

      // Auto-stop if max duration reached
      if (duration >= maxDuration) {
        console.log('⏰ Max recording duration reached, stopping...');
        stopRecording();
      }
    }
  }, [maxDuration]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!state.isSupported) {
      const errorMessage = 'Audio recording not supported';
      onError?.(errorMessage);
      return;
    }

    if (state.isRecording) {
      console.warn('⚠️ Recording already in progress');
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));
      onStatusChange?.('Requesting microphone access...');

      console.log('🎤 Starting audio recording...');

      // Request microphone access
      const stream = await requestMicrophoneAccess();
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = createMediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Reset audio chunks
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('📦 Audio chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('⏹️ Recording stopped, processing audio...');
        await processRecording();
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        const errorMessage = 'Recording error occurred';
        setState(prev => ({
          ...prev,
          isRecording: false,
          isProcessing: false,
          error: errorMessage
        }));
        onError?.(errorMessage);
        cleanup();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms

      setState(prev => ({
        ...prev,
        isRecording: true,
        isProcessing: false,
        duration: 0,
        error: null
      }));

      // Start duration timer
      durationIntervalRef.current = setInterval(updateDuration, 100);

      onStatusChange?.('Recording in progress...');
      console.log('✅ Recording started successfully');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      const errorMessage = getAudioErrorMessage(error);
      setState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        error: errorMessage
      }));
      onError?.(errorMessage);
      cleanup();
    }
  }, [state.isSupported, state.isRecording, onError, onStatusChange, updateDuration]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!state.isRecording || !mediaRecorderRef.current) {
      console.warn('⚠️ No recording in progress');
      return;
    }

    try {
      console.log('⏹️ Stopping recording...');

      // Stop duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Stop MediaRecorder
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      setState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: true
      }));

      onStatusChange?.('Processing recording...');

    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      const errorMessage = getAudioErrorMessage(error);
      setState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        error: errorMessage
      }));
      onError?.(errorMessage);
      cleanup();
    }
  }, [state.isRecording, onError, onStatusChange]);

  // Process completed recording
  const processRecording = useCallback(async () => {
    try {
      const finalDuration = Date.now() - startTimeRef.current;

      console.log('🔄 Processing recording:', {
        duration: finalDuration,
        chunks: audioChunksRef.current.length,
        minDuration
      });

      // Check minimum duration
      if (finalDuration < minDuration) {
        const errorMessage = `Recording too short. Please record for at least ${minDuration / 1000} seconds.`;
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: errorMessage
        }));
        onError?.(errorMessage);
        cleanup();
        return;
      }

      // Check if we have audio data
      if (audioChunksRef.current.length === 0) {
        const errorMessage = 'No audio data recorded. Please check your microphone.';
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: errorMessage
        }));
        onError?.(errorMessage);
        cleanup();
        return;
      }

      // Create audio blob
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      console.log('✅ Audio blob created:', {
        size: audioBlob.size,
        type: audioBlob.type,
        duration: finalDuration
      });

      // Create audio URL for playback
      const audioUrl = URL.createObjectURL(audioBlob);

      setState(prev => {
        // Clean up previous audio URL
        if (prev.audioUrl) {
          URL.revokeObjectURL(prev.audioUrl);
        }

        return {
          ...prev,
          isProcessing: false,
          audioBlob,
          audioUrl,
          duration: finalDuration,
          error: null
        };
      });

      // Call completion callback
      onRecordingComplete?.(audioBlob, finalDuration);
      onStatusChange?.('Recording completed successfully');

      console.log('✅ Recording processing completed');

    } catch (error) {
      console.error('❌ Failed to process recording:', error);
      const errorMessage = getAudioErrorMessage(error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));
      onError?.(errorMessage);
    } finally {
      cleanup();
    }
  }, [minDuration, onRecordingComplete, onError, onStatusChange]);

  // Test audio recording capability
  const testRecording = useCallback(async () => {
    try {
      onStatusChange?.('Testing audio recording...');
      const result = await testAudioRecording();

      if (result.success) {
        onStatusChange?.('Audio recording test successful');
        console.log('✅ Audio recording test passed');
      } else {
        const errorMessage = `Audio test failed: ${result.error}`;
        setState(prev => ({ ...prev, error: errorMessage }));
        onError?.(errorMessage);
        console.error('❌ Audio recording test failed:', result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = getAudioErrorMessage(error);
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [onError, onStatusChange]);

  // Cleanup resources
  const cleanup = useCallback(() => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Audio track stopped:', track.label);
      });
      streamRef.current = null;
    }

    // Clear MediaRecorder
    mediaRecorderRef.current = null;

    // Clear audio chunks
    audioChunksRef.current = [];
    startTimeRef.current = 0;

    console.log('🧹 Audio recording cleanup completed');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      // Clean up audio URL
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
    };
  }, [cleanup, state.audioUrl]);

  return {
    ...state,
    startRecording,
    stopRecording,
    testRecording,
    cleanup
  };
}