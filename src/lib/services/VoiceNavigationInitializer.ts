/**
 * Voice Navigation Initialization Service
 * Handles proper startup and configuration of all voice navigation components
 */

import { VoiceNavigationConfigManager, getVoiceNavigationConfig } from '@/lib/config/voice-navigation-config';
import { VoiceNavigationClientService, MultilingualVoiceClientService, VoiceLanguageSwitcherClient } from '@/lib/services/client/VoiceNavigationClientService';

export interface InitializationResult {
    success: boolean;
    services: {
        voiceNavigation: boolean;
        multilingualVoice: boolean;
        languageSwitcher: boolean;
    };
    features: {
        speechRecognition: boolean;
        speechSynthesis: boolean;
        mediaDevices: boolean;
        audioContext: boolean;
    };
    config: {
        isValid: boolean;
        environment: string;
        enabledLanguages: string[];
    };
    errors: string[];
    warnings: string[];
}

export interface BrowserCapabilities {
    speechRecognition: boolean;
    speechSynthesis: boolean;
    mediaDevices: boolean;
    audioContext: boolean;
    webRTC: boolean;
    localStorage: boolean;
}

export class VoiceNavigationInitializer {
    private static instance: VoiceNavigationInitializer;
    private isInitialized = false;
    private initializationResult: InitializationResult | null = null;
    private configManager: VoiceNavigationConfigManager;

    private constructor() {
        this.configManager = VoiceNavigationConfigManager.getInstance();
    }

    public static getInstance(): VoiceNavigationInitializer {
        if (!VoiceNavigationInitializer.instance) {
            VoiceNavigationInitializer.instance = new VoiceNavigationInitializer();
        }
        return VoiceNavigationInitializer.instance;
    }

