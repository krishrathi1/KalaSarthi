/**
 * Voice Language Switcher
 * Handles dynamic language switching during voice navigation sessions
 */

import { MultilingualVoiceService } from './MultilingualVoiceService';
import { useTranslation } from '@/context/TranslationContext';

export interface LanguageSwitchEvent {
    fromLanguage: string;
    toLanguage: string;
    timestamp: Date;
    trigger: 'user_command' | 'auto_detection' | 'context_change' | 'manual';
    confidence: number;
    sessionId?: string;
}

export interface LanguageSwitchResult {
    success: boolean;
    previousLanguage: string;
    newLanguage: string;
    message: string;
    audioFeedback?: string;
    requiresConfirmation?: boolean;
}

export interface LanguagePreference {
    userId: string;
    primaryLanguage: string;
    fallbackLanguages: string[];
    autoSwitch: boolean;
    confirmationRequired: boolean;
    lastUsed: Date;
}

export class VoiceLanguageSwitcher {
    private static instance: VoiceLanguageSwitcher;
    private multilingualService: MultilingualVoiceService;
    private switchHistory: LanguageSwitchEvent[] = [];
    private userPreferences: Map<string, LanguagePreference> = new Map();
    private currentSessionId?: string;
    private switchListeners: Array<(event: LanguageSwitchEvent) => void> = [];

    private constructor() {
        this.multilingualService = MultilingualVoiceService.getInstance();
        this.loadUserPreferences();
    }

    public static getInstance(): VoiceLanguageSwitcher {
        if (!VoiceLanguageSwitcher.instance) {
            VoiceLanguageSwitcher.instance = new VoiceLanguageSwitcher();
        }
        return VoiceLanguageSwitcher.instance;
    }

    /**
     * Set current session ID for tracking
     */
    public setSessionId(sessionId: string): void {
        this.currentSessionId = sessionId;
    }

    /**
     * Add listener for language switch events
     */
    public addSwitchListener(listener: (event: LanguageSwitchEvent) => void): void {
        this.switchListeners.push(listener);
    }

