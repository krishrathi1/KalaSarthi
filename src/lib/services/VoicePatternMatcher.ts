/**
 * Voice Pattern Matcher
 * Handles language-specific voice patterns, cultural variations, and intent matching
 */

import { MultilingualVoiceService } from './MultilingualVoiceService';

export interface VoicePattern {
    pattern: string;
    intent: string;
    confidence: number;
    language: string;
    culturalContext?: string;
    variations: string[];
    parameters?: Record<string, any>;
}

export interface PatternMatchResult {
    matched: boolean;
    intent?: string;
    confidence: number;
    language: string;
    parameters: Record<string, any>;
    culturalVariation?: string;
    alternativeMatches: Array<{
        intent: string;
        confidence: number;
        pattern: string;
    }>;
}

export interface CulturalVoicePatterns {
    [language: string]: {
        formalPatterns: VoicePattern[];
        informalPatterns: VoicePattern[];
        respectfulPatterns: VoicePattern[];
        directPatterns: VoicePattern[];
        regionalVariations: Record<string, VoicePattern[]>;
    };
}

export class VoicePatternMatcher {
    private static instance: VoicePatternMatcher;
    private multilingualService: MultilingualVoiceService;
    private culturalPatterns: CulturalVoicePatterns;
    private patternCache: Map<string, PatternMatchResult> = new Map();

    private constructor() {
        this.multilingualService = MultilingualVoiceService.getInstance();
        this.culturalPatterns = this.initializeCulturalPatterns();
    }

    public static getInstance(): VoicePatternMatcher {
        if (!VoicePatternMatcher.instance) {
            VoicePatternMatcher.instance = new VoicePatternMatcher();
        }
        return VoicePatternMatcher.instance;
    }

