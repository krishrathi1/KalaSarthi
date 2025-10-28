"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, Palette, Wrench, Settings, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Import our enhanced components
import { VoiceInputHandler } from './VoiceInputHandler';
import { TranslationControls } from './TranslationControls';
import { TranslatedMessage } from './TranslatedMessage';
import { VoiceMessage } from './VoiceMessage';
import ArtisanToolsPanel from './ArtisanToolsPanel';
import { OrderManagementForm } from './OrderManagementForm';
import { ConversationContext, GeneratedDesign } from '@/lib/services/DesignGenerator';

interface EnhancedChatInterfaceProps {
  sessionId: string;
  currentUserId: string;
  currentUserRole: 'buyer' | 'artisan';
  otherParticipant: {
    id: string;
    name: string;
    role: 'buyer' | 'artisan';
    language: string;
    profileImage?: string;
    isOnline: boolean;
    specialization?: string;
  };
  onClose?: () => void;
}

interface EnhancedChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  originalText: string;
  originalLanguage: string;
  translatedText?: string;
  targetLanguage?: string;
  messageType: 'text' | 'voice' | 'design' | 'order' | 'system';
  audioData?: {
    url: string;
    duration: number;
    transcriptionConfidence: number;
  };
  designData?: {
    designs: Array<{
      id: string;
      imageUrl: string;
      prompt: string;
      description: string;
    }>;
  };
  aiAnalysis: {
    sentiment: 'positive' | 'negative' | 'neutral';
    intent: string;
    dealIndicators?: Array<{
      type: string;
      confidence: number;
      stage: string;
    }>;
  };
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export function EnhancedChatInterface({
  sessionId,
  currentUserId,
  currentUserRole,
  otherParticipant,
  onClose
}: EnhancedChatInterfaceProps) {
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Translation settings
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [currentUserLanguage, setCurrentUserLanguage] = useState('en');
  
  // UI states
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [dealDetected, setDealDetected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [sessionId]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const loadMessages = async () => {
    try {
      const response = await fetch(
        `/api/enhanced-chat/get-messages?sessionId=${sessionId}&userId=${currentUserId}&limit=50`
      );
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };
  
  const sendMessage = async (text: string, messageType: 'text' | 'voice' = 'text', audioData?: any) => {
    if (!text.trim() || loading) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/enhanced-chat/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          senderId: currentUserId,
          receiverId: otherParticipant.id,
          originalText: text,
          originalLanguage: currentUserLanguage,
          messageType,
          audioData
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Add message to local state
        setMessages(prev => [...prev, data.message]);
        
        // Check for deal completion
        if (data.aiInsights?.dealIndicators?.length > 0) {
          const completedDeals = data.aiInsights.dealIndicators.filter(
            (indicator: any) => indicator.stage === 'completed'
          );
          
          if (completedDeals.length > 0 && currentUserRole === 'artisan') {
            setDealDetected(true);
            toast({
              title: "Deal Completion Detected!",
              description: "Would you like to collect customer details for the order?",
            });
          }
        }
        
        setNewMessage('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: "Message Failed",
        description: "Could not send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleVoiceTranscription = useCallback((text: string, language: string, confidence: number) => {
    sendMessage(text, 'voice', { transcriptionConfidence: confidence });
  }, []);
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(newMessage);
    }
  };
  
  const handleDesignShare = (design: GeneratedDesign) => {
    // Send design message
    const designMessage = {
      sessionId,
      senderId: currentUserId,
      receiverId: otherParticipant.id,
      originalText: `I've shared a design with you. What do you think?`,
      originalLanguage: currentUserLanguage,
      messageType: 'design' as const,
      designData: { 
        designs: [design],
        prompt: design.prompt,
        generationMetadata: design.metadata
      }
    };
    
    // Add to messages
    setMessages(prev => [...prev, {
      ...designMessage,
      id: `design_${Date.now()}`,
      aiAnalysis: { 
        sentiment: 'positive', 
        intent: 'design_sharing',
        dealIndicators: [{
          type: 'design_presentation',
          confidence: 0.8,
          stage: 'negotiation'
        }]
      },
      timestamp: new Date(),
      status: 'sent'
    } as EnhancedChatMessage]);
    
    toast({
      title: "Design Shared!",
      description: "Your design has been shared in the conversation.",
    });
  };
  
  // Create conversation context for artisan tools
  const getConversationContext = (): ConversationContext => {
    const recentMessages = messages.slice(-20);
    
    return {
      buyerRequirements: recentMessages
        .filter(m => m.senderId !== currentUserId && currentUserRole === 'artisan')
        .map(m => m.originalText)
        .filter(text => text.length > 10),
      discussedMaterials: extractMaterials(recentMessages),
      mentionedColors: extractColors(recentMessages),
      sizePreferences: extractSizes(recentMessages),
      culturalReferences: extractCulturalReferences(recentMessages),
      priceRange: extractPriceRange(recentMessages)
    };
  };
  
  // Helper functions to extract context from messages
  const extractMaterials = (messages: EnhancedChatMessage[]): string[] => {
    const materialKeywords = ['wood', 'metal', 'clay', 'silver', 'gold', 'cotton', 'silk', 'leather', 'stone', 'glass'];
    const materials: string[] = [];
    
    messages.forEach(msg => {
      materialKeywords.forEach(material => {
        if (msg.originalText.toLowerCase().includes(material) && !materials.includes(material)) {
          materials.push(material);
        }
      });
    });
    
    return materials;
  };
  
  const extractColors = (messages: EnhancedChatMessage[]): string[] => {
    const colorKeywords = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'orange', 'purple', 'pink'];
    const colors: string[] = [];
    
    messages.forEach(msg => {
      colorKeywords.forEach(color => {
        if (msg.originalText.toLowerCase().includes(color) && !colors.includes(color)) {
          colors.push(color);
        }
      });
    });
    
    return colors;
  };
  
  const extractSizes = (messages: EnhancedChatMessage[]): string[] => {
    const sizeKeywords = ['small', 'medium', 'large', 'tiny', 'huge', 'big', 'little'];
    const sizes: string[] = [];
    
    messages.forEach(msg => {
      sizeKeywords.forEach(size => {
        if (msg.originalText.toLowerCase().includes(size) && !sizes.includes(size)) {
          sizes.push(size);
        }
      });
    });
    
    return sizes;
  };
  
  const extractCulturalReferences = (messages: EnhancedChatMessage[]): string[] => {
    const culturalKeywords = ['traditional', 'modern', 'vintage', 'contemporary', 'ethnic', 'tribal', 'royal', 'rustic'];
    const references: string[] = [];
    
    messages.forEach(msg => {
      culturalKeywords.forEach(ref => {
        if (msg.originalText.toLowerCase().includes(ref) && !references.includes(ref)) {
          references.push(ref);
        }
      });
    });
    
    return references;
  };
  
  const extractPriceRange = (messages: EnhancedChatMessage[]): { min: number; max: number } | undefined => {
    const priceRegex = /₹?(\d+)/g;
    const prices: number[] = [];
    
    messages.forEach(msg => {
      const matches = msg.originalText.match(priceRegex);
      if (matches) {
        matches.forEach(match => {
          const price = parseInt(match.replace('₹', ''));
          if (price > 100 && price < 100000) { // Reasonable price range
            prices.push(price);
          }
        });
      }
    });
    
    if (prices.length > 0) {
      return {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
    }
    
    return undefined;
  };
  
  const renderMessage = (message: EnhancedChatMessage) => {
    const isFromCurrentUser = message.senderId === currentUserId;
    
    if (message.messageType === 'voice' && message.audioData) {
      return (
        <VoiceMessage
          key={message.id}
          audioUrl={message.audioData.url}
          duration={message.audioData.duration}
          transcription={message.originalText}
          language={message.originalLanguage}
          confidence={message.audioData.transcriptionConfidence}
          isFromCurrentUser={isFromCurrentUser}
          timestamp={message.timestamp}
        />
      );
    }
    
    if (message.messageType === 'design' && message.designData) {
      return (
        <div key={message.id} className={`mb-4 ${isFromCurrentUser ? 'ml-auto' : 'mr-auto'} max-w-md`}>
          <div className="space-y-2">
            {message.designData.designs.map((design, index) => (
              <div key={design.id} className="border rounded-lg p-2">
                <img 
                  src={design.imageUrl} 
                  alt={design.description}
                  className="w-full h-48 object-cover rounded"
                />
                <p className="text-sm mt-2">{design.description}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Regular text message with translation
    if (message.translatedText && translationEnabled) {
      return (
        <TranslatedMessage
          key={message.id}
          originalText={message.originalText}
          translatedText={message.translatedText}
          originalLanguage={message.originalLanguage}
          targetLanguage={message.targetLanguage || currentUserLanguage}
          confidence={message.translationMetadata?.confidence || 0.8}
          alternatives={message.translationMetadata?.alternatives}
          culturalContext={message.translationMetadata?.culturalContext}
          isFromCurrentUser={isFromCurrentUser}
          showOriginal={showOriginal}
        />
      );
    }
    
    // Simple text message
    return (
      <div key={message.id} className={`mb-4 ${isFromCurrentUser ? 'ml-auto' : 'mr-auto'} max-w-md`}>
        <div className={`rounded-lg p-3 ${
          isFromCurrentUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          <p className="text-sm">{message.originalText}</p>
          <div className="text-xs opacity-70 mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat Header */}
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={otherParticipant.profileImage} />
              <AvatarFallback>
                {otherParticipant.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <CardTitle className="text-lg">{otherParticipant.name}</CardTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${
                  otherParticipant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span>{otherParticipant.isOnline ? 'Online' : 'Offline'}</span>
                {otherParticipant.specialization && (
                  <Badge variant="outline" className="text-xs">
                    {otherParticipant.specialization}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Artisan Tools Button */}
            {currentUserRole === 'artisan' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowToolsPanel(!showToolsPanel)}
              >
                <Wrench className="h-4 w-4" />
              </Button>
            )}
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </div>
        
        {/* Translation Controls */}
        <TranslationControls
          isEnabled={translationEnabled}
          onToggle={setTranslationEnabled}
          showOriginal={showOriginal}
          onShowOriginalToggle={setShowOriginal}
          currentUserLanguage={currentUserLanguage}
          otherUserLanguage={otherParticipant.language}
          onLanguageChange={setCurrentUserLanguage}
        />
      </CardHeader>
      
      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-4">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Deal Detection Alert */}
        {dealDetected && currentUserRole === 'artisan' && (
          <div className="px-4 py-2 bg-green-50 border-t border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">
                🎉 Deal completion detected! Ready to collect order details?
              </span>
              <div className="space-x-2">
                <Button
                  size="sm"
                  onClick={() => setShowOrderForm(true)}
                >
                  Collect Details
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDealDetected(false)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Type in ${currentUserLanguage.toUpperCase()}...`}
                className="min-h-[40px] max-h-[120px] resize-none"
                disabled={loading}
              />
            </div>
            
            <div className="flex items-center space-x-1">
              {/* Voice Input */}
              <VoiceInputHandler
                onTranscription={handleVoiceTranscription}
                userLanguage={currentUserLanguage}
                isRecording={isRecording}
                onRecordingStateChange={setIsRecording}
                disabled={loading}
              />
              
              {/* Send Button */}
              <Button
                onClick={() => sendMessage(newMessage)}
                disabled={!newMessage.trim() || loading}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Artisan Tools Panel */}
      {currentUserRole === 'artisan' && (
        <ArtisanToolsPanel
          conversationContext={getConversationContext()}
          artisanSpecialization={'pottery'} // For demo, we'll use pottery
          sessionId={sessionId}
          artisanId={currentUserId}
          onDesignShared={handleDesignShare}
          isVisible={showToolsPanel}
          onToggleVisibility={() => setShowToolsPanel(!showToolsPanel)}
        />
      )}
      
      {/* Order Management Form */}
      {showOrderForm && (
        <OrderManagementForm
          sessionId={sessionId}
          buyerId={currentUserRole === 'buyer' ? currentUserId : otherParticipant.id}
          artisanId={currentUserRole === 'artisan' ? currentUserId : otherParticipant.id}
          conversationSummary={messages.slice(-10).map(m => m.originalText).join(' ')}
          onClose={() => setShowOrderForm(false)}
          onOrderSubmitted={() => {
            setShowOrderForm(false);
            setDealDetected(false);
            toast({
              title: "Order Created!",
              description: "Order details have been collected and saved.",
            });
          }}
        />
      )}
    </div>
  );
}