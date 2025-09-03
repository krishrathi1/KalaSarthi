import { NextRequest, NextResponse } from 'next/server';

interface ViralRequest {
  userId?: string;
  profession?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, profession }: ViralRequest = await request.json();

    console.log(`🚨 Loading viral alerts for profession: ${profession}`);

    // Mock viral alerts data - in production, this would come from:
    // 1. Social media APIs (Twitter, Instagram)
    // 2. Google Trends API
    // 3. Recent sales data analysis
    // 4. Platform-specific trending products

    const viralAlerts = generateViralAlerts(profession || 'general');

    console.log(`✅ Generated ${viralAlerts.length} viral alerts`);

    return NextResponse.json({
      success: true,
      alerts: viralAlerts,
      profession: profession || 'general'
    });

  } catch (error) {
    console.error('❌ Viral alerts API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateViralAlerts(profession: string) {
  const professionAlerts: Record<string, any[]> = {
    weaver: [
      {
        id: 'viral-1',
        title: 'Banarasi Silk Sarees Going Viral on Instagram',
        description: 'Traditional Banarasi silk sarees are trending with 2.3M views in the last 24 hours',
        platform: 'Instagram',
        timeAgo: '2 hours ago',
        trendScore: 95,
        category: 'Sarees'
      },
      {
        id: 'viral-2',
        title: 'Handwoven Dupattas Exploding on TikTok',
        description: 'Artisan dupattas are getting 500K+ views with viral dance challenges',
        platform: 'TikTok',
        timeAgo: '4 hours ago',
        trendScore: 88,
        category: 'Dupattas'
      },
      {
        id: 'viral-3',
        title: 'Traditional Textiles Surge on Pinterest',
        description: 'Handloom textiles gaining 150% more saves this week',
        platform: 'Pinterest',
        timeAgo: '1 day ago',
        trendScore: 82,
        category: 'Textiles'
      }
    ],
    potter: [
      {
        id: 'viral-1',
        title: 'Ceramic Dinner Sets Trending on Instagram',
        description: 'Handmade ceramic dinner sets getting featured in home decor accounts',
        platform: 'Instagram',
        timeAgo: '3 hours ago',
        trendScore: 91,
        category: 'Tableware'
      },
      {
        id: 'viral-2',
        title: 'Artisan Pottery Going Viral',
        description: 'Traditional pottery techniques featured in 50+ reels this week',
        platform: 'Instagram Reels',
        timeAgo: '6 hours ago',
        trendScore: 85,
        category: 'Decor'
      }
    ],
    jeweler: [
      {
        id: 'viral-1',
        title: 'Silver Jewelry Sets Exploding',
        description: 'Traditional silver jewelry gaining massive traction on fashion platforms',
        platform: 'Fashion Apps',
        timeAgo: '1 hour ago',
        trendScore: 93,
        category: 'Jewelry'
      },
      {
        id: 'viral-2',
        title: 'Gemstone Earrings Trending',
        description: 'Handcrafted gemstone earrings featured in celebrity styling',
        platform: 'Instagram',
        timeAgo: '5 hours ago',
        trendScore: 87,
        category: 'Earrings'
      }
    ],
    painter: [
      {
        id: 'viral-1',
        title: 'Miniature Paintings Going Viral',
        description: 'Traditional miniature art getting 1M+ views on art platforms',
        platform: 'Art Communities',
        timeAgo: '8 hours ago',
        trendScore: 89,
        category: 'Paintings'
      }
    ],
    woodworking: [
      {
        id: 'viral-1',
        title: 'Handcrafted Wooden Toys Trending',
        description: 'Sustainable wooden toys gaining popularity among eco-conscious parents',
        platform: 'Parenting Forums',
        timeAgo: '12 hours ago',
        trendScore: 86,
        category: 'Toys'
      },
      {
        id: 'viral-2',
        title: 'Wooden Furniture Hacks',
        description: 'DIY wooden furniture tutorials getting millions of views',
        platform: 'YouTube',
        timeAgo: '1 day ago',
        trendScore: 92,
        category: 'Furniture'
      }
    ]
  };

  // Return profession-specific alerts or general alerts
  return professionAlerts[profession.toLowerCase()] ||
         professionAlerts['weaver']; // Default fallback
}