    /**
     * Initialize comprehensive cultural voice patterns for all supported languages
     */
    private initializeCulturalPatterns(): CulturalVoicePatterns {
        return {
            'en-US': {
                formalPatterns: [
                    {
                        pattern: 'please navigate to {destination}',
                        intent: 'navigate',
                        confidence: 0.9,
                        language: 'en-US',
                        culturalContext: 'formal',
                        variations: ['please go to {destination}', 'could you take me to {destination}', 'would you please open {destination}']
                    },
                    {
                        pattern: 'i would like to access {destination}',
                        intent: 'navigate',
                        confidence: 0.85,
                        language: 'en-US',
                        culturalContext: 'formal',
                        variations: ['i need to access {destination}', 'may i access {destination}']
                    }
                ],
                informalPatterns: [
                    {
                        pattern: 'go to {destination}',
                        intent: 'navigate',
                        confidence: 0.95,
                        language: 'en-US',
                        culturalContext: 'informal',
                        variations: ['take me to {destination}', 'open {destination}', 'show me {destination}']
                    },
                    {
                        pattern: 'let me see {destination}',
                        intent: 'navigate',
                        confidence: 0.8,
                        language: 'en-US',
                        culturalContext: 'informal',
                        variations: ['show {destination}', 'display {destination}']
                    }
                ],
                respectfulPatterns: [
                    {
                        pattern: 'if you don\'t mind, please show {destination}',
                        intent: 'navigate',
                        confidence: 0.85,
                        language: 'en-US',
                        culturalContext: 'respectful',
                        variations: ['if possible, please open {destination}', 'when convenient, show {destination}']
                    }
                ],
                directPatterns: [
                    {
                        pattern: '{destination}',
                        intent: 'navigate',
                        confidence: 0.7,
                        language: 'en-US',
                        culturalContext: 'direct',
                        variations: ['{destination} now', 'open {destination} immediately']
                    }
                ],
                regionalVariations: {
                    'american': [
                        {
                            pattern: 'can you pull up {destination}',
                            intent: 'navigate',
                            confidence: 0.8,
                            language: 'en-US',
                            variations: ['pull up {destination}', 'bring up {destination}']
                        }
                    ],
                    'british': [
                        {
                            pattern: 'could you bring up {destination}',
                            intent: 'navigate',
                            confidence: 0.8,
                            language: 'en-US',
                            variations: ['would you mind showing {destination}']
                        }
                    ]
                }
            },
            'hi-IN': {
                formalPatterns: [
                    {
                        pattern: 'कृपया {destination} पर जाएं',
                        intent: 'navigate',
                        confidence: 0.9,
                        language: 'hi-IN',
                        culturalContext: 'formal',
                        variations: ['कृपया {destination} खोलें', 'कृपया मुझे {destination} दिखाएं', '{destination} पर ले चलिए']
                    },
                    {
                        pattern: 'आप {destination} खोल सकते हैं',
                        intent: 'navigate',
                        confidence: 0.85,
                        language: 'hi-IN',
                        culturalContext: 'formal',
                        variations: ['क्या आप {destination} दिखा सकते हैं', 'मैं {destination} देखना चाहता हूं']
                    }
                ],
                informalPatterns: [
                    {
                        pattern: '{destination} खोलो',
                        intent: 'navigate',
                        confidence: 0.95,
                        language: 'hi-IN',
                        culturalContext: 'informal',
                        variations: ['{destination} दिखाओ', '{destination} ले चलो', '{destination} पर जाओ']
                    },
                    {
                        pattern: '{destination} देखना है',
                        intent: 'navigate',
                        confidence: 0.8,
                        language: 'hi-IN',
                        culturalContext: 'informal',
                        variations: ['{destination} चाहिए', 'मुझे {destination} चाहिए']
                    }
                ],
                respectfulPatterns: [
                    {
                        pattern: 'यदि आप कृपा करें तो {destination} दिखाएं',
                        intent: 'navigate',
                        confidence: 0.85,
                        language: 'hi-IN',
                        culturalContext: 'respectful',
                        variations: ['अगर संभव हो तो {destination} खोलें', 'कृपया {destination} की कृपा करें']
                    }
                ],
                directPatterns: [
                    {
                        pattern: '{destination}',
                        intent: 'navigate',
                        confidence: 0.7,
                        language: 'hi-IN',
                        culturalContext: 'direct',
                        variations: ['{destination} अभी', '{destination} तुरंत']
                    }
                ],
                regionalVariations: {
                    'delhi': [
                        {
                            pattern: '{destination} वाला खोलो',
                            intent: 'navigate',
                            confidence: 0.8,
                            language: 'hi-IN',
                            variations: ['{destination} वाला दिखाओ']
                        }
                    ],
                    'mumbai': [
                        {
                            pattern: '{destination} का दिखाओ',
                            intent: 'navigate',
                            confidence: 0.8,
                            language: 'hi-IN',
                            variations: ['{destination} का खोलो']
                        }
                    ]
                }
            },
            'ta-IN': {
                formalPatterns: [
                    {
                        pattern: 'தயவுசெய்து {destination} க்கு செல்லுங்கள்',
                        intent: 'navigate',
                        confidence: 0.9,
                        language: 'ta-IN',
                        culturalContext: 'formal',
                        variations: ['தயவுசெய்து {destination} ஐ திறக்கவும்', 'தயவுசெய்து {destination} ஐ காட்டுங்கள்']
                    },
                    {
                        pattern: 'நான் {destination} ஐ பார்க்க விரும்புகிறேன்',
                        intent: 'navigate',
                        confidence: 0.85,
                        language: 'ta-IN',
                        culturalContext: 'formal',
                        variations: ['எனக்கு {destination} தேவை', '{destination} ஐ அணுக விரும்புகிறேன்']
                    }
                ],
                informalPatterns: [
                    {
                        pattern: '{destination} க்கு போ',
                        intent: 'navigate',
                        confidence: 0.95,
                        language: 'ta-IN',
                        culturalContext: 'informal',
                        variations: ['{destination} ஐ திற', '{destination} ஐ காட்டு', '{destination} ஐ கொண்டு வா']
                    },
                    {
                        pattern: '{destination} வேணும்',
                        intent: 'navigate',
                        confidence: 0.8,
                        language: 'ta-IN',
                        culturalContext: 'informal',
                        variations: ['எனக்கு {destination} வேணும்', '{destination} கொடு']
                    }
                ],
                respectfulPatterns: [
                    {
                        pattern: 'முடிந்தால் {destination} ஐ காட்டுங்கள்',
                        intent: 'navigate',
                        confidence: 0.85,
                        language: 'ta-IN',
                        culturalContext: 'respectful',
                        variations: ['வசதியானபோது {destination} ஐ திறக்கவும்']
                    }
                ],
                directPatterns: [
                    {
                        pattern: '{destination}',
                        intent: 'navigate',
                        confidence: 0.7,
                        language: 'ta-IN',
                        culturalContext: 'direct',
                        variations: ['{destination} இப்போது', '{destination} உடனே']
                    }
                ],
                regionalVariations: {
                    'chennai': [
                        {
                            pattern: '{destination} ஐ போட்டு காட்டு',
                            intent: 'navigate',
                            confidence: 0.8,
                            language: 'ta-IN',
                            variations: ['{destination} ஐ போட்டு திற']
                        }
                    ],
                    'coimbatore': [
                        {
                            pattern: '{destination} ஐ கொண்டு வந்து காட்டு',
                            intent: 'navigate',
                            confidence: 0.8,
                            language: 'ta-IN',
                            variations: ['{destination} ஐ எடுத்து காட்டு']
                        }
                    ]
                }
            },
            'bn-IN': {
                formalPatterns: [
                    {
                        pattern: 'অনুগ্রহ করে {destination} এ যান',
                        intent: 'navigate',
                        confidence: 0.9,
                        language: 'bn-IN',
                        culturalContext: 'formal',
                        variations: ['অনুগ্রহ করে {destination} খুলুন', 'দয়া করে {destination} দেখান']
                    },
                    {
                        pattern: 'আমি {destination} দেখতে চাই',
                        intent: 'navigate',
                        confidence: 0.85,
                        language: 'bn-IN',
                        culturalContext: 'formal',
                        variations: ['আমার {destination} প্রয়োজন', '{destination} অ্যাক্সেস করতে চাই']
                    }
                ],
                informalPatterns: [
                    {
                        pattern: '{destination} এ যাও',
                        intent: 'navigate',
                        confidence: 0.95,
                        language: 'bn-IN',
                        culturalContext: 'informal',
                        variations: ['{destination} খোলো', '{destination} দেখাও', '{destination} নিয়ে চলো']
                    },
                    {
                        pattern: '{destination} লাগবে',
                        intent: 'navigate',
                        confidence: 0.8,
                        language: 'bn-IN',
                        culturalContext: 'informal',
                        variations: ['আমার {destination} লাগবে', '{destination} দাও']
                    }
                ],
                respectfulPatterns: [
                    {
                        pattern: 'সম্ভব হলে {destination} দেখান',
                        intent: 'navigate',
                        confidence: 0.85,
                        language: 'bn-IN',
                        culturalContext: 'respectful',
                        variations: ['সুবিধা হলে {destination} খুলুন']
                    }
                ],
                directPatterns: [
                    {
                        pattern: '{destination}',
                        intent: 'navigate',
                        confidence: 0.7,
                        language: 'bn-IN',
                        culturalContext: 'direct',
                        variations: ['{destination} এখনই', '{destination} তাড়াতাড়ি']
                    }
                ],
                regionalVariations: {
                    'kolkata': [
                        {
                            pattern: '{destination} টা খোলো',
                            intent: 'navigate',
                            confidence: 0.8,
                            language: 'bn-IN',
                            variations: ['{destination} টা দেখাও']
                        }
                    ],
                    'dhaka': [
                        {
                            pattern: '{destination} এর দেখাও',
                            intent: 'navigate',
                            confidence: 0.8,
                            language: 'bn-IN',
                            variations: ['{destination} এর খোলো']
                        }
                    ]
                }
            },
            'te-IN': {
                formalPatterns: [
                    {
                        pattern: 'దయచేసి {destination} కు వెళ్లండి',
                        intent: 'navigate',
                        confidence: 0.9,
                        language: 'te-IN',
                        culturalContext: 'formal',
                        variations: ['దయచేసి {destination} ను తెరవండి', 'దయచేసి {destination} ను చూపించండి']
                    },
                    {
                        pattern: 'నేను {destination} ను చూడాలనుకుంటున్నాను',
                        intent: 'navigate',
                        confidence: 0.85,
                        language: 'te-IN',
                        culturalContext: 'formal',
                        variations: ['నాకు {destination} అవసరం', '{destination} ను యాక్సెస్ చేయాలనుకుంటున్నాను']
                    }
                ],
                informalPatterns: [
                    {
                        pattern: '{destination} కు వెళ్లు',
                        intent: 'navigate',
                        confidence: 0.95,
                        language: 'te-IN',
                        culturalContext: 'informal',
                        variations: ['{destination} ను తెరువు', '{destination} ను చూపించు', '{destination} ను తీసుకురా']
                    },
                    {
                        pattern: '{destination} కావాలి',
                        intent: 'navigate',
                        confidence: 0.8,
                        language: 'te-IN',
                        culturalContext: 'informal',
                        variations: ['నాకు {destination} కావాలి', '{destination} ఇవ్వు']
                    }
                ],
                respectfulPatterns: [
                    {
                        pattern: 'వీలైతే {destination} ను చూపించండి',
                        intent: 'navigate',
                        confidence: 0.85,
                        language: 'te-IN',
                        culturalContext: 'respectful',
                        variations: ['అనుకూలంగా ఉంటే {destination} ను తెరవండి']
                    }
                ],
                directPatterns: [
                    {
                        pattern: '{destination}',
                        intent: 'navigate',
                        confidence: 0.7,
                        language: 'te-IN',
                        culturalContext: 'direct',
                        variations: ['{destination} ఇప్పుడే', '{destination} వెంటనే']
                    }
                ],
                regionalVariations: {
                    'hyderabad': [
                        {
                            pattern: '{destination} ని తెరిచి చూపించు',
                            intent: 'navigate',
                            confidence: 0.8,
                            language: 'te-IN',
                            variations: ['{destination} ని తెరిచి ఇవ్వు']
                        }
                    ],
                    'vijayawada': [
                        {
                            pattern: '{destination} ని తీసుకొచ్చి చూపించు',
                            intent: 'navigate',
                            confidence: 0.8,
                            language: 'te-IN',
                            variations: ['{destination} ని తీసుకురా']
                        }
                    ]
                }
            }
        };
    }

