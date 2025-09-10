import { NextRequest, NextResponse } from 'next/server';

interface GetOrdersRequest {
    accessToken: string;
    marketplace: string;
    createdAfter?: string;
    statuses?: string[];
    maxResults?: number;
}

export async function POST(request: NextRequest) {
    try {
        const { accessToken, marketplace, createdAfter, statuses, maxResults }: GetOrdersRequest = await request.json();

        if (!accessToken || !marketplace) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const queryParams = new URLSearchParams();
        queryParams.append('MarketplaceIds', marketplace);

        if (createdAfter) {
            queryParams.append('CreatedAfter', createdAfter);
        } else {
            // Default to last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            queryParams.append('CreatedAfter', thirtyDaysAgo.toISOString());
        }

        if (statuses?.length) {
            statuses.forEach(status => {
                queryParams.append('OrderStatuses', status);
            });
        }

        if (maxResults) {
            queryParams.append('MaxResultsPerPage', maxResults.toString());
        }

        const response = await fetch(
            `https://sandbox.sellingpartnerapi-na.amazon.com/orders/v0/orders?${queryParams.toString()}`,
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
        console.error('Get orders error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
