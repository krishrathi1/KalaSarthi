
"use client";

import { useState, useRef, useEffect } from "react";
import { BotMessageSquare, Send, CornerDownLeft, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { t, translateAsync } from "@/lib/i18n";

interface EnhancedChatMessage extends ChatMessage {
  id?: string;
  timestamp?: Date;
  language?: string;
  isVoice?: boolean;
  audioUrl?: string;
}

export function DigitalTwinChat() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const [translatedTitle, setTranslatedTitle] = useState('Artisan Buddy');
  const [translatedDescription, setTranslatedDescription] = useState('Chat with your AI assistant 24/7.');
  const [translatedPlaceholder, setTranslatedPlaceholder] = useState('Ask about weaving techniques...');
  const [translatedSend, setTranslatedSend] = useState('Send');
  const [translatedYou, setTranslatedYou] = useState('You');
  const [translatedAI, setTranslatedAI] = useState('AI');
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    // Load chat history
    loadChatHistory();

    // Load translations
    loadTranslations();

    // Listen for voice input from universal microphone
    const handleVoiceInput = (event: CustomEvent) => {
      const { transcript, isVoice } = event.detail;
      console.log('Voice input received:', { transcript, isVoice });
      
      if (transcript && isVoice) {
        // Add voice input as user message immediately
        const voiceMessage: EnhancedChatMessage = {
          id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: transcript,
          timestamp: new Date(),
          language: language,
          isVoice: true
        };
        
        console.log('Adding voice message to chat:', voiceMessage);
        setMessages(prev => {
          const newMessages = [...prev, voiceMessage];
          console.log('Updated messages:', newMessages);
          return newMessages;
        });
        
        // Process the voice input
        handleVoiceSubmit(transcript);
      }
    };

    // Listen for voice recognition events
    const handleVoiceStart = () => setIsListening(true);
    const handleVoiceEnd = () => setIsListening(false);

    // Add event listeners
    window.addEventListener('voiceInput' as any, handleVoiceInput);
    window.addEventListener('voiceStart' as any, handleVoiceStart);
    window.addEventListener('voiceEnd' as any, handleVoiceEnd);

    return () => {
      window.removeEventListener('voiceInput' as any, handleVoiceInput);
      window.removeEventListener('voiceStart' as any, handleVoiceStart);
      window.removeEventListener('voiceEnd' as any, handleVoiceEnd);
    };
  }, [language, user]);

  const loadChatHistory = async () => {
    try {
      const userId = user?.uid || 'default-user';
      console.log('Loading chat history for user:', userId);
      
      const response = await fetch(`/api/artisan-buddy/chat?limit=50&userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Chat history loaded:', data);
        
        if (data.messages && data.messages.length > 0) {
          // Convert stored messages to EnhancedChatMessage format
          const enhancedMessages: EnhancedChatMessage[] = data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.text,
            timestamp: new Date(msg.timestamp),
            language: msg.language || 'en-US',
            isVoice: msg.isVoice || false,
            audioUrl: msg.audioUrl
          }));
          setMessages(enhancedMessages);
          console.log('Enhanced messages set:', enhancedMessages);
        } else {
          // Set initial message if no history
          const initialMessage: EnhancedChatMessage = {
            role: "assistant",
            content: "Namaste! I am your Artisan Buddy. Ask me anything about your craft, business, or how I can help you today.",
            timestamp: new Date(),
            language: 'en-US',
            isVoice: false
          };
          setMessages([initialMessage]);
          console.log('No chat history, set initial message');
        }
      } else {
        console.error('Failed to load chat history, response not ok:', response.status);
        throw new Error('Failed to load chat history');
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Set initial message on error
      const initialMessage: EnhancedChatMessage = {
        role: "assistant",
        content: "Namaste! I am your Artisan Buddy. Ask me anything about your craft, business, or how I can help you today.",
        timestamp: new Date(),
        language: 'en-US',
        isVoice: false
      };
      setMessages([initialMessage]);
    }
  };

  const loadTranslations = async () => {
    try {
      const [title, description, placeholder, send, you, ai, initialMsg] = await Promise.all([
        translateAsync('chatTitle', language),
        translateAsync('chatDescription', language),
        translateAsync('chatPlaceholder', language),
        translateAsync('send', language),
        translateAsync('you', language),
        translateAsync('ai', language),
        translateAsync('chatInitialMessage', language),
      ]);

      setTranslatedTitle(title);
      setTranslatedDescription(description);
      setTranslatedPlaceholder(placeholder);
      setTranslatedSend(send);
      setTranslatedYou(you);
      setTranslatedAI(ai);
    } catch (error) {
      console.error('Chat translation loading failed:', error);
      // Fallback to static translations
      setTranslatedTitle(t('chatTitle', language) || 'Artisan Buddy');
      setTranslatedDescription(t('chatDescription', language) || 'Chat with your AI assistant 24/7.');
      setTranslatedPlaceholder(t('chatPlaceholder', language) || 'Ask about weaving techniques...');
      setTranslatedSend(t('send', language) || 'Send');
      setTranslatedYou(t('you', language) || 'You');
      setTranslatedAI(t('ai', language) || 'AI');
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const speakText = (text: string) => {
    if (synthRef.current && isVoiceEnabled) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
    }
  };

  const handleVoiceSubmit = async (transcript: string) => {
    if (!transcript.trim() || loading) return;

    console.log('Processing voice submit:', transcript);
    setLoading(true);

    try {
      const userId = user?.uid || 'default-user';
      
      // First, try to get an instant response from stream API
      try {
        const streamResponse = await fetch('/api/artisan-buddy/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: transcript,
            language: language,
            userId: userId
          }),
        });

        if (streamResponse.ok) {
          const streamData = await streamResponse.json();
          console.log('Stream response received:', streamData);
          
          if (streamData.isFast) {
            // Show instant response
            const responseContent = typeof streamData.response === 'string' 
              ? streamData.response 
              : JSON.stringify(streamData.response);
              
            const instantMessage: EnhancedChatMessage = { 
              id: `instant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              role: "assistant", 
              content: responseContent,
              timestamp: new Date(),
              language: streamData.language || language,
              isVoice: false
            };
            
            setMessages((prev) => [...prev, instantMessage]);

            // Speak the response if voice is enabled
            if (isVoiceEnabled && streamData.response) {
              console.log('Speaking instant response:', streamData.response);
              speakText(streamData.response);
            }

            // Handle navigation if needed
            if (streamData.shouldNavigate && streamData.navigationTarget) {
              setTimeout(() => {
                window.location.href = streamData.navigationTarget;
              }, 1000);
            }

            setLoading(false);
            return;
          }
        }
      } catch (streamError) {
        console.log('Stream API failed, falling back to main API:', streamError);
      }

      // Fallback to main API if stream doesn't work
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch('/api/artisan-buddy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: transcript,
          language: language,
          enableTranslation: isTranslationEnabled,
          enableVoice: isVoiceEnabled,
          isVoice: true,
          userId: userId,
          fastMode: true
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('AI response received:', data);
        console.log('Response type:', typeof data.response);
        console.log('Response content:', data.response);
        
        // Ensure response is a string
        const responseContent = typeof data.response === 'string' 
          ? data.response 
          : JSON.stringify(data.response);
        
        const assistantMessage: EnhancedChatMessage = { 
          id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: "assistant", 
          content: responseContent,
          timestamp: new Date(),
          language: data.language || language,
          isVoice: false,
          audioUrl: data.audio
        };
        
        setMessages((prev) => [...prev, assistantMessage]);

        // Speak the response if voice is enabled
        if (isVoiceEnabled && data.response) {
          console.log('Speaking response:', data.response);
          speakText(data.response);
        }

        // Handle navigation if needed
        if (data.shouldNavigate && data.navigationTarget) {
          setTimeout(() => {
            window.location.href = data.navigationTarget;
          }, 1000);
        }

        // Handle action data if available
        if (data.actionData) {
          console.log('Action data received:', data.actionData);
          // Additional action handling can be added here
        }
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(`Failed to get response: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Voice chat error:', error);
      
      // Add error message to chat
      const errorMessage: EnhancedChatMessage = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
        language: language,
        isVoice: false
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        title: t('chatError', language) || "Chat Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: EnhancedChatMessage = { 
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: "user", 
      content: input,
      timestamp: new Date(),
      language: language,
      isVoice: false
    };
    
    console.log('Adding user text message:', userMessage);
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      const userId = user?.uid || 'default-user';
      const response = await fetch('/api/artisan-buddy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          language: language,
          enableTranslation: isTranslationEnabled,
          enableVoice: isVoiceEnabled,
          isVoice: false,
          userId: userId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('AI response received for text:', data);
        
        // Ensure response is a string
        const responseContent = typeof data.response === 'string' 
          ? data.response 
          : JSON.stringify(data.response);
        
        const assistantMessage: EnhancedChatMessage = { 
          id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: "assistant", 
          content: responseContent,
          timestamp: new Date(),
          language: data.language || language,
          isVoice: false,
          audioUrl: data.audio // Store audio URL if available
        };
        
        console.log('Adding AI response to chat:', assistantMessage);
        setMessages((prev) => [...prev, assistantMessage]);

        // Speak the response if voice is enabled
        if (isVoiceEnabled && data.response) {
          console.log('Speaking response:', data.response);
          speakText(data.response);
        }
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(`Failed to get response: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message to chat
      const errorMessage: EnhancedChatMessage = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
        language: language,
        isVoice: false
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        title: t('chatError', language) || "Chat Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <Card id="chat" className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-headline flex items-center gap-2">
            <BotMessageSquare className="size-6 text-primary" />
            {translatedTitle}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={cn(
                "flex items-center gap-2",
                isVoiceEnabled ? "bg-primary text-primary-foreground" : ""
              )}
            >
              {isVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Voice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTranslationEnabled(!isTranslationEnabled)}
              className={cn(
                "flex items-center gap-2",
                isTranslationEnabled ? "bg-primary text-primary-foreground" : ""
              )}
            >
              🌐 Translate
            </Button>
          </div>
        </div>
        <CardDescription>
          {translatedDescription}
        </CardDescription>
        {messages.length === 1 && messages[0].role === 'assistant' && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>Tip:</strong> Use the universal microphone button in the header to speak your messages, or type below to chat with me!
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {isListening && (
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-red-700">Listening... Speak now</span>
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={cn(
                  "flex items-start gap-3 mb-4",
                  message.role === "user" && "justify-end"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="size-8 border shrink-0">
                    <AvatarImage src="/api/placeholder/100/100/artisan" alt="Artisan Avatar" />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                      {translatedAI}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-xs md:max-w-md rounded-lg p-3 text-sm shadow-sm",
                    message.role === "assistant"
                      ? "bg-muted border"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {message.isVoice && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Mic className="h-3 w-3" />
                        Voice
                      </Badge>
                    )}
                    {message.language && message.language !== language && (
                      <Badge variant="outline" className="text-xs">
                        {message.language}
                      </Badge>
                    )}
                    {message.audioUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          const audio = new Audio(`data:audio/mp3;base64,${message.audioUrl}`);
                          audio.play();
                        }}
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {typeof message.content === 'string' 
                      ? message.content 
                      : JSON.stringify(message.content)
                    }
                  </div>
                  {message.timestamp && (
                    <div className="text-xs opacity-70 mt-2 flex items-center justify-between">
                      <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                      {message.role === "assistant" && isSpeaking && index === messages.length - 1 && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span>Speaking...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <Avatar className="size-8 border shrink-0">
                    <AvatarFallback className="bg-green-100 text-green-600 font-semibold">
                      {translatedYou}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-3 mb-4">
                <Avatar className="size-8 border shrink-0">
                  <AvatarImage src="/api/placeholder/100/100/artisan" alt="Artisan Avatar" />
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                    {translatedAI}
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-xs md:max-w-md rounded-lg p-3 text-sm bg-muted border shadow-sm">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-0"></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-300"></span>
                    <span className="text-xs text-muted-foreground ml-2">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2 relative">
          <Input
            id="chat-input"
            placeholder={translatedPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              // Voice input will be handled by universal microphone
              toast({
                title: "Voice Input",
                description: "Click the universal microphone button in the header to speak your message",
                duration: 3000,
              });
            }}
            disabled={loading}
            className={cn(
              "transition-colors",
              isListening && "bg-red-100 border-red-300 text-red-600"
            )}
            title="Use the universal microphone in the header to speak"
          >
            {isListening ? (
              <MicOff className="h-4 w-4 animate-pulse" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            <span className="sr-only">Voice Input</span>
          </Button>
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">{translatedSend}</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
