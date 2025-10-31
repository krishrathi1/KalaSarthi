/**
 * Voice Navigation Fallback Service
 * Provides graceful degradation and fallback mechanisms when voice navigation fails
 * Implements offline command caching and progressive enhancement features
 */

import { VoiceNavigationError } from './VoiceNavigationErrorHandler';
import { VoiceNavigationLogger, LogLevel, LogCategory } from './VoiceNavigationLogger';

export interface FallbackMode {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    priority: number;
    requirements: string[];
}

export interface OfflineCommand {
    id: string;
    pattern: string;
    intent: string;
    route: string;
    confidence: number;
    language: string;
    usage: number;
    lastUsed: Date;
}

export interface FallbackCapability {
    name: string;
    available: boolean;
    reason?: string;
    fallbackMode?: string;
}

export interface DegradationLevel {
    level: number;
    name: string;
    description: string;
    availableFeatures: string[];
    disabledFeatures: string[];
}

export interface FallbackResult {
    success: boolean;
    mode: string;
    message: string;
    availableFeatures: string[];
    limitations: string[];
}

export class VoiceNavigationFallback {
    private static instance: VoiceNavigationFallback;
    private logger: VoiceNavigationLogger;
    private fallbackModes: Map<string, FallbackMode>;
    private offlineCommands: Map<string, OfflineCommand>;
    private currentMode: string = 'full';
    private capabilities: Map<string, FallbackCapability>;
    private degradationLevels: DegradationLevel[];
    private currentDegradationLevel: number = 0;

    private constructor() {
        this.logger = VoiceNavigationLogger.getInstance();
        this.fallbackModes = new Map();
        this.offlineCommands = new Map();
        this.capabilities = new Map();
        this.degradationLevels = [];

        this.initializeFallbackModes();
        this.initializeDegradationLevels();
        this.loadOfflineCommands();
        this.assessCapabilities();
    }

    public static getInstance(): VoiceNavigationFallback {
        if (!VoiceNavigationFallback.instance) {
            VoiceNavigationFallback.instance = new VoiceNavigationFallback();
        }
        return VoiceNavigationFallback.instance;
    }

    /**
     * Activate fallback mode based on error type
     */
    public async activateFallback(error: VoiceNavigationError, context?: any): Promise<FallbackResult> {
        try {
            this.logger.info(LogCategory.ERROR_HANDLING, 'Activating fallback mode', { error, context });

            const fallbackMode = this.selectFallbackMode(error);
            const result = await this.switchToMode(fallbackMode.id);

            this.logger.info(LogCategory.ERROR_HANDLING, 'Fallback mode activated', {
                mode: fallbackMode.id,
                success: result.success
            });

            return result;
        } catch (fallbackError) {
            this.logger.error(
                LogCategory.ERROR_HANDLING,
                'Failed to activate fallback mode',
                fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
                { originalError: error }
            );

            return this.getEmergencyFallback();
        }
    }

    /**
     * Switch to a specific fallback mode
     */
    public async switchToMode(modeId: string): Promise<FallbackResult> {
        try {
            const mode = this.fallbackModes.get(modeId);
            if (!mode) {
                throw new Error(`Fallback mode ${modeId} not found`);
            }

            if (!mode.enabled) {
                throw new Error(`Fallback mode ${modeId} is disabled`);
            }

            // Check if requirements are met
            const requirementsMet = await this.checkRequirements(mode.requirements);
            if (!requirementsMet) {
                throw new Error(`Requirements not met for fallback mode ${modeId}`);
            }

            this.currentMode = modeId;

            // Update degradation level based on mode
            this.updateDegradationLevel(modeId);

            this.logger.info(LogCategory.SYSTEM, `Switched to fallback mode: ${modeId}`, {
                mode: mode.name,
                degradationLevel: this.currentDegradationLevel
            });

            return {
                success: true,
                mode: modeId,
                message: `Switched to ${mode.name} mode. ${mode.description}`,
                availableFeatures: this.getAvailableFeatures(),
                limitations: this.getCurrentLimitations()
            };
        } catch (error) {
            this.logger.error(
                LogCategory.SYSTEM,
                'Failed to switch fallback mode',
                error instanceof Error ? error : new Error(String(error)),
                { targetMode: modeId }
            );

            return {
                success: false,
                mode: this.currentMode,
                message: `Failed to switch to ${modeId} mode. Staying in current mode.`,
                availableFeatures: this.getAvailableFeatures(),
                limitations: this.getCurrentLimitations()
            };
        }
    }

