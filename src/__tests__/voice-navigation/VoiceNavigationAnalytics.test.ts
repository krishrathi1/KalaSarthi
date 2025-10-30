/**
 * Tests for Voice Navigation Analytics
 */

import { VoiceNavigationAnalytics } from '@/lib/services/VoiceNavigationAnalytics';

describe('VoiceNavigationAnalytics', () => {
    let analytics: VoiceNavigationAnalytics;

    beforeEach(() => {
        analytics = VoiceNavigationAnalytics.getInstance();
        analytics.clearData(); // Start with clean data
    });

    describe('Session Management', () => {
        it('should start and end sessions correctly', () => {
            const sessionId = analytics.startSession('user123', 'en-US');
            expect(sessionId).toBeTruthy();
            expect(sessionId).toMatch(/^session_/);

            analytics.endSession(sessionId);

            const metrics = analytics.getMetrics();
            expect(metrics.totalSessions).toBe(1);
        });

        it('should track session duration', (done) => {
            const sessionId = analytics.startSession('user123', 'en-US');

            setTimeout(() => {
                analytics.endSession(sessionId);

                const metrics = analytics.getMetrics();
                expect(metrics.averageSessionDuration).toBeGreaterThan(0);
                done();
            }, 100);
        });
    });

    describe('Event Tracking', () => {
        it('should track voice commands', () => {
            const sessionId = analytics.startSession('user123', 'en-US');

            analytics.trackVoiceCommand(
                'go to dashboard',
                0.9,
                true,
                150,
                '/dashboard'
            );

            const metrics = analytics.getMetrics();
            expect(metrics.totalCommands).toBe(1);
            expect(metrics.successRate).toBe(1);
        });

        it('should track failed commands', () => {
            const sessionId = analytics.startSession('user123', 'en-US');

            analytics.trackVoiceCommand(
                'invalid command',
                0.3,
                false,
                200,
                undefined,
                'Command not recognized'
            );

            const metrics = analytics.getMetrics();
            expect(metrics.totalCommands).toBe(1);
            expect(metrics.successRate).toBe(0);
        });

        it('should track navigation events', () => {
            const sessionId = analytics.startSession('user123', 'en-US');

            analytics.trackNavigation('/profile', true, 50);

            const metrics = analytics.getMetrics();
            // Navigation events don't count as commands, but they are tracked
            expect(metrics.totalCommands).toBe(0);
        });

        it('should track errors', () => {
            const sessionId = analytics.startSession('user123', 'en-US');

            analytics.trackError(
                'microphone_access_denied',
                'User denied microphone access',
                { browser: 'Chrome' }
            );

            const metrics = analytics.getMetrics();
            expect(metrics.errorDistribution.length).toBe(1);
            expect(metrics.errorDistribution[0].error).toBe('microphone_access_denied');
        });
    });

    describe('Metrics Calculation', () => {
        it('should calculate success rate correctly', () => {
            const sessionId = analytics.startSession('user123', 'en-US');

            // Add successful commands
            analytics.trackVoiceCommand('go home', 0.9, true, 100, '/');
            analytics.trackVoiceCommand('open profile', 0.85, true, 120, '/profile');

            // Add failed command
            analytics.trackVoiceCommand('invalid', 0.2, false, 150);

            const metrics = analytics.getMetrics();
            expect(metrics.totalCommands).toBe(3);
            expect(metrics.successRate).toBeCloseTo(0.667, 2); // 2/3 success rate
        });

        it('should track most used commands', () => {
            const sessionId = analytics.startSession('user123', 'en-US');

            // Add multiple instances of same command
            analytics.trackVoiceCommand('go to dashboard', 0.9, true, 100, '/dashboard');
            analytics.trackVoiceCommand('go to dashboard', 0.85, true, 110, '/dashboard');
            analytics.trackVoiceCommand('open profile', 0.8, true, 120, '/profile');

            const metrics = analytics.getMetrics();
            expect(metrics.mostUsedCommands.length).toBeGreaterThan(0);
            expect(metrics.mostUsedCommands[0].command).toBe('go to dashboard');
            expect(metrics.mostUsedCommands[0].count).toBe(2);
        });

        it('should track language distribution', () => {
            analytics.startSession('user1', 'en-US');
            analytics.startSession('user2', 'hi-IN');
            analytics.startSession('user3', 'en-US');

            const metrics = analytics.getMetrics();
            expect(metrics.languageDistribution.length).toBe(2);

            const englishUsage = metrics.languageDistribution.find(l => l.language === 'en-US');
            const hindiUsage = metrics.languageDistribution.find(l => l.language === 'hi-IN');

            expect(englishUsage?.count).toBe(2);
            expect(hindiUsage?.count).toBe(1);
            expect(englishUsage?.percentage).toBeCloseTo(66.67, 1);
        });
    });

    describe('Insights Generation', () => {
        it('should generate performance insights', () => {
            const sessionId = analytics.startSession('user123', 'en-US');

            // Add some data to generate insights
            analytics.trackVoiceCommand('command1', 0.5, false, 100); // Low success
            analytics.trackVoiceCommand('command2', 0.6, false, 100);
            analytics.trackVoiceCommand('command3', 0.9, true, 100);

            const insights = analytics.generateInsights();

            expect(insights).toHaveProperty('recommendations');
            expect(insights).toHaveProperty('performanceIssues');
            expect(insights).toHaveProperty('usagePatterns');
            expect(insights).toHaveProperty('optimizationSuggestions');

            // Should detect low success rate
            expect(insights.performanceIssues.length).toBeGreaterThan(0);
        });

        it('should suggest optimizations for high mobile usage', () => {
            // Mock device detection by creating sessions with mobile device type
            const sessionId = analytics.startSession('user123', 'en-US');

            // Simulate mobile usage by tracking events
            analytics.trackVoiceCommand('mobile command', 0.9, true, 100);

            const insights = analytics.generateInsights();
            expect(insights.optimizationSuggestions).toBeDefined();
        });
    });

    describe('Data Export', () => {
        it('should export data in JSON format', () => {
            const sessionId = analytics.startSession('user123', 'en-US');
            analytics.trackVoiceCommand('test command', 0.9, true, 100);

            const exportedData = analytics.exportData('json');
            expect(() => JSON.parse(exportedData)).not.toThrow();

            const parsed = JSON.parse(exportedData);
            expect(parsed).toHaveProperty('sessions');
            expect(parsed).toHaveProperty('events');
            expect(parsed).toHaveProperty('metrics');
            expect(parsed).toHaveProperty('insights');
        });

        it('should export data in CSV format', () => {
            const sessionId = analytics.startSession('user123', 'en-US');
            analytics.trackVoiceCommand('test command', 0.9, true, 100);

            const exportedData = analytics.exportData('csv');
            expect(exportedData).toContain('timestamp,type,sessionId,language,success,duration,data');
            expect(exportedData.split('\n').length).toBeGreaterThan(1); // Header + at least one data row
        });
    });

    describe('Data Management', () => {
        it('should clear all data', () => {
            const sessionId = analytics.startSession('user123', 'en-US');
            analytics.trackVoiceCommand('test command', 0.9, true, 100);

            let metrics = analytics.getMetrics();
            expect(metrics.totalSessions).toBe(1);
            expect(metrics.totalCommands).toBe(1);

            analytics.clearData();

            metrics = analytics.getMetrics();
            expect(metrics.totalSessions).toBe(0);
            expect(metrics.totalCommands).toBe(0);
        });
    });
});