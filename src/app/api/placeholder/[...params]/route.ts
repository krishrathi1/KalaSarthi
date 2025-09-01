import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { params: string[] } }
) {
  try {
    const [width, height, type] = params.params;

    // For artisan avatars, return a proper artisan-themed placeholder
    if (type === 'artisan') {
      // You can replace this with a proper artisan avatar image URL or generate one
      // For now, we'll use a more appropriate placeholder service
      const redirectUrl = `https://ui-avatars.com/api/?name=Artisan&background=8B5CF6&color=fff&size=${width}x${height}&font-size=0.6`;

      return NextResponse.redirect(redirectUrl);
    }

    // For other types, use a generic placeholder
    const redirectUrl = `https://via.placeholder.com/${width}x${height}?text=${type || 'Image'}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Placeholder API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate placeholder' },
      { status: 500 }
    );
  }
}