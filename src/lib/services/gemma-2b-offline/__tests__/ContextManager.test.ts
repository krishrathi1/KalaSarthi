/**
 * Unit tests for ContextManager component
 * Tests conversation context management, language detection, and prompt building
 */

import {
    ContextManager,
    createContextManager,
    getContextManager,
    resetContextManager,
    isValidLanguage,
    isValidDomain,
    getSupportedLanguages,
    getArtisanDomains,
    extractKeywords,
    calculateSimilarity
} from '../ContextManager';

import {
    SupportedLanguage,
    ArtisanDomain
} from '../../../types/gemma-2b-offline';

describe('ContextManager', () => {
    let contextManager: ContextManager;

    beforeEach(() => {
        contextManager = new ContextManager();
    });

    afterEach(() => {
        resetContextManager();
    });

    describe('initialization', () => {
        it('should initialize with empty context', () => {
            const context = contextManager.getContext();

            expect(context.messages).toHaveLength(0);
            expect(context.language).toBe(SupportedLanguage.ENGLISH);
            expect(context.maxContextLength).toBeGreaterThan(0);
        });

        it('should initialize with default settings', () => {
            const stats = contextManager.getContextStats();

            expect(stats.messageCount).toBe(0);
            expect(stats.estimatedTokens).toBeGreaterThan(0); // System prompt tokens
            expect(stats.language).toBe(SupportedLanguage.ENGLISH);
        });
    });

    describe('language detection', () => {
        it('should detect English text', () => {
            const englishTexts = [
                'How should I price my pottery?',
                'What is the best clay for beginners?',
                'I need help with my business'
            ];

            englishTexts.forEach(text => {
                const language = contextManager.detectLanguage(text);
                expect(language).toBe(SupportedLanguage.ENGLISH);
            });
        });

        it('should detect Hindi text', () => {
            const hindiTexts = [
                'मेरे हस्तशिल्प का मूल्य कैसे तय करूं?',
                'मिट्टी के बर्तन बनाने की तकनीक क्या है?',
                'व्यापार में मदद चाहिए'
            ];

            hindiTexts.forEach(text => {
                const language = contextManager.detectLanguage(text);
                expect(language).toBe(SupportedLanguage.HINDI);
            });
        });

        it('should default to English for mixed or unclear text', () => {
            const unclearTexts = [
                '123456',
                '!@#$%^&*()',
                ''
            ];

            unclearTexts.forEach(text => {
                const language = contextManager.detectLanguage(text);
                expect(language).toBe(SupportedLanguage.ENGLISH);
            });

            // Mixed text with Hindi should be detected as Hindi
            const mixedText = 'hello मदद';
            expect(contextManager.detectLanguage(mixedText)).toBe(SupportedLanguage.HINDI);
        });
    });

    describe('artisan domain detection', () => {
        it('should detect pottery domain', () => {
            const potteryMessages = [
                'How to work with clay?',
                'Best kiln temperature for pottery',
                'मिट्टी के बर्तन कैसे बनाएं?'
            ];

            potteryMessages.forEach(message => {
                const prompt = contextManager.buildPrompt(message);
                // Check for pottery-related content in appropriate language
                const hasPotteryContent = prompt.includes('pottery') ||
                    prompt.includes('ceramics') ||
                    prompt.includes('मिट्टी के बर्तन') ||
                    prompt.includes('सिरेमिक');
                expect(hasPotteryContent).toBe(true);
            });
        });

        it('should detect textile domain', () => {
            const textileMessages = [
                'How to weave silk fabric?',
                'Embroidery techniques for beginners',
                'कपड़े की बुनाई कैसे करें?'
            ];

            textileMessages.forEach(message => {
                const prompt = contextManager.buildPrompt(message);
                // Check for textile-related content in appropriate language
                const hasTextileContent = prompt.includes('textile') ||
                    prompt.includes('fabric') ||
                    prompt.includes('weaving') ||
                    prompt.includes('कपड़ा') ||
                    prompt.includes('वस्त्र');
                expect(hasTextileContent).toBe(true);
            });
        });

        it('should default to general domain for unclear messages', () => {
            const generalMessages = [
                'Hello',
                'I need help',
                'What should I do?'
            ];

            generalMessages.forEach(message => {
                const prompt = contextManager.buildPrompt(message);
                // For general domain, check that it doesn't contain specific domain keywords
                const hasSpecificDomain = prompt.includes('pottery') ||
                    prompt.includes('textile') ||
                    prompt.includes('woodwork') ||
                    prompt.includes('metalwork');
                expect(hasSpecificDomain).toBe(false);

                // Should contain general artisan guidance
                const hasGeneralContent = prompt.includes('AI assistant') ||
                    prompt.includes('Indian artisans') ||
                    prompt.includes('craft');
                expect(hasGeneralContent).toBe(true);
            });
        });
    });

    describe('prompt building', () => {
        it('should build basic prompt with system context', () => {
            const message = 'How should I price my products?';
            const prompt = contextManager.buildPrompt(message);

            expect(prompt).toContain('AI assistant');
            expect(prompt).toContain('Indian artisans');
            expect(prompt).toContain(message);
            expect(prompt).toContain('Assistant:');
        });

        it('should include conversation history in prompt', () => {
            // Add some conversation history
            contextManager.updateContext('Hello', 'Hi! How can I help you today?');
            contextManager.updateContext('I make pottery', 'That\'s wonderful! What would you like to know about pottery?');

            const message = 'How should I price my pots?';
            const prompt = contextManager.buildPrompt(message);

            expect(prompt).toContain('Previous conversation:');
            expect(prompt).toContain('Hello');
            expect(prompt).toContain('I make pottery');
        });

        it('should use appropriate language in system prompt', () => {
            const englishMessage = 'How to price pottery?';
            const englishPrompt = contextManager.buildPrompt(englishMessage);
            expect(englishPrompt).toContain('AI assistant');

            const hindiMessage = 'मिट्टी के बर्तन का मूल्य कैसे तय करें?';
            const hindiPrompt = contextManager.buildPrompt(hindiMessage);
            expect(hindiPrompt).toContain('AI सहायक');
        });
    });

    describe('context management', () => {
        it('should update context with new messages', () => {
            const userMessage = 'Hello';
            const assistantResponse = 'Hi there!';

            contextManager.updateContext(userMessage, assistantResponse);

            const context = contextManager.getContext();
            expect(context.messages).toHaveLength(2);
            expect(context.messages[0].role).toBe('user');
            expect(context.messages[0].content).toBe(userMessage);
            expect(context.messages[1].role).toBe('assistant');
            expect(context.messages[1].content).toBe(assistantResponse);
        });

        it('should maintain context window size', () => {
            // Add many messages to test trimming
            for (let i = 0; i < 20; i++) {
                contextManager.updateContext(`Message ${i}`, `Response ${i}`);
            }

            const context = contextManager.getContext();
            expect(context.messages.length).toBeLessThanOrEqual(20); // Should be trimmed
        });

        it('should clear context when requested', () => {
            contextManager.updateContext('Hello', 'Hi!');
            expect(contextManager.getContext().messages).toHaveLength(2);

            contextManager.clearContext();
            expect(contextManager.getContext().messages).toHaveLength(0);
        });

        it('should track context statistics', () => {
            contextManager.updateContext('Hello world', 'Hi there!');

            const stats = contextManager.getContextStats();
            expect(stats.messageCount).toBe(2);
            expect(stats.estimatedTokens).toBeGreaterThan(0);
            expect(stats.language).toBe(SupportedLanguage.ENGLISH);
        });
    });

    describe('system prompts', () => {
        it('should return English system prompt', () => {
            const prompt = contextManager.getArtisanSystemPrompt(SupportedLanguage.ENGLISH);
            expect(prompt).toContain('AI assistant');
            expect(prompt).toContain('Indian artisans');
        });

        it('should return Hindi system prompt', () => {
            const prompt = contextManager.getArtisanSystemPrompt(SupportedLanguage.HINDI);
            expect(prompt).toContain('AI सहायक');
            expect(prompt).toContain('भारतीय कारीगरों');
        });

        it('should enhance prompt with domain context', () => {
            const potteryPrompt = contextManager.getArtisanSystemPrompt(
                SupportedLanguage.ENGLISH,
                ArtisanDomain.POTTERY
            );
            expect(potteryPrompt).toContain('pottery');
            expect(potteryPrompt).toContain('ceramics');
        });
    });

    describe('configuration', () => {
        it('should allow setting max context length', () => {
            const newLength = 1000;
            contextManager.setMaxContextLength(newLength);

            const context = contextManager.getContext();
            expect(context.maxContextLength).toBe(newLength);
        });

        it('should trim context when max length is reduced', () => {
            // Add several messages
            for (let i = 0; i < 10; i++) {
                contextManager.updateContext(`Long message ${i}`, `Long response ${i}`);
            }

            // Set very small context length
            contextManager.setMaxContextLength(100);

            const context = contextManager.getContext();
            expect(context.messages.length).toBeLessThan(20); // Should be trimmed
        });
    });
});

