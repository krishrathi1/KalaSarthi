/**
 * VoiceNavigationService Unit Tests
 * Tests core voice navigation service functionality
 */

import { VoiceNavigationService, VoiceNavigationError } from '@/lib/services/VoiceNavigationService';
import { MultilingualVoiceService } from '@/lib/services/MultilingualVoiceService';
import { VoiceLanguageSwitcher } from '@/lib/services/VoiceLanguageSwitcher';

// Mock dependencies
jest.mock('@/lib/service/EnhancedSpeechToTextService');
jest.mock('@/lib/service/EnhancedTextToSpeechService');
jest.mock('@/lib/services/MultilingualVoiceService');
jest.mock('@/lib/services/VoiceLanguageSwitcher');
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

describe('VoiceNavigationService', () => {
    let service: VoiceNavigationService;
    let mockMultilingualService: jest.Mocked<MultilingualVoiceService>;
    let mockLanguageSwitcher: jest.Mocked<VoiceLanguageSwitcher>;

    beforeEach(() => {
        // Reset singleton instance
        (VoiceNavigationService as any).instance = undefined;

        // Setup mocks
        mockMultilingualService = {
            getCurrentLanguage: jest.fn().mockReturnValue('en-US'),
            getErrorMessages: jest.fn().mockReturnValue(['Command not recognized']),
            getConfirmationPhrases: jest.fn().mockReturnValue(['Navigating to {destination}']),
            getNavigationPatterns: jest.fn().mockReturnValue({
                navigationCommands: {
                    'navigate_dashboard': ['go to dashboard', 'open dashboard']
                }
            })
        } as any;

        mockLanguageSwitcher = {
            autoSwitchFromInput: jest.fn().mockResolvedValue({ success: false }),
            processLanguageSwitchCommand: jest.fn().mockResolvedValue({ success: false }),
            switchLanguage: jest.fn().mockResolvedValue({
                success: true,
                previousLanguage: 'en-US',
                newLanguage: 'hi-IN',
                message: 'Language switched'
            }),
            getAvailableLanguages: jest.fn().mockReturnValue([
                { code: 'en-US', name: 'English', supported: true },
                { code: 'hi-IN', name: 'Hindi', supported: true }
            ])
        } as any;

        (MultilingualVoiceService.getInstance as jest.Mock).mockReturnValue(mockMultilingualService);
        (VoiceLanguageSwitcher.getInstance as jest.Mock).mockReturnValue(mockLanguageSwitcher);

        service = VoiceNavigationService.getInstance();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should create singleton instance', () => {
            const instance1 = VoiceNavigationService.getInstance();
            const instance2 = VoiceNavigationService.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should initialize with default configuration', async () => {
            await service.initialize();

            const config = service.getConfiguration();
            expect(config.enabledLanguages).toContain('en-US');
            expect(config.enabledLanguages).toContain('hi-IN');
            expect(config.fallbackLanguage).toBe('en-US');
            expect(config.confidenceThreshold).toBe(0.7);
        });

        it('should validate configuration on initialization', async () => {
            await expect(service.initialize({
                enabledLanguages: [],
                confidenceThreshold: 0.7,
                maxListeningDuration: 10000,
                fallbackLanguage: 'en-US',
                debugMode: false,
                serviceAccount: {
                    keyFilename: 'key.json',
                    projectId: 'test-project'
                }
            })).rejects.toThrow('At least one language must be enabled');
        });

        it('should reject invalid confidence threshold', async () => {
            await expect(service.initialize({
                confidenceThreshold: 1.5
            })).rejects.toThrow('Confidence threshold must be between 0 and 1');
        });
    });

    describe('Session Management', () => {
        beforeEach(async () => {
            await service.initialize();
        });

        it('should start a new session successfully', async () => {
            const sessionId = await service.startSession('user123', 'en-US');

            expect(sessionId).toMatch(/^voice_session_\d+_[a-z0-9]+$/);

            const session = service.getCurrentSession();
            expect(session).toBeDefined();
            expect(session?.userId).toBe('user123');
            expect(session?.language).toBe('en-US');
        });

        it('should reject unsupported language in session', async () => {
            await expect(service.startSession('user123', 'unsupported-lang'))
                .rejects.toThrow('Language unsupported-lang not supported');
        });

        it('should end session and calculate metrics', async () => {
            const sessionId = await service.startSession('user123');

            // Add some mock commands
            service.addCommandToSession({
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

            const endedSession = await service.endSession();

            expect(endedSession).toBeDefined();
            expect(endedSession?.successRate).toBe(1.0);
            expect(endedSession?.commands).toHaveLength(1);
            expect(service.getCurrentSession()).toBeNull();
        });
    });

    describe('Voice Input Processing', () => {
        beforeEach(async () => {
            await service.initialize();
            await service.startSession('user123');
        });

        it('should process multilingual voice input successfully', async () => {
            // Mock pattern matcher
            const mockPatternMatcher = {
                matchPattern: jest.fn().mockReturnValue({
                    matched: true,
                    intent: 'navigate_dashboard',
                    confidence: 0.9,
                    parameters: {},
                    language: 'en-US'
                })
            };
            (service as any).patternMatcher = mockPatternMatcher;

            const result = await service.processMultilingualVoiceInput('go to dashboard', 'user123');

            expect(result.success).toBe(true);
            expect(result.intent?.intent).toBe('navigate_dashboard');
            expect(result.intent?.confidence).toBe(0.9);
            expect(result.feedback).toContain('Navigating to');
        });

        it('should handle unrecognized voice input', async () => {
            const mockPatternMatcher = {
                matchPattern: jest.fn().mockReturnValue({
                    matched: false,
                    confidence: 0.1
                })
            };
            (service as any).patternMatcher = mockPatternMatcher;

            const result = await service.processMultilingualVoiceInput('invalid command', 'user123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('INTENT_NOT_RECOGNIZED');
            expect(result.feedback).toBe('Command not recognized');
        });

        it('should handle language switching commands', async () => {
            mockLanguageSwitcher.processLanguageSwitchCommand.mockResolvedValueOnce({
                success: true,
                message: 'Language switched to Hindi',
                audioFeedback: 'भाषा बदल दी गई'
            });

            const result = await service.processMultilingualVoiceInput('switch to hindi', 'user123');

            expect(result.success).toBe(true);
            expect(result.feedback).toBe('Language switched to Hindi');
        });
    });

    describe('Language Management', () => {
        beforeEach(async () => {
            await service.initialize();
        });

        it('should switch voice language successfully', async () => {
            const result = await service.switchVoiceLanguage('hi-IN', 'user123');

            expect(result.success).toBe(true);
            expect(result.newLanguage).toBe('hi-IN');
            expect(mockLanguageSwitcher.switchLanguage).toHaveBeenCalledWith('hi-IN', 'user123');
        });

        it('should get current voice language', () => {
            const language = service.getCurrentVoiceLanguage();
            expect(language).toBe('en-US');
            expect(mockMultilingualService.getCurrentLanguage).toHaveBeenCalled();
        });

        it('should get supported voice languages', () => {
            const languages = service.getSupportedVoiceLanguages();
            expect(languages).toHaveLength(2);
            expect(languages[0]).toEqual({ code: 'en-US', name: 'English', supported: true });
        });
    });

    describe('Route Resolution', () => {
        beforeEach(async () => {
            await service.initialize();
        });

        it('should resolve dashboard route correctly', () => {
            const route = (service as any).resolveRouteFromIntent('navigate_dashboard', {});
            expect(route).toBe('/dashboard');
        });

        it('should resolve route with destination parameter', () => {
            const route = (service as any).resolveRouteFromIntent('navigate_dashboard', { destination: 'marketplace' });
            expect(route).toBe('/marketplace');
        });

        it('should handle back navigation', () => {
            const route = (service as any).resolveRouteFromIntent('navigate_back', {});
            expect(route).toBe('back');
        });

        it('should return undefined for unknown intent', () => {
            const route = (service as any).resolveRouteFromIntent('unknown_intent', {});
            expect(route).toBeUndefined();
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            await service.initialize();
        });

        it('should handle microphone access denied error', () => {
            const strategy = service.handleErrorLegacy(VoiceNavigationError.MICROPHONE_ACCESS_DENIED);

            expect(strategy.fallbackAction).toBe('manual_input');
            expect(strategy.userMessage).toContain('Microphone access is required');
            expect(strategy.maxRetries).toBe(0);
        });

        it('should handle speech not recognized error', () => {
            const strategy = service.handleErrorLegacy(VoiceNavigationError.SPEECH_NOT_RECOGNIZED);

            expect(strategy.fallbackAction).toBe('retry');
            expect(strategy.maxRetries).toBe(3);
        });

        it('should handle network errors with retry', () => {
            const strategy = service.handleErrorLegacy(VoiceNavigationError.NETWORK_ERROR);

            expect(strategy.fallbackAction).toBe('retry');
            expect(strategy.maxRetries).toBe(2);
        });

        it('should provide default strategy for unknown errors', () => {
            const strategy = service.handleErrorLegacy('UNKNOWN_ERROR' as VoiceNavigationError);

            expect(strategy.fallbackAction).toBe('cancel');
            expect(strategy.maxRetries).toBe(1);
        });
    });

    describe('Configuration Management', () => {
        it('should update configuration successfully', async () => {
            await service.initialize();

            service.updateConfiguration({
                confidenceThreshold: 0.8,
                maxListeningDuration: 15000
            });

            const config = service.getConfiguration();
            expect(config.confidenceThreshold).toBe(0.8);
            expect(config.maxListeningDuration).toBe(15000);
        });

        it('should validate updated configuration', async () => {
            await service.initialize();

            expect(() => {
                service.updateConfiguration({
                    confidenceThreshold: 2.0
                });
            }).toThrow('Confidence threshold must be between 0 and 1');
        });

        it('should get supported languages from configuration', async () => {
            await service.initialize();

            const languages = service.getSupportedLanguages();
            expect(languages).toContain('en-US');
            expect(languages).toContain('hi-IN');
        });
    });

    describe('Service Status', () => {
        it('should report not ready before initialization', () => {
            expect(service.isReady()).toBe(false);
        });

        it('should report ready after initialization', async () => {
            await service.initialize();
            expect(service.isReady()).toBe(true);
        });
    });

    describe('Offline Command Processing', () => {
        beforeEach(async () => {
            await service.initialize();
        });

        it('should process offline commands when available', () => {
            // Mock fallback service
            const mockFallbackService = {
                processOfflineCommand: jest.fn().mockReturnValue({
                    matched: true,
                    command: { intent: 'navigate_dashboard' },
                    route: '/dashboard',
                    confidence: 0.8
                })
            };
            (service as any).fallbackService = mockFallbackService;

            const result = service.processOfflineCommand('go to dashboard', 'en-US');

            expect(result.matched).toBe(true);
            expect(result.route).toBe('/dashboard');
            expect(result.confidence).toBe(0.8);
        });

        it('should handle offline command failures', () => {
            const mockFallbackService = {
                processOfflineCommand: jest.fn().mockReturnValue({
                    matched: false,
                    confidence: 0.1
                })
            };
            (service as any).fallbackService = mockFallbackService;

            const result = service.processOfflineCommand('unknown command', 'en-US');

            expect(result.matched).toBe(false);
            expect(result.confidence).toBe(0.1);
        });
    });
});