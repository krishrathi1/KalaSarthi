/**
 * Voice Navigation Progressive Enhancement
 * Provides progressive enhancement features for voice navigation
 * Enables features based on browser capabilities and user preferences
 */

import { VoiceNavigationLogger, LogLevel, LogCategory } from './VoiceNavigationLogger';

export interface BrowserCapability {
    name: string;
    available: boolean;
    version?: string;
    fallback?: string;
    enhancement?: string;
}

export interface FeatureLevel {
    level: number;
    name: string;
    description: string;
    requiredCapabilities: string[];
    features: string[];
}

export interface EnhancementConfig {
    enableProgressiveEnhancement: boolean;
    autoDetectCapabilities: boolean;
    fallbackToBasicFeatures: boolean;
    enableFeatureUpgrade: boolean;
    checkInterval: number;
}

export interface FeatureAvailability {
    feature: string;
    available: boolean;
    level: number;
    reason?: string;
    alternatives?: string[];
}

export class VoiceNavigationProgressiveEnhancement {
    private static instance: VoiceNavigationProgressiveEnhancement;
    private logger: VoiceNavigationLogger;
    private config: EnhancementConfig;
    private capabilities: Map<string, BrowserCapability>;
    private featureLevels: FeatureLevel[];
    private currentLevel: number = 0;
    private availableFeatures: Set<string>;
    private checkTimer: NodeJS.Timeout | null = null;

    private constructor() {
        this.logger = VoiceNavigationLogger.getInstance();
        this.config = this.getDefaultConfig();
        this.capabilities = new Map();
        this.featureLevels = [];
        this.availableFeatures = new Set();

        this.initializeFeatureLevels();
        this.detectCapabilities();
        this.determineFeatureLevel();

        if (this.config.enableFeatureUpgrade) {
            this.startCapabilityMonitoring();
        }
    }

    public static getInstance(): VoiceNavigationProgressiveEnhancement {
        if (!VoiceNavigationProgressiveEnhancement.instance) {
            VoiceNavigationProgressiveEnhancement.instance = new VoiceNavigationProgressiveEnhancement();
        }
        return VoiceNavigationProgressiveEnhancement.instance;
    }

    /**
     * Configure progressive enhancement
     */
    public configure(config: Partial<EnhancementConfig>): void {
        this.config = { ...this.config, ...config };

        if (this.config.enableFeatureUpgrade) {
            this.startCapabilityMonitoring();
        } else {
            this.stopCapabilityMonitoring();
        }

        this.logger.info(LogCategory.SYSTEM, 'Progressive enhancement configured', { config: this.config });
    }

    /**
     * Check if a specific feature is available
     */
    public isFeatureAvailable(feature: string): FeatureAvailability {
        const available = this.availableFeatures.has(feature);
        const level = this.getFeatureLevel(feature);

        let reason: string | undefined;
        let alternatives: string[] = [];

        if (!available) {
            reason = this.getUnavailabilityReason(feature);
            alternatives = this.getFeatureAlternatives(feature);
        }

        return {
            feature,
            available,
            level,
            reason,
            alternatives: alternatives.length > 0 ? alternatives : undefined
        };
    }

    /**
     * Get all available features for current capability level
     */
    public getAvailableFeatures(): string[] {
        return Array.from(this.availableFeatures);
    }

    /**
     * Get current feature level
     */
    public getCurrentLevel(): FeatureLevel {
        return this.featureLevels[this.currentLevel] || this.featureLevels[0];
    }

    /**
     * Get all browser capabilities
     */
    public getCapabilities(): Map<string, BrowserCapability> {
        return new Map(this.capabilities);
    }

    /**
     * Check if browser supports a specific capability
     */
    public hasCapability(capability: string): boolean {
        const cap = this.capabilities.get(capability);
        return cap ? cap.available : false;
    }

