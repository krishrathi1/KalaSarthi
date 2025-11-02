/**
 * Voice Navigation Configuration Management
 * Handles environment-specific settings and feature flags
 */

export interface VoiceNavigationConfig {
    // Core settings
    enabled: boolean;
    debugMode: boolean;

    // Language settings
    enabledLanguages: string[];
    defaultLanguage: string;
    fallbackLanguage: string;
    autoDetectLanguage: boolean;

    // Recognition settings
    confidenceThreshold: number;
    maxListeningDuration: number;
    speechTimeout: number;

    // Audio settings
    enableAudioFeedback: boolean;
    audioVolume: number;
    speechRate: number;
    speechPitch: number;

    // Performance settings
    enableCaching: boolean;
    cacheTimeout: number;
    maxConcurrentSessions: number;

    // Security settings
    requireAuthentication: boolean;
    allowedOrigins: string[];
    rateLimitPerMinute: number;

    // Feature flags
    enableWaveformVisualization: boolean;
    enableVoiceActivityDetection: boolean;
    enableOfflineMode: boolean;
    enableAnalytics: boolean;

    // Google Cloud settings
    googleCloudProjectId?: string;
    googleCloudRegion?: string;
    dialogflowAgentId?: string;
}

export interface EnvironmentConfig {
    development: Partial<VoiceNavigationConfig>;
    staging: Partial<VoiceNavigationConfig>;
    production: Partial<VoiceNavigationConfig>;
}

// Default configuration
const defaultConfig: VoiceNavigationConfig = {
    // Core settings
    enabled: true,
    debugMode: false,

    // Language settings
    enabledLanguages: [
        'en-US', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN',
        'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN'
    ],
    defaultLanguage: 'en-US',
    fallbackLanguage: 'en-US',
    autoDetectLanguage: true,

    // Recognition settings
    confidenceThreshold: 0.7,
    maxListeningDuration: 10000, // 10 seconds
    speechTimeout: 5000, // 5 seconds

    // Audio settings
    enableAudioFeedback: true,
    audioVolume: 0.8,
    speechRate: 1.0,
    speechPitch: 0.0,

    // Performance settings
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    maxConcurrentSessions: 10,

    // Security settings
    requireAuthentication: false,
    allowedOrigins: ['localhost', '127.0.0.1'],
    rateLimitPerMinute: 60,

    // Feature flags
    enableWaveformVisualization: true,
    enableVoiceActivityDetection: true,
    enableOfflineMode: false,
    enableAnalytics: true,

    // Google Cloud settings (from environment)
    googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    googleCloudRegion: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
    dialogflowAgentId: process.env.DIALOGFLOW_AGENT_ID,
};

// Environment-specific overrides
const environmentConfig: EnvironmentConfig = {
    development: {
        debugMode: true,
        enableAnalytics: false,
        confidenceThreshold: 0.5, // Lower threshold for testing
        rateLimitPerMinute: 120,
        allowedOrigins: ['localhost', '127.0.0.1', '0.0.0.0'],
    },

    staging: {
        debugMode: true,
        enableAnalytics: true,
        confidenceThreshold: 0.6,
        rateLimitPerMinute: 100,
        allowedOrigins: ['staging.example.com'],
    },

    production: {
        debugMode: false,
        enableAnalytics: true,
        confidenceThreshold: 0.8,
        rateLimitPerMinute: 60,
        enableOfflineMode: true,
        allowedOrigins: ['app.example.com', 'www.example.com'],
    }
};

export class VoiceNavigationConfigManager {
    private static instance: VoiceNavigationConfigManager;
    private config: VoiceNavigationConfig;
    private environment: keyof EnvironmentConfig;

    private constructor() {
        this.environment = this.detectEnvironment();
        this.config = this.loadConfiguration();
    }

