/**
 * Artisan Buddy Voice Configuration Management
 * Handles voice preferences and settings for the Artisan Buddy chat component
 */

export interface ArtisanBuddyVoiceConfig {
    // Voice input settings
    voiceInputEnabled: boolean;
    voiceOutputEnabled: boolean;

    // Audio settings
    autoPlayResponses: boolean;
    audioVolume: number;
    speechRate: number;
    speechPitch: number;

    // Language settings
    preferredLanguage: string;
    selectedVoice?: string;

    // Service preferences
    preferredTTSService: 'google-cloud' | 'browser';
    enableFallback: boolean;

    // UI preferences
    showVoiceIndicators: boolean;
    showProcessingStatus: boolean;
    enableVisualFeedback: boolean;

    // Performance settings
    enableAudioCaching: boolean;
    maxRecordingDuration: number;
    silenceTimeout: number;
}

// Default voice configuration
const defaultVoiceConfig: ArtisanBuddyVoiceConfig = {
    // Voice input/output
    voiceInputEnabled: true,
    voiceOutputEnabled: true,

    // Audio settings
    autoPlayResponses: true,
    audioVolume: 0.8,
    speechRate: 1.0,
    speechPitch: 0.0,

    // Language settings
    preferredLanguage: 'en-US',
    selectedVoice: undefined,

    // Service preferences
    preferredTTSService: 'google-cloud',
    enableFallback: true,

    // UI preferences
    showVoiceIndicators: true,
    showProcessingStatus: true,
    enableVisualFeedback: true,

    // Performance settings
    enableAudioCaching: true,
    maxRecordingDuration: 30000, // 30 seconds
    silenceTimeout: 3000, // 3 seconds
};

export class ArtisanBuddyVoiceConfigManager {
    private static instance: ArtisanBuddyVoiceConfigManager;
    private config: ArtisanBuddyVoiceConfig;
    private readonly storageKey = 'artisan_buddy_voice_config';

    private constructor() {
        this.config = this.loadConfiguration();
    }

    public static getInstance(): ArtisanBuddyVoiceConfigManager {
        if (!ArtisanBuddyVoiceConfigManager.instance) {
            ArtisanBuddyVoiceConfigManager.instance = new ArtisanBuddyVoiceConfigManager();
        }
        return ArtisanBuddyVoiceConfigManager.instance;
    }

    private loadConfiguration(): ArtisanBuddyVoiceConfig {
        let config = { ...defaultVoiceConfig };

        // Load from localStorage if available
        if (typeof window !== 'undefined') {
            try {
                const storedConfig = localStorage.getItem(this.storageKey);
                if (storedConfig) {
                    const parsedConfig = JSON.parse(storedConfig);
                    config = { ...config, ...parsedConfig };
                }
            } catch (error) {
                console.warn('Failed to load Artisan Buddy voice config from localStorage:', error);
            }
        }

        return config;
    }

    private saveConfiguration(): void {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            } catch (error) {
                console.warn('Failed to save Artisan Buddy voice config to localStorage:', error);
            }
        }
    }

    public getConfig(): ArtisanBuddyVoiceConfig {
        return { ...this.config };
    }

    public updateConfig(updates: Partial<ArtisanBuddyVoiceConfig>): void {
        this.config = { ...this.config, ...updates };
        this.saveConfiguration();
    }

    public resetConfig(): void {
        this.config = { ...defaultVoiceConfig };
        this.saveConfiguration();
    }

    // Specific getters for common settings
    public isVoiceInputEnabled(): boolean {
        return this.config.voiceInputEnabled;
    }

    public isVoiceOutputEnabled(): boolean {
        return this.config.voiceOutputEnabled;
    }

    public shouldAutoPlayResponses(): boolean {
        return this.config.voiceOutputEnabled && this.config.autoPlayResponses;
    }

    public getAudioSettings() {
        return {
            volume: this.config.audioVolume,
            rate: this.config.speechRate,
            pitch: this.config.speechPitch,
        };
    }

    public getTTSSettings() {
        return {
            preferredService: this.config.preferredTTSService,
            enableFallback: this.config.enableFallback,
            languageCode: this.config.preferredLanguage,
            selectedVoice: this.config.selectedVoice,
            ...this.getAudioSettings(),
        };
    }

    public getRecordingSettings() {
        return {
            maxDuration: this.config.maxRecordingDuration,
            silenceTimeout: this.config.silenceTimeout,
        };
    }

    public getUISettings() {
        return {
            showVoiceIndicators: this.config.showVoiceIndicators,
            showProcessingStatus: this.config.showProcessingStatus,
            enableVisualFeedback: this.config.enableVisualFeedback,
        };
    }

    // Toggle methods for easy UI integration
    public toggleVoiceInput(): boolean {
        this.config.voiceInputEnabled = !this.config.voiceInputEnabled;
        this.saveConfiguration();
        return this.config.voiceInputEnabled;
    }

    public toggleVoiceOutput(): boolean {
        this.config.voiceOutputEnabled = !this.config.voiceOutputEnabled;
        this.saveConfiguration();
        return this.config.voiceOutputEnabled;
    }

    public toggleAutoPlay(): boolean {
        this.config.autoPlayResponses = !this.config.autoPlayResponses;
        this.saveConfiguration();
        return this.config.autoPlayResponses;
    }

    // Validation
    public validateConfig(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (this.config.audioVolume < 0 || this.config.audioVolume > 1) {
            errors.push('Audio volume must be between 0 and 1');
        }

        if (this.config.speechRate < 0.1 || this.config.speechRate > 3.0) {
            errors.push('Speech rate must be between 0.1 and 3.0');
        }

        if (this.config.speechPitch < -20 || this.config.speechPitch > 20) {
            errors.push('Speech pitch must be between -20 and 20');
        }

        if (this.config.maxRecordingDuration < 1000 || this.config.maxRecordingDuration > 60000) {
            errors.push('Max recording duration must be between 1 and 60 seconds');
        }

        if (this.config.silenceTimeout < 500 || this.config.silenceTimeout > 10000) {
            errors.push('Silence timeout must be between 0.5 and 10 seconds');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Export/Import functionality
    public exportConfig(): string {
        return JSON.stringify(this.config, null, 2);
    }

    public importConfig(configJson: string): { success: boolean; error?: string } {
        try {
            const importedConfig = JSON.parse(configJson);

            // Validate imported config
            const tempConfig = { ...this.config, ...importedConfig };
            const validation = this.validateConfig();

            if (!validation.isValid) {
                return {
                    success: false,
                    error: `Invalid configuration: ${validation.errors.join(', ')}`
                };
            }

            this.updateConfig(importedConfig);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}

// Export singleton instance
export const artisanBuddyVoiceConfig = ArtisanBuddyVoiceConfigManager.getInstance();

// Export utility functions
export function getArtisanBuddyVoiceConfig(): ArtisanBuddyVoiceConfig {
    return artisanBuddyVoiceConfig.getConfig();
}

export function updateArtisanBuddyVoiceConfig(updates: Partial<ArtisanBuddyVoiceConfig>): void {
    artisanBuddyVoiceConfig.updateConfig(updates);
}

export function isVoiceInputEnabled(): boolean {
    return artisanBuddyVoiceConfig.isVoiceInputEnabled();
}

export function isVoiceOutputEnabled(): boolean {
    return artisanBuddyVoiceConfig.isVoiceOutputEnabled();
}

export function toggleVoiceInput(): boolean {
    return artisanBuddyVoiceConfig.toggleVoiceInput();
}

export function toggleVoiceOutput(): boolean {
    return artisanBuddyVoiceConfig.toggleVoiceOutput();
}