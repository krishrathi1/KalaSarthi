import { NextRequest, NextResponse } from 'next/server';
import { EnhancedArtisanBuddyService } from '@/lib/services/EnhancedArtisanBuddyV2';
import { VectorStoreService } from '@/lib/service/VectorStoreService';
import {
    ArtisanProfile,
    validateArtisanProfile,
    ProfileMatch
} from '@/lib/types/enhanced-artisan-buddy';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/enhanced-artisan-buddy/profile
 * Create a new artisan profile
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export async function POST(request: NextRequest) {
    try {
        const profileData = await request.json();

        // Generate ID if not provided
        if (!profileData.id) {
            profileData.id = uuidv4();
        }

        // Validate profile data using Zod schema
        const validation = validateArtisanProfile(profileData);
        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Invalid profile data',
                    details: validation.errors,
                    code: 'VALIDATION_ERROR'
                },
                { status: 400 }
            );
        }

        const profile = validation.data!;

        // Calculate profile completeness
        const completeness = calculateProfileCompleteness(profile);
        profile.metadata.completeness = completeness;
        profile.metadata.updatedAt = new Date();

        // Store profile in vector store
        const vectorStore = VectorStoreService.getInstance();
        const profileId = await vectorStore.storeProfile(profile);

        // Update profile in Enhanced Artisan Buddy Service
        const enhancedBuddy = EnhancedArtisanBuddyService.getInstance();
        await enhancedBuddy.updateProfile(profile.userId, profile);

        return NextResponse.json({
            success: true,
            message: 'Artisan profile created successfully',
            profileId,
            profile: {
                ...profile,
                id: profileId
            },
            completeness
        }, { status: 201 });

    } catch (error) {
        console.error('Create profile error:', error);

        if (error instanceof Error) {
            if (error.message.includes('Profile already exists')) {
                return NextResponse.json(
                    {
                        error: 'Profile with this ID already exists',
                        code: 'PROFILE_EXISTS'
                    },
                    { status: 409 }
                );
            }
        }

        return NextResponse.json(
            {
                error: 'Failed to create profile',
                code: 'CREATE_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/enhanced-artisan-buddy/profile
 * Get artisan profile(s) or search profiles
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get('profileId');
        const userId = searchParams.get('userId');
        const query = searchParams.get('query');
        const limit = parseInt(searchParams.get('limit') || '10');
        const includeEmbedding = searchParams.get('includeEmbedding') === 'true';

        const vectorStore = VectorStoreService.getInstance();

        // Get specific profile by ID
        if (profileId) {
            const profile = await vectorStore.getProfile(profileId);

            if (!profile) {
                return NextResponse.json(
                    {
                        error: 'Profile not found',
                        code: 'PROFILE_NOT_FOUND'
                    },
                    { status: 404 }
                );
            }

            // Remove embedding from response unless explicitly requested
            if (!includeEmbedding && profile.metadata.embedding) {
                delete profile.metadata.embedding;
            }

            return NextResponse.json({
                success: true,
                profile
            });
        }

        // Get profiles by user ID
        if (userId) {
            const profiles = await vectorStore.getProfilesByUserId(userId);

            // Remove embeddings unless requested
            if (!includeEmbedding) {
                profiles.forEach(profile => {
                    if (profile.metadata.embedding) {
                        delete profile.metadata.embedding;
                    }
                });
            }

            return NextResponse.json({
                success: true,
                profiles,
                count: profiles.length
            });
        }

        // Search profiles by query
        if (query) {
            const searchResults = await vectorStore.searchSimilarProfiles(query, limit);

            // Remove embeddings unless requested
            if (!includeEmbedding) {
                searchResults.forEach(result => {
                    if (result.profile.metadata.embedding) {
                        delete result.profile.metadata.embedding;
                    }
                });
            }

            return NextResponse.json({
                success: true,
                query,
                results: searchResults,
                count: searchResults.length
            });
        }

        // Return error if no valid parameters provided
        return NextResponse.json(
            {
                error: 'Either profileId, userId, or query parameter is required',
                code: 'MISSING_PARAMETERS'
            },
            { status: 400 }
        );

    } catch (error) {
        console.error('Get profile error:', error);
        return NextResponse.json(
            {
                error: 'Failed to retrieve profile(s)',
                code: 'RETRIEVAL_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/enhanced-artisan-buddy/profile
 * Update an existing artisan profile
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get('profileId');

        if (!profileId) {
            return NextResponse.json(
                {
                    error: 'Profile ID is required',
                    code: 'MISSING_PROFILE_ID'
                },
                { status: 400 }
            );
        }

        const updateData = await request.json();

        // Get existing profile
        const vectorStore = VectorStoreService.getInstance();
        const existingProfile = await vectorStore.getProfile(profileId);

        if (!existingProfile) {
            return NextResponse.json(
                {
                    error: 'Profile not found',
                    code: 'PROFILE_NOT_FOUND'
                },
                { status: 404 }
            );
        }

        // Merge update data with existing profile
        const updatedProfileData = {
            ...existingProfile,
            ...updateData,
            id: profileId, // Ensure ID doesn't change
            metadata: {
                ...existingProfile.metadata,
                ...updateData.metadata,
                updatedAt: new Date()
            }
        };

        // Validate updated profile
        const validation = validateArtisanProfile(updatedProfileData);
        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Invalid profile update data',
                    details: validation.errors,
                    code: 'VALIDATION_ERROR'
                },
                { status: 400 }
            );
        }

        const updatedProfile = validation.data!;

        // Recalculate completeness
        const completeness = calculateProfileCompleteness(updatedProfile);
        updatedProfile.metadata.completeness = completeness;

        // Update profile in vector store
        await vectorStore.updateProfile(profileId, updatedProfile);

        // Update profile in Enhanced Artisan Buddy Service
        const enhancedBuddy = EnhancedArtisanBuddyService.getInstance();
        await enhancedBuddy.updateProfile(updatedProfile.userId, updatedProfile);

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            profile: updatedProfile,
            completeness
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json(
            {
                error: 'Failed to update profile',
                code: 'UPDATE_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/enhanced-artisan-buddy/profile
 * Delete an artisan profile
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get('profileId');

        if (!profileId) {
            return NextResponse.json(
                {
                    error: 'Profile ID is required',
                    code: 'MISSING_PROFILE_ID'
                },
                { status: 400 }
            );
        }

        const vectorStore = VectorStoreService.getInstance();

        // Check if profile exists
        const existingProfile = await vectorStore.getProfile(profileId);
        if (!existingProfile) {
            return NextResponse.json(
                {
                    error: 'Profile not found',
                    code: 'PROFILE_NOT_FOUND'
                },
                { status: 404 }
            );
        }

        // Delete profile from vector store
        await vectorStore.deleteProfile(profileId);

        return NextResponse.json({
            success: true,
            message: 'Profile deleted successfully',
            profileId
        });

    } catch (error) {
        console.error('Delete profile error:', error);
        return NextResponse.json(
            {
                error: 'Failed to delete profile',
                code: 'DELETE_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * Calculate profile completeness percentage
 */
function calculateProfileCompleteness(profile: ArtisanProfile): number {
    let totalFields = 0;
    let completedFields = 0;

    // Personal Info (weight: 25%)
    const personalFields = ['name', 'location', 'languages', 'experience'];
    totalFields += personalFields.length;
    if (profile.personalInfo.name) completedFields++;
    if (profile.personalInfo.location) completedFields++;
    if (profile.personalInfo.languages.length > 0) completedFields++;
    if (profile.personalInfo.experience >= 0) completedFields++;

    // Skills (weight: 25%)
    const skillFields = ['primary', 'secondary', 'certifications'];
    totalFields += skillFields.length;
    if (profile.skills.primary.length > 0) completedFields++;
    if (profile.skills.secondary.length > 0) completedFields++;
    if (profile.skills.certifications.length > 0) completedFields++;

    // Products (weight: 25%)
    const productFields = ['categories', 'specialties', 'priceRange'];
    totalFields += productFields.length;
    if (profile.products.categories.length > 0) completedFields++;
    if (profile.products.specialties.length > 0) completedFields++;
    if (profile.products.priceRange.min >= 0 && profile.products.priceRange.max > 0) completedFields++;

    // Business Info (weight: 25%)
    const businessFields = ['businessType', 'targetMarket', 'challenges', 'goals'];
    totalFields += businessFields.length;
    if (profile.businessInfo.businessType) completedFields++;
    if (profile.businessInfo.targetMarket.length > 0) completedFields++;
    if (profile.businessInfo.challenges.length > 0) completedFields++;
    if (profile.businessInfo.goals.length > 0) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
}