describe('ContextManager Factory Functions', () => {
    afterEach(() => {
        resetContextManager();
    });

    describe('createContextManager', () => {
        it('should create new instance', () => {
            const manager = createContextManager();
            expect(manager).toBeInstanceOf(ContextManager);
        });

        it('should create independent instances', () => {
            const manager1 = createContextManager();
            const manager2 = createContextManager();

            manager1.updateContext('Hello', 'Hi');
            expect(manager1.getContext().messages).toHaveLength(2);
            expect(manager2.getContext().messages).toHaveLength(0);
        });
    });

    describe('getContextManager', () => {
        it('should return singleton instance', () => {
            const manager1 = getContextManager();
            const manager2 = getContextManager();

            expect(manager1).toBe(manager2);
        });

        it('should maintain state across calls', () => {
            const manager1 = getContextManager();
            manager1.updateContext('Hello', 'Hi');

            const manager2 = getContextManager();
            expect(manager2.getContext().messages).toHaveLength(2);
        });
    });

    describe('resetContextManager', () => {
        it('should reset singleton instance', () => {
            const manager1 = getContextManager();
            manager1.updateContext('Hello', 'Hi');

            resetContextManager();

            const manager2 = getContextManager();
            expect(manager2.getContext().messages).toHaveLength(0);
        });
    });
});

