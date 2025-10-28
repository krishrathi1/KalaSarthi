/**
 * Audio utility functions for browser and server environments
 */

/**
 * Convert audio blob to base64 string (browser-safe)
 */
export async function audioToBase64(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
}

/**
 * Convert array buffer to base64 string (browser-safe)
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to audio blob
 */
export function base64ToAudioBlob(base64: string, mimeType: string = 'audio/wav'): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Get audio format from blob type
 */
export function getAudioFormat(blob: Blob): string {
  const type = blob.type.toLowerCase();
  if (type.includes('webm')) return 'webm';
  if (type.includes('wav')) return 'wav';
  if (type.includes('mp3')) return 'mp3';
  if (type.includes('ogg')) return 'ogg';
  return 'webm'; // Default
}

/**
 * Estimate sample rate from audio blob
 */
export function estimateSampleRate(blob: Blob): number {
  // For WebRTC MediaRecorder, common sample rates are 48kHz or 44.1kHz
  // We'll default to 48kHz which is most common for WebRTC
  return 48000;
}

/**
 * Create audio context for audio processing
 */
export function createAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    return new AudioContextClass();
  } catch (error) {
    console.warn('AudioContext not supported:', error);
    return null;
  }
}

/**
 * Analyze audio quality from blob
 */
export async function analyzeAudioQuality(blob: Blob): Promise<{
  duration: number;
  size: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}> {
  const audioContext = createAudioContext();
  
  if (!audioContext) {
    // Fallback estimation
    const duration = Math.max(0.1, blob.size / 16000); // Rough estimate
    return {
      duration,
      size: blob.size,
      quality: blob.size > 50000 ? 'good' : 'fair'
    };
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const duration = audioBuffer.duration;
    const quality = blob.size / duration > 25000 ? 'excellent' :
                   blob.size / duration > 15000 ? 'good' :
                   blob.size / duration > 8000 ? 'fair' : 'poor';

    audioContext.close();

    return {
      duration,
      size: blob.size,
      quality
    };
  } catch (error) {
    console.warn('Audio analysis failed:', error);
    audioContext.close();
    
    // Fallback
    const duration = Math.max(0.1, blob.size / 16000);
    return {
      duration,
      size: blob.size,
      quality: 'fair'
    };
  }
}