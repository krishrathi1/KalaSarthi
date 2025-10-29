'use client';

import React, { useState } from 'react';
import { MobileOptimizedLayout } from '@/components/pwa/MobileOptimizedLayout';
import { MobileDocumentCapture } from '@/components/pwa/MobileDocumentCapture';
import { LanguageSelector } from '@/components/i18n/LanguageSelector';
import { VoiceInput } from '@/components/i18n/VoiceInput';
import { AccessibilitySettings } from '@/components/accessibility/AccessibilitySettings';
import { SyncStatus } from '@/components/offline/SyncStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  FileText,
  Bell,
  TrendingUp,
  Globe,
  Accessibility,
  Wifi,
  Smartphone
} from 'lucide-react';
import {
  SupportedLanguage,
  translate
} from '@/lib/i18n/scheme-sahayak-translations';
import { CapturedImage } from '@/lib/pwa/camera-capture';

export default function SchemeSahayakPWAPage() {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setCurrentLanguage(lang);
  };

  const handleImageCapture = (image: CapturedImage) => {
    setCapturedImages([...capturedImages, image]);
    setShowCamera(false);
  };

  const handleVoiceTranscript = (text: string) => {
    setVoiceTranscript(text);
  };

  return (
    <MobileOptimizedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {translate('app.title', currentLanguage)}
            </h1>
            <p className="text-muted-foreground mt-1">
              Progressive Web App Demo
            </p>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
            />
            <AccessibilitySettings />
          </div>
        </div>

        {/* PWA Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Mobile First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Touch-optimized UI with responsive design
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                12 Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Multi-language support with voice input
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Accessibility className="w-4 h-4" />
                WCAG 2.1 AA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Full accessibility compliance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                Offline Ready
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                7-day caching with auto-sync
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="recommendations" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recommendations">
              {translate('nav.recommendations', currentLanguage)}
            </TabsTrigger>
            <TabsTrigger value="documents">
              {translate('nav.documents', currentLanguage)}
            </TabsTrigger>
            <TabsTrigger value="applications">
              {translate('nav.applications', currentLanguage)}
            </TabsTrigger>
            <TabsTrigger value="notifications">
              {translate('nav.notifications', currentLanguage)}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {translate('ai.title', currentLanguage)}
                </CardTitle>
                <CardDescription>
                  Personalized scheme recommendations powered by AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Voice Input Demo */}
                  <div className="flex items-center gap-3">
                    <VoiceInput
                      language={currentLanguage}
                      onTranscript={handleVoiceTranscript}
                      onError={(error) => console.error('Voice error:', error)}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Try voice search in your language
                      </p>
                      {voiceTranscript && (
                        <p className="text-sm font-medium mt-1">
                          "{voiceTranscript}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sample Recommendations */}
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">PM Vishwakarma Scheme</h3>
                        <Badge variant="secondary">95% Match</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Financial support for traditional artisans
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm">
                          {translate('action.view_details', currentLanguage)}
                        </Button>
                        <Button size="sm" variant="outline">
                          {translate('action.apply', currentLanguage)}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {translate('nav.documents', currentLanguage)}
                </CardTitle>
                <CardDescription>
                  Manage your documents with mobile camera capture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!showCamera ? (
                    <>
                      <Button
                        onClick={() => setShowCamera(true)}
                        className="w-full"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {translate('doc.capture', currentLanguage)}
                      </Button>

                      {capturedImages.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm">
                            Captured Documents ({capturedImages.length})
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {capturedImages.map((img, index) => (
                              <div key={index} className="relative aspect-video">
                                <img
                                  src={img.dataUrl}
                                  alt={`Document ${index + 1}`}
                                  className="w-full h-full object-cover rounded-lg border"
                                />
                                <Badge
                                  variant="secondary"
                                  className="absolute top-2 right-2"
                                >
                                  {translate('doc.verified', currentLanguage)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <MobileDocumentCapture
                      onCapture={handleImageCapture}
                      onCancel={() => setShowCamera(false)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{translate('nav.applications', currentLanguage)}</CardTitle>
                <CardDescription>
                  Track your scheme applications with offline support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">PM Vishwakarma</h3>
                      <Badge>{translate('app.status.submitted', currentLanguage)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Application submitted on Jan 15, 2025
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg border-dashed">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">Mudra Loan Scheme</h3>
                      <Badge variant="outline">
                        {translate('app.status.draft', currentLanguage)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Draft saved offline - will sync when online
                    </p>
                    <Button size="sm" variant="outline">
                      Continue Application
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  {translate('nav.notifications', currentLanguage)}
                </CardTitle>
                <CardDescription>
                  Smart notifications in your preferred language
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-sm">New Scheme Available</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          A new scheme matching your profile is now available
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          2 hours ago
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Bell className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-sm">Application Approved</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your PM Vishwakarma application has been approved
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          1 day ago
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sync Status */}
      <SyncStatus />
    </MobileOptimizedLayout>
  );
}
