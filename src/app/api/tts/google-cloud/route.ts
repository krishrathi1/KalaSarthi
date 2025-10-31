import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { text, languageCode = 'en-US', voiceName = 'en-US-Wavenet-F', audioEncoding = 'MP3' } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Check if Google Cloud credentials are available
        const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
        const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

        if (!privateKey || !clientEmail || !projectId) {
            console.error('Missing Google Cloud credentials');
            return NextResponse.json({ error: 'Google Cloud TTS not configured' }, { status: 500 });
        }

        // Create JWT token for Google Cloud API
        const jwt = require('jsonwebtoken');
        const now = Math.floor(Date.now() / 1000);

        const payload = {
            iss: clientEmail,
            scope: 'https://www.googleapis.com/auth/cloud-platform',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now,
        };

        const token = jwt.sign(payload, privateKey.replace(/\\n/g, '\n'), { algorithm: 'RS256' });

        // Get access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: token,
            }),
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to get access token');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Call Google Cloud Text-to-Speech API
        const ttsResponse = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                input: { text },
                voice: {
                    languageCode,
                    name: voiceName,
                    ssmlGender: 'FEMALE'
                },
                audioConfig: {
                    audioEncoding,
                    speakingRate: 1.0,
                    pitch: 0.0,
                    volumeGainDb: 0.0
                }
            }),
        });

        if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            console.error('Google Cloud TTS API error:', errorText);
            throw new Error(`Google Cloud TTS API failed: ${ttsResponse.status}`);
        }

        const ttsData = await ttsResponse.json();

        return NextResponse.json({
            success: true,
            audioContent: ttsData.audioContent,
            audioEncoding,
            service: 'google-cloud'
        });

    } catch (error) {
        console.error('Google Cloud TTS error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            service: 'google-cloud'
        }, { status: 500 });
    }
}