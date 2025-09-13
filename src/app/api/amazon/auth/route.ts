import { NextRequest, NextResponse } from 'next/server';

interface AuthRequest {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}

export async function POST(request: NextRequest) {
    try {
        const { clientId, clientSecret, refreshToken }: AuthRequest = await request.json();

        if (!clientId || !clientSecret || !refreshToken) {
            return NextResponse.json({ error: 'Missing required credentials' }, { status: 400 });
        }

        const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret
            })
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error_description || 'Authentication failed' },
                { status: tokenResponse.status }
            );
        }

        const tokenData = await tokenResponse.json();
        return NextResponse.json(tokenData);
    } catch (error) {
        console.error('Amazon auth error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
