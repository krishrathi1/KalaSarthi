'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceControl } from '@/components/ui/VoiceControl';
import { Mic, Volume2, Languages, HelpCircle, Play, Square, Settings } from 'lucide-react';

export default function VoiceDemoPage() {
  const [activeTab, setActiveTab] = useState('demo');

  const voiceCommands = {
    english: [
      'Go to finance dashboard',
      'Show me the marketplace',
      'Take me to my profile',
      'Open loans section',
      'Navigate to trend analysis',
      'Search for handloom sarees',
      'Help me navigate'
    ],
    hindi: [
      'फाइनेंस डैशबोर्ड पर जाओ',
      'मुझे मार्केटप्लेस दिखाओ',
      'मेरे प्रोफाइल पर ले चलो',
      'लोन सेक्शन खोलो',
      'ट्रेंड विश्लेषण पर नेविगेट करो',
      'हस्तशिल्प साड़ी खोजो',
      'मदद करो'
    ],
    regional: [
      'ফাইন্যান্স ড্যাশবোর্ডে যান (Bengali)',
      'మార్కెట్‌ప్లేస్ చూపించు (Telugu)',
      'माझ्या प्रोफाइल वर न्या (Marathi)',
      'லോൺ വിഭാഗം തുറക്കുക (Malayalam)',
      'ਮੇਰੇ ਪ੍ਰੋਫਾਈਲ ਤੇ ਜਾਓ (Punjabi)'
    ]
  };

  const features = [
    {
      title: 'Natural Human Voices',
      description: 'Google Cloud Neural2 voices that sound completely natural and human-like, not robotic',
      icon: <Volume2 className="h-6 w-6 text-green-500" />
    },
    {
      title: 'Multi-Language Support',
      description: 'Voice commands in English, Hindi, and regional languages with native accent voices',
      icon: <Languages className="h-6 w-6" />
    },
    {
      title: 'Advanced Speech Recognition',
      description: 'Google Cloud STT with superior accuracy and noise cancellation',
      icon: <Mic className="h-6 w-6 text-blue-500" />
    },
    {
      title: 'Real-time Navigation',
      description: 'Instant response and seamless page transitions with voice feedback',
      icon: <Play className="h-6 w-6" />
    },
    {
      title: 'Contextual Understanding',
      description: 'AI-powered understanding of voice commands and artisan-specific intents',
      icon: <HelpCircle className="h-6 w-6" />
    },
    {
      title: 'Voice Customization',
      description: 'Adjustable speed, pitch, and voice selection for personalized experience',
      icon: <Settings className="h-6 w-6" />
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Voice Navigation Demo</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Experience hands-free navigation across the entire KalaBandhu platform with natural, human-like voices.
          Use voice commands in multiple languages to navigate, search, and interact with features.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Badge variant="secondary" className="text-sm">
            <Mic className="h-3 w-3 mr-1" />
            Google Cloud STT
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Volume2 className="h-3 w-3 mr-1" />
            Google Cloud TTS
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Languages className="h-3 w-3 mr-1" />
            Multi-Language
          </Badge>
          <Badge variant="secondary" className="text-sm bg-green-100 text-green-800">
            ✨ Natural Voices
          </Badge>
        </div>
      </div>

      {/* Voice Control - Floating */}
      <VoiceControl variant="floating" showSettings={true} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
          <TabsTrigger value="commands">Voice Commands</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Voice Control Demo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Voice Control
                </CardTitle>
                <CardDescription>
                  Click the microphone to start voice navigation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceControl
                  variant="default"
                  size="lg"
                  showSettings={true}
                  className="mx-auto"
                />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Navigation</CardTitle>
                <CardDescription>
                  Test voice navigation with these buttons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/finance/dashboard'}
                >
                  📊 Go to Finance Dashboard
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => window.location.href = '/marketplace'}
                >
                  🛍️ Open Marketplace
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => window.location.href = '/profile'}
                >
                  👤 View Profile
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => window.location.href = '/trend-spotter'}
                >
                  📈 Trend Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commands" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* English Commands */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🇺🇸 English Commands
                </CardTitle>
                <CardDescription>
                  Voice commands in English
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {voiceCommands.english.map((command, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      "{command}"
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hindi Commands */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🇮🇳 हिंदी Commands
                </CardTitle>
                <CardDescription>
                  Voice commands in Hindi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {voiceCommands.hindi.map((command, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      "{command}"
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Regional Commands */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🌏 Regional Languages
                </CardTitle>
                <CardDescription>
                  Voice commands in regional languages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {voiceCommands.regional.map((command, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      {command}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {feature.icon}
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle>Technical Implementation</CardTitle>
              <CardDescription>
                How voice navigation works under the hood
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Frontend Components</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• VoiceControl - Main interaction component</li>
                    <li>• VoiceStatus - Real-time status display</li>
                    <li>• MediaRecorder API integration</li>
                    <li>• Google Cloud TTS/STT primary</li>
                    <li>• Web Speech API fallback</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">AI & Cloud Services</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Google Cloud Text-to-Speech (Neural2)</li>
                    <li>• Google Cloud Speech-to-Text (Enhanced)</li>
                    <li>• Gemini AI for intent processing</li>
                    <li>• Multi-language voice synthesis</li>
                    <li>• Advanced noise cancellation</li>
                  </ul>
                </div>
              </div>

              {/* Voice Quality Comparison */}
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
                <h4 className="font-semibold mb-3 text-green-800">🎵 Voice Quality Improvement</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium text-red-600 mb-2">❌ Before (Robotic)</h5>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Monotone, mechanical sound</li>
                      <li>• Limited emotional expression</li>
                      <li>• Unnatural speech patterns</li>
                      <li>• Browser-dependent quality</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-green-600 mb-2">✅ After (Natural)</h5>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Human-like Neural2 voices</li>
                      <li>• Natural intonation & rhythm</li>
                      <li>• Emotional expression capability</li>
                      <li>• Consistent quality across devices</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Voice Status */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Voice Interaction Status</CardTitle>
                  <CardDescription>Real-time voice command processing status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Voice Recognition:</span>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Language Detection:</span>
                      <Badge variant="secondary">Auto</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Command Processing:</span>
                      <Badge variant="secondary">Ready</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">TTS Engine:</span>
                      <Badge variant="secondary">Gemini AI</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Info */}
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Browser Support:</span>
                  <Badge variant="secondary">Chrome/Edge</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Microphone Access:</span>
                  <Badge variant="secondary">Required</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>AI Processing:</span>
                  <Badge variant="secondary">Gemini API</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Languages:</span>
                  <Badge variant="secondary">10+ Supported</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Response Time:</span>
                  <Badge variant="secondary">Under 2s</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Ready to Try Voice Navigation?</h3>
            <p className="text-muted-foreground">
              Click the floating microphone button or use the voice control above to start exploring
              the KalaBandhu platform with voice commands.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <Button onClick={() => setActiveTab('demo')}>
                <Play className="h-4 w-4 mr-2" />
                Start Demo
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('commands')}>
                <HelpCircle className="h-4 w-4 mr-2" />
                View Commands
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}