    public static getInstance(): VoiceNavigationConfigManager {
        if (!VoiceNavigationConfigManager.instance) {
            VoiceNavigationConfigManager.instance = new VoiceNavigationConfigManager();
        }
        return VoiceNavigationConfigManager.instance;
    }

    private detectEnvironment(): keyof EnvironmentConfig {
        if (typeof window !== 'undefined') {
            // Client-side detection
            const hostname = window.location.hostname;
            if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
                return 'development';
            }
            if (hostname.includes('staging')) {
                return 'staging';
            }
            return 'production';
        }

        // Server-side detection
        const nodeEnv = process.env.NODE_ENV;
        if (nodeEnv === 'development') return 'development';
        return 'production';
    }

    private loadConfiguration(): VoiceNavigationConfig {
        const envOverrides = environmentConfig[this.environment] || {};

        // Merge default config with environment overrides
        const mergedConfig = {
            ...defaultConfig,
            ...envOverrides
        };

        // Apply any runtime overrides from localStorage (client-side only)
        if (typeof window !== 'undefined') {
            try {
                const storedConfig = localStorage.getItem('voiceNavigationConfig');
                if (storedConfig) {
                    const parsedConfig = JSON.parse(storedConfig);
                    Object.assign(mergedConfig, parsedConfig);
                }
            } catch (error) {
                console.warn('Failed to load voice navigation config from localStorage:', error);
            }
        }

        return mergedConfig;
    }

    public getConfig(): VoiceNavigationConfig {
        return { ...this.config };
    }

    public updateConfig(updates: Partial<VoiceNavigationConfig>): void {
        this.config = { ...this.config, ...updates };

        // Persist to localStorage (client-side only)
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('voiceNavigationConfig', JSON.stringify(updates));
            } catch (error) {
                console.warn('Failed to save voice navigation config to localStorage:', error);
            }
        }
    }

    public resetConfig(): void {
        this.config = this.loadConfiguration();

        // Clear localStorage (client-side only)
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('voiceNavigationConfig');
            } catch (error) {
                console.warn('Failed to clear voice navigation config from localStorage:', error);
            }
        }
    }

    public getEnvironment(): keyof EnvironmentConfig {
        return this.environment;
    }

    public isFeatureEnabled(feature: keyof VoiceNavigationConfig): boolean {
        return Boolean(this.config[feature]);
    }

    public getLanguageConfig(languageCode?: string) {
        const lang = languageCode || this.config.defaultLanguage;

        return {
            languageCode: lang,
            speechRate: this.config.speechRate,
            pitch: this.config.speechPitch,
            volume: this.config.audioVolume,
            enabled: this.config.enabledLanguages.includes(lang)
        };
    }

    public validateConfig(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate required settings
        if (!this.config.enabledLanguages.length) {
            errors.push('At least one language must be enabled');
        }

        if (!this.config.enabledLanguages.includes(this.config.defaultLanguage)) {
            errors.push('Default language must be in enabled languages list');
        }

        if (this.config.confidenceThreshold < 0 || this.config.confidenceThreshold > 1) {
            errors.push('Confidence threshold must be between 0 and 1');
        }

        if (this.config.maxListeningDuration < 1000) {
            errors.push('Max listening duration must be at least 1 second');
        }

        if (this.config.audioVolume < 0 || this.config.audioVolume > 1) {
            errors.push('Audio volume must be between 0 and 1');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

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
export const voiceNavigationConfig = VoiceNavigationConfigManager.getInstance();

// Export utility functions
export function getVoiceNavigationConfig(): VoiceNavigationConfig {
    return voiceNavigationConfig.getConfig();
}

export function isVoiceNavigationEnabled(): boolean {
    return voiceNavigationConfig.isFeatureEnabled('enabled');
}

export function getEnabledLanguages(): string[] {
    return voiceNavigationConfig.getConfig().enabledLanguages;
}

export function updateVoiceNavigationConfig(updates: Partial<VoiceNavigationConfig>): void {
    voiceNavigationConfig.updateConfig(updates);
}