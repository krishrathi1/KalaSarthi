import { NextRequest, NextResponse } from 'next/server';
import { VectorStoreService } from '@/lib/service/VectorStoreService';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const artisanId = searchParams.get('artisanId');

        const vectorStoreService = VectorStoreService.getInstance();

        if (artisanId) {
            // Get specific artisan profile
            const profile = vectorStoreService.getArtisanProfile(artisanId);
            if (!profile) {
                return NextResponse.json(
                    { error: 'Artisan profile not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json({ profile });
        } else {
            // Get all artisan profiles
            const profiles = vectorStoreService.getAllArtisanProfiles();
            return NextResponse.json({ profiles });
        }

    } catch (error) {
        console.error('Get artisan profile error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const profileData = await request.json();

        // Validate required fields
        const requiredFields = ['id', 'name', 'craft', 'location'];
        for (const field of requiredFields) {
            if (!profileData[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        const vectorStoreService = VectorStoreService.getInstance();

        // Add default values for missing fields
        const profile = {
            specialties: [],
            experience: 0,
            products: [],
            skills: [],
            bio: '',
            achievements: [],
            certifications: [],
            languages: ['Hindi', 'English'],
            businessInfo: {
                established: new Date().getFullYear().toString(),
                employees: 1,
                revenue: 'Not specified',
                markets: ['India']
            },
            ...profileData
        };

        vectorStoreService.addArtisanProfile(profile);

        return NextResponse.json({
            success: true,
            message: 'Artisan profile created successfully',
            profile
        });

    } catch (error) {
        console.error('Create artisan profile error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { artisanId, ...updates } = await request.json();

        if (!artisanId) {
            return NextResponse.json(
                { error: 'Artisan ID is required' },
                { status: 400 }
            );
        }

        const vectorStoreService = VectorStoreService.getInstance();
        const success = vectorStoreService.updateArtisanProfile(artisanId, updates);

        if (!success) {
            return NextResponse.json(
                { error: 'Artisan profile not found' },
                { status: 404 }
            );
        }

        const updatedProfile = vectorStoreService.getArtisanProfile(artisanId);

        return NextResponse.json({
            success: true,
            message: 'Artisan profile updated successfully',
            profile: updatedProfile
        });

    } catch (error) {
        console.error('Update artisan profile error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}