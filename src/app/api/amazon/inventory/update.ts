import { NextApiRequest, NextApiResponse } from 'next';

interface UpdateInventoryRequest {
    accessToken: string;
    sku: string;
    quantity: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { accessToken, sku, quantity }: UpdateInventoryRequest = req.body;

        if (!accessToken || !sku || quantity === undefined) {
            return res.status(400).json({ error: 'Missing required parameters' });
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
            return res.status(response.status).json({
                error: errorData.error || errorData.message || `SP-API request failed: ${response.status}`
            });
        }

        const responseData = await response.json();
        res.status(200).json(responseData);
    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
