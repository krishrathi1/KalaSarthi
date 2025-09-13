import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { marketplace: string; sku: string } }
) {
  const { marketplace, sku } = params;
  const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!accessToken) {
    return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  }

  if (!marketplace || !sku) {
    return NextResponse.json({ error: 'Marketplace and SKU required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://sandbox.sellingpartnerapi-na.amazon.com/listings/2021-08-01/items/${marketplace}/${sku}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-amz-access-token': accessToken,
          'User-Agent': 'ArtisanMarketplace/1.0 (Language=JavaScript)'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || errorData.message || `SP-API request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get listing status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
