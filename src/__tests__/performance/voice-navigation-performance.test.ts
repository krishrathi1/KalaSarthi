/**
 * Voice Navigation Performance Tests
 * Tests performance characteristics of voice navigation system
 */

import { VoiceNavigationService } from '@/lib/services/VoiceNavigationService';
import { MultilingualVoiceService } from '@/lib/services/MultilingualVoiceService';
import { VoiceLanguageSwitcher } from '@/lib/services/VoiceLanguageSwitcher';

// Mock dependencies for performance testing
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

// Performance test utilities
const measureExecutionTime = async (fn: () => Promise<any>): Promise<{ result: any; time: number }> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, time: end - start };
};

const measureMemoryUsage = (): number => {
    if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
};

describe('Voice Navigation Performance Tests', () => {
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

        // Setup optimized pattern matcher for performance testing
        const mockPatternMatcher = {
            matchPattern: jest.fn().mockImplementation((input: string, language: string) => {
                // Simulate fast pattern matching
                const commonPatterns: Record<string, any> = {
                    'go to dashboard': { matched: true, intent: 'navigate_dashboard', confidence: 0.9, parameters: {}, language },
                    'open profile': { matched: true, intent: 'navigate_profile', confidence: 0.85, parameters: {}, language },
                    'show marketplace': { matched: true, intent: 'navigate_marketplace', confidence: 0.9, parameters: {}, language }
                };

                return commonPatterns[input.toLowerCase()] || { matched: false, confidence: 0.1 };
            }),
            addCustomPattern: jest.fn()
        };

        (voiceService as any).patternMatcher = mockPatternMatcher;

        await voiceService.initialize();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Service Initialization Performance', () => {
        it('should initialize services within acceptable time', async () => {
            // Reset and measure initialization
            (VoiceNavigationService as any).instance = undefined;

            const { time } = await measureExecutionTime(async () => {
                const service = VoiceNavigationService.getInstance();
                await service.initialize();
                return service;
            });

            // Should initialize within 100ms
            expect(time).toBeLessThan(100);
        });

        it('should have minimal memory footprint after initialization', async () => {
            const memoryBefore = measureMemoryUsage();

            (VoiceNavigationService as any).instance = undefined;
            const service = VoiceNavigationService.getInstance();
            await service.initialize();

            const memoryAfter = measureMemoryUsage();
            const memoryIncrease = memoryAfter - memoryBefore;

            // Should use less than 5MB for initialization (adjust as needed)
            expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
        });

        it('should cache singleton instances efficiently', () => {
            const { time: firstCall } = measureExecutionTime(async () => {
                return VoiceNavigationService.getInstance();
            });

            const { time: secondCall } = measureExecutionTime(async () => {
                return VoiceNavigationService.getInstance();
            });

            // Second call should be much faster (cached)
            expect(secondCall).toBeLessThan(firstCall / 10);
        });
    });

    describe('Voice Input Processing Performance', () => {
        beforeEach(async () => {
            await voiceService.startSession('user123', 'en-US');
        });

        it('should process voice input within acceptable time', async () => {
            const { time } = await measureExecutionTime(async () => {
                return voiceService.processMultilingualVoiceInput('go to dashboard', 'user123', true);
            });

            // Should process within 50ms for simple commands
            expect(time).toBeLessThan(50);
        });

        it('should handle rapid successive commands efficiently', async () => {
            const commands = Array.from({ length: 10 }, (_, i) => `command ${i}`);

            const { time } = await measureExecutionTime(async () => {
                const promises = commands.map(cmd =>
                    voiceService.processMultilingualVoiceInput(cmd, 'user123', true)
                );
                return Promise.all(promises);
            });

            // Should process 10 commands within 200ms
            expect(time).toBeLessThan(200);
        });

        it('should maintain consistent performance under load', async () => {
            const iterations = 100;
            const times: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const { time } = await measureExecutionTime(async () => {
                    return voiceService.processMultilingualVoiceInput('go to dashboard', 'user123', false);
                });
                times.push(time);
            }

            const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            const maxTime = Math.max(...times);
            const minTime = Math.min(...times);

            // Performance should be consistent
            expect(averageTime).toBeLessThan(20);
            expect(maxTime - minTime).toBeLessThan(50); // Low variance
        });

        it('should not cause memory leaks during processing', async () => {
            const memoryBefore = measureMemoryUsage();

            // Process many commands
            for (let i = 0; i < 100; i++) {
                await voiceService.processMultilingualVoiceInput('go to dashboard', 'user123', false);
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const memoryAfter = measureMemoryUsage();
            const memoryIncrease = memoryAfter - memoryBefore;

            // Should not significantly increase memory usage
            expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
        });
    });

    describe('Language Switching Performance', () => {
        it('should switch languages quickly', async () => {
            const { time } = await measureExecutionTime(async () => {
                return voiceService.switchVoiceLanguage('hi-IN', 'user123');
            });

            // Should switch within 10ms
            expect(time).toBeLessThan(10);
        });

        it('should handle rapid language switching', async () => {
            const languages = ['hi-IN', 'ta-IN', 'bn-IN', 'te-IN', 'en-US'];

            const { time } = await measureExecutionTime(async () => {
                for (const language of languages) {
                    await voiceService.switchVoiceLanguage(language, 'user123');
                }
            });

            // Should complete all switches within 50ms
            expect(time).toBeLessThan(50);
        });

        it('should cache language configurations efficiently', async () => {
            // First access
            const { time: firstAccess } = await measureExecutionTime(async () => {
                return multilingualService.getLanguageConfig('hi-IN');
            });

            // Second access (should be cached)
            const { time: secondAccess } = await measureExecutionTime(async () => {
                return multilingualService.getLanguageConfig('hi-IN');
            });

            // Second access should be much faster
            expect(secondAccess).toBeLessThan(firstAccess / 5);
        });
    });

    describe('Pattern Matching Performance', () => {
        it('should match patterns efficiently', async () => {
            const testInputs = [
                'go to dashboard',
                'open profile',
                'show marketplace',
                'navigate to cart',
                'display wishlist'
            ];

            const { time } = await measureExecutionTime(async () => {
                return Promise.all(
                    testInputs.map(input =>
                        voiceService.processMultilingualVoiceInput(input, 'user123', false)
                    )
                );
            });

            // Should match all patterns within 25ms
            expect(time).toBeLessThan(25);
        });

        it('should scale well with pattern complexity', async () => {
            // Add many custom patterns
            for (let i = 0; i < 100; i++) {
                voiceService.addCustomVoicePattern(
                    'en-US',
                    `custom pattern ${i}`,
                    `custom_intent_${i}`,
                    [`variation ${i}a`, `variation ${i}b`]
                );
            }

            const { time } = await measureExecutionTime(async () => {
                return voiceService.processMultilingualVoiceInput('go to dashboard', 'user123', false);
            });

            // Should still be fast even with many patterns
            expect(time).toBeLessThan(30);
        });

        it('should handle multilingual pattern matching efficiently', async () => {
            const multilingualInputs = [
                { input: 'go to dashboard', language: 'en-US' },
                { input: 'डैशबोर्ड पर जाएं', language: 'hi-IN' },
                { input: 'டாஷ்போர்டுக்கு செல்லுங்கள்', language: 'ta-IN' },
                { input: 'ড্যাশবোর্ডে যান', language: 'bn-IN' },
                { input: 'డాష్‌బోర్డ్‌కు వెళ్లండి', language: 'te-IN' }
            ];

            const { time } = await measureExecutionTime(async () => {
                const results = [];
                for (const { input, language } of multilingualInputs) {
                    await voiceService.switchVoiceLanguage(language, 'user123');
                    const result = await voiceService.processMultilingualVoiceInput(input, 'user123', false);
                    results.push(result);
                }
                return results;
            });

            // Should process all multilingual inputs within 100ms
            expect(time).toBeLessThan(100);
        });
    });

    describe('Session Management Performance', () => {
        it('should create sessions quickly', async () => {
            const { time } = await measureExecutionTime(async () => {
                return voiceService.startSession('user123', 'en-US');
            });

            // Should create session within 5ms
            expect(time).toBeLessThan(5);
        });

        it('should handle multiple concurrent sessions efficiently', async () => {
            const userIds = Array.from({ length: 10 }, (_, i) => `user${i}`);

            const { time } = await measureExecutionTime(async () => {
                const promises = userIds.map(userId =>
                    voiceService.startSession(userId, 'en-US')
                );
                return Promise.all(promises);
            });

            // Should create 10 sessions within 50ms
            expect(time).toBeLessThan(50);
        });

        it('should end sessions and calculate metrics efficiently', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Add many commands to session
            for (let i = 0; i < 50; i++) {
                voiceService.addCommandToSession({
                    id: `cmd${i}`,
                    timestamp: new Date(),
                    originalText: `command ${i}`,
                    processedText: `command ${i}`,
                    intent: 'test_intent',
                    confidence: 0.9,
                    parameters: {},
                    success: i % 2 === 0, // Alternate success/failure
                    executionTime: 10
                });
            }

            const { time } = await measureExecutionTime(async () => {
                return voiceService.endSession();
            });

            // Should calculate metrics for 50 commands within 10ms
            expect(time).toBeLessThan(10);
        });
    });

    describe('Memory Management', () => {
        it('should clean up resources properly', async () => {
            const memoryBefore = measureMemoryUsage();

            // Create and destroy multiple sessions
            for (let i = 0; i < 10; i++) {
                await voiceService.startSession(`user${i}`, 'en-US');

                // Add commands
                for (let j = 0; j < 10; j++) {
                    await voiceService.processMultilingualVoiceInput(`command ${j}`, `user${i}`, false);
                }

                await voiceService.endSession();
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const memoryAfter = measureMemoryUsage();
            const memoryIncrease = memoryAfter - memoryBefore;

            // Should not significantly increase memory
            expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024); // Less than 2MB
        });

        it('should handle large session histories efficiently', async () => {
            await voiceService.startSession('user123', 'en-US');

            const memoryBefore = measureMemoryUsage();

            // Add many commands
            for (let i = 0; i < 1000; i++) {
                voiceService.addCommandToSession({
                    id: `cmd${i}`,
                    timestamp: new Date(),
                    originalText: `command ${i}`,
                    processedText: `command ${i}`,
                    intent: 'test_intent',
                    confidence: 0.9,
                    parameters: { index: i },
                    success: true,
                    executionTime: 10
                });
            }

            const memoryAfter = measureMemoryUsage();
            const memoryIncrease = memoryAfter - memoryBefore;

            // Should handle 1000 commands without excessive memory usage
            expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
        });
    });

    describe('Error Handling Performance', () => {
        it('should handle errors without performance degradation', async () => {
            // Mock pattern matcher to throw errors
            const mockPatternMatcher = {
                matchPattern: jest.fn().mockImplementation(() => {
                    throw new Error('Pattern matching failed');
                })
            };
            (voiceService as any).patternMatcher = mockPatternMatcher;

            await voiceService.startSession('user123', 'en-US');

            const { time } = await measureExecutionTime(async () => {
                return voiceService.processMultilingualVoiceInput('go to dashboard', 'user123', false);
            });

            // Error handling should still be fast
            expect(time).toBeLessThan(20);
        });

        it('should recover from errors efficiently', async () => {
            await voiceService.startSession('user123', 'en-US');

            // Process failing command
            const mockPatternMatcher = {
                matchPattern: jest.fn().mockImplementation(() => {
                    throw new Error('Temporary failure');
                })
            };
            (voiceService as any).patternMatcher = mockPatternMatcher;

            await voiceService.processMultilingualVoiceInput('failing command', 'user123', false);

            // Restore working pattern matcher
            const workingPatternMatcher = {
                matchPattern: jest.fn().mockReturnValue({
                    matched: true,
                    intent: 'navigate_dashboard',
                    confidence: 0.9,
                    parameters: {},
                    language: 'en-US'
                })
            };
            (voiceService as any).patternMatcher = workingPatternMatcher;

            // Should recover quickly
            const { time } = await measureExecutionTime(async () => {
                return voiceService.processMultilingualVoiceInput('go to dashboard', 'user123', false);
            });

            expect(time).toBeLessThan(15);
        });
    });

    describe('Scalability Tests', () => {
        it('should maintain performance with increasing load', async () => {
            const loadLevels = [1, 10, 50, 100];
            const performanceResults: number[] = [];

            for (const load of loadLevels) {
                await voiceService.startSession('user123', 'en-US');

                const { time } = await measureExecutionTime(async () => {
                    const promises = Array.from({ length: load }, (_, i) =>
                        voiceService.processMultilingualVoiceInput(`command ${i}`, 'user123', false)
                    );
                    return Promise.all(promises);
                });

                performanceResults.push(time / load); // Average time per command
                await voiceService.endSession();
            }

            // Performance should not degrade significantly with load
            const firstResult = performanceResults[0];
            const lastResult = performanceResults[performanceResults.length - 1];

            expect(lastResult).toBeLessThan(firstResult * 2); // Should not be more than 2x slower
        });

        it('should handle concurrent users efficiently', async () => {
            const userCount = 20;
            const commandsPerUser = 5;

            const { time } = await measureExecutionTime(async () => {
                const userPromises = Array.from({ length: userCount }, async (_, userIndex) => {
                    const userId = `user${userIndex}`;
                    await voiceService.startSession(userId, 'en-US');

                    const commandPromises = Array.from({ length: commandsPerUser }, (_, cmdIndex) =>
                        voiceService.processMultilingualVoiceInput(`command ${cmdIndex}`, userId, false)
                    );

                    await Promise.all(commandPromises);
                    return voiceService.endSession();
                });

                return Promise.all(userPromises);
            });

            // Should handle 20 users with 5 commands each within reasonable time
            expect(time).toBeLessThan(500); // 500ms for 100 total commands across 20 users
        });
    });
});