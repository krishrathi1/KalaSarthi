import { NextRequest } from 'next/server';
import { POST as matchPost } from '@/app/api/buyer-connect/match/route';
import { POST as chatPost } from '@/app/api/buyer-connect/chat/route';
import { POST as ordersPost } from '@/app/api/buyer-connect/orders/route';

// Mock external dependencies
jest.mock('@/ai/agents/matching-orchestrator');
jest.mock('@/ai/agents/conversation-mediator');
jest.mock('@/ai/agents/order-orchestrator');
jest.mock('@/lib/mongodb');
jest.mock('@/lib/models');

describe('Buyer Connect Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete buyer-artisan matching flow', () => {
    it('should complete end-to-end matching workflow', async () => {
      // Step 1: Search for artisans
      const mockMatchingResult = {
        matches: [
          {
            artisanId: 'artisan-123',
            artisanProfile: {
              name: 'Master Craftsman',
              artisticProfession: 'Traditional Pottery',
              specializations: ['ceramic', 'traditional', 'decorative']
            },
            confidenceScore: 0.92,
            matchReasons: [
              'Specializes in traditional pottery techniques',
              'High customer satisfaction rating',
              'Available for custom orders'
            ],
            estimatedPrice: { min: 3000, max: 8000, currency: 'INR' },
            estimatedTimeline: '3-4 weeks'
          }
        ],
        totalMatches: 1,
        searchMetadata: {
          extractedKeywords: ['pottery', 'traditional', 'decorative'],
          categories: ['pottery'],
          confidenceThreshold: 0.3,
          searchTime: 1200,
          aiAnalysisTime: 600,
          timestamp: new Date().toISOString()
        },
        requirementAnalysis: {
          extractedRequirements: {
            keyFeatures: ['pottery', 'decorative', 'traditional'],
            constraints: ['food safe', 'durable'],
            preferences: ['handmade', 'authentic'],
            confidence: 0.88
          }
        },
        alternativeRecommendations: [],
        marketInsights: {
          averagePricing: { min: 2500, max: 9000 },
          demandLevel: 'medium',
          availabilityTrend: 'stable',
          seasonalFactors: ['Festival season approaching']
        },
        improvementSuggestions: []
      };

      const { matchingOrchestratorAgent } = require('@/ai/agents/matching-orchestrator');
      matchingOrchestratorAgent.executeMatching.mockResolvedValue(mockMatchingResult);

      const matchRequest = new NextRequest('http://localhost:3000/api/buyer-connect/match', {
        method: 'POST',
        body: JSON.stringify({
          buyerId: 'buyer-456',
          userInput: 'I need traditional decorative pottery for my restaurant',
          sessionId: 'session-789',
          filters: { priceRange: { min: 2000, max: 10000 } },
          preferences: { maxResults: 10, sortBy: 'confidence' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const matchResponse = await matchPost(matchRequest);
      const matchData = await matchResponse.json();

      expect(matchResponse.status).toBe(200);
      expect(matchData.success).toBe(true);
      expect(matchData.data.matches).toHaveLength(1);
      expect(matchData.data.matches[0].confidenceScore).toBeGreaterThan(0.9);

      // Step 2: Create chat session
      const mockChatSession = {
        sessionId: 'chat-session-101',
        participants: {
          buyerId: 'buyer-456',
          artisanId: 'artisan-123',
          buyerLanguage: 'en',
          artisanLanguage: 'hi'
        },
        settings: {
          translationEnabled: true,
          notificationsEnabled: true,
          aiAssistanceEnabled: true,
          culturalContextEnabled: true
        }
      };

      const { Chat } = require('@/lib/models');
      Chat.prototype.save = jest.fn().mockResolvedValue(mockChatSession);

      const chatCreateRequest = new NextRequest('http://localhost:3000/api/buyer-connect/chat', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_session',
          buyerId: 'buyer-456',
          artisanId: 'artisan-123',
          buyerLanguage: 'en',
          artisanLanguage: 'hi'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const chatCreateResponse = await chatPost(chatCreateRequest);
      const chatCreateData = await chatCreateResponse.json();

      expect(chatCreateResponse.status).toBe(200);
      expect(chatCreateData.success).toBe(true);
      expect(chatCreateData.data.participants.buyerId).toBe('buyer-456');
      expect(chatCreateData.data.participants.artisanId).toBe('artisan-123');

      // Step 3: Send message with translation
      const mockTranslationResult = {
        translation: {
          translatedText: 'मुझे अपने रेस्तराँ के लिए पारंपरिक सजावटी मिट्टी के बर्तन चाहिए',
          originalText: 'I need traditional decorative pottery for my restaurant',
          sourceLanguage: 'en',
          targetLanguage: 'hi',
          confidence: 0.95,
          translationMetadata: {
            service: 'genai-translation',
            model: 'translation-pro',
            processingTime: 200
          }
        },
        culturalAdaptation: {
          adaptedMessage: 'मुझे अपने रेस्तराँ के लिए पारंपरिक सजावटी मिट्टी के बर्तन चाहिए',
          culturalNotes: ['Traditional pottery is highly valued in Indian culture'],
          suggestedTone: 'respectful',
          culturalContext: 'Business inquiry with cultural appreciation',
          adaptationReasons: ['Respectful tone for traditional craft inquiry']
        },
        recommendations: [
          'Show appreciation for traditional craftsmanship',
          'Be specific about your restaurant needs'
        ]
      };

      const { conversationMediatorAgent } = require('@/ai/agents/conversation-mediator');
      conversationMediatorAgent.processMessage.mockResolvedValue(mockTranslationResult);

      const mockChat = {
        sessionId: 'chat-session-101',
        participants: { buyerId: 'buyer-456', artisanId: 'artisan-123' },
        messages: [],
        metadata: { messageCount: 0, lastActivity: new Date() },
        save: jest.fn().mockResolvedValue(true)
      };

      Chat.findOne = jest.fn().mockResolvedValue(mockChat);

      const messageRequest = new NextRequest('http://localhost:3000/api/buyer-connect/chat', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_message',
          sessionId: 'chat-session-101',
          senderId: 'buyer-456',
          message: 'I need traditional decorative pottery for my restaurant',
          senderLanguage: 'en',
          receiverLanguage: 'hi'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const messageResponse = await chatPost(messageRequest);
      const messageData = await messageResponse.json();

      expect(messageResponse.status).toBe(200);
      expect(messageData.success).toBe(true);
      expect(messageData.data.translatedText).toContain('मिट्टी के बर्तन');
      expect(messageData.data.confidence).toBeGreaterThan(0.9);

      // Step 4: Analyze order and create order
      const mockOrderAnalysis = {
        feasibilityScore: 0.89,
        estimatedPrice: {
          basePrice: 4000,
          customizationCharges: 1000,
          materialCosts: 800,
          laborCosts: 2200,
          totalPrice: 8000,
          currency: 'INR'
        },
        timeline: {
          estimatedDuration: 21,
          milestones: [
            { milestone: 'Design Approval', estimatedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
            { milestone: 'Production Start', estimatedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
            { milestone: 'Quality Check', estimatedDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
            { milestone: 'Delivery', estimatedDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' }
          ]
        },
        riskAssessment: {
          overallRisk: 'low',
          factors: [
            { factor: 'Timeline adherence', risk: 'low', mitigation: 'Artisan has good track record' },
            { factor: 'Quality standards', risk: 'low', mitigation: 'Regular quality checkpoints' }
          ]
        },
        recommendations: [
          'Discuss specific design requirements early',
          'Plan for quality review checkpoints',
          'Consider seasonal factors for delivery'
        ],
        negotiationSuggestions: [
          { aspect: 'timeline', suggestion: 'Flexible delivery date for better quality', impact: 'medium' },
          { aspect: 'customization', suggestion: 'Batch order for cost efficiency', impact: 'high' }
        ]
      };

      const { orderOrchestratorAgent } = require('@/ai/agents/order-orchestrator');
      orderOrchestratorAgent.analyzeOrder.mockResolvedValue(mockOrderAnalysis);
      orderOrchestratorAgent.createOptimizedOrder.mockResolvedValue('order-999');

      const orderAnalysisRequest = new NextRequest('http://localhost:3000/api/buyer-connect/orders', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze_order',
          buyerId: 'buyer-456',
          artisanId: 'artisan-123',
          chatSessionId: 'chat-session-101',
          requirements: {
            description: 'Traditional decorative pottery for restaurant',
            category: 'pottery',
            specifications: { style: 'traditional', use: 'decorative' },
            customizations: ['restaurant branding', 'food safe'],
            quantity: 12
          },
          timeline: { flexibility: 'flexible' },
          budget: { min: 5000, max: 10000, currency: 'INR' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const orderAnalysisResponse = await ordersPost(orderAnalysisRequest);
      const orderAnalysisData = await orderAnalysisResponse.json();

      expect(orderAnalysisResponse.status).toBe(200);
      expect(orderAnalysisData.success).toBe(true);
      expect(orderAnalysisData.data.feasibilityScore).toBeGreaterThan(0.8);
      expect(orderAnalysisData.data.estimatedPrice.totalPrice).toBe(8000);

      // Step 5: Create order
      const orderCreateRequest = new NextRequest('http://localhost:3000/api/buyer-connect/orders', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_order',
          orderRequest: {
            buyerId: 'buyer-456',
            artisanId: 'artisan-123',
            chatSessionId: 'chat-session-101',
            requirements: {
              description: 'Traditional decorative pottery for restaurant',
              category: 'pottery',
              specifications: { style: 'traditional', use: 'decorative' },
              customizations: ['restaurant branding', 'food safe'],
              quantity: 12
            }
          },
          analysis: mockOrderAnalysis
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const orderCreateResponse = await ordersPost(orderCreateRequest);
      const orderCreateData = await orderCreateResponse.json();

      expect(orderCreateResponse.status).toBe(200);
      expect(orderCreateData.success).toBe(true);
      expect(orderCreateData.data.orderId).toBe('order-999');

      // Verify the complete flow
      expect(matchingOrchestratorAgent.executeMatching).toHaveBeenCalledWith(
        expect.objectContaining({
          buyerId: 'buyer-456',
          userInput: 'I need traditional decorative pottery for my restaurant'
        })
      );

      expect(conversationMediatorAgent.processMessage).toHaveBeenCalledWith(
        'I need traditional decorative pottery for my restaurant',
        'en',
        'hi',
        expect.any(Object),
        expect.any(Object),
        expect.any(Object)
      );

      expect(orderOrchestratorAgent.analyzeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          buyerId: 'buyer-456',
          artisanId: 'artisan-123'
        })
      );

      expect(orderOrchestratorAgent.createOptimizedOrder).toHaveBeenCalledWith(
        expect.any(Object),
        mockOrderAnalysis
      );
    });

    it('should handle errors gracefully in the flow', async () => {
      // Test error handling in matching step
      const { matchingOrchestratorAgent } = require('@/ai/agents/matching-orchestrator');
      matchingOrchestratorAgent.executeMatching.mockRejectedValue(
        new Error('AI service temporarily unavailable')
      );

      const matchRequest = new NextRequest('http://localhost:3000/api/buyer-connect/match', {
        method: 'POST',
        body: JSON.stringify({
          buyerId: 'buyer-456',
          userInput: 'I need pottery',
          sessionId: 'session-789'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const matchResponse = await matchPost(matchRequest);
      const matchData = await matchResponse.json();

      expect(matchResponse.status).toBe(500);
      expect(matchData.success).toBe(false);
      expect(matchData.error).toBe('Failed to find artisan matches');
    });
  });

  describe('Chat translation workflow', () => {
    it('should handle multi-language conversation', async () => {
      const mockTranslationResult = {
        translation: {
          translatedText: 'क्या आप कस्टम डिज़ाइन बना सकते हैं?',
          originalText: 'Can you create custom designs?',
          sourceLanguage: 'en',
          targetLanguage: 'hi',
          confidence: 0.92,
          translationMetadata: { service: 'genai-translation' }
        },
        culturalAdaptation: {
          adaptedMessage: 'क्या आप कस्टम डिज़ाइन बना सकते हैं?',
          culturalNotes: ['Respectful inquiry about custom work'],
          suggestedTone: 'respectful'
        },
        recommendations: ['Be specific about design requirements']
      };

      const { conversationMediatorAgent } = require('@/ai/agents/conversation-mediator');
      conversationMediatorAgent.processMessage.mockResolvedValue(mockTranslationResult);

      const { Chat } = require('@/lib/models');
      const mockChat = {
        sessionId: 'chat-session-101',
        participants: { buyerId: 'buyer-456', artisanId: 'artisan-123' },
        messages: [],
        metadata: { messageCount: 0, translationCount: 0 },
        save: jest.fn().mockResolvedValue(true)
      };
      Chat.findOne = jest.fn().mockResolvedValue(mockChat);

      const messageRequest = new NextRequest('http://localhost:3000/api/buyer-connect/chat', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_message',
          sessionId: 'chat-session-101',
          senderId: 'buyer-456',
          message: 'Can you create custom designs?',
          senderLanguage: 'en',
          receiverLanguage: 'hi'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const messageResponse = await chatPost(messageRequest);
      const messageData = await messageResponse.json();

      expect(messageResponse.status).toBe(200);
      expect(messageData.success).toBe(true);
      expect(messageData.data.translatedText).toBe('क्या आप कस्टम डिज़ाइन बना सकते हैं?');
      expect(messageData.data.confidence).toBeGreaterThan(0.9);
      expect(messageData.data.culturalNotes).toContain('Respectful inquiry about custom work');
    });
  });
});