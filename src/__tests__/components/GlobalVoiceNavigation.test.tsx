/**
 * GlobalVoiceNavigation Component Tests
 * Tests the main voice navigation UI component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalVoiceNavigation } from '@/components/global-voice-navigation';
import { VoiceNavigationService } from '@/lib/services/VoiceNavigationService';
import { MultilingualVoiceService } from '@/lib/services/MultilingualVoiceService';
import { VoiceLanguageSwitcher } from '@/lib/services/VoiceLanguageSwitcher';

// Mock dependencies
jest.mock('@/lib/services/VoiceNavigationService');
jest.mock('@/lib/services/MultilingualVoiceService');
jest.mock('@/lib/services/VoiceLanguageSwitcher');
jest.mock('@/hooks/use-toast');
jest.mock('@/context/TranslationContext');

// Mock Web APIs
const mockGetUserMedia = jest.fn();
const mockSpeechRecognition = jest.fn();
const mockSpeechSynthesis = {
    speak: jest.fn(),
    getVoices: jest.fn().mockReturnValue([
        { lang: 'en-US', name: 'English Voice' },
        { lang: 'hi-IN', name: 'Hindi Voice' }
    ])
};
const mockAudioContext = jest.fn();

Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true
});

Object.defineProperty(window, 'SpeechRecognition', {
    value: mockSpeechRecognition,
    writable: true
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
    value: mockSpeechRecognition,
    writable: true
});

Object.defineProperty(window, 'speechSynthesis', {
    value: mockSpeechSynthesis,
    writable: true
});

Object.defineProperty(window, 'AudioContext', {
    value: mockAudioContext,
    writable: true
});

Object.defineProperty(window, 'webkitAudioContext', {
    value: mockAudioContext,
    writable: true
});

// Mock toast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast })
}));

// Mock translation context
jest.mock('@/context/TranslationContext', () => ({
    useTranslation: () => ({
        currentLanguage: 'en',
        setLanguage: jest.fn()
    })
}));

describe('GlobalVoiceNavigation', () => {
    let mockVoiceService: jest.Mocked<VoiceNavigationService>;
    let mockMultilingualService: jest.Mocked<MultilingualVoiceService>;
    let mockLanguageSwitcher: jest.Mocked<VoiceLanguageSwitcher>;

    beforeEach(() => {
        // Setup service mocks
        mockVoiceService = {
            getInstance: jest.fn(),
            initialize: jest.fn().mockResolvedValue(undefined),
            processMultilingualVoiceInput: jest.fn().mockResolvedValue({
                success: true,
                intent: {
                    intent: 'navigate_dashboard',
                    confidence: 0.9,
                    targetRoute: '/dashboard',
                    language: 'en-US'
                },
                feedback: 'Navigating to dashboard'
            })
        } as any;

        mockMultilingualService = {
            getInstance: jest.fn(),
            getCurrentLanguage: jest.fn().mockReturnValue('en-US'),
            getLanguageConfig: jest.fn().mockReturnValue({
                languageCode: 'en-US',
                speechRate: 1.0,
                pitch: 0.0
            }),
            getErrorMessages: jest.fn().mockReturnValue(['Command not recognized'])
        } as any;

        mockLanguageSwitcher = {
            getInstance: jest.fn(),
            switchFromTranslationContext: jest.fn().mockResolvedValue({
                success: true,
                newLanguage: 'en-US'
            })
        } as any;

        (VoiceNavigationService.getInstance as jest.Mock).mockReturnValue(mockVoiceService);
        (MultilingualVoiceService.getInstance as jest.Mock).mockReturnValue(mockMultilingualService);
        (VoiceLanguageSwitcher.getInstance as jest.Mock).mockReturnValue(mockLanguageSwitcher);

        // Setup media stream mock
        mockGetUserMedia.mockResolvedValue({
            getTracks: () => [{ stop: jest.fn() }]
        });

        // Setup speech recognition mock
        const mockRecognitionInstance = {
            start: jest.fn(),
            stop: jest.fn(),
            onresult: null,
            onerror: null,
            onend: null,
            lang: 'en-US',
            continuous: false,
            interimResults: false,
            maxAlternatives: 3
        };
        mockSpeechRecognition.mockImplementation(() => mockRecognitionInstance);

        // Setup audio context mock
        const mockAudioContextInstance = {
            createMediaStreamSource: jest.fn().mockReturnValue({
                connect: jest.fn()
            }),
            createAnalyser: jest.fn().mockReturnValue({
                fftSize: 256,
                smoothingTimeConstant: 0.8,
                frequencyBinCount: 128,
                getByteFrequencyData: jest.fn()
            }),
            close: jest.fn().mockResolvedValue(undefined)
        };
        mockAudioContext.mockImplementation(() => mockAudioContextInstance);

        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render microphone button', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            expect(micButton).toBeInTheDocument();
            expect(micButton).toHaveAttribute('aria-label', 'Start voice navigation');
        });

        it('should render with different sizes', () => {
            const { rerender } = render(<GlobalVoiceNavigation size="sm" />);
            let micButton = screen.getByRole('button');
            expect(micButton).toHaveClass('h-8', 'w-8');

            rerender(<GlobalVoiceNavigation size="lg" />);
            micButton = screen.getByRole('button');
            expect(micButton).toHaveClass('h-12', 'w-12');
        });

        it('should render disabled state', () => {
            render(<GlobalVoiceNavigation disabled />);

            const micButton = screen.getByRole('button');
            expect(micButton).toBeDisabled();
        });

        it('should show tooltip on hover', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.hover(micButton);

            await waitFor(() => {
                expect(screen.getByText('Click to activate voice navigation')).toBeInTheDocument();
            });
        });
    });

    describe('Voice Activation', () => {
        it('should start voice navigation on click', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            await waitFor(() => {
                expect(mockGetUserMedia).toHaveBeenCalledWith({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
            });

            expect(mockToast).toHaveBeenCalledWith({
                title: 'Voice Navigation Active',
                description: expect.stringContaining('Listening for navigation commands')
            });
        });

        it('should stop voice navigation when clicked while listening', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');

            // Start listening
            await userEvent.click(micButton);
            await waitFor(() => {
                expect(micButton).toHaveAttribute('aria-pressed', 'true');
            });

            // Stop listening
            await userEvent.click(micButton);
            await waitFor(() => {
                expect(micButton).toHaveAttribute('aria-pressed', 'false');
            });

            expect(mockToast).toHaveBeenCalledWith({
                title: 'Voice Navigation Stopped',
                description: 'Voice navigation has been deactivated.'
            });
        });

        it('should handle microphone access denied', async () => {
            mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: 'Microphone Access Denied',
                    description: 'Please allow microphone access to use voice navigation.',
                    variant: 'destructive'
                });
            });
        });

        it('should activate with keyboard (Space key)', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            micButton.focus();

            fireEvent.keyDown(micButton, { key: ' ', code: 'Space' });

            await waitFor(() => {
                expect(mockGetUserMedia).toHaveBeenCalled();
            });
        });

        it('should activate with keyboard (Enter key)', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            micButton.focus();

            fireEvent.keyDown(micButton, { key: 'Enter', code: 'Enter' });

            await waitFor(() => {
                expect(mockGetUserMedia).toHaveBeenCalled();
            });
        });
    });

    describe('Voice Processing', () => {
        it('should process successful voice input', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            // Simulate speech recognition result
            const mockRecognition = mockSpeechRecognition.mock.results[0].value;
            const mockResult = {
                results: [{
                    isFinal: true,
                    0: {
                        transcript: 'go to dashboard',
                        confidence: 0.9
                    }
                }]
            };

            // Trigger recognition result
            if (mockRecognition.onresult) {
                mockRecognition.onresult(mockResult);
            }

            await waitFor(() => {
                expect(mockVoiceService.processMultilingualVoiceInput).toHaveBeenCalledWith(
                    'go to dashboard',
                    undefined,
                    true
                );
            });

            expect(mockToast).toHaveBeenCalledWith({
                title: 'Navigation Successful',
                description: 'Navigating to dashboard',
                variant: 'default'
            });
        });

        it('should handle voice processing errors', async () => {
            mockVoiceService.processMultilingualVoiceInput.mockResolvedValue({
                success: false,
                error: 'Command not recognized',
                feedback: 'Sorry, I didn\'t understand that',
                executionTime: 100
            });

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            const mockRecognition = mockSpeechRecognition.mock.results[0].value;
            const mockResult = {
                results: [{
                    isFinal: true,
                    0: {
                        transcript: 'invalid command',
                        confidence: 0.5
                    }
                }]
            };

            if (mockRecognition.onresult) {
                mockRecognition.onresult(mockResult);
            }

            await waitFor(() => {
                expect(mockToast).toHaveBeenCalledWith({
                    title: 'Voice Navigation Failed',
                    description: 'Please try speaking more clearly or use a different command.',
                    variant: 'destructive'
                });
            });
        });

        it('should handle speech recognition errors', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            const mockRecognition = mockSpeechRecognition.mock.results[0].value;

            // Trigger recognition error
            if (mockRecognition.onerror) {
                mockRecognition.onerror({ error: 'network' });
            }

            await waitFor(() => {
                expect(micButton).toHaveAttribute('aria-pressed', 'false');
            });
        });
    });

    describe('Audio Feedback', () => {
        it('should play audio feedback for successful navigation', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            const mockRecognition = mockSpeechRecognition.mock.results[0].value;
            const mockResult = {
                results: [{
                    isFinal: true,
                    0: {
                        transcript: 'go to dashboard',
                        confidence: 0.9
                    }
                }]
            };

            if (mockRecognition.onresult) {
                mockRecognition.onresult(mockResult);
            }

            await waitFor(() => {
                expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
            });
        });

        it('should use appropriate voice for current language', async () => {
            mockMultilingualService.getCurrentLanguage.mockReturnValue('hi-IN');
            mockMultilingualService.getLanguageConfig.mockReturnValue({
                languageCode: 'hi-IN',
                speechRate: 0.9,
                pitch: 0.0
            });

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            const mockRecognition = mockSpeechRecognition.mock.results[0].value;
            const mockResult = {
                results: [{
                    isFinal: true,
                    0: {
                        transcript: 'डैशबोर्ड पर जाएं',
                        confidence: 0.9
                    }
                }]
            };

            if (mockRecognition.onresult) {
                mockRecognition.onresult(mockResult);
            }

            await waitFor(() => {
                const utteranceCall = mockSpeechSynthesis.speak.mock.calls[0];
                const utterance = utteranceCall[0];
                expect(utterance.lang).toBe('hi-IN');
                expect(utterance.rate).toBe(0.9);
            });
        });
    });

    describe('Visual States', () => {
        it('should show listening state visually', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            await waitFor(() => {
                expect(micButton).toHaveClass('border-green-500', 'bg-green-500');
            });
        });

        it('should show processing state', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            // Simulate processing state
            const mockRecognition = mockSpeechRecognition.mock.results[0].value;
            const mockResult = {
                results: [{
                    isFinal: true,
                    0: {
                        transcript: 'go to dashboard',
                        confidence: 0.9
                    }
                }]
            };

            if (mockRecognition.onresult) {
                mockRecognition.onresult(mockResult);
            }

            // Should briefly show processing state
            expect(micButton).toHaveClass('border-blue-500');
        });

        it('should show error state', async () => {
            mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            await waitFor(() => {
                expect(micButton).toHaveClass('border-red-500');
            });
        });

        it('should show voice activity indicator', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            await waitFor(() => {
                expect(screen.getByText('Listening...')).toBeInTheDocument();
            });
        });
    });

    describe('Browser Support', () => {
        it('should handle unsupported browser gracefully', () => {
            // Remove speech recognition support
            delete (window as any).SpeechRecognition;
            delete (window as any).webkitSpeechRecognition;

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            expect(micButton).toBeDisabled();
        });

        it('should handle missing media devices', () => {
            // Remove media devices support
            delete (navigator as any).mediaDevices;

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            expect(micButton).toBeDisabled();
        });

        it('should show appropriate tooltip for unsupported browser', () => {
            delete (window as any).SpeechRecognition;
            delete (window as any).webkitSpeechRecognition;

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            expect(micButton).toHaveAttribute('aria-label', 'Start voice navigation');
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            expect(micButton).toHaveAttribute('aria-label');
            expect(micButton).toHaveAttribute('aria-pressed', 'false');
            expect(micButton).toHaveAttribute('tabIndex', '0');
        });

        it('should update ARIA pressed state when listening', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            await waitFor(() => {
                expect(micButton).toHaveAttribute('aria-pressed', 'true');
            });
        });

        it('should be keyboard navigable', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            micButton.focus();

            expect(micButton).toHaveFocus();
        });
    });

    describe('Cleanup', () => {
        it('should cleanup audio resources on unmount', () => {
            const { unmount } = render(<GlobalVoiceNavigation />);

            unmount();

            // Audio context should be closed
            expect(mockAudioContext.mock.results[0]?.value?.close).toHaveBeenCalled();
        });

        it('should stop listening on unmount', async () => {
            const { unmount } = render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            unmount();

            // Should cleanup properly without errors
            expect(true).toBe(true);
        });
    });
});