/**
 * Vector Embeddings Management API
 * Handles creation, update, and management of vector embeddings in Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirestoreVectorSearch } from '@/lib/services/FirestoreVectorSearch';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, query, options } = body;

    const vectorSearch = FirestoreVectorSearch.getInstance();

    switch (action) {
      case 'store_user_embeddings':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required for storing embeddings' },
            { status: 400 }
          );
        }
        
        await vectorSearch.updateUserEmbeddings(userId);
        return NextResponse.json({
          success: true,
          message: `Embeddings updated for user ${userId}`
        });

      case 'batch_process':
        await vectorSearch.batchProcessEmbeddings();
        return NextResponse.json({
          success: true,
          message: 'Batch processing completed'
        });

      case 'search':
        if (!query) {
          return NextResponse.json(
            { error: 'query is required for search' },
            { status: 400 }
          );
        }

        const results = await vectorSearch.searchSimilarUsers({
          query,
          ...options
        });

        return NextResponse.json({
          success: true,
          results,
          count: results.length
        });

      case 'search_artisans':
        if (!query) {
          return NextResponse.json(
            { error: 'query is required for artisan search' },
            { status: 400 }
          );
        }

        const artisanResults = await vectorSearch.searchArtisans(query, options || {});
        return NextResponse.json({
          success: true,
          results: artisanResults,
          count: artisanResults.length
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: store_user_embeddings, batch_process, search, search_artisans' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Vector embeddings API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const vectorSearch = FirestoreVectorSearch.getInstance();

    switch (action) {
      case 'analytics':
        const analytics = await vectorSearch.getSearchAnalytics();
        return NextResponse.json({
          success: true,
          analytics
        });

      case 'health':
        return NextResponse.json({
          success: true,
          status: 'healthy',
          service: 'Firestore Vector Search',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: analytics, health' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Vector embeddings GET API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}