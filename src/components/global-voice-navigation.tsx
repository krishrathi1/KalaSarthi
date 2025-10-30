'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Loader2, Navigation, AlertCircle, Volume2, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    VoiceNavigationClientService,
    MultilingualVoiceClientService,
    VoiceLanguageSwitcherClient
} from '@/lib/services/client/VoiceNavigationClientService';
import { useTranslation } from '@/context/TranslationContext';
import {
    VoiceNavigationPerformanceOptimizer,
    VoiceNavigationLazyLoader
} from '@/lib/services/VoiceNavigationPerformanceOptimizer';
import {
    VoiceNavigationAnalytics,
    VoiceNavigationPerformanceMonitor
} from '@/lib/services/VoiceNavigationAnalytics';
import { SemanticVoiceNavigationService } from '@/lib/services/SemanticVoiceNavigationService';

export interface GlobalVoiceNavigationProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    position?: 'header' | 'floating';
    disabled?: boolean;
}

export interface VoiceNavigationState {
    isListening: boolean;
    isProcessing: boolean;
    currentLanguage: string;
    lastCommand?: string;
    error?: string;
    voiceLevel: number;
    isVoiceDetected: boolean;
    recognitionConfidence: number;
}

export interface VoiceActivityVisualization {
    showWaveform: boolean;
    showVolumeIndicator: boolean;
    animationIntensity: 'low' | 'medium' | 'high';
    pulseColor: string;
}

