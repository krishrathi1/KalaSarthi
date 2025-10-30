/**
 * MultilingualVoiceService Unit Tests
 * Tests multilingual voice configuration and language detection
 */

import { MultilingualVoiceService } from '@/lib/services/MultilingualVoiceService';

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
    value: {
        language: 'en-US'
    },
    writable: true
});

describe('MultilingualVoiceService', () => {
    let service: MultilingualVoiceService;

    beforeEach(() => {
        // Reset singleton instance
        (MultilingualVoiceService as any).instance = undefined;
        jest.clearAllMocks();

        service = MultilingualVoiceService.getInstance();
    });

    describe('Initialization', () => {
        it('should create singleton instance', () => {
            const instance1 = MultilingualVoiceService.getInstance();
            const instance2 = MultilingualVoiceService.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should initialize with default language configuration', () => {
            const supportedLanguages = service.getSupportedLanguages();
            expect(supportedLanguages).toContain('en-US');
            expect(supportedLanguages).toContain('hi-IN');
            expect(supportedLanguages).toContain('ta-IN');
            expect(supportedLanguages).toContain('bn-IN');
        });

        it('should load user preferences from localStorage', () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'user123': 'hi-IN'
            }));

            const newService = MultilingualVoiceService.getInstance();
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('voice_navigation_language_preferences');
        });
    });

    describe('Language Management', () => {
        it('should get current language', () => {
            const currentLang = service.getCurrentLanguage();
            expect(currentLang).toBe('en-US');
        });

        it('should set current language successfully', () => {
            const result = service.setCurrentLanguage('hi-IN');
            expect(result).toBe(true);
            expect(service.getCurrentLanguage()).toBe('hi-IN');
        });

        it('should fallback to default for unsupported language', () => {
            const result = service.setCurrentLanguage('unsupported-lang');
            expect(result).toBe(false);
            expect(service.getCurrentLanguage()).toBe('en-US');
        });

        it('should map short language codes to full codes', () => {
            service.setCurrentLanguage('hi');
            expect(service.getCurrentLanguage()).toBe('hi-IN');
        });

        it('should check language support correctly', () => {
            expect(service.isLanguageSupported('en-US')).toBe(true);
            expect(service.isLanguageSupported('hi-IN')).toBe(true);
            expect(service.isLanguageSupported('fr-FR')).toBe(false);
        });
    });

    describe('Language Configuration', () => {
        it('should get language configuration for supported language', () => {
            const config = service.getLanguageConfig('hi-IN');
            expect(config.languageCode).toBe('hi-IN');
            expect(config.voiceName).toBe('hi-IN-Standard-A');
            expect(config.gender).toBe('FEMALE');
            expect(config.isSupported).toBe(true);
        });

        it('should fallback to default config for unsupported language', () => {
            const config = service.getLanguageConfig('unsupported-lang');
            expect(config.languageCode).toBe('en-US');
        });

        it('should update language configuration', () => {
            service.updateLanguageConfig('hi-IN', {
                speechRate: 1.2,
                pitch: 0.5
            });

            const config = service.getLanguageConfig('hi-IN');
            expect(config.speechRate).toBe(1.2);
            expect(config.pitch).toBe(0.5);
        });
    });

    describe('Navigation Patterns', () => {
        it('should get navigation patterns for current language', () => {
            service.setCurrentLanguage('en-US');
            const patterns = service.getNavigationPatterns();

            expect(patterns.navigationCommands['navigate_dashboard']).toContain('go to dashboard');
            expect(patterns.confirmationPhrases).toContain('Navigating to {destination}');
            expect(patterns.errorMessages).toContain('Sorry, I didn\'t understand that command');
        });

        it('should get navigation patterns for Hindi', () => {
            const patterns = service.getNavigationPatterns('hi-IN');

            expect(patterns.navigationCommands['navigate_dashboard']).toContain('डैशबोर्ड पर जाएं');
            expect(patterns.confirmationPhrases).toContain('{destination} पर जा रहे हैं');
        });

        it('should get navigation commands for specific intent', () => {
            const commands = service.getNavigationCommands('navigate_dashboard', 'en-US');
            expect(commands).toContain('go to dashboard');
            expect(commands).toContain('open dashboard');
        });

        it('should get confirmation phrases', () => {
            const phrases = service.getConfirmationPhrases('en-US');
            expect(phrases).toContain('Navigating to {destination}');
            expect(phrases).toContain('Opening {destination}');
        });

        it('should get error messages', () => {
            const messages = service.getErrorMessages('en-US');
            expect(messages).toContain('Sorry, I didn\'t understand that command');
        });

        it('should get feedback templates', () => {
            const template = service.getFeedbackTemplate('success', 'en-US');
            expect(template).toBe('Successfully navigated to {destination}');
        });

        it('should get cultural variations', () => {
            const variations = service.getCulturalVariations('polite_forms', 'en-US');
            expect(variations).toContain('please go to');
            expect(variations).toContain('could you open');
        });
    });

    describe('Language Detection', () => {
        it('should detect Hindi from Devanagari script', () => {
            const result = service.detectLanguageFromText('डैशबोर्ड पर जाएं');
            expect(result.language).toBe('hi-IN');
            expect(result.confidence).toBe(0.9);
        });

        it('should detect Tamil from Tamil script', () => {
            const result = service.detectLanguageFromText('டாஷ்போர்டுக்கு செல்லுங்கள்');
            expect(result.language).toBe('ta-IN');
            expect(result.confidence).toBe(0.9);
        });

        it('should detect Bengali from Bengali script', () => {
            const result = service.detectLanguageFromText('ড্যাশবোর্ডে যান');
            expect(result.language).toBe('bn-IN');
            expect(result.confidence).toBe(0.9);
        });

        it('should detect Telugu from Telugu script', () => {
            const result = service.detectLanguageFromText('డాష్‌బోర్డ్‌కు వెళ్లండి');
            expect(result.language).toBe('te-IN');
            expect(result.confidence).toBe(0.9);
        });

        it('should default to English for Latin script', () => {
            const result = service.detectLanguageFromText('go to dashboard');
            expect(result.language).toBe('en-US');
            expect(result.confidence).toBe(0.8);
        });

        it('should provide alternatives in detection result', () => {
            const result = service.detectLanguageFromText('डैशबोर्ड पर जाएं');
            expect(result.alternatives).toBeDefined();
            expect(result.alternatives.length).toBeGreaterThan(0);
            expect(result.alternatives[0].language).toBe('mr-IN');
        });
    });

    describe('Auto Language Detection', () => {
        it('should auto-detect from translation context', () => {
            mockLocalStorage.getItem.mockReturnValue('hi');

            const detected = service.autoDetectLanguage();
            expect(detected).toBe('hi-IN');
        });

        it('should auto-detect from browser language', () => {
            mockLocalStorage.getItem.mockReturnValue(null);
            Object.defineProperty(window, 'navigator', {
                value: { language: 'ta-IN' },
                writable: true
            });

            const detected = service.autoDetectLanguage();
            expect(detected).toBe('ta-IN');
        });

        it('should fallback to default when auto-detection disabled', () => {
            // Disable auto-detection
            (service as any).config.autoDetectLanguage = false;

            const detected = service.autoDetectLanguage();
            expect(detected).toBe(service.getCurrentLanguage());
        });
    });

    describe('User Preferences', () => {
        it('should set user language preference', () => {
            service.setUserLanguagePreference('user123', 'hi-IN');

            const preference = service.getUserLanguagePreference('user123');
            expect(preference).toBe('hi-IN');
            expect(mockLocalStorage.setItem).toHaveBeenCalled();
        });

        it('should get user language preference', () => {
            service.setUserLanguagePreference('user123', 'ta-IN');

            const preference = service.getUserLanguagePreference('user123');
            expect(preference).toBe('ta-IN');
        });

        it('should return undefined for non-existent user preference', () => {
            const preference = service.getUserLanguagePreference('nonexistent');
            expect(preference).toBeUndefined();
        });

        it('should reject unsupported language in preferences', () => {
            service.setUserLanguagePreference('user123', 'unsupported-lang');

            const preference = service.getUserLanguagePreference('user123');
            expect(preference).toBeUndefined();
        });
    });

    describe('Navigation Pattern Management', () => {
        it('should add new navigation patterns', () => {
            service.addNavigationPatterns('en-US', {
                navigationCommands: {
                    'navigate_custom': ['go to custom page', 'open custom']
                },
                confirmationPhrases: ['Custom navigation confirmed']
            });

            const commands = service.getNavigationCommands('navigate_custom', 'en-US');
            expect(commands).toContain('go to custom page');

            const phrases = service.getConfirmationPhrases('en-US');
            expect(phrases).toContain('Custom navigation confirmed');
        });

        it('should merge with existing patterns', () => {
            const originalCommands = service.getNavigationCommands('navigate_dashboard', 'en-US');

            service.addNavigationPatterns('en-US', {
                navigationCommands: {
                    'navigate_dashboard': ['main screen', 'home screen']
                }
            });

            const updatedCommands = service.getNavigationCommands('navigate_dashboard', 'en-US');
            expect(updatedCommands).toContain('go to dashboard'); // Original
            expect(updatedCommands).toContain('main screen'); // New
        });
    });

    describe('Language Display Names', () => {
        it('should get correct display names for supported languages', () => {
            expect(service.getLanguageDisplayName('en-US')).toBe('English');
            expect(service.getLanguageDisplayName('hi-IN')).toBe('हिन्दी');
            expect(service.getLanguageDisplayName('ta-IN')).toBe('தமிழ்');
            expect(service.getLanguageDisplayName('bn-IN')).toBe('বাংলা');
        });

        it('should return language code for unknown languages', () => {
            expect(service.getLanguageDisplayName('unknown-lang')).toBe('unknown-lang');
        });
    });

    describe('Configuration Management', () => {
        it('should get all language configurations', () => {
            const configs = service.getAllLanguageConfigs();
            expect(configs['en-US']).toBeDefined();
            expect(configs['hi-IN']).toBeDefined();
            expect(configs['ta-IN']).toBeDefined();
        });

        it('should get all navigation patterns', () => {
            const patterns = service.getAllNavigationPatterns();
            expect(patterns['en-US']).toBeDefined();
            expect(patterns['hi-IN']).toBeDefined();
            expect(patterns['ta-IN']).toBeDefined();
        });

        it('should reset to defaults', () => {
            service.setCurrentLanguage('hi-IN');
            service.setUserLanguagePreference('user123', 'ta-IN');

            service.resetToDefaults();

            expect(service.getCurrentLanguage()).toBe('en-US');
            expect(service.getUserLanguagePreference('user123')).toBeUndefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle localStorage errors gracefully', () => {
            mockLocalStorage.getItem.mockImplementation(() => {
                throw new Error('Storage error');
            });

            // Should not throw
            expect(() => {
                (MultilingualVoiceService as any).instance = undefined;
                MultilingualVoiceService.getInstance();
            }).not.toThrow();
        });

        it('should handle invalid JSON in localStorage', () => {
            mockLocalStorage.getItem.mockReturnValue('invalid json');

            expect(() => {
                (MultilingualVoiceService as any).instance = undefined;
                MultilingualVoiceService.getInstance();
            }).not.toThrow();
        });
    });
});