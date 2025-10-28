/**
 * Audio Recording Utilities
 * Comprehensive audio recording support with diagnostics and fallbacks
 */

export interface AudioDiagnostics {
  isSupported: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasMediaRecorder: boolean;
  supportedMimeTypes: string[];
  permissions: {
    microphone: PermissionState | 'unknown';
  };
  devices: {
    audioInputs: MediaDeviceInfo[];
    hasAudioInputs: boolean;
  };
  errors: string[];
}

export interface AudioRecordingConfig {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  channelCount: number;
  mimeType: string;
}

/**
 * Comprehensive audio diagnostics
 */
export async function diagnoseAudioSupport(): Promise<AudioDiagnostics> {
  const diagnostics: AudioDiagnostics = {
    isSupported: false,
    hasMediaDevices: false,
    hasGetUserMedia: false,
    hasMediaRecorder: false,
    supportedMimeTypes: [],
    permissions: {
      microphone: 'unknown'
    },
    devices: {
      audioInputs: [],
      hasAudioInputs: false
    },
    errors: []
  };

  try {
    // Check basic API support
    diagnostics.hasMediaDevices = !!(navigator.mediaDevices);
    diagnostics.hasGetUserMedia = !!(navigator.mediaDevices?.getUserMedia);
    diagnostics.hasMediaRecorder = typeof MediaRecorder !== 'undefined';

    // Check MIME type support
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mimeType)) {
        diagnostics.supportedMimeTypes.push(mimeType);
      }
    }

    // Check microphone permissions
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        diagnostics.permissions.microphone = permission.state;
      } catch (error) {
        diagnostics.errors.push(`Permission check failed: ${error}`);
      }
    }

    // Check available audio devices
    if (navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        diagnostics.devices.audioInputs = devices.filter(device => device.kind === 'audioinput');
        diagnostics.devices.hasAudioInputs = diagnostics.devices.audioInputs.length > 0;
      } catch (error) {
        diagnostics.errors.push(`Device enumeration failed: ${error}`);
      }
    }

    // Overall support check
    diagnostics.isSupported = 
      diagnostics.hasMediaDevices &&
      diagnostics.hasGetUserMedia &&
      diagnostics.hasMediaRecorder &&
      diagnostics.supportedMimeTypes.length > 0;

  } catch (error) {
    diagnostics.errors.push(`Diagnostics failed: ${error}`);
  }

  return diagnostics;
}

/**
 * Get optimal audio recording configuration
 */
export function getOptimalAudioConfig(): AudioRecordingConfig {
  const config: AudioRecordingConfig = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000,
    channelCount: 1,
    mimeType: 'audio/webm;codecs=opus'
  };

  // Check MIME type support and fallback
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
    if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        config.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        config.mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        config.mimeType = 'audio/ogg;codecs=opus';
      } else {
        config.mimeType = ''; // Let browser choose
      }
    }
  }

  return config;
}

/**
 * Request microphone access with proper error handling
 */
export async function requestMicrophoneAccess(): Promise<MediaStream> {
  const config = getOptimalAudioConfig();

  try {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: config.echoCancellation,
        noiseSuppression: config.noiseSuppression,
        autoGainControl: config.autoGainControl,
        sampleRate: config.sampleRate,
        channelCount: config.channelCount
      }
    };

    console.log('🎤 Requesting microphone access with constraints:', constraints);
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Verify we got audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error('No audio tracks found in stream');
    }

    console.log('✅ Microphone access granted:', {
      trackCount: audioTracks.length,
      trackLabel: audioTracks[0].label,
      trackSettings: audioTracks[0].getSettings()
    });

    return stream;

  } catch (error) {
    console.error('❌ Microphone access failed:', error);
    
    // Provide specific error messages
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone permission denied. Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Microphone is being used by another application. Please close other apps and try again.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Microphone does not support the required settings. Trying with basic settings...');
      }
    }
    
    throw error;
  }
}

/**
 * Create MediaRecorder with optimal settings
 */
