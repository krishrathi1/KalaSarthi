/**
 * Advanced Translation Features Demo
 * Showcases all the new advanced translation capabilities
 */

'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LanguageCode } from '@/lib/i18n';
import { useTranslation } from '@/context/TranslationContext';

// Import the new components
import LanguageDetection from './LanguageDetection';
import QualityFeedbackComponent from './QualityFeedback';
import CustomOverrides from './CustomOverrides';
import TranslationAnalytics from './TranslationAnalytics';

export function AdvancedTranslationDemo() {
  const [demoText, setDemoText] = useState<string>('');
  const [translationResult, setTranslationResult] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('hi');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  
  const { translateText, detectLanguage, addCustomOverride, submitQualityFeedback } = useTranslation();

  const handleTranslate = async () => {
    if (!demoText.trim()) return;
    
    setIsTranslating(true);
    try {
      const result = await translateText(demoText, selectedLanguage, true);
      setTranslationResult(result);
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const sampleTexts = [
    'Hello, how are you today?',
    'The weather is beautiful today.',
    'I would like to order some food.',
    'Thank you for your help.',
    'नमस्ते, आप कैसे हैं?',
    'Bonjour, comment allez-vous?',
    'Hola, ¿cómo estás?',
    '你好，你好吗？'
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Advanced Translation Features
        </h1>
        <p className="text-gray-600">
          Explore automatic language detection, quality feedback, custom overrides, and analytics
        </p>
      </div>

      <Tabs defaultValue="detection" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="detection">Language Detection</TabsTrigger>
          <TabsTrigger value="quality">Quality Feedback</TabsTrigger>
          <TabsTrigger value="overrides">Custom Overrides</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Language Detection Tab */}
        <TabsContent value="detection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Automatic Language Detection
                <Badge variant="secondary">New</Badge>
              </CardTitle>
              <CardDescription>
                The system can automatically detect the language of input text and suggest translations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sample texts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Try these sample texts:
                </label>
                <div className="flex flex-wrap gap-2">
                  {sampleTexts.map((text, index) => (
                    <button
                      key={index}
                      onClick={() => setDemoText(text)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      {text.length > 20 ? `${text.substring(0, 20)}...` : text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter text to detect language:
                </label>
                <textarea
                  value={demoText}
                  onChange={(e) => setDemoText(e.target.value)}
                  placeholder="Type or paste text here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Language detection component */}
              {demoText && (
                <LanguageDetection
                  text={demoText}
                  onLanguageDetected={(result) => {
                    console.log('Language detected:', result);
                  }}
                  onLanguageSelected={(language) => {
                    setSelectedLanguage(language);
                  }}
                  showAlternatives={true}
                  autoDetect={true}
                />
              )}

              {/* Translation section */}
              {demoText && (
                <div className="space-y-3">
                  <Separator />
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">
                      Translate to:
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value as LanguageCode)}
                      className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hi">Hindi</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                      <option value="ja">Japanese</option>
                    </select>
                    <button
                      onClick={handleTranslate}
                      disabled={isTranslating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isTranslating ? 'Translating...' : 'Translate'}
                    </button>
                  </div>

                  {translationResult && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="text-sm font-medium text-green-800 mb-1">Translation:</div>
                      <div className="text-green-700">{translationResult}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Feedback Tab */}
        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Translation Quality Feedback
                <Badge variant="secondary">New</Badge>
              </CardTitle>
              <CardDescription>
                Rate translations and provide feedback to improve quality over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {translationResult && demoText ? (
                <QualityFeedbackComponent
                  translationId={`demo_${Date.now()}`}
                  originalText={demoText}
                  translatedText={translationResult}
                  onFeedbackSubmitted={(feedback) => {
                    console.log('Feedback submitted:', feedback);
                  }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Translate some text in the Language Detection tab to see the quality feedback system
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Overrides Tab */}
        <TabsContent value="overrides" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Custom Translation Overrides
                <Badge variant="secondary">New</Badge>
              </CardTitle>
              <CardDescription>
                Create custom translations that override automatic translations for specific phrases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomOverrides
                onOverrideAdded={(override) => {
                  console.log('Override added:', override);
                }}
                onOverrideRemoved={(override) => {
                  console.log('Override removed:', override);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Translation Analytics
                <Badge variant="secondary">New</Badge>
              </CardTitle>
              <CardDescription>
                Monitor translation usage, quality metrics, and performance statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TranslationAnalytics />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Features Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700">✅ Implemented Features</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Automatic language detection with confidence scoring</li>
                <li>• Translation quality scoring and feedback system</li>
                <li>• Custom translation overrides management</li>
                <li>• Comprehensive analytics and usage tracking</li>
                <li>• Enhanced caching with quality metrics</li>
                <li>• Multi-language support with fallbacks</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-700">🔧 Technical Improvements</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Statistical language detection algorithm</li>
                <li>• Quality scoring based on multiple factors</li>
                <li>• Persistent storage for overrides and feedback</li>
                <li>• Real-time analytics with automatic refresh</li>
                <li>• Enhanced error handling and fallbacks</li>
                <li>• Performance monitoring and optimization</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdvancedTranslationDemo;