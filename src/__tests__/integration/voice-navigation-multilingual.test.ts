/**
 * Voice Navigation Multilingual Integration Tests
 * Tests multilingual scenarios and language switching workflows
 */

import { VoiceNavigationService } from '@/lib/services/VoiceNavigationService';
import { MultilingualVoiceService } from '@/lib/services/MultilingualVoiceService';
import { VoiceLanguageSwitcher } from '@/lib/services/VoiceLanguageSwitcher';

// Mock dependencies
jest.mock('@/lib/service/EnhancedSpeechToTextService');
jest.mock('@/lib/service/EnhancedTextToSpeechService');
jest.mock('@/lib/services/VoiceNavigationErrorHandler', () => ({
    VoiceNavigationErrorHandler: {
        getInstance: jest.fn(() => ({
            handleError: jest.fn().mockResolvedValue({
                success: true,
                action: 'retry',
                message: 'Error handled'
            })
        }))
    }
}));
jest.mock('@/lib/services/VoiceNavigationLogger', () => ({
    VoiceNavigationLogger: {
        getInstance: jest.fn(() => ({
            configure: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            critical: jest.fn(),
            startTiming: jest.fn(() => jest.fn())
        }))
    },
    LogLevel: {
        DEBUG: 'DEBUG',
        INFO: 'INFO',
        ERROR: 'ERROR'
    },
    LogCategory: {
        SYSTEM: 'SYSTEM',
        VOICE_INPUT: 'VOICE_INPUT',
        ERROR_HANDLING: 'ERROR_HANDLING'
    }
}));
jest.mock('@/lib/services/VoiceNavigationFallback', () => ({
    VoiceNavigationFallback: {
        getInstance: jest.fn(() => ({
            activateFallback: jest.fn(),
            processOfflineCommand: jest.fn(),
            getCurrentMode: jest.fn().mockReturnValue('full'),
            resetToFullMode: jest.fn()
        }))
    }
}));
jest.mock('@/lib/services/VoiceNavigationProgressiveEnhancement', () => ({
    VoiceNavigationProgressiveEnhancement: {
        getInstance: jest.fn(() => ({
            getAvailableFeatures: jest.fn().mockReturnValue(['voice_recognition', 'tts']),
            isFeatureAvailable: jest.fn().mockReturnValue({ available: true }),
            upgradeFeatures: jest.fn().mockResolvedValue({ upgraded: false, newFeatures: [] })
        }))
    }
}));
jest.mock('@/lib/services/VoiceNavigationGuidance', () => ({
    VoiceNavigationGuidance: {
        getInstance: jest.fn(() => ({
            setCurrentUser: jest.fn(),
            getHelp: jest.fn().mockReturnValue({ commands: [], topics: [], suggestions: [] }),
            getContextualHints: jest.fn().mockReturnValue([]),
            getCommandSuggestions: jest.fn().mockReturnValue([]),
            startTutorial: jest.fn().mockReturnValue({ success: true, message: 'Tutorial started' }),
            processTutorialStep: jest.fn().mockReturnValue({ success: true, completed: false, feedback: 'Good' }),
            getAvailableTutorials: jest.fn().mockReturnValue([])
        }))
    }
}));
jest.mock('@/lib/services/VoicePatternMatcher', () => ({
    VoicePatternMatcher: {
        getInstance: jest.fn(() => ({
            matchPattern: jest.fn(),
            addCustomPattern: jest.fn()
        }))
    }
}));

