import { NextRequest, NextResponse } from 'next/server';
import { orderOrchestratorAgent } from '@/ai/agents/order-orchestrator';
import { designCollaboratorAgent } from '@/ai/agents/design-collaborator';
import { BuyerConnectOrder } from '@/lib/models';
import connectDB from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'analyze_order':
        return await handleAnalyzeOrder(body);
      case 'create_order':
        return await handleCreateOrder(body);
      case 'generate_design':
        return await handleGenerateDesign(body);
      case 'analyze_feedback':
        return await handleAnalyzeFeedback(body);
      case 'update_status':
        return await handleUpdateStatus(body);
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role'); // 'buyer' or 'artisan'
    const status = searchParams.get('status');

    if (!userId || !role) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: userId, role'
      }, { status: 400 });
    }

    // Build query based on role
    const query: any = {};
    if (role === 'buyer') {
      query.buyerId = userId;
    } else if (role === 'artisan') {
      query.artisanId = userId;
    }

    if (status) {
      query.status = status;
    }

    const orders = await BuyerConnectOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch orders'
    }, { status: 500 });
  }
}

async function handleAnalyzeOrder(body: any) {
  try {
    const { buyerId, artisanId, chatSessionId, requirements, timeline, budget } = body;

    if (!buyerId || !artisanId || !chatSessionId || !requirements) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const analysis = await orderOrchestratorAgent.analyzeOrder({
      buyerId,
      artisanId,
      chatSessionId,
      requirements,
      timeline: timeline || { flexibility: 'flexible' },
      budget: budget || { min: 1000, max: 50000, currency: 'INR' }
    });

    return NextResponse.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Order analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze order'
    }, { status: 500 });
  }
}

async function handleCreateOrder(body: any) {
  try {
    const { orderRequest, analysis } = body;

    if (!orderRequest || !analysis) {
      return NextResponse.json({
        success: false,
        error: 'Missing order request or analysis'
      }, { status: 400 });
    }

    const orderId = await orderOrchestratorAgent.createOptimizedOrder(orderRequest, analysis);

    return NextResponse.json({
      success: true,
      data: { orderId }
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create order'
    }, { status: 500 });
  }
}

async function handleGenerateDesign(body: any) {
  try {
    const { orderId, buyerId, artisanId, requirements, designPreferences, context } = body;

    if (!orderId || !buyerId || !artisanId || !requirements) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields for design generation'
      }, { status: 400 });
    }

    const designConcepts = await designCollaboratorAgent.generateDesignConcepts({
      orderId,
      buyerId,
      artisanId,
      requirements,
      designPreferences: designPreferences || { traditional: true },
      context: context || { craftTradition: 'traditional' }
    });

    return NextResponse.json({
      success: true,
      data: designConcepts
    });
  } catch (error) {
    console.error('Design generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate design concepts'
    }, { status: 500 });
  }
}

async function handleAnalyzeFeedback(body: any) {
  try {
    const { designId, feedback, buyerId, orderId } = body;

    if (!designId || !feedback || !buyerId || !orderId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields for feedback analysis'
      }, { status: 400 });
    }

    const analysis = await designCollaboratorAgent.analyzeFeedback(
      designId,
      feedback,
      buyerId,
      orderId
    );

    return NextResponse.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Feedback analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze feedback'
    }, { status: 500 });
  }
}

async function handleUpdateStatus(body: any) {
  try {
    const { orderId, status, updateData } = body;

    if (!orderId || !status) {
      return NextResponse.json({
        success: false,
        error: 'Missing orderId or status'
      }, { status: 400 });
    }

    const updateFields: any = { status };
    if (updateData) {
      Object.assign(updateFields, updateData);
    }

    const updatedOrder = await BuyerConnectOrder.findByIdAndUpdate(
      orderId,
      updateFields,
      { new: true }
    );

    if (!updatedOrder) {
      return NextResponse.json({
        success: false,
        error: 'Order not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update order'
    }, { status: 500 });
  }
}