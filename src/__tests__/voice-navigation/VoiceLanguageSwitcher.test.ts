/**
 * VoiceLanguageSwitcher Unit Tests
 * Tests language switching functionality for voice navigation
 */

import { VoiceLanguageSwitcher } from '@/lib/services/VoiceLanguageSwitcher';
import { MultilingualVoiceService } from '@/lib/services/MultilingualVoiceService';

// Mock dependencies
jest.mock('@/lib/services/MultilingualVoiceService');

describe('VoiceLanguageSwitcher', () => {
    let switcher: VoiceLanguageSwitcher;
    let mockMultilingualService: jest.Mocked<MultilingualVoiceService>;

    beforeEach(() => {
        // Reset singleton instance
        (VoiceLanguageSwitcher as any).instance = undefined;

        // Setup complete mock with all required methods
        mockMultilingualService = {
            getCurrentLanguage: jest.fn().mockReturnValue('en-US'),
            setCurrentLanguage: jest.fn().mockReturnValue(true),
            isLanguageSupported: jest.fn().mockImplementation((lang) => {
                const supported = ['en-US', 'hi-IN', 'ta-IN', 'bn-IN', 'te-IN'];
                return supported.includes(lang);
            }),
            getSupportedLanguages: jest.fn().mockReturnValue(['en-US', 'hi-IN', 'ta-IN', 'bn-IN', 'te-IN']),
            getLanguageDisplayName: jest.fn().mockImplementation((lang) => {
                const names: Record<string, string> = {
                    'en-US': 'English',
                    'hi-IN': 'हिन्दी',
                    'ta-IN': 'தமிழ்',
                    'bn-IN': 'বাংলা',
                    'te-IN': 'తెలుగు'
                };
                return names[lang] || 'English';
            }),
            detectLanguageFromText: jest.fn().mockReturnValue({
                language: 'hi-IN',
                confidence: 0.9,
                alternatives: []
            }),
            setUserLanguagePreference: jest.fn(),
            getUserLanguagePreference: jest.fn().mockReturnValue(undefined),
            getNavigationPatterns: jest.fn().mockReturnValue({
                feedbackTemplates: {
                    'success': 'Language switched successfully to {language}',
                    'error': 'Language switch failed: {error}',
                    'not_supported': 'Language {language} is not supported'
                },
                errorMessages: [
                    'Language switch failed',
                    'Unsupported language',
                    'Service unavailable'
                ],
                confirmationPhrases: [
                    'Language switched to {language}',
                    'Now using {language}'
                ]
            }),
            getLanguageConfig: jest.fn().mockImplementation((lang) => ({
                languageCode: lang || 'en-US',
                voiceName: `${lang || 'en-US'}-Standard-A`,
                gender: 'FEMALE',
                speechRate: 1.0,
                pitch: 0.0,
                isSupported: true
            }))
        } as any;

        (MultilingualVoiceService.getInstance as jest.Mock).mockReturnValue(mockMultilingualService);

        switcher = VoiceLanguageSwitcher.getInstance();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should create singleton instance', () => {
            const instance1 = VoiceLanguageSwitcher.getInstance();
            const instance2 = VoiceLanguageSwitcher.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should initialize with multilingual service', () => {
            expect(MultilingualVoiceService.getInstance).toHaveBeenCalled();
        });
    });

    describe('Language Switching', () => {
        it('should switch to supported language successfully', async () => {
            const result = await switcher.switchLanguage('hi-IN', 'user123');

            expect(result.success).toBe(true);
            expect(result.previousLanguage).toBe('en-US');
            expect(result.newLanguage).toBe('hi-IN');
            expect(result.message).toContain('हिन्दी');
            expect(mockMultilingualService.setCurrentLanguage).toHaveBeenCalledWith('hi-IN');
            expect(mockMultilingualService.setUserLanguagePreference).toHaveBeenCalledWith('user123', 'hi-IN');
        });

        it('should reject unsupported language', async () => {
            mockMultilingualService.isLanguageSupported.mockReturnValue(false);

            const result = await switcher.switchLanguage('fr-FR', 'user123');

            expect(result.success).toBe(false);
            expect(result.previousLanguage).toBe('en-US');
            expect(result.newLanguage).toBe('en-US');
            expect(result.message).toContain('not supported');
        });

        it('should handle same language switch gracefully', async () => {
            const result = await switcher.switchLanguage('en-US', 'user123');

            expect(result.success).toBe(true);
            expect(result.previousLanguage).toBe('en-US');
            expect(result.newLanguage).toBe('en-US');
            expect(result.message).toContain('already using English');
        });

        it('should work without user ID', async () => {
            const result = await switcher.switchLanguage('hi-IN');

            expect(result.success).toBe(true);
            expect(result.newLanguage).toBe('hi-IN');
            expect(mockMultilingualService.setUserLanguagePreference).not.toHaveBeenCalled();
        });
    });

    describe('Auto Language Switching', () => {
        it('should auto-switch based on detected language', async () => {
            mockMultilingualService.detectLanguageFromText.mockReturnValue({
                language: 'hi-IN',
                confidence: 0.9,
                alternatives: []
            });

            const result = await switcher.autoSwitchFromInput('डैशबोर्ड पर जाएं', 'user123');

            expect(result.success).toBe(true);
            expect(result.previousLanguage).toBe('en-US');
            expect(result.newLanguage).toBe('hi-IN');
            expect(mockMultilingualService.detectLanguageFromText).toHaveBeenCalledWith('डैशबोर्ड पर जाएं');
        });

        it('should not switch if confidence is too low', async () => {
            mockMultilingualService.detectLanguageFromText.mockReturnValue({
                language: 'hi-IN',
                confidence: 0.5,
                alternatives: []
            });

            const result = await switcher.autoSwitchFromInput('unclear text', 'user123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('No language switch needed');
        });

        it('should not switch if already using detected language', async () => {
            mockMultilingualService.getCurrentLanguage.mockReturnValue('hi-IN');
            mockMultilingualService.detectLanguageFromText.mockReturnValue({
                language: 'hi-IN',
                confidence: 0.9,
                alternatives: []
            });

            const result = await switcher.autoSwitchFromInput('डैशबोर्ड पर जाएं', 'user123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('No language switch needed');
        });

        it('should handle detection errors gracefully', async () => {
            mockMultilingualService.detectLanguageFromText.mockImplementation(() => {
                throw new Error('Detection failed');
            });

            const result = await switcher.autoSwitchFromInput('test input', 'user123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Detection failed');
        });
    });

    describe('Language Switch Commands', () => {
        it('should process English switch command', async () => {
            const result = await switcher.processLanguageSwitchCommand('switch to english', 'user123');

            expect(result.success).toBe(true);
            expect(result.newLanguage).toBe('en-US');
        });

        it('should process Hindi switch command', async () => {
            const result = await switcher.processLanguageSwitchCommand('switch to hindi', 'user123');

            expect(result.success).toBe(true);
            expect(result.newLanguage).toBe('hi-IN');
        });

        it('should process Tamil switch command', async () => {
            const result = await switcher.processLanguageSwitchCommand('switch to tamil', 'user123');

            expect(result.success).toBe(true);
            expect(result.newLanguage).toBe('ta-IN');
        });

        it('should process Bengali switch command', async () => {
            const result = await switcher.processLanguageSwitchCommand('switch to bengali', 'user123');

            expect(result.success).toBe(true);
            expect(result.newLanguage).toBe('bn-IN');
        });

        it('should process Telugu switch command', async () => {
            const result = await switcher.processLanguageSwitchCommand('switch to telugu', 'user123');

            expect(result.success).toBe(true);
            expect(result.newLanguage).toBe('te-IN');
        });

        it('should handle Hindi language switch command', async () => {
            const result = await switcher.processLanguageSwitchCommand('हिंदी में बदलें', 'user123');

            expect(result.success).toBe(true);
            expect(result.newLanguage).toBe('hi-IN');
        });

        it('should not process non-switch commands', async () => {
            const result = await switcher.processLanguageSwitchCommand('go to dashboard', 'user123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not a language switch command');
        });

        it('should handle unsupported language in switch command', async () => {
            const result = await switcher.processLanguageSwitchCommand('switch to french', 'user123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not supported');
        });
    });

    describe('Translation Context Integration', () => {
        it('should switch from translation context language', async () => {
            const result = await switcher.switchFromTranslationContext('hi', 'user123');

            expect(result.success).toBe(true);
            expect(result.newLanguage).toBe('hi-IN');
            expect(mockMultilingualService.setCurrentLanguage).toHaveBeenCalledWith('hi-IN');
        });

        it('should handle unsupported translation language', async () => {
            const result = await switcher.switchFromTranslationContext('fr', 'user123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not supported');
        });

        it('should map translation codes correctly', async () => {
            const testCases = [
                { input: 'en', expected: 'en-US' },
                { input: 'hi', expected: 'hi-IN' },
                { input: 'ta', expected: 'ta-IN' },
                { input: 'bn', expected: 'bn-IN' },
                { input: 'te', expected: 'te-IN' }
            ];

            for (const testCase of testCases) {
                const result = await switcher.switchFromTranslationContext(testCase.input, 'user123');
                expect(result.success).toBe(true);
                expect(result.newLanguage).toBe(testCase.expected);
            }
        });
    });

    describe('Available Languages', () => {
        it('should get available languages with support status', () => {
            const languages = switcher.getAvailableLanguages();

            expect(languages).toHaveLength(5);
            expect(languages[0]).toEqual({
                code: 'en-US',
                name: 'English',
                supported: true
            });
            expect(languages[1]).toEqual({
                code: 'hi-IN',
                name: 'हिन्दी',
                supported: true
            });
        });

        it('should mark unsupported languages correctly', () => {
            mockMultilingualService.getSupportedLanguages.mockReturnValue(['en-US', 'hi-IN']);
            mockMultilingualService.isLanguageSupported.mockImplementation((lang) => {
                return ['en-US', 'hi-IN'].includes(lang);
            });

            const languages = switcher.getAvailableLanguages();
            const tamilLang = languages.find(l => l.code === 'ta-IN');
            expect(tamilLang?.supported).toBe(false);
        });
    });

    describe('User Preferences', () => {
        it('should consider user preferences in switching', async () => {
            mockMultilingualService.getUserLanguagePreference.mockReturnValue('ta-IN');

            const result = await switcher.switchLanguage('ta-IN', 'user123');

            expect(result.success).toBe(true);
            expect(result.newLanguage).toBe('ta-IN');
        });

        it('should update user preferences after successful switch', async () => {
            await switcher.switchLanguage('hi-IN', 'user123');

            expect(mockMultilingualService.setUserLanguagePreference).toHaveBeenCalledWith('user123', 'hi-IN');
        });

        it('should not update preferences for failed switches', async () => {
            mockMultilingualService.isLanguageSupported.mockReturnValue(false);

            await switcher.switchLanguage('fr-FR', 'user123');

            expect(mockMultilingualService.setUserLanguagePreference).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle multilingual service errors', async () => {
            mockMultilingualService.setCurrentLanguage.mockImplementation(() => {
                throw new Error('Service error');
            });

            const result = await switcher.switchLanguage('hi-IN', 'user123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Service error');
        });

        it('should handle detection service errors', async () => {
            mockMultilingualService.detectLanguageFromText.mockImplementation(() => {
                throw new Error('Detection service unavailable');
            });

            const result = await switcher.autoSwitchFromInput('test', 'user123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Detection service unavailable');
        });

        it('should provide fallback messages for unknown errors', async () => {
            mockMultilingualService.setCurrentLanguage.mockImplementation(() => {
                throw new Error();
            });

            const result = await switcher.switchLanguage('hi-IN', 'user123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Unknown error');
        });
    });

    describe('Audio Feedback', () => {
        it('should provide audio feedback for successful switches', async () => {
            const result = await switcher.switchLanguage('hi-IN', 'user123');

            expect(result.audioFeedback).toBeDefined();
            expect(result.audioFeedback).toContain('हिन्दी');
        });

        it('should provide audio feedback in target language', async () => {
            const result = await switcher.switchLanguage('ta-IN', 'user123');

            expect(result.audioFeedback).toContain('தமிழ்');
        });

        it('should provide error audio feedback for failures', async () => {
            mockMultilingualService.isLanguageSupported.mockReturnValue(false);

            const result = await switcher.switchLanguage('fr-FR', 'user123');

            expect(result.audioFeedback).toBeDefined();
            expect(result.audioFeedback).toContain('not supported');
        });
    });
});