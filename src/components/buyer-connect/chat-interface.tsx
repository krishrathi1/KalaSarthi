"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Paperclip, 
  MoreVertical, 
  Globe, 
  Eye, 
  EyeOff, 
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Bot,
  Mic,
  MicOff,
  Palette,
  Wrench,
  Image as ImageIcon,
  FileText,
  DollarSign,
  Calendar,
  Package,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  originalText: string;
  originalLanguage: string;
  translatedText?: string;
  targetLanguage?: string;
  messageType: 'text' | 'image' | 'design' | 'order_update';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  translationMetadata?: {
    confidence: number;
    service: string;
    alternativeTranslations?: string[];
    culturalContext?: string;
  };
  aiAnalysis?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    intent: string;
    confidence: number;
    keyTopics: string[];
    urgency: 'low' | 'medium' | 'high';
  };
}

interface ChatParticipant {
  id: string;
  name: string;
  profileImage?: string;
  language: string;
  isOnline: boolean;
  lastSeen?: Date;
}

interface ChatInterfaceProps {
  sessionId: string;
  currentUserId: string;
  otherParticipant: ChatParticipant;
  onClose?: () => void;
}

export function ChatInterface({ 
  sessionId, 
  currentUserId, 
  otherParticipant, 
  onClose 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [currentUserLanguage] = useState('en'); // Would come from user profile
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mock messages for demonstration
  useEffect(() => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        senderId: otherParticipant.id,
        receiverId: currentUserId,
        originalText: 'नमस्ते! मैं पारंपरिक मिट्टी के बर्तन बनाता हूं। आपको किस प्रकार के बर्तन चाहिए?',
        originalLanguage: 'hi',
        translatedText: 'Hello! I make traditional pottery. What kind of pottery do you need?',
        targetLanguage: 'en',
        messageType: 'text',
        timestamp: new Date(Date.now() - 300000),
        status: 'read',
        translationMetadata: {
          confidence: 0.92,
          service: 'genai-translator',
          culturalContext: 'Traditional craft greeting with respectful tone'
        },
        aiAnalysis: {
          sentiment: 'positive',
          intent: 'greeting_and_inquiry',
          confidence: 0.88,
          keyTopics: ['pottery', 'traditional_crafts', 'product_inquiry'],
          urgency: 'low'
        }
      },
      {
        id: '2',
        senderId: currentUserId,
        receiverId: otherParticipant.id,
        originalText: 'Hi! I need ceramic dinnerware for my restaurant. Can you make a set for 50 people?',
        originalLanguage: 'en',
        translatedText: 'नमस्ते! मुझे अपने रेस्टोरेंट के लिए सिरेमिक डिनरवेयर चाहिए। क्या आप 50 लोगों के लिए एक सेट बना सकते हैं?',
        targetLanguage: 'hi',
        messageType: 'text',
        timestamp: new Date(Date.now() - 240000),
        status: 'read',
        translationMetadata: {
          confidence: 0.89,
          service: 'genai-translator',
          culturalContext: 'Business inquiry with specific quantity request'
        },
        aiAnalysis: {
          sentiment: 'neutral',
          intent: 'business_inquiry',
          confidence: 0.94,
          keyTopics: ['dinnerware', 'restaurant', 'bulk_order', 'ceramics'],
          urgency: 'medium'
        }
      }
    ];
    
    setMessages(mockMessages);
  }, [currentUserId, otherParticipant.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate AI suggestions based on conversation context
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== currentUserId) {
        generateAISuggestions(lastMessage);
      }
    }
  }, [messages, currentUserId]);

  const generateAISuggestions = useCallback(async (lastMessage: ChatMessage) => {
    // Mock AI suggestions - in real implementation, call AI service
    const suggestions = [
      "That sounds perfect! What's your timeline for this order?",
      "Could you show me some examples of your previous work?",
      "What would be the estimated cost for a 50-person dinnerware set?"
    ];
    
    setAiSuggestions(suggestions);
    setShowSuggestions(true);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    
    try {
      // Create new message
      const messageId = `msg_${Date.now()}`;
      const newMsg: ChatMessage = {
        id: messageId,
        senderId: currentUserId,
        receiverId: otherParticipant.id,
        originalText: newMessage.trim(),
        originalLanguage: currentUserLanguage,
        messageType: 'text',
        timestamp: new Date(),
        status: 'sent'
      };

      // Add message to state immediately for better UX
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setShowSuggestions(false);

      // In real implementation, send to backend for translation and delivery
      // Mock translation response
      setTimeout(() => {
        const translatedMsg: ChatMessage = {
          ...newMsg,
          translatedText: 'यह बहुत अच्छा लगता है! इस ऑर्डर के लिए आपकी समयसीमा क्या है?', // Mock translation
          targetLanguage: otherParticipant.language,
          status: 'delivered',
          translationMetadata: {
            confidence: 0.91,
            service: 'genai-translator',
            culturalContext: 'Polite business inquiry about timeline'
          },
          aiAnalysis: {
            sentiment: 'positive',
            intent: 'timeline_inquiry',
            confidence: 0.87,
            keyTopics: ['timeline', 'order_planning'],
            urgency: 'medium'
          }
        };

        setMessages(prev => 
          prev.map(msg => msg.id === messageId ? translatedMsg : msg)
        );
      }, 1000);

    } catch (error) {
      console.error('Failed to send message:', error);
      // Handle error - show error state, retry option, etc.
    } finally {
      setLoading(false);
    }
  }, [newMessage, loading, currentUserId, otherParticipant.id, otherParticipant.language, currentUserLanguage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const useSuggestion = useCallback((suggestion: string) => {
    setNewMessage(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  }, []);

  const getStatusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case 'sent':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCircle className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <TooltipProvider>
      <Card className="flex flex-col h-[600px] max-w-4xl mx-auto">
        {/* Chat Header */}
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={otherParticipant.profileImage} alt={otherParticipant.name} />
                <AvatarFallback>{getInitials(otherParticipant.name)}</AvatarFallback>
              </Avatar>
              
              <div>
                <CardTitle className="text-lg">{otherParticipant.name}</CardTitle>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className={`w-2 h-2 rounded-full ${otherParticipant.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span>{otherParticipant.isOnline ? 'Online' : 'Last seen 2h ago'}</span>
                  <Badge variant="outline" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {otherParticipant.language.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Translation Toggle */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="translation" className="text-sm">Translation</Label>
                <Switch
                  id="translation"
                  checked={translationEnabled}
                  onCheckedChange={setTranslationEnabled}
                />
              </div>

              {/* Show Original Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOriginalText(!showOriginalText)}
                  >
                    {showOriginalText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showOriginalText ? 'Hide original text' : 'Show original text'}
                </TooltipContent>
              </Tooltip>

              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  ×
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 flex flex-col min-h-0 p-0">
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 py-4">
              {messages.map((message) => {
                const isCurrentUser = message.senderId === currentUserId;
                const displayText = translationEnabled && message.translatedText 
                  ? message.translatedText 
                  : message.originalText;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                      {/* Message Bubble */}
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{displayText}</p>
                        
                        {/* Show original text if enabled and different */}
                        {showOriginalText && message.translatedText && message.originalText !== message.translatedText && (
                          <div className="mt-2 pt-2 border-t border-current/20">
                            <p className="text-xs opacity-70">
                              Original: {message.originalText}
                            </p>
                          </div>
                        )}

                        {/* Translation metadata */}
                        {translationEnabled && message.translationMetadata && (
                          <div className="mt-2 flex items-center space-x-2">
                            <Bot className="h-3 w-3 opacity-50" />
                            <span className="text-xs opacity-70">
                              Translated ({Math.round(message.translationMetadata.confidence * 100)}% confidence)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Message metadata */}
                      <div className={`flex items-center space-x-2 mt-1 text-xs text-muted-foreground ${
                        isCurrentUser ? 'justify-end' : 'justify-start'
                      }`}>
                        <span>{formatTime(message.timestamp)}</span>
                        {isCurrentUser && getStatusIcon(message.status)}
                      </div>

                      {/* Cultural context note */}
                      {message.translationMetadata?.culturalContext && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Cultural note: {message.translationMetadata.culturalContext}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* AI Analysis (for development/debugging) */}
                      {process.env.NODE_ENV === 'development' && message.aiAnalysis && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          <div>Sentiment: {message.aiAnalysis.sentiment}</div>
                          <div>Intent: {message.aiAnalysis.intent}</div>
                          <div>Topics: {message.aiAnalysis.keyTopics.join(', ')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* AI Suggestions */}
          {showSuggestions && aiSuggestions.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/30">
              <div className="text-xs text-muted-foreground mb-2 flex items-center">
                <Bot className="h-3 w-3 mr-1" />
                AI Suggestions:
              </div>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-1 px-2"
                    onClick={() => useSuggestion(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
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
                  placeholder={translationEnabled 
                    ? `Type in ${currentUserLanguage.toUpperCase()}... (will be translated to ${otherParticipant.language.toUpperCase()})`
                    : "Type your message..."
                  }
                  className="min-h-[40px] max-h-[120px] resize-none"
                  disabled={loading}
                />
              </div>
              
              <div className="flex space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" disabled>
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach file (coming soon)</TooltipContent>
                </Tooltip>

                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || loading}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {translationEnabled && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center">
                <Globe className="h-3 w-3 mr-1" />
                Messages will be automatically translated between {currentUserLanguage.toUpperCase()} and {otherParticipant.language.toUpperCase()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}