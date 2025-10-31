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