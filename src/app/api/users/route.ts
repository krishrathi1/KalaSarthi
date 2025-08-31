import { IUser } from "@/lib/models/User";
import { UserService } from "@/lib/service/UserService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const userData: Partial<IUser> = await request.json();

        // Validate required fields
        if (!userData.uid || !userData.name || !userData.role) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: uid, name, role'
                },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await UserService.getUserByUid(userData.uid);
        if (existingUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User already exists'
                },
                { status: 409 }
            );
        }

        const result = await UserService.createUser(userData);

        if (result.success) {
            return NextResponse.json(
                { success: true, data: result },
                { status: 201 }
            );
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const search = searchParams.get('search');

        if (role === 'artisan') {
            let artisans;
            if (search) {
                artisans = await UserService.searchArtisans(search);
            } else {
                artisans = await UserService.getAllArtisans();
            }
            return NextResponse.json(
                { success: true, data: artisans },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid role parameter' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}