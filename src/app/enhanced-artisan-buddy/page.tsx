'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  BarChart3,
  Package,
  Users,
  TrendingUp,
  Camera,
  Image,
  FileText,
  Calculator,
  ShoppingCart,
  Palette,
  Lightbulb,
  Target,
  Award,
  BookOpen
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'image' | 'audio' | 'analysis' | 'suggestion';
  metadata?: {
    intent?: string;
    confidence?: number;
    suggestions?: string[];
    analysis?: any;
    attachments?: any[];
  };
}

interface BusinessMetrics {
  totalProducts: number;
  monthlyRevenue: number;
  customerCount: number;
  growthRate: number;
  topProducts: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
}

interface CraftAnalysis {
  category: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  materials: string[];
  marketDemand: number;
  priceRange: {
    min: number;
    max: number;
  };
}

export default function EnhancedArtisanBuddyPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [craftAnalysis, setCraftAnalysis] = useState<CraftAnalysis | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with enhanced welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      content: `🙏 नमस्ते! मैं आपका Enhanced Artisan Buddy हूँ।

मैं आपकी निम्नलिखित सेवाओं में सहायता कर सकता हूँ:

🎨 **शिल्प विश्लेषण**: आपके उत्पादों की तस्वीरें अपलोड करें
📊 **व्यापार एनालिटिक्स**: बिक्री और ग्राहक डेटा
💰 **डिजिटल खाता**: आय-व्यय प्रबंधन
🛍️ **मार्केट इनसाइट्स**: बाजार की जानकारी
🎯 **बिजनेस सुझाव**: व्यापार बढ़ाने के तरीके

Hello! I'm your Enhanced Artisan Buddy with advanced features for craft analysis, business insights, and digital ledger management.`,
      sender: 'assistant',
      timestamp: new Date(),
      metadata: {
        suggestions: [
          '📊 मेरे व्यापार का डैशबोर्ड दिखाएं',
          '🎨 नया उत्पाद डिज़ाइन करने में मदद करें',
          '📸 मेरे उत्पाद का विश्लेषण करें',
          '💰 इस महीने की आय दिखाएं',
          '🛍️ बाजार की ट्रेंड्स बताएं'
        ]
      }
    };
    setMessages([welcomeMessage]);

    // Load sample business metrics
    loadBusinessMetrics();
  }, []);

  const loadBusinessMetrics = async () => {
    // Simulate API call
    setTimeout(() => {
      setBusinessMetrics({
        totalProducts: 24,
        monthlyRevenue: 45000,
        customerCount: 156,
        growthRate: 23.5,
        topProducts: [
          { name: 'हस्तनिर्मित साड़ी', sales: 12, revenue: 18000 },
          { name: 'मिट्टी के बर्तन', sales: 8, revenue: 12000 },
          { name: 'लकड़ी की मूर्तियां', sales: 6, revenue: 15000 }
        ]
      });
    }, 1000);
  };

  const sendMessage = async (content: string, imageFile?: File) => {
    if (!content.trim() && !imageFile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim() || 'Image uploaded for analysis',
      sender: 'user',
      timestamp: new Date(),
      type: imageFile ? 'image' : 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', content);
      if (imageFile) {
        formData.append('image', imageFile);
      }
      formData.append('context', JSON.stringify({
        previousMessages: messages.slice(-5),
        userPreferences: {
          language: 'auto-detect',
          responseStyle: 'detailed',
          includeAnalysis: true
        }
      }));

      const response = await fetch('/api/artisan-buddy/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'मुझे खुशी होगी आपकी सहायता करने में। कृपया अपना प्रश्न दोबारा पूछें।',
        sender: 'assistant',
        timestamp: new Date(),
        type: data.type || 'text',
        metadata: {
          intent: data.intent,
          confidence: data.confidence,
          suggestions: data.suggestions,
          analysis: data.analysis,
          attachments: data.attachments
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // REAL VOICE OUTPUT - Speak the AI response
      if ('speechSynthesis' in window && assistantMessage.content) {
        try {
          speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(assistantMessage.content);
          utterance.lang = 'en-US';
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 0.8;

          speechSynthesis.speak(utterance);
        } catch (error) {
          console.error('Voice output failed:', error);
        }
      }

      // Handle special responses
      if (data.analysis && data.analysis.type === 'craft') {
        setCraftAnalysis(data.analysis.data);
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
      setSelectedImage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage, selectedImage || undefined);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderBusinessDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold">{businessMetrics?.totalProducts || 0}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(businessMetrics?.monthlyRevenue || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Customers</p>
                <p className="text-2xl font-bold">{businessMetrics?.customerCount || 0}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Growth Rate</p>
                <p className="text-2xl font-bold">{businessMetrics?.growthRate || 0}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {businessMetrics?.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-600">{product.sales} units sold</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(product.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCraftAnalysis = () => (
    <div className="space-y-6">
      {craftAnalysis ? (
        <Card>
          <CardHeader>
            <CardTitle>Craft Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-medium">{craftAnalysis.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Complexity</p>
                <Badge variant={
                  craftAnalysis.complexity === 'Beginner' ? 'secondary' :
                    craftAnalysis.complexity === 'Intermediate' ? 'default' : 'destructive'
                }>
                  {craftAnalysis.complexity}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estimated Time</p>
                <p className="font-medium">{craftAnalysis.estimatedTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Market Demand</p>
                <div className="flex items-center space-x-2">
                  <Progress value={craftAnalysis.marketDemand} className="flex-1" />
                  <span className="text-sm">{craftAnalysis.marketDemand}%</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Required Materials</p>
              <div className="flex flex-wrap gap-2">
                {craftAnalysis.materials.map((material, index) => (
                  <Badge key={index} variant="outline">{material}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Price Range</p>
              <p className="font-medium">
                {formatCurrency(craftAnalysis.priceRange.min)} - {formatCurrency(craftAnalysis.priceRange.max)}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Upload Product Image</h3>
            <p className="text-gray-600 mb-4">
              Upload an image of your craft to get detailed analysis including market insights, pricing suggestions, and improvement recommendations.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Image className="h-4 w-4 mr-2" />
              Choose Image
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-orange-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-orange-800">Enhanced Artisan Buddy</h1>
                <p className="text-sm text-gray-600">AI-Powered Craft & Business Intelligence</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                Online
              </Badge>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b border-orange-200 px-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chat" className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>Chat</span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="analysis" className="flex items-center space-x-2">
                  <Palette className="h-4 w-4" />
                  <span>Craft Analysis</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="flex-1 flex flex-col m-0">
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
                            <span className="text-sm text-gray-600">Analyzing...</span>
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
                  {selectedImage && (
                    <div className="mb-3 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Image className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-blue-700">{selectedImage.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedImage(null)}
                      >
                        ×
                      </Button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask about your business, upload craft images, or get market insights..."
                        className="pr-20 border-orange-200 focus:border-orange-400"
                        disabled={isLoading}
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="h-4 w-4 text-gray-400" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={async () => {
                            try {
                              // REAL WORKING VOICE INPUT
                              const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                              if (!SpeechRecognition) {
                                alert("Voice input not supported in this browser");
                                return;
                              }

                              const recognition = new SpeechRecognition();
                              recognition.continuous = false;
                              recognition.interimResults = false;
                              recognition.lang = 'en-US';

                              recognition.onstart = () => {
                                console.log('🎤 Voice recording started');
                              };

                              recognition.onresult = (event: any) => {
                                const transcript = event.results[0][0].transcript;
                                console.log('🎤 Voice recognized:', transcript);
                                setInputMessage(transcript);

                                // Auto-send the voice message
                                setTimeout(() => {
                                  sendMessage(transcript);
                                }, 100);
                              };

                              recognition.onerror = (event: any) => {
                                console.error('🎤 Voice error:', event.error);
                                alert(`Voice recognition failed: ${event.error}`);
                              };

                              recognition.start();
                            } catch (error) {
                              console.error('❌ Voice setup failed:', error);
                              alert("Could not initialize voice input");
                            }
                          }}
                        >
                          <Mic className="h-4 w-4 text-gray-600" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={(!inputMessage.trim() && !selectedImage) || isLoading}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dashboard" className="flex-1 p-4 m-0">
              <div className="max-w-6xl mx-auto">
                {renderBusinessDashboard()}
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="flex-1 p-4 m-0">
              <div className="max-w-4xl mx-auto">
                {renderCraftAnalysis()}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}