
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';

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
    await dbConnect();

    const product = await Product.findOne({ productId: productId });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update the amazonListing field
    product.amazonListing = {
      ...product.amazonListing,
      ...body,
      isListed: true,
      lastSync: new Date(),
    };

    await product.save();

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to update Amazon listing status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
