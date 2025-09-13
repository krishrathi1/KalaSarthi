import { NextRequest, NextResponse } from 'next/server';

interface UpdateInventoryRequest {
    accessToken: string;
    sku: string;
    quantity: number;
}

export async function POST(request: NextRequest) {
    try {
        const { accessToken, sku, quantity }: UpdateInventoryRequest = await request.json();

        if (!accessToken || !sku || quantity === undefined) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const inventoryPayload = {
            inventory: [{
                sellerSku: sku,
                quantity: {
                    totalQuantity: quantity
                }
            }]
        };

        const response = await fetch(
            'https://sandbox.sellingpartnerapi-na.amazon.com/fba/inventory/v1',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'x-amz-access-token': accessToken,
                    'User-Agent': 'ArtisanMarketplace/1.0 (Language=JavaScript)'
                },
                body: JSON.stringify(inventoryPayload)
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
        console.error('Update inventory error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}