    /**
     * Remove listener for language switch events
     */
    public removeSwitchListener(listener: (event: LanguageSwitchEvent) => void): void {
        const index = this.switchListeners.indexOf(listener);
        if (index > -1) {
            this.switchListeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of language switch event
     */
    private notifyListeners(event: LanguageSwitchEvent): void {
        this.switchListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in language switch listener:', error);
            }
        });
    }

    /**
     * Switch language manually
     */
    public async switchLanguage(
        targetLanguage: string,
        userId?: string,
        requireConfirmation: boolean = false
    ): Promise<LanguageSwitchResult> {
        const currentLanguage = this.multilingualService.getCurrentLanguage();

        try {
            // Validate target language
            if (!this.multilingualService.isLanguageSupported(targetLanguage)) {
                return {
                    success: false,
                    previousLanguage: currentLanguage,
                    newLanguage: currentLanguage,
                    message: `Language ${targetLanguage} is not supported`,
                    audioFeedback: this.getErrorMessage('language_not_supported', currentLanguage)
                };
            }

            // Check if already in target language
            if (currentLanguage === targetLanguage) {
                return {
                    success: true,
                    previousLanguage: currentLanguage,
                    newLanguage: targetLanguage,
                    message: `Already using ${this.multilingualService.getLanguageDisplayName(targetLanguage)}`,
                    audioFeedback: this.getConfirmationMessage('already_using', targetLanguage, targetLanguage)
                };
            }

            // Perform the switch
            const switchSuccess = this.multilingualService.setCurrentLanguage(targetLanguage);

            if (!switchSuccess) {
                return {
                    success: false,
                    previousLanguage: currentLanguage,
                    newLanguage: currentLanguage,
                    message: `Failed to switch to ${targetLanguage}`,
                    audioFeedback: this.getErrorMessage('switch_failed', currentLanguage)
                };
            }

            // Create switch event
            const switchEvent: LanguageSwitchEvent = {
                fromLanguage: currentLanguage,
                toLanguage: targetLanguage,
                timestamp: new Date(),
                trigger: 'manual',
                confidence: 1.0,
                sessionId: this.currentSessionId
            };

            // Add to history
            this.switchHistory.push(switchEvent);
            this.notifyListeners(switchEvent);

            // Update user preferences if userId provided
            if (userId) {
                this.updateUserPreference(userId, targetLanguage);
            }

            // Sync with translation context if available
            await this.syncWithTranslationContext(targetLanguage);

            const displayName = this.multilingualService.getLanguageDisplayName(targetLanguage);

            return {
                success: true,
                previousLanguage: currentLanguage,
                newLanguage: targetLanguage,
                message: `Switched to ${displayName}`,
                audioFeedback: this.getConfirmationMessage('switched_to', targetLanguage, targetLanguage),
                requiresConfirmation: requireConfirmation
            };

        } catch (error) {
            console.error('Language switch error:', error);
            return {
                success: false,
                previousLanguage: currentLanguage,
                newLanguage: currentLanguage,
                message: `Error switching language: ${error instanceof Error ? error.message : 'Unknown error'}`,
                audioFeedback: this.getErrorMessage('switch_error', currentLanguage)
            };
        }
    }

    /**
     * Auto-detect and switch language based on user input
     */
    public async autoSwitchFromInput(
        userInput: string,
        userId?: string,
        confidenceThreshold: number = 0.7
    ): Promise<LanguageSwitchResult> {
        const currentLanguage = this.multilingualService.getCurrentLanguage();

        try {
            // Detect language from input
            const detection = this.multilingualService.detectLanguageFromText(userInput);

            // Check if confidence is high enough and language is different
            if (detection.confidence < confidenceThreshold || detection.language === currentLanguage) {
                return {
                    success: false,
                    previousLanguage: currentLanguage,
                    newLanguage: currentLanguage,
                    message: 'No language switch needed',
                    audioFeedback: undefined
                };
            }

            // Check user preferences for auto-switching
            const userPref = userId ? this.getUserPreference(userId) : null;
            if (userPref && !userPref.autoSwitch) {
                return {
                    success: false,
                    previousLanguage: currentLanguage,
                    newLanguage: currentLanguage,
                    message: 'Auto-switching disabled for user',
                    audioFeedback: undefined
                };
            }

            // Perform auto-switch
            const switchResult = await this.switchLanguage(detection.language, userId, userPref?.confirmationRequired);

            if (switchResult.success) {
                // Update switch event to reflect auto-detection
                const lastEvent = this.switchHistory[this.switchHistory.length - 1];
                if (lastEvent) {
                    lastEvent.trigger = 'auto_detection';
                    lastEvent.confidence = detection.confidence;
                }
            }

            return switchResult;

        } catch (error) {
            console.error('Auto-switch error:', error);
            return {
                success: false,
                previousLanguage: currentLanguage,
                newLanguage: currentLanguage,
                message: `Auto-switch error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                audioFeedback: this.getErrorMessage('auto_switch_error', currentLanguage)
            };
        }
    }

    /**
     * Switch language based on translation context change
     */
    public async switchFromTranslationContext(
        translationLanguage: string,
        userId?: string
    ): Promise<LanguageSwitchResult> {
        const currentLanguage = this.multilingualService.getCurrentLanguage();

        try {
            // Map translation language to voice language
            const voiceLanguage = this.mapTranslationToVoiceLanguage(translationLanguage);

            if (voiceLanguage === currentLanguage) {
                return {
                    success: true,
                    previousLanguage: currentLanguage,
                    newLanguage: voiceLanguage,
                    message: 'Voice language already matches translation context',
                    audioFeedback: undefined
                };
            }

            // Perform context-based switch
            const switchResult = await this.switchLanguage(voiceLanguage, userId, false);

            if (switchResult.success) {
                // Update switch event to reflect context change
                const lastEvent = this.switchHistory[this.switchHistory.length - 1];
                if (lastEvent) {
                    lastEvent.trigger = 'context_change';
                }
            }

            return switchResult;

        } catch (error) {
            console.error('Context switch error:', error);
            return {
                success: false,
                previousLanguage: currentLanguage,
                newLanguage: currentLanguage,
                message: `Context switch error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                audioFeedback: this.getErrorMessage('context_switch_error', currentLanguage)
            };
        }
    }

    /**
     * Process voice command for language switching
     */
    public async processLanguageSwitchCommand(
        command: string,
        userId?: string
    ): Promise<LanguageSwitchResult> {
        const currentLanguage = this.multilingualService.getCurrentLanguage();

        try {
            // Parse language switch commands
            const targetLanguage = this.parseLanguageSwitchCommand(command, currentLanguage);

            if (!targetLanguage) {
                return {
                    success: false,
                    previousLanguage: currentLanguage,
                    newLanguage: currentLanguage,
                    message: 'Language switch command not recognized',
                    audioFeedback: this.getErrorMessage('command_not_recognized', currentLanguage)
                };
            }

            // Perform command-based switch
            const switchResult = await this.switchLanguage(targetLanguage, userId, false);

            if (switchResult.success) {
                // Update switch event to reflect user command
                const lastEvent = this.switchHistory[this.switchHistory.length - 1];
                if (lastEvent) {
                    lastEvent.trigger = 'user_command';
                }
            }

            return switchResult;

        } catch (error) {
            console.error('Command switch error:', error);
            return {
                success: false,
                previousLanguage: currentLanguage,
                newLanguage: currentLanguage,
                message: `Command switch error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                audioFeedback: this.getErrorMessage('command_switch_error', currentLanguage)
            };
        }
    }

    /**
     * Parse language switch command from user input
     */
    private parseLanguageSwitchCommand(command: string, currentLanguage: string): string | null {
        const lowerCommand = command.toLowerCase().trim();

        // English language switch commands
        const englishCommands: Record<string, string> = {
            'switch to hindi': 'hi-IN',
            'change to hindi': 'hi-IN',
            'use hindi': 'hi-IN',
            'hindi me bolo': 'hi-IN',
            'switch to bengali': 'bn-IN',
            'change to bengali': 'bn-IN',
            'use bengali': 'bn-IN',
            'switch to tamil': 'ta-IN',
            'change to tamil': 'ta-IN',
            'use tamil': 'ta-IN',
            'switch to telugu': 'te-IN',
            'change to telugu': 'te-IN',
            'use telugu': 'te-IN',
            'switch to english': 'en-US',
            'change to english': 'en-US',
            'use english': 'en-US',
            'english me bolo': 'en-US'
        };

        // Hindi language switch commands
        const hindiCommands: Record<string, string> = {
            'अंग्रेजी में बोलो': 'en-US',
            'अंग्रेजी में बदलो': 'en-US',
            'english me bolo': 'en-US',
            'हिंदी में बोलो': 'hi-IN',
            'हिंदी में बदलो': 'hi-IN',
            'बंगाली में बोलो': 'bn-IN',
            'तमिल में बोलो': 'ta-IN',
            'तेलुगु में बोलो': 'te-IN'
        };

        // Tamil language switch commands
        const tamilCommands: Record<string, string> = {
            'ஆங்கிலத்தில் பேசுங்கள்': 'en-US',
            'ஆங்கிலத்திற்கு மாறுங்கள்': 'en-US',
            'தமிழில் பேசுங்கள்': 'ta-IN',
            'தமிழுக்கு மாறுங்கள்': 'ta-IN',
            'हिंदी में बोलो': 'hi-IN',
            'english me bolo': 'en-US'
        };

        // Bengali language switch commands
        const bengaliCommands: Record<string, string> = {
            'ইংরেজিতে বলুন': 'en-US',
            'ইংরেজিতে পরিবর্তন করুন': 'en-US',
            'বাংলায় বলুন': 'bn-IN',
            'বাংলায় পরিবর্তন করুন': 'bn-IN',
            'english me bolo': 'en-US',
            'हिंदी में बोलो': 'hi-IN'
        };

        // Telugu language switch commands
        const teluguCommands: Record<string, string> = {
            'ఆంగ్లంలో మాట్లాడండి': 'en-US',
            'ఆంగ్లానికి మార్చండి': 'en-US',
            'తెలుగులో మాట్లాడండి': 'te-IN',
            'తెలుగుకు మార్చండి': 'te-IN',
            'english me bolo': 'en-US',
            'हिंदी में बोलो': 'hi-IN'
        };

        // Combine all commands
        const allCommands = {
            ...englishCommands,
            ...hindiCommands,
            ...tamilCommands,
            ...bengaliCommands,
            ...teluguCommands
        };

        // Check for exact matches first
        if (allCommands[lowerCommand]) {
            return allCommands[lowerCommand];
        }

        // Check for partial matches
        for (const [commandPattern, targetLang] of Object.entries(allCommands)) {
            if (lowerCommand.includes(commandPattern) || commandPattern.includes(lowerCommand)) {
                return targetLang;
            }
        }

        return null;
    }

    /**
     * Map translation language code to voice language code
     */
    private mapTranslationToVoiceLanguage(translationLang: string): string {
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

        return mapping[translationLang] || translationLang;
    }

    /**
     * Sync with translation context
     */
    private async syncWithTranslationContext(voiceLanguage: string): Promise<void> {
        try {
            // Map voice language back to translation language
            const translationLang = voiceLanguage.split('-')[0];

            // Update translation context if available
            if (typeof window !== 'undefined') {
                localStorage.setItem('preferred_language', translationLang);

                // Dispatch custom event for translation context update
                window.dispatchEvent(new CustomEvent('voiceLanguageChanged', {
                    detail: { voiceLanguage, translationLanguage: translationLang }
                }));
            }
        } catch (error) {
            console.error('Failed to sync with translation context:', error);
        }
    }

    /**
     * Get confirmation message in target language
     */
    private getConfirmationMessage(type: string, targetLanguage: string, messageLanguage: string): string {
        const patterns = this.multilingualService.getNavigationPatterns(messageLanguage);
        const template = patterns.feedbackTemplates[type] || patterns.confirmationPhrases[0] || 'Language switched';

        const displayName = this.multilingualService.getLanguageDisplayName(targetLanguage);
        return template.replace('{destination}', displayName).replace('{language}', displayName);
    }

    /**
     * Get error message in current language
     */
    private getErrorMessage(type: string, currentLanguage: string): string {
        const patterns = this.multilingualService.getNavigationPatterns(currentLanguage);
        return patterns.feedbackTemplates[type] || patterns.errorMessages[0] || 'Language switch failed';
    }

    /**
     * Update user language preference
     */
    private updateUserPreference(userId: string, language: string): void {
        const existing = this.userPreferences.get(userId);
        const preference: LanguagePreference = {
            userId,
            primaryLanguage: language,
            fallbackLanguages: existing?.fallbackLanguages || ['en-US'],
            autoSwitch: existing?.autoSwitch ?? true,
            confirmationRequired: existing?.confirmationRequired ?? false,
            lastUsed: new Date()
        };

        this.userPreferences.set(userId, preference);
        this.saveUserPreferences();
    }

    /**
     * Get user language preference
     */
    public getUserPreference(userId: string): LanguagePreference | null {
        return this.userPreferences.get(userId) || null;
    }

    /**
     * Set user language preference
     */
    public setUserPreference(userId: string, preference: Partial<LanguagePreference>): void {
        const existing = this.userPreferences.get(userId);
        const updated: LanguagePreference = {
            userId,
            primaryLanguage: preference.primaryLanguage || existing?.primaryLanguage || 'en-US',
            fallbackLanguages: preference.fallbackLanguages || existing?.fallbackLanguages || ['en-US'],
            autoSwitch: preference.autoSwitch ?? existing?.autoSwitch ?? true,
            confirmationRequired: preference.confirmationRequired ?? existing?.confirmationRequired ?? false,
            lastUsed: new Date()
        };

        this.userPreferences.set(userId, updated);
        this.saveUserPreferences();
    }

    /**
     * Get switch history
     */
    public getSwitchHistory(sessionId?: string): LanguageSwitchEvent[] {
        if (sessionId) {
            return this.switchHistory.filter(event => event.sessionId === sessionId);
        }
        return [...this.switchHistory];
    }

    /**
     * Clear switch history
     */
    public clearSwitchHistory(): void {
        this.switchHistory = [];
    }

    /**
     * Get available languages for switching
     */
    public getAvailableLanguages(): Array<{ code: string; name: string; supported: boolean }> {
        const supportedLanguages = this.multilingualService.getSupportedLanguages();

        return supportedLanguages.map(lang => ({
            code: lang,
            name: this.multilingualService.getLanguageDisplayName(lang),
            supported: this.multilingualService.isLanguageSupported(lang)
        }));
    }

    /**
     * Load user preferences from storage
     */
    private loadUserPreferences(): void {
        try {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('voice_language_switcher_preferences');
                if (stored) {
                    const preferences = JSON.parse(stored);
                    this.userPreferences = new Map(Object.entries(preferences));
                }
            }
        } catch (error) {
            console.error('Failed to load language switcher preferences:', error);
        }
    }

    /**
     * Save user preferences to storage
     */
    private saveUserPreferences(): void {
        try {
            if (typeof window !== 'undefined') {
                const preferences = Object.fromEntries(this.userPreferences);
                localStorage.setItem('voice_language_switcher_preferences', JSON.stringify(preferences));
            }
        } catch (error) {
            console.error('Failed to save language switcher preferences:', error);
        }
    }

    /**
     * Reset all preferences and history
     */
    public reset(): void {
        this.switchHistory = [];
        this.userPreferences.clear();
        this.currentSessionId = undefined;
        this.saveUserPreferences();
    }
}