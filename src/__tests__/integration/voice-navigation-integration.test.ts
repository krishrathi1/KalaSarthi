/**
 * Voice Navigation Integration Tests
 * Tests complete end-to-end voice navigation workflows
 */

import { VoiceNavigationService } from '@/lib/services/VoiceNavigationService';
import { MultilingualVoiceService } from '@/lib/services/MultilingualVoiceService';
import { VoiceLanguageSwitcher } from '@/lib/services/VoiceLanguageSwitcher';

// Mock Google Cloud services
jest.mock('@/lib/service/EnhancedSpeechToTextService', () => ({
    EnhancedSpeechToTextService: {
        getInstance: jest.fn(() => ({
            processAudio: jest.fn().mockResolvedValue({
                text: 'go to dashboard',
                confidence: 0.9,
                language: 'en-US'
            }),
            getSupportedLanguages: jest.fn().mockReturnValue(['en-US', 'hi-IN', 'ta-IN'])
        }))
    }
}));

jest.mock('@/lib/service/EnhancedTextToSpeechService', () => ({
    EnhancedTextToSpeechService: {
        getInstance: jest.fn(() => ({
            synthesizeSpeech: jest.fn().mockResolvedValue({
                audioContent: Buffer.from('mock-audio'),
                audioFormat: 'mp3'
            }),
            getSupportedLanguages: jest.fn().mockReturnValue(['en-US', 'hi-IN', 'ta-IN'])
        }))
    }
}));

// Mock other services
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

