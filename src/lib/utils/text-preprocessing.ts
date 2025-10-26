/**
 * Text Preprocessing Utilities
 * Advanced text preprocessing and chunking for better embedding generation
 */

import { ArtisanProfile, PROFILE_EMBEDDING_FIELDS } from '../database/vector-schema';

export interface PreprocessingConfig {
    removeStopWords: boolean;
    normalizeCase: boolean;
    removeSpecialChars: boolean;
    maxTokenLength: number;
    minTokenLength: number;
    preserveNumbers: boolean;
    preservePunctuation: boolean;
}

export const defaultPreprocessingConfig: PreprocessingConfig = {
    removeStopWords: false, // Keep for context in embeddings
    normalizeCase: true,
    removeSpecialChars: true,
    maxTokenLength: 50,
    minTokenLength: 2,
    preserveNumbers: true,
    preservePunctuation: true,
};

// Common stop words (minimal set to preserve context)
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
]);

// Artisan-specific important terms that should never be removed
const ARTISAN_IMPORTANT_TERMS = new Set([
    'handmade', 'traditional', 'craft', 'artisan', 'handloom', 'pottery', 'weaving',
    'embroidery', 'carving', 'painting', 'sculpture', 'jewelry', 'textile', 'ceramic',
    'wood', 'metal', 'stone', 'silk', 'cotton', 'wool', 'leather', 'bamboo',
    'experience', 'years', 'skilled', 'master', 'apprentice', 'certified', 'award'
]);

export class TextPreprocessor {
    private config: PreprocessingConfig;

    constructor(config: PreprocessingConfig = defaultPreprocessingConfig) {
        this.config = config;
    }

    /**
     * Preprocess text for embedding generation
     */
    preprocessText(text: string): string {
        if (!text || typeof text !== 'string') {
            return '';
        }

        let processed = text;

        // Normalize whitespace
        processed = processed.replace(/\s+/g, ' ').trim();

        // Normalize case
        if (this.config.normalizeCase) {
            processed = processed.toLowerCase();
        }

        // Remove special characters but preserve important punctuation
        if (this.config.removeSpecialChars) {
            if (this.config.preservePunctuation) {
                processed = processed.replace(/[^\w\s.,!?;:()\-]/g, ' ');
            } else {
                processed = processed.replace(/[^\w\s]/g, ' ');
            }
        }

        // Process tokens
        const tokens = processed.split(/\s+/).filter(token => token.length > 0);
        const processedTokens = tokens
            .filter(token => this.shouldKeepToken(token))
            .map(token => this.normalizeToken(token));

        return processedTokens.join(' ');
    }

    /**
     * Preprocess artisan profile for embedding
     */
    preprocessProfile(profile: ArtisanProfile): string {
        const textParts: string[] = [];

        // Process each field with appropriate weight and preprocessing
        for (const fieldConfig of PROFILE_EMBEDDING_FIELDS) {
            const value = this.getNestedValue(profile, fieldConfig.field);
            if (value) {
                let fieldText = this.extractFieldText(value, fieldConfig.field);

                // Apply field-specific preprocessing
                fieldText = this.preprocessFieldText(fieldText, fieldConfig.field);

                // Repeat important fields based on weight
                const repetitions = Math.ceil(fieldConfig.weight * 2);
                for (let i = 0; i < repetitions; i++) {
                    textParts.push(fieldText);
                }
            }
        }

        // Add contextual information
        textParts.push(this.generateContextualText(profile));

        return this.preprocessText(textParts.join(' | '));
    }

    /**
     * Chunk text intelligently for embedding
     */
    chunkText(text: string, maxChunkSize: number = 512, overlapSize: number = 50): string[] {
        if (text.length <= maxChunkSize) {
            return [text];
        }

        const chunks: string[] = [];
        const sentences = this.splitIntoSentences(text);

        let currentChunk = '';
        let currentSize = 0;

        for (const sentence of sentences) {
            const sentenceSize = this.estimateTokenCount(sentence);

            if (currentSize + sentenceSize <= maxChunkSize) {
                currentChunk += (currentChunk ? ' ' : '') + sentence;
                currentSize += sentenceSize;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                }

                // Handle overlap
                if (overlapSize > 0 && chunks.length > 0) {
                    const overlapText = this.getOverlapText(currentChunk, overlapSize);
                    currentChunk = overlapText + ' ' + sentence;
                    currentSize = this.estimateTokenCount(currentChunk);
                } else {
                    currentChunk = sentence;
                    currentSize = sentenceSize;
                }
            }
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks.length > 0 ? chunks : [text.substring(0, maxChunkSize)];
    }

    /**
     * Extract and clean field text
     */
    private extractFieldText(value: any, fieldName: string): string {
        if (Array.isArray(value)) {
            return value.join(', ');
        } else if (typeof value === 'object' && value !== null) {
            // Handle nested objects
            return Object.values(value).join(' ');
        } else {
            return String(value);
        }
    }