    /**
     * Match user input against language-specific voice patterns
     */
    public matchPattern(
        userInput: string,
        language?: string,
        culturalContext?: string
    ): PatternMatchResult {
        const targetLanguage = language || this.multilingualService.getCurrentLanguage();
        const cacheKey = `${userInput}_${targetLanguage}_${culturalContext || 'all'}`;

        // Check cache first
        if (this.patternCache.has(cacheKey)) {
            return this.patternCache.get(cacheKey)!;
        }

        const result = this.performPatternMatching(userInput, targetLanguage, culturalContext);

        // Cache the result
        this.patternCache.set(cacheKey, result);

        return result;
    }

    /**
     * Perform actual pattern matching logic
     */
    private performPatternMatching(
        userInput: string,
        language: string,
        culturalContext?: string
    ): PatternMatchResult {
        const normalizedInput = this.normalizeInput(userInput, language);
        const languagePatterns = this.culturalPatterns[language];

        if (!languagePatterns) {
            return {
                matched: false,
                confidence: 0,
                language,
                parameters: {},
                alternativeMatches: []
            };
        }

        const allMatches: Array<{
            intent: string;
            confidence: number;
            pattern: string;
            parameters: Record<string, any>;
            culturalVariation?: string;
        }> = [];

        // Get patterns to check based on cultural context
        const patternsToCheck = this.getPatternsForContext(languagePatterns, culturalContext);

        // Check each pattern
        for (const pattern of patternsToCheck) {
            const match = this.matchSinglePattern(normalizedInput, pattern);
            if (match.matched) {
                allMatches.push({
                    intent: pattern.intent,
                    confidence: match.confidence,
                    pattern: pattern.pattern,
                    parameters: match.parameters,
                    culturalVariation: pattern.culturalContext
                });
            }
        }

        // Sort matches by confidence
        allMatches.sort((a, b) => b.confidence - a.confidence);

        if (allMatches.length === 0) {
            return {
                matched: false,
                confidence: 0,
                language,
                parameters: {},
                alternativeMatches: []
            };
        }

        const bestMatch = allMatches[0];
        const alternatives = allMatches.slice(1, 4).map(match => ({
            intent: match.intent,
            confidence: match.confidence,
            pattern: match.pattern
        }));

        return {
            matched: true,
            intent: bestMatch.intent,
            confidence: bestMatch.confidence,
            language,
            parameters: bestMatch.parameters,
            culturalVariation: bestMatch.culturalVariation,
            alternativeMatches: alternatives
        };
    }

