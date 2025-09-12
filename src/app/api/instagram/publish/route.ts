import { NextRequest, NextResponse } from 'next/server';
import { publishImage } from '@/lib/services/instagram';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { imageUrl, caption, altText } = body || {};

        if (!imageUrl) {
            return NextResponse.json({ success: false, error: 'imageUrl is required' }, { status: 400 });
        }

        const igId = process.env.INSTAGRAM_IG_ID;
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        if (!igId || !accessToken) {
            return NextResponse.json({ success: false, error: 'Instagram credentials not configured' }, { status: 500 });
        }

        const result = await publishImage({
            igId,
            accessToken,
            imageUrl,
            caption,
            altText
        });

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, mediaId: result.mediaId, containerId: result.containerId });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error?.message || 'Unexpected error' }, { status: 500 });
    }
}