    /**
     * Upgrade to higher feature level if possible
     */
    public async upgradeFeatures(): Promise<{
        upgraded: boolean;
        previousLevel: number;
        newLevel: number;
        newFeatures: string[];
    }> {
        const previousLevel = this.currentLevel;

        // Re-detect capabilities
        this.detectCapabilities();

        // Determine new feature level
        const newLevel = this.determineOptimalLevel();

        if (newLevel > this.currentLevel) {
            const previousFeatures = new Set(this.availableFeatures);
            this.currentLevel = newLevel;
            this.updateAvailableFeatures();

            const newFeatures = Array.from(this.availableFeatures).filter(
                feature => !previousFeatures.has(feature)
            );

            this.logger.info(LogCategory.SYSTEM, 'Features upgraded', {
                previousLevel,
                newLevel,
                newFeatures
            });

            return {
                upgraded: true,
                previousLevel,
                newLevel,
                newFeatures
            };
        }

        return {
            upgraded: false,
            previousLevel,
            newLevel: this.currentLevel,
            newFeatures: []
        };
    }

    /**
     * Downgrade to lower feature level
     */
    public downgradeFeatures(targetLevel?: number): {
        downgraded: boolean;
        previousLevel: number;
        newLevel: number;
        removedFeatures: string[];
    } {
        const previousLevel = this.currentLevel;
        const newLevel = targetLevel !== undefined ? targetLevel : Math.max(0, this.currentLevel - 1);

        if (newLevel < this.currentLevel) {
            const previousFeatures = new Set(this.availableFeatures);
            this.currentLevel = newLevel;
            this.updateAvailableFeatures();

            const removedFeatures = Array.from(previousFeatures).filter(
                feature => !this.availableFeatures.has(feature)
            );

            this.logger.info(LogCategory.SYSTEM, 'Features downgraded', {
                previousLevel,
                newLevel,
                removedFeatures
            });

            return {
                downgraded: true,
                previousLevel,
                newLevel,
                removedFeatures
            };
        }

        return {
            downgraded: false,
            previousLevel,
            newLevel: this.currentLevel,
            removedFeatures: []
        };
    }

    /**
     * Get feature enhancement suggestions
     */
    public getEnhancementSuggestions(): {
        missingCapabilities: string[];
        potentialFeatures: string[];
        upgradeInstructions: string[];
    } {
        const nextLevel = Math.min(this.currentLevel + 1, this.featureLevels.length - 1);
        const nextLevelFeatures = this.featureLevels[nextLevel];

        if (!nextLevelFeatures || nextLevel === this.currentLevel) {
            return {
                missingCapabilities: [],
                potentialFeatures: [],
                upgradeInstructions: []
            };
        }

        const missingCapabilities = nextLevelFeatures.requiredCapabilities.filter(
            cap => !this.hasCapability(cap)
        );

        const potentialFeatures = nextLevelFeatures.features.filter(
            feature => !this.availableFeatures.has(feature)
        );

        const upgradeInstructions = this.getUpgradeInstructions(missingCapabilities);

        return {
            missingCapabilities,
            potentialFeatures,
            upgradeInstructions
        };
    }

    /**
     * Initialize feature levels
     */
    private initializeFeatureLevels(): void {
        this.featureLevels = [
            {
                level: 0,
                name: 'Basic Navigation',
                description: 'Manual navigation only',
                requiredCapabilities: [],
                features: [
                    'manual_navigation',
                    'click_navigation',
                    'keyboard_navigation'
                ]
            },
            {
                level: 1,
                name: 'Enhanced Navigation',
                description: 'Keyboard shortcuts and hotkeys',
                requiredCapabilities: ['keyboard_events'],
                features: [
                    'manual_navigation',
                    'click_navigation',
                    'keyboard_navigation',
                    'keyboard_shortcuts',
                    'hotkeys'
                ]
            },
            {
                level: 2,
                name: 'Basic Voice',
                description: 'Simple voice recognition',
                requiredCapabilities: ['microphone', 'speech_recognition'],
                features: [
                    'manual_navigation',
                    'keyboard_navigation',
                    'basic_voice_recognition',
                    'simple_commands'
                ]
            },
            {
                level: 3,
                name: 'Enhanced Voice',
                description: 'Advanced voice recognition with feedback',
                requiredCapabilities: ['microphone', 'speech_recognition', 'speech_synthesis'],
                features: [
                    'manual_navigation',
                    'keyboard_navigation',
                    'voice_recognition',
                    'voice_commands',
                    'audio_feedback',
                    'basic_tts'
                ]
            },
            {
                level: 4,
                name: 'Smart Voice',
                description: 'Intelligent voice navigation with context',
                requiredCapabilities: ['microphone', 'speech_recognition', 'speech_synthesis', 'web_audio'],
                features: [
                    'manual_navigation',
                    'keyboard_navigation',
                    'advanced_voice_recognition',
                    'contextual_commands',
                    'intelligent_routing',
                    'enhanced_audio_feedback',
                    'voice_activity_detection'
                ]
            },
            {
                level: 5,
                name: 'Full Voice Navigation',
                description: 'Complete voice navigation with all features',
                requiredCapabilities: [
                    'microphone',
                    'speech_recognition',
                    'speech_synthesis',
                    'web_audio',
                    'network_connection',
                    'modern_browser'
                ],
                features: [
                    'manual_navigation',
                    'keyboard_navigation',
                    'full_voice_recognition',
                    'multilingual_support',
                    'contextual_navigation',
                    'intelligent_intent_processing',
                    'advanced_audio_feedback',
                    'voice_shortcuts',
                    'continuous_listening',
                    'cloud_processing'
                ]
            }
        ];
    }

