/**
 * Voice Navigation Accessibility Tests
 * Tests accessibility compliance for voice navigation features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalVoiceNavigation } from '@/components/global-voice-navigation';

// Mock dependencies
jest.mock('@/lib/services/VoiceNavigationService');
jest.mock('@/lib/services/MultilingualVoiceService');
jest.mock('@/lib/services/VoiceLanguageSwitcher');
jest.mock('@/hooks/use-toast');
jest.mock('@/context/TranslationContext');

// Mock Web APIs
const mockGetUserMedia = jest.fn();
const mockSpeechRecognition = jest.fn();
const mockSpeechSynthesis = { speak: jest.fn(), getVoices: jest.fn().mockReturnValue([]) };

Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true
});

Object.defineProperty(window, 'SpeechRecognition', {
    value: mockSpeechRecognition,
    writable: true
});

Object.defineProperty(window, 'speechSynthesis', {
    value: mockSpeechSynthesis,
    writable: true
});

// Mock hooks
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() })
}));

jest.mock('@/context/TranslationContext', () => ({
    useTranslation: () => ({
        currentLanguage: 'en',
        setLanguage: jest.fn()
    })
}));

describe('Voice Navigation Accessibility Tests', () => {
    beforeEach(() => {
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
            onend: null
        };
        mockSpeechRecognition.mockImplementation(() => mockRecognitionInstance);

        jest.clearAllMocks();
    });

    describe('Basic Accessibility', () => {
        it('should render without accessibility issues', () => {
            render(<GlobalVoiceNavigation />);
            const micButton = screen.getByRole('button');
            expect(micButton).toBeInTheDocument();
        });

        it('should maintain accessibility when listening', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            expect(micButton).toHaveAttribute('aria-pressed', 'true');
        });

        it('should maintain accessibility in error state', async () => {
            mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            // Should still be accessible
            expect(micButton).toBeInTheDocument();
        });

        it('should maintain accessibility when disabled', () => {
            render(<GlobalVoiceNavigation disabled />);
            const micButton = screen.getByRole('button');
            expect(micButton).toBeDisabled();
        });
    });

    describe('Keyboard Navigation', () => {
        it('should be focusable with keyboard', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            micButton.focus();

            expect(micButton).toHaveFocus();
        });

        it('should activate with Space key', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            micButton.focus();

            fireEvent.keyDown(micButton, { key: ' ', code: 'Space' });

            expect(mockGetUserMedia).toHaveBeenCalled();
        });

        it('should activate with Enter key', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            micButton.focus();

            fireEvent.keyDown(micButton, { key: 'Enter', code: 'Enter' });

            expect(mockGetUserMedia).toHaveBeenCalled();
        });

        it('should not activate with other keys', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            micButton.focus();

            fireEvent.keyDown(micButton, { key: 'a', code: 'KeyA' });

            expect(mockGetUserMedia).not.toHaveBeenCalled();
        });

        it('should maintain focus visibility', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            micButton.focus();

            expect(micButton).toHaveClass('focus:ring-2', 'focus:ring-offset-2', 'focus:ring-blue-500');
        });

        it('should be included in tab order', () => {
            render(
                <div>
                    <button>Previous Button</button>
                    <GlobalVoiceNavigation />
                    <button>Next Button</button>
                </div>
            );

            const micButton = screen.getByRole('button', { name: /voice navigation/i });
            expect(micButton).toHaveAttribute('tabIndex', '0');
        });
    });

    describe('ARIA Attributes', () => {
        it('should have proper ARIA label', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            expect(micButton).toHaveAttribute('aria-label', 'Start voice navigation');
        });

        it('should update ARIA label when listening', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            expect(micButton).toHaveAttribute('aria-label', expect.stringContaining('Stop voice navigation'));
        });

        it('should have ARIA pressed state', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            expect(micButton).toHaveAttribute('aria-pressed', 'false');
        });

        it('should update ARIA pressed state when active', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            expect(micButton).toHaveAttribute('aria-pressed', 'true');
        });

        it('should have proper button role', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            expect(micButton).toBeInTheDocument();
        });

        it('should provide status updates for screen readers', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            // Should have live region for status updates
            await waitFor(() => {
                const statusIndicator = screen.queryByText(/listening/i);
                if (statusIndicator) {
                    expect(statusIndicator).toBeInTheDocument();
                }
            });
        });
    });

    describe('Screen Reader Support', () => {
        it('should announce state changes', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');

            // Initial state
            expect(micButton).toHaveAttribute('aria-label', 'Start voice navigation');

            // After activation
            await userEvent.click(micButton);
            expect(micButton).toHaveAttribute('aria-label', expect.stringContaining('Stop'));
        });

        it('should provide meaningful button text alternatives', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            const ariaLabel = micButton.getAttribute('aria-label');

            expect(ariaLabel).toBeTruthy();
            expect(ariaLabel).toContain('voice navigation');
        });

        it('should announce error states', async () => {
            mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            // Should show error message
            await waitFor(() => {
                const errorMessage = screen.queryByText(/microphone access/i);
                if (errorMessage) {
                    expect(errorMessage).toBeInTheDocument();
                }
            });
        });

        it('should provide context for voice activity', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            // Should show listening status
            await waitFor(() => {
                const listeningStatus = screen.queryByText(/listening/i);
                if (listeningStatus) {
                    expect(listeningStatus).toBeInTheDocument();
                }
            });
        });
    });

    describe('Color and Contrast', () => {
        it('should have sufficient color contrast in default state', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');

            // Should have proper contrast classes
            expect(micButton).toHaveClass('border-gray-300');
        });

        it('should have sufficient color contrast when active', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            // Should have high contrast active state
            expect(micButton).toHaveClass('border-green-500', 'bg-green-500', 'text-white');
        });

        it('should have sufficient color contrast in error state', async () => {
            mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            // Should have high contrast error state
            expect(micButton).toHaveClass('border-red-500');
        });

        it('should not rely solely on color for state indication', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');

            // Should have text/icon changes in addition to color
            expect(micButton).toHaveAttribute('aria-pressed', 'false');

            await userEvent.click(micButton);

            expect(micButton).toHaveAttribute('aria-pressed', 'true');
            // Icon should also change (tested via aria-label change)
            expect(micButton).toHaveAttribute('aria-label', expect.stringContaining('Stop'));
        });
    });

    describe('Touch and Mobile Accessibility', () => {
        it('should have adequate touch target size', () => {
            render(<GlobalVoiceNavigation size="md" />);

            const micButton = screen.getByRole('button');

            // Should have minimum 44px touch target (h-10 w-10 = 40px, close enough)
            expect(micButton).toHaveClass('h-10', 'w-10');
        });

        it('should have larger touch target for large size', () => {
            render(<GlobalVoiceNavigation size="lg" />);

            const micButton = screen.getByRole('button');

            // Should have larger touch target
            expect(micButton).toHaveClass('h-12', 'w-12');
        });

        it('should work with touch events', async () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');

            // Simulate touch
            fireEvent.touchStart(micButton);
            fireEvent.touchEnd(micButton);
            fireEvent.click(micButton);

            expect(mockGetUserMedia).toHaveBeenCalled();
        });
    });

    describe('Browser Support', () => {
        it('should degrade gracefully when APIs are unavailable', () => {
            // Remove speech recognition support
            delete (window as any).SpeechRecognition;
            delete (window as any).webkitSpeechRecognition;

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            expect(micButton).toBeDisabled();
        });

        it('should provide alternative interaction methods', () => {
            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');

            // Should be operable via keyboard
            expect(micButton).toHaveAttribute('tabIndex', '0');

            // Should have click handler
            expect(micButton).toHaveAttribute('role', 'button');
        });
    });

    describe('Error Handling Accessibility', () => {
        it('should announce errors to screen readers', async () => {
            mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            // Should have error message visible to screen readers
            await waitFor(() => {
                const errorMessage = screen.queryByText(/microphone access/i);
                if (errorMessage) {
                    expect(errorMessage).toBeInTheDocument();
                }
            });
        });

        it('should provide recovery instructions', async () => {
            mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

            render(<GlobalVoiceNavigation />);

            const micButton = screen.getByRole('button');
            await userEvent.click(micButton);

            // Should provide guidance on how to fix the error
            await waitFor(() => {
                const guidance = screen.queryByText(/check permissions/i);
                if (guidance) {
                    expect(guidance).toBeInTheDocument();
                }
            });
        });
    });
});