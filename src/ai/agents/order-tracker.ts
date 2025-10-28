import { z } from 'zod';
import { genAIService } from '../core/genai-service';
import { agentOrchestrator, AIAgent } from '../core/agent-orchestrator';
import { aiMonitoringService } from '../core/monitoring';
import { BuyerConnectOrder } from '../../lib/models';

// Order tracking analysis schema
const OrderTrackingAnalysis = z.object({
  currentStatus: z.string(),
  progressPercentage: z.number().min(0).max(100),
  predictedCompletion: z.object({
    estimatedDate: z.string(),
    confidence: z.number().min(0).max(1),
    factors: z.array(z.string())
  }),
  riskAssessment: z.object({
    delayRisk: z.enum(['low', 'medium', 'high']),
    qualityRisk: z.enum(['low', 'medium', 'high']),
    communicationRisk: z.enum(['low', 'medium', 'high']),
    riskFactors: z.array(z.string()),
    mitigationSuggestions: z.array(z.string())
  }),
  nextMilestones: z.array(z.object({
    milestone: z.string(),
    expectedDate: z.string(),
    requirements: z.array(z.string()),
    priority: z.enum(['low', 'medium', 'high'])
  })),
  recommendations: z.array(z.object({
    action: z.string(),
    reason: z.string(),
    urgency: z.enum(['low', 'medium', 'high']),
    targetAudience: z.enum(['buyer', 'artisan', 'both'])
  })),
  qualityPrediction: z.object({
    expectedQuality: z.number().min(0).max(1),
    qualityFactors: z.array(z.string()),
    improvementAreas: z.array(z.string())
  }),
  communicationInsights: z.object({
    responseTime: z.number(),
    communicationQuality: z.number().min(0).max(1),
    languageBarriers: z.boolean(),
    suggestedActions: z.array(z.string())
  })
});

// Status update request schema
const StatusUpdateRequest = z.object({
  orderId: z.string(),
  newStatus: z.string(),
  updateData: z.record(z.any()).optional(),
  notes: z.string().optional(),
  images: z.array(z.string()).optional(),
  updatedBy: z.string()
});

export type OrderTrackingAnalysis = z.infer<typeof OrderTrackingAnalysis>;
export type StatusUpdateRequest = z.infer<typeof StatusUpdateRequest>;

/**
 * Order Tracker Agent
 * Provides intelligent order tracking with predictive analytics
 */
export class OrderTrackerAgent {
  private agentId = 'order-tracker';

  constructor() {
    const agentConfig: AIAgent = {
      id: this.agentId,
      name: 'Order Tracker',
      description: 'Provides intelligent order tracking with predictive analytics and risk assessment',
      capabilities: ['order-tracking', 'predictive-analytics', 'risk-assessment', 'quality-prediction'],
      status: 'active',
      priority: 8,
      lastActivity: new Date()
    };
    agentOrchestrator.registerAgent(agentConfig);
  }

