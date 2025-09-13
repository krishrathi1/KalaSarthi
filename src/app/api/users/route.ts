import { IUser } from "@/lib/models/User";
import { UserService } from "@/lib/service/UserService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const userData: Partial<IUser> = await request.json();

        // Validate required fields
        if (!userData.uid || !userData.name || !userData.phone || !userData.role) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: uid, name, phone, role'
                },
                { status: 400 }
            );
        }

        const result = await UserService.createUser(userData);

        if (result.success) {
            return NextResponse.json(
                { success: true, data: result.data },
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

        if (search) {
            const users = await UserService.searchArtisans(search);
            return NextResponse.json(
                { success: true, data: users },
                { status: 200 }
            );
        }

        if (role === 'artisan') {
            const artisans = await UserService.getAllArtisans();
            return NextResponse.json(
                { success: true, data: artisans },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Invalid request parameters' },
            { status: 400 }
        );

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}