/**
 * Enhanced Recording Service for Smart Product Creator
 * Applies the successful universal mic workflow to product creation
 */

export interface RecordingConfig {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  mimeType: string;
}

export interface RecordingResult {
  success: boolean;
  audioBlob?: Blob;
  transcript?: string;
  enhancedTranscript?: string;
  error?: string;
  duration?: number;
}

export class EnhancedRecordingService {
  private static instance: EnhancedRecordingService;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;
  private recordingStartTime = 0;

  private constructor() {}

  public static getInstance(): EnhancedRecordingService {
    if (!EnhancedRecordingService.instance) {
      EnhancedRecordingService.instance = new EnhancedRecordingService();
    }
    return EnhancedRecordingService.instance;
  }

  /**
   * Get optimal recording configuration based on browser support
   */
  private getOptimalConfig(): RecordingConfig {
    // Default configuration (same as universal mic)
    const config: RecordingConfig = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000, // Same as universal mic
      mimeType: 'audio/webm;codecs=opus'
    };

    // Check MIME type support
    if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        config.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        config.mimeType = 'audio/mp4';
      } else {
        config.mimeType = ''; // Let browser choose
      }
    }

    return config;
  }

  /**
   * Check if recording is supported
   */
  public isSupported(): boolean {
    return !!(navigator.mediaDevices && typeof MediaRecorder !== 'undefined');
  }

  /**
   * Start recording with the same robust approach as universal mic
   */
  public async startRecording(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Recording not supported in this browser');
    }

    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    try {
      // Get optimal configuration
      const config = this.getOptimalConfig();
      
      // Request microphone access with the same constraints as universal mic
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: config.echoCancellation,
          noiseSuppression: config.noiseSuppression,
          autoGainControl: config.autoGainControl,
          sampleRate: config.sampleRate
        }
      });

      // Verify we got audio tracks
      const audioTracks = this.stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks found');
      }

      // Create MediaRecorder with optimal configuration
      const mediaRecorderOptions = config.mimeType ? { mimeType: config.mimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.stream, mediaRecorderOptions);
      
      // Reset chunks
      this.audioChunks = [];
      this.recordingStartTime = Date.now();

      // Set up event handlers (same pattern as universal mic)
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.isRecording = false;
        throw new Error('Recording error occurred');
      };

      // Start recording with 100ms intervals (same as universal mic)
      this.mediaRecorder.start(100);
      this.isRecording = true;

    } catch (error) {
      // Clean up on error
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop recording and process audio
   */
  public async stopRecording(): Promise<RecordingResult> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not available'));
        return;
      }

      // Set up one-time stop handler
      this.mediaRecorder.onstop = async () => {
        try {
          // Stop all tracks
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
          }

          // Calculate duration
          const duration = Date.now() - this.recordingStartTime;

          // Check if we have audio data
          if (this.audioChunks.length === 0) {
            resolve({
              success: false,
              error: 'No audio data recorded',
              duration
            });
            return;
          }

          // Create audio blob
          const audioBlob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder?.mimeType || 'audio/webm' 
          });

          // Process transcription using the same API as universal mic
          try {
            const transcriptResult = await this.processTranscription(audioBlob);
            
            resolve({
              success: true,
              audioBlob,
              transcript: transcriptResult.transcript,
              enhancedTranscript: transcriptResult.enhancedTranscript,
              duration
            });
          } catch (transcriptionError) {
            // Return audio even if transcription fails
            resolve({
              success: true,
              audioBlob,
              error: `Audio recorded but transcription failed: ${transcriptionError}`,
              duration
            });
          }

        } catch (error) {
          reject(error);
        } finally {
          this.cleanup();
        }
      };

      // Stop recording
      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  /**
   * Process transcription using the same API as universal mic
   */
  private async processTranscription(audioBlob: Blob): Promise<{transcript: string, enhancedTranscript: string}> {
    try {
      console.log('🎤 Processing transcription for audio blob:', audioBlob.size, 'bytes');
      
      // Convert audio blob to base64 (same as universal mic)
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioBase64 = this.arrayBufferToBase64(audioBuffer);
      
      console.log('📝 Converted audio to base64, length:', audioBase64.length);

      // Use the same API endpoint as universal mic with proper URL resolution
      const { fetchApi } = await import('@/lib/utils/url');
      const response = await fetchApi('/api/google-cloud-stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: audioBase64,
          language: 'en-US'
        })
      });

      console.log('🌐 STT API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ STT API error response:', errorText);
        throw new Error(`STT API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📝 STT API result:', result);
      
      if (result.text) {
        console.log('✅ Transcription successful:', result.text);
        return {
          transcript: result.text || '',
          enhancedTranscript: result.text || ''
        };
      } else {
        console.warn('⚠️ No speech detected in audio');
        throw new Error(result.error || 'No speech detected');
      }
    } catch (error) {
      console.error('❌ Transcription processing failed:', error);
      throw error;
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Check if currently recording
   */
  public getRecordingState(): boolean {
    return this.isRecording;
  }

  /**
   * Get recording duration
   */
  public getRecordingDuration(): number {
    if (!this.isRecording) return 0;
    return Date.now() - this.recordingStartTime;
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.recordingStartTime = 0;
  }

  /**
   * Force cleanup (for error recovery)
   */
  public forceCleanup(): void {
    this.cleanup();
  }
}