  /**
   * Analyze order progress and predict outcomes
   */
  async analyzeOrderProgress(orderId: string): Promise<OrderTrackingAnalysis> {
    const startTime = Date.now();
    try {
      // Get order details
      const order = await BuyerConnectOrder.findById(orderId).lean();
      if (!order) {
        throw new Error('Order not found');
      }

      // Build analysis prompt
      const analysisPrompt = this.buildTrackingAnalysisPrompt(order);

      // Generate tracking analysis using GenAI
      const analysis = await genAIService.generateStructured(
        analysisPrompt,
        OrderTrackingAnalysis,
        {
          order,
          analysisType: 'order-tracking-analysis'
        },
        'pro'
      );

      // Log successful analysis
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'order-tracking-analysis',
        order.buyerId,
        order.chatSessionId,
        duration,
        true,
        undefined,
        {
          orderId,
          currentStatus: order.status,
          progressPercentage: analysis.progressPercentage,
          delayRisk: analysis.riskAssessment.delayRisk
        }
      );

      return analysis;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      aiMonitoringService.logAgentTask(
        this.agentId,
        'order-tracking-analysis',
        'unknown',
        'unknown',
        duration,
        false,
        errorMessage
      );
      throw new Error(`Order tracking analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Update order status with AI insights
   */
  async updateOrderStatus(request: StatusUpdateRequest): Promise<{
    success: boolean;
    updatedOrder: any;
    aiInsights: any;
  }> {
    const startTime = Date.now();
    try {
      const validatedRequest = StatusUpdateRequest.parse(request);

      // Get current order
      const order = await BuyerConnectOrder.findById(validatedRequest.orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Generate AI insights for the status update
      const updateInsights = await this.generateStatusUpdateInsights(
        order,
        validatedRequest.newStatus,
        validatedRequest.notes
      );

      // Update order status and related fields
      const updateFields: any = {
        status: validatedRequest.newStatus,
        'communication.lastMessageAt': new Date()
      };

      // Apply additional update data
      if (validatedRequest.updateData) {
        Object.assign(updateFields, validatedRequest.updateData);
      }

      // Update milestones if applicable
      if (this.shouldUpdateMilestones(validatedRequest.newStatus)) {
        const milestoneUpdate = this.getMilestoneUpdate(validatedRequest.newStatus);
        if (milestoneUpdate) {
          updateFields[`timeline.milestones.${milestoneUpdate.index}.status`] = 'completed';
          updateFields[`timeline.milestones.${milestoneUpdate.index}.actualDate`] = new Date();
        }
      }

      // Add AI insights to order
      updateFields['aiInsights.lastAnalysis'] = updateInsights;
      updateFields['aiInsights.lastUpdated'] = new Date();

      const updatedOrder = await BuyerConnectOrder.findByIdAndUpdate(
        validatedRequest.orderId,
        updateFields,
        { new: true }
      );

      // Log successful update
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'status-update',
        order.buyerId,
        order.chatSessionId,
        duration,
        true,
        undefined,
        {
          orderId: validatedRequest.orderId,
          oldStatus: order.status,
          newStatus: validatedRequest.newStatus
        }
      );

      return {
        success: true,
        updatedOrder,
        aiInsights: updateInsights
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      aiMonitoringService.logAgentTask(
        this.agentId,
        'status-update',
        'unknown',
        'unknown',
        duration,
        false,
        errorMessage
      );
      throw new Error(`Status update failed: ${errorMessage}`);
    }
  }

  /**
   * Predict delivery timeline with confidence intervals
   */
  async predictDeliveryTimeline(orderId: string): Promise<{
    estimatedDelivery: Date;
    confidence: number;
    scenarios: Array<{
      scenario: string;
      probability: number;
      estimatedDate: Date;
      factors: string[];
    }>;
  }> {
    const startTime = Date.now();
    try {
      const order = await BuyerConnectOrder.findById(orderId).lean();
      if (!order) {
        throw new Error('Order not found');
      }

      const predictionPrompt = this.buildDeliveryPredictionPrompt(order);

      const predictionSchema = z.object({
        estimatedDelivery: z.string(),
        confidence: z.number().min(0).max(1),
        scenarios: z.array(z.object({
          scenario: z.string(),
          probability: z.number().min(0).max(1),
          estimatedDate: z.string(),
          factors: z.array(z.string())
        }))
      });

      const prediction = await genAIService.generateStructured(
        predictionPrompt,
        predictionSchema,
        { order },
        'pro'
      );

      // Log successful prediction
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'delivery-prediction',
        order.buyerId,
        order.chatSessionId,
        duration,
        true,
        undefined,
        {
          orderId,
          confidence: prediction.confidence,
          scenarioCount: prediction.scenarios.length
        }
      );

      return {
        estimatedDelivery: new Date(prediction.estimatedDelivery),
        confidence: prediction.confidence,
        scenarios: prediction.scenarios.map(s => ({
          ...s,
          estimatedDate: new Date(s.estimatedDate)
        }))
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      aiMonitoringService.logAgentTask(
        this.agentId,
        'delivery-prediction',
        'unknown',
        'unknown',
        duration,
        false,
        errorMessage
      );
      throw error;
    }
  }

  /**
   * Generate proactive notifications based on order status
   */
  async generateProactiveNotifications(orderId: string): Promise<Array<{
    recipient: 'buyer' | 'artisan' | 'both';
    type: 'info' | 'warning' | 'action_required';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
    suggestedActions: string[];
  }>> {
    try {
      const analysis = await this.analyzeOrderProgress(orderId);
      const notifications = [];

      // Generate notifications based on risk assessment
      if (analysis.riskAssessment.delayRisk === 'high') {
        notifications.push({
          recipient: 'both' as const,
          type: 'warning' as const,
          title: 'Potential Delay Risk Detected',
          message: 'Our AI analysis indicates a potential risk of delay for this order.',
          priority: 'high' as const,
          suggestedActions: analysis.riskAssessment.mitigationSuggestions
        });
      }

      // Generate milestone reminders
      for (const milestone of analysis.nextMilestones) {
        if (milestone.priority === 'high') {
          notifications.push({
            recipient: 'artisan' as const,
            type: 'action_required' as const,
            title: `Upcoming Milestone: ${milestone.milestone}`,
            message: `The milestone "${milestone.milestone}" is approaching on ${milestone.expectedDate}.`,
            priority: milestone.priority,
            suggestedActions: milestone.requirements
          });
        }
      }

      // Generate quality recommendations
      if (analysis.qualityPrediction.expectedQuality < 0.8) {
        notifications.push({
          recipient: 'artisan' as const,
          type: 'info' as const,
          title: 'Quality Enhancement Suggestions',
          message: 'Our AI has identified areas for potential quality improvement.',
          priority: 'medium' as const,
          suggestedActions: analysis.qualityPrediction.improvementAreas
        });
      }

      return notifications;
    } catch (error) {
      console.error('Failed to generate proactive notifications:', error);
      return [];
    }
  }

  /**
   * Build tracking analysis prompt
   */
  private buildTrackingAnalysisPrompt(order: any): string {
    return `
You are an expert order tracking analyst specializing in traditional crafts and artisan products.
Analyze this order's current progress and predict future outcomes.

ORDER DETAILS:
${JSON.stringify(order, null, 2)}

ANALYSIS REQUIREMENTS:
1. Assess current progress percentage based on status and milestones
2. Predict completion date with confidence intervals
3. Identify potential risks (delay, quality, communication)
4. Recommend next actions for buyer and artisan
5. Evaluate quality prediction based on current indicators
6. Analyze communication patterns and effectiveness

PROGRESS ASSESSMENT FACTORS:
- Current status and milestone completion
- Time elapsed vs. estimated timeline
- Communication frequency and quality
- Artisan's historical performance
- Order complexity and customization level
- Seasonal and external factors

RISK EVALUATION CRITERIA:
- Timeline adherence and potential delays
- Quality indicators and craftsmanship standards
- Communication gaps or misunderstandings
- Resource availability and constraints
- External factors (materials, weather, etc.)

PREDICTION METHODOLOGY:
- Historical data analysis
- Current progress indicators
- Risk factor assessment
- Artisan capability evaluation
- Market and seasonal considerations

Provide comprehensive analysis with actionable insights for all stakeholders.
    `.trim();
  }

  /**
   * Generate insights for status updates
   */
  private async generateStatusUpdateInsights(
    order: any,
    newStatus: string,
    notes?: string
  ): Promise<any> {
    try {
      const insightPrompt = `
Analyze this order status update and provide insights.

CURRENT ORDER: ${JSON.stringify(order, null, 2)}
NEW STATUS: ${newStatus}
UPDATE NOTES: ${notes || 'No notes provided'}

Provide insights about:
1. Progress implications of this status change
2. Next expected actions and timeline
3. Potential risks or opportunities
4. Recommendations for stakeholders
5. Quality and satisfaction predictions

Keep insights concise and actionable.
      `;

      const insightSchema = z.object({
        progressImplications: z.array(z.string()),
        nextActions: z.array(z.string()),
        risks: z.array(z.string()),
        opportunities: z.array(z.string()),
        recommendations: z.array(z.string()),
        qualityPrediction: z.number().min(0).max(1),
        satisfactionPrediction: z.number().min(0).max(1)
      });

      return await genAIService.generateStructured(insightPrompt, insightSchema, {
        order,
        newStatus,
        notes
      });
    } catch (error) {
      console.warn('Failed to generate status update insights:', error);
      return {
        progressImplications: [],
        nextActions: [],
        risks: [],
        opportunities: [],
        recommendations: [],
        qualityPrediction: 0.8,
        satisfactionPrediction: 0.8
      };
    }
  }

  /**
   * Build delivery prediction prompt
   */
  private buildDeliveryPredictionPrompt(order: any): string {
    return `
Predict the delivery timeline for this traditional craft order with multiple scenarios.

ORDER DETAILS:
${JSON.stringify(order, null, 2)}

PREDICTION REQUIREMENTS:
1. Estimate most likely delivery date
2. Provide confidence score for the prediction
3. Generate 3-4 scenarios (optimistic, realistic, pessimistic, worst-case)
4. Consider all relevant factors affecting timeline

FACTORS TO CONSIDER:
- Current progress and remaining work
- Artisan's historical performance and reliability
- Order complexity and customization requirements
- Material availability and procurement time
- Quality assurance and review processes
- Seasonal factors and external constraints
- Communication efficiency and decision-making speed

SCENARIO TYPES:
- Optimistic: Everything goes smoothly
- Realistic: Normal progress with minor delays
- Pessimistic: Some complications and delays
- Worst-case: Major issues requiring significant rework

Provide realistic predictions based on traditional craft production timelines.
    `.trim();
  }

  /**
   * Helper methods
   */
  private shouldUpdateMilestones(status: string): boolean {
    const statusMilestoneMap = [
      'approved',
      'design_approved',
      'in_production',
      'quality_check',
      'shipped',
      'delivered',
      'completed'
    ];
    return statusMilestoneMap.includes(status);
  }

  private getMilestoneUpdate(status: string): { index: number } | null {
    const milestoneMap: Record<string, number> = {
      'approved': 0,
      'design_approved': 1,
      'in_production': 2,
      'quality_check': 3,
      'shipped': 4,
      'delivered': 5,
      'completed': 6
    };
    
    const index = milestoneMap[status];
    return index !== undefined ? { index } : null;
  }
}

// Export singleton instance
export const orderTrackerAgent = new OrderTrackerAgent();