import { EnhancedSpeechToTextService, StreamingResult } from './EnhancedSpeechToTextService';
import { EnhancedTextToSpeechService } from './EnhancedTextToSpeechService';

export type VoiceInteractionMode = 'push-to-talk' | 'voice-activation' | 'continuous' | 'disabled';

export type VoiceSessionState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VoiceSessionConfig {
    mode: VoiceInteractionMode;
    language: string;
    voiceActivationThreshold: number; // 0-1 scale
    silenceTimeout: number; // milliseconds
    maxRecordingDuration: number; // milliseconds
    enableEchoCancellation: boolean;
    enableNoiseSuppression: boolean;
    enableAutoGainControl: boolean;
    voiceGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
    speechRate: number; // 0.25-4.0
    enableHapticFeedback: boolean;
}

export interface VoiceQualityMetrics {
    signalToNoiseRatio: number;
    speechClarity: number; // 0-1 scale
    backgroundNoiseLevel: number; // 0-1 scale
    microphoneQuality: number; // 0-1 scale
    networkLatency: number; // milliseconds
    processingLatency: number; // milliseconds
}

export interface VoiceSessionMetrics {
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    totalInteractions: number;
    successfulRecognitions: number;
    failedRecognitions: number;
    averageConfidence: number;
    totalSpeechDuration: number; // seconds
    totalProcessingTime: number; // milliseconds
    qualityMetrics: VoiceQualityMetrics;
}

export interface VoiceInteractionEvent {
    type: 'session_started' | 'session_ended' | 'listening_started' | 'listening_stopped' |
    'speech_detected' | 'speech_recognized' | 'speech_synthesis_started' |
    'speech_synthesis_completed' | 'error' | 'quality_warning';
    timestamp: Date;
    sessionId: string;
    data?: any;
}

export type VoiceEventListener = (event: VoiceInteractionEvent) => void;

export class VoiceInteractionStateService {
    private static instance: VoiceInteractionStateService;

    private sttService: EnhancedSpeechToTextService;
    private ttsService: EnhancedTextToSpeechService;

    private currentSession: VoiceSessionMetrics | null = null;
    private sessionState: VoiceSessionState = 'idle';
    private sessionConfig: VoiceSessionConfig;
    private eventListeners: VoiceEventListener[] = [];

    private mediaRecorder: MediaRecorder | null = null;
    private audioStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;

    private silenceTimer: NodeJS.Timeout | null = null;
    private recordingTimer: NodeJS.Timeout | null = null;
    private qualityMonitorTimer: NodeJS.Timeout | null = null;

    private isVoiceActivationEnabled = false;
    private voiceActivationLevel = 0;
    private backgroundNoiseLevel = 0;

    private readonly DEFAULT_CONFIG: VoiceSessionConfig = {
        mode: 'push-to-talk',
        language: 'en-US',
        voiceActivationThreshold: 0.3,
        silenceTimeout: 2000,
        maxRecordingDuration: 30000,
        enableEchoCancellation: true,
        enableNoiseSuppression: true,
        enableAutoGainControl: true,
        voiceGender: 'FEMALE',
        speechRate: 1.0,
        enableHapticFeedback: true
    };

    private constructor() {
        this.sttService = EnhancedSpeechToTextService.getInstance();
        this.ttsService = EnhancedTextToSpeechService.getInstance();
        this.sessionConfig = { ...this.DEFAULT_CONFIG };
    }

    public static getInstance(): VoiceInteractionStateService {
        if (!VoiceInteractionStateService.instance) {
            VoiceInteractionStateService.instance = new VoiceInteractionStateService();
        }
        return VoiceInteractionStateService.instance;
    }

