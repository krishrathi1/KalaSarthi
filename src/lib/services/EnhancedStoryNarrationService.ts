/**
 * Enhanced Story Narration Service
 * Integrates image analysis with Google Cloud TTS for story narration
 */

import { GoogleCloudTTSService } from './GoogleCloudTTSService';

export interface StoryNarrationOptions {
    languageCode?: string;
    voiceName?: string;
    gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
    speakingRate?: number;
    pitch?: number;
}

export interface NarratedStoryResult {
    success: boolean;
    storyText: string;
    audioUrl?: string;
    audioDuration?: number;
    audioFormat?: string;
    voice?: {
        name: string;
        languageCode: string;
        gender: string;
    };
    captions?: Caption[];
    error?: string;
}

export interface Caption {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
}

export class EnhancedStoryNarrationService {

    /**
     * Create narrated story from enhanced story text
     */
    static async narrateEnhancedStory(
        enhancedStoryText: string,
        options: StoryNarrationOptions = {}
    ): Promise<NarratedStoryResult> {
        try {
            console.log('📖 Creating enhanced story narration...');
            console.log('📝 Story text length:', enhancedStoryText.length);

            if (!enhancedStoryText || enhancedStoryText.trim().length === 0) {
                return {
                    success: false,
                    storyText: enhancedStoryText,
                    error: 'No story text provided for narration'
                };
            }

            // Default options for storytelling
            const narrationOptions: StoryNarrationOptions = {
                languageCode: 'en-IN', // Indian English for better cultural context
                gender: 'FEMALE', // Female voice for storytelling
                speakingRate: 0.9, // Slightly slower for storytelling
                pitch: 0.1, // Slightly higher pitch for engaging narration
                ...options
            };

            console.log('🎤 Using narration options:', narrationOptions);

            // Use Google Cloud TTS for high-quality narration
            const ttsResult = await GoogleCloudTTSService.synthesizeSpeech(
                enhancedStoryText,
                narrationOptions
            );

            if (!ttsResult.success) {
                return {
                    success: false,
                    storyText: enhancedStoryText,
                    error: ttsResult.error || 'Failed to generate narration'
                };
            }

            // Create audio URL from base64 content
            const audioUrl = GoogleCloudTTSService.createAudioUrl(
                ttsResult.audio!.content,
                ttsResult.audio!.mimeType
            );

            // Generate captions from the story text
            const captions = this.generateCaptions(enhancedStoryText, ttsResult.audio!.duration);

            console.log('✅ Enhanced story narration created successfully');

            return {
                success: true,
                storyText: enhancedStoryText,
                audioUrl,
                audioDuration: ttsResult.audio!.duration,
                audioFormat: ttsResult.audio!.format,
                voice: ttsResult.voice,
                captions
            };

        } catch (error) {
            console.error('❌ Enhanced story narration failed:', error);
            return {
                success: false,
                storyText: enhancedStoryText,
                error: error instanceof Error ? error.message : 'Story narration failed'
            };
        }
    }

    /**
     * Generate captions from story text with timing
     */
    private static generateCaptions(storyText: string, totalDuration: number): Caption[] {
        try {
            // Split story into sentences for captions
            const sentences = storyText
                .split(/[.!?]+/)
                .map(s => s.trim())
                .filter(s => s.length > 0);

            if (sentences.length === 0) {
                return [];
            }

            const captions: Caption[] = [];
            const avgTimePerSentence = totalDuration / sentences.length;

            sentences.forEach((sentence, index) => {
                const startTime = index * avgTimePerSentence;
                const endTime = Math.min((index + 1) * avgTimePerSentence, totalDuration);

                captions.push({
                    id: `caption-${index}`,
                    text: sentence.trim() + (index < sentences.length - 1 ? '.' : ''),
                    startTime: Math.round(startTime),
                    endTime: Math.round(endTime)
                });
            });

            return captions;

        } catch (error) {
            console.error('❌ Failed to generate captions:', error);
            return [];
        }
    }

