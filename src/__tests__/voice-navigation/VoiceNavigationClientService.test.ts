/**
 * Tests for Voice Navigation Client Service
 */

import { VoiceNavigationClientService } from '@/lib/services/client/VoiceNavigationClientService';

describe('VoiceNavigationClientService', () => {
    let service: VoiceNavigationClientService;

    beforeEach(async () => {
        service = VoiceNavigationClientService.getInstance();
        await service.initialize();
    });

    describe('Voice Command Processing', () => {
        it('should recognize "product creator" commands correctly', async () => {
            const testCases = [
                'I want to go to product creator',
                'go to product creator',
                'product creator',
                'create product',
                'open creator'
            ];

            for (const input of testCases) {
                const result = await service.processMultilingualVoiceInput(input);

                expect(result.success).toBe(true);
                expect(result.intent?.intent).toBe('navigate_product_creator');
                expect(result.intent?.targetRoute).toBe('/smart-product-creator');
                expect(result.intent?.confidence).toBeGreaterThan(0.6);
            }
        });

        it('should recognize dashboard commands correctly', async () => {
            const testCases = [
                'go to dashboard',
                'dashboard',
                'open dashboard',
                'show dashboard'
            ];

            for (const input of testCases) {
                const result = await service.processMultilingualVoiceInput(input);

                expect(result.success).toBe(true);
                expect(result.intent?.intent).toBe('navigate_dashboard');
                expect(result.intent?.targetRoute).toBe('/dashboard');
                expect(result.intent?.confidence).toBeGreaterThan(0.6);
            }
        });

        it('should recognize marketplace commands correctly', async () => {
            const testCases = [
                'go to marketplace',
                'marketplace',
                'show marketplace',
                'market'
            ];

            for (const input of testCases) {
                const result = await service.processMultilingualVoiceInput(input);

                expect(result.success).toBe(true);
                expect(result.intent?.intent).toBe('navigate_marketplace');
                expect(result.intent?.targetRoute).toBe('/marketplace');
                expect(result.intent?.confidence).toBeGreaterThan(0.6);
            }
        });

        it('should handle unrecognized commands gracefully', async () => {
            const result = await service.processMultilingualVoiceInput('xyz random nonsense');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Intent not recognized');
            expect(result.feedback).toContain('didn\'t understand');
        });

        it('should provide helpful feedback for unrecognized commands', async () => {
            const result = await service.processMultilingualVoiceInput('blah blah blah');

            expect(result.success).toBe(false);
            expect(result.feedback).toContain('Try saying "go to dashboard" or "open product creator"');
        });

        it('should handle case insensitive input', async () => {
            const result = await service.processMultilingualVoiceInput('GO TO PRODUCT CREATOR');

            expect(result.success).toBe(true);
            expect(result.intent?.intent).toBe('navigate_product_creator');
            expect(result.intent?.targetRoute).toBe('/smart-product-creator');
        });

        it('should handle extra whitespace', async () => {
            const result = await service.processMultilingualVoiceInput('  go   to   product   creator  ');

            expect(result.success).toBe(true);
            expect(result.intent?.intent).toBe('navigate_product_creator');
            expect(result.intent?.targetRoute).toBe('/smart-product-creator');
        });

        it('should distinguish between similar commands', async () => {
            // Test that "product creator" doesn't match "dashboard"
            const productResult = await service.processMultilingualVoiceInput('product creator');
            expect(productResult.intent?.intent).toBe('navigate_product_creator');

            // Test that "dashboard" doesn't match "product creator"
            const dashboardResult = await service.processMultilingualVoiceInput('dashboard');
            expect(dashboardResult.intent?.intent).toBe('navigate_dashboard');
        });
    });

    describe('Performance', () => {
        it('should process commands quickly', async () => {
            const start = performance.now();
            await service.processMultilingualVoiceInput('go to product creator');
            const end = performance.now();

            expect(end - start).toBeLessThan(100); // Should complete in under 100ms
        });

        it('should return execution time in result', async () => {
            const result = await service.processMultilingualVoiceInput('go to dashboard');

            expect(result.executionTime).toBeGreaterThan(0);
            expect(result.executionTime).toBeLessThan(1000); // Should be reasonable
        });
        it('should handle empty or invalid input gracefully', async () => {
            const testCases = ['', '   ', null as any, undefined as any];

            for (const input of testCases) {
                const result = await service.processMultilingualVoiceInput(input);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Empty or invalid voice input');
                expect(result.feedback).toContain('No voice input received');
            }
        });
    });
});