    /**
     * Start a new voice interaction session
     */
    public async startSession(config?: Partial<VoiceSessionConfig>): Promise<string> {
        try {
            // Update configuration
            if (config) {
                this.sessionConfig = { ...this.sessionConfig, ...config };
            }

            // Generate session ID
            const sessionId = this.generateSessionId();

            // Initialize session metrics
            this.currentSession = {
                sessionId,
                startTime: new Date(),
                totalInteractions: 0,
                successfulRecognitions: 0,
                failedRecognitions: 0,
                averageConfidence: 0,
                totalSpeechDuration: 0,
                totalProcessingTime: 0,
                qualityMetrics: {
                    signalToNoiseRatio: 0,
                    speechClarity: 0,
                    backgroundNoiseLevel: 0,
                    microphoneQuality: 0,
                    networkLatency: 0,
                    processingLatency: 0
                }
            };

            // Initialize audio context and stream
            await this.initializeAudioContext();

            // Set up voice activation if enabled
            if (this.sessionConfig.mode === 'voice-activation' || this.sessionConfig.mode === 'continuous') {
                this.setupVoiceActivation();
            }

            // Start quality monitoring
            this.startQualityMonitoring();

            this.sessionState = 'idle';
            this.emitEvent('session_started', { sessionId, config: this.sessionConfig });

            return sessionId;

        } catch (error) {
            console.error('Failed to start voice session:', error);
            this.sessionState = 'error';
            this.emitEvent('error', { error: error instanceof Error ? error.message : 'Unknown error' });
            throw error;
        }
    }

    /**
     * End the current voice interaction session
     */
    public async endSession(): Promise<VoiceSessionMetrics | null> {
        try {
            if (!this.currentSession) {
                return null;
            }

            // Stop any ongoing operations
            await this.stopListening();
            this.stopQualityMonitoring();

            // Clean up audio resources
            await this.cleanupAudioResources();

            // Finalize session metrics
            this.currentSession.endTime = new Date();

            const sessionMetrics = { ...this.currentSession };
            this.emitEvent('session_ended', { sessionMetrics });

            // Reset state
            this.currentSession = null;
            this.sessionState = 'idle';

            return sessionMetrics;

        } catch (error) {
            console.error('Failed to end voice session:', error);
            this.emitEvent('error', { error: error instanceof Error ? error.message : 'Unknown error' });
            return null;
        }
    }

