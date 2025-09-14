export interface DigitalTwinChatInput {
  message: string;
  userId: string;
  artisanId?: string;
  context?: {
    previousMessages?: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
    }>;
    userProfile?: {
      name: string;
      preferences: string[];
      interests: string[];
    };
    artisanProfile?: {
      name: string;
      profession: string;
      specialties: string[];
      location: string;
    };
  };
}

export interface DigitalTwinChatResult {
  response: string;
  suggestions?: string[];
  nextActions?: string[];
  context?: {
    conversationId: string;
    timestamp: string;
    userSentiment: 'positive' | 'neutral' | 'negative';
    topic: string;
  };
  metadata?: {
    responseTime: number;
    confidence: number;
    source: string;
  };
}

export async function interactWithArtisanDigitalTwin(input: DigitalTwinChatInput): Promise<DigitalTwinChatResult> {
  try {
    console.log('🤖 Processing digital twin interaction for user:', input.userId);

    const startTime = Date.now();
    const conversationId = `conv_${Date.now()}`;
    
    // Analyze user message
    const message = input.message.toLowerCase();
    const userSentiment = analyzeSentiment(message);
    const topic = extractTopic(message);

    // Generate contextual response based on artisan profile
    let response = '';
    let suggestions: string[] = [];
    let nextActions: string[] = [];

    if (input.context?.artisanProfile) {
      const artisan = input.context.artisanProfile;
      
      // Craft responses based on artisan's profession and specialties
      if (message.includes('hello') || message.includes('hi')) {
        response = `Hello! I'm the digital twin of ${artisan.name}, a ${artisan.profession} from ${artisan.location}. I specialize in ${artisan.specialties.join(', ')}. How can I help you today?`;
        suggestions = [
          'Tell me about your work',
          'Show me your products',
          'What are your specialties?',
          'How can I place an order?'
        ];
      } else if (message.includes('product') || message.includes('work')) {
        response = `As a ${artisan.profession}, I create beautiful ${artisan.specialties.join(' and ')}. Each piece is handcrafted with attention to detail and traditional techniques. Would you like to know more about my specific products?`;
        suggestions = [
          'Show me your latest work',
          'What materials do you use?',
          'How long does it take to make?',
          'Can you customize products?'
        ];
      } else if (message.includes('price') || message.includes('cost')) {
        response = `My pricing varies based on the complexity and materials used. For ${artisan.specialties[0]}, prices typically range from ₹500 to ₹5000. I'd be happy to provide a custom quote for your specific needs.`;
        suggestions = [
          'Get a custom quote',
          'See price examples',
          'Discuss payment options',
          'Learn about bulk discounts'
        ];
      } else if (message.includes('order') || message.includes('buy')) {
        response = `I'd love to help you place an order! I can create custom pieces based on your requirements. What type of ${artisan.profession.toLowerCase()} are you looking for?`;
        suggestions = [
          'Place a custom order',
          'See available products',
          'Discuss timeline',
          'Learn about shipping'
        ];
        nextActions = ['initiate_order', 'show_catalog', 'schedule_consultation'];
      } else if (message.includes('custom') || message.includes('personalize')) {
        response = `I specialize in custom work! I can create unique pieces tailored to your preferences. Tell me about your vision - colors, size, style, or any specific requirements you have in mind.`;
        suggestions = [
          'Describe your vision',
          'Share reference images',
          'Discuss timeline',
          'Get a custom quote'
        ];
        nextActions = ['custom_design', 'upload_references', 'schedule_consultation'];
      } else {
        // General response
        response = `I'm here to help you with anything related to ${artisan.profession.toLowerCase()}. Whether you're interested in my work, want to place an order, or have questions about my craft, I'm happy to assist!`;
        suggestions = [
          'Learn about my work',
          'See my products',
          'Place an order',
          'Ask a question'
        ];
      }
    } else {
      // Default response when no artisan profile is available
      response = "Hello! I'm an AI assistant representing a skilled artisan. I can help you learn about traditional crafts, place orders, or answer questions about handmade products. How can I assist you today?";
      suggestions = [
        'Learn about traditional crafts',
        'Find local artisans',
        'Place a custom order',
        'Ask about techniques'
      ];
    }

    const responseTime = Date.now() - startTime;

    return {
      response,
      suggestions,
      nextActions,
      context: {
        conversationId,
        timestamp: new Date().toISOString(),
        userSentiment,
        topic
      },
      metadata: {
        responseTime,
        confidence: 0.85,
        source: 'digital_twin_chatbot'
      }
    };

  } catch (error) {
    console.error('Digital twin interaction error:', error);
    return {
      response: "I'm sorry, I encountered an error while processing your request. Please try again.",
      suggestions: ['Try rephrasing your question', 'Contact support', 'Start a new conversation'],
      context: {
        conversationId: `error_${Date.now()}`,
        timestamp: new Date().toISOString(),
        userSentiment: 'neutral',
        topic: 'error'
      },
      metadata: {
        responseTime: 0,
        confidence: 0,
        source: 'error'
      }
    };
  }
}

// Helper functions
function analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'beautiful', 'love', 'like', 'wonderful'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'poor', 'worst'];
  
  const lowerMessage = message.toLowerCase();
  
  if (positiveWords.some(word => lowerMessage.includes(word))) {
    return 'positive';
  }
  
  if (negativeWords.some(word => lowerMessage.includes(word))) {
    return 'negative';
  }
  
  return 'neutral';
}

function extractTopic(message: string): string {
  const topics = {
    'greeting': ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
    'products': ['product', 'work', 'item', 'piece', 'creation'],
    'pricing': ['price', 'cost', 'expensive', 'cheap', 'budget'],
    'ordering': ['order', 'buy', 'purchase', 'get', 'want'],
    'customization': ['custom', 'personalize', 'special', 'unique', 'modify'],
    'information': ['what', 'how', 'when', 'where', 'why', 'tell me', 'explain']
  };
  
  const lowerMessage = message.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(topics)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return topic;
    }
  }
  
  return 'general';
}