    /**
     * Get recommended voices for story narration
     */
    static async getStoryNarrationVoices(languageCode: string = 'en-IN') {
        try {
            const voicesResult = await GoogleCloudTTSService.getVoices(languageCode);

            if (!voicesResult.success || !voicesResult.voices) {
                return [];
            }

            // Filter and sort voices for storytelling
            const storyVoices = voicesResult.voices
                .filter(voice => {
                    // Prefer Neural2 voices for better quality
                    const isHighQuality = voice.name.includes('Neural2') || voice.name.includes('Journey');
                    // Prefer Indian languages for cultural context
                    const isIndianLanguage = voice.languageCode.includes('-IN');
                    return isHighQuality || isIndianLanguage;
                })
                .sort((a, b) => {
                    // Sort by quality and relevance
                    const aScore = this.getVoiceScore(a, languageCode);
                    const bScore = this.getVoiceScore(b, languageCode);
                    return bScore - aScore;
                })
                .slice(0, 6); // Top 6 voices

            return storyVoices;

        } catch (error) {
            console.error('❌ Failed to get story narration voices:', error);
            return [];
        }
    }

    /**
     * Score voices for storytelling suitability
     */
    private static getVoiceScore(voice: any, targetLanguage: string): number {
        let score = 0;

        // Prefer exact language match
        if (voice.languageCode === targetLanguage) {
            score += 10;
        }

        // Prefer Neural2 voices
        if (voice.name.includes('Neural2')) {
            score += 8;
        }

        // Prefer Journey voices
        if (voice.name.includes('Journey')) {
            score += 6;
        }

        // Prefer female voices for storytelling
        if (voice.gender === 'FEMALE') {
            score += 3;
        }

        // Prefer Indian languages
        if (voice.languageCode.includes('-IN')) {
            score += 5;
        }

        // Prefer recommended voices
        if (voice.recommended) {
            score += 4;
        }

        return score;
    }

    /**
     * Create story narration with specific voice
     */
    static async narrateWithVoice(
        storyText: string,
        voiceName: string,
        languageCode: string = 'en-IN'
    ): Promise<NarratedStoryResult> {
        return this.narrateEnhancedStory(storyText, {
            voiceName,
            languageCode,
            speakingRate: 0.9,
            pitch: 0.1
        });
    }

    /**
     * Create story narration for product description
     */
    static async narrateProductStory(
        productStory: string,
        productType?: string,
        languageCode: string = 'en-IN'
    ): Promise<NarratedStoryResult> {
        try {
            // Enhance the story text for product narration
            const enhancedStory = this.enhanceStoryForNarration(productStory, productType);

            // Use appropriate voice based on product type
            const voiceOptions = this.getVoiceForProductType(productType, languageCode);

            return this.narrateEnhancedStory(enhancedStory, voiceOptions);

        } catch (error) {
            console.error('❌ Product story narration failed:', error);
            return {
                success: false,
                storyText: productStory,
                error: error instanceof Error ? error.message : 'Product story narration failed'
            };
        }
    }

    /**
     * Enhance story text for better narration
     */
    private static enhanceStoryForNarration(story: string, productType?: string): string {
        // Add natural pauses and emphasis for better narration
        let enhancedStory = story;

        // Add pauses after introductory phrases
        enhancedStory = enhancedStory.replace(
            /(This|Here is|Introducing|Discover)/g,
            '$1... '
        );

        // Add emphasis for product type
        if (productType) {
            const productRegex = new RegExp(`\\b${productType}\\b`, 'gi');
            enhancedStory = enhancedStory.replace(productRegex, `beautiful ${productType}`);
        }

        // Add natural storytelling flow
        enhancedStory = enhancedStory.replace(/\. /g, '. ... ');

        return enhancedStory;
    }

    /**
     * Get appropriate voice for product type
     */
    private static getVoiceForProductType(
        productType?: string,
        languageCode: string = 'en-IN'
    ): StoryNarrationOptions {
        const baseOptions: StoryNarrationOptions = {
            languageCode,
            speakingRate: 0.9,
            pitch: 0.1
        };

        // Customize voice based on product type
        if (productType) {
            const lowerProductType = productType.toLowerCase();

            if (lowerProductType.includes('jewelry') || lowerProductType.includes('ornament')) {
                return {
                    ...baseOptions,
                    gender: 'FEMALE',
                    pitch: 0.2, // Slightly higher for elegance
                    speakingRate: 0.8 // Slower for luxury feel
                };
            } else if (lowerProductType.includes('textile') || lowerProductType.includes('saree')) {
                return {
                    ...baseOptions,
                    gender: 'FEMALE',
                    pitch: 0.1,
                    speakingRate: 0.9
                };
            } else if (lowerProductType.includes('pottery') || lowerProductType.includes('craft')) {
                return {
                    ...baseOptions,
                    gender: 'MALE',
                    pitch: 0.0,
                    speakingRate: 0.9
                };
            }
        }

        // Default: Female voice for general storytelling
        return {
            ...baseOptions,
            gender: 'FEMALE'
        };
    }
}