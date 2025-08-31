import { IUser } from "@/lib/models/User";
import { UserService } from "@/lib/service/UserService";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
    params: {
        uid: string;
    };
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { uid } = params;
        const user = await UserService.getUserByUid(uid);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: user },
            { status: 200 }
        );
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { uid } = params;
        const updateData: Partial<IUser> = await request.json();

        const result = await UserService.updateUser(uid, updateData);

        if (result.success) {
            return NextResponse.json(
                { success: true, data: result },
                { status: 200 }
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

export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { uid } = params;
        const result = await UserService.deleteUser(uid);

        if (result.success) {
            return NextResponse.json(
                { success: true, data: result },
                { status: 200 }
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