    /**
     * Apply field-specific preprocessing
     */
    private preprocessFieldText(text: string, fieldName: string): string {
        // Location-specific preprocessing
        if (fieldName.includes('location')) {
            return this.preprocessLocation(text);
        }

        // Skills-specific preprocessing
        if (fieldName.includes('skills')) {
            return this.preprocessSkills(text);
        }

        // Products-specific preprocessing
        if (fieldName.includes('products')) {
            return this.preprocessProducts(text);
        }

        return text;
    }

    /**
     * Preprocess location text
     */
    private preprocessLocation(text: string): string {
        // Normalize common location formats
        return text
            .replace(/\b(city|state|country|district|village)\b/gi, '')
            .replace(/\b(in|at|from|near)\b/gi, '')
            .trim();
    }

    /**
     * Preprocess skills text
     */
    private preprocessSkills(text: string): string {
        // Expand skill abbreviations and normalize terms
        const skillMappings: Record<string, string> = {
            'weaving': 'handloom weaving textile craft',
            'pottery': 'ceramic pottery clay craft',
            'embroidery': 'hand embroidery needlework textile',
            'carving': 'wood carving stone carving craft',
            'painting': 'traditional painting art craft',
        };

        let processed = text.toLowerCase();
        for (const [skill, expansion] of Object.entries(skillMappings)) {
            processed = processed.replace(new RegExp(`\\b${skill}\\b`, 'g'), expansion);
        }

        return processed;
    }

    /**
     * Preprocess products text
     */
    private preprocessProducts(text: string): string {
        // Normalize product categories and add context
        return text
            .replace(/\b(handmade|traditional|authentic)\b/gi, 'artisan handcrafted traditional')
            .replace(/\b(saree|sari)\b/gi, 'saree traditional indian garment')
            .replace(/\b(pottery|ceramic)\b/gi, 'pottery ceramic handmade craft');
    }

    /**
     * Generate contextual text for profile
     */
    private generateContextualText(profile: ArtisanProfile): string {
        const contextParts: string[] = [];

        // Experience context
        const experience = profile.personalInfo.experience;
        if (experience > 0) {
            if (experience >= 20) {
                contextParts.push('master artisan highly experienced expert craftsperson');
            } else if (experience >= 10) {
                contextParts.push('experienced skilled artisan professional craftsperson');
            } else if (experience >= 5) {
                contextParts.push('skilled artisan experienced craftsperson');
            } else {
                contextParts.push('emerging artisan developing craftsperson');
            }
        }

        // Business context
        const businessType = profile.businessInfo.businessType.toLowerCase();
        if (businessType.includes('individual') || businessType.includes('solo')) {
            contextParts.push('individual artisan solo craftsperson');
        } else if (businessType.includes('cooperative') || businessType.includes('group')) {
            contextParts.push('artisan cooperative group craftspeople');
        } else if (businessType.includes('family')) {
            contextParts.push('family business traditional artisan heritage');
        }

        // Location context
        const location = profile.personalInfo.location.toLowerCase();
        if (location.includes('rajasthan')) {
            contextParts.push('rajasthani traditional craft heritage');
        } else if (location.includes('gujarat')) {
            contextParts.push('gujarati traditional craft heritage');
        } else if (location.includes('uttar pradesh') || location.includes('varanasi')) {
            contextParts.push('uttar pradesh traditional craft banarasi heritage');
        }

        return contextParts.join(' ');
    }

    /**
     * Check if token should be kept
     */
    private shouldKeepToken(token: string): boolean {
        // Always keep artisan-important terms
        if (ARTISAN_IMPORTANT_TERMS.has(token.toLowerCase())) {
            return true;
        }

        // Check length constraints
        if (token.length < this.config.minTokenLength || token.length > this.config.maxTokenLength) {
            return false;
        }

        // Remove stop words if configured
        if (this.config.removeStopWords && STOP_WORDS.has(token.toLowerCase())) {
            return false;
        }

        // Keep numbers if configured
        if (!this.config.preserveNumbers && /^\d+$/.test(token)) {
            return false;
        }

        return true;
    }

    /**
     * Normalize individual token
     */
    private normalizeToken(token: string): string {
        // Remove leading/trailing punctuation but preserve internal punctuation
        return token.replace(/^[^\w]+|[^\w]+$/g, '');
    }

    /**
     * Split text into sentences intelligently
     */
    private splitIntoSentences(text: string): string[] {
        // Split on sentence boundaries but be careful with abbreviations
        const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
        return sentences.filter(s => s.trim().length > 0);
    }

    /**
     * Estimate token count (rough approximation)
     */
    private estimateTokenCount(text: string): number {
        return Math.ceil(text.split(/\s+/).length * 1.3);
    }

    /**
     * Get overlap text from the end of a chunk
     */
    private getOverlapText(text: string, overlapSize: number): string {
        const words = text.split(/\s+/);
        const overlapWords = words.slice(-overlapSize);
        return overlapWords.join(' ');
    }

    /**
     * Get nested object value
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }
}