    public async initialize(): Promise<InitializationResult> {
        if (this.isInitialized && this.initializationResult) {
            return this.initializationResult;
        }

        const result: InitializationResult = {
            success: false,
            services: {
                voiceNavigation: false,
                multilingualVoice: false,
                languageSwitcher: false
            },
            features: {
                speechRecognition: false,
                speechSynthesis: false,
                mediaDevices: false,
                audioContext: false
            },
            config: {
                isValid: false,
                environment: 'unknown',
                enabledLanguages: []
            },
            errors: [],
            warnings: []
        };

        try {
            // Step 1: Check browser capabilities
            const capabilities = this.checkBrowserCapabilities();
            result.features = {
                speechRecognition: capabilities.speechRecognition,
                speechSynthesis: capabilities.speechSynthesis,
                mediaDevices: capabilities.mediaDevices,
                audioContext: capabilities.audioContext
            };

            // Step 2: Validate configuration
            const configValidation = this.configManager.validateConfig();
            result.config = {
                isValid: configValidation.isValid,
                environment: this.configManager.getEnvironment(),
                enabledLanguages: this.configManager.getConfig().enabledLanguages
            };

            if (!configValidation.isValid) {
                result.errors.push(...configValidation.errors);
            }

            // Step 3: Check critical requirements
            if (!capabilities.speechRecognition) {
                result.errors.push('Speech Recognition API not supported in this browser');
            }

            if (!capabilities.mediaDevices) {
                result.errors.push('MediaDevices API not supported - microphone access unavailable');
            }

            // Step 4: Initialize services if requirements are met
            if (result.errors.length === 0) {
                try {
                    // Initialize voice navigation service
                    const voiceService = VoiceNavigationClientService.getInstance();
                    await voiceService.initialize();
                    result.services.voiceNavigation = voiceService.isReady();

                    // Initialize multilingual service
                    const multilingualService = MultilingualVoiceClientService.getInstance();
                    result.services.multilingualVoice = true;

                    // Initialize language switcher
                    const languageSwitcher = VoiceLanguageSwitcherClient.getInstance();
                    result.services.languageSwitcher = true;

                } catch (error) {
                    result.errors.push(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            // Step 5: Add warnings for optional features
            if (!capabilities.speechSynthesis) {
                result.warnings.push('Speech Synthesis not supported - audio feedback unavailable');
            }

            if (!capabilities.audioContext) {
                result.warnings.push('AudioContext not supported - voice visualization unavailable');
            }

            if (!capabilities.localStorage) {
                result.warnings.push('localStorage not available - settings will not persist');
            }

            // Step 6: Determine overall success
            result.success = result.errors.length === 0 &&
                result.services.voiceNavigation &&
                result.config.isValid;

            this.initializationResult = result;
            this.isInitialized = true;

            // Log initialization results
            if (this.configManager.getConfig().debugMode) {
                console.log('Voice Navigation Initialization:', result);
            }

            return result;

        } catch (error) {
            result.errors.push(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.success = false;
            return result;
        }
    }

    private checkBrowserCapabilities(): BrowserCapabilities {
        const capabilities: BrowserCapabilities = {
            speechRecognition: false,
            speechSynthesis: false,
            mediaDevices: false,
            audioContext: false,
            webRTC: false,
            localStorage: false
        };

        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
            return capabilities;
        }

        try {
            // Speech Recognition
            capabilities.speechRecognition = !!(
                window.SpeechRecognition ||
                window.webkitSpeechRecognition
            );

            // Speech Synthesis
            capabilities.speechSynthesis = !!(
                window.speechSynthesis &&
                typeof window.speechSynthesis.speak === 'function'
            );

            // Media Devices
            capabilities.mediaDevices = !!(
                navigator.mediaDevices &&
                navigator.mediaDevices.getUserMedia
            );

            // Audio Context
            capabilities.audioContext = !!(
                window.AudioContext ||
                window.webkitAudioContext
            );

            // WebRTC
            capabilities.webRTC = !!(
                window.RTCPeerConnection ||
                window.webkitRTCPeerConnection ||
                window.mozRTCPeerConnection
            );

            // Local Storage
            capabilities.localStorage = (() => {
                try {
                    const test = '__localStorage_test__';
                    localStorage.setItem(test, test);
                    localStorage.removeItem(test);
                    return true;
                } catch {
                    return false;
                }
            })();

        } catch (error) {
            console.warn('Error checking browser capabilities:', error);
        }

        return capabilities;
    }

    public getInitializationResult(): InitializationResult | null {
        return this.initializationResult;
    }

    public isReady(): boolean {
        return this.isInitialized && this.initializationResult?.success === true;
    }

    public async reinitialize(): Promise<InitializationResult> {
        this.isInitialized = false;
        this.initializationResult = null;
        return this.initialize();
    }

    public getCapabilities(): BrowserCapabilities | null {
        if (!this.initializationResult) {
            return null;
        }

        return this.checkBrowserCapabilities();
    }

    public async requestPermissions(): Promise<{ microphone: boolean; notifications: boolean }> {
        const permissions = {
            microphone: false,
            notifications: false
        };

        try {
            // Request microphone permission
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    permissions.microphone = true;

                    // Stop the stream immediately as we only needed permission
                    stream.getTracks().forEach(track => track.stop());
                } catch (error) {
                    console.warn('Microphone permission denied:', error);
                }
            }

            // Request notification permission (optional)
            if ('Notification' in window) {
                try {
                    const permission = await Notification.requestPermission();
                    permissions.notifications = permission === 'granted';
                } catch (error) {
                    console.warn('Notification permission request failed:', error);
                }
            }

        } catch (error) {
            console.error('Permission request failed:', error);
        }

        return permissions;
    }

    public generateDiagnosticReport(): string {
        const capabilities = this.checkBrowserCapabilities();
        const config = this.configManager.getConfig();
        const validation = this.configManager.validateConfig();

        const report = {
            timestamp: new Date().toISOString(),
            environment: this.configManager.getEnvironment(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
            capabilities,
            configuration: {
                ...config,
                // Remove sensitive information
                googleCloudProjectId: config.googleCloudProjectId ? '[REDACTED]' : undefined,
                dialogflowAgentId: config.dialogflowAgentId ? '[REDACTED]' : undefined
            },
            validation,
            initializationResult: this.initializationResult,
            isReady: this.isReady()
        };

        return JSON.stringify(report, null, 2);
    }
}

// Export singleton instance
export const voiceNavigationInitializer = VoiceNavigationInitializer.getInstance();

// Export utility functions
export async function initializeVoiceNavigation(): Promise<InitializationResult> {
    return voiceNavigationInitializer.initialize();
}

export function isVoiceNavigationReady(): boolean {
    return voiceNavigationInitializer.isReady();
}

export async function requestVoiceNavigationPermissions() {
    return voiceNavigationInitializer.requestPermissions();
}

export function getVoiceNavigationDiagnostics(): string {
    return voiceNavigationInitializer.generateDiagnosticReport();
}

// TypeScript declarations for browser APIs
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
        AudioContext: any;
        webkitAudioContext: any;
        RTCPeerConnection: any;
        webkitRTCPeerConnection: any;
        mozRTCPeerConnection: any;
    }
}