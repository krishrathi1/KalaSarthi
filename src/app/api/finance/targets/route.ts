import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const targetData = await request.json();
    
    // Validate the target data
    if (!targetData.artisanId || !targetData.target || !targetData.currentRevenue) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: artisanId, target, currentRevenue'
      }, { status: 400 });
    }
    
    // In a real implementation, you would save this to a database
    // For now, we'll just return success to indicate the API works
    console.log('Revenue target saved:', {
      artisanId: targetData.artisanId,
      target: targetData.target,
      currentRevenue: targetData.currentRevenue,
      growthRequired: targetData.growthRequired,
      setDate: targetData.setDate
    });
    
    return NextResponse.json({
      success: true,
      message: 'Revenue target saved successfully',
      data: {
        id: `target_${Date.now()}`,
        ...targetData,
        savedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error saving revenue target:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save revenue target'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');
    
    if (!artisanId) {
      return NextResponse.json({
        success: false,
        error: 'artisanId parameter is required'
      }, { status: 400 });
    }
    
    // In a real implementation, you would fetch from database
    // For now, return a mock target
    return NextResponse.json({
      success: true,
      data: {
        id: 'target_mock',
        artisanId,
        target: 250000,
        currentRevenue: 178300,
        growthRequired: 40.2,
        setDate: new Date().toISOString(),
        status: 'active'
      }
    });
    
  } catch (error) {
    console.error('Error fetching revenue target:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch revenue target'
    }, { status: 500 });
  }
}