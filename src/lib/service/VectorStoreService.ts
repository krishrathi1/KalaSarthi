/**
 * Vector Store Service - Enhanced Implementation
 * Main service interface for vector-based artisan profile storage and retrieval
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { SemanticSearchService, SearchQuery, SearchResult } from './SemanticSearchService';
import { VectorConnectionPool } from '../database/vector-connection-pool';
import { EmbeddingService } from './EmbeddingService';
import {
    ArtisanProfile,
    ProfileMatch,
    validateArtisanProfile,
    extractMetadata,
    calculateProfileCompleteness
} from '../database/vector-schema';
import { getVectorStoreConfig } from '../config/vector-store-config';

export class VectorStoreService {
    private static instance: VectorStoreService;
    private genAI: GoogleGenerativeAI;
    private searchService: SemanticSearchService;
    private connectionPool: VectorConnectionPool;
    private embeddingService: EmbeddingService;
    private isInitialized: boolean = false;

    private constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        // Initialize services
        const config = getVectorStoreConfig();
        this.searchService = SemanticSearchService.getInstance();
        this.connectionPool = VectorConnectionPool.getInstance();
        this.embeddingService = EmbeddingService.getInstance(config);
    }

    public static getInstance(): VectorStoreService {
        if (!VectorStoreService.instance) {
            VectorStoreService.instance = new VectorStoreService();
        }
        return VectorStoreService.instance;
    }

    /**
     * Initialize the vector store service
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            await this.searchService.initialize();
            this.isInitialized = true;
            console.log('VectorStoreService initialized successfully');
        } catch (error) {
            console.error('Failed to initialize VectorStoreService:', error);
            throw error;
        }
    }

    /**
     * Store an artisan profile in the vector database
     */
    async storeProfile(profile: ArtisanProfile): Promise<string> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Validate profile
            const validatedProfile = validateArtisanProfile(profile);

            // Calculate completeness if not provided
            if (!validatedProfile.metadata.completeness) {
                validatedProfile.metadata.completeness = calculateProfileCompleteness(validatedProfile);
            }

            // Index the profile for search
            await this.searchService.indexProfile(validatedProfile);

            console.log(`Stored profile: ${validatedProfile.id}`);
            return validatedProfile.id;

        } catch (error) {
            console.error('Failed to store profile:', error);
            throw new Error(`Profile storage failed: ${error}`);
        }
    }

    /**
     * Search for similar artisan profiles
     */
    async searchSimilarProfiles(query: string, limit: number = 10): Promise<ProfileMatch[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const searchQuery: SearchQuery = {
                text: query,
                limit,
                type: 'comprehensive'
            };

            const response = await this.searchService.searchProfiles(searchQuery);

            return response.results.map(result => ({
                profile: result.profile,
                similarity: result.similarity,
                matchedFields: result.matchedFields
            }));

        } catch (error) {
            console.error('Profile search error:', error);
            return [];
        }
    }

    /**
     * Update an existing artisan profile
     */
    async updateProfile(profileId: string, updates: Partial<ArtisanProfile>): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // In a real implementation, you would fetch the existing profile first
            // For now, we'll assume the updates contain the full profile
            if (updates.id && updates.id !== profileId) {
                throw new Error('Profile ID mismatch');
            }

            const updatedProfile = { ...updates, id: profileId } as ArtisanProfile;

            // Validate the updated profile
            const validatedProfile = validateArtisanProfile(updatedProfile);

            // Update completeness
            validatedProfile.metadata.completeness = calculateProfileCompleteness(validatedProfile);
            validatedProfile.metadata.updatedAt = new Date();

            // Re-index the profile
            await this.searchService.indexProfile(validatedProfile);

            console.log(`Updated profile: ${profileId}`);

        } catch (error) {
            console.error('Failed to update profile:', error);
            throw new Error(`Profile update failed: ${error}`);
        }
    }

    /**
     * Delete an artisan profile
     */
    async deleteProfile(profileId: string): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            await this.searchService.removeProfile(profileId);
            console.log(`Deleted profile: ${profileId}`);

        } catch (error) {
            console.error('Failed to delete profile:', error);
            throw new Error(`Profile deletion failed: ${error}`);
        }
    }

    /**
     * Generate contextual response using RAG
     */
    async generateContextualResponse(query: string, artisanId?: string): Promise<string> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            let context = '';

            // Get artisan-specific context if provided
            if (artisanId) {
                const profileResults = await this.searchSimilarProfiles(`id:${artisanId}`, 1);
                if (profileResults.length > 0) {
                    const profile = profileResults[0].profile;
                    context = `You are representing ${profile.personalInfo.name}, a ${profile.skills.primary.join(', ')} artisan from ${profile.personalInfo.location} with ${profile.personalInfo.experience} years of experience. `;
                }
            }

            // Search for relevant profiles and information
            const relevantProfiles = await this.searchSimilarProfiles(query, 3);
            if (relevantProfiles.length > 0) {
                const profileContexts = relevantProfiles.map(match => {
                    const p = match.profile;
                    return `${p.personalInfo.name} (${p.personalInfo.location}): ${p.skills.primary.join(', ')}, ${p.personalInfo.experience} years experience`;
                });
                context += `\nRelevant artisan information:\n${profileContexts.join('\n')}`;
            }

            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const prompt = `${context}\n\nUser Query: ${query}\n\nProvide a helpful, contextual response as an artisan assistant. Focus on connecting users with relevant artisans and their expertise:`;

            const result = await model.generateContent(prompt);
            return result.response.text();

        } catch (error) {
            console.error('Contextual response generation error:', error);
            return 'I apologize, but I encountered an error while processing your request. Please try again.';
        }
    }

    /**
     * Search profiles by specific criteria
     */
    async searchBySkills(skills: string[], limit: number = 10): Promise<ProfileMatch[]> {
        const query = skills.join(' ');
        return await this.searchSimilarProfiles(query, limit);
    }

    async searchByLocation(location: string, limit: number = 10): Promise<ProfileMatch[]> {
        return await this.searchSimilarProfiles(location, limit);
    }

    async searchByProducts(products: string[], limit: number = 10): Promise<ProfileMatch[]> {
        const query = products.join(' ');
        return await this.searchSimilarProfiles(query, limit);
    }

    /**
     * Get service health and statistics
     */
    async getHealthStatus(): Promise<{ healthy: boolean; stats: any }> {
        try {
            const searchHealth = await this.searchService.healthCheck();
            const stats = this.searchService.getStats();

            return {
                healthy: searchHealth.healthy,
                stats: {
                    ...stats,
                    searchService: searchHealth.details,
                    initialized: this.isInitialized,
                }
            };
        } catch (error) {
            return {
                healthy: false,
                stats: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
        }
    }

    /**
     * Get a specific artisan profile by ID
     */
    getArtisanProfile(artisanId: string): ArtisanProfile | null {
        try {
            // This is a synchronous wrapper for the async searchSimilarProfiles
            // In a real implementation, you'd want to use a proper cache or database lookup
            return null; // Placeholder - needs proper implementation
        } catch (error) {
            console.error('Failed to get artisan profile:', error);
            return null;
        }
    }

    /**
     * Get all artisan profiles
     */
    getAllArtisanProfiles(): ArtisanProfile[] {
        try {
            // This is a placeholder - needs proper implementation
            return [];
        } catch (error) {
            console.error('Failed to get all artisan profiles:', error);
            return [];
        }
    }

    /**
     * Add a new artisan profile (synchronous wrapper)
     */
    addArtisanProfile(profile: ArtisanProfile): void {
        // Async operation wrapped - fire and forget
        this.storeProfile(profile).catch(error => {
            console.error('Failed to add artisan profile:', error);
        });
    }

    /**
     * Update an artisan profile (synchronous wrapper)
     */
    updateArtisanProfile(artisanId: string, updates: Partial<ArtisanProfile>): boolean {
        // Async operation wrapped - fire and forget
        this.updateProfile(artisanId, updates).catch(error => {
            console.error('Failed to update artisan profile:', error);
        });
        return true; // Optimistic return
    }

    /**
     * Search for similar content (wrapper for searchSimilarProfiles)
     */
    async searchSimilarContent(query: string, limit: number = 5): Promise<Array<{ id: string; content: string; metadata: any }>> {
        try {
            const profileMatches = await this.searchSimilarProfiles(query, limit);
            
            return profileMatches.map(match => ({
                id: match.profile.id,
                content: `${match.profile.personalInfo.name} - ${match.profile.skills.primary.join(', ')}`,
                metadata: {
                    location: match.profile.personalInfo.location,
                    experience: match.profile.personalInfo.experience,
                    skills: match.profile.skills,
                    similarity: match.similarity
                }
            }));
        } catch (error) {
            console.error('Failed to search similar content:', error);
            return [];
        }
    }

    /**
     * Get a profile by ID (async version)
     */
    async getProfile(profileId: string): Promise<ArtisanProfile | null> {
        try {
            const results = await this.searchSimilarProfiles(`id:${profileId}`, 1);
            return results.length > 0 ? results[0].profile : null;
        } catch (error) {
            console.error('Failed to get profile:', error);
            return null;
        }
    }

    /**
     * Get profiles by user ID
     */
    async getProfilesByUserId(userId: string): Promise<ArtisanProfile[]> {
        try {
            const results = await this.searchSimilarProfiles(`userId:${userId}`, 10);
            return results.map(match => match.profile);
        } catch (error) {
            console.error('Failed to get profiles by user ID:', error);
            return [];
        }
    }
}