    /**
     * Get patterns for specific cultural context
     */
    private getPatternsForContext(
        languagePatterns: CulturalVoicePatterns[string],
        culturalContext?: string
    ): VoicePattern[] {
        const allPatterns: VoicePattern[] = [];

        if (!culturalContext || culturalContext === 'all') {
            // Include all patterns
            allPatterns.push(
                ...languagePatterns.formalPatterns,
                ...languagePatterns.informalPatterns,
                ...languagePatterns.respectfulPatterns,
                ...languagePatterns.directPatterns
            );

            // Add regional variations
            Object.values(languagePatterns.regionalVariations).forEach(patterns => {
                allPatterns.push(...patterns);
            });
        } else {
            // Include specific context patterns
            switch (culturalContext) {
                case 'formal':
                    allPatterns.push(...languagePatterns.formalPatterns);
                    break;
                case 'informal':
                    allPatterns.push(...languagePatterns.informalPatterns);
                    break;
                case 'respectful':
                    allPatterns.push(...languagePatterns.respectfulPatterns);
                    break;
                case 'direct':
                    allPatterns.push(...languagePatterns.directPatterns);
                    break;
                default:
                    // Check if it's a regional variation
                    if (languagePatterns.regionalVariations[culturalContext]) {
                        allPatterns.push(...languagePatterns.regionalVariations[culturalContext]);
                    }
            }
        }

        return allPatterns;
    }