describe('Utility Functions', () => {
    describe('isValidLanguage', () => {
        it('should validate supported languages', () => {
            expect(isValidLanguage('en')).toBe(true);
            expect(isValidLanguage('hi')).toBe(true);
            expect(isValidLanguage('fr')).toBe(false);
            expect(isValidLanguage('')).toBe(false);
        });
    });

    describe('isValidDomain', () => {
        it('should validate artisan domains', () => {
            expect(isValidDomain('pottery')).toBe(true);
            expect(isValidDomain('textiles')).toBe(true);
            expect(isValidDomain('invalid')).toBe(false);
            expect(isValidDomain('')).toBe(false);
        });
    });

    describe('getSupportedLanguages', () => {
        it('should return array of supported languages', () => {
            const languages = getSupportedLanguages();
            expect(Array.isArray(languages)).toBe(true);
            expect(languages).toContain(SupportedLanguage.ENGLISH);
            expect(languages).toContain(SupportedLanguage.HINDI);
        });
    });

    describe('getArtisanDomains', () => {
        it('should return array of artisan domains', () => {
            const domains = getArtisanDomains();
            expect(Array.isArray(domains)).toBe(true);
            expect(domains).toContain(ArtisanDomain.POTTERY);
            expect(domains).toContain(ArtisanDomain.TEXTILES);
        });
    });

    describe('extractKeywords', () => {
        it('should extract meaningful keywords', () => {
            const text = 'How to make pottery with clay and water';
            const keywords = extractKeywords(text);

            expect(keywords).toContain('pottery');
            expect(keywords).toContain('clay');
            expect(keywords).toContain('water');
            expect(keywords).not.toContain('to');
            expect(keywords).not.toContain('and');
        });

        it('should handle empty or short text', () => {
            expect(extractKeywords('')).toEqual([]);
            expect(extractKeywords('a b')).toEqual([]);
            expect(extractKeywords('hello world')).toEqual(['hello', 'world']);
        });
    });

    describe('calculateSimilarity', () => {
        it('should calculate text similarity correctly', () => {
            const text1 = 'pottery clay ceramic';
            const text2 = 'clay pottery wheel';

            const similarity = calculateSimilarity(text1, text2);
            expect(similarity).toBeGreaterThan(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });

        it('should return 0 for completely different texts', () => {
            const similarity = calculateSimilarity('pottery clay', 'software programming');
            expect(similarity).toBe(0);
        });

        it('should return 1 for identical texts', () => {
            const text = 'pottery clay ceramic';
            const similarity = calculateSimilarity(text, text);
            expect(similarity).toBe(1);
        });
    });
});