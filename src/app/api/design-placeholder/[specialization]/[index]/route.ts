/**
 * Design Placeholder API
 * Provides placeholder images for design generation
 */

import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    specialization: string;
    index: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { specialization, index } = params;
  
  // Placeholder images by specialization
  const placeholderImages: { [key: string]: string[] } = {
    pottery: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop'
    ],
    jewelry: [
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400&h=400&fit=crop'
    ],
    textiles: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1582639590180-5d5c5c2a8f8c?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400&h=400&fit=crop'
    ],
    woodwork: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop'
    ]
  };

  const images = placeholderImages[specialization.toLowerCase()] || placeholderImages.pottery;
  const imageIndex = parseInt(index) % images.length;
  const imageUrl = images[imageIndex];

  // Redirect to the actual image
  return NextResponse.redirect(imageUrl);
}