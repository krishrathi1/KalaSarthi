/**
 * FAST HACKATHON VOICE SERVICE - BULLETPROOF STT
 */

export interface VoiceServiceConfig {
    language?: string;
    feedbackEnabled?: boolean;
}

export class SimpleVoiceService {
    private static instance: SimpleVoiceService;
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private isRecording = false;
    private eventListeners: Map<string, Function[]> = new Map();
    private config: VoiceServiceConfig = {
        language: 'en-US',
        feedbackEnabled: true
    };

    private constructor() { }

    public static getInstance(config?: VoiceServiceConfig): SimpleVoiceService {
        if (!SimpleVoiceService.instance) {
            SimpleVoiceService.instance = new SimpleVoiceService();
        }
        if (config) {
            SimpleVoiceService.instance.config = { ...SimpleVoiceService.instance.config, ...config };
        }
        return SimpleVoiceService.instance;
    }

    public on(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    private emit(event: string, data?: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    public async start(): Promise<void> {
        try {
            console.log('🎤 Starting voice recording...');

            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000
                }
            });

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

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: selectedMimeType || undefined
            });

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                console.log('🎤 Recording stopped, processing...');
                this.emit('listening', { active: false });

                try {
                    const audioBlob = new Blob(this.audioChunks, { type: selectedMimeType });

                    // Send to Gemini STT API
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'recording.webm');
                    formData.append('language', this.config.language || 'en-US');

                    const response = await fetch('/api/stt/gemini', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.success && result.result?.text) {
                        console.log('✅ STT Success:', result.result.text);
                        this.emit('command', {
                            command: {
                                command: result.result.text,
                                confidence: result.result.confidence
                            }
                        });
                        this.emit('action', { success: true });
                    } else {
                        throw new Error(result.error || 'No transcript received');
                    }
                } catch (error) {
                    console.error('❌ STT Error:', error);
                    this.emit('error', { error: error instanceof Error ? error.message : 'STT failed' });
                }

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.onerror = (event: any) => {
                console.error('❌ MediaRecorder error:', event.error);
                this.emit('error', { error: event.error });
                this.isRecording = false;
            };

            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            this.emit('listening', { active: true });

            // Auto-stop after 10 seconds
            setTimeout(() => {
                if (this.isRecording) {
                    this.stop();
                }
            }, 10000);

        } catch (error) {
            console.error('❌ Voice start error:', error);
            let errorMessage = "Voice input failed.";

            if (error instanceof Error) {
                if (error.name === 'NotAllowedError') {
                    errorMessage = "Microphone access denied. Please allow microphone access.";
                } else if (error.name === 'NotFoundError') {
                    errorMessage = "Microphone not found. Please connect a microphone.";
                } else {
                    errorMessage = `Voice input failed: ${error.message}`;
                }
            }

            this.emit('error', { error: errorMessage });
            throw error;
        }
    }

    public async stop(): Promise<void> {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }

    public setLanguage(language: string): void {
        this.config.language = language;
    }

    public destroy(): void {
        if (this.mediaRecorder) {
            this.stop();
        }
        this.eventListeners.clear();
    }
}