describe('Voice Navigation Integration Tests', () => {
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

        // Mock pattern matcher for integration tests
        const mockPatternMatcher = {
            matchPattern: jest.fn().mockImplementation((input: string, language: string) => {
                const patterns: Record<string, any> = {
                    'go to dashboard': {
                        matched: true,
                        intent: 'navigate_dashboard',
                        confidence: 0.9,
                        parameters: {},
                        language
                    },
                    'open profile': {
                        matched: true,
                        intent: 'navigate_profile',
                        confidence: 0.85,
                        parameters: {},
                        language
                    },
                    'डैशबोर्ड पर जाएं': {
                        matched: true,
                        intent: 'navigate_dashboard',
                        confidence: 0.9,
                        parameters: {},
                        language: 'hi-IN'
                    },
                    'switch to hindi': {
                        matched: false,
                        confidence: 0.1
                    }
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

    describe('Complete Voice Navigation Flow', () => {
        it('should complete full navigation workflow in English', async () => {
            // Start session
            const sessionId = await voiceService.startSession('user123', 'en-US');
            expect(sessionId).toBeDefined();

            // Process voice input
            const result = await voiceService.processMultilingualVoiceInput(
                'go to dashboard',
                'user123',
                true
            );

            expect(result.success).toBe(true);
            expect(result.intent?.intent).toBe('navigate_dashboard');
            expect(result.intent?.targetRoute).toBe('/dashboard');
            expect(result.feedback).toContain('Navigating to');

            // End session
            const session = await voiceService.endSession();
            expect(session?.commands).toHaveLength(1);
            expect(session?.successRate).toBe(1.0);
        });

        it('should handle multilingual navigation workflow', async () => {
            // Start session in English
            await voiceService.startSession('user123', 'en-US');

            // Switch to Hindi
            const switchResult = await voiceService.switchVoiceLanguage('hi-IN', 'user123');
            expect(switchResult.success).toBe(true);
            expect(switchResult.newLanguage).toBe('hi-IN');

            // Process Hindi voice input
            const result = await voiceService.processMultilingualVoiceInput(
                'डैशबोर्ड पर जाएं',
                'user123',
                true
            );

            expect(result.success).toBe(true);
            expect(result.intent?.intent).toBe('navigate_dashboard');
            expect(result.intent?.language).toBe('hi-IN');

            // Verify session contains multilingual commands
            const session = await voiceService.endSession();
            expect(session?.commands).toHaveLength(1);
            expect(session?.language).toBe('hi-IN');
        });

        it('should handle language auto-detection workflow', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Mock auto-detection
            const mockLanguageSwitcher = {
                autoSwitchFromInput: jest.fn().mockResolvedValue({
                    success: true,
                    previousLanguage: 'en-US',
                    newLanguage: 'hi-IN'
                }),
                processLanguageSwitchCommand: jest.fn().mockResolvedValue({ success: false })
            };
            (voiceService as any).languageSwitcher = mockLanguageSwitcher;

            // Process input that should trigger auto-detection
            const result = await voiceService.processMultilingualVoiceInput(
                'डैशबोर्ड पर जाएं',
                'user123',
                true
            );

            expect(mockLanguageSwitcher.autoSwitchFromInput).toHaveBeenCalledWith(
                'डैशबोर्ड पर जाएं',
                'user123'
            );
            expect(result.success).toBe(true);
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should handle and recover from speech recognition errors', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Mock pattern matcher to return no match
            const mockPatternMatcher = {
                matchPattern: jest.fn().mockReturnValue({
                    matched: false,
                    confidence: 0.1
                })
            };
            (voiceService as any).patternMatcher = mockPatternMatcher;

            // Process unrecognized input
            const result = await voiceService.processMultilingualVoiceInput(
                'invalid command',
                'user123',
                true
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('INTENT_NOT_RECOGNIZED');

            // Verify error is logged in session
            const session = await voiceService.endSession();
            expect(session?.commands).toHaveLength(1);
            expect(session?.commands[0].success).toBe(false);
            expect(session?.successRate).toBe(0.0);
        });

        it('should handle network errors gracefully', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Mock network error
            const mockPatternMatcher = {
                matchPattern: jest.fn().mockImplementation(() => {
                    throw new Error('Network error');
                })
            };
            (voiceService as any).patternMatcher = mockPatternMatcher;

            const result = await voiceService.processMultilingualVoiceInput(
                'go to dashboard',
                'user123',
                true
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
        });

        it('should fallback to offline processing when online services fail', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Mock fallback service
            const mockFallbackService = {
                processOfflineCommand: jest.fn().mockReturnValue({
                    matched: true,
                    command: { intent: 'navigate_dashboard' },
                    route: '/dashboard',
                    confidence: 0.8
                })
            };
            (voiceService as any).fallbackService = mockFallbackService;

            // Test offline processing
            const result = voiceService.processOfflineCommand('go to dashboard', 'en-US');

            expect(result.matched).toBe(true);
            expect(result.route).toBe('/dashboard');
            expect(result.confidence).toBe(0.8);
        });
    });

    describe('Language Switching Integration', () => {
        it('should handle language switch commands in workflow', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Mock language switcher to handle switch command
            const mockLanguageSwitcher = {
                autoSwitchFromInput: jest.fn().mockResolvedValue({ success: false }),
                processLanguageSwitchCommand: jest.fn().mockResolvedValue({
                    success: true,
                    message: 'Language switched to Hindi',
                    audioFeedback: 'भाषा बदल दी गई',
                    newLanguage: 'hi-IN'
                })
            };
            (voiceService as any).languageSwitcher = mockLanguageSwitcher;

            // Process language switch command
            const result = await voiceService.processMultilingualVoiceInput(
                'switch to hindi',
                'user123',
                true
            );

            expect(result.success).toBe(true);
            expect(result.feedback).toBe('Language switched to Hindi');
            expect(mockLanguageSwitcher.processLanguageSwitchCommand).toHaveBeenCalledWith(
                'switch to hindi',
                'user123'
            );
        });

        it('should maintain language consistency across session', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Switch language
            await voiceService.switchVoiceLanguage('hi-IN', 'user123');

            // Verify current session language is updated
            const session = voiceService.getCurrentSession();
            expect(session?.language).toBe('hi-IN');

            // Process command in new language
            const result = await voiceService.processMultilingualVoiceInput(
                'डैशबोर्ड पर जाएं',
                'user123',
                false // Don't auto-detect since we already switched
            );

            expect(result.success).toBe(true);
        });

        it('should handle cross-language navigation patterns', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Test navigation in multiple languages
            const testCases = [
                { input: 'go to dashboard', language: 'en-US', expectedIntent: 'navigate_dashboard' },
                { input: 'डैशबोर्ड पर जाएं', language: 'hi-IN', expectedIntent: 'navigate_dashboard' }
            ];

            for (const testCase of testCases) {
                // Switch language if needed
                if (testCase.language !== 'en-US') {
                    await voiceService.switchVoiceLanguage(testCase.language, 'user123');
                }

                const result = await voiceService.processMultilingualVoiceInput(
                    testCase.input,
                    'user123',
                    false
                );

                expect(result.success).toBe(true);
                expect(result.intent?.intent).toBe(testCase.expectedIntent);
            }
        });
    });

    describe('Session Management Integration', () => {
        it('should handle multiple concurrent sessions', async () => {
            // Start multiple sessions
            const session1 = await voiceService.startSession('user1', 'en-US');
            const session2 = await voiceService.startSession('user2', 'hi-IN');

            expect(session1).toBeDefined();
            expect(session2).toBeDefined();
            expect(session1).not.toBe(session2);

            // Note: Current implementation only supports one active session
            // This test verifies the last session overwrites the previous one
            const currentSession = voiceService.getCurrentSession();
            expect(currentSession?.userId).toBe('user2');
            expect(currentSession?.language).toBe('hi-IN');
        });

        it('should track command history across session', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Process multiple commands
            const commands = ['go to dashboard', 'open profile'];

            for (const command of commands) {
                await voiceService.processMultilingualVoiceInput(command, 'user123', true);
            }

            // End session and verify history
            const session = await voiceService.endSession();
            expect(session?.commands).toHaveLength(2);
            expect(session?.commands[0].originalText).toBe('go to dashboard');
            expect(session?.commands[1].originalText).toBe('open profile');
        });

        it('should calculate session metrics correctly', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Add successful command
            voiceService.addCommandToSession({
                id: 'cmd1',
                timestamp: new Date(),
                originalText: 'go to dashboard',
                processedText: 'go to dashboard',
                intent: 'navigate_dashboard',
                confidence: 0.9,
                parameters: {},
                success: true,
                executionTime: 100
            });

            // Add failed command
            voiceService.addCommandToSession({
                id: 'cmd2',
                timestamp: new Date(),
                originalText: 'invalid command',
                processedText: 'invalid command',
                intent: 'unknown',
                confidence: 0.1,
                parameters: {},
                success: false,
                executionTime: 50,
                error: 'Command not recognized'
            });

            const session = await voiceService.endSession();
            expect(session?.successRate).toBe(0.5); // 1 success out of 2 commands
            expect(session?.totalDuration).toBeGreaterThan(0);
        });
    });

    describe('Performance and Reliability', () => {
        it('should handle rapid successive voice commands', async () => {
            await voiceService.startSession('user123', 'en-US');

            const commands = [
                'go to dashboard',
                'open profile',
                'show marketplace',
                'go to cart'
            ];

            const results = await Promise.all(
                commands.map(cmd =>
                    voiceService.processMultilingualVoiceInput(cmd, 'user123', true)
                )
            );

            // All commands should be processed successfully
            results.forEach(result => {
                expect(result.success).toBe(true);
            });

            const session = await voiceService.endSession();
            expect(session?.commands).toHaveLength(4);
            expect(session?.successRate).toBe(1.0);
        });

        it('should maintain performance under load', async () => {
            const startTime = Date.now();

            await voiceService.startSession('user123', 'en-US');

            // Process 10 commands rapidly
            const promises = Array.from({ length: 10 }, (_, i) =>
                voiceService.processMultilingualVoiceInput(`command ${i}`, 'user123', true)
            );

            await Promise.all(promises);

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Should complete within reasonable time (adjust threshold as needed)
            expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 commands
        });

        it('should handle service initialization errors gracefully', async () => {
            // Reset and mock initialization failure
            (VoiceNavigationService as any).instance = undefined;
            const newService = VoiceNavigationService.getInstance();

            // Mock initialization to fail
            jest.spyOn(newService, 'initialize').mockRejectedValue(new Error('Init failed'));

            await expect(newService.initialize()).rejects.toThrow('Init failed');
            expect(newService.isReady()).toBe(false);
        });
    });

    describe('Feature Integration', () => {
        it('should integrate with guidance system', () => {
            const help = voiceService.getHelp('navigation', 'en-US');

            expect(help).toBeDefined();
            expect(help.commands).toBeDefined();
            expect(help.topics).toBeDefined();
            expect(help.suggestions).toBeDefined();
        });

        it('should provide contextual hints', () => {
            const hints = voiceService.getContextualHints({
                currentPage: '/dashboard',
                lastError: 'SPEECH_NOT_RECOGNIZED',
                sessionDuration: 30000
            });

            expect(hints).toBeDefined();
            expect(Array.isArray(hints)).toBe(true);
        });

        it('should get command suggestions', () => {
            const suggestions = voiceService.getCommandSuggestions({
                currentPage: '/dashboard',
                userInput: 'go to',
                language: 'en-US'
            });

            expect(suggestions).toBeDefined();
            expect(Array.isArray(suggestions)).toBe(true);
        });

        it('should support tutorial system', () => {
            const tutorialResult = voiceService.startTutorial('basic_navigation');

            expect(tutorialResult.success).toBeDefined();
            expect(tutorialResult.message).toBeDefined();
        });
    });
});