    /**
     * Process command using offline patterns
     */
    public processOfflineCommand(input: string, language: string = 'en-US'): {
        matched: boolean;
        command?: OfflineCommand;
        confidence: number;
        route?: string;
    } {
        try {
            this.logger.debug(LogCategory.VOICE_INPUT, 'Processing offline command', { input, language });

            const normalizedInput = this.normalizeInput(input);
            let bestMatch: OfflineCommand | null = null;
            let bestConfidence = 0;

            // Search through cached commands
            for (const command of this.offlineCommands.values()) {
                if (command.language !== language) continue;

                const confidence = this.calculatePatternMatch(normalizedInput, command.pattern);
                if (confidence > bestConfidence && confidence > 0.6) {
                    bestMatch = command;
                    bestConfidence = confidence;
                }
            }

            if (bestMatch) {
                // Update usage statistics
                bestMatch.usage++;
                bestMatch.lastUsed = new Date();

                this.logger.info(LogCategory.VOICE_INPUT, 'Offline command matched', {
                    pattern: bestMatch.pattern,
                    intent: bestMatch.intent,
                    confidence: bestConfidence
                });

                return {
                    matched: true,
                    command: bestMatch,
                    confidence: bestConfidence,
                    route: bestMatch.route
                };
            }

            this.logger.debug(LogCategory.VOICE_INPUT, 'No offline command matched', { input });

            return {
                matched: false,
                confidence: 0
            };
        } catch (error) {
            this.logger.error(
                LogCategory.VOICE_INPUT,
                'Error processing offline command',
                error instanceof Error ? error : new Error(String(error)),
                { input, language }
            );

            return {
                matched: false,
                confidence: 0
            };
        }
    }

    /**
     * Cache a new command for offline use
     */
    public cacheCommand(pattern: string, intent: string, route: string, language: string = 'en-US'): void {
        try {
            const commandId = this.generateCommandId(pattern, language);

            const command: OfflineCommand = {
                id: commandId,
                pattern: this.normalizePattern(pattern),
                intent,
                route,
                confidence: 1.0,
                language,
                usage: 1,
                lastUsed: new Date()
            };

            this.offlineCommands.set(commandId, command);
            this.saveOfflineCommands();

            this.logger.debug(LogCategory.SYSTEM, 'Command cached for offline use', {
                pattern,
                intent,
                route,
                language
            });
        } catch (error) {
            this.logger.error(
                LogCategory.SYSTEM,
                'Failed to cache command',
                error instanceof Error ? error : new Error(String(error)),
                { pattern, intent, route, language }
            );
        }
    }

    /**
     * Get current capabilities and their status
     */
    public getCapabilities(): Map<string, FallbackCapability> {
        this.assessCapabilities();
        return new Map(this.capabilities);
    }

    /**
     * Check if a specific capability is available
     */
    public isCapabilityAvailable(capability: string): boolean {
        const cap = this.capabilities.get(capability);
        return cap ? cap.available : false;
    }

    /**
     * Get current fallback mode
     */
    public getCurrentMode(): string {
        return this.currentMode;
    }

    /**
     * Get current degradation level
     */
    public getCurrentDegradationLevel(): DegradationLevel {
        return this.degradationLevels[this.currentDegradationLevel] || this.degradationLevels[0];
    }

    /**
     * Get available features in current mode
     */
    public getAvailableFeatures(): string[] {
        const currentLevel = this.getCurrentDegradationLevel();
        return currentLevel.availableFeatures;
    }

    /**
     * Get current limitations
     */
    public getCurrentLimitations(): string[] {
        const currentLevel = this.getCurrentDegradationLevel();
        return currentLevel.disabledFeatures.map(feature => `${feature} is not available`);
    }

    /**
     * Reset to full functionality mode
     */
    public async resetToFullMode(): Promise<FallbackResult> {
        try {
            this.logger.info(LogCategory.SYSTEM, 'Resetting to full functionality mode');

            // Reassess capabilities
            this.assessCapabilities();

            // Check if full mode is possible
            const fullMode = this.fallbackModes.get('full');
            if (!fullMode) {
                throw new Error('Full mode not available');
            }

            const requirementsMet = await this.checkRequirements(fullMode.requirements);
            if (!requirementsMet) {
                // Stay in current mode if requirements not met
                return {
                    success: false,
                    mode: this.currentMode,
                    message: 'Cannot return to full mode. Requirements not met.',
                    availableFeatures: this.getAvailableFeatures(),
                    limitations: this.getCurrentLimitations()
                };
            }

            return await this.switchToMode('full');
        } catch (error) {
            this.logger.error(
                LogCategory.SYSTEM,
                'Failed to reset to full mode',
                error instanceof Error ? error : new Error(String(error))
            );

            return {
                success: false,
                mode: this.currentMode,
                message: 'Failed to reset to full mode.',
                availableFeatures: this.getAvailableFeatures(),
                limitations: this.getCurrentLimitations()
            };
        }
    }