describe('Voice Navigation Multilingual Integration', () => {
    let voiceService: VoiceNavigationService;
    let multilingualService: MultilingualVoiceService;
    let languageSwitcher: VoiceLanguageSwitcher;

    beforeEach(async () => {
        // Reset singleton instances
        (VoiceNavigationService as any).instance = undefined;
        (MultilingualVoiceService as any).instance = undefined;
        (VoiceLanguageSwitcher as any).instance = undefined;

        // Initialize services
        voiceService = VoiceNavigationService.getInstance();
        multilingualService = MultilingualVoiceService.getInstance();
        languageSwitcher = VoiceLanguageSwitcher.getInstance();

        // Setup comprehensive pattern matcher for multilingual testing
        const mockPatternMatcher = {
            matchPattern: jest.fn().mockImplementation((input: string, language: string) => {
                const patterns: Record<string, any> = {
                    // English patterns
                    'go to dashboard': { matched: true, intent: 'navigate_dashboard', confidence: 0.9, parameters: {}, language: 'en-US' },
                    'open profile': { matched: true, intent: 'navigate_profile', confidence: 0.85, parameters: {}, language: 'en-US' },
                    'show marketplace': { matched: true, intent: 'navigate_marketplace', confidence: 0.9, parameters: {}, language: 'en-US' },

                    // Hindi patterns
                    'डैशबोर्ड पर जाएं': { matched: true, intent: 'navigate_dashboard', confidence: 0.9, parameters: {}, language: 'hi-IN' },
                    'प्रोफाइल खोलें': { matched: true, intent: 'navigate_profile', confidence: 0.85, parameters: {}, language: 'hi-IN' },
                    'बाजार दिखाएं': { matched: true, intent: 'navigate_marketplace', confidence: 0.9, parameters: {}, language: 'hi-IN' },

                    // Tamil patterns
                    'டாஷ்போர்டுக்கு செல்லுங்கள்': { matched: true, intent: 'navigate_dashboard', confidence: 0.9, parameters: {}, language: 'ta-IN' },
                    'சுயவிவரத்தைத் திறக்கவும்': { matched: true, intent: 'navigate_profile', confidence: 0.85, parameters: {}, language: 'ta-IN' },

                    // Bengali patterns
                    'ড্যাশবোর্ডে যান': { matched: true, intent: 'navigate_dashboard', confidence: 0.9, parameters: {}, language: 'bn-IN' },
                    'প্রোফাইল খুলুন': { matched: true, intent: 'navigate_profile', confidence: 0.85, parameters: {}, language: 'bn-IN' },

                    // Telugu patterns
                    'డాష్‌బోర్డ్‌కు వెళ్లండి': { matched: true, intent: 'navigate_dashboard', confidence: 0.9, parameters: {}, language: 'te-IN' },
                    'ప్రొఫైల్ తెరవండి': { matched: true, intent: 'navigate_profile', confidence: 0.85, parameters: {}, language: 'te-IN' }
                };

                return patterns[input.toLowerCase()] || { matched: false, confidence: 0.1 };
            }),
            addCustomPattern: jest.fn()
        };

        (voiceService as any).patternMatcher = mockPatternMatcher;

        await voiceService.initialize();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Cross-Language Navigation', () => {
        it('should handle navigation commands in multiple Indian languages', async () => {
            const testCases = [
                { language: 'en-US', command: 'go to dashboard', expectedIntent: 'navigate_dashboard' },
                { language: 'hi-IN', command: 'डैशबोर्ड पर जाएं', expectedIntent: 'navigate_dashboard' },
                { language: 'ta-IN', command: 'டாஷ்போர்டுக்கு செல்லுங்கள்', expectedIntent: 'navigate_dashboard' },
                { language: 'bn-IN', command: 'ড্যাশবোর্ডে যান', expectedIntent: 'navigate_dashboard' },
                { language: 'te-IN', command: 'డాష్‌బోర్డ్‌కు వెళ్లండి', expectedIntent: 'navigate_dashboard' }
            ];

            for (const testCase of testCases) {
                await voiceService.startSession('user123', testCase.language);

                const result = await voiceService.processMultilingualVoiceInput(
                    testCase.command,
                    'user123',
                    false
                );

                expect(result.success).toBe(true);
                expect(result.intent?.intent).toBe(testCase.expectedIntent);
                expect(result.intent?.language).toBe(testCase.language);

                await voiceService.endSession();
            }
        });

        it('should maintain context when switching between languages', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Start with English command
            let result = await voiceService.processMultilingualVoiceInput(
                'go to dashboard',
                'user123',
                false
            );
            expect(result.success).toBe(true);

            // Switch to Hindi
            await voiceService.switchVoiceLanguage('hi-IN', 'user123');

            // Continue with Hindi command
            result = await voiceService.processMultilingualVoiceInput(
                'प्रोफाइल खोलें',
                'user123',
                false
            );
            expect(result.success).toBe(true);
            expect(result.intent?.language).toBe('hi-IN');

            // Verify session contains both commands
            const session = await voiceService.endSession();
            expect(session?.commands).toHaveLength(2);
            expect(session?.language).toBe('hi-IN'); // Should reflect last language
        });

        it('should handle mixed-language input gracefully', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Mock auto-detection for mixed input
            const mockLanguageSwitcher = {
                autoSwitchFromInput: jest.fn().mockResolvedValue({
                    success: true,
                    previousLanguage: 'en-US',
                    newLanguage: 'hi-IN'
                }),
                processLanguageSwitchCommand: jest.fn().mockResolvedValue({ success: false })
            };
            (voiceService as any).languageSwitcher = mockLanguageSwitcher;

            // Process Hindi input while in English session
            const result = await voiceService.processMultilingualVoiceInput(
                'डैशबोर्ड पर जाएं',
                'user123',
                true // Enable auto-detection
            );

            expect(mockLanguageSwitcher.autoSwitchFromInput).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });
    });

    describe('Language Auto-Detection Scenarios', () => {
        it('should auto-detect language from script patterns', async () => {
            await voiceService.startSession('user123', 'en-US');

            const testCases = [
                { input: 'डैशबोर्ड पर जाएं', expectedLanguage: 'hi-IN', script: 'Devanagari' },
                { input: 'டாஷ்போர்டுக்கு செல்லுங்கள்', expectedLanguage: 'ta-IN', script: 'Tamil' },
                { input: 'ড্যাশবোর্ডে যান', expectedLanguage: 'bn-IN', script: 'Bengali' },
                { input: 'డాష్‌బోర్డ్‌కు వెళ్లండి', expectedLanguage: 'te-IN', script: 'Telugu' }
            ];

            for (const testCase of testCases) {
                const detection = multilingualService.detectLanguageFromText(testCase.input);
                expect(detection.language).toBe(testCase.expectedLanguage);
                expect(detection.confidence).toBeGreaterThan(0.8);
            }
        });

        it('should handle ambiguous script detection', async () => {
            // Test Devanagari script which could be Hindi or Marathi
            const hindiText = 'डैशबोर्ड पर जाएं';
            const detection = multilingualService.detectLanguageFromText(hindiText);

            expect(detection.language).toBe('hi-IN'); // Should default to Hindi
            expect(detection.alternatives).toBeDefined();
            expect(detection.alternatives.some(alt => alt.language === 'mr-IN')).toBe(true);
        });

        it('should fallback to English for Latin script', async () => {
            const englishText = 'go to dashboard';
            const detection = multilingualService.detectLanguageFromText(englishText);

            expect(detection.language).toBe('en-US');
            expect(detection.confidence).toBe(0.8);
        });
    });

    describe('Language Switching Workflows', () => {
        it('should handle explicit language switch commands', async () => {
            await voiceService.startSession('user123', 'en-US');

            const switchCommands = [
                { command: 'switch to hindi', targetLang: 'hi-IN' },
                { command: 'switch to tamil', targetLang: 'ta-IN' },
                { command: 'switch to bengali', targetLang: 'bn-IN' },
                { command: 'switch to telugu', targetLang: 'te-IN' }
            ];

            for (const switchCmd of switchCommands) {
                // Mock language switcher for each command
                const mockLanguageSwitcher = {
                    autoSwitchFromInput: jest.fn().mockResolvedValue({ success: false }),
                    processLanguageSwitchCommand: jest.fn().mockResolvedValue({
                        success: true,
                        message: `Language switched to ${switchCmd.targetLang}`,
                        newLanguage: switchCmd.targetLang
                    })
                };
                (voiceService as any).languageSwitcher = mockLanguageSwitcher;

                const result = await voiceService.processMultilingualVoiceInput(
                    switchCmd.command,
                    'user123',
                    true
                );

                expect(result.success).toBe(true);
                expect(result.feedback).toContain('Language switched');
            }
        });

        it('should handle native language switch commands', async () => {
            await voiceService.startSession('user123', 'hi-IN');

            // Mock Hindi language switch command
            const mockLanguageSwitcher = {
                autoSwitchFromInput: jest.fn().mockResolvedValue({ success: false }),
                processLanguageSwitchCommand: jest.fn().mockResolvedValue({
                    success: true,
                    message: 'भाषा अंग्रेजी में बदल दी गई',
                    newLanguage: 'en-US'
                })
            };
            (voiceService as any).languageSwitcher = mockLanguageSwitcher;

            const result = await voiceService.processMultilingualVoiceInput(
                'अंग्रेजी में बदलें',
                'user123',
                true
            );

            expect(result.success).toBe(true);
            expect(mockLanguageSwitcher.processLanguageSwitchCommand).toHaveBeenCalled();
        });

        it('should maintain user language preferences', async () => {
            // Set user preference
            multilingualService.setUserLanguagePreference('user123', 'ta-IN');

            // Start session - should use preferred language
            await voiceService.startSession('user123', 'ta-IN');

            const session = voiceService.getCurrentSession();
            expect(session?.language).toBe('ta-IN');

            // Switch language and verify preference is updated
            await voiceService.switchVoiceLanguage('hi-IN', 'user123');

            const updatedPreference = multilingualService.getUserLanguagePreference('user123');
            expect(updatedPreference).toBe('hi-IN');
        });
    });

    describe('Cultural Context and Variations', () => {
        it('should handle cultural variations in commands', async () => {
            await voiceService.startSession('user123', 'hi-IN');

            const culturalVariations = [
                'कृपया डैशबोर्ड पर जाएं', // Polite form
                'डैशबोर्ड दिखाओ', // Casual form
                'डैशबोर्ड खोलिए' // Formal request
            ];

            // Mock pattern matcher to recognize cultural variations
            const mockPatternMatcher = {
                matchPattern: jest.fn().mockImplementation((input: string) => {
                    if (culturalVariations.some(variation => input.includes('डैशबोर्ड'))) {
                        return {
                            matched: true,
                            intent: 'navigate_dashboard',
                            confidence: 0.85,
                            parameters: { culturalContext: 'polite' },
                            language: 'hi-IN'
                        };
                    }
                    return { matched: false, confidence: 0.1 };
                })
            };
            (voiceService as any).patternMatcher = mockPatternMatcher;

            for (const variation of culturalVariations) {
                const result = await voiceService.processMultilingualVoiceInput(
                    variation,
                    'user123',
                    false
                );

                expect(result.success).toBe(true);
                expect(result.intent?.intent).toBe('navigate_dashboard');
            }
        });

        it('should provide culturally appropriate feedback', async () => {
            const testCases = [
                { language: 'hi-IN', expectedFeedback: 'डैशबोर्ड पर जा रहे हैं' },
                { language: 'ta-IN', expectedFeedback: 'டாஷ்போர்டுக்கு செல்கிறோம்' },
                { language: 'bn-IN', expectedFeedback: 'ড্যাশবোর্ডে যাচ্ছি' }
            ];

            for (const testCase of testCases) {
                const confirmationPhrases = multilingualService.getConfirmationPhrases(testCase.language);
                expect(confirmationPhrases).toBeDefined();
                expect(confirmationPhrases.length).toBeGreaterThan(0);

                // Should contain culturally appropriate template
                expect(confirmationPhrases.some(phrase =>
                    phrase.includes('{destination}')
                )).toBe(true);
            }
        });
    });

    describe('Error Handling in Multilingual Context', () => {
        it('should provide error messages in user\'s language', async () => {
            const testCases = [
                { language: 'hi-IN', expectedErrorPattern: /समझ नहीं|पहचान नहीं/ },
                { language: 'ta-IN', expectedErrorPattern: /புரிந்து கொள்ள|அடையாளம்/ },
                { language: 'bn-IN', expectedErrorPattern: /বুঝতে পারি|চিনতে পারি/ }
            ];

            for (const testCase of testCases) {
                const errorMessages = multilingualService.getErrorMessages(testCase.language);
                expect(errorMessages).toBeDefined();
                expect(errorMessages.length).toBeGreaterThan(0);

                // Should have at least one message in the target language
                expect(errorMessages.some(msg =>
                    testCase.expectedErrorPattern.test(msg)
                )).toBe(true);
            }
        });

        it('should handle unsupported language gracefully', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Try to switch to unsupported language
            const result = await voiceService.switchVoiceLanguage('fr-FR', 'user123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not supported');
            expect(result.newLanguage).toBe('en-US'); // Should remain unchanged
        });

        it('should fallback to English for unknown languages', async () => {
            // Test with completely unknown input
            const detection = multilingualService.detectLanguageFromText('xyz abc 123');
            expect(detection.language).toBe('en-US');
            expect(detection.confidence).toBeLessThan(0.9);
        });
    });

    describe('Performance in Multilingual Context', () => {
        it('should handle rapid language switching', async () => {
            await voiceService.startSession('user123', 'en-US');

            const languages = ['hi-IN', 'ta-IN', 'bn-IN', 'te-IN', 'en-US'];
            const startTime = Date.now();

            for (const language of languages) {
                const result = await voiceService.switchVoiceLanguage(language, 'user123');
                expect(result.success).toBe(true);
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Should complete language switches quickly
            expect(totalTime).toBeLessThan(1000); // 1 second for 5 switches
        });

        it('should maintain performance with multilingual pattern matching', async () => {
            await voiceService.startSession('user123', 'en-US');

            const multilingualCommands = [
                'go to dashboard',
                'डैशबोर्ड पर जाएं',
                'டாஷ்போர்டுக்கு செல்லுங்கள்',
                'ড্যাশবোর্ডে যান',
                'డాష్‌బోర్డ్‌కు వెళ్లండి'
            ];

            const startTime = Date.now();

            const results = await Promise.all(
                multilingualCommands.map(cmd =>
                    voiceService.processMultilingualVoiceInput(cmd, 'user123', true)
                )
            );

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // All commands should succeed
            results.forEach(result => {
                expect(result.success).toBe(true);
            });

            // Should complete within reasonable time
            expect(totalTime).toBeLessThan(2000); // 2 seconds for 5 multilingual commands
        });
    });

    describe('Integration with Translation Context', () => {
        it('should sync with application translation language', async () => {
            // Mock translation context language change
            const translationLanguages = ['en', 'hi', 'ta', 'bn', 'te'];

            for (const translationLang of translationLanguages) {
                const result = await languageSwitcher.switchFromTranslationContext(
                    translationLang,
                    'user123'
                );

                expect(result.success).toBe(true);

                const expectedVoiceLanguage = translationLang === 'en' ? 'en-US' : `${translationLang}-IN`;
                expect(result.newLanguage).toBe(expectedVoiceLanguage);
            }
        });

        it('should handle translation language not supported in voice', async () => {
            // Try to switch to a language supported in translation but not in voice
            const result = await languageSwitcher.switchFromTranslationContext('fr', 'user123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not supported');
        });
    });
});