    /**
     * Match input against a single pattern
     */
    private matchSinglePattern(
        input: string,
        pattern: VoicePattern
    ): { matched: boolean; confidence: number; parameters: Record<string, any> } {
        const parameters: Record<string, any> = {};

        // Check exact pattern match first
        let matchResult = this.checkPatternMatch(input, pattern.pattern, parameters);
        if (matchResult.matched) {
            return {
                matched: true,
                confidence: pattern.confidence * matchResult.similarity,
                parameters
            };
        }

        // Check variations
        for (const variation of pattern.variations) {
            const variationParams: Record<string, any> = {};
            matchResult = this.checkPatternMatch(input, variation, variationParams);
            if (matchResult.matched) {
                return {
                    matched: true,
                    confidence: pattern.confidence * matchResult.similarity * 0.9, // Slightly lower for variations
                    parameters: variationParams
                };
            }
        }

        return { matched: false, confidence: 0, parameters: {} };
    }

    /**
     * Check if input matches a specific pattern
     */
    private checkPatternMatch(
        input: string,
        pattern: string,
        parameters: Record<string, any>
    ): { matched: boolean; similarity: number } {
        // Handle parameter extraction
        const paramRegex = /\{(\w+)\}/g;
        let regexPattern = pattern.replace(paramRegex, '(.+?)');
        regexPattern = regexPattern.replace(/\s+/g, '\\s+');

        const regex = new RegExp(`^${regexPattern}$`, 'i');
        const match = input.match(regex);

        if (match) {
            // Extract parameters
            const paramNames = [];
            let paramMatch;
            const paramRegexForNames = /\{(\w+)\}/g;
            while ((paramMatch = paramRegexForNames.exec(pattern)) !== null) {
                paramNames.push(paramMatch[1]);
            }

            // Assign parameter values
            for (let i = 0; i < paramNames.length && i + 1 < match.length; i++) {
                parameters[paramNames[i]] = match[i + 1].trim();
            }

            return { matched: true, similarity: 1.0 };
        }

        // Fuzzy matching for partial matches
        const similarity = this.calculateSimilarity(input, pattern);
        if (similarity > 0.7) {
            return { matched: true, similarity };
        }

        return { matched: false, similarity };
    }

