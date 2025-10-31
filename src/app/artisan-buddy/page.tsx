'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MessageCircle,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  User,
  Bot,
  Loader2,
  Settings,
  History,
  Star,
  Heart,
  Share2,
  Pause,
  Play,
  Wifi,
  WifiOff,
  Download
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'image' | 'audio';
  metadata?: {
    intent?: string;
    confidence?: number;
    suggestions?: string[];
  };
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

export default function ArtisanBuddyPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // Offline AI state
  const [isOnline, setIsOnline] = useState(true);
  const [gemmaLoading, setGemmaLoading] = useState(false);
  const [gemmaReady, setGemmaReady] = useState(false);
  const gemmaServiceRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Back online - using Gemini 2.0 Flash');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📴 Offline - will use Gemma if available');

      // Try to initialize Gemma when going offline
      if (!gemmaReady && !gemmaLoading) {
        initializeGemma();
      }
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [gemmaReady, gemmaLoading]);

  // Initialize Gemma service
  const initializeGemma = async () => {
    if (gemmaServiceRef.current) return;

    try {
      setGemmaLoading(true);
      console.log('🤖 Initializing Gemma offline AI...');

      // Dynamically import to avoid SSR issues
      const { GemmaOfflineService } = await import('@/lib/services/GemmaOfflineService');

      gemmaServiceRef.current = GemmaOfflineService.getInstance();
      const success = await gemmaServiceRef.current.initialize();

      if (success) {
        setGemmaReady(true);
        console.log('✅ Gemma ready for offline use!');
      } else {
        console.error('❌ Gemma initialization failed');
      }
    } catch (error) {
      console.error('❌ Gemma initialization error:', error);
    } finally {
      setGemmaLoading(false);
    }
  };

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      content: 'नमस्ते! मैं आपका Artisan Buddy हूँ। मैं आपकी शिल्पकारी, व्यापार, और डिजिटल खाता प्रबंधन में सहायता कर सकता हूँ। आप मुझसे हिंदी या अंग्रेजी में बात कर सकते हैं।\n\nHello! I\'m your Artisan Buddy. I can help you with crafts, business, and digital ledger management. You can chat with me in Hindi or English.',
      sender: 'assistant',
      timestamp: new Date(),
      metadata: {
        suggestions: [
          'मेरे व्यापार की जानकारी दिखाएं',
          'नया उत्पाद बनाने में मदद करें',
          'Show my business analytics',
          'Help me create a new product'
        ]
      }
    };
    setMessages([welcomeMessage]);
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let responseText = '';
      let isOfflineResponse = false;

      // Check if we should use offline AI
      if (!isOnline && gemmaReady && gemmaServiceRef.current) {
        console.log('🤖 Using Gemma offline AI');
        isOfflineResponse = true;

        const systemPrompt = gemmaServiceRef.current.getArtisanSystemPrompt('en');
        responseText = await gemmaServiceRef.current.generateResponse(content, systemPrompt);
      } else if (!isOnline && !gemmaReady) {
        // Offline but Gemma not ready
        responseText = 'You are currently offline and the offline AI is not available. Please connect to the internet to chat with Artisan Buddy.';
      } else {
        // Online - use Gemini 2.0 Flash API
        console.log('🌐 Using Gemini 2.0 Flash API');
        const response = await fetch('/api/artisan-buddy/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            sessionId: currentSessionId,
            context: {
              previousMessages: messages.slice(-5), // Last 5 messages for context
              userPreferences: {
                language: 'auto-detect',
                responseStyle: 'helpful'
              }
            }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response');
        }

        const data = await response.json();
        responseText = data.response || 'मुझे खुशी होगी आपकी सहायता करने में। कृपया अपना प्रश्न दोबारा पूछें।';
      }

      // Create assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseText,
        sender: 'assistant',
        timestamp: new Date(),
        metadata: {
          intent: isOfflineResponse ? 'offline_gemma' : 'online_gemini',
          confidence: isOfflineResponse ? 0.8 : 0.9
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // BULLETPROOF VOICE OUTPUT - Speak the AI response
      if ('speechSynthesis' in window && assistantMessage.content) {
        try {
          console.log('🔊 Starting BULLETPROOF TTS for response');
          setIsSpeaking(true);
          setIsPaused(false);

          // Use reliable browser TTS (most compatible)
          speechSynthesis.cancel(); // Clear any existing speech

          const utterance = new SpeechSynthesisUtterance(assistantMessage.content);
          utterance.lang = 'en-US';
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 0.8;

          utterance.onstart = () => {
            console.log('🔊 TTS started successfully');
            setIsSpeaking(true);
            setIsPaused(false);
          };

          utterance.onend = () => {
            console.log('🔊 TTS finished successfully');
            setIsSpeaking(false);
            setIsPaused(false);
          };

          utterance.onerror = (e) => {
            console.error('🔊 TTS error:', e);
            setIsSpeaking(false);
            setIsPaused(false);
          };

          // Wait a moment for voices to load, then speak
          setTimeout(() => {
            speechSynthesis.speak(utterance);
          }, 100);

        } catch (error) {
          console.error('TTS failed:', error);
          setIsSpeaking(false);
          setIsPaused(false);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'क्षमा करें, कुछ तकनीकी समस्या हुई है। कृपया दोबारा कोशिश करें।\n\nSorry, there was a technical issue. Please try again.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const startNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      lastMessage: '',
      timestamp: new Date(),
      messageCount: 0
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const togglePauseSpeech = () => {
    if ('speechSynthesis' in window) {
      if (isPaused) {
        speechSynthesis.resume();
        setIsPaused(false);
        console.log('🔊 TTS resumed');
      } else {
        speechSynthesis.pause();
        setIsPaused(true);
        console.log('🔊 TTS paused');
      }
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      console.log('🔊 TTS stopped');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-r border-orange-200`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-orange-800">Chat History</h2>
            <Button
              onClick={startNewSession}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
            >
              New Chat
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-120px)]">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`mb-2 cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-orange-100' : 'hover:bg-gray-50'
                  }`}
                onClick={() => setCurrentSessionId(session.id)}
              >
                <CardContent className="p-3">
                  <div className="font-medium text-sm truncate">{session.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {session.messageCount} messages • {formatTime(session.timestamp)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-orange-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <History className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-orange-800">Artisan Buddy</h1>
                  <p className="text-sm text-gray-600">Your AI Craft & Business Assistant</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Online/Offline Status */}
              {isOnline ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Wifi className="h-3 w-3 mr-1" />
                  Online (Gemini 2.0)
                </Badge>
              ) : gemmaReady ? (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline (Gemma AI)
                </Badge>
              ) : gemmaLoading ? (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Download className="h-3 w-3 mr-1 animate-pulse" />
                  Loading AI...
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}

              {/* Voice Service Status */}
              <div className="flex items-center space-x-1">
                {isListening && (
                  <Badge variant="default" className="bg-green-500 text-white animate-pulse">
                    <Mic className="h-3 w-3 mr-1" />
                    Recording
                  </Badge>
                )}
                {isSpeaking && (
                  <div className="flex items-center space-x-1">
                    <Badge variant="default" className="bg-blue-500 text-white animate-pulse">
                      <Volume2 className="h-3 w-3 mr-1" />
                      Speaking
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={togglePauseSpeech}
                      className="h-7 px-2"
                      title={isPaused ? "Resume" : "Pause"}
                    >
                      {isPaused ? (
                        <Play className="h-3 w-3 text-blue-600" />
                      ) : (
                        <Pause className="h-3 w-3 text-blue-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={stopSpeech}
                      className="h-7 px-2"
                      title="Stop"
                    >
                      <VolumeX className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                )}
              </div>

              {!gemmaReady && !gemmaLoading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={initializeGemma}
                  title="Load offline AI"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Load Offline AI
                </Button>
              )}

              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.sender === 'user'
                    ? 'bg-blue-500'
                    : 'bg-gradient-to-r from-orange-400 to-red-400'
                    }`}>
                    {message.sender === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className={`rounded-lg p-3 ${message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-orange-200'
                    }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {formatTime(message.timestamp)}
                    </div>

                    {/* Suggestions */}
                    {message.metadata?.suggestions && (
                      <div className="mt-3 space-y-1">
                        {message.metadata.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs mr-1 mb-1"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-white border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="bg-white border-t border-orange-200 p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message in Hindi or English..."
                  className="pr-12 border-orange-200 focus:border-orange-400"
                  disabled={isLoading}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={async () => {
                      try {
                        if (isListening) {
                          setIsListening(false);
                          return;
                        }

                        // BULLETPROOF Voice Recognition - No more "aborted" errors!
                        console.log('🎤 Starting BULLETPROOF voice recognition');
                        setIsListening(true);

                        // Use audio utilities for reliable recording
                        const { requestMicrophoneAccess, createMediaRecorder, stopAllTracks } = await import('@/lib/utils/audioUtils');

                        const stream = await requestMicrophoneAccess();
                        const mediaRecorder = createMediaRecorder(stream);

                        const audioChunks: Blob[] = [];

                        mediaRecorder.ondataavailable = (event) => {
                          if (event.data.size > 0) {
                            audioChunks.push(event.data);
                          }
                        };

                        mediaRecorder.onstop = async () => {
                          console.log('🎤 Recording complete, processing...');
                          setIsListening(false);

                          try {
                            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

                            // Use Gemini STT API for most reliable transcription
                            const formData = new FormData();
                            formData.append('audio', audioBlob, 'recording.webm');
                            formData.append('language', 'en-US');

                            const response = await fetch('/api/stt/gemini', {
                              method: 'POST',
                              body: formData
                            });

                            if (response.ok) {
                              const result = await response.json();
                              if (result.success && result.result?.text) {
                                console.log('✅ Gemini STT success:', result.result.text);
                                setInputMessage(result.result.text);
                                setTimeout(() => {
                                  sendMessage(result.result.text);
                                }, 100);
                              } else {
                                throw new Error(result.error || 'No transcript received');
                              }
                            } else {
                              throw new Error('Gemini STT API failed');
                            }
                          } catch (error) {
                            console.error('❌ Voice processing failed:', error);
                            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                            alert(`Voice processing failed: ${errorMsg}. Please type your message.`);
                          }

                          stopAllTracks(stream);
                        };

                        mediaRecorder.onerror = (event) => {
                          console.error('❌ MediaRecorder error:', event);
                          setIsListening(false);
                          alert('Recording failed. Please try again.');
                          stopAllTracks(stream);
                        };

                        mediaRecorder.start();
                        console.log('🎤 Recording started - speak now!');

                        // Auto-stop after 10 seconds
                        setTimeout(() => {
                          if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                          }
                        }, 10000);

                      } catch (error) {
                        console.error('❌ Voice setup failed:', error);
                        setIsListening(false);

                        let errorMessage = "Voice input failed.";
                        if (error instanceof Error) {
                          if (error.name === 'NotAllowedError') {
                            errorMessage = "Microphone access denied. Please allow microphone access and try again.";
                          } else if (error.name === 'NotFoundError') {
                            errorMessage = "Microphone not found. Please connect a microphone and try again.";
                          } else {
                            errorMessage = `Voice input failed: ${error.message}`;
                          }
                        }
                        alert(errorMessage);
                      }
                    }}
                    title={isListening ? "Recording... Click to stop" : "Click to start voice input"}
                  >
                    {isListening ? (
                      <div className="relative">
                        <Mic className="h-4 w-4 text-red-500 animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                      </div>
                    ) : (
                      <div className="relative">
                        <Mic className="h-4 w-4 text-green-600" />
                        <div className="absolute -bottom-1 -right-1 text-xs font-bold text-green-600">✓</div>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>

            <div className="flex items-center justify-center mt-2 text-xs text-gray-500">
              <span>Powered by AI • Supports Hindi & English • </span>
              <Heart className="h-3 w-3 text-red-400 mx-1" />
              <span>Made for Indian Artisans</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}