    /**
     * Start listening for voice input
     */
    public async startListening(): Promise<void> {
        if (!this.currentSession || this.sessionState === 'listening') {
            return;
        }

        try {
            this.sessionState = 'listening';
            this.emitEvent('listening_started', {});

            // Set up media recorder
            await this.setupMediaRecorder();

            // Start recording
            if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
                this.mediaRecorder.start(100); // Collect data every 100ms
            }

            // Set up silence detection
            this.setupSilenceDetection();

            // Set up maximum recording duration timeout
            this.recordingTimer = setTimeout(() => {
                this.stopListening();
            }, this.sessionConfig.maxRecordingDuration);

            // Provide haptic feedback if enabled
            if (this.sessionConfig.enableHapticFeedback && 'vibrate' in navigator) {
                navigator.vibrate(50);
            }

        } catch (error) {
            console.error('Failed to start listening:', error);
            this.sessionState = 'error';
            this.emitEvent('error', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    /**
     * Stop listening for voice input
     */
    public async stopListening(): Promise<void> {
        if (this.sessionState !== 'listening') {
            return;
        }

        try {
            this.sessionState = 'processing';

            // Stop media recorder
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }

            // Clear timers
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }

            if (this.recordingTimer) {
                clearTimeout(this.recordingTimer);
                this.recordingTimer = null;
            }

            this.emitEvent('listening_stopped', {});

            // Provide haptic feedback if enabled
            if (this.sessionConfig.enableHapticFeedback && 'vibrate' in navigator) {
                navigator.vibrate([50, 50, 50]);
            }

        } catch (error) {
            console.error('Failed to stop listening:', error);
            this.sessionState = 'error';
            this.emitEvent('error', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    /**
     * Process recorded audio and get transcription
     */
    public async processAudio(audioBlob: Blob): Promise<string> {
        if (!this.currentSession) {
            throw new Error('No active voice session');
        }

        const startTime = Date.now();
        this.sessionState = 'processing';

        try {
            // Convert blob to ArrayBuffer
            const audioBuffer = await this.blobToArrayBuffer(audioBlob);

            // Perform speech-to-text
            const result = await this.sttService.speechToText(audioBuffer, {
                language: this.sessionConfig.language,
                enableLanguageDetection: true,
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: true
            });

            const processingTime = Date.now() - startTime;

            // Update session metrics
            this.currentSession.totalInteractions++;
            this.currentSession.totalProcessingTime += processingTime;

            if (result.confidence > 0.5) {
                this.currentSession.successfulRecognitions++;
                this.currentSession.averageConfidence =
                    (this.currentSession.averageConfidence * (this.currentSession.successfulRecognitions - 1) + result.confidence) /
                    this.currentSession.successfulRecognitions;
            } else {
                this.currentSession.failedRecognitions++;
            }

            // Update quality metrics
            if (result.audioQuality) {
                this.updateQualityMetrics(result.audioQuality, processingTime);
            }

            this.sessionState = 'idle';
            this.emitEvent('speech_recognized', {
                text: result.text,
                confidence: result.confidence,
                processingTime
            });

            return result.text;

        } catch (error) {
            console.error('Failed to process audio:', error);
            this.currentSession.failedRecognitions++;
            this.sessionState = 'error';
            this.emitEvent('error', { error: error instanceof Error ? error.message : 'Unknown error' });
            throw error;
        }
    }

    /**
     * Synthesize and play speech
     */
    public async speak(text: string): Promise<void> {
        if (!this.currentSession) {
            throw new Error('No active voice session');
        }

        try {
            this.sessionState = 'speaking';
            this.emitEvent('speech_synthesis_started', { text });

            // Synthesize speech
            const result = await this.ttsService.synthesizeSpeech(text, {
                language: this.sessionConfig.language,
                gender: this.sessionConfig.voiceGender,
                speed: this.sessionConfig.speechRate,
                enableCache: true
            });

            // Play audio
            await this.playAudio(result.audioBuffer);

            this.sessionState = 'idle';
            this.emitEvent('speech_synthesis_completed', {
                text,
                duration: result.duration,
                cached: result.cached
            });

        } catch (error) {
            console.error('Failed to synthesize speech:', error);
            this.sessionState = 'error';
            this.emitEvent('error', { error: error instanceof Error ? error.message : 'Unknown error' });
            throw error;
        }
    }

    /**
     * Get current session state
     */
    public getSessionState(): VoiceSessionState {
        return this.sessionState;
    }

    /**
     * Get current session metrics
     */
    public getSessionMetrics(): VoiceSessionMetrics | null {
        return this.currentSession ? { ...this.currentSession } : null;
    }

    /**
     * Update session configuration
     */
    public updateConfig(config: Partial<VoiceSessionConfig>): void {
        this.sessionConfig = { ...this.sessionConfig, ...config };

        // Apply configuration changes
        if (config.mode && (config.mode === 'voice-activation' || config.mode === 'continuous')) {
            this.setupVoiceActivation();
        } else if (config.mode === 'push-to-talk' || config.mode === 'disabled') {
            this.isVoiceActivationEnabled = false;
        }
    }

    /**
     * Add event listener
     */
    public addEventListener(listener: VoiceEventListener): void {
        this.eventListeners.push(listener);
    }

    /**
     * Remove event listener
     */
    public removeEventListener(listener: VoiceEventListener): void {
        const index = this.eventListeners.indexOf(listener);
        if (index > -1) {
            this.eventListeners.splice(index, 1);
        }
    }

    /**
     * Get voice quality metrics
     */
    public getVoiceQualityMetrics(): VoiceQualityMetrics | null {
        return this.currentSession?.qualityMetrics || null;
    }

    // Private helper methods

    private generateSessionId(): string {
        return `voice_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async initializeAudioContext(): Promise<void> {
        try {
            // Request microphone access
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: this.sessionConfig.enableEchoCancellation,
                    noiseSuppression: this.sessionConfig.enableNoiseSuppression,
                    autoGainControl: this.sessionConfig.enableAutoGainControl,
                    sampleRate: 16000,
                    channelCount: 1
                }
            });

            // Create audio context
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Create analyser for voice detection
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;

            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            source.connect(this.analyser);

        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            throw new Error('Microphone access denied or not available');
        }
    }

    private async setupMediaRecorder(): Promise<void> {
        if (!this.audioStream) {
            throw new Error('Audio stream not initialized');
        }

        const audioChunks: Blob[] = [];

        this.mediaRecorder = new MediaRecorder(this.audioStream, {
            mimeType: 'audio/webm;codecs=opus'
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
            audioChunks.length = 0; // Clear array

            try {
                await this.processAudio(audioBlob);
            } catch (error) {
                console.error('Failed to process recorded audio:', error);
            }
        };
    }

    private setupVoiceActivation(): void {
        if (!this.analyser) return;

        this.isVoiceActivationEnabled = true;

        const checkVoiceActivation = () => {
            if (!this.isVoiceActivationEnabled || !this.analyser) return;

            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            this.analyser.getByteFrequencyData(dataArray);

            // Calculate average volume
            const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
            this.voiceActivationLevel = average / 255;

            // Check if voice activation threshold is met
            if (this.voiceActivationLevel > this.sessionConfig.voiceActivationThreshold &&
                this.sessionState === 'idle') {
                this.startListening();
            }

            // Continue monitoring
            if (this.isVoiceActivationEnabled) {
                requestAnimationFrame(checkVoiceActivation);
            }
        };

        checkVoiceActivation();
    }

    private setupSilenceDetection(): void {
        if (!this.analyser) return;

        const checkSilence = () => {
            if (this.sessionState !== 'listening' || !this.analyser) return;

            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            this.analyser.getByteFrequencyData(dataArray);

            const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
            const currentLevel = average / 255;

            if (currentLevel < this.sessionConfig.voiceActivationThreshold * 0.5) {
                // Start silence timer if not already started
                if (!this.silenceTimer) {
                    this.silenceTimer = setTimeout(() => {
                        this.stopListening();
                    }, this.sessionConfig.silenceTimeout);
                }
            } else {
                // Reset silence timer if voice detected
                if (this.silenceTimer) {
                    clearTimeout(this.silenceTimer);
                    this.silenceTimer = null;
                }
                this.emitEvent('speech_detected', { level: currentLevel });
            }

            // Continue monitoring
            if (this.sessionState === 'listening') {
                setTimeout(checkSilence, 100);
            }
        };

        checkSilence();
    }

    private startQualityMonitoring(): void {
        this.qualityMonitorTimer = setInterval(() => {
            this.monitorAudioQuality();
        }, 1000); // Monitor every second
    }

    private stopQualityMonitoring(): void {
        if (this.qualityMonitorTimer) {
            clearInterval(this.qualityMonitorTimer);
            this.qualityMonitorTimer = null;
        }
    }

    private monitorAudioQuality(): void {
        if (!this.analyser || !this.currentSession) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate background noise level
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        this.backgroundNoiseLevel = average / 255;

        // Update quality metrics
        this.currentSession.qualityMetrics.backgroundNoiseLevel = this.backgroundNoiseLevel;

        // Emit quality warning if needed
        if (this.backgroundNoiseLevel > 0.7) {
            this.emitEvent('quality_warning', {
                type: 'high_background_noise',
                level: this.backgroundNoiseLevel
            });
        }
    }

    private updateQualityMetrics(audioQuality: any, processingTime: number): void {
        if (!this.currentSession) return;

        const metrics = this.currentSession.qualityMetrics;

        // Update metrics with exponential moving average
        const alpha = 0.3; // Smoothing factor

        metrics.signalToNoiseRatio = metrics.signalToNoiseRatio * (1 - alpha) + audioQuality.signalToNoiseRatio * alpha;
        metrics.speechClarity = metrics.speechClarity * (1 - alpha) + (audioQuality.speechDuration / audioQuality.totalDuration) * alpha;
        metrics.processingLatency = metrics.processingLatency * (1 - alpha) + processingTime * alpha;
    }

    private async cleanupAudioResources(): Promise<void> {
        // Stop all timers
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }

        if (this.recordingTimer) {
            clearTimeout(this.recordingTimer);
            this.recordingTimer = null;
        }

        // Stop media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        // Stop audio stream
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }

        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            await this.audioContext.close();
            this.audioContext = null;
        }

        this.analyser = null;
        this.mediaRecorder = null;
        this.isVoiceActivationEnabled = false;
    }

    private async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }

    private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
        return new Promise((resolve, reject) => {
            const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve();
            };

            audio.onerror = (error) => {
                URL.revokeObjectURL(audioUrl);
                reject(error);
            };

            audio.play().catch(reject);
        });
    }

    private emitEvent(type: VoiceInteractionEvent['type'], data?: any): void {
        const event: VoiceInteractionEvent = {
            type,
            timestamp: new Date(),
            sessionId: this.currentSession?.sessionId || '',
            data
        };

        this.eventListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in voice event listener:', error);
            }
        });
    }
}