/**
 * BULLETPROOF Audio Utilities for Hackathon
 */

export async function requestMicrophoneAccess(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000
      }
    });
    return stream;
  } catch (error) {
    console.error('Microphone access failed:', error);
    throw error;
  }
}

export function createMediaRecorder(stream: MediaStream): MediaRecorder {
  // Find best supported format
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/wav'
  ];

  let selectedMimeType = '';
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      selectedMimeType = mimeType;
      break;
    }
  }

  return new MediaRecorder(stream, {
    mimeType: selectedMimeType || undefined
  });
}

export function stopAllTracks(stream: MediaStream): void {
  stream.getTracks().forEach(track => track.stop());
}

export interface AudioDiagnostics {
  isSupported: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasMediaRecorder: boolean;
  supportedMimeTypes: string[];
  permissions: {
    microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
  };
  devices: {
    hasAudioInputs: boolean;
    hasAudioOutputs: boolean;
    audioInputs: number;
    audioOutputs: number;
  };
}

export async function diagnoseAudioSupport(): Promise<AudioDiagnostics> {
  const hasMediaDevices = !!navigator.mediaDevices;
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
  
  const diagnostics: AudioDiagnostics = {
    isSupported: hasMediaDevices && hasGetUserMedia && hasMediaRecorder,
    hasMediaDevices,
    hasGetUserMedia,
    hasMediaRecorder,
    supportedMimeTypes: [],
    permissions: {
      microphone: 'unknown'
    },
    devices: {
      hasAudioInputs: false,
      hasAudioOutputs: false,
      audioInputs: 0,
      audioOutputs: 0
    }
  };

  // Check supported MIME types
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/wav'
  ];
  
  if (typeof MediaRecorder !== 'undefined') {
    diagnostics.supportedMimeTypes = mimeTypes.filter(type => 
      MediaRecorder.isTypeSupported(type)
    );
  }

  // Check permissions
  try {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      diagnostics.permissions.microphone = result.state as any;
    }
  } catch (e) {
    // Permissions API not supported
  }

  // Enumerate devices
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      diagnostics.devices.audioInputs = devices.filter(d => d.kind === 'audioinput').length;
      diagnostics.devices.audioOutputs = devices.filter(d => d.kind === 'audiooutput').length;
      diagnostics.devices.hasAudioInputs = diagnostics.devices.audioInputs > 0;
      diagnostics.devices.hasAudioOutputs = diagnostics.devices.audioOutputs > 0;
    }
  } catch (e) {
    // Device enumeration not supported
  }

  return diagnostics;
}

export async function logAudioDiagnostics(): Promise<void> {
  const diagnostics = await diagnoseAudioSupport();
  console.log('Audio Diagnostics:', diagnostics);
}

export function getAudioErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Microphone access denied. Please allow microphone permissions in your browser settings.';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No microphone found. Please connect a microphone and try again.';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'Microphone is already in use by another application.';
    }
    if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
      return 'Microphone does not meet the required specifications.';
    }
    if (error.name === 'TypeError') {
      return 'Audio recording is not supported in this browser.';
    }
    if (error.name === 'SecurityError') {
      return 'Audio recording blocked due to security restrictions.';
    }
    return error.message || 'An unknown error occurred during audio recording.';
  }
  return 'An unknown error occurred during audio recording.';
}

export interface AudioTestResult {
  success: boolean;
  error?: string;
  duration?: number;
  blobSize?: number;
}

export async function testAudioRecording(): Promise<AudioTestResult> {
  let stream: MediaStream | null = null;
  
  try {
    // Check basic support
    const diagnostics = await diagnoseAudioSupport();
    if (!diagnostics.hasMediaDevices || !diagnostics.hasGetUserMedia || !diagnostics.hasMediaRecorder) {
      return {
        success: false,
        error: 'Audio recording not supported in this browser'
      };
    }

    // Request microphone access
    stream = await requestMicrophoneAccess();

    // Create a test recorder
    const recorder = createMediaRecorder(stream);
    const chunks: Blob[] = [];

    // Record for 1 second
    await new Promise<void>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => resolve();
      recorder.onerror = (event) => reject(new Error('Recording test failed'));

      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 1000);
    });

    // Check if we got data
    if (chunks.length === 0) {
      return {
        success: false,
        error: 'No audio data captured during test'
      };
    }

    const blob = new Blob(chunks, { type: recorder.mimeType });
    
    return {
      success: true,
      duration: 1000,
      blobSize: blob.size
    };

  } catch (error) {
    return {
      success: false,
      error: getAudioErrorMessage(error)
    };
  } finally {
    // Clean up
    if (stream) {
      stopAllTracks(stream);
    }
  }
}
