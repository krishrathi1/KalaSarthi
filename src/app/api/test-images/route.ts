import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Test the image generation function
        const getImageForQuery = (query: string, index: number) => {
            const queryLower = query.toLowerCase();
            const imageCategories = {
                jewelry: ['jewelry', 'necklace', 'ring', 'earring', 'bracelet'],
                textile: ['fabric', 'saree', 'dress', 'cloth', 'textile'],
                pottery: ['pottery', 'ceramic', 'pot', 'vase', 'bowl'],
                wood: ['wood', 'furniture', 'table', 'chair', 'wooden'],
                art: ['painting', 'art', 'canvas', 'sculpture', 'artwork'],
                craft: ['handmade', 'craft', 'decorative', 'ornament', 'gift']
            };

            // Find matching category
            let category = 'craft';
            for (const [cat, keywords] of Object.entries(imageCategories)) {
                if (keywords.some(keyword => queryLower.includes(keyword))) {
                    category = cat;
                    break;
                }
            }

            // Generate appropriate image URLs
            const imageUrls = {
                jewelry: [
                    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop'
                ],
                textile: [
                    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop'
                ],
                pottery: [
                    'https://images.unsplash.com/photo-1578662996442-48f61c03fc96?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop'
                ],
                wood: [
                    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'
                ],
                art: [
                    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop'
                ],
                craft: [
                    'https://images.unsplash.com/photo-1601762603332-db5e4b90cc5d?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1544966503-7cc5ac882d5e?w=400&h=400&fit=crop'
                ]
            };

            const categoryImages = imageUrls[category as keyof typeof imageUrls] || imageUrls.craft;
            return categoryImages[index % categoryImages.length];
        };

        // Test different queries
        const testQueries = ['wooden furniture', 'jewelry', 'pottery', 'textile', 'art'];
        const testResults = testQueries.map((query, index) => ({
            query,
            category: query.toLowerCase().includes('jewelry') ? 'jewelry' :
                query.toLowerCase().includes('wood') ? 'wood' :
                    query.toLowerCase().includes('pottery') ? 'pottery' :
                        query.toLowerCase().includes('textile') ? 'textile' :
                            query.toLowerCase().includes('art') ? 'art' : 'craft',
            imageUrl: getImageForQuery(query, index),
            price: `₹${(Math.floor(Math.random() * 5000) + 500).toLocaleString()}`
        }));

        return NextResponse.json({
            success: true,
            message: 'Image generation test',
            results: testResults,
            totalQueries: testQueries.length
        });

    } catch (error) {
        console.error('Test images API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
