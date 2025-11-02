
import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService, COLLECTIONS } from '@/lib/firestore';
import { IProduct } from '@/lib/models/Product';

export async function PUT(
  request: NextRequest,
  { params }: {
    params: Promise<{
      productId: string;
    }>
  }
) {
  const { productId } = await params;
  const body = await request.json();

  if (!productId) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  try {
    const product = await FirestoreService.getById<IProduct>(COLLECTIONS.PRODUCTS, productId);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update the amazonListing field
    const updatedProduct = {
      ...product,
      amazonListing: {
        ...product.amazonListing,
        ...body,
        isListed: true,
        lastSync: new Date(),
      }
    };

    await FirestoreService.update(COLLECTIONS.PRODUCTS, productId, updatedProduct);

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Failed to update Amazon listing status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
