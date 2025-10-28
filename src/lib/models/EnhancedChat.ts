/**
 * Enhanced Chat Models
 * Firestore-compatible interfaces for the enhanced multilingual chat system
 */

// Enhanced Chat Message Interface
export interface IEnhancedChatMessage {
  id?: string;
  sessionId: string;
  senderId: string;
  receiverId: string;
  
  // Content
  originalText: string;
  originalLanguage: string;
  translatedText?: string;
  targetLanguage?: string;
  messageType: 'text' | 'voice' | 'design' | 'order' | 'system';
  
  // Voice data
  voiceData?: {
    audioUrl: string;
    duration: number;
    transcriptionConfidence: number;
  };
  
  // Design data
  designData?: {
    designs: Array<{
      id: string;
      imageUrl: string;
      prompt: string;
      description: string;
    }>;
    prompt: string;
    generationMetadata: any;
  };
  
  // Translation metadata
  translationMetadata?: {
    confidence: number;
    service: string;
    alternatives?: string[];
    culturalContext?: string;
  };
  
  // AI Analysis
  aiAnalysis: {
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number;
    intent: string;
    intentConfidence: number;
    keyTopics: string[];
    urgency: 'low' | 'medium' | 'high';
    dealIndicators?: Array<{
      type: string;
      confidence: number;
      evidence: string[];
      stage: string;
    }>;
  };
  
  // Metadata
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  readAt?: Date;
  editHistory?: Array<{
    originalText: string;
    editedText: string;
    timestamp: Date;
  }>;
  
  // Attachments
  attachments?: Array<{
    type: string;
    url: string;
    metadata: any;
  }>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Default values for new enhanced chat messages
export const DEFAULT_ENHANCED_MESSAGE_VALUES = {
  messageType: 'text' as const,
  originalLanguage: 'en',
  status: 'sent' as const,
  timestamp: new Date(),
  aiAnalysis: {
    sentiment: 'neutral' as const,
    sentimentScore: 0.5,
    intent: 'unknown',
    intentConfidence: 0.5,
    keyTopics: [],
    urgency: 'low' as const,
    dealIndicators: []
  },
  attachments: [],
  editHistory: []
};

// Enhanced Chat Session Interface
export interface IEnhancedChatSession {
  id?: string;
  sessionId: string;
  participants: Array<{
    userId: string;
    role: 'buyer' | 'artisan';
    language: string;
    joinedAt: Date;
  }>;
  
  // Session metadata
  artisanSpecialization?: string;
  dealStatus: 'active' | 'negotiating' | 'completed' | 'cancelled';
  dealProbability: number;
  
  // Conversation summary
  summary: {
    mainTopics: string[];
    requirements: string[];
    agreedTerms: Array<{
      type: string;
      value: string;
      confirmedAt: Date;
    }>;
  };
  
  // Analytics
  messageCount: number;
  lastActivity: Date;
  averageResponseTime: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Default values for new enhanced chat sessions
export const DEFAULT_ENHANCED_SESSION_VALUES = {
  dealStatus: 'active' as const,
  dealProbability: 0.1,
  summary: {
    mainTopics: [],
    requirements: [],
    agreedTerms: []
  },
  messageCount: 0,
  lastActivity: new Date(),
  averageResponseTime: 0
};