    /**
     * Calculate similarity between two strings
     */
    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) {
            return 1.0;
        }

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Normalize input for better matching
     */
    private normalizeInput(input: string, language: string): string {
        let normalized = input.toLowerCase().trim();

        // Language-specific normalization
        switch (language) {
            case 'hi-IN':
                // Remove common Hindi particles and normalize
                normalized = normalized.replace(/\s+(को|का|की|के|में|से|पर|तक)\s+/g, ' ');
                break;
            case 'ta-IN':
                // Remove common Tamil particles
                normalized = normalized.replace(/\s+(ஐ|ன்|ம்|க்கு|ல்|டு)\s+/g, ' ');
                break;
            case 'bn-IN':
                // Remove common Bengali particles
                normalized = normalized.replace(/\s+(কে|র|এর|তে|থেকে|পর্যন্ত)\s+/g, ' ');
                break;
            case 'te-IN':
                // Remove common Telugu particles
                normalized = normalized.replace(/\s+(ను|కు|లో|నుండి|వరకు)\s+/g, ' ');
                break;
        }

        // Remove extra whitespace
        normalized = normalized.replace(/\s+/g, ' ').trim();

        return normalized;
    }

    /**
     * Get available patterns for a language
     */
    public getAvailablePatterns(language: string): VoicePattern[] {
        const languagePatterns = this.culturalPatterns[language];
        if (!languagePatterns) {
            return [];
        }

        const allPatterns: VoicePattern[] = [];
        allPatterns.push(
            ...languagePatterns.formalPatterns,
            ...languagePatterns.informalPatterns,
            ...languagePatterns.respectfulPatterns,
            ...languagePatterns.directPatterns
        );

        Object.values(languagePatterns.regionalVariations).forEach(patterns => {
            allPatterns.push(...patterns);
        });

        return allPatterns;
    }

    /**
     * Add custom pattern for a language
     */
    public addCustomPattern(language: string, pattern: VoicePattern, context: string = 'informal'): void {
        if (!this.culturalPatterns[language]) {
            this.culturalPatterns[language] = {
                formalPatterns: [],
                informalPatterns: [],
                respectfulPatterns: [],
                directPatterns: [],
                regionalVariations: {}
            };
        }

        const languagePatterns = this.culturalPatterns[language];

        switch (context) {
            case 'formal':
                languagePatterns.formalPatterns.push(pattern);
                break;
            case 'respectful':
                languagePatterns.respectfulPatterns.push(pattern);
                break;
            case 'direct':
                languagePatterns.directPatterns.push(pattern);
                break;
            default:
                languagePatterns.informalPatterns.push(pattern);
        }

        // Clear cache to ensure new patterns are used
        this.clearCache();
    }

    /**
     * Add regional variation pattern
     */
    public addRegionalPattern(language: string, region: string, pattern: VoicePattern): void {
        if (!this.culturalPatterns[language]) {
            this.culturalPatterns[language] = {
                formalPatterns: [],
                informalPatterns: [],
                respectfulPatterns: [],
                directPatterns: [],
                regionalVariations: {}
            };
        }

        if (!this.culturalPatterns[language].regionalVariations[region]) {
            this.culturalPatterns[language].regionalVariations[region] = [];
        }

        this.culturalPatterns[language].regionalVariations[region].push(pattern);
        this.clearCache();
    }

    /**
     * Get cultural contexts available for a language
     */
    public getCulturalContexts(language: string): string[] {
        const languagePatterns = this.culturalPatterns[language];
        if (!languagePatterns) {
            return [];
        }

        const contexts = ['formal', 'informal', 'respectful', 'direct'];
        const regionalContexts = Object.keys(languagePatterns.regionalVariations);

        return [...contexts, ...regionalContexts];
    }

    /**
     * Clear pattern cache
     */
    public clearCache(): void {
        this.patternCache.clear();
    }

    /**
     * Get pattern statistics
     */
    public getPatternStats(language?: string): {
        totalPatterns: number;
        byContext: Record<string, number>;
        cacheSize: number;
    } {
        if (language) {
            const languagePatterns = this.culturalPatterns[language];
            if (!languagePatterns) {
                return { totalPatterns: 0, byContext: {}, cacheSize: this.patternCache.size };
            }

            const byContext = {
                formal: languagePatterns.formalPatterns.length,
                informal: languagePatterns.informalPatterns.length,
                respectful: languagePatterns.respectfulPatterns.length,
                direct: languagePatterns.directPatterns.length
            };

            Object.keys(languagePatterns.regionalVariations).forEach(region => {
                byContext[region] = languagePatterns.regionalVariations[region].length;
            });

            const totalPatterns = Object.values(byContext).reduce((sum, count) => sum + count, 0);

            return { totalPatterns, byContext, cacheSize: this.patternCache.size };
        }

        // Global stats
        let totalPatterns = 0;
        const byContext: Record<string, number> = {};

        Object.values(this.culturalPatterns).forEach(languagePatterns => {
            totalPatterns += languagePatterns.formalPatterns.length;
            totalPatterns += languagePatterns.informalPatterns.length;
            totalPatterns += languagePatterns.respectfulPatterns.length;
            totalPatterns += languagePatterns.directPatterns.length;

            Object.values(languagePatterns.regionalVariations).forEach(patterns => {
                totalPatterns += patterns.length;
            });
        });

        return { totalPatterns, byContext, cacheSize: this.patternCache.size };
    }
}