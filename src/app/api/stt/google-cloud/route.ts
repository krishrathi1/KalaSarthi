import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const language = formData.get('language') as string || 'en-US';

        if (!audioFile) {
            return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
        }

        console.log('🎤 Processing audio with Google Cloud STT:', {
            fileName: audioFile.name,
            fileSize: audioFile.size,
            fileType: audioFile.type,
            language
        });

        // Check if Google Cloud credentials are available
        const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
        const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

        if (!privateKey || !clientEmail || !projectId) {
            console.error('Missing Google Cloud credentials');
            return NextResponse.json({ error: 'Google Cloud STT not configured' }, { status: 500 });
        }

        // Convert audio file to base64
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioBytes = Buffer.from(arrayBuffer).toString('base64');

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

        // Call Google Cloud Speech-to-Text API
        const sttResponse = await fetch(`https://speech.googleapis.com/v1/speech:recognize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                config: {
                    encoding: 'WEBM_OPUS',
                    sampleRateHertz: 16000,
                    languageCode: language,
                    enableAutomaticPunctuation: true,
                    model: 'latest_long'
                },
                audio: {
                    content: audioBytes
                }
            }),
        });

        if (!sttResponse.ok) {
            const errorText = await sttResponse.text();
            console.error('Google Cloud STT API error:', errorText);
            throw new Error(`Google Cloud STT API failed: ${sttResponse.status}`);
        }

        const sttData = await sttResponse.json();
        console.log('✅ Google Cloud STT result:', sttData);

        if (sttData.results && sttData.results.length > 0) {
            const transcript = sttData.results[0].alternatives[0].transcript;
            const confidence = sttData.results[0].alternatives[0].confidence || 0.9;

            return NextResponse.json({
                success: true,
                transcript: transcript,
                confidence: confidence,
                language: language,
                service: 'google-cloud-stt'
            });
        } else {
            throw new Error('No speech detected in audio');
        }

    } catch (error) {
        console.error('Google Cloud STT error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            service: 'google-cloud-stt'
        }, { status: 500 });
    }
}