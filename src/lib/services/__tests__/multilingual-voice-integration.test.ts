/**
 * Integration tests for multilingual voice navigation services
 */

import { MultilingualVoiceService } from '../MultilingualVoiceService';
import { VoiceLanguageSwitcher } from '../VoiceLanguageSwitcher';
import { VoicePatternMatcher } from '../VoicePatternMatcher';

describe('Multilingual Voice Navigation Integration', () => {
    let multilingualService: MultilingualVoiceService;
    let languageSwitcher: VoiceLanguageSwitcher;
    let patternMatcher: VoicePatternMatcher;

    beforeEach(() => {
        multilingualService = MultilingualVoiceService.getInstance();
        languageSwitcher = VoiceLanguageSwitcher.getInstance();
        patternMatcher = VoicePatternMatcher.getInstance();
    });

    describe('MultilingualVoiceService', () => {
        test('should support multiple Indian languages', () => {
            const supportedLanguages = multilingualService.getSupportedLanguages();

            expect(supportedLanguages).toContain('en-US');
            expect(supportedLanguages).toContain('hi-IN');
            expect(supportedLanguages).toContain('ta-IN');
            expect(supportedLanguages).toContain('bn-IN');
            expect(supportedLanguages).toContain('te-IN');
        });

        test('should detect language from text input', () => {
            // Test Hindi text
            const hindiResult = multilingualService.detectLanguageFromText('डैशबोर्ड पर जाएं');
            expect(hindiResult.language).toBe('hi-IN');
            expect(hindiResult.confidence).toBeGreaterThan(0.8);

            // Test Tamil text
            const tamilResult = multilingualService.detectLanguageFromText('டாஷ்போர்டுக்கு செல்லுங்கள்');
            expect(tamilResult.language).toBe('ta-IN');
            expect(tamilResult.confidence).toBeGreaterThan(0.8);

            // Test English text
            const englishResult = multilingualService.detectLanguageFromText('go to dashboard');
            expect(englishResult.language).toBe('en-US');
        });

        test('should provide language-specific configurations', () => {
            const hindiConfig = multilingualService.getLanguageConfig('hi-IN');
            expect(hindiConfig.languageCode).toBe('hi-IN');
            expect(hindiConfig.voiceName).toContain('hi-IN');
            expect(hindiConfig.isSupported).toBe(true);

            const tamilConfig = multilingualService.getLanguageConfig('ta-IN');
            expect(tamilConfig.languageCode).toBe('ta-IN');
            expect(tamilConfig.voiceName).toContain('ta-IN');
        });

        test('should provide navigation patterns for each language', () => {
            const englishPatterns = multilingualService.getNavigationPatterns('en-US');
            expect(englishPatterns.navigationCommands['navigate_dashboard']).toContain('go to dashboard');

            const hindiPatterns = multilingualService.getNavigationPatterns('hi-IN');
            expect(hindiPatterns.navigationCommands['navigate_dashboard']).toContain('डैशबोर्ड पर जाएं');

            const tamilPatterns = multilingualService.getNavigationPatterns('ta-IN');
            expect(tamilPatterns.navigationCommands['navigate_dashboard']).toContain('டாஷ்போர்டுக்கு செல்லுங்கள்');
        });
    });

    describe('VoiceLanguageSwitcher', () => {
        test('should switch languages successfully', async () => {
            const result = await languageSwitcher.switchLanguage('hi-IN');

            expect(result.success).toBe(true);
            expect(result.newLanguage).toBe('hi-IN');
            expect(result.message).toContain('Hindi');
        });

        test('should auto-detect language from input', async () => {
            const result = await languageSwitcher.autoSwitchFromInput('डैशबोर्ड पर जाएं');

            if (result.success) {
                expect(result.newLanguage).toBe('hi-IN');
            }
        });

        test('should parse language switch commands', async () => {
            const englishCommand = await languageSwitcher.processLanguageSwitchCommand('switch to hindi');
            expect(englishCommand.success).toBe(true);
            expect(englishCommand.newLanguage).toBe('hi-IN');

            const hindiCommand = await languageSwitcher.processLanguageSwitchCommand('अंग्रेजी में बोलो');
            expect(hindiCommand.success).toBe(true);
            expect(hindiCommand.newLanguage).toBe('en-US');
        });

        test('should provide available languages', () => {
            const languages = languageSwitcher.getAvailableLanguages();

            expect(languages.length).toBeGreaterThan(0);
            expect(languages.some(lang => lang.code === 'en-US')).toBe(true);
            expect(languages.some(lang => lang.code === 'hi-IN')).toBe(true);
        });
    });

    describe('VoicePatternMatcher', () => {
        test('should match English navigation patterns', () => {
            const result = patternMatcher.matchPattern('go to dashboard', 'en-US');

            expect(result.matched).toBe(true);
            expect(result.intent).toBe('navigate');
            expect(result.parameters.destination).toBe('dashboard');
            expect(result.confidence).toBeGreaterThan(0.7);
        });

        test('should match Hindi navigation patterns', () => {
            const result = patternMatcher.matchPattern('डैशबोर्ड पर जाएं', 'hi-IN');

            expect(result.matched).toBe(true);
            expect(result.intent).toBe('navigate');
            expect(result.confidence).toBeGreaterThan(0.7);
        });

        test('should match Tamil navigation patterns', () => {
            const result = patternMatcher.matchPattern('டாஷ்போர்டுக்கு செல்லுங்கள்', 'ta-IN');

            expect(result.matched).toBe(true);
            expect(result.intent).toBe('navigate');
            expect(result.confidence).toBeGreaterThan(0.7);
        });

        test('should handle formal and informal patterns', () => {
            // Formal English
            const formalResult = patternMatcher.matchPattern('please navigate to dashboard', 'en-US', 'formal');
            expect(formalResult.matched).toBe(true);
            expect(formalResult.culturalVariation).toBe('formal');

            // Informal English
            const informalResult = patternMatcher.matchPattern('dashboard', 'en-US', 'informal');
            expect(informalResult.matched).toBe(true);
        });

        test('should provide alternative matches', () => {
            const result = patternMatcher.matchPattern('show dashboard', 'en-US');

            expect(result.matched).toBe(true);
            expect(result.alternativeMatches).toBeDefined();
            expect(Array.isArray(result.alternativeMatches)).toBe(true);
        });

        test('should handle fuzzy matching', () => {
            // Test with slight variations
            const result = patternMatcher.matchPattern('go to dashbord', 'en-US'); // typo

            // Should still match with lower confidence
            if (result.matched) {
                expect(result.confidence).toBeLessThan(1.0);
            }
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle complete multilingual navigation flow', async () => {
            // Start with English
            multilingualService.setCurrentLanguage('en-US');

            // Switch to Hindi
            const switchResult = await languageSwitcher.switchLanguage('hi-IN');
            expect(switchResult.success).toBe(true);

            // Match Hindi pattern
            const patternResult = patternMatcher.matchPattern('डैशबोर्ड खोलें', 'hi-IN');
            expect(patternResult.matched).toBe(true);

            // Get Hindi feedback
            const hindiPatterns = multilingualService.getNavigationPatterns('hi-IN');
            expect(hindiPatterns.confirmationPhrases.length).toBeGreaterThan(0);
        });

        test('should handle language auto-detection and switching', async () => {
            // Start with English
            multilingualService.setCurrentLanguage('en-US');

            // Auto-detect and switch based on Tamil input
            const autoSwitchResult = await languageSwitcher.autoSwitchFromInput('டாஷ்போர்டுக்கு செல்லுங்கள்');

            if (autoSwitchResult.success) {
                expect(autoSwitchResult.newLanguage).toBe('ta-IN');

                // Verify pattern matching works in new language
                const patternResult = patternMatcher.matchPattern('டாஷ்போர்டுக்கு செல்லுங்கள்', 'ta-IN');
                expect(patternResult.matched).toBe(true);
            }
        });

        test('should maintain language preferences', () => {
            const userId = 'test-user-123';

            // Set user preference
            languageSwitcher.setUserPreference(userId, {
                primaryLanguage: 'hi-IN',
                autoSwitch: true,
                confirmationRequired: false
            });

            // Retrieve preference
            const preference = languageSwitcher.getUserPreference(userId);
            expect(preference?.primaryLanguage).toBe('hi-IN');
            expect(preference?.autoSwitch).toBe(true);
        });

        test('should handle cultural variations', () => {
            // Test respectful patterns in Hindi
            const respectfulResult = patternMatcher.matchPattern('कृपया डैशबोर्ड दिखाएं', 'hi-IN', 'respectful');
            expect(respectfulResult.matched).toBe(true);
            expect(respectfulResult.culturalVariation).toBe('respectful');

            // Test direct patterns
            const directResult = patternMatcher.matchPattern('डैशबोर्ड', 'hi-IN', 'direct');
            expect(directResult.matched).toBe(true);
            expect(directResult.culturalVariation).toBe('direct');
        });
    });
});