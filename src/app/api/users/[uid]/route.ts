import { UserService } from "@/lib/service/UserService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
) {
    try {
        const { uid } = await params;

        if (!uid) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User ID is required'
                },
                { status: 400 }
            );
        }

        const user = await UserService.getUserByUid(uid);

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found'
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: user
            },
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
    { params }: { params: Promise<{ uid: string }> }
) {
    try {
        const { uid } = await params;
        const updateData = await request.json();

        if (!uid) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User ID is required'
                },
                { status: 400 }
            );
        }

        const result = await UserService.updateUser(uid, updateData);

        if (result.success) {
            // Get updated user data
            const updatedUser = await UserService.getUserByUid(uid);

            return NextResponse.json(
                {
                    success: true,
                    data: updatedUser,
                    modifiedCount: result.modifiedCount
                },
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
    { params }: { params: Promise<{ uid: string }> }
) {
    try {
        const { uid } = await params;

        if (!uid) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User ID is required'
                },
                { status: 400 }
            );
        }

        const result = await UserService.deleteUser(uid);

        if (result.success) {
            return NextResponse.json(
                {
                    success: true,
                    message: 'User deleted successfully',
                    deletedCount: result.deletedCount
                },
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