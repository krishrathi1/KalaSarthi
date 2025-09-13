'use client';

import React, { useState } from 'react';
import { IntelligentVoiceButton } from '@/components/ui/IntelligentVoiceButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MessageSquare, Navigation, Search, Plus, Heart, HelpCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VoiceAssistantDemoPage() {
  const [currentContext, setCurrentContext] = useState('general');

  const voiceExamples = [
    {
      category: 'Navigation',
      icon: <Navigation className="h-5 w-5" />,
      color: 'text-blue-500',
      examples: [
        'Take me to my dashboard',
        'Show me the marketplace',
        'Go to my profile page',
        'I want to see my orders',
        'Navigate to finance section'
      ]
    },
    {
      category: 'Product Management',
      icon: <Plus className="h-5 w-5" />,
      color: 'text-green-500',
      examples: [
        'Help me create a new product',
        'I want to add a new listing',
        'Show me my draft products',
        'Let me edit my saree collection',
        'I need to update product prices'
      ]
    },
    {
      category: 'Shopping & Discovery',
      icon: <Search className="h-5 w-5" />,
      color: 'text-purple-500',
      examples: [
        'Find handloom sarees for me',
        'Show me traditional jewelry',
        'I\'m looking for wooden crafts',
        'Search for artisan-made bags',
        'Help me find gift items'
      ]
    },
    {
      category: 'Cart & Wishlist',
      icon: <Heart className="h-5 w-5" />,
      color: 'text-red-500',
      examples: [
        'Add this to my cart',
        'I like this, save it for later',
        'Show me my wishlist',
        'What\'s in my shopping cart?',
        'Remove this from cart'
      ]
    },
    {
      category: 'Help & Support',
      icon: <HelpCircle className="h-5 w-5" />,
      color: 'text-orange-500',
      examples: [
        'How do I create a product?',
        'What features are available?',
        'Help me with my profile',
        'How can I contact buyers?',
        'Show me platform tips'
      ]
    },
    {
      category: 'Settings & Account',
      icon: <Settings className="h-5 w-5" />,
      color: 'text-gray-500',
      examples: [
        'Change my language to Hindi',
        'Update my profile information',
        'Show me my earnings',
        'Help me with payment settings',
        'Change notification preferences'
      ]
    }
  ];

  const contextOptions = [
    { value: 'general', label: 'General', description: 'General platform navigation' },
    { value: 'marketplace', label: 'Marketplace', description: 'Shopping and product browsing' },
    { value: 'product-creation', label: 'Product Creation', description: 'Creating and managing products' },
    { value: 'profile', label: 'Profile', description: 'Account and profile management' },
    { value: 'finance', label: 'Finance', description: 'Sales and financial management' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
              <Mic className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Intelligent Voice Assistant
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience hands-free navigation with our AI-powered voice assistant.
            Speak naturally - no need to memorize specific commands!
          </p>
          <div className="flex justify-center gap-4 mt-6">
            <Badge variant="secondary" className="text-sm">
              <MessageSquare className="h-3 w-3 mr-1" />
              Natural Language
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Mic className="h-3 w-3 mr-1" />
              Multi-Language Support
            </Badge>
            <Badge variant="secondary" className="text-sm bg-green-100 text-green-800">
              ✨ AI-Powered
            </Badge>
          </div>
        </div>

        {/* Voice Button Demo */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Mic className="h-6 w-6 text-blue-500" />
              Try the Voice Assistant
            </CardTitle>
            <CardDescription>
              Click the microphone button below and speak naturally about what you'd like to do
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex justify-center mb-4">
              <IntelligentVoiceButton
                size="lg"
                context={currentContext}
              />
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              {contextOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={currentContext === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentContext(option.value)}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Current context: <strong>{contextOptions.find(o => o.value === currentContext)?.description}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Voice Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {voiceExamples.map((category, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className={category.color}>{category.icon}</span>
                  {category.category}
                </CardTitle>
                <CardDescription>
                  Try saying any of these phrases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.examples.map((example, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-muted/50 rounded-lg text-sm cursor-pointer hover:bg-muted transition-colors"
                      title="Click to copy this example"
                      onClick={() => navigator.clipboard.writeText(example)}
                    >
                      "{example}"
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How It Works */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How the Intelligent Voice Assistant Works</CardTitle>
            <CardDescription>
              Our AI understands natural language and context to provide the right actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mic className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">1. Natural Speech</h3>
                <p className="text-sm text-muted-foreground">
                  Speak in your natural language, just like talking to a friend
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">2. AI Understanding</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced AI analyzes your intent and understands context
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Navigation className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">3. Smart Actions</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically performs the right action or guides you there
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips for Artisans */}
        <Card>
          <CardHeader>
            <CardTitle>Tips for Using Voice Commands</CardTitle>
            <CardDescription>
              Make the most of the intelligent voice assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-green-700">✅ What Works Great</h4>
                <ul className="space-y-2 text-sm">
                  <li>• "I want to create a new product"</li>
                  <li>• "Show me beautiful handloom sarees"</li>
                  <li>• "Help me update my profile"</li>
                  <li>• "Take me to my sales dashboard"</li>
                  <li>• "Find artisan-made jewelry"</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-blue-700">💡 Pro Tips</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Speak naturally, like talking to a person</li>
                  <li>• Use context - the AI remembers your previous requests</li>
                  <li>• Be specific about what you want to do</li>
                  <li>• Try different ways of saying the same thing</li>
                  <li>• The AI gets better at understanding you over time</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}