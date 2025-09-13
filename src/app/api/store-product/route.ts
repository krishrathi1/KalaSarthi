import { NextRequest, NextResponse } from 'next/server';
import { vectorStore, type ProductEmbedding } from '@/lib/vector-store';

export async function POST(request: NextRequest) {
  try {
    const {
      productId,
      artisanId,
      imageData,
      audioData,
      transcription,
      translations,
      metadata
    } = await request.json();

    if (!productId || !artisanId || !imageData || !metadata) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, artisanId, imageData, metadata' },
        { status: 400 }
      );
    }

    // Generate embeddings
    const imageEmbedding = vectorStore.generateImageEmbedding(imageData);
    const textEmbedding = vectorStore.generateTextEmbedding(transcription || metadata.description);
    let audioEmbedding: number[] = [];

    if (audioData) {
      // Convert base64 audio to blob-like structure for embedding
      audioEmbedding = vectorStore.generateAudioEmbedding(audioData);
    }

    // Create product embedding object
    const productEmbedding: ProductEmbedding = {
      productId,
      artisanId,
      imageEmbeddings: {
        primary: imageEmbedding,
        variants: [], // Can be extended for multiple images
        materials: [], // Will be populated by image analysis
        craftsmanship: [] // Will be populated by image analysis
      },
      textEmbeddings: {
        description: textEmbedding,
        story: vectorStore.generateTextEmbedding(transcription || ''),
        keywords: vectorStore.generateTextEmbedding(metadata.tags?.join(' ') || ''),
        categories: vectorStore.generateTextEmbedding(metadata.category || '')
      },
      audioEmbeddings: {
        voiceDescription: audioEmbedding,
        culturalContext: audioEmbedding, // Same as voice for now
        pronunciation: [] // Can be extended for accent analysis
      },
      metadata: {
        title: metadata.title || 'Untitled Product',
        description: transcription || metadata.description || '',
        price: metadata.price || 0,
        category: metadata.category || 'general',
        tags: metadata.tags || [],
        culturalSignificance: metadata.culturalSignificance || '',
        artisanName: metadata.artisanName || 'Unknown Artisan',
        region: metadata.region || 'Unknown Region',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    // Store in vector database
    await vectorStore.storeProduct(productEmbedding);

    return NextResponse.json({
      success: true,
      productId,
      message: 'Product stored successfully in vector database',
      embeddings: {
        imageDimensions: imageEmbedding.length,
        textDimensions: textEmbedding.length,
        audioDimensions: audioEmbedding.length
      }
    });

  } catch (error) {
    console.error('Store product error:', error);
    return NextResponse.json(
      { error: 'Failed to store product' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');

    if (!artisanId) {
      return NextResponse.json(
        { error: 'Missing artisanId parameter' },
        { status: 400 }
      );
    }

    const products = await vectorStore.getArtisanProducts(artisanId);

    return NextResponse.json({
      success: true,
      products: products.map(product => ({
        productId: product.productId,
        title: product.metadata.title,
        description: product.metadata.description,
        category: product.metadata.category,
        price: product.metadata.price,
        tags: product.metadata.tags,
        createdAt: product.metadata.createdAt
      }))
    });

  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve products' },
      { status: 500 }
    );
  }
}