export function createMediaRecorder(stream: MediaStream): MediaRecorder {
  const config = getOptimalAudioConfig();
  
  const options = config.mimeType ? { mimeType: config.mimeType } : {};
  
  console.log('🎙️ Creating MediaRecorder with options:', options);
  
  const mediaRecorder = new MediaRecorder(stream, options);
  
  console.log('✅ MediaRecorder created:', {
    mimeType: mediaRecorder.mimeType,
    state: mediaRecorder.state
  });
  
  return mediaRecorder;
}

/**
 * Test audio recording capability
 */
export async function testAudioRecording(): Promise<{ success: boolean; error?: string; duration?: number }> {
  try {
    console.log('🧪 Testing audio recording capability...');
    
    const startTime = Date.now();
    
    // Request microphone access
    const stream = await requestMicrophoneAccess();
    
    // Create MediaRecorder
    const mediaRecorder = createMediaRecorder(stream);
    
    // Test recording for 1 second
    const audioChunks: Blob[] = [];
    
    return new Promise((resolve) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const duration = Date.now() - startTime;
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
          console.log('✅ Audio recording test successful:', {
            duration,
            blobSize: audioBlob.size,
            mimeType: audioBlob.type
          });
          resolve({ success: true, duration });
        } else {
          console.log('❌ Audio recording test failed: No audio data');
          resolve({ success: false, error: 'No audio data recorded' });
        }
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error during test:', event);
        stream.getTracks().forEach(track => track.stop());
        resolve({ success: false, error: 'MediaRecorder error' });
      };
      
      // Start recording
      mediaRecorder.start();
      
      // Stop after 1 second
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 1000);
    });
    
  } catch (error) {
    console.error('❌ Audio recording test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get user-friendly error message for audio issues
 */
export function getAudioErrorMessage(error: any): string {
  if (error instanceof Error) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Microphone permission denied. Please click the microphone icon in your browser\'s address bar and allow access.';
      case 'NotFoundError':
        return 'No microphone found. Please connect a microphone or headset and try again.';
      case 'NotReadableError':
        return 'Microphone is busy. Please close other applications using the microphone and try again.';
      case 'OverconstrainedError':
        return 'Microphone settings not supported. Please try with a different microphone.';
      case 'SecurityError':
        return 'Microphone access blocked by security settings. Please check your browser settings.';
      default:
        return error.message || 'Unknown audio error occurred.';
    }
  }
  
  return 'Audio recording failed. Please check your microphone and try again.';
}

/**
 * Log comprehensive audio diagnostics
 */
export async function logAudioDiagnostics(): Promise<void> {
  console.log('🔍 Running comprehensive audio diagnostics...');
  
  const diagnostics = await diagnoseAudioSupport();
  
  console.log('📊 Audio Diagnostics Results:', {
    isSupported: diagnostics.isSupported,
    hasMediaDevices: diagnostics.hasMediaDevices,
    hasGetUserMedia: diagnostics.hasGetUserMedia,
    hasMediaRecorder: diagnostics.hasMediaRecorder,
    supportedMimeTypes: diagnostics.supportedMimeTypes,
    microphonePermission: diagnostics.permissions.microphone,
    audioInputCount: diagnostics.devices.audioInputs.length,
    hasAudioInputs: diagnostics.devices.hasAudioInputs,
    errors: diagnostics.errors
  });
  
  if (diagnostics.devices.audioInputs.length > 0) {
    console.log('🎤 Available audio input devices:');
    diagnostics.devices.audioInputs.forEach((device, index) => {
      console.log(`  ${index + 1}. ${device.label || 'Unknown Device'} (${device.deviceId})`);
    });
  }
  
  if (!diagnostics.isSupported) {
    console.error('❌ Audio recording is not supported on this device/browser');
    console.log('💡 Troubleshooting suggestions:');
    console.log('  - Use Chrome, Firefox, or Edge browser');
    console.log('  - Ensure microphone is connected');
    console.log('  - Check browser permissions');
    console.log('  - Try refreshing the page');
  }
}