export function GlobalVoiceNavigation({
    className,
    size = 'md',
    position = 'header',
    disabled = false
}: GlobalVoiceNavigationProps) {
    const [state, setState] = useState<VoiceNavigationState>({
        isListening: false,
        isProcessing: false,
        currentLanguage: 'en-US',
        voiceLevel: 0,
        isVoiceDetected: false,
        recognitionConfidence: 0
    });
    const [isSupported, setIsSupported] = useState(true);
    const [visualization, setVisualization] = useState<VoiceActivityVisualization>({
        showWaveform: true,
        showVolumeIndicator: true,
        animationIntensity: 'medium',
        pulseColor: 'green'
    });

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const voiceServiceRef = useRef<VoiceNavigationClientService | null>(null);
    const multilingualServiceRef = useRef<MultilingualVoiceClientService | null>(null);
    const languageSwitcherRef = useRef<VoiceLanguageSwitcherClient | null>(null);
    const performanceOptimizerRef = useRef<VoiceNavigationPerformanceOptimizer | null>(null);
    const lazyLoaderRef = useRef<VoiceNavigationLazyLoader | null>(null);
    const analyticsRef = useRef<VoiceNavigationAnalytics | null>(null);
    const performanceMonitorRef = useRef<VoiceNavigationPerformanceMonitor | null>(null);
    const semanticServiceRef = useRef<SemanticVoiceNavigationService | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const { toast } = useToast();
    const { currentLanguage } = useTranslation();
    const router = useRouter();

    // Cleanup audio analysis resources
    const cleanupAudioAnalysis = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        // Stop speech recognition if still running
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (error) {
                // Ignore errors when stopping recognition
            }
            recognitionRef.current = null;
        }

        analyserRef.current = null;

        setState(prev => ({
            ...prev,
            voiceLevel: 0,
            isVoiceDetected: false
        }));
    }, []);

    // Process voice input with multilingual support and caching
    const processVoiceInput = useCallback(async (recognizedText?: string) => {
        const startTime = performance.now();

        try {
            setState(prev => ({ ...prev, isProcessing: true }));

            if (!voiceServiceRef.current) {
                throw new Error('Voice service not initialized');
            }

            if (!recognizedText || recognizedText.trim().length === 0) {
                throw new Error('No speech was recognized. Please try speaking more clearly.');
            }

            // Check cache first for faster response
            const cachedIntent = performanceOptimizerRef.current?.getCachedIntent(
                recognizedText,
                state.currentLanguage
            );

            let result;
            if (cachedIntent) {
                // Use cached result for instant response
                result = {
                    success: true,
                    intent: {
                        intent: cachedIntent.intent,
                        confidence: cachedIntent.confidence,
                        parameters: {},
                        targetRoute: cachedIntent.targetRoute,
                        language: cachedIntent.language
                    },
                    feedback: `Navigating to ${cachedIntent.targetRoute}`,
                    executionTime: performance.now() - startTime
                };
            } else {
                // Use AI-powered semantic navigation
                if (semanticServiceRef.current) {
                    result = await semanticServiceRef.current.processSemanticVoiceInput(recognizedText);
                } else {
                    // Fallback to original service
                    result = await voiceServiceRef.current.processMultilingualVoiceInput(
                        recognizedText,
                        undefined,
                        true
                    );
                }

                // Cache the result for future use
                if (result.success && result.intent) {
                    performanceOptimizerRef.current?.cacheIntent(recognizedText, {
                        key: '',
                        intent: result.intent.intent,
                        confidence: result.intent.confidence,
                        targetRoute: result.intent.targetRoute || '',
                        language: result.intent.language,
                        timestamp: Date.now(),
                        hitCount: 0,
                        expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutes
                    });
                }
            }

            const processingTime = performance.now() - startTime;

            if (result.success) {
                // Track successful voice command
                analyticsRef.current?.trackVoiceCommand(
                    recognizedText,
                    result.intent?.confidence || 0.8,
                    true,
                    processingTime,
                    result.intent?.targetRoute
                );

                setState(prev => ({
                    ...prev,
                    isListening: false,
                    isProcessing: false,
                    lastCommand: recognizedText,
                    recognitionConfidence: result.intent?.confidence || 0.8,
                    currentLanguage: result.intent?.language || prev.currentLanguage
                }));

                // Play optimized audio feedback
                await playOptimizedAudioFeedback(result.feedback);

                // Navigate if there's a target route
                if (result.intent?.targetRoute && result.intent.targetRoute !== 'back') {
                    const navigationStart = performance.now();

                    // Navigate using Next.js router
                    router.push(result.intent.targetRoute);

                    // Track navigation
                    analyticsRef.current?.trackNavigation(
                        result.intent.targetRoute,
                        true,
                        performance.now() - navigationStart
                    );
                }

                toast({
                    title: "AI Navigation Successful",
                    description: result.intent?.reasoning
                        ? `${result.feedback}\n${result.intent.reasoning}`
                        : `Recognized: "${recognizedText}" → ${result.feedback}`,
                    variant: "default"
                });
            } else {
                throw new Error(result.error || 'Voice processing failed');
            }

            // Stop speech recognition after successful processing
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }

            cleanupAudioAnalysis();

        } catch (error) {
            console.error('Voice processing error:', error);

            const processingTime = performance.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : "Voice processing failed";

            // Track failed voice command
            analyticsRef.current?.trackVoiceCommand(
                recognizedText || '',
                0,
                false,
                processingTime,
                undefined,
                errorMessage
            );

            // Track error
            analyticsRef.current?.trackError(
                'voice_processing_error',
                errorMessage,
                { recognizedText, language: state.currentLanguage }
            );

            setState(prev => ({
                ...prev,
                isListening: false,
                isProcessing: false,
                error: errorMessage
            }));

            // Get error message in current language
            const localizedErrorMessage = multilingualServiceRef.current?.getErrorMessages(state.currentLanguage)?.[0] ||
                "Navigation failed. Please try again.";

            await playOptimizedAudioFeedback(localizedErrorMessage);

            toast({
                title: "Voice Navigation Failed",
                description: `Recognized: "${recognizedText || 'unclear'}" - ${localizedErrorMessage}`,
                variant: "destructive"
            });

            // Stop speech recognition after error
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }

            cleanupAudioAnalysis();
        }
    }, [cleanupAudioAnalysis, toast, state.currentLanguage]);

    // Play optimized audio feedback with caching
    const playOptimizedAudioFeedback = useCallback(async (text: string) => {
        try {
            if (!('speechSynthesis' in window) || !multilingualServiceRef.current) {
                return;
            }

            // Check for cached audio first
            const cachedAudio = performanceOptimizerRef.current?.getCachedAudioFeedback(
                text,
                state.currentLanguage
            );

            if (cachedAudio) {
                // Play cached audio for faster response
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioContext.decodeAudioData(cachedAudio.slice(0));
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();

                // Clean up
                source.onended = () => {
                    audioContext.close();
                };
                return;
            }

            // Generate new audio with optimization
            const languageConfig = multilingualServiceRef.current.getLanguageConfig(state.currentLanguage);

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = languageConfig.speechRate;
            utterance.pitch = languageConfig.pitch;
            utterance.volume = 0.8;
            utterance.lang = languageConfig.languageCode;

            // Use appropriate voice for the current language
            const voices = speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice =>
                voice.lang === languageConfig.languageCode ||
                voice.lang.startsWith(languageConfig.languageCode.split('-')[0])
            );

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            // Cache the audio for future use (simplified approach)
            utterance.onend = () => {
                // In a real implementation, you would capture and cache the audio buffer
                // For now, we'll just mark it as processed
                console.log('Audio feedback completed and could be cached');
            };

            speechSynthesis.speak(utterance);

        } catch (error) {
            console.error('Audio feedback error:', error);
        }
    }, [state.currentLanguage]);

    // Start speech recognition with multilingual support
    const startSpeechRecognition = useCallback(async (stream: MediaStream) => {
        try {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                throw new Error('Speech recognition not supported');
            }

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            // Store recognition instance for later control
            recognitionRef.current = recognition;

            // Set up timeout to prevent hanging
            const recognitionTimeout = setTimeout(() => {
                recognition.stop();
                setState(prev => ({
                    ...prev,
                    isListening: false,
                    isProcessing: false,
                    error: 'Speech recognition timed out. Please try again.'
                }));

                toast({
                    title: "Recognition Timeout",
                    description: "Speech recognition timed out. Please try speaking again.",
                    variant: "destructive"
                });

                cleanupAudioAnalysis();
            }, 10000); // 10 second timeout

            // Configure recognition with current language
            const languageConfig = multilingualServiceRef.current?.getLanguageConfig(state.currentLanguage);
            recognition.lang = languageConfig?.languageCode || state.currentLanguage;
            recognition.continuous = false;
            recognition.interimResults = true; // Enable interim results for better feedback
            recognition.maxAlternatives = 3;

            // Add timeout settings to prevent hanging
            if ('grammars' in recognition) {
                // Some browsers support additional configuration
                try {
                    (recognition as any).serviceURI = undefined; // Use default service
                } catch (e) {
                    // Ignore if not supported
                }
            }

            recognition.onresult = async (event: any) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const transcript = result[0].transcript;
                    const confidence = result[0].confidence || 0.8;

                    if (result.isFinal) {
                        // Final result - process the command
                        if (transcript && transcript.trim().length > 0) {
                            setState(prev => ({
                                ...prev,
                                recognitionConfidence: confidence
                            }));

                            clearTimeout(recognitionTimeout);
                            await processVoiceInput(transcript.trim());
                        } else {
                            // Empty final result
                            setState(prev => ({
                                ...prev,
                                isListening: false,
                                isProcessing: false,
                                error: 'No speech detected. Please try again.'
                            }));

                            toast({
                                title: "No Speech Detected",
                                description: "Please speak more clearly and try again.",
                                variant: "destructive"
                            });

                            clearTimeout(recognitionTimeout);

                            // Stop speech recognition
                            if (recognitionRef.current) {
                                recognitionRef.current.stop();
                                recognitionRef.current = null;
                            }

                            cleanupAudioAnalysis();
                        }
                    } else {
                        // Interim result - show what's being heard
                        if (transcript && transcript.trim().length > 0) {
                            setState(prev => ({
                                ...prev,
                                lastCommand: `Listening: "${transcript.trim()}"`,
                                recognitionConfidence: confidence
                            }));
                        }
                    }
                }
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);

                let errorMessage = '';
                let shouldShowToast = true;

                switch (event.error) {
                    case 'no-speech':
                        errorMessage = 'No speech detected. Please try speaking louder or closer to the microphone.';
                        break;
                    case 'audio-capture':
                        errorMessage = 'Microphone not accessible. Please check your microphone permissions.';
                        break;
                    case 'not-allowed':
                        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
                        break;
                    case 'network':
                        errorMessage = 'Network error occurred during speech recognition.';
                        break;
                    case 'aborted':
                        errorMessage = 'Speech recognition was aborted.';
                        shouldShowToast = false; // Don't show toast for user-initiated abort
                        break;
                    default:
                        errorMessage = `Speech recognition error: ${event.error}`;
                }

                setState(prev => ({
                    ...prev,
                    isListening: false,
                    isProcessing: false,
                    error: errorMessage
                }));

                if (shouldShowToast) {
                    toast({
                        title: "Voice Recognition Error",
                        description: errorMessage,
                        variant: "destructive"
                    });
                }

                clearTimeout(recognitionTimeout);
                cleanupAudioAnalysis();
            };

            recognition.onend = () => {
                clearTimeout(recognitionTimeout);
                setState(prev => ({
                    ...prev,
                    isListening: false,
                    isProcessing: false
                }));
                cleanupAudioAnalysis();
            };

            recognition.start();

        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            setState(prev => ({
                ...prev,
                isListening: false,
                isProcessing: false,
                error: error instanceof Error ? error.message : 'Speech recognition failed'
            }));
            cleanupAudioAnalysis();
        }
    }, [state.currentLanguage, processVoiceInput, cleanupAudioAnalysis]);

    // Size configurations
    const sizeClasses = {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12'
    };

    const iconSizes = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6'
    };

    // Voice level monitoring with real-time analysis
    const monitorVoiceLevel = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume level
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1

        // Detect voice activity (threshold-based)
        const voiceThreshold = 0.1;
        const isVoiceActive = normalizedLevel > voiceThreshold;

        setState(prev => ({
            ...prev,
            voiceLevel: normalizedLevel,
            isVoiceDetected: isVoiceActive
        }));

        // Update visualization color based on voice activity
        setVisualization(prev => ({
            ...prev,
            pulseColor: isVoiceActive ? 'green' : 'blue',
            animationIntensity: isVoiceActive ? 'high' : 'medium'
        }));

        if (state.isListening) {
            animationFrameRef.current = requestAnimationFrame(monitorVoiceLevel);
        }
    }, [state.isListening]);

    // Setup audio analysis for voice activity detection
    const setupAudioAnalysis = useCallback(async (stream: MediaStream) => {
        try {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContextRef.current) {
                const source = audioContextRef.current.createMediaStreamSource(stream);
                analyserRef.current = audioContextRef.current.createAnalyser();

                if (analyserRef.current) {
                    analyserRef.current.fftSize = 256;
                    analyserRef.current.smoothingTimeConstant = 0.8;
                    source.connect(analyserRef.current);
                }
            }

            // Start monitoring voice levels
            monitorVoiceLevel();
        } catch (error) {
            console.error('Failed to setup audio analysis:', error);
        }
    }, [monitorVoiceLevel]);

    // Initialize services with lazy loading and performance optimization
    useEffect(() => {
        const initializeServices = async () => {
            try {
                // Initialize performance optimizer, lazy loader, analytics, and semantic service
                performanceOptimizerRef.current = VoiceNavigationPerformanceOptimizer.getInstance();
                lazyLoaderRef.current = VoiceNavigationLazyLoader.getInstance();
                analyticsRef.current = VoiceNavigationAnalytics.getInstance();
                performanceMonitorRef.current = VoiceNavigationPerformanceMonitor.getInstance();
                semanticServiceRef.current = SemanticVoiceNavigationService.getInstance();

                // Start analytics session
                sessionIdRef.current = analyticsRef.current.startSession(
                    undefined, // userId - could be passed from auth context
                    mapTranslationToVoiceLanguage(currentLanguage || 'en')
                );

                // Lazy load voice navigation services
                voiceServiceRef.current = await lazyLoaderRef.current.loadVoiceNavigationService();
                multilingualServiceRef.current = await lazyLoaderRef.current.loadMultilingualService();
                languageSwitcherRef.current = VoiceLanguageSwitcherClient.getInstance();

                // Initialize voice navigation service
                if (voiceServiceRef.current) {
                    await voiceServiceRef.current.initialize();
                }

                // Preload common navigation patterns for current language
                await performanceOptimizerRef.current.preloadCommonPatterns(
                    mapTranslationToVoiceLanguage(currentLanguage || 'en')
                );

                // Sync with translation context
                if (currentLanguage && multilingualServiceRef.current && languageSwitcherRef.current) {
                    const voiceLanguage = multilingualServiceRef.current.getCurrentLanguage();
                    const translationVoiceLanguage = mapTranslationToVoiceLanguage(currentLanguage);

                    if (voiceLanguage !== translationVoiceLanguage) {
                        await languageSwitcherRef.current.switchFromTranslationContext(currentLanguage);
                    }
                }

                // Update state with current language
                setState(prev => ({
                    ...prev,
                    currentLanguage: multilingualServiceRef.current?.getCurrentLanguage() || 'en-US'
                }));

            } catch (error) {
                console.error('Failed to initialize voice navigation services:', error);
            }
        };

        const checkSupport = () => {
            const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
            const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);

            setIsSupported(hasMediaDevices && hasSpeechRecognition && hasAudioContext);

            if (!hasMediaDevices) {
                console.warn('MediaDevices API not supported');
            }
            if (!hasSpeechRecognition) {
                console.warn('SpeechRecognition API not supported');
            }
            if (!hasAudioContext) {
                console.warn('AudioContext API not supported');
            }
        };

        checkSupport();
        initializeServices();

        // Cleanup on unmount
        return () => {
            cleanupAudioAnalysis();

            // End analytics session if active
            if (sessionIdRef.current) {
                analyticsRef.current?.endSession(sessionIdRef.current);
            }

            // Optimize memory usage on cleanup
            performanceOptimizerRef.current?.optimizeMemoryUsage();
        };
    }, [cleanupAudioAnalysis, currentLanguage]);

    // Map translation language to voice language
    const mapTranslationToVoiceLanguage = (translationLang: string): string => {
        const mapping: Record<string, string> = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'bn': 'bn-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'mr': 'mr-IN',
            'gu': 'gu-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
            'pa': 'pa-IN',
            'or': 'or-IN',
            'as': 'as-IN'
        };
        return mapping[translationLang] || 'en-US';
    };
    // Handle voice activation/deactivation with enhanced feedback
    const handleVoiceToggle = useCallback(async () => {
        if (disabled || !isSupported) {
            toast({
                title: "Voice Navigation Unavailable",
                description: "Voice navigation is not supported in this browser or is currently disabled.",
                variant: "destructive"
            });
            return;
        }

        try {
            if (state.isListening) {
                // Stop listening and cleanup
                cleanupAudioAnalysis();

                // End analytics session
                if (sessionIdRef.current) {
                    analyticsRef.current?.endSession(sessionIdRef.current);
                    sessionIdRef.current = null;
                }

                setState(prev => ({
                    ...prev,
                    isListening: false,
                    isProcessing: false,
                    error: undefined,
                    voiceLevel: 0,
                    isVoiceDetected: false
                }));

                toast({
                    title: "Voice Navigation Stopped",
                    description: "Voice navigation has been deactivated.",
                });
            } else {
                // Start listening with enhanced audio analysis
                setState(prev => ({
                    ...prev,
                    isListening: true,
                    isProcessing: false,
                    error: undefined
                }));

                try {
                    // Start new analytics session if not already started
                    if (!sessionIdRef.current) {
                        sessionIdRef.current = analyticsRef.current?.startSession(
                            undefined,
                            mapTranslationToVoiceLanguage(currentLanguage || 'en')
                        ) || null;
                    }

                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        }
                    });

                    await setupAudioAnalysis(stream);

                    toast({
                        title: "Voice Navigation Active",
                        description: "Listening for navigation commands. Say 'go to dashboard' or 'open profile'.",
                    });

                    // Start actual voice recognition processing
                    await startSpeechRecognition(stream);

                } catch (micError) {
                    setState(prev => ({
                        ...prev,
                        isListening: false,
                        error: "Microphone access denied"
                    }));

                    toast({
                        title: "Microphone Access Denied",
                        description: "Please allow microphone access to use voice navigation.",
                        variant: "destructive"
                    });
                }
            }
        } catch (error) {
            console.error('Voice navigation error:', error);
            cleanupAudioAnalysis();
            setState(prev => ({
                ...prev,
                isListening: false,
                isProcessing: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }));

            toast({
                title: "Voice Navigation Error",
                description: "An error occurred while activating voice navigation.",
                variant: "destructive"
            });
        }
    }, [disabled, isSupported, state.isListening, toast, setupAudioAnalysis, cleanupAudioAnalysis]);

    // Handle keyboard activation (Space or Enter)
    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            handleVoiceToggle();
        }
    }, [handleVoiceToggle]);

    // Get button variant based on state
    const getButtonVariant = () => {
        if (state.error) return 'destructive';
        if (state.isListening) return 'default';
        return 'outline';
    };

    // Get dynamic button styling based on voice activity
    const getButtonStyling = () => {
        if (state.error) {
            return 'border-red-500 bg-red-50 hover:bg-red-100 text-red-700';
        }
        if (state.isListening) {
            const intensity = state.isVoiceDetected ? 'high' : 'medium';
            const baseClasses = 'border-green-500 bg-green-500 hover:bg-green-600 text-white shadow-lg';

            if (intensity === 'high') {
                return `${baseClasses} animate-pulse shadow-green-500/50 ring-2 ring-green-400 ring-opacity-60`;
            }
            return `${baseClasses} shadow-green-500/25`;
        }
        if (state.isProcessing) {
            return 'border-blue-500 bg-blue-50 hover:bg-blue-100 text-blue-700';
        }
        return 'border-gray-300 bg-background hover:bg-accent hover:text-accent-foreground';
    };

    // Get animated icon based on state and voice activity
    const getIcon = () => {
        if (state.isProcessing) {
            return <Loader2 className={cn(iconSizes[size], 'animate-spin')} />;
        }
        if (state.error) {
            return <AlertCircle className={iconSizes[size]} />;
        }
        if (state.isListening) {
            // Show different icons based on voice detection
            if (state.isVoiceDetected) {
                return <Volume2 className={cn(iconSizes[size], 'animate-bounce')} />;
            }
            return <Waves className={cn(iconSizes[size], 'animate-pulse')} />;
        }
        if (!isSupported) {
            return <MicOff className={iconSizes[size]} />;
        }
        return <Mic className={iconSizes[size]} />;
    };

    // Get tooltip text with voice activity info
    const getTooltipText = () => {
        if (!isSupported) return 'Voice navigation not supported in this browser';
        if (disabled) return 'Voice navigation is disabled';
        if (state.error) return `Error: ${state.error}`;
        if (state.isProcessing) return 'Processing voice command...';
        if (state.isListening) {
            const voiceStatus = state.isVoiceDetected ? 'Voice detected' : 'Listening';
            const level = Math.round(state.voiceLevel * 100);
            return `${voiceStatus} (${level}%) - Click to stop`;
        }
        return 'Click to activate voice navigation';
    };

    // Get ARIA label with current state
    const getAriaLabel = () => {
        if (state.isListening) {
            return `Stop voice navigation. ${state.isVoiceDetected ? 'Voice detected' : 'Listening'}`;
        }
        return 'Start voice navigation';
    };

    // Generate animated waveform visualization bars
    const generateWaveformBars = () => {
        const barCount = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
        const bars = [];

        for (let i = 0; i < barCount; i++) {
            const height = state.isListening
                ? Math.max(20, state.voiceLevel * 100 + Math.random() * 20)
                : 20;

            bars.push(
                <div
                    key={i}
                    className={cn(
                        'bg-current rounded-full transition-all duration-100',
                        size === 'sm' ? 'w-0.5' : size === 'md' ? 'w-1' : 'w-1.5',
                        state.isVoiceDetected ? 'animate-pulse' : ''
                    )}
                    style={{
                        height: `${height}%`,
                        animationDelay: `${i * 100}ms`
                    }}
                />
            );
        }

        return bars;
    };
    return (
        <div className={cn('relative flex-shrink-0', className)}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={getButtonVariant()}
                            size="icon"
                            className={cn(
                                sizeClasses[size],
                                'rounded-full transition-all duration-200 relative focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                                getButtonStyling(),
                                position === 'floating' && 'shadow-lg'
                            )}
                            onClick={handleVoiceToggle}
                            onKeyDown={handleKeyDown}
                            disabled={disabled || (!isSupported && !state.error)}
                            aria-label={getAriaLabel()}
                            aria-pressed={state.isListening}
                            role="button"
                            tabIndex={0}
                        >
                            {getIcon()}

                            {/* Enhanced listening indicator rings */}
                            {state.isListening && (
                                <>
                                    <div className="absolute -inset-1 rounded-full border-2 border-green-400 animate-ping opacity-20" />
                                    {state.isVoiceDetected && (
                                        <div className="absolute -inset-2 rounded-full border border-green-300 animate-pulse opacity-40" />
                                    )}
                                </>
                            )}

                            {/* Processing indicator with rotation */}
                            {state.isProcessing && (
                                <div className="absolute -inset-1 rounded-full border-2 border-blue-400 animate-spin opacity-30" />
                            )}

                            {/* Voice level indicator */}
                            {state.isListening && visualization.showVolumeIndicator && (
                                <div
                                    className="absolute inset-0 rounded-full bg-green-400 opacity-20 transition-all duration-100"
                                    style={{
                                        transform: `scale(${1 + state.voiceLevel * 0.3})`
                                    }}
                                />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{getTooltipText()}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Enhanced status indicator with voice activity */}
            {(state.isListening || state.isProcessing) && (
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg z-50">
                    {state.isProcessing ? (
                        <div className="flex items-center gap-2">
                            <Navigation className="h-3 w-3 animate-spin" />
                            <span>Processing...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                'w-2 h-2 rounded-full transition-colors duration-200',
                                state.isVoiceDetected ? 'bg-green-500 animate-pulse' : 'bg-blue-500 animate-pulse'
                            )} />
                            <span>{state.isVoiceDetected ? 'Voice detected' : 'Listening...'}</span>
                            {visualization.showVolumeIndicator && (
                                <div className="flex items-center gap-1 ml-2">
                                    <Volume2 className="h-3 w-3" />
                                    <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 transition-all duration-100 rounded-full"
                                            style={{ width: `${state.voiceLevel * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Animated waveform visualization */}
            {state.isListening && visualization.showWaveform && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-end gap-1 h-4">
                    {generateWaveformBars()}
                </div>
            )}

            {/* Enhanced command feedback with confidence */}
            {state.lastCommand && !state.isListening && !state.isProcessing && (
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-1 max-w-xs">
                    <Badge
                        variant="secondary"
                        className="text-xs text-center"
                    >
                        Heard: "{state.lastCommand}"
                    </Badge>
                    {state.recognitionConfidence > 0 && (
                        <div className="text-xs text-muted-foreground text-center">
                            {Math.round(state.recognitionConfidence * 100)}% confidence
                        </div>
                    )}
                </div>
            )}

            {/* Error state indicator with guidance */}
            {state.error && (
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg px-2 py-1 text-xs text-red-700 whitespace-nowrap shadow-lg max-w-48">
                    <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{state.error}</span>
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                        Try refreshing or check permissions
                    </div>
                </div>
            )}
        </div>
    );
}

// TypeScript declarations for Speech Recognition API
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
        AudioContext: any;
        webkitAudioContext: any;
    }
}

// Types are already exported as interfaces above