    /**
     * Detect browser capabilities
     */
    private detectCapabilities(): void {
        // Keyboard events
        this.capabilities.set('keyboard_events', {
            name: 'Keyboard Events',
            available: typeof KeyboardEvent !== 'undefined',
            enhancement: 'Enables keyboard shortcuts and hotkeys'
        });

        // Microphone access
        this.capabilities.set('microphone', {
            name: 'Microphone Access',
            available: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            fallback: 'Manual navigation',
            enhancement: 'Enables voice input'
        });

        // Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.capabilities.set('speech_recognition', {
            name: 'Speech Recognition',
            available: !!SpeechRecognition,
            version: SpeechRecognition ? 'WebKit' : undefined,
            fallback: 'Keyboard input',
            enhancement: 'Enables voice commands'
        });

        // Speech Synthesis
        this.capabilities.set('speech_synthesis', {
            name: 'Speech Synthesis',
            available: !!window.speechSynthesis,
            fallback: 'Visual feedback only',
            enhancement: 'Enables audio feedback'
        });

        // Web Audio API
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.capabilities.set('web_audio', {
            name: 'Web Audio API',
            available: !!AudioContext,
            version: AudioContext ? 'WebKit' : undefined,
            enhancement: 'Enables advanced audio processing'
        });

        // Network connection
        this.capabilities.set('network_connection', {
            name: 'Network Connection',
            available: navigator.onLine,
            fallback: 'Offline mode',
            enhancement: 'Enables cloud processing'
        });

        // Modern browser features
        const hasModernFeatures = !!(
            window.fetch &&
            window.Promise &&
            window.Map &&
            window.Set &&
            Array.prototype.includes
        );

        this.capabilities.set('modern_browser', {
            name: 'Modern Browser Features',
            available: hasModernFeatures,
            fallback: 'Basic functionality only',
            enhancement: 'Enables advanced features'
        });

        // Geolocation (for context-aware navigation)
        this.capabilities.set('geolocation', {
            name: 'Geolocation',
            available: !!navigator.geolocation,
            enhancement: 'Enables location-based features'
        });

        // Local Storage
        this.capabilities.set('local_storage', {
            name: 'Local Storage',
            available: !!window.localStorage,
            fallback: 'Session-only data',
            enhancement: 'Enables offline command caching'
        });

        this.logger.debug(LogCategory.SYSTEM, 'Browser capabilities detected', {
            capabilities: Object.fromEntries(this.capabilities)
        });
    }

    /**
     * Determine optimal feature level based on capabilities
     */
    private determineOptimalLevel(): number {
        for (let i = this.featureLevels.length - 1; i >= 0; i--) {
            const level = this.featureLevels[i];
            const hasAllCapabilities = level.requiredCapabilities.every(
                cap => this.hasCapability(cap)
            );

            if (hasAllCapabilities) {
                return i;
            }
        }

        return 0; // Fallback to basic level
    }

    /**
     * Determine current feature level
     */
    private determineFeatureLevel(): void {
        this.currentLevel = this.determineOptimalLevel();
        this.updateAvailableFeatures();

        this.logger.info(LogCategory.SYSTEM, 'Feature level determined', {
            level: this.currentLevel,
            levelName: this.getCurrentLevel().name,
            availableFeatures: Array.from(this.availableFeatures)
        });
    }

    /**
     * Update available features based on current level
     */
    private updateAvailableFeatures(): void {
        this.availableFeatures.clear();

        const currentLevel = this.getCurrentLevel();
        currentLevel.features.forEach(feature => {
            this.availableFeatures.add(feature);
        });
    }

    /**
     * Get feature level for a specific feature
     */
    private getFeatureLevel(feature: string): number {
        for (let i = 0; i < this.featureLevels.length; i++) {
            if (this.featureLevels[i].features.includes(feature)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Get reason why a feature is unavailable
     */
    private getUnavailabilityReason(feature: string): string {
        const featureLevel = this.getFeatureLevel(feature);

        if (featureLevel === -1) {
            return 'Feature not recognized';
        }

        if (featureLevel > this.currentLevel) {
            const requiredLevel = this.featureLevels[featureLevel];
            const missingCapabilities = requiredLevel.requiredCapabilities.filter(
                cap => !this.hasCapability(cap)
            );

            if (missingCapabilities.length > 0) {
                return `Missing capabilities: ${missingCapabilities.join(', ')}`;
            }

            return `Requires feature level ${featureLevel} (${requiredLevel.name})`;
        }

        return 'Feature should be available but is not enabled';
    }

    /**
     * Get alternative features for unavailable feature
     */
    private getFeatureAlternatives(feature: string): string[] {
        const alternatives: Record<string, string[]> = {
            'voice_recognition': ['keyboard_shortcuts', 'manual_navigation'],
            'audio_feedback': ['visual_feedback', 'text_notifications'],
            'multilingual_support': ['english_only'],
            'continuous_listening': ['push_to_talk', 'click_to_activate'],
            'cloud_processing': ['offline_processing', 'basic_recognition']
        };

        return alternatives[feature] || [];
    }

    /**
     * Get upgrade instructions for missing capabilities
     */
    private getUpgradeInstructions(missingCapabilities: string[]): string[] {
        const instructions: Record<string, string> = {
            'microphone': 'Enable microphone access in browser settings',
            'speech_recognition': 'Use a modern browser that supports Web Speech API',
            'speech_synthesis': 'Use a browser with Speech Synthesis support',
            'web_audio': 'Update to a browser with Web Audio API support',
            'network_connection': 'Connect to the internet for full functionality',
            'modern_browser': 'Update to a modern browser version'
        };

        return missingCapabilities.map(cap => instructions[cap] || `Enable ${cap} capability`);
    }

    /**
     * Start monitoring capabilities for upgrades
     */
    private startCapabilityMonitoring(): void {
        this.stopCapabilityMonitoring();

        this.checkTimer = setInterval(() => {
            this.checkForUpgrades();
        }, this.config.checkInterval);

        // Also listen for online/offline events
        window.addEventListener('online', () => this.handleConnectivityChange(true));
        window.addEventListener('offline', () => this.handleConnectivityChange(false));
    }

    /**
     * Stop monitoring capabilities
     */
    private stopCapabilityMonitoring(): void {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }

        window.removeEventListener('online', () => this.handleConnectivityChange(true));
        window.removeEventListener('offline', () => this.handleConnectivityChange(false));
    }

    /**
     * Check for capability upgrades
     */
    private async checkForUpgrades(): Promise<void> {
        const result = await this.upgradeFeatures();

        if (result.upgraded) {
            this.logger.info(LogCategory.SYSTEM, 'Automatic feature upgrade detected', result);
        }
    }

    /**
     * Handle connectivity changes
     */
    private handleConnectivityChange(online: boolean): void {
        this.capabilities.set('network_connection', {
            name: 'Network Connection',
            available: online,
            fallback: 'Offline mode',
            enhancement: 'Enables cloud processing'
        });

        this.logger.info(LogCategory.SYSTEM, `Connectivity changed: ${online ? 'online' : 'offline'}`);

        if (online) {
            this.checkForUpgrades();
        } else {
            // Potentially downgrade features that require network
            const currentLevel = this.getCurrentLevel();
            if (currentLevel.requiredCapabilities.includes('network_connection')) {
                this.downgradeFeatures();
            }
        }
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(): EnhancementConfig {
        return {
            enableProgressiveEnhancement: true,
            autoDetectCapabilities: true,
            fallbackToBasicFeatures: true,
            enableFeatureUpgrade: true,
            checkInterval: 30000 // 30 seconds
        };
    }
}