    /**
     * Initialize fallback modes
     */
    private initializeFallbackModes(): void {
        const modes: FallbackMode[] = [
            {
                id: 'full',
                name: 'Full Voice Navigation',
                description: 'Complete voice navigation with all features enabled.',
                enabled: true,
                priority: 1,
                requirements: ['microphone', 'internet', 'speech_recognition', 'tts']
            },
            {
                id: 'limited_voice',
                name: 'Limited Voice Navigation',
                description: 'Basic voice navigation with reduced features.',
                enabled: true,
                priority: 2,
                requirements: ['microphone', 'speech_recognition']
            },
            {
                id: 'offline_voice',
                name: 'Offline Voice Navigation',
                description: 'Voice navigation using cached commands only.',
                enabled: true,
                priority: 3,
                requirements: ['microphone', 'speech_recognition']
            },
            {
                id: 'keyboard_shortcuts',
                name: 'Keyboard Navigation',
                description: 'Navigation using keyboard shortcuts as voice alternative.',
                enabled: true,
                priority: 4,
                requirements: ['keyboard']
            },
            {
                id: 'manual_only',
                name: 'Manual Navigation',
                description: 'Standard manual navigation without voice features.',
                enabled: true,
                priority: 5,
                requirements: []
            }
        ];

        modes.forEach(mode => {
            this.fallbackModes.set(mode.id, mode);
        });
    }

    /**
     * Initialize degradation levels
     */
    private initializeDegradationLevels(): void {
        this.degradationLevels = [
            {
                level: 0,
                name: 'Full Functionality',
                description: 'All voice navigation features available',
                availableFeatures: [
                    'voice_recognition',
                    'intent_processing',
                    'tts_feedback',
                    'multilingual_support',
                    'contextual_navigation',
                    'voice_shortcuts'
                ],
                disabledFeatures: []
            },
            {
                level: 1,
                name: 'Limited Voice',
                description: 'Basic voice navigation with reduced features',
                availableFeatures: [
                    'voice_recognition',
                    'basic_intent_processing',
                    'simple_navigation'
                ],
                disabledFeatures: [
                    'tts_feedback',
                    'multilingual_support',
                    'contextual_navigation',
                    'voice_shortcuts'
                ]
            },
            {
                level: 2,
                name: 'Offline Voice',
                description: 'Voice navigation using cached commands only',
                availableFeatures: [
                    'offline_voice_recognition',
                    'cached_commands',
                    'basic_navigation'
                ],
                disabledFeatures: [
                    'online_processing',
                    'tts_feedback',
                    'multilingual_support',
                    'contextual_navigation',
                    'voice_shortcuts'
                ]
            },
            {
                level: 3,
                name: 'Keyboard Alternative',
                description: 'Keyboard shortcuts as voice navigation alternative',
                availableFeatures: [
                    'keyboard_shortcuts',
                    'hotkeys',
                    'manual_navigation'
                ],
                disabledFeatures: [
                    'voice_recognition',
                    'intent_processing',
                    'tts_feedback',
                    'multilingual_support'
                ]
            },
            {
                level: 4,
                name: 'Manual Only',
                description: 'Standard manual navigation without voice features',
                availableFeatures: [
                    'manual_navigation',
                    'click_navigation',
                    'menu_navigation'
                ],
                disabledFeatures: [
                    'voice_recognition',
                    'intent_processing',
                    'tts_feedback',
                    'keyboard_shortcuts',
                    'multilingual_support'
                ]
            }
        ];
    }

    /**
     * Select appropriate fallback mode based on error
     */
    private selectFallbackMode(error: VoiceNavigationError): FallbackMode {
        let targetModeId = 'manual_only'; // Default fallback

        switch (error) {
            case VoiceNavigationError.MICROPHONE_ACCESS_DENIED:
            case VoiceNavigationError.MICROPHONE_NOT_FOUND:
                targetModeId = 'keyboard_shortcuts';
                break;

            case VoiceNavigationError.NETWORK_ERROR:
            case VoiceNavigationError.SERVICE_UNAVAILABLE:
                targetModeId = 'offline_voice';
                break;

            case VoiceNavigationError.SPEECH_NOT_RECOGNIZED:
            case VoiceNavigationError.INTENT_NOT_RECOGNIZED:
                targetModeId = 'limited_voice';
                break;

            case VoiceNavigationError.QUOTA_EXCEEDED:
            case VoiceNavigationError.API_RATE_LIMIT:
                targetModeId = 'offline_voice';
                break;

            case VoiceNavigationError.BROWSER_NOT_SUPPORTED:
                targetModeId = 'manual_only';
                break;

            default:
                targetModeId = 'limited_voice';
        }

        const mode = this.fallbackModes.get(targetModeId);
        return mode || this.fallbackModes.get('manual_only')!;
    }

    /**
     * Update degradation level based on mode
     */
    private updateDegradationLevel(modeId: string): void {
        const levelMap: Record<string, number> = {
            'full': 0,
            'limited_voice': 1,
            'offline_voice': 2,
            'keyboard_shortcuts': 3,
            'manual_only': 4
        };

        this.currentDegradationLevel = levelMap[modeId] || 4;
    }

    /**
     * Check if requirements are met for a mode
     */
    private async checkRequirements(requirements: string[]): Promise<boolean> {
        for (const requirement of requirements) {
            const capability = this.capabilities.get(requirement);
            if (!capability || !capability.available) {
                return false;
            }
        }
        return true;
    }

    /**
     * Assess current system capabilities
     */
    private assessCapabilities(): void {
        // Check microphone availability
        this.capabilities.set('microphone', {
            name: 'Microphone Access',
            available: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            reason: navigator.mediaDevices ? undefined : 'MediaDevices API not supported'
        });

        // Check internet connectivity
        this.capabilities.set('internet', {
            name: 'Internet Connection',
            available: navigator.onLine,
            reason: navigator.onLine ? undefined : 'No internet connection'
        });

        // Check speech recognition support
        this.capabilities.set('speech_recognition', {
            name: 'Speech Recognition',
            available: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
            reason: (window.SpeechRecognition || window.webkitSpeechRecognition) ? undefined : 'SpeechRecognition API not supported'
        });

        // Check text-to-speech support
        this.capabilities.set('tts', {
            name: 'Text-to-Speech',
            available: !!(window.speechSynthesis),
            reason: window.speechSynthesis ? undefined : 'SpeechSynthesis API not supported'
        });

        // Check keyboard support (always available)
        this.capabilities.set('keyboard', {
            name: 'Keyboard Input',
            available: true
        });
    }

    /**
     * Load offline commands from storage
     */
    private loadOfflineCommands(): void {
        try {
            const stored = localStorage.getItem('voice_navigation_offline_commands');
            if (stored) {
                const commands = JSON.parse(stored);
                Object.entries(commands).forEach(([id, command]) => {
                    this.offlineCommands.set(id, command as OfflineCommand);
                });
            }

            // Add default commands if none exist
            if (this.offlineCommands.size === 0) {
                this.addDefaultOfflineCommands();
            }
        } catch (error) {
            this.logger.warn(LogCategory.SYSTEM, 'Failed to load offline commands', { error });
            this.addDefaultOfflineCommands();
        }
    }

    /**
     * Save offline commands to storage
     */
    private saveOfflineCommands(): void {
        try {
            const commands = Object.fromEntries(this.offlineCommands);
            localStorage.setItem('voice_navigation_offline_commands', JSON.stringify(commands));
        } catch (error) {
            this.logger.warn(LogCategory.SYSTEM, 'Failed to save offline commands', { error });
        }
    }

    /**
     * Add default offline commands
     */
    private addDefaultOfflineCommands(): void {
        const defaultCommands = [
            { pattern: 'go to dashboard', intent: 'navigate_dashboard', route: '/dashboard' },
            { pattern: 'open profile', intent: 'navigate_profile', route: '/profile' },
            { pattern: 'show marketplace', intent: 'navigate_marketplace', route: '/marketplace' },
            { pattern: 'go to cart', intent: 'navigate_cart', route: '/cart' },
            { pattern: 'open wishlist', intent: 'navigate_wishlist', route: '/wishlist' },
            { pattern: 'go home', intent: 'navigate_home', route: '/' },
            { pattern: 'go back', intent: 'navigate_back', route: 'back' }
        ];

        defaultCommands.forEach(cmd => {
            this.cacheCommand(cmd.pattern, cmd.intent, cmd.route, 'en-US');
        });
    }

    /**
     * Normalize input for pattern matching
     */
    private normalizeInput(input: string): string {
        return input.toLowerCase().trim().replace(/[^\w\s]/g, '');
    }

    /**
     * Normalize pattern for storage
     */
    private normalizePattern(pattern: string): string {
        return pattern.toLowerCase().trim();
    }

    /**
     * Calculate pattern match confidence
     */
    private calculatePatternMatch(input: string, pattern: string): number {
        const inputWords = input.split(/\s+/);
        const patternWords = pattern.split(/\s+/);

        let matches = 0;
        for (const word of inputWords) {
            if (patternWords.includes(word)) {
                matches++;
            }
        }

        return matches / Math.max(inputWords.length, patternWords.length);
    }

    /**
     * Generate command ID
     */
    private generateCommandId(pattern: string, language: string): string {
        return `cmd_${language}_${pattern.replace(/\s+/g, '_').toLowerCase()}`;
    }

    /**
     * Get emergency fallback result
     */
    private getEmergencyFallback(): FallbackResult {
        return {
            success: true,
            mode: 'manual_only',
            message: 'Voice navigation is unavailable. Please use manual navigation.',
            availableFeatures: ['manual_navigation'],
            limitations: ['All voice features disabled']
        };
    }
}