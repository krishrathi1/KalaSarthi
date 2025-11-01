'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Mic,
  Volume2,
  VolumeX,
  User,
  Bot,
  Loader2,
  Settings,
  History,
  Heart,
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

  // Online state
  const [isOnline, setIsOnline] = useState(true);

  // Gemma offline AI state
  const [gemmaReady, setGemmaReady] = useState(false);
  const [gemmaLoading, setGemmaLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const gemmaServiceRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

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
      console.log('📴 Offline detected - automatically loading offline AI...');

      // Automatically load offline AI when going offline
      if (!gemmaReady && !gemmaLoading) {
        initializeGemma();
      }
    };

    // Set initial state based on navigator.onLine
    const initialOnlineState = navigator.onLine;
    setIsOnline(initialOnlineState);

    // If starting offline, automatically load offline AI
    if (!initialOnlineState && !gemmaReady && !gemmaLoading) {
      console.log('📴 Starting offline - automatically loading offline AI...');
      setTimeout(() => initializeGemma(), 1000); // Small delay to let component settle
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize real offline AI with progress tracking
  const initializeGemma = async () => {
    if (gemmaServiceRef.current) return;

    try {
      setGemmaLoading(true);
      setLoadingProgress(0);
      setLoadingStage('Initializing...');
      console.log('🤖 Loading real offline AI model...');

      // Import and initialize Gemini Nano offline AI
      const { GeminiNanoOfflineAI } = await import('@/lib/services/GeminiNanoOfflineAI');
      gemmaServiceRef.current = GeminiNanoOfflineAI.getInstance();

      // Initialize with progress tracking
      const success = await gemmaServiceRef.current.initialize(
        (progress: number, stage: string) => {
          setLoadingProgress(progress);
          setLoadingStage(stage);
        }
      );

      if (!success) {
        throw new Error('Failed to initialize offline AI model');
      }

      setGemmaReady(true);
      setLoadingProgress(100);
      setLoadingStage('Ready!');

      const modelInfo = gemmaServiceRef.current.getModelInfo();
      console.log('✅ Gemini Nano offline AI ready!', {
        modelId: modelInfo.modelId,
        type: modelInfo.type,
        capabilities: modelInfo.capabilities
      });

      // Add success notification message
      const successMessage: Message = {
        id: 'ai-ready-' + Date.now(),
        content: `🎉 **Offline AI Ready!**\n\n${modelInfo.hasRealAI
          ? 'Your Google Gemini Nano AI is now loaded and ready! You can now chat completely offline with real AI.'
          : 'Your intelligent AI assistant is now ready! Using advanced rule-based system optimized for artisan needs.'}\n\n**Model:** ${modelInfo.modelId}\n**Type:** ${modelInfo.type}\n**System:** ${modelInfo.hasRealAI ? 'Real Neural AI' : 'Intelligent Fallback'}\n**Capabilities:** ${modelInfo.capabilities.join(', ')}`,
        sender: 'assistant',
        timestamp: new Date(),
        metadata: {
          intent: 'system_notification',
          suggestions: [
            'मेरे व्यापार की जानकारी दिखाएं',
            'नया उत्पाद बनाने में मदद करें',
            'Show my business analytics',
            'Help me create a new product'
          ]
        }
      };
      setMessages(prev => [...prev, successMessage]);
    } catch (error) {
      console.error('❌ Gemma initialization error:', error);

      // Show user-friendly message - this shouldn't happen since we have fallback
      const infoMessage: Message = {
        id: `ai-info-${Date.now()}`,
        content: 'ℹ️ **AI System Information**\n\nThe offline AI system encountered an issue during initialization, but don\'t worry - you can still use online features when connected to the internet.\n\n🌐 **Online Mode**: Full AI capabilities with Gemini 2.0 Flash\n🔌 **Offline Mode**: Will use fallback system when available',
        sender: 'assistant',
        timestamp: new Date(),
        metadata: {
          intent: 'info_notification',
          suggestions: ['Continue with Online Mode', 'Try Again Later']
        }
      };
      setMessages(prev => [...prev, infoMessage]);
    } finally {
      setGemmaLoading(false);
      setLoadingProgress(0);
      setLoadingStage('');
    }
  };

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      content: `🙏 नमस्ते! मैं आपका Artisan Buddy हूँ।

मैं आपकी शिल्पकारी, व्यापार, और डिजिटल खाता प्रबंधन में सहायता कर सकता हूँ।

**🚀 शुरू करने के लिए:**
${isOnline ? '🌐 आप ऑनलाइन हैं - तुरंत चैट करें!' : '🤖 Gemini Nano अपने आप लोड हो रहा है...'}

---

Hello! I'm your Artisan Buddy. I can help you with crafts, business, and digital ledger management.

**🚀 To get started:**
${isOnline ? '🌐 You\'re online - start chatting now!' : '🤖 Gemini Nano is loading automatically...'}`,
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

      if (isOnline) {
        // Online - use Gemini 2.0 Flash API (prioritize online functionality)
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
      } else if (gemmaReady && gemmaServiceRef.current) {
        // Offline - use real local AI
        console.log('🤖 Using Gemini Nano offline AI');
        try {
          const aiResponse = await gemmaServiceRef.current.generateResponse(
            content,
            messages.slice(-3).map(m => `${m.sender}: ${m.content}`).join('\n')
          );
          responseText = aiResponse.text;
          isOfflineResponse = true;

          console.log('✅ Gemini Nano response generated:', {
            confidence: aiResponse.confidence,
            processingTime: `${Math.round(aiResponse.processingTime)}ms`
          });
        } catch (error) {
          console.error('❌ Offline AI error:', error);
          responseText = 'Sorry, the offline AI encountered an error. Please try again or connect to the internet.';
        }
      } else {
        // No AI available - provide helpful guidance with automatic loading
        const isOffline = !isOnline;
        const noOfflineAI = !gemmaReady;
        const isLoadingAI = gemmaLoading;

        if (isOffline && isLoadingAI) {
          responseText = `🤖 **Gemini Nano is loading automatically...**\n\nProgress: ${Math.round(loadingProgress)}% - ${loadingStage}\n\nPlease wait while I prepare Google's Gemini Nano AI for offline use. Once ready, you'll have real AI responses without internet!`;
        } else if (isOffline && noOfflineAI) {
          responseText = `🔌 **You're offline** - Starting Gemini Nano...\n\nI'm automatically loading Google's Gemini Nano AI so you can chat with real AI without internet. This may take a few moments.\n\n🌐 **Alternative:** Connect to the internet for instant online chat`;

          // Trigger automatic loading if not already loading
          if (!gemmaLoading) {
            setTimeout(() => initializeGemma(), 500);
          }
        } else if (isOffline) {
          responseText = 'You appear to be offline, but the offline AI should be available. Let me try to reconnect...';
        } else {
          responseText = 'Please ensure you have an internet connection or wait for the offline AI to load automatically.';
        }
      }

      // Create assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseText,
        sender: 'assistant',
        timestamp: new Date(),
        metadata: {
          intent: isOfflineResponse ? 'offline_ai' : 'online_gemini',
          confidence: isOfflineResponse ? 0.8 : 0.9
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // SMART TTS - Use Google Cloud TTS when online, browser TTS when offline
      if (assistantMessage.content) {
        try {
          console.log('🔊 Starting smart TTS for response');
          setIsSpeaking(true);
          setIsPaused(false);

          if (isOnline) {
            // Online: Use Google Cloud TTS for high-quality voice
            console.log('🌐 Using Google Cloud TTS (high quality)');

            // Import and use Google Cloud TTS service
            const { GoogleCloudTTSService } = await import('@/lib/services/GoogleCloudTTSService');

            // Detect language for better voice selection
            const isHindi = /[\u0900-\u097F]/.test(assistantMessage.content);
            const languageCode = isHindi ? 'hi-IN' : 'en-IN';

            const ttsResult = await GoogleCloudTTSService.synthesizeSpeech(
              assistantMessage.content,
              {
                languageCode,
                gender: 'FEMALE',
                speakingRate: 0.9,
                pitch: 0.1,
                audioEncoding: 'MP3'
              }
            );

            if (ttsResult.success && ttsResult.audio) {
              console.log('✅ Google Cloud TTS synthesis successful');

              // Create audio element and play
              const audioUrl = GoogleCloudTTSService.createAudioUrl(
                ttsResult.audio.content,
                ttsResult.audio.mimeType
              );

              const audio = new Audio(audioUrl);
              currentAudioRef.current = audio;

              audio.onplay = () => {
                console.log('🔊 Google TTS started playing');
                setIsSpeaking(true);
                setIsPaused(false);
              };

              audio.onended = () => {
                console.log('🔊 Google TTS finished playing');
                setIsSpeaking(false);
                setIsPaused(false);
                currentAudioRef.current = null;
              };

              audio.onerror = (e) => {
                console.warn('🔊 Google TTS playback error:', e);
                setIsSpeaking(false);
                setIsPaused(false);

                // Fallback to browser TTS
                playWithBrowserTTS(assistantMessage.content);
              };

              await audio.play();

            } else {
              console.warn('🔊 Google Cloud TTS failed, using browser fallback');
              playWithBrowserTTS(assistantMessage.content);
            }

          } else {
            // Offline: Use browser TTS
            console.log('🔌 Using browser TTS (offline mode)');
            playWithBrowserTTS(assistantMessage.content);
          }

        } catch (error) {
          console.error('🔊 Smart TTS failed:', error);
          setIsSpeaking(false);
          setIsPaused(false);

          // Ultimate fallback to browser TTS
          playWithBrowserTTS(assistantMessage.content);
        }
      }

      // Browser TTS fallback function
      function playWithBrowserTTS(text: string) {
        if ('speechSynthesis' in window) {
          try {
            speechSynthesis.cancel(); // Clear any existing speech

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;

            utterance.onstart = () => {
              console.log('🔊 Browser TTS started');
              setIsSpeaking(true);
              setIsPaused(false);
            };

            utterance.onend = () => {
              console.log('🔊 Browser TTS finished');
              setIsSpeaking(false);
              setIsPaused(false);
            };

            utterance.onerror = (e) => {
              const errorType = e?.error || 'Unknown TTS error';

              if (errorType === 'interrupted' || errorType === 'canceled') {
                console.log('🔊 Browser TTS interrupted (normal)');
              } else {
                console.warn('🔊 Browser TTS error:', errorType);
              }

              setIsSpeaking(false);
              setIsPaused(false);
            };

            setTimeout(() => {
              speechSynthesis.speak(utterance);
            }, 100);

          } catch (error) {
            console.error('🔊 Browser TTS failed:', error);
            setIsSpeaking(false);
            setIsPaused(false);
          }
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
    // Handle special suggestions for Gemma AI
    if (suggestion === 'Retry Loading Offline AI') {
      // Offline AI disabled for stability - show message instead
      const message: Message = {
        id: Date.now().toString(),
        content: 'Offline AI is temporarily disabled for stability. Please use online features.',
        sender: 'assistant',
        timestamp: new Date(),
        metadata: { intent: 'system_message' }
      };
      setMessages(prev => [...prev, message]);
      return;
    }
    if (suggestion === 'Continue with Online Only') {
      // Just acknowledge and continue
      const ackMessage: Message = {
        id: Date.now().toString(),
        content: 'Continuing with online-only mode. You can try loading offline AI again later using the "Load Offline AI" button.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, ackMessage]);
      return;
    }

    // Regular suggestion - send as message
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
    // Stop Google Cloud TTS audio if playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
      console.log('🔊 Google TTS stopped');
    }

    // Stop browser TTS if playing
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      console.log('🔊 Browser TTS stopped');
    }

    setIsSpeaking(false);
    setIsPaused(false);
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
                  Gemini Nano Ready
                </Badge>
              ) : gemmaLoading ? (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Download className="h-3 w-3 mr-1 animate-pulse" />
                    Loading Gemini Nano... {Math.round(loadingProgress)}%
                  </Badge>
                  {loadingStage && (
                    <span className="text-xs text-gray-600">{loadingStage}</span>
                  )}
                </div>
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

              {!gemmaReady && !gemmaLoading && isOnline && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={initializeGemma}
                  title="Load Google Gemini Nano for offline AI"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Load Offline AI
                </Button>
              )}

              {gemmaReady && gemmaServiceRef.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const status = gemmaServiceRef.current.getStatus();
                    const modelInfo = gemmaServiceRef.current.getModelInfo();

                    const statusMessage: Message = {
                      id: 'ai-status-' + Date.now(),
                      content: `**Gemini Nano Status:**
- Model: ${modelInfo.modelId}
- Type: ${modelInfo.type}
- Real AI: ${modelInfo.hasRealAI ? 'Yes' : 'Fallback Mode'}
- Status: ${status.isReady ? 'Ready' : 'Not Ready'}
- Capabilities: ${modelInfo.capabilities.join(', ')}
- Loading: ${status.isLoading ? 'Yes' : 'No'}
${status.loadError ? `- Error: ${status.loadError}` : ''}
${status.capabilities ? `- Browser Support: ${status.capabilities.available}` : ''}`,
                      sender: 'assistant',
                      timestamp: new Date(),
                      metadata: {
                        intent: 'status_info'
                      }
                    };
                    setMessages(prev => [...prev, statusMessage]);
                  }}
                  title="Show AI status information"
                >
                  <Settings className="h-4 w-4" />
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