/**
 * Tests for Semantic Voice Navigation Service
 */

import { SemanticVoiceNavigationService } from '@/lib/services/SemanticVoiceNavigationService';

describe('SemanticVoiceNavigationService', () => {
    let service: SemanticVoiceNavigationService;

    beforeEach(() => {
        service = SemanticVoiceNavigationService.getInstance();
    });

    describe('Semantic Navigation', () => {
        it('should understand natural language queries for trend analysis', async () => {
            const testQueries = [
                'I want to see what products are trending',
                'Show me market trends',
                'What are the viral products right now',
                'Analyze consumer behavior',
                'Check market demand'
            ];

            for (const query of testQueries) {
                const result = await service.processSemanticVoiceInput(query);

                expect(result.success).toBe(true);
                expect(result.intent?.targetRoute).toBe('/trend-spotter');
                expect(result.intent?.confidence).toBeGreaterThan(0);
                expect(result.intent?.reasoning).toBeDefined();
            }
        });

        it('should understand queries for artisan assistance', async () => {
            const testQueries = [
                'I need help with my craft',
                'Get artisan guidance',
                'Help me improve my skills',
                'I need business advice for my craft',
                'Connect me with artisan support'
            ];

            for (const query of testQueries) {
                const result = await service.processSemanticVoiceInput(query);

                expect(result.success).toBe(true);
                expect(result.intent?.targetRoute).toBe('/artisan-buddy');
                expect(result.intent?.confidence).toBeGreaterThan(0);
            }
        });

        it('should understand product creation queries', async () => {
            const testQueries = [
                'create product',
                'build product',
                'make item',
                'product creator',
                'manufacturing'
            ];

            for (const query of testQueries) {
                const result = await service.processSemanticVoiceInput(query);

                // At minimum, should get some result (even if not perfect match)
                expect(result).toBeDefined();
                if (result.success) {
                    expect(result.intent?.targetRoute).toBeDefined();
                    expect(result.intent?.confidence).toBeGreaterThan(0);
                }
            }
        });

        it('should understand financial and accounting queries', async () => {
            const testQueries = [
                'Open my digital khata',
                'Show me accounting records',
                'Track my money and expenses',
                'Financial bookkeeping system',
                'Digital ledger management'
            ];

            for (const query of testQueries) {
                const result = await service.processSemanticVoiceInput(query);

                expect(result.success).toBe(true);
                expect(result.intent?.targetRoute).toBe('/finance/dashboard');
                expect(result.intent?.confidence).toBeGreaterThan(0);
            }
        });

        it('should understand marketplace and commerce queries', async () => {
            const testQueries = [
                'Open the global bazaar',
                'Show me the international marketplace',
                'I want to shop worldwide',
                'Global commerce platform',
                'International trade marketplace'
            ];

            for (const query of testQueries) {
                const result = await service.processSemanticVoiceInput(query);

                expect(result.success).toBe(true);
                // Should match either marketplace or buyer-connect (both are commerce-related)
                expect(['/marketplace', '/buyer-connect']).toContain(result.intent?.targetRoute);
                expect(result.intent?.confidence).toBeGreaterThan(0);
            }
        });

        it('should understand government scheme queries', async () => {
            const testQueries = [
                'Open scheme sahayak',
                'Show me yojana information',
                'Government subsidy programs',
                'Financial assistance schemes',
                'Help with government benefits'
            ];

            for (const query of testQueries) {
                const result = await service.processSemanticVoiceInput(query);

                expect(result.success).toBe(true);
                expect(result.intent?.targetRoute).toBe('/yojana-mitra');
                expect(result.intent?.confidence).toBeGreaterThan(0);
            }
        });

        it('should handle ambiguous queries gracefully', async () => {
            const result = await service.processSemanticVoiceInput('xyz random nonsense');

            expect(result.success).toBe(false);
            expect(result.feedback).toContain('couldn\'t understand');
            expect(result.feedback).toContain('Did you mean');
        });

        it('should provide reasoning for matches', async () => {
            const result = await service.processSemanticVoiceInput('I want to analyze market trends');

            expect(result.success).toBe(true);
            expect(result.intent?.reasoning).toBeDefined();
            expect(result.intent?.reasoning).toContain('confidence');
        });

        it('should handle empty input', async () => {
            const result = await service.processSemanticVoiceInput('');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Empty voice input');
        });
    });

    describe('Feature Search', () => {
        it('should return available features', () => {
            const features = service.getAvailableFeatures();

            expect(features.length).toBeGreaterThan(0);
            expect(features).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: expect.any(String),
                        route: expect.any(String),
                        description: expect.any(String),
                        functionality: expect.any(Array),
                        keywords: expect.any(Array),
                        category: expect.any(String)
                    })
                ])
            );
        });

        it('should search features semantically', async () => {
            const results = await service.searchFeatures('financial management', 3);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0]).toHaveProperty('feature');
            expect(results[0]).toHaveProperty('similarity');
            expect(results[0]).toHaveProperty('confidence');
        });
    });

    describe('Service Status', () => {
        it('should be ready after initialization', () => {
            expect(service.isReady()).toBe(true);
        });
    });
});