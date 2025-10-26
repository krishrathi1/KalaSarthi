import { NextRequest, NextResponse } from 'next/server';

interface CreateListingRequest {
    accessToken: string;
    marketplace: string;
    sku: string;
    listingData: {
        title: string;
        description: string;
        brand?: string;
        condition?: string;
        category: string;
    };
}

export async function POST(request: NextRequest) {
    try {
        const { accessToken, marketplace, sku, listingData }: CreateListingRequest = await request.json();

        if (!accessToken || !marketplace || !sku || !listingData) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const listingPayload = {
            productType: 'PRODUCT',
            requirements: 'LISTING',
            attributes: {
                condition_type: [{ value: listingData.condition || 'new' }],
                item_name: [{ value: listingData.title }],
                brand: [{ value: listingData.brand || 'Generic' }],
                manufacturer: [{ value: listingData.brand || 'Generic' }],
                item_type_name: [{ value: listingData.category }],
                description: [{ value: listingData.description }],
                bullet_point: [{ value: listingData.description.substring(0, 500) }],
                external_product_id: [{
                    external_product_id_type: 'EAN',
                    external_product_id: `${Math.random().toString().substring(2, 15)}`
                }]
            }
        };

        const response = await fetch(
            `https://sandbox.sellingpartnerapi-na.amazon.com/listings/2021-08-01/items/${marketplace}/${sku}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'x-amz-access-token': accessToken,
                    'User-Agent': 'ArtisanMarketplace/1.0 (Language=JavaScript)'
                },
                body: JSON.stringify(listingPayload)
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
        console.error('Create listing error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
