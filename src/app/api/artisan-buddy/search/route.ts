import { NextRequest, NextResponse } from 'next/server';
import { VectorStoreService } from '@/lib/service/VectorStoreService';

export async function POST(request: NextRequest) {
    try {
        const { query, limit = 5, artisanId } = await request.json();

        if (!query) {
            return NextResponse.json(
                { error: 'Search query is required' },
                { status: 400 }
            );
        }

        const vectorStoreService = VectorStoreService.getInstance();

        // Search for similar content
        const results = await vectorStoreService.searchSimilarContent(query, limit);

        // Generate contextual response if requested
        let contextualResponse = null;
        if (artisanId) {
            contextualResponse = await vectorStoreService.generateContextualResponse(query, artisanId);
        }

        return NextResponse.json({
            query,
            results: results.map(doc => ({
                id: doc.id,
                content: doc.content,
                metadata: doc.metadata
            })),
            contextualResponse,
            totalResults: results.length
        });

    } catch (error) {
        console.error('Vector search error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const limit = parseInt(searchParams.get('limit') || '5');
        const artisanId = searchParams.get('artisanId');

        if (!query) {
            return NextResponse.json(
                { error: 'Search query is required' },
                { status: 400 }
            );
        }

        const vectorStoreService = VectorStoreService.getInstance();

        // Search for similar content
        const results = await vectorStoreService.searchSimilarContent(query, limit);

        // Generate contextual response if requested
        let contextualResponse = null;
        if (artisanId) {
            contextualResponse = await vectorStoreService.generateContextualResponse(query, artisanId);
        }

        return NextResponse.json({
            query,
            results: results.map(doc => ({
                id: doc.id,
                content: doc.content,
                metadata: doc.metadata
            })),
            contextualResponse,
            totalResults: results.length
        });

    } catch (error) {
        console.error('Vector search error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}