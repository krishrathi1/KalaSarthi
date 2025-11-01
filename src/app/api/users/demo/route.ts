import { UserService } from "@/lib/service/UserService";
import { NextRequest, NextResponse } from "next/server";

/**
 * Demo Login API Endpoint
 * Allows quick access for judges/testers without Firebase authentication
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone');

        if (!phone) {
            return NextResponse.json(
                { success: false, error: 'Phone number is required' },
                { status: 400 }
            );
        }

        // Get user by phone number
        const user = await UserService.getUserByPhone(phone);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Prevent caching of user data
        const response = NextResponse.json(
            { success: true, data: user },
            { status: 200 }
        );
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        
        return response;
    } catch (